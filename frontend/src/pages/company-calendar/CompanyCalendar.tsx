import { useState, useEffect, useMemo } from "react";
import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  MoreVertical,
  Plus,
  Search,
  X,
} from "lucide-react";
import { calendarAPI, leaveAPI, attendanceAPI } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  event_type?: string;
  is_all_day?: boolean;
  is_company_wide?: boolean;
}

interface AttendanceRecord {
  id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  hours_worked: number | null;
  status: string;
}

interface LeaveRecord {
  id: string;
  type?: string;
  from_date: string;
  to_date: string;
  days?: number;
  status: string;
}

interface TaskRecord {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  project_name?: string;
}

interface HolidayRecord {
  id: string;
  name: string;
  date: string;
  country?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

interface TeamLeave {
  id: string;
  type?: string;
  from_date: string;
  to_date: string;
  status: string;
  employee?: { id: string; name: string };
}

interface TeamAttendance {
  id: string;
  date: string;
  status: string;
  employee?: { id: string; name: string };
}

interface CalendarData {
  events: CalendarEvent[];
  attendance: AttendanceRecord[];
  leaves: LeaveRecord[];
  tasks: TaskRecord[];
  holidays: HolidayRecord[];
  company_events: CalendarEvent[];
  team_data?: {
    team_leaves: TeamLeave[];
    team_attendance: TeamAttendance[];
    team_members: { id: string; name: string }[];
  };
}

interface LeaveBalance {
  earned_leave_accrued?: number;
  earned_leave_used?: number;
  carried_forward?: number;
  sick_leave_used?: number;
  casual_leave_total?: number;
  casual_leave_used?: number;
}

interface TodayAttendance {
  clock_in: string | null;
  clock_out: string | null;
  status?: string;
  hours_worked?: number | null;
}

interface AddForm {
  title: string;
  event_date: string;
  description: string;
  event_type: string;
  is_all_day: boolean;
  start_time: string;
  end_time: string;
  is_company_wide: boolean;
}

interface EventItem {
  kind: "present" | "leave" | "absent" | "holiday" | "task" | "event";
  title: string;
  sub?: string;
  time?: string;
  id?: string;
  rawHour?: number;
}

interface CalendarCell {
  day: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
  });
}

