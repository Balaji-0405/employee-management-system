import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  AlertCircle,
  Lock,
  Pencil,
  Plus,
} from "lucide-react";
import {
  getPayrollRuns,
  getPayrollRegister,
  getBankFile,
  overridePayslip,
  addOneTimeItem,
} from "../../../services/payrollApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatINR(amount: number | undefined | null): string {
  if (amount === null || amount === undefined) return "—";
  return Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatPeriod(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_GRADIENTS = [
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-orange-400 to-amber-500",
  "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500",
];

function avatarGradient(name: string) {
  return AVATAR_GRADIENTS[(name?.charCodeAt(0) ?? 0) % AVATAR_GRADIENTS.length];
}

function EmployeeAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base" };
  return (
    <div
      className={`shrink-0 grid place-items-center rounded-full bg-gradient-to-br ${avatarGradient(name)} font-bold text-white ${sizes[size]}`}
    >
      {getInitials(name)}
    </div>
  );
}

function exportCSV(data: any[]) {
  if (!data.length) return;
  const headers = [
    "Employee", "Dept", "Working Days", "Present", "LOP",
    "Basic", "OT", "Bonus", "Gross",
    "PT", "Insurance", "Loan", "Deductions", "Net Pay",
  ];
  const rows = data.map((r) =>
    [
      r.employeeName, r.department, r.working_days, r.present_days, r.lop_days,
      r.basic_salary_rs, r.ot_pay_rs, r.bonus_rs, r.gross_salary_rs,
      r.pt_deduction_rs, r.insurance_deduction_rs, r.loan_deduction_rs,
      r.total_deductions_rs, r.net_salary_rs,
    ]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "payroll_register.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Payslip Detail Drawer ─────────────────────────────────────────────────────

function PayslipDrawer({
  payslip,
  runStatus,
  onClose,
  onOverride,
}: {
  payslip: any;
  runStatus: string;
  onClose: () => void;
  onOverride: () => void;
}) {
  const ps = payslip;
  const name = ps.employeeName || "Unknown";

  return (
    <div className="flex h-full w-[400px] shrink-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <EmployeeAvatar name={name} size="md" />
          <div>
            <p className="font-bold text-slate-900 text-sm">{name}</p>
            <p className="text-xs text-slate-500">{ps.department || "—"}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Attendance */}
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Attendance</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Working Days", ps.working_days],
              ["Present Days", ps.present_days],
              ["SL Used", ps.sl_used ?? 0],
              ["EL Used", ps.el_used ?? 0],
              ["LOP Days", ps.lop_days ?? 0],
            ].map(([label, val]) => (
              <div key={label} className="rounded-lg bg-slate-50 p-2.5 text-center">
                <p className={`text-base font-bold ${label === "LOP Days" && Number(val) > 0 ? "text-red-600" : "text-slate-900"}`}>
                  {val}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Earnings */}
        <section className="rounded-xl border-l-4 border-green-400 bg-green-50 p-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-green-800">Earnings</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Basic Salary</span>
              <span className="font-semibold text-slate-800">₹{formatINR(ps.basic_salary_rs)}</span>
            </div>
            {(ps.ot_pay_rs || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Overtime ({ps.ot_hours ?? 0} hrs)</span>
                <span className="font-semibold text-slate-800">₹{formatINR(ps.ot_pay_rs)}</span>
              </div>
            )}
            {(ps.bonus_rs || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Bonus</span>
                <span className="font-semibold text-slate-800">₹{formatINR(ps.bonus_rs)}</span>
              </div>
            )}
            <div className="border-t border-green-200 pt-1.5 flex justify-between">
              <span className="font-bold text-slate-700">Gross Salary</span>
              <span className="font-bold text-slate-900">₹{formatINR(ps.gross_salary_rs)}</span>
            </div>
          </div>
        </section>

        {/* Deductions */}
        <section className="rounded-xl border-l-4 border-red-400 bg-red-50 p-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-red-800">Deductions</p>
          <div className="space-y-1.5 text-xs">
            {(ps.lop_days || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">LOP Deduction (-{ps.lop_days} days)</span>
                <span className="font-semibold text-red-700">₹{formatINR(ps.lop_deduction_rs)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-600">Professional Tax</span>
              <span className="font-semibold text-slate-800">₹{formatINR(ps.pt_deduction_rs)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Group Insurance</span>
              <span className="font-semibold text-slate-800">₹{formatINR(ps.insurance_deduction_rs)}</span>
            </div>
            {(ps.loan_deduction_rs || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Loan EMI</span>
                <span className="font-semibold text-slate-800">₹{formatINR(ps.loan_deduction_rs)}</span>
              </div>
            )}
            <div className="border-t border-red-200 pt-1.5 flex justify-between">
              <span className="font-bold text-slate-700">Total Deductions</span>
              <span className="font-bold text-red-700">₹{formatINR(ps.total_deductions_rs)}</span>
            </div>
          </div>
        </section>

        {/* Net Pay */}
        <div className="rounded-xl bg-green-600 px-4 py-4 text-center">
          <p className="text-xs font-semibold text-green-100">Net Pay</p>
          <p className="text-2xl font-bold text-white mt-1">₹{formatINR(ps.net_salary_rs)}</p>
        </div>

        {/* Override badge */}
        {ps.is_override && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
            <p className="font-bold text-amber-800">
              ⚠ Manually overridden on{" "}
              {ps.override_at ? new Date(ps.override_at).toLocaleDateString("en-IN") : "—"}
            </p>
            <p className="mt-1 text-amber-700">Reason: {ps.override_reason}</p>
          </div>
        )}

        {/* Override button */}
        {runStatus === "computed" && (
          <button
            onClick={onOverride}
            className="w-full rounded-lg border border-amber-200 bg-amber-50 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
          >
            Override Net Pay
          </button>
        )}
      </div>
    </div>
  );
}

// ── Override Modal ────────────────────────────────────────────────────────────

function OverrideModal({
  payslip,
  onConfirm,
  onClose,
}: {
  payslip: any;
  onConfirm: (newNet: number, reason: string) => void;
  onClose: () => void;
}) {
  const [newNet, setNewNet] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  function handleSubmit() {
    if (!newNet || isNaN(Number(newNet))) { setErr("Enter a valid amount"); return; }
    if (reason.trim().length < 20) { setErr("Reason must be at least 20 characters"); return; }
    onConfirm(Number(newNet), reason.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">
            Override Net Pay — {payslip.employeeName || "Employee"}
          </p>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-500">Current net pay: </span>
            <span className="font-bold text-slate-900">₹{formatINR(payslip.net_salary_rs)}</span>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              New Net Pay (₹)<span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={newNet}
              onChange={(e) => setNewNet(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Enter amount in ₹"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Reason<span className="text-red-500">*</span>{" "}
              <span className="font-normal text-slate-400">(min 20 chars)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Explain the reason for this override..."
            />
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            This action is audit-logged and cannot be undone after locking.
          </div>
          <button
            onClick={handleSubmit}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Confirm Override
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add One-Time Modal ────────────────────────────────────────────────────────

function OneTimeModal({
  runId,
  register,
  onConfirm,
  onClose,
}: {
  runId: string;
  register: any[];
  onConfirm: (body: any) => void;
  onClose: () => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<"bonus" | "deduction">("bonus");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [err, setErr] = useState("");

  function handleSubmit() {
    if (!employeeId) { setErr("Select an employee"); return; }
    if (!amount || isNaN(Number(amount))) { setErr("Enter a valid amount"); return; }
    if (!label.trim()) { setErr("Enter a label"); return; }
    onConfirm({ employee_id: employeeId, run_id: runId, type, amount: Number(amount), label: label.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">Add Bonus / Deduction</p>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Employee<span className="text-red-500">*</span>
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
            >
              <option value="">Select employee...</option>
              {register.map((r) => (
                <option key={r.employee_id} value={r.employee_id}>
                  {r.employeeName || r.employee_id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Type</label>
            <div className="flex gap-4">
              {(["bonus", "deduction"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 capitalize">
                  <input type="radio" name="one-time-type" value={t} checked={type === t} onChange={() => setType(t)} />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Amount (₹)<span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Label<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
              placeholder="e.g. Diwali Bonus, Advance Recovery"
            />
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <button
            onClick={handleSubmit}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PayrollRegister() {
  const navigate = useNavigate();
  const { runId: paramRunId } = useParams<{ runId?: string }>();

  const [run, setRun] = useState<any>(null);
  const [register, setRegister] = useState<any[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [overrideModal, setOverrideModal] = useState<any>(null);
  const [oneTimeModal, setOneTimeModal] = useState(false);
  const [filters, setFilters] = useState({ search: "", department: "" });
  const [error, setError] = useState<string | null>(null);

  const runId = paramRunId || run?.id;
  const allDepts = Array.from(new Set(register.map((r) => r.department))).filter(Boolean);

  useEffect(() => {
    getPayrollRuns()
      .then((data) => {
        const latest =
          data.find((r: any) =>
            r.status === "computed" || r.status === "locked" || r.status === "disbursed"
          ) || data[0];
        if (latest) setRun(latest);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!runId) return;
    getPayrollRegister(runId, filters)
      .then(setRegister)
      .catch((e) => setError(e.message));
  }, [runId, filters]);

  async function handleOverrideConfirm(newNet: number, reason: string) {
    try {
      await overridePayslip(overrideModal.id, { new_net: newNet, reason });
      setOverrideModal(null);
      const updated = await getPayrollRegister(runId!, filters);
      setRegister(updated);
      if (selectedPayslip) {
        const fresh = updated.find((r: any) => r.id === selectedPayslip.id);
        if (fresh) setSelectedPayslip(fresh);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleOneTimeConfirm(body: any) {
    try {
      await addOneTimeItem(body);
      setOneTimeModal(false);
      const updated = await getPayrollRegister(runId!, filters);
      setRegister(updated);
    } catch (e: any) {
      setError(e.message);
    }
  }

  // Totals — all _rs fields are already in rupees
  const totals = register.reduce(
    (acc, r) => ({
      basic:             acc.basic             + (r.basic_salary_rs       || 0),
      ot_pay:            acc.ot_pay             + (r.ot_pay_rs             || 0),
      bonus:             acc.bonus              + (r.bonus_rs              || 0),
      gross:             acc.gross              + (r.gross_salary_rs       || 0),
      pt_deduction:      acc.pt_deduction       + (r.pt_deduction_rs       || 0),
      insurance:         acc.insurance          + (r.insurance_deduction_rs || 0),
      loan:              acc.loan               + (r.loan_deduction_rs     || 0),
      total_deductions:  acc.total_deductions   + (r.total_deductions_rs   || 0),
      net_pay:           acc.net_pay            + (r.net_salary_rs         || 0),
    }),
    { basic: 0, ot_pay: 0, bonus: 0, gross: 0, pt_deduction: 0, insurance: 0, loan: 0, total_deductions: 0, net_pay: 0 }
  );

  const period = run ? formatPeriod(run.month, run.year) : "—";
  const canEdit = run?.status === "computed" || run?.status === "draft";

  return (
    <div className="min-h-full bg-slate-50 px-5 py-5">
      {/* Breadcrumb */}
      <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
        <span className="cursor-pointer hover:text-blue-600">Dashboard</span>
        <span>›</span>
        <span className="cursor-pointer hover:text-blue-600">Payroll</span>
        <span>›</span>
        <span className="font-semibold text-slate-700">Payroll Register</span>
      </nav>

      {/* Title + period nav */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/payroll/dashboard")}
            className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            Payroll Register — {period}
          </h1>
          <button className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {run?.status === "locked" && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
            <Lock className="h-3.5 w-3.5" />
            Locked
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search employee..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <select
          value={filters.department}
          onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
        >
          <option value="">All Departments</option>
          {allDepts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setOneTimeModal(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Bonus / Deduction
            </button>
          )}
          <button
            onClick={() => exportCSV(register)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
          {(run?.status === "locked" || run?.status === "disbursed") && runId && (
            <button
              onClick={() => getBankFile(runId)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Bank File
            </button>
          )}
        </div>
      </div>

      {/* Main layout: table + optional drawer */}
      <div className="flex gap-4 items-start">
        {/* Table */}
        <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-600">
                <th className="sticky left-0 bg-slate-50 px-4 py-3 font-semibold min-w-[180px] z-10">
                  Employee
                </th>
                {[
                  "Dept", "Working Days", "Present", "LOP",
                  "Basic (₹)", "OT (₹)", "Bonus (₹)", "Gross (₹)",
                  "PT (₹)", "Insurance (₹)", "Loan (₹)", "Deductions (₹)", "Net Pay (₹)",
                  "vs Last Month", "Actions",
                ].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {register.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-4 py-8 text-center text-slate-400">
                    {run ? "No payroll data found" : "Loading..."}
                  </td>
                </tr>
              ) : (
                register.map((row: any) => {
                  const variance = row.variance_pct ?? 0;
                  const highVar = Math.abs(variance) > 10;
                  const empName = row.employeeName || "Unknown";
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedPayslip(row)}
                      className={`cursor-pointer hover:bg-slate-50 ${highVar ? "bg-amber-50" : ""} ${
                        selectedPayslip?.id === row.id ? "bg-blue-50" : ""
                      }`}
                    >
                      {/* Sticky employee column */}
                      <td className="sticky left-0 bg-inherit px-4 py-3 z-10">
                        <div className="flex items-center gap-2">
                          <EmployeeAvatar name={empName} size="sm" />
                          <div>
                            <p className="font-medium text-slate-900">{empName}</p>
                            <p className="text-xs text-slate-500">{row.department || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{row.department || "—"}</td>
                      <td className="px-4 py-3 text-slate-700 text-center">{row.working_days}</td>
                      <td className="px-4 py-3 text-slate-700 text-center">{row.present_days}</td>
                      <td className={`px-4 py-3 text-center font-semibold ${(row.lop_days ?? 0) > 0 ? "text-red-600" : "text-slate-700"}`}>
                        {row.lop_days ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">₹{formatINR(row.basic_salary_rs)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">₹{formatINR(row.ot_pay_rs)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">₹{formatINR(row.bonus_rs)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">₹{formatINR(row.gross_salary_rs)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">₹{formatINR(row.pt_deduction_rs)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">₹{formatINR(row.insurance_deduction_rs)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">₹{formatINR(row.loan_deduction_rs)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">₹{formatINR(row.total_deductions_rs)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">₹{formatINR(row.net_salary_rs)}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {variance === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : variance > 0 ? (
                          <span className="text-green-600 font-semibold">↑ {variance.toFixed(1)}%</span>
                        ) : (
                          <span className="text-red-600 font-semibold">↓ {Math.abs(variance).toFixed(1)}%</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {run?.status === "computed" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setOverrideModal(row); }}
                            title="Override"
                            className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Totals row */}
            {register.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-800">
                  <td className="sticky left-0 bg-slate-50 px-4 py-3 z-10">TOTAL</td>
                  <td colSpan={4} className="px-4 py-3" />
                  <td className="px-4 py-3 text-right">₹{formatINR(totals.basic)}</td>
                  <td className="px-4 py-3 text-right">₹{formatINR(totals.ot_pay)}</td>
                  <td className="px-4 py-3 text-right">₹{formatINR(totals.bonus)}</td>
                  <td className="px-4 py-3 text-right">₹{formatINR(totals.gross)}</td>
                  <td className="px-4 py-3 text-right">₹{formatINR(totals.pt_deduction)}</td>
                  <td className="px-4 py-3 text-right">₹{formatINR(totals.insurance)}</td>
                  <td className="px-4 py-3 text-right">₹{formatINR(totals.loan)}</td>
                  <td className="px-4 py-3 text-right">₹{formatINR(totals.total_deductions)}</td>
                  <td className="px-4 py-3 text-right">₹{formatINR(totals.net_pay)}</td>
                  <td colSpan={2} className="px-4 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Drawer */}
        {selectedPayslip && (
          <div
            className="w-[400px] shrink-0 sticky top-4 flex flex-col"
            style={{ height: "calc(100vh - 6rem)", maxHeight: "calc(100vh - 6rem)" }}
          >
            <PayslipDrawer
              payslip={selectedPayslip}
              runStatus={run?.status ?? ""}
              onClose={() => setSelectedPayslip(null)}
              onOverride={() => setOverrideModal(selectedPayslip)}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {overrideModal && (
        <OverrideModal
          payslip={overrideModal}
          onConfirm={handleOverrideConfirm}
          onClose={() => setOverrideModal(null)}
        />
      )}

      {oneTimeModal && runId && (
        <OneTimeModal
          runId={runId}
          register={register}
          onConfirm={handleOneTimeConfirm}
          onClose={() => setOneTimeModal(false)}
        />
      )}
    </div>
  );
}
