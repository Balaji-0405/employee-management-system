import { useState, useMemo, useRef, useEffect } from "react";
import {
  Plus, ChevronLeft, ChevronRight, Clock, X, MessageSquare,
  RotateCcw, Star, Calendar,
} from "lucide-react";
import {
  type Interview, type InterviewType, type InterviewStatus,
  INTERVIEWS, INTERVIEW_FEEDBACK_CRITERIA,
  MiniAvatar, IvTypeBadge, getInitials, fmtHour, ScheduleInterviewModal,
} from "./shared/recruitmentUtils";

// ── Calendar constants ─────────────────────────────────────────────────────────

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEK_DATES = ["Jun 8", "Jun 9", "Jun 10", "Jun 11", "Jun 12", "Jun 13", "Jun 14"];
const TODAY_IDX = 0;

const IV_TYPE_CELL_STYLES: Record<InterviewType, string> = {
  Phone: "bg-blue-50 border border-blue-300 text-blue-800",
  Video: "bg-violet-50 border border-violet-300 text-violet-800",
  "In-person": "bg-green-50 border border-green-300 text-green-800",
};

// ── Feedback Form (inside popover or standalone modal) ─────────────────────────

function FeedbackForm({ interview, onClose }: { interview: Interview; onClose: () => void }) {
  const [ratings, setRatings] = useState<Record<string, number>>(interview.feedbackRatings ?? {});
  const [recommendation, setRecommendation] = useState("");
  const [notes, setNotes] = useState(interview.feedbackNotes ?? "");

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 space-y-3">
      <p className="text-xs font-bold text-slate-700">Add Feedback</p>
      {INTERVIEW_FEEDBACK_CRITERIA.map((c) => (
        <div key={c}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-slate-600">{c}</span>
            <span className="text-xs font-bold text-slate-700">{ratings[c] ?? 0}/5</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRatings((r) => ({ ...r, [c]: n }))}
                className={`h-6 w-6 rounded text-xs font-bold ${(ratings[c] ?? 0) >= n ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-400"}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p className="mb-1.5 text-xs font-semibold text-slate-700">Overall Recommendation</p>
        <div className="flex gap-1.5">
          {["Strong Yes", "Yes", "Maybe", "No"].map((opt) => (
            <button key={opt} onClick={() => setRecommendation(opt)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${recommendation === opt ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Notes<span className="text-red-500">*</span></label>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Overall assessment…"
          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none" />
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Submit Feedback</button>
        <button onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button>
      </div>
    </div>
  );
}

// ── Add Feedback Modal ─────────────────────────────────────────────────────────

function AddFeedbackModal({ interview, onClose }: { interview: Interview; onClose: () => void }) {
  const [ratings, setRatings] = useState<Record<string, number>>(interview.feedbackRatings ?? {});
  const [recommendation, setRecommendation] = useState("");
  const [notes, setNotes] = useState(interview.feedbackNotes ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">Add Feedback</p>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-500">Candidate</span><span className="font-semibold text-slate-800">{interview.candidateName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Position</span><span className="font-semibold text-slate-800">{interview.jobTitle}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Interview Date</span><span className="font-semibold text-slate-800">{interview.date} · {interview.time}</span></div>
          </div>

          {INTERVIEW_FEEDBACK_CRITERIA.map((c) => (
            <div key={c}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{c}</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setRatings((r) => ({ ...r, [c]: n }))}>
                      <Star className={`h-4 w-4 ${(ratings[c] ?? 0) >= n ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                    </button>
                  ))}
                  <span className="ml-1 text-xs font-bold text-slate-600">{ratings[c] ?? 0}/5</span>
                </div>
              </div>
            </div>
          ))}

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-700">Overall Recommendation</p>
            <div className="flex gap-2">
              {["Strong Yes", "Yes", "Maybe", "No"].map((opt) => (
                <button key={opt} onClick={() => setRecommendation(opt)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${recommendation === opt ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Notes<span className="text-red-500">*</span></label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Overall assessment of the candidate…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Submit Feedback</button>
        </div>
      </div>
    </div>
  );
}

// ── Interview Detail Popover ───────────────────────────────────────────────────

function InterviewDetailPopover({ interview, onClose, onReschedule, onCancel, onFeedback }: {
  interview: Interview;
  onClose: () => void;
  onReschedule: () => void;
  onCancel: (id: string) => void;
  onFeedback: (iv: Interview) => void;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const hasFeedback = !!interview.feedbackRatings;

  return (
    <div ref={ref} className="absolute left-full top-0 z-50 ml-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">{interview.candidateName}</p>
          <p className="text-xs text-slate-500">{interview.jobTitle}</p>
        </div>
        <button onClick={onClose} className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-2 text-xs mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{interview.date} · {interview.time}</span>
        </div>
        <div className="flex items-center gap-2">
          <IvTypeBadge type={interview.type} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500">Interviewers:</span>
          {interview.interviewers.map((n) => (
            <span key={n} className="flex items-center gap-1">
              <MiniAvatar name={n} size="xs" />
              <span className="text-slate-700">{n}</span>
            </span>
          ))}
        </div>
        <div>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${interview.status === "Completed" ? "bg-green-50 text-green-700" : interview.status === "Cancelled" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-700"}`}>
            {interview.status}
          </span>
        </div>
        <div>
          {hasFeedback
            ? <span className="text-green-600 font-semibold">✓ Feedback received</span>
            : <span className="text-amber-600">Feedback pending</span>}
        </div>
        {interview.notes && <p className="text-slate-500 italic">"{interview.notes}"</p>}
      </div>

      {!showFeedback && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button onClick={() => { onFeedback(interview); onClose(); }}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            <MessageSquare className="h-3 w-3" /> Add Feedback
          </button>
          <button onClick={() => { onReschedule(); onClose(); }}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <RotateCcw className="h-3 w-3" /> Reschedule
          </button>
          <button onClick={() => { onCancel(interview.id); onClose(); }}
            className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-red-50">
            <X className="h-3 w-3" /> Cancel
          </button>
        </div>
      )}
      {showFeedback && <FeedbackForm interview={interview} onClose={() => setShowFeedback(false)} />}
    </div>
  );
}

// ── Interview Block (calendar cell) ───────────────────────────────────────────

function InterviewBlock({ interview, onBlockClick }: {
  interview: Interview;
  onBlockClick: (iv: Interview, e: React.MouseEvent) => void;
}) {
  return (
    <div onClick={(e) => { e.stopPropagation(); onBlockClick(interview, e); }}
      className={`cursor-pointer rounded-md p-1.5 text-[10px] leading-tight ${IV_TYPE_CELL_STYLES[interview.type]} hover:opacity-80 transition-opacity`}>
      <p className="font-bold truncate">{interview.candidateName}</p>
      <p className="truncate opacity-75">{interview.jobTitle}</p>
      <div className="mt-1 flex items-center gap-1 flex-wrap">
        <IvTypeBadge type={interview.type} />
        <span className="opacity-60">{interview.interviewers.map((n) => getInitials(n)).join(", ")}</span>
      </div>
    </div>
  );
}

// ── Calendar Week View ─────────────────────────────────────────────────────────

function CalendarWeekView({ interviews, onBlockClick }: {
  interviews: Interview[];
  onBlockClick: (iv: Interview, e: React.MouseEvent) => void;
}) {
  function getSlot(dayIdx: number, hour: number) {
    return interviews.filter((iv) => iv.dayIdx === dayIdx && iv.hour === hour);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-16 border-b border-r border-slate-200 bg-slate-50 p-2 text-center text-[11px] font-semibold text-slate-500">Time</th>
            {DAYS.map((d, i) => (
              <th key={d} className={`border-b border-r border-slate-200 p-2 text-center last:border-r-0 ${i === TODAY_IDX ? "bg-blue-50" : "bg-slate-50"}`}>
                <p className={`font-bold ${i === TODAY_IDX ? "text-blue-700" : "text-slate-700"}`}>{d}</p>
                <p className={`text-[11px] ${i === TODAY_IDX ? "text-blue-500" : "text-slate-400"}`}>{WEEK_DATES[i]}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => (
            <tr key={hour}>
              <td className="border-b border-r border-slate-100 bg-slate-50 px-2 py-1 text-center text-[11px] font-medium text-slate-400 w-16">{fmtHour(hour)}</td>
              {DAYS.map((_, dayIdx) => {
                const slots = getSlot(dayIdx, hour);
                return (
                  <td key={dayIdx}
                    className={`relative border-b border-r border-slate-100 p-1 h-[60px] align-top last:border-r-0 hover:bg-slate-50 ${dayIdx === TODAY_IDX ? "bg-blue-50/40" : ""}`}>
                    {slots.map((iv) => (
                      <InterviewBlock key={iv.id} interview={iv} onBlockClick={onBlockClick} />
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Stats Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function InterviewPipeline() {
  const [interviews, setInterviews] = useState<Interview[]>(INTERVIEWS);
  const [showSchedule, setShowSchedule] = useState(false);
  const [activePopover, setActivePopover] = useState<Interview | null>(null);
  const [feedbackInterview, setFeedbackInterview] = useState<Interview | null>(null);

  function handleCancel(id: string) {
    setInterviews((prev) => prev.map((iv) => iv.id === id ? { ...iv, status: "Cancelled" as InterviewStatus } : iv));
  }

  const stats = useMemo(() => ({
    thisWeek: interviews.length,
    completed: interviews.filter((iv) => iv.status === "Completed").length,
    pendingFeedback: interviews.filter((iv) => iv.status === "Completed" && !iv.feedbackRatings).length,
    upcoming: interviews.filter((iv) => iv.status === "Scheduled").length,
  }), [interviews]);

  const upcoming = interviews.filter((iv) => iv.status === "Scheduled");

  return (
    <div className="min-h-full bg-slate-50 px-6 py-5">
      {/* Breadcrumb */}
      <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
        <span className="cursor-pointer hover:text-blue-600">Dashboard</span>
        <span>›</span>
        <span className="cursor-pointer hover:text-blue-600">Recruitment</span>
        <span>›</span>
        <span className="font-semibold text-slate-700">Interview Pipeline</span>
      </nav>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Interview Pipeline</h1>
          <span className="text-sm text-slate-500">Week of Jun 2–8, 2026</span>
        </div>
        <button onClick={() => setShowSchedule(true)}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Schedule Interview
        </button>
      </div>

      {/* Stats row */}
      <div className="mb-5 flex gap-3">
        <StatCard label="This Week" value={stats.thisWeek} sub="total interviews" color="text-slate-900" />
        <StatCard label="Completed" value={stats.completed} color="text-green-600" />
        <StatCard label="Pending Feedback" value={stats.pendingFeedback} color="text-amber-600" />
        <StatCard label="Upcoming" value={stats.upcoming} color="text-blue-600" />
      </div>

      {/* Week navigation */}
      <div className="mb-3 flex items-center gap-2">
        <button className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-700">Week of Jun 8 – 14, 2026</p>
        </div>
        <button className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar */}
      <div className="relative mb-6">
        <CalendarWeekView
          interviews={interviews}
          onBlockClick={(iv) => setActivePopover((prev) => (prev?.id === iv.id ? null : iv))}
        />
        {activePopover && (
          <div className="absolute top-16 z-50" style={{ left: `${(activePopover.dayIdx + 1) * 14 + 5}%` }}>
            <InterviewDetailPopover
              interview={activePopover}
              onClose={() => setActivePopover(null)}
              onReschedule={() => setShowSchedule(true)}
              onCancel={handleCancel}
              onFeedback={(iv) => { setFeedbackInterview(iv); setActivePopover(null); }}
            />
          </div>
        )}
      </div>

      {/* This week list */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p className="text-sm font-bold text-slate-800">This Week</p>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{upcoming.length} scheduled</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                {["Candidate", "Position", "Date & Time", "Type", "Interviewers", "Status", "Feedback Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {interviews.map((iv) => (
                <tr key={iv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{iv.candidateName}</td>
                  <td className="px-4 py-3 text-slate-600">{iv.jobTitle}</td>
                  <td className="px-4 py-3 text-slate-500">{iv.date} · {iv.time}</td>
                  <td className="px-4 py-3"><IvTypeBadge type={iv.type} /></td>
                  <td className="px-4 py-3">
                    <div className="flex -space-x-1">
                      {iv.interviewers.map((n) => <MiniAvatar key={n} name={n} size="xs" />)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${iv.status === "Completed" ? "bg-green-50 text-green-700" : iv.status === "Cancelled" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-700"}`}>
                      {iv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {iv.feedbackRatings
                      ? <span className="text-[11px] font-semibold text-green-600">✓ Received</span>
                      : <span className="text-[11px] font-semibold text-amber-600">Pending</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setFeedbackInterview(iv)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-blue-50 hover:text-blue-600 text-slate-500">
                        <Star className="h-3.5 w-3.5" /> Feedback
                      </button>
                      <button onClick={() => setShowSchedule(true)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-slate-100 text-slate-500">
                        <RotateCcw className="h-3.5 w-3.5" /> Reschedule
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {interviews.length === 0 && (
            <p className="px-5 py-8 text-center text-xs text-slate-400">No interviews scheduled this week.</p>
          )}
        </div>
      </div>

      {showSchedule && <ScheduleInterviewModal onClose={() => setShowSchedule(false)} />}
      {feedbackInterview && <AddFeedbackModal interview={feedbackInterview} onClose={() => setFeedbackInterview(null)} />}
    </div>
  );
}