function formatHours(h: number | null | undefined): string {
  if (!h || h <= 0) return "—";
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${String(mins).padStart(2, "0")}m`;
}

function fmtShortDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  earned: "Earned Leave",
  sick: "Sick Leave",
  casual: "Casual Leave",
  lop: "Loss of Pay",
};

function countWorkingDays(month: number, year: number, approvedHolidays: string[] = []): number {
  const days = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow === 0 || dow === 6) continue;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (approvedHolidays.includes(dateStr)) continue;
    count++;
  }
  return count;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DEFAULT_ADD_FORM: AddForm = {
  title: "", event_date: "", description: "", event_type: "personal",
  is_all_day: false, start_time: "", end_time: "", is_company_wide: false,
};

const legend = [
  ["Present", "bg-emerald-500"],
  ["Absent", "bg-red-500"],
  ["Leave", "bg-yellow-400"],
  ["Holiday", "bg-rose-500"],
  ["Weekend", "bg-slate-400"],
  ["Task Due", "bg-orange-500"],
  ["Event", "bg-blue-600"],
];

const eventStyles: Record<string, string> = {
  present: "text-emerald-600",
  leave: "text-amber-600",
  absent: "text-red-600",
  holiday: "border-red-100 bg-red-50 text-red-700",
  task: "border-orange-100 bg-orange-50 text-orange-700",
  event: "border-blue-100 bg-blue-50 text-blue-700",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </section>
  );
}

function EventPill({ event, onDelete }: { event: EventItem; onDelete?: (id: string) => void }) {
  if (event.kind === "present" || event.kind === "leave" || event.kind === "absent") {
    return (
      <div className={`mt-2 text-[11px] font-semibold ${eventStyles[event.kind] ?? ""}`}>
        <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${
          event.kind === "present" ? "bg-emerald-500" :
          event.kind === "leave" ? "bg-yellow-400" : "bg-red-500"
        }`} />
        {event.title}
        <p className="ml-4 mt-0.5 font-normal text-slate-500">{event.time || event.sub}</p>
      </div>
    );
  }
  return (
    <div className={`mt-2 rounded-md border px-2 py-1.5 text-[11px] ${eventStyles[event.kind] ?? "border-slate-100 bg-slate-50 text-slate-700"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">{event.title}</span>
        {onDelete && event.id ? (
          <button
            onClick={e => { e.stopPropagation(); onDelete(event.id!); }}
            className="shrink-0 text-red-400 hover:text-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <MoreVertical className="h-3.5 w-3.5 shrink-0" />
        )}
      </div>
      {event.sub && <p className="mt-0.5 truncate text-slate-700">{event.sub}</p>}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CompanyCalendar() {
  const { isAdmin, isManager } = useAuth();
  const isManagerOrAdmin = isAdmin || isManager;

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [todayData, setTodayData] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(DEFAULT_ADD_FORM);
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [calView, setCalView] = useState<"month" | "week" | "day">("month");

  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "", country: "India" });
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [holidayLoading, setHolidayLoading] = useState(false);

  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([
    'attendance', 'leaves', 'tasks', 'holidays', 'events',
  ]);

  const toggleFilter = (f: string) => {
    setActiveFilters(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  const [pendingHolidays, setPendingHolidays] = useState<any[]>([]);
  const [allHolidaysForYear, setAllHolidaysForYear] = useState<any[]>([]);
  const [showPendingSheet, setShowPendingSheet] = useState(false);
  const [selectedHolidayIds, setSelectedHolidayIds] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    Promise.allSettled([leaveAPI.getBalance(), attendanceAPI.getToday()]).then(
      ([balRes, todayRes]) => {
        if (balRes.status === "fulfilled") setLeaveBalance(balRes.value as LeaveBalance);
        if (todayRes.status === "fulfilled") setTodayData(todayRes.value as TodayAttendance);
      }
    );
  }, []);

  useEffect(() => {
    loadCalendarData();
  }, [currentMonth, currentYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPendingHolidays = async () => {
    if (!isAdmin) return;
    try {
      const data = await calendarAPI.getHolidays(currentYear);
      const all = Array.isArray(data) ? data : [];
      setAllHolidaysForYear(all);
      setPendingHolidays(all.filter((h: any) => h.status === 'pending'));
    } catch (e) {
      console.error(e);
    }
  };

  const loadCalendarData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await calendarAPI.getEvents(currentMonth + 1, currentYear);
      setCalendarData(data as CalendarData);
      await loadPendingHolidays();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    if (calView !== "month") setSelectedDay(now.toISOString().split("T")[0]);
  };

  const handlePrev = () => {
    if (calView === "week") {
      const base = selectedDay ? new Date(selectedDay + "T00:00:00") : new Date();
      base.setDate(base.getDate() - 7);
      const s = base.toISOString().split("T")[0];
      setSelectedDay(s);
      setCurrentMonth(base.getMonth());
      setCurrentYear(base.getFullYear());
    } else if (calView === "day") {
      const base = selectedDay ? new Date(selectedDay + "T00:00:00") : new Date();
      base.setDate(base.getDate() - 1);
      const s = base.toISOString().split("T")[0];
      setSelectedDay(s);
      setCurrentMonth(base.getMonth());
      setCurrentYear(base.getFullYear());
    } else {
      handlePrevMonth();
    }
  };

  const handleNext = () => {
    if (calView === "week") {
      const base = selectedDay ? new Date(selectedDay + "T00:00:00") : new Date();
      base.setDate(base.getDate() + 7);
      const s = base.toISOString().split("T")[0];
      setSelectedDay(s);
      setCurrentMonth(base.getMonth());
      setCurrentYear(base.getFullYear());
    } else if (calView === "day") {
      const base = selectedDay ? new Date(selectedDay + "T00:00:00") : new Date();
      base.setDate(base.getDate() + 1);
      const s = base.toISOString().split("T")[0];
      setSelectedDay(s);
      setCurrentMonth(base.getMonth());
      setCurrentYear(base.getFullYear());
    } else {
      handleNextMonth();
    }
  };

  const handleAddEvent = async () => {
    if (!addForm.title.trim()) { setAddError("Title is required"); return; }
    if (!addForm.event_date) { setAddError("Date is required"); return; }
    setAddLoading(true);
    setAddError(null);
    try {
      await calendarAPI.createEvent({
        title:           addForm.title.trim(),
        event_date:      addForm.event_date,
        description:     addForm.description || undefined,
        event_type:      addForm.event_type,
        is_all_day:      addForm.is_all_day,
        start_time:      addForm.start_time || undefined,
        end_time:        addForm.end_time || undefined,
        is_company_wide: addForm.is_company_wide,
      });
      setShowAddModal(false);
      setAddForm(DEFAULT_ADD_FORM);
      await loadCalendarData();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setDeletingEventId(eventId);
    try {
      await calendarAPI.deleteEvent(eventId);
      await loadCalendarData();
    } catch (err) {
      console.error("Failed to delete event:", err);
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleAddHoliday = async () => {
    if (!holidayForm.name.trim() || !holidayForm.date) {
      setHolidayError("Name and date are required");
      return;
    }
    setHolidayLoading(true);
    setHolidayError(null);
    try {
      await calendarAPI.createHoliday(holidayForm);
      setShowHolidayModal(false);
      setHolidayForm({ name: "", date: "", country: "India" });
      await loadCalendarData();
    } catch (err: unknown) {
      setHolidayError(err instanceof Error ? err.message : "Failed to add holiday");
    } finally {
      setHolidayLoading(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const todayStr = new Date().toISOString().split("T")[0];

  const calendarCells = useMemo((): CalendarCell[] => {
    const firstDow = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const cells: CalendarCell[] = [];

    for (let i = 0; i < firstDow; i++) {
      cells.push({ day: 0, dateStr: "", isCurrentMonth: false, isWeekend: false, isToday: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(currentMonth + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      const dateStr = `${currentYear}-${mm}-${dd}`;
      const dow = new Date(currentYear, currentMonth, d).getDay();
      cells.push({ day: d, dateStr, isCurrentMonth: true, isWeekend: dow === 0 || dow === 6, isToday: dateStr === todayStr });
    }
    const target = cells.length <= 35 ? 35 : 42;
    while (cells.length < target) {
      cells.push({ day: 0, dateStr: "", isCurrentMonth: false, isWeekend: false, isToday: false });
    }
    return cells;
  }, [currentMonth, currentYear, todayStr]);

  const approvedHolidayDates = useMemo(
    () => (calendarData?.holidays || [])
      .filter(h => h.status === 'approved' || !h.status)
      .map(h => h.date),
    [calendarData]
  );

  const workingDays = useMemo(
    () => countWorkingDays(currentMonth, currentYear, approvedHolidayDates),
    [currentMonth, currentYear, approvedHolidayDates]
  );
  const presentDays = calendarData?.attendance.length ?? 0;
  const holidayCount = (calendarData?.holidays || [])
    .filter(h => h.status === 'approved' || !h.status)
    .length;

  const leaveDays = useMemo(() => {
    if (!calendarData?.leaves.length) return 0;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (calendarData.leaves.some(l => ds >= l.from_date && ds <= l.to_date)) count++;
    }
    return count;
  }, [calendarData, currentMonth, currentYear]);

  const attendancePct = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

  const elAccrued   = leaveBalance?.earned_leave_accrued ?? 0;
  const elCarried   = leaveBalance?.carried_forward ?? 0;
  const elUsed      = leaveBalance?.earned_leave_used ?? 0;
  const elAvailable = Math.max(0, elAccrued + elCarried - elUsed);
  const slUsed      = leaveBalance?.sick_leave_used ?? 0;
  const slAvailable = Math.max(0, 6 - slUsed);
  const clTotal     = leaveBalance?.casual_leave_total ?? 6;
  const clUsed      = leaveBalance?.casual_leave_used ?? 0;
  const clAvailable = Math.max(0, clTotal - clUsed);

  const upcomingHolidays = calendarData?.holidays
    .filter(h => h.date >= todayStr)
    .slice(0, 3) ?? [];

  const getEventsForDay = (dateStr: string): EventItem[] => {
    if (!calendarData) return [];
    const items: EventItem[] = [];

    // Holidays
    if (activeFilters.includes("holidays")) {
      const h = calendarData.holidays.find(x => x.date === dateStr);
      if (h) items.push({ kind: "holiday", title: h.name, sub: h.country });
    }

    // Company events
    if (activeFilters.includes("events")) {
      (calendarData.company_events ?? [])
        .filter(x => x.event_date === dateStr)
        .slice(0, 1)
        .forEach(e => items.push({ kind: "event", title: e.title, sub: "Company" }));
    }

    // Leaves
    if (activeFilters.includes("leaves")) {
      const l = calendarData.leaves.find(x => dateStr >= x.from_date && dateStr <= x.to_date);
      if (l) items.push({ kind: "leave", title: "On Leave", sub: l.type ? (LEAVE_TYPE_LABELS[l.type] ?? capitalize(l.type)) : undefined });
    }

    // Attendance
    if (activeFilters.includes("attendance")) {
      const a = calendarData.attendance.find(x => x.date === dateStr);
      if (a?.clock_in) items.push({
        kind: "present",
        title: a.status === "late" ? "Late" : "Present",
        time: formatTime(a.clock_in),
        rawHour: new Date(a.clock_in).getHours(),
      });
    }

    // Tasks
    if (activeFilters.includes("tasks")) {
      calendarData.tasks.filter(x => x.due_date === dateStr).slice(0, 1).forEach(t => {
        items.push({ kind: "task", title: t.title, sub: t.project_name });
      });
    }

    // Personal events — exclude those already shown as company_events
    if (activeFilters.includes("events")) {
      const companyIds = new Set((calendarData.company_events ?? []).map(e => e.id));
      calendarData.events
        .filter(x => x.event_date === dateStr && !companyIds.has(x.id))
        .slice(0, 1)
        .forEach(e => items.push({ kind: "event", title: e.title, sub: e.event_type ? capitalize(e.event_type) : undefined, id: e.id }));
    }

    // Team data
    if (activeFilters.includes("team") && calendarData.team_data) {
      calendarData.team_data.team_leaves
        .filter(x => dateStr >= x.from_date && dateStr <= x.to_date)
        .slice(0, 2)
        .forEach(tl => items.push({
          kind: "leave",
          title: `${tl.employee?.name || "Team"} on leave`,
          sub: tl.type ? (LEAVE_TYPE_LABELS[tl.type] ?? capitalize(tl.type)) : undefined,
        }));

      calendarData.team_data.team_attendance
        .filter(x => x.date === dateStr)
        .slice(0, 2)
        .forEach(ta => items.push({
          kind: "absent",
          title: `${ta.employee?.name || "Team"} — ${capitalize(ta.status)}`,
        }));
    }

    return items;
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  const weekDates = useMemo(() => {
    const base = selectedDay ? new Date(selectedDay + "T00:00:00") : new Date();
    const dow = base.getDay();
    // Sun(0) → 6 days back, Mon(1) → 0, Tue(2) → 1, etc.
    const daysFromMonday = (dow + 6) % 7;
    const monday = new Date(base);
    monday.setDate(base.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      // Use local date parts to avoid UTC offset flipping the date
      const dateStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-");
      return {
        dateStr,
        day: d.getDate(),
        label: d.toLocaleDateString("en-IN", { weekday: "short" }),
        isToday: dateStr === todayStr,
        month: d.getMonth(),
      };
    });
  }, [selectedDay, todayStr]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".month-picker-container")) setShowMonthPicker(false);
    };
    if (showMonthPicker) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showMonthPicker]);

  const periodLabel = useMemo(() => {
    if (calView === "week" && weekDates.length) {
      return `${fmtShortDate(weekDates[0].dateStr)} – ${fmtShortDate(weekDates[6].dateStr)}`;
    }
    if (calView === "day" && selectedDay) {
      return new Date(selectedDay + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long",
      });
    }
    return `${MONTHS[currentMonth]} ${currentYear}`;
  }, [calView, currentMonth, currentYear, weekDates, selectedDay]);

  const summaryCards = [
    ["Working Days", `${workingDays} Days`, CalendarDays, "text-emerald-600", "bg-emerald-50"],
    ["Holidays", `${holidayCount} Days`, CalendarCheck2, "text-red-600", "bg-red-50"],
    ["Weekly Off", "8 Days", CalendarDays, "text-slate-600", "bg-slate-100"],
    ["Leaves", `${leaveDays} Days`, CalendarDays, "text-amber-600", "bg-amber-50"],
    ["Attendance", loading ? "—" : `${attendancePct}%`, Clock3, "text-emerald-600", "bg-emerald-50"],
  ] as [string, string, typeof CalendarDays, string, string][];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-[#f8fafc]">
      <div className="w-full p-4 lg:p-5">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-slate-950">Workforce Calendar</h1>
            <p className="mt-1 text-[14px] text-slate-500">Plan, track and stay updated with your work schedule</p>
          </div>
          <div className="relative w-full sm:w-auto sm:min-w-[360px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-16 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Search anything..." readOnly />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">Ctrl + K</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[13px] font-medium text-red-700">{error}</p>
            <button onClick={loadCalendarData} className="ml-4 text-[12px] font-bold text-red-800 underline">Retry</button>
          </div>
        )}

        <div className={`mt-4 grid gap-3 ${isAdmin ? 'xl:grid-cols-[minmax(0,1fr)_300px]' : 'grid-cols-1'}`}>
          <main className="space-y-3">
            <Panel className="overflow-hidden">
              {/* Calendar controls */}
              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={handlePrev} className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={handleToday} className="h-10 rounded-md border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-900">Today</button>
                  <button onClick={handleNext} className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="month-picker-container relative">
                    <button
                      onClick={() => setShowMonthPicker(p => !p)}
                      className="ml-0 inline-flex h-10 items-center gap-3 rounded-md border border-slate-200 bg-white px-5 text-[18px] font-semibold text-slate-950 lg:ml-8"
                    >
                      {periodLabel}
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </button>

                    {showMonthPicker && calView === "month" && (
                      <div className="absolute left-0 top-12 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                        {/* Year selector */}
                        <div className="mb-3 flex items-center justify-between">
                          <button
                            onClick={() => setCurrentYear(y => y - 1)}
                            className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="text-[15px] font-semibold text-slate-950">{currentYear}</span>
                          <button
                            onClick={() => setCurrentYear(y => y + 1)}
                            className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Month grid */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {MONTHS.map((m, i) => (
                            <button
                              key={m}
                              onClick={() => { setCurrentMonth(i); setShowMonthPicker(false); }}
                              className={`rounded-lg py-2 text-[12px] font-semibold transition ${
                                i === currentMonth
                                  ? "bg-blue-600 text-white"
                                  : "text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {m.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
                    {["Month", "Week", "Day"].map((view) => (
                      <button
                        key={view}
                        onClick={() => {
                          setCalView(view.toLowerCase() as "month" | "week" | "day");
                          if (view !== "Month" && !selectedDay) setSelectedDay(todayStr);
                        }}
                        className={`h-8 rounded px-5 text-[13px] font-semibold transition ${calView === view.toLowerCase() ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                        {view}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowFilters(p => !p)}
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Filter className="h-4 w-4" />
                      Filters
                      {activeFilters.length < 5 && (
                        <span className="rounded-full bg-blue-600 px-1.5 text-[10px] text-white">
                          {activeFilters.length}
                        </span>
                      )}
                      <ChevronDown className="h-4 w-4" />
                    </button>

                    {showFilters && (
                      <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                        <p className="mb-2 text-[11px] font-bold uppercase text-slate-400">Show on calendar</p>
                        {([
                          ["attendance", "Attendance"],
                          ["leaves", "Leaves"],
                          ["tasks", "Task Deadlines"],
                          ["holidays", "Holidays"],
                          ["events", "My Events"],
                          ...(isManagerOrAdmin ? [["team", "Team Events"]] : []),
                        ] as [string, string][]).map(([key, label]) => (
                          <label key={key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={activeFilters.includes(key)}
                              onChange={() => toggleFilter(key)}
                              className="h-3.5 w-3.5 accent-blue-600"
                            />
                            <span className="text-[13px] text-slate-700">{label}</span>
                          </label>
                        ))}
                        <button
                          onClick={() => setActiveFilters(["attendance", "leaves", "tasks", "holidays", "events", "team"])}
                          className="mt-2 w-full rounded-md bg-slate-100 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-200"
                        >
                          Show All
                        </button>
                      </div>
                    )}
                  </div>
                  {isAdmin && pendingHolidays.length > 0 && (
                    <button
                      onClick={() => setShowPendingSheet(true)}
                      className="relative inline-flex h-10 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 text-[13px] font-semibold text-amber-700 hover:bg-amber-100"
                    >
                      <CalendarClock className="h-4 w-4" />
                      {pendingHolidays.length} Pending
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {pendingHolidays.length}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => { setAddForm(DEFAULT_ADD_FORM); setAddError(null); setShowAddModal(true); }}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-5 border-b border-slate-200 px-4 py-4 text-[13px] text-slate-700">
                {legend.map(([label, color]) => (
                  <span key={label} className="inline-flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-sm ${color}`} />
                    {label}
                  </span>
                ))}
              </div>

              {/* ── MONTH VIEW ──────────────────────────────────────── */}
              {calView === "month" && (
                <div className="overflow-x-auto">
                  <div className="w-full inline-block">
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-white">
                      {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                        <div key={day} className="px-4 py-3 text-center text-[12px] font-semibold text-slate-900">{day}</div>
                      ))}
                    </div>
                    {loading ? (
                      <div className="grid grid-cols-7">
                        {Array.from({ length: 35 }).map((_, i) => (
                          <div key={i} className="min-h-[126px] animate-pulse border-b border-r border-slate-200 bg-slate-50" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-7">
                        {calendarCells.map((cell, index) => {
                          if (!cell.isCurrentMonth) {
                            return <div key={`empty-${index}`} className="min-h-[126px] border-b border-r border-slate-200 bg-slate-50/30" />;
                          }
                          const dayEvents = getEventsForDay(cell.dateStr);
                          const hasHoliday = dayEvents.some(e => e.kind === "holiday");
                          const isSelected = selectedDay === cell.dateStr;
                          return (
                            <div
                              key={cell.dateStr}
                              onClick={() => setSelectedDay(isSelected ? null : cell.dateStr)}
                              className={`cursor-pointer min-h-[126px] border-b border-r border-slate-200 p-3 transition-colors ${
                                isSelected ? "bg-blue-50 ring-1 ring-inset ring-blue-300" :
                                hasHoliday ? "bg-red-500 text-white" :
                                cell.isWeekend ? "bg-slate-50 hover:bg-slate-100" :
                                "bg-white hover:bg-blue-50/30"
                              }`}
                            >
                              <div className={`text-[16px] font-semibold ${
                                cell.isToday ? "flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-[14px]" :
                                hasHoliday ? "text-white" :
                                cell.isWeekend ? "text-red-600" : "text-slate-950"
                              }`}>
                                {cell.day}
                              </div>
                              {cell.isWeekend && !hasHoliday && (
                                <p className="mt-2 text-[12px] text-slate-600">Weekend</p>
                              )}
                              {dayEvents.slice(0, 2).map((event, i) => (
                                <EventPill key={i} event={event} onDelete={event.id ? handleDeleteEvent : undefined} />
                              ))}
                              {dayEvents.length > 2 && (
                                <p className="mt-1 text-[10px] text-slate-500">+{dayEvents.length - 2} more</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── WEEK VIEW ───────────────────────────────────────── */}
              {calView === "week" && (
                <div className="overflow-x-auto">
                  <div className="min-w-[700px]">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 border-b border-slate-200">
                      {weekDates.map(wd => (
                        <div key={wd.dateStr} className={`px-3 py-3 text-center ${wd.isToday ? "bg-blue-50" : "bg-white"}`}>
                          <p className="text-[11px] font-semibold uppercase text-slate-500">{wd.label}</p>
                          <span className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-semibold ${wd.isToday ? "bg-blue-600 text-white" : "text-slate-950"}`}>
                            {wd.day}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Events row */}
                    {loading ? (
                      <div className="grid grid-cols-7">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <div key={i} className="min-h-[180px] animate-pulse border-r border-b border-slate-200 bg-slate-50" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-7">
                        {weekDates.map(wd => {
                          const events = getEventsForDay(wd.dateStr);
                          return (
                            <div
                              key={wd.dateStr}
                              onClick={() => setSelectedDay(wd.dateStr === selectedDay ? null : wd.dateStr)}
                              className={`min-h-[180px] cursor-pointer border-r border-b border-slate-200 p-2 hover:bg-slate-50 ${
                                wd.dateStr === selectedDay ? "bg-blue-50/60 ring-1 ring-inset ring-blue-300" :
                                wd.isToday ? "bg-blue-50/40" : ""
                              }`}
                            >
                              {events.length === 0 ? (
                                <p className="mt-2 text-[11px] text-slate-300">No events</p>
                              ) : events.map((ev, i) => (
                                <EventPill key={i} event={ev} onDelete={ev.id ? handleDeleteEvent : undefined} />
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── DAY VIEW ────────────────────────────────────────── */}
              {calView === "day" && (() => {
                const dayStr     = selectedDay || todayStr;
                const dayEvents  = getEventsForDay(dayStr);
                const allDayEvts = dayEvents.filter(e => e.kind === "holiday" || e.kind === "leave");
                const timedEvts  = dayEvents.filter(e => e.kind !== "holiday" && e.kind !== "leave");
                const hours      = Array.from({ length: 24 }, (_, i) => i);
                return (
                  <div className="overflow-y-auto max-h-[600px]">
                    {/* All-day row */}
                    {allDayEvts.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
                        <span className="text-[11px] font-semibold text-slate-500 mr-1">ALL DAY</span>
                        {allDayEvts.map((ev, i) => <EventPill key={i} event={ev} />)}
                      </div>
                    )}
                    {/* Hourly slots */}
                    {hours.map(hour => {
                      const slotEvents = timedEvts.filter(e =>
                        e.rawHour === hour ||
                        (e.rawHour === undefined && e.kind === "present" && hour === 9)
                      );
                      return (
                        <div key={hour} className="grid grid-cols-[64px_1fr] border-b border-slate-100">
                          <div className="py-3 pr-3 text-right text-[11px] text-slate-400 shrink-0">
                            {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                          </div>
                          <div className={`min-h-[50px] border-l border-slate-200 py-1 pl-2 ${hour >= 9 && hour <= 18 ? "bg-white" : "bg-slate-50/50"}`}>
                            {slotEvents.map((ev, i) => <EventPill key={i} event={ev} onDelete={ev.id ? handleDeleteEvent : undefined} />)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </Panel>

            {/* Day Detail Panel */}
            {selectedDay && (
              <Panel className="p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-semibold text-slate-950">
                    {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-IN", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric",
                    })}
                  </h2>
                  <button onClick={() => setSelectedDay(null)}>
                    <X className="h-5 w-5 text-slate-400" />
                  </button>
                </div>

                {selectedDayEvents.length === 0 ? (
                  <p className="mt-4 text-[13px] text-slate-400">Nothing scheduled for this day</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {selectedDayEvents.map((event, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                        <span className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${
                          event.kind === "present" ? "bg-emerald-500" :
                          event.kind === "leave"   ? "bg-yellow-400" :
                          event.kind === "absent"  ? "bg-red-500" :
                          event.kind === "holiday" ? "bg-rose-500" :
                          event.kind === "task"    ? "bg-orange-500" : "bg-blue-600"
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-slate-900">{event.title}</p>
                          {event.sub  && <p className="mt-0.5 text-[12px] text-slate-500">{event.sub}</p>}
                          {event.time && <p className="mt-0.5 text-[12px] text-slate-500">{event.time}</p>}
                        </div>
                        {event.id && (
                          <button
                            onClick={() => handleDeleteEvent(event.id!)}
                            disabled={deletingEventId === event.id}
                            className="shrink-0 text-red-400 hover:text-red-600 disabled:opacity-40"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setAddForm({ ...DEFAULT_ADD_FORM, event_date: selectedDay });
                    setAddError(null);
                    setShowAddModal(true);
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2 text-[12px] font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600"
                >
                  <Plus className="h-3.5 w-3.5" /> Add event for this day
                </button>
              </Panel>
            )}

            {/* Summary cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {summaryCards.map((card) => {
                const label = card[0] as string;
                const value = card[1] as string;
                const Icon  = card[2] as typeof CalendarDays;
                const color = card[3] as string;
                const bg    = card[4] as string;
                return (
                  <Panel key={label} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-md ${bg} ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[12px] text-slate-500">{label}</p>
                        <p className="mt-1 text-[15px] font-semibold text-slate-950">{value}</p>
                      </div>
                    </div>
                  </Panel>
                );
              })}
            </div>

            {/* Non-admin info panels — horizontal row below calendar */}
            {!isAdmin && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Upcoming Holidays */}
                <Panel className="p-4">
                  <h2 className="mb-3 text-[14px] font-semibold text-slate-950">Upcoming Holidays</h2>
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <div key={i} className="h-8 animate-pulse rounded bg-slate-100" />)}
                    </div>
                  ) : upcomingHolidays.length === 0 ? (
                    <p className="text-[12px] text-slate-500">No upcoming holidays this month</p>
                  ) : upcomingHolidays.map(h => (
                    <div key={h.id} className="mb-2">
                      <p className="text-[13px] font-semibold text-slate-950">{h.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short', day: 'numeric', month: 'short',
                        })}
                      </p>
                    </div>
                  ))}
                </Panel>

                {/* Upcoming Tasks */}
                <Panel className="p-4">
                  <h2 className="mb-3 text-[14px] font-semibold text-slate-950">Upcoming Tasks</h2>
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2].map(i => <div key={i} className="h-8 animate-pulse rounded bg-slate-100" />)}
                    </div>
                  ) : !calendarData || calendarData.tasks.length === 0 ? (
                    <p className="text-[12px] text-slate-500">No tasks due this month</p>
                  ) : calendarData.tasks.slice(0, 3).map(t => (
                    <div key={t.id} className="mb-2">
                      <p className="truncate text-[13px] font-semibold text-slate-950">{t.title}</p>
                      <p className="text-[11px] text-slate-500">Due: {fmtShortDate(t.due_date)}</p>
                    </div>
                  ))}
                </Panel>

                {/* Leave Balance */}
                <Panel className="p-4">
                  <h2 className="mb-3 text-[14px] font-semibold text-slate-950">Leave Balance</h2>
                  <div className="space-y-2">
                    {([
                      ['EL', elAvailable, elAccrued + elCarried, 'bg-emerald-500'],
                      ['SL', slAvailable, 6,                     'bg-yellow-400'],
                      ['CL', clAvailable, clTotal || 6,          'bg-blue-500'],
                    ] as [string, number, number, string][]).map(([name, avail, total, color]) => (
                      <div key={name}>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600">{name}</span>
                          <span className="font-semibold text-slate-900">{avail}/{total}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${color}`}
                            style={{ width: `${Math.min(100, total > 0 ? (avail / total) * 100 : 0)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>

                {/* Today's Summary */}
                <Panel className="p-4">
                  <h2 className="mb-3 text-[14px] font-semibold text-slate-950">Today's Summary</h2>
                  <div className="space-y-2 text-[13px]">
                    {([
                      [
                        'Clock In',
                        todayData?.clock_in ? formatTime(todayData.clock_in) : 'Not checked in',
                        todayData?.clock_in ? 'text-slate-900' : 'text-slate-400',
                      ],
                      [
                        'Status',
                        todayData?.status ? capitalize(todayData.status) : 'Not started',
                        todayData?.status === 'present' ? 'text-emerald-600' : todayData?.status === 'late' ? 'text-orange-600' : 'text-slate-500',
                      ],
                      [
                        'Work Hrs',
                        todayData?.hours_worked ? formatHours(todayData.hours_worked) : '—',
                        'text-slate-900',
                      ],
                    ] as [string, string, string][]).map(([label, value, tone]) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span className={`h-2 w-2 rounded-full ${todayData?.clock_in ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          {label}
                        </span>
                        <span className={`font-semibold ${tone}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            )}

            {/* Manager: Team This Month — full-width panel below the 4 panels */}
            {isManagerOrAdmin && !isAdmin && calendarData?.team_data && (
              <Panel className="mt-3 p-4">
                <h2 className="mb-3 text-[15px] font-semibold text-slate-950">Team This Month</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-3 text-center">
                    <p className="text-[24px] font-semibold text-slate-950">
                      {calendarData.team_data.team_members.length}
                    </p>
                    <p className="text-[12px] text-slate-500">Team Size</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 text-center">
                    <p className="text-[24px] font-semibold text-amber-700">
                      {new Set(calendarData.team_data.team_leaves.map(l => l.employee?.id)).size}
                    </p>
                    <p className="text-[12px] text-slate-500">On Leave</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 text-center">
                    <p className="text-[24px] font-semibold text-red-700">
                      {calendarData.team_data.team_attendance.length}
                    </p>
                    <p className="text-[12px] text-slate-500">Late / Absent</p>
                  </div>
                </div>
                {calendarData.team_data.team_leaves.length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="mb-2 text-[12px] font-semibold text-slate-600">Members on leave:</p>
                    <div className="flex flex-wrap gap-2">
                      {calendarData.team_data.team_leaves.slice(0, 5).map(tl => (
                        <span key={tl.id} className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">
                          {tl.employee?.name || '—'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            )}
          </main>

          {isAdmin && (
            <aside className="space-y-3">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-950">Holidays {currentYear}</h2>
                <button
                  onClick={() => { setShowHolidayModal(true); setHolidayError(null); }}
                  className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-rose-700"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>

              {/* Pending banner */}
              {pendingHolidays.length > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <span className="text-[12px] font-semibold text-amber-700">
                    ⏳ {pendingHolidays.length} awaiting approval
                  </span>
                  <button
                    onClick={async () => {
                      setApproving(true);
                      try {
                        await calendarAPI.bulkApproveHolidays({
                          ids: pendingHolidays.map((h: any) => h.id),
                          action: 'approve',
                        });
                        await loadCalendarData();
                        await loadPendingHolidays();
                      } catch (e) { console.error(e); }
                      finally { setApproving(false); }
                    }}
                    disabled={approving}
                    className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {approving ? '...' : 'Approve All'}
                  </button>
                </div>
              )}

              {/* Full holiday list — always visible */}
              <div className="max-h-[calc(100vh-200px)] space-y-3 overflow-y-auto pr-1">
                {allHolidaysForYear.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                    <p className="text-[13px] text-slate-400">No holidays for {currentYear}</p>
                    <button
                      onClick={() => { setShowHolidayModal(true); setHolidayError(null); }}
                      className="mt-2 text-[12px] font-semibold text-rose-600 hover:text-rose-700"
                    >
                      + Add first holiday
                    </button>
                  </div>
                ) : (
                  Object.entries(
                    allHolidaysForYear.reduce((acc: Record<string, any[]>, h: any) => {
                      const m = new Date(h.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long' });
                      if (!acc[m]) acc[m] = [];
                      acc[m].push(h);
                      return acc;
                    }, {})
                  ).map(([month, mHolidays]) => (
                    <div key={month}>
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{month}</p>
                      <div className="space-y-2">
                        {(mHolidays as any[]).map((h: any) => {
                          const d = new Date(h.date + 'T00:00:00');
                          const isPending = h.status === 'pending';
                          const isApproved = h.status === 'approved';
                          const isRejected = h.status === 'rejected';
                          return (
                            <div
                              key={h.id}
                              className={`rounded-xl border p-3 ${
                                isPending
                                  ? 'border-amber-200 bg-amber-50'
                                  : isApproved
                                  ? 'border-emerald-100 bg-white'
                                  : 'border-red-100 bg-red-50'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg ${
                                  isPending ? 'bg-amber-200' : isApproved ? 'bg-rose-100' : 'bg-red-200'
                                }`}>
                                  <span className={`text-[15px] font-bold leading-none ${
                                    isPending ? 'text-amber-800' : isApproved ? 'text-rose-700' : 'text-red-800'
                                  }`}>
                                    {d.getDate()}
                                  </span>
                                  <span className={`text-[9px] font-semibold uppercase ${
                                    isPending ? 'text-amber-600' : isApproved ? 'text-rose-500' : 'text-red-600'
                                  }`}>
                                    {d.toLocaleDateString('en-IN', { month: 'short' })}
                                  </span>
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-semibold text-slate-900">{h.name}</p>
                                  <div className="mt-0.5 flex items-center gap-1.5">
                                    <span className={`text-[10px] font-bold ${
                                      isPending ? 'text-amber-600' : isApproved ? 'text-emerald-600' : 'text-red-500'
                                    }`}>
                                      {isPending ? '⏳ Pending' : isApproved ? '✓ Approved' : '✗ Rejected'}
                                    </span>
                                    <span className="text-[10px] text-slate-300">·</span>
                                    <span className="text-[10px] text-slate-400">
                                      {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={async () => {
                                    try {
                                      await calendarAPI.deleteHoliday(h.id);
                                      await loadCalendarData();
                                      await loadPendingHolidays();
                                    } catch (e) { console.error(e); }
                                  }}
                                  className="shrink-0 text-slate-300 transition hover:text-red-500"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {isPending && (
                                <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-amber-200 pt-2.5">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await calendarAPI.approveHoliday(h.id, { action: 'approve' });
                                        await loadCalendarData();
                                        await loadPendingHolidays();
                                      } catch (e) { console.error(e); }
                                    }}
                                    className="rounded-lg bg-emerald-600 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await calendarAPI.approveHoliday(h.id, { action: 'reject' });
                                        await loadPendingHolidays();
                                      } catch (e) { console.error(e); }
                                    }}
                                    className="rounded-lg border border-red-200 bg-white py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-50"
                                  >
                                    ✗ Reject
                                  </button>
                                </div>
                              )}

                              {isRejected && (
                                <div className="mt-2 border-t border-red-100 pt-2">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await calendarAPI.approveHoliday(h.id, { action: 'approve' });
                                        await loadCalendarData();
                                        await loadPendingHolidays();
                                      } catch (e) { console.error(e); }
                                    }}
                                    className="w-full rounded-lg border border-emerald-200 bg-white py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                                  >
                                    ↩ Re-approve
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Panel className="w-full max-w-[480px] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-slate-950">Add Event</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[12px] font-bold text-slate-700">Title *</label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Event title"
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-700">Date *</label>
                <input
                  type="date"
                  value={addForm.event_date}
                  onChange={e => setAddForm(f => ({ ...f, event_date: e.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-700">Event Type</label>
                <select
                  value={addForm.event_type}
                  onChange={e => setAddForm(f => ({ ...f, event_type: e.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500"
                >
                  <option value="personal">Personal</option>
                  <option value="meeting">Meeting</option>
                  <option value="reminder">Reminder</option>
                  <option value="deadline">Deadline</option>
                  <option value="team">Team</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-bold text-slate-700">Start Time</label>
                  <input
                    type="time"
                    value={addForm.start_time}
                    onChange={e => setAddForm(f => ({ ...f, start_time: e.target.value }))}
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-slate-700">End Time</label>
                  <input
                    type="time"
                    value={addForm.end_time}
                    onChange={e => setAddForm(f => ({ ...f, end_time: e.target.value }))}
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-700">Description</label>
                <textarea
                  value={addForm.description}
                  onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={2}
                  className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 text-[13px] text-slate-700">
                <input
                  type="checkbox"
                  checked={addForm.is_all_day}
                  onChange={e => setAddForm(f => ({ ...f, is_all_day: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                />
                All day event
              </label>

              {isManagerOrAdmin && (
                <label className="flex items-center gap-2 text-[13px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={addForm.is_company_wide}
                    onChange={e => setAddForm(f => ({ ...f, is_company_wide: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                  />
                  Visible to entire team
                </label>
              )}
            </div>

            {addError && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600">{addError}</p>
            )}

            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                disabled={addLoading || !addForm.title.trim() || !addForm.event_date}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-[13px] font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {addLoading ? "Saving..." : "Add Event"}
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* Add Holiday Modal (admin only) */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Panel className="w-full max-w-[400px] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-slate-950">Add Holiday</h2>
              <button onClick={() => setShowHolidayModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[12px] font-bold text-slate-700">Holiday Name *</label>
                <input
                  value={holidayForm.name}
                  onChange={e => setHolidayForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Diwali"
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[12px] font-bold text-slate-700">Date *</label>
                <input
                  type="date"
                  value={holidayForm.date}
                  onChange={e => setHolidayForm(f => ({ ...f, date: e.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[12px] font-bold text-slate-700">Country / Type</label>
                <select
                  value={holidayForm.country}
                  onChange={e => setHolidayForm(f => ({ ...f, country: e.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500"
                >
                  <option value="India">India (National)</option>
                  <option value="Regional">Regional</option>
                  <option value="Company">Company Holiday</option>
                  <option value="Optional">Optional Holiday</option>
                </select>
              </div>
            </div>
            {holidayError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600">{holidayError}</p>
            )}
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowHolidayModal(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleAddHoliday}
                disabled={holidayLoading || !holidayForm.name.trim() || !holidayForm.date}
                className="flex-1 rounded-lg bg-rose-600 py-2 text-[13px] font-bold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {holidayLoading ? "Adding..." : "Add Holiday"}
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* Pending Holidays Side Sheet */}
      {showPendingSheet && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-slate-900/40"
            onClick={() => setShowPendingSheet(false)}
          />

          {/* Sheet */}
          <aside className="flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl">
            {/* Sheet header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-[16px] font-semibold text-slate-950">Pending Holidays</h2>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  Review and approve holidays before they appear on everyone's calendar
                </p>
              </div>
              <button onClick={() => setShowPendingSheet(false)}>
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Bulk actions bar */}
            {selectedHolidayIds.length > 0 && (
              <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-5 py-3">
                <span className="text-[13px] font-semibold text-amber-700">
                  {selectedHolidayIds.length} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setApproving(true);
                      try {
                        await calendarAPI.bulkApproveHolidays({ ids: selectedHolidayIds, action: 'approve' });
                        setSelectedHolidayIds([]);
                        await loadCalendarData();
                        await loadPendingHolidays();
                      } catch (e) { console.error(e); }
                      finally { setApproving(false); }
                    }}
                    disabled={approving}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {approving ? 'Approving...' : '✓ Approve All'}
                  </button>
                  <button
                    onClick={async () => {
                      setApproving(true);
                      try {
                        await calendarAPI.bulkApproveHolidays({ ids: selectedHolidayIds, action: 'reject' });
                        setSelectedHolidayIds([]);
                        await loadPendingHolidays();
                      } catch (e) { console.error(e); }
                      finally { setApproving(false); }
                    }}
                    disabled={approving}
                    className="rounded-lg bg-red-100 px-3 py-1.5 text-[12px] font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50"
                  >
                    ✗ Reject All
                  </button>
                </div>
              </div>
            )}

            {/* Select all bar */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-2">
              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-600">
                <input
                  type="checkbox"
                  checked={selectedHolidayIds.length === pendingHolidays.length && pendingHolidays.length > 0}
                  onChange={e => setSelectedHolidayIds(e.target.checked ? pendingHolidays.map((h: any) => h.id) : [])}
                  className="h-4 w-4 accent-blue-600"
                />
                Select all ({pendingHolidays.length})
              </label>
              <span className="text-[11px] text-slate-400">Pending approval</span>
            </div>

            {/* Holiday list */}
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {pendingHolidays.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 text-4xl">🎉</div>
                  <p className="text-[14px] font-semibold text-slate-700">All caught up!</p>
                  <p className="mt-1 text-[12px] text-slate-400">No pending holidays to approve</p>
                </div>
              ) : pendingHolidays.map((h: any) => {
                const d = new Date(h.date + 'T00:00:00');
                const isSelected = selectedHolidayIds.includes(h.id);
                const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                return (
                  <div
                    key={h.id}
                    className={`rounded-xl border p-4 transition ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => setSelectedHolidayIds(prev =>
                          e.target.checked ? [...prev, h.id] : prev.filter((x: string) => x !== h.id)
                        )}
                        className="mt-1 h-4 w-4 accent-blue-600"
                      />
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-amber-50">
                        <span className="text-[18px] font-bold leading-none text-amber-700">{d.getDate()}</span>
                        <span className="text-[10px] font-semibold uppercase text-amber-500">{MONTHS_SHORT[d.getMonth()]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-slate-950">{h.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {h.country || 'India'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </span>
                        </div>
                        {h.creator?.name && (
                          <p className="mt-1 text-[11px] text-slate-400">Added by {h.creator.name}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                      <button
                        onClick={async () => {
                          try {
                            await calendarAPI.approveHoliday(h.id, { action: 'approve' });
                            await loadCalendarData();
                            await loadPendingHolidays();
                          } catch (e) { console.error(e); }
                        }}
                        className="flex-1 rounded-lg bg-emerald-600 py-2 text-[12px] font-semibold text-white hover:bg-emerald-700"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await calendarAPI.approveHoliday(h.id, { action: 'reject' });
                            await loadPendingHolidays();
                          } catch (e) { console.error(e); }
                        }}
                        className="flex-1 rounded-lg border border-red-200 bg-red-50 py-2 text-[12px] font-semibold text-red-700 hover:bg-red-100"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sheet footer */}
            <div className="border-t border-slate-200 px-5 py-4">
              <p className="text-[12px] text-slate-500">
                Approved holidays will immediately appear on all employees' calendars.
                Rejected holidays are hidden but not deleted.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
