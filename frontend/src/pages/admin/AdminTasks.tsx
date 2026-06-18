import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Pencil, Trash2, Eye, X,
  Loader2, MessageSquare, Clock3, AlertTriangle,
  CheckCircle2, ListTodo, LayoutGrid, List,
} from "lucide-react";
import { taskAPI, projectAPI } from "../../lib/api";
import { apiFetch } from "../../lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

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
  depends_on?: string;
  tags?: string[];
  created_at?: string;
  project_name?: string;
  assignee_name?: string;
  comment_count?: number;
  project?: { id: string; name: string };
  assignee?: { id: string; name: string; department?: string };
  creator?: { id: string; name: string };
  depends_on_task?: { id: string; title: string; status: string };
  task_comments?: { id: string; content: string; created_at: string; author: { id: string; name: string } }[];
  task_time_logs?: { id: string; hours: number; description?: string; logged_date: string; employee: { id: string; name: string } }[];
  task_attachments?: { id: string; file_name: string; file_size?: number; mime_type?: string; created_at: string; uploader: { id: string; name: string } }[];
  is_blocked?: boolean;
}

interface Project {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  department?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtRelTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TASK_ID = (idx: number) => `TK-${String(idx + 1).padStart(3, "0")}`;

function priorityColor(p: string) {
  if (p === "critical") return "bg-red-50 text-red-700";
  if (p === "high")     return "bg-orange-50 text-orange-700";
  if (p === "medium")   return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function statusColor(s: string) {
  if (s === "done")        return "bg-emerald-50 text-emerald-700";
  if (s === "in_progress") return "bg-blue-50 text-blue-700";
  if (s === "review")      return "bg-violet-50 text-violet-700";
  return "bg-slate-100 text-slate-600";
}

const STATUSES = ["todo", "in_progress", "review", "done"];
const STATUS_LABELS: Record<string, string> = { todo: "To Do", in_progress: "In Progress", review: "Review", done: "Done" };
const COLUMN_COLORS = { todo: "bg-slate-50", in_progress: "bg-blue-50", review: "bg-violet-50", done: "bg-emerald-50" };
const COLUMN_DOTS   = { todo: "bg-slate-400", in_progress: "bg-blue-500", review: "bg-violet-500", done: "bg-emerald-500" };

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  const isError = msg.toLowerCase().startsWith("error") || msg.toLowerCase().includes("failed");
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${isError ? "bg-red-600" : "bg-slate-950"}`}>
      {msg}<button onClick={onClose}><X className="h-4 w-4" /></button>
    </div>
  );
}

// ── Create/Edit Task Modal ─────────────────────────────────────────────────────

interface TaskForm {
  title: string;
  description: string;
  project_id: string;
  assigned_to: string;
  priority: string;
  status: string;
  due_date: string;
  estimated_hours: string;
  tags: string;
  depends_on: string;
}

const EMPTY_TASK_FORM: TaskForm = {
  title: "", description: "", project_id: "", assigned_to: "",
  priority: "medium", status: "todo", due_date: "", estimated_hours: "", tags: "", depends_on: "",
};

function TaskFormModal({ mode, initial, projects, employees, allTasks, onClose, onSave }: {
  mode: "create" | "edit";
  initial?: Task;
  projects: Project[];
  employees: Employee[];
  allTasks: Task[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState<TaskForm>(() => initial ? {
    title: initial.title,
    description: initial.description || "",
    project_id: initial.project_id || "",
    assigned_to: initial.assigned_to || "",
    priority: initial.priority || "medium",
    status: initial.status || "todo",
    due_date: initial.due_date?.split("T")[0] || "",
    estimated_hours: initial.estimated_hours ? String(initial.estimated_hours) : "",
    tags: initial.tags?.join(", ") || "",
    depends_on: initial.depends_on || "",
  } : EMPTY_TASK_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const projectTasks = allTasks.filter(t => t.project_id === form.project_id && t.id !== initial?.id);

  const handleSubmit = async () => {
    if (!form.title.trim()) { setErr("Title is required"); return; }
    setSaving(true); setErr("");
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description || undefined,
        project_id: form.project_id || undefined,
        assigned_to: form.assigned_to || undefined,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date || undefined,
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : undefined,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
        depends_on: form.depends_on || undefined,
      };
      await onSave(payload);
    } catch (e: any) {
      setErr(e.message || "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-[17px] font-semibold text-slate-950">{mode === "create" ? "New Task" : "Edit Task"}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" placeholder="Task title" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Task description" />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Project</label>
              <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
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
              <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Priority *</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Estimated Hours</label>
              <input type="number" value={form.estimated_hours} onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" placeholder="0" />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Tags (comma-separated)</label>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" placeholder="bug, backend" />
            </div>
            {projectTasks.length > 0 && (
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Depends On (optional)</label>
                <select value={form.depends_on} onChange={e => setForm(f => ({ ...f, depends_on: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
                  <option value="">No dependency</option>
                  {projectTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
            )}
          </div>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600">{err}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : mode === "create" ? "Create Task" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task Detail Drawer ─────────────────────────────────────────────────────────

function TaskDetailDrawer({ taskId, onClose, onDelete, onReload }: {
  taskId: string;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onReload: () => void;
}) {
  const [task, setTask] = useState<Task | null>(null);
  const [comment, setComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [logHours, setLogHours] = useState("");
  const [logDesc, setLogDesc] = useState("");
  const [loggingTime, setLoggingTime] = useState(false);
  const [toast, setToast] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadDetail = useCallback(async () => {
    try {
      const d = await taskAPI.getDetail(taskId);
      setTask(d as Task);
    } catch { /* noop */ }
  }, [taskId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3500); return () => clearTimeout(t); }, [toast]);

  const handleComment = async () => {
    if (!comment.trim()) return;
    setPostingComment(true);
    try {
      await taskAPI.addComment(taskId, comment.trim());
      setComment("");
      await loadDetail();
      onReload();
    } catch (e: any) {
      setToast("Error: " + e.message);
    } finally {
      setPostingComment(false);
    }
  };

  const handleLogTime = async () => {
    if (!logHours || Number(logHours) <= 0) return;
    setLoggingTime(true);
    try {
      await taskAPI.logTime(taskId, { hours: Number(logHours), description: logDesc || undefined });
      setLogHours(""); setLogDesc("");
      await loadDetail();
      onReload();
      setToast("Time logged");
    } catch (e: any) {
      setToast("Error: " + e.message);
    } finally {
      setLoggingTime(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } finally {
      setDeleting(false);
    }
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

        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400">{TASK_ID(0)}</span>
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
          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div><p className="font-semibold text-slate-500">Assignee</p><p className="mt-1 text-slate-900">{task.assignee?.name || "—"}</p></div>
            <div><p className="font-semibold text-slate-500">Reporter</p><p className="mt-1 text-slate-900">{task.creator?.name || "—"}</p></div>
            <div><p className="font-semibold text-slate-500">Due Date</p><p className="mt-1 text-slate-900">{fmtDate(task.due_date)}</p></div>
            <div><p className="font-semibold text-slate-500">Created</p><p className="mt-1 text-slate-900">{fmtDate(task.created_at)}</p></div>
            <div><p className="font-semibold text-slate-500">Est. Hours</p><p className="mt-1 text-slate-900">{task.estimated_hours || "—"}</p></div>
            <div><p className="font-semibold text-slate-500">Logged Hours</p><p className="mt-1 text-slate-900">{totalLogged.toFixed(1)}h</p></div>
          </div>

          {task.estimated_hours && task.estimated_hours > 0 && (
            <div>
              <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-500">
                <span>Time Progress</span>
                <span>{Math.min(100, Math.round((totalLogged / task.estimated_hours) * 100))}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, Math.round((totalLogged / task.estimated_hours) * 100))}%` }} />
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div>
              <p className="mb-1 text-[12px] font-semibold text-slate-500">Description</p>
              <p className="text-[13px] text-slate-700">{task.description}</p>
            </div>
          )}

          {/* Dependencies */}
          {task.depends_on_task && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-[12px] font-semibold text-amber-800">Blocked by:</p>
              <p className="mt-1 text-[13px] font-medium text-amber-900">{task.depends_on_task.title}</p>
              <p className="mt-0.5 text-[11px] text-amber-700">Status: {task.depends_on_task.status}</p>
            </div>
          )}

          {/* Tags */}
          {(task.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tags!.map(tag => (
                <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{tag}</span>
              ))}
            </div>
          )}

          {/* Time Log */}
          <div>
            <p className="mb-3 text-[13px] font-semibold text-slate-900">Time Log</p>
            {(task.task_time_logs || []).length === 0 ? (
              <p className="text-[12px] text-slate-400">No time logged yet</p>
            ) : (task.task_time_logs || []).map(log => (
              <div key={log.id} className="mb-2 flex items-start justify-between gap-2 text-[12px]">
                <div>
                  <span className="font-semibold text-slate-900">{log.employee.name}</span>
                  {log.description && <span className="ml-1 text-slate-500">— {log.description}</span>}
                  <p className="text-slate-400">{fmtDate(log.logged_date)}</p>
                </div>
                <span className="shrink-0 font-semibold text-blue-700">{Number(log.hours).toFixed(1)}h</span>
              </div>
            ))}
            <div className="mt-3 flex gap-2">
              <input type="number" value={logHours} onChange={e => setLogHours(e.target.value)} placeholder="Hours" className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-[12px] outline-none focus:border-blue-500" />
              <input value={logDesc} onChange={e => setLogDesc(e.target.value)} placeholder="Description (optional)" className="h-9 flex-1 rounded-lg border border-slate-200 px-2 text-[12px] outline-none focus:border-blue-500" />
              <button onClick={handleLogTime} disabled={loggingTime || !logHours} className="rounded-lg bg-blue-600 px-3 text-[12px] font-semibold text-white disabled:opacity-50">
                {loggingTime ? "..." : "Log"}
              </button>
            </div>
          </div>

          {/* Comments */}
          <div>
            <p className="mb-3 text-[13px] font-semibold text-slate-900">Comments ({(task.task_comments || []).length})</p>
            {(task.task_comments || []).length === 0 ? (
              <p className="text-[12px] text-slate-400">No comments yet</p>
            ) : (task.task_comments || []).map(c => (
              <div key={c.id} className="mb-3 flex gap-2">
                <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">
                  {c.author.name[0]}
                </div>
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
              <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === "Enter" && handleComment()} placeholder="Add a comment..." className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
              <button onClick={handleComment} disabled={postingComment || !comment.trim()} className="rounded-lg bg-blue-600 px-3 text-[12px] font-semibold text-white disabled:opacity-50">
                {postingComment ? "..." : "Post"}
              </button>
            </div>
          </div>

          {/* Attachments */}
          {(task.task_attachments || []).length > 0 && (
            <div>
              <p className="mb-3 text-[13px] font-semibold text-slate-900">Attachments</p>
              {task.task_attachments!.map(a => (
                <div key={a.id} className="mb-2 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-[12px]">
                  <span className="font-medium text-slate-900">{a.file_name}</span>
                  <span className="text-slate-400">{a.uploader.name}</span>
                </div>
              ))}
              <p className="text-[11px] text-slate-400">File upload coming soon (storage not configured)</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white p-4">
          <button onClick={handleDelete} disabled={deleting} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60">
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {deleting ? "Deleting..." : "Delete Task"}
          </button>
        </div>
      </aside>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, projRes, empRes] = await Promise.allSettled([
        taskAPI.getAll(),
        projectAPI.getAll(),
        apiFetch("/employees"),
      ]);
      if (tasksRes.status === "fulfilled") setTasks(Array.isArray(tasksRes.value) ? (tasksRes.value as Task[]) : []);
      if (projRes.status === "fulfilled") setProjects(Array.isArray(projRes.value) ? (projRes.value as Project[]) : []);
      if (empRes.status === "fulfilled") setEmployees(Array.isArray(empRes.value) ? (empRes.value as Employee[]) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3500); return () => clearTimeout(t); }, [toast]);

  const todayStr = new Date().toISOString().split("T")[0];
  const filteredTasks = tasks.filter(t => {
    if (!search) return true;
    return t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.project_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.assignee_name || "").toLowerCase().includes(search.toLowerCase());
  });

  const stats = {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    overdue: tasks.filter(t => t.due_date && t.due_date < todayStr && t.status !== "done").length,
    done: tasks.filter(t => t.status === "done").length,
    blocked: tasks.filter(t => t.is_blocked).length,
  };

  const boardGroups = STATUSES.reduce<Record<string, Task[]>>((acc, s) => {
    acc[s] = filteredTasks.filter(t => t.status === s);
    return acc;
  }, {});

  const handleCreate = async (data: Record<string, unknown>) => {
    await taskAPI.create(data);
    setToast("Task created");
    setShowCreate(false);
    await load();
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editTask) return;
    await taskAPI.update(editTask.id, data);
    setToast("Task updated");
    setEditTask(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    await taskAPI.delete(id);
    setToast("Task deleted");
    setDeleteTaskId(null);
    await load();
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await taskAPI.updateStatus(taskId, newStatus);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (e: any) {
      setToast("Error: " + e.message);
    }
  };

  return (
    <div className="min-h-full bg-[#f8fafc]">
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}

      {showCreate && (
        <TaskFormModal mode="create" projects={projects} employees={employees} allTasks={tasks}
          onClose={() => setShowCreate(false)} onSave={handleCreate} />
      )}
      {editTask && (
        <TaskFormModal mode="edit" initial={editTask} projects={projects} employees={employees} allTasks={tasks}
          onClose={() => setEditTask(null)} onSave={handleEdit} />
      )}
      {detailTaskId && (
        <TaskDetailDrawer taskId={detailTaskId} onClose={() => setDetailTaskId(null)}
          onDelete={handleDelete} onReload={load} />
      )}
      {deleteTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-[17px] font-semibold text-slate-950">Delete Task</h2>
            <p className="mt-3 text-[13px] text-slate-600">Are you sure you want to delete this task?</p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeleteTaskId(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700">Cancel</button>
              <button onClick={() => handleDelete(deleteTaskId)} className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5 p-5 lg:p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[26px] font-semibold text-slate-950">Task Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode("board")} className={`grid h-9 w-9 place-items-center rounded-lg border ${viewMode === "board" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setViewMode("list")} className={`grid h-9 w-9 place-items-center rounded-lg border ${viewMode === "list" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}><List className="h-4 w-4" /></button>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-700">
              <Plus className="h-4 w-4" /> New Task
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <ListTodo className="h-5 w-5 text-violet-600" />
            <p className="mt-3 text-2xl font-semibold text-slate-950">{stats.total}</p>
            <p className="mt-1 text-[13px] text-slate-500">Total Tasks</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Clock3 className="h-5 w-5 text-blue-600" />
            <p className="mt-3 text-2xl font-semibold text-slate-950">{stats.inProgress}</p>
            <p className="mt-1 text-[13px] text-slate-500">In Progress</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="mt-3 text-2xl font-semibold text-slate-950">{stats.overdue}</p>
            <p className="mt-1 text-[13px] text-slate-500">Overdue</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="mt-3 text-2xl font-semibold text-slate-950">{stats.done}</p>
            <p className="mt-1 text-[13px] text-slate-500">Completed</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="mt-3 text-2xl font-semibold text-slate-950">{stats.blocked}</p>
            <p className="mt-1 text-[13px] text-slate-500">Blocked</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500" placeholder="Search tasks..." />
        </div>

        {/* Board View */}
        {viewMode === "board" && (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {STATUSES.map(status => (
              <div key={status} className="rounded-xl bg-slate-50 p-3">
                <div className={`mb-3 flex items-center justify-between rounded-lg px-3 py-2 ${(COLUMN_COLORS as any)[status]}`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${(COLUMN_DOTS as any)[status]}`} />
                    <h3 className="text-[13px] font-semibold text-slate-800">{STATUS_LABELS[status]}</h3>
                  </div>
                  <span className="text-[12px] text-slate-500">{(boardGroups[status] || []).length}</span>
                </div>
                <div className="space-y-2">
                  {loading ? (
                    [1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200" />)
                  ) : (boardGroups[status] || []).length === 0 ? (
                    <p className="py-4 text-center text-[12px] text-slate-400">No tasks</p>
                  ) : (boardGroups[status] || []).map(task => (
                    <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <button onClick={() => setDetailTaskId(task.id)} className="text-left">
                            <p className="truncate text-[13px] font-semibold text-slate-950 hover:text-blue-700">{task.title}</p>
                          </button>
                          <p className="mt-0.5 truncate text-[11px] text-blue-600">{task.project_name || "—"}</p>
                        </div>
                      </div>
                      {task.is_blocked && (
                        <span className="mt-1 inline-flex rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Blocked</span>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-1 text-[11px] text-slate-500">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">
                          {(task.assignee_name || task.assignee?.name || "?")[0]}
                        </span>
                        <span>{task.due_date || "—"}</span>
                        <span className={`rounded px-1.5 py-0.5 font-semibold ${priorityColor(task.priority)}`}>{task.priority}</span>
                      </div>
                      {(task.comment_count || 0) > 0 && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
                          <MessageSquare className="h-3 w-3" /><span>{task.comment_count}</span>
                        </div>
                      )}
                      <select
                        value={task.status}
                        onChange={e => handleStatusChange(task.id, e.target.value)}
                        className="mt-2 w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700"
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="space-y-2 p-5">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
                </div>
              ) : (
                <table className="min-w-full text-[13px]">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Title</th>
                      <th className="px-4 py-3 text-left font-semibold">Project</th>
                      <th className="px-4 py-3 text-left font-semibold">Assignee</th>
                      <th className="px-4 py-3 text-left font-semibold">Priority</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Due</th>
                      <th className="px-4 py-3 text-left font-semibold">Hours</th>
                      <th className="px-4 py-3 text-left font-semibold">Comments</th>
                      <th className="px-4 py-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTasks.length === 0 ? (
                      <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">No tasks found</td></tr>
                    ) : filteredTasks.map((task, idx) => (
                      <tr key={task.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{TASK_ID(idx)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => setDetailTaskId(task.id)} className="font-semibold text-slate-950 hover:text-blue-700">{task.title}</button>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{task.project_name || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{task.assignee_name || task.assignee?.name || "—"}</td>
                        <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${priorityColor(task.priority)}`}>{task.priority}</span></td>
                        <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${statusColor(task.status)}`}>{STATUS_LABELS[task.status] || task.status}</span></td>
                        <td className="px-4 py-3 text-slate-600">{task.due_date || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{task.logged_hours ? `${task.logged_hours}h` : "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{task.comment_count || 0}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setEditTask(task)} title="Edit" className="text-slate-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => setDeleteTaskId(task.id)} title="Delete" className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                            <button onClick={() => setDetailTaskId(task.id)} title="View Detail" className="text-slate-400 hover:text-blue-600"><Eye className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Analytics row */}
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[14px] font-semibold text-slate-950">Tasks by Priority</h2>
            <div className="mt-4 space-y-3">
              {["critical","high","medium","low"].map((p, idx) => {
                const count = tasks.filter(t => t.priority === p).length;
                const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0;
                const colors = ["bg-red-500","bg-orange-500","bg-amber-500","bg-slate-400"];
                return (
                  <div key={p} className="flex items-center gap-3 text-[13px]">
                    <span className="w-16 capitalize text-slate-600">{p}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${colors[idx]}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right font-semibold text-slate-700">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[14px] font-semibold text-slate-950">Top Assignees</h2>
            <div className="mt-4 space-y-3">
              {(() => {
                const map = new Map<string, number>();
                tasks.forEach(t => {
                  const name = t.assignee_name || t.assignee?.name || "Unassigned";
                  map.set(name, (map.get(name) || 0) + 1);
                });
                const top5 = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
                const maxVal = Math.max(...top5.map(([, v]) => v), 1);
                return top5.map(([name, count]) => (
                  <div key={name} className="flex items-center gap-3 text-[13px]">
                    <span className="w-28 truncate text-slate-600">{name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.round((count / maxVal) * 100)}%` }} />
                    </div>
                    <span className="w-6 text-right font-semibold text-slate-700">{count}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[14px] font-semibold text-slate-950">Overdue Tasks</h2>
            <div className="mt-4 space-y-3">
              {tasks.filter(t => t.due_date && t.due_date < todayStr && t.status !== "done").slice(0, 5).map(t => (
                <div key={t.id} className="flex items-start justify-between gap-2 text-[12px]">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{t.title}</p>
                    <p className="text-slate-500">{t.project_name || "—"}</p>
                  </div>
                  <span className="shrink-0 text-red-600">{t.due_date}</span>
                </div>
              ))}
              {tasks.filter(t => t.due_date && t.due_date < todayStr && t.status !== "done").length === 0 && (
                <p className="text-[12px] text-slate-400">No overdue tasks</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
