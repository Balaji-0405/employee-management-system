import supabase from '../config/db.js'

export const createNotification = async ({
  recipientId,
  senderId,
  type,
  title,
  message,
  referenceId,
  referenceType
}) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      recipient_id: recipientId,
      sender_id: senderId,
      type,
      title,
      message,
      reference_id: referenceId,
      reference_type: referenceType,
      is_read: false
    })
    .select()
    .single()

  if (error) console.error('Failed to create notification:', error.message)
  return data
}

export const notifyManagerAndAdmins = async ({
  employeeId,
  senderId,
  type,
  title,
  message,
  referenceId,
  referenceType
}) => {
  const { data: employee } = await supabase
    .from('employees')
    .select('manager_id')
    .eq('id', employeeId)
    .single()

  const { data: admins } = await supabase
    .from('employees')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true)

  const recipients = new Set()
  if (employee?.manager_id) recipients.add(employee.manager_id)
  ;(admins || []).forEach(a => recipients.add(a.id))

  for (const recipientId of recipients) {
    await createNotification({ recipientId, senderId, type, title, message, referenceId, referenceType })
  }
}
