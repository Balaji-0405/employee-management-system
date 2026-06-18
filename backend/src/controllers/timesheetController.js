import supabase from '../config/db.js'
import { getWeekStart, getWeekEnd } from '../utils/dateHelpers.js'
import { createNotification } from '../utils/notifications.js'

export const saveDraft = async (req, res) => {
  try {
    const { week_start, week_end, entries } = req.body

    if (!week_start || !week_end) {
      return res.status(400).json({ error: 'week_start and week_end are required' })
    }

    let { data: timesheet, error: findError } = await supabase
      .from('timesheets')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('week_start', week_start)
      .single()

    if (findError && findError.code !== 'PGRST116') throw findError

    if (!timesheet) {
      const { data: created, error: createError } = await supabase
        .from('timesheets')
        .insert({
          employee_id: req.user.id,
          week_start,
          week_end,
          total_hours: 0,
          status: 'draft'
        })
        .select()
        .single()

      if (createError) throw createError
      timesheet = created
    } else if (!['draft', 'rejected'].includes(timesheet.status)) {
      return res.status(400).json({
        error: `Cannot save draft: timesheet is already ${timesheet.status}`
      })
    }

    await supabase
      .from('timesheet_entries')
      .delete()
      .eq('timesheet_id', timesheet.id)

    if (timesheet.status === 'rejected') {
      await supabase
        .from('timesheets')
        .update({ status: 'draft' })
        .eq('id', timesheet.id)
    }

    const validEntries = (entries || []).filter(e => e.project_id && Number(e.hours) > 0)

    if (validEntries.length > 0) {
      const { error: insertError } = await supabase
        .from('timesheet_entries')
        .insert(
          validEntries.map(e => ({
            timesheet_id: timesheet.id,
            date: e.date,
            project_id: e.project_id,
            task_id: e.task_id || null,
            start_time: e.start_time || null,
            end_time: e.end_time || null,
            hours_worked: Number(e.hours) || 0,
            description: e.description || null,
          }))
        )
      if (insertError) throw insertError
    }

    const totalHours = parseFloat(
      validEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0).toFixed(2)
    )

    const { data: updated, error: updateError } = await supabase
      .from('timesheets')
      .update({ total_hours: totalHours, status: 'draft' })
      .eq('id', timesheet.id)
      .select()
      .single()

    if (updateError) throw updateError

    const { data: allEntries } = await supabase
      .from('timesheet_entries')
      .select('*')
      .eq('timesheet_id', timesheet.id)
      .order('date')

    updated.entries = allEntries || []
    return res.json(updated)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getOrCreateWeeklyTimesheet = async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date()
    const weekStart = getWeekStart(date)
    const weekEnd = getWeekEnd(date)
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    let { data: timesheet, error } = await supabase
      .from('timesheets')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('week_start', weekStartStr)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    if (!timesheet) {
      const { data: created, error: createError } = await supabase
        .from('timesheets')
        .insert({
          employee_id: req.user.id,
          week_start: weekStartStr,
          week_end: weekEndStr,
          total_hours: 0,
          status: 'draft'
        })
        .select()
        .single()

      if (createError) throw createError
      timesheet = created
    }

    const { data: attendanceRecords } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user.id)
      .gte('date', weekStartStr)
      .lte('date', weekEndStr)

    const { data: existingEntries } = await supabase
      .from('timesheet_entries')
      .select('*')
      .eq('timesheet_id', timesheet.id)

    const existingDates = new Set((existingEntries || []).map(e => e.date))
    const newEntries = (attendanceRecords || []).filter(a => !existingDates.has(a.date))

    if (newEntries.length > 0) {
      await supabase.from('timesheet_entries').insert(
        newEntries.map(a => ({
          timesheet_id: timesheet.id,
          date: a.date,
          hours_worked: a.hours_worked || 0,
          attendance_id: a.id
        }))
      )
    }

    const { data: allEntries } = await supabase
      .from('timesheet_entries')
      .select('*')
      .eq('timesheet_id', timesheet.id)
      .order('date')

    const totalHours = parseFloat(
      ((allEntries || []).reduce((sum, e) => sum + (e.hours_worked || 0), 0)).toFixed(2)
    )

    await supabase
      .from('timesheets')
      .update({ total_hours: totalHours })
      .eq('id', timesheet.id)

    timesheet.total_hours = totalHours
    timesheet.entries = allEntries || []

    return res.json(timesheet)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const submitTimesheet = async (req, res) => {
  try {
    const { id } = req.params

    const { data: timesheet, error: findError } = await supabase
      .from('timesheets')
      .select('*')
      .eq('id', id)
      .eq('employee_id', req.user.id)
      .single()

    if (findError || !timesheet) return res.status(404).json({ error: 'Timesheet not found' })

    if (timesheet.status !== 'draft') return res.status(400).json({ error: 'Timesheet already submitted' })

    if (timesheet.total_hours < 35) {
      return res.status(400).json({
        error: `Total hours must be at least 35. Current: ${timesheet.total_hours}`
      })
    }

    const { data: updated, error } = await supabase
      .from('timesheets')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const { data: employee } = await supabase
      .from('employees')
      .select('name, manager_id')
      .eq('id', req.user.id)
      .single()

    const { data: admins } = await supabase
      .from('employees')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true)

    const recipients = new Set()
    if (employee?.manager_id) recipients.add(employee.manager_id)
    ;(admins || []).forEach(a => recipients.add(a.id))

    for (const recipientId of recipients) {
      await createNotification({
        recipientId,
        senderId: req.user.id,
        type: 'timesheet',
        title: 'Timesheet submitted for review',
        message: `${employee?.name} submitted timesheet for week ${timesheet.week_start} to ${timesheet.week_end}`,
        referenceId: timesheet.id,
        referenceType: 'timesheet'
      })
    }

    return res.json(updated)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const reviewTimesheet = async (req, res) => {
  try {
    const { id } = req.params
    const { status, review_note } = req.body

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' })
    }

    const { data: timesheet, error: findError } = await supabase
      .from('timesheets')
      .select('*')
      .eq('id', id)
      .single()

    if (findError || !timesheet) return res.status(404).json({ error: 'Timesheet not found' })

    if (timesheet.status !== 'submitted') {
      return res.status(400).json({ error: 'Only submitted timesheets can be reviewed' })
    }

    if (req.user.role === 'manager') {
      const { data: reports } = await supabase
        .from('employees')
        .select('id')
        .eq('manager_id', req.user.id)
        .eq('is_active', true)
      const reportIds = (reports || []).map(r => r.id)
      if (!reportIds.includes(timesheet.employee_id)) {
        return res.status(403).json({ error: 'You are not authorised to review this timesheet' })
      }
    }

    const { data: updated, error } = await supabase
      .from('timesheets')
      .update({
        status,
        reviewed_by: req.user.id,
        review_note: review_note || null,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const { data: reviewer } = await supabase
      .from('employees')
      .select('name')
      .eq('id', req.user.id)
      .single()

    await createNotification({
      recipientId: timesheet.employee_id,
      senderId: req.user.id,
      type: 'timesheet',
      title: `Timesheet ${status}`,
      message: `Your timesheet for week ${timesheet.week_start} to ${timesheet.week_end} was ${status} by ${reviewer?.name}. Note: ${review_note || 'N/A'}`,
      referenceId: timesheet.id,
      referenceType: 'timesheet'
    })

    return res.json(updated)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getMyTimesheets = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('timesheets')
      .select('*, timesheet_entries(*)')
      .eq('employee_id', req.user.id)
      .order('week_start', { ascending: false })

    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getPendingTimesheets = async (req, res) => {
  try {
    let query = supabase
      .from('timesheets')
      .select('*, employee:employees!employee_id(name, department)')
      .eq('status', 'submitted')

    if (req.user.role === 'manager') {
      const { data: reports } = await supabase
        .from('employees')
        .select('id')
        .eq('manager_id', req.user.id)

      const reportIds = (reports || []).map(r => r.id)
      if (reportIds.length === 0) return res.json([])
      query = query.in('employee_id', reportIds)
    }

    const { data, error } = await query.order('submitted_at', { ascending: true })
    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getTeamTimesheets = async (req, res) => {
  try {
    let query = supabase
      .from('timesheets')
      .select('*, employee:employees!employee_id(name, department)')

    if (req.user.role === 'manager') {
      const { data: reports } = await supabase
        .from('employees')
        .select('id')
        .eq('manager_id', req.user.id)

      const reportIds = (reports || []).map(r => r.id)
      if (reportIds.length === 0) return res.json([])
      query = query.in('employee_id', reportIds)
    }

    const { data, error } = await query.order('submitted_at', { ascending: false, nullsFirst: false })
    if (error) throw error
    return res.json(data || [])
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getTimesheetById = async (req, res) => {
  try {
    const { id } = req.params

    const { data: timesheet, error } = await supabase
      .from('timesheets')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !timesheet) return res.status(404).json({ error: 'Timesheet not found' })

    const isOwner = timesheet.employee_id === req.user.id
    const isPrivileged = req.user.role === 'manager' || req.user.role === 'admin'
    if (!isOwner && !isPrivileged) return res.status(403).json({ error: 'Forbidden' })

    const { data: entries } = await supabase
      .from('timesheet_entries')
      .select('*')
      .eq('timesheet_id', id)
      .order('date')

    timesheet.entries = entries || []
    return res.json(timesheet)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const updateTimesheetEntry = async (req, res) => {
  try {
    const { id } = req.params
    const { hours_worked, description, project_id, task_id, start_time, end_time } = req.body

    const { data: entry, error: findError } = await supabase
      .from('timesheet_entries')
      .select('*, timesheets!timesheet_id(employee_id, status)')
      .eq('id', id)
      .single()

    if (findError || !entry) return res.status(404).json({ error: 'Entry not found' })

    if (entry.timesheets.employee_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    if (entry.timesheets.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot edit entry: timesheet is not in draft status' })
    }

    const updates = Object.fromEntries(
      Object.entries({ hours_worked, description, project_id, task_id, start_time, end_time })
        .filter(([, v]) => v !== undefined)
    )

    const { data: updated, error } = await supabase
      .from('timesheet_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return res.json(updated)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const deleteTimesheet = async (req, res) => {
  try {
    const { id } = req.params

    const { data: timesheet, error: findError } = await supabase
      .from('timesheets')
      .select('id, employee_id, status')
      .eq('id', id)
      .single()

    if (findError || !timesheet) return res.status(404).json({ error: 'Timesheet not found' })
    if (timesheet.employee_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
    if (timesheet.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft timesheets can be deleted' })
    }

    await supabase.from('timesheet_entries').delete().eq('timesheet_id', id)

    const { error } = await supabase.from('timesheets').delete().eq('id', id)
    if (error) throw error

    return res.json({ message: 'Timesheet deleted' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
