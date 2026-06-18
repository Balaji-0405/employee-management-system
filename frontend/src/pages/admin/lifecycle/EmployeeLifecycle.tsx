import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  X,
  ClipboardList,
  AlertTriangle,
  ArrowLeftRight,
  TrendingUp,
  LogOut,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "onboarding" | "probation" | "transfers" | "promotions" | "offboarding";

// ─── Onboarding Data ──────────────────────────────────────────────────────────

type OnboardingTask = {
  id: string;
  label: string;
  assignee: string;
  due: string;
  done: boolean;
};

type OnboardingEmployee = {
  id: string;
  name: string;
  initials: string;
  color: string;
  startDate: string;
  department: string;
  tasksTotal: number;
  tasksDone: number;
  column: "pending" | "week1" | "week2" | "completed";
};

const ONBOARDING_EMPLOYEES: OnboardingEmployee[] = [
  { id: "ob1", name: "Arjun Mehta", initials: "AM", color: "bg-blue-500", startDate: "10 Jun 2026", department: "Engineering", tasksTotal: 16, tasksDone: 0, column: "pending" },
  { id: "ob2", name: "Divya Nair", initials: "DN", color: "bg-purple-500", startDate: "2 Jun 2026", department: "Product", tasksTotal: 16, tasksDone: 6, column: "week1" },
  { id: "ob3", name: "Karan Shah", initials: "KS", color: "bg-teal-500", startDate: "27 May 2026", department: "Design", tasksTotal: 16, tasksDone: 11, column: "week2" },
  { id: "ob4", name: "Pooja Rao", initials: "PR", color: "bg-green-500", startDate: "12 May 2026", department: "HR", tasksTotal: 16, tasksDone: 16, column: "completed" },
];

const ONBOARDING_CHECKLIST: OnboardingTask[] = [
  // IT Setup
  { id: "it1", label: "Laptop provisioned", assignee: "IT Team", due: "Day 1", done: true },
  { id: "it2", label: "Company email created", assignee: "IT Team", due: "Day 1", done: true },
  { id: "it3", label: "Accounts & tool access granted", assignee: "IT Team", due: "Day 2", done: false },
  // HR Paperwork
  { id: "hr1", label: "Offer letter signed", assignee: "HR Admin", due: "Day 1", done: true },
  { id: "hr2", label: "NDA signed", assignee: "HR Admin", due: "Day 1", done: false },
  { id: "hr3", label: "Bank details submitted", assignee: "Employee", due: "Day 3", done: false },
  // Team Introduction
  { id: "ti1", label: "Buddy assigned", assignee: "Manager", due: "Day 1", done: true },
  { id: "ti2", label: "Manager 1:1 meeting", assignee: "Manager", due: "Week 1", done: false },
  { id: "ti3", label: "Team lunch scheduled", assignee: "Manager", due: "Week 1", done: false },
  // Training
  { id: "tr1", label: "Company policy walkthrough", assignee: "HR Admin", due: "Week 1", done: false },
  { id: "tr2", label: "Role-specific training", assignee: "Manager", due: "Week 2", done: false },
  { id: "tr3", label: "Tools & workflow training", assignee: "Buddy", due: "Week 2", done: false },
];

const CHECKLIST_GROUPS = [
  { label: "IT Setup", ids: ["it1", "it2", "it3"] },
  { label: "HR Paperwork", ids: ["hr1", "hr2", "hr3"] },
  { label: "Team Introduction", ids: ["ti1", "ti2", "ti3"] },
  { label: "Training", ids: ["tr1", "tr2", "tr3"] },
];

const ONBOARDING_COLUMNS = [
  { id: "pending", label: "Pending Start", color: "border-slate-300 bg-slate-50" },
  { id: "week1",   label: "Week 1",        color: "border-blue-300 bg-blue-50" },
  { id: "week2",   label: "Week 2–4",      color: "border-purple-300 bg-purple-50" },
  { id: "completed", label: "Completed",   color: "border-green-300 bg-green-50" },
] as const;

// ─── Probation Data ───────────────────────────────────────────────────────────

type ProbationStatus = "on-track" | "at-risk" | "extended";

