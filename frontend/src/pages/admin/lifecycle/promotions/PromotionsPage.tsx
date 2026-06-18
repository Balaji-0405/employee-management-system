import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, X, Check, Search, ChevronDown, ArrowRight, Calendar } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PromotionStage = "Draft" | "Submitted" | "Approved" | "Scheduled" | "Effective";

type ApprovalEvent = { stage: string; by: string; on: string; action: string };

type PromotionRecord = {
  id: string;
  employee_id?: string;
  name: string;
  initials: string;
  color: string;
  department: string;
  currentTitle: string;
  newTitle: string;
  currentSalary: number;
  newSalary: number;
  effectiveDate: string;
  justification: string;
  recommendedBy: string;
  approvedBy?: string;
  approvedOn?: string;
  submittedOn?: string;
  payrollSynced?: boolean;
  payrollSyncDate?: string;
  stage: PromotionStage;
  history: ApprovalEvent[];
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PROMOTIONS: PromotionRecord[] = [
  {
    id: "pr1", employee_id: "EMP101", name: "Arjun Kapoor", initials: "AK", color: "bg-blue-500",
    department: "Engineering", currentTitle: "Senior Engineer", newTitle: "Staff Engineer",
    currentSalary: 1600000, newSalary: 1900000, effectiveDate: "1 Aug 2026",
    justification: "Arjun has consistently led cross-team technical initiatives and mentored 4 junior engineers this quarter.",
    recommendedBy: "Priya Menon", stage: "Draft", history: [],
  },
  {
    id: "pr2", employee_id: "EMP102", name: "Ritika Sharma", initials: "RS", color: "bg-purple-500",
    department: "Product", currentTitle: "Product Manager", newTitle: "Senior Product Manager",
    currentSalary: 1800000, newSalary: 2070000, effectiveDate: "1 Aug 2026",
    justification: "Ritika delivered 3 major product launches with measurable business impact this year.",
    recommendedBy: "Arun Kumar", stage: "Draft", history: [],
  },
  {
    id: "pr3", employee_id: "EMP103", name: "Nikhil Bhat", initials: "NB", color: "bg-green-500",
    department: "Design", currentTitle: "UI Designer", newTitle: "Lead Designer",
    currentSalary: 1200000, newSalary: 1440000, effectiveDate: "1 Jul 2026",
    justification: "Nikhil redesigned the core product experience, reducing user drop-off by 22%.",
    recommendedBy: "Rahul Desai", submittedOn: "20 May 2026", stage: "Submitted",
    history: [{ stage: "Draft", by: "Rahul Desai", on: "15 May 2026", action: "Created promotion record" }],
  },
  {
    id: "pr4", employee_id: "EMP104", name: "Kavya Iyer", initials: "KI", color: "bg-teal-500",
    department: "HR", currentTitle: "HR Executive", newTitle: "HR Manager",
    currentSalary: 900000, newSalary: 1080000, effectiveDate: "1 Jul 2026",
    justification: "Kavya led the recruitment drive that hired 35 employees in Q1 2026 under budget.",
    recommendedBy: "Priya Menon", submittedOn: "18 May 2026", stage: "Submitted",
    history: [{ stage: "Draft", by: "Priya Menon", on: "12 May 2026", action: "Created promotion record" }],
  },
  {
    id: "pr5", employee_id: "EMP105", name: "Deepak Nair", initials: "DN", color: "bg-orange-500",
    department: "Engineering", currentTitle: "Engineer II", newTitle: "Senior Engineer",
    currentSalary: 1100000, newSalary: 1320000, effectiveDate: "1 Jul 2026",
    justification: "Deepak single-handedly architected the new payments module shipping it 2 weeks ahead of schedule.",
    recommendedBy: "Arun Kumar", approvedBy: "CTO", approvedOn: "25 May 2026", submittedOn: "5 May 2026",
    stage: "Approved",
    history: [
      { stage: "Draft",     by: "Arun Kumar", on: "1 May 2026",  action: "Created promotion record" },
      { stage: "Submitted", by: "Arun Kumar", on: "5 May 2026",  action: "Submitted for approval" },
      { stage: "Approved",  by: "CTO",        on: "25 May 2026", action: "Approved by CTO" },
    ],
  },
  {
    id: "pr6", employee_id: "EMP106", name: "Priya Kapoor", initials: "PK", color: "bg-pink-500",
    department: "Marketing", currentTitle: "Marketing Executive", newTitle: "Marketing Manager",
    currentSalary: 950000, newSalary: 1140000, effectiveDate: "15 Jul 2026",
    justification: "Priya's campaigns drove a 40% increase in organic leads in Q1 2026.",
    recommendedBy: "Anita Joshi", approvedBy: "COO", approvedOn: "28 May 2026", submittedOn: "8 May 2026",
    stage: "Approved",
    history: [
      { stage: "Draft",     by: "Anita Joshi", on: "3 May 2026",  action: "Created promotion record" },
      { stage: "Submitted", by: "Anita Joshi", on: "8 May 2026",  action: "Submitted for approval" },
      { stage: "Approved",  by: "COO",         on: "28 May 2026", action: "Approved by COO" },
    ],
  },
  {
    id: "pr7", employee_id: "EMP107", name: "Vikram Bose", initials: "VB", color: "bg-indigo-500",
    department: "Finance", currentTitle: "Finance Analyst", newTitle: "Senior Finance Analyst",
    currentSalary: 1050000, newSalary: 1250000, effectiveDate: "1 Jul 2026",
    justification: "Vikram's financial modeling improved cost forecasting accuracy to 96% this year.",
    recommendedBy: "Rahul Desai", approvedBy: "CFO", approvedOn: "20 May 2026", submittedOn: "1 May 2026",
    stage: "Scheduled",
    history: [
      { stage: "Draft",     by: "Rahul Desai", on: "25 Apr 2026", action: "Created promotion record" },
      { stage: "Submitted", by: "Rahul Desai", on: "1 May 2026",  action: "Submitted for approval" },
      { stage: "Approved",  by: "CFO",         on: "20 May 2026", action: "Approved by CFO" },
      { stage: "Scheduled", by: "HR Admin",    on: "22 May 2026", action: "Scheduled for 1 Jul 2026" },
    ],
  },
  {
    id: "pr8", employee_id: "EMP108", name: "Sunita Rao", initials: "SR", color: "bg-cyan-500",
    department: "Operations", currentTitle: "Operations Executive", newTitle: "Operations Lead",
    currentSalary: 850000, newSalary: 1000000, effectiveDate: "15 Jul 2026",
    justification: "Sunita streamlined vendor onboarding, reducing time-to-contract by 35%.",
    recommendedBy: "Dev Sharma", approvedBy: "COO", approvedOn: "15 May 2026", submittedOn: "28 Apr 2026",
    stage: "Scheduled",
    history: [
      { stage: "Draft",     by: "Dev Sharma", on: "20 Apr 2026", action: "Created promotion record" },
      { stage: "Submitted", by: "Dev Sharma", on: "28 Apr 2026", action: "Submitted for approval" },
      { stage: "Approved",  by: "COO",        on: "15 May 2026", action: "Approved by COO" },
      { stage: "Scheduled", by: "HR Admin",   on: "18 May 2026", action: "Scheduled for 15 Jul 2026" },
    ],
  },
  {
    id: "pr9", employee_id: "EMP109", name: "Meera Iyer", initials: "MI", color: "bg-rose-500",
    department: "Engineering", currentTitle: "Engineer I", newTitle: "Engineer II",
    currentSalary: 800000, newSalary: 960000, effectiveDate: "1 Jun 2026",
    justification: "Meera completed all competency benchmarks ahead of schedule and led two sprint releases independently.",
    recommendedBy: "Arun Kumar", approvedBy: "VP Engineering", approvedOn: "15 Apr 2026", submittedOn: "1 Apr 2026",
    payrollSynced: true, payrollSyncDate: "28 May 2026", stage: "Effective",
    history: [
      { stage: "Draft",     by: "Arun Kumar",      on: "28 Mar 2026", action: "Created promotion record" },
      { stage: "Submitted", by: "Arun Kumar",      on: "1 Apr 2026",  action: "Submitted for approval" },
      { stage: "Approved",  by: "VP Engineering",  on: "15 Apr 2026", action: "Approved by VP Engineering" },
      { stage: "Scheduled", by: "HR Admin",        on: "18 Apr 2026", action: "Scheduled for 1 Jun 2026" },
      { stage: "Effective", by: "Payroll System",  on: "1 Jun 2026",  action: "Went effective — payroll updated" },
    ],
  },
];

const STAGES: PromotionStage[] = ["Draft", "Submitted", "Approved", "Scheduled", "Effective"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Avatar({ initials, color, size = "md" }: { initials: string; color: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-7 w-7 text-xs" : "h-12 w-12 text-base";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${color} ${sz}`}>
      {initials}
    </span>
  );
}

function formatSalary(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function salaryImpact(curr: number, next: number) {
  return Math.round(((next - curr) / curr) * 100);
}

const STAGE_BADGE: Record<PromotionStage, string> = {
  Draft:     "bg-slate-100 text-slate-600",
  Submitted: "bg-yellow-100 text-yellow-700",
  Approved:  "bg-green-100 text-green-700",
  Scheduled: "bg-blue-100 text-blue-700",
  Effective: "bg-emerald-100 text-emerald-700",
};

// ─── Workflow Stepper ─────────────────────────────────────────────────────────

function WorkflowStepper({ stage }: { stage: PromotionStage }) {
  const idx = STAGES.indexOf(stage);
  return (
    <div className="flex items-center">
      {STAGES.map((s, i) => {
        const done    = i < idx;
        const current = i === idx;
        return (
          <div key={s} className="flex items-center">
            <div
              title={s}
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold transition-colors
                ${done    ? "bg-green-500 text-white"
                : current ? "bg-blue-600 text-white"
                :           "border-2 border-slate-200 bg-white text-slate-300"}`}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            {i < STAGES.length - 1 && (
              <div className={`h-px w-4 ${done ? "bg-green-400" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Card Action Buttons ──────────────────────────────────────────────────────

function CardActions({
  promo,
  onView,
  onStageAction,
}: {
  promo: PromotionRecord;
  onView: () => void;
  onStageAction: (id: string, action: string) => void;
}) {
  switch (promo.stage) {
    case "Draft":
      return (
        <div className="flex gap-1.5">
          <button onClick={() => onStageAction(promo.id, "submit")} className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Submit</button>
          <button onClick={onView} className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Edit</button>
        </div>
      );
    case "Submitted":
      return (
        <div className="flex gap-1.5">
          <button onClick={() => onStageAction(promo.id, "approve")} className="flex-1 rounded-lg bg-green-600 py-1.5 text-xs font-semibold text-white hover:bg-green-700">Approve</button>
          <button onClick={() => onStageAction(promo.id, "reject")}  className="flex-1 rounded-lg border border-red-200 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Reject</button>
        </div>
      );
    case "Approved":
      return (
        <div className="flex gap-1.5">
          <button onClick={() => onStageAction(promo.id, "schedule")} className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Schedule</button>
          <button onClick={onView} className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">View</button>
        </div>
      );
    case "Scheduled":
      return (
        <button onClick={onView} className="w-full rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">View</button>
      );
    case "Effective":
      return (
        <div className="flex gap-1.5">
          <div className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-50 py-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Effective</span>
          </div>
          <button onClick={onView} className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">View</button>
        </div>
      );
  }
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ promo, onClose }: { promo: PromotionRecord; onClose: () => void }) {
  const impact = salaryImpact(promo.currentSalary, promo.newSalary);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Promotion Details</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-4">
          {/* Employee */}
          <div className="flex items-center gap-3">
            <Avatar initials={promo.initials} color={promo.color} />
            <div className="flex-1">
              <p className="font-semibold text-slate-900">{promo.name}</p>
              <p className="text-sm text-slate-500">{promo.department}</p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STAGE_BADGE[promo.stage]}`}>{promo.stage}</span>
          </div>

          {/* Promotion details */}
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Promotion</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">{promo.currentTitle}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-blue-500" />
              <span className="text-sm font-bold text-blue-600">{promo.newTitle}</span>
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400">Current Salary</p>
                <p className="font-medium text-slate-700">{formatSalary(promo.currentSalary)}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
              <div>
                <p className="text-xs text-slate-400">New Salary</p>
                <p className="font-bold text-slate-900">{formatSalary(promo.newSalary)}</p>
              </div>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">+{impact}%</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-slate-400">Effective Date</p>
                <p className="flex items-center gap-1 text-slate-700"><Calendar className="h-3 w-3" />{promo.effectiveDate}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Recommended By</p>
                <p className="text-slate-700">{promo.recommendedBy}</p>
              </div>
              {promo.approvedBy && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-400">Approved By</p>
                  <p className="text-slate-700">{promo.approvedBy} on {promo.approvedOn}</p>
                </div>
              )}
            </div>
          </div>

          {/* Justification */}
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Justification</p>
            <p className="text-sm text-slate-600">{promo.justification}</p>
          </div>

          {/* Approval history */}
          {promo.history.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Approval History</p>
              <div className="space-y-2">
                {promo.history.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                    <div>
                      <p className="text-sm text-slate-700">{h.action}</p>
                      <p className="text-xs text-slate-400">{h.by} · {h.on}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payroll sync */}
          <div className={`rounded-xl px-4 py-3 ${promo.payrollSynced ? "bg-green-50 border border-green-100" : "bg-amber-50 border border-amber-100"}`}>
            <p className="text-xs font-semibold text-slate-500">Payroll Sync</p>
            {promo.payrollSynced
              ? <p className="mt-0.5 text-sm font-semibold text-green-700">Synced on {promo.payrollSyncDate}</p>
              : <p className="mt-0.5 text-sm font-semibold text-amber-700">Pending</p>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Promotion Modal ───────────────────────────────────────────────────

function CreateModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    employee: "", currentDesig: "Senior Engineer", newDesig: "",
    currentSalary: 1600000, newSalary: "", effectiveDate: "", justification: "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));
  const impact = form.newSalary ? Math.round(((Number(form.newSalary) - form.currentSalary) / form.currentSalary) * 100) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Create Promotion</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600">Employee *</label>
            <select value={form.employee} onChange={set("employee")} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none">
              <option value="">Search employee…</option>
              <option>Arjun Kapoor</option><option>Ritika Sharma</option><option>Deepak Nair</option><option>Kavya Iyer</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Current Designation</label>
            <input value={form.currentDesig} readOnly className="mt-1 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">New Designation *</label>
            <input value={form.newDesig} onChange={set("newDesig")} placeholder="e.g. Staff Engineer" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Current Salary</label>
            <input value={`₹${form.currentSalary.toLocaleString("en-IN")}`} readOnly className="mt-1 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">New Salary * (₹)</label>
            <input type="number" value={form.newSalary} onChange={set("newSalary")} placeholder="e.g. 1900000" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Salary Impact %</label>
            <input
              value={impact !== null ? `+${impact}%` : "—"}
              readOnly
              className={`mt-1 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold ${impact !== null ? "text-green-600" : "text-slate-400"}`}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Effective Date *</label>
            <input type="date" value={form.effectiveDate} onChange={set("effectiveDate")} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Recommended By</label>
            <input value="Admin (You)" readOnly className="mt-1 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600">Justification *</label>
            <textarea value={form.justification} onChange={set("justification")} rows={3} placeholder="Why is this employee being promoted?" className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={onClose} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Save as Draft</button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PromotionsPage() {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<PromotionRecord[]>(PROMOTIONS);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter]     = useState("");
  const [selectedPromo, setSelectedPromo] = useState<PromotionRecord | null>(null);
  const [showCreate, setShowCreate]       = useState(false);
  const [promoToast, setPromoToast]       = useState<string | null>(null);

  useEffect(() => {
    if (!promoToast) return;
    const t = setTimeout(() => setPromoToast(null), 4000);
    return () => clearTimeout(t);
  }, [promoToast]);

  async function handleStageAction(id: string, action: string) {
    if (action === "approve") {
      const promo = promotions.find((p) => p.id === id);
      if (promo?.employee_id) {
        const token = localStorage.getItem("ems_token");
        try {
          await fetch(`/api/v1/payroll/salary-config/${promo.employee_id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              basic_salary: promo.newSalary,
              insurance_premium: null,
              pt_state: null,
              loan_emi: null,
              effective_from: promo.effectiveDate,
            }),
          });
          setPromoToast(`Salary config updated for ${promo.name} effective ${promo.effectiveDate}`);
        } catch {}
      }
    }
    setPromotions((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (action === "submit")   return { ...p, stage: "Submitted" as PromotionStage };
        if (action === "approve")  return { ...p, stage: "Approved"  as PromotionStage };
        if (action === "schedule") return { ...p, stage: "Scheduled" as PromotionStage };
        if (action === "reject")   return { ...p, stage: "Draft"     as PromotionStage };
        return p;
      })
    );
  }

  const stats = [
    { label: "Draft",               value: promotions.filter((p) => p.stage === "Draft").length },
    { label: "Pending Approval",    value: promotions.filter((p) => p.stage === "Submitted").length },
    { label: "Approved",            value: promotions.filter((p) => ["Approved","Scheduled","Effective"].includes(p.stage)).length },
    { label: "Effective This Month",value: promotions.filter((p) => p.stage === "Effective").length },
  ];

  const filtered = promotions.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && p.stage !== statusFilter) return false;
    if (deptFilter && p.department !== deptFilter) return false;
    return true;
  });

  return (
    <div className="min-h-full bg-[#f5f8ff] px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
        <button onClick={() => navigate("/dashboard")} className="hover:text-slate-600">Dashboard</button>
        <ChevronRight className="h-3 w-3" /><span>Workforce</span>
        <ChevronRight className="h-3 w-3" /><span>Lifecycle</span>
        <ChevronRight className="h-3 w-3" /><span className="font-medium text-slate-600">Promotions</span>
      </nav>

      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Promotions</h1>
        <button onClick={() => setShowCreate(true)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Create Promotion
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm focus:outline-none"
          />
        </div>
        {[
          { label: "Status",     value: statusFilter, set: setStatusFilter, opts: ["Draft","Submitted","Approved","Scheduled","Effective"] },
          { label: "Department", value: deptFilter,   set: setDeptFilter,   opts: ["Engineering","Product","Design","HR","Finance","Marketing","Operations"] },
        ].map((f) => (
          <div key={f.label} className="relative">
            <select value={f.value} onChange={(e) => f.set(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 shadow-sm focus:outline-none">
              <option value="">{f.label}</option>
              {f.opts.map((o) => <option key={o}>{o}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        ))}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((promo) => {
          const impact = salaryImpact(promo.currentSalary, promo.newSalary);
          return (
            <div key={promo.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {/* Card header */}
              <div className="flex items-start gap-3">
                <Avatar initials={promo.initials} color={promo.color} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{promo.name}</p>
                  <p className="text-xs text-slate-500">{promo.currentTitle}</p>
                </div>
              </div>

              {/* Card body */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 overflow-hidden rounded-lg bg-slate-50 px-2.5 py-2">
                  <span className="truncate text-xs text-slate-500">{promo.currentTitle}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate text-xs font-bold text-blue-600">{promo.newTitle}</span>
                </div>
                <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  {promo.department}
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{formatSalary(promo.currentSalary)}</span>
                  <ArrowRight className="h-3 w-3 text-slate-300" />
                  <span className="text-slate-700">{formatSalary(promo.newSalary)}</span>
                  <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">+{impact}%</span>
                </div>
                <p className="flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="h-3 w-3" />{promo.effectiveDate}
                </p>
              </div>

              {/* Stepper */}
              <div className="mt-4">
                <WorkflowStepper stage={promo.stage} />
              </div>

              {/* Footer */}
              <div className="mt-3 flex items-center gap-2">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STAGE_BADGE[promo.stage]}`}>
                  {promo.stage}
                </span>
                <div className="flex-1">
                  <CardActions promo={promo} onView={() => setSelectedPromo(promo)} onStageAction={handleStageAction} />
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-sm text-slate-400">
            No promotions match your filters.
          </div>
        )}
      </div>

      {selectedPromo && <DetailModal promo={selectedPromo} onClose={() => setSelectedPromo(null)} />}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}

      {promoToast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          <span>{promoToast}</span>
          <button onClick={() => setPromoToast(null)} className="opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
