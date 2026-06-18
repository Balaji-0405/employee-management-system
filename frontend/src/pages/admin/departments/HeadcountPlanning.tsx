import React, { useState, useMemo } from "react";
import { ChevronDown, Plus, X, Check, Pencil, Users, Briefcase, TrendingUp, UserPlus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

type HiringStatus = "Open" | "In Progress" | "Filled" | "On Hold" | "Cancelled";
type Priority = "High" | "Medium" | "Low";
type AttritionRisk = "High" | "Medium" | "Low";

interface PlanRow {
  id: string;
  dept: string;
  q1a: number; q1act: number;
  q2a: number; q2act: number;
  q3a: number; q3act: number;
  q4: number;
  subRows?: PlanRow[];
}

interface HiringRequest {
  id: string;
  role: string;
  dept: string;
  level: string;
  budget: number;
  targetDate: string;
  recruiter: string;
  status: HiringStatus;
  priority: Priority;
}

interface AttritionEntry {
  dept: string;
  risk: AttritionRisk;
  exits: number;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const PLAN_DATA: PlanRow[] = [
  {
    id: "eng", dept: "Engineering", q1a: 330, q1act: 325, q2a: 335, q2act: 330, q3a: 340, q3act: 337, q4: 345,
    subRows: [
      { id: "fe", dept: "↳ Frontend", q1a: 85, q1act: 84, q2a: 87, q2act: 85, q3a: 89, q3act: 88, q4: 92 },
      { id: "be", dept: "↳ Backend", q1a: 115, q1act: 112, q2a: 118, q2act: 115, q3a: 120, q3act: 119, q4: 125 },
      { id: "do", dept: "↳ DevOps", q1a: 44, q1act: 44, q2a: 44, q2act: 44, q3a: 45, q3act: 44, q4: 47 },
      { id: "qa", dept: "↳ QA", q1a: 86, q1act: 85, q2a: 86, q2act: 86, q3a: 86, q3act: 86, q4: 81 },
    ],
  },
  { id: "prod", dept: "Product", q1a: 85, q1act: 85, q2a: 87, q2act: 86, q3a: 89, q3act: 88, q4: 92 },
  { id: "hr", dept: "HR", q1a: 27, q1act: 27, q2a: 28, q2act: 27, q3a: 28, q3act: 28, q4: 30 },
  { id: "sales", dept: "Sales", q1a: 168, q1act: 165, q2a: 172, q2act: 170, q3a: 180, q3act: 176, q4: 188 },
  { id: "fin", dept: "Finance", q1a: 64, q1act: 64, q2a: 65, q2act: 64, q3a: 67, q3act: 66, q4: 70 },
  { id: "des", dept: "Design", q1a: 43, q1act: 43, q2a: 44, q2act: 43, q3a: 45, q3act: 45, q4: 48 },
  { id: "mkt", dept: "Marketing", q1a: 49, q1act: 48, q2a: 51, q2act: 50, q3a: 52, q3act: 51, q4: 55 },
  { id: "ops", dept: "Operations", q1a: 74, q1act: 73, q2a: 76, q2act: 74, q3a: 78, q3act: 77, q4: 80 },
  { id: "it", dept: "IT", q1a: 34, q1act: 34, q2a: 35, q2act: 34, q3a: 36, q3act: 35, q4: 38 },
  { id: "anlyt", dept: "Analytics", q1a: 31, q1act: 30, q2a: 32, q2act: 31, q3a: 33, q3act: 32, q4: 36 },
];

const HIRING_REQUESTS: HiringRequest[] = [
  { id: "HR-001", role: "Senior Frontend Engineer", dept: "Engineering", level: "L4", budget: 1800000, targetDate: "15 Jul 2026", recruiter: "Meena K.", status: "In Progress", priority: "High" },
  { id: "HR-002", role: "Product Manager II", dept: "Product", level: "L3", budget: 2000000, targetDate: "01 Aug 2026", recruiter: "Anita J.", status: "Open", priority: "High" },
  { id: "HR-003", role: "Sales Executive", dept: "Sales", level: "L2", budget: 900000, targetDate: "01 Jul 2026", recruiter: "Sneha R.", status: "Open", priority: "Medium" },
  { id: "HR-004", role: "Backend Engineer", dept: "Engineering", level: "L3", budget: 1500000, targetDate: "31 Jul 2026", recruiter: "Meena K.", status: "Filled", priority: "High" },
  { id: "HR-005", role: "Marketing Analyst", dept: "Marketing", level: "L2", budget: 800000, targetDate: "01 Sep 2026", recruiter: "Anita J.", status: "On Hold", priority: "Low" },
  { id: "HR-006", role: "DevOps Engineer", dept: "Engineering", level: "L3", budget: 1600000, targetDate: "15 Aug 2026", recruiter: "Meena K.", status: "In Progress", priority: "Medium" },
  { id: "HR-007", role: "Financial Analyst", dept: "Finance", level: "L2", budget: 1000000, targetDate: "30 Sep 2026", recruiter: "Sneha R.", status: "Cancelled", priority: "Low" },
];

const ATTRITION: AttritionEntry[] = [
  { dept: "Sales", risk: "High", exits: 15 },
  { dept: "Engineering", risk: "High", exits: 8 },
  { dept: "Analytics", risk: "Medium", exits: 4 },
  { dept: "Marketing", risk: "Medium", exits: 4 },
  { dept: "Product", risk: "Medium", exits: 3 },
  { dept: "Operations", risk: "Medium", exits: 3 },
  { dept: "Finance", risk: "Low", exits: 2 },
  { dept: "Design", risk: "Low", exits: 1 },
  { dept: "HR", risk: "Low", exits: 1 },
  { dept: "IT", risk: "Low", exits: 1 },
];

const HC_CHART_DATA = [
  { dept: "Eng", approved: 340, actual: 337, forecast: 345 },
  { dept: "Sales", approved: 180, actual: 176, forecast: 188 },
  { dept: "Finance", approved: 67, actual: 66, forecast: 70 },
  { dept: "Product", approved: 89, actual: 88, forecast: 92 },
  { dept: "Ops", approved: 78, actual: 77, forecast: 80 },
  { dept: "Mktg", approved: 52, actual: 51, forecast: 55 },
  { dept: "Design", approved: 45, actual: 45, forecast: 48 },
  { dept: "IT", approved: 36, actual: 35, forecast: 38 },
  { dept: "Analytics", approved: 33, actual: 32, forecast: 36 },
  { dept: "HR", approved: 28, actual: 28, forecast: 30 },
];

const DEPT_OPTIONS = ["Engineering", "Product", "HR", "Sales", "Finance", "Design", "Marketing", "Operations", "IT", "Analytics"];
const RECRUITER_OPTIONS = ["Meena K.", "Anita J.", "Sneha R.", "Priya M.", "Rajan K."];

// ── Helpers ────────────────────────────────────────────────────────────────────

function ytdVariance(row: PlanRow): number {
  return (row.q1act - row.q1a) + (row.q2act - row.q2a) + (row.q3act - row.q3a);
}

function cellColor(actual: number, approved: number): string {
  if (actual === approved) return "text-green-600 font-semibold";
  if (actual > approved) return "text-purple-600 font-semibold";
  const diff = approved - actual;
  if (diff <= 2) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}

function varianceColor(v: number): string {
  if (v === 0) return "text-green-600 font-semibold";
  if (v > 0) return "text-purple-600 font-semibold";
  if (v >= -3) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}

function formatBudget(n: number): string {
  return `₹${(n / 100000).toFixed(0)}L`;
}

// ── Status Badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: HiringStatus }) {
  const styles: Record<HiringStatus, string> = {
    Open: "bg-blue-50 text-blue-700",
    "In Progress": "bg-amber-50 text-amber-700",
    Filled: "bg-green-50 text-green-700",
    "On Hold": "bg-slate-100 text-slate-600",
    Cancelled: "bg-red-50 text-red-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[status]}`}>{status}</span>;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = {
    High: "bg-red-50 text-red-600",
    Medium: "bg-amber-50 text-amber-600",
    Low: "bg-slate-100 text-slate-500",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${styles[priority]}`}>{priority}</span>;
}

function RiskBadge({ risk }: { risk: AttritionRisk }) {
  const styles: Record<AttritionRisk, string> = {
    High: "bg-red-50 text-red-600",
    Medium: "bg-amber-50 text-amber-700",
    Low: "bg-green-50 text-green-700",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${styles[risk]}`}>{risk}</span>;
}

// ── Add Hiring Request Modal ───────────────────────────────────────────────────

interface HiringFormState {
  role: string;
  dept: string;
  level: string;
  budget: string;
  targetDate: string;
  recruiter: string;
  justification: string;
  priority: Priority;
}

function AddHiringModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<HiringFormState>({
    role: "", dept: "", level: "", budget: "",
    targetDate: "", recruiter: "", justification: "", priority: "Medium",
  });
  const [errors, setErrors] = useState<Partial<HiringFormState>>({});

  function setField<K extends keyof HiringFormState>(k: K, v: HiringFormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  }

  function handleSubmit() {
    const errs: Partial<HiringFormState> = {};
    if (!form.role.trim()) errs.role = "Required";
    if (!form.dept) errs.dept = "Required";
    if (!form.level) errs.level = "Required";
    if (!form.targetDate) errs.targetDate = "Required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onClose();
  }

  const inputCls = (field: keyof HiringFormState) =>
    `h-9 w-full rounded-lg border px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 ${(errors[field] as string) ? "border-red-400" : "border-slate-200 focus:border-blue-400"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">Add Hiring Request</p>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 p-6">
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Role<span className="ml-0.5 text-red-500">*</span></label>
            <input type="text" value={form.role} onChange={(e) => setField("role", e.target.value)}
              placeholder="e.g. Senior Data Engineer" className={inputCls("role")} />
            {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Department<span className="ml-0.5 text-red-500">*</span></label>
            <select value={form.dept} onChange={(e) => setField("dept", e.target.value)} className={inputCls("dept")}>
              <option value="">Select department</option>
              {DEPT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.dept && <p className="mt-1 text-xs text-red-500">{errors.dept}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Level<span className="ml-0.5 text-red-500">*</span></label>
            <select value={form.level} onChange={(e) => setField("level", e.target.value)} className={inputCls("level")}>
              <option value="">Select level</option>
              {["L1", "L2", "L3", "L4", "L5"].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            {errors.level && <p className="mt-1 text-xs text-red-500">{errors.level}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Budget (₹)</label>
            <input type="number" value={form.budget} onChange={(e) => setField("budget", e.target.value)}
              placeholder="e.g. 1500000" className={inputCls("budget")} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Target Hire Date<span className="ml-0.5 text-red-500">*</span></label>
            <input type="date" value={form.targetDate} onChange={(e) => setField("targetDate", e.target.value)} className={inputCls("targetDate")} />
            {errors.targetDate && <p className="mt-1 text-xs text-red-500">{errors.targetDate}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Recruiter</label>
            <select value={form.recruiter} onChange={(e) => setField("recruiter", e.target.value)} className={inputCls("recruiter")}>
              <option value="">Select recruiter</option>
              {RECRUITER_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Priority</label>
            <div className="flex gap-2">
              {(["High", "Medium", "Low"] as Priority[]).map((p) => (
                <button key={p} onClick={() => setField("priority", p)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${form.priority === p ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Justification</label>
            <textarea rows={3} value={form.justification} onChange={(e) => setField("justification", e.target.value)}
              placeholder="Explain the business need for this hire..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Check className="h-4 w-4" /> Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FY Selector ────────────────────────────────────────────────────────────────

function FySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const options = ["FY 2025-26", "FY 2026-27"];

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
        {value} <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 ${value === opt ? "font-semibold text-blue-600" : "text-slate-700"}`}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Planning Table ─────────────────────────────────────────────────────────────

