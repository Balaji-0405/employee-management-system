import { supabase } from '../db/client'

// ─── HELPER ──────────────────────────────────────────────────
function toRupees(paise: number | null): number {
  return paise ? paise / 100 : 0
}

// ─── GET ALL RUNS ─────────────────────────────────────────────
export const getPayrollRuns = async (_req: any, res: any, next: any) => {
  try {
    const { data, error } = await supabase
      .from('payroll_runs')
      .select('*')
      .order('pay_year', { ascending: false })
      .order('pay_month', { ascending: false })

    if (error) throw new Error(error.message)
    res.json(data || [])
  } catch (err: any) {
    console.error('[getPayrollRuns]', err.message)
    next(err)
  }
}

// ─── GET RUN BY ID ────────────────────────────────────────────
export const getPayrollRunById = async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params

    const { data: run, error } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)
    if (!run) return res.status(404).json({ error: 'Run not found' })

    // Get blockers: active employees with no salary config
    const { data: employees } = await supabase
      .from('employees')
      .select('id, name')
      .eq('is_active', true)

    const { data: configs } = await supabase
      .from('employee_salary_config')
      .select('employee_id')

    const configuredIds = new Set((configs || []).map((c: any) => c.employee_id))
    const blockers = (employees || [])
      .filter((e: any) => !configuredIds.has(e.id))
      .map((e: any) => ({
        employeeId: e.id,
        employeeName: e.name || e.id,
        error: 'No salary configuration'
      }))

    res.json({ ...run, blockers })
  } catch (err: any) {
    console.error('[getPayrollRunById]', err.message)
    next(err)
  }
}

