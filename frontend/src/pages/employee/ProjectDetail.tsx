import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Users, Calendar,
  Loader2, X, AlertTriangle,
} from "lucide-react";
import { projectAPI, taskAPI } from "../../lib/api";
import { TaskDetailDrawer } from "./Tasks";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  role: string;
  employee_id?: string;
  employee: { id: string; name: string; department?: string; position?: string };
}

interface Milestone {
  id: string;
  title: string;
  due_date: string;
  status?: string;
}

interface Project {
  id: string;
  name: string;
  project_code?: string;
  description?: string;
  objectives?: string;
  status: string;
  priority?: string;
  health?: string;
  start_date?: string;
  end_date?: string;
  project_type?: string;
  department?: string;
  progress: number;
  manager?: { id: string; name: string; email?: string; department?: string };
  manager_id?: string;
  sponsor?: { id: string; name: string };
  project_members?: Member[];
  project_milestones?: Milestone[];
  task_count?: number;
  completed_task_count?: number;
  member_count?: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  project_id?: string;
  assigned_to?: string;
  project_name?: string;
}

interface ParentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function statusColor(s: string) {
  if (s === "active")    return "bg-emerald-50 text-emerald-700";
  if (s === "completed") return "bg-blue-50 text-blue-700";
  if (s === "on_hold")   return "bg-amber-50 text-amber-700";
  if (s === "cancelled") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-600";
}

