import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, X, Check, Search, ChevronDown, Calendar, Star, AlertCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExitReason      = "Resignation" | "Termination" | "Retirement" | "Contract End" | "Mutual Separation";
type OffboardingStatus = "Initiated" | "In Progress" | "Pending Clearance" | "Completed";

type ChecklistItem = {
  id: string;
  label: string;
  assignedTo: string;
  dueLabel: string;
  done: boolean;
  completedBy?: string;
  completedOn?: string;
};

type ITDeprovision = {
  emailDeactivated: boolean;
  accessRevoked: boolean;
  dataBackup: boolean;
  scheduledDate: string;
};

type ExitInterviewData = {
  rating: number;
  reason: string;
  enjoyed: string;
  improve: string;
  recommend: "Yes" | "No" | "Maybe";
  managerFeedback: string;
};

type OffboardingEmployee = {
  id: string;
  name: string;
  initials: string;
  color: string;
  empId: string;
  department: string;
  lastWorkingDay: string;
  daysUntilLWD: number;
  exitReason: ExitReason;
  assetsCount: number;
  knowledgeCount: number;
  hrExitCount: number;
  checklist: ChecklistItem[];
  itDeprovision: ITDeprovision;
  exitInterviewDone: boolean;
  exitInterviewData?: ExitInterviewData;
  status: OffboardingStatus;
  noticePeriod: number;
};

// ─── Mock Data Helpers ────────────────────────────────────────────────────────

