import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import supabase from '../config/db.js'

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, department: user.department, manager_id: user.manager_id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

export const register = async (req, res) => {
  try {
    const { name, email, password, role, department, manager_id, basic_salary } = req.body

    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) return res.status(400).json({ error: 'Email already registered' })

    const password_hash = await bcrypt.hash(password, 10)

    const { data: employee, error } = await supabase
      .from('employees')
      .insert({
        name,
        email,
        password_hash,
        role: role || 'employee',
        department: department || null,
        manager_id: manager_id || null,
        basic_salary: basic_salary || 0,
        is_active: true
      })
      .select('id, name, email, role, department, manager_id')
      .single()

    if (error) throw error

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const monthsRemaining = 13 - currentMonth

    await supabase.from('leave_balances').insert({
      employee_id: employee.id,
      year: currentYear,
      sick_leave_total: 6,
      sick_leave_used: 0,
      earned_leave_accrued: parseFloat((1.5 * monthsRemaining).toFixed(2)),
      earned_leave_used: 0,
      carried_forward: 0
    })

    const token = generateToken(employee)
    return res.status(201).json({ token, user: employee })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    const { data: employee, error } = await supabase
      .from('employees')
      .select('id, name, email, password_hash, role, department, manager_id')
      .eq('email', email)
      .single()

    if (error || !employee) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, employee.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const { password_hash: _, ...user } = employee
    const token = generateToken(user)
    return res.json({ token, user })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' })
    }

    const { data: employee, error } = await supabase
      .from('employees')
      .select('id, password_hash')
      .eq('id', req.user.id)
      .single()

    if (error || !employee) return res.status(404).json({ error: 'Employee not found' })

    const valid = await bcrypt.compare(currentPassword, employee.password_hash)
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' })

    const newHash = await bcrypt.hash(newPassword, 10)

    const { error: updateError } = await supabase
      .from('employees')
      .update({ password_hash: newHash })
      .eq('id', req.user.id)

    if (updateError) throw updateError

    return res.json({ message: 'Password changed successfully' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const debugUsers = async (req, res) => {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, email, role')
    .limit(10)
  res.json({ users: data, error })
}

export const getMe = async (req, res) => {
  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .select('id, name, email, role, department, manager_id')
      .eq('id', req.user.id)
      .single()

    if (error || !employee) return res.status(404).json({ error: 'User not found' })
    return res.json({ user: employee })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
