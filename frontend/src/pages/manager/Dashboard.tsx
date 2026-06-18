import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  FileClock,
  Folder,
  Loader2,
  RefreshCw,
  UsersRound,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getPendingApprovals, approveLeave, rejectLeave } from "@/services/leaveApi";
import { useAuth } from "@/lib/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

type Tone = "blue" | "green" | "amber" | "red" | "purple";
type ApprovalTab = "leave" | "timesheet" | "expense" | "punch";
type AvailabilityFilter = "all" | "working" | "on_leave" | "absent";

interface EmployeeLite {
  name: string;
  department: string | null;
}

interface TeamAttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  hours_worked: number | null;
  status: string;
  employees: EmployeeLite | null;
  leave_request?: { type?: string } | null;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  type: string;
  from_date: string;
  to_date: string;
  days: number;
  reason: string;
  status: string;
  created_at: string;
  employees: EmployeeLite | null;
}

interface TimesheetRecord {
  id: string;
  employee_id: string;
  week_start: string;
  week_end: string;
  total_hours: number;
  status: string;
  submitted_at: string | null;
  employee?: EmployeeLite | null;
  employees?: EmployeeLite | null;
}

interface AttendanceRequest {
  id: string;
  employee_id: string;
  type: string;
  date: string;
  reason: string;
  status: string;
  created_at: string;
  employees: EmployeeLite | null;
}

interface ExpenseRequest {
  id: string;
  employee_id?: string;
  category?: string;
  amount?: number;
  submitted_at?: string;
  reason?: string;
  employees?: EmployeeLite | null;
}

interface ProjectStats {
  active_projects: number;
  pending_tasks: number;
  completed_tasks: number;
  upcoming_deadlines: number;
  logged_hours: number;
}

interface Project {
  id: string;
  name: string;
  status: string;
  end_date: string;
  task_count?: number;
  completed_task_count?: number;
}

interface TaskDeadline {
  id: string;
  title: string;
  due_date: string;
  source?: "project" | "task" | "milestone";
  project_id?: string;
}

const toneClasses: Record<Tone, { soft: string; text: string; bar: string; dot: string }> = {
  blue: { soft: "bg-blue-50", text: "text-blue-600", bar: "bg-blue-600", dot: "bg-blue-500" },
  green: { soft: "bg-emerald-50", text: "text-emerald-600", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  amber: { soft: "bg-amber-50", text: "text-amber-600", bar: "bg-amber-500", dot: "bg-amber-500" },
  red: { soft: "bg-red-50", text: "text-red-600", bar: "bg-red-500", dot: "bg-red-500" },
  purple: { soft: "bg-violet-50", text: "text-violet-600", bar: "bg-violet-500", dot: "bg-violet-500" },
};

const approvalTabs: Array<{ id: ApprovalTab; label: string; route: string }> = [
  { id: "leave", label: "Leave Requests", route: "/leave" },
  { id: "timesheet", label: "Timesheet Requests", route: "/timesheet" },
  { id: "expense", label: "Expense Requests", route: "/expenses" },
  { id: "punch", label: "Punch Corrections", route: "/attendance" },
];

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ") : "-";
}

function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  return new Date(`${dateStr.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtClockIn(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function statusTone(status: string): Tone {
  if (status === "present" || status === "late") return "green";
  if (status === "on_leave") return "purple";
  if (status === "absent") return "red";
  return "amber";
}

function routeForDeadline(item: TaskDeadline): string {
  if (item.source === "milestone") return "/projects/milestones";
  if (item.source === "project" || item.project_id) return "/projects";
  return "/tasks";
}

function Panel({
  title,
  action,
  onAction,
  children,
  className = "",
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${className}`}>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        {action && (
          <button onClick={onAction} className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600">
            {action}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-100 text-[11px] font-bold text-slate-800 ring-2 ring-white">
      {initials || "?"}
    </div>
  );
}

