import {
  ArrowRight,
  Bell,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  Gift,
  MoreHorizontal,
  Timer,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { notificationAPI, taskAPI, projectAPI } from "@/lib/api";
import { useAttendance } from "@/hooks/useAttendance";
import { useTasks } from "@/hooks/useTasks";
import { useLeaveBalance } from "@/hooks/useLeaveBalance";
import { useTimesheet } from "@/hooks/useTimesheet";
import { usePayslip } from "@/hooks/usePayslip";
import { CardSkeleton } from "@/components/common/CardSkeleton";
import { CardError } from "@/components/common/CardError";
import { LeaveCarousel } from "@/components/dashboard/LeaveCarousel";

// ── Types ──────────────────────────────────────────────────────────────────────

type Tone = "green" | "blue" | "orange" | "purple" | "teal" | "red" | "gray";

interface ScheduleTask {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  project_name: string;
  status: string;
  days_left: number;
}

interface ApiNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  end_date: string | null;
  description: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const toneMap: Record<Tone, string> = {
  green:  "bg-emerald-50 text-emerald-600",
  blue:   "bg-blue-50 text-blue-600",
  orange: "bg-orange-50 text-orange-500",
  purple: "bg-purple-50 text-purple-600",
  teal:   "bg-teal-50 text-teal-600",
  red:    "bg-red-50 text-red-500",
  gray:   "bg-slate-100 text-slate-500",
};

const priorityDot: Record<string, string> = {
  high:   "bg-red-500",
  medium: "bg-amber-500",
  low:    "bg-emerald-500",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getCurrentWeekDays(): { date: string; label: string }[] {
  const now = new Date();
  const dow  = now.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: d.toISOString().split("T")[0], label };
  });
}

function aggregateHoursByDate(
  breakdown: { date: string; hours: number }[],
): Record<string, number> {
  return breakdown.reduce<Record<string, number>>((acc, { date, hours }) => {
    acc[date] = (acc[date] ?? 0) + hours;
    return acc;
  }, {});
}

function fmtHours(h: number): string {
  if (h <= 0) return "0h";
  const hours = Math.floor(h);
  const mins  = Math.round((h - hours) * 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function notifIconEl(type: string, cls: string): ReactNode {
  if (type === "leave")     return <CalendarDays className={cls} />;
  if (type === "task")      return <ClipboardList className={cls} />;
  if (type === "timesheet") return <Timer className={cls} />;
  if (type === "payroll")   return <FileText className={cls} />;
  return <Bell className={cls} />;
}

function notifTone(type: string): Tone {
  if (type === "leave")     return "orange";
  if (type === "task")      return "blue";
  if (type === "timesheet") return "purple";
  if (type === "payroll")   return "teal";
  return "gray";
}

const statusBadgeClass: Record<string, string> = {
  present:  "bg-emerald-100 text-emerald-700",
  late:     "bg-orange-100 text-orange-700",
  absent:   "bg-red-100 text-red-700",
  half_day: "bg-yellow-100 text-yellow-700",
};

function getStatusBadgeClass(status: string | undefined): string {
  return statusBadgeClass[status ?? ""] ?? "bg-slate-100 text-slate-600";
}

function formatClockTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric", minute: "2-digit", hour12: true,
  }).toUpperCase();
}

function formatAttendanceDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[8px] border border-[#dbe4f2] bg-white shadow-[0_10px_30px_rgba(15,35,80,0.04)] ${className}`}>
      {children}
    </section>
  );
}

