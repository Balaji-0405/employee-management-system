import supabase from '../config/db.js'
import { createNotification } from '../utils/notifications.js'

export const getLeaveBalance = async (req, res) => {
  try {
    const year = new Date().getFullYear()

    const { data, error } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('year', year)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) return res.status(404).json({ error: 'Leave balance not found' })

    return res.json({
      ...data,
      sick_available: data.sick_leave_total - data.sick_leave_used,
      el_available: (data.earned_leave_accrued + data.carried_forward) - data.earned_leave_used
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const applyLeave = async (req, res) => {
  try {
    const { type, from_date, to_date, reason } = req.body

    console.log('Leave request body:', req.body)

    if (!type) {
      return res.status(400).json({
        error: 'Leave type is required'
      })
    }

    if (!from_date || !to_date || new Date(from_date) > new Date(to_date)) {
      return res.status(400).json({ error: 'Invalid date range: from_date must be before to_date' })
    }

    const validTypes = [
      'earned', 'sick', 'casual',
      'maternity', 'lop',
      'el', 'sl', 'cl', 'ml',
      'earned leave', 'sick leave',
      'casual leave', 'maternity leave',
      'loss of pay'
    ]

    const normalizeType = (t) => {
      const map = {
        'el': 'earned',
        'earned leave': 'earned',
        'sl': 'sick',
        'sick leave': 'sick',
        'cl': 'casual',
        'casual leave': 'casual',
        'ml': 'maternity',
        'maternity leave': 'maternity',
        'lop': 'lop',
        'loss of pay': 'lop'
      }
      return map[t?.toLowerCase()] || t?.toLowerCase()
    }

    const normalizedType = normalizeType(type)

    if (!validTypes.includes(normalizedType)) {
      return res.status(400).json({
        error: `Invalid leave type: ${type}`
      })
    }

    // Fetch approved holidays in range to exclude from leave count
    const { data: rangeHolidays } = await supabase
      .from('holidays')
      .select('date')
      .eq('status', 'approved')
      .gte('date', from_date)
      .lte('date', to_date)

    const rangeHolidayDates = new Set((rangeHolidays || []).map(h => h.date))

    let days = 0
    const leaveCursor = new Date(from_date + 'T00:00:00')
    const leaveEnd    = new Date(to_date   + 'T00:00:00')
    while (leaveCursor <= leaveEnd) {
      const dow = leaveCursor.getDay()
      const ds  = leaveCursor.toISOString().split('T')[0]
      if (dow !== 0 && dow !== 6 && !rangeHolidayDates.has(ds)) days++
      leaveCursor.setDate(leaveCursor.getDate() + 1)
    }

    if (days === 0) return res.status(400).json({ error: 'No working days in selected range' })

    const year = new Date(from_date).getFullYear()
    const { data: balance, error: balanceError } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('year', year)
      .single()

    if (balanceError || !balance) return res.status(404).json({ error: 'Leave balance not found' })

    if (normalizedType === 'sick') {
      const available = balance.sick_leave_total - balance.sick_leave_used
      if (days > available) {
        return res.status(400).json({ error: `Insufficient sick leave. Available: ${available} day${available !== 1 ? 's' : ''}, Requested: ${days} day${days !== 1 ? 's' : ''}.` })
      }
    } else if (normalizedType === 'earned') {
      const available = (balance.earned_leave_accrued + balance.carried_forward) - balance.earned_leave_used
      if (days > available) {
        return res.status(400).json({ error: `Insufficient earned leave. Available: ${available} day${available !== 1 ? 's' : ''}, Requested: ${days} day${days !== 1 ? 's' : ''}.` })
      }
    } else if (normalizedType === 'casual') {
      const total = Number(balance.casual_leave_total || 0)
      const used = Number(balance.casual_leave_used || 0)
      const available = total - used
      if (total > 0 && days > available) {
        return res.status(400).json({ error: `Insufficient casual leave. Available: ${available} day${available !== 1 ? 's' : ''}, Requested: ${days} day${days !== 1 ? 's' : ''}.` })
      }
    }
    // maternity, lop - no balance check

    const { data: employee } = await supabase
      .from('employees')
      .select('name, manager_id')
      .eq('id', req.user.id)
      .single()

    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: req.user.id,
        type: normalizedType,
        from_date,
        to_date,
        days,
        reason,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

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
        type: 'leave',
        title: `Leave request from ${employee?.name}`,
        message: `${employee?.name} has requested ${normalizedType} leave from ${from_date} to ${to_date} (${days} days). Reason: ${reason}`,
        referenceId: leaveRequest.id,
        referenceType: 'leave'
      })
    }

    return res.status(201).json(leaveRequest)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const reviewLeave = async (req, res) => {
  try {
    const { id } = req.params
    const { status, review_note } = req.body

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' })
    }

    const { data: leaveRequest, error: findError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (findError || !leaveRequest) return res.status(404).json({ error: 'Leave request not found' })
    if (leaveRequest.status !== 'pending') return res.status(400).json({ error: 'Leave request already reviewed' })

    const { data: updated, error } = await supabase
      .from('leave_requests')
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

    if (status === 'approved') {
      const trackedFields = {
        sick: 'sick_leave_used',
        earned: 'earned_leave_used',
        casual: 'casual_leave_used',
        maternity: 'maternity_leave_used',
        lop: 'lop_days_used'
      }
      const field = trackedFields[leaveRequest.type]

      if (field) {
        const year = new Date(leaveRequest.from_date).getFullYear()

        const { data: balance } = await supabase
          .from('leave_balances')
          .select(field)
          .eq('employee_id', leaveRequest.employee_id)
          .eq('year', year)
          .single()

        await supabase
          .from('leave_balances')
          .update({ [field]: (balance?.[field] || 0) + leaveRequest.days })
          .eq('employee_id', leaveRequest.employee_id)
          .eq('year', year)
      }
    }

    const { data: reviewer } = await supabase
      .from('employees')
      .select('name')
      .eq('id', req.user.id)
      .single()

    void reviewer

    await createNotification({
      recipientId: leaveRequest.employee_id,
      senderId: req.user.id,
      type: 'leave',
      title: `Leave ${status}`,
      message: `Your ${leaveRequest.type} leave from ${leaveRequest.from_date} to ${leaveRequest.to_date} was ${status}. Note: ${review_note || 'N/A'}`,
      referenceId: leaveRequest.id,
      referenceType: 'leave'
    })

    return res.json(updated)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getMyLeaveRequests = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', req.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getPendingLeaveRequests = async (req, res) => {
  try {
    let query = supabase
      .from('leave_requests')
      .select('*, employees!employee_id(name, department)')
      .eq('status', 'pending')

    if (req.user.role === 'manager') {
      const { data: reports } = await supabase
        .from('employees')
        .select('id')
        .eq('manager_id', req.user.id)

      const reportIds = (reports || []).map(r => r.id)
      if (reportIds.length === 0) return res.json([])
      query = query.in('employee_id', reportIds)
    }

    const { data, error } = await query.order('created_at', { ascending: true })
    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const accrueMonthlyLeave = async (req, res) => {
  try {
    const year = new Date().getFullYear()

    const { data: balances, error } = await supabase
      .from('leave_balances')
      .select('id, earned_leave_accrued')
      .eq('year', year)

    if (error) throw error

    for (const balance of (balances || [])) {
      const newAccrued = Math.min(balance.earned_leave_accrued + 1.5, 18)
      await supabase
        .from('leave_balances')
        .update({ earned_leave_accrued: newAccrued })
        .eq('id', balance.id)
    }

    return res.json({ message: `Accrued leave for ${(balances || []).length} employees` })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const checkBalance = async (req, res) => {
  try {
    const { type, days } = req.query
    const year = new Date().getFullYear()

    const { data: balance } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('year', year)
      .single()

    const d = Number(days || 0)
    let available = 999

    if (balance) {
      if (type === 'earned') {
        available = Math.max(0,
          (Number(balance.earned_leave_accrued) || 0) +
          (Number(balance.carried_forward) || 0) -
          (Number(balance.earned_leave_used) || 0)
        )
      } else if (type === 'sick') {
        available = Math.max(0,
          (Number(balance.sick_leave_total) || 0) -
          (Number(balance.sick_leave_used) || 0)
        )
      } else if (type === 'casual') {
        const total = Number(balance.casual_leave_total) || 0
        available = total > 0
          ? Math.max(0, total - (Number(balance.casual_leave_used) || 0))
          : 999
      }
      // maternity, lop — no cap, available stays 999
    }

    return res.json({
      available,
      requested: d,
      sufficient: d <= available,
      type,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getEmployeeBalanceById = async (req, res) => {
  try {
    const { employeeId } = req.params
    const year = new Date().getFullYear()

    const { data: balance, error } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('year', year)
      .single()

    if (error || !balance) {
      return res.status(404).json({ error: 'Balance not found' })
    }

    return res.json(balance)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getTeamLeaves = async (req, res) => {
  try {
    const managerId = req.user.id

    const { data: employees } = await supabase
      .from('employees')
      .select('id')
      .eq('manager_id', managerId)

    const employeeIds = (employees || []).map(e => e.id)

    if (employeeIds.length === 0) {
      return res.json([])
    }

    const { data: leaves, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        employees:employee_id (
          name, department, email, position
        )
      `)
      .in('employee_id', employeeIds)
      .order('created_at', { ascending: false })

    if (error) throw error
    return res.json(leaves || [])
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const carryForwardLeaves = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear()
    const nextYear = currentYear + 1

    const { data: balances, error } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('year', currentYear)

    if (error) throw error

    for (const balance of (balances || [])) {
      const unusedEl = balance.earned_leave_accrued - balance.earned_leave_used
      const carry = Math.min(Math.max(unusedEl, 0), 20)

      await supabase.from('leave_balances').upsert({
        employee_id: balance.employee_id,
        year: nextYear,
        sick_leave_total: 6,
        sick_leave_used: 0,
        earned_leave_accrued: 0,
        earned_leave_used: 0,
        carried_forward: carry
      }, { onConflict: 'employee_id,year' })
    }

    return res.json({ message: `Carried forward leaves for ${(balances || []).length} employees to ${nextYear}` })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
