import {
  Plus, X, AlertCircle, ChevronLeft, ChevronRight,
  Flag, Star, Info,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { ManagerFrame, Button } from "./shared";
import { apiFetch, holidaysAPI } from "../../lib/api";
import {
  getMyLeaveBalance, getMyLeaveRequests, applyLeave, cancelLeaveRequest,
  getTeamLeaveBalances,
} from "../../services/leaveApi";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeaveBalance {
  sl_balance?: number;
  sl_entitled?: number;
  sl_used?: number;
  el_balance?: number;
  el_opening?: number;
  el_accrued?: number;
  el_used?: number;
  sick_leave_total?: number;
  sick_leave_used?: number;
  earned_leave_accrued?: number;
  earned_leave_used?: number;
  carried_forward?: number;
  casual_leave_total?: number;
  casual_leave_used?: number;
  comp_off_total?: number;
  comp_off_used?: number;
  id?: string;
  employee_id?: string;
  year?: number;
  [key: string]: number | string | undefined;
}

interface LeaveRequest {
  id: string;
  employee_id?: string;
  leave_type?: string;
  type?: string;
  from_date?: string;
  to_date?: string;
  days?: number;
  reason?: string;
  status: string;
  created_at?: string;
  review_note?: string;
}

interface Holiday {
  date: string;
  name: string;
  type?: string;
}

interface Announcement {
  title: string;
  [key: string]: unknown;
}

type BalanceCheckResult = { available: number; sufficient: boolean; requested: number; type: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const LEAVE_POLICY = {
  earned: {
    code: "EL",
    label: "Earned Leave",
    borderColor: "border-l-4 border-l-green-500",
    description: "Accrues 1.5 days each completed month. Carry-forward capped at 20 days.",
  },
  sick: {
    code: "SL",
    label: "Sick Leave",
    borderColor: "border-l-4 border-l-red-500",
    description: "6 days per year. No carry-forward.",
  },
  casual: {
    code: "CL",
    label: "Casual Leave",
    borderColor: "border-l-4 border-l-blue-500",
    description: "5 days per year for personal needs.",
  },
  maternity: {
    code: "ML",
    label: "Maternity Leave",
    borderColor: "border-l-4 border-l-purple-500",
    description: "182 days (26 weeks) as per law.",
  },
  lop: {
    code: "LOP",
    label: "Loss of Pay",
    borderColor: "border-l-4 border-l-slate-500",
    description: "No cap. Deducted from salary.",
  },
} as const;

type HistoryFilter = "all" | "pending" | "approved" | "rejected";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateShort(d: string | undefined): string {
  if (!d) return "—";
  const parts = d.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
}

function calcWorkingDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const s = new Date(from), e = new Date(to);
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// ── LeavePanel ────────────────────────────────────────────────────────────────

function LeavePanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </section>
  );
}

// ── MyLeavesSection ───────────────────────────────────────────────────────────

