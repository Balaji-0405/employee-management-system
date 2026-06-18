import supabase from '../config/db.js'

export const getMyNotifications = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*, sender:employees!sender_id(name)')
      .eq('recipient_id', req.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params

    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', id)
      .eq('recipient_id', req.user.id)
      .single()

    if (!existing) return res.status(404).json({ error: 'Notification not found' })

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const markAllAsRead = async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', req.user.id)
      .eq('is_read', false)

    if (error) throw error
    return res.json({ message: 'All notifications marked as read' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getUnreadCount = async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', req.user.id)
      .eq('is_read', false)

    if (error) throw error
    return res.json({ count })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