function priorityColor(p: string) {
  if (p === "critical") return "bg-red-50 text-red-700";
  if (p === "high")     return "bg-orange-50 text-orange-700";
  if (p === "medium")   return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function healthDot(h: string) {
  if (h === "on_track") return "bg-emerald-500";
  if (h === "at_risk")  return "bg-amber-500";
  if (h === "delayed")  return "bg-red-500";
  return "bg-slate-400";
}

function healthLabel(h: string) {
  if (h === "on_track") return "On Track";
  if (h === "at_risk")  return "At Risk";
  if (h === "delayed")  return "Delayed";
  if (h === "blocked")  return "Blocked";
  return h || "On Track";
}

function taskStatusColor(s: string) {
  if (s === "done")        return "bg-emerald-50 text-emerald-700";
  if (s === "in_progress") return "bg-blue-50 text-blue-700";
  if (s === "review")      return "bg-violet-50 text-violet-700";
  return "bg-slate-100 text-slate-600";
}

// ── CreateSubTaskModal ─────────────────────────────────────────────────────────

interface SubTaskModalProps {
  projectId: string;
  parentTasks: ParentTask[];
  onClose: () => void;
  onSuccess: () => void;
}

function CreateSubTaskModal({ projectId, parentTasks, onClose, onSuccess }: SubTaskModalProps) {
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", due_date: "", parent_task_id: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const selectedParent = parentTasks.find(t => t.id === form.parent_task_id);

  const submit = async () => {
    if (!form.title.trim())         { setErr("Title is required"); return; }
    if (!form.parent_task_id)        { setErr("Parent task is required"); return; }
    setSaving(true); setErr("");
    try {
      await taskAPI.createSubTask({
        title:          form.title.trim(),
        description:    form.description || undefined,
        priority:       form.priority,
        due_date:       form.due_date || undefined,
        parent_task_id: form.parent_task_id,
        project_id:     projectId,
      });
      onSuccess();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create sub-task");
    } finally {
      setSaving(false);
    }
  };

  const parentDue = selectedParent ? (parentTasks.find(t => t.id === form.parent_task_id) as any)?.due_date : null;
  const dateExceedsParent = form.due_date && parentDue && form.due_date > parentDue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-[17px] font-semibold text-slate-950">New Sub-task</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" placeholder="Sub-task title" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Parent Task *</label>
            <select value={form.parent_task_id} onChange={e => setForm(f => ({ ...f, parent_task_id: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
              <option value="">Select parent task to work under</option>
              {parentTasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            {parentTasks.length === 0 && <p className="mt-1 text-[11px] text-slate-400">No active parent tasks in this project yet.</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            </div>
          </div>
          {dateExceedsParent && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Due date exceeds parent task deadline ({parentDue}).</span>
            </div>
          )}
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600">{err}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Creating..." : "Create Sub-task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [parentTasks, setParentTasks] = useState<ParentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskTab, setTaskTab] = useState<"my" | "completed">("my");
  const [showSubTaskModal, setShowSubTaskModal] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [projRes, tasksRes, myRes] = await Promise.allSettled([
        projectAPI.getDetail(projectId),
        taskAPI.getProjectTasks(projectId),
        taskAPI.getMyByProject(projectId),
      ]);
      if (projRes.status === "fulfilled") setProject(projRes.value as Project);
      if (tasksRes.status === "fulfilled") setParentTasks((tasksRes.value as ParentTask[]) || []);
      if (myRes.status === "fulfilled")   setMyTasks((myRes.value as Task[]) || []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3000); return () => clearTimeout(t); }, [toast]);

  const activeTasks    = myTasks.filter(t => t.status !== "done");
  const completedTasks = myTasks.filter(t => t.status === "done");
  const displayedTasks = taskTab === "completed" ? completedTasks : activeTasks;

  const allTasks   = project?.task_count           ?? myTasks.length;
  const doneTasks  = project?.completed_task_count ?? completedTasks.length;
  const progress   = project?.progress             ?? (allTasks > 0 ? Math.round((doneTasks / allTasks) * 100) : 0);

  const todoCount  = myTasks.filter(t => t.status === "todo").length;
  const inProgCount = myTasks.filter(t => t.status === "in_progress").length;
  const reviewCount = myTasks.filter(t => t.status === "review").length;
  const doneCount  = myTasks.filter(t => t.status === "done").length;

  const handleUpdateStatus = async (taskId: string, status: string) => {
    setUpdatingTask(taskId);
    try {
      await taskAPI.updateStatus(taskId, status);
      setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      setToast("Task updated");
    } catch {
      setToast("Failed to update task");
    } finally {
      setUpdatingTask(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-[#f8fafc]">
        <p className="text-[14px] text-slate-600">Project not found or you don't have access.</p>
        <button onClick={() => navigate(-1)} className="text-[13px] font-semibold text-blue-600 hover:underline">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f8fafc]">
      {detailTaskId && <TaskDetailDrawer taskId={detailTaskId} onClose={() => { setDetailTaskId(null); load(); }} />}
      {showSubTaskModal && (
        <CreateSubTaskModal
          projectId={project.id}
          parentTasks={parentTasks}
          onClose={() => setShowSubTaskModal(false)}
          onSuccess={() => { setShowSubTaskModal(false); setToast("Sub-task created"); load(); }}
        />
      )}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">{toast}</div>
      )}

      <div className="space-y-5 p-5 lg:p-6">

        {/* Header */}
        <div>
          <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to Projects
          </button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {project.project_code && (
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-500">{project.project_code}</span>
                )}
                <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${statusColor(project.status)}`}>{project.status}</span>
                {project.priority && <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${priorityColor(project.priority)}`}>{project.priority}</span>}
                {project.health && (
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${healthDot(project.health)}`} />
                    <span className="text-[12px] text-slate-500">{healthLabel(project.health)}</span>
                  </div>
                )}
              </div>
              <h1 className="mt-2 text-[26px] font-semibold text-slate-950">{project.name}</h1>
              {project.manager && <p className="mt-1 text-[13px] text-slate-500">Manager: <span className="font-semibold text-slate-700">{project.manager.name}</span></p>}
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 flex items-center gap-4">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[14px] font-semibold text-slate-700">{progress}%</span>
          </div>
        </div>

        {/* SECTION 1 — Overview */}
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-semibold text-slate-950">Project Overview</h2>
            {project.description && <p className="text-[13px] text-slate-700">{project.description}</p>}
            {project.objectives && (
              <div>
                <p className="mb-1 text-[12px] font-semibold text-slate-500">Objectives</p>
                <p className="text-[13px] text-slate-700">{project.objectives}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px]">
              <div><p className="font-semibold text-slate-500">Start Date</p><p className="mt-1 text-slate-900">{fmtDate(project.start_date)}</p></div>
              <div><p className="font-semibold text-slate-500">Deadline</p><p className="mt-1 text-slate-900">{fmtDate(project.end_date)}</p></div>
              {project.project_type && <div><p className="font-semibold text-slate-500">Type</p><p className="mt-1 capitalize text-slate-900">{project.project_type.replace("_", " ")}</p></div>}
              {project.department && <div><p className="font-semibold text-slate-500">Department</p><p className="mt-1 text-slate-900">{project.department}</p></div>}
            </div>
          </div>

          {/* Team members */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <h2 className="text-[15px] font-semibold text-slate-950">Team Members</h2>
            </div>
            <div className="mt-4 space-y-3">
              {(project.project_members || []).length === 0 ? (
                <p className="text-[12px] text-slate-400">No members listed</p>
              ) : (project.project_members || []).map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                    {(m.employee.name || "?")[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-slate-900">{m.employee.name}</p>
                    <p className="text-[11px] text-slate-500">{m.employee.department || m.employee.position || "—"}</p>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 capitalize">{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 2 — My Tasks */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-[15px] font-semibold text-slate-950">My Tasks in this Project</h2>
            <button onClick={() => setShowSubTaskModal(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700">
              + Create Sub-task
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-6 border-b border-slate-100 px-5 text-[13px] font-medium text-slate-600">
            {([["My Active Tasks", "my"], ["Completed", "completed"]] as [string, "my" | "completed"][]).map(([label, key]) => (
              <button key={key} onClick={() => setTaskTab(key)} className={`border-b-2 py-3 ${taskTab === key ? "border-blue-600 text-blue-700" : "border-transparent hover:text-slate-950"}`}>
                {label} {key === "my" ? `(${activeTasks.length})` : `(${completedTasks.length})`}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            {displayedTasks.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-slate-400">
                {taskTab === "completed" ? "No completed tasks yet." : "No active tasks assigned to you in this project."}
              </div>
            ) : (
              <table className="min-w-full text-[13px]">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Task</th>
                    <th className="px-5 py-3 font-semibold">Priority</th>
                    <th className="px-5 py-3 font-semibold">Due Date</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedTasks.map(task => (
                    <tr key={task.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <button onClick={() => setDetailTaskId(task.id)} className="text-left font-semibold text-slate-900 hover:text-blue-700">{task.title}</button>
                      </td>
                      <td className="px-5 py-3"><span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${priorityColor(task.priority)}`}>{task.priority}</span></td>
                      <td className="px-5 py-3 text-slate-600">{fmtDate(task.due_date)}</td>
                      <td className="px-5 py-3"><span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${taskStatusColor(task.status)}`}>{task.status.replace("_", " ")}</span></td>
                      <td className="px-5 py-3">
                        <select
                          value={task.status}
                          disabled={updatingTask === task.id}
                          onChange={e => handleUpdateStatus(task.id, e.target.value)}
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-blue-500"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="done">Done</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* SECTION 3 — Progress breakdown */}
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-semibold text-slate-950">Task Progress</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center text-[12px]">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[22px] font-semibold text-slate-950">{allTasks}</p>
                <p className="mt-1 text-slate-500">Total Tasks</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-[22px] font-semibold text-emerald-700">{doneTasks}</p>
                <p className="mt-1 text-emerald-600">Completed</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-[12px]">
              {[["To Do", todoCount, "bg-slate-300"], ["In Progress", inProgCount, "bg-blue-500"], ["Review", reviewCount, "bg-violet-500"], ["Done", doneCount, "bg-emerald-500"]].map(([label, count, color]) => {
                const pct = myTasks.length > 0 ? Math.round((Number(count) / myTasks.length) * 100) : 0;
                return (
                  <div key={String(label)} className="flex items-center gap-3">
                    <span className="w-20 text-slate-600">{label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right font-semibold text-slate-700">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 4 — Milestones */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <h2 className="text-[15px] font-semibold text-slate-950">Milestones</h2>
            </div>
            <div className="mt-4 space-y-3">
              {(project.project_milestones || []).length === 0 ? (
                <p className="text-[12px] text-slate-400">No milestones for this project.</p>
              ) : (project.project_milestones || []).map(m => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={m.status === "completed" ? "text-emerald-600" : m.status === "missed" ? "text-red-500" : "text-slate-400"}>
                      {m.status === "completed" ? "✓" : m.status === "missed" ? "✗" : "●"}
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-slate-900">{m.title}</p>
                      <p className="text-[11px] text-slate-500">{fmtDate(m.due_date)}</p>
                    </div>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${m.status === "completed" ? "bg-emerald-50 text-emerald-700" : m.status === "missed" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                    {m.status || "pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
