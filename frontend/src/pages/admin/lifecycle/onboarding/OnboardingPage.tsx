import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, X, Check, Calendar, User, ChevronDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  department: string;
  joiningDate: string;
  manager: string;
  buddy: string | null;
  tasksTotal: number;
  tasksDone: number;
  column: "pending" | "week1" | "week2" | "completed";
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const EMPLOYEES: OnboardingEmployee[] = [
  { id: "ob1", name: "Arjun Mehta",   initials: "AM", color: "bg-blue-500",   department: "Engineering", joiningDate: "10 Jun 2026", manager: "Priya Menon",  buddy: "Karan Desai",  tasksTotal: 14, tasksDone: 0,  column: "pending" },
  { id: "ob2", name: "Divya Nair",    initials: "DN", color: "bg-purple-500", department: "Product",     joiningDate: "2 Jun 2026",  manager: "Arun Kumar",   buddy: null,           tasksTotal: 14, tasksDone: 5,  column: "week1" },
  { id: "ob3", name: "Karan Shah",    initials: "KS", color: "bg-teal-500",   department: "Design",      joiningDate: "27 May 2026", manager: "Rahul Desai",  buddy: "Neha Pillai",  tasksTotal: 14, tasksDone: 9,  column: "week2" },
  { id: "ob4", name: "Pooja Rao",     initials: "PR", color: "bg-green-500",  department: "HR",          joiningDate: "12 May 2026", manager: "Arun Kumar",   buddy: "Sunita Roy",   tasksTotal: 14, tasksDone: 14, column: "completed" },
  { id: "ob5", name: "Ravi Shankar",  initials: "RS", color: "bg-orange-500", department: "Sales",       joiningDate: "15 Jun 2026", manager: "Priya Menon",  buddy: null,           tasksTotal: 14, tasksDone: 0,  column: "pending" },
  { id: "ob6", name: "Meena Iyer",    initials: "MI", color: "bg-pink-500",   department: "Finance",     joiningDate: "3 Jun 2026",  manager: "Rahul Desai",  buddy: "Kiran Kumar",  tasksTotal: 14, tasksDone: 7,  column: "week1" },
  { id: "ob7", name: "Suresh Bhat",   initials: "SB", color: "bg-indigo-500", department: "DevOps",      joiningDate: "20 May 2026", manager: "Arun Kumar",   buddy: "Dev Gupta",    tasksTotal: 14, tasksDone: 11, column: "week2" },
  { id: "ob8", name: "Lakshmi Das",   initials: "LD", color: "bg-cyan-500",   department: "QA",          joiningDate: "5 May 2026",  manager: "Priya Menon",  buddy: "Anjali Roy",   tasksTotal: 14, tasksDone: 14, column: "completed" },
];

const CHECKLIST_TASKS: OnboardingTask[] = [
  // IT Setup
  { id: "it1", label: "Company email account created",   assignee: "IT Team",  due: "Day 1",  done: true  },
  { id: "it2", label: "Laptop / device assigned",         assignee: "IT Team",  due: "Day 1",  done: true  },
  { id: "it3", label: "System access granted",            assignee: "IT Team",  due: "Day 2",  done: false },
  { id: "it4", label: "Security training completed",      assignee: "IT Team",  due: "Week 1", done: false },
  // HR Paperwork
  { id: "hr1", label: "Offer letter signed and uploaded", assignee: "HR Admin", due: "Day 1",  done: true  },
  { id: "hr2", label: "NDA and policy documents signed",  assignee: "HR Admin", due: "Day 1",  done: false },
  { id: "hr3", label: "Bank account details submitted",   assignee: "Employee", due: "Day 3",  done: false },
  { id: "hr4", label: "Employee profile created in system",assignee: "HR Admin",due: "Day 2",  done: true  },
  // Team Introduction
  { id: "ti1", label: "Team introduction meeting done",   assignee: "Manager",  due: "Day 1",  done: true  },
  { id: "ti2", label: "1:1 with reporting manager completed",assignee: "Manager",due: "Week 1",done: false },
  { id: "ti3", label: "Buddy assigned and introduced",    assignee: "Manager",  due: "Day 1",  done: false },
  // Training
  { id: "tr1", label: "Company handbook reviewed",        assignee: "Employee", due: "Week 1", done: false },
  { id: "tr2", label: "Role-specific tool training done", assignee: "Manager",  due: "Week 2", done: false },
  { id: "tr3", label: "Compliance and safety training done",assignee: "HR Admin",due: "Week 2",done: false },
];

