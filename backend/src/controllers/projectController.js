import supabase from '../config/db.js'
import { createNotification } from '../utils/notifications.js'

export const createProject = async (req, res) => {
  try {
    const { name, description, status, start_date, end_date } = req.body

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        manager_id: req.user.id,
        status: status || 'active',
        start_date: start_date || null,
        end_date: end_date || null
      })
      .select()
      .single()

    if (error) throw error
    return res.status(201).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getProjects = async (req, res) => {
  try {
    let data, error

    if (req.user.role === 'admin') {
      ;({ data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false }))

    } else if (req.user.role === 'manager') {
      const { data: raw, error: rawError } = await supabase
        .from('projects')
        .select('*, tasks(id, status)')
        .eq('manager_id', req.user.id)
        .order('created_at', { ascending: false })
      error = rawError

      const rawIds = (raw || []).map(p => p.id)
      let memberMap = {}
      if (rawIds.length > 0) {
        const { data: memberRows } = await supabase
          .from('project_members')
          .select('project_id')
          .in('project_id', rawIds)
        memberMap = (memberRows || []).reduce((acc, m) => {
          acc[m.project_id] = (acc[m.project_id] || 0) + 1
          return acc
        }, {})
      }

      data = (raw || []).map(({ tasks: projectTasks, ...project }) => ({
        ...project,
        task_count: (projectTasks || []).length,
        completed_task_count: (projectTasks || []).filter(t => t.status === 'done').length,
        member_count: memberMap[project.id] || 0,
      }))

    } else {
      const { data: empMembers } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('employee_id', req.user.id)

      const projectIds = [...new Set((empMembers || []).map(m => m.project_id).filter(Boolean))]
      if (projectIds.length === 0) return res.json([])

      const { data: raw, error: rawError } = await supabase
        .from('projects')
        .select(`
          id, name, description, status, priority,
          start_date, end_date, progress,
          manager:manager_id(id, name)
        `)
        .in('id', projectIds)
        .order('created_at', { ascending: false })
      error = rawError

      const { data: taskRows } = await supabase
        .from('tasks')
        .select('project_id, status')
        .in('project_id', projectIds)

      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .in('project_id', projectIds)

      const taskMap = {}
      const memberMap = {}

      ;(taskRows || []).forEach(t => {
        if (!taskMap[t.project_id]) taskMap[t.project_id] = { total: 0, done: 0 }
        taskMap[t.project_id].total++
        if (t.status === 'done') taskMap[t.project_id].done++
      })

      ;(memberRows || []).forEach(m => {
        memberMap[m.project_id] = (memberMap[m.project_id] || 0) + 1
      })

      data = (raw || []).map(p => {
        const tc = taskMap[p.id] || { total: 0, done: 0 }
        const progress = tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : 0
        return {
          ...p,
          task_count: tc.total,
          completed_task_count: tc.done,
          progress,
          member_count: memberMap[p.id] || 0,
        }
      })
    }

    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getMyProjects = async (req, res) => {
  try {
    const { data: members, error: memberError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('employee_id', req.user.id)

    if (memberError) throw memberError

    const projectIds = [...new Set((members || []).map(m => m.project_id).filter(Boolean))]
    if (projectIds.length === 0) return res.json([])

    const { data: projectsRaw, error } = await supabase
      .from('projects')
      .select(`
        id, name, description, status, priority,
        start_date, end_date, progress, health,
        project_type, project_code,
        manager:manager_id(id, name)
      `)
      .in('id', projectIds)
      .order('created_at', { ascending: false })

    if (error) throw error

    const { data: taskRows } = await supabase
      .from('tasks')
      .select('project_id, status')
      .in('project_id', projectIds)

    const { data: memberRows } = await supabase
      .from('project_members')
      .select('project_id')
      .in('project_id', projectIds)

    const taskMap = {}
    const memberMap = {}

    ;(taskRows || []).forEach(t => {
      if (!taskMap[t.project_id]) taskMap[t.project_id] = { total: 0, done: 0 }
      taskMap[t.project_id].total++
      if (t.status === 'done') taskMap[t.project_id].done++
    })

    ;(memberRows || []).forEach(m => {
      memberMap[m.project_id] = (memberMap[m.project_id] || 0) + 1
    })

    const projects = (projectsRaw || []).map(p => {
      const tc = taskMap[p.id] || { total: 0, done: 0 }
      const progress = tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : 0
      return {
        ...p,
        task_count: tc.total,
        completed_task_count: tc.done,
        progress,
        member_count: memberMap[p.id] || 0,
      }
    })

    return res.json(projects)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getProjectStats = async (req, res) => {
  try {
    const now = new Date().toISOString().split('T')[0]
    const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

    if (req.user.role === 'manager') {
      const { data: managedProjects } = await supabase
        .from('projects')
        .select('id, status')
        .eq('manager_id', req.user.id)

      const active_projects = (managedProjects || []).filter(p => p.status === 'active').length
      const managedProjectIds = (managedProjects || []).map(p => p.id)

      let pending_tasks = 0
      let completed_tasks = 0
      let upcoming_deadlines = 0
      let logged_hours = 0

      if (managedProjectIds.length > 0) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status, due_date')
          .in('project_id', managedProjectIds)

        pending_tasks = (tasks || []).filter(t => t.status !== 'done').length
        completed_tasks = (tasks || []).filter(t => t.status === 'done').length
        upcoming_deadlines = (tasks || []).filter(t =>
          t.status !== 'done' && t.due_date && t.due_date >= now && t.due_date <= in7Days
        ).length

        const { data: reports } = await supabase
          .from('employees')
          .select('id')
          .eq('manager_id', req.user.id)
          .eq('is_active', true)

        const reportIds = (reports || []).map(r => r.id)

        if (reportIds.length > 0) {
          const { data: timesheets } = await supabase
            .from('timesheets')
            .select('total_hours')
            .in('employee_id', reportIds)
            .eq('status', 'approved')

          logged_hours = parseFloat(
            ((timesheets || []).reduce((s, t) => s + (t.total_hours || 0), 0)).toFixed(1)
          )
        }
      }

      return res.json({ active_projects, pending_tasks, completed_tasks, upcoming_deadlines, logged_hours })
    }

    // Employee role
    const { data: memberRows } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('employee_id', req.user.id)

    const projectIds = [...new Set((memberRows || []).map(m => m.project_id).filter(Boolean))]

    let active_projects = 0
    if (projectIds.length > 0) {
      const { count } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .in('id', projectIds)
        .eq('status', 'active')
      active_projects = count || 0
    }

    const { data: tasks } = await supabase
      .from('tasks')
      .select('status, due_date')
      .eq('assigned_to', req.user.id)

    const pending_tasks = (tasks || []).filter(t => t.status !== 'done').length
    const completed_tasks = (tasks || []).filter(t => t.status === 'done').length
    const upcoming_deadlines = (tasks || []).filter(t =>
      t.status !== 'done' && t.due_date && t.due_date >= now && t.due_date <= in7Days
    ).length

    const { data: timesheets } = await supabase
      .from('timesheets')
      .select('total_hours')
      .eq('employee_id', req.user.id)
      .eq('status', 'approved')

    const logged_hours = parseFloat(
      ((timesheets || []).reduce((s, t) => s + (t.total_hours || 0), 0)).toFixed(1)
    )

    return res.json({ active_projects, pending_tasks, completed_tasks, upcoming_deadlines, logged_hours })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const updateProject = async (req, res) => {
  try {
    const { id } = req.params
    const {
      name, description, project_type, category,
      department, client_name, sponsor_id,
      status, priority, health, visibility,
      start_date, end_date, budget, budget_currency,
      billing_type, objectives, deliverables, tags,
      allow_overtime, require_timesheet_approval,
      notify_on_milestone,
    } = req.body

    const updates = Object.fromEntries(
      Object.entries({
        name, description, project_type, category,
        department, client_name, sponsor_id,
        status, priority, health, visibility,
        start_date, end_date, budget, budget_currency,
        billing_type, objectives, deliverables, tags,
        allow_overtime, require_timesheet_approval,
        notify_on_milestone,
      }).filter(([, v]) => v !== undefined)
    )

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Project not found' })
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getAllProjectsAdmin = async (req, res) => {
  try {
    const { status, manager_id } = req.query

    let query = supabase
      .from('projects')
      .select(`
        *,
        manager:manager_id(id, name, department),
        tasks(id, status)
      `)
      .order('created_at', { ascending: false })

    if (status)     query = query.eq('status', status)
    if (manager_id) query = query.eq('manager_id', manager_id)

    const { data, error } = await query
    if (error) throw error


    const projectIds = (data || []).map(p => p.id)

    let memberCounts = {}
    if (projectIds.length > 0) {
      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .in('project_id', projectIds)

      memberCounts = (memberRows || []).reduce((acc, m) => {
        acc[m.project_id] = (acc[m.project_id] || 0) + 1
        return acc
      }, {})
    }

    const projects = (data || []).map(p => {
      const tasks  = p.tasks || []
      const total  = tasks.length
      const done   = tasks.filter(t => t.status === 'done').length
      const progress = total > 0 ? Math.round((done / total) * 100) : 0
      return {
        ...p,
        task_count: total,
        completed_task_count: done,
        progress,
        member_count: memberCounts[p.id] || 0,
      }
    })

    return res.json(projects)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const getProjectDetail = async (req, res) => {
  try {
    const { id } = req.params

    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        manager:manager_id(id, name, email, department),
        sponsor:sponsor_id(id, name, department),
        tasks(
          id, title, status, priority, due_date,
          assigned_to,
          assignee:assigned_to(id, name)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const { data: members } = await supabase
      .from('project_members')
      .select(`
        id, role, employee_id,
        employee:employee_id(id, name, department, position)
      `)
      .eq('project_id', id)

    const { data: milestones } = await supabase
      .from('project_milestones')
      .select('id, title, due_date, status')
      .eq('project_id', id)

    const isAdmin   = req.user.role === 'admin'
    const isManager = project.manager_id === req.user.id
    const isMember  = (members || [])
      .some(m => m.employee_id === req.user.id || (m.employee && m.employee.id === req.user.id))

    if (!isAdmin && !isManager && !isMember) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const tasks = project.tasks || []
    const total = tasks.length
    const done  = tasks.filter(t => t.status === 'done').length
    const progress = total > 0 ? Math.round((done / total) * 100) : 0

    return res.json({
      ...project,
      project_members:    members || [],
      project_milestones: milestones || [],
      member_count:       (members || []).length,
      progress,
      task_count:           total,
      completed_task_count: done,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const createProjectAdmin = async (req, res) => {
  try {
    const {
      name, description, project_type, category,
      department, client_name,
      manager_id, sponsor_id, member_ids = [],
      start_date, end_date,
      priority, status, health, visibility,
      budget, budget_currency, billing_type,
      objectives, deliverables, tags,
      allow_overtime, require_timesheet_approval,
      notify_on_milestone,
      milestones = [],
      related_project_ids = [],
    } = req.body

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Project name is required' })
    }
    if (!manager_id) {
      return res.status(400).json({ error: 'Project manager is required' })
    }

    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
    const projectCode = `PRJ-${String((count || 0) + 1).padStart(3, '0')}`

    let estimatedDuration = null
    if (start_date && end_date) {
      const diff = new Date(end_date).getTime() - new Date(start_date).getTime()
      estimatedDuration = Math.ceil(diff / 86400000)
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name:                        name.trim(),
        project_code:                projectCode,
        description:                 description || null,
        project_type:                project_type || 'internal',
        category:                    category || null,
        department:                  department || null,
        client_name:                 client_name || null,
        manager_id,
        sponsor_id:                  sponsor_id || null,
        status:                      status || 'active',
        priority:                    priority || 'medium',
        health:                      health || 'on_track',
        visibility:                  visibility || 'team',
        start_date:                  start_date || null,
        end_date:                    end_date || null,
        estimated_duration:          estimatedDuration,
        budget:                      budget || null,
        budget_currency:             budget_currency || 'INR',
        billing_type:                billing_type || 'internal',
        objectives:                  objectives || null,
        deliverables:                deliverables || null,
        tags:                        tags || null,
        allow_overtime:              allow_overtime !== undefined ? allow_overtime : true,
        require_timesheet_approval:  require_timesheet_approval !== undefined ? require_timesheet_approval : true,
        notify_on_milestone:         notify_on_milestone !== undefined ? notify_on_milestone : true,
        progress:                    0,
        created_by:                  req.user.id,
      })
      .select()
      .single()

    if (error) throw error

    if (member_ids.length > 0) {
      const memberRows = member_ids.map(emp_id => ({
        project_id:  project.id,
        employee_id: emp_id,
        role:        'member',
        added_by:    req.user.id,
      }))
      const { error: memberError } = await supabase.from('project_members').insert(memberRows)
      if (memberError) {
        console.error('Member insert error:', memberError)
      } else {
        console.log('Members inserted:', memberRows.length)
      }
    }

    if (milestones.length > 0) {
      const milestoneRows = milestones
        .filter(m => m.title && m.due_date)
        .map(m => ({
          project_id: project.id,
          title:      m.title,
          due_date:   m.due_date,
          status:     'pending',
        }))
      if (milestoneRows.length > 0) {
        await supabase.from('project_milestones').insert(milestoneRows)
      }
    }

    if (related_project_ids.length > 0) {
      const depRows = related_project_ids.map(rid => ({
        project_id:    project.id,
        depends_on_id: rid,
      }))
      await supabase.from('project_dependencies').insert(depRows).catch(() => {})
    }

    await createNotification({
      recipientId:   manager_id,
      senderId:      req.user.id,
      type:          'project',
      title:         'New project assigned to you',
      message:       `You have been assigned as manager for: ${name} (${projectCode})`,
      referenceId:   project.id,
      referenceType: 'project',
    })

    if (sponsor_id && sponsor_id !== manager_id) {
      await createNotification({
        recipientId:   sponsor_id,
        senderId:      req.user.id,
        type:          'project',
        title:         'You are project sponsor',
        message:       `You have been set as sponsor for: ${name}`,
        referenceId:   project.id,
        referenceType: 'project',
      })
    }

    return res.status(201).json(project)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can delete projects' })
    }

    // Delete child records first to avoid FK constraint violations
    await supabase.from('project_members').delete().eq('project_id', id)
    await supabase.from('project_milestones').delete().eq('project_id', id)
    await supabase.from('tasks').delete().eq('project_id', id)

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const addProjectMember = async (req, res) => {
  try {
    const { id: project_id } = req.params
    const { employee_id, role = 'member' } = req.body

    const { data: project } = await supabase
      .from('projects')
      .select('manager_id')
      .eq('id', project_id)
      .single()

    if (!project) return res.status(404).json({ error: 'Project not found' })

    const isAdmin   = req.user.role === 'admin'
    const isManager = project.manager_id === req.user.id

    if (!isAdmin && !isManager) {
      return res.status(403).json({ error: 'Only admin or project manager can add members' })
    }

    const { data, error } = await supabase
      .from('project_members')
      .upsert({ project_id, employee_id, role, added_by: req.user.id },
        { onConflict: 'project_id,employee_id' })
      .select('*, employee:employee_id(id, name, department)')
      .single()

    if (error) throw error

    await createNotification({
      recipientId:   employee_id,
      senderId:      req.user.id,
      type:          'project',
      title:         'Added to project',
      message:       `You have been added to a project as ${role}`,
      referenceId:   project_id,
      referenceType: 'project',
    })

    return res.status(201).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const removeProjectMember = async (req, res) => {
  try {
    const { id: project_id, memberId } = req.params

    const { data: project } = await supabase
      .from('projects')
      .select('manager_id')
      .eq('id', project_id)
      .single()

    if (!project) return res.status(404).json({ error: 'Project not found' })

    const isAdmin   = req.user.role === 'admin'
    const isManager = project.manager_id === req.user.id

    if (!isAdmin && !isManager) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId)
      .eq('project_id', project_id)

    if (error) throw error
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const updateProjectProgress = async (req, res) => {
  try {
    const { id } = req.params

    const { data: tasks } = await supabase
      .from('tasks')
      .select('status')
      .eq('project_id', id)

    const total    = (tasks || []).length
    const done     = (tasks || []).filter(t => t.status === 'done').length
    const progress = total > 0 ? Math.round((done / total) * 100) : 0

    const { data, error } = await supabase
      .from('projects')
      .update({ progress })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
