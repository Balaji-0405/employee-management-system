import express from 'express'
import cors from 'cors'
import { supabase } from './db/client.js'

import payrollV1Routes from './routes/payroll.routes.js'
import leaveV1Routes from './routes/leave.routes.js'
import { initCronJobs } from './services/payroll/cronJobs.js'

import authRoutes from './routes/authRoutes.js'
import attendanceRoutes from './routes/attendanceRoutes.js'
import timesheetRoutes from './routes/timesheetRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import taskRoutes from './routes/taskRoutes.js'
import employeeRoutes from './routes/employeeRoutes.js'
import holidaysRoutes from './routes/holidaysRoutes.js'
import announcementRoutes from './routes/announcementRoutes.js'
import documentRoutes from './routes/documentRoutes.js'
import helpdeskRoutes from './routes/helpdeskRoutes.js'
import calendarRoutes from './routes/calendarRoutes.js'

const app = express()

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())

app.get('/api/health', async (req, res) => {
  try {
    // Test connection with a simple query
    const { data, error } = await supabase
      .from('employees')
      .select('id')
      .limit(1)

    if (error) {
      return res.status(500).json({
        status: 'error',
        database: 'connection failed',
        error: error.message
      })
    }

    // Check payroll tables
    const tables = [
      'payroll_runs',
      'payslips',
      'employee_salary_config',
      'employee_leave_balances',
      'leave_requests',
      'pt_slabs'
    ]

    const tableChecks = {}
    for (const table of tables) {
      const { error: tableErr } = await supabase
        .from(table)
        .select('id')
        .limit(1)
      tableChecks[table] = tableErr ? `missing: ${tableErr.message}` : 'ok'
    }

    const missingTables = Object.entries(tableChecks)
      .filter(([, v]) => v !== 'ok')
      .map(([k]) => k)

    res.json({
      status: 'ok',
      database: 'connected',
      payroll_tables: tableChecks,
      missing_tables: missingTables,
      ready: missingTables.length === 0
    })
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message })
  }
})

app.use('/api/v1/payroll', payrollV1Routes)
app.use('/api/v1/leaves', leaveV1Routes)
initCronJobs()

app.use('/api/auth', authRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/timesheets', timesheetRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/holidays', holidaysRoutes)
app.use('/api/announcements', announcementRoutes)
app.use('/api/documents',    documentRoutes)
app.use('/api/helpdesk',     helpdeskRoutes)
app.use('/api/calendar',    calendarRoutes)

app.use((err, req, res, next) => {
  console.error('[Server Error]', {
    message: err.message,
    url: req.url,
    method: req.method,
    status: err.status || 500,
    stack: err.stack,
  })
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

export default app
