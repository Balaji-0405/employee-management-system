import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, X, Star, AlertTriangle, Bell } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Recommendation = "Ready for Confirmation" | "Needs Review" | "At Risk";
type EmpStatus = "active" | "extended" | "confirmed";

type ExtensionHistory = { days: number; date: string; reason: string };

type ManagerReview = {
  submitted: boolean;
  technicalSkills: number;
  communication: number;
  ownership: number;
  teamCollaboration: number;
  learningAbility: number;
};

type ProbationEmployee = {
  id: string;
  name: string;
  initials: string;
  color: string;
  empId: string;
  department: string;
  designation: string;
  manager: string;
  joiningDate: string;
  probationStart: string;
  probationEnd: string;
  daysRemaining: number;
  attendancePresent: number;
  attendanceTotal: number;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksOverdue: number;
  managerReview: ManagerReview;
  status: EmpStatus;
  extensionHistory: ExtensionHistory[];
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PROBATION_DATA: ProbationEmployee[] = [
  {
    id: "pb1", name: "Neha Pillai",   initials: "NP", color: "bg-teal-500",   empId: "EMP041",
    department: "Engineering", designation: "Junior Developer", manager: "Arun Kumar",
    joiningDate: "1 Mar 2026", probationStart: "1 Mar 2026", probationEnd: "31 Aug 2026",
    daysRemaining: 86, attendancePresent: 58, attendanceTotal: 65, tasksAssigned: 20, tasksCompleted: 18, tasksOverdue: 1,
    managerReview: { submitted: true, technicalSkills: 4, communication: 4, ownership: 5, teamCollaboration: 4, learningAbility: 5 },
    status: "active", extensionHistory: [],
  },
  {
    id: "pb2", name: "Rohit Verma",   initials: "RV", color: "bg-blue-500",   empId: "EMP042",
    department: "Product", designation: "Product Analyst", manager: "Priya Menon",
    joiningDate: "15 Feb 2026", probationStart: "15 Feb 2026", probationEnd: "14 Aug 2026",
    daysRemaining: 69, attendancePresent: 75, attendanceTotal: 88, tasksAssigned: 22, tasksCompleted: 20, tasksOverdue: 0,
    managerReview: { submitted: true, technicalSkills: 5, communication: 4, ownership: 4, teamCollaboration: 5, learningAbility: 4 },
    status: "active", extensionHistory: [],
  },
  {
    id: "pb3", name: "Sneha Joshi",   initials: "SJ", color: "bg-orange-500", empId: "EMP043",
    department: "Sales", designation: "Sales Executive", manager: "Rahul Desai",
    joiningDate: "1 Jan 2026", probationStart: "1 Jan 2026", probationEnd: "13 Jun 2026",
    daysRemaining: 7, attendancePresent: 90, attendanceTotal: 120, tasksAssigned: 30, tasksCompleted: 18, tasksOverdue: 8,
    managerReview: { submitted: true, technicalSkills: 2, communication: 3, ownership: 2, teamCollaboration: 3, learningAbility: 2 },
    status: "active", extensionHistory: [],
  },
  {
    id: "pb4", name: "Vikram Bose",   initials: "VB", color: "bg-purple-500", empId: "EMP044",
    department: "Design", designation: "UI Designer", manager: "Arun Kumar",
    joiningDate: "1 Nov 2025", probationStart: "1 Nov 2025", probationEnd: "30 Jun 2026",
    daysRemaining: 24, attendancePresent: 110, attendanceTotal: 130, tasksAssigned: 28, tasksCompleted: 22, tasksOverdue: 3,
    managerReview: { submitted: true, technicalSkills: 3, communication: 4, ownership: 3, teamCollaboration: 4, learningAbility: 3 },
    status: "extended",
    extensionHistory: [{ days: 30, date: "1 May 2026", reason: "Additional training required for advanced design tools." }],
  },
  {
    id: "pb5", name: "Meera Iyer",    initials: "MI", color: "bg-green-500",  empId: "EMP045",
    department: "Finance", designation: "Finance Analyst", manager: "Priya Menon",
    joiningDate: "15 Mar 2026", probationStart: "15 Mar 2026", probationEnd: "10 Jun 2026",
    daysRemaining: 4, attendancePresent: 48, attendanceTotal: 50, tasksAssigned: 15, tasksCompleted: 14, tasksOverdue: 0,
    managerReview: { submitted: false, technicalSkills: 0, communication: 0, ownership: 0, teamCollaboration: 0, learningAbility: 0 },
    status: "active", extensionHistory: [],
  },
  {
    id: "pb6", name: "Arjun Das",     initials: "AD", color: "bg-red-500",    empId: "EMP046",
    department: "HR", designation: "HR Executive", manager: "Rahul Desai",
    joiningDate: "1 Feb 2026", probationStart: "1 Feb 2026", probationEnd: "31 Jul 2026",
    daysRemaining: 55, attendancePresent: 80, attendanceTotal: 88, tasksAssigned: 25, tasksCompleted: 23, tasksOverdue: 1,
    managerReview: { submitted: true, technicalSkills: 4, communication: 5, ownership: 4, teamCollaboration: 5, learningAbility: 4 },
    status: "active", extensionHistory: [],
  },
  {
    id: "pb7", name: "Priya Kapoor",  initials: "PK", color: "bg-pink-500",   empId: "EMP047",
    department: "Marketing", designation: "Marketing Executive", manager: "Arun Kumar",
    joiningDate: "10 Jan 2026", probationStart: "10 Jan 2026", probationEnd: "9 Jul 2026",
    daysRemaining: 33, attendancePresent: 95, attendanceTotal: 115, tasksAssigned: 20, tasksCompleted: 12, tasksOverdue: 5,
    managerReview: { submitted: true, technicalSkills: 2, communication: 3, ownership: 2, teamCollaboration: 3, learningAbility: 3 },
    status: "active", extensionHistory: [],
  },
  {
    id: "pb8", name: "Karan Singh",   initials: "KS", color: "bg-indigo-500", empId: "EMP048",
    department: "DevOps", designation: "DevOps Engineer", manager: "Priya Menon",
    joiningDate: "5 Dec 2025", probationStart: "5 Dec 2025", probationEnd: "4 Jun 2026",
    daysRemaining: 28, attendancePresent: 135, attendanceTotal: 152, tasksAssigned: 35, tasksCompleted: 32, tasksOverdue: 2,
    managerReview: { submitted: true, technicalSkills: 5, communication: 4, ownership: 5, teamCollaboration: 4, learningAbility: 5 },
    status: "confirmed", extensionHistory: [],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeScore(emp: ProbationEmployee) {
  const att = (emp.attendancePresent / emp.attendanceTotal) * 100;
  const task = (emp.tasksCompleted / emp.tasksAssigned) * 100;
  let mgr = 0;
  if (emp.managerReview.submitted) {
    const avg = (emp.managerReview.technicalSkills + emp.managerReview.communication +
      emp.managerReview.ownership + emp.managerReview.teamCollaboration +
      emp.managerReview.learningAbility) / 5;
    mgr = (avg / 5) * 100;
  }
  return Math.round(att * 0.4 + task * 0.4 + mgr * 0.2);
}

function getRecommendation(score: number, status: EmpStatus): Recommendation {
  if (status === "confirmed") return "Ready for Confirmation";
  if (score >= 85) return "Ready for Confirmation";
  if (score >= 70) return "Needs Review";
  return "At Risk";
}

function recommendationBadge(rec: Recommendation) {
  if (rec === "Ready for Confirmation") return "bg-green-100 text-green-700";
  if (rec === "Needs Review")           return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function recommendationText(rec: Recommendation) {
  if (rec === "Ready for Confirmation") return "text-green-700";
  if (rec === "Needs Review")           return "text-amber-700";
  return "text-red-700";
}

function scoreColor(score: number) {
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-amber-600";
  return "text-red-600";
}

function daysColor(days: number) {
  if (days <= 7) return "text-red-600";
  if (days <= 30) return "text-amber-600";
  return "text-slate-600";
}

function Avatar({ initials, color, size = "md" }: { initials: string; color: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-9 w-9 text-sm";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${color} ${sz}`}>
      {initials}
    </span>
  );
}

function StarRow({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`} />
      ))}
    </div>
  );
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-4 w-16 overflow-hidden rounded-sm bg-slate-100">
        <div className="h-full bg-blue-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500">{pct}%</span>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({ emp, onClose, onConfirm, onExtend }: {
  emp: ProbationEmployee;
  onClose: () => void;
  onConfirm: () => void;
  onExtend: () => void;
}) {
  const score = computeScore(emp);
  const rec = getRecommendation(score, emp.status);
  const att = Math.round((emp.attendancePresent / emp.attendanceTotal) * 100);
  const task = Math.round((emp.tasksCompleted / emp.tasksAssigned) * 100);
  const mgrAvg = emp.managerReview.submitted
    ? ((emp.managerReview.technicalSkills + emp.managerReview.communication +
        emp.managerReview.ownership + emp.managerReview.teamCollaboration +
        emp.managerReview.learningAbility) / 5)
    : 0;

  const calloutColor = rec === "Ready for Confirmation"
    ? "bg-green-50 border-green-200 text-green-800"
    : rec === "Needs Review"
    ? "bg-amber-50 border-amber-200 text-amber-800"
    : "bg-red-50 border-red-200 text-red-800";

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div
        className="relative flex h-full w-[420px] flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="font-semibold text-slate-900">Probation Details</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-5 px-5 py-4">
          {/* Employee Info */}
          <div className="flex items-start gap-4">
            <Avatar initials={emp.initials} color={emp.color} size="lg" />
            <div>
              <p className="text-base font-semibold text-slate-900">{emp.name}</p>
              <p className="text-sm text-slate-500">{emp.empId} · {emp.designation}</p>
              <p className="text-sm text-slate-500">{emp.department}</p>
              <p className="text-sm text-slate-400">Manager: {emp.manager}</p>
            </div>
          </div>

          {/* Probation Period */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Probation Period</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-xs text-slate-400">Start</p><p className="font-medium text-slate-700">{emp.probationStart}</p></div>
              <div><p className="text-xs text-slate-400">End</p><p className="font-medium text-slate-700">{emp.probationEnd}</p></div>
              <div><p className="text-xs text-slate-400">Days Remaining</p>
                <p className={`font-semibold ${daysColor(emp.daysRemaining)}`}>
                  {emp.daysRemaining <= 7 && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}
                  {emp.daysRemaining}d
                </p>
              </div>
            </div>
            {emp.extensionHistory.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-semibold text-slate-500">Extension History</p>
                {emp.extensionHistory.map((h, i) => (
                  <p key={i} className="text-xs text-slate-400">Extended {h.days} days on {h.date} — {h.reason}</p>
                ))}
              </div>
            )}
          </div>

          {/* Attendance */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Attendance</p>
            <p className="text-sm text-slate-600">Present {emp.attendancePresent} / Total {emp.attendanceTotal} days</p>
            <p className={`mt-1 text-2xl font-bold ${scoreColor(att)}`}>{att}%</p>
            <div className="mt-3 flex gap-1">
              {[82, 91, 88, 95].map((v, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-6 overflow-hidden rounded-sm bg-slate-200" style={{ height: 40 }}>
                    <div className="w-full rounded-sm bg-blue-400" style={{ height: `${v * 40 / 100}%`, marginTop: `${(100 - v) * 40 / 100}px` }} />
                  </div>
                  <span className="text-[9px] text-slate-400">W{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Task Metrics */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Task Metrics</p>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div><p className="text-xs text-slate-400">Assigned</p><p className="font-semibold text-slate-700">{emp.tasksAssigned}</p></div>
              <div><p className="text-xs text-slate-400">Completed</p><p className="font-semibold text-green-600">{emp.tasksCompleted}</p></div>
              <div><p className="text-xs text-slate-400">Overdue</p><p className="font-semibold text-red-500">{emp.tasksOverdue}</p></div>
            </div>
            <p className={`mt-2 text-2xl font-bold ${scoreColor(task)}`}>{task}%</p>
            <div className="mt-3 flex gap-1">
              {[75, 85, 90, 80].map((v, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-6 overflow-hidden rounded-sm bg-slate-200" style={{ height: 40 }}>
                    <div className="w-full rounded-sm bg-purple-400" style={{ height: `${v * 40 / 100}%`, marginTop: `${(100 - v) * 40 / 100}px` }} />
                  </div>
                  <span className="text-[9px] text-slate-400">W{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Manager Review */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Manager Review</p>
            {emp.managerReview.submitted ? (
              <div className="space-y-2">
                {[
                  ["Technical Skills",    emp.managerReview.technicalSkills],
                  ["Communication",       emp.managerReview.communication],
                  ["Ownership",           emp.managerReview.ownership],
                  ["Team Collaboration",  emp.managerReview.teamCollaboration],
                  ["Learning Ability",    emp.managerReview.learningAbility],
                ].map(([label, val]) => (
                  <div key={String(label)} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{label}</span>
                    <div className="flex items-center gap-2">
                      <StarRow rating={Number(val)} />
                      <span className="text-xs text-slate-500">{val}/5</span>
                    </div>
                  </div>
                ))}
                <div className="mt-2 border-t border-slate-200 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">Average</span>
                    <span className="text-sm font-semibold text-slate-900">{mgrAvg.toFixed(1)}/5 ({(mgrAvg / 5 * 20).toFixed(0)}/20)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-slate-400">Manager review not submitted</p>
                <button className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 mx-auto">
                  <Bell className="h-3 w-3" /> Request Review
                </button>
              </div>
            )}
          </div>

          {/* Performance Summary */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Performance Summary</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400">
                  <th className="pb-1.5 text-left font-semibold">Component</th>
                  <th className="pb-1.5 text-right font-semibold">Weight</th>
                  <th className="pb-1.5 text-right font-semibold">Raw</th>
                  <th className="pb-1.5 text-right font-semibold">Weighted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1.5 text-slate-700">Attendance</td>
                  <td className="py-1.5 text-right text-slate-500">40%</td>
                  <td className="py-1.5 text-right text-slate-500">{att}%</td>
                  <td className="py-1.5 text-right font-medium text-slate-700">{Math.round(att * 0.4)} pts</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-700">Task Completion</td>
                  <td className="py-1.5 text-right text-slate-500">40%</td>
                  <td className="py-1.5 text-right text-slate-500">{task}%</td>
                  <td className="py-1.5 text-right font-medium text-slate-700">{Math.round(task * 0.4)} pts</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-700">Manager Review</td>
                  <td className="py-1.5 text-right text-slate-500">20%</td>
                  <td className="py-1.5 text-right text-slate-500">{mgrAvg.toFixed(1)}/5</td>
                  <td className="py-1.5 text-right font-medium text-slate-700">{Math.round(mgrAvg / 5 * 100 * 0.2)} pts</td>
                </tr>
                <tr className="border-t-2 border-slate-300">
                  <td className="pt-2 font-semibold text-slate-900" colSpan={3}>Final Score</td>
                  <td className={`pt-2 text-right text-lg font-bold ${scoreColor(score)}`}>{score}/100</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${recommendationBadge(rec)}`}>{rec}</span>
            </div>
          </div>

          {/* HR Decision Note */}
          <div className={`rounded-xl border p-4 ${calloutColor}`}>
            <p className="text-sm font-semibold">System recommendation: {rec}</p>
            <p className="mt-1 text-xs italic opacity-80">Final decision rests with HR/Admin — do not auto-confirm.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <button onClick={onConfirm} className="flex-1 rounded-xl bg-green-600 py-2 text-xs font-semibold text-white hover:bg-green-700">Confirm Employee</button>
          <button onClick={onExtend} className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Extend Probation</button>
          <button className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Schedule Review</button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ emp, onClose }: { emp: ProbationEmployee; onClose: () => void }) {
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("2026-06-06");
  const score = computeScore(emp);
  const rec = getRecommendation(score, emp.status);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Confirm Employee — {emp.name}</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Score: <span className={scoreColor(score)}>{score}/100</span></p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${recommendationBadge(rec)}`}>{rec}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Confirmation Notes *</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Add HR decision notes…" className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Effective Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={onClose} className="flex-1 rounded-xl bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ─── Extend Modal ─────────────────────────────────────────────────────────────

function ExtendModal({ emp, onClose }: { emp: ProbationEmployee; onClose: () => void }) {
  const [duration, setDuration] = useState<30 | 60 | 90>(30);
  const [reason, setReason] = useState("");

  function addDays(dateStr: string, days: number) {
    const parts = dateStr.split(" ");
    const months: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const d = new Date(Number(parts[2]), months[parts[1]], Number(parts[0]));
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  const newEnd = addDays(emp.probationEnd, duration);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Extend Probation — {emp.name}</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">Duration</label>
            <div className="mt-2 flex gap-3">
              {([30, 60, 90] as const).map((d) => (
                <label key={d} className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name="duration" checked={duration === d} onChange={() => setDuration(d)} className="accent-blue-600" />
                  <span className="text-sm text-slate-700">{d} Days</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Reason * <span className="font-normal text-slate-400">(min 20 chars)</span></label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for extension…" className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
            {reason.length > 0 && reason.length < 20 && <p className="mt-0.5 text-xs text-red-500">{20 - reason.length} more characters needed</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">New End Date</label>
            <p className="mt-1 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700">{newEnd}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button
            onClick={onClose}
            disabled={reason.length < 20}
            className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Confirm Extension
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProbationPage() {
  const navigate = useNavigate();
  const [selectedEmp, setSelectedEmp] = useState<ProbationEmployee | null>(null);
  const [confirmEmp, setConfirmEmp] = useState<ProbationEmployee | null>(null);
  const [extendEmp, setExtendEmp] = useState<ProbationEmployee | null>(null);

  const stats = [
    { label: "On Probation",         value: PROBATION_DATA.filter((e) => e.status === "active" || e.status === "extended").length },
    { label: "Ready to Confirm",     value: PROBATION_DATA.filter((e) => computeScore(e) >= 85 && e.status === "active").length },
    { label: "Needs Review",         value: PROBATION_DATA.filter((e) => { const s = computeScore(e); return s >= 70 && s < 85 && e.status === "active"; }).length },
    { label: "At Risk",              value: PROBATION_DATA.filter((e) => computeScore(e) < 70 && e.status === "active").length },
  ];

  function statusBadge(emp: ProbationEmployee) {
    const score = computeScore(emp);
    if (emp.status === "confirmed") return <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">✓ Confirmed</span>;
    if (emp.status === "extended")  return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">Extended</span>;
    const rec = getRecommendation(score, emp.status);
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${recommendationBadge(rec)}`}>{rec}</span>;
  }

  return (
    <div className="min-h-full bg-[#f5f8ff] px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
        <button onClick={() => navigate("/dashboard")} className="hover:text-slate-600">Dashboard</button>
        <ChevronRight className="h-3 w-3" />
        <span>Workforce</span>
        <ChevronRight className="h-3 w-3" />
        <span>Lifecycle</span>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-slate-600">Probation</span>
      </nav>

      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Probation Management</h1>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {["Employee","Department","Designation","Manager","Joining Date","Probation End","Days Left","Attendance %","Task %","Manager Rating","Score","Recommendation","Status","Actions"].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {PROBATION_DATA.map((emp) => {
              const score = computeScore(emp);
              const rec = getRecommendation(score, emp.status);
              const att = Math.round((emp.attendancePresent / emp.attendanceTotal) * 100);
              const task = Math.round((emp.tasksCompleted / emp.tasksAssigned) * 100);
              const mgrAvg = emp.managerReview.submitted
                ? ((emp.managerReview.technicalSkills + emp.managerReview.communication +
                    emp.managerReview.ownership + emp.managerReview.teamCollaboration +
                    emp.managerReview.learningAbility) / 5).toFixed(1)
                : "—";
              return (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${emp.color}`}>{emp.initials}</span>
                      <div>
                        <p className="font-medium text-slate-900">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.empId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{emp.department}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{emp.designation}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{emp.manager}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{emp.joiningDate}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{emp.probationEnd}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`flex items-center gap-1 font-semibold ${daysColor(emp.daysRemaining)}`}>
                      {emp.daysRemaining <= 7 && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}
                      {emp.daysRemaining <= 30 && emp.daysRemaining > 7 && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                      {emp.daysRemaining}d
                    </span>
                  </td>
                  <td className={`whitespace-nowrap px-4 py-3 font-semibold ${scoreColor(att)}`}>{att}%</td>
                  <td className={`whitespace-nowrap px-4 py-3 font-semibold ${scoreColor(task)}`}>{task}%</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{mgrAvg !== "—" ? `${mgrAvg}/5` : <span className="text-slate-300">—</span>}</td>
                  <td className={`whitespace-nowrap px-4 py-3 font-bold ${scoreColor(score)}`}>{score}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${recommendationBadge(rec)}`}>{rec}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{statusBadge(emp)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedEmp(emp)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">View Details</button>
                      {emp.status === "active" && score >= 70 && (
                        <button onClick={() => setConfirmEmp(emp)} className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700">Confirm</button>
                      )}
                      <button onClick={() => setExtendEmp(emp)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">Extend</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedEmp && (
        <DetailDrawer
          emp={selectedEmp}
          onClose={() => setSelectedEmp(null)}
          onConfirm={() => { setConfirmEmp(selectedEmp); setSelectedEmp(null); }}
          onExtend={() => { setExtendEmp(selectedEmp); setSelectedEmp(null); }}
        />
      )}
      {confirmEmp && <ConfirmModal emp={confirmEmp} onClose={() => setConfirmEmp(null)} />}
      {extendEmp && <ExtendModal emp={extendEmp} onClose={() => setExtendEmp(null)} />}
    </div>
  );
}
