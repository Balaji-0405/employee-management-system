import { supabase } from '../db/client.js'
import { countWorkingDaysBetween } from '../services/payroll/workingDays.js'

async function insertNotification(
  recipientId: string,
  senderId: string,
  title: string,
  message: string,
  referenceId?: string
): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      recipient_id: recipientId,
      sender_id: senderId,
      type: 'leave',
      title,
      message,
      reference_id: referenceId ?? null,
      is_read: false
    })
  } catch {
    console.error('[leave] Failed to insert notification for recipient', recipientId)
  }
}

// 1. getMyLeaveBalance
export async function getMyLeaveBalance(req: any, res: any, next: any) {
  try {
    const employeeId = req.user!.id
    const year = new Date().getFullYear()

    let { data: balance, error } = await supabase
      .from('employee_leave_balances')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('year', year)
      .maybeSingle()

    if (error) throw new Error(error.message)

    if (!balance) {
      const { data: emp } = await supabase
        .from('employees')
        .select('joining_date')
        .eq('id', employeeId)
        .single()

      const joiningYear = emp?.joining_date
        ? new Date(emp.joining_date).getFullYear() : year
      const joiningMonth = emp?.joining_date
        ? new Date(emp.joining_date).getMonth() + 1 : 1
      const monthsRemaining = joiningYear === year
        ? Math.max(1, 13 - joiningMonth) : 12
      const elAccrued = Math.round(1.5 * monthsRemaining * 10) / 10
      const slEntitled = Math.round((6 / 12) * monthsRemaining * 2) / 2

      const { data: newBalance } = await supabase
        .from('employee_leave_balances')
        .insert({
          employee_id: employeeId,
          year,
          sl_entitled: slEntitled,
          sl_used: 0,
          el_opening: 0,
          el_accrued: elAccrued,
          el_used: 0
        })
        .select()
        .single()

      balance = newBalance
    }

    const sl_balance = (balance.sl_entitled || 0) - (balance.sl_used || 0)
    const el_balance = (balance.el_opening || 0) +
                       (balance.el_accrued || 0) -
                       (balance.el_used || 0)

    const nextMonth = new Date()
    nextMonth.setDate(1)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    return res.json({
      sl_entitled: balance.sl_entitled,
      sl_used: balance.sl_used,
      sl_balance,
      el_opening: balance.el_opening,
      el_accrued: balance.el_accrued,
      el_used: balance.el_used,
      el_balance,
      next_accrual_date: nextMonth.toISOString().split('T')[0]
    })
  } catch (err) {
    next(err)
  }
}

// 2. getEmployeeLeaveBalance
export async function getEmployeeLeaveBalance(req: any, res: any, next: any) {
  try {
    const { employeeId } = req.params
    const year = new Date().getFullYear()

    if (req.user!.role === 'manager') {
      const { data: emp, error: empError } = await supabase
        .from('employees')
        .select('manager_id')
        .eq('id', employeeId)
        .single()

      if (empError || !emp) return res.status(404).json({ error: 'Employee not found' })
      if (emp.manager_id !== req.user!.id) {
        return res.status(403).json({ error: 'Employee is not a direct report' })
      }
    }

    const { data, error } = await supabase
      .from('employee_leave_balances')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('year', year)
      .single()

    if (error && error.code !== 'PGRST116') throw new Error(error.message)
    if (!data) return res.status(404).json({ error: 'Leave balance not found' })

    const sl_balance = Number(data.sl_entitled) - Number(data.sl_used)
    const el_balance = Number(data.el_opening) + Number(data.el_accrued) - Number(data.el_used)

    return res.json({ ...data, sl_balance, el_balance })
  } catch (err) {
    next(err)
  }
}

// 3. getTeamLeaveBalances
export async function getTeamLeaveBalances(req: any, res: any, next: any) {
  try {
    const year = new Date().getFullYear()

    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name')
      .eq('manager_id', req.user!.id)
      .eq('is_active', true)

    if (empError) throw new Error(empError.message)

    const results = await Promise.all(
      (employees || []).map(async (emp: any) => {
        const { data: balance } = await supabase
          .from('employee_leave_balances')
          .select('sl_entitled, sl_used, el_opening, el_accrued, el_used')
          .eq('employee_id', emp.id)
          .eq('year', year)
          .single()

        const b = balance ?? {}
        return {
          employee_id:   emp.id,
          employee_name: emp.name,
          sl_balance:    Number((b as any).sl_entitled ?? 0) - Number((b as any).sl_used ?? 0),
          el_balance:    Number((b as any).el_opening ?? 0) + Number((b as any).el_accrued ?? 0) - Number((b as any).el_used ?? 0),
        }
      })
    )

    return res.json(results)
  } catch (err) {
    next(err)
  }
}

