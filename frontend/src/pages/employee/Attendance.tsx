import {
  AlertCircle,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coffee,
  Eye,
  LogIn,
  LogOut,
  Play,
  Timer,
  UserRound,
  Wifi,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect, type ReactNode } from "react";
import { apiFetch, attendanceAPI, employeeAPI, leaveAPI, holidaysAPI } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  hours_worked: number | null;
  status: string;
  break_start: string | null;
  break_end: string | null;
  break_minutes: number | null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeeklyDay {
  date: string;
  day: string;
  hours: number;
}

interface WeeklyStats {
  days: WeeklyDay[];
  avg_daily_hours: number;
  total_overtime: number;
  attendance_percentage: number;
}

interface EmployeeProfile {
  id: string;
  name: string;
  role: string;
  position: string | null;
  work_location: string | null;
  manager: { name: string } | null;
}

interface AttendanceRequestItem {
  id: string;
  type: string;
  description: string;
  date: string;
  status: string;
}

interface LeaveRequestItem {
  id: string;
  from_date?: string;
  to_date?: string;
  status: string;
}

// ── Constants (visual / non-data) ─────────────────────────────────────────────

type Tone = "green" | "blue" | "orange" | "purple" | "red" | "gray";

const tones: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  orange: "bg-orange-50 text-orange-500",
  purple: "bg-purple-50 text-purple-600",
  red: "bg-rose-50 text-rose-600",
  gray: "bg-slate-100 text-slate-500",
};

const cellStyles: Record<string, string> = {
  muted: "text-[#8b96b4]",
  normal: "bg-[#f8fafd] text-[#071334]",
  present: "bg-emerald-50 text-emerald-700 after:bg-emerald-500",
  late: "bg-orange-50 text-orange-600 after:bg-orange-500",
  absent: "bg-rose-50 text-rose-600 after:bg-rose-500",
  leave: "bg-blue-50 text-blue-600 after:bg-blue-500",
  holiday: "bg-amber-50 text-amber-700 after:bg-amber-400",
  weekend: "bg-slate-50 text-slate-400",
  today: "bg-blue-600 text-white ring-4 ring-blue-100",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function formatHours(hours: number | null | undefined): string {
  if (hours == null || hours === 0) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}


function formatHistoryDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    present: "Present",
    late: "Late",
    absent: "Absent",
    on_leave: "On Leave",
  };
  return map[status] ?? (status.charAt(0).toUpperCase() + status.slice(1));
}

function formatHistoryHours(hours: number | null | undefined): string {
  if (!hours || hours <= 0) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h >= 1) return `${h}h ${m}m`;
  return `${m}m`;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "present": return "bg-emerald-100 text-emerald-700";
    case "late":    return "bg-orange-100 text-orange-600";
    case "absent":  return "bg-red-100 text-red-600";
    case "on_leave": return "bg-blue-100 text-blue-700";
    default:        return "bg-slate-100 text-slate-600";
  }
}

function isClockInLate(clockIn: string | null): boolean {
  if (!clockIn) return false;
  const d = new Date(clockIn);
  const timeStr = d.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata",
  });
  const [h, m] = timeStr.split(":").map(Number);
  return h > 9 || (h === 9 && m > 15);
}

function getWorkingDaysInMonth(month: number, year: number): number {
  let count = 0;
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function getDatesBetween(from?: string, to?: string): string[] {
  if (!from || !to) return [];
  const result: string[] = [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const current = new Date(start);
  while (current <= end) {
    result.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return result;
}

function buildCalendarCells(
  month: number,
  year: number,
  records: AttendanceRecord[],
  leaveDates: Set<string>,
  holidayDates: Set<string>,
  todayStr: string
): Array<{ day: string; type: string }> {
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevDaysInMonth = new Date(year, month - 1, 0).getDate();
  const recordMap = new Map(records.map(r => [r.date, r.status]));

  const cells: Array<{ day: string; type: string }> = [];

  // Leading muted cells (previous month tail)
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ day: String(prevDaysInMonth - i), type: "muted" });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dow = new Date(year, month - 1, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const status = recordMap.get(dateStr);
    const isHoliday = holidayDates.has(dateStr);
    const isLeaveDay = leaveDates.has(dateStr);

    let type: string;
    if (status === "on_leave" || isLeaveDay) {
      type = "leave";
    } else if (status === "present" || status === "late" || status === "absent") {
      type = status;
    } else if (isHoliday) {
      type = "holiday";
    } else if (isWeekend) {
      type = "weekend";
    } else {
      type = dateStr === todayStr ? "today" : "normal";
    }
    cells.push({ day: String(d), type });
  }

  // Trailing muted cells to fill grid rows (multiples of 7)
  let trailing = 1;
  const target = cells.length <= 35 ? 35 : 42;
  while (cells.length < target) {
    cells.push({ day: String(trailing++), type: "muted" });
  }

  return cells;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  });
}

function requestTone(status: string): Tone {
  if (status === "approved") return "green";
  if (status === "pending") return "orange";
  return "red";
}

function requestBadgeCls(status: string): string {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "pending") return "bg-orange-100 text-orange-600";
  return "bg-red-100 text-red-600";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const REQUEST_TYPES = [
  { value: "regularization", label: "Regularization Request" },
  { value: "wfh", label: "WFH Correction" },
  { value: "missed_checkin", label: "Missed Check-in" },
  { value: "early_departure", label: "Early Departure" },
  { value: "late_arrival", label: "Late Arrival" },
  { value: "ot_request", label: "OT Request" },
];