type ProbationEmployee = {
  id: string;
  name: string;
  initials: string;
  color: string;
  startDate: string;
  endDate: string;
  daysLeft: number;
  manager: string;
  status: ProbationStatus;
};

const PROBATION_DATA: ProbationEmployee[] = [
  { id: "pr1", name: "Neha Pillai",   initials: "NP", color: "bg-teal-500",   startDate: "1 Mar 2026",  endDate: "31 Aug 2026", daysLeft: 86, manager: "Arun Kumar",  status: "on-track" },
  { id: "pr2", name: "Rohit Verma",   initials: "RV", color: "bg-blue-500",   startDate: "15 Feb 2026", endDate: "14 Aug 2026", daysLeft: 69, manager: "Priya Menon", status: "on-track" },
  { id: "pr3", name: "Sneha Joshi",   initials: "SJ", color: "bg-orange-500", startDate: "1 Jan 2026",  endDate: "13 Jun 2026", daysLeft: 7,  manager: "Rahul Desai", status: "at-risk" },
  { id: "pr4", name: "Vikram Bose",   initials: "VB", color: "bg-purple-500", startDate: "1 Nov 2025",  endDate: "30 Jun 2026", daysLeft: 24, manager: "Arun Kumar",  status: "extended" },
  { id: "pr5", name: "Meera Iyer",    initials: "MI", color: "bg-green-500",  startDate: "15 Mar 2026", endDate: "10 Jun 2026", daysLeft: 4,  manager: "Priya Menon", status: "on-track" },
];

// ─── Transfers Data ───────────────────────────────────────────────────────────

type TransferStatus = "pending" | "approved" | "completed";

type TransferRecord = {
  id: string;
  name: string;
  initials: string;
  color: string;
  fromDept: string;
  toDept: string;
  effectiveDate: string;
  requestedBy: string;
  status: TransferStatus;
};

const PENDING_TRANSFERS: TransferRecord[] = [
  { id: "tr1", name: "Ananya Singh",  initials: "AS", color: "bg-blue-500",   fromDept: "Engineering",  toDept: "Product",     effectiveDate: "1 Jul 2026",  requestedBy: "Arun Kumar",  status: "pending" },
  { id: "tr2", name: "Siddharth Roy", initials: "SR", color: "bg-purple-500", fromDept: "Sales",         toDept: "Marketing",   effectiveDate: "15 Jul 2026", requestedBy: "Priya Menon", status: "pending" },
  { id: "tr3", name: "Lakshmi Das",   initials: "LD", color: "bg-teal-500",   fromDept: "HR",            toDept: "Admin",       effectiveDate: "1 Jul 2026",  requestedBy: "Rahul Desai", status: "pending" },
];

const TRANSFER_HISTORY: TransferRecord[] = [
  { id: "th1", name: "Rahul Vyas",   initials: "RV", color: "bg-green-500",  fromDept: "Design",       toDept: "Engineering", effectiveDate: "1 May 2026",  requestedBy: "Sneha Patel", status: "completed" },
  { id: "th2", name: "Pooja Sharma", initials: "PS", color: "bg-orange-500", fromDept: "Finance",      toDept: "Operations",  effectiveDate: "15 Apr 2026", requestedBy: "Arun Kumar",  status: "completed" },
  { id: "th3", name: "Dev Kapoor",   initials: "DK", color: "bg-blue-500",   fromDept: "Engineering",  toDept: "DevOps",      effectiveDate: "1 Apr 2026",  requestedBy: "Priya Menon", status: "completed" },
  { id: "th4", name: "Aarti Mehta",  initials: "AM", color: "bg-purple-500", fromDept: "HR",           toDept: "Recruitment", effectiveDate: "1 Mar 2026",  requestedBy: "Rahul Desai", status: "completed" },
  { id: "th5", name: "Rajan Nair",   initials: "RN", color: "bg-teal-500",   fromDept: "Sales",        toDept: "Account Mgmt",effectiveDate: "15 Feb 2026", requestedBy: "Arun Kumar",  status: "completed" },
];

// ─── Promotions Data ──────────────────────────────────────────────────────────

type PromotionStatus = "pending" | "approved" | "scheduled";

type PromotionRecord = {
  id: string;
  name: string;
  initials: string;
  color: string;
  department: string;
  currentTitle: string;
  newTitle: string;
  effectiveDate: string;
  salaryImpact: string;
  recommendedBy: string;
  status: PromotionStatus;
};

