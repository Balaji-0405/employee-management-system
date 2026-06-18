const BASE = "/api/v1/leaves";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("ems_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function getMyLeaveBalance() {
  const res = await fetch(`${BASE}/balance/my`, { headers: authHeaders() });
  return handleResponse<any>(res);
}

export async function applyLeave(body: {
  leave_type: string;
  from_date: string;
  to_date: string;
  days?: number;
  reason?: string;
}) {
  const res = await fetch(`${BASE}/requests`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<any>(res);
}

export async function getMyLeaveRequests() {
  const res = await fetch(`${BASE}/requests/my`, { headers: authHeaders() });
  return handleResponse<any[]>(res);
}

export async function cancelLeaveRequest(id: string) {
  const res = await fetch(`${BASE}/requests/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse<any>(res);
}

export async function getTeamLeaveBalances() {
  const res = await fetch(`${BASE}/balance/team`, { headers: authHeaders() });
  return handleResponse<any[]>(res);
}

export async function getEmployeeLeaveBalance(employeeId: string) {
  const res = await fetch(`${BASE}/balance/${employeeId}`, { headers: authHeaders() });
  return handleResponse<any>(res);
}

export async function getTeamLeaveHistory() {
  const res = await fetch(`${BASE}/requests/team-history`, { headers: authHeaders() });
  return handleResponse<any[]>(res);
}

export async function reviewLeaveRequest(id: string, status: 'approved' | 'rejected', note: string) {
  if (status === 'approved') return approveLeave(id);
  return rejectLeave(id, note);
}

export async function getPendingApprovals() {
  const res = await fetch(`${BASE}/requests/pending`, { headers: authHeaders() });
  return handleResponse<any[]>(res);
}

export async function approveLeave(id: string) {
  const res = await fetch(`${BASE}/requests/${id}/approve`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return handleResponse<any>(res);
}

export async function rejectLeave(id: string, reason: string) {
  const res = await fetch(`${BASE}/requests/${id}/reject`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handleResponse<any>(res);
}
