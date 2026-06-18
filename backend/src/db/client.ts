import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

// Legacy compatibility shim — other controllers that call query() still work
export async function query(sql: string, params?: any[]): Promise<{ rows: any[] }> {
  throw new Error(
    'Raw SQL query() is not available without DATABASE_URL. ' +
    'Use the supabase client directly instead.'
  )
}

export default supabase
