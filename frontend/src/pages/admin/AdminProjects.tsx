import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Pencil, Trash2, Eye, Users,
  Briefcase, CheckCircle2, Clock3, X, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import { projectAPI } from "../../lib/api";
import { apiFetch } from "../../lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Milestone {
  id?: string;
  title: string;
  due_date: string;
  status?: string;
}

interface Project {
  id: string;
  name: string;
  project_code?: string;
  description?: string;
  project_type?: string;
  category?: string;
  department?: string;
  client_name?: string;
  status: string;
  priority: string;
  health?: string;
  visibility?: string;
  start_date?: string;
  end_date?: string;
  estimated_duration?: number;
  budget?: number;
  budget_currency?: string;
  billing_type?: string;
  objectives?: string;
  deliverables?: string[];
  tags?: string[];
  allow_overtime?: boolean;
  require_timesheet_approval?: boolean;
  notify_on_milestone?: boolean;
  progress: number;
  task_count: number;
  completed_task_count: number;
  member_count: number;
  manager?: { id: string; name: string; department?: string };
  manager_id?: string;
  sponsor?: { id: string; name: string };
  sponsor_id?: string;
  project_members?: { id: string; role: string; employee: { id: string; name: string; department?: string } }[];
  project_milestones?: Milestone[];
  tasks?: { id: string; title: string; status: string; priority: string; due_date?: string; assignee?: { id: string; name: string } }[];
}

