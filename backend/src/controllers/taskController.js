import supabase from '../config/db.js'
import { createNotification } from '../utils/notifications.js'

export const createTask = async (req, res) => {
  try {
    const { title, description, priority, due_date, parent_task_id } = req.body
    let { project_id, assigned_to } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' })
    }

    const role = req.user.role

    if (role === 'employee') {
      // Employees can only assign tasks to themselves
      assigned_to = req.user.id
      // Allow project_id for project subtasks; personal tasks have no project
      if (!parent_task_id) {
        project_id = null
      }
    }
    // managers and admins: use the values from the request body as-is

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id:     project_id     || null,
        title:          title.trim(),
        description:    description    || null,
        assigned_to:    assigned_to    || null,
        priority:       priority       || 'medium',
        due_date:       due_date       || null,
        status:         'todo',
        created_by:     req.user.id,
        parent_task_id: parent_task_id || null,
      })
      .select()
      .single()

    if (error) throw error

    // Notify the assignee only when a manager/admin assigns to someone else
    if (assigned_to && assigned_to !== req.user.id) {
      await createNotification({
        recipientId:   assigned_to,
        senderId:      req.user.id,
        type:          'task',
        title:         'New task assigned',
        message:       `You have been assigned: ${title}. Due: ${due_date || 'N/A'} · Priority: ${priority || 'medium'}`,
        referenceId:   data.id,
        referenceType: 'task',
      })
    }

    return res.status(201).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getMyTasks = async (req, res) => {
  try {
    const { status, projectId } = req.query

    let query = supabase
      .from('tasks')
      .select('*, projects(name)')
      .eq('assigned_to', req.user.id)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (projectId) query = query.eq('project_id', projectId)

    const { data, error } = await query
    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getMyTasksGrouped = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, description, status, priority, due_date, project_id, projects(name)')
      .eq('assigned_to', req.user.id)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) throw error

    const allTasks = (data || []).map(t => ({ ...t, project_name: t.projects?.name || '—' }))

    return res.json({
      todo:        allTasks.filter(t => t.status === 'todo'),
      in_progress: allTasks.filter(t => t.status === 'in_progress'),
      review:      allTasks.filter(t => t.status === 'review'),
      done:        allTasks.filter(t => t.status === 'done'),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getUpcomingDeadlines = async (req, res) => {
  try {
    const now = new Date().toISOString().split('T')[0]
    const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

    let assigneeIds = [req.user.id]

    if (req.user.role === 'manager') {
      const { data: reports } = await supabase
        .from('employees')
        .select('id')
        .eq('manager_id', req.user.id)
        .eq('is_active', true)
      assigneeIds = (reports || []).map(r => r.id)
      if (assigneeIds.length === 0) return res.json([])
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, project_id, projects(name)')
      .in('assigned_to', assigneeIds)
      .neq('status', 'done')
      .gte('due_date', now)
      .lte('due_date', in7Days)
      .order('due_date', { ascending: true })

    if (error) throw error

    const today = new Date()
    const tasks = (data || []).map(t => {
      const daysLeft = Math.ceil((new Date(t.due_date).getTime() - today.getTime()) / 86400000)
      return {
        id: t.id,
        title: t.title,
        due_date: t.due_date,
        project_id: t.project_id || null,
        source: 'task',
        project_name: t.projects?.name || '—',
        days_left: daysLeft,
      }
    })

    return res.json(tasks)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    let query = supabase
      .from('tasks')
      .update({ status })
      .eq('id', id)

    if (req.user.role === 'employee') {
      query = query.eq('assigned_to', req.user.id)
    }

    const { data, error } = await query.select().single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Task not found or access denied' })

    if (data.created_by && data.created_by !== req.user.id) {
      await createNotification({
        recipientId: data.created_by,
        senderId: req.user.id,
        type: 'task',
        title: 'Task status updated',
        message: `Task "${data.title}" moved to ${status} by ${req.user.name || 'a team member'}`,
        referenceId: data.id,
        referenceType: 'task'
      })
    }

    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getTaskDetail = async (req, res) => {
  try {
    const { id } = req.params

    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        project:project_id(id, name),
        assignee:assigned_to(id, name, department),
        creator:created_by(id, name),
        depends_on_task:depends_on(id, title, status),
        parent_task:parent_task_id(id, title, status),
        task_comments(
          id, content, created_at,
          author:author_id(id, name)
        ),
        task_time_logs(
          id, hours, description, logged_date,
          employee:employee_id(id, name)
        ),
        task_attachments(
          id, file_name, file_size, mime_type, created_at,
          uploader:uploaded_by(id, name)
        )
      `)
      .eq('id', id)
      .order('created_at', { foreignTable: 'task_comments', ascending: true })
      .single()

    if (error || !task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const isAdmin    = req.user.role === 'admin'
    const isAssignee = task.assigned_to === req.user.id

    if (!isAdmin && !isAssignee) {
      if (task.project_id) {
        const { data: proj } = await supabase
          .from('projects')
          .select('manager_id')
          .eq('id', task.project_id)
          .single()
        if (proj?.manager_id !== req.user.id) {
          return res.status(403).json({ error: 'Forbidden' })
        }
      }
    }

    const { data: subtasks } = await supabase
      .from('tasks')
      .select(`
        id, title, status, priority, due_date,
        assignee:assigned_to(id, name)
      `)
      .eq('parent_task_id', id)
      .order('created_at', { ascending: true })

    return res.json({ ...task, subtasks: subtasks || [] })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params
    const {
      title, description, priority, due_date, status,
      assigned_to, estimated_hours, depends_on, tags
    } = req.body

    const updates = Object.fromEntries(
      Object.entries({
        title, description, priority, due_date, status,
        assigned_to, estimated_hours, depends_on, tags,
      }).filter(([, v]) => v !== undefined)
    )

    if (updates.status === 'done' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select('*, project:project_id(id, name), assignee:assigned_to(id, name)')
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Task not found' })

    if (updates.status && data.project_id) {
      const { data: projectTasks } = await supabase
        .from('tasks')
        .select('status')
        .eq('project_id', data.project_id)

      const total = (projectTasks || []).length
      const done  = (projectTasks || []).filter(t => t.status === 'done').length
      const progress = total > 0 ? Math.round((done / total) * 100) : 0

      await supabase
        .from('projects')
        .update({ progress })
        .eq('id', data.project_id)
    }

    if (assigned_to && assigned_to !== req.user.id) {
      await createNotification({
        recipientId:   assigned_to,
        senderId:      req.user.id,
        type:          'task',
        title:         'Task assigned to you',
        message:       `"${data.title}" has been assigned to you`,
        referenceId:   data.id,
        referenceType: 'task',
      })
    }

    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params

    if (req.user.role === 'employee') {
      return res.status(403).json({ error: 'Employees cannot delete tasks' })
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) throw error
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const addTaskComment = async (req, res) => {
  try {
    const { id: task_id } = req.params
    const { content } = req.body

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Comment content is required' })
    }

    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id,
        author_id: req.user.id,
        content: content.trim(),
      })
      .select('*, author:author_id(id, name)')
      .single()

    if (error) throw error

    const { data: task } = await supabase
      .from('tasks')
      .select('assigned_to, title, created_by')
      .eq('id', task_id)
      .single()

    const notifyIds = [...new Set([
      task?.assigned_to,
      task?.created_by,
    ].filter(id => id && id !== req.user.id))]

    for (const recipientId of notifyIds) {
      await createNotification({
        recipientId,
        senderId:      req.user.id,
        type:          'task',
        title:         'New comment on task',
        message:       `${req.user.name} commented on "${task?.title}"`,
        referenceId:   task_id,
        referenceType: 'task',
      })
    }

    return res.status(201).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const logTaskTime = async (req, res) => {
  try {
    const { id: task_id } = req.params
    const { hours, description, logged_date } = req.body

    if (!hours || Number(hours) <= 0) {
      return res.status(400).json({ error: 'Hours must be greater than 0' })
    }

    const { data, error } = await supabase
      .from('task_time_logs')
      .insert({
        task_id,
        employee_id:  req.user.id,
        hours:        Number(hours),
        description:  description || null,
        logged_date:  logged_date || new Date().toISOString().split('T')[0],
      })
      .select('*, employee:employee_id(id, name)')
      .single()

    if (error) throw error

    const { data: logs } = await supabase
      .from('task_time_logs')
      .select('hours')
      .eq('task_id', task_id)

    const totalLogged = (logs || []).reduce((s, l) => s + Number(l.hours), 0)

    await supabase
      .from('tasks')
      .update({ logged_hours: parseFloat(totalLogged.toFixed(2)) })
      .eq('id', task_id)

    return res.status(201).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getTeamTasks = async (req, res) => {
  try {
    const { project_id, status, priority, assigned_to } = req.query

    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('manager_id', req.user.id)

    const projectIds = (projects || []).map(p => p.id)
    if (projectIds.length === 0) return res.json([])

    let query = supabase
      .from('tasks')
      .select(`
        *,
        project:project_id(id, name),
        assignee:assigned_to(id, name, department),
        task_comments(id),
        task_time_logs(hours)
      `)
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })

    if (project_id)  query = query.eq('project_id', project_id)
    if (status)      query = query.eq('status', status)
    if (priority)    query = query.eq('priority', priority)
    if (assigned_to) query = query.eq('assigned_to', assigned_to)

    const { data, error } = await query
    if (error) throw error

    const tasks = (data || []).map(t => ({
      ...t,
      project_name:  t.project?.name || '—',
      assignee_name: t.assignee?.name || '—',
      comment_count: (t.task_comments || []).length,
      logged_hours:  (t.task_time_logs || []).reduce((s, l) => s + Number(l.hours), 0),
    }))

    return res.json(tasks)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getTeamTasksGrouped = async (req, res) => {
  try {
    const { project_id } = req.query

    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('manager_id', req.user.id)

    const projectIds = (projects || []).map(p => p.id)
    if (projectIds.length === 0) {
      return res.json({ todo: [], in_progress: [], review: [], done: [] })
    }

    let query = supabase
      .from('tasks')
      .select(`
        id, title, description, status, priority,
        due_date, estimated_hours, logged_hours,
        project:project_id(id, name),
        assignee:assigned_to(id, name),
        task_comments(id),
        depends_on_task:depends_on(id, title, status)
      `)
      .in('project_id', projectIds)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })

    if (project_id) query = query.eq('project_id', project_id)

    const { data, error } = await query
    if (error) throw error

    const tasks = (data || []).map(t => ({
      ...t,
      project_name:  t.project?.name || '—',
      assignee_name: t.assignee?.name || '—',
      comment_count: (t.task_comments || []).length,
      is_blocked:    t.depends_on_task && t.depends_on_task.status !== 'done',
    }))

    return res.json({
      todo:        tasks.filter(t => t.status === 'todo'),
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      review:      tasks.filter(t => t.status === 'review'),
      done:        tasks.filter(t => t.status === 'done'),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getAllTasksAdmin = async (req, res) => {
  try {
    const { project_id, status, priority, assigned_to } = req.query

    let query = supabase
      .from('tasks')
      .select(`
        *,
        project:project_id(id, name),
        assignee:assigned_to(id, name, department),
        creator:created_by(id, name),
        task_comments(id),
        task_time_logs(hours)
      `)
      .order('created_at', { ascending: false })

    if (project_id)  query = query.eq('project_id', project_id)
    if (status)      query = query.eq('status', status)
    if (priority)    query = query.eq('priority', priority)
    if (assigned_to) query = query.eq('assigned_to', assigned_to)

    const { data, error } = await query
    if (error) throw error

    const tasks = (data || []).map(t => ({
      ...t,
      project_name:  t.project?.name || '—',
      assignee_name: t.assignee?.name || '—',
      comment_count: (t.task_comments || []).length,
      logged_hours:  (t.task_time_logs || []).reduce((s, l) => s + Number(l.hours), 0),
    }))

    return res.json(tasks)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getSubTasks = async (req, res) => {
  try {
    const { taskId } = req.params

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id, title, status, priority, due_date,
        assigned_to,
        assignee:assigned_to(id, name)
      `)
      .eq('parent_task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return res.json(data || [])
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params

    if (req.user.role === 'employee') {
      const { data: member } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('employee_id', req.user.id)
        .single()

      if (!member) {
        return res.status(403).json({ error: 'Not a member of this project' })
      }
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, status, priority')
      .eq('project_id', projectId)
      .is('parent_task_id', null)
      .neq('status', 'done')
      .order('created_at', { ascending: false })

    if (error) throw error
    return res.json(data || [])
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
