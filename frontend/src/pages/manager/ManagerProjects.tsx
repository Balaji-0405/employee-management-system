import { useState, useEffect, useCallback } from "react";
import {
  Plus, X, Loader2, Search, LayoutGrid, List,
  FolderKanban, Users, CheckCircle2, CalendarDays,
  Briefcase, MessageSquare, AlertTriangle,
} from "lucide-react";
import { projectAPI, taskAPI } from "../../lib/api";
import { apiFetch } from "../../lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority?: string;
  end_date?: string;
  progress: number;
  task_count: number;
  completed_task_count: number;
  project_members?: { id: string; role: string; employee: { id: string; name: string; department?: string } }[];
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  estimated_hours?: number;
  logged_hours?: number;
  project_id?: string;
  assigned_to?: string;
  project_name?: string;
  assignee_name?: string;
  comment_count?: number;
  is_blocked?: boolean;
  project?: { id: string; name: string };
  assignee?: { id: string; name: string };
  creator?: { id: string; name: string };
  depends_on_task?: { id: string; title: string; status: string };
  task_comments?: { id: string; content: string; created_at: string; author: { id: string; name: string } }[];
  task_time_logs?: { id: string; hours: number; description?: string; logged_date: string; employee: { id: string; name: string } }[];
}

interface Employee { id: string; name: string; department?: string; role?: string }
interface Stats { active_projects: number; pending_tasks: number; completed_tasks: number; upcoming_deadlines: number }

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtRelTime(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUSES = ["todo", "in_progress", "review", "done"] as const;
const STATUS_LABELS: Record<string, string> = { todo: "To Do", in_progress: "In Progress", review: "Review", done: "Done" };
const COL_TONES: Record<string, string> = { todo: "bg-slate-50", in_progress: "bg-blue-50", review: "bg-violet-50", done: "bg-emerald-50" };
const COL_DOTS: Record<string, string> = { todo: "bg-slate-400", in_progress: "bg-blue-500", review: "bg-violet-500", done: "bg-emerald-500" };

function priorityColor(p: string) {
  if (p === "critical") return "bg-red-50 text-red-700";
  if (p === "high")     return "bg-orange-50 text-orange-700";
  if (p === "medium")   return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function statusColor(s: string) {
  if (s === "active")    return "bg-emerald-50 text-emerald-700";
  if (s === "completed") return "bg-blue-50 text-blue-700";
  if (s === "on_hold")   return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  const isErr = msg.toLowerCase().startsWith("error") || msg.toLowerCase().includes("failed");
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${isErr ? "bg-red-600" : "bg-slate-950"}`}>
      {msg}<button onClick={onClose}><X className="h-4 w-4" /></button>
    </div>
  );
}

// ── Task Detail Drawer (manager — no delete) ───────────────────────────────────

function TaskDetailDrawer({ taskId, onClose, onReload }: {
  taskId: string; onClose: () => void; onReload: () => void;
}) {
  const [task, setTask] = useState<Task | null>(null);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [logHours, setLogHours] = useState("");
  const [logDesc, setLogDesc] = useState("");
  const [logging, setLogging] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try { setTask(await taskAPI.getDetail(taskId) as Task); } catch { /* noop */ }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3500); return () => clearTimeout(t); }, [toast]);

  const postComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await taskAPI.addComment(taskId, comment.trim());
      setComment(""); await load(); onReload();
    } catch (e: any) { setToast("Error: " + e.message); }
    finally { setPosting(false); }
  };

  const logTime = async () => {
    if (!logHours || Number(logHours) <= 0) return;
    setLogging(true);
    try {
      await taskAPI.logTime(taskId, { hours: Number(logHours), description: logDesc || undefined });
      setLogHours(""); setLogDesc(""); await load(); onReload(); setToast("Time logged");
    } catch (e: any) { setToast("Error: " + e.message); }
    finally { setLogging(false); }
  };

  if (!task) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-slate-900/40" onClick={onClose} />
        <aside className="flex h-full w-full max-w-md items-center justify-center bg-white shadow-2xl">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </aside>
      </div>
    );
  }

  const totalLogged = (task.task_time_logs || []).reduce((s, l) => s + Number(l.hours), 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-slate-900/40" onClick={onClose} />
      <aside className="flex h-full w-full max-w-[480px] flex-col overflow-y-auto bg-white shadow-2xl">
        {toast && <Toast msg={toast} onClose={() => setToast("")} />}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${statusColor(task.status)}`}>{STATUS_LABELS[task.status] || task.status}</span>
                <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${priorityColor(task.priority)}`}>{task.priority}</span>
              </div>
              <h2 className="mt-2 text-[16px] font-semibold text-slate-950">{task.title}</h2>
              {task.project && <p className="mt-1 text-[12px] text-blue-700">{task.project.name}</p>}
            </div>
            <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
          </div>
        </div>

        <div className="flex-1 space-y-5 p-5">
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div><p className="font-semibold text-slate-500">Assignee</p><p className="mt-1 text-slate-900">{task.assignee?.name || task.assignee_name || "—"}</p></div>
            <div><p className="font-semibold text-slate-500">Reporter</p><p className="mt-1 text-slate-900">{task.creator?.name || "—"}</p></div>
            <div><p className="font-semibold text-slate-500">Due Date</p><p className="mt-1 text-slate-900">{fmtDate(task.due_date)}</p></div>
            <div><p className="font-semibold text-slate-500">Est. Hours</p><p className="mt-1 text-slate-900">{task.estimated_hours || "—"}</p></div>
            <div><p className="font-semibold text-slate-500">Logged</p><p className="mt-1 text-slate-900">{totalLogged.toFixed(1)}h</p></div>
          </div>

          {task.description && (
            <div>
              <p className="mb-1 text-[12px] font-semibold text-slate-500">Description</p>
              <p className="text-[13px] text-slate-700">{task.description}</p>
            </div>
          )}

          {task.depends_on_task && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-[12px] font-semibold text-amber-800">Blocked by: {task.depends_on_task.title}</p>
              <p className="mt-0.5 text-[11px] text-amber-700">Status: {task.depends_on_task.status}</p>
            </div>
          )}

          <div>
            <p className="mb-3 text-[13px] font-semibold text-slate-900">Time Log ({totalLogged.toFixed(1)}h total)</p>
            {(task.task_time_logs || []).length === 0 ? (
              <p className="text-[12px] text-slate-400">No time logged yet</p>
            ) : (task.task_time_logs || []).map(l => (
              <div key={l.id} className="mb-2 flex items-start justify-between gap-2 text-[12px]">
                <div><span className="font-semibold text-slate-900">{l.employee.name}</span>{l.description && <span className="ml-1 text-slate-500">— {l.description}</span>}<p className="text-slate-400">{fmtDate(l.logged_date)}</p></div>
                <span className="shrink-0 font-semibold text-blue-700">{Number(l.hours).toFixed(1)}h</span>
              </div>
            ))}
            <div className="mt-3 flex gap-2">
              <input type="number" value={logHours} onChange={e => setLogHours(e.target.value)} placeholder="Hours" className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-[12px] outline-none focus:border-blue-500" />
              <input value={logDesc} onChange={e => setLogDesc(e.target.value)} placeholder="Description" className="h-9 flex-1 rounded-lg border border-slate-200 px-2 text-[12px] outline-none focus:border-blue-500" />
              <button onClick={logTime} disabled={logging || !logHours} className="rounded-lg bg-blue-600 px-3 text-[12px] font-semibold text-white disabled:opacity-50">{logging ? "..." : "Log"}</button>
            </div>
          </div>

          <div>
            <p className="mb-3 text-[13px] font-semibold text-slate-900">Comments ({(task.task_comments || []).length})</p>
            {(task.task_comments || []).length === 0 ? (
              <p className="text-[12px] text-slate-400">No comments yet</p>
            ) : (task.task_comments || []).map(c => (
              <div key={c.id} className="mb-3 flex gap-2">
                <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">{c.author.name[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="font-semibold text-slate-900">{c.author.name}</span>
                    <span className="text-slate-400">{fmtRelTime(c.created_at)}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-slate-700">{c.content}</p>
                </div>
              </div>
            ))}
            <div className="mt-3 flex gap-2">
              <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === "Enter" && postComment()} placeholder="Add a comment..." className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
              <button onClick={postComment} disabled={posting || !comment.trim()} className="rounded-lg bg-blue-600 px-3 text-[12px] font-semibold text-white disabled:opacity-50">{posting ? "..." : "Post"}</button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ── Create Task Modal ──────────────────────────────────────────────────────────

function CreateTaskModal({ projects, defaultProjectId, onClose, onSave }: {
  projects: Project[]; defaultProjectId: string;
  onClose: () => void; onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({ title: "", description: "", project_id: defaultProjectId, assigned_to: "", priority: "medium", status: "todo", due_date: "", estimated_hours: "" });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!form.project_id) { setEmployees([]); return; }
    projectAPI.getDetail(form.project_id)
      .then((p: any) => setEmployees((p.project_members || []).map((m: any) => m.employee)))
      .catch(() => setEmployees([]));
  }, [form.project_id]);

  const submit = async () => {
    if (!form.title.trim()) { setErr("Title is required"); return; }
    setSaving(true); setErr("");
    try {
      await onSave({
        title: form.title.trim(),
        description: form.description || undefined,
        project_id: form.project_id || undefined,
        assigned_to: form.assigned_to || undefined,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date || undefined,
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : undefined,
      });
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-[17px] font-semibold text-slate-950">New Task</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" placeholder="Task title" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Project</label>
              <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value, assigned_to: "" }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Assign To</label>
              <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
                <option value="">Unassigned</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
                {["low","medium","high","critical"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Est. Hours</label>
              <input type="number" value={form.estimated_hours} onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" placeholder="0" />
            </div>
          </div>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600">{err}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Creating..." : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ManagerProjects() {
  const [mainTab, setMainTab] = useState<"projects" | "tasks">("projects");

  // My Projects data
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Add Member panel
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [addingMember, setAddingMember] = useState(false);

  // Team Tasks data
  const [taskProjectFilter, setTaskProjectFilter] = useState<string>("");
  const [taskView, setTaskView] = useState<"board" | "list">("board");
  const [groupedTasks, setGroupedTasks] = useState<Record<string, Task[]>>({ todo: [], in_progress: [], review: [], done: [] });
  const [listTasks, setListTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Modals
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState("");

  // ── Load project data ──────────────────────────────────────────────────────

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const [projRes, statsRes, empRes] = await Promise.allSettled([
        projectAPI.getForRole(),
        projectAPI.getStats(),
        apiFetch("/employees"),
      ]);
      if (projRes.status === "fulfilled") setProjects(Array.isArray(projRes.value) ? (projRes.value as Project[]) : []);
      if (statsRes.status === "fulfilled") setStats(statsRes.value as Stats);
      if (empRes.status === "fulfilled") setAllEmployees(Array.isArray(empRes.value) ? (empRes.value as Employee[]) : []);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3500); return () => clearTimeout(t); }, [toast]);

  // ── Load team tasks ────────────────────────────────────────────────────────

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const [grouped, list] = await Promise.allSettled([
        taskAPI.getTeamGrouped(taskProjectFilter || undefined),
        taskAPI.getTeam(taskProjectFilter ? { project_id: taskProjectFilter } : undefined),
      ]);
      if (grouped.status === "fulfilled") {
        const g = grouped.value as any;
        setGroupedTasks({ todo: g?.todo || [], in_progress: g?.in_progress || [], review: g?.review || [], done: g?.done || [] });
      }
      if (list.status === "fulfilled") setListTasks(Array.isArray(list.value) ? (list.value as Task[]) : []);
    } finally {
      setLoadingTasks(false);
    }
  }, [taskProjectFilter]);

  useEffect(() => { if (mainTab === "tasks") loadTasks(); }, [mainTab, loadTasks]);

  // ── Add member ─────────────────────────────────────────────────────────────

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const existingMemberIds = new Set((selectedProject?.project_members || []).map(m => m.employee.id));
  const filteredEmployees = allEmployees.filter(e =>
    !existingMemberIds.has(e.id) &&
    (addMemberSearch === "" || e.name.toLowerCase().includes(addMemberSearch.toLowerCase()))
  );

  const handleAddMember = async (employeeId: string) => {
    if (!selectedProjectId) return;
    setAddingMember(true);
    try {
      await projectAPI.addMember(selectedProjectId, { employee_id: employeeId, role: "member" });
      setToast("Member added");
      await loadProjects();
    } catch (e: any) {
      setToast("Error: " + e.message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedProjectId) return;
    try {
      await projectAPI.removeMember(selectedProjectId, memberId);
      setToast("Member removed");
      await loadProjects();
    } catch (e: any) {
      setToast("Error: " + e.message);
    }
  };

  // ── Task status change ─────────────────────────────────────────────────────

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const task = [...groupedTasks.todo, ...groupedTasks.in_progress, ...groupedTasks.review, ...groupedTasks.done]
      .find(t => t.id === taskId);
    setUpdatingTask(taskId);
    try {
      await taskAPI.updateStatus(taskId, newStatus);
      if (task?.project_id) await projectAPI.updateProgress(task.project_id);
      await loadTasks();
      setToast("Task status updated");
    } catch (e: any) {
      setToast("Error: " + e.message);
    } finally {
      setUpdatingTask(null);
    }
  };

  // ── Create task ────────────────────────────────────────────────────────────

  const handleCreateTask = async (data: Record<string, unknown>) => {
    await taskAPI.create(data);
    setToast("Task created");
    setShowCreateTask(false);
    if (data.project_id) await projectAPI.updateProgress(data.project_id as string);
    await loadTasks();
  };

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-[#f8fbff]">
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
      {showCreateTask && (
        <CreateTaskModal projects={projects} defaultProjectId={taskProjectFilter}
          onClose={() => setShowCreateTask(false)} onSave={handleCreateTask} />
      )}
      {detailTaskId && (
        <TaskDetailDrawer taskId={detailTaskId} onClose={() => setDetailTaskId(null)} onReload={loadTasks} />
      )}

      <div className="px-5 py-5">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-[1.75rem] font-bold text-slate-950">Projects</h1>
            <p className="mt-1 text-sm text-slate-500">Track and manage your team projects</p>
          </div>
        </div>

        {/* Main tabs */}
        <div className="mb-5 flex gap-1 border-b border-slate-200">
          {(["projects", "tasks"] as const).map(tab => (
            <button key={tab} onClick={() => setMainTab(tab)}
              className={`px-4 py-2.5 text-[13px] font-semibold capitalize transition ${mainTab === tab ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-600 hover:text-slate-950"}`}>
              {tab === "projects" ? "My Projects" : "Team Tasks"}
            </button>
          ))}
        </div>

        {/* ── MY PROJECTS TAB ─────────────────────────────────────────────── */}
        {mainTab === "projects" && (
          <div className="space-y-5">
            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Active Projects", value: stats?.active_projects ?? "—", icon: Briefcase, color: "bg-violet-50 text-violet-600" },
                { label: "Total Tasks", value: stats ? stats.pending_tasks + stats.completed_tasks : "—", icon: CheckCircle2, color: "bg-blue-50 text-blue-600" },
                { label: "Completed Tasks", value: stats?.completed_tasks ?? "—", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
                { label: "Upcoming Deadlines", value: stats?.upcoming_deadlines ?? "—", icon: CalendarDays, color: "bg-amber-50 text-amber-600" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-[26px] font-semibold text-slate-950">{loadingProjects ? "—" : s.value}</p>
                  <p className="mt-1 text-[13px] text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Project cards */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {loadingProjects ? (
                [1,2,3].map(i => <div key={i} className="h-52 animate-pulse rounded-xl bg-slate-100" />)
              ) : projects.length === 0 ? (
                <div className="col-span-3 rounded-xl border border-dashed border-slate-200 py-12 text-center">
                  <FolderKanban className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-[13px] text-slate-500">No projects assigned yet</p>
                </div>
              ) : projects.map(p => (
                <div key={p.id} className={`rounded-xl border bg-white p-5 shadow-sm transition ${selectedProjectId === p.id ? "border-blue-400" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px] font-semibold text-slate-950">{p.name}</h3>
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
                    <div><p className="text-slate-500">Deadline</p><p className="font-semibold text-slate-900">{fmtDate(p.end_date)}</p></div>
                    <div><p className="text-slate-500">Members</p>
                      <div className="mt-0.5 flex -space-x-1">
                        {(p.project_members || []).slice(0, 4).map(m => (
                          <span key={m.id} title={m.employee.name} className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 ring-2 ring-white">{m.employee.name[0]}</span>
                        ))}
                        {(p.project_members || []).length > 4 && (
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 ring-2 ring-white">+{(p.project_members || []).length - 4}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => { setTaskProjectFilter(p.id); setMainTab("tasks"); }}
                      className="flex-1 rounded-lg border border-blue-200 bg-blue-50 py-1.5 text-[12px] font-semibold text-blue-700 hover:bg-blue-100">
                      View Tasks
                    </button>
                    <button onClick={() => setSelectedProjectId(selectedProjectId === p.id ? "" : p.id)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                      <Users className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Member panel */}
            {selectedProject && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-semibold text-slate-950">Team Members — {selectedProject.name}</h2>
                  <button onClick={() => setSelectedProjectId("")}><X className="h-4 w-4 text-slate-400" /></button>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-3 text-[12px] font-semibold text-slate-600">Current Members</p>
                    {(selectedProject.project_members || []).length === 0 ? (
                      <p className="text-[12px] text-slate-400">No members yet</p>
                    ) : (selectedProject.project_members || []).map(m => (
                      <div key={m.id} className="mb-2 flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">{m.employee.name[0]}</span>
                          <div>
                            <p className="text-[13px] font-medium text-slate-900">{m.employee.name}</p>
                            <p className="text-[11px] text-slate-500">{m.employee.department || "—"} · {m.role}</p>
                          </div>
                        </div>
                        <button onClick={() => handleRemoveMember(m.id)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="mb-2 text-[12px] font-semibold text-slate-600">Add Member</p>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input value={addMemberSearch} onChange={e => setAddMemberSearch(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-[12px] outline-none focus:border-blue-500" placeholder="Search employees..." />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredEmployees.length === 0 ? (
                        <p className="text-[12px] text-slate-400">No employees available</p>
                      ) : filteredEmployees.map(e => (
                        <div key={e.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-50">
                          <div>
                            <p className="text-[13px] font-medium text-slate-900">{e.name}</p>
                            <p className="text-[11px] text-slate-500">{e.department || "—"}</p>
                          </div>
                          <button onClick={() => handleAddMember(e.id)} disabled={addingMember} className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50">Add</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TEAM TASKS TAB ──────────────────────────────────────────────── */}
        {mainTab === "tasks" && (
          <div className="space-y-4">
            {/* Controls bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <select value={taskProjectFilter} onChange={e => setTaskProjectFilter(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-blue-500">
                  <option value="">All Projects</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="flex gap-1">
                  <button onClick={() => setTaskView("board")} className={`grid h-8 w-8 place-items-center rounded-lg border ${taskView === "board" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}><LayoutGrid className="h-4 w-4" /></button>
                  <button onClick={() => setTaskView("list")} className={`grid h-8 w-8 place-items-center rounded-lg border ${taskView === "list" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}><List className="h-4 w-4" /></button>
                </div>
              </div>
              <button onClick={() => setShowCreateTask(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-700">
                <Plus className="h-4 w-4" /> Create Task
              </button>
            </div>

            {/* BOARD */}
            {taskView === "board" && (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                {STATUSES.map(status => (
                  <div key={status} className="rounded-xl bg-slate-50 p-3">
                    <div className={`mb-3 flex items-center justify-between rounded-lg px-3 py-2 ${COL_TONES[status]}`}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${COL_DOTS[status]}`} />
                        <h3 className="text-[13px] font-semibold text-slate-800">{STATUS_LABELS[status]}</h3>
                      </div>
                      <span className="text-[12px] text-slate-500">{(groupedTasks[status] || []).length}</span>
                    </div>
                    <div className="space-y-2">
                      {loadingTasks ? (
                        [1,2].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200" />)
                      ) : (groupedTasks[status] || []).length === 0 ? (
                        <p className="py-4 text-center text-[12px] text-slate-400">No tasks</p>
                      ) : (groupedTasks[status] || []).map(task => (
                        <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="min-w-0">
                            <button onClick={() => setDetailTaskId(task.id)} className="text-left">
                              <p className="truncate text-[13px] font-semibold text-slate-950 hover:text-blue-700">{task.title}</p>
                            </button>
                            <p className="mt-0.5 truncate text-[11px] text-blue-600">{task.project_name || "—"}</p>
                          </div>
                          {task.is_blocked && <span className="mt-1 inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"><AlertTriangle className="h-3 w-3" />Blocked</span>}
                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">{(task.assignee_name || task.assignee?.name || "?")[0]}</span>
                            <span>{task.due_date || "—"}</span>
                            <span className={`rounded px-1.5 py-0.5 font-semibold ${priorityColor(task.priority)}`}>{task.priority}</span>
                          </div>
                          {(task.comment_count || 0) > 0 && (
                            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400"><MessageSquare className="h-3 w-3" /><span>{task.comment_count}</span></div>
                          )}
                          <select value={task.status} disabled={updatingTask === task.id} onChange={e => handleStatusChange(task.id, e.target.value)} className="mt-2 w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700">
                            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* LIST */}
            {taskView === "list" && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {loadingTasks ? (
                  <div className="space-y-2 p-4">{[1,2,3,4].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-[13px]">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Title</th>
                          <th className="px-4 py-3 text-left font-semibold">Assignee</th>
                          <th className="px-4 py-3 text-left font-semibold">Priority</th>
                          <th className="px-4 py-3 text-left font-semibold">Status</th>
                          <th className="px-4 py-3 text-left font-semibold">Due</th>
                          <th className="px-4 py-3 text-left font-semibold">Hours</th>
                          <th className="px-4 py-3 text-left font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {listTasks.length === 0 ? (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No tasks found</td></tr>
                        ) : listTasks.map(task => (
                          <tr key={task.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <button onClick={() => setDetailTaskId(task.id)} className="font-semibold text-slate-950 hover:text-blue-700">{task.title}</button>
                              {task.project_name && <p className="text-[11px] text-blue-600">{task.project_name}</p>}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{task.assignee_name || task.assignee?.name || "—"}</td>
                            <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${priorityColor(task.priority)}`}>{task.priority}</span></td>
                            <td className="px-4 py-3">
                              <select value={task.status} disabled={updatingTask === task.id} onChange={e => handleStatusChange(task.id, e.target.value)} className="rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] text-slate-700">
                                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{task.due_date || "—"}</td>
                            <td className="px-4 py-3 text-slate-600">{task.logged_hours ? `${task.logged_hours}h` : "—"}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => setDetailTaskId(task.id)} className="text-[12px] font-semibold text-blue-600 hover:underline">View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