// 4. applyLeave
export async function applyLeave(req: any, res: any, next: any) {
  try {
    const employeeId = req.user!.id
    const { leave_type, from_date, to_date, reason } = req.body

    const leaveTypeMap: Record<string, string> = {
      'SL': 'sick',
      'EL': 'earned',
      'sick': 'sick',
      'earned': 'earned',
      'casual': 'casual',
      'maternity': 'maternity',
      'lop': 'lop'
    }
    const dbLeaveType = leaveTypeMap[leave_type]
    if (!dbLeaveType) {
      return res.status(400).json({ error: "Invalid leave_type. Must be one of: SL, EL, sick, earned, casual, maternity, lop" })
    }
    if (!from_date || !to_date) {
      return res.status(400).json({ error: 'from_date and to_date are required' })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const from = new Date(from_date)
    const to   = new Date(to_date)

    if (from < today) {
      return res.status(400).json({ error: 'from_date must be today or in the future' })
    }
    if (to < from) {
      return res.status(400).json({ error: 'to_date must be >= from_date' })
    }

    const days = countWorkingDaysBetween(from, to)
    if (days === 0) {
      return res.status(400).json({ error: 'No working days in the selected date range' })
    }

    // Overlap check
    const { data: overlapping } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('status', 'approved')
      .lte('from_date', to_date)
      .gte('to_date', from_date)
      .limit(1)

    if (overlapping && overlapping.length > 0) {
      return res.status(409).json({ error: 'Overlapping leave request exists' })
    }

    // Balance check — warn but allow
    let warning: string | undefined
    const year = from.getFullYear()

    const { data: balance } = await supabase
      .from('employee_leave_balances')
      .select('sl_entitled, sl_used, el_opening, el_accrued, el_used')
      .eq('employee_id', employeeId)
      .eq('year', year)
      .single()

    if (balance) {
      const available =
        dbLeaveType === 'sick'
          ? Number(balance.sl_entitled) - Number(balance.sl_used)
          : Number(balance.el_opening) + Number(balance.el_accrued) - Number(balance.el_used)
      if (days > available) {
        warning = `Insufficient ${dbLeaveType} balance (${available} day(s) available, ${days} requested). This may result in LOP.`
      }
    }

    const { data: emp } = await supabase
      .from('employees')
      .select('manager_id, first_name, last_name')
      .eq('id', employeeId)
      .single()

    const { data: inserted, error: insertError } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: employeeId,
        type: dbLeaveType,
        from_date,
        to_date,
        days,
        reason: reason ?? null,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) throw new Error(insertError.message)

    if (emp?.manager_id) {
      const name = `${emp.first_name} ${emp.last_name}`
      await insertNotification(
        emp.manager_id,
        employeeId,
        `Leave request from ${name}`,
        `${name} applied for ${days} day(s) of ${leave_type} from ${from_date} to ${to_date}`,
        inserted.id
      )
    }

    return res.status(201).json({ ...inserted, warning })
  } catch (err) {
    next(err)
  }
}

// 5. getMyLeaveRequests
export async function getMyLeaveRequests(req: any, res: any, next: any) {
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', req.user!.id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return res.json(data || [])
  } catch (err) {
    next(err)
  }
}

