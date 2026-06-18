/*
  Run this DDL in the Supabase SQL editor before using this module:

  CREATE TABLE announcements (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title       text NOT NULL,
    content     text NOT NULL,
    priority    text DEFAULT 'medium',
    pinned      boolean DEFAULT false,
    created_by  uuid REFERENCES employees(id),
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
  );
*/

import supabase from '../config/db.js'
import { createNotification } from '../utils/notifications.js'

export const getAll = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*, created_by_employee:employees!created_by(name)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const create = async (req, res) => {
  try {
    const { title, content, priority, pinned } = req.body

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' })
    }

    const validPriorities = ['low', 'medium', 'high']
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'priority must be low, medium, or high' })
    }

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        priority: priority || 'medium',
        pinned: pinned || false,
        created_by: req.user.id,
      })
      .select()
      .single()

    if (error) throw error

    const { data: employees } = await supabase
      .from('employees')
      .select('id')
      .eq('is_active', true)
      .neq('id', req.user.id)

    for (const employee of employees || []) {
      await createNotification({
        recipientId: employee.id,
        senderId: req.user.id,
        type: 'announcement',
        title: `New Announcement: ${title}`,
        message: content.substring(0, 100),
        referenceId: announcement.id,
        referenceType: 'announcement',
      })
    }

    return res.status(201).json(announcement)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const update = async (req, res) => {
  try {
    const { id } = req.params
    const { title, content, priority, pinned } = req.body

    const { data: existing, error: findError } = await supabase
      .from('announcements')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (findError || !existing) return res.status(404).json({ error: 'Announcement not found' })

    if (existing.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const updates = Object.fromEntries(
      Object.entries({ title, content, priority, pinned }).filter(([, v]) => v !== undefined)
    )
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const remove = async (req, res) => {
  try {
    const { id } = req.params

    const { data: existing, error: findError } = await supabase
      .from('announcements')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (findError || !existing) return res.status(404).json({ error: 'Announcement not found' })

    if (existing.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { error } = await supabase.from('announcements').delete().eq('id', id)
    if (error) throw error

    return res.json({ message: 'Deleted' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
