import { useMemo, useState, useEffect } from "react";
import {
  CalendarDays,
  CalendarCheck2,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Flag,
  Folder,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  TimerReset,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { taskAPI, timesheetAPI, projectAPI } from "../../lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

type Priority = "High" | "Medium" | "Low";

interface ApiTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string | null;
  project_id?: string;
  project_name?: string;
  assigned_to?: string;
  created_at?: string;
}

interface DisplayTask {
  id: string;
  title: string;
  project: string;
  priority: Priority;
  due: string;
  status: string;
  progress?: number;
  due_date?: string | null;
  created_at?: string;
}

interface DeadlineTask {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  project_name?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizePriority(p: string): Priority {
  const l = p?.toLowerCase();
  if (l === "high") return "High";
  if (l === "medium") return "Medium";
  return "Low";
}

function normalizeStatus(s: string): string {
  const map: Record<string, string> = {
    todo: "Todo",
    in_progress: "In progress",
    review: "Review",
    done: "Done",
    pending: "Todo",
    completed: "Done",
  };
  return map[s?.toLowerCase()] ?? s;
}

function apiStatusFromDisplay(display: string): string {
  const map: Record<string, string> = {
    Todo: "todo",
    "In progress": "in_progress",
    Review: "review",
    Done: "done",
  };
  return map[display] ?? display.toLowerCase();
}

function mapApiTask(t: ApiTask): DisplayTask {
  const status = normalizeStatus(t.status);
  return {
    id: t.id,
    title: t.title,
    project: t.project_name ?? "—",
    priority: normalizePriority(t.priority),
    due: t.due_date
      ? new Date(t.due_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      : "—",
    status,
    progress: status === "Done" ? 100 : status === "In progress" ? 50 : undefined,
    due_date: t.due_date,
    created_at: t.created_at,
  };
}

function formatHours(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${String(mins).padStart(2, "0")}m`;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const priorityClass: Record<Priority, string> = {
  High: "bg-red-50 text-red-600",
  Medium: "bg-amber-50 text-amber-600",
  Low: "bg-emerald-50 text-emerald-600",
};

const priorityDot: Record<Priority, string> = {
  High: "bg-red-500",
  Medium: "bg-amber-500",
  Low: "bg-emerald-500",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ── Sub-components ─────────────────────────────────────────────────────────────

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </section>
  );
}

function IconButton({ children, label }: { children: ReactNode; label: string }) {
  return (
    <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 shadow-sm hover:bg-slate-50" aria-label={label} title={label}>
      {children}
    </button>
  );
}

function TaskCard({ task, completed = false, onDone, onDetail }: { task: DisplayTask; completed?: boolean; onDone?: () => void; onDetail?: () => void }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
      <button type="button" onClick={onDetail} className="w-full text-left">
        <h3 className={`text-[13px] font-semibold leading-5 text-slate-950 ${onDetail ? "hover:text-blue-700" : ""}`}>{task.title}</h3>
      </button>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
        <Folder className="h-3.5 w-3.5" />
        <span className="truncate">{task.project}</span>
      </div>
      <div className="mt-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold">
        <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[task.priority]}`} />
        <span className={priorityClass[task.priority].replace("bg-", "text-").split(" ")[1]}>{task.priority}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
          <CalendarDays className="h-3.5 w-3.5" />
          {task.due}
        </div>
        {completed && (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      {typeof task.progress === "number" && (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${task.progress === 100 ? "bg-emerald-500" : "bg-blue-600"}`} style={{ width: `${task.progress}%` }} />
          </div>
          <span className="w-9 text-right text-[11px] font-semibold text-slate-700">{task.progress}%</span>
        </div>
      )}
      {onDone && !completed && (
        <button type="button" onClick={onDone} className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-blue-700">
          Mark done
        </button>
      )}
    </article>
  );
}

// ── Task Detail Drawer ─────────────────────────────────────────────────────────

interface FullTask {
  id: string; title: string; description?: string; status: string; priority: string;
  due_date?: string; estimated_hours?: number; logged_hours?: number;
  project?: { id: string; name: string };
  assignee?: { id: string; name: string };
  creator?: { id: string; name: string };
  parent_task?: { id: string; title: string; status: string };
  subtasks?: { id: string; title: string; status: string; priority: string; due_date?: string; assignee?: { id: string; name: string } }[];
  task_comments?: { id: string; content: string; created_at: string; author: { id: string; name: string } }[];
  task_time_logs?: { id: string; hours: number; description?: string; logged_date: string; employee: { id: string; name: string } }[];
}

export function TaskDetailDrawer({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const [task, setTask] = useState<FullTask | null>(null);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [logHours, setLogHours] = useState("");
  const [logDesc, setLogDesc] = useState("");
  const [logging, setLogging] = useState(false);
  const [drawerError, setDrawerError] = useState("");
  const [showSubTaskModal, setShowSubTaskModal] = useState(false);
  const [subForm, setSubForm] = useState({ title: "", description: "", priority: "medium", due_date: "" });
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState("");

  const loadTask = async () => {
    try { setTask(await taskAPI.getDetail(taskId) as FullTask); } catch { /* noop */ }
  };

  useEffect(() => { loadTask(); }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!drawerError) return; const t = setTimeout(() => setDrawerError(""), 3500); return () => clearTimeout(t); }, [drawerError]);

  const postComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try { await taskAPI.addComment(taskId, comment.trim()); setComment(""); await loadTask(); }
    catch (e: unknown) { setDrawerError(e instanceof Error ? e.message : "Failed to post comment"); }
    finally { setPosting(false); }
  };

  const logTime = async () => {
    if (!logHours || Number(logHours) <= 0) return;
    setLogging(true);
    try {
      await taskAPI.logTime(taskId, { hours: Number(logHours), description: logDesc || undefined });
      setLogHours(""); setLogDesc(""); await loadTask();
    } catch (e: unknown) { setDrawerError(e instanceof Error ? e.message : "Failed to log time"); }
    finally { setLogging(false); }
  };

  const createSubTask = async () => {
    if (!subForm.title.trim()) { setSubError("Title is required"); return; }
    setSubLoading(true); setSubError("");
    try {
      await taskAPI.createSubTask({
        title:          subForm.title.trim(),
        description:    subForm.description || undefined,
        priority:       subForm.priority,
        due_date:       subForm.due_date || undefined,
        parent_task_id: taskId,
        project_id:     task?.project?.id || undefined,
      });
      setShowSubTaskModal(false);
      setSubForm({ title: "", description: "", priority: "medium", due_date: "" });
      await loadTask();
    } catch (e: unknown) { setSubError(e instanceof Error ? e.message : "Failed to create sub-task"); }
    finally { setSubLoading(false); }
  };

  const fmtDate = (d?: string) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const fmtRel = (iso?: string) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-slate-900/40" onClick={onClose} />
      <aside className="flex h-full w-full max-w-[480px] flex-col overflow-y-auto bg-white shadow-2xl">
        {!task ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{task.status}</span>
                    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${task.priority === "high" ? "bg-red-50 text-red-700" : task.priority === "medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{task.priority}</span>
                  </div>
                  <h2 className="mt-2 text-[16px] font-semibold text-slate-950">{task.title}</h2>
                  {task.project && <p className="mt-1 text-[12px] text-blue-700">{task.project.name}</p>}
                </div>
                <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
              </div>
            </div>

            <div className="flex-1 space-y-5 p-5">
              {task.parent_task && (
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-[12px]">
                  <span className="text-slate-500">Sub-task of: </span>
                  <span className="font-semibold text-slate-900">{task.parent_task.title}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div><p className="font-semibold text-slate-500">Assignee</p><p className="mt-1 text-slate-900">{task.assignee?.name ?? "—"}</p></div>
                <div><p className="font-semibold text-slate-500">Due Date</p><p className="mt-1 text-slate-900">{fmtDate(task.due_date ?? undefined)}</p></div>
                <div><p className="font-semibold text-slate-500">Est. Hours</p><p className="mt-1 text-slate-900">{task.estimated_hours ?? "—"}</p></div>
                <div><p className="font-semibold text-slate-500">Logged</p><p className="mt-1 text-slate-900">{(task.task_time_logs ?? []).reduce((s, l) => s + Number(l.hours), 0).toFixed(1)}h</p></div>
              </div>

              {task.description && (
                <div>
                  <p className="mb-1 text-[12px] font-semibold text-slate-500">Description</p>
                  <p className="text-[13px] text-slate-700">{task.description}</p>
                </div>
              )}

              {/* Subtasks */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-slate-900">Sub-tasks ({(task.subtasks || []).length})</p>
                  <button onClick={() => setShowSubTaskModal(v => !v)} className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700">
                    + Add Sub-task
                  </button>
                </div>
                {(task.subtasks || []).length === 0 && !showSubTaskModal ? (
                  <p className="text-[12px] text-slate-400">No sub-tasks yet</p>
                ) : (task.subtasks || []).map(sub => (
                  <div key={sub.id} className="mb-2 flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${sub.status === "done" ? "bg-emerald-500" : sub.status === "in_progress" ? "bg-blue-500" : "bg-slate-300"}`} />
                      <span className="text-[13px] font-medium text-slate-900">{sub.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {sub.due_date && <span className="text-[11px] text-slate-400">{sub.due_date}</span>}
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${sub.priority === "high" ? "bg-red-50 text-red-700" : sub.priority === "medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {sub.priority}
                      </span>
                    </div>
                  </div>
                ))}
                {showSubTaskModal && (
                  <div className="mt-3 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-slate-900">New Sub-task</p>
                      <button onClick={() => { setShowSubTaskModal(false); setSubError(""); }}><X className="h-4 w-4 text-slate-400" /></button>
                    </div>
                    <input value={subForm.title} onChange={e => setSubForm(f => ({ ...f, title: e.target.value }))} placeholder="Sub-task title *" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-blue-500" />
                    <textarea value={subForm.description} onChange={e => setSubForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Description (optional)" className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-blue-500" />
                    <div className="grid grid-cols-2 gap-2">
                      <select value={subForm.priority} onChange={e => setSubForm(f => ({ ...f, priority: e.target.value }))} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none focus:border-blue-500">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <input type="date" value={subForm.due_date} onChange={e => setSubForm(f => ({ ...f, due_date: e.target.value }))} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none focus:border-blue-500" />
                    </div>
                    {subError && <p className="text-[11px] text-red-600">{subError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowSubTaskModal(false); setSubError(""); }} className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-[12px] font-semibold text-slate-600">Cancel</button>
                      <button onClick={createSubTask} disabled={subLoading || !subForm.title.trim()} className="flex-1 rounded-lg bg-blue-600 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">
                        {subLoading ? "Creating..." : "Create"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {drawerError && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{drawerError}</p>}

              <div>
                <p className="mb-3 text-[13px] font-semibold text-slate-900">Time Log</p>
                {(task.task_time_logs ?? []).length === 0 ? (
                  <p className="text-[12px] text-slate-400">No time logged yet</p>
                ) : (task.task_time_logs ?? []).map(l => (
                  <div key={l.id} className="mb-2 flex justify-between text-[12px]">
                    <div><span className="font-semibold text-slate-900">{l.employee.name}</span>{l.description && <span className="ml-1 text-slate-500">— {l.description}</span>}</div>
                    <span className="font-semibold text-blue-700">{Number(l.hours).toFixed(1)}h</span>
                  </div>
                ))}
                <div className="mt-3 flex gap-2">
                  <input type="number" value={logHours} onChange={e => setLogHours(e.target.value)} placeholder="Hours" className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-[12px] outline-none focus:border-blue-500" />
                  <input value={logDesc} onChange={e => setLogDesc(e.target.value)} placeholder="Description" className="h-9 flex-1 rounded-lg border border-slate-200 px-2 text-[12px] outline-none focus:border-blue-500" />
                  <button onClick={logTime} disabled={logging || !logHours} className="rounded-lg bg-blue-600 px-3 text-[12px] font-semibold text-white disabled:opacity-50">{logging ? "..." : "Log"}</button>
                </div>
              </div>

              <div>
                <p className="mb-3 text-[13px] font-semibold text-slate-900">Comments ({(task.task_comments ?? []).length})</p>
                {(task.task_comments ?? []).length === 0 ? (
                  <p className="text-[12px] text-slate-400">No comments yet</p>
                ) : (task.task_comments ?? []).map(c => (
                  <div key={c.id} className="mb-3 flex gap-2">
                    <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">{c.author.name[0]}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="font-semibold text-slate-900">{c.author.name}</span>
                        <span className="text-slate-400">{fmtRel(c.created_at)}</span>
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
          </>
        )}
      </aside>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Tasks() {
  const [apiTasks, setApiTasks] = useState<ApiTask[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineTask[]>([]);
  const [weeklyHours, setWeeklyHours] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("Board");
  const [search, setSearch] = useState("");

  // Calendar state (main tab + sidebar mini)
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Task detail drawer
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  // Projects for the Add Task modal
  const [myProjects, setMyProjects] = useState<{ id: string; name: string }[]>([]);

  // Add Task modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ title: "", description: "", priority: "medium", due_date: "", project_id: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasksData, deadlinesData, tsData] = await Promise.allSettled([
        taskAPI.getMy(),
        taskAPI.getDeadlines(),
        timesheetAPI.getWeekly(),
      ]);
      if (tasksData.status === "fulfilled") setApiTasks(Array.isArray(tasksData.value) ? (tasksData.value as ApiTask[]) : []);
      if (deadlinesData.status === "fulfilled") setDeadlines(Array.isArray(deadlinesData.value) ? (deadlinesData.value as DeadlineTask[]) : []);
      if (tsData.status === "fulfilled" && tsData.value) {
        const ts = tsData.value as { total_hours?: number };
        setWeeklyHours(ts.total_hours ?? null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    projectAPI.getMy().then((res: any) => setMyProjects(Array.isArray(res) ? res : [])).catch(() => {});
  }, []);

  const handleUpdateStatus = async (taskId: string, displayStatus: string) => {
    const apiStatus = apiStatusFromDisplay(displayStatus);
    try {
      await taskAPI.updateStatus(taskId, apiStatus);
      setApiTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: apiStatus } : t));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  const handleAddTask = async () => {
    if (!addForm.title.trim()) { setAddError("Title is required"); return; }
    setAddLoading(true);
    setAddError(null);
    try {
      await taskAPI.create({
        title: addForm.title.trim(),
        description: addForm.description || undefined,
        priority: addForm.priority,
        due_date: addForm.due_date || undefined,
        project_id: addForm.project_id || undefined,
      });
      setShowAddModal(false);
      setAddForm({ title: "", description: "", priority: "medium", due_date: "", project_id: "" });
      await loadTasks();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setAddLoading(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const tasks: DisplayTask[] = useMemo(() => apiTasks.map(mapApiTask), [apiTasks]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) =>
      [t.title, t.project, t.priority, t.status, t.due].some((v) => v.toLowerCase().includes(q))
    );
  }, [search, tasks]);

  const todayStr = new Date().toISOString().split("T")[0];

  const todayCount = apiTasks.filter((t) => t.due_date === todayStr).length;
  const inProgressCount = apiTasks.filter((t) => ["in_progress", "in progress"].includes(t.status?.toLowerCase())).length;
  const completedCount = apiTasks.filter((t) => ["done", "completed"].includes(t.status?.toLowerCase())).length;
  const overdueCount = apiTasks.filter((t) => t.due_date && t.due_date < todayStr && !["done", "completed"].includes(t.status?.toLowerCase())).length;

  const highCount = apiTasks.filter((t) => t.priority?.toLowerCase() === "high").length;
  const medCount = apiTasks.filter((t) => t.priority?.toLowerCase() === "medium").length;
  const lowCount = apiTasks.filter((t) => t.priority?.toLowerCase() === "low").length;
  const total = apiTasks.length || 1;
  const highPct = Math.round((highCount / total) * 100);
  const medPct = Math.round((medCount / total) * 100);
  const lowPct = 100 - highPct - medPct;

  // Productivity: done / total this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const thisWeekTasks = apiTasks.filter((t) => t.created_at && t.created_at >= weekStartStr || t.due_date === todayStr);
  const thisWeekDone = thisWeekTasks.filter((t) => ["done", "completed"].includes(t.status?.toLowerCase()));
  const productivity = thisWeekTasks.length > 0 ? Math.round((thisWeekDone.length / thisWeekTasks.length) * 100) : Math.round((completedCount / (apiTasks.length || 1)) * 100);

  // Tasks by project
  const byProject = useMemo(() => {
    const map = new Map<string, number>();
    apiTasks.forEach((t) => {
      const name = t.project_name ?? "Unknown";
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [apiTasks]);
  const maxProjectCount = Math.max(...byProject.map((e) => e[1]), 1);

  // Board columns
  const taskColumns = useMemo(() => [
    { title: "To Do", color: "#94a3b8", tasks: filteredTasks.filter((t) => t.status === "Todo") },
    { title: "In Progress", color: "#2563eb", tasks: filteredTasks.filter((t) => t.status === "In progress").map((t) => ({ ...t, progress: t.progress ?? 50 })) },
    { title: "Review", color: "#7c3aed", tasks: filteredTasks.filter((t) => t.status === "Review") },
    { title: "Completed", color: "#34a853", tasks: filteredTasks.filter((t) => t.status === "Done").map((t) => ({ ...t, progress: 100 })) },
  ], [filteredTasks]);

  const myTasks = filteredTasks.filter((t) => t.status !== "Done");
  const completedTasks = filteredTasks.filter((t) => t.status === "Done");

  const sortedTasks = useMemo(() => {
    const order: Record<string, number> = { Todo: 0, "In progress": 1, Done: 2 };
    return [...filteredTasks].sort((a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0));
  }, [filteredTasks]);

  // Calendar cells
  const calendarCells = useMemo(() => {
    const firstDow = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: Array<{ day: number; dateStr: string; isCurrentMonth: boolean }> = [];
    for (let i = 0; i < firstDow; i++) cells.push({ day: 0, dateStr: "", isCurrentMonth: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateStr, isCurrentMonth: true });
    }
    while (cells.length < 35) cells.push({ day: 0, dateStr: "", isCurrentMonth: false });
    return cells;
  }, [calMonth, calYear]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, ApiTask[]>();
    apiTasks.forEach((t) => {
      if (t.due_date) {
        const list = map.get(t.due_date) ?? [];
        list.push(t);
        map.set(t.due_date, list);
      }
    });
    return map;
  }, [apiTasks]);

  const statItems = [
    { label: "Today's Tasks", value: String(todayCount), hint: `${overdueCount} Overdue`, color: "blue", icon: CalendarCheck2 },
    { label: "In Progress", value: String(inProgressCount), hint: "Active", color: "amber", icon: Folder },
    { label: "Overdue", value: String(overdueCount), hint: "Needs attention", color: "rose", icon: TimerReset },
    { label: "Completed", value: String(completedCount), hint: "All time", color: "emerald", icon: CheckSquare },
    { label: "Time Logged", value: weeklyHours != null ? formatHours(weeklyHours) : "—", hint: "This Week", color: "violet", icon: Clock3 },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#f8fafc]">
        <div className="w-full space-y-4 p-4 lg:p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[1,2,3,4,5].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200" />)}
          </div>
          <div className="h-80 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f8fafc]">
      {detailTaskId && (
        <TaskDetailDrawer taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />
      )}
      <div className="w-full space-y-4 p-4 lg:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-slate-950">My Tasks</h1>
            <p className="mt-1 text-[14px] text-slate-500">Track and manage your assigned work</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Search tasks..." />
            </div>
            <IconButton label="Filter"><Filter className="h-4 w-4" /><span>Filter</span></IconButton>
            <IconButton label="Calendar"><CalendarDays className="h-4 w-4" /><span>Calendar</span></IconButton>
            <IconButton label="View options"><SlidersHorizontal className="h-4 w-4" /><span>View</span><ChevronDown className="h-3.5 w-3.5" /></IconButton>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[13px] font-medium text-red-700">{error}</p>
            <button onClick={() => { setError(null); loadTasks(); }} className="ml-4 text-[12px] font-bold text-red-800 underline">Retry</button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <Panel key={item.label} className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${colorMap[item.color]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-600">{item.label}</p>
                    <p className="mt-1 text-[26px] font-semibold leading-none text-slate-950">{item.value}</p>
                    <p className="mt-2 text-[12px] text-slate-500">{item.hint}</p>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Panel className="overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-7 overflow-x-auto text-[13px] font-semibold text-slate-600">
                  {["Board", "List", "My Tasks", "Completed", "Calendar"].map((tab) => (
                    <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`shrink-0 border-b-2 py-3 transition-colors ${activeTab === tab ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-950"}`}>
                      {tab}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setAddForm({ title: "", description: "", priority: "medium", due_date: "", project_id: "" }); setAddError(null); setShowAddModal(true); }} className="mb-3 inline-flex h-9 items-center gap-2 self-start rounded-md bg-blue-600 px-3 text-[12px] font-semibold text-white hover:bg-blue-700 sm:self-auto">
                  <Plus className="h-3.5 w-3.5" /> Add Task
                </button>
              </div>

              <div className="space-y-4 bg-white p-3">
                {/* Board */}
                {activeTab === "Board" && (
                  <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                    {taskColumns.map((column) => (
                      <section key={column.title} className="rounded-lg bg-slate-50 p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
                            <h2 className="text-[13px] font-semibold text-slate-950">{column.title}</h2>
                          </div>
                          <span className="text-[12px] text-slate-500">{column.tasks.length}</span>
                        </div>
                        <div className="space-y-2">
                          {column.tasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              completed={column.title === "Completed"}
                              onDone={() => handleUpdateStatus(task.id, "Done")}
                              onDetail={() => setDetailTaskId(task.id)}
                            />
                          ))}
                          {column.tasks.length === 0 && (
                            <p className="py-4 text-center text-[11px] text-slate-400">No tasks</p>
                          )}
                        </div>
                        <button onClick={() => { setAddForm({ title: "", description: "", priority: "medium", due_date: "", project_id: "" }); setAddError(null); setShowAddModal(true); }} className="mt-3 flex h-8 w-full items-center justify-center gap-1 text-[12px] font-semibold text-blue-700 hover:text-blue-800">
                          <Plus className="h-3.5 w-3.5" /> Add Task
                        </button>
                      </section>
                    ))}
                  </div>
                )}

                {/* List */}
                {activeTab === "List" && (
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="min-w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Task</th>
                          <th className="px-4 py-3">Project</th>
                          <th className="px-4 py-3">Priority</th>
                          <th className="px-4 py-3">Due</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {sortedTasks.map((task) => (
                          <tr key={task.id}>
                            <td className="px-4 py-4">
                              <button type="button" onClick={() => setDetailTaskId(task.id)} className="text-left text-sm font-semibold text-slate-900 hover:text-blue-700">{task.title}</button>
                            </td>
                            <td className="px-4 py-4 text-[13px] text-slate-600">{task.project}</td>
                            <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${priorityClass[task.priority]}`}>{task.priority}</span></td>
                            <td className="px-4 py-4 text-[13px] text-slate-600">{task.due}</td>
                            <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{task.status}</span></td>
                            <td className="px-4 py-4 text-right">
                              {task.status !== "Done" ? (
                                <button type="button" onClick={() => handleUpdateStatus(task.id, "Done")} className="rounded-md bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-blue-700">Mark done</button>
                              ) : (
                                <button type="button" onClick={() => handleUpdateStatus(task.id, "Todo")} className="rounded-md bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-200">Reopen</button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {sortedTasks.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No tasks match your search.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* My Tasks */}
                {activeTab === "My Tasks" && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <p className="font-semibold text-slate-950">My open tasks</p>
                      <p className="mt-1 text-[13px] text-slate-500">Review and update your active tasks before the end of the day.</p>
                    </div>
                    <div className="space-y-3">
                      {myTasks.length > 0 ? myTasks.map((task) => (
                        <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                              <p className="mt-1 text-[13px] text-slate-500">{task.project} · Due {task.due}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${priorityClass[task.priority]}`}>{task.priority}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{task.status}</span>
                            </div>
                          </div>
                          <button type="button" onClick={() => handleUpdateStatus(task.id, "Done")} className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-blue-700">
                            Mark done
                          </button>
                        </div>
                      )) : (
                        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">You have no active tasks. Great job staying on top of your work.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Completed */}
                {activeTab === "Completed" && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <p className="font-semibold text-slate-950">Completed tasks</p>
                      <p className="mt-1 text-[13px] text-slate-500">Review your finished work or reopen items if needed.</p>
                    </div>
                    <div className="space-y-3">
                      {completedTasks.length > 0 ? completedTasks.map((task) => (
                        <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                              <p className="mt-1 text-[13px] text-slate-500">{task.project} · Completed</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${priorityClass[task.priority]}`}>{task.priority}</span>
                              <button type="button" onClick={() => handleUpdateStatus(task.id, "Todo")} className="rounded-md bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-200">Reopen</button>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">No completed tasks found yet.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Calendar */}
                {activeTab === "Calendar" && (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); }} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
                        <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); }} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{MONTHS[calMonth]} {calYear}</p>
                          <p className="text-[12px] text-slate-500">Task calendar</p>
                        </div>
                      </div>
                      <button onClick={() => { setCalMonth(new Date().getMonth()); setCalYear(new Date().getFullYear()); }} className="rounded-full border border-slate-200 bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-blue-700">Today</button>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="grid gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:grid-cols-7">
                        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-7">
                        {calendarCells.map((cell, idx) => {
                          const dayTasks = cell.dateStr ? (tasksByDate.get(cell.dateStr) ?? []) : [];
                          const isToday = cell.dateStr === todayStr;
                          return (
                            <div key={`${cell.dateStr}-${idx}`} className={`min-h-[120px] rounded-3xl border p-3 transition hover:border-slate-300 hover:bg-white ${!cell.isCurrentMonth ? "border-transparent bg-slate-50/80" : "border-slate-200 bg-slate-50"}`}>
                              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-2xl text-sm font-semibold ${isToday ? "bg-blue-600 text-white" : !cell.isCurrentMonth ? "text-slate-400" : "text-slate-950"}`}>
                                {cell.day || ""}
                              </span>
                              {dayTasks.slice(0, 2).map((t) => (
                                <div key={t.id} className={`mt-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.priority?.toLowerCase() === "high" ? "bg-red-100 text-red-700" : t.priority?.toLowerCase() === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
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
              </div>
            </Panel>

            {/* Task Summary */}
            <Panel className="p-4">
              <h2 className="text-[15px] font-semibold text-slate-950">My Task Summary</h2>
              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                {/* Priority chart */}
                <div className="rounded-lg border border-slate-100 p-4">
                  <h3 className="text-[12px] font-semibold text-slate-950">Tasks by Priority</h3>
                  <div className="mt-4 flex items-center gap-5">
                    <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#ef4444 0 ${highPct}%, #f59e0b ${highPct}% ${highPct + medPct}%, #22c55e ${highPct + medPct}% 100%)` }}>
                      <div className="h-16 w-16 rounded-full bg-white" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3 text-[12px]">
                      {([["High", `${highCount} (${highPct}%)`, "bg-red-500"], ["Medium", `${medCount} (${medPct}%)`, "bg-amber-500"], ["Low", `${lowCount} (${lowPct}%)`, "bg-emerald-500"]] as const).map(([label, value, color]) => (
                        <div key={label} className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 text-slate-700"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>
                          <span className="font-medium text-slate-700">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tasks by project */}
                <div className="rounded-lg border border-slate-100 p-4">
                  <h3 className="text-[12px] font-semibold text-slate-950">Tasks by Project</h3>
                  {byProject.length === 0 ? (
                    <p className="mt-5 text-[12px] text-slate-400">No project data yet</p>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {byProject.map(([name, count]) => (
                        <div key={name} className="grid grid-cols-[105px_1fr_18px] items-center gap-3 text-[11px]">
                          <span className="truncate font-medium text-slate-700">{name}</span>
                          <div className="h-1.5 rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.round((count / maxProjectCount) * 100)}%` }} />
                          </div>
                          <span className="text-right font-semibold text-slate-700">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Time Logged */}
                <div className="rounded-lg border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[12px] font-semibold text-slate-950">Time Logged</h3>
                  </div>
                  <p className="mt-2 text-[28px] font-semibold leading-none text-slate-950">
                    {weeklyHours != null ? formatHours(weeklyHours) : "—"}
                  </p>
                  <p className="mt-2 text-[12px] text-slate-500">From timesheet this week</p>
                </div>
              </div>
            </Panel>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <Panel className="p-4">
              <h2 className="text-[15px] font-semibold text-slate-950">Today's Focus</h2>
              <div className="mt-4 flex items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-blue-50 text-[30px]">◎</div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-950">
                    {todayCount > 0 ? `You have ${todayCount} task${todayCount > 1 ? "s" : ""} due today` : "No tasks due today"}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {overdueCount > 0 ? `${overdueCount} overdue tasks need attention.` : "Great job keeping up!"}
                  </p>
                </div>
              </div>
            </Panel>

            {/* Upcoming Deadlines */}
            <Panel className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-950">Upcoming Deadlines</h2>
              </div>
              <div className="mt-4 space-y-4">
                {deadlines.length === 0 ? (
                  <p className="text-[12px] text-slate-400">No upcoming deadlines</p>
                ) : deadlines.map((t) => (
                  <div key={t.id} className="flex gap-3">
                    <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md ${priorityClass[normalizePriority(t.priority)]}`}>
                      <Flag className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-slate-950">{t.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{t.project_name ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${priorityClass[normalizePriority(t.priority)]}`}>{normalizePriority(t.priority)}</span>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {new Date(t.due_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Mini calendar */}
            <Panel className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-950">Calendar</h2>
                <div className="flex gap-1">
                  <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); }} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); }} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="mt-1 text-center text-[15px] font-semibold text-slate-950">{MONTHS[calMonth]} {calYear}</p>
              <div className="mt-4 grid grid-cols-7 gap-y-2 text-center text-[11px]">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <span key={d} className="font-medium text-slate-500">{d}</span>)}
                {calendarCells.map((cell, idx) => (
                  <span key={`mini-${cell.dateStr}-${idx}`} className={`mx-auto grid h-7 w-7 place-items-center rounded-full font-semibold ${cell.dateStr === todayStr ? "bg-blue-600 text-white" : !cell.isCurrentMonth ? "text-slate-400" : tasksByDate.has(cell.dateStr) ? "bg-blue-50 text-blue-700" : "text-slate-800"}`}>
                    {cell.day || ""}
                  </span>
                ))}
              </div>
            </Panel>

            {/* Productivity */}
            <Panel className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-950">My Productivity</h2>
              </div>
              <div className="mt-5 flex items-center gap-5">
                <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#2563eb 0 ${productivity}%, #e2e8f0 ${productivity}% 100%)` }}>
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-[20px] font-semibold text-slate-950">{productivity}%</div>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-950">{productivity >= 75 ? "Great Progress!" : productivity >= 50 ? "Keep it up!" : "Getting started"}</p>
                  <p className="mt-1 text-[12px] leading-5 text-slate-500">Based on task completion rate</p>
                </div>
              </div>
            </Panel>
          </aside>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[440px] rounded-lg bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-slate-950">New Task</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[12px] font-bold text-slate-700">Title *</label>
                <input value={addForm.title} onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))} placeholder="Task title" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[12px] font-bold text-slate-700">Description</label>
                <textarea value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[12px] font-bold text-slate-700">Project (optional)</label>
                <select value={addForm.project_id} onChange={(e) => setAddForm((f) => ({ ...f, project_id: e.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
                  <option value="">No project</option>
                  {myProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-bold text-slate-700">Priority</label>
                  <select value={addForm.priority} onChange={(e) => setAddForm((f) => ({ ...f, priority: e.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-bold text-slate-700">Due Date</label>
                  <input type="date" value={addForm.due_date} onChange={(e) => setAddForm((f) => ({ ...f, due_date: e.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>
            {addError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600">{addError}</p>}
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={handleAddTask} disabled={addLoading} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-[13px] font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {addLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {addLoading ? "Creating..." : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