// 6. getPendingLeaveApprovals
export async function getPendingLeaveApprovals(req: any, res: any, next: any) {
  try {
    const managerId = req.user?.id
    const role = req.user?.role
    console.log('[getPendingApprovals] managerId:', managerId, 'role:', role)

    let empIds: string[] = []

    if (role === 'admin') {
      const { data: allEmps } = await supabase
        .from('employees')
        .select('id')
        .eq('is_active', true)
      empIds = (allEmps || []).map((e: any) => e.id)
    } else {
      const { data: directReports, error: empError } = await supabase
        .from('employees')
        .select('id, name')
        .eq('manager_id', managerId)

      console.log('[getPendingApprovals] directReports:',
        directReports?.map((e: any) => e.name), 'error:', empError?.message)

      if (!directReports || directReports.length === 0) {
        console.log('[getPendingApprovals] No direct reports found')
        return res.json([])
      }
      empIds = directReports.map((e: any) => e.id)
    }

    console.log('[getPendingApprovals] empIds count:', empIds.length)

    // Step A — fetch leave requests without join (avoids ambiguous FK error)
    const { data: requests, error } = await supabase
      .from('leave_requests')
      .select('*')
      .in('employee_id', empIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    // Step B — fetch employee details separately
    const uniqueEmpIds = [...new Set((requests || []).map((r: any) => r.employee_id))]
    const { data: empDetails } = await supabase
      .from('employees')
      .select('id, name, department, designation')
      .in('id', uniqueEmpIds)

    const empMap = Object.fromEntries(
      (empDetails || []).map((e: any) => [e.id, e])
    )

    // Step C — merge manually
    const result = (requests || []).map((r: any) => ({
      ...r,
      employees: empMap[r.employee_id] || null,
    }))

    console.log('[getPendingApprovals] results:', result.length)
    return res.json(result)
  } catch (err) {
    next(err)
  }
}

// 7. approveLeave
export async function approveLeave(req: any, res: any, next: any) {
  try {
    const { id } = req.params

    const { data: lr, error: lrError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (lrError || !lr) return res.status(404).json({ error: 'Leave request not found' })

    if (req.user!.role !== 'admin') {
      const { data: emp } = await supabase
        .from('employees')
        .select('manager_id')
        .eq('id', (lr as any).employee_id)
        .single()
      if (emp?.manager_id !== req.user!.id) {
        return res.status(403).json({ error: 'Not authorized to approve this request' })
      }
    }
    if ((lr as any).status !== 'pending') {
      return res.status(400).json({ error: 'Leave request is not pending' })
    }

    const { data: updated, error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        reviewed_by: req.user!.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)

    await insertNotification(
      (lr as any).employee_id,
      req.user!.id,
      'Leave approved',
      `Your ${(lr as any).type} leave from ${(lr as any).from_date} to ${(lr as any).to_date} has been approved.`,
      id
    )

    return res.json(updated)
  } catch (err) {
    next(err)
  }
}

// 8. rejectLeave
export async function rejectLeave(req: any, res: any, next: any) {
  try {
    const { id } = req.params
    const { reason } = req.body

    if (!reason) return res.status(400).json({ error: 'Rejection reason is required' })

    const { data: lr, error: lrError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (lrError || !lr) return res.status(404).json({ error: 'Leave request not found' })

    if (req.user!.role !== 'admin') {
      const { data: emp } = await supabase
        .from('employees')
        .select('manager_id')
        .eq('id', (lr as any).employee_id)
        .single()
      if (emp?.manager_id !== req.user!.id) {
        return res.status(403).json({ error: 'Not authorized to reject this request' })
      }
    }
    if ((lr as any).status !== 'pending') {
      return res.status(400).json({ error: 'Leave request is not pending' })
    }

    const { data: updated, error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: 'rejected',
        reviewed_by: req.user!.id,
        reviewed_at: new Date().toISOString(),
        review_note: reason
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)

    await insertNotification(
      (lr as any).employee_id,
      req.user!.id,
      'Leave rejected',
      `Your leave request was rejected. Reason: ${reason}`,
      id
    )

    return res.json(updated)
  } catch (err) {
    next(err)
  }
}

// 9. getTeamLeaveHistory
export async function getTeamLeaveHistory(req: any, res: any, next: any) {
  try {
    const managerId = req.user?.id

    const { data: employees } = await supabase
      .from('employees')
      .select('id')
      .eq('manager_id', managerId)

    if (!employees || employees.length === 0) return res.json([])

    const empIds = (employees as any[]).map((e: any) => e.id)

    // Step A — fetch leave requests without join (avoids ambiguous FK error)
    const { data: requests, error } = await supabase
      .from('leave_requests')
      .select('*')
      .in('employee_id', empIds)
      .in('status', ['approved', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)

    // Step B — fetch employee details separately
    const uniqueEmpIds = [...new Set((requests || []).map((r: any) => r.employee_id))]
    const { data: empDetails } = await supabase
      .from('employees')
      .select('id, name, department')
      .in('id', uniqueEmpIds)

    const empMap = Object.fromEntries(
      (empDetails || []).map((e: any) => [e.id, e])
    )

    // Step C — merge manually
    const result = (requests || []).map((r: any) => ({
      ...r,
      employees: empMap[r.employee_id] || null,
      employee_name: empMap[r.employee_id]?.name ?? null,
    }))

    res.json(result)
  } catch (err) {
    next(err)
  }
}

// 10. getLeaveTransactions
export async function getLeaveTransactions(req: any, res: any, next: any) {
  try {
    const { data, error } = await supabase
      .from('leave_transactions')
      .select('*')
      .eq('employee_id', req.params.employeeId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return res.json(data || [])
  } catch (err) {
    next(err)
  }
}

// 11. cancelLeaveRequest
export const cancelLeaveRequest = async (
  req: any, res: any, next: any
) => {
  try {
    const { id } = req.params
    const employeeId = req.user?.id

    // Fetch the request first
    const { data: request, error: fetchError } = await supabase
      .from('leave_requests')
      .select('id, status, employee_id')
      .eq('id', id)
      .single()

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Leave request not found' })
    }

    // Only the owner can cancel
    if (request.employee_id !== employeeId) {
      return res.status(403).json({
        error: 'You can only cancel your own leave requests'
      })
    }

    // Can only cancel pending requests
    if (request.status !== 'pending') {
      return res.status(400).json({
        error: `Cannot cancel a ${request.status} request. Only pending requests can be cancelled.`
      })
    }

    // Update status to cancelled
    const { data, error } = await supabase
      .from('leave_requests')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    res.json({ message: 'Leave request cancelled', request: data })
  } catch (err: any) {
    console.error('[cancelLeaveRequest]', err.message)
    next(err)
  }
}
