/*
  SUPABASE MIGRATION REQUIRED — run in SQL editor before using the new profile endpoints:

  ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone text;
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS address text;
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS bio text;
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact text;
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_url text;
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_birth date;
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS joining_date date;
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code text;
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS position text;
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_location text;
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'full_time';
*/

/*
  SETUP REQUIRED for uploadPhoto:
  Create a public bucket named 'employee-photos' in the Supabase Storage
  dashboard before the POST /api/employees/me/photo endpoint will work.
*/

import supabase from '../config/db.js'

// Fields a manager/admin can see but an employee must never be able to self-set
const PROTECTED_FIELDS = ['role', 'department', 'manager_id', 'basic_salary', 'is_active', 'password_hash', 'email']

export const getMe = async (req, res) => {
  try {
    console.log('getMe: req.user.id =', req.user.id)
    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        id, name, email, role, department, basic_salary,
        is_active, created_at, phone, address, bio,
        emergency_contact, avatar_url, date_of_birth,
        joining_date, employee_code, position,
        work_location, employment_type, manager_id
      `)
      .eq('id', req.user.id)
      .single()

    console.log('getMe: query result =', JSON.stringify({ data: employee, error }))

    if (error || !employee) {
      console.error('getMe error:', error)
      return res.status(404).json({ error: 'Employee not found' })
    }

    let manager = null
    if (employee.manager_id) {
      const { data: mgr } = await supabase
        .from('employees')
        .select('name, department')
        .eq('id', employee.manager_id)
        .single()
      manager = mgr
    }

    return res.json({ ...employee, manager })
  } catch (err) {
    console.error('getMe exception:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

export const updateMyProfile = async (req, res) => {
  try {
    const { name, phone, address, emergency_contact, bio } = req.body

    // Strip any protected fields that may have been sent — never allow self-elevation
    const updates = Object.fromEntries(
      Object.entries({ name, phone, address, emergency_contact, bio }).filter(
        ([k, v]) => v !== undefined && !PROTECTED_FIELDS.includes(k)
      )
    )

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' })
    }

    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', req.user.id)
      .select(`
        id, name, email, role, department, phone, address, bio,
        emergency_contact, avatar_url, work_location, employment_type,
        position, joining_date, employee_code
      `)
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Employee not found' })

    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const filePath = `avatars/${req.user.id}`

    const { error: uploadError } = await supabase.storage
      .from('employee-photos')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('employee-photos')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    const { error: updateError } = await supabase
      .from('employees')
      .update({ avatar_url: publicUrl })
      .eq('id', req.user.id)

    if (updateError) throw updateError

    return res.json({ avatar_url: publicUrl })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getEmployees = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 500

    let query = supabase
      .from('employees')
      .select(`
        id, name, email, role, department, manager_id, basic_salary, is_active,
        position, joining_date, employee_code, avatar_url, phone,
        employment_type, work_location, address,
        manager:employees!manager_id(name)
      `)
      .order('name')
      .limit(limit)

    if (req.user.role === 'manager') {
      query = query.eq('manager_id', req.user.id).eq('is_active', true)
    }

    const { data, error } = await query
    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getEmployee = async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('employees')
      .select(`
        id, name, email, role, department, manager_id, basic_salary, is_active,
        position, joining_date, employee_code, avatar_url, phone,
        employment_type, work_location, address,
        manager:employees!manager_id(name)
      `)
      .eq('id', id)
      .single()

    if (error || !data) return res.status(404).json({ error: 'Employee not found' })
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params
    const { name, role, department, manager_id, basic_salary, is_active } = req.body

    const updates = Object.fromEntries(
      Object.entries({ name, role, department, manager_id, basic_salary, is_active }).filter(([, v]) => v !== undefined)
    )

    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, role, department, manager_id, basic_salary, is_active')
      .single()

    if (error || !data) return res.status(404).json({ error: 'Employee not found' })
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
