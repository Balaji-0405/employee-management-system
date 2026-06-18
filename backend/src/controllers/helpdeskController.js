/*
  SUPABASE MIGRATION REQUIRED — run all of the following in the SQL editor:

  -- Tables
  CREATE TABLE helpdesk_tickets (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number text UNIQUE NOT NULL,
    employee_id   uuid REFERENCES employees(id),
    category      text NOT NULL,
    subject       text NOT NULL,
    description   text NOT NULL,
    priority      text DEFAULT 'medium',
    status        text DEFAULT 'open',
    assigned_to   uuid REFERENCES employees(id),
    resolution    text,
    resolved_at   timestamptz,
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now()
  );

  CREATE TABLE helpdesk_comments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   uuid REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
    author_id   uuid REFERENCES employees(id),
    content     text NOT NULL,
    is_internal boolean DEFAULT false,
    created_at  timestamptz DEFAULT now()
  );

  -- Sequence for ticket numbers
  CREATE SEQUENCE helpdesk_ticket_seq START 1000;

  -- Helper function called via supabase.rpc('next_ticket_number')
  CREATE OR REPLACE FUNCTION next_ticket_number()
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    seq_val bigint;
  BEGIN
    seq_val := nextval('helpdesk_ticket_seq');
    RETURN 'TKT-' || LPAD(seq_val::text, 6, '0');
  END;
  $$;
*/

import supabase from '../config/db.js'
import { createNotification, notifyManagerAndAdmins } from '../utils/notifications.js'

const VALID_STATUSES   = ['open', 'in_progress', 'waiting_for_reply', 'resolved', 'closed']
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical']

const isStaff = (role) => role === 'admin' || role === 'manager'

