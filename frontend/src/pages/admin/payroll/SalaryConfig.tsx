import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Pencil,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  getEmployees,
  getSalaryConfig,
  upsertSalaryConfig,
  seedSalaryConfigs,
} from "../../../services/payrollApi";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmployeeStub {
  id: string;
  name: string;
  designation: string;
  department: string;
  config: SalaryConfigData | null;
}

interface SalaryConfigData {
  basic: number;
  insurance: number;
  pt_state: string;
  loan_emi: number;
  effective_from: string;
  set_by?: string;
  created_at?: string;
  history?: SalaryConfigData[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatINR(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
}

function normalizeConfig(apiConfigs: any[]): SalaryConfigData | null {
  if (!apiConfigs || apiConfigs.length === 0) return null;
  const toRs = (paise: number) => (paise ? Math.round(paise / 100) : 0);
  const mapOne = (c: any): SalaryConfigData => ({
    basic: c.basic_salary_rs ?? toRs(c.basic_salary),
    insurance: c.insurance_premium_rs ?? toRs(c.insurance_premium),
    pt_state: c.pt_state || "KA",
    loan_emi: c.loan_emi_rs ?? toRs(c.loan_emi),
    effective_from: c.effective_from,
    set_by: c.created_by || "Admin",
    created_at: c.created_at,
  });
  const latest = mapOne(apiConfigs[0]);
  latest.history = apiConfigs.slice(1).map(mapOne);
  return latest;
}

const PT_RATES: Record<string, number> = {
  KA: 200,
  MH: 200,
  TN: 180,
  AP: 200,
  TS: 200,
  DL: 0,
};

const PT_OPTIONS = [
  { code: "KA", label: "Karnataka (KA) — ₹200/month" },
  { code: "MH", label: "Maharashtra (MH) — ₹200/month" },
  { code: "TN", label: "Tamil Nadu (TN) — ₹180/month" },
  { code: "AP", label: "Andhra Pradesh (AP) — ₹200/month" },
  { code: "TS", label: "Telangana (TS) — ₹200/month" },
  { code: "DL", label: "Delhi (DL) — ₹0/month" },
];

const PT_FULL_NAMES: Record<string, string> = {
  KA: "Karnataka",
  MH: "Maharashtra",
  TN: "Tamil Nadu",
  AP: "Andhra Pradesh",
  TS: "Telangana",
  DL: "Delhi",
};

const AVATAR_GRADIENTS = [
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-orange-400 to-amber-500",
  "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500",
  "from-cyan-400 to-sky-500",
];

function avatarGradient(name: string) {
  return AVATAR_GRADIENTS[(name?.charCodeAt(0) ?? 0) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string) {
  return (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function nextMonthFirst(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function EmployeeAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" };
  return (
    <div
      className={`shrink-0 grid place-items-center rounded-full bg-gradient-to-br ${avatarGradient(name)} font-bold text-white ${sizes[size]}`}
    >
      {getInitials(name)}
    </div>
  );
}

// ── Edit Config Modal ─────────────────────────────────────────────────────────

function EditConfigModal({
  employee,
  currentConfig,
  onSave,
  onClose,
}: {
  employee: EmployeeStub;
  currentConfig: SalaryConfigData | null;
  onSave: (body: any) => Promise<void>;
  onClose: () => void;
}) {
  const [basic, setBasic] = useState(String(currentConfig?.basic ?? ""));
  const [insurance, setInsurance] = useState(String(currentConfig?.insurance ?? "500"));
  const [ptState, setPtState] = useState(currentConfig?.pt_state ?? "KA");
  const [loanEmi, setLoanEmi] = useState(String(currentConfig?.loan_emi ?? "0"));
  const [effectiveFrom, setEffectiveFrom] = useState(
    currentConfig?.effective_from ?? nextMonthFirst()
  );
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const basicNum = parseFloat(basic) || 0;
  const insuranceNum = parseFloat(insurance) || 0;
  const loanNum = parseFloat(loanEmi) || 0;
  const ptAmount = PT_RATES[ptState] ?? 0;
  const netPreview = basicNum - ptAmount - insuranceNum - loanNum;

  async function handleSave() {
    if (!basicNum) { setErr("Enter a valid basic salary"); return; }
    if (!effectiveFrom) { setErr("Select effective from date"); return; }
    setSaving(true);
    setErr("");
    try {
      await onSave({
        basic: basicNum,
        insurance: insuranceNum,
        pt_state: ptState,
        loan_emi: loanNum,
        effective_from: effectiveFrom,
      });
    } catch (e: any) {
      setErr(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">
            Update Salary Config — {employee.name}
          </p>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Basic Salary (₹)<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={basic}
                onChange={(e) => setBasic(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="e.g. 75000"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Insurance Premium (₹)
              </label>
              <input
                type="number"
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                PT State<span className="text-red-500">*</span>
              </label>
              <select
                value={ptState}
                onChange={(e) => setPtState(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
              >
                {PT_OPTIONS.map((o) => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Loan EMI (₹)</label>
              <input
                type="number"
                value={loanEmi}
                onChange={(e) => setLoanEmi(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Effective From<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Live Preview</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Gross</span>
                <span className="font-semibold text-slate-800">₹{formatINR(basicNum)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">(-) PT ({ptState})</span>
                <span className="font-semibold text-slate-800">₹{formatINR(ptAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">(-) Insurance</span>
                <span className="font-semibold text-slate-800">₹{formatINR(insuranceNum)}</span>
              </div>
              {loanNum > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">(-) Loan EMI</span>
                  <span className="font-semibold text-slate-800">₹{formatINR(loanNum)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-1.5 flex justify-between">
                <span className="font-bold text-slate-700">Net</span>
                <span className="font-bold text-green-700">₹{formatINR(netPreview)}</span>
              </div>
            </div>
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SalaryConfig() {
  const [employees, setEmployees] = useState<EmployeeStub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [selected, setSelected] = useState<EmployeeStub | null>(null);
  const [config, setConfig] = useState<SalaryConfigData | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);

  // Auto-dismiss success after 5 s
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(t);
  }, [success]);

  async function fetchEmployees() {
    try {
      const data = await getEmployees();
      setEmployees(
        (data || []).map((e: any) => ({
          id: e.id,
          name: e.name || "Unknown",
          designation: e.designation || e.position || e.role || "",
          department: e.department || "",
          config: null,
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchConfig(employeeId: string) {
    setConfigLoading(true);
    try {
      const raw = await getSalaryConfig(employeeId);
      const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
      const normalized = normalizeConfig(arr);
      setConfig(normalized);
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employeeId ? { ...e, config: normalized } : e
        )
      );
    } catch {
      setConfig(null);
    } finally {
      setConfigLoading(false);
    }
  }

  useEffect(() => { fetchEmployees(); }, []);

  useEffect(() => {
    if (!selected) return;
    setConfig(null);
    setHistoryOpen(false);
    fetchConfig(selected.id);
  }, [selected?.id]);

  async function handleSave(body: any) {
    if (!selected) return;
    await upsertSalaryConfig(selected.id, body);
    setEditModal(false);
    setSuccess(`Salary config saved for ${selected.name}`);
    await fetchConfig(selected.id);
  }

  async function handleSeedConfigs() {
    setSeedLoading(true);
    setError(null);
    try {
      const data = await seedSalaryConfigs();
      setSuccess(data.message || "Seeded successfully");
      await fetchEmployees();
      if (selected) await fetchConfig(selected.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSeedLoading(false);
    }
  }

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort(),
    [employees]
  );

  const missingCount = employees.filter((e) => e.config === null).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter((e) => {
      const matchSearch = !q || e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q);
      const matchDept = !deptFilter || e.department === deptFilter;
      return matchSearch && matchDept;
    });
  }, [employees, search, deptFilter]);

  const ptAmount = config ? (PT_RATES[config.pt_state] ?? 0) : 0;
  const netPreview = config
    ? config.basic - ptAmount - config.insurance - (config.loan_emi ?? 0)
    : 0;

  return (
    <div className="min-h-full bg-slate-50 px-5 py-5">
      {/* Breadcrumb */}
      <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
        <span className="cursor-pointer hover:text-blue-600">Dashboard</span>
        <span>›</span>
        <span className="cursor-pointer hover:text-blue-600">Payroll</span>
        <span>›</span>
        <span className="font-semibold text-slate-700">Salary Configuration</span>
      </nav>

      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Salary Configuration</h1>
        <button
          onClick={handleSeedConfigs}
          disabled={seedLoading}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {seedLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {seedLoading ? "Seeding..." : "Auto-populate from Employee Records"}
        </button>
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

      {success && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex gap-4 items-start">
        {/* Left list */}
        <div className="w-[280px] shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 p-3 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee..."
                className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {missingCount > 0 && !loading && (
            <div className="px-3 py-2 bg-red-50 border-b border-red-100">
              <p className="text-xs font-semibold text-red-700">
                ⚠ {missingCount} missing config
              </p>
            </div>
          )}

          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 16rem)" }}>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-xs">Loading employees…</span>
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-400">No employees found</p>
            ) : (
              filtered.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelected(emp)}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-slate-50 border-b border-slate-50 ${
                    selected?.id === emp.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
                  }`}
                >
                  <div className="relative">
                    <EmployeeAvatar name={emp.name} size="sm" />
                    {emp.config === null && (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">{emp.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{emp.department}</p>
                  </div>
                  {emp.config ? (
                    <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      ₹{formatINR(emp.config.basic)}/mo
                    </span>
                  ) : (
                    <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                      No config
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0 space-y-4">
          {!selected ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400">
              <p className="text-sm">Select an employee to view or edit their salary configuration</p>
            </div>
          ) : (
            <>
              {/* Employee header */}
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <EmployeeAvatar name={selected.name} size="lg" />
                <div>
                  <p className="text-base font-bold text-slate-900">{selected.name}</p>
                  {selected.designation && (
                    <p className="text-sm text-slate-500">{selected.designation}</p>
                  )}
                  <p className="text-xs text-slate-400">{selected.department}</p>
                </div>
              </div>

              {/* Current config */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    Current Configuration
                  </p>
                  <button
                    onClick={() => setEditModal(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Config
                  </button>
                </div>

                {configLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading config…
                  </div>
                ) : !config ? (
                  <p className="text-sm text-slate-400">
                    No salary configuration set. Click Edit Config to add one.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    {[
                      ["Basic Salary", `₹${formatINR(config.basic)} / month`],
                      ["Annual (×12)", `₹${formatINR(config.basic * 12)}`],
                      ["Insurance", `₹${formatINR(config.insurance)} / month`],
                      ["PT State", `${PT_FULL_NAMES[config.pt_state] ?? config.pt_state} (${config.pt_state})`],
                      ["Loan EMI", `₹${formatINR(config.loan_emi ?? 0)} / month`],
                      [
                        "Effective From",
                        config.effective_from
                          ? new Date(config.effective_from).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—",
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[11px] text-slate-400">{label}</p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-800">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Take-home preview */}
              {config && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                    Take-Home Preview
                  </p>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Estimated take-home — full month, no LOP, no OT
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gross</span>
                      <span className="font-semibold text-slate-800">₹{formatINR(config.basic)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">(-) Prof Tax</span>
                      <span className="font-semibold text-slate-800">₹{formatINR(ptAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">(-) Insurance</span>
                      <span className="font-semibold text-slate-800">₹{formatINR(config.insurance)}</span>
                    </div>
                    {(config.loan_emi ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">(-) Loan EMI</span>
                        <span className="font-semibold text-slate-800">₹{formatINR(config.loan_emi)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-1.5 flex justify-between">
                      <span className="font-bold text-slate-700">Net</span>
                      <span className="font-bold text-green-700 text-sm">₹{formatINR(netPreview)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Config history */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => setHistoryOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                >
                  Previous Configurations
                  {historyOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                {historyOpen && (
                  <div className="border-t border-slate-100 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600">
                          {["Effective From", "Basic", "Insurance", "PT State", "Set By", "Date"].map((h) => (
                            <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {config?.history && config.history.length > 0 ? (
                          config.history.slice(0, 5).map((h: SalaryConfigData, i: number) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 text-slate-700">{h.effective_from}</td>
                              <td className="px-4 py-2.5 text-slate-700">₹{formatINR(h.basic)}</td>
                              <td className="px-4 py-2.5 text-slate-700">₹{formatINR(h.insurance)}</td>
                              <td className="px-4 py-2.5 text-slate-700">{h.pt_state}</td>
                              <td className="px-4 py-2.5 text-slate-700">{h.set_by ?? "—"}</td>
                              <td className="px-4 py-2.5 text-slate-700">
                                {h.created_at ? new Date(h.created_at).toLocaleDateString("en-IN") : "—"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 text-center text-slate-400">
                              No previous configurations
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editModal && selected && (
        <EditConfigModal
          employee={selected}
          currentConfig={config}
          onSave={handleSave}
          onClose={() => setEditModal(false)}
        />
      )}
    </div>
  );
}
