import supabase from '../config/db.js'
import { createNotification } from '../utils/notifications.js'

// ── Statutory constants ────────────────────────────────────────────────────────

const PF_RATE = 0.12

const ESI_EMPLOYEE_RATE = 0.0075
const ESI_EMPLOYER_RATE = 0.0325
const ESI_THRESHOLD     = 21000

function getProfessionalTax(grossMonthly) {
  if (grossMonthly <= 15000) return 0
  if (grossMonthly <= 20000) return 150
  return 200
}

function getMonthlyTDS(basicMonthly) {
  const annual = basicMonthly * 12
  if (annual <= 500000)  return 0
  if (annual <= 1000000) return Math.round((annual * 0.10) / 12)
  if (annual <= 1500000) return Math.round((annual * 0.20) / 12)
  return Math.round((annual * 0.30) / 12)
}

const STANDARD_HOURS_PER_DAY = 9
const OVERTIME_MULTIPLIER    = 1.5
const LATE_THRESHOLD         = 3

// ── Controllers ────────────────────────────────────────────────────────────────

export const processMonthlyPayroll = async (req, res) => {
  try {
    const { month, year } = req.body

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' })
    }

    const monthStr   = String(month).padStart(2, '0')
    const monthStart = `${year}-${monthStr}-01`
    const lastDay    = new Date(year, month, 0).getDate()
    const monthEnd   = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`

    // Fetch approved holidays to exclude from working days
    const { data: monthHolidays } = await supabase
      .from('holidays')
      .select('date')
      .eq('status', 'approved')
      .gte('date', monthStart)
      .lte('date', monthEnd)

    const holidayDates = new Set((monthHolidays || []).map(h => h.date))

    let workingDays = 0
    for (let d = 1; d <= lastDay; d++) {
      const dow = new Date(Number(year), Number(month) - 1, d).getDay()
      const ds  = `${year}-${monthStr}-${String(d).padStart(2, '0')}`
      if (dow !== 0 && dow !== 6 && !holidayDates.has(ds)) workingDays++
    }

    if (workingDays === 0) {
      return res.status(400).json({ error: 'No working days found' })
    }

    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, basic_salary, insurance_amount')
      .eq('is_active', true)

    if (empError) throw empError

    const results = []

    for (const employee of employees) {
      const basicSalary = parseFloat(employee.basic_salary) || 0

      // ── 1. ATTENDANCE ────────────────────────────────────────────────────────

      const { count: presentCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', employee.id)
        .in('status', ['present', 'late'])
        .gte('date', monthStart)
        .lte('date', monthEnd)

      const presentDays = presentCount || 0

      const { count: lateCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', employee.id)
        .eq('status', 'late')
        .gte('date', monthStart)
        .lte('date', monthEnd)

      const lateArrivals = lateCount || 0

      // ── 2. APPROVED LEAVES ───────────────────────────────────────────────────

      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('days')
        .eq('employee_id', employee.id)
        .eq('status', 'approved')
        .gte('from_date', monthStart)
        .lte('to_date', monthEnd)

      const leaveDays = (leaveData || []).reduce(
        (sum, lr) => sum + (lr.days || 0), 0
      )

      // ── 3. ABSENT DAYS ───────────────────────────────────────────────────────

      const absentDays = Math.max(workingDays - presentDays - leaveDays, 0)

      // ── Edge case: no base salary ────────────────────────────────────────────

      if (basicSalary === 0) {
        const { data: zeroRecord, error: zeroErr } = await supabase
          .from('payroll')
          .upsert({
            employee_id:     employee.id,
            month:           Number(month),
            year:            Number(year),
            basic_salary:    0,
            working_days:    workingDays,
            present_days:    presentDays,
            leave_days:      leaveDays,
            absent_days:     absentDays,
            daily_rate:      0,
            leave_deduction: 0,
            gross_salary:    0,
            overtime_hours:  0,
            overtime_pay:    0,
            late_count:      lateArrivals,
            late_penalty:    0,
            pf_employee:     0,
            pf_employer:     0,
            esi_employee:    0,
            esi_employer:    0,
            professional_tax: 0,
            insurance:       0,
            tds:             0,
            total_deductions: 0,
            net_salary:      0,
            status:          'processed',
            processed_at:    new Date().toISOString(),
            payslip_notes:   null,
          }, { onConflict: 'employee_id,month,year' })
          .select()
          .single()

        if (zeroErr) throw zeroErr

        results.push({
          employee_id: employee.id, name: employee.name,
          basic_salary: 0, gross_salary: 0, overtime_pay: 0,
          total_deductions: 0, net_salary: 0, present_days: presentDays,
          absent_days: absentDays, late_count: lateArrivals,
          pf_employee: 0, esi_employee: 0, professional_tax: 0,
          insurance: 0, tds: 0,
        })
        continue
      }

      // ── 4. RATE CALCULATIONS ─────────────────────────────────────────────────

      const dailyRate  = parseFloat((basicSalary / workingDays).toFixed(4))
      const hourlyRate = parseFloat(
        (basicSalary / (workingDays * STANDARD_HOURS_PER_DAY)).toFixed(4)
      )

      // ── 5. TIMESHEET OVERTIME ────────────────────────────────────────────────

      const { data: timesheets } = await supabase
        .from('timesheets')
        .select('total_hours, week_start, week_end')
        .eq('employee_id', employee.id)
        .eq('status', 'approved')
        .gte('week_start', monthStart)
        .lte('week_end', monthEnd)

      let overtimeHours = 0

      if (timesheets && timesheets.length > 0) {
        for (const ts of timesheets) {
          const actualHours = parseFloat(ts.total_hours) || 0

          const weekStart = new Date(ts.week_start + 'T00:00:00')
          const weekEnd   = new Date(ts.week_end   + 'T00:00:00')
          let weekWorkingDays = 0
          const cur = new Date(weekStart)
          while (cur <= weekEnd) {
            const dow = cur.getDay()
            if (dow !== 0 && dow !== 6) weekWorkingDays++
            cur.setDate(cur.getDate() + 1)
          }

          const expectedHours = weekWorkingDays * STANDARD_HOURS_PER_DAY
          overtimeHours += Math.max(actualHours - expectedHours, 0)
        }
      }

      overtimeHours = parseFloat(overtimeHours.toFixed(2))

      // ── 6. EARNINGS ──────────────────────────────────────────────────────────

      const overtimePay = parseFloat(
        (overtimeHours * hourlyRate * OVERTIME_MULTIPLIER).toFixed(2)
      )
      const grossSalary = parseFloat((basicSalary + overtimePay).toFixed(2))

      // ── 7. DEDUCTIONS ────────────────────────────────────────────────────────

      const absentDeduction = parseFloat((absentDays * dailyRate).toFixed(2))

      const penalizableLates = Math.max(lateArrivals - LATE_THRESHOLD, 0)
      const latePenalty      = parseFloat(
        (penalizableLates * (dailyRate / 2)).toFixed(2)
      )

      const pfEmployee = parseFloat((basicSalary * PF_RATE).toFixed(2))
      const pfEmployer = parseFloat((basicSalary * PF_RATE).toFixed(2))

      const esiEmployee = grossSalary <= ESI_THRESHOLD
        ? parseFloat((grossSalary * ESI_EMPLOYEE_RATE).toFixed(2))
        : 0
      const esiEmployer = grossSalary <= ESI_THRESHOLD
        ? parseFloat((grossSalary * ESI_EMPLOYER_RATE).toFixed(2))
        : 0

      const professionalTax = getProfessionalTax(grossSalary)
      const insurance       = parseFloat(employee.insurance_amount || 0)
      const tds             = getMonthlyTDS(basicSalary)

      const totalDeductions = parseFloat((
        absentDeduction +
        latePenalty     +
        pfEmployee      +
        esiEmployee     +
        professionalTax +
        insurance       +
        tds
      ).toFixed(2))

      const netSalary = parseFloat(
        Math.max(grossSalary - totalDeductions, 0).toFixed(2)
      )

      // ── 8. PAYSLIP NOTES ─────────────────────────────────────────────────────

      const notes = []
      if (overtimeHours > 0) {
        notes.push(
          `OT: ${overtimeHours}h @ ₹${(hourlyRate * OVERTIME_MULTIPLIER).toFixed(0)}/h`
        )
      }
      if (lateArrivals > LATE_THRESHOLD) {
        notes.push(
          `Late penalty: ${penalizableLates} instance(s) beyond threshold`
        )
      }
      if (absentDays > 0) {
        notes.push(`Absent: ${absentDays} day(s)`)
      }

      // ── 9. UPSERT ────────────────────────────────────────────────────────────

      const { data: payrollRecord, error: payrollError } = await supabase
        .from('payroll')
        .upsert({
          employee_id:      employee.id,
          month:            Number(month),
          year:             Number(year),
          basic_salary:     basicSalary,
          working_days:     workingDays,
          present_days:     presentDays,
          leave_days:       leaveDays,
          absent_days:      absentDays,
          daily_rate:       dailyRate,
          leave_deduction:  absentDeduction,
          gross_salary:     grossSalary,
          overtime_hours:   overtimeHours,
          overtime_pay:     overtimePay,
          late_count:       lateArrivals,
          late_penalty:     latePenalty,
          pf_employee:      pfEmployee,
          pf_employer:      pfEmployer,
          esi_employee:     esiEmployee,
          esi_employer:     esiEmployer,
          professional_tax: professionalTax,
          insurance:        insurance,
          tds:              tds,
          total_deductions: totalDeductions,
          net_salary:       netSalary,
          status:           'processed',
          processed_at:     new Date().toISOString(),
          payslip_notes:    notes.join(' | ') || null,
        }, { onConflict: 'employee_id,month,year' })
        .select()
        .single()

      if (payrollError) throw payrollError

      // ── 10. NOTIFICATION ─────────────────────────────────────────────────────

      const monthName = new Date(year, month - 1)
        .toLocaleString('default', { month: 'long' })

      await createNotification({
        recipientId:   employee.id,
        senderId:      req.user.id,
        type:          'payroll',
        title:         `Payslip for ${monthName} ${year}`,
        message:       `Your salary of ₹${netSalary.toLocaleString('en-IN')} has been processed. PF: ₹${pfEmployee}, TDS: ₹${tds}`,
        referenceId:   payrollRecord.id,
        referenceType: 'payroll',
      })

      results.push({
        employee_id:      employee.id,
        name:             employee.name,
        basic_salary:     basicSalary,
        gross_salary:     grossSalary,
        overtime_pay:     overtimePay,
        total_deductions: totalDeductions,
        net_salary:       netSalary,
        present_days:     presentDays,
        absent_days:      absentDays,
        late_count:       lateArrivals,
        pf_employee:      pfEmployee,
        esi_employee:     esiEmployee,
        professional_tax: professionalTax,
        insurance:        insurance,
        tds:              tds,
      })
    }

    return res.json({
      processed:    results.length,
      month,
      year,
      total_payroll: results.reduce((s, r) => s + r.net_salary, 0),
      results,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getMyPayslips = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payroll')
      .select('*')
      .eq('employee_id', req.user.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getPayslipDetail = async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('payroll')
      .select('*, employees!employee_id(name, department, manager_id)')
      .eq('id', id)
      .single()

    if (error || !data) return res.status(404).json({ error: 'Payslip not found' })

    const isAdmin   = req.user.role === 'admin'
    const isOwner   = data.employee_id === req.user.id
    const isManager = req.user.role === 'manager' &&
      data.employees?.manager_id === req.user.id

    if (!isAdmin && !isOwner && !isManager) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getAllPayroll = async (req, res) => {
  try {
    const { month, year } = req.query
    const isManager = req.user.role === 'manager'

    let query = supabase
      .from('payroll')
      .select('*, employees!employee_id(name, department, manager_id)')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (month) query = query.eq('month', Number(month))
    if (year)  query = query.eq('year', Number(year))

    const { data, error } = await query
    if (error) throw error

    let result = data || []
    if (isManager) {
      result = result.filter(r => r.employees?.manager_id === req.user.id)
    }

    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
