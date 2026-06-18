import 'dotenv/config'
import app from './app.js'
import { runMigrations } from './db/runMigrations.js'

const PORT = process.env.PORT || 5000

async function startServer() {
  try {
    await runMigrations()
  } catch (err) {
    console.error('[Migration] Failed — payroll routes may return 500 until DB is available:', err.message)
  }

  app.listen(PORT, () => {
    console.log(`EMS Backend running on port ${PORT}`)
  })
}

startServer()