function Donut({ value, label, sub }: { value: number; label: string; sub: string }) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div
      className="grid h-36 w-36 place-items-center rounded-full"
      style={{ background: `conic-gradient(#10b981 0 ${bounded}%, #e2e8f0 ${bounded}% 100%)` }}
    >
      <div className="grid h-[64%] w-[64%] place-items-center rounded-full bg-white text-center shadow-inner">
        <div>
          <p className="text-2xl font-bold text-slate-950">{label}</p>
          <p className="text-[11px] text-slate-500">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 py-6 text-[13px] text-slate-500">
      Failed to load.
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="px-4 py-6 text-center text-xs text-slate-500">{text}</p>;
}

function StatSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between">
        <Skeleton className="h-14 w-14 rounded-full" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <Skeleton className="mt-2 h-3 w-2/3 rounded" />
      <Skeleton className="mt-1 h-8 w-1/2 rounded" />
      <Skeleton className="mt-1 h-3 w-3/4 rounded" />
    </div>
  );
}

const CAL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CAL_DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function MiniCalendar({ leaves, onNavigate }: { leaves: LeaveRequest[]; onNavigate: () => void }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year,  setYear]  = useState(today.getFullYear());

  const leaveMap = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();
    for (const leave of leaves) {
      const start = new Date(`${leave.from_date}T00:00:00`);
      const end   = new Date(`${leave.to_date}T00:00:00`);
      for (const cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
        const arr = map.get(key) ?? [];
        arr.push(leave);
        map.set(key, arr);
      }
    }
    return map;
  }, [leaves]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const cells: Array<number | null> = [
    ...Array.from<null>({ length: firstDay }).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0);  setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={prevMonth} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-bold text-slate-700">{CAL_MONTHS[month]} {year}</span>
        <button onClick={nextMonth} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px">
        {CAL_DAYS.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-bold text-slate-400">{d}</div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} className="min-h-10" />;
          const key       = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayLeaves = leaveMap.get(key) ?? [];
          const isToday   = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          return (
            <button
              key={key}
              onClick={dayLeaves.length > 0 ? onNavigate : undefined}
              className={`min-h-10 rounded p-1 text-left align-top ${isToday ? "ring-1 ring-inset ring-blue-500 bg-blue-50" : ""} ${dayLeaves.length > 0 ? "hover:bg-violet-50 cursor-pointer" : "cursor-default"}`}
            >
              <span className={`block text-[10px] font-bold leading-tight ${isToday ? "text-blue-600" : "text-slate-700"}`}>{day}</span>
              {dayLeaves.slice(0, 2).map((leave) => {
                const name     = leave.employees?.name ?? "";
                const initials = name.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
                return (
                  <span key={leave.id} title={name} className="mt-0.5 block truncate rounded bg-violet-100 px-0.5 text-[9px] font-semibold leading-tight text-violet-700">
                    {initials}
                  </span>
                );
              })}
              {dayLeaves.length > 2 && <span className="text-[9px] text-slate-400">+{dayLeaves.length - 2}</span>}
            </button>
          );
        })}
      </div>
      {leaves.length === 0 && (
        <p className="mt-3 text-center text-[11px] text-slate-400">No pending leaves this month</p>
      )}
    </div>
  );
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [teamAttendance, setTeamAttendance] = useState<TeamAttendanceRecord[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState<TimesheetRecord[]>([]);
  const [pendingPunchCorrections, setPendingPunchCorrections] = useState<AttendanceRequest[]>([]);
  const pendingExpenses: ExpenseRequest[] = [];
  const expenseUnavailable = true;
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [projectsData, setProjectsData] = useState<Project[]>([]);
  const [taskDeadlines, setTaskDeadlines] = useState<TaskDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [activeApprovalTab, setActiveApprovalTab] = useState<ApprovalTab>("leave");
  const [teamFilter, setTeamFilter] = useState<AvailabilityFilter>("all");
  const [details, setDetails] = useState<{ title: string; rows: Array<[string, string]> } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refetch = () => setRefreshTick((tick) => tick + 1);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      const results = await Promise.allSettled([
        apiFetch("/attendance/team"),              // 0
        getPendingApprovals(),                      // 1 — services/leaveApi (v1 endpoint)
        apiFetch("/timesheets/pending"),            // 2
        apiFetch("/attendance/requests?scope=team"), // 3
        apiFetch("/projects/stats"),               // 4
        apiFetch("/projects"),                     // 5
        apiFetch("/tasks/deadlines"),              // 6
      ]);

      if (cancelled) return;

      const failures = results.filter((result) => result.status === "rejected");
      if (failures.length > 0) {
        setError("Some dashboard data failed to load.");
      }

      const value = <T,>(index: number, fallback: T): T =>
        results[index].status === "fulfilled" ? (results[index].value as T) : fallback;

      setTeamAttendance(Array.isArray(value(0, [])) ? value(0, []) : []);
      setPendingLeaves(Array.isArray(value(1, [])) ? value(1, []) : []);
      setPendingTimesheets(Array.isArray(value(2, [])) ? value(2, []) : []);
      setPendingPunchCorrections(Array.isArray(value(3, [])) ? value(3, []) : []);
      setProjectStats(value(4, null));
      setProjectsData(Array.isArray(value(5, [])) ? value(5, []) : []);
      setTaskDeadlines(Array.isArray(value(6, [])) ? value(6, []) : []);
      setLoading(false);
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const totalTeam = teamAttendance.length;
  const workingCount = teamAttendance.filter((row) => row.status === "present" || row.status === "late").length;
  const lateCount = teamAttendance.filter((row) => row.status === "late").length;
  const onLeaveCount = teamAttendance.filter((row) => row.status === "on_leave").length;
  const absentCount = teamAttendance.filter((row) => row.status === "absent").length;
  const pendingApprovals = pendingLeaves.length + pendingTimesheets.length + pendingPunchCorrections.length;
  const attendancePercentage = totalTeam > 0 ? Math.round((workingCount / totalTeam) * 100) : 0;
  const taskOverviewTotal = (projectStats?.pending_tasks ?? 0) + (projectStats?.completed_tasks ?? 0);
  const completedTaskPercentage = taskOverviewTotal > 0 ? Math.round(((projectStats?.completed_tasks ?? 0) / taskOverviewTotal) * 100) : 0;

  const filteredTeam = useMemo(() => {
    return teamAttendance.filter((row) => {
      if (teamFilter === "working") return row.status === "present" || row.status === "late";
      if (teamFilter === "on_leave") return row.status === "on_leave";
      if (teamFilter === "absent") return row.status === "absent";
      return true;
    });
  }, [teamAttendance, teamFilter]);

  const stats = [
    {
      label: "Team Members",
      value: String(totalTeam),
      detail: `${workingCount} Working / ${onLeaveCount} On Leave / ${absentCount} Absent`,
      icon: UsersRound,
      tone: "purple" as Tone,
      route: "/team",
    },
    {
      label: "Pending Approvals",
      value: String(pendingApprovals),
      detail: `${pendingLeaves.length} Leave / ${pendingTimesheets.length} Timesheet / ${pendingPunchCorrections.length} Punch`,
      icon: CheckCircle2,
      tone: "amber" as Tone,
      route: "/approvals",
    },
    {
      label: "Active Projects",
      value: String(projectStats?.active_projects ?? 0),
      detail: `${projectStats?.upcoming_deadlines ?? 0} upcoming deadlines`,
      icon: Folder,
      tone: "blue" as Tone,
      route: "/projects",
    },
    {
      label: "Pending Tasks",
      value: String(projectStats?.pending_tasks ?? 0),
      detail: `${projectStats?.completed_tasks ?? 0} completed`,
      icon: BarChart3,
      tone: "green" as Tone,
      route: "/tasks",
    },
    {
      label: "Team Attendance",
      value: `${attendancePercentage}%`,
      detail: `${lateCount} late arrivals today`,
      icon: Clock3,
      tone: "red" as Tone,
      route: "/attendance",
    },
    {
      label: "Due This Week",
      value: String(projectStats?.upcoming_deadlines ?? taskDeadlines.length),
      detail: "Projects, tasks, milestones",
      icon: CalendarDays,
      tone: "amber" as Tone,
      route: "/calendar",
    },
  ];

  const activeApprovals =
    activeApprovalTab === "leave"
      ? pendingLeaves
      : activeApprovalTab === "timesheet"
      ? pendingTimesheets
      : activeApprovalTab === "expense"
      ? pendingExpenses
      : pendingPunchCorrections;

  const firstName = user?.name?.split(" ")[0] ?? "Manager";

  async function reviewApproval(status: "approved" | "rejected", item: LeaveRequest | TimesheetRecord | AttendanceRequest | ExpenseRequest) {
    setReviewingId(item.id);
    try {
      if (activeApprovalTab === "leave") {
        if (status === "approved") await approveLeave(item.id);
        else await rejectLeave(item.id, "Rejected by manager");
        setPendingLeaves((rows) => rows.filter((row) => row.id !== item.id));
      } else if (activeApprovalTab === "timesheet") {
        await apiFetch(`/timesheets/${item.id}/review`, { method: "PUT", body: JSON.stringify({ status }) });
        setPendingTimesheets((rows) => rows.filter((row) => row.id !== item.id));
      } else if (activeApprovalTab === "punch") {
        await apiFetch(`/attendance/requests/${item.id}/review`, { method: "PUT", body: JSON.stringify({ status }) });
        setPendingPunchCorrections((rows) => rows.filter((row) => row.id !== item.id));
        refetch();
      }
      setToast({ msg: `Request ${status}`, ok: true });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Action failed", ok: false });
    } finally {
      setReviewingId(null);
    }
  }

  function employeeName(item: LeaveRequest | TimesheetRecord | AttendanceRequest | ExpenseRequest): string {
    if ("employee" in item && item.employee?.name) return item.employee.name;
    return item.employees?.name ?? item.employee_id ?? "-";
  }

  function employeeDepartment(item: LeaveRequest | TimesheetRecord | AttendanceRequest | ExpenseRequest): string {
    if ("employee" in item && item.employee?.department) return item.employee.department;
    return item.employees?.department ?? "-";
  }

  function openDetails(item: LeaveRequest | TimesheetRecord | AttendanceRequest | ExpenseRequest) {
    if (activeApprovalTab === "leave") {
      const leave = item as LeaveRequest;
      setDetails({
        title: "Leave Request",
        rows: [
          ["Employee", employeeName(leave)],
          ["Department", employeeDepartment(leave)],
          ["Type", capitalize(leave.type)],
          ["Dates", `${fmtDate(leave.from_date)} to ${fmtDate(leave.to_date)}`],
          ["Days", String(leave.days ?? "-")],
          ["Reason", leave.reason || "-"],
        ],
      });
    } else if (activeApprovalTab === "timesheet") {
      const timesheet = item as TimesheetRecord;
      setDetails({
        title: "Timesheet Request",
        rows: [
          ["Employee", employeeName(timesheet)],
          ["Department", employeeDepartment(timesheet)],
          ["Week", `${fmtDate(timesheet.week_start)} to ${fmtDate(timesheet.week_end)}`],
          ["Total Hours", `${timesheet.total_hours ?? 0}h`],
          ["Submitted", fmtDate(timesheet.submitted_at)],
        ],
      });
    } else if (activeApprovalTab === "punch") {
      const punch = item as AttendanceRequest;
      setDetails({
        title: "Punch Correction",
        rows: [
          ["Employee", employeeName(punch)],
          ["Department", employeeDepartment(punch)],
          ["Type", capitalize(punch.type)],
          ["Date", fmtDate(punch.date)],
          ["Reason", punch.reason || "-"],
        ],
      });
    } else {
      const expense = item as ExpenseRequest;
      setDetails({
        title: "Expense Request",
        rows: [
          ["Employee", employeeName(expense)],
          ["Category", expense.category ?? "-"],
          ["Amount", expense.amount === undefined ? "-" : String(expense.amount)],
          ["Submitted", fmtDate(expense.submitted_at)],
          ["Reason", expense.reason ?? "-"],
        ],
      });
    }
  }

  function renderApprovalRow(item: LeaveRequest | TimesheetRecord | AttendanceRequest | ExpenseRequest) {
    const isActing = reviewingId === item.id;
    let type = "-";
    let dates = "-";
    let detail = "-";

    if (activeApprovalTab === "leave") {
      const leave = item as LeaveRequest;
      type = capitalize(leave.type);
      dates = leave.from_date === leave.to_date ? fmtDate(leave.from_date) : `${fmtDate(leave.from_date)} to ${fmtDate(leave.to_date)}`;
      detail = leave.reason || "-";
    } else if (activeApprovalTab === "timesheet") {
      const timesheet = item as TimesheetRecord;
      type = "Timesheet";
      dates = `${fmtDate(timesheet.week_start)} to ${fmtDate(timesheet.week_end)}`;
      detail = `${timesheet.total_hours ?? 0}h`;
    } else if (activeApprovalTab === "punch") {
      const punch = item as AttendanceRequest;
      type = capitalize(punch.type);
      dates = fmtDate(punch.date);
      detail = punch.reason || "-";
    } else {
      const expense = item as ExpenseRequest;
      type = expense.category ?? "Expense";
      dates = fmtDate(expense.submitted_at);
      detail = expense.amount === undefined ? expense.reason ?? "-" : String(expense.amount);
    }

    return (
      <div key={item.id} className="grid grid-cols-[1.25fr_0.8fr_1fr_1.1fr_0.8fr] items-center border-t border-slate-100 px-4 py-3 text-xs text-slate-700">
        <span className="min-w-0 font-semibold">
          <span className="block truncate">{employeeName(item)}</span>
          <span className="block truncate text-[11px] font-normal text-slate-500">{employeeDepartment(item)}</span>
        </span>
        <span>{type}</span>
        <span>{dates}</span>
        <span className="truncate" title={detail}>
          {detail}
        </span>
        <span className="flex gap-2">
          <button
            disabled={isActing}
            onClick={() => reviewApproval("approved", item)}
            className="grid h-7 w-7 place-items-center rounded bg-emerald-50 text-emerald-600 disabled:opacity-50"
            title="Approve"
          >
            {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
          <button
            disabled={isActing}
            onClick={() => reviewApproval("rejected", item)}
            className="grid h-7 w-7 place-items-center rounded bg-red-50 text-red-600 disabled:opacity-50"
            title="Reject"
          >
            <X className="h-4 w-4" />
          </button>
          <button onClick={() => openDetails(item)} className="grid h-7 w-7 place-items-center rounded bg-blue-50 text-blue-600" title="View Details">
            <Eye className="h-4 w-4" />
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f8fbff] px-5 py-5 text-slate-900 lg:px-7">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all ${toast.ok ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}
      <div className="mb-5">
        <h1 className="text-[1.65rem] font-bold leading-tight tracking-normal text-slate-950">Good Morning, {firstName}!</h1>
        <p className="mt-1 text-sm text-slate-500">Here is what needs your attention across the team today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => <StatSkeleton key={index} />)
          : stats.map((stat) => {
              const Icon = stat.icon;
              const tone = toneClasses[stat.tone];
              return (
                <article
                  key={stat.label}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                  onClick={() => navigate(stat.route)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`grid h-14 w-14 place-items-center rounded-full ${tone.soft} ${tone.text}`}>
                      <Icon className="h-7 w-7" />
                    </span>
                    <ChevronRight className="h-5 w-5 text-blue-700" />
                  </div>
                  <p className="mt-3 text-[11px] font-semibold uppercase text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{stat.value}</p>
                  <p className="mt-1 truncate text-[11px] text-slate-500">{stat.detail}</p>
                </article>
              );
            })}
      </div>

      {error && <div className="mt-4"><SectionError onRetry={refetch} /></div>}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Team Availability" action="Open Attendance" onAction={() => navigate("/attendance")}>
          <div className="px-5 pb-4">
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12 w-full rounded-md" />)}</div>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  {[
                    ["all", `All (${totalTeam})`],
                    ["working", `Working (${workingCount})`],
                    ["on_leave", `On Leave (${onLeaveCount})`],
                    ["absent", `Absent (${absentCount})`],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setTeamFilter(id as AvailabilityFilter)}
                      className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                        teamFilter === id ? "border-blue-600 text-blue-700" : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="overflow-hidden rounded-md border border-slate-100">
                  {filteredTeam.length === 0 ? (
                    <EmptyState text="No team members match this availability filter." />
                  ) : (
                    filteredTeam.map((member) => {
                      const tone = toneClasses[statusTone(member.status)];
                      const name = member.employees?.name ?? "Unknown";
                      return (
                        <button
                          key={member.id}
                          onClick={() => navigate(`/team?employee=${member.employee_id}`)}
                          className="grid w-full grid-cols-[1.5fr_0.85fr_0.85fr_0.7fr] items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-50"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <Avatar name={name} />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-900">{name}</span>
                              <span className="block truncate text-[11px] text-slate-500">{member.employees?.department ?? "-"}</span>
                            </span>
                          </span>
                          <span className={`inline-flex items-center gap-2 text-xs font-semibold ${tone.text}`}>
                            <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                            {member.status === "present" || member.status === "late" ? "Working" : capitalize(member.status)}
                          </span>
                          <span className="truncate text-xs text-slate-600">{member.status === "on_leave" ? capitalize(member.leave_request?.type ?? "leave") : fmtClockIn(member.clock_in)}</span>
                          <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel title="Approval Center" action="Open Approvals" onAction={() => navigate("/approvals")}>
          <div className="px-5 pb-4">
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12 w-full rounded-md" />)}</div>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  {approvalTabs.map((tab) => {
                    const count =
                      tab.id === "leave"
                        ? pendingLeaves.length
                        : tab.id === "timesheet"
                        ? pendingTimesheets.length
                        : tab.id === "expense"
                        ? 0
                        : pendingPunchCorrections.length;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveApprovalTab(tab.id)}
                        className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                          activeApprovalTab === tab.id ? "border-blue-600 text-blue-700" : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {tab.label} ({count})
                      </button>
                    );
                  })}
                </div>
                <div className="overflow-hidden rounded-md border border-slate-100">
                  <div className="grid grid-cols-[1.25fr_0.8fr_1fr_1.1fr_0.8fr] bg-slate-50 px-4 py-3 text-[11px] font-bold text-slate-600">
                    <span>Employee</span>
                    <span>Type</span>
                    <span>Date</span>
                    <span>Details</span>
                    <span>Actions</span>
                  </div>
                  {activeApprovals.length === 0 ? (
                    <EmptyState
                      text={
                        activeApprovalTab === "expense"
                          ? "Expense claims coming soon."
                          : `No pending ${approvalTabs.find((tab) => tab.id === activeApprovalTab)?.label.toLowerCase()}.`
                      }
                    />
                  ) : (
                    activeApprovals.map((item) => renderApprovalRow(item))
                  )}
                </div>
                <button
                  onClick={() => navigate(approvalTabs.find((tab) => tab.id === activeApprovalTab)?.route ?? "/approvals")}
                  className="mt-3 text-[11px] font-semibold text-blue-600"
                >
                  Open source module
                </button>
              </>
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_1fr_0.85fr_0.9fr]">
        <Panel title="Project Health" action="Open Projects" onAction={() => navigate("/projects")}>
          <div className="px-5 pb-4">
            {loading ? (
              <Skeleton className="h-40 w-full rounded-md" />
            ) : projectsData.length === 0 ? (
              <EmptyState text="No projects found." />
            ) : (
              <div className="overflow-hidden rounded-md border border-slate-100">
                <div className="grid grid-cols-[1.3fr_1fr_0.8fr_0.9fr] bg-slate-50 px-3 py-3 text-[11px] font-bold text-slate-500">
                  <span>Project</span>
                  <span>Progress</span>
                  <span>Status</span>
                  <span>Deadline</span>
                </div>
                {projectsData.slice(0, 5).map((project) => {
                  const progress = project.task_count ? Math.round(((project.completed_task_count ?? 0) / project.task_count) * 100) : 0;
                  const tone = project.status === "completed" ? "green" : project.status === "delayed" ? "red" : "amber";
                  return (
                    <button
                      key={project.id}
                      onClick={() => navigate("/projects")}
                      className="grid w-full grid-cols-[1.3fr_1fr_0.8fr_0.9fr] items-center px-3 py-3 text-left text-xs hover:bg-slate-50"
                    >
                      <span className="truncate font-semibold text-slate-700">{project.name}</span>
                      <span className="flex items-center gap-2">
                        <span>{progress}%</span>
                        <span className="h-1.5 flex-1 rounded-full bg-slate-100">
                          <span className={`block h-full rounded-full ${toneClasses[tone as Tone].bar}`} style={{ width: `${progress}%` }} />
                        </span>
                      </span>
                      <span className={`w-fit rounded px-2 py-1 text-[11px] font-semibold ${toneClasses[tone as Tone].soft} ${toneClasses[tone as Tone].text}`}>
                        {capitalize(project.status)}
                      </span>
                      <span className="text-slate-500">{fmtDate(project.end_date)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Task Overview" action="Open Tasks" onAction={() => navigate("/tasks")}>
          <div className="grid grid-cols-[1fr_0.85fr] items-center gap-3 px-5 pb-5">
            {loading ? (
              <Skeleton className="col-span-2 h-40 w-full rounded-md" />
            ) : (
              <>
                <div className="flex justify-center">
                  <Donut value={completedTaskPercentage} label={String(taskOverviewTotal)} sub="Tasks" />
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Pending Tasks", value: projectStats?.pending_tasks ?? 0, icon: FileClock, tone: "amber" as Tone },
                    { label: "Completed Tasks", value: projectStats?.completed_tasks ?? 0, icon: Check, tone: "green" as Tone },
                    { label: "Active Projects", value: projectStats?.active_projects ?? 0, icon: Briefcase, tone: "blue" as Tone },
                    { label: "Upcoming Deadlines", value: projectStats?.upcoming_deadlines ?? taskDeadlines.length, icon: CircleAlert, tone: "red" as Tone },
                  ].map((task) => {
                    const Icon = task.icon;
                    return (
                      <button key={task.label} onClick={() => navigate("/tasks")} className="flex w-full items-center gap-3 rounded-md border border-slate-100 p-3 text-left hover:bg-slate-50">
                        <span className={`grid h-8 w-8 place-items-center rounded-full ${toneClasses[task.tone].soft} ${toneClasses[task.tone].text}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-[11px] text-slate-500">{task.label}</span>
                          <span className="block text-lg font-bold text-slate-950">{task.value}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel title="Team Attendance" action="Open Attendance" onAction={() => navigate("/attendance")}>
          <div className="px-5 pb-5">
            {loading ? (
              <Skeleton className="h-44 w-full rounded-md" />
            ) : totalTeam === 0 ? (
              <EmptyState text="No team attendance data found." />
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <Donut value={attendancePercentage} label={`${attendancePercentage}%`} sub="Working" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: `Working ${workingCount}`, color: "bg-emerald-500" },
                    { label: `On Leave ${onLeaveCount}`, color: "bg-violet-500" },
                    { label: `Late ${lateCount}`, color: "bg-amber-500" },
                    { label: `Absent ${absentCount}`, color: "bg-red-500" },
                  ].map((item) => (
                    <button key={item.label} onClick={() => navigate("/attendance")} className="flex items-center gap-2 text-left text-slate-600">
                      <span className={`h-2 w-2 rounded-full ${item.color}`} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel title="Upcoming Deadlines" action="Open Work" onAction={() => navigate("/tasks")}>
          <div className="divide-y divide-slate-100 px-5 pb-3">
            {loading ? (
              <div className="space-y-3 pb-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-10 w-full rounded-md" />)}</div>
            ) : taskDeadlines.length === 0 ? (
              <EmptyState text="No upcoming deadlines." />
            ) : (
              taskDeadlines.slice(0, 5).map((task) => {
                const daysUntil = Math.ceil((new Date(task.due_date).getTime() - Date.now()) / 86400000);
                const tone: Tone = daysUntil < 3 ? "red" : daysUntil < 7 ? "amber" : "blue";
                return (
                  <button key={task.id} onClick={() => navigate(routeForDeadline(task))} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-slate-50">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded ${toneClasses[tone].soft} ${toneClasses[tone].text}`}>
                        <CalendarDays className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-slate-800">{task.title}</span>
                        <span className="block text-[11px] text-slate-500">{fmtDate(task.due_date)}</span>
                      </span>
                    </span>
                    <span className={`shrink-0 text-[11px] font-bold ${toneClasses[tone].text}`}>
                      {daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` : daysUntil === 0 ? "Today" : `${daysUntil} days left`}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Team Leave Calendar" action="Open Leave" onAction={() => navigate("/leave")}>
          <div className="px-5 pb-5">
            {loading ? (
              <Skeleton className="h-52 w-full rounded-md" />
            ) : (
              <MiniCalendar leaves={pendingLeaves} onNavigate={() => navigate("/leave")} />
            )}
          </div>
        </Panel>

        <Panel title="Module Health" action="View Approvals" onAction={() => navigate("/approvals")}>
          <div className="divide-y divide-slate-100 px-5 pb-3">
            {loading ? (
              <div className="space-y-3 py-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-md" />)}
              </div>
            ) : (
              ([
                { label: "Leave Requests",    count: pendingLeaves.length,           route: "/leave",       tone: "amber"  as Tone },
                { label: "Timesheet Reviews", count: pendingTimesheets.length,        route: "/timesheet",   tone: "blue"   as Tone },
                { label: "Punch Corrections", count: pendingPunchCorrections.length,  route: "/attendance",  tone: "red"    as Tone },
                { label: "Active Projects",   count: projectStats?.active_projects ?? 0, route: "/projects", tone: "blue"   as Tone },
                { label: "Pending Tasks",     count: projectStats?.pending_tasks ?? 0,   route: "/tasks",    tone: "amber"  as Tone },
                { label: "Team Present",      count: workingCount,                    route: "/attendance",  tone: "green"  as Tone },
              ] as const).map(({ label, count, route, tone }) => (
                <button
                  key={label}
                  onClick={() => navigate(route)}
                  className="flex w-full items-center justify-between py-3 text-left hover:bg-slate-50"
                >
                  <span className="text-xs font-semibold text-slate-700">{label}</span>
                  <span className={`text-sm font-bold ${toneClasses[tone].text}`}>{count}</span>
                </button>
              ))
            )}
          </div>
        </Panel>
      </div>

      {details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[460px] rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-950">{details.title}</h3>
              <button onClick={() => setDetails(null)} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 divide-y divide-slate-100 rounded-md border border-slate-100">
              {details.rows.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[0.8fr_1.2fr] gap-3 px-4 py-3 text-sm">
                  <span className="font-semibold text-slate-500">{label}</span>
                  <span className="text-slate-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