// ─── CREATE RUN ───────────────────────────────────────────────
export const createPayrollRun = async (req: any, res: any, next: any) => {
  try {
    const { pay_month, pay_year } = req.body

    if (!pay_month || !pay_year) {
      return res.status(400).json({ error: 'pay_month and pay_year are required' })
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from('payroll_runs')
      .select('id')
      .eq('pay_month', pay_month)
      .eq('pay_year', pay_year)
      .maybeSingle()

    if (existing) {
      return res.status(409).json({ error: 'Payroll run already exists for this period' })
    }

    const { data, error } = await supabase
      .from('payroll_runs')
      .insert({
        pay_month,
        pay_year,
        status: 'draft',
        initiated_by: req.user?.id || null
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    res.status(201).json(data)
  } catch (err: any) {
    console.error('[createPayrollRun]', err.message)
    next(err)
  }
}

// ─── COMPUTE RUN ──────────────────────────────────────────────
export const computePayrollRun = async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params

    // Fetch all non-deleted employees
    // Try is_active = true first, fall back to all employees
    let employees: any[] = []

    const { data: activeEmps } = await supabase
      .from('employees')
      .select('id, name, department, designation, is_active, status')
      .eq('is_active', true)


    if (!activeEmps || activeEmps.length === 0) {
      // Fallback: get all employees regardless of is_active
      const { data: allEmps } = await supabase
        .from('employees')
        .select('id, name, department, designation, is_active, status')
        .not('name', 'is', null)

      employees = allEmps || []
    } else {
      employees = activeEmps
    }

    const now = new Date()
    const payMonth = now.getMonth() + 1
    const payYear = now.getFullYear()
    const workingDays = 26

    let totalGross = 0
    let totalNet = 0
    let totalDeductions = 0
    const blockers: any[] = []
    const payslips: any[] = []

    for (const emp of (employees || [])) {
      try {
        // Get latest salary config
        const { data: configs } = await supabase
          .from('employee_salary_config')
          .select('*')
          .eq('employee_id', emp.id)
          .order('effective_from', { ascending: false })
          .limit(1)

        if (!configs || configs.length === 0) {
          blockers.push({
            employeeId: emp.id,
            employeeName: emp.name || emp.id,
            error: 'No salary configuration found'
          })
          continue
        }

        const config = configs[0]
        const basicSalary = config.basic_salary  // in paise

        const monthStart = `${payYear}-${String(payMonth).padStart(2,'0')}-01`
        const monthEnd = new Date(payYear, payMonth, 0).toISOString().split('T')[0]

        const { data: attRecords } = await supabase
          .from('attendance')
          .select('date, clock_in, clock_out, status')
          .eq('employee_id', emp.id)
          .gte('date', monthStart)
          .lte('date', monthEnd)

        let presentDays = workingDays
        if (attRecords && attRecords.length > 0) {
          presentDays = attRecords.filter(
            (a: any) => a.clock_in !== null && a.clock_in !== undefined
          ).length
          if (presentDays === 0) presentDays = workingDays
        }

        const absentDays = workingDays - presentDays

        const { data: approvedLeaves } = await supabase
          .from('leave_requests')
          .select('type, days')
          .eq('employee_id', emp.id)
          .eq('status', 'approved')
          .gte('from_date', monthStart)
          .lte('to_date', monthEnd)

        const leaveDaysApproved = (approvedLeaves || []).reduce(
          (sum: number, l: any) => sum + Number(l.days || 0), 0
        )

        const lopDays = Math.max(0, absentDays - leaveDaysApproved)
        const slUsed = (approvedLeaves || [])
          .filter((l: any) => l.type === 'sick')
          .reduce((sum: number, l: any) => sum + Number(l.days || 0), 0)
        const elUsed = (approvedLeaves || [])
          .filter((l: any) => l.type === 'earned')
          .reduce((sum: number, l: any) => sum + Number(l.days || 0), 0)

        // overtime_hours column not found in timesheets
        const otHours = 0
        const otPay = 0

        // Get one-time items
        const { data: oneTime } = await supabase
          .from('payroll_one_time_items')
          .select('*')
          .eq('run_id', id)
          .eq('employee_id', emp.id)

        const bonus = (oneTime || [])
          .filter((i: any) => i.item_type === 'bonus')
          .reduce((sum: number, i: any) => sum + i.amount, 0)
        const extraDeductions = (oneTime || [])
          .filter((i: any) => i.item_type === 'deduction')
          .reduce((sum: number, i: any) => sum + i.amount, 0)

        const lopDeduction = Math.round((config.basic_salary / workingDays) * lopDays)

        // Gross
        const grossSalary = basicSalary + otPay + bonus

        // PT lookup
        const { data: ptSlab } = await supabase
          .from('pt_slabs')
          .select('pt_amount')
          .eq('state_code', config.pt_state || 'KA')
          .lte('min_gross', grossSalary)
          .or(`max_gross.is.null,max_gross.gte.${grossSalary}`)
          .order('min_gross', { ascending: false })
          .limit(1)

        const ptDeduction = ptSlab && ptSlab.length > 0 ? ptSlab[0].pt_amount : 0
        const insuranceDeduction = config.insurance_premium || 0
        const loanDeduction = config.loan_emi || 0

        const totalDed = lopDeduction + ptDeduction + insuranceDeduction + loanDeduction + extraDeductions
        const netSalary = Math.max(0, grossSalary - totalDed)

        totalGross += grossSalary
        totalNet += netSalary
        totalDeductions += totalDed

        payslips.push({
          run_id: id,
          employee_id: emp.id,
          working_days: workingDays,
          present_days: presentDays,
          sl_used: slUsed,
          el_used: elUsed,
          lop_days: lopDays,
          basic_salary: basicSalary,
          ot_hours: otHours,
          ot_pay: otPay,
          bonus,
          gross_salary: grossSalary,
          lop_deduction: lopDeduction,
          pt_deduction: ptDeduction,
          insurance_deduction: insuranceDeduction,
          loan_deduction: loanDeduction,
          total_deductions: totalDed,
          net_salary: netSalary,
          is_override: false
        })
      } catch (empErr: any) {
        console.error(`[computePayrollRun] Employee ${emp.id} failed:`, empErr.message)
        blockers.push({
          employeeId: emp.id,
          employeeName: emp.name || emp.id,
          error: empErr.message
        })
      }
    }

    // Upsert all payslips
    if (payslips.length > 0) {
      const { error: psError } = await supabase
        .from('payslips')
        .upsert(payslips, { onConflict: 'run_id,employee_id', ignoreDuplicates: false })

      if (psError) throw new Error(psError.message)
    }

    // Update run totals
    const { data: updatedRun, error: updateError } = await supabase
      .from('payroll_runs')
      .update({
        status: blockers.length === 0 ? 'computed' : 'draft',
        total_gross: totalGross,
        total_net: totalNet,
        total_deductions: totalDeductions,
        total_employees: payslips.length
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)

    res.json({
      success: blockers.length === 0,
      processedCount: payslips.length,
      blockers,
      summary: {
        totalGross: toRupees(totalGross),
        totalNet: toRupees(totalNet),
        totalDeductions: toRupees(totalDeductions),
        totalEmployees: payslips.length
      },
      run: updatedRun
    })
  } catch (err: any) {
    console.error('[computePayrollRun]', err.message)
    next(err)
  }
}

// ─── GET REGISTER ─────────────────────────────────────────────
export const getPayrollRegister = async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params
    const { search, department } = req.query

    // Try join first — works after FK is added to Supabase
    let data: any[] = []
    let useJoin = true

    const { data: joined, error: joinError } = await supabase
      .from('payslips')
      .select(`
        *,
        employees (
          id,
          name,
          designation,
          department
        )
      `)
      .eq('run_id', id)

    if (joinError) {
      // FK not yet added — fetch payslips without join
      console.warn('[getPayrollRegister] Join failed, fetching without employee data:', joinError.message)
      useJoin = false

      const { data: plain, error: plainError } = await supabase
        .from('payslips')
        .select('*')
        .eq('run_id', id)

      if (plainError) throw new Error(plainError.message)
      data = plain || []
    } else {
      data = joined || []
    }

    // Apply filters
    let result = data
    if (search) {
      const s = (search as string).toLowerCase()
      result = result.filter((p: any) => {
        const name = useJoin
          ? (p.employees?.name || '').toLowerCase()
          : ''
        return name.includes(s) || p.employee_id?.includes(s)
      })
    }
    if (department && department !== 'all') {
      result = result.filter((p: any) =>
        useJoin
          ? p.employees?.department?.toLowerCase() === (department as string).toLowerCase()
          : true
      )
    }

    // Format for display — convert paise to rupees
    const formatted = result.map((p: any) => ({
      ...p,
      employeeName: useJoin
        ? (p.employees?.name || `Employee ${p.employee_id?.slice(0, 8)}`)
        : `Employee ${p.employee_id?.slice(0, 8)}`,
      department: useJoin ? (p.employees?.department || '—') : '—',
      designation: useJoin ? (p.employees?.designation || '—') : '—',
      basic_salary_rs: (p.basic_salary || 0) / 100,
      ot_pay_rs: (p.ot_pay || 0) / 100,
      bonus_rs: (p.bonus || 0) / 100,
      gross_salary_rs: (p.gross_salary || 0) / 100,
      lop_deduction_rs: (p.lop_deduction || 0) / 100,
      pt_deduction_rs: (p.pt_deduction || 0) / 100,
      insurance_deduction_rs: (p.insurance_deduction || 0) / 100,
      loan_deduction_rs: (p.loan_deduction || 0) / 100,
      total_deductions_rs: (p.total_deductions || 0) / 100,
      net_salary_rs: (p.net_salary || 0) / 100,
    }))

    res.json(formatted)
  } catch (err: any) {
    console.error('[getPayrollRegister]', err.message)
    next(err)
  }
}

