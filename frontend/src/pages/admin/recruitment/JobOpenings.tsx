import { useState, useMemo } from "react";
import {
  Plus, Search, Eye, Pencil, Calendar, Users, MapPin,
  Building2, Send, LayoutGrid, AlignJustify, X, Briefcase,
} from "lucide-react";
import {
  type Job, type JobStatus,
  JOBS, DEPT_OPTIONS, RECRUITER_OPTIONS,
  JobStatusBadge, UrgencyBadge, MiniAvatar, FilterDropdown,
} from "./shared/recruitmentUtils";

// ── Add Job Modal ──────────────────────────────────────────────────────────────

function AddJobModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    title: "", department: "", location: "", type: "", salaryMin: "", salaryMax: "",
    description: "", requirements: "", closingDate: "", recruiter: "", urgency: "Normal",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setF(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); }

  function submit(asDraft: boolean) {
    const req = ["title", "department", "location", "type", "closingDate"];
    const errs: Record<string, string> = {};
    req.forEach((k) => { if (!form[k as keyof typeof form]) errs[k] = "Required"; });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    void asDraft;
    onClose();
  }

  function ic(f: string) {
    return `h-9 w-full rounded-lg border px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors[f] ? "border-red-400" : "border-slate-200 focus:border-blue-400"}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">Post New Job</p>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Job Title<span className="text-red-500">*</span></label>
              <input type="text" value={form.title} onChange={(e) => setF("title", e.target.value)}
                placeholder="e.g. Senior Software Engineer" className={ic("title")} />
              {errors.title && <p className="mt-0.5 text-xs text-red-500">{errors.title}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Department<span className="text-red-500">*</span></label>
              <select value={form.department} onChange={(e) => setF("department", e.target.value)} className={ic("department")}>
                <option value="">Select…</option>
                {DEPT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <p className="mt-0.5 text-xs text-red-500">{errors.department}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Location<span className="text-red-500">*</span></label>
              <input type="text" value={form.location} onChange={(e) => setF("location", e.target.value)}
                placeholder="e.g. Bangalore / Remote" className={ic("location")} />
              {errors.location && <p className="mt-0.5 text-xs text-red-500">{errors.location}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Employment Type<span className="text-red-500">*</span></label>
              <select value={form.type} onChange={(e) => setF("type", e.target.value)} className={ic("type")}>
                <option value="">Select…</option>
                {["Full Time", "Part Time", "Contract", "Internship"].map((t) => <option key={t}>{t}</option>)}
              </select>
              {errors.type && <p className="mt-0.5 text-xs text-red-500">{errors.type}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Closing Date<span className="text-red-500">*</span></label>
              <input type="date" value={form.closingDate} onChange={(e) => setF("closingDate", e.target.value)} className={ic("closingDate")} />
              {errors.closingDate && <p className="mt-0.5 text-xs text-red-500">{errors.closingDate}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Min Salary (LPA)</label>
              <input type="number" value={form.salaryMin} onChange={(e) => setF("salaryMin", e.target.value)}
                placeholder="e.g. 12" className={ic("salaryMin")} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Max Salary (LPA)</label>
              <input type="number" value={form.salaryMax} onChange={(e) => setF("salaryMax", e.target.value)}
                placeholder="e.g. 20" className={ic("salaryMax")} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Recruiter</label>
              <select value={form.recruiter} onChange={(e) => setF("recruiter", e.target.value)} className={ic("recruiter")}>
                <option value="">Select…</option>
                {RECRUITER_OPTIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700">Urgency</label>
              <div className="flex gap-2">
                {["Normal", "Urgent"].map((u) => (
                  <button key={u} onClick={() => setF("urgency", u)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${form.urgency === u ? (u === "Urgent" ? "border-red-400 bg-red-50 text-red-700" : "border-blue-400 bg-blue-50 text-blue-700") : "border-slate-200 text-slate-600"}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Job Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setF("description", e.target.value)}
              placeholder="Describe the role and responsibilities…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Requirements</label>
            <textarea rows={3} value={form.requirements} onChange={(e) => setF("requirements", e.target.value)}
              placeholder="List the required skills and qualifications…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={() => submit(true)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Save as Draft</button>
          <button onClick={() => submit(false)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Send className="h-3.5 w-3.5" /> Post Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Job Detail Modal ───────────────────────────────────────────────────────────

function JobDetailModal({ job, onClose }: { job: Job; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-bold text-slate-900">{job.title}</p>
              <JobStatusBadge status={job.status} />
              <UrgencyBadge urgency={job.urgency} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{job.id} · {job.department}</p>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[["Location", job.location], ["Type", job.type], ["Salary", `₹${job.salaryMin}–${job.salaryMax} LPA`], ["Posted", job.postedDate || "—"], ["Closing", job.closingDate], ["Recruiter", job.recruiter]].map(([l, v]) => (
              <div key={l}>
                <p className="text-slate-400">{l}</p>
                <p className="font-semibold text-slate-800">{v}</p>
              </div>
            ))}
            <div>
              <p className="text-slate-400">Applicants</p>
              <p className="font-bold text-slate-900 text-lg">{job.applicants}</p>
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Description</p>
            <p className="text-xs text-slate-700 whitespace-pre-line">{job.description}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Requirements</p>
            <p className="text-xs text-slate-700 whitespace-pre-line">{job.requirements}</p>
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
          <button className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Pencil className="h-3.5 w-3.5" /> Edit Job
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Job Kanban ─────────────────────────────────────────────────────────────────

const KANBAN_COLS: JobStatus[] = ["Draft", "Open", "On Hold", "Closed"];

const KANBAN_COL_STYLES: Record<JobStatus, { header: string; dot: string }> = {
  Draft: { header: "bg-slate-50 border-slate-200", dot: "bg-slate-400" },
  Open: { header: "bg-green-50 border-green-200", dot: "bg-green-500" },
  "On Hold": { header: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  Closed: { header: "bg-rose-50 border-rose-200", dot: "bg-rose-500" },
};

function JobKanbanCard({ job, onView }: { job: Job; onView: (j: Job) => void }) {
  return (
    <div onClick={() => onView(job)}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-slate-900 leading-tight">{job.title}</p>
        <UrgencyBadge urgency={job.urgency} />
      </div>
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />{job.department}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />{job.location}
        </div>
        {job.postedDate && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="h-3.5 w-3.5" />Posted {job.postedDate}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          <Users className="h-3 w-3" />{job.applicants}
        </span>
        <MiniAvatar name={job.recruiter} size="xs" />
      </div>
    </div>
  );
}

function JobKanbanView({ jobs, onView, onAdd }: { jobs: Job[]; onView: (j: Job) => void; onAdd: () => void }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {KANBAN_COLS.map((col) => {
        const colJobs = jobs.filter((j) => j.status === col);
        const { header, dot } = KANBAN_COL_STYLES[col];
        return (
          <div key={col} className={`rounded-xl border ${header} p-3`}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                <span className="text-sm font-bold text-slate-700">{col}</span>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">{colJobs.length}</span>
            </div>
            <div className="space-y-3">
              {colJobs.map((j) => <JobKanbanCard key={j.id} job={j} onView={onView} />)}
            </div>
            {(col === "Draft" || col === "Open") && (
              <button onClick={onAdd} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2.5 text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600">
                <Plus className="h-3.5 w-3.5" /> Add Job
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function JobTableView({ jobs, onView }: { jobs: Job[]; onView: (j: Job) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
            {["Job Title", "Department", "Location", "Type", "Posted", "Applicants", "Status", "Actions"].map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{job.title}</p>
                  <p className="text-slate-400">{job.id}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-700">{job.department}</td>
              <td className="px-4 py-3 text-slate-700">{job.location}</td>
              <td className="px-4 py-3 text-slate-500">{job.type}</td>
              <td className="px-4 py-3 text-slate-500">{job.postedDate || "—"}</td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Users className="h-3.5 w-3.5 text-slate-400" />{job.applicants}
                </span>
              </td>
              <td className="px-4 py-3"><JobStatusBadge status={job.status} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <button onClick={() => onView(job)} className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-blue-50 hover:text-blue-600">
                    <Eye className="h-3.5 w-3.5" /> View
                  </button>
                  <button className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-slate-100">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  {job.status === "Open" && (
                    <button className="flex items-center gap-1 rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50">Close</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Stats Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function JobOpenings() {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);

  const stats = useMemo(() => ({
    total: JOBS.length,
    open: JOBS.filter((j) => j.status === "Open").length,
    onHold: JOBS.filter((j) => j.status === "On Hold").length,
    closed: JOBS.filter((j) => j.status === "Closed").length,
    draft: JOBS.filter((j) => j.status === "Draft").length,
  }), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return JOBS.filter((j) => {
      const ms = !q || j.title.toLowerCase().includes(q) || j.department.toLowerCase().includes(q);
      const md = deptFilter === "All Departments" || j.department === deptFilter;
      const ms2 = statusFilter === "All Status" || j.status === statusFilter;
      return ms && md && ms2;
    });
  }, [search, deptFilter, statusFilter]);

  return (
    <div className="min-h-full bg-slate-50 px-6 py-5">
      {/* Breadcrumb */}
      <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
        <span className="cursor-pointer hover:text-blue-600">Dashboard</span>
        <span>›</span>
        <span className="cursor-pointer hover:text-blue-600">Recruitment</span>
        <span>›</span>
        <span className="font-semibold text-slate-700">Job Openings</span>
      </nav>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Job Openings</h1>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Post New Job
        </button>
      </div>

      {/* Stats row */}
      <div className="mb-5 flex gap-3">
        <StatCard label="Total Jobs" value={stats.total} color="text-slate-900" />
        <StatCard label="Open" value={stats.open} color="text-green-600" />
        <StatCard label="On Hold" value={stats.onHold} color="text-amber-600" />
        <StatCard label="Closed" value={stats.closed} color="text-rose-600" />
        <StatCard label="Draft" value={stats.draft} color="text-slate-500" />
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or department…"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
        <FilterDropdown value={deptFilter} options={["All Departments", ...DEPT_OPTIONS]} onChange={setDeptFilter} className="min-w-[150px]" />
        <FilterDropdown value={statusFilter} options={["All Status", "Draft", "Open", "On Hold", "Closed"]} onChange={setStatusFilter} className="min-w-[120px]" />
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
          <button onClick={() => setView("kanban")}
            className={`flex h-8 w-8 items-center justify-center rounded-md ${view === "kanban" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setView("table")}
            className={`flex h-8 w-8 items-center justify-center rounded-md ${view === "table" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
            <AlignJustify className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {view === "kanban"
        ? <JobKanbanView jobs={filtered} onView={setViewingJob} onAdd={() => setShowAddModal(true)} />
        : <JobTableView jobs={filtered} onView={setViewingJob} />
      }

      {filtered.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
          <p className="text-sm text-slate-400">No jobs match your filters.</p>
        </div>
      )}

      {showAddModal && <AddJobModal onClose={() => setShowAddModal(false)} />}
      {viewingJob && <JobDetailModal job={viewingJob} onClose={() => setViewingJob(null)} />}
    </div>
  );
}
