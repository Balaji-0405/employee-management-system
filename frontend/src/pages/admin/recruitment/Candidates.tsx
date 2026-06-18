import { useState, useMemo } from "react";
import {
  Search, FileText, Calendar, ChevronRight, X, Mail, Phone as PhoneIcon,
  Download, Star, Users, MessageSquare, Send,
} from "lucide-react";
import {
  type Candidate, type CandidateStage,
  CANDIDATES, JOBS, DEPT_OPTIONS, STAGE_OPTIONS, SOURCE_OPTIONS,
  MiniAvatar, StageBadge, SourceBadge, MatchRing, ScheduleInterviewModal,
} from "./shared/recruitmentUtils";

// ── Stage progression map ──────────────────────────────────────────────────────

const NEXT_STAGE: Partial<Record<CandidateStage, CandidateStage>> = {
  Applied: "Screening",
  Screening: "Interview",
  Interview: "Offer",
  Offer: "Hired" as CandidateStage,
};

// ── Candidate Detail Panel ─────────────────────────────────────────────────────

type PanelTab = "profile" | "timeline" | "feedback";

function CandidateDetailPanel({
  candidate,
  onClose,
  onSchedule,
  onReject,
}: {
  candidate: Candidate;
  onClose: () => void;
  onSchedule: () => void;
  onReject: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<PanelTab>("profile");
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [stageMenuOpen, setStageMenuOpen] = useState(false);

  const nextStage = NEXT_STAGE[candidate.stage];

  const panelTabs: { key: PanelTab; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "timeline", label: "Timeline" },
    { key: "feedback", label: "Feedback" },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-100 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <MiniAvatar name={candidate.name} size="md" />
            <div>
              <p className="font-bold text-slate-900">{candidate.name}</p>
              <p className="text-xs text-slate-500">{candidate.appliedFor}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <StageBadge stage={candidate.stage} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button title="Email" className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600">
              <Mail className="h-3.5 w-3.5" />
            </button>
            <button title="Phone" className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-green-50 hover:text-green-600">
              <PhoneIcon className="h-3.5 w-3.5" />
            </button>
            <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mt-3 flex gap-0.5 border-b border-slate-100">
          {panelTabs.map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "profile" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-slate-400">Source</p><p className="font-semibold text-slate-800">{candidate.source}</p></div>
              <div><p className="text-slate-400">Applied</p><p className="font-semibold text-slate-800">{candidate.appliedDate}</p></div>
              <div><p className="text-slate-400">Email</p><p className="font-semibold text-slate-800 truncate">{candidate.email}</p></div>
              <div><p className="text-slate-400">Phone</p><p className="font-semibold text-slate-800">{candidate.phone}</p></div>
              <div className="col-span-2">
                <p className="text-slate-400">Match Score</p>
                <div className="mt-1 flex items-center gap-2">
                  <MatchRing score={candidate.matchScore} />
                  <span className="text-sm font-bold text-slate-800">{candidate.matchScore}%</span>
                </div>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((s) => (
                  <span key={s} className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Education</p>
              <p className="text-xs text-slate-500">B.Tech / B.E in Computer Science or equivalent</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Experience</p>
              <p className="text-xs text-slate-500">3–5 years of relevant industry experience</p>
            </div>
            <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <Download className="h-3.5 w-3.5" /> Download CV
            </button>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="space-y-1">
            <div className="mb-3 space-y-3">
              {[...candidate.timeline].reverse().map((ev, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full border-2 ${ev.stage === "Rejected" ? "border-rose-400 bg-rose-100" : "border-blue-500 bg-blue-500"}`} />
                    {i < candidate.timeline.length - 1 && <div className="mt-1 h-full w-px bg-slate-200" />}
                  </div>
                  <div className="pb-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">{ev.stage}</span>
                      <span className="text-[11px] text-slate-400">{ev.date}</span>
                    </div>
                    <p className="text-xs text-slate-500">{ev.note}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600">
              <MessageSquare className="h-3.5 w-3.5" /> Add Note
            </button>
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="space-y-3">
            {candidate.feedback ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-800">Interviewer Feedback</p>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`h-3 w-3 ${n <= 4 ? "text-amber-400 fill-amber-400" : "text-slate-300"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-600 italic">"{candidate.feedback}"</p>
                <p className="mt-2 text-[11px] text-slate-400">Technical round · {candidate.timeline[candidate.timeline.length - 1]?.date}</p>
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300">
                <p className="text-xs text-slate-400">No feedback recorded yet.</p>
              </div>
            )}
            <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600">
              <Star className="h-3.5 w-3.5" /> Add Feedback
            </button>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {candidate.stage !== "Rejected" && (
        <div className="shrink-0 border-t border-slate-100 p-4 space-y-2">
          {nextStage && (
            <div className="relative">
              <button onClick={() => setStageMenuOpen((o) => !o)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                <ChevronRight className="h-3.5 w-3.5" /> Move to {nextStage}
              </button>
              {stageMenuOpen && (
                <div className="absolute bottom-full mb-1 left-0 right-0 rounded-lg border border-slate-200 bg-white shadow-lg py-1 z-20">
                  {nextStage && (
                    <button onClick={() => setStageMenuOpen(false)} className="block w-full px-3 py-2 text-left text-xs font-semibold text-blue-600 hover:bg-blue-50">
                      Move to {nextStage}
                    </button>
                  )}
                  <button onClick={() => { setShowRejectConfirm(true); setStageMenuOpen(false); }} className="block w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50">
                    Reject
                  </button>
                </div>
              )}
            </div>
          )}
          <button onClick={onSchedule}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Calendar className="h-3.5 w-3.5" /> Schedule Interview
          </button>
          {candidate.stage === "Interview" && (
            <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Send className="h-3.5 w-3.5" /> Make Offer
            </button>
          )}
          <button onClick={() => setShowRejectConfirm(true)}
            className="block w-full text-center text-xs font-semibold text-rose-500 hover:text-rose-700 py-1">
            Reject
          </button>
        </div>
      )}

      {/* Reject confirmation */}
      {showRejectConfirm && (
        <div className="shrink-0 border-t border-red-100 bg-red-50 p-4">
          <p className="mb-2 text-xs font-semibold text-red-700">Rejection Reason</p>
          <textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Briefly explain the reason…"
            className="w-full rounded border border-red-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => { onReject(candidate.id); setShowRejectConfirm(false); }}
              className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700">Confirm Reject</button>
            <button onClick={() => setShowRejectConfirm(false)}
              className="rounded border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-white">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Candidates() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [stageFilter, setStageFilter] = useState("All Stages");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [sortBy, setSortBy] = useState("Latest Applied");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = CANDIDATES.filter((c) => {
      const ms = !q || c.name.toLowerCase().includes(q) || c.appliedFor.toLowerCase().includes(q);
      const md = deptFilter === "All Departments" || JOBS.find((j) => j.id === c.jobId)?.department === deptFilter;
      const mst = stageFilter === "All Stages" || c.stage === stageFilter;
      const mso = sourceFilter === "All Sources" || c.source === sourceFilter;
      return ms && md && mst && mso;
    });
    if (sortBy === "Highest Match") list = [...list].sort((a, b) => b.matchScore - a.matchScore);
    return list;
  }, [search, deptFilter, stageFilter, sourceFilter, sortBy]);

  const selected = selectedId ? CANDIDATES.find((c) => c.id === selectedId) ?? null : null;

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CANDIDATES.forEach((c) => { counts[c.stage] = (counts[c.stage] ?? 0) + 1; });
    return counts;
  }, []);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CANDIDATES.forEach((c) => { counts[c.source] = (counts[c.source] ?? 0) + 1; });
    return counts;
  }, []);

  return (
    <div className="min-h-full bg-slate-50 px-6 py-5">
      {/* Breadcrumb */}
      <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
        <span className="cursor-pointer hover:text-blue-600">Dashboard</span>
        <span>›</span>
        <span className="cursor-pointer hover:text-blue-600">Recruitment</span>
        <span>›</span>
        <span className="font-semibold text-slate-700">Candidates</span>
      </nav>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Candidates</h1>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">{CANDIDATES.length}</span>
        </div>
      </div>

      {/* Layout: filter panel + content */}
      <div className="flex gap-5">
        {/* Left filter panel */}
        <aside className="w-60 shrink-0 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Filters</p>
            <button onClick={() => { setDeptFilter("All Departments"); setStageFilter("All Stages"); setSourceFilter("All Sources"); }}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800">Clear All</button>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-slate-700">Department</p>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-blue-400 focus:outline-none">
              <option>All Departments</option>
              {DEPT_OPTIONS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-slate-700">Stage</p>
            <div className="space-y-1">
              {["All Stages", ...STAGE_OPTIONS].map((s) => (
                <button key={s} onClick={() => setStageFilter(s)}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors ${stageFilter === s ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}>
                  <span>{s}</span>
                  {s !== "All Stages" && stageCounts[s] && (
                    <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{stageCounts[s]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-slate-700">Source</p>
            <div className="space-y-1">
              {["All Sources", ...SOURCE_OPTIONS].map((s) => (
                <button key={s} onClick={() => setSourceFilter(s)}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors ${sourceFilter === s ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}>
                  <span>{s}</span>
                  {s !== "All Sources" && sourceCounts[s] && (
                    <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{sourceCounts[s]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="flex-1 min-w-0 space-y-4">
            {/* Sort bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search candidates…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <span className="shrink-0 text-xs text-slate-500">Showing {filtered.length} candidates</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-blue-400 focus:outline-none">
                {["Latest Applied", "Highest Match", "Name A–Z"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>

            {/* Card grid */}
            <div className={`grid gap-3 ${selected ? "grid-cols-2" : "grid-cols-3"}`}>
              {filtered.map((c) => (
                <div key={c.id}
                  onClick={() => setSelectedId((id) => (id === c.id ? null : c.id))}
                  className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${selectedId === c.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"}`}>
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <MiniAvatar name={c.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{c.name}</p>
                        <p className="truncate text-xs text-slate-500">{c.appliedFor}</p>
                      </div>
                    </div>
                    <MatchRing score={c.matchScore} />
                  </div>
                  <div className="mb-2.5 flex flex-wrap gap-1">
                    <StageBadge stage={c.stage} />
                    <SourceBadge source={c.source} />
                  </div>
                  <p className="text-[11px] text-slate-400">Applied {c.appliedDate}</p>
                  <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-slate-400">
                    <button onClick={(e) => e.stopPropagation()} title="View CV"
                      className="grid h-6 w-6 place-items-center rounded hover:bg-slate-100 hover:text-slate-600">
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setShowScheduleModal(true); }} title="Schedule"
                      className="grid h-6 w-6 place-items-center rounded hover:bg-slate-100 hover:text-slate-600">
                      <Calendar className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => e.stopPropagation()} title="Move Stage"
                      className="grid h-6 w-6 place-items-center rounded hover:bg-slate-100 hover:text-slate-600">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => e.stopPropagation()} title="Reject"
                      className="grid h-6 w-6 place-items-center rounded text-rose-400 hover:bg-rose-50 hover:text-rose-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
                <div className="text-center">
                  <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">No candidates match your filters.</p>
                </div>
              </div>
            )}
          </div>

          {/* Right detail panel */}
          {selected && (
            <div className="w-[340px] shrink-0 sticky top-5" style={{ height: "calc(100vh - 140px)" }}>
              <CandidateDetailPanel
                candidate={selected}
                onClose={() => setSelectedId(null)}
                onSchedule={() => setShowScheduleModal(true)}
                onReject={() => setSelectedId(null)}
              />
            </div>
          )}
        </div>
      </div>

      {showScheduleModal && <ScheduleInterviewModal onClose={() => setShowScheduleModal(false)} />}
    </div>
  );
}