function makeChecklist(assetsDone: number, knowledgeDone: number, hrDone: number): ChecklistItem[] {
  return [
    { id: "a1", label: "Laptop / device returned",      assignedTo: "IT Team",  dueLabel: "Last day",       done: assetsDone >= 1,    completedBy: "IT Team",   completedOn: "1 Jun 2026" },
    { id: "a2", label: "ID card / access card returned", assignedTo: "IT Team",  dueLabel: "Last day",       done: assetsDone >= 2,    completedBy: "IT Team",   completedOn: "1 Jun 2026" },
    { id: "a3", label: "Other equipment returned",       assignedTo: "IT Team",  dueLabel: "Last day",       done: assetsDone >= 3,    completedBy: "IT Team",   completedOn: "1 Jun 2026" },
    { id: "k1", label: "Handover document completed",   assignedTo: "Manager",  dueLabel: "1 week before",  done: knowledgeDone >= 1, completedBy: "Manager",   completedOn: "2 Jun 2026" },
    { id: "k2", label: "Documentation updated",         assignedTo: "Employee", dueLabel: "1 week before",  done: knowledgeDone >= 2, completedBy: "Employee",  completedOn: "2 Jun 2026" },
    { id: "h1", label: "Exit interview scheduled",      assignedTo: "HR Admin", dueLabel: "2 weeks before", done: hrDone >= 1,        completedBy: "HR Admin",  completedOn: "3 Jun 2026" },
    { id: "h2", label: "Exit interview completed",      assignedTo: "HR Admin", dueLabel: "1 week before",  done: hrDone >= 2,        completedBy: "HR Admin",  completedOn: "5 Jun 2026" },
    { id: "h3", label: "Final settlement processed",    assignedTo: "Payroll",  dueLabel: "Last day + 2",   done: hrDone >= 3,        completedBy: "Payroll",   completedOn: "7 Jun 2026" },
  ];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const OFFBOARDING_DATA: OffboardingEmployee[] = [
  {
    id: "off1", name: "Rahul Trivedi", initials: "RT", color: "bg-red-500",
    empId: "EMP051", department: "Engineering", lastWorkingDay: "20 Jun 2026", daysUntilLWD: 13,
    exitReason: "Resignation", assetsCount: 0, knowledgeCount: 1, hrExitCount: 1,
    checklist: makeChecklist(0, 1, 1),
    itDeprovision: { emailDeactivated: false, accessRevoked: false, dataBackup: false, scheduledDate: "2026-06-20" },
    exitInterviewDone: false, status: "In Progress", noticePeriod: 30,
  },
  {
    id: "off2", name: "Sunita Rao", initials: "SR", color: "bg-orange-500",
    empId: "EMP052", department: "Sales", lastWorkingDay: "30 Jun 2026", daysUntilLWD: 23,
    exitReason: "Termination", assetsCount: 0, knowledgeCount: 0, hrExitCount: 0,
    checklist: makeChecklist(0, 0, 0),
    itDeprovision: { emailDeactivated: false, accessRevoked: false, dataBackup: false, scheduledDate: "2026-06-30" },
    exitInterviewDone: false, status: "Initiated", noticePeriod: 0,
  },
  {
    id: "off3", name: "Girish Menon", initials: "GM", color: "bg-blue-500",
    empId: "EMP053", department: "Product", lastWorkingDay: "10 Jun 2026", daysUntilLWD: 3,
    exitReason: "Contract End", assetsCount: 2, knowledgeCount: 2, hrExitCount: 2,
    checklist: makeChecklist(2, 2, 2),
    itDeprovision: { emailDeactivated: true, accessRevoked: true, dataBackup: false, scheduledDate: "2026-06-10" },
    exitInterviewDone: true,
    exitInterviewData: { rating: 4, reason: "Contract concluded", enjoyed: "Great team and challenging work", improve: "Better career growth paths", recommend: "Yes", managerFeedback: "Manager was supportive and clear with expectations." },
    status: "Pending Clearance", noticePeriod: 0,
  },
  {
    id: "off4", name: "Vijay Kumar", initials: "VK", color: "bg-green-600",
    empId: "EMP054", department: "Finance", lastWorkingDay: "31 May 2026", daysUntilLWD: -7,
    exitReason: "Retirement", assetsCount: 3, knowledgeCount: 2, hrExitCount: 3,
    checklist: makeChecklist(3, 2, 3),
    itDeprovision: { emailDeactivated: true, accessRevoked: true, dataBackup: true, scheduledDate: "2026-05-31" },
    exitInterviewDone: true,
    exitInterviewData: { rating: 5, reason: "Retirement", enjoyed: "30 years of amazing work culture and growth", improve: "Early retirement planning support", recommend: "Yes", managerFeedback: "A pleasure to work with over many years." },
    status: "Completed", noticePeriod: 60,
  },
  {
    id: "off5", name: "Meena Iyer", initials: "MI", color: "bg-purple-500",
    empId: "EMP055", department: "HR", lastWorkingDay: "28 May 2026", daysUntilLWD: -10,
    exitReason: "Mutual Separation", assetsCount: 3, knowledgeCount: 2, hrExitCount: 3,
    checklist: makeChecklist(3, 2, 3),
    itDeprovision: { emailDeactivated: true, accessRevoked: true, dataBackup: true, scheduledDate: "2026-05-28" },
    exitInterviewDone: true,
    exitInterviewData: { rating: 3, reason: "Mutual agreement", enjoyed: "Collaborative team environment", improve: "Clearer role definitions", recommend: "Maybe", managerFeedback: "Good collaboration across departments." },
    status: "Completed", noticePeriod: 30,
  },
  {
    id: "off6", name: "Dev Kapoor", initials: "DK", color: "bg-teal-500",
    empId: "EMP056", department: "Design", lastWorkingDay: "15 Jun 2026", daysUntilLWD: 8,
    exitReason: "Resignation", assetsCount: 1, knowledgeCount: 1, hrExitCount: 2,
    checklist: makeChecklist(1, 1, 2),
    itDeprovision: { emailDeactivated: false, accessRevoked: false, dataBackup: true, scheduledDate: "2026-06-15" },
    exitInterviewDone: true,
    exitInterviewData: { rating: 4, reason: "Better opportunity", enjoyed: "Creative freedom and team culture", improve: "Compensation benchmarking", recommend: "Yes", managerFeedback: "Excellent team player and collaborator." },
    status: "In Progress", noticePeriod: 30,
  },
  {
    id: "off7", name: "Anjali Roy", initials: "AR", color: "bg-pink-500",
    empId: "EMP057", department: "Marketing", lastWorkingDay: "12 Jun 2026", daysUntilLWD: 5,
    exitReason: "Resignation", assetsCount: 2, knowledgeCount: 2, hrExitCount: 1,
    checklist: makeChecklist(2, 2, 1),
    itDeprovision: { emailDeactivated: true, accessRevoked: false, dataBackup: false, scheduledDate: "2026-06-12" },
    exitInterviewDone: false, status: "Pending Clearance", noticePeriod: 30,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHECKLIST_GROUPS = [
  { label: "Assets",             ids: ["a1","a2","a3"] },
  { label: "Knowledge Transfer", ids: ["k1","k2"] },
  { label: "HR Exit",            ids: ["h1","h2","h3"] },
];

function Avatar({ initials, color, size = "md" }: { initials: string; color: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${color} ${sz}`}>
      {initials}
    </span>
  );
}

const EXIT_BADGE: Record<ExitReason, string> = {
  "Resignation":       "bg-slate-100 text-slate-600",
  "Termination":       "bg-red-100 text-red-700",
  "Retirement":        "bg-teal-100 text-teal-700",
  "Contract End":      "bg-blue-100 text-blue-700",
  "Mutual Separation": "bg-purple-100 text-purple-700",
};

const STATUS_BADGE: Record<OffboardingStatus, string> = {
  "Initiated":         "bg-slate-100 text-slate-600",
  "In Progress":       "bg-blue-100 text-blue-700",
  "Pending Clearance": "bg-amber-100 text-amber-700",
  "Completed":         "bg-green-100 text-green-700",
};

function progressTotal(emp: OffboardingEmployee) {
  return emp.assetsCount + emp.knowledgeCount + emp.hrExitCount;
}

function progressPct(emp: OffboardingEmployee) {
  return Math.round((progressTotal(emp) / 8) * 100);
}

function progressBarColor(pct: number) {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-red-500";
}

// ─── Exit Interview Modal ─────────────────────────────────────────────────────

function ExitInterviewModal({ emp, onClose }: { emp: OffboardingEmployee; onClose: () => void }) {
  const [rating, setRating]       = useState(0);
  const [hoverRating, setHover]   = useState(0);
  const [reason, setReason]       = useState("");
  const [enjoyed, setEnjoyed]     = useState("");
  const [improve, setImprove]     = useState("");
  const [recommend, setRecommend] = useState<"Yes"|"No"|"Maybe"|"">("");
  const [mgr, setMgr]             = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Exit Interview</h2>
            <p className="text-xs text-slate-400">{emp.name} · Last day: {emp.lastWorkingDay}</p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">Overall Rating</label>
            <div className="mt-2 flex gap-1">
              {[1,2,3,4,5].map((n) => (
                <button key={n} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}>
                  <Star className={`h-6 w-6 ${n <= (hoverRating || rating) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Reason for Leaving</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none">
              <option value="">Select reason…</option>
              <option>Better opportunity</option><option>Personal reasons</option><option>Relocation</option>
              <option>Career change</option><option>Retirement</option><option>Contract concluded</option><option>Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">What did you enjoy most?</label>
            <textarea value={enjoyed} onChange={(e) => setEnjoyed(e.target.value)} rows={2}
              className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">What should the company improve?</label>
            <textarea value={improve} onChange={(e) => setImprove(e.target.value)} rows={2}
              className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Would you recommend us?</label>
            <div className="mt-2 flex gap-6">
              {(["Yes","No","Maybe"] as const).map((opt) => (
                <label key={opt} className="flex cursor-pointer items-center gap-1.5">
                  <input type="radio" name="recommend" checked={recommend === opt} onChange={() => setRecommend(opt)} className="accent-blue-600" />
                  <span className="text-sm text-slate-700">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Feedback for manager / team?</label>
            <textarea value={mgr} onChange={(e) => setMgr(e.target.value)} rows={2}
              className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={onClose} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Submit Interview</button>
        </div>
      </div>
    </div>
  );
}

// ─── Checklist Panel ──────────────────────────────────────────────────────────

function ChecklistPanel({ emp, onClose }: { emp: OffboardingEmployee; onClose: () => void }) {
  const [checklist, setChecklist]   = useState<ChecklistItem[]>(emp.checklist);
  const [openGroups, setOpenGroups] = useState({ Assets: true, "Knowledge Transfer": true, "HR Exit": true });
  const [deprovision, setDeprovision] = useState<ITDeprovision>(emp.itDeprovision);
  const [showExitModal, setShowExitModal]       = useState(false);
  const [showMarkComplete, setShowMarkComplete] = useState(false);
  const [ffToast, setFfToast]                   = useState<string | null>(null);

  const doneTasks = checklist.filter((t) => t.done).length;
  const pct       = Math.round((doneTasks / 8) * 100);
  const allDone   = doneTasks === 8;
  const urgentLWD = emp.daysUntilLWD >= 0 && emp.daysUntilLWD <= 7;

  function toggleTask(id: string) {
    setChecklist((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function toggleDeprov(key: keyof Omit<ITDeprovision, "scheduledDate">) {
    setDeprovision((p) => ({ ...p, [key]: !p[key] }));
  }

  async function handleMarkComplete() {
    try {
      const token = localStorage.getItem("ems_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const runsRes = await fetch("/api/v1/payroll/runs", { headers });
      const runsJson = await runsRes.json();
      const runsList: any[] = runsJson.runs ?? runsJson;
      const runId = Array.isArray(runsList) ? runsList[0]?.id : null;
      if (runId) {
        await fetch("/api/v1/payroll/one-time", {
          method: "POST",
          headers,
          body: JSON.stringify({
            run_id: runId,
            employee_id: emp.id,
            item_type: "deduction",
            amount_rupees: 0,
            label: "Full & Final Settlement — pending HR calculation",
          }),
        });
      }
      setFfToast(`F&F Settlement entry created for ${emp.name}`);
      setTimeout(() => setFfToast(null), 4000);
    } catch {}
    setShowMarkComplete(false);
  }

  return (
    <div className="flex w-[400px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Panel header */}
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <Avatar initials={emp.initials} color={emp.color} />
          <div>
            <p className="font-semibold text-slate-900">{emp.name}</p>
            <p className="text-xs text-slate-500">{emp.department}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="h-3 w-3" /> Last day: {emp.lastWorkingDay}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress ring + status */}
      <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-4">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#e2e8f0" strokeWidth="6" />
            <circle
              cx="32" cy="32" r="26" fill="none"
              stroke={pct >= 80 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444"}
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - pct / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-sm font-bold text-slate-900">{pct}%</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{doneTasks} of 8 tasks complete</p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[emp.status]}`}>{emp.status}</span>
          {urgentLWD && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600">
              <AlertCircle className="h-3 w-3" /> {emp.daysUntilLWD} days until last working day
            </p>
          )}
        </div>
      </div>

      {/* Checklist accordion groups */}
      <div className="flex-1 overflow-y-auto">
        {CHECKLIST_GROUPS.map((group) => {
          const groupTasks = checklist.filter((t) => group.ids.includes(t.id));
          const isOpen     = openGroups[group.label as keyof typeof openGroups];
          return (
            <div key={group.label} className="border-b border-slate-100 last:border-0">
              <button
                onClick={() => setOpenGroups((prev) => ({ ...prev, [group.label]: !prev[group.label as keyof typeof prev] }))}
                className="flex w-full items-center justify-between px-5 py-3 hover:bg-slate-50"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{group.label}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="space-y-2 px-5 pb-3">
                  {groupTasks.map((task) => (
                    <div key={task.id}>
                      <div className="flex items-start gap-2.5">
                        <div
                          onClick={() => toggleTask(task.id)}
                          className={`mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border-2
                            ${task.done ? "border-green-500 bg-green-500" : "border-slate-300 bg-white"}`}
                        >
                          {task.done && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${task.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{task.label}</p>
                          <p className="text-xs text-slate-400">{task.assignedTo} · {task.dueLabel}</p>
                          {task.done && task.completedBy && (
                            <p className="text-[10px] text-slate-400">Completed by {task.completedBy} on {task.completedOn}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* IT Deprovisioning card */}
        <div className="mx-4 mb-4 mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">IT Deprovisioning</p>
          <div className="space-y-2">
            {([
              { key: "emailDeactivated" as const, label: "Email account deactivated" },
              { key: "accessRevoked"    as const, label: "System access revoked" },
              { key: "dataBackup"       as const, label: "Data backup done" },
            ] as const).map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{item.label}</span>
                <button
                  onClick={() => toggleDeprov(item.key)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors
                    ${deprovision[item.key] ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                >
                  {deprovision[item.key] ? "Done" : "Pending"}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="text-xs font-semibold text-slate-600">Scheduled Date</label>
            <input
              type="date"
              value={deprovision.scheduledDate}
              onChange={(e) => setDeprovision((p) => ({ ...p, scheduledDate: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Panel footer */}
      <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
        <button
          onClick={() => !emp.exitInterviewDone && setShowExitModal(true)}
          className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors
            ${emp.exitInterviewDone
              ? "bg-green-50 text-green-700"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          {emp.exitInterviewDone ? "Exit Interview: Done" : "Exit Interview"}
        </button>
        <button
          disabled={!allDone}
          onClick={() => setShowMarkComplete(true)}
          className="flex-1 rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Mark All Complete
        </button>
      </div>

      {showExitModal && (
        <ExitInterviewModal emp={emp} onClose={() => setShowExitModal(false)} />
      )}

      {ffToast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          <span>{ffToast}</span>
        </div>
      )}

      {showMarkComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowMarkComplete(false)}>
          <div className="w-80 rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-slate-900">Mark {emp.name}'s offboarding complete?</p>
            <p className="mt-1 text-sm text-slate-500">This will set the status to Completed.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowMarkComplete(false)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={handleMarkComplete} className="flex-1 rounded-xl bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Initiate Offboarding Modal ───────────────────────────────────────────────

function InitiateModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ employee: "", lastDay: "", reason: "", noticePeriod: "", notes: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Initiate Offboarding</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600">Employee *</label>
            <select value={form.employee} onChange={set("employee")} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none">
              <option value="">Search active employee…</option>
              <option>Ravi Kumar</option><option>Sunita Das</option><option>Mohan Patel</option><option>Divya Reddy</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Last Working Day *</label>
            <input type="date" value={form.lastDay} onChange={set("lastDay")} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Exit Reason *</label>
            <select value={form.reason} onChange={set("reason")} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none">
              <option value="">Select reason…</option>
              <option>Resignation</option><option>Termination</option><option>Retirement</option>
              <option>Contract End</option><option>Mutual Separation</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Notice Period (days)</label>
            <input type="number" value={form.noticePeriod} onChange={set("noticePeriod")} placeholder="e.g. 30" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Letter Upload (optional)</label>
            <input type="file" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600">Notes</label>
            <textarea value={form.notes} onChange={set("notes")} rows={2} className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={onClose} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Create Offboarding Plan</button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OffboardingPage() {
  const navigate = useNavigate();
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("");
  const [deptFilter, setDeptFilter]       = useState("");
  const [reasonFilter, setReasonFilter]   = useState("");
  const [panelEmp, setPanelEmp]           = useState<OffboardingEmployee | null>(null);
  const [showInitiate, setShowInitiate]   = useState(false);

  const stats = [
    { label: "In Progress",          value: OFFBOARDING_DATA.filter((e) => e.status === "In Progress").length },
    { label: "Pending Clearance",    value: OFFBOARDING_DATA.filter((e) => e.status === "Pending Clearance").length },
    { label: "Completed This Month", value: OFFBOARDING_DATA.filter((e) => e.status === "Completed").length },
    { label: "Avg Days",             value: 12 },
  ];

  const filtered = OFFBOARDING_DATA.filter((emp) => {
    if (search       && !emp.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && emp.status     !== statusFilter) return false;
    if (deptFilter   && emp.department !== deptFilter)   return false;
    if (reasonFilter && emp.exitReason !== reasonFilter) return false;
    return true;
  });

  return (
    <div className="min-h-full bg-[#f5f8ff] px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
        <button onClick={() => navigate("/dashboard")} className="hover:text-slate-600">Dashboard</button>
        <ChevronRight className="h-3 w-3" /><span>Workforce</span>
        <ChevronRight className="h-3 w-3" /><span>Lifecycle</span>
        <ChevronRight className="h-3 w-3" /><span className="font-medium text-slate-600">Offboarding</span>
      </nav>

      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Offboarding</h1>
        <button onClick={() => setShowInitiate(true)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Initiate Offboarding
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

      {/* Filters */}
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
          { label: "Status",      value: statusFilter, set: setStatusFilter, opts: ["Initiated","In Progress","Pending Clearance","Completed"] },
          { label: "Department",  value: deptFilter,   set: setDeptFilter,   opts: ["Engineering","Sales","Product","Finance","HR","Design","Marketing"] },
          { label: "Exit Reason", value: reasonFilter, set: setReasonFilter, opts: ["Resignation","Termination","Retirement","Contract End","Mutual Separation"] },
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

      {/* Table + panel */}
      <div className="flex gap-4">
        <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Employee","Department","Last Working Day","Exit Reason","Assets","Knowledge","HR Exit","Progress","Status","Actions"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((emp) => {
                const pct = progressPct(emp);
                const pc  = progressBarColor(pct);
                const lwdUrgent = emp.daysUntilLWD >= 0 && emp.daysUntilLWD <= 7;
                return (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar initials={emp.initials} color={emp.color} size="sm" />
                        <div>
                          <p className="font-medium text-slate-900">{emp.name}</p>
                          <p className="text-xs text-slate-400">{emp.empId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{emp.department}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={lwdUrgent ? "font-semibold text-red-600" : "text-slate-600"}>{emp.lastWorkingDay}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${EXIT_BADGE[emp.exitReason]}`}>{emp.exitReason}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{emp.assetsCount}/3</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{emp.knowledgeCount}/2</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{emp.hrExitCount}/3</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${pc}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{pct}%</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[emp.status]}`}>{emp.status}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => setPanelEmp(emp)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        View Checklist
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">No employees match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {panelEmp && <ChecklistPanel key={panelEmp.id} emp={panelEmp} onClose={() => setPanelEmp(null)} />}
      </div>

      {showInitiate && <InitiateModal onClose={() => setShowInitiate(false)} />}
    </div>
  );
}