function requestLabelForType(type: string): string {
  return REQUEST_TYPES.find((item) => item.value === type)?.label ?? type;
}

function requestIconForType(type: string): typeof Clock3 {
  if (type === "wfh") return Wifi;
  if (type === "missed_checkin") return AlertCircle;
  if (type === "early_departure") return LogOut;
  if (type === "late_arrival") return LogIn;
  if (type === "ot_request") return Timer;
  return Clock3;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[9px] border border-[#dce5f2] bg-white shadow-[0_10px_32px_rgba(17,43,90,0.05)] ${className}`}>
      {children}
    </section>
  );
}

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: Tone }) {
  return (
    <div className="flex h-[88px] items-center gap-4 rounded-[8px] border border-[#dce5f2] bg-white px-6">
      <div className={`grid h-[52px] w-[52px] place-items-center rounded-[10px] ${tones[tone]}`}>{icon}</div>
      <div>
        <p className="text-[13px] font-medium text-[#23315a]">{label}</p>
        <p className="mt-2 text-[22px] font-extrabold tracking-[-0.02em] text-[#071334]">{value}</p>
      </div>
    </div>
  );
}

function MonthDonut({ present, late, absent, leave, total }: {
  present: number; late: number; absent: number; leave: number; total: number;
}) {
  const pct = (n: number) => total > 0 ? (n / total) * 100 : 0;
  const pS = pct(present);
  const lS = pct(late);
  const aS = pct(absent);
  const leS = pct(leave);
  const gradient = `conic-gradient(#26c566 0 ${pS}%, #f5b000 ${pS}% ${pS + lS}%, #f43f5e ${pS + lS}% ${pS + lS + aS}%, #2f6df6 ${pS + lS + aS}% ${pS + lS + aS + leS}%, #d4dbe8 ${pS + lS + aS + leS}% 100%)`;
  return (
    <div className="grid h-[150px] w-[150px] place-items-center rounded-full" style={{ background: gradient }}>
      <div className="grid h-[96px] w-[96px] place-items-center rounded-full bg-white text-center">
        <div>
          <p className="text-[30px] font-extrabold leading-none text-[#071334]">{total}</p>
          <p className="mt-1 text-[12px] font-medium text-[#4d587b]">Working Days</p>
        </div>
      </div>
    </div>
  );
}

