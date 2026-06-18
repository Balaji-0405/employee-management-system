/*
  SUPABASE MIGRATION REQUIRED:
  ALTER TABLE attendance ADD COLUMN IF NOT EXISTS break_start timestamptz;
  ALTER TABLE attendance ADD COLUMN IF NOT EXISTS break_end timestamptz;
  ALTER TABLE attendance ADD COLUMN IF NOT EXISTS break_minutes integer DEFAULT 0;
*/

import supabase from '../config/db.js'
import { createNotification } from '../utils/notifications.js'

export const clockIn = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('employee_id', req.user.id)
      .eq('date', today)
      .single()

    if (existing) return res.status(400).json({ error: 'Already clocked in today' })

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        employee_id: req.user.id,
        date: today,
        clock_in: new Date().toISOString(),
        status: 'present'
      })
      .select()
      .single()

    if (error) throw error
    return res.status(201).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const clockOut = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: attendance, error: findError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('date', today)
      .single()

    if (findError || !attendance) return res.status(404).json({ error: 'No clock-in record found for today' })
    if (attendance.clock_out) return res.status(400).json({ error: 'Already clocked out today' })

    const clockOutTime = new Date()
    const hoursWorked = parseFloat(((clockOutTime - new Date(attendance.clock_in)) / (1000 * 60 * 60)).toFixed(2))

    const { data, error } = await supabase
      .from('attendance')
      .update({ clock_out: clockOutTime.toISOString(), hours_worked: hoursWorked })
      .eq('id', attendance.id)
      .select()
      .single()

    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getToday = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('date', today)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return res.json(data || null)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getHistory = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
      .from('attendance')
      .select('date, clock_in, clock_out, hours_worked, status')
      .eq('employee_id', req.user.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getMonthly = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear()
    const month = parseInt(req.query.month) || new Date().getMonth() + 1

    const monthStr = String(month).padStart(2, '0')
    const monthStart = `${year}-${monthStr}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const monthEnd = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('attendance')
      .select('date, status, clock_in, clock_out, hours_worked')
      .eq('employee_id', req.user.id)
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date')

    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getWeeklyStats = async (req, res) => {
  try {
    const weekOffset = parseInt(req.query.weekOffset) || 0

    const today = new Date()
    const monday = new Date(today)
    monday.setDate(
      today.getDate() -
      (today.getDay() === 0 ? 6 : today.getDay() - 1) -
      (weekOffset * 7)
    )
    monday.setHours(0, 0, 0, 0)

    const weekStart = monday.toISOString().split('T')[0]
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const weekEnd = sunday.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('attendance')
      .select('date, hours_worked, status')
      .eq('employee_id', req.user.id)
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .order('date')

    if (error) throw error

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const record = (data || []).find(r => r.date === dateStr)
      return { date: dateStr, day: dayNames[i], hours: record?.hours_worked ?? 0 }
    })

    const weekdays = days.slice(0, 5)
    const workedDays = weekdays.filter(d => d.hours > 0)
    const avgDailyHours = workedDays.length > 0
      ? workedDays.reduce((s, d) => s + d.hours, 0) / workedDays.length
      : 0
    const totalOvertime = weekdays.reduce((s, d) => s + Math.max(0, d.hours - 9), 0)
    const attendancePercentage = weekdays.length > 0
      ? Math.round((workedDays.length / weekdays.length) * 100)
      : 0

    return res.json({
      days,
      avg_daily_hours: parseFloat(avgDailyHours.toFixed(2)),
      total_overtime: parseFloat(totalOvertime.toFixed(2)),
      attendance_percentage: attendancePercentage,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getRequests = async (req, res) => {
  try {
    let query = supabase
      .from('attendance_requests')
      .select('id, employee_id, type, date, reason, status, created_at, review_note, reviewed_at, employees!employee_id(name, department)')

    if ((req.user.role === 'manager' || req.user.role === 'admin') && req.query.scope === 'team') {
      query = query.eq('status', 'pending')

      if (req.user.role === 'manager') {
        const { data: reports } = await supabase
          .from('employees')
          .select('id')
          .eq('manager_id', req.user.id)
          .eq('is_active', true)

        const reportIds = (reports || []).map(r => r.id)
        if (reportIds.length === 0) return res.json([])
        query = query.in('employee_id', reportIds)
      }
    } else {
      query = query.eq('employee_id', req.user.id)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return res.json(data || [])
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const createRequest = async (req, res) => {
  try {
    const { type, date, reason } = req.body

    if (!type || !date || !reason) {
      return res.status(400).json({ error: 'type, date, and reason are required' })
    }

    const typeLabels = {
      regularization: 'Regularization',
      wfh: 'WFH',
      missed_checkin: 'Missed Check-In',
    }

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

    const label = typeLabels[type] ?? type

    // Persist the attendance request
    const { data: created, error: insertError } = await supabase
      .from('attendance_requests')
      .insert({
        employee_id: req.user.id,
        type,
        date,
        reason,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Notify recipients (manager + admins)
    for (const recipientId of recipients) {
      await supabase.from('notifications').insert({
        recipient_id: recipientId,
        sender_id: req.user.id,
        type: 'attendance',
        title: `Attendance ${label} Request`,
        message: `${employee?.name} submitted a ${label} request for ${date}. Reason: ${reason}`,
        reference_id: created.id,
        reference_type: 'attendance_request',
        is_read: false,
      })
    }

    return res.status(201).json(created)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const reviewRequest = async (req, res) => {
  try {
    const { id } = req.params
    const { status, review_note } = req.body

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' })
    }

    const { data: request, error: findError } = await supabase
      .from('attendance_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (findError || !request) return res.status(404).json({ error: 'Attendance request not found' })

    const { data: updated, error } = await supabase
      .from('attendance_requests')
      .update({
        status,
        review_note: review_note || null,
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (status === 'approved' && request.type === 'regularization') {
      await supabase
        .from('attendance')
        .upsert(
          {
            employee_id: request.employee_id,
            date: request.date,
            status: 'present',
            clock_in: request.clock_in,
            clock_out: request.clock_out,
          },
          { onConflict: 'employee_id,date' }
        )
    }

    const typeLabel = { regularization: 'regularization', wfh: 'WFH', missed_checkin: 'missed check-in' }[request.type] || request.type
    await createNotification({
      recipientId: request.employee_id,
      senderId: req.user.id,
      type: 'attendance',
      title: status === 'approved' ? 'Attendance Request Approved' : 'Attendance Request Rejected',
      message: `Your attendance ${typeLabel} request for ${request.date} has been ${status}.`,
      referenceId: request.id,
      referenceType: 'attendance_request',
    })

    return res.json(updated)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── POST /api/attendance/break-start ──────────────────────────────────────────
export const startBreak = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: attendance, error: findError } = await supabase
      .from('attendance')
      .select('id, clock_out, break_start, break_end')
      .eq('employee_id', req.user.id)
      .eq('date', today)
      .single()

    if (findError || !attendance) {
      return res.status(400).json({ error: 'No clock-in record found for today' })
    }
    if (attendance.clock_out) {
      return res.status(400).json({ error: 'Cannot start break after clocking out' })
    }
    if (attendance.break_start && !attendance.break_end) {
      return res.status(400).json({ error: 'Already on break' })
    }

    const { data, error } = await supabase
      .from('attendance')
      .update({ break_start: new Date().toISOString(), break_end: null })
      .eq('id', attendance.id)
      .select()
      .single()

    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── POST /api/attendance/break-end ────────────────────────────────────────────
export const endBreak = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: attendance, error: findError } = await supabase
      .from('attendance')
      .select('id, break_start, break_end, break_minutes')
      .eq('employee_id', req.user.id)
      .eq('date', today)
      .single()

    if (findError || !attendance) {
      return res.status(400).json({ error: 'No clock-in record found for today' })
    }
    if (!attendance.break_start || attendance.break_end) {
      return res.status(400).json({ error: 'No active break' })
    }

    const now = new Date()
    const durationMinutes = Math.round(
      (now - new Date(attendance.break_start)) / 60_000
    )
    const accumulated = (attendance.break_minutes ?? 0) + durationMinutes

    const { data, error } = await supabase
      .from('attendance')
      .update({
        break_end:     now.toISOString(),
        break_minutes: accumulated,
      })
      .eq('id', attendance.id)
      .select()
      .single()

    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getTeamAttendance = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0]

    let employeesQuery = supabase
      .from('employees')
      .select('id, name, department')
      .eq('is_active', true)

    if (req.user.role === 'manager') {
      employeesQuery = employeesQuery.eq('manager_id', req.user.id)
    }

    const { data: employees, error: employeeError } = await employeesQuery.order('name')
    if (employeeError) throw employeeError
    if (!employees?.length) return res.json([])

    const employeeIds = employees.map(e => e.id)

    const [{ data: attendanceRows, error: attendanceError }, { data: leaveRows, error: leaveError }] = await Promise.all([
      supabase
        .from('attendance')
        .select('*')
        .eq('date', date)
        .in('employee_id', employeeIds),
      supabase
        .from('leave_requests')
        .select('id, employee_id, type, from_date, to_date')
        .eq('status', 'approved')
        .lte('from_date', date)
        .gte('to_date', date)
        .in('employee_id', employeeIds),
    ])

    if (attendanceError) throw attendanceError
    if (leaveError) throw leaveError

    const attendanceByEmployee = new Map((attendanceRows || []).map(row => [row.employee_id, row]))
    const leaveByEmployee = new Map((leaveRows || []).map(row => [row.employee_id, row]))

    const data = employees.map(employee => {
      const attendance = attendanceByEmployee.get(employee.id)
      const leave = leaveByEmployee.get(employee.id)

      if (attendance) {
        return {
          ...attendance,
          employees: { name: employee.name, department: employee.department },
          leave_request: leave || null,
        }
      }

      return {
        id: `availability-${employee.id}-${date}`,
        employee_id: employee.id,
        date,
        clock_in: null,
        clock_out: null,
        hours_worked: null,
        status: leave ? 'on_leave' : 'absent',
        employees: { name: employee.name, department: employee.department },
        leave_request: leave || null,
      }
    })

    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