function SectionTitle({
  title,
  action = "View all",
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-[17px] font-extrabold tracking-[-0.01em] text-[#071334]">{title}</h2>
      <button
        onClick={onAction}
        className="h-8 rounded-[6px] border border-[#d7e1f0] bg-white px-4 text-[12px] font-bold text-[#061337] shadow-sm"
      >
        {action}
      </button>
    </div>
  );
}

function StatusCard({
  title, value, caption, icon, tone, children,
}: {
  title: string; value: string; caption: ReactNode;
  icon: ReactNode; tone: Tone; children?: ReactNode;
}) {
  return (
    <Panel className="min-h-[150px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold text-[#14204a]">{title}</p>
          <p className="mt-3 text-[27px] font-extrabold leading-none tracking-[-0.03em] text-[#071334]">{value}</p>
          <p className="mt-3 text-[13px] font-medium text-[#4c577b]">{caption}</p>
        </div>
        <div className={`grid h-[54px] w-[54px] shrink-0 place-items-center rounded-[10px] ${toneMap[tone]}`}>
          {icon}
        </div>
      </div>
      {children}
    </Panel>
  );
}

function Donut({
  center, label, gradient,
}: {
  center: string; label: string; gradient: string;
}) {
  return (
    <div
      className="grid h-[126px] w-[126px] shrink-0 place-items-center rounded-full"
      style={{ background: gradient }}
    >
      <div className="grid h-[82px] w-[82px] place-items-center rounded-full bg-white text-center">
        <div>
          <p className="text-[12px] font-medium text-[#4d587b]">Total</p>
          <p className="text-[26px] font-extrabold leading-none text-[#071334]">{center}</p>
          <p className="mt-1 text-[12px] font-medium text-[#4d587b]">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function EmployeeDashboard() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [showPay, setShowPay] = useState(false);

  // Schedule (tasks due today)
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleItems,   setScheduleItems]   = useState<ScheduleTask[]>([]);

  // Notifications
  const [notifsLoading, setNotifsLoading] = useState(true);
  const [notifs,        setNotifs]        = useState<ApiNotification[]>([]);

  // Projects
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [myProjects,      setMyProjects]      = useState<Project[]>([]);

  // Existing hooks
  const attendance  = useAttendance();
  const tasks       = useTasks();
  const leaveBalance = useLeaveBalance();
  const timesheet   = useTimesheet();
  const payslip     = usePayslip();

  // Fetch tasks due today
  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().split("T")[0];
    taskAPI.getDeadlines()
      .then((data) => {
        if (cancelled) return;
        const all = Array.isArray(data) ? (data as ScheduleTask[]) : [];
        setScheduleItems(all.filter((t) => t.due_date === today));
      })
      .catch(() => { if (!cancelled) setScheduleItems([]); })
      .finally(() => { if (!cancelled) setScheduleLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Fetch notifications (latest 5)
  useEffect(() => {
    let cancelled = false;
    notificationAPI.getAll()
      .then((data) => {
        if (cancelled) return;
        const all = Array.isArray(data) ? (data as ApiNotification[]) : [];
        setNotifs(all.slice(0, 5));
      })
      .catch(() => { if (!cancelled) setNotifs([]); })
      .finally(() => { if (!cancelled) setNotifsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Fetch projects
  useEffect(() => {
    let cancelled = false;
    projectAPI.getMy()
      .then((data) => {
        if (cancelled) return;
        setMyProjects(Array.isArray(data) ? (data as Project[]) : []);
      })
      .catch(() => { if (!cancelled) setMyProjects([]); })
      .finally(() => { if (!cancelled) setProjectsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleMarkNotifRead = (id: string) => {
    notificationAPI.markRead(id).catch(() => {});
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  // Task tabs
  const taskTabs = [
    { label: "All",         count: tasks.totalCount },
    { label: "Overdue",     count: tasks.overdueCount },
    { label: "In Progress", count: tasks.inProgressCount },
    { label: "Review",      count: tasks.reviewCount },
    { label: "Completed",   count: tasks.completedCount },
  ];

  // Leave summary computed values
  const lbData         = leaveBalance.data;
  const leaveAvailable = lbData ? lbData.sick.balance + lbData.earned.balance + lbData.casual.balance : 0;
  const leavePending   = lbData?.pendingRequests ?? 0;
  const leaveTaken     = lbData ? lbData.sick.used + lbData.earned.used + lbData.casual.used : 0;
  const leaveTotal     = lbData ? lbData.sick.entitled + lbData.earned.accrued + lbData.casual.entitled : 0;

  const availPct = leaveTotal > 0 ? (leaveAvailable / leaveTotal) * 100 : 0;
  const takenPct = leaveTotal > 0 ? (leaveTaken    / leaveTotal) * 100 : 0;
  const donutGradient = leaveTotal > 0
    ? `conic-gradient(#34c56b 0 ${availPct}%, #3b82f6 ${availPct}% ${availPct + takenPct}%, #c7cfdf ${availPct + takenPct}% 100%)`
    : "conic-gradient(#c7cfdf 0 100%)";

  // Weekly timesheet bar chart
  const weekDays   = getCurrentWeekDays();
  const hoursByDate = aggregateHoursByDate(timesheet.data?.dailyBreakdown ?? []);

  // Greeting
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-svh bg-[#f6f9ff] font-sans text-[#071334]">
      <div className="w-full px-9 py-6">
        <main>

          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-black">
                Good Morning, {firstName}! 👋
              </h1>
              <p className="mt-2 text-[16px] font-medium text-[#343f68]">
                Here's what's happening with your work today.
              </p>
            </div>
            <div className="mt-7 flex items-center gap-2 text-[15px] font-semibold text-[#263156]">
              <CalendarDays className="h-5 w-5" />
              <span>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
              <span className="text-[#8a93ad]">|</span>
              <span>{new Date().toLocaleDateString("en-IN", { weekday: "long" })}</span>
            </div>
          </div>

          {/* ── Top 5 stat cards ── */}
          <div className="mt-7 grid gap-5 xl:grid-cols-5">

            {/* Attendance */}
            <Panel className="min-h-[150px] border-emerald-200 p-5">
              {attendance.loading ? (
                <CardSkeleton lines={3} />
              ) : attendance.error ? (
                <CardError message={attendance.error} onRetry={attendance.refetch} />
              ) : (
                <>
                  <div className="flex gap-4">
                    <div className="grid h-[54px] w-[54px] place-items-center rounded-[10px] bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="text-[13px] font-bold">Attendance Status</p>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${getStatusBadgeClass(attendance.data?.status)}`}>
                          {capitalize(attendance.data?.status || "absent")}
                        </span>
                      </div>
                      <p className="mt-3 text-[27px] font-extrabold leading-none">
                        {formatClockTime(attendance.data?.clock_in)}
                      </p>
                      <p className="mt-3 text-[13px] font-medium text-[#4c577b]">
                        {attendance.data?.clock_in ? "Checked in" : "Not checked in"}
                      </p>
                      <p className="mt-2 text-[13px] font-medium text-[#263156]">
                        {attendance.data?.date
                          ? `Today, ${formatAttendanceDate(attendance.data.date)}`
                          : "—"}
                      </p>
                      {attendance.isClockedIn && attendance.elapsedDisplay && (
                        <p className="mt-1 text-[12px] font-medium text-emerald-600">
                          Working for {attendance.elapsedDisplay}
                        </p>
                      )}
                    </div>
                  </div>
                  {attendance.isClockedIn && (
                    <button
                      onClick={attendance.clockOut}
                      className="mt-5 mx-auto flex h-9 w-[180px] items-center justify-center rounded-[5px] border border-emerald-600 text-[13px] font-semibold text-emerald-700"
                    >
                      <span className="flex-1">Check Out</span>
                      <span className="grid h-full w-9 place-items-center bg-emerald-600 text-white">
                        <CalendarDays className="h-4 w-4" />
                      </span>
                    </button>
                  )}
                </>
              )}
            </Panel>

            {/* Tasks */}
            {tasks.loading ? (
              <Panel className="min-h-[150px] p-5"><CardSkeleton lines={4} /></Panel>
            ) : tasks.error ? (
              <Panel className="min-h-[150px] p-5"><CardError message={tasks.error} onRetry={tasks.refetch} /></Panel>
            ) : (
              <StatusCard
                title="My Tasks"
                value={String(tasks.totalCount).padStart(2, "0")}
                caption="Pending Tasks"
                icon={<ClipboardList className="h-8 w-8" />}
                tone="blue"
              >
                <p className="mt-3 text-[13px] font-bold text-[#071334]">
                  {String(tasks.overdueCount).padStart(2, "0")} <span className="text-red-600">Overdue</span>
                </p>
                <div className="mt-4 flex gap-1">
                  <span className="h-1.5 flex-[2] rounded-full bg-blue-600" />
                  <span className="h-1.5 flex-1 rounded-full bg-[#d9dee8]" />
                  <span className="h-1.5 flex-1 rounded-full bg-[#d9dee8]" />
                </div>
                <button
                  onClick={() => navigate("/tasks")}
                  className="mt-5 flex items-center gap-3 text-[14px] font-extrabold text-blue-700"
                >
                  View all tasks <ArrowRight className="h-4 w-4" />
                </button>
              </StatusCard>
            )}

            {/* Leave Balance — carousel */}
            <LeaveCarousel
              data={leaveBalance.data}
              loading={leaveBalance.loading}
              error={leaveBalance.error}
              onRetry={leaveBalance.refetch}
            />

            {/* Timesheet */}
            {timesheet.loading ? (
              <Panel className="min-h-[150px] p-5"><CardSkeleton lines={2} /></Panel>
            ) : timesheet.error ? (
              <Panel className="min-h-[150px] p-5"><CardError message={timesheet.error} onRetry={timesheet.refetch} /></Panel>
            ) : (
              <StatusCard
                title="Timesheet"
                value={timesheet.data?.totalLogged ?? "—"}
                caption="This Week"
                icon={<Timer className="h-8 w-8" />}
                tone="purple"
              >
                <p className="mt-3 text-[13px] font-bold">
                  {timesheet.data?.pendingApproval ?? "—"}{" "}
                  <span className="font-medium text-[#263156]">Pending</span>
                </p>
                <div className="mt-6 h-px bg-[#dbe3ef]" />
                <button
                  onClick={() => navigate("/timesheet")}
                  className="mt-4 flex items-center gap-3 text-[14px] font-extrabold text-blue-700"
                >
                  Log Time <ArrowRight className="h-4 w-4" />
                </button>
              </StatusCard>
            )}

            {/* Payslip */}
            {payslip.loading ? (
              <Panel className="min-h-[150px] p-5"><CardSkeleton lines={3} /></Panel>
            ) : payslip.error ? (
              <Panel className="min-h-[150px] p-5"><CardError message={payslip.error} onRetry={payslip.refetch} /></Panel>
            ) : (
              <Panel className="min-h-[150px] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-bold text-[#14204a]">
                      Latest Payslip
                      {payslip.isNew && (
                        <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-extrabold text-teal-700">
                          New
                        </span>
                      )}
                    </p>
                    <p className="mt-3 text-[27px] font-extrabold leading-none tracking-[-0.03em] text-[#071334]">
                      {payslip.data ? `${payslip.data.month} ${payslip.data.year}` : "—"}
                    </p>
                    <p className="mt-3 flex items-center gap-2 text-[13px] font-medium text-[#4c577b]">
                      Net Pay:{" "}
                      {showPay
                        ? `₹${(payslip.data?.netPay ?? 0).toLocaleString("en-IN")}`
                        : "₹••,•••"}
                      <button
                        onClick={() => setShowPay((s) => !s)}
                        className="text-[#4c577b] hover:text-[#071334]"
                        aria-label={showPay ? "Hide pay" : "Show pay"}
                      >
                        {showPay ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </p>
                  </div>
                  <div className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-[10px] bg-teal-50 text-teal-600">
                    <FileText className="h-8 w-8" />
                  </div>
                </div>
                <div className="mt-6 h-px bg-[#dbe3ef]" />
                <button
                  onClick={() => navigate("/my/payslips")}
                  className="mt-4 flex items-center gap-3 text-[14px] font-extrabold text-blue-700"
                >
                  View All Payslips <ArrowRight className="h-4 w-4" />
                </button>
              </Panel>
            )}
          </div>

          {/* ── Second row ── */}
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.78fr_1fr]">

            {/* My Tasks */}
            <Panel className="p-5">
              <SectionTitle
                title="My Tasks"
                onAction={() => navigate("/tasks")}
              />
              {tasks.loading ? (
                <CardSkeleton lines={4} />
              ) : tasks.error ? (
                <CardError message={tasks.error} onRetry={tasks.refetch} />
              ) : (
                <>
                  <div className="mb-4 flex gap-7 text-[13px] font-bold text-[#263156]">
                    {taskTabs.map((tab, index) => (
                      <span
                        key={tab.label}
                        className={index === 0 ? "border-b-2 border-blue-600 pb-2 text-blue-700" : "pb-2"}
                      >
                        {tab.label} ({tab.count})
                      </span>
                    ))}
                  </div>
                  <div className="divide-y divide-[#e7edf6]">
                    {tasks.data.map((task) => (
                      <div key={task.id} className="grid grid-cols-[28px_1fr_70px_70px_28px] items-center gap-4 py-3">
                        <span className="h-6 w-6 rounded-full border border-[#cbd6e8]" />
                        <div>
                          <p className="text-[14px] font-extrabold text-[#071334]">{task.title}</p>
                          <p className="mt-1 text-[12px] font-medium text-[#596484]">
                            {task.projects?.name || "No Project"} • {task.due_date || "No Due Date"}
                          </p>
                        </div>
                        <span className="justify-self-start rounded-full px-3 py-1 text-[12px] font-bold bg-blue-50 text-blue-600">
                          {capitalize(task.priority)}
                        </span>
                        <div>
                          <p className="text-[13px] font-extrabold">{capitalize(task.status)}</p>
                          <div className="mt-2 h-1.5 rounded-full bg-[#e4e9f2]">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{
                                width: task.status === "done"        ? "100%" :
                                       task.status === "review"      ? "80%"  :
                                       task.status === "in_progress" ? "50%"  : "10%",
                              }}
                            />
                          </div>
                        </div>
                        <MoreHorizontal className="h-5 w-5 text-[#23315a]" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Panel>

            {/* Today's Schedule — tasks due today */}
            <Panel className="p-5">
              <SectionTitle title="Tasks Due Today" action="View calendar" onAction={() => navigate("/tasks")} />
              {scheduleLoading ? (
                <CardSkeleton lines={3} />
              ) : scheduleItems.length === 0 ? (
                <p className="text-[13px] font-medium text-[#4d587b]">No tasks scheduled for today.</p>
              ) : (
                <div className="space-y-4">
                  {scheduleItems.map((task) => (
                    <div key={task.id} className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${priorityDot[task.priority] ?? "bg-slate-400"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-extrabold text-[#071334] truncate">{task.title}</p>
                        <p className="mt-0.5 text-[12px] font-medium text-[#4d587b] truncate">
                          {task.project_name}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600">
                        {capitalize(task.priority)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Notifications */}
            <Panel className="p-5">
              <SectionTitle
                title="Notifications"
                onAction={() => navigate("/notifications")}
              />
              {notifsLoading ? (
                <CardSkeleton lines={4} />
              ) : notifs.length === 0 ? (
                <p className="text-[13px] font-medium text-[#4d587b]">No notifications yet.</p>
              ) : (
                <div className="divide-y divide-[#e7edf6]">
                  {notifs.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && handleMarkNotifRead(n.id)}
                      className={`grid grid-cols-[40px_1fr_auto] gap-4 py-4 ${!n.is_read ? "cursor-pointer" : ""}`}
                    >
                      <div className={`grid h-10 w-10 place-items-center rounded-[8px] ${toneMap[notifTone(n.type)]} ${n.is_read ? "opacity-50" : ""}`}>
                        {notifIconEl(n.type, "h-5 w-5")}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[14px] ${n.is_read ? "font-medium text-[#596484]" : "font-extrabold text-[#071334]"} truncate`}>
                          {n.title}
                        </p>
                        <p className="mt-1 text-[12px] font-medium text-[#4d587b] line-clamp-1">{n.message}</p>
                      </div>
                      <span className="shrink-0 text-[12px] font-medium text-[#4d587b]">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* ── Third row ── */}
          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.8fr_1.2fr]">

            {/* My Projects — live data */}
            <Panel className="p-5">
              <SectionTitle
                title="My Projects"
                onAction={() => navigate("/projects")}
              />
              {projectsLoading ? (
                <CardSkeleton lines={3} />
              ) : myProjects.length === 0 ? (
                <p className="text-[13px] font-medium text-[#4d587b]">No projects assigned yet.</p>
              ) : (
                <div className="divide-y divide-[#e7edf6]">
                  {myProjects.slice(0, 5).map((project) => (
                    <div key={project.id} className="grid grid-cols-[40px_1fr_110px_100px] items-center gap-4 py-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-600">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <p className="text-[14px] font-extrabold truncate">{project.name}</p>
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 flex-1 rounded-full bg-[#e3e9f2]">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{ width: `${project.progress ?? 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold shrink-0">{project.progress ?? 0}%</span>
                      </div>
                      <p className="text-[12px] font-medium text-[#263156]">
                        {project.end_date
                          ? new Date(project.end_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : "No deadline"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Leave Summary — live data */}
            <Panel className="p-5">
              <SectionTitle title="Leave Summary" onAction={() => navigate("/leave")} />
              {leaveBalance.loading ? (
                <CardSkeleton lines={4} />
              ) : leaveBalance.error ? (
                <CardError message={leaveBalance.error} onRetry={leaveBalance.refetch} />
              ) : (
                <div className="flex items-center gap-8">
                  <Donut
                    center={String(Math.round(leaveTotal * 10) / 10)}
                    label="Days"
                    gradient={donutGradient}
                  />
                  <div className="flex-1 space-y-4 text-[13px]">
                    {[
                      ["Available",  `${Math.round(leaveAvailable * 10) / 10} days`, "bg-emerald-600"],
                      ["Pending",    `${leavePending} req${leavePending !== 1 ? "s" : ""}`, "bg-amber-500"],
                      ["Taken",      `${Math.round(leaveTaken * 10) / 10} days`,      "bg-blue-600"],
                      ["Total",      `${Math.round(leaveTotal * 10)  / 10} days`,      "bg-slate-400"],
                    ].map(([label, value, color]) => (
                      <div key={label} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 font-medium text-[#4d587b]">
                          <span className={`h-2 w-2 rounded-full ${color}`} />
                          {label}
                        </span>
                        <span className="font-extrabold">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>

            {/* Weekly Timesheet bars — live data */}
            <Panel className="p-5">
              <SectionTitle title="This Week Timesheet" onAction={() => navigate("/timesheet")} />
              {timesheet.loading ? (
                <CardSkeleton lines={2} />
              ) : timesheet.error ? (
                <CardError message={timesheet.error} onRetry={timesheet.refetch} />
              ) : (
                <div className="grid grid-cols-[150px_1fr] gap-5">
                  <div className="border-r border-[#e1e7f1] pr-5">
                    <p className="mt-4 text-[13px] font-medium text-[#4d587b]">Logged Hours</p>
                    <p className="mt-2 text-[28px] font-extrabold">{timesheet.data?.totalLogged ?? "—"}</p>
                    <p className="mt-6 flex items-center gap-2 text-[13px] font-medium">
                      <Check className="h-4 w-4 rounded-full bg-emerald-600 p-0.5 text-white" />
                      Work Days {timesheet.data?.workDaysLogged ?? 0}/5
                    </p>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    {weekDays.map(({ date, label }) => {
                      const hours    = hoursByDate[date] ?? 0;
                      const heightPct = Math.max(2, Math.min(100, (hours / 10) * 100));
                      return (
                        <div key={date} className="flex h-[135px] flex-1 flex-col items-center justify-end gap-2">
                          <span className="text-[11px] font-medium text-[#263156]">{fmtHours(hours)}</span>
                          <span
                            className="w-5 rounded-t-[4px] bg-gradient-to-t from-emerald-400 to-emerald-600"
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="text-[12px] font-medium text-[#4d587b]">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Panel>
          </div>

          {/* Bottom motivational banner — button removed (no performance page) */}
          <Panel className="mt-5 flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-purple-50 text-[26px]">
              <Gift className="h-7 w-7 text-purple-600" />
            </div>
            <div>
              <p className="text-[17px] font-extrabold">Great going! 🎉</p>
              <p className="mt-1 text-[14px] font-medium text-[#4d587b]">
                Keep completing tasks and stay on top of your work.
              </p>
            </div>
          </Panel>

        </main>
      </div>
    </div>
  );
}