const CHECKLIST_GROUPS = [
  { label: "IT Setup",           ids: ["it1","it2","it3","it4"] },
  { label: "HR Paperwork",       ids: ["hr1","hr2","hr3","hr4"] },
  { label: "Team Introduction",  ids: ["ti1","ti2","ti3"] },
  { label: "Training",           ids: ["tr1","tr2","tr3"] },
];

const COLUMNS = [
  { id: "pending",   label: "Pending Start", color: "border-slate-300 bg-slate-50"   },
  { id: "week1",     label: "Week 1",        color: "border-blue-300 bg-blue-50"     },
  { id: "week2",     label: "Week 2–4",      color: "border-purple-300 bg-purple-50" },
  { id: "completed", label: "Completed",     color: "border-green-300 bg-green-50"   },
] as const;

const NEXT_STAGE: Record<string, string> = {
  pending: "Week 1", week1: "Week 2–4", week2: "Completed",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Avatar({ initials, color, size = "md" }: { initials: string; color: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-sm";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${color} ${sz}`}>
      {initials}
    </span>
  );
}

function progressColor(pct: number) {
  if (pct >= 75) return "bg-green-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-red-500";
}

// ─── Checklist Panel ──────────────────────────────────────────────────────────

function ChecklistPanel({
  emp,
  tasks,
  onToggle,
  onClose,
  onAdvance,
}: {
  emp: OnboardingEmployee;
  tasks: OnboardingTask[];
  onToggle: (id: string) => void;
  onClose: () => void;
  onAdvance: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ "IT Setup": true, "HR Paperwork": true, "Team Introduction": true, "Training": true });
  const [confirmOpen, setConfirmOpen] = useState(false);

  const doneTasks = tasks.filter((t) => t.done).length;
  const pct = Math.round((doneTasks / tasks.length) * 100);
  const nextStage = NEXT_STAGE[emp.column];

  return (
    <div className="flex w-96 shrink-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <Avatar initials={emp.initials} color={emp.color} size="md" />
          <div>
            <p className="font-semibold text-slate-900">{emp.name}</p>
            <p className="text-xs text-slate-500">{emp.department}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="h-3 w-3" /> {emp.joiningDate}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress ring */}
      <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-4">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#e2e8f0" strokeWidth="6" />
            <circle
              cx="32" cy="32" r="26" fill="none"
              stroke={pct >= 75 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444"}
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - pct / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-sm font-bold text-slate-900">{pct}%</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{doneTasks} of {tasks.length} tasks done</p>
          <p className="text-xs text-slate-400">Joined {emp.joiningDate}</p>
        </div>
      </div>

      {/* Accordion groups */}
      <div className="flex-1 overflow-y-auto">
        {CHECKLIST_GROUPS.map((group) => {
          const groupTasks = tasks.filter((t) => group.ids.includes(t.id));
          const groupDone = groupTasks.filter((t) => t.done).length;
          const isOpen = openGroups[group.label];
          return (
            <div key={group.label} className="border-b border-slate-100 last:border-0">
              <button
                onClick={() => setOpenGroups((prev) => ({ ...prev, [group.label]: !prev[group.label] }))}
                className="flex w-full items-center justify-between px-5 py-3 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{group.label}</span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    {groupDone}/{groupTasks.length}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="space-y-2 px-5 pb-3">
                  {groupTasks.map((task) => (
                    <div key={task.id}>
                      <label className="flex cursor-pointer items-start gap-2.5">
                        <div
                          onClick={() => onToggle(task.id)}
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${task.done ? "border-green-500 bg-green-500" : "border-slate-300 bg-white"}`}
                        >
                          {task.done && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${task.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{task.label}</p>
                          <p className="text-xs text-slate-400">{task.assignee} · {task.due}</p>
                          {task.done && (
                            <p className="text-[10px] text-slate-400">Completed by {task.assignee} on 1 Jun 2026</p>
                          )}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {nextStage && (
        <div className="border-t border-slate-100 px-5 py-4">
          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Mark Stage Complete
          </button>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmOpen(false)}>
          <div className="w-80 rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-slate-900">Move {emp.name} to {nextStage}?</p>
            <p className="mt-1 text-sm text-slate-500">This will advance their onboarding stage.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setConfirmOpen(false)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { onAdvance(); setConfirmOpen(false); }} className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Initiate Onboarding Modal ────────────────────────────────────────────────

function InitiateModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ employee: "", joiningDate: "", department: "", manager: "", buddy: "", notes: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Initiate Onboarding</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600">Employee *</label>
            <select value={form.employee} onChange={set("employee")} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none">
              <option value="">Search employee…</option>
              <option>Ravi Kumar</option><option>Sunita Das</option><option>Mohan Patel</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Joining Date *</label>
            <input type="date" value={form.joiningDate} onChange={set("joiningDate")} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Department *</label>
            <input value={form.department} onChange={set("department")} placeholder="Auto-filled" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Manager *</label>
            <input value={form.manager} onChange={set("manager")} placeholder="Auto-filled" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Buddy (optional)</label>
            <input value={form.buddy} onChange={set("buddy")} placeholder="Search employee…" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600">Notes</label>
            <textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Any additional notes…" className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={onClose} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Start Onboarding</button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<OnboardingEmployee[]>(EMPLOYEES);
  const [tasks, setTasks] = useState<OnboardingTask[]>(CHECKLIST_TASKS);
  const [panelEmp, setPanelEmp] = useState<OnboardingEmployee | null>(null);
  const [showModal, setShowModal] = useState(false);

  function toggleTask(id: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }

  function advanceEmployee() {
    if (!panelEmp) return;
    const order: OnboardingEmployee["column"][] = ["pending", "week1", "week2", "completed"];
    const idx = order.indexOf(panelEmp.column);
    if (idx < order.length - 1) {
      const next = order[idx + 1];
      setEmployees((prev) => prev.map((e) => e.id === panelEmp.id ? { ...e, column: next } : e));
      setPanelEmp((p) => p ? { ...p, column: next } : null);
    }
  }

  const stats = [
    { label: "In Progress",        value: employees.filter((e) => e.column === "week1" || e.column === "week2").length },
    { label: "Starting This Week", value: employees.filter((e) => e.column === "pending").length },
    { label: "Completed This Month", value: employees.filter((e) => e.column === "completed").length },
    { label: "Avg Days",           value: 18 },
  ];

  return (
    <div className="min-h-full bg-[#f5f8ff] px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
        <button onClick={() => navigate("/dashboard")} className="hover:text-slate-600">Dashboard</button>
        <ChevronRight className="h-3 w-3" />
        <span>Workforce</span>
        <ChevronRight className="h-3 w-3" />
        <span>Lifecycle</span>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-slate-600">Onboarding</span>
      </nav>

      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Onboarding</h1>
        <button onClick={() => setShowModal(true)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Initiate Onboarding
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

      {/* Content */}
      <div className="flex gap-4">
        {/* Kanban */}
        <div className={`grid flex-1 gap-4 transition-all duration-200 ${panelEmp ? "grid-cols-4" : "grid-cols-4"}`}>
          {COLUMNS.map((col) => {
            const colEmps = employees.filter((e) => e.column === col.id);
            return (
              <div key={col.id} className={`flex flex-col gap-3 rounded-2xl border-2 p-3 ${col.color}`}>
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{col.label}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-sm">{colEmps.length}</span>
                </div>
                {colEmps.map((emp) => {
                  const pct = Math.round((emp.tasksDone / emp.tasksTotal) * 100);
                  return (
                    <div key={emp.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Avatar initials={emp.initials} color={emp.color} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{emp.name}</p>
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{emp.department}</span>
                        </div>
                      </div>
                      <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="h-3 w-3" /> {emp.joiningDate}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                        <User className="h-3 w-3" /> {emp.manager}
                      </p>
                      <p className="mt-1 text-xs">
                        {emp.buddy
                          ? <span className="text-slate-400">Buddy: {emp.buddy}</span>
                          : <button className="text-blue-500 hover:underline">Assign buddy</button>
                        }
                      </p>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">{emp.tasksDone} of {emp.tasksTotal} tasks done</span>
                          <span className="font-semibold text-slate-700">{pct}%</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${progressColor(pct)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <button
                        onClick={() => setPanelEmp(emp)}
                        className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        View Checklist →
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
          <ChecklistPanel
            emp={panelEmp}
            tasks={tasks}
            onToggle={toggleTask}
            onClose={() => setPanelEmp(null)}
            onAdvance={advanceEmployee}
          />
        )}
      </div>

      {showModal && <InitiateModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