// ─── LOCK ─────────────────────────────────────────────────────
export const lockPayrollRun = async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params
    const { data: run } = await supabase
      .from('payroll_runs').select('status').eq('id', id).single()

    if (!run) return res.status(404).json({ error: 'Run not found' })
    if (run.status !== 'computed')
      return res.status(400).json({ error: 'Only computed runs can be locked' })

    const { data, error } = await supabase
      .from('payroll_runs')
      .update({ status: 'locked', locked_at: new Date().toISOString(), locked_by: req.user?.id || null })
      .eq('id', id).select().single()

    if (error) throw new Error(error.message)
    res.json(data)
  } catch (err: any) { next(err) }
}

// ─── DISBURSE ─────────────────────────────────────────────────
export const disbursePayrollRun = async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params
    const { data: run } = await supabase
      .from('payroll_runs').select('status').eq('id', id).single()

    if (!run) return res.status(404).json({ error: 'Run not found' })
    if (run.status !== 'locked')
      return res.status(400).json({ error: 'Only locked runs can be disbursed' })

    const { data, error } = await supabase
      .from('payroll_runs')
      .update({ status: 'disbursed', disbursed_at: new Date().toISOString(), disbursed_by: req.user?.id || null })
      .eq('id', id).select().single()

    if (error) throw new Error(error.message)
    res.json(data)
  } catch (err: any) { next(err) }
}

