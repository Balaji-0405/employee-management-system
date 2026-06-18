const BASE = "/api/v1/payroll";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("ems_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(
      text.trimStart().startsWith("<")
        ? "Cannot connect to server. Ensure the backend is running on port 5000."
        : `Unexpected response (${res.status}): ${text.slice(0, 120)}`
    );
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || body.error || res.statusText);
  }
  return res.json() as Promise<T>;
}

function normalizeRun(r: any): any {
  return { ...r, month: r.pay_month ?? r.month, year: r.pay_year ?? r.year };
}

export async function getPayrollRuns() {
  const res = await fetch(`${BASE}/runs`, { headers: authHeaders() });
  const data = await handleResponse<any[]>(res);
  return data.map(normalizeRun);
}

export async function getPayrollRunById(id: string) {
  const res = await fetch(`${BASE}/runs/${id}`, { headers: authHeaders() });
  const data = await handleResponse<any>(res);
  return normalizeRun(data);
}

export async function createPayrollRun(month: number, year: number) {
  const res = await fetch(`${BASE}/runs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ pay_month: month, pay_year: year }),
  });
  const data = await handleResponse<any>(res);
  return normalizeRun(data);
}

export async function computePayrollRun(id: string) {
  const res = await fetch(`${BASE}/runs/${id}/compute`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse<any>(res);
}

export async function lockPayrollRun(id: string) {
  const res = await fetch(`${BASE}/runs/${id}/lock`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await handleResponse<any>(res);
  return normalizeRun(data);
}

export async function disbursePayrollRun(id: string) {
  const res = await fetch(`${BASE}/runs/${id}/disburse`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await handleResponse<any>(res);
  return normalizeRun(data);
}

export async function getPayrollRegister(
  id: string,
  filters: { search?: string; department?: string } = {}
) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.department) params.set("department", filters.department);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${BASE}/runs/${id}/register${qs}`, {
    headers: authHeaders(),
  });
  return handleResponse<any[]>(res);
}

export async function getBankFile(id: string) {
  const token = localStorage.getItem("ems_token");
  const res = await fetch(`${BASE}/runs/${id}/bank-file`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || res.statusText);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bank-file-${id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function overridePayslip(
  id: string,
  body: { new_net: number; reason: string }
) {
  const res = await fetch(`${BASE}/payslips/${id}/override`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ net_salary_override: body.new_net, reason: body.reason }),
  });
  return handleResponse<any>(res);
}

export async function getSalaryConfig(employeeId: string) {
  const res = await fetch(`${BASE}/salary-config/${employeeId}`, {
    headers: authHeaders(),
  });
  return handleResponse<any>(res);
}

export async function upsertSalaryConfig(
  employeeId: string,
  body: {
    basic: number;
    insurance: number;
    pt_state: string;
    loan_emi: number;
    effective_from: string;
  }
) {
  const res = await fetch(`${BASE}/salary-config/${employeeId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({
      basic_salary: body.basic,
      insurance_premium: body.insurance,
      pt_state: body.pt_state,
      loan_emi: body.loan_emi,
      effective_from: body.effective_from,
    }),
  });
  return handleResponse<any>(res);
}

export async function addOneTimeItem(body: {
  employee_id: string;
  run_id: string;
  type: "bonus" | "deduction";
  amount: number;
  label: string;
}) {
  const res = await fetch(`${BASE}/one-time`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      employee_id: body.employee_id,
      run_id: body.run_id,
      item_type: body.type,
      amount_rupees: body.amount,
      label: body.label,
    }),
  });
  return handleResponse<any>(res);
}

export async function getEmployees() {
  const res = await fetch(`/api/employees`, { headers: authHeaders() });
  return handleResponse<any[]>(res);
}

export async function seedSalaryConfigs() {
  const res = await fetch(`${BASE}/salary-config/seed-from-employees`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse<any>(res);
}

export async function getMyPayslips() {
  const res = await fetch(`${BASE}/payslips/my`, { headers: authHeaders() });
  return handleResponse<any[]>(res);
}

export async function getMyPayslipDetail(runId: string) {
  const res = await fetch(`${BASE}/payslips/my/${runId}`, {
    headers: authHeaders(),
  });
  return handleResponse<any>(res);
}
