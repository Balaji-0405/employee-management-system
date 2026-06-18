import { supabase } from '../../db/client'

export async function monthlyELAccrual(): Promise<void> {
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id')
    .eq('is_active', true)

  if (empError) throw new Error(empError.message)

  const now = new Date()
  const currentYear = now.getFullYear()
  const monthName = now.toLocaleString('en-US', { month: 'long' })

  for (const emp of (employees || [])) {
    const { data: existing } = await supabase
      .from('employee_leave_balances')
      .select('el_accrued')
      .eq('employee_id', emp.id)
      .eq('year', currentYear)
      .single()

    if (existing) {
      await supabase
        .from('employee_leave_balances')
        .update({ el_accrued: Number(existing.el_accrued) + 1.5, updated_at: new Date().toISOString() })
        .eq('employee_id', emp.id)
        .eq('year', currentYear)
    } else {
      await supabase
        .from('employee_leave_balances')
        .insert({ employee_id: emp.id, year: currentYear, el_accrued: 1.5, el_opening: 0, updated_at: new Date().toISOString() })
    }

    const { data: updated } = await supabase
      .from('employee_leave_balances')
      .select('el_opening, el_accrued, el_used')
      .eq('employee_id', emp.id)
      .eq('year', currentYear)
      .single()

    const balanceAfter = updated
      ? Number(updated.el_opening) + Number(updated.el_accrued) - Number(updated.el_used)
      : 1.5

    await supabase
      .from('leave_transactions')
      .insert({
        employee_id: emp.id,
        transaction_type: 'accrual',
        leave_type: 'EL',
        days: 1.5,
        balance_after: balanceAfter,
        notes: `Monthly EL accrual — ${monthName} ${currentYear}`
      })
  }
}

export async function yearEndProcessing(): Promise<void> {
  const currentYear = new Date().getFullYear()
  const nextYear = currentYear + 1

  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id')
    .eq('is_active', true)

  if (empError) throw new Error(empError.message)

  for (const emp of (employees || [])) {
    const { data: balance } = await supabase
      .from('employee_leave_balances')
      .select('el_opening, el_accrued, el_used')
      .eq('employee_id', emp.id)
      .eq('year', currentYear)
      .single()

    if (!balance) continue

    const currentELBalance = Number(balance.el_opening) + Number(balance.el_accrued) - Number(balance.el_used)
    const carryForward = Math.min(currentELBalance, 20)
    const lapsed = currentELBalance - carryForward

    await supabase
      .from('employee_leave_balances')
      .update({ el_lapsed_eoy: lapsed })
      .eq('employee_id', emp.id)
      .eq('year', currentYear)

    if (lapsed > 0) {
      await supabase
        .from('leave_transactions')
        .insert({
          employee_id: emp.id,
          transaction_type: 'lapse',
          leave_type: 'EL',
          days: -lapsed,
          balance_after: carryForward,
          notes: `Year-end lapse ${currentYear}. Balance was ${currentELBalance}, carried ${carryForward} days.`
        })
    }

    await supabase
      .from('leave_transactions')
      .insert({
        employee_id: emp.id,
        transaction_type: 'carry_forward',
        leave_type: 'EL',
        days: carryForward,
        balance_after: carryForward,
        notes: `Carry forward to ${nextYear}. Applied MAX 20 day limit.`
      })

    const { data: nextYearRow } = await supabase
      .from('employee_leave_balances')
      .select('id')
      .eq('employee_id', emp.id)
      .eq('year', nextYear)
      .maybeSingle()

    if (nextYearRow) {
      await supabase
        .from('employee_leave_balances')
        .update({ el_opening: carryForward })
        .eq('employee_id', emp.id)
        .eq('year', nextYear)
    } else {
      await supabase
        .from('employee_leave_balances')
        .insert({
          employee_id: emp.id,
          year: nextYear,
          sl_entitled: 6,
          sl_used: 0,
          el_opening: carryForward,
          el_accrued: 0,
          el_used: 0,
          el_lapsed_eoy: 0
        })
    }
  }
}

export async function prorateNewJoinerLeaves(
  employeeId: string,
  joiningDate: Date
): Promise<void> {
  const joiningMonth = joiningDate.getMonth() + 1
  const joiningYear = joiningDate.getFullYear()
  const monthsRemaining = 12 - joiningMonth + 1

  const elAccrued = 1.5 * monthsRemaining
  const slEntitled = Math.round((6 / 12) * monthsRemaining * 2) / 2

  const { data: existing } = await supabase
    .from('employee_leave_balances')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('year', joiningYear)
    .maybeSingle()

  if (!existing) {
    await supabase
      .from('employee_leave_balances')
      .insert({
        employee_id: employeeId,
        year: joiningYear,
        sl_entitled: slEntitled,
        sl_used: 0,
        el_opening: 0,
        el_accrued: elAccrued,
        el_used: 0
      })
  }

  await supabase
    .from('leave_transactions')
    .insert({
      employee_id: employeeId,
      transaction_type: 'proration',
      leave_type: 'EL',
      days: elAccrued,
      balance_after: elAccrued,
      notes: `New joiner proration — ${monthsRemaining} months remaining in ${joiningYear}`
    })

  await supabase
    .from('leave_transactions')
    .insert({
      employee_id: employeeId,
      transaction_type: 'proration',
      leave_type: 'SL',
      days: slEntitled,
      balance_after: slEntitled,
      notes: `New joiner SL proration — ${joiningYear}`
    })
}