// ─── SALARY CONFIG ────────────────────────────────────────────
export const getSalaryConfig = async (req: any, res: any, next: any) => {
  try {
    const { employeeId } = req.params
    const { data, error } = await supabase
      .from('employee_salary_config')
      .select('*')
      .eq('employee_id', employeeId)
      .order('effective_from', { ascending: false })

    if (error) throw new Error(error.message)

    const formatted = (data || []).map((c: any) => ({
      ...c,
      basic_salary_rs: toRupees(c.basic_salary),
      insurance_premium_rs: toRupees(c.insurance_premium),
      loan_emi_rs: toRupees(c.loan_emi),
    }))

    res.json(formatted)
  } catch (err: any) { next(err) }
}

export const upsertSalaryConfig = async (req: any, res: any, next: any) => {
  try {
    const { employeeId } = req.params
    const { basic_salary, insurance_premium, pt_state, loan_emi, effective_from } = req.body

    if (!basic_salary || Number(basic_salary) <= 0) {
      return res.status(400).json({ error: 'basic_salary must be greater than 0' })
    }

    const effectiveDate = effective_from || new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('employee_salary_config')
      .upsert(
        {
          employee_id: employeeId,
          basic_salary: Math.round(Number(basic_salary) * 100),
          insurance_premium: Math.round(Number(insurance_premium || 0) * 100),
          pt_state: pt_state || 'KA',
          loan_emi: Math.round(Number(loan_emi || 0) * 100),
          effective_from: effectiveDate,
          created_by: req.user?.id || null
        },
        { onConflict: 'employee_id,effective_from' }
      )
      .select()
      .single()

    if (error) {
      console.error('[upsertSalaryConfig] Error:', error.message)
      throw new Error(error.message)
    }

    res.status(201).json(data)
  } catch (err: any) {
    console.error('[upsertSalaryConfig]', err.message)
    next(err)
  }
}

