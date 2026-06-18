/*
  SUPABASE SETUP REQUIRED — complete both steps before using this module:

  ── Step 1: Run in SQL editor ──────────────────────────────────────────────────

  CREATE TABLE documents (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id   uuid REFERENCES employees(id) ON DELETE CASCADE,
    name          text NOT NULL,
    description   text,
    file_url      text NOT NULL,
    file_type     text NOT NULL,
    file_size     bigint NOT NULL,
    folder        text DEFAULT 'general',
    category      text DEFAULT 'personal',
    shared_with   uuid[] DEFAULT '{}',
    is_shared     boolean DEFAULT false,
    uploaded_by   uuid REFERENCES employees(id),
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now()
  );

  ── Step 2: Create Supabase Storage bucket ────────────────────────────────────

  In the Supabase dashboard → Storage, create a bucket named:
    'employee-documents'

  Set it to PUBLIC (or configure RLS policies so authenticated users can read
  documents belonging to them or shared with them).
*/

import supabase from '../config/db.js'

// Extracts the storage-relative path from a Supabase public URL.
// e.g. "https://xxx.supabase.co/storage/v1/object/public/employee-documents/abc/file.pdf"
// → "abc/file.pdf"
const extractStoragePath = (fileUrl) => {
  const marker = '/employee-documents/'
  const idx = fileUrl.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(fileUrl.slice(idx + marker.length))
}

const canAccess = (doc, userId, role) =>
  doc.employee_id === userId ||
  (Array.isArray(doc.shared_with) && doc.shared_with.includes(userId)) ||
  role === 'admin'

// ── GET /api/documents ─────────────────────────────────────────────────────────
export const getMyDocuments = async (req, res) => {
  try {
    const userId = req.user.id
    const { folder, category, search, tab } = req.query

    let query = supabase.from('documents').select('*')

    if (tab === 'my') {
      query = query.eq('employee_id', userId)
    } else if (tab === 'shared') {
      query = query.contains('shared_with', [userId])
    } else {
      // All documents the user owns OR has been shared with
      query = query.or(`employee_id.eq.${userId},shared_with.cs.{${userId}}`)
    }

    if (folder)   query = query.eq('folder', folder)
    if (category) query = query.eq('category', category)
    if (search)   query = query.ilike('name', `%${search}%`)

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) throw error
    return res.json(data ?? [])
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── POST /api/documents/upload ─────────────────────────────────────────────────
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { name, description, folder = 'general', category = 'personal' } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Document name is required' })
    }

    const userId   = req.user.id
    const fileName = `${Date.now()}_${req.file.originalname}`
    const filePath = `${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('employee-documents')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('employee-documents')
      .getPublicUrl(filePath)

    const { data, error: insertError } = await supabase
      .from('documents')
      .insert({
        employee_id:  userId,
        name:         name.trim(),
        description:  description ?? null,
        folder,
        category,
        file_url:     urlData.publicUrl,
        file_type:    req.file.mimetype,
        file_size:    req.file.size,
        uploaded_by:  userId,
        shared_with:  [],
        is_shared:    false,
      })
      .select('*')
      .single()

    if (insertError) throw insertError
    return res.status(201).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── GET /api/documents/:id/download ───────────────────────────────────────────
export const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params
    const userId  = req.user.id
    const role    = req.user.role

    const { data: doc, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !doc) return res.status(404).json({ error: 'Document not found' })

    if (!canAccess(doc, userId, role)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    return res.json({ download_url: doc.file_url, name: doc.name })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── DELETE /api/documents/:id ──────────────────────────────────────────────────
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params
    const userId  = req.user.id
    const role    = req.user.role

    const { data: doc, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !doc) return res.status(404).json({ error: 'Document not found' })

    if (doc.employee_id !== userId && role !== 'admin') {
      return res.status(403).json({ error: 'Only the owner or admin can delete this document' })
    }

    const storagePath = extractStoragePath(doc.file_url)
    if (storagePath) {
      // Best-effort storage deletion — don't fail the request if storage removal errors
      await supabase.storage.from('employee-documents').remove([storagePath])
    }

    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return res.json({ message: 'Document deleted' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── PUT /api/documents/:id/share ───────────────────────────────────────────────
export const shareDocument = async (req, res) => {
  try {
    const { id }          = req.params
    const userId          = req.user.id
    const { employee_ids } = req.body

    if (!Array.isArray(employee_ids)) {
      return res.status(400).json({ error: 'employee_ids must be an array' })
    }

    const { data: doc, error } = await supabase
      .from('documents')
      .select('employee_id')
      .eq('id', id)
      .single()

    if (error || !doc) return res.status(404).json({ error: 'Document not found' })

    if (doc.employee_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the owner can share this document' })
    }

    const { data: updated, error: updateError } = await supabase
      .from('documents')
      .update({
        shared_with: employee_ids,
        is_shared:   employee_ids.length > 0,
        updated_at:  new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) throw updateError
    return res.json(updated)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── POST /api/documents/folders ────────────────────────────────────────────────
// Folders are virtual — they exist as long as at least one document uses that
// folder name. This endpoint validates and returns the name so the frontend can
// immediately start uploading documents into the new folder.
export const createFolder = async (req, res) => {
  try {
    const { name } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' })
    }

    const folderName = name.trim()

    if (folderName.length > 64) {
      return res.status(400).json({ error: 'Folder name must be 64 characters or fewer' })
    }

    return res.status(201).json({ folder: folderName })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── GET /api/documents/stats ───────────────────────────────────────────────────
export const getStats = async (req, res) => {
  try {
    const userId       = req.user.id
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { count: totalFiles },
      { count: sharedWithMe },
      { data: sizeRows },
      { count: recentFiles },
    ] = await Promise.all([
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', userId),

      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .contains('shared_with', [userId]),

      supabase
        .from('documents')
        .select('file_size')
        .eq('employee_id', userId),

      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', userId)
        .gte('created_at', thirtyDaysAgo),
    ])

    const totalSize = (sizeRows ?? []).reduce((sum, row) => sum + (row.file_size ?? 0), 0)

    return res.json({
      total_files:    totalFiles  ?? 0,
      shared_with_me: sharedWithMe ?? 0,
      total_size:     totalSize,
      recent:         recentFiles ?? 0,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
