import {
  Filter, CalendarDays, CheckCircle2, CircleDollarSign, Clock3, UsersRound,
  Check, X, Eye, Search,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import {
  ManagerFrame, Button, Panel, Donut, Legend, Avatar, StatusPill, mgfmtDate, tone,
} from "./shared";
import type { Tone } from "./shared";
import { timesheetAPI, attendanceAPI } from "../../lib/api";
import {
  getPendingApprovals, approveLeave, rejectLeave, getTeamLeaveHistory,
} from "../../services/leaveApi";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type?: string;
  type?: string;
  from_date?: string;
  to_date?: string;
  days?: number;
  reason?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  reviewed_at?: string;
  employee_name?: string;
  department?: string;
  employees?: { name?: string; first_name?: string; last_name?: string; department?: string };
}

interface Timesheet {
  id: string;
  employee_id: string;
  week_start?: string;
  week_end?: string;
  total_hours?: number;
  status: string;
  submitted_at?: string;
  created_at?: string;
  reviewed_at?: string;
  employees?: { name: string; department: string };
}

interface AttendanceRequest {
  id: string;
  employee_id: string;
  type: "regularization" | "wfh" | "missed_checkin";
  date: string;
  reason: string;
  status: string;
  created_at: string;
  employees?: { name: string; department: string };
}

type UnifiedItem =
  | (LeaveRequest & { _kind: "leave" })
  | (Timesheet & { _kind: "timesheet" })
  | (AttendanceRequest & { _kind: "attendance" });

type ActiveTab = "all" | "leaves" | "timesheets" | "attendance";

interface ChartPoint { date: string; Leaves: number; Timesheets: number; Attendance: number }

interface HistoryEntry {
  id: string;
  name: string;
  department: string;
  requestType: string;
  details: string;
  submittedOn: string;
  reviewedOn: string;
  status: string;
  rawDate: string;
  kind: "leave" | "timesheet";
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROWS_PER_PAGE = 8;
const HISTORY_PAGE_SIZE = 10;

const ATT_LABELS: Record<string, string> = {
  regularization: "Regularization",
  wfh: "WFH",
  missed_checkin: "Missed Check-In",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function itemDate(item: UnifiedItem): string {
  if (item._kind === "timesheet") return (item as Timesheet).submitted_at || (item as Timesheet).created_at || "";
  if (item._kind === "leave") return (item as LeaveRequest).created_at || "";
  return (item as AttendanceRequest).created_at;
}

function buildChartData(
  leaves: LeaveRequest[],
  timesheets: Timesheet[],
  attendance: AttendanceRequest[],
): ChartPoint[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    return {
      date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      Leaves: leaves.filter((l) => (l.created_at || "").slice(0, 10) === iso).length,
      Timesheets: timesheets.filter((t) => (t.submitted_at || t.created_at || "").slice(0, 10) === iso).length,
      Attendance: attendance.filter((a) => a.created_at.slice(0, 10) === iso).length,
    };
  });
}

function calcSLA(items: UnifiedItem[]) {
  const now = Date.now();
  let onTime = 0, dueSoon = 0, overdue = 0;
  for (const item of items) {
    const d = itemDate(item);
    if (!d) { onTime++; continue; }
    const hrs = (now - new Date(d).getTime()) / 3600000;
    if (hrs <= 24) onTime++;
    else if (hrs <= 48) dueSoon++;
    else overdue++;
  }
  const total = items.length;
  return { onTime, dueSoon, overdue, pct: total > 0 ? Math.round((onTime / total) * 100) : 0, total };
}

function getTypeLabel(item: UnifiedItem): string {
  if (item._kind === "leave") {
    const t = (item as LeaveRequest).type || (item as LeaveRequest).leave_type;
    return t ? formatLeaveType(t) : "Leave";
  }
  if (item._kind === "timesheet") return "Timesheet";
  return ATT_LABELS[(item as AttendanceRequest).type] || (item as AttendanceRequest).type;
}

function getSummary(item: UnifiedItem): string {
  if (item._kind === "leave") {
    const l = item as LeaveRequest;
    return `${mgfmtDate(l.from_date)} → ${mgfmtDate(l.to_date)} (${l.days ?? "?"} days)`;
  }
  if (item._kind === "timesheet") {
    const t = item as Timesheet;
    return `${mgfmtDate(t.week_start)} – ${mgfmtDate(t.week_end)} · ${t.total_hours ?? "?"}h`;
  }
  const a = item as AttendanceRequest;
  return `${mgfmtDate(a.date)} · ${ATT_LABELS[a.type] || a.type}`;
}