interface Employee {
  id: string;
  name: string;
  role: string;
  department?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_TABS = ["All", "active", "on_hold", "completed", "cancelled"];
const STATUS_LABELS: Record<string, string> = { All: "All", active: "Active", on_hold: "On Hold", completed: "Completed", cancelled: "Cancelled", planning: "Planning" };

function statusColor(s: string) {
  if (s === "active")    return "bg-emerald-50 text-emerald-700";
  if (s === "completed") return "bg-blue-50 text-blue-700";
  if (s === "on_hold")   return "bg-amber-50 text-amber-700";
  if (s === "cancelled") return "bg-red-50 text-red-700";
  if (s === "planning")  return "bg-violet-50 text-violet-700";
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

const PROJECT_TYPE_LABELS: Record<string, string> = {
  internal: "Internal", client: "Client", r_and_d: "R&D",
  compliance: "Compliance", infrastructure: "Infrastructure", product: "Product",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  const isError = msg.toLowerCase().startsWith("error") || msg.toLowerCase().includes("failed");
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${isError ? "bg-red-600" : "bg-slate-950"}`}>
      {msg}<button onClick={onClose}><X className="h-4 w-4" /></button>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof Briefcase; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-[13px] text-slate-500">{label}</p>
    </div>
  );
}

function Toggle({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
      <div className="mr-4">
        <p className="text-[13px] font-semibold text-slate-900">{label}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>
      </div>
      <div className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? "bg-blue-600" : "bg-slate-200"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
        <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="sr-only" />
      </div>
    </label>
  );
}

// ── ProjectFormData & defaults ─────────────────────────────────────────────────

interface ProjectFormData {
  name: string;
  project_type: string;
  category: string;
  department: string;
  description: string;
  client_name: string;
  manager_id: string;
  sponsor_id: string;
  member_ids: string[];
  start_date: string;
  end_date: string;
  priority: string;
  status: string;
  health: string;
  visibility: string;
  budget: string;
  budget_currency: string;
  billing_type: string;
  objectives: string;
  deliverables: string;
  tags: string;
  allow_overtime: boolean;
  require_timesheet_approval: boolean;
  notify_on_milestone: boolean;
  milestones: { title: string; due_date: string }[];
}

const EMPTY_FORM: ProjectFormData = {
  name: "", project_type: "internal", category: "", department: "",
  description: "", client_name: "", manager_id: "", sponsor_id: "",
  member_ids: [], start_date: "", end_date: "",
  priority: "medium", status: "active", health: "on_track", visibility: "team",
  budget: "", budget_currency: "INR", billing_type: "internal",
  objectives: "", deliverables: "", tags: "",
  allow_overtime: true, require_timesheet_approval: true, notify_on_milestone: true,
  milestones: [],
};

function buildInitialForm(initial: Project): ProjectFormData {
  return {
    name:           initial.name,
    project_type:   initial.project_type || "internal",
    category:       initial.category || "",
    department:     initial.department || "",
    description:    initial.description || "",
    client_name:    initial.client_name || "",
    manager_id:     initial.manager_id || initial.manager?.id || "",
    sponsor_id:     initial.sponsor_id || initial.sponsor?.id || "",
    member_ids:     (initial.project_members || []).map(m => m.employee.id),
    start_date:     initial.start_date?.split("T")[0] || "",
    end_date:       initial.end_date?.split("T")[0] || "",
    priority:       initial.priority || "medium",
    status:         initial.status || "active",
    health:         initial.health || "on_track",
    visibility:     initial.visibility || "team",
    budget:         initial.budget ? String(initial.budget) : "",
    budget_currency: initial.budget_currency || "INR",
    billing_type:   initial.billing_type || "internal",
    objectives:     initial.objectives || "",
    deliverables:   initial.deliverables?.join("\n") || "",
    tags:           initial.tags?.join(", ") || "",
    allow_overtime: initial.allow_overtime !== false,
    require_timesheet_approval: initial.require_timesheet_approval !== false,
    notify_on_milestone: initial.notify_on_milestone !== false,
    milestones:     (initial.project_milestones || []).map(m => ({ title: m.title, due_date: m.due_date })),
  };
}

// ── ProjectModal (4-section tabs) ─────────────────────────────────────────────

const MODAL_SECTIONS = [
  { key: "basic",    label: "Basic Info" },
  { key: "team",     label: "Team" },
  { key: "timeline", label: "Timeline & Scope" },
  { key: "settings", label: "Settings" },
] as const;

type ModalSection = typeof MODAL_SECTIONS[number]["key"];

function ProjectModal({
  mode, initial, managers, employees, onClose, onSave,
}: {
  mode: "create" | "edit";
  initial?: Project;
  managers: Employee[];
  employees: Employee[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState<ProjectFormData>(() => initial ? buildInitialForm(initial) : EMPTY_FORM);
  const [activeSection, setActiveSection] = useState<ModalSection>("basic");
  const [memberSearch, setMemberSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const f = <K extends keyof ProjectFormData>(key: K, value: ProjectFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleMember = (id: string) =>
    setForm(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(id)
        ? prev.member_ids.filter(x => x !== id)
        : [...prev.member_ids, id],
    }));

  const addMilestone = () => setForm(prev => ({ ...prev, milestones: [...prev.milestones, { title: "", due_date: "" }] }));
  const removeMilestone = (idx: number) => setForm(prev => ({ ...prev, milestones: prev.milestones.filter((_, i) => i !== idx) }));
  const updateMilestone = (idx: number, field: "title" | "due_date", value: string) =>
    setForm(prev => ({ ...prev, milestones: prev.milestones.map((m, i) => i === idx ? { ...m, [field]: value } : m) }));

  const availableMembers = employees.filter(e =>
    e.id !== form.manager_id &&
    e.id !== form.sponsor_id &&
    e.role !== "admin" &&
    (memberSearch === "" || e.name.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  const handleSubmit = async () => {
    if (!form.name.trim()) { setErr("Project name is required"); return; }
    if (!form.manager_id) { setErr("Manager is required"); return; }
    setSaving(true); setErr("");
    try {
      const payload: Record<string, unknown> = {
        name:           form.name.trim(),
        project_type:   form.project_type,
        category:       form.category || undefined,
        department:     form.department || undefined,
        description:    form.description || undefined,
        client_name:    form.client_name || undefined,
        manager_id:     form.manager_id,
        sponsor_id:     form.sponsor_id || undefined,
        member_ids:     form.member_ids,
        start_date:     form.start_date || undefined,
        end_date:       form.end_date || undefined,
        priority:       form.priority,
        status:         form.status,
        health:         form.health,
        visibility:     form.visibility,
        budget:         form.budget ? Number(form.budget) : undefined,
        budget_currency: form.budget_currency,
        billing_type:   form.billing_type,
        objectives:     form.objectives || undefined,
        deliverables:   form.deliverables
          ? form.deliverables.split("\n").map(d => d.trim()).filter(Boolean)
          : undefined,
        tags: form.tags
          ? form.tags.split(",").map(t => t.trim()).filter(Boolean)
          : undefined,
        allow_overtime:             form.allow_overtime,
        require_timesheet_approval: form.require_timesheet_approval,
        notify_on_milestone:        form.notify_on_milestone,
        milestones: form.milestones.filter(m => m.title.trim() && m.due_date),
      };
      await onSave(payload);
    } catch (e: any) {
      setErr(e.message || "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500";
  const selectCls = "h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500";
  const labelCls = "mb-1.5 block text-[12px] font-semibold text-slate-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-[17px] font-semibold text-slate-950">{mode === "create" ? "New Project" : "Edit Project"}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
        </div>

        {/* Section tabs */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {MODAL_SECTIONS.map(s => (
              <button key={s.key} type="button" onClick={() => setActiveSection(s.key)}
                className={`flex-1 rounded-md py-1.5 text-[12px] font-semibold transition ${activeSection === s.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[55vh] overflow-y-auto px-6 py-5 space-y-4">

          {/* ── SECTION 1: Basic Info ─────────────────────────────────── */}
          {activeSection === "basic" && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Project Name *</label>
                <input value={form.name} onChange={e => f("name", e.target.value)} className={inputCls} placeholder="Enter project name" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Project Type</label>
                  <select value={form.project_type} onChange={e => f("project_type", e.target.value)} className={selectCls}>
                    <option value="internal">Internal</option>
                    <option value="client">Client Project</option>
                    <option value="r_and_d">R&D</option>
                    <option value="compliance">Compliance</option>
                    <option value="infrastructure">Infrastructure</option>
                    <option value="product">Product</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Category</label>
                  <input value={form.category} onChange={e => f("category", e.target.value)} className={inputCls} placeholder="e.g. Digital Transformation" />
                </div>
                <div>
                  <label className={labelCls}>Department</label>
                  <input value={form.department} onChange={e => f("department", e.target.value)} className={inputCls} placeholder="e.g. Engineering" />
                </div>
                {form.project_type === "client" && (
                  <div>
                    <label className={labelCls}>Client Name</label>
                    <input value={form.client_name} onChange={e => f("client_name", e.target.value)} className={inputCls} placeholder="Client company name" />
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Project description" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelCls}>Priority</label>
                  <select value={form.priority} onChange={e => f("priority", e.target.value)} className={selectCls}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={form.status} onChange={e => f("status", e.target.value)} className={selectCls}>
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Health</label>
                  <select value={form.health} onChange={e => f("health", e.target.value)} className={selectCls}>
                    <option value="on_track">On Track</option>
                    <option value="at_risk">At Risk</option>
                    <option value="delayed">Delayed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Visibility</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { value: "public",  label: "Public",      note: "All employees can see" },
                    { value: "team",    label: "Team Only",   note: "Only assigned members" },
                    { value: "private", label: "Private",     note: "Manager and admin only" },
                  ].map(opt => (
                    <label key={opt.value} className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition ${form.visibility === opt.value ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                      <div className="flex items-center gap-2">
                        <input type="radio" name="visibility" value={opt.value} checked={form.visibility === opt.value} onChange={() => f("visibility", opt.value)} className="accent-blue-600" />
                        <span className="text-[13px] font-semibold text-slate-900">{opt.label}</span>
                      </div>
                      <span className="pl-5 text-[11px] text-slate-500">{opt.note}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 2: Team ───────────────────────────────────────── */}
          {activeSection === "team" && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Project Manager *</label>
                <select value={form.manager_id} onChange={e => f("manager_id", e.target.value)} className={selectCls}>
                  <option value="">Select manager</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Project Sponsor <span className="font-normal text-slate-400">(optional)</span></label>
                <select value={form.sponsor_id} onChange={e => f("sponsor_id", e.target.value)} className={selectCls}>
                  <option value="">No sponsor</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">Senior stakeholder — notified on milestones</p>
              </div>
              <div>
                <label className={labelCls}>Team Members</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-[13px] outline-none focus:border-blue-500" placeholder="Search employees..." />
                </div>
                <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200">
                  {availableMembers.length === 0 ? (
                    <p className="p-3 text-[12px] text-slate-400">No employees available</p>
                  ) : availableMembers.map(emp => (
                    <label key={emp.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50">
                      <input type="checkbox" checked={form.member_ids.includes(emp.id)} onChange={() => toggleMember(emp.id)} className="rounded" />
                      <div>
                        <p className="text-[13px] font-medium text-slate-900">{emp.name}</p>
                        <p className="text-[11px] text-slate-500">{emp.department || emp.role}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {form.member_ids.length > 0 && (
                  <p className="mt-1 text-[12px] text-blue-700">{form.member_ids.length} member{form.member_ids.length > 1 ? "s" : ""} selected</p>
                )}
              </div>
            </div>
          )}

          {/* ── SECTION 3: Timeline & Scope ───────────────────────────── */}
          {activeSection === "timeline" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => f("start_date", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>End Date / Deadline</label>
                  <input type="date" value={form.end_date} onChange={e => f("end_date", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Budget</label>
                  <input type="number" value={form.budget} onChange={e => f("budget", e.target.value)} className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Currency</label>
                  <select value={form.budget_currency} onChange={e => f("budget_currency", e.target.value)} className={selectCls}>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Billing Type</label>
                  <select value={form.billing_type} onChange={e => f("billing_type", e.target.value)} className={selectCls}>
                    <option value="internal">Internal</option>
                    <option value="fixed">Fixed Price</option>
                    <option value="time_and_material">Time & Material</option>
                    <option value="retainer">Retainer</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Project Goals / Objectives</label>
                <textarea value={form.objectives} onChange={e => f("objectives", e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="What does this project aim to achieve?" />
              </div>
              <div>
                <label className={labelCls}>Deliverables</label>
                <textarea value={form.deliverables} onChange={e => f("deliverables", e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="List key deliverables, one per line" />
              </div>
              <div>
                <label className={labelCls}>Tags (comma-separated)</label>
                <input value={form.tags} onChange={e => f("tags", e.target.value)} className={inputCls} placeholder="frontend, api, critical" />
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className={`${labelCls} mb-0`}>Key Milestones</label>
                  <button type="button" onClick={addMilestone} className="text-[12px] font-semibold text-blue-600 hover:text-blue-800">+ Add Milestone</button>
                </div>
                {form.milestones.length === 0 ? (
                  <p className="text-[12px] text-slate-400">No milestones yet. Click "Add Milestone" to add one.</p>
                ) : form.milestones.map((m, idx) => (
                  <div key={idx} className="mb-2 flex items-center gap-2">
                    <input value={m.title} onChange={e => updateMilestone(idx, "title", e.target.value)} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Milestone title" />
                    <input type="date" value={m.due_date} onChange={e => updateMilestone(idx, "due_date", e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
                    <button type="button" onClick={() => removeMilestone(idx)} className="text-slate-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION 4: Settings ───────────────────────────────────── */}
          {activeSection === "settings" && (
            <div className="space-y-3">
              <Toggle
                label="Allow Overtime"
                description="Team members can log hours beyond standard shift hours"
                value={form.allow_overtime}
                onChange={v => f("allow_overtime", v)}
              />
              <Toggle
                label="Require Timesheet Approval"
                description="All timesheets must be approved by the project manager before payroll"
                value={form.require_timesheet_approval}
                onChange={v => f("require_timesheet_approval", v)}
              />
              <Toggle
                label="Milestone Notifications"
                description="Send notifications when milestones are due or completed"
                value={form.notify_on_milestone}
                onChange={v => f("notify_on_milestone", v)}
              />
            </div>
          )}

          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600">{err}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : mode === "create" ? "Create Project" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Project Detail Drawer ──────────────────────────────────────────────────────

function ProjectDetailDrawer({ project, employees, onClose, onReload }: {
  project: Project; employees: Employee[]; onClose: () => void; onReload: () => void;
}) {
  const [addMemberId, setAddMemberId] = useState("");
  const [addMemberRole, setAddMemberRole] = useState("member");
  const [addingMember, setAddingMember] = useState(false);
  const [toast, setToast] = useState("");
  const [detail, setDetail] = useState<Project>(project);

  useEffect(() => {
    projectAPI.getDetail(project.id).then(d => setDetail(d as Project)).catch(() => {});
  }, [project.id]);

  const existingMemberIds = new Set((detail.project_members || []).map(m => m.employee.id));
  const availableToAdd = employees.filter(e => !existingMemberIds.has(e.id) && e.id !== (detail.manager?.id || detail.manager_id));

  const handleAddMember = async () => {
    if (!addMemberId) return;
    setAddingMember(true);
    try {
      await projectAPI.addMember(detail.id, { employee_id: addMemberId, role: addMemberRole });
      const fresh = await projectAPI.getDetail(detail.id);
      setDetail(fresh as Project);
      setAddMemberId("");
      setToast("Member added");
    } catch (e: any) {
      setToast("Error: " + e.message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await projectAPI.removeMember(detail.id, memberId);
      const fresh = await projectAPI.getDetail(detail.id);
      setDetail(fresh as Project);
      setToast("Member removed");
    } catch (e: any) {
      setToast("Error: " + e.message);
    }
  };

  const milestoneStatusColor = (s?: string) => {
    if (s === "completed") return "bg-emerald-50 text-emerald-700";
    if (s === "missed")    return "bg-red-50 text-red-700";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-slate-900/40" onClick={onClose} />
      <aside className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl">
        {toast && <Toast msg={toast} onClose={() => setToast("")} />}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            {detail.project_code && <p className="text-[11px] font-semibold text-slate-400">{detail.project_code}</p>}
            <h2 className="text-[16px] font-semibold text-slate-950">{detail.name}</h2>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${healthDot(detail.health || "on_track")}`} />
                <span className="text-[11px] text-slate-500">{healthLabel(detail.health || "on_track")}</span>
              </div>
              <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${statusColor(detail.status)}`}>{STATUS_LABELS[detail.status] || detail.status}</span>
              <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${priorityColor(detail.priority || "medium")}`}>{detail.priority || "medium"}</span>
            </div>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
        </div>

        <div className="space-y-5 p-5">
          {/* Manager & Sponsor */}
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            {detail.manager && (
              <div>
                <p className="font-semibold text-slate-500">Manager</p>
                <p className="mt-1 font-semibold text-slate-900">{detail.manager.name}</p>
              </div>
            )}
            {detail.sponsor && (
              <div>
                <p className="font-semibold text-slate-500">Sponsor</p>
                <p className="mt-1 font-semibold text-slate-900">{detail.sponsor.name}</p>
              </div>
            )}
          </div>

          {/* Progress */}
          <div>
            <p className="mb-2 text-[12px] font-semibold text-slate-500">Progress</p>
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${detail.progress || 0}%` }} />
              </div>
              <span className="text-[13px] font-semibold text-slate-700">{detail.progress || 0}%</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[20px] font-semibold text-slate-950">{detail.task_count || 0}</p>
              <p className="text-[11px] text-slate-500">Total Tasks</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-[20px] font-semibold text-emerald-700">{detail.completed_task_count || 0}</p>
              <p className="text-[11px] text-emerald-600">Done</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-[20px] font-semibold text-blue-700">{detail.member_count || (detail.project_members || []).length}</p>
              <p className="text-[11px] text-blue-600">Members</p>
            </div>
          </div>

          {/* Project Info */}
          <div className="rounded-lg border border-slate-100 p-3">
            <p className="mb-3 text-[12px] font-semibold text-slate-700">Project Info</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              {detail.project_code && <><span className="text-slate-500">Code</span><span className="font-mono font-semibold text-slate-900">{detail.project_code}</span></>}
              {detail.project_type && <><span className="text-slate-500">Type</span><span className="text-slate-900">{PROJECT_TYPE_LABELS[detail.project_type] || detail.project_type}</span></>}
              {detail.department && <><span className="text-slate-500">Department</span><span className="text-slate-900">{detail.department}</span></>}
              {detail.client_name && <><span className="text-slate-500">Client</span><span className="text-slate-900">{detail.client_name}</span></>}
              {detail.billing_type && <><span className="text-slate-500">Billing</span><span className="text-slate-900 capitalize">{detail.billing_type.replace("_", " ")}</span></>}
              {detail.visibility && <><span className="text-slate-500">Visibility</span><span className="text-slate-900 capitalize">{detail.visibility}</span></>}
              <><span className="text-slate-500">Start</span><span className="text-slate-900">{fmtDate(detail.start_date)}</span></>
              <><span className="text-slate-500">Deadline</span><span className="text-slate-900">{fmtDate(detail.end_date)}</span></>
            </div>
          </div>

          {/* Financials */}
          {detail.budget && (
            <div className="rounded-lg border border-slate-100 p-3">
              <p className="mb-3 text-[12px] font-semibold text-slate-700">Financials</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                <span className="text-slate-500">Budget</span>
                <span className="font-semibold text-slate-900">
                  {detail.budget_currency === "INR" ? "₹" : detail.budget_currency === "USD" ? "$" : detail.budget_currency === "EUR" ? "€" : "£"}
                  {Number(detail.budget).toLocaleString("en-IN")}
                </span>
                {(detail as any).actual_cost > 0 && (
                  <><span className="text-slate-500">Actual Cost</span><span className="text-slate-900">{Number((detail as any).actual_cost).toLocaleString("en-IN")}</span></>
                )}
              </div>
            </div>
          )}

          {/* Objectives & Deliverables */}
          {(detail.objectives || (detail.deliverables || []).length > 0) && (
            <div>
              {detail.objectives && (
                <div className="mb-3">
                  <p className="mb-1 text-[12px] font-semibold text-slate-500">Objectives</p>
                  <p className="text-[13px] text-slate-700">{detail.objectives}</p>
                </div>
              )}
              {(detail.deliverables || []).length > 0 && (
                <div>
                  <p className="mb-1 text-[12px] font-semibold text-slate-500">Deliverables</p>
                  <ul className="space-y-1">
                    {(detail.deliverables || []).map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />{d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {detail.description && (
            <div>
              <p className="text-[12px] font-semibold text-slate-500">Description</p>
              <p className="mt-1 text-[13px] text-slate-700">{detail.description}</p>
            </div>
          )}

          {/* Milestones */}
          {(detail.project_milestones || []).length > 0 && (
            <div>
              <p className="mb-3 text-[13px] font-semibold text-slate-900">Milestones</p>
              <div className="space-y-2">
                {(detail.project_milestones || []).map((m, i) => (
                  <div key={m.id || i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={m.status === "completed" ? "text-emerald-600" : m.status === "missed" ? "text-red-500" : "text-slate-400"}>
                        {m.status === "completed" ? "✓" : m.status === "missed" ? "✗" : "●"}
                      </span>
                      <div>
                        <p className="text-[13px] font-medium text-slate-900">{m.title}</p>
                        <p className="text-[11px] text-slate-500">{fmtDate(m.due_date)}</p>
                      </div>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${milestoneStatusColor(m.status)}`}>{m.status || "pending"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings badges */}
          <div>
            <p className="mb-3 text-[13px] font-semibold text-slate-900">Settings</p>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${detail.allow_overtime !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                Overtime: {detail.allow_overtime !== false ? "Allowed" : "Not Allowed"}
              </span>
              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${detail.require_timesheet_approval !== false ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                Timesheets: {detail.require_timesheet_approval !== false ? "Approval Required" : "Auto-approved"}
              </span>
              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${detail.notify_on_milestone !== false ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                Notifications: {detail.notify_on_milestone !== false ? "On" : "Off"}
              </span>
            </div>
          </div>

          {/* Team Members */}
          <div>
            <p className="mb-3 text-[13px] font-semibold text-slate-900">Team Members</p>
            {(detail.project_members || []).length === 0 ? (
              <p className="text-[12px] text-slate-400">No members added yet</p>
            ) : (detail.project_members || []).map(m => (
              <div key={m.id} className="mb-2 flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div>
                  <p className="text-[13px] font-medium text-slate-900">{m.employee.name}</p>
                  <p className="text-[11px] text-slate-500">{m.employee.department || "—"} · {m.role}</p>
                </div>
                <button onClick={() => handleRemoveMember(m.id)} className="text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>

          {/* Add Member */}
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-3 text-[12px] font-semibold text-slate-700">Add Member</p>
            <div className="flex gap-2">
              <select value={addMemberId} onChange={e => setAddMemberId(e.target.value)} className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] outline-none focus:border-blue-500">
                <option value="">Select employee</option>
                {availableToAdd.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select value={addMemberRole} onChange={e => setAddMemberRole(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] outline-none focus:border-blue-500">
                <option value="member">Member</option>
                <option value="lead">Lead</option>
                <option value="reviewer">Reviewer</option>
              </select>
              <button onClick={handleAddMember} disabled={addingMember || !addMemberId} className="rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">
                {addingMember ? "..." : "Add"}
              </button>
            </div>
          </div>

          {/* Tasks preview */}
          {(detail.tasks || []).length > 0 && (
            <div>
              <p className="mb-3 text-[13px] font-semibold text-slate-900">Tasks</p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full text-[12px]">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Title</th>
                      <th className="px-3 py-2 text-left">Assignee</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(detail.tasks || []).slice(0, 8).map(t => (
                      <tr key={t.id}>
                        <td className="px-3 py-2 font-medium text-slate-900">{t.title}</td>
                        <td className="px-3 py-2 text-slate-600">{t.assignee?.name || "—"}</td>
                        <td className="px-3 py-2"><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusColor(t.status)}`}>{t.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────

function DeleteConfirmModal({ project, onClose, onConfirm }: { project: Project; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-[17px] font-semibold text-slate-950">Delete Project</h2>
        <p className="mt-3 text-[13px] text-slate-600">
          Are you sure you want to delete <span className="font-semibold">{project.name}</span>? This will also delete all tasks.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={async () => { setDeleting(true); await onConfirm(); setDeleting(false); }} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProjectModal] = useState<Project | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);

  const managers = employees.filter(e => e.role === "manager");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, empRes] = await Promise.allSettled([
        projectAPI.getAll(),
        apiFetch("/employees"),
      ]);
      console.log('projRes:', projRes);
      if (projRes.status === "fulfilled") {
        console.log('projects data:', projRes.value);
        setProjects(Array.isArray(projRes.value) ? (projRes.value as Project[]) : []);
      }
      if (empRes.status === "fulfilled") setEmployees(Array.isArray(empRes.value) ? (empRes.value as Employee[]) : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3500); return () => clearTimeout(t); }, [toast]);

  const filtered = projects.filter(p => {
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.project_code || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.manager?.name || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total:      projects.length,
    active:     projects.filter(p => p.status === "active").length,
    completed:  projects.filter(p => p.status === "completed").length,
    totalTasks: projects.reduce((s, p) => s + (p.task_count || 0), 0),
    members:    new Set(projects.flatMap(p => (p.project_members || []).map(m => m.employee?.id)).filter(Boolean)).size,
  };

  const handleCreate = async (data: Record<string, unknown>) => {
    await projectAPI.createAdmin(data);
    setToast("Project created successfully");
    setShowCreate(false);
    await load();
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editProject) return;
    await projectAPI.update(editProject.id, data);
    setToast("Project updated successfully");
    setEditProject(null);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteProject) return;
    await projectAPI.delete(deleteProject.id);
    setToast("Project deleted");
    setDeleteProjectModal(null);
    await load();
  };

  return (
    <div className="min-h-full bg-[#f8fafc]">
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}

      {showCreate && (
        <ProjectModal mode="create" managers={managers} employees={employees}
          onClose={() => setShowCreate(false)} onSave={handleCreate} />
      )}
      {editProject && (
        <ProjectModal mode="edit" initial={editProject} managers={managers} employees={employees}
          onClose={() => setEditProject(null)} onSave={handleEdit} />
      )}
      {deleteProject && (
        <DeleteConfirmModal project={deleteProject} onClose={() => setDeleteProjectModal(null)} onConfirm={handleDelete} />
      )}
      {detailProject && (
        <ProjectDetailDrawer project={detailProject} employees={employees}
          onClose={() => setDetailProject(null)} onReload={load} />
      )}

      <div className="space-y-5 p-5 lg:p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[26px] font-semibold text-slate-950">Project Management</h1>
            <p className="mt-1 text-[13px] text-slate-500">Create projects, assign managers, build teams</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-700">
            <Plus className="h-4 w-4" /> New Project
          </button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Projects" value={stats.total} icon={Briefcase} color="bg-violet-50 text-violet-600" />
          <StatCard label="Active Projects" value={stats.active} icon={Clock3} color="bg-blue-50 text-blue-600" />
          <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
          <StatCard label="Total Tasks" value={stats.totalTasks} icon={Briefcase} color="bg-amber-50 text-amber-600" />
          <StatCard label="Team Members" value={stats.members} icon={Users} color="bg-rose-50 text-rose-600" />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 overflow-x-auto">
              {STATUS_TABS.map(tab => (
                <button key={tab} onClick={() => { setStatusFilter(tab); setPage(1); }}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${statusFilter === tab ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                  {STATUS_LABELS[tab]}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500"
                placeholder="Search projects or code..." />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-2 p-5">
                {[1,2,3,4,5].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
              </div>
            ) : (
              <table className="min-w-full text-left text-[13px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Project Name</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Manager</th>
                    <th className="px-4 py-3 font-semibold">Sponsor</th>
                    <th className="px-4 py-3 font-semibold">Team</th>
                    <th className="px-4 py-3 font-semibold">Tasks</th>
                    <th className="px-4 py-3 font-semibold">Progress</th>
                    <th className="px-4 py-3 font-semibold">Priority</th>
                    <th className="px-4 py-3 font-semibold">Health / Status</th>
                    <th className="px-4 py-3 font-semibold">Deadline</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.length === 0 ? (
                    <tr><td colSpan={12} className="px-4 py-8 text-center text-slate-400">No projects found</td></tr>
                  ) : paginated.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{p.project_code || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-950">{p.name}</td>
                      <td className="px-4 py-3 text-slate-600">{PROJECT_TYPE_LABELS[p.project_type || "internal"] || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{p.manager?.name || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{p.sponsor?.name || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{p.member_count || 0}</td>
                      <td className="px-4 py-3 text-slate-600">{p.completed_task_count || 0}/{p.task_count || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${p.progress || 0}%` }} />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600">{p.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${priorityColor(p.priority || "medium")}`}>{p.priority || "medium"}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${healthDot(p.health || "on_track")}`} />
                          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${statusColor(p.status)}`}>{STATUS_LABELS[p.status] || p.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fmtDate(p.end_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditProject(p)} title="Edit" className="text-slate-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setDetailProject(p)} title="Members" className="text-slate-400 hover:text-blue-600"><Users className="h-4 w-4" /></button>
                          <button onClick={() => setDeleteProjectModal(p)} title="Delete" className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                          <button onClick={() => setDetailProject(p)} title="View Detail" className="text-slate-400 hover:text-blue-600"><Eye className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[12px] text-slate-500">
            <span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)} className={`grid h-8 w-8 place-items-center rounded-md font-semibold ${page === n ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-700"}`}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[14px] font-semibold text-slate-950">Projects by Status</h2>
            <div className="mt-4 space-y-3">
              {["active","on_hold","completed","cancelled"].map(s => {
                const count = projects.filter(p => p.status === s).length;
                const pct = projects.length > 0 ? Math.round((count / projects.length) * 100) : 0;
                return (
                  <div key={s} className="flex items-center gap-3 text-[13px]">
                    <span className="w-24 text-slate-600">{STATUS_LABELS[s]}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right font-semibold text-slate-700">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[14px] font-semibold text-slate-950">Projects by Priority</h2>
            <div className="mt-4 space-y-3">
              {["critical","high","medium","low"].map((pri, idx) => {
                const count = projects.filter(p => (p.priority || "medium") === pri).length;
                const pct = projects.length > 0 ? Math.round((count / projects.length) * 100) : 0;
                const colors = ["bg-red-500","bg-orange-500","bg-amber-500","bg-slate-400"];
                return (
                  <div key={pri} className="flex items-center gap-3 text-[13px]">
                    <span className="w-16 capitalize text-slate-600">{pri}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${colors[idx]}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right font-semibold text-slate-700">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