export const seedSalaryConfigs = async (req: any, res: any, next: any) => {
  try {
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, basic_salary, department')
      .not('basic_salary', 'is', null)
      .gt('basic_salary', 0)

    if (empError) throw new Error(empError.message)

    const { data: existing } = await supabase
      .from('employee_salary_config')
      .select('employee_id')

    const existingIds = new Set((existing || []).map((e: any) => e.employee_id))
    const toSeed = (employees || []).filter((e: any) => !existingIds.has(e.id))

    if (toSeed.length === 0) {
      return res.json({ message: 'All employees already have salary configs', seeded: 0 })
    }

    const configs = toSeed.map((emp: any) => ({
      employee_id: emp.id,
      basic_salary: Math.round(Number(emp.basic_salary) * 100),
      insurance_premium: 50000,  // default ₹500/month
      pt_state: 'KA',
      loan_emi: 0,
      effective_from: '2026-01-01',
      created_by: null
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('employee_salary_config')
      .upsert(configs, { onConflict: 'employee_id,effective_from' })
      .select()

    if (insertError) throw new Error(insertError.message)

    res.json({
      message: `Seeded salary configs for ${inserted?.length} employees`,
      seeded: inserted?.length,
      employees: toSeed.map((e: any) => ({ name: e.name, basic_salary_rs: e.basic_salary }))
    })
  } catch (err: any) {
    console.error('[seedSalaryConfigs]', err.message)
    next(err)
  }
}

// ─── ONE-TIME ITEMS ───────────────────────────────────────────
export const addOneTimeItem = async (req: any, res: any, next: any) => {
  try {
    const { run_id, employee_id, item_type, amount_rupees, label } = req.body

    const { data, error } = await supabase
      .from('payroll_one_time_items')
      .insert({
        run_id, employee_id, item_type,
        amount: Math.round(amount_rupees * 100),
        label,
        added_by: req.user?.id || null
      })
      .select().single()

    if (error) throw new Error(error.message)
    res.status(201).json(data)
  } catch (err: any) { next(err) }
}

// ─── OVERRIDE PAYSLIP ─────────────────────────────────────────
export const overridePayslip = async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params
    const { net_salary_override, reason } = req.body

    if (!reason || reason.length < 10)
      return res.status(400).json({ error: 'Reason must be at least 10 characters' })

    const { data, error } = await supabase
      .from('payslips')
      .update({
        net_salary: Math.round(net_salary_override * 100),
        is_override: true,
        override_reason: reason,
        override_by: req.user?.id || null,
        override_at: new Date().toISOString()
      })
      .eq('id', id).select().single()

    if (error) throw new Error(error.message)
    res.json(data)
  } catch (err: any) { next(err) }
}

// ─── MY PAYSLIPS (employee self-service) ──────────────────────
export const getMyPayslips = async (req: any, res: any, next: any) => {
  try {
    // Support all possible field names from JWT payload
    const employeeId =
      req.user?.employeeId ||
      req.user?.employee_id ||
      req.user?.id ||
      req.user?.userId ||
      req.user?.sub

    if (!employeeId) {
      return res.status(401).json({
        error: 'Cannot determine employee ID from token'
      })
    }

    // Get all disbursed runs
    const { data: runs, error: runErr } = await supabase
      .from('payroll_runs')
      .select('id, pay_month, pay_year, status, disbursed_at')
      .eq('status', 'disbursed')

    if (runErr) throw new Error(runErr.message)
    if (!runs || runs.length === 0) {
      return res.json([])
    }

    const runIds = runs.map((r: any) => r.id)

    // Get payslips for this employee
    const { data: payslips, error: psErr } = await supabase
      .from('payslips')
      .select('*')
      .eq('employee_id', employeeId)
      .in('run_id', runIds)
      .order('created_at', { ascending: false })

    if (psErr) throw new Error(psErr.message)

    // Attach run info to each payslip
    const runMap = Object.fromEntries(
      runs.map((r: any) => [r.id, r])
    )
    const result = (payslips || []).map((p: any) => ({
      ...p,
      payroll_runs: runMap[p.run_id] || null
    }))

    res.json(result)
  } catch (err: any) {
    console.error('[getMyPayslips]', err.message)
    next(err)
  }
}

export const getMyPayslipDetail = async (req: any, res: any, next: any) => {
  try {
    const { runId } = req.params
    const employeeId = req.user?.employeeId || req.user?.id

    const { data, error } = await supabase
      .from('payslips')
      .select('*, payroll_runs(pay_month, pay_year, status, disbursed_at)')
      .eq('run_id', runId)
      .eq('employee_id', employeeId)
      .single()

    if (error) throw new Error(error.message)

    res.json({
      ...data,
      basic_salary_rs: toRupees(data.basic_salary),
      gross_salary_rs: toRupees(data.gross_salary),
      net_salary_rs: toRupees(data.net_salary),
      pt_deduction_rs: toRupees(data.pt_deduction),
      insurance_deduction_rs: toRupees(data.insurance_deduction),
      lop_deduction_rs: toRupees(data.lop_deduction),
      total_deductions_rs: toRupees(data.total_deductions),
    })
  } catch (err: any) { next(err) }
}

// ─── BANK FILE ────────────────────────────────────────────────
export const getBankFile = async (req: any, res: any, next: any) => {
  try {
    const { id: runId } = req.params

    const { data, error } = await supabase
      .from('payslips')
      .select('net_salary, employee_id, employees(name)')
      .eq('run_id', runId)

    if (error) throw new Error(error.message)

    const rows = (data || []).map((p: any) =>
      `${p.employee_id},"${p.employees?.name || ''}",${toRupees(p.net_salary)}`
    )

    const csv = ['Employee ID,Name,Net Salary (INR)', ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="payroll_bank.csv"`)
    res.send(csv)
  } catch (err: any) { next(err) }
}