const PROMOTIONS_DATA: PromotionRecord[] = [
  { id: "pm1", name: "Arjun Kapoor",  initials: "AK", color: "bg-blue-500",   department: "Engineering", currentTitle: "Senior Engineer",   newTitle: "Staff Engineer",       effectiveDate: "1 Jul 2026",  salaryImpact: "+18%", recommendedBy: "Priya Menon", status: "pending" },
  { id: "pm2", name: "Ritika Sharma", initials: "RS", color: "bg-purple-500", department: "Product",     currentTitle: "Product Manager",   newTitle: "Senior PM",            effectiveDate: "1 Jul 2026",  salaryImpact: "+15%", recommendedBy: "Arun Kumar",  status: "pending" },
  { id: "pm3", name: "Nikhil Bhat",   initials: "NB", color: "bg-green-500",  department: "Design",      currentTitle: "UI Designer",       newTitle: "Lead Designer",        effectiveDate: "1 Jun 2026",  salaryImpact: "+12%", recommendedBy: "Rahul Desai", status: "approved" },
  { id: "pm4", name: "Kavya Iyer",    initials: "KI", color: "bg-teal-500",   department: "HR",          currentTitle: "HR Executive",      newTitle: "HR Manager",           effectiveDate: "1 Aug 2026",  salaryImpact: "+20%", recommendedBy: "Priya Menon", status: "scheduled" },
];

// ─── Offboarding Data ─────────────────────────────────────────────────────────

type OffboardingStatus = "in-progress" | "completed" | "scheduled";

type OffboardingEmployee = {
  id: string;
  name: string;
  initials: string;
  color: string;
  lastDay: string;
  reason: string;
  exitInterview: boolean;
  assetsReturned: boolean;
  itDeprovisioned: boolean;
  tasksDone: number;
  status: OffboardingStatus;
};

const OFFBOARDING_DATA: OffboardingEmployee[] = [
  { id: "off1", name: "Rahul Trivedi", initials: "RT", color: "bg-red-500",    lastDay: "15 Jun 2026", reason: "Resignation",  exitInterview: true,  assetsReturned: false, itDeprovisioned: false, tasksDone: 2, status: "in-progress" },
  { id: "off2", name: "Sunita Rao",    initials: "SR", color: "bg-orange-500", lastDay: "30 Jun 2026", reason: "Contract End", exitInterview: false, assetsReturned: false, itDeprovisioned: false, tasksDone: 1, status: "scheduled"   },
  { id: "off3", name: "Girish Menon",  initials: "GM", color: "bg-green-600",  lastDay: "31 May 2026", reason: "Retirement",   exitInterview: true,  assetsReturned: true,  itDeprovisioned: true,  tasksDone: 5, status: "completed"   },
];

