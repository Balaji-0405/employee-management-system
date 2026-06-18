import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import {
  Flag, CheckCircle2, Clock, AlertTriangle, Plus, ChevronDown,
  ChevronRight, X, Users, Briefcase, TrendingUp, Calendar,
  Edit2, Trash2, Link,
} from "lucide-react";

// ── shared helpers ────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-indigo-500 to-blue-600",
  "from-fuchsia-500 to-violet-600",
  "from-teal-500 to-emerald-600",
];
const avatarGradient = (name: string) =>
  AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
const getInitials = (name: string) =>
  name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

// ── Gantt / timeline helpers ──────────────────────────────────────────────────

const TIMELINE_START = new Date(2026, 2, 1);   // Mar 1
const TIMELINE_END   = new Date(2026, 8, 1);   // Sep 1
const TOTAL_RANGE    = TIMELINE_END.getTime() - TIMELINE_START.getTime();
const TODAY_DATE     = new Date(2026, 5, 6);   // Jun 6
const TODAY_PCT      = ((TODAY_DATE.getTime() - TIMELINE_START.getTime()) / TOTAL_RANGE) * 100;

function dateToPct(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.max(0, Math.min(100, ((d.getTime() - TIMELINE_START.getTime()) / TOTAL_RANGE) * 100));
}

const MONTH_LABELS = [
  { label: "Mar '26", pct: 0 },
  { label: "Apr '26", pct: ((new Date(2026,3,1).getTime()-TIMELINE_START.getTime())/TOTAL_RANGE)*100 },
  { label: "May '26", pct: ((new Date(2026,4,1).getTime()-TIMELINE_START.getTime())/TOTAL_RANGE)*100 },
  { label: "Jun '26", pct: ((new Date(2026,5,1).getTime()-TIMELINE_START.getTime())/TOTAL_RANGE)*100 },
  { label: "Jul '26", pct: ((new Date(2026,6,1).getTime()-TIMELINE_START.getTime())/TOTAL_RANGE)*100 },
  { label: "Aug '26", pct: ((new Date(2026,7,1).getTime()-TIMELINE_START.getTime())/TOTAL_RANGE)*100 },
];

// ── Milestone data ────────────────────────────────────────────────────────────

type MilestoneStatus = "completed" | "on-track" | "at-risk" | "overdue";

interface Milestone {
  id: string;
  name: string;
  project: string;
  projectColor: string;
  dueDate: string;
  startDate: string;
  status: MilestoneStatus;
  progress: number;
  owner: string;
  tasks: number;
  completedTasks: number;
  dependencies: string[];
  description: string;
}

const PROJECTS_COLORS: Record<string, string> = {
  "Alpha Platform Rebuild": "blue",
  "Mobile App v3": "green",
  "Data Pipeline Infra": "violet",
};

