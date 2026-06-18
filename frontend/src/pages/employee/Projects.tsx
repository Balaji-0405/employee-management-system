import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileStack,
  FolderKanban,
  Link2,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import { projectAPI, taskAPI, timesheetAPI } from "../../lib/api";
import { TaskDetailDrawer } from "./Tasks";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const stats = [
  { label: "Active Projects",    hint: "View all projects", icon: FolderKanban, color: "text-violet-600", bg: "bg-violet-50" },
  { label: "Pending Tasks",      hint: "View my tasks",     icon: ShieldCheck,   color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Completed Tasks",    hint: "This month",        icon: CheckCircle2,  color: "text-blue-600",   bg: "bg-blue-50" },
  { label: "Upcoming Deadlines", hint: "Next 7 days",       icon: CalendarClock, color: "text-orange-600", bg: "bg-orange-50" },
  { label: "Logged Hours",       hint: "This week",         icon: Timer,         color: "text-rose-600",   bg: "bg-rose-50" },
];

const priorityClass: Record<string, string> = {
  High: "bg-red-50 text-red-600",
  Medium: "bg-amber-50 text-amber-600",
  Low: "bg-blue-50 text-blue-600",
  Done: "bg-emerald-50 text-emerald-600",
};

function statusColor(s: string) {
  if (s === "active")    return "bg-emerald-50 text-emerald-700";
  if (s === "completed") return "bg-blue-50 text-blue-700";
  if (s === "on_hold")   return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function priorityColor(p: string) {
  if (p === "critical") return "bg-red-50 text-red-700";
  if (p === "high")     return "bg-orange-50 text-orange-700";
  if (p === "medium")   return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>{children}</section>;
}

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [boardTab, setBoardTab] = useState("board");
  const [statsData, setStatsData] = useState<any>(null);
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [boardData, setBoardData] = useState<any>({ todo: [], in_progress: [], review: [], done: [] });
  const [deadlinesData, setDeadlinesData] = useState<any[]>([]);
  const [toast, setToast] = useState("");
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState("active");
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProjectId, setNewTaskProjectId] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  // Timesheet tab
  const [timesheetData, setTimesheetData] = useState<any>(null);

  // Calendar tab
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsR, projectsR, groupedR, deadlinesR] = await Promise.allSettled([
          projectAPI.getStats(),
          projectAPI.getMy(),
          taskAPI.getGrouped(),
          taskAPI.getDeadlines(),
        ]);
        if (statsR.status === "fulfilled") setStatsData(statsR.value);
        if (projectsR.status === "fulfilled") setProjectsData(Array.isArray(projectsR.value) ? projectsR.value : []);
        if (groupedR.status === "fulfilled") setBoardData((groupedR.value as any) || { todo: [], in_progress: [], review: [], done: [] });
        if (deadlinesR.status === "fulfilled") setDeadlinesData(Array.isArray(deadlinesR.value) ? deadlinesR.value : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Default project for new task modal
  useEffect(() => {
    if (!newTaskProjectId && projectsData.length > 0) setNewTaskProjectId(projectsData[0].id);
  }, [projectsData, newTaskProjectId]);

  // Lazy-load timesheet data
  useEffect(() => {
    if (activeTab !== "timesheet") return;
    timesheetAPI.getWeekly().then(d => setTimesheetData(d)).catch(() => {});
  }, [activeTab]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredProjects = projectFilter === "all"
    ? projectsData
    : projectsData.filter((p: any) => p.status === projectFilter);

  const isBlockedTask = (task: any) => task.status === "blocked" || task.blocked === true;
  const isTaskAssignedToUser = (task: any) =>
    task.assigned_to === user?.id || task.assigned_to?.id === user?.id;

  const getBoardTasks = (tasks: any[]) => {
    if (boardTab === "blocked") return tasks.filter(isBlockedTask);
    if (boardTab === "my")      return tasks.filter(isTaskAssignedToUser);
    return tasks;
  };

  const boardColumns = [
    { title: "To Do",       key: "todo",        tasks: boardData.todo        || [], tone: "bg-slate-50"   },
    { title: "In Progress", key: "in_progress",  tasks: boardData.in_progress || [], tone: "bg-blue-50"    },
    { title: "Review",      key: "review",       tasks: boardData.review      || [], tone: "bg-amber-50"   },
    { title: "Completed",   key: "done",         tasks: boardData.done        || [], tone: "bg-emerald-50" },
  ];

  const taskBoardColumns = boardColumns.map(c => ({ ...c, tasks: getBoardTasks(c.tasks || []) }));

  const todayStr = new Date().toISOString().split("T")[0];

  // Calendar cells
  const calendarCells = useMemo(() => {
    const firstDow   = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ day: 0, dateStr: "", isCurrentMonth: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateStr, isCurrentMonth: true });
    }
    while (cells.length < 35) cells.push({ day: 0, dateStr: "", isCurrentMonth: false });
    return cells;
  }, [calMonth, calYear]);

  // Tasks by date (board tasks + deadlines)
  const tasksByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    const allTasks = [
      ...(boardData.todo || []),
      ...(boardData.in_progress || []),
      ...(boardData.review || []),
      ...(boardData.done || []),
    ];
    allTasks.forEach((t: any) => {
      if (t.due_date) { const list = map.get(t.due_date) || []; list.push(t); map.set(t.due_date, list); }
    });
    deadlinesData.forEach((d: any) => {
      if (d.due_date) { const list = map.get(d.due_date) || []; list.push(d); map.set(d.due_date, list); }
    });
    return map;
  }, [boardData, deadlinesData]);

  // Reports analytics
  const allBoardTasks = useMemo(() => [
    ...(boardData.todo || []), ...(boardData.in_progress || []),
    ...(boardData.review || []), ...(boardData.done || []),
  ], [boardData]);

  const reportTotal = allBoardTasks.length || 1;
  const reportDone  = (boardData.done || []).length;
  const reportPct   = Math.round((reportDone / reportTotal) * 100);
  const highCount   = allBoardTasks.filter((t: any) => t.priority === "high").length;
  const medCount    = allBoardTasks.filter((t: any) => t.priority === "medium").length;
  const lowCount    = allBoardTasks.filter((t: any) => t.priority === "low").length;
  const highPct     = Math.round((highCount / reportTotal) * 100);
  const medPct      = Math.round((medCount  / reportTotal) * 100);
  const lowPct      = Math.max(0, 100 - highPct - medPct);
  const onTimeDone  = (boardData.done || []).filter((t: any) => !t.due_date || new Date(t.due_date) >= new Date()).length;
  const onTimeRate  = reportDone > 0 ? Math.round((onTimeDone / reportDone) * 100) : 100;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const reloadBoard = async () => {
    try { setBoardData((await taskAPI.getGrouped() as any) || { todo: [], in_progress: [], review: [], done: [] }); }
    catch { /* noop */ }
  };

  const handleCreateTask = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) { setToast("Please add a task title"); return; }
    if (!newTaskProjectId)    { setToast("Select a project"); return; }
    setCreatingTask(true);
    try {
      await taskAPI.create({ title: newTaskTitle.trim(), project_id: newTaskProjectId, priority: newTaskPriority, description: newTaskDesc || undefined, due_date: newTaskDueDate || undefined });
      setToast("Task created successfully");
      setIsNewTaskOpen(false);
      setNewTaskTitle(""); setNewTaskPriority("medium"); setNewTaskDesc(""); setNewTaskDueDate("");
      await reloadBoard();
    } catch { setToast("Failed to create task"); }
    finally { setCreatingTask(false); }
  };

  // ── Project card (shared between overview + projects tabs) ─────────────────
  const ProjectCard = ({ p }: { p: any }) => (
    <div key={p.id} className="rounded-xl border bg-white p-5 shadow-sm border-slate-200">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3
            onClick={() => navigate(`/projects/${p.id}`)}
            className="truncate cursor-pointer text-[15px] font-semibold text-slate-950 hover:text-blue-600 hover:underline">
            {p.name}
          </h3>
          <p className="mt-0.5 truncate text-[12px] text-slate-500">{p.description || "—"}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${statusColor(p.status)}`}>{p.status}</span>
          {p.priority && <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${priorityColor(p.priority)}`}>{p.priority}</span>}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${p.progress || 0}%` }} />
        </div>
        <span className="text-[12px] font-semibold text-slate-600">{p.progress || 0}%</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
        <div><p className="text-slate-500">Tasks</p><p className="font-semibold text-slate-900">{p.completed_task_count || 0}/{p.task_count || 0}</p></div>
        <div>
          <p className="text-slate-500">Deadline</p>
          <p className="font-semibold text-slate-900">
            {p.end_date ? new Date(p.end_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
          </p>
        </div>
      </div>
      {(p.project_members || []).length > 0 ? (
        <div className="mt-3 flex -space-x-1">
          {(p.project_members as any[]).slice(0, 4).map((m: any) => (
            <span key={m.id} title={m.employee?.name} className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 ring-2 ring-white">
              {(m.employee?.name || "?")[0]}
            </span>
          ))}
          {(p.project_members as any[]).length > 4 && (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 ring-2 ring-white">
              +{(p.project_members as any[]).length - 4}
            </span>
          )}
        </div>
      ) : p.member_count > 0 ? (
        <p className="mt-3 text-[12px] text-slate-500">{p.member_count} member{p.member_count !== 1 ? "s" : ""}</p>
      ) : null}
      <div className="mt-3">
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.id}`); }}
          className="w-full rounded-lg border border-blue-200 bg-blue-50 py-1.5 text-[12px] font-semibold text-blue-700 hover:bg-blue-100">
          View Details
        </button>
      </div>
    </div>
  );

  // ── Board task card ─────────────────────────────────────────────────────────
  const BoardTaskCard = ({ task }: { task: any }) => (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 cursor-pointer flex-1" onClick={() => setDetailTaskId(task.id)}>
          <p className="truncate text-[13px] font-semibold text-slate-950 hover:text-blue-700">{task.title}</p>
          <p className="mt-0.5 truncate text-[12px] text-slate-500">{task.project_name}</p>
        </div>
        <MoreVertical className="h-4 w-4 shrink-0 text-slate-400" />
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
          {(user?.name || "?")[0]}
        </span>
        <span>{task.due_date ?? "—"}</span>
        <span className={`rounded px-2 py-0.5 font-semibold ${priorityClass[task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)] ?? "bg-slate-100 text-slate-600"}`}>
          {task.priority}
        </span>
      </div>
      <select
        value={task.status}
        disabled={updatingTask === task.id}
        onChange={async (e) => {
          const s = e.target.value;
          setUpdatingTask(task.id);
          try { await taskAPI.updateStatus(task.id, s); await reloadBoard(); setToast("Task updated"); }
          catch { setToast("Failed to update task"); }
          finally { setUpdatingTask(null); }
        }}
        className="mt-2 w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700"
      >
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="review">Review</option>
        <option value="done">Done</option>
      </select>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-[#f8fafc]">
      {detailTaskId && <TaskDetailDrawer taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">{toast}</div>
      )}

      {/* New Task Modal */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">Create New Task</h2>
              <button type="button" onClick={() => setIsNewTaskOpen(false)} className="text-slate-500 hover:text-slate-900">Cancel</button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Title</label>
                <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500" placeholder="Task title" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Project</label>
                <select value={newTaskProjectId} onChange={e => setNewTaskProjectId(e.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                  <option value="">Select a project</option>
                  {projectsData.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                <textarea value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} rows={2} className="w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Priority</label>
                <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Due Date</label>
                <input type="date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsNewTaskOpen(false)} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={creatingTask} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{creatingTask ? "Creating..." : "Create Task"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="w-full p-4 lg:p-5">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-slate-950">Projects</h1>
            <p className="mt-1 text-[13px] text-slate-500">Dashboard &gt; Projects</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-auto sm:min-w-[320px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-16 text-[13px] outline-none focus:border-blue-500" placeholder="Search projects, tasks..." />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">Ctrl + K</span>
            </div>
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700">
              <option value="active">Active Projects</option>
              <option value="all">All Projects</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
            <button onClick={() => setIsNewTaskOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-[13px] font-semibold text-white">
              <Plus className="h-4 w-4" /> New
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <nav className="flex gap-8 overflow-x-auto border-b border-slate-200 text-[13px] font-medium text-slate-600">
          {([["Overview","overview"],["My Tasks","tasks"],["My Projects","projects"],["Timesheet","timesheet"],["Calendar","calendar"],["Reports","reports"]] as [string,string][]).map(([label,key]) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`shrink-0 border-b-2 py-4 ${activeTab === key ? "border-blue-600 text-blue-700" : "border-transparent hover:text-slate-950"}`}>
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <main className="space-y-3">

            {/* ── OVERVIEW ── */}
            {activeTab === "overview" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {stats.map(stat => {
                    const Icon = stat.icon;
                    return (
                      <Panel key={stat.label} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-md ${stat.bg} ${stat.color}`}><Icon className="h-5 w-5" /></div>
                          <div>
                            <p className="text-[13px] text-slate-500">{stat.label}</p>
                            <p className="mt-1 text-[24px] font-semibold leading-none text-slate-950">
                              {stat.label === "Active Projects"     ? (statsData?.active_projects    ?? "—")
                               : stat.label === "Pending Tasks"     ? (statsData?.pending_tasks      ?? "—")
                               : stat.label === "Completed Tasks"   ? (statsData?.completed_tasks    ?? "—")
                               : stat.label === "Upcoming Deadlines"? (statsData?.upcoming_deadlines ?? "—")
                               : statsData?.logged_hours != null    ? `${statsData.logged_hours}h`   : "—"}
                            </p>
                            <p className="mt-3 text-[12px] font-semibold text-blue-700">{stat.hint}</p>
                          </div>
                        </div>
                      </Panel>
                    );
                  })}
                </div>

                <Panel className="p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[16px] font-semibold text-slate-950">Assigned Projects</h2>
                    <button onClick={() => setActiveTab("projects")} className="text-[12px] font-semibold text-blue-700">View All Projects</button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                    {loading ? (
                      <div className="col-span-4 py-8 text-center text-[13px] text-slate-400">Loading projects…</div>
                    ) : filteredProjects.length === 0 ? (
                      <div className="col-span-4 py-8 text-center text-[13px] text-slate-500">No projects assigned yet. Your manager will assign projects here.</div>
                    ) : filteredProjects.map((p: any) => <ProjectCard key={p.id} p={p} />)}
                  </div>
                </Panel>

                <Panel className="p-4">
                  <div className="flex gap-8 overflow-x-auto border-b border-slate-200 text-[13px] font-medium text-slate-600">
                    {([["Task Board","board"],["My Tasks","my"],["All Tasks","all"],["Blocked Tasks","blocked"]] as [string,string][]).map(([label,key]) => (
                      <button key={key} onClick={() => setBoardTab(key)} className={`shrink-0 border-b-2 pb-3 ${boardTab === key ? "border-blue-600 text-blue-700" : "border-transparent"}`}>{label}</button>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
                    {boardColumns.map(column => (
                      <div key={column.key} className="rounded-lg bg-slate-50 p-2">
                        <div className={`flex items-center justify-between rounded-md px-3 py-2 ${column.tone}`}>
                          <h3 className="text-[13px] font-semibold text-slate-800">{column.title}</h3>
                          <span className="text-[12px] text-slate-500">{column.tasks.length}</span>
                        </div>
                        <div className="mt-2 space-y-2">
                          {column.tasks.length === 0 ? (
                            <p className="py-4 text-center text-[12px] text-slate-400">No tasks in this stage</p>
                          ) : column.tasks.map((task: any) => <BoardTaskCard key={task.id} task={task} />)}
                          <button onClick={() => setIsNewTaskOpen(true)} className="px-2 py-1 text-[12px] font-semibold text-blue-700">+ Add Task</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>

                <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
                  <Panel className="p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[16px] font-semibold text-slate-950">Project Progress</h2>
                    </div>
                    <div className="mt-4 space-y-3">
                      {projectsData.length === 0 ? (
                        <p className="py-4 text-center text-[12px] text-slate-400">No projects yet</p>
                      ) : projectsData.map((p: any) => (
                        <div key={`progress-${p.id}`} className="grid grid-cols-[130px_1fr_42px] items-center gap-3 text-[12px]">
                          <span className="truncate text-slate-700">{p.name}</span>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${p.progress || 0}%` }} /></div>
                          <span className="font-semibold text-slate-600">{p.progress || 0}%</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                  <Panel className="p-4">
                    <h2 className="text-[16px] font-semibold text-slate-950">Workload Overview</h2>
                    <div className="mt-4 space-y-3">
                      {projectsData.slice(0, 5).map((p: any, idx: number) => {
                        const colors = ["#7c3aed","#60a5fa","#22c55e","#f59e0b","#f97316"];
                        return (
                          <div key={`workload-${p.id}`} className="flex items-center gap-3 text-[12px]">
                            <span className="flex min-w-0 items-center gap-2 text-slate-600">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[idx] }} />
                              <span className="truncate">{p.name}</span>
                            </span>
                            <span className="ml-auto shrink-0 font-semibold text-slate-800">{p.progress || 0}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                </div>
              </>
            )}

            {/* ── MY TASKS (board) ── */}
            {activeTab === "tasks" && (
              <>
                <Panel className="p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[16px] font-semibold text-slate-950">My Task Board</h2>
                  </div>
                  <div className="mt-4">
                    <div className="flex gap-8 overflow-x-auto border-b border-slate-200 text-[13px] font-medium text-slate-600">
                      {([["Task Board","board"],["My Tasks","my"],["All Tasks","all"],["Blocked Tasks","blocked"]] as [string,string][]).map(([label,key]) => (
                        <button key={key} onClick={() => setBoardTab(key)} className={`shrink-0 border-b-2 pb-3 ${boardTab === key ? "border-blue-600 text-blue-700" : "border-transparent"}`}>{label}</button>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
                      {taskBoardColumns.map(column => (
                        <div key={column.key} className="rounded-lg bg-slate-50 p-2">
                          <div className={`flex items-center justify-between rounded-md px-3 py-2 ${column.tone}`}>
                            <h3 className="text-[13px] font-semibold text-slate-800">{column.title}</h3>
                            <span className="text-[12px] text-slate-500">{column.tasks.length}</span>
                          </div>
                          <div className="mt-2 space-y-2">
                            {column.tasks.length === 0 ? (
                              <p className="py-4 text-center text-[12px] text-slate-400">No tasks in this stage</p>
                            ) : column.tasks.map((task: any) => <BoardTaskCard key={task.id} task={task} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Panel>
                <Panel className="p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[16px] font-semibold text-slate-950">Upcoming Deadlines</h2>
                    <button onClick={() => setActiveTab("calendar")} className="text-[12px] font-semibold text-blue-700">Go to Calendar</button>
                  </div>
                  <div className="mt-4 space-y-4">
                    {deadlinesData.length === 0 ? (
                      <p className="py-4 text-center text-[12px] text-slate-400">No upcoming deadlines this week</p>
                    ) : deadlinesData.map((d: any) => {
                      const tone = d.days_left <= 2 ? "text-red-600" : d.days_left <= 5 ? "text-amber-600" : "text-emerald-600";
                      const bg   = d.days_left <= 2 ? "bg-red-50"   : d.days_left <= 5 ? "bg-amber-50"   : "bg-emerald-50";
                      return (
                        <div key={d.id} className="flex gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-md ${bg} ${tone}`}><CalendarClock className="h-5 w-5" /></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-slate-950">{d.title} <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-blue-700">{d.project_name}</span></p>
                            <p className="mt-1 text-[12px] text-slate-500">Due: {d.due_date}</p>
                          </div>
                          <span className={`shrink-0 text-[11px] font-semibold ${tone}`}>{d.days_left}d left</span>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </>
            )}

            {/* ── MY PROJECTS tab ── */}
            {activeTab === "projects" && (
              <>
                <Panel className="p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[16px] font-semibold text-slate-950">Assigned Projects</h2>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                    {loading ? (
                      <div className="col-span-4 py-8 text-center text-[13px] text-slate-400">Loading projects…</div>
                    ) : filteredProjects.length === 0 ? (
                      <div className="col-span-4 py-8 text-center text-[13px] text-slate-500">No projects assigned yet.</div>
                    ) : filteredProjects.map((p: any) => <ProjectCard key={p.id} p={p} />)}
                  </div>
                </Panel>
                <Panel className="p-4">
                  <h2 className="text-[16px] font-semibold text-slate-950">Project Progress</h2>
                  <div className="mt-4 space-y-3">
                    {projectsData.length === 0 ? (
                      <p className="py-4 text-center text-[12px] text-slate-400">No projects yet</p>
                    ) : projectsData.map((p: any) => (
                      <div key={`progress2-${p.id}`} className="grid grid-cols-[130px_1fr_42px] items-center gap-3 text-[12px]">
                        <span className="truncate text-slate-700">{p.name}</span>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${p.progress || 0}%` }} /></div>
                        <span className="font-semibold text-slate-600">{p.progress || 0}%</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </>
            )}

            {/* ── TIMESHEET ── */}
            {activeTab === "timesheet" && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <Panel className="p-4"><p className="text-[12px] text-slate-500">This Week Hours</p><p className="mt-2 text-[24px] font-semibold text-slate-950">{timesheetData?.total_hours != null ? `${timesheetData.total_hours}h` : "—"}</p></Panel>
                  <Panel className="p-4"><p className="text-[12px] text-slate-500">Status</p><p className="mt-2 text-[20px] font-semibold text-slate-950 capitalize">{timesheetData?.status ?? "—"}</p></Panel>
                  <Panel className="p-4"><p className="text-[12px] text-slate-500">Avg Daily Hours</p><p className="mt-2 text-[24px] font-semibold text-slate-950">{timesheetData?.total_hours != null ? `${(timesheetData.total_hours / 5).toFixed(1)}h` : "—"}</p></Panel>
                  <Panel className="p-4"><p className="text-[12px] text-slate-500">Pending Tasks</p><p className="mt-2 text-[24px] font-semibold text-slate-950">{statsData?.pending_tasks ?? "—"}</p></Panel>
                </div>

                <Panel className="p-4">
                  <h2 className="text-[16px] font-semibold text-slate-950">This Week's Log</h2>
                  {!timesheetData?.days || timesheetData.days.length === 0 ? (
                    <p className="mt-4 text-[13px] text-slate-400">
                      No timesheet entries for this week yet.
                      <button onClick={() => navigate("/timesheet")} className="ml-2 text-blue-600 underline">Go to Timesheet</button>
                    </p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-[13px]">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr><th className="px-4 py-3 text-left">Day</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Hours</th><th className="px-4 py-3 text-left">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {timesheetData.days.map((d: any) => (
                            <tr key={d.date}>
                              <td className="px-4 py-3 font-medium">{d.day}</td>
                              <td className="px-4 py-3 text-slate-600">{d.date}</td>
                              <td className="px-4 py-3 font-bold">{d.hours > 0 ? `${d.hours}h` : "—"}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${d.hours >= 9 ? "bg-emerald-50 text-emerald-700" : d.hours > 0 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                                  {d.hours >= 9 ? "Full Day" : d.hours > 0 ? "Partial" : "No Entry"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => navigate("/timesheet")} className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700">Go to Full Timesheet</button>
                  </div>
                </Panel>

                <Panel className="p-4">
                  <h2 className="text-[16px] font-semibold text-slate-950">Time by Project</h2>
                  <div className="mt-4 space-y-3">
                    {projectsData.length === 0 ? <p className="text-[12px] text-slate-400">No project data</p>
                    : projectsData.map((p: any, idx: number) => {
                      const colors = ["bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500","bg-rose-500"];
                      return (
                        <div key={p.id} className="flex items-center gap-3 text-[12px]">
                          <span className="w-32 truncate text-slate-600">{p.name}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${colors[idx % colors.length]}`} style={{ width: `${p.progress || 0}%` }} />
                          </div>
                          <span className="w-10 text-right font-semibold text-slate-700">{p.progress || 0}%</span>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </div>
            )}

            {/* ── CALENDAR ── */}
            {activeTab === "calendar" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
                    <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{MONTHS[calMonth]} {calYear}</p>
                      <p className="text-[12px] text-slate-500">Task calendar</p>
                    </div>
                  </div>
                  <button onClick={() => { setCalMonth(new Date().getMonth()); setCalYear(new Date().getFullYear()); }} className="rounded-full border border-slate-200 bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-blue-700">Today</button>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-1 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-500 sm:grid-cols-7">
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="py-2">{d}</div>)}
                  </div>
                  <div className="mt-2 grid gap-1 sm:grid-cols-7">
                    {calendarCells.map((cell, idx) => {
                      const dayTasks = cell.dateStr ? (tasksByDate.get(cell.dateStr) ?? []) : [];
                      const isToday  = cell.dateStr === todayStr;
                      return (
                        <div key={`${cell.dateStr}-${idx}`} className={`min-h-[90px] rounded-lg border p-2 ${!cell.isCurrentMonth ? "border-transparent bg-slate-50/60" : "border-slate-200 bg-slate-50"}`}>
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday ? "bg-blue-600 text-white" : !cell.isCurrentMonth ? "text-slate-400" : "text-slate-950"}`}>
                            {cell.day || ""}
                          </span>
                          {dayTasks.slice(0, 2).map((t: any) => (
                            <div key={t.id} className={`mt-1 truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${t.priority === "high" ? "bg-red-100 text-red-700" : t.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {t.title}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── REPORTS ── */}
            {activeTab === "reports" && (
              <div className="space-y-4">
                {/* Stat cards */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Panel className="p-4"><p className="text-[12px] text-slate-500">Active Projects</p><p className="mt-2 text-[28px] font-semibold text-slate-950">{statsData?.active_projects ?? "—"}</p></Panel>
                  <Panel className="p-4"><p className="text-[12px] text-slate-500">Pending Tasks</p><p className="mt-2 text-[28px] font-semibold text-slate-950">{statsData?.pending_tasks ?? "—"}</p></Panel>
                  <Panel className="p-4"><p className="text-[12px] text-slate-500">Completed Tasks</p><p className="mt-2 text-[28px] font-semibold text-slate-950">{statsData?.completed_tasks ?? "—"}</p></Panel>
                  <Panel className="p-4"><p className="text-[12px] text-slate-500">Upcoming Deadlines</p><p className="mt-2 text-[28px] font-semibold text-slate-950">{statsData?.upcoming_deadlines ?? "—"}</p></Panel>
                </div>

                {/* Charts */}
                <div className="grid gap-4 xl:grid-cols-2">
                  <Panel className="p-4">
                    <h3 className="text-[14px] font-semibold text-slate-950">Task Completion Rate</h3>
                    <div className="mt-4 flex items-center gap-6">
                      <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#10b981 0 ${reportPct}%, #e2e8f0 ${reportPct}% 100%)` }}>
                        <div className="grid h-20 w-20 place-items-center rounded-full bg-white">
                          <div className="text-center"><p className="text-[20px] font-semibold text-slate-950">{reportPct}%</p><p className="text-[10px] text-slate-500">Complete</p></div>
                        </div>
                      </div>
                      <div className="space-y-2 text-[12px]">
                        {[["Done", reportDone, "bg-emerald-500"], ["In Progress", (boardData.in_progress || []).length, "bg-blue-500"], ["To Do", (boardData.todo || []).length, "bg-slate-400"], ["Review", (boardData.review || []).length, "bg-violet-500"]] .map(([label, count, color]) => (
                          <div key={String(label)} className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                            <span className="text-slate-700">{label}: {count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Panel>

                  <Panel className="p-4">
                    <h3 className="text-[14px] font-semibold text-slate-950">Tasks by Priority</h3>
                    <div className="mt-4 space-y-3 text-[12px]">
                      {[["High", highCount, highPct, "bg-red-500"], ["Medium", medCount, medPct, "bg-amber-500"], ["Low", lowCount, lowPct, "bg-emerald-500"]].map(([label, count, pct, color]) => (
                        <div key={String(label)} className="flex items-center gap-3">
                          <span className="w-14 text-slate-600">{label}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-14 text-right font-semibold text-slate-700">{count} ({pct}%)</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>

                {/* Project progress */}
                <Panel className="p-4">
                  <h3 className="text-[14px] font-semibold text-slate-950">Project Progress</h3>
                  <div className="mt-4 space-y-3">
                    {projectsData.length === 0 ? <p className="text-[12px] text-slate-400">No projects yet</p>
                    : projectsData.map((p: any) => (
                      <div key={`rpt-${p.id}`} className="grid grid-cols-[130px_1fr_42px] items-center gap-3 text-[12px]">
                        <span className="truncate text-slate-700">{p.name}</span>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${p.progress || 0}%` }} /></div>
                        <span className="font-semibold text-slate-600">{p.progress || 0}%</span>
                      </div>
                    ))}
                  </div>
                </Panel>

                {/* My Contributions */}
                <Panel className="p-4">
                  <h3 className="text-[14px] font-semibold text-slate-950">My Contributions</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3 text-[12px]">
                    <div className="rounded-lg bg-slate-50 p-3 text-center">
                      <p className="text-[26px] font-semibold text-slate-950">{reportDone}</p>
                      <p className="mt-1 text-slate-500">Tasks Completed</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 text-center">
                      <p className="text-[26px] font-semibold text-slate-950">{statsData?.logged_hours != null ? `${statsData.logged_hours}h` : "—"}</p>
                      <p className="mt-1 text-slate-500">Hours Logged</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 text-center">
                      <p className="text-[26px] font-semibold text-slate-950">{onTimeRate}%</p>
                      <p className="mt-1 text-slate-500">On-Time Rate</p>
                    </div>
                  </div>
                </Panel>
              </div>
            )}

          </main>

          {/* ── Sidebar ── */}
          <aside className="space-y-3">
            <Panel className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-950">Upcoming Deadlines</h2>
                <button onClick={() => setActiveTab("calendar")} className="text-[12px] font-semibold text-blue-700">View All</button>
              </div>
              <div className="mt-4 space-y-4">
                {deadlinesData.length === 0 ? (
                  <p className="py-4 text-center text-[12px] text-slate-400">No upcoming deadlines this week</p>
                ) : deadlinesData.map((d: any) => {
                  const tone = d.days_left <= 2 ? "text-red-600" : d.days_left <= 5 ? "text-amber-600" : "text-emerald-600";
                  const bg   = d.days_left <= 2 ? "bg-red-50"   : d.days_left <= 5 ? "bg-amber-50"   : "bg-emerald-50";
                  return (
                    <div key={d.id} className="flex gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-md ${bg} ${tone}`}><CalendarClock className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-slate-950">{d.title} <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-blue-700">{d.project_name}</span></p>
                        <p className="mt-1 text-[12px] text-slate-500">Due: {d.due_date}</p>
                      </div>
                      <span className={`shrink-0 text-[11px] font-semibold ${tone}`}>{d.days_left}d left</span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-950">My Tasks (Due Today)</h2>
              </div>
              <div className="mt-4 space-y-3">
                {(boardData.todo || []).length === 0 ? (
                  <p className="py-4 text-center text-[12px] text-slate-400">No pending tasks</p>
                ) : (boardData.todo as any[]).slice(0, 3).map((task: any) => {
                  const daysLeft = task.due_date ? Math.ceil((new Date(task.due_date).getTime() - Date.now()) / 86400000) : null;
                  const color = daysLeft !== null && daysLeft <= 2 ? "text-red-600" : daysLeft !== null && daysLeft <= 5 ? "text-amber-600" : "text-slate-500";
                  return (
                    <div key={task.id} className="flex cursor-pointer items-start gap-3" onClick={() => setDetailTaskId(task.id)}>
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-slate-950 hover:text-blue-700">{task.title}</p>
                        <p className="text-[12px] text-slate-500">{task.project_name}</p>
                      </div>
                      <span className={`text-[12px] font-semibold ${color}`}>{task.due_date ?? "—"}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setIsNewTaskOpen(true)} className="mt-4 text-[12px] font-semibold text-blue-700">+ Add Task</button>
            </Panel>

            <Panel className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-950">Project Activity</h2>
              </div>
              <div className="mt-4 space-y-4">
                {(boardData.done as any[] || []).length === 0 ? (
                  <p className="text-[12px] text-slate-400">No recent activity</p>
                ) : (boardData.done as any[]).slice(0, 4).map((task: any) => (
                  <div key={`activity-${task.id}`} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-700">{(task.title?.[0] ?? "T").toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] text-slate-600">Task completed</p>
                      <p className="truncate text-[12px] font-semibold text-slate-900">{task.title}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-500">{task.project_name || "—"}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600"><FileStack className="h-5 w-5" /></div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-950">Shared Files</p>
                  <p className="text-[12px] text-slate-500">Project files & documents</p>
                </div>
              </div>
              <button className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-blue-700">
                <Link2 className="h-3.5 w-3.5" /> Open Drive
              </button>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}