const OFFBOARDING_CHECKLIST = [
  { label: "Exit interview completed", assignee: "HR Admin", due: "1 week before" },
  { label: "Knowledge transfer document", assignee: "Manager", due: "1 week before" },
  { label: "Company assets returned", assignee: "IT Team", due: "Last day" },
  { label: "IT access deprovisioned", assignee: "IT Team", due: "Last day" },
  { label: "Final payroll processed", assignee: "Payroll", due: "Last day + 2" },
];

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Avatar({ initials, color, size = "md" }: { initials: string; color: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${color} ${sz}`}>
      {initials}
    </span>
  );
}

function probationBadge(status: ProbationStatus) {
  if (status === "on-track") return "bg-green-100 text-green-700";
  if (status === "at-risk")  return "bg-orange-100 text-orange-700";
  return "bg-purple-100 text-purple-700";
}
function probationLabel(status: ProbationStatus) {
  if (status === "on-track") return "On Track";
  if (status === "at-risk")  return "At Risk";
  return "Extended";
}

function offboardingBadge(status: OffboardingStatus) {
  if (status === "in-progress") return "bg-orange-100 text-orange-700";
  if (status === "completed")   return "bg-green-100 text-green-700";
  return "bg-blue-100 text-blue-700";
}
function offboardingLabel(status: OffboardingStatus) {
  if (status === "in-progress") return "In Progress";
  if (status === "completed")   return "Completed";
  return "Scheduled";
}

function promotionBadge(status: PromotionStatus) {
  if (status === "pending")   return "bg-yellow-100 text-yellow-700";
  if (status === "approved")  return "bg-green-100 text-green-700";
  return "bg-blue-100 text-blue-700";
}
function promotionLabel(status: PromotionStatus) {
  if (status === "pending")   return "Pending Approval";
  if (status === "approved")  return "Approved";
  return "Scheduled";
}

// ─── Onboarding Tab ───────────────────────────────────────────────────────────

function OnboardingTab() {
  const [panelEmp, setPanelEmp] = useState<OnboardingEmployee | null>(null);
  const [tasks, setTasks] = useState<OnboardingTask[]>(ONBOARDING_CHECKLIST);

  function toggleTask(id: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }

  return (
    <div className="relative flex gap-4">
      {/* Kanban board */}
      <div className={`grid min-w-0 flex-1 grid-cols-4 gap-4 transition-all duration-200 ${panelEmp ? "pr-0" : ""}`}>
        {ONBOARDING_COLUMNS.map((col) => {
          const emps = ONBOARDING_EMPLOYEES.filter((e) => e.column === col.id);
          return (
            <div key={col.id} className={`flex flex-col gap-3 rounded-2xl border-2 p-3 ${col.color}`}>
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{col.label}</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-sm">{emps.length}</span>
              </div>
              {emps.map((emp) => {
                const pct = Math.round((emp.tasksDone / emp.tasksTotal) * 100);
                return (
                  <div key={emp.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Avatar initials={emp.initials} color={emp.color} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{emp.name}</p>
                        <p className="text-xs text-slate-500">{emp.department}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Start: {emp.startDate}</p>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{emp.tasksDone}/{emp.tasksTotal} tasks</span>
                        <span className="font-semibold text-slate-700">{pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => setPanelEmp(emp)}
                      className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      View Checklist
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Checklist Panel */}
      {panelEmp && (
        <div className="w-80 shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Avatar initials={panelEmp.initials} color={panelEmp.color} size="sm" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{panelEmp.name}</p>
                <p className="text-xs text-slate-500">{panelEmp.department}</p>
              </div>
            </div>
            <button
              onClick={() => setPanelEmp(null)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 14rem)" }}>
            {CHECKLIST_GROUPS.map((group) => (
              <div key={group.label} className="border-b border-slate-100 px-4 py-3 last:border-0">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.label}</p>
                <div className="space-y-2">
                  {tasks.filter((t) => group.ids.includes(t.id)).map((task) => (
                    <label key={task.id} className="flex cursor-pointer items-start gap-2.5">
                      <div
                        onClick={() => toggleTask(task.id)}
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${
                          task.done ? "border-green-500 bg-green-500" : "border-slate-300 bg-white"
                        }`}
                      >
                        {task.done && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${task.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{task.label}</p>
                        <p className="text-xs text-slate-400">{task.assignee} · {task.due}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Probation Tab ────────────────────────────────────────────────────────────

function ProbationTab() {
  const [confirmEmp, setConfirmEmp] = useState<ProbationEmployee | null>(null);
  const [feedback, setFeedback] = useState("");

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Start Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">End Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Days Left</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Manager</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {PROBATION_DATA.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={emp.initials} color={emp.color} size="sm" />
                    <span className="font-medium text-slate-900">{emp.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{emp.startDate}</td>
                <td className="px-4 py-3 text-slate-600">{emp.endDate}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${emp.daysLeft <= 7 ? "text-orange-600" : "text-slate-700"}`}>
                    {emp.daysLeft}d
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{emp.manager}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${probationBadge(emp.status)}`}>
                    {probationLabel(emp.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setConfirmEmp(emp); setFeedback(""); }}
                      className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700"
                    >
                      Confirm
                    </button>
                    <button className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                      Extend
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirm Modal */}
      {confirmEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmEmp(null)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="text-base font-semibold text-slate-900">Confirm Probation</h2>
              <button onClick={() => setConfirmEmp(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <Avatar initials={confirmEmp.initials} color={confirmEmp.color} />
              <div>
                <p className="font-semibold text-slate-900">{confirmEmp.name}</p>
                <p className="text-xs text-slate-500">{confirmEmp.startDate} → {confirmEmp.endDate}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-600">Feedback / Notes</p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                placeholder="Add performance notes or feedback..."
                className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setConfirmEmp(null)} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Cancel
              </button>
              <button onClick={() => setConfirmEmp(null)} className="flex-1 rounded-xl bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700">
                Confirm Completion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Transfers Tab ────────────────────────────────────────────────────────────

function TransfersTab() {
  const [subTab, setSubTab] = useState<"pending" | "history">("pending");
  const [pendingList, setPendingList] = useState<TransferRecord[]>(PENDING_TRANSFERS);

  function handleAction(id: string, action: "approve" | "reject") {
    setPendingList((prev) => prev.filter((t) => t.id !== id));
    void action;
  }

  const tableHead = (showActions: boolean) => (
    <thead>
      <tr className="border-b border-slate-100 bg-slate-50">
        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Employee</th>
        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">From Dept</th>
        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">To Dept</th>
        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Effective Date</th>
        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Requested By</th>
        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
        {showActions && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>}
      </tr>
    </thead>
  );

  const empCell = (rec: TransferRecord) => (
    <div className="flex items-center gap-2.5">
      <Avatar initials={rec.initials} color={rec.color} size="sm" />
      <span className="font-medium text-slate-900">{rec.name}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {(["pending", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
              subTab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "pending" ? "Pending Transfers" : "Transfer History"}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {subTab === "pending" ? (
          <table className="w-full text-sm">
            {tableHead(true)}
            <tbody className="divide-y divide-slate-50">
              {pendingList.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{empCell(rec)}</td>
                  <td className="px-4 py-3 text-slate-600">{rec.fromDept}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-slate-600">
                      <span>{rec.toDept}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{rec.effectiveDate}</td>
                  <td className="px-4 py-3 text-slate-600">{rec.requestedBy}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">Pending</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleAction(rec.id, "approve")} className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700">Approve</button>
                      <button onClick={() => handleAction(rec.id, "reject")} className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingList.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">No pending transfers</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            {tableHead(false)}
            <tbody className="divide-y divide-slate-50">
              {TRANSFER_HISTORY.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{empCell(rec)}</td>
                  <td className="px-4 py-3 text-slate-600">{rec.fromDept}</td>
                  <td className="px-4 py-3 text-slate-600">{rec.toDept}</td>
                  <td className="px-4 py-3 text-slate-600">{rec.effectiveDate}</td>
                  <td className="px-4 py-3 text-slate-600">{rec.requestedBy}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">Completed</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Promotions Tab ───────────────────────────────────────────────────────────

function PromotionsTab() {
  const [promotions, setPromotions] = useState<PromotionRecord[]>(PROMOTIONS_DATA);

  function handleAction(id: string, action: "approve" | "reject") {
    if (action === "approve") {
      setPromotions((prev) => prev.map((p) => p.id === id ? { ...p, status: "approved" } : p));
    } else {
      setPromotions((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {promotions.map((promo) => (
        <div key={promo.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar initials={promo.initials} color={promo.color} />
              <div>
                <p className="font-semibold text-slate-900">{promo.name}</p>
                <p className="text-xs text-slate-500">{promo.department}</p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${promotionBadge(promo.status)}`}>
              {promotionLabel(promo.status)}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
            <span className="text-sm font-medium text-slate-600">{promo.currentTitle}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-blue-500" />
            <span className="text-sm font-semibold text-slate-900">{promo.newTitle}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-500">
            <span>Effective: <strong className="text-slate-700">{promo.effectiveDate}</strong></span>
            <span>Salary: <strong className="text-green-600">{promo.salaryImpact}</strong></span>
            <span className="col-span-2">Recommended by: <strong className="text-slate-700">{promo.recommendedBy}</strong></span>
          </div>

          {promo.status === "pending" && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleAction(promo.id, "approve")}
                className="flex-1 rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Approve
              </button>
              <button
                onClick={() => handleAction(promo.id, "reject")}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Reject
              </button>
            </div>
          )}

          {promo.status === "approved" && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-xs font-semibold text-green-700">Effective {promo.effectiveDate}</span>
            </div>
          )}

          {promo.status === "scheduled" && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2">
              <span className="text-xs font-semibold text-blue-700">Scheduled for {promo.effectiveDate}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Offboarding Tab ──────────────────────────────────────────────────────────

function OffboardingTab() {
  const [panelEmp, setPanelEmp] = useState<OffboardingEmployee | null>(null);

  return (
    <div className="flex gap-4">
      <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Last Working Day</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Exit Interview</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Assets</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">IT Deprovisioned</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Progress</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {OFFBOARDING_DATA.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={emp.initials} color={emp.color} size="sm" />
                    <span className="font-medium text-slate-900">{emp.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{emp.lastDay}</td>
                <td className="px-4 py-3 text-slate-600">{emp.reason}</td>
                <td className="px-4 py-3 text-center">
                  {emp.exitInterview
                    ? <Check className="mx-auto h-4 w-4 text-green-500" />
                    : <X className="mx-auto h-4 w-4 text-slate-300" />}
                </td>
                <td className="px-4 py-3 text-center">
                  {emp.assetsReturned
                    ? <Check className="mx-auto h-4 w-4 text-green-500" />
                    : <X className="mx-auto h-4 w-4 text-slate-300" />}
                </td>
                <td className="px-4 py-3 text-center">
                  {emp.itDeprovisioned
                    ? <Check className="mx-auto h-4 w-4 text-green-500" />
                    : <X className="mx-auto h-4 w-4 text-slate-300" />}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${(emp.tasksDone / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{emp.tasksDone}/5</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${offboardingBadge(emp.status)}`}>
                    {offboardingLabel(emp.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setPanelEmp(emp)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Details Panel */}
      {panelEmp && (
        <div className="w-72 shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Avatar initials={panelEmp.initials} color={panelEmp.color} size="sm" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{panelEmp.name}</p>
                <p className="text-xs text-slate-500">Last day: {panelEmp.lastDay}</p>
              </div>
            </div>
            <button
              onClick={() => setPanelEmp(null)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 py-3">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Offboarding Checklist</p>
            <div className="space-y-3">
              {OFFBOARDING_CHECKLIST.map((task, i) => {
                const done = i < panelEmp.tasksDone;
                return (
                  <div key={task.label} className="flex items-start gap-2.5">
                    <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${done ? "border-green-500 bg-green-500" : "border-slate-300 bg-white"}`}>
                      {done && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <div>
                      <p className={`text-sm ${done ? "text-slate-400 line-through" : "text-slate-700"}`}>{task.label}</p>
                      <p className="text-xs text-slate-400">{task.assignee} · {task.due}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "onboarding",  label: "Onboarding",  icon: ClipboardList },
  { id: "probation",   label: "Probation",   icon: AlertTriangle },
  { id: "transfers",   label: "Transfers",   icon: ArrowLeftRight },
  { id: "promotions",  label: "Promotions",  icon: TrendingUp },
  { id: "offboarding", label: "Offboarding", icon: LogOut },
];

const INITIATE_OPTIONS = [
  { label: "Start Onboarding",   tab: "onboarding"  as TabId },
  { label: "Schedule Transfer",  tab: "transfers"   as TabId },
  { label: "Begin Offboarding",  tab: "offboarding" as TabId },
];

type Props = { defaultTab?: TabId };

export default function EmployeeLifecycle({ defaultTab = "onboarding" }: Props) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="min-h-full bg-[#f5f8ff] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
        <button onClick={() => navigate("/dashboard")} className="hover:text-slate-600">Dashboard</button>
        <ChevronRight className="h-3 w-3" />
        <span>Workforce</span>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-slate-600">Lifecycle</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Employee Lifecycle</h1>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Initiate Process
            <ChevronDown className="h-4 w-4" />
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                {INITIATE_OPTIONS.map(({ label, tab }) => (
                  <button
                    key={label}
                    onClick={() => { setActiveTab(tab); setDropdownOpen(false); }}
                    className="flex w-full items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              activeTab === id
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "onboarding"  && <OnboardingTab />}
      {activeTab === "probation"   && <ProbationTab />}
      {activeTab === "transfers"   && <TransfersTab />}
      {activeTab === "promotions"  && <PromotionsTab />}
      {activeTab === "offboarding" && <OffboardingTab />}
    </div>
  );
}