// ── GET /api/helpdesk/stats ────────────────────────────────────────────────────
export const getStats = async (req, res) => {
  try {
    const userId       = req.user.id
    const staff        = isStaff(req.user.role)
    const scopeFilter  = staff ? {} : { employee_id: userId }

    const [openRes, inProgRes, waitingRes, resolvedRes, { data: resolvedRows }] =
      await Promise.all([
        supabase
          .from('helpdesk_tickets')
          .select('*', { count: 'exact', head: true })
          .match({ ...scopeFilter, status: 'open' }),

        supabase
          .from('helpdesk_tickets')
          .select('*', { count: 'exact', head: true })
          .match({ ...scopeFilter, status: 'in_progress' }),

        supabase
          .from('helpdesk_tickets')
          .select('*', { count: 'exact', head: true })
          .match({ ...scopeFilter, status: 'waiting_for_reply' }),

        supabase
          .from('helpdesk_tickets')
          .select('*', { count: 'exact', head: true })
          .match({ ...scopeFilter, status: 'resolved' }),

        // Fetch resolved ticket timestamps to compute average resolution time
        (() => {
          let q = supabase
            .from('helpdesk_tickets')
            .select('created_at, resolved_at')
            .eq('status', 'resolved')
            .not('resolved_at', 'is', null)
          if (!staff) q = q.eq('employee_id', userId)
          return q
        })(),
      ])

    const avgResolutionHours =
      resolvedRows && resolvedRows.length > 0
        ? resolvedRows.reduce((sum, t) => {
            const ms = new Date(t.resolved_at) - new Date(t.created_at)
            return sum + ms / 3_600_000
          }, 0) / resolvedRows.length
        : 0

    return res.json({
      open:                  openRes.count    ?? 0,
      in_progress:           inProgRes.count  ?? 0,
      waiting_for_reply:     waitingRes.count ?? 0,
      resolved:              resolvedRes.count ?? 0,
      avg_resolution_hours:  Math.round(avgResolutionHours * 10) / 10,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── GET /api/helpdesk/tickets ──────────────────────────────────────────────────
export const getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id
    const staff  = isStaff(req.user.role)
    const { status, category, search } = req.query

    let query = supabase
      .from('helpdesk_tickets')
      .select(`
        *,
        reporter:employees!employee_id(name, department),
        assignee:employees!assigned_to(name)
      `)

    // Employees only see their own tickets; admin/manager see all
    if (!staff) query = query.eq('employee_id', userId)

    if (status)   query = query.eq('status', status)
    if (category) query = query.eq('category', category)
    if (search)   query = query.or(`subject.ilike.%${search}%,description.ilike.%${search}%`)

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) throw error
    return res.json(data ?? [])
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── POST /api/helpdesk/tickets ─────────────────────────────────────────────────
export const createTicket = async (req, res) => {
  try {
    const { category, subject, description, priority = 'medium' } = req.body

    if (!category || !subject || !description) {
      return res.status(400).json({ error: 'category, subject and description are required' })
    }

    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` })
    }

    // Generate ticket number via Supabase RPC (requires next_ticket_number() function)
    const { data: ticketNumber, error: seqError } = await supabase.rpc('next_ticket_number')
    if (seqError) throw new Error(`Failed to generate ticket number: ${seqError.message}`)

    const { data: ticket, error } = await supabase
      .from('helpdesk_tickets')
      .insert({
        ticket_number: ticketNumber,
        employee_id:   req.user.id,
        category,
        subject,
        description,
        priority,
        status:        'open',
      })
      .select('*')
      .single()

    if (error) throw error

    // Notify the employee's manager + all admins about the new ticket
    await notifyManagerAndAdmins({
      employeeId:    req.user.id,
      senderId:      req.user.id,
      type:          'helpdesk',
      title:         `New Ticket: ${subject}`,
      message:       `${category} ticket (${ticketNumber}) submitted — priority: ${priority}`,
      referenceId:   ticket.id,
      referenceType: 'helpdesk_ticket',
    })

    return res.status(201).json(ticket)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── GET /api/helpdesk/tickets/:id ─────────────────────────────────────────────
export const getTicketById = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const staff  = isStaff(req.user.role)

    const { data: ticket, error } = await supabase
      .from('helpdesk_tickets')
      .select(`
        *,
        reporter:employees!employee_id(name, department),
        assignee:employees!assigned_to(name)
      `)
      .eq('id', id)
      .single()

    if (error || !ticket) return res.status(404).json({ error: 'Ticket not found' })

    if (!staff && ticket.employee_id !== userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Fetch comments — hide internal notes from non-staff
    let commentsQuery = supabase
      .from('helpdesk_comments')
      .select('*, author:employees!author_id(name, role)')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    if (!staff) commentsQuery = commentsQuery.eq('is_internal', false)

    const { data: comments } = await commentsQuery

    return res.json({ ...ticket, comments: comments ?? [] })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── PUT /api/helpdesk/tickets/:id ─────────────────────────────────────────────
export const updateTicketStatus = async (req, res) => {
  try {
    const { id }                           = req.params
    const { status, resolution, assigned_to } = req.body

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('helpdesk_tickets')
      .select('id, employee_id, subject, status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) return res.status(404).json({ error: 'Ticket not found' })

    const updates = Object.fromEntries(
      Object.entries({ status, resolution, assigned_to }).filter(([, v]) => v !== undefined)
    )

    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString()
    }

    updates.updated_at = new Date().toISOString()

    const { data: updated, error } = await supabase
      .from('helpdesk_tickets')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    // Notify the ticket owner about the status change
    if (existing.employee_id && existing.employee_id !== req.user.id) {
      await createNotification({
        recipientId:   existing.employee_id,
        senderId:      req.user.id,
        type:          'helpdesk',
        title:         `Ticket Updated: ${existing.subject}`,
        message:       status
          ? `Your ticket status changed to: ${status.replace(/_/g, ' ')}`
          : `Your ticket has been updated`,
        referenceId:   id,
        referenceType: 'helpdesk_ticket',
      })
    }

    return res.json(updated)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── POST /api/helpdesk/tickets/:id/comments ────────────────────────────────────
export const addComment = async (req, res) => {
  try {
    const { id }                          = req.params
    const { content, is_internal = false } = req.body
    const userId                           = req.user.id
    const staff                            = isStaff(req.user.role)

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' })
    }

    // Only staff can post internal notes
    const internal = staff ? Boolean(is_internal) : false

    const { data: ticket, error: fetchError } = await supabase
      .from('helpdesk_tickets')
      .select('id, employee_id, subject, assigned_to')
      .eq('id', id)
      .single()

    if (fetchError || !ticket) return res.status(404).json({ error: 'Ticket not found' })

    // Access check: ticket owner, assigned agent, or admin/manager
    const isOwner    = ticket.employee_id === userId
    const isAssigned = ticket.assigned_to  === userId
    if (!isOwner && !isAssigned && !staff) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { data: comment, error } = await supabase
      .from('helpdesk_comments')
      .insert({
        ticket_id:   id,
        author_id:   userId,
        content:     content.trim(),
        is_internal: internal,
      })
      .select('*, author:employees!author_id(name, role)')
      .single()

    if (error) throw error

    // Notify the ticket owner when someone else comments (skip internal notes)
    if (!internal && ticket.employee_id && ticket.employee_id !== userId) {
      await createNotification({
        recipientId:   ticket.employee_id,
        senderId:      userId,
        type:          'helpdesk',
        title:         `New reply on: ${ticket.subject}`,
        message:       content.trim().slice(0, 120),
        referenceId:   id,
        referenceType: 'helpdesk_ticket',
      })
    }

    return res.status(201).json(comment)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
