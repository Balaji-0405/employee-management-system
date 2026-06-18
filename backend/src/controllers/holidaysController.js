/*
  SUPABASE MIGRATION REQUIRED — run if not already done:

  CREATE UNIQUE INDEX IF NOT EXISTS holidays_name_date_idx ON holidays(name, date);

  This index is required for the upsert in seedHolidays to avoid duplicates
  when the endpoint is called more than once.
*/

import supabase from '../config/db.js'

const HOLIDAYS_2026 = [
  { name: "New Year's Day",   date: '2026-01-01', country: 'IN' },
  { name: 'Republic Day',     date: '2026-01-26', country: 'IN' },
  { name: 'Holi',             date: '2026-03-04', country: 'IN' },
  { name: 'Good Friday',      date: '2026-04-03', country: 'IN' },
  { name: 'Ambedkar Jayanti', date: '2026-04-14', country: 'IN' },
  { name: 'Labour Day',       date: '2026-05-01', country: 'IN' },
  { name: 'Independence Day', date: '2026-08-15', country: 'IN' },
  { name: 'Gandhi Jayanti',   date: '2026-10-02', country: 'IN' },
  { name: 'Dussehra',         date: '2026-10-20', country: 'IN' },
  { name: 'Diwali',           date: '2026-11-08', country: 'IN' },
  { name: 'Christmas',        date: '2026-12-25', country: 'IN' },
]

// ── GET /api/holidays ──────────────────────────────────────────────────────────
export const getHolidays = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('id, name, date, country')
      .order('date')

    if (error && error.code !== 'PGRST116') throw error
    return res.json(data || [])
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── POST /api/holidays/seed (admin only) ───────────────────────────────────────
export const seedHolidays = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .upsert(HOLIDAYS_2026, { onConflict: 'name,date', ignoreDuplicates: true })
      .select('id')

    if (error) throw error

    return res.status(201).json({ seeded: data?.length ?? 0 })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