const MILESTONES: Milestone[] = [
  { id:"M1", name:"Design System Complete", project:"Alpha Platform Rebuild", projectColor:"blue",
    dueDate:"2026-03-28", startDate:"2026-03-01", status:"completed", progress:100,
    owner:"Sarah Johnson", tasks:12, completedTasks:12, dependencies:[], description:"Finalize all design tokens, component library, and documentation." },
  { id:"M2", name:"API v2 Contracts Signed", project:"Alpha Platform Rebuild", projectColor:"blue",
    dueDate:"2026-04-15", startDate:"2026-03-20", status:"completed", progress:100,
    owner:"Marcus Chen", tasks:8, completedTasks:8, dependencies:["M1"], description:"Complete REST and GraphQL contract definitions and stakeholder sign-off." },
  { id:"M3", name:"Beta Launch", project:"Alpha Platform Rebuild", projectColor:"blue",
    dueDate:"2026-06-10", startDate:"2026-04-16", status:"on-track", progress:72,
    owner:"Sarah Johnson", tasks:24, completedTasks:17, dependencies:["M2"], description:"Public beta release for external testing." },
  { id:"M4", name:"iOS Feature Parity", project:"Mobile App v3", projectColor:"green",
    dueDate:"2026-05-15", startDate:"2026-03-10", status:"completed", progress:100,
    owner:"Emily Rodriguez", tasks:18, completedTasks:18, dependencies:[], description:"Match all Android features on the iOS client." },
  { id:"M5", name:"App Store Submission", project:"Mobile App v3", projectColor:"green",
    dueDate:"2026-05-30", startDate:"2026-05-15", status:"completed", progress:100,
    owner:"Emily Rodriguez", tasks:6, completedTasks:6, dependencies:["M4"], description:"Complete App Store and Google Play submission checklists." },
  { id:"M6", name:"Push Notifications Live", project:"Mobile App v3", projectColor:"green",
    dueDate:"2026-05-28", startDate:"2026-05-10", status:"overdue", progress:45,
    owner:"Liam Park", tasks:9, completedTasks:4, dependencies:["M5"], description:"Real-time push notification infrastructure deployed." },
  { id:"M7", name:"Ingestion Pipeline v2", project:"Data Pipeline Infra", projectColor:"violet",
    dueDate:"2026-06-20", startDate:"2026-04-01", status:"on-track", progress:60,
    owner:"Priya Sharma", tasks:15, completedTasks:9, dependencies:[], description:"Second-generation data ingestion layer with Kafka streaming." },
  { id:"M8", name:"Legacy ETL Sunset", project:"Data Pipeline Infra", projectColor:"violet",
    dueDate:"2026-04-30", startDate:"2026-04-01", status:"completed", progress:100,
    owner:"Vikram Singh", tasks:10, completedTasks:10, dependencies:["M7"], description:"Decommission old ETL jobs and migrate dependent dashboards." },
  { id:"M9", name:"Real-time Analytics GA", project:"Data Pipeline Infra", projectColor:"violet",
    dueDate:"2026-07-31", startDate:"2026-06-01", status:"on-track", progress:20,
    owner:"Priya Sharma", tasks:20, completedTasks:4, dependencies:["M7"], description:"General availability for real-time analytics product." },
  { id:"M10", name:"GA Release", project:"Alpha Platform Rebuild", projectColor:"blue",
    dueDate:"2026-08-15", startDate:"2026-06-11", status:"on-track", progress:5,
    owner:"Marcus Chen", tasks:30, completedTasks:2, dependencies:["M3"], description:"General availability release with SLA guarantees." },
];

const STATUS_META: Record<MilestoneStatus, { label: string; color: string; icon: React.ReactNode }> = {
  completed: { label:"Completed", color:"text-emerald-700 bg-emerald-50 border-emerald-200", icon:<CheckCircle2 size={13}/> },
  "on-track": { label:"On Track",  color:"text-blue-700 bg-blue-50 border-blue-200",       icon:<TrendingUp size={13}/> },
  "at-risk":  { label:"At Risk",   color:"text-amber-700 bg-amber-50 border-amber-200",     icon:<AlertTriangle size={13}/> },
  overdue:    { label:"Overdue",   color:"text-red-700 bg-red-50 border-red-200",           icon:<AlertTriangle size={13}/> },
};

const PROJECT_BAR_COLORS: Record<string, string> = {
  "Alpha Platform Rebuild": "#3b82f6",
  "Mobile App v3":          "#10b981",
  "Data Pipeline Infra":    "#8b5cf6",
};

// ── GanttBar ─────────────────────────────────────────────────────────────────

function GanttBar({ milestone }: { milestone: Milestone }) {
  const left  = dateToPct(milestone.startDate);
  const right = dateToPct(milestone.dueDate);
  const width = Math.max(right - left, 0.8);

  const colorMap: Record<string, string> = {
    blue:"bg-blue-500", green:"bg-emerald-500", violet:"bg-violet-500",
  };
  const completedMap: Record<string, string> = {
    blue:"bg-blue-300", green:"bg-emerald-300", violet:"bg-violet-300",
  };
  const base = colorMap[milestone.projectColor] ?? "bg-slate-400";
  const done = completedMap[milestone.projectColor] ?? "bg-slate-300";

  return (
    <div className="relative h-6" style={{ minWidth: 1 }}>
      <div
        className={`absolute top-1 h-4 rounded-full ${done} overflow-hidden`}
        style={{ left:`${left}%`, width:`${width}%` }}
      >
        <div
          className={`h-full rounded-full ${base}`}
          style={{ width:`${milestone.progress}%` }}
        />
      </div>
      {/* milestone diamond marker */}
      <div
        className={`absolute top-0 h-5 w-5 rotate-45 border-2 ${
          milestone.status === "completed"
            ? "bg-emerald-500 border-emerald-600"
            : milestone.status === "overdue"
            ? "bg-red-500 border-red-600"
            : `${base} border-transparent`
        } rounded-sm shadow-sm z-10`}
        style={{ left:`calc(${right}% - 10px)` }}
      />
    </div>
  );
}