function PlanningTable() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totals = useMemo(() => {
    return PLAN_DATA.reduce((acc, row) => ({
      q1a: acc.q1a + row.q1a,
      q1act: acc.q1act + row.q1act,
      q2a: acc.q2a + row.q2a,
      q2act: acc.q2act + row.q2act,
      q3a: acc.q3a + row.q3a,
      q3act: acc.q3act + row.q3act,
      q4: acc.q4 + row.q4,
    }), { q1a: 0, q1act: 0, q2a: 0, q2act: 0, q3a: 0, q3act: 0, q4: 0 });
  }, []);

  const totalVariance = PLAN_DATA.reduce((sum, row) => sum + ytdVariance(row), 0);

  const thCls = "px-3 py-3 font-semibold text-[11px] text-slate-500 text-right first:text-left";
  const tdCls = "px-3 py-3 text-xs text-right first:text-left";

  function renderRow(row: PlanRow, isSubRow = false) {
    const expanded = expandedIds.has(row.id);
    const hasChildren = !isSubRow && row.subRows && row.subRows.length > 0;
    const variance = ytdVariance(row);

    return (
      <React.Fragment key={row.id}>
        <tr
          className={`border-b border-slate-100 hover:bg-slate-50 ${isSubRow ? "bg-slate-50/50" : "cursor-pointer"}`}
          onClick={hasChildren ? () => toggleExpand(row.id) : undefined}
        >
          <td className={`${tdCls} font-medium text-slate-800`}>
            <div className="flex items-center gap-1.5">
              {hasChildren && (
                <span className="text-slate-400 text-[10px]">{expanded ? "▾" : "▸"}</span>
              )}
              {isSubRow && <span className="w-3 shrink-0" />}
              <span className={isSubRow ? "text-slate-600" : ""}>{row.dept}</span>
            </div>
          </td>
          <td className={thCls}>{row.q1a}</td>
          <td className={`${tdCls} ${cellColor(row.q1act, row.q1a)}`}>{row.q1act}</td>
          <td className={thCls}>{row.q2a}</td>
          <td className={`${tdCls} ${cellColor(row.q2act, row.q2a)}`}>{row.q2act}</td>
          <td className={thCls}>{row.q3a}</td>
          <td className={`${tdCls} ${cellColor(row.q3act, row.q3a)}`}>{row.q3act}</td>
          <td className={`${tdCls} text-slate-700`}>{row.q4}</td>
          <td className={`${tdCls} ${varianceColor(variance)}`}>{variance > 0 ? `+${variance}` : variance}</td>
        </tr>
        {hasChildren && expanded && row.subRows!.map((sub) => renderRow(sub, true))}
      </React.Fragment>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
      <div className="border-b border-slate-100 px-5 py-3">
        <p className="text-sm font-bold text-slate-800">Headcount Plan by Department</p>
        <p className="text-xs text-slate-400">Click a row to expand sub-departments</p>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className={`${thCls} min-w-[140px]`}>Department</th>
            <th className={thCls}>Q1 App.</th>
            <th className={thCls}>Q1 Act.</th>
            <th className={thCls}>Q2 App.</th>
            <th className={thCls}>Q2 Act.</th>
            <th className={thCls}>Q3 App.</th>
            <th className={thCls}>Q3 Act.</th>
            <th className={thCls}>Q4 Plan</th>
            <th className={thCls}>YTD Var.</th>
          </tr>
        </thead>
        <tbody>
          {PLAN_DATA.map((row) => renderRow(row))}
          {/* Totals row */}
          <tr className="border-t-2 border-slate-300 bg-slate-50">
            <td className="px-3 py-3 text-xs font-bold text-slate-900">Total</td>
            <td className="px-3 py-3 text-xs text-right font-bold text-slate-900">{totals.q1a}</td>
            <td className={`px-3 py-3 text-xs text-right ${cellColor(totals.q1act, totals.q1a)}`}>{totals.q1act}</td>
            <td className="px-3 py-3 text-xs text-right font-bold text-slate-900">{totals.q2a}</td>
            <td className={`px-3 py-3 text-xs text-right ${cellColor(totals.q2act, totals.q2a)}`}>{totals.q2act}</td>
            <td className="px-3 py-3 text-xs text-right font-bold text-slate-900">{totals.q3a}</td>
            <td className={`px-3 py-3 text-xs text-right ${cellColor(totals.q3act, totals.q3a)}`}>{totals.q3act}</td>
            <td className="px-3 py-3 text-xs text-right font-bold text-slate-900">{totals.q4}</td>
            <td className={`px-3 py-3 text-xs text-right ${varianceColor(totalVariance)}`}>{totalVariance}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Hiring Requests Table ──────────────────────────────────────────────────────

function HiringTable({ onAdd }: { onAdd: () => void }) {
  const openCount = HIRING_REQUESTS.filter((r) => r.status === "Open" || r.status === "In Progress").length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-800">Active Hiring Requests</p>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{openCount} active</span>
        </div>
        <button onClick={onAdd}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
          <Plus className="h-3.5 w-3.5" /> Add Request
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
              {["Role", "Department", "Level", "Budget", "Target Date", "Recruiter", "Priority", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {HIRING_REQUESTS.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{req.role}</td>
                <td className="px-4 py-3 text-slate-600">{req.dept}</td>
                <td className="px-4 py-3 text-slate-600">{req.level}</td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{formatBudget(req.budget)}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{req.targetDate}</td>
                <td className="px-4 py-3 text-slate-600">{req.recruiter}</td>
                <td className="px-4 py-3"><PriorityBadge priority={req.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {(req.status === "Open") && (
                      <button className="grid h-7 w-7 place-items-center rounded-md border border-red-100 text-red-400 hover:bg-red-50" title="Cancel">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Attrition Sidebar ──────────────────────────────────────────────────────────

function AttritionSidebar() {
  return (
    <div className="sticky top-4 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-bold text-slate-800">Attrition Forecast</p>
        <p className="text-xs text-slate-400">Next 90 days</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {ATTRITION.map((entry) => (
          <div key={entry.dept} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-xs font-semibold text-slate-800">{entry.dept}</span>
              <RiskBadge risk={entry.risk} />
            </div>
            <span className="ml-2 shrink-0 text-xs font-bold text-slate-700">{entry.exits} exits</span>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 px-4 py-3 space-y-2">
        <p className="text-[11px] text-slate-500">
          Avg replacement lead time: <span className="font-semibold text-slate-700">23 days</span>
        </p>
        <button className="text-xs font-semibold text-blue-600 hover:underline">View Full Report →</button>
      </div>
    </div>
  );
}

// ── Headcount Chart ────────────────────────────────────────────────────────────

function HeadcountChart() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <p className="text-sm font-bold text-slate-800">Headcount by Department</p>
        <p className="text-xs text-slate-400">Approved vs. Current vs. Q4 Forecast</p>
      </div>
      <div className="p-5">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={HC_CHART_DATA} barGap={2} barSize={18} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="dept" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              cursor={{ fill: "#f8fafc" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
              formatter={(value) => <span style={{ color: "#64748b" }}>{value}</span>}
            />
            <Bar dataKey="approved" name="Approved HC" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="actual" name="Current Actual" fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="forecast" name="Q4 Forecast" fill="#f97316" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function HeadcountPlanning() {
  const [fy, setFy] = useState("FY 2025-26");
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="min-h-full bg-slate-50 px-6 py-5">
      {/* Breadcrumb */}
      <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
        <span className="cursor-pointer hover:text-blue-600">Dashboard</span>
        <span>›</span>
        <span className="cursor-pointer hover:text-blue-600">Departments</span>
        <span>›</span>
        <span className="font-semibold text-slate-700">Headcount Planning</span>
      </nav>

      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Headcount Planning</h1>
        <div className="flex items-center gap-2">
          <FySelector value={fy} onChange={setFy} />
          <button className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Export Plan
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700">
            <UserPlus className="h-3.5 w-3.5" /> Add Hiring Request
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Approved HC", value: "1,248", bg: "bg-blue-500" },
          { icon: Briefcase, label: "Filled", value: "1,186", bg: "bg-green-500" },
          { icon: TrendingUp, label: "Open Positions", value: "62", bg: "bg-amber-500" },
          { icon: UserPlus, label: "Planned Additions Q3", value: "28", bg: "bg-violet-500" },
        ].map(({ icon: Icon, label, value, bg }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xl font-bold text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main layout: content + sidebar */}
      <div className="flex gap-5 items-start">
        {/* Left: tables + chart */}
        <div className="flex-1 min-w-0 space-y-6">
          <PlanningTable />
          <HiringTable onAdd={() => setShowAddModal(true)} />
          <HeadcountChart />
        </div>

        {/* Right: attrition sidebar */}
        <div className="w-[280px] shrink-0">
          <AttritionSidebar />
        </div>
      </div>

      {showAddModal && <AddHiringModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