const formatLeaveType = (type: string): string => {
  const map: Record<string, string> = {
    'sick': 'Sick Leave',
    'earned': 'Earned Leave',
    'casual': 'Casual Leave',
    'maternity': 'Maternity Leave',
    'lop': 'Loss of Pay',
    'SL': 'Sick Leave',
    'EL': 'Earned Leave',
  };
  return map[type] || type;
};

function historyStatusBadge(status: string): string {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-red-100 text-red-600";
  return "bg-slate-100 text-slate-600";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ManagerApprovals() {
  // Pending data state
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState<Timesheet[]>([]);
  const [pendingAttendance, setPendingAttendance] = useState<AttendanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [detailModal, setDetailModal] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected">("approved");
  const [reviewNote, setReviewNote] = useState("");
  const [toast, setToast] = useState<{ msg: string; error: boolean } | null>(null);

  // Approval History — separate state/effect, not mixed with pending
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTypeFilter, setHistoryTypeFilter] = useState("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => { setHistoryPage(1); }, [historyTypeFilter, historyStatusFilter]);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    try {
      const [leaves, timesheets, attendance] = await Promise.all([
        getPendingApprovals().catch(() => []),
        timesheetAPI.getPending().catch(() => []),
        attendanceAPI.getRequests().catch(() => []),
      ]);
      setPendingLeaves(Array.isArray(leaves) ? leaves : []);
      setPendingTimesheets(Array.isArray(timesheets) ? timesheets : []);
      const allAtt = Array.isArray(attendance) ? (attendance as AttendanceRequest[]) : [];
      setPendingAttendance(allAtt.filter((r) => r.status === "pending"));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const [teamLeaves, myTimesheets] = await Promise.all([
        getTeamLeaveHistory().catch(() => []),
        timesheetAPI.getMy().catch(() => []),
      ]);
      const hl = (Array.isArray(teamLeaves) ? teamLeaves : []) as LeaveRequest[];
      const ht = (Array.isArray(myTimesheets) ? myTimesheets : []) as Timesheet[];

      const leaveEntries: HistoryEntry[] = hl.map((l) => ({
          id: l.id,
          name: l.employee_name || (l.employees?.first_name ? `${l.employees.first_name} ${l.employees.last_name}` : l.employees?.name) || "—",
          department: l.employees?.department || l.department || "—",
          requestType: formatLeaveType(l.type || l.leave_type || "") || "Leave",
          details: `${mgfmtDate(l.from_date)} – ${mgfmtDate(l.to_date)} (${l.days ?? "?"} days)`,
          submittedOn: l.created_at || "",
          reviewedOn: l.updated_at || l.reviewed_at || "",
          status: l.status,
          rawDate: l.updated_at || l.created_at || "",
          kind: "leave" as const,
        }));

      const tsEntries: HistoryEntry[] = ht
        .filter((t) => t.status !== "pending" && t.status !== "draft")
        .map((t) => ({
          id: t.id,
          name: t.employees?.name || "—",
          department: t.employees?.department || "—",
          requestType: "Timesheet",
          details: `${mgfmtDate(t.week_start)} – ${mgfmtDate(t.week_end)} · ${t.total_hours ?? "?"}h`,
          submittedOn: t.submitted_at || t.created_at || "",
          reviewedOn: t.reviewed_at || "",
          status: t.status,
          rawDate: t.submitted_at || t.created_at || "",
          kind: "timesheet" as const,
        }));

      setHistoryData(
        [...leaveEntries, ...tsEntries].sort((a, b) => b.rawDate.localeCompare(a.rawDate))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const showToast = (msg: string, error = false) => setToast({ msg, error });
  const changeTab = (tab: ActiveTab) => { setActiveTab(tab); setCurrentPage(1); };
  const handleSearch = (q: string) => { setSearchQuery(q); setCurrentPage(1); };

  // ── Derived — pending ────────────────────────────────────────────────────────

  const totalPending = pendingLeaves.length + pendingTimesheets.length + pendingAttendance.length;

  const unifiedAll = useMemo<UnifiedItem[]>(() => {
    const l: UnifiedItem[] = pendingLeaves.map((x) => ({ ...x, _kind: "leave" as const }));
    const t: UnifiedItem[] = pendingTimesheets.map((x) => ({ ...x, _kind: "timesheet" as const }));
    const a: UnifiedItem[] = pendingAttendance.map((x) => ({ ...x, _kind: "attendance" as const }));
    return [...l, ...t, ...a].sort((a, b) => itemDate(b).localeCompare(itemDate(a)));
  }, [pendingLeaves, pendingTimesheets, pendingAttendance]);

  const tabRows = useMemo<UnifiedItem[]>(() => {
    const base =
      activeTab === "all" ? unifiedAll
      : activeTab === "leaves" ? unifiedAll.filter((i) => i._kind === "leave")
      : activeTab === "timesheets" ? unifiedAll.filter((i) => i._kind === "timesheet")
      : unifiedAll.filter((i) => i._kind === "attendance");
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter((item) => {
      const name = (item.employees?.name || "").toLowerCase();
      const dept = (item.employees?.department || "").toLowerCase();
      const typeStr = getTypeLabel(item).toLowerCase();
      return name.includes(q) || dept.includes(q) || typeStr.includes(q);
    });
  }, [unifiedAll, activeTab, searchQuery]);

  const totalPages = Math.ceil(tabRows.length / ROWS_PER_PAGE);
  const pagedRows = tabRows.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
  const colCount = activeTab === "leaves" ? 8 : 5;

  const chartData = useMemo(
    () => buildChartData(pendingLeaves, pendingTimesheets, pendingAttendance),
    [pendingLeaves, pendingTimesheets, pendingAttendance],
  );

  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of unifiedAll) {
      const dept = item.employees?.department || "Unknown";
      counts[dept] = (counts[dept] || 0) + 1;
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = entries[0]?.[1] || 1;
    return entries.map(([dept, count]) => ({ dept, count, pct: Math.round((count / max) * 100) }));
  }, [unifiedAll]);

  const sla = useMemo(() => calcSLA(unifiedAll), [unifiedAll]);
  const leaveSharePct = totalPending > 0 ? Math.round((pendingLeaves.length / totalPending) * 100) : 0;

  // page window for pending table
  const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const endPage = Math.min(totalPages, startPage + 4);
  const pageNums = Array.from({ length: Math.max(0, endPage - startPage + 1) }, (_, i) => startPage + i);

  // ── Derived — history ────────────────────────────────────────────────────────

  const filteredHistory = useMemo(() => {
    return historyData.filter((item) => {
      const typeOk = historyTypeFilter === "all" || item.kind === historyTypeFilter;
      const statusOk = historyStatusFilter === "all" || item.status === historyStatusFilter;
      return typeOk && statusOk;
    });
  }, [historyData, historyTypeFilter, historyStatusFilter]);

  const totalHistoryPages = Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE);
  const paginatedHistory = filteredHistory.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE,
  );

  // page window for history table
  const hStart = Math.max(1, Math.min(historyPage - 2, totalHistoryPages - 4));
  const hEnd = Math.min(totalHistoryPages, hStart + 4);
  const historyPageNums = Array.from({ length: Math.max(0, hEnd - hStart + 1) }, (_, i) => hStart + i);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleDirectApprove = async (item: UnifiedItem) => {
    setActionLoading(item.id);
    try {
      if (item._kind === "leave") {
        await approveLeave(item.id);
        setPendingLeaves((prev) => prev.filter((l) => l.id !== item.id));
      } else if (item._kind === "timesheet") {
        await timesheetAPI.review(item.id, "approved", "");
        setPendingTimesheets((prev) => prev.filter((t) => t.id !== item.id));
      } else {
        await attendanceAPI.reviewRequest(item.id, "approved", undefined);
        setPendingAttendance((prev) => prev.filter((a) => a.id !== item.id));
      }
      showToast("Request approved successfully");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to approve", true);
    } finally {
      setActionLoading("");
    }
  };

  const openReject = (item: UnifiedItem) => {
    setSelectedItem(item);
    setReviewStatus("rejected");
    setReviewNote("");
    setReviewModal(true);
  };

  const openDetail = (item: UnifiedItem) => {
    setSelectedItem(item);
    setDetailModal(true);
  };

  const openReviewFromDetail = (status: "approved" | "rejected") => {
    setDetailModal(false);
    setReviewStatus(status);
    setReviewNote("");
    setReviewModal(true);
  };

  const handleReview = async () => {
    if (!selectedItem) return;
    setActionLoading(selectedItem.id);
    try {
      if (selectedItem._kind === "leave") {
        if (reviewStatus === "approved") {
          await approveLeave(selectedItem.id);
        } else {
          await rejectLeave(selectedItem.id, reviewNote);
        }
        setPendingLeaves((prev) => prev.filter((l) => l.id !== selectedItem.id));
      } else if (selectedItem._kind === "timesheet") {
        await timesheetAPI.review(selectedItem.id, reviewStatus, reviewNote);
        setPendingTimesheets((prev) => prev.filter((t) => t.id !== selectedItem.id));
      } else {
        await attendanceAPI.reviewRequest(selectedItem.id, reviewStatus, reviewNote || undefined);
        setPendingAttendance((prev) => prev.filter((a) => a.id !== selectedItem.id));
      }
      showToast(`Request ${reviewStatus} successfully`);
      setReviewModal(false);
      setSelectedItem(null);
      setReviewNote("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to review", true);
    } finally {
      setActionLoading("");
    }
  };

  // ── Stat card config ─────────────────────────────────────────────────────────

  const statCards: { key: ActiveTab; label: string; value: number; hint: string; Icon: typeof UsersRound; t: Tone }[] = [
    { key: "all", label: "Total Pending", value: totalPending, hint: "All Categories", Icon: UsersRound, t: "purple" },
    { key: "leaves", label: "Leave Requests", value: pendingLeaves.length, hint: "Requires Action", Icon: CalendarDays, t: "amber" },
    { key: "timesheets", label: "Timesheets", value: pendingTimesheets.length, hint: "Requires Action", Icon: CheckCircle2, t: "green" },
    { key: "attendance", label: "Attendance", value: pendingAttendance.length, hint: "Requires Action", Icon: Clock3, t: "red" },
  ];

  const barColors = [tone.green.bar, tone.blue.bar, tone.amber.bar, tone.red.bar, tone.purple.bar, tone.slate.bar];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <ManagerFrame
      title="Approvals"
      subtitle="Review and take action on pending requests"
      actions={<Button disabled title="Coming soon"><Filter className="h-4 w-4" />Filters</Button>}
    >
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-2 text-sm font-bold text-white shadow-lg ${toast.error ? "bg-red-600" : "bg-slate-950"}`}>
          {toast.msg}
        </div>
      )}

      <div className="space-y-4">

        {/* ── Row 1: Stat Cards ─────────────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {statCards.map(({ key, label, value, hint, Icon, t }) => (
            <button
              key={key}
              onClick={() => changeTab(key)}
              className={`rounded-lg text-left outline-none transition-all ${activeTab === key ? "ring-2 ring-blue-500" : "ring-0 hover:ring-1 hover:ring-slate-300"}`}
            >
              <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <span className={`grid h-14 w-14 place-items-center rounded-full ${tone[t].soft} ${tone[t].text}`}>
                    <Icon className="h-7 w-7" />
                  </span>
                  {activeTab === key && (
                    <span className="text-[10px] font-bold text-blue-600">← Viewing</span>
                  )}
                </div>
                <p className="mt-2 text-xs font-bold text-slate-600">{label}</p>
                <p className="text-3xl font-bold leading-tight text-slate-950">{loading ? "—" : String(value)}</p>
                <p className="mt-1 text-[11px] font-semibold text-blue-600">{hint}</p>
              </article>
            </button>
          ))}

          {/* Expenses — coming soon */}
          <div className="relative">
            <span className="absolute right-2 top-2 z-10 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">Coming Soon</span>
            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <span className={`grid h-14 w-14 place-items-center rounded-full ${tone.slate.soft} ${tone.slate.text}`}>
                  <CircleDollarSign className="h-7 w-7" />
                </span>
              </div>
              <p className="mt-2 text-xs font-bold text-slate-600">Expenses</p>
              <p className="text-3xl font-bold leading-tight text-slate-950">0</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-400">Coming soon</p>
            </article>
          </div>
        </div>

        {/* ── Row 2: Full-width Approvals Table ────────────────────────── */}
        <Panel>
          {/* Tab bar */}
          <div className="flex gap-8 overflow-x-auto border-b border-slate-100 px-5 text-sm font-bold text-slate-600">
            {(
              [
                { key: "all" as ActiveTab, label: "All Requests", count: totalPending },
                { key: "leaves" as ActiveTab, label: "Leave Requests", count: pendingLeaves.length },
                { key: "timesheets" as ActiveTab, label: "Timesheets", count: pendingTimesheets.length },
                { key: "attendance" as ActiveTab, label: "Attendance", count: pendingAttendance.length },
              ] as const
            ).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => changeTab(key)}
                className={`shrink-0 border-b-2 py-4 ${activeTab === key ? "border-blue-600 text-blue-600" : "border-transparent"}`}
              >
                {label}{" "}
                <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="border-b border-slate-100 px-5 py-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by name, department, type..."
                className="h-9 w-full rounded-md border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                {activeTab === "all" && (
                  <tr>{["Employee", "Kind", "Details", "Submitted On", "Actions"].map((h) => <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
                )}
                {activeTab === "leaves" && (
                  <tr>{["Employee", "Leave Type", "From", "To", "Days", "Reason", "Applied On", "Actions"].map((h) => <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
                )}
                {activeTab === "timesheets" && (
                  <tr>{["Employee", "Week", "Total Hours", "Submitted On", "Actions"].map((h) => <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
                )}
                {activeTab === "attendance" && (
                  <tr>{["Employee", "Request Type", "Date", "Reason", "Actions"].map((h) => <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: colCount }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-10 text-center text-slate-500">
                      {searchQuery ? "No results match your search" : "No pending requests"}
                    </td>
                  </tr>
                ) : pagedRows.map((item) => {
                  const name = item.employees?.name || "—";
                  const dept = item.employees?.department || "—";
                  const busy = actionLoading === item.id;
                  const avatarCell = (
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Avatar name={name !== "—" ? name : "?"} />
                        <div>
                          <p className="font-bold">{name}</p>
                          <p className="text-[11px] text-slate-500">{dept}</p>
                        </div>
                      </div>
                    </td>
                  );
                  const actionCell = (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleDirectApprove(item)} disabled={busy} title="Approve" className="text-green-600 hover:text-green-700 disabled:opacity-50"><Check className="h-4 w-4" /></button>
                        <button onClick={() => openReject(item)} disabled={busy} title="Reject" className="text-red-600 hover:text-red-700 disabled:opacity-50"><X className="h-4 w-4" /></button>
                        <button onClick={() => openDetail(item)} title="View" className="text-blue-600 hover:text-blue-700"><Eye className="h-4 w-4" /></button>
                      </div>
                    </td>
                  );

                  if (activeTab === "all") {
                    return (
                      <tr key={item.id}>
                        {avatarCell}
                        <td className="px-4 py-3"><StatusPill value={getTypeLabel(item)} /></td>
                        <td className="px-4 py-3 text-slate-600">{getSummary(item)}</td>
                        <td className="px-4 py-3">{mgfmtDate(itemDate(item))}</td>
                        {actionCell}
                      </tr>
                    );
                  }
                  if (item._kind === "leave") {
                    const l = item as LeaveRequest & { _kind: "leave" };
                    return (
                      <tr key={item.id}>
                        {avatarCell}
                        <td className="px-4 py-3"><StatusPill value={formatLeaveType(l.type || l.leave_type || "")} /></td>
                        <td className="px-4 py-3">{mgfmtDate(l.from_date)}</td>
                        <td className="px-4 py-3">{mgfmtDate(l.to_date)}</td>
                        <td className="px-4 py-3">{l.days ?? "—"}</td>
                        <td className="px-4 py-3 max-w-xs truncate text-slate-600">{l.reason || "—"}</td>
                        <td className="px-4 py-3">{mgfmtDate(l.created_at)}</td>
                        {actionCell}
                      </tr>
                    );
                  }
                  if (item._kind === "timesheet") {
                    const ts = item as Timesheet & { _kind: "timesheet" };
                    return (
                      <tr key={item.id}>
                        {avatarCell}
                        <td className="px-4 py-3">{mgfmtDate(ts.week_start)} – {mgfmtDate(ts.week_end)}</td>
                        <td className="px-4 py-3 font-bold">{ts.total_hours ?? "—"}h</td>
                        <td className="px-4 py-3">{mgfmtDate(ts.submitted_at)}</td>
                        {actionCell}
                      </tr>
                    );
                  }
                  const att = item as AttendanceRequest & { _kind: "attendance" };
                  return (
                    <tr key={item.id}>
                      {avatarCell}
                      <td className="px-4 py-3"><StatusPill value={ATT_LABELS[att.type] || att.type} /></td>
                      <td className="px-4 py-3">{mgfmtDate(att.date)}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-600">{att.reason}</td>
                      {actionCell}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 text-xs text-slate-500">
            <span>
              {tabRows.length === 0
                ? "No requests"
                : `Showing ${Math.min((currentPage - 1) * ROWS_PER_PAGE + 1, tabRows.length)}–${Math.min(currentPage * ROWS_PER_PAGE, tabRows.length)} of ${tabRows.length} requests`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
              >
                Prev
              </button>
              {pageNums.map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`grid h-8 w-8 place-items-center rounded-md font-bold ${p === currentPage ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        </Panel>

        {/* ── Row 3: Approval Summary + Requests Over Time ─────────────── */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Approval Summary">
            <div className="flex items-center justify-center gap-5 p-5">
              <Donut label={loading ? "—" : String(totalPending)} sub="Total Pending" value={leaveSharePct} />
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-3 w-40 animate-pulse rounded bg-slate-100" />)}
                </div>
              ) : (
                <Legend rows={[
                  `Leave ${pendingLeaves.length} (${totalPending > 0 ? Math.round((pendingLeaves.length / totalPending) * 100) : 0}%)`,
                  `Timesheets ${pendingTimesheets.length} (${totalPending > 0 ? Math.round((pendingTimesheets.length / totalPending) * 100) : 0}%)`,
                  `Attendance ${pendingAttendance.length} (${totalPending > 0 ? Math.round((pendingAttendance.length / totalPending) * 100) : 0}%)`,
                  "Expenses 0 (Coming soon)",
                ]} />
              )}
            </div>
          </Panel>

          <Panel title="Requests Over Time">
            {loading ? (
              <div className="h-48 animate-pulse rounded bg-slate-100 m-5" />
            ) : (
              <div className="p-5">
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <RechartsTooltip contentStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Leaves" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Timesheets" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Attendance" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-2 flex gap-4 text-[11px] font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-amber-400" />Leaves</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-emerald-500" />Timesheets</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-blue-500" />Attendance</span>
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* ── Row 4: Pending by Dept + SLA Status ──────────────────────── */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Pending by Department">
            {loading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-4 animate-pulse rounded bg-slate-100" />)}
              </div>
            ) : deptCounts.length === 0 ? (
              <p className="px-5 py-6 text-xs text-slate-500">No pending requests</p>
            ) : (
              <div className="space-y-3 p-5">
                {deptCounts.map(({ dept, count, pct }, idx) => (
                  <div key={dept}>
                    <div className="mb-1 flex justify-between text-xs font-bold">
                      <span>{dept}</span>
                      <span className="text-slate-500">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${barColors[idx % barColors.length]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="SLA Status">
            {loading ? (
              <div className="flex items-center justify-center p-5">
                <div className="h-36 w-36 animate-pulse rounded-full bg-slate-100" />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-5 p-5">
                <Donut label={`${sla.pct}%`} sub="On Time" value={sla.pct} />
                <Legend rows={[
                  `On Time ${sla.onTime} (${sla.pct}%)`,
                  `Due Soon ${sla.dueSoon} (${sla.total > 0 ? Math.round((sla.dueSoon / sla.total) * 100) : 0}%)`,
                  `Overdue ${sla.overdue} (${sla.total > 0 ? Math.round((sla.overdue / sla.total) * 100) : 0}%)`,
                ]} />
              </div>
            )}
          </Panel>
        </div>

        {/* ── Row 5: Approval History Table (full-width) ───────────────── */}
        <section className="overflow-hidden rounded-[9px] border border-[#dce5f2] bg-white shadow-[0_10px_32px_rgba(17,43,90,0.05)] p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-extrabold text-[#071334]">Approval History</h2>
            <div className="flex gap-3">
              <select
                value={historyTypeFilter}
                onChange={(e) => setHistoryTypeFilter(e.target.value)}
                className="h-9 rounded-[6px] border border-[#dce5f2] px-3 text-[12px] font-bold text-[#071334] outline-none"
              >
                <option value="all">All Types</option>
                <option value="leave">Leaves</option>
                <option value="timesheet">Timesheets</option>
              </select>
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="h-9 rounded-[6px] border border-[#dce5f2] px-3 text-[12px] font-bold text-[#071334] outline-none"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <table className="w-full border-collapse text-left text-[12px]">
            <thead className="bg-[#f3f6fb] text-[#071334]">
              <tr>
                {["Employee", "Department", "Request Type", "Details", "Submitted On", "Reviewed On", "Status"].map((h) => (
                  <th key={h} className="px-3 py-3 font-extrabold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8eef7]">
              {historyLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-[13px] font-medium text-[#4d587b]">
                    No review history yet.
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={item.name !== "—" ? item.name : "?"} />
                        <span className="font-bold text-[#071334]">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-medium text-[#4d587b]">{item.department}</td>
                    <td className="px-3 py-3 font-medium">{item.requestType}</td>
                    <td className="px-3 py-3 font-medium text-[#4d587b]">{item.details}</td>
                    <td className="px-3 py-3 font-medium">
                      {item.submittedOn
                        ? new Date(item.submittedOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-3 py-3 font-medium">
                      {item.reviewedOn
                        ? new Date(item.reviewedOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${historyStatusBadge(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {filteredHistory.length > 0 && (
            <div className="mt-4 flex items-center justify-between border-t border-[#e8eef7] pt-4 text-[12px]">
              <p className="font-medium text-[#4d587b]">
                Showing {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(historyPage * HISTORY_PAGE_SIZE, filteredHistory.length)} of {filteredHistory.length} records
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setHistoryPage((p) => p - 1)}
                  disabled={historyPage === 1}
                  className="h-8 rounded-[6px] border border-[#dce5f2] px-3 font-bold text-[#071334] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                {historyPageNums.map((n) => (
                  <button
                    key={n}
                    onClick={() => setHistoryPage(n)}
                    className={`h-8 min-w-[32px] rounded-[6px] border px-2 font-bold transition-colors ${
                      n === historyPage
                        ? "border-[#0b55f4] bg-[#0b55f4] text-white"
                        : "border-[#dce5f2] bg-white text-[#4d587b] hover:bg-slate-50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setHistoryPage((p) => p + 1)}
                  disabled={historyPage >= totalHistoryPages}
                  className="h-8 rounded-[6px] border border-[#dce5f2] px-3 font-bold text-[#071334] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

      </div>

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      {detailModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[480px] rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-slate-950">Request Details</h3>
              <button onClick={() => setDetailModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-500">Employee</p>
                  <p className="mt-1 text-sm font-bold">{selectedItem.employees?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">Department</p>
                  <p className="mt-1 text-sm">{selectedItem.employees?.department || "—"}</p>
                </div>
              </div>

              {selectedItem._kind === "leave" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500">Leave Type</p>
                      <p className="mt-1 text-sm">{formatLeaveType((selectedItem as LeaveRequest).type || (selectedItem as LeaveRequest).leave_type || "")}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">Days</p>
                      <p className="mt-1 text-sm font-bold">{(selectedItem as LeaveRequest).days ?? "—"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500">From</p>
                      <p className="mt-1 text-sm">{mgfmtDate((selectedItem as LeaveRequest).from_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">To</p>
                      <p className="mt-1 text-sm">{mgfmtDate((selectedItem as LeaveRequest).to_date)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">Reason</p>
                    <p className="mt-1 text-sm text-slate-700">{(selectedItem as LeaveRequest).reason || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">Applied On</p>
                    <p className="mt-1 text-sm">{mgfmtDate((selectedItem as LeaveRequest).created_at)}</p>
                  </div>
                </>
              )}

              {selectedItem._kind === "timesheet" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500">Week</p>
                      <p className="mt-1 text-sm">{mgfmtDate((selectedItem as Timesheet).week_start)} – {mgfmtDate((selectedItem as Timesheet).week_end)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">Total Hours</p>
                      <p className="mt-1 text-sm font-bold">{(selectedItem as Timesheet).total_hours ?? "—"}h</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">Submitted On</p>
                    <p className="mt-1 text-sm">{mgfmtDate((selectedItem as Timesheet).submitted_at)}</p>
                  </div>
                </>
              )}

              {selectedItem._kind === "attendance" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500">Request Type</p>
                      <p className="mt-1 text-sm">{ATT_LABELS[(selectedItem as AttendanceRequest).type] || (selectedItem as AttendanceRequest).type}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">Date</p>
                      <p className="mt-1 text-sm">{mgfmtDate((selectedItem as AttendanceRequest).date)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">Reason</p>
                    <p className="mt-1 text-sm text-slate-700">{(selectedItem as AttendanceRequest).reason}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">Submitted On</p>
                    <p className="mt-1 text-sm">{mgfmtDate((selectedItem as AttendanceRequest).created_at)}</p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setDetailModal(false)} className="flex-1 rounded-md border border-slate-200 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Close
              </button>
              <button onClick={() => openReviewFromDetail("rejected")} className="flex-1 rounded-md bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-700">
                Reject
              </button>
              <button onClick={() => openReviewFromDetail("approved")} className="flex-1 rounded-md bg-green-600 py-2 text-sm font-bold text-white hover:bg-green-700">
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review Modal ──────────────────────────────────────────────────── */}
      {reviewModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[420px] rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-950">
              Review{" "}
              {selectedItem._kind === "leave" ? "Leave" : selectedItem._kind === "timesheet" ? "Timesheet" : "Attendance"}{" "}
              Request
            </h3>

            {/* Approve / Reject toggle */}
            <div className="mt-4 flex rounded-lg border border-slate-200 p-1">
              <button
                onClick={() => setReviewStatus("approved")}
                className={`flex-1 rounded-md py-2 text-sm font-bold transition-colors ${reviewStatus === "approved" ? "bg-green-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                Approve
              </button>
              <button
                onClick={() => setReviewStatus("rejected")}
                className={`flex-1 rounded-md py-2 text-sm font-bold transition-colors ${reviewStatus === "rejected" ? "bg-red-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                Reject
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-600">Employee</p>
                <p className="mt-1 text-sm font-bold">{selectedItem.employees?.name || selectedItem.employee_id}</p>
              </div>

              {selectedItem._kind === "leave" && (
                <>
                  <div>
                    <p className="text-xs font-bold text-slate-600">Leave Type</p>
                    <p className="mt-1 text-sm">{formatLeaveType((selectedItem as LeaveRequest).type || (selectedItem as LeaveRequest).leave_type || "")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600">Duration</p>
                    <p className="mt-1 text-sm">
                      {mgfmtDate((selectedItem as LeaveRequest).from_date)} to {mgfmtDate((selectedItem as LeaveRequest).to_date)} ({(selectedItem as LeaveRequest).days} days)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600">Reason</p>
                    <p className="mt-1 text-sm">{(selectedItem as LeaveRequest).reason}</p>
                  </div>
                </>
              )}

              {selectedItem._kind === "timesheet" && (
                <div>
                  <p className="text-xs font-bold text-slate-600">Total Hours</p>
                  <p className="mt-1 text-sm">{(selectedItem as Timesheet).total_hours}h</p>
                </div>
              )}

              {selectedItem._kind === "attendance" && (
                <>
                  <div>
                    <p className="text-xs font-bold text-slate-600">Request Type</p>
                    <p className="mt-1 text-sm">{ATT_LABELS[(selectedItem as AttendanceRequest).type] || (selectedItem as AttendanceRequest).type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600">Date</p>
                    <p className="mt-1 text-sm">{mgfmtDate((selectedItem as AttendanceRequest).date)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600">Reason</p>
                    <p className="mt-1 text-sm">{(selectedItem as AttendanceRequest).reason}</p>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold text-slate-600">
                  Review Note{reviewStatus === "rejected" && <span className="text-red-600"> *</span>}
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={reviewStatus === "rejected" ? "Reason for rejection (required)" : "Optional note"}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setReviewModal(false); setSelectedItem(null); setReviewNote(""); }}
                className="flex-1 rounded-md border border-slate-200 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={actionLoading === selectedItem.id || (reviewStatus === "rejected" && !reviewNote.trim())}
                className={`flex-1 rounded-md py-2 text-sm font-bold text-white ${reviewStatus === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} disabled:opacity-50`}
              >
                {actionLoading === selectedItem.id ? "Processing..." : reviewStatus === "approved" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ManagerFrame>
  );
}