// ── AddMilestoneModal ─────────────────────────────────────────────────────────

function AddMilestoneModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name:"", project:"Alpha Platform Rebuild", owner:"", dueDate:"",
    startDate:"", description:"", dependency:"",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Add Milestone</h2>
            <p className="text-sm text-slate-500 mt-0.5">Define a key checkpoint for your project</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Milestone Name *</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Beta Launch"
              value={form.name} onChange={e => set("name", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Project *</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.project} onChange={e => set("project", e.target.value)}
              >
                {Object.keys(PROJECTS_COLORS).map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Owner *</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Assignee name"
                value={form.owner} onChange={e => set("owner", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date *</label>
              <input type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.startDate} onChange={e => set("startDate", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Due Date *</label>
              <input type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.dueDate} onChange={e => set("dueDate", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5"><Link size={13}/>Depends On</span>
            </label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.dependency} onChange={e => set("dependency", e.target.value)}
            >
              <option value="">None</option>
              {MILESTONES.map(m => (
                <option key={m.id} value={m.id}>{m.id}: {m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="What does this milestone represent?"
              value={form.description} onChange={e => set("description", e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 pt-0">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={!form.name || !form.owner || !form.startDate || !form.dueDate}
            onClick={onClose}
          >
            Create Milestone
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MilestonesPage
// ═══════════════════════════════════════════════════════════════════════════════

export function MilestonesPage() {
  const [filterProject, setFilterProject] = useState<string>("All");
  const [filterStatus, setFilterStatus]   = useState<string>("All");
  const [expandedRows, setExpandedRows]   = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd]             = useState(false);

  const total      = MILESTONES.length;
  const completed  = MILESTONES.filter(m => m.status === "completed").length;
  const overdue    = MILESTONES.filter(m => m.status === "overdue").length;
  const dueThisWeek= MILESTONES.filter(m => {
    const d = new Date(m.dueDate);
    return m.status !== "completed" && d >= TODAY_DATE &&
      d <= new Date(TODAY_DATE.getTime() + 7*24*3600*1000);
  }).length;

  const visible = MILESTONES.filter(m =>
    (filterProject === "All" || m.project === filterProject) &&
    (filterStatus  === "All" || m.status  === filterStatus)
  );

  const toggleRow = (id: string) =>
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Milestones</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track key checkpoints across all active projects</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Milestone
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:"Total",          value:total,       sub:"across all projects",    icon:<Flag size={20}/>,           bg:"bg-blue-50",    ic:"text-blue-600" },
            { label:"Completed",      value:completed,   sub:`${Math.round(completed/total*100)}% completion rate`, icon:<CheckCircle2 size={20}/>, bg:"bg-emerald-50", ic:"text-emerald-600" },
            { label:"Due This Week",  value:dueThisWeek, sub:"needs attention",        icon:<Calendar size={20}/>,       bg:"bg-amber-50",   ic:"text-amber-600" },
            { label:"Overdue",        value:overdue,     sub:"requires immediate action", icon:<AlertTriangle size={20}/>, bg:"bg-red-50",    ic:"text-red-600" },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">{c.label}</span>
                <div className={`p-2 rounded-lg ${c.bg} ${c.ic}`}>{c.icon}</div>
              </div>
              <div className="text-3xl font-bold text-slate-800">{c.value}</div>
              <div className="text-xs text-slate-500 mt-1">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Gantt Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Timeline Overview</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              {Object.entries(PROJECT_BAR_COLORS).map(([p, c]) => (
                <span key={p} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: c }} />
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div className="px-6 pb-6 pt-4 overflow-x-auto">
            {/* Month ruler */}
            <div className="relative h-6 mb-3 border-b border-slate-100" style={{ minWidth: 600 }}>
              {MONTH_LABELS.map(ml => (
                <span
                  key={ml.label}
                  className="absolute text-xs text-slate-400 font-medium"
                  style={{ left:`${ml.pct}%`, transform:"translateX(-50%)" }}
                >
                  {ml.label}
                </span>
              ))}
            </div>
            {/* Rows */}
            <div className="space-y-3" style={{ minWidth: 600 }}>
              {MILESTONES.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-44 shrink-0 text-xs text-slate-600 truncate font-medium">{m.name}</div>
                  <div className="flex-1 relative">
                    {/* today line */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-rose-400/60 z-20"
                      style={{ left:`${TODAY_PCT}%` }}
                    />
                    {/* grid lines */}
                    {MONTH_LABELS.slice(1).map(ml => (
                      <div key={ml.label}
                        className="absolute top-0 bottom-0 w-px bg-slate-100"
                        style={{ left:`${ml.pct}%` }}
                      />
                    ))}
                    <GanttBar milestone={m} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <div className="w-px h-4 bg-rose-400/60" />
              <span>Today — Jun 6, 2026</span>
            </div>
          </div>
        </div>

        {/* Filters + Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
            <h2 className="text-base font-semibold text-slate-800 mr-auto">Milestone List</h2>
            {/* Project filter */}
            <select
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterProject} onChange={e => setFilterProject(e.target.value)}
            >
              <option value="All">All Projects</option>
              {Object.keys(PROJECTS_COLORS).map(p => <option key={p}>{p}</option>)}
            </select>
            {/* Status filter */}
            <select
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              {(["completed","on-track","at-risk","overdue"] as MilestoneStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3 w-8" />
                <th className="px-6 py-3">Milestone</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tasks</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visible.map(m => {
                const sm = STATUS_META[m.status];
                const isExpanded = expandedRows.has(m.id);
                return (
                  <>
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-center">
                        <button onClick={() => toggleRow(m.id)} className="text-slate-400 hover:text-slate-600">
                          {isExpanded ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
                        </button>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400 w-8">{m.id}</span>
                          <span className="font-medium text-slate-800">{m.name}</span>
                          {m.dependencies.length > 0 && (
                            <span title={`Depends on: ${m.dependencies.join(", ")}`}>
                              <Link size={12} className="text-slate-400"/>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          m.projectColor === "blue"   ? "bg-blue-50 text-blue-700" :
                          m.projectColor === "green"  ? "bg-emerald-50 text-emerald-700" :
                          "bg-violet-50 text-violet-700"
                        }`}>
                          {m.project}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGradient(m.owner)} flex items-center justify-center text-white text-xs font-bold`}>
                            {getInitials(m.owner)}
                          </div>
                          <span className="text-slate-700">{m.owner}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(m.dueDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 w-20">
                            <div
                              className={`h-1.5 rounded-full ${
                                m.status==="completed" ? "bg-emerald-500" :
                                m.status==="overdue"   ? "bg-red-500" : "bg-blue-500"
                              }`}
                              style={{ width:`${m.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-8">{m.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${sm.color}`}>
                          {sm.icon}{sm.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {m.completedTasks}/{m.tasks}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                            <Edit2 size={13}/>
                          </button>
                          <button className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${m.id}-exp`} className="bg-slate-50/60">
                        <td />
                        <td colSpan={8} className="px-6 py-4">
                          <div className="text-sm text-slate-600 mb-2">{m.description}</div>
                          {m.dependencies.length > 0 && (
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <Link size={11}/> Depends on:{" "}
                              {m.dependencies.map(d => {
                                const dep = MILESTONES.find(x => x.id === d);
                                return dep ? <span key={d} className="font-medium text-slate-700">{dep.name}</span> : null;
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="py-16 text-center text-slate-400 text-sm">No milestones match your filters.</div>
          )}
        </div>
      </div>
      {showAdd && <AddMilestoneModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ResourceAllocationPage
// ═══════════════════════════════════════════════════════════════════════════════

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
  colorClass: string;
}

const EMPLOYEES: Employee[] = [
  { id:"e1", name:"Sarah Johnson",   role:"Frontend Lead",     department:"Engineering" },
  { id:"e2", name:"Marcus Chen",     role:"Backend Engineer",  department:"Engineering" },
  { id:"e3", name:"Emily Rodriguez", role:"Mobile Developer",  department:"Engineering" },
  { id:"e4", name:"Liam Park",       role:"DevOps Engineer",   department:"Infrastructure" },
  { id:"e5", name:"Priya Sharma",    role:"Data Engineer",     department:"Data" },
  { id:"e6", name:"Vikram Singh",    role:"Data Engineer",     department:"Data" },
  { id:"e7", name:"Aisha Patel",     role:"QA Engineer",       department:"Quality" },
  { id:"e8", name:"Tom Wilson",      role:"Product Manager",   department:"Product" },
];

const RA_PROJECTS: Project[] = [
  { id:"p1", name:"Alpha Platform",  color:"#3b82f6", colorClass:"bg-blue-500"   },
  { id:"p2", name:"Mobile App v3",   color:"#10b981", colorClass:"bg-emerald-500"},
  { id:"p3", name:"Data Pipeline",   color:"#8b5cf6", colorClass:"bg-violet-500" },
  { id:"p4", name:"Customer Portal", color:"#f97316", colorClass:"bg-orange-500" },
];

type AllocMatrix = Record<string, Record<string, number>>;

const INITIAL_ALLOCATIONS: AllocMatrix = {
  e1: { p1:60, p2:0,  p3:0,  p4:20 },
  e2: { p1:50, p2:0,  p3:20, p4:10 },
  e3: { p1:0,  p2:80, p3:0,  p4:0  },
  e4: { p1:30, p2:30, p3:20, p4:0  },
  e5: { p1:0,  p2:0,  p3:70, p4:10 },
  e6: { p1:20, p2:10, p3:50, p4:30 },  // 110% overloaded
  e7: { p1:40, p2:30, p3:0,  p4:0  },
  e8: { p1:20, p2:20, p3:10, p4:30 },
};

function cellBg(pct: number): string {
  if (pct === 0)   return "bg-white text-slate-300";
  if (pct <= 40)   return "bg-blue-50 text-blue-700";
  if (pct <= 80)   return "bg-blue-200 text-blue-900";
  if (pct <= 100)  return "bg-blue-500 text-white";
  return "bg-red-500 text-white";
}

// ── EditCell ─────────────────────────────────────────────────────────────────

function EditCell({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(String(value));
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 0 && n <= 200) onChange(n);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="w-12 text-center text-xs font-semibold bg-transparent outline-none"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      />
    );
  }
  return (
    <button
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="w-full text-xs font-semibold leading-none cursor-pointer hover:opacity-80"
    >
      {value > 0 ? `${value}%` : "—"}
    </button>
  );
}

// ── AllocateModal ─────────────────────────────────────────────────────────────

function AllocateModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ employee:"e1", project:"p1", pct:"20" });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Allocate Resource</h2>
            <p className="text-sm text-slate-500 mt-0.5">Assign a team member to a project</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} className="text-slate-500"/>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Team Member</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.employee} onChange={e => set("employee", e.target.value)}
            >
              {EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Project</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.project} onChange={e => set("project", e.target.value)}
            >
              {RA_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Allocation %</label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={100} step={5}
                className="flex-1"
                value={form.pct} onChange={e => set("pct", e.target.value)}
              />
              <span className="w-14 text-center border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-semibold text-blue-700">
                {form.pct}%
              </span>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
            Tip: Keeping total allocation per person at 80–100% is ideal. Above 100% is flagged as overloaded.
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 pt-0">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            Save Allocation
          </button>
        </div>
      </div>
    </div>
  );
}

export function ResourceAllocationPage() {
  const [allocs, setAllocs] = useState<AllocMatrix>(INITIAL_ALLOCATIONS);
  const [showAllocate, setShowAllocate] = useState(false);

  const totalFor = (empId: string) =>
    Object.values(allocs[empId] ?? {}).reduce((a, b) => a + b, 0);

  const chartData = EMPLOYEES.map(e => ({
    name: e.name.split(" ")[0],
    total: totalFor(e.id),
  }));

  const fullyAllocated = EMPLOYEES.filter(e => { const t = totalFor(e.id); return t >= 80 && t <= 100; }).length;
  const underUtilized  = EMPLOYEES.filter(e => totalFor(e.id) < 40).length;
  const overloaded     = EMPLOYEES.filter(e => totalFor(e.id) > 100).length;

  const setCell = (empId: string, projId: string, val: number) =>
    setAllocs(prev => ({
      ...prev,
      [empId]: { ...prev[empId], [projId]: val },
    }));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Resource Allocation</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage team capacity across active projects</p>
          </div>
          <button
            onClick={() => setShowAllocate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16}/> Allocate Resource
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:"Total Members",     value:EMPLOYEES.length, sub:"in workforce",          icon:<Users size={20}/>,        bg:"bg-blue-50",    ic:"text-blue-600" },
            { label:"Fully Allocated",   value:fullyAllocated,   sub:"80–100% utilization",   icon:<CheckCircle2 size={20}/>, bg:"bg-emerald-50", ic:"text-emerald-600" },
            { label:"Under-utilized",    value:underUtilized,    sub:"below 40% capacity",    icon:<TrendingUp size={20}/>,   bg:"bg-amber-50",   ic:"text-amber-600" },
            { label:"Overloaded",        value:overloaded,       sub:"above 100% capacity",   icon:<AlertTriangle size={20}/>,bg:"bg-red-50",     ic:"text-red-600" },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">{c.label}</span>
                <div className={`p-2 rounded-lg ${c.bg} ${c.ic}`}>{c.icon}</div>
              </div>
              <div className="text-3xl font-bold text-slate-800">{c.value}</div>
              <div className="text-xs text-slate-500 mt-1">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Allocation Matrix */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Allocation Matrix</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200 inline-block"/>1–40%</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-200 inline-block"/>41–80%</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500 inline-block"/>81–100%</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block"/>&gt;100%</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                  <th className="px-6 py-3 w-56">Employee</th>
                  <th className="px-3 py-3 text-xs text-slate-400 font-normal uppercase tracking-wider">Role</th>
                  {RA_PROJECTS.map(p => (
                    <th key={p.id} className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${p.colorClass}`} />
                        <span className="text-xs font-medium text-slate-600 whitespace-nowrap">{p.name}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {EMPLOYEES.map(emp => {
                  const tot = totalFor(emp.id);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient(emp.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800 text-sm">{emp.name}</div>
                            <div className="text-xs text-slate-400">{emp.department}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{emp.role}</td>
                      {RA_PROJECTS.map(proj => {
                        const val = allocs[emp.id]?.[proj.id] ?? 0;
                        return (
                          <td key={proj.id} className="px-2 py-2 text-center">
                            <div className={`mx-auto w-16 h-9 rounded-lg flex items-center justify-center transition-colors ${cellBg(val)}`}>
                              <EditCell
                                value={val}
                                onChange={v => setCell(emp.id, proj.id, v)}
                              />
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-14 h-8 rounded-lg text-xs font-bold ${
                          tot > 100 ? "bg-red-100 text-red-700" :
                          tot >= 80  ? "bg-emerald-100 text-emerald-700" :
                          tot >= 40  ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-500"
                        }`}>
                          {tot}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Capacity Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Team Capacity Overview</h2>
              <p className="text-xs text-slate-500 mt-0.5">Total allocation % per team member — red line at 100%</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-red-400 inline-block rounded" />100% threshold</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top:0, right:40, left:0, bottom:0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 140]} tick={{ fontSize:11 }} tickLine={false}
                axisLine={false} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize:12, fill:"#475569" }}
                tickLine={false} axisLine={false} width={60} />
              <Tooltip
                formatter={(v: number) => [`${v}%`, "Allocation"]}
                contentStyle={{ borderRadius:"8px", border:"1px solid #e2e8f0", fontSize:12 }}
              />
              <ReferenceLine x={100} stroke="#f87171" strokeDasharray="4 4" strokeWidth={2} />
              <Bar dataKey="total" radius={[0,4,4,0]} maxBarSize={24}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={
                      entry.total > 100 ? "#ef4444" :
                      entry.total >= 80  ? "#10b981" :
                      entry.total >= 40  ? "#3b82f6" :
                      "#94a3b8"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Project allocation summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Allocation by Project</h2>
          <div className="grid grid-cols-4 gap-4">
            {RA_PROJECTS.map(proj => {
              const headcount = EMPLOYEES.filter(e => (allocs[e.id]?.[proj.id] ?? 0) > 0).length;
              const avgAlloc  = Math.round(
                EMPLOYEES.reduce((sum, e) => sum + (allocs[e.id]?.[proj.id] ?? 0), 0) / EMPLOYEES.length
              );
              return (
                <div key={proj.id} className="rounded-xl border border-slate-100 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${proj.colorClass}`} />
                    <span className="text-sm font-semibold text-slate-800">{proj.name}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Briefcase size={11}/> Members</span>
                      <span className="font-semibold text-slate-700">{headcount}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1"><TrendingUp size={11}/> Avg alloc</span>
                      <span className="font-semibold text-slate-700">{avgAlloc}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${proj.colorClass}`}
                      style={{ width:`${Math.min(avgAlloc, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
      {showAllocate && <AllocateModal onClose={() => setShowAllocate(false)} />}
    </div>
  );
}