function MyLeavesSection({ applyOpen, onApplyClose }: { applyOpen: boolean; onApplyClose: () => void }) {
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"policy" | "history" | "requests">("policy");

  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [leavePage, setLeavePage] = useState(1);
  const LEAVE_PAGE_SIZE = 10;

  const [selectedType, setSelectedType] = useState<keyof typeof LEAVE_POLICY>("earned");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myToast, setMyToast] = useState<string | null>(null);

  const [balanceCheck, setBalanceCheck] = useState<BalanceCheckResult | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);

  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!myToast) return;
    const t = setTimeout(() => setMyToast(null), 3000);
    return () => clearTimeout(t);
  }, [myToast]);

  useEffect(() => { setLeavePage(1); }, [historyFilter, activeTab]);

  useEffect(() => {
    const days = calcWorkingDays(fromDate, toDate);
    if (!selectedType || days <= 0 || selectedType === "maternity" || selectedType === "lop") {
      setBalanceCheck(null);
      return;
    }
    const timer = setTimeout(() => {
      setCheckingBalance(true);
      if (!balance) { setBalanceCheck(null); setCheckingBalance(false); return; }
      const available = selectedType === "sick"
        ? Math.max(0, (balance.sl_balance as number) ?? ((balance.sl_entitled as number ?? 6) - (balance.sl_used as number ?? 0)))
        : Math.max(0, (balance.el_balance as number) ?? (((balance.el_opening as number ?? 0) + (balance.el_accrued as number ?? 0)) - (balance.el_used as number ?? 0)));
      setBalanceCheck({ available, sufficient: days <= available, requested: days, type: selectedType });
      setCheckingBalance(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedType, fromDate, toDate, balance]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bal, hist, ann, hols] = await Promise.allSettled([
        getMyLeaveBalance(),
        getMyLeaveRequests(),
        apiFetch("/announcements"),
        holidaysAPI.getAll(),
      ]);
      if (bal.status === "fulfilled") setBalance((bal.value as LeaveBalance) ?? null);
      if (hist.status === "fulfilled") setLeaveHistory(Array.isArray(hist.value) ? (hist.value as LeaveRequest[]) : []);
      if (ann.status === "fulfilled" && Array.isArray(ann.value)) {
        setAnnouncements((ann.value as Announcement[]).map(a => a.title).filter(t => typeof t === "string" && t.length > 0));
      }
      if (hols.status === "fulfilled" && Array.isArray(hols.value)) {
        setHolidays(hols.value as Holiday[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const elAccrued = (balance?.el_accrued as number) ?? (balance?.earned_leave_accrued as number) ?? 0;
  const elCarried = (balance?.el_opening as number) ?? (balance?.carried_forward as number) ?? 0;
  const elTotal = elAccrued + elCarried;
  const elUsed = (balance?.el_used as number) ?? (balance?.earned_leave_used as number) ?? 0;
  const elAvailable = balance?.el_balance != null ? Math.max(0, balance.el_balance as number) : Math.max(0, elTotal - elUsed);

  const slTotal = (balance?.sl_entitled as number) ?? (balance?.sick_leave_total as number) ?? 6;
  const slUsed = (balance?.sl_used as number) ?? (balance?.sick_leave_used as number) ?? 0;
  const slAvailable = balance?.sl_balance != null ? Math.max(0, balance.sl_balance as number) : Math.max(0, slTotal - slUsed);

  const mlAvailable = 182;

  const pendingRequests = leaveHistory.filter(l => l.status === "pending");
  const requestedDays = calcWorkingDays(fromDate, toDate);

  const filteredHistory = historyFilter === "all"
    ? leaveHistory
    : leaveHistory.filter(l => l.status === historyFilter);
  const totalLeavePages = Math.ceil(filteredHistory.length / LEAVE_PAGE_SIZE);
  const paginatedHistory = filteredHistory.slice(
    (leavePage - 1) * LEAVE_PAGE_SIZE,
    leavePage * LEAVE_PAGE_SIZE
  );

  const getPolicyInfo = () => {
    if (selectedType === "earned") return `Accrues 1.5 days each completed month. Carry-forward capped at 20 days. Available: ${elAvailable}d · Accrued YTD: ${elAccrued}d · Carried: ${elCarried}d`;
    if (selectedType === "sick") return `6 days per year. No carry-forward. Available: ${slAvailable}d`;
    if (selectedType === "casual") return `5 days per year for personal needs. (Balance tracking coming soon)`;
    if (selectedType === "maternity") return `182 days (26 weeks) as per law. Statutory benefit.`;
    return `No cap. Deducted from salary.`;
  };

  const handleCancelLeave = async (id: string) => {
    try {
      await cancelLeaveRequest(id);
      setMyToast("Leave request cancelled.");
      await loadData();
    } catch (err) {
      setMyToast(err instanceof Error ? err.message : "Failed to cancel");
    }
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!fromDate || !toDate || requestedDays <= 0) { setFormError("Please select valid from/to dates."); return; }
    if (selectedType === "earned" && requestedDays > elAvailable) { setFormError(`Only ${elAvailable} earned leave days available.`); return; }
    if (selectedType === "sick" && requestedDays > slAvailable) { setFormError(`Only ${slAvailable} sick leave days available.`); return; }
    setIsSubmitting(true);
    try {
      const leaveTypeCode = selectedType === "sick" ? "SL" : "EL";
      await applyLeave({ leave_type: leaveTypeCode, from_date: fromDate, to_date: toDate, days: requestedDays, reason: reason || undefined });
      setMyToast("Leave request submitted successfully!");
      onApplyClose();
      setFromDate(""); setToDate(""); setReason(""); setSelectedType("earned");
      setBalanceCheck(null);
      await loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to submit leave request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPaginationBar = () => {
    if (filteredHistory.length === 0) return null;
    const from = (leavePage - 1) * LEAVE_PAGE_SIZE + 1;
    const to = Math.min(leavePage * LEAVE_PAGE_SIZE, filteredHistory.length);
    const pages = (() => {
      const total = totalLeavePages;
      let start = Math.max(1, leavePage - 2);
      const end = Math.min(total, start + 4);
      start = Math.max(1, end - 4);
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    })();
    return (
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[12px]">
        <p className="text-slate-500">Showing {from}–{to} of {filteredHistory.length} records</p>
        <div className="flex items-center gap-1">
          <button onClick={() => setLeavePage(p => p - 1)} disabled={leavePage === 1} className="h-7 rounded border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Prev</button>
          {pages.map(n => (
            <button key={n} onClick={() => setLeavePage(n)} className={`h-7 min-w-[28px] rounded border px-1.5 text-xs font-bold transition-colors ${n === leavePage ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>{n}</button>
          ))}
          <button onClick={() => setLeavePage(p => p + 1)} disabled={leavePage === totalLeavePages || totalLeavePages === 0} className="h-7 rounded border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {myToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-lg">{myToast}</div>
      )}

      {/* Announcement Ticker */}
      {announcements.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-2 text-blue-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm font-medium">{announcements[announcementIdx]}</p>
          </div>
          {announcements.length > 1 && (
            <div className="ml-auto flex gap-2">
              <button onClick={() => setAnnouncementIdx(Math.max(0, announcementIdx - 1))} disabled={announcementIdx === 0} className="text-blue-600 hover:text-blue-700 disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setAnnouncementIdx(Math.min(announcements.length - 1, announcementIdx + 1))} disabled={announcementIdx === announcements.length - 1} className="text-blue-600 hover:text-blue-700 disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      )}

      {/* Balance Cards */}
      {loading ? (
        <div className="grid grid-cols-5 gap-4">{[1,2,3,4,5].map(i => <div key={i} className="h-[200px] animate-pulse rounded-lg bg-slate-200" />)}</div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          <LeavePanel className={`${LEAVE_POLICY.earned.borderColor} p-5 flex flex-col`}>
            <div className="flex items-start justify-between flex-1">
              <div><p className="text-xs font-bold text-slate-600">{LEAVE_POLICY.earned.label}</p><p className="mt-2 text-3xl font-bold text-green-700">{elAvailable}</p><p className="mt-1 text-xs text-slate-600">days available</p></div>
              <span className="inline-flex h-8 items-center justify-center rounded-md bg-green-100 px-2 text-xs font-bold text-green-700">{LEAVE_POLICY.earned.code}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <div><span>Used</span><p className="font-bold">{elUsed}d</p></div>
              <div><span>Pending</span><p className="font-bold">{pendingRequests.filter(r => r.type === "earned").length}d</p></div>
              <div><span>Accrued</span><p className="font-bold">{elAccrued}d</p></div>
              <div><span>Carry-fwd</span><p className="font-bold">{elCarried}d</p></div>
            </div>
          </LeavePanel>

          <LeavePanel className={`${LEAVE_POLICY.sick.borderColor} p-5 flex flex-col`}>
            <div className="flex items-start justify-between flex-1">
              <div><p className="text-xs font-bold text-slate-600">{LEAVE_POLICY.sick.label}</p><p className="mt-2 text-3xl font-bold text-red-700">{slAvailable}</p><p className="mt-1 text-xs text-slate-600">days available</p></div>
              <span className="inline-flex h-8 items-center justify-center rounded-md bg-red-100 px-2 text-xs font-bold text-red-700">{LEAVE_POLICY.sick.code}</span>
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <div className="grid grid-cols-2 gap-2"><div><span>Total</span><p className="font-bold">{slTotal}d</p></div><div><span>Used</span><p className="font-bold">{slUsed}d</p></div></div>
              <div><span>No carry-forward</span><p className="text-[11px]">Policy rule</p></div>
            </div>
          </LeavePanel>

          <LeavePanel className={`${LEAVE_POLICY.casual.borderColor} p-5 flex flex-col`}>
            <div className="flex items-start justify-between flex-1">
              <div><p className="text-xs font-bold text-slate-600">{LEAVE_POLICY.casual.label}</p><p className="mt-2 text-3xl font-bold text-blue-700">N/A</p><p className="mt-1 text-xs text-slate-600">not tracked</p></div>
              <span className="inline-flex h-8 items-center justify-center rounded-md bg-blue-100 px-2 text-xs font-bold text-blue-700">{LEAVE_POLICY.casual.code}</span>
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <div className="grid grid-cols-2 gap-2"><div><span>Total</span><p className="font-bold">5d</p></div><div><span>Personal needs</span><p className="text-[11px]">Purpose</p></div></div>
            </div>
          </LeavePanel>

          <LeavePanel className={`${LEAVE_POLICY.maternity.borderColor} p-5 flex flex-col`}>
            <div className="flex items-start justify-between flex-1">
              <div><p className="text-xs font-bold text-slate-600">{LEAVE_POLICY.maternity.label}</p><p className="mt-2 text-3xl font-bold text-purple-700">{mlAvailable}</p><p className="mt-1 text-xs text-slate-600">statutory days</p></div>
              <span className="inline-flex h-8 items-center justify-center rounded-md bg-purple-100 px-2 text-xs font-bold text-purple-700">{LEAVE_POLICY.maternity.code}</span>
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <div className="grid grid-cols-2 gap-2"><div><span>26 weeks</span><p className="text-[11px]">As per law</p></div><div><span>Statutory</span><p className="text-[11px]">Protected</p></div></div>
            </div>
          </LeavePanel>

          <LeavePanel className={`${LEAVE_POLICY.lop.borderColor} p-5 flex flex-col`}>
            <div className="flex items-start justify-between flex-1">
              <div><p className="text-xs font-bold text-slate-600">{LEAVE_POLICY.lop.label}</p><p className="mt-2 text-3xl font-bold text-slate-700">&infin;</p><p className="mt-1 text-xs text-slate-600">no cap</p></div>
              <span className="inline-flex h-8 items-center justify-center rounded-md bg-slate-200 px-2 text-xs font-bold text-slate-700">{LEAVE_POLICY.lop.code}</span>
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <div><span>Deducted from salary</span><p className="text-[11px]">Policy</p></div>
            </div>
          </LeavePanel>
        </div>
      )}

      {/* Tabs */}
      <LeavePanel>
        <div className="flex gap-8 border-b border-slate-100 px-5">
          {(["policy", "history", "requests"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`border-b-2 py-4 text-sm font-bold transition ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-600 hover:text-slate-900"}`}>
              {tab === "policy" && "Policy & Accrual"}
              {tab === "history" && "My History"}
              {tab === "requests" && "All Requests"}
            </button>
          ))}
        </div>

        {activeTab === "policy" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 font-bold text-slate-600">Leave Type</th>
                  <th className="px-5 py-3 font-bold text-slate-600">Entitlement</th>
                  <th className="px-5 py-3 font-bold text-slate-600">Accrual</th>
                  <th className="px-5 py-3 font-bold text-slate-600">Carry Forward</th>
                  <th className="px-5 py-3 font-bold text-slate-600">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr><td className="px-5 py-4 font-semibold text-slate-950">Earned Leave</td><td className="px-5 py-4">18/year</td><td className="px-5 py-4">1.5/month</td><td className="px-5 py-4">Max 20 days</td><td className="px-5 py-4 text-slate-600">Unused EL carries forward</td></tr>
                <tr><td className="px-5 py-4 font-semibold text-slate-950">Sick Leave</td><td className="px-5 py-4">6/year</td><td className="px-5 py-4">Full year</td><td className="px-5 py-4">No carry forward</td><td className="px-5 py-4 text-slate-600">Medical emergencies</td></tr>
                <tr><td className="px-5 py-4 font-semibold text-slate-950">Casual Leave</td><td className="px-5 py-4">5/year</td><td className="px-5 py-4">Full year</td><td className="px-5 py-4">No carry forward</td><td className="px-5 py-4 text-slate-600">Personal needs</td></tr>
                <tr><td className="px-5 py-4 font-semibold text-slate-950">Maternity Leave</td><td className="px-5 py-4">182 days</td><td className="px-5 py-4">As per law</td><td className="px-5 py-4">No carry forward</td><td className="px-5 py-4 text-slate-600">Statutory benefit</td></tr>
                <tr><td className="px-5 py-4 font-semibold text-slate-950">Loss of Pay</td><td className="px-5 py-4">No cap</td><td className="px-5 py-4">N/A</td><td className="px-5 py-4">N/A</td><td className="px-5 py-4 text-slate-600">Salary deducted</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "history" && (
          <div>
            <div className="flex gap-1 border-b border-slate-100 px-5 pt-3">
              {(["all", "pending", "approved", "rejected"] as const).map(f => {
                const count = f === "all" ? leaveHistory.length : leaveHistory.filter(l => l.status === f).length;
                return (
                  <button key={f} onClick={() => setHistoryFilter(f)} className={`rounded-t-md px-4 py-2 text-xs font-bold transition ${historyFilter === f ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-900"}`}>
                    {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                  </button>
                );
              })}
            </div>
            {filteredHistory.length === 0 ? (
              <div className="px-5 py-12 text-center text-slate-600"><p className="text-sm">No leave history{historyFilter !== "all" ? ` with status "${historyFilter}"` : ""}</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 font-bold text-slate-600">ID</th>
                      <th className="px-5 py-3 font-bold text-slate-600">Type</th>
                      <th className="px-5 py-3 font-bold text-slate-600">Dates</th>
                      <th className="px-5 py-3 font-bold text-slate-600">Days</th>
                      <th className="px-5 py-3 font-bold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedHistory.map((req, idx) => (
                      <tr key={req.id}>
                        <td className="px-5 py-4 font-mono text-xs text-slate-600">L-{String((leavePage - 1) * LEAVE_PAGE_SIZE + idx + 1).padStart(4, "0")}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${req.type === "earned" || req.leave_type === "EL" ? "bg-green-500" : req.type === "sick" || req.leave_type === "SL" ? "bg-red-500" : req.type === "casual" ? "bg-blue-500" : "bg-slate-400"}`} />
                            {LEAVE_POLICY[(req.type as keyof typeof LEAVE_POLICY)]?.label || req.type || req.leave_type || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs">{fmtDateShort(req.from_date)} &rarr; {fmtDateShort(req.to_date)}</td>
                        <td className="px-5 py-4 font-bold">{req.days || "—"}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${req.status === "approved" ? "bg-green-100 text-green-700" : req.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{req.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {renderPaginationBar()}
          </div>
        )}

        {activeTab === "requests" && (
          <div>
            <div className="px-5 py-4 text-xs font-bold text-slate-600">{pendingRequests.length} pending &middot; {leaveHistory.length} total</div>
            {leaveHistory.length === 0 ? (
              <div className="px-5 py-12 text-center text-slate-600"><p className="text-sm">No leave requests</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 font-bold text-slate-600">ID</th>
                      <th className="px-5 py-3 font-bold text-slate-600">Type</th>
                      <th className="px-5 py-3 font-bold text-slate-600">Dates</th>
                      <th className="px-5 py-3 font-bold text-slate-600">Days</th>
                      <th className="px-5 py-3 font-bold text-slate-600">Status</th>
                      <th className="px-5 py-3 font-bold text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaveHistory.map((req, idx) => (
                      <tr key={req.id}>
                        <td className="px-5 py-4 font-mono text-xs text-slate-600">L-{String(idx + 1).padStart(4, "0")}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${req.type === "earned" || req.leave_type === "EL" ? "bg-green-500" : req.type === "sick" || req.leave_type === "SL" ? "bg-red-500" : req.type === "casual" ? "bg-blue-500" : "bg-slate-400"}`} />
                            {LEAVE_POLICY[(req.type as keyof typeof LEAVE_POLICY)]?.label || req.type || req.leave_type || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs">{fmtDateShort(req.from_date)} &rarr; {fmtDateShort(req.to_date)}</td>
                        <td className="px-5 py-4 font-bold">{req.days || "—"}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${req.status === "approved" ? "bg-green-100 text-green-700" : req.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{req.status}</span>
                        </td>
                        <td className="px-5 py-4">
                          {req.status === "pending" ? (
                            <button onClick={() => handleCancelLeave(req.id)} className="rounded border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:border-red-300 hover:text-red-600">Cancel</button>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </LeavePanel>

      {/* Holiday Calendar */}
      <LeavePanel>
        <div className="grid gap-4 xl:grid-cols-[2fr_1.2fr] p-5">
          <div>
            <div className="flex items-center justify-between gap-4 mb-5">
              <h3 className="text-lg font-bold text-slate-950">Holiday Calendar</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); } else setCalendarMonth(calendarMonth - 1); }} className="text-slate-600 hover:text-slate-900"><ChevronLeft className="h-5 w-5" /></button>
                <span className="font-semibold text-slate-950 min-w-[150px] text-center">{new Date(calendarYear, calendarMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                <button onClick={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); } else setCalendarMonth(calendarMonth + 1); }} className="text-slate-600 hover:text-slate-900"><ChevronRight className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day => (
                <div key={day} className="text-center text-xs font-bold text-slate-600 py-2">{day}</div>
              ))}
              {Array.from({ length: 42 }).map((_, idx) => {
                const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
                const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                const dayNum = idx - firstDay + 1;
                const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
                const holiday = isCurrentMonth ? holidays.find(h => h.date === dateStr) : undefined;
                const isWeekend = (idx % 7 === 0 || idx % 7 === 6) && isCurrentMonth;
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                if (!isCurrentMonth) return <div key={idx} className="h-10" />;
                return (
                  <div key={idx} className={`h-10 flex items-center justify-center rounded-lg text-xs font-semibold relative ${isToday ? "ring-2 ring-blue-500 bg-blue-50 text-blue-700" : isWeekend ? "bg-slate-100 text-slate-400" : "bg-white text-slate-900 border border-slate-200"}`}>
                    {dayNum}
                    {holiday && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-orange-500" />}
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-950 mb-4">Upcoming Holidays</h3>
            {holidays.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming holidays</p>
            ) : (
              <div className="space-y-3">
                {holidays
                  .filter(h => new Date(h.date + "T00:00:00") >= new Date(new Date().toISOString().split("T")[0] + "T00:00:00"))
                  .slice(0, 5)
                  .map(holiday => {
                    const Icon = holiday.type === "National" ? Flag : holiday.type === "Festival" ? Star : Info;
                    const iconColor = holiday.type === "National" ? "text-orange-500" : holiday.type === "Festival" ? "text-yellow-500" : "text-slate-400";
                    const d = new Date(holiday.date + "T00:00:00");
                    const formatted = d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", weekday: "long" });
                    return (
                      <div key={holiday.date} className="border-l-2 border-slate-200 pl-3">
                        <div className="flex items-start gap-2">
                          <Icon className={`h-4 w-4 ${iconColor} flex-shrink-0 mt-0.5`} />
                          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-950">{holiday.name}</p><p className="text-xs text-slate-600">{formatted}</p></div>
                        </div>
                        {holiday.type && <span className="inline-block mt-1 text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">{holiday.type}</span>}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </LeavePanel>

      {/* Apply Leave Modal */}
      {applyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <LeavePanel className="w-full max-w-[640px] p-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">New leave request</h2>
                <p className="mt-1 text-xs text-slate-600">Choose a leave type &mdash; policy rules and balance are applied automatically.</p>
              </div>
              <button onClick={() => { onApplyClose(); setBalanceCheck(null); }} className="text-slate-500 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Leave Type</label>
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as keyof typeof LEAVE_POLICY)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500">
                  {Object.entries(LEAVE_POLICY).map(([key, policy]) => <option key={key} value={key}>{policy.label}</option>)}
                </select>
              </div>

              <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 border border-blue-200">{getPolicyInfo()}</div>

              <div>
                <label className="text-xs font-bold text-slate-700">From Date</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">To Date</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>

              {requestedDays > 0 && (
                <div className="rounded-lg bg-slate-50 p-3 text-center text-sm font-bold text-slate-700">
                  {requestedDays} working day{requestedDays !== 1 ? "s" : ""}
                </div>
              )}

              {(checkingBalance || balanceCheck) && (
                <div className={`rounded-lg px-4 py-3 text-sm font-bold ${
                  checkingBalance
                    ? "bg-slate-50 text-slate-500"
                    : balanceCheck?.sufficient
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                }`}>
                  {checkingBalance
                    ? "Checking balance..."
                    : balanceCheck?.sufficient
                      ? `✓ Sufficient balance — ${balanceCheck.available} days available, ${balanceCheck.requested} days requested`
                      : `✗ Insufficient balance — Available: ${balanceCheck?.available} days, Requested: ${balanceCheck?.requested} days.`}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700">Reason (Optional)</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Short note for your manager" rows={3} className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>

              {formError && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 border border-red-200">{formError}</div>}
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => { onApplyClose(); setBalanceCheck(null); }} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !fromDate || !toDate || requestedDays <= 0 || (balanceCheck !== null && !balanceCheck.sufficient)}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </LeavePanel>
        </div>
      )}
    </div>
  );
}

// ── ManagerLeaves ─────────────────────────────────────────────────────────────

export default function ManagerLeaves() {
  const [applyOpen, setApplyOpen] = useState(false);
  const [teamBalances, setTeamBalances] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);

  useEffect(() => {
    getTeamLeaveBalances()
      .then(data => {
        setTeamBalances(Array.isArray(data) ? data : []);
        setTeamLoading(false);
      })
      .catch(() => setTeamLoading(false));
  }, []);

  return (
    <ManagerFrame
      title="Leaves"
      subtitle="View and manage your personal leave balance and requests"
      actions={
        <Button primary onClick={() => setApplyOpen(true)}>
          <Plus className="h-4 w-4" />Apply Leave
        </Button>
      }
    >
      <MyLeavesSection applyOpen={applyOpen} onApplyClose={() => setApplyOpen(false)} />

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Team Leave Balances</h2>

        {teamLoading ? (
          <div className="text-slate-400 text-sm">Loading...</div>
        ) : teamBalances.length === 0 ? (
          <div className="text-slate-400 text-sm">No team members found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Employee</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">SL Available</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">SL Used</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">EL Available</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">EL Used</th>
                </tr>
              </thead>
              <tbody>
                {teamBalances.map((member: any) => (
                  <tr key={member.employee_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {member.employee_name || member.name || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-semibold ${
                        (member.sl_balance ?? member.sl_available ?? 0) < 2
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        {member.sl_balance ?? member.sl_available ?? 0}
                      </span>
                      <span className="text-slate-400 text-xs ml-1">days</span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      {member.sl_used ?? 0} days
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-semibold ${
                        (member.el_balance ?? member.el_available ?? 0) < 3
                          ? 'text-amber-600'
                          : 'text-blue-600'
                      }`}>
                        {member.el_balance ?? member.el_available ?? 0}
                      </span>
                      <span className="text-slate-400 text-xs ml-1">days</span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      {member.el_used ?? 0} days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ManagerFrame>
  );
}
