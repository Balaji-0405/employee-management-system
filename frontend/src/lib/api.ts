/// <reference types="vite/client" />

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const setToken = (token: string) =>
  localStorage.setItem('ems_token', token)

export const getToken = () =>
  localStorage.getItem('ems_token')

export const removeToken = () =>
  localStorage.removeItem('ems_token')

export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    removeToken()
    window.location.href = '/login'
    return
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

function buildQuery(params?: Record<string, string | undefined>): string {
  if (!params) return ''
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join('&')
  return q ? '?' + q : ''
}

export const authAPI = {
  login: (email: string, password: string) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: Record<string, unknown>) =>
    apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => apiFetch('/auth/me'),
}

export const attendanceAPI = {
  clockIn: () => apiFetch('/attendance/clock-in', { method: 'POST' }),
  clockOut: () => apiFetch('/attendance/clock-out', { method: 'POST' }),
  getToday: () => apiFetch('/attendance/today'),
  getHistory: () => apiFetch('/attendance/history'),
  getTeam: () => apiFetch('/attendance/team'),
  getMonthly: (month: number, year: number) =>
    apiFetch(`/attendance/monthly?month=${month}&year=${year}`),
  getWeeklyStats: (weekOffset = 0) =>
    apiFetch(`/attendance/weekly-stats?weekOffset=${weekOffset}`),
  getRequests: () => apiFetch('/attendance/requests'),
  getTeamRequests: () => apiFetch('/attendance/requests?scope=team'),
  createRequest: (data: Record<string, string>) =>
    apiFetch('/attendance/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reviewRequest: (id: string, status: 'approved' | 'rejected', reviewNote?: string) =>
    apiFetch(`/attendance/requests/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, review_note: reviewNote }),
    }),
}

export const employeeAPI = {
  getProfile: () => apiFetch('/employees/me'),
  getAll: (limit = 500) => apiFetch(`/employees?limit=${limit}`),
}

export const timesheetAPI = {
  getWeekly: (date?: string) =>
    apiFetch(`/timesheets/weekly${date ? `?date=${date}` : ''}`),
  saveDraft: (data: any) =>
    apiFetch('/timesheets/draft', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  submit: (id: string) =>
    apiFetch(`/timesheets/${id}/submit`, { method: 'POST' }),
  review: (id: string, status: string, note: string) =>
    apiFetch(`/timesheets/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, review_note: note }),
    }),
  getMy: () => apiFetch('/timesheets/my'),
  getPending: () => apiFetch('/timesheets/pending'),
  getTeamAll: () => apiFetch('/timesheets/team'),
  updateEntry: (entryId: string, hours: number, description: string) =>
    apiFetch(`/timesheets/entry/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify({ hours_worked: hours, description }),
    }),
  deleteTimesheet: (id: string) =>
    apiFetch(`/timesheets/${id}`, { method: 'DELETE' }),
  getDetail: (id: string) =>
    apiFetch(`/timesheets/${id}`),
}

export const leaveAPI = {
  getBalance: () => apiFetch('/v1/leaves/balance/my'),
  apply: (data: Record<string, unknown>) =>
    apiFetch('/v1/leaves/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  review: (id: string, status: string, note: string) =>
    status === 'approved'
      ? apiFetch(`/v1/leaves/requests/${id}/approve`, { method: 'PUT' })
      : apiFetch(`/v1/leaves/requests/${id}/reject`, {
          method: 'PUT',
          body: JSON.stringify({ reason: note }),
        }),
  getMy: () => apiFetch('/v1/leaves/requests/my'),
  getPending: () => apiFetch('/v1/leaves/requests/pending'),
  getTeam: () => apiFetch('/v1/leaves/requests/team-history'),
  getEmployeeBalance: (employeeId: string) =>
    apiFetch(`/v1/leaves/balance/${employeeId}`),
}

export const notificationAPI = {
  getAll: () => apiFetch('/notifications'),
  markRead: (id: string) =>
    apiFetch(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () =>
    apiFetch('/notifications/read-all', { method: 'PUT' }),
  getUnreadCount: () => apiFetch('/notifications/unread-count'),
}


export const projectAPI = {
  getAll:          () => apiFetch('/projects/all'),
  getForRole:      () => apiFetch('/projects'),
  getMy:           () => apiFetch('/projects/my'),
  getStats:        () => apiFetch('/projects/stats'),
  getDetail:       (id: string) => apiFetch(`/projects/${id}`),
  create:          (data: Record<string, unknown>) =>
    apiFetch('/projects/manager', { method: 'POST', body: JSON.stringify(data) }),
  createAdmin:     (data: Record<string, unknown>) =>
    apiFetch('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update:          (id: string, data: Record<string, unknown>) =>
    apiFetch(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete:          (id: string) =>
    apiFetch(`/projects/${id}`, { method: 'DELETE' }),
  addMember:       (id: string, data: Record<string, unknown>) =>
    apiFetch(`/projects/${id}/members`, { method: 'POST', body: JSON.stringify(data) }),
  removeMember:    (id: string, memberId: string) =>
    apiFetch(`/projects/${id}/members/${memberId}`, { method: 'DELETE' }),
  updateProgress:  (id: string) =>
    apiFetch(`/projects/${id}/progress`, { method: 'POST' }),
}


export const taskAPI = {
  getMy:           () => apiFetch('/tasks/my'),
  getMyByProject:  (projectId: string) => apiFetch(`/tasks/my?projectId=${projectId}`),
  getGrouped:      () => apiFetch('/tasks/grouped'),
  getDeadlines:    () => apiFetch('/tasks/deadlines'),
  getTeam:         (params?: Record<string, string>) =>
    apiFetch('/tasks/team' + buildQuery(params)),
  getTeamGrouped:  (projectId?: string) =>
    apiFetch(`/tasks/team/grouped${projectId ? '?project_id=' + projectId : ''}`),
  getAll:          (params?: Record<string, string>) =>
    apiFetch('/tasks/all' + buildQuery(params)),
  getDetail:       (id: string) => apiFetch(`/tasks/${id}`),
  create:          (data: Record<string, unknown>) =>
    apiFetch('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update:          (id: string, data: Record<string, unknown>) =>
    apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus:    (id: string, status: string) =>
    apiFetch(`/tasks/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  delete:          (id: string) =>
    apiFetch(`/tasks/${id}`, { method: 'DELETE' }),
  addComment:      (id: string, content: string) =>
    apiFetch(`/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  logTime:         (id: string, data: Record<string, unknown>) =>
    apiFetch(`/tasks/${id}/time-logs`, { method: 'POST', body: JSON.stringify(data) }),
  getSubTasks:     (taskId: string) =>
    apiFetch(`/tasks/${taskId}/subtasks`),
  getProjectTasks: (projectId: string) =>
    apiFetch(`/tasks/project/${projectId}`),
  createSubTask:   (data: Record<string, unknown>) =>
    apiFetch('/tasks', { method: 'POST', body: JSON.stringify(data) }),
}

export const holidaysAPI = {
  getAll: () => apiFetch('/holidays'),
}

export const documentAPI = {
  getAll: (params?: { tab?: string; folder?: string; category?: string; search?: string }) =>
    apiFetch('/documents' + buildQuery(params)),
  upload: (formData: FormData) =>
    apiFetch('/documents/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // empty so browser sets multipart Content-Type with boundary
    }),
  download: (id: string) =>
    apiFetch(`/documents/${id}/download`),
  delete: (id: string) =>
    apiFetch(`/documents/${id}`, { method: 'DELETE' }),
  share: (id: string, employeeIds: string[]) =>
    apiFetch(`/documents/${id}/share`, {
      method: 'PUT',
      body: JSON.stringify({ employee_ids: employeeIds }),
    }),
  getStats: () => apiFetch('/documents/stats'),
}

export const helpdeskAPI = {
  getTickets: (params?: { status?: string; category?: string; search?: string }) =>
    apiFetch('/helpdesk/tickets' + buildQuery(params)),
  getStats: () => apiFetch('/helpdesk/stats'),
  createTicket: (data: { category: string; subject: string; description: string; priority: string }) =>
    apiFetch('/helpdesk/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getTicket: (id: string) =>
    apiFetch(`/helpdesk/tickets/${id}`),
  updateStatus: (id: string, data: { status: string; resolution?: string }) =>
    apiFetch(`/helpdesk/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  addComment: (ticketId: string, content: string) =>
    apiFetch(`/helpdesk/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
}

export const calendarAPI = {
  getEvents: (month: number, year: number) =>
    apiFetch(`/calendar/events?month=${month}&year=${year}`),
  createEvent: (data: object) =>
    apiFetch('/calendar/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteEvent: (id: string) =>
    apiFetch(`/calendar/events/${id}`, { method: 'DELETE' }),
  getHolidays: (year: number) =>
    apiFetch(`/calendar/holidays?year=${year}`),
  createHoliday: (data: object) =>
    apiFetch('/calendar/holidays', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteHoliday: (id: string) =>
    apiFetch(`/calendar/holidays/${id}`, { method: 'DELETE' }),
  approveHoliday: (id: string, data: object) =>
    apiFetch(`/calendar/holidays/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  bulkApproveHolidays: (data: object) =>
    apiFetch('/calendar/holidays/bulk-approve', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

export const employeeExtAPI = {
  updateMyProfile: (data: object) =>
    apiFetch('/employees/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  uploadPhoto: (formData: FormData) =>
    apiFetch('/employees/me/photo', {
      method: 'POST',
      body: formData,
      headers: {}, // empty so browser sets multipart Content-Type with boundary
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
}

export const announcementAPI = {
  getAll: () => apiFetch('/announcements'),
  create: (data: Record<string, unknown>) =>
    apiFetch('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch(`/announcements/${id}`, { method: 'DELETE' }),
}
