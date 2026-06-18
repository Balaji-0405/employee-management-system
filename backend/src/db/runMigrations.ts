export async function runMigrations(): Promise<void> {
  console.log('[Migration] Automatic migration skipped — no DATABASE_URL.')
  console.log('[Migration] Run manually in Supabase SQL Editor:')
  console.log('[Migration] File: backend/src/db/migrations/001_payroll_leave_tables.sql')
  console.log('[Migration] Steps:')
  console.log('[Migration]   1. Open https://supabase.com/dashboard')
  console.log('[Migration]   2. SQL Editor → New query')
  console.log('[Migration]   3. Paste contents of 001_payroll_leave_tables.sql')
  console.log('[Migration]   4. Click Run')
  console.log('[Migration]   5. Verify: 8 rows returned in results')
  console.log('[Migration]   6. Restart backend: npm run dev')
}