function WeeklyChart({ days }: { days: WeeklyDay[] }) {
  const chartData = days.map((day) => ({
    day: day.day,
    hours: parseFloat(day.hours.toFixed(1)),
  }));

  return (
    <div className="mt-5 h-[180px] w-full">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <YAxis domain={[0, 10]} tickCount={5} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value: number | string) => [`${value}h hours`, ""]} />
          <Line
            type="monotone"
            dataKey="hours"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4, fill: "#10b981" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  useAuth(); // ensure auth context is available

  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [onBreak, setOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<number | null>(null);
  const [breakEndTime, setBreakEndTime] = useState<number | null>(null);
  const [breakMinutes, setBreakMinutes] = useState<number | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [showAllRequests, setShowAllRequests] = useState(false);

  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<AttendanceRecord[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [managerName, setManagerName] = useState<string | null>(null);

  const [requests, setRequests] = useState<AttendanceRequestItem[]>([]);
  const [holidays, setHolidays] = useState<{ date: string; name?: string }[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    type: "regularization",
    date: "",
    reason: "",
  });
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reqLoading, setReqLoading] = useState(false);

  const [weekOffset, setWeekOffset] = useState(0);
  const [historyFilter, setHistoryFilter] = useState<"30" | "60" | "90">("30");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 10;

  // ── Load data on mount ─────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const nowMonth = new Date().getMonth() + 1;
    const nowYear = new Date().getFullYear();
    try {
      const [todayData, historyData, monthly, weekly, profile, reqs, leaveReqs] = await Promise.all([
        attendanceAPI.getToday(),
        attendanceAPI.getHistory(),
        attendanceAPI.getMonthly(nowMonth, nowYear).catch(() => []),
        attendanceAPI.getWeeklyStats().catch(() => null),
        employeeAPI.getProfile().catch(() => null),
        attendanceAPI.getRequests().catch(() => []),
        leaveAPI.getMy().catch(() => []),
      ]);
      const rec: AttendanceRecord | null = todayData ?? null;
      setToday(rec);
      // Restore break state from today's record so it survives page refresh
      if (rec?.break_start && !rec.break_end) {
        setOnBreak(true);
        setBreakStartTime(new Date(rec.break_start).getTime());
      } else if (rec?.break_minutes) {
        setBreakMinutes(rec.break_minutes);
      }
      setHistoryRecords(Array.isArray(historyData) ? historyData : []);
      setMonthlyData(Array.isArray(monthly) ? monthly : []);
      if (weekly) setWeeklyStats(weekly);
      const p: EmployeeProfile | null = profile ?? null;
      setEmployeeProfile(p);
      if (p?.manager?.name) setManagerName(p.manager.name);
      setRequests(Array.isArray(reqs) ? reqs : []);
      setLeaveRequests(Array.isArray(leaveReqs) ? leaveReqs : []);
      try {
        const hh = await holidaysAPI.getAll();
        setHolidays(Array.isArray(hh) ? hh : []);
      } catch {
        setHolidays([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = async () => {
    const nm = calMonth === 1 ? 12 : calMonth - 1;
    const ny = calMonth === 1 ? calYear - 1 : calYear;
    setCalMonth(nm);
    setCalYear(ny);
    try {
      const data = await attendanceAPI.getMonthly(nm, ny);
      setMonthlyData(Array.isArray(data) ? data : []);
    } catch { /* keep current */ }
  };

  const handleNextMonth = async () => {
    const nm = calMonth === 12 ? 1 : calMonth + 1;
    const ny = calMonth === 12 ? calYear + 1 : calYear;
    setCalMonth(nm);
    setCalYear(ny);
    try {
      const data = await attendanceAPI.getMonthly(nm, ny);
      setMonthlyData(Array.isArray(data) ? data : []);
    } catch { /* keep current */ }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    attendanceAPI.getRequests()
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch(() => setRequests([]));
  }, []);

  useEffect(() => {
    attendanceAPI.getWeeklyStats(weekOffset)
      .then((data) => setWeeklyStats(data))
      .catch(console.error);
  }, [weekOffset]);

  // Reset history page when records or filters change
  useEffect(() => { setHistoryPage(1); }, [historyRecords, historyFilter, statusFilter]);

  // ── Live elapsed timer ─────────────────────────────────────────────────────

  useEffect(() => {
    const clockIn = today?.clock_in;
    const clockOut = today?.clock_out;

    if (!clockIn || clockOut) {
      setElapsed("00:00:00");
      return;
    }

    if (onBreak) {
      return;
    }

    const startTime = new Date(clockIn).getTime();
    const tick = () => {
      const diff = Date.now() - startTime;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [today?.clock_in, today?.clock_out, onBreak]);

  // ── Toast auto-dismiss ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Action handlers ────────────────────────────────────────────────────────

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      const record: AttendanceRecord = await attendanceAPI.clockIn();
      setToday(record);
      setBreakStartTime(null);
      setBreakEndTime(null);
      setToast(`Clocked in at ${formatTime(record.clock_in)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clock in failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      const record: AttendanceRecord = await attendanceAPI.clockOut();
      setToday(record);
      setOnBreak(false);
      setBreakStartTime(null);
      setBreakEndTime(null);
      setBreakMinutes(null);
      setToast(`Clocked out. Total hours: ${formatHours(record.hours_worked)}`);
      const [historyData, monthly] = await Promise.all([
        attendanceAPI.getHistory(),
        attendanceAPI.getMonthly(calMonth, calYear).catch(() => []),
      ]);
      setHistoryRecords(Array.isArray(historyData) ? historyData : []);
      setMonthlyData(Array.isArray(monthly) ? monthly : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clock out failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBreakStart = async () => {
    if (!today?.clock_in || today?.clock_out) return;
    setActionLoading(true);
    try {
      const result = await apiFetch('/attendance/break-start', { method: 'POST' });
      const startMs = result?.break_start
        ? new Date(result.break_start as string).getTime()
        : Date.now();
      setOnBreak(true);
      setBreakStartTime(startMs);
      setBreakEndTime(null);
      setToast("Break started");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start break");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBreakEnd = async () => {
    if (!onBreak) return;
    setActionLoading(true);
    try {
      const result = await apiFetch('/attendance/break-end', { method: 'POST' });
      setOnBreak(false);
      setBreakEndTime(Date.now());
      if (result?.break_minutes != null) setBreakMinutes(result.break_minutes as number);
      setToast("Break ended, back to work");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end break");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndDay = async () => {
    setActionLoading(true);
    try {
      const record: AttendanceRecord = await attendanceAPI.clockOut();
      setToday(record);
      setOnBreak(false);
      setBreakStartTime(null);
      setBreakEndTime(null);
      setBreakMinutes(null);
      setToast(`Day ended. Total: ${formatHours(record.hours_worked)}`);
      const [historyData, monthly] = await Promise.all([
        attendanceAPI.getHistory(),
        attendanceAPI.getMonthly(calMonth, calYear).catch(() => []),
      ]);
      setHistoryRecords(Array.isArray(historyData) ? historyData : []);
      setMonthlyData(Array.isArray(monthly) ? monthly : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end day");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!requestForm.type || !requestForm.date || !requestForm.reason.trim()) {
      setRequestError("Please fill all fields.");
      return;
    }
    setReqLoading(true);
    setRequestError(null);
    try {
      const newRequest: AttendanceRequestItem = await attendanceAPI.createRequest(requestForm);
      setRequests((prev) => [newRequest, ...prev]);
      setShowRequestModal(false);
      setRequestForm({ type: "regularization", date: "", reason: "" });
      setToast("Request submitted successfully");
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setReqLoading(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const isClockedIn = !!today?.clock_in && !today?.clock_out && !onBreak;
  const isDayComplete = !!today?.clock_in && !!today?.clock_out && !onBreak;
  const isOnBreak = onBreak && !!breakStartTime;

  // Progress percentage for the ring (based on a 9-hour shift)
  const SHIFT_HOURS = 9;
  const elapsedHours = isDayComplete
    ? (today!.hours_worked ?? 0)
    : today?.clock_in
      ? (Date.now() - new Date(today.clock_in).getTime()) / 3600000
      : 0;
  const progressPct = Math.min(Math.round((elapsedHours / SHIFT_HOURS) * 100), 100);

  // Working hours display for Today Summary metric
  // Show elapsed when actively working or on break (frozen at break value)
  const workingHoursDisplay = isDayComplete
    ? formatHours(today!.hours_worked)
    : (isClockedIn || onBreak)
      ? `${elapsed.split(":")[0]}h ${elapsed.split(":")[1]}m`
      : "—";

  // Today Summary derived values
  const overtimeDisplay = (() => {
    const h = isDayComplete ? (today!.hours_worked ?? 0) : null;
    if (h == null || h <= 9) return "—";
    return formatHours(h - 9);
  })();

  const breakHoursDisplay = (() => {
    if (isOnBreak && breakStartTime) {
      return formatHours((Date.now() - breakStartTime) / 3600000);
    }
    if (breakMinutes != null && breakMinutes > 0) {
      return formatHours(breakMinutes / 60);
    }
    if (!isOnBreak && breakStartTime && breakEndTime) {
      return formatHours((breakEndTime - breakStartTime) / 3600000);
    }
    return "—";
  })();

  const lateDisplay = today?.clock_in
    ? (isClockInLate(today.clock_in) ? "Late" : "On time")
    : "—";

  // Monthly overview counts (from monthlyData for the selected calendar month)
  const presentCount = monthlyData.filter(r => r.status === "present").length;
  const lateCount = monthlyData.filter(r => r.status === "late").length;
  const absentCount = monthlyData.filter(r => r.status === "absent").length;
  const leaveCount = monthlyData.filter(r => r.status === "on_leave").length;
  const workingDaysTotal = getWorkingDaysInMonth(calMonth, calYear);

  const filteredHistory = historyRecords.filter((record) => {
    const days = parseInt(historyFilter);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const recordDate = new Date(record.date);
    const dateOk = recordDate >= cutoff;
    const statusOk = statusFilter === "all" || record.status === statusFilter;
    return dateOk && statusOk;
  });

  const totalHistoryPages = Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE);
  const paginatedHistory = filteredHistory.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  );

  // Calendar cells for current calMonth/calYear
  const todayStr = new Date().toISOString().split("T")[0];
  const approvedLeaveDates = new Set<string>(
    leaveRequests
      .filter((item) => item.status === "approved")
      .flatMap((item) => getDatesBetween(item.from_date, item.to_date))
  );
  const calendarHolidayDates = new Set<string>(
    holidays
      .filter((h) => h.date.startsWith(`${calYear}-${String(calMonth).padStart(2, "0")}`))
      .map((h) => h.date)
  );
  const calendarCells = buildCalendarCells(calMonth, calYear, monthlyData, approvedLeaveDates, calendarHolidayDates, todayStr);
  const weeklyAvgHours = weeklyStats ? Math.floor(weeklyStats.avg_daily_hours) : 0;
  const weeklyAvgMins = weeklyStats ? Math.round((weeklyStats.avg_daily_hours - weeklyAvgHours) * 60) : 0;
  const weeklyOvertime = weeklyStats?.total_overtime ?? 0;
  const weeklyAttendancePct = weeklyStats?.attendance_percentage ?? 0;

  // Live status badge text and color
  const liveBadgeText = onBreak ? "On Break"
    : today?.clock_out ? "Completed"
    : today?.clock_in ? "Present"
    : today?.status ? statusLabel(today.status)
    : "Not Started";
  const liveBadgeCls = onBreak
    ? "rounded-full bg-orange-400 px-5 py-1.5 text-[14px] font-extrabold"
    : today?.clock_out
      ? "rounded-full bg-blue-400 px-5 py-1.5 text-[14px] font-extrabold"
      : today?.clock_in
        ? "rounded-full bg-emerald-400 px-5 py-1.5 text-[14px] font-extrabold"
        : today?.status
          ? "rounded-full bg-blue-400 px-5 py-1.5 text-[14px] font-extrabold"
          : "rounded-full bg-white/30 px-5 py-1.5 text-[14px] font-extrabold";

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-svh bg-[#f6f9ff] text-[#071334]">
        <div className="w-full px-6 py-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_560px]">
            <div className="space-y-5">
              <div className="h-[340px] animate-pulse rounded-[9px] bg-slate-200" />
              <div className="h-[320px] animate-pulse rounded-[9px] bg-slate-200" />
              <div className="h-[220px] animate-pulse rounded-[9px] bg-slate-200" />
            </div>
            <div className="space-y-5">
              <div className="h-[220px] animate-pulse rounded-[9px] bg-slate-200" />
              <div className="h-[280px] animate-pulse rounded-[9px] bg-slate-200" />
              <div className="h-[180px] animate-pulse rounded-[9px] bg-slate-200" />
              <div className="h-[180px] animate-pulse rounded-[9px] bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-svh bg-[#f6f9ff] text-[#071334]">
      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-[8px] bg-[#071334] px-5 py-3 text-[13px] font-bold text-white shadow-xl">
          {toast}
        </div>
      )}

      <div className="w-full px-6 py-5">
        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-[8px] border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[13px] font-medium text-red-700">{error}</p>
            <button
              onClick={() => { setError(null); loadData(); }}
              className="ml-4 text-[12px] font-bold text-red-800 underline"
            >
              Retry
            </button>
          </div>
        )}

        <main className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_560px]">
          <div className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1.5fr_0.92fr]">

              {/* ── Live Status Card ───────────────────────────────────────── */}
              <section className="relative overflow-hidden rounded-[9px] bg-[#0b55f4] p-6 text-white shadow-[0_18px_40px_rgba(20,78,220,0.22)]">
                <div className="absolute inset-0 opacity-45" style={{ background: "radial-gradient(circle at 83% 4%, #3187ff 0 21%, transparent 22%), radial-gradient(circle at 9% 100%, #3b7df8 0 24%, transparent 25%), radial-gradient(circle at 50% 115%, #315ee0 0 31%, transparent 32%)" }} />
                <div className="relative flex flex-col gap-4">

                  {/* Top row: text left, donut right */}
                  <div className="flex items-center justify-between gap-4">

                    {/* Left: live status info */}
                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <p className="text-[18px] font-extrabold">Live Status</p>
                        <span className={liveBadgeCls}>{liveBadgeText}</span>
                      </div>
                      <p className="text-[38px] font-extrabold leading-none">
                        {today?.clock_in ? formatTime(today.clock_in) : "--:--"}
                      </p>
                      <p className="text-[19px] font-bold">
                        {isDayComplete ? "Day Completed" : isOnBreak ? "On Break" : isClockedIn ? "Checked in" : "Not checked in"}
                      </p>
                      <span className="inline-flex self-start rounded-[7px] bg-white/15 px-3 py-1.5 text-[13px] font-bold">
                        Shift: General (09:00 AM - 06:00 PM)
                      </span>
                    </div>

                    {/* Right: 160×160 progress ring */}
                    <div className="flex-shrink-0">
                      <div
                        className="flex h-[160px] w-[160px] items-center justify-center rounded-full"
                        style={{ background: `conic-gradient(#3be689 0 ${progressPct}%, rgba(255,255,255,0.45) ${progressPct}% 100%)` }}
                      >
                        <div className="flex h-[120px] w-[120px] flex-col items-center justify-center rounded-full bg-[#0844b8]">
                          <p className="text-center text-[13px] font-bold">
                            {isDayComplete ? "Worked" : "Working"}
                          </p>
                          <p className="mt-1 text-center text-[20px] font-extrabold leading-none">
                            {isDayComplete
                              ? formatHours(today!.hours_worked)
                              : elapsed}
                          </p>
                          <p className="mt-1 text-center text-[13px] font-bold">Hours</p>
                          <span className={`mt-2 h-2 w-2 rounded-full ${isClockedIn ? "bg-emerald-400" : "bg-white/40"}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: action buttons — normal flow, never overlaps donut */}
                  <div>
                    {isDayComplete ? (
                      <div className="flex h-[72px] items-center justify-center rounded-[8px] bg-emerald-500/25">
                        <CheckCircle2 className="mr-2 h-5 w-5 text-emerald-300" />
                        <span className="text-[14px] font-extrabold">
                          Day completed — {formatHours(today!.hours_worked)}
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-3">
                        {/* Clock In / Clock Out (primary action) */}
                        <button
                          onClick={isClockedIn ? handleClockOut : handleClockIn}
                          disabled={actionLoading || onBreak}
                          className={`grid h-[72px] place-items-center rounded-[8px] text-[13px] font-extrabold transition-opacity disabled:opacity-70 ${
                            isClockedIn ? "bg-emerald-500 text-white" : "bg-white/80 text-[#071334]"
                          }`}
                        >
                          <span className="grid h-9 w-9 place-items-center rounded-full border border-current">
                            <Play className="h-5 w-5" />
                          </span>
                          {actionLoading ? "…" : onBreak ? "On Break" : isClockedIn ? "Check Out" : "Clock In"}
                        </button>
                        {/* Start Break — enabled only when actively clocked in */}
                        <button
                          onClick={handleBreakStart}
                          disabled={actionLoading || !isClockedIn}
                          className="grid h-[72px] place-items-center rounded-[8px] bg-white/80 text-[13px] font-extrabold text-[#071334] transition-opacity disabled:opacity-50"
                        >
                          <span className="grid h-9 w-9 place-items-center rounded-full border border-current">
                            <Coffee className="h-5 w-5" />
                          </span>
                          Start Break
                        </button>
                        {/* Break End — enabled only when on break */}
                        <button
                          onClick={handleBreakEnd}
                          disabled={actionLoading || !onBreak}
                          className={`grid h-[72px] place-items-center rounded-[8px] text-[13px] font-extrabold text-[#071334] transition-opacity disabled:opacity-50 ${onBreak ? "bg-white" : "bg-white/70"}`}
                        >
                          <span className="grid h-9 w-9 place-items-center rounded-full border border-current">
                            <Coffee className="h-5 w-5" />
                          </span>
                          Break End
                        </button>
                        {/* End Day — enabled when clocked in or on break */}
                        <button
                          onClick={handleEndDay}
                          disabled={actionLoading || (!isClockedIn && !onBreak)}
                          className="grid h-[72px] place-items-center rounded-[8px] bg-white/70 text-[13px] font-extrabold text-[#071334] transition-opacity disabled:opacity-50"
                        >
                          <span className="grid h-9 w-9 place-items-center rounded-full border border-current">
                            <Coffee className="h-5 w-5" />
                          </span>
                          End Day
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ── Today's Timeline ──────────────────────────────────────── */}
              <Panel className="p-7">
                <h2 className="text-[18px] font-extrabold">Today's Timeline</h2>
                <div className="relative mt-7 space-y-10 pl-10">
                  <div className="absolute left-[13px] top-2 h-[176px] w-2 rounded-full bg-emerald-100" />
                  {[
                    {
                      time: today?.clock_in ? formatTime(today.clock_in) : "—",
                      title: "Check In",
                      sub: "Office • Web",
                      tone: "green",
                    },
                    {
                      time: breakStartTime ? formatTime(new Date(breakStartTime).toISOString()) : "—",
                      title: "Break Start",
                      sub: isOnBreak ? "Break ongoing" : breakEndTime ? "Completed" : "",
                      tone: "orange",
                    },
                    {
                      time: breakEndTime ? formatTime(new Date(breakEndTime).toISOString()) : "—",
                      title: "Break End",
                      sub: breakEndTime ? "Back to work" : "",
                      tone: "blue",
                    },
                    {
                      time: isDayComplete ? formatTime(today.clock_out) : "—",
                      title: "Status",
                      sub: isDayComplete ? "Completed" : isOnBreak ? "On Break" : isClockedIn ? "In Progress" : "Waiting",
                      tone: isOnBreak ? "orange" : isDayComplete ? "blue" : "green",
                    },
                  ].map(({ time, title, sub, tone }) => (
                    <div key={title} className="relative grid grid-cols-[82px_1fr_auto] gap-4">
                      <span className={`absolute -left-[42px] top-0 h-5 w-5 rounded-full border-4 ${tone === "green" ? "border-emerald-400 bg-emerald-600" : tone === "orange" ? "border-orange-300 bg-orange-500" : "border-blue-300 bg-blue-600"}`} />
                      <span className="text-[15px] font-extrabold">{time}</span>
                      <div>
                        <p className="text-[15px] font-extrabold">{title}</p>
                        {sub && sub !== "In Progress" && sub !== "Completed" && sub !== "Waiting" && <p className="mt-2 text-[12px] font-medium text-[#24335f]">{sub}</p>}
                      </div>
                      {sub === "In Progress" && <span className="rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-bold text-emerald-700">In Progress</span>}
                      {sub === "Completed" && <span className="rounded-full bg-blue-100 px-3 py-1 text-[12px] font-bold text-blue-700">Completed</span>}
                      {sub === "On Break" && <span className="rounded-full bg-orange-100 px-3 py-1 text-[12px] font-bold text-orange-700">On Break</span>}
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* ── Monthly Attendance + Weekly Trend ─────────────────────── */}
            <div className="grid gap-0 overflow-hidden rounded-[9px] border border-[#dce5f2] bg-white shadow-[0_10px_32px_rgba(17,43,90,0.05)] xl:grid-cols-[0.82fr_1.18fr]">
              <div className="p-5">
                <h2 className="flex items-center gap-3 text-[18px] font-extrabold"><CalendarDays className="h-5 w-5 text-blue-600" />Monthly Attendance</h2>
                <div className="mt-7 flex items-center justify-center gap-6 text-[16px] font-extrabold">
                  <button onClick={handlePrevMonth} className="px-2 hover:text-blue-600">‹</button>
                  <span>{MONTH_NAMES[calMonth - 1]} {calYear}</span>
                  <button onClick={handleNextMonth} className="px-2 hover:text-blue-600">›</button>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-[11px] font-bold text-[#4d587b]">
                  {[["Present", "bg-emerald-500"], ["Late", "bg-orange-500"], ["Absent", "bg-rose-500"], ["Leave", "bg-blue-500"], ["Holiday", "bg-amber-500"], ["Weekend", "bg-slate-400"]].map(([label, color]) => (
                    <span key={label} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-7 gap-2 text-center">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <span key={day} className="text-[12px] font-bold">{day}</span>
                  ))}
                  {calendarCells.map(({ day, type }, index) => (
                    <span
                      key={index}
                      className={`relative grid h-[40px] place-items-center rounded-[8px] text-[13px] font-bold ${cellStyles[type] ?? cellStyles.normal} ${["present", "late", "absent", "leave"].includes(type) ? "after:absolute after:h-2 after:w-2 after:rounded-full" : ""}`}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>
              <div className="border-l border-[#e1e8f3] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-[18px] font-extrabold">Weekly Trend</h2>
                  <select
                    value={weekOffset}
                    onChange={(e) => {
                      const offset = parseInt(e.target.value);
                      setWeekOffset(offset);
                    }}
                    className="flex h-9 items-center rounded-[6px] border border-[#d6e0ee] px-3 text-[13px] font-bold text-[#071334] outline-none"
                  >
                    <option value={0}>This Week</option>
                    <option value={1}>Last Week</option>
                    <option value={2}>2 Weeks Ago</option>
                  </select>
                </div>
                <WeeklyChart days={weeklyStats?.days ?? []} />
                <div className="mt-4 grid grid-cols-3 divide-x divide-[#e1e8f3] text-[13px]">
                  <div>
                    <p className="text-[#4d587b]">Avg. Daily Hours</p>
                    <p className="mt-1 text-[22px] font-extrabold">{weeklyStats ? `${weeklyAvgHours}h ${weeklyAvgMins}m` : "—"}</p>
                  </div>
                  <div className="pl-5">
                    <p className="text-[#4d587b]">Total Overtime</p>
                    <p className="mt-1 text-[22px] font-extrabold">{weeklyOvertime > 0 ? `${weeklyOvertime}h` : "—"}</p>
                  </div>
                  <div className="pl-5">
                    <p className="text-[#4d587b]">Attendance</p>
                    <p className="mt-1 text-[22px] font-extrabold">{weeklyStats ? `${weeklyAttendancePct}%` : "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Attendance History Table ───────────────────────────────── */}
            <Panel className="overflow-hidden p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[18px] font-extrabold">Attendance History</h2>
                <div className="flex gap-3">
                  <select
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value as "30" | "60" | "90")}
                    className="h-9 rounded-[6px] border border-[#dce5f2] px-3 text-[12px] font-bold text-[#071334] outline-none"
                  >
                    <option value="30">Last 30 Days</option>
                    <option value="60">Last 60</option>
                    <option value="90">Last 90</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 rounded-[6px] border border-[#dce5f2] px-3 text-[12px] font-bold text-[#071334] outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>
              <table className="w-full border-collapse text-left text-[12px]">
                <thead className="bg-[#f3f6fb] text-[#071334]">
                  <tr>
                    {["Date", "Check In", "Check Out", "Working Hours", "Status", "Action"].map((h) => (
                      <th key={h} className="px-3 py-3 font-extrabold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8eef7]">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-[13px] font-medium text-[#4d587b]">
                        No attendance records yet.
                      </td>
                    </tr>
                  ) : (
                    paginatedHistory.map((record) => {
                      const label = statusLabel(record.status);
                      return (
                        <tr key={record.id}>
                          <td className="px-3 py-3 font-medium">{formatHistoryDate(record.date)}</td>
                          <td className={`px-3 py-3 font-medium ${record.clock_in ? "font-extrabold text-emerald-600" : ""}`}>
                            {formatTime(record.clock_in)}
                          </td>
                          <td className="px-3 py-3 font-medium">{record.clock_out ? formatTime(record.clock_out) : "—"}</td>
                          <td className="px-3 py-3 font-medium">{formatHistoryHours(record.hours_worked)}</td>
                          <td className="px-3 py-3">
                            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusBadgeClass(record.status)}`}>
                              {label}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <button onClick={() => setSelectedRecord(record)}>
                              <Eye className="h-4 w-4 text-blue-600" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
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
                    {(() => {
                      const total = totalHistoryPages;
                      let start = Math.max(1, historyPage - 2);
                      const end = Math.min(total, start + 4);
                      start = Math.max(1, end - 4);
                      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
                    })().map((n) => (
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
                      disabled={historyPage === totalHistoryPages}
                      className="h-8 rounded-[6px] border border-[#dce5f2] px-3 font-bold text-[#071334] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </Panel>
          </div>

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <aside className="space-y-5">

            {/* Today Summary */}
            <Panel className="p-6">
              <h2 className="mb-5 text-[18px] font-extrabold">Today Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <Metric icon={<Clock3 className="h-7 w-7" />} label="Working Hours" value={workingHoursDisplay} tone="green" />
                <Metric icon={<Timer className="h-7 w-7" />} label="Break Hours" value={breakHoursDisplay} tone="purple" />
                <Metric icon={<Timer className="h-7 w-7" />} label="Overtime" value={overtimeDisplay} tone="orange" />
                <Metric icon={<Clock3 className="h-7 w-7" />} label="Late" value={lateDisplay} tone="red" />
              </div>
            </Panel>

            {/* This Month Overview */}
            <Panel className="p-7">
              <h2 className="text-[18px] font-extrabold">This Month Overview</h2>
              <div className="mt-7 flex items-center gap-12">
                <MonthDonut
                  present={presentCount}
                  late={lateCount}
                  absent={absentCount}
                  leave={leaveCount}
                  total={workingDaysTotal}
                />
                <div className="flex-1 space-y-5 text-[14px]">
                  {([
                    ["Present", presentCount, "bg-emerald-500"],
                    ["Late", lateCount, "bg-orange-500"],
                    ["Absent", absentCount, "bg-rose-500"],
                    ["Leave", leaveCount, "bg-blue-600"],
                  ] as const).map(([label, count, color]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="flex items-center gap-3 font-bold">
                        <span className={`h-3 w-3 rounded-full ${color}`} />
                        {label}
                      </span>
                      <span className="font-extrabold">{count} {count === 1 ? "Day" : "Days"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            {/* Shift Information */}
            <Panel className="bg-[#eaf2ff] p-6">
              <h2 className="text-[18px] font-extrabold">Shift Information</h2>
              <div className="mt-7 grid grid-cols-2 gap-x-10 gap-y-7">
                {([
                  ["Shift Name", employeeProfile?.position ?? (employeeProfile?.role ? employeeProfile.role.charAt(0).toUpperCase() + employeeProfile.role.slice(1) : "Standard Shift"), Briefcase],
                  ["Shift Timing", "Standard Hours", Clock3],
                  ["Weekly Off", "Saturday, Sunday", CalendarDays],
                  ["Reporting Manager", managerName ?? "—", UserRound],
                ] as [string, string, typeof Briefcase][]).map(([label, value, Icon]) => (
                  <div key={label} className="flex gap-4">
                    <span className="grid h-10 w-10 place-items-center rounded-[8px] bg-blue-100 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[13px] font-extrabold">{label}</p>
                      <p className="mt-1 text-[12px] font-bold">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Attendance Requests */}
            <Panel className="bg-[#fff4e6] p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[18px] font-extrabold">Attendance Requests</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setRequestError(null); setShowRequestModal(true); }}
                    className="rounded-[6px] bg-[#0b55f4] px-3 py-1.5 text-[12px] font-extrabold text-white hover:bg-blue-700"
                  >
                    + New
                  </button>
                  <button
                    onClick={() => setShowAllRequests((prev) => !prev)}
                    className="text-[14px] font-extrabold text-blue-700"
                  >
                    {showAllRequests ? "Show less" : "View all"}
                  </button>
                </div>
              </div>
              {requests.length === 0 ? (
                <p className="py-4 text-center text-[13px] font-medium text-[#4d587b]">No requests yet</p>
              ) : (
                (showAllRequests ? requests : requests.slice(0, 3)).map((req) => {
                  const ItemIcon = requestIconForType(req.type);
                  const tone = requestTone(req.status);
                  return (
                    <div
                      key={req.id}
                      className="grid grid-cols-[52px_1fr_auto] items-center gap-4 border-b border-orange-200 py-5 last:border-0"
                    >
                      <span className={`grid h-12 w-12 place-items-center rounded-[8px] ${tones[tone]}`}>
                        <ItemIcon className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="text-[14px] font-extrabold">{requestLabelForType(req.type)}</p>
                        <p className="mt-2 text-[13px] font-medium text-[#4d587b]">{formatDateShort(req.date)}</p>
                      </div>
                      <span className={`rounded-full px-4 py-2 text-[13px] font-extrabold ${requestBadgeCls(req.status)}`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </div>
                  );
                })
              )}
            </Panel>
          </aside>
        </main>
      </div>

      {/* ── Attendance Detail Modal ─────────────────────────────────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[380px] rounded-[12px] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[16px] font-extrabold text-[#071334]">Attendance Details</h3>
              <button onClick={() => setSelectedRecord(null)} className="text-[18px] leading-none text-[#4d587b] hover:text-[#071334]">×</button>
            </div>
            <div className="space-y-3">
              {([
                ["Date", formatHistoryDate(selectedRecord.date)],
                ["Check In", formatTime(selectedRecord.clock_in)],
                ["Check Out", selectedRecord.clock_out ? formatTime(selectedRecord.clock_out) : "—"],
                ["Working Hours", formatHistoryHours(selectedRecord.hours_worked)],
              ] as const).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-[#f0f4fa] pb-3 last:border-0">
                  <span className="text-[13px] font-medium text-[#4d587b]">{label}</span>
                  <span className="text-[13px] font-extrabold text-[#071334]">{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#4d587b]">Status</span>
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusBadgeClass(selectedRecord.status)}`}>
                  {statusLabel(selectedRecord.status)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#4d587b]">Overtime</span>
                <span className="text-[13px] font-extrabold text-[#071334]">
                  {selectedRecord.hours_worked && selectedRecord.hours_worked > 9 ? formatHistoryHours(selectedRecord.hours_worked - 9) : "—"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedRecord(null)}
              className="mt-6 h-10 w-full rounded-[7px] border border-[#dce5f2] text-[13px] font-bold text-[#4d587b] hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── New Request Modal ───────────────────────────────────────────── */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[420px] rounded-[12px] bg-white p-6 shadow-2xl">
            <h3 className="text-[16px] font-extrabold text-[#071334]">New Attendance Request</h3>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[12px] font-bold text-[#4d587b]">Request Type</label>
                <select
                  value={requestForm.type}
                  onChange={(e) => setRequestForm((form) => ({ ...form, type: e.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-[7px] border border-[#dce5f2] px-3 text-[13px] font-medium text-[#071334] outline-none focus:border-blue-500"
                >
                  {REQUEST_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[12px] font-bold text-[#4d587b]">Date</label>
                <input
                  type="date"
                  value={requestForm.date}
                  onChange={(e) => setRequestForm((form) => ({ ...form, date: e.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-[7px] border border-[#dce5f2] px-3 text-[13px] font-medium text-[#071334] outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-[#4d587b]">Reason</label>
                <textarea
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm((form) => ({ ...form, reason: e.target.value }))}
                  rows={3}
                  placeholder="Describe your reason..."
                  className="mt-1.5 w-full resize-none rounded-[7px] border border-[#dce5f2] px-3 py-2 text-[13px] font-medium text-[#071334] outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {requestError && (
              <p className="mt-4 rounded-[7px] bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600">
                {requestError}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setRequestForm({ type: "regularization", date: "", reason: "" });
                  setRequestError(null);
                }}
                className="h-10 flex-1 rounded-[7px] border border-[#dce5f2] text-[13px] font-bold text-[#4d587b] hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRequest}
                disabled={reqLoading || !requestForm.type || !requestForm.date || !requestForm.reason.trim()}
                className="h-10 flex-1 rounded-[7px] bg-[#0b55f4] text-[13px] font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {reqLoading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
