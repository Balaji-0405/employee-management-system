import supabase from '../config/db.js'

// Build the first and last date string for a given month/year
const monthRange = (month, year) => {
  const mm         = String(month).padStart(2, '0')
  const lastDay    = new Date(year, month, 0).getDate()
  const monthStart = `${year}-${mm}-01`
  const monthEnd   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`
  return { monthStart, monthEnd }
}

// ── GET /api/calendar/events ───────────────────────────────────────────────────
export const getEvents = async (req, res) => {
  try {
    const userId = req.user.id
    const year   = parseInt(req.query.year)  || new Date().getFullYear()
    const month  = parseInt(req.query.month) || new Date().getMonth() + 1

    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'month must be between 1 and 12' })
    }

    const { monthStart, monthEnd } = monthRange(month, year)

    const [eventsRes, attendanceRes, leavesRes, tasksRes, holidaysRes] =
      await Promise.all([
        supabase
          .from('calendar_events')
          .select('*')
          .eq('employee_id', userId)
          .eq('is_company_wide', false)
          .gte('event_date', monthStart)
          .lte('event_date', monthEnd)
          .order('event_date'),

        supabase
          .from('attendance')
          .select('id, date, clock_in, clock_out, hours_worked, status, break_start, break_end, break_minutes')
          .eq('employee_id', userId)
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .order('date'),

        supabase
          .from('leave_requests')
          .select('id, type, from_date, to_date, days, status, reason')
          .eq('employee_id', userId)
          .eq('status', 'approved')
          .lte('from_date', monthEnd)
          .gte('to_date', monthStart),

        supabase
          .from('tasks')
          .select('id, title, status, priority, due_date, project_id, projects(name)')
          .eq('assigned_to', userId)
          .not('due_date', 'is', null)
          .gte('due_date', monthStart)
          .lte('due_date', monthEnd)
          .order('due_date'),

        supabase
          .from('holidays')
          .select('id, name, date, country, status')
          .eq('status', 'approved')
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .order('date'),
      ])

    for (const result of [eventsRes, attendanceRes, leavesRes, tasksRes, holidaysRes]) {
      if (result.error && result.error.code !== 'PGRST116') throw result.error
    }

    // Company-wide events visible to all
    const { data: companyCalEvents } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('is_company_wide', true)
      .gte('event_date', monthStart)
      .lte('event_date', monthEnd)
      .order('event_date')

    // For manager/admin: fetch team leave and attendance data
    let teamData = null
    if (req.user.role === 'manager' || req.user.role === 'admin') {
      const { data: reports } = await supabase
        .from('employees')
        .select('id, name')
        .eq('manager_id', req.user.id)
        .eq('is_active', true)

      const reportIds = (reports || []).map(r => r.id)

      if (reportIds.length > 0) {
        const [teamLeaves, teamAttendance] = await Promise.all([
          supabase
            .from('leave_requests')
            .select(`
              id, type, from_date, to_date, days, status,
              employee:employee_id(id, name)
            `)
            .in('employee_id', reportIds)
            .eq('status', 'approved')
            .lte('from_date', monthEnd)
            .gte('to_date', monthStart),

          supabase
            .from('attendance')
            .select(`
              id, date, status,
              employee:employee_id(id, name)
            `)
            .in('employee_id', reportIds)
            .gte('date', monthStart)
            .lte('date', monthEnd)
            .in('status', ['absent', 'late']),
        ])

        teamData = {
          team_leaves:     teamLeaves.data     || [],
          team_attendance: teamAttendance.data || [],
          team_members:    reports             || [],
        }
      }
    }

    // For admin: pull announcements as calendar entries
    let companyAnnouncementEvents = []
    if (req.user.role === 'admin') {
      const { data: announcements } = await supabase
        .from('announcements')
        .select('id, title, content, created_at')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd + 'T23:59:59')

      companyAnnouncementEvents = (announcements || []).map(a => ({
        id:              a.id,
        title:           a.title,
        event_date:      a.created_at.split('T')[0],
        event_type:      'company',
        description:     a.content,
        is_company_wide: true,
      }))
    }

    return res.json({
      events:         eventsRes.data     || [],
      attendance:     attendanceRes.data || [],
      leaves:         leavesRes.data     || [],
      tasks:          (tasksRes.data || []).map(t => ({
        ...t,
        project_name: t.projects?.name || '—',
      })),
      holidays:       holidaysRes.data   || [],
      company_events: [
        ...(companyCalEvents || []),
        ...companyAnnouncementEvents,
      ],
      ...(teamData && { team_data: teamData }),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── POST /api/calendar/events ──────────────────────────────────────────────────
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      event_date,
      start_time,
      end_time,
      event_type      = 'personal',
      color           = 'blue',
      is_all_day      = false,
      is_company_wide = false,
    } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' })
    }
    if (!event_date) {
      return res.status(400).json({ error: 'event_date is required' })
    }

    const canCreateCompanyWide =
      req.user.role === 'admin' || req.user.role === 'manager'

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        employee_id:     req.user.id,
        title:           title.trim(),
        description:     description     ?? null,
        event_date,
        start_time:      start_time      ?? null,
        end_time:        end_time        ?? null,
        event_type,
        color,
        is_all_day,
        is_company_wide: canCreateCompanyWide ? is_company_wide : false,
      })
      .select('*')
      .single()

    if (error) throw error
    return res.status(201).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── DELETE /api/calendar/events/:id ───────────────────────────────────────────
export const deleteEvent = async (req, res) => {
  try {
    const { id }  = req.params
    const userId  = req.user.id

    const { data: existing, error: findError } = await supabase
      .from('calendar_events')
      .select('id, employee_id')
      .eq('id', id)
      .single()

    if (findError || !existing) {
      return res.status(404).json({ error: 'Event not found' })
    }

    if (existing.employee_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own events' })
    }

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)

    if (error) throw error
    return res.json({ message: 'Event deleted' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── GET /api/calendar/holidays ─────────────────────────────────────────────────
export const getHolidays = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear()

    let query = supabase
      .from('holidays')
      .select(`
        *,
        creator:created_by(id, name),
        approver:approved_by(id, name)
      `)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date')

    // Non-admin only sees approved holidays
    if (req.user.role !== 'admin') {
      query = query.eq('status', 'approved')
    }

    const { data, error } = await query
    if (error) throw error
    return res.json(data || [])
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── POST /api/calendar/holidays ────────────────────────────────────────────────
export const createHoliday = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can manage holidays' })
    }

    const { name, date, country = 'India', notes } = req.body

    if (!name?.trim() || !date) {
      return res.status(400).json({ error: 'name and date are required' })
    }

    const { data, error } = await supabase
      .from('holidays')
      .insert({
        name:       name.trim(),
        date,
        country,
        notes:      notes || null,
        status:     'pending',
        created_by: req.user.id,
      })
      .select('*')
      .single()

    if (error) throw error
    return res.status(201).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── DELETE /api/calendar/holidays/:id ─────────────────────────────────────────
export const deleteHoliday = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can manage holidays' })
    }

    const { id } = req.params
    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', id)

    if (error) throw error
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── PATCH /api/calendar/holidays/:id/approve ──────────────────────────────────
export const approveHoliday = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can approve holidays' })
    }

    const { id } = req.params
    const { action, notes } = req.body

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be approve or reject' })
    }

    const { data, error } = await supabase
      .from('holidays')
      .update({
        status:      action === 'approve' ? 'approved' : 'rejected',
        approved_by: req.user.id,
        approved_at: new Date().toISOString(),
        notes:       notes || null,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── POST /api/calendar/holidays/bulk-approve ──────────────────────────────────
export const bulkApproveHolidays = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can approve holidays' })
    }

    const { ids, action } = req.body

    if (!ids?.length) {
      return res.status(400).json({ error: 'ids array required' })
    }

    const { data, error } = await supabase
      .from('holidays')
      .update({
        status:      action === 'approve' ? 'approved' : 'rejected',
        approved_by: req.user.id,
        approved_at: new Date().toISOString(),
      })
      .in('id', ids)
      .select('*')

    if (error) throw error
    return res.json({
      updated: data?.length || 0,
      message: `${data?.length || 0} holidays ${action === 'approve' ? 'approved' : 'rejected'}`,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
