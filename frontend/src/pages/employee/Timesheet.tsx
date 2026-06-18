import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { timesheetAPI, projectAPI, taskAPI, attendanceAPI } from "../../lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
interface DailyEntry { startTime: string; endTime: string; }
interface Row {
  localId: string; existingId: string; projectId: string; projectName: string;
  task: string; taskId: string; description: string;
  dailyHours: Record<DayKey, DailyEntry>;
}
interface Project { id: string; name: string; }
interface Task { id: string; title: string; status: string; priority: string; }
interface TimesheetEntry {
  id: string; date: string; project_id?: string; task_id?: string;
  start_time?: string; end_time?: string; hours_worked: number; description?: string;
}
interface Timesheet {
  id: string; week_start: string; week_end: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  total_hours: number; submitted_at?: string; reviewed_at?: string;
  review_note?: string; entries?: TimesheetEntry[];
}
interface WeekDay {
  isoDate: string; key: DayKey; label: string; shortDateLabel: string; isWeekend: boolean;
}
interface StatusState { message: string; isError: boolean; }

// ─── Constants ─────────────────────────────────────────────────────────────

const TARGET_WEEKLY_HOURS = 40;
const MAX_DAILY_HOURS = 8;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const weekdayFields: [DayKey, string][] = [
  ["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"],
  ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"],
];

// ─── Utilities ─────────────────────────────────────────────────────────────

function createStatusState(message = "", isError = false): StatusState {
  return { message, isError };
}
function createLocalId(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function createEmptyDailyHours(): Record<DayKey, DailyEntry> {
  return Object.fromEntries(weekdayFields.map(([k]) => [k, { startTime: "", endTime: "" }])) as Record<DayKey, DailyEntry>;
}
function createBlankEntryRow(): Row {
  return { localId: createLocalId(), existingId: "", projectId: "", projectName: "", task: "", taskId: "", description: "", dailyHours: createEmptyDailyHours() };
}
function parseTimeString(timeStr: string): number | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  const d = new Date(); d.setHours(hours, minutes, 0, 0); return d.getTime();
}
function getDayHours(dayData: DailyEntry | undefined): number {
  if (!dayData) return 0;
  const s = parseTimeString(dayData.startTime), e = parseTimeString(dayData.endTime);
  if (s && e && e > s) return (e - s) / (1000 * 60 * 60);
  return 0;
}
function getDailyHoursTotal(dailyHours: Record<DayKey, DailyEntry>): number {
  return weekdayFields.reduce((sum, [k]) => sum + getDayHours(dailyHours?.[k]), 0);
}
function formatHoursClock(hours: number): string {
  const h = Math.floor(hours), m = Math.round((hours - h) * 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

function getWeekStartDateOnly(input?: string | Date): string {
  const date = input
    ? (typeof input === "string" ? new Date(input.length === 10 ? input + "T00:00:00" : input) : input)
    : new Date();
  const dow = date.getDay(), diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(date); mon.setDate(date.getDate() + diff);
  return mon.toISOString().split("T")[0];
}
function addDaysToDateOnly(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
function buildWeekDates(weekStartStr: string): WeekDay[] {
  if (!weekStartStr) return [];
  const start = new Date(weekStartStr + "T00:00:00");
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const keys: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const iso = d.toISOString().split("T")[0], parts = iso.split("-");
    // Change 2: format "26 May" instead of "05/26"
    const shortDateLabel = `${parseInt(parts[2])} ${MONTHS[parseInt(parts[1]) - 1]}`;
    return { isoDate: iso, key: keys[i], label: labels[i], shortDateLabel, isWeekend: i >= 5 };
  });
}
function isBlankRow(row: Row): boolean {
  return !row.projectId && !String(row.task || "").trim() && !String(row.description || "").trim() && getDailyHoursTotal(row.dailyHours) <= 0;
}
function normalizeProjectLookupKey(value: string): string {
  return String(value || "").trim().toLowerCase();
}

// ─── Small components ───────────────────────────────────────────────────────

function Icon({ path, className = "h-4 w-4", strokeWidth = 1.8 }: { path: string; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}
function SelectChevron() {
  return (
    <svg className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-600" aria-hidden="true" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
    </svg>
  );
}
function SummaryStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="min-w-[120px]">
      <p className="text-[0.95rem] font-medium text-slate-500">{label}</p>
      <div className="mt-2 flex items-center gap-2 text-[1.4rem] font-semibold text-slate-950">
        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
        <span>{value}</span>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

function EmployeeTimesheetsPage() {
  const navigate = useNavigate();
  // Live attendance tracking refs (avoid stale closures in setInterval)
  const activeClockInRef = useRef<string | null>(null);
  const todayDateRef = useRef<string>("");
  const selectedWeekStartRef = useRef<string>("");
  const prevMinuteRef = useRef<number>(-1);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTasksMap, setProjectTasksMap] = useState<Record<string, Task[]>>({});
  const [myTimesheets, setMyTimesheets] = useState<Timesheet[]>([]);
  const [attendanceByDate, setAttendanceByDate] = useState<Record<string, number>>({});
  const [selectedWeekStart, setSelectedWeekStart] = useState("");
  const [weekRows, setWeekRows] = useState<Row[]>(() => [createBlankEntryRow()]);
  const [pageStatus, setPageStatus] = useState<StatusState>(() => createStatusState());
  const [busyAction, setBusyAction] = useState("");
  const [currentTimesheetStatus, setCurrentTimesheetStatus] = useState("draft");
  const [reviewNote, setReviewNote] = useState("");
  // Change 6: last-saved tracking
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastSavedLabel, setLastSavedLabel] = useState("");
  const [history, setHistory] = useState<Timesheet[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const currentWeekStart = useMemo(() => getWeekStartDateOnly(), []);

  useEffect(() => {
    timesheetAPI.getMy()
      .then(d => setHistory(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  // Change 6: update "last saved" label every minute
  useEffect(() => {
    if (!lastSaved) { setLastSavedLabel(""); return; }
    const update = () => {
      const diffMins = Math.floor((Date.now() - lastSaved.getTime()) / 60000);
      if (diffMins < 1) setLastSavedLabel("just now");
      else if (diffMins === 1) setLastSavedLabel("1 min ago");
      else setLastSavedLabel(`${diffMins} mins ago`);
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [lastSaved]);

  // Keep ref in sync so the live timer always sees the latest selected week
  useEffect(() => { selectedWeekStartRef.current = selectedWeekStart; }, [selectedWeekStart]);

  // Live timer: updates attendance row every second; updates timesheet end_time every new minute
  useEffect(() => {
    const tick = () => {
      if (!activeClockInRef.current || !todayDateRef.current) return;

      const now = new Date();
      const elapsed = (now.getTime() - new Date(activeClockInRef.current).getTime()) / (1000 * 60 * 60);

      // Always push live elapsed hours into the attendance row
      setAttendanceByDate(prev => ({ ...prev, [todayDateRef.current]: elapsed }));

      // Only update timesheet time inputs when the minute actually changes
      const currentMinute = now.getHours() * 60 + now.getMinutes();
      if (currentMinute === prevMinuteRef.current) return;
      prevMinuteRef.current = currentMinute;

      const weekStartStr = selectedWeekStartRef.current;
      if (!weekStartStr) return;
      const ws = new Date(weekStartStr + "T00:00:00");
      const td = new Date(todayDateRef.current + "T00:00:00");
      const diff = Math.round((td.getTime() - ws.getTime()) / 86400000);
      if (diff < 0 || diff > 6) return; // today not in the selected week
      const todayKey = weekdayFields[diff]?.[0];
      if (!todayKey) return;

      const cin = new Date(activeClockInRef.current);
      const startTime = `${String(cin.getHours()).padStart(2, "0")}:${String(cin.getMinutes()).padStart(2, "0")}`;
      const endTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      setWeekRows(rows => {
        if (!rows.length) return rows;
        const first = rows[0];
        const slot = first.dailyHours[todayKey];
        if (slot?.startTime === startTime && slot?.endTime === endTime) return rows; // no change
        return [
          { ...first, dailyHours: { ...first.dailyHours, [todayKey]: { startTime, endTime } } },
          ...rows.slice(1),
        ];
      });
    };

    tick(); // run immediately on mount
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []); // empty deps — all fresh values come from refs

  // Load projects, history, and today's clock-in on mount
  useEffect(() => {
    (async () => {
      const [projR, tsR, todayR] = await Promise.allSettled([
        projectAPI.getMy(),
        timesheetAPI.getMy(),
        attendanceAPI.getToday(),
      ]);
      if (projR.status === "fulfilled") setProjects((projR.value as Project[]) ?? []);
      if (tsR.status === "fulfilled") setMyTimesheets((tsR.value as Timesheet[]) ?? []);
      if (todayR.status === "fulfilled" && todayR.value) {
        const rec = todayR.value as { clock_in?: string; clock_out?: string; date?: string };
        if (rec.clock_in && !rec.clock_out) {
          activeClockInRef.current = rec.clock_in;
          todayDateRef.current = rec.date ?? new Date().toISOString().split("T")[0];
        }
      }
    })();
  }, []);

  // Initialize week selection
  useEffect(() => {
    if (!selectedWeekStart) setSelectedWeekStart(currentWeekStart);
  }, [currentWeekStart, selectedWeekStart]);

  // Load week-specific data when week changes
  useEffect(() => {
    if (!selectedWeekStart) return;
    (async () => {
      const currentMon = new Date(currentWeekStart + "T00:00:00");
      const selMon = new Date(selectedWeekStart + "T00:00:00");
      const diffWeeks = Math.round((currentMon.getTime() - selMon.getTime()) / (7 * 86400000));

      const [tsR, attR] = await Promise.allSettled([
        timesheetAPI.getWeekly(selectedWeekStart),
        attendanceAPI.getWeeklyStats(diffWeeks),
      ]);

      if (tsR.status === "fulfilled" && tsR.value) {
        const ts = tsR.value as Timesheet;
        setCurrentTimesheetStatus(ts.status);
        setReviewNote(ts.review_note ?? "");
        buildRowsFromTimesheet(ts);
      } else {
        setCurrentTimesheetStatus("draft"); setReviewNote("");
        setWeekRows([createBlankEntryRow()]);
      }

      // Change 3: auto-fill first row from attendance if time slots are empty
      if (attR.status === "fulfilled" && attR.value?.days) {
        const newAtt: Record<string, number> = {};
        (attR.value.days as { date: string; hours: number }[]).forEach((d) => { newAtt[d.date] = d.hours; });
        setAttendanceByDate(newAtt);

        const wd = buildWeekDates(selectedWeekStart);
        setWeekRows((currentRows) => {
          if (!currentRows.length) return currentRows;
          const firstRow = currentRows[0];
          const newDaily = { ...firstRow.dailyHours };
          let changed = false;
          wd.forEach((day) => {
            if (day.isWeekend) return;
            const hrs = newAtt[day.isoDate] ?? 0;
            if (hrs <= 0) return;
            const slot = newDaily[day.key];
            if (slot?.startTime || slot?.endTime) return; // already filled
            const endMins = 9 * 60 + Math.round(hrs * 60);
            newDaily[day.key] = {
              startTime: "09:00",
              endTime: `${String(Math.floor(endMins / 60) % 24).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`,
            };
            changed = true;
          });
          if (!changed) return currentRows;
          return [{ ...firstRow, dailyHours: newDaily }, ...currentRows.slice(1)];
        });
      }
    })();
    setPageStatus(createStatusState());
    setLastSaved(null);
  }, [selectedWeekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  function buildRowsFromTimesheet(ts: Timesheet) {
    if (!ts.entries?.length) { setWeekRows([createBlankEntryRow()]); return; }
    const grouped = new Map<string, Row>();
    ts.entries.forEach((entry) => {
      const gKey = `${entry.project_id ?? ""}-${entry.task_id ?? ""}`;
      if (!grouped.has(gKey)) {
        grouped.set(gKey, { ...createBlankEntryRow(), localId: `e-${gKey}`, existingId: ts.id, projectId: entry.project_id ?? "", taskId: entry.task_id ?? "", description: entry.description ?? "", dailyHours: createEmptyDailyHours() });
      }
      const row = grouped.get(gKey)!;
      const ws = new Date(ts.week_start + "T00:00:00");
      const ed = new Date(entry.date + "T00:00:00");
      const diff = Math.round((ed.getTime() - ws.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) {
        const key = weekdayFields[diff]?.[0];
        if (key) row.dailyHours[key] = { startTime: entry.start_time ?? "", endTime: entry.end_time ?? "" };
      }
    });
    const rows = Array.from(grouped.values());
    setWeekRows(rows);
    rows.forEach((r) => { if (r.projectId) loadTasksForProject(r.projectId); });
  }

  async function loadTasksForProject(projectId: string) {
    if (!projectId || projectTasksMap[projectId]) return;
    try {
      const data = await taskAPI.getMyByProject(projectId);
      setProjectTasksMap((prev) => ({ ...prev, [projectId]: (data as Task[]) ?? [] }));
    } catch (_) {
      setProjectTasksMap((prev) => ({ ...prev, [projectId]: [] }));
    }
  }

  async function refreshAll() {
    const [tsR] = await Promise.allSettled([timesheetAPI.getMy()]);
    if (tsR.status === "fulfilled") setMyTimesheets((tsR.value as Timesheet[]) ?? []);
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const weekDates = useMemo(() => buildWeekDates(selectedWeekStart || currentWeekStart), [currentWeekStart, selectedWeekStart]);

  const attendanceHoursByDate = useMemo(() => {
    const lookup: Record<string, number> = {};
    weekDates.forEach((day) => { lookup[day.isoDate] = attendanceByDate[day.isoDate] ?? 0; });
    return lookup;
  }, [attendanceByDate, weekDates]);

  const weekTotalHours = useMemo(() => weekRows.reduce((sum, row) => sum + getDailyHoursTotal(row.dailyHours), 0), [weekRows]);

  const weekDayTotals = useMemo(() => {
    const totals: Record<string, number> = weekDates.reduce((acc, day) => ({ ...acc, [day.key]: 0 }), {});
    weekRows.forEach((row) => { weekdayFields.forEach(([key]) => { totals[key] = (totals[key] || 0) + getDayHours(row.dailyHours?.[key]); }); });
    return totals;
  }, [weekDates, weekRows]);

  const projectTaskOptions = useMemo(() => {
    const map = new Map<string, Map<string, Task>>();
    Object.entries(projectTasksMap).forEach(([pid, tasks]) => {
      if (!map.has(pid)) map.set(pid, new Map());
      tasks.forEach((t) => { const k = t.title.toLowerCase(); if (!map.get(pid)!.has(k)) map.get(pid)!.set(k, t); });
    });
    return map;
  }, [projectTasksMap]);

  const isBusy = Boolean(busyAction);
  const isReadOnly = currentTimesheetStatus === "submitted" || currentTimesheetStatus === "approved";
  const hasAssignedProjects = projects.length > 0;
  const progressWidth = `${Math.min(100, (weekTotalHours / TARGET_WEEKLY_HOURS) * 100)}%`;
  const weekRangeLabel = weekDates.length >= 2 ? `${weekDates[0].shortDateLabel} - ${weekDates[6].shortDateLabel}` : "Week";

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleWeekChange = (value: string) => setSelectedWeekStart(getWeekStartDateOnly(value));
  const shiftWeek = (direction: number) => {
    const baseWeek = selectedWeekStart || currentWeekStart;
    if (baseWeek) setSelectedWeekStart(addDaysToDateOnly(baseWeek, direction * 7));
  };

  const getRowTaskOptions = (row: Row): Task[] => {
    const byId = projectTaskOptions.get(row.projectId);
    const byName = projectTaskOptions.get(normalizeProjectLookupKey(row.projectName));
    const merged = new Map<string, Task>();
    [byId, byName].forEach((bucket) => { bucket?.forEach((t, k) => merged.set(k, t)); });
    return Array.from(merged.values()).sort((a, b) => a.title.localeCompare(b.title));
  };

  const handleRowFieldChange = (rowId: string, field: keyof Row, value: string) => {
    setWeekRows((current) => current.map((row) => (row.localId === rowId ? { ...row, [field]: value } : row)));
    setPageStatus(createStatusState());
  };

  const handleTimeChange = (rowId: string, dayKey: DayKey, timeType: "startTime" | "endTime", value: string) => {
    setWeekRows((current) => {
      const nextRows = current.map((row) =>
        row.localId === rowId
          ? { ...row, dailyHours: { ...row.dailyHours, [dayKey]: { ...row.dailyHours[dayKey], [timeType]: value } } }
          : row
      );
      const dayTotal = nextRows.reduce((sum, row) => sum + getDayHours(row.dailyHours?.[dayKey]), 0);
      if (dayTotal > MAX_DAILY_HOURS) {
        setPageStatus(createStatusState(`Only ${MAX_DAILY_HOURS} hours are allowed per day. This entry would make ${dayKey} ${formatHoursClock(dayTotal)}.`, true));
        return current;
      }
      setPageStatus(createStatusState());
      return nextRows;
    });
  };

  const addEntryRow = () => { setWeekRows((c) => [...c, createBlankEntryRow()]); setPageStatus(createStatusState()); };

  const removeEntryRow = (row: Row) => {
    setWeekRows((current) => { const next = current.filter((r) => r.localId !== row.localId); return next.length ? next : [createBlankEntryRow()]; });
    setPageStatus(createStatusState());
  };

  function buildEntriesPayload() {
    const entries: object[] = [];
    const wd = buildWeekDates(selectedWeekStart || currentWeekStart);
    weekRows.filter((r) => !isBlankRow(r)).forEach((row) => {
      wd.forEach((day) => {
        if (day.isWeekend) return;
        const daily = row.dailyHours[day.key];
        const hours = getDayHours(daily);
        if (hours > 0) entries.push({ date: day.isoDate, project_id: row.projectId, task_id: row.taskId || null, start_time: daily.startTime, end_time: daily.endTime, hours, description: row.description });
      });
    });
    return entries;
  }

  const handleSave = async () => {
    const effectiveWeekStart = selectedWeekStart || currentWeekStart;
    const editableRows = weekRows.filter((r) => !isBlankRow(r));
    if (!editableRows.length) { setPageStatus(createStatusState("Add at least one time entry before saving.", true)); return; }
    setBusyAction("save");
    try {
      const result = (await timesheetAPI.saveDraft({ week_start: effectiveWeekStart, week_end: addDaysToDateOnly(effectiveWeekStart, 6), entries: buildEntriesPayload() })) as Timesheet;
      setCurrentTimesheetStatus(result.status);
      setLastSaved(new Date()); // Change 6
      await refreshAll();
      setPageStatus(createStatusState("Weekly timesheet saved successfully."));
    } catch (error: unknown) {
      setPageStatus(createStatusState(error instanceof Error ? error.message : "Unable to save weekly timesheet", true));
    } finally { setBusyAction(""); }
  };

  const handleSubmit = async () => {
    const effectiveWeekStart = selectedWeekStart || currentWeekStart;
    const editableRows = weekRows.filter((r) => !isBlankRow(r));
    if (!editableRows.length) { setPageStatus(createStatusState("Add at least one time entry before submitting.", true)); return; }
    const overLimitDay = weekdayFields.find(([key]) => (weekDayTotals[key] || 0) > MAX_DAILY_HOURS);
    if (overLimitDay) { setPageStatus(createStatusState(`${overLimitDay[1]} has ${formatHoursClock(weekDayTotals[overLimitDay[0]])}. Only ${MAX_DAILY_HOURS} hours are allowed per day.`, true)); return; }
    for (let i = 0; i < editableRows.length; i++) {
      if (!editableRows[i].projectId) { setPageStatus(createStatusState(`Select a project for entry ${i + 1}.`, true)); return; }
      if (getDailyHoursTotal(editableRows[i].dailyHours) <= 0) { setPageStatus(createStatusState(`Enter at least 1 hour for entry ${i + 1}.`, true)); return; }
    }
    if (weekTotalHours < 35) { setPageStatus(createStatusState(`Minimum 35 hours required. You have ${formatHoursClock(weekTotalHours)} hrs this week.`, true)); return; }
    setBusyAction("submit");
    try {
      const saved = (await timesheetAPI.saveDraft({ week_start: effectiveWeekStart, week_end: addDaysToDateOnly(effectiveWeekStart, 6), entries: buildEntriesPayload() })) as Timesheet;
      await timesheetAPI.submit(saved.id);
      setCurrentTimesheetStatus("submitted");
      await refreshAll();
      setPageStatus(createStatusState("Weekly timesheet submitted. Your manager has been notified for review."));
    } catch (error: unknown) {
      setPageStatus(createStatusState(error instanceof Error ? error.message : "Unable to submit weekly timesheet", true));
    } finally { setBusyAction(""); }
  };

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-7">
      <section className="app-card overflow-hidden p-0">
        {/* Top header: totals, summary stats, week navigation */}
        <div className="px-6 py-6 sm:px-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-[0.98rem] font-medium text-slate-500">Total</div>
              <p className="mt-2 text-[2rem] font-bold tracking-tight text-slate-950">{formatHoursClock(weekTotalHours)} / {formatHoursClock(TARGET_WEEKLY_HOURS)}</p>
              <div className="mt-4 h-3 max-w-[420px] overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[linear-gradient(90deg,#83b735_0%,#3b82f6_100%)] transition-all" style={{ width: progressWidth }} /></div>
            </div>
            <div className="flex flex-wrap gap-6 xl:pt-1">
              <SummaryStat label="Billable" value={formatHoursClock(weekTotalHours)} color="#8cb73f" />
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:min-w-[280px]">
              <div className="flex items-center justify-between gap-2 rounded-[20px] border border-slate-200 bg-white/80 px-3 py-2">
                <button type="button" onClick={() => shiftWeek(-1)} className="app-icon-button h-9 w-9" aria-label="Previous week"><Icon path="M15 18 9 12l6-6" /></button>
                <input type="date" value={selectedWeekStart || currentWeekStart} onChange={(e) => handleWeekChange(e.target.value)} className="min-w-0 flex-1 bg-transparent text-center text-[1.02rem] font-semibold text-slate-900 outline-none" />
                <button type="button" onClick={() => shiftWeek(1)} className="app-icon-button h-9 w-9" aria-label="Next week"><Icon path="m9 18 6-6-6-6" /></button>
              </div>
              <p className="text-center text-[0.88rem] font-medium uppercase tracking-[0.16em] text-slate-400">{weekRangeLabel}</p>
            </div>
          </div>

          {/* Change 5: submitted / approved banners stay in top section */}
          {currentTimesheetStatus === "approved" && (
            <div className="app-alert app-alert-success mt-6">Approved ✓ — This timesheet has been approved.</div>
          )}
          {currentTimesheetStatus === "submitted" && (
            <div className="app-alert app-alert-warning mt-6">Submitted — Awaiting review by your manager.</div>
          )}

          {pageStatus.message ? <div className={`mt-6 ${pageStatus.isError ? "app-alert app-alert-error" : "app-alert app-alert-success"}`}>{pageStatus.message}</div> : null}
          {!hasAssignedProjects ? (
            <div className="app-alert app-alert-warning mt-6">No assigned project yet. Ask your manager or admin to assign one, then refresh this page.</div>
          ) : null}
          {/* Change 1: Filter by Task removed */}
        </div>

        {/* Change 5: above-table status indicators */}
        {currentTimesheetStatus === "draft" && (
          <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-2.5">
            <span className="text-[0.8rem] font-medium text-slate-400">Draft — not submitted</span>
          </div>
        )}
        {currentTimesheetStatus === "rejected" && (
          <div className="border-t border-red-100 bg-red-50 px-6 py-3">
            <div className="flex items-start gap-2 text-sm text-red-700">
              <Icon path="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008Z" className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold">⚠ Rejected{reviewNote ? `: ${reviewNote}` : ""}</p>
                <p className="mt-0.5 text-red-600">Please make corrections and resubmit.</p>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="border-t border-slate-200 px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
          <div className="overflow-x-auto border border-slate-200 bg-white">
            <table className="w-full border-collapse bg-white">
              <thead className="bg-slate-50/90">
                <tr>
                  <th className="min-w-[280px] border-r border-slate-200 px-5 py-4 text-left text-[0.88rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Projects</th>
                  {/* Change 2: date format "26 May" */}
                  {weekDates.map((day) => (
                    <th key={day.isoDate} className="border-r border-slate-200 px-3 py-4 text-center text-[0.88rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <div className="text-[0.82rem] font-semibold text-slate-700">{day.shortDateLabel}</div>
                      <div className="mt-1 text-[13px] text-slate-400">{day.label}</div>
                      <div className="mt-1 text-[11px] font-semibold text-blue-500">Max 8h</div>
                    </th>
                  ))}
                  <th className="px-4 py-4 text-center text-[0.88rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Task total this week</th>
                </tr>
                <tr className="bg-white">
                  <th className="min-w-[280px] border-t border-r border-slate-200 px-5 py-4 text-left text-[0.88rem] font-semibold uppercase tracking-[0.14em] text-slate-400">Attendance hours</th>
                  {weekDates.map((day) => (
                    <th key={`att-${day.isoDate}`} className="border-t border-r border-slate-200 px-3 py-4 text-center text-[0.88rem] font-medium text-slate-500">
                      {formatHoursClock(attendanceHoursByDate[day.isoDate] || 0)}
                    </th>
                  ))}
                  <th className="border-t border-slate-200 px-4 py-4 text-center text-[0.88rem] font-medium text-slate-500">
                    {formatHoursClock(weekDates.reduce((sum, day) => sum + (attendanceHoursByDate[day.isoDate] || 0), 0))}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {/* Change 1: use weekRows directly (filteredWeekRows removed) */}
                {weekRows.map((row, index) => {
                  const rowTotal = getDailyHoursTotal(row.dailyHours);
                  const rowTaskOptions = getRowTaskOptions(row);
                  const hasAssignedTaskOptions = rowTaskOptions.length > 0;
                  const normalizedRowTask = String(row.task || "").trim();
                  const taskOptions = normalizedRowTask && !rowTaskOptions.some((t) => t.title === normalizedRowTask)
                    ? [{ id: `current-${row.localId}`, title: normalizedRowTask, status: "", priority: "" }, ...rowTaskOptions]
                    : rowTaskOptions;
                  return (
                    <tr key={row.localId} className="bg-white">
                      <td className="min-w-[280px] border-t border-r border-slate-200 px-4 py-4 align-top">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-3">
                              <div className="relative">
                                <select
                                  value={row.projectId}
                                  disabled={isBusy || isReadOnly}
                                  onChange={(e) => {
                                    const sel = projects.find((p) => p.id === e.target.value);
                                    setWeekRows((current) => current.map((item) => item.localId === row.localId ? { ...item, projectId: e.target.value, projectName: sel?.name || "", task: "", taskId: "" } : item));
                                    setPageStatus(createStatusState());
                                    if (e.target.value) loadTasksForProject(e.target.value);
                                  }}
                                  className="w-full appearance-none rounded-[16px] border border-blue-200 bg-blue-50/70 px-4 py-3 pr-12 text-base font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  <option value="">Select project</option>
                                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <SelectChevron />
                              </div>
                              <div>
                                <div className="relative">
                                  <select
                                    value={row.task}
                                    disabled={isBusy || isReadOnly || !row.projectId || !hasAssignedTaskOptions}
                                    onChange={(e) => {
                                      const sel = taskOptions.find((t) => t.title === e.target.value);
                                      setWeekRows((current) => current.map((item) => item.localId === row.localId ? { ...item, task: e.target.value, taskId: sel?.id || "" } : item));
                                      setPageStatus(createStatusState());
                                    }}
                                    className="w-full appearance-none rounded-[16px] border border-cyan-200 bg-cyan-50/70 px-4 py-3 pr-12 text-base font-semibold text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100 disabled:text-slate-400"
                                  >
                                    {!row.projectId ? <option value="">Select task</option> : !hasAssignedTaskOptions ? <option value="">No tasks available</option> : (
                                      <>
                                        <option value="">Select task</option>
                                        {taskOptions.map((t) => <option key={t.id || `${row.localId}-${t.title}`} value={t.title}>{t.title}</option>)}
                                      </>
                                    )}
                                  </select>
                                  <SelectChevron />
                                </div>
                              </div>
                              <textarea rows={2} value={row.description} onChange={(e) => handleRowFieldChange(row.localId, "description", e.target.value)} className="w-full resize-none rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 text-[0.98rem] text-slate-700 outline-none transition focus:border-slate-400" placeholder="Notes" disabled={isBusy || isReadOnly} />
                            </div>
                            <button type="button" onClick={() => removeEntryRow(row)} className="app-icon-button h-10 w-10" disabled={isBusy || isReadOnly} aria-label={`Remove entry ${index + 1}`}>
                              <Icon path="M3 6h18M8 6V4h8v2m-7 4v6m4-6v6M6 6l1 14h10l1-14" />
                            </button>
                          </div>
                          {row.existingId ? <div className="text-[0.82rem] font-medium text-slate-400">Saved draft</div> : null}
                        </div>
                      </td>
                      {weekDates.map((day) => (
                        <td key={`${row.localId}-${day.key}`} className="border-t border-r border-slate-200 px-2 py-3 text-center align-top">
                          {day.isWeekend ? (
                            <div className="flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-[16px] bg-slate-50 text-slate-400">
                              <Icon path="M16.5 10V8a4.5 4.5 0 1 0-9 0v2M7 10h10a2 2 0 0 1 2 2v6H5v-6a2 2 0 0 1 2-2Z" className="h-4 w-4" />
                              <span className="text-[1rem] font-medium">0:00</span>
                            </div>
                          ) : (
                            /* Change 5: lock icon on disabled cells */
                            <div className="relative space-y-2">
                              {isReadOnly && (
                                <div className="absolute right-0 top-0 text-slate-300">
                                  <Icon path="M16.5 10V8a4.5 4.5 0 1 0-9 0v2M7 10h10a2 2 0 0 1 2 2v6H5v-6a2 2 0 0 1 2-2Z" className="h-3 w-3" />
                                </div>
                              )}
                              <div className="space-y-1">
                                <input type="time" value={row.dailyHours[day.key]?.startTime || ""} onChange={(e) => handleTimeChange(row.localId, day.key, "startTime", e.target.value)} className="w-full rounded-[8px] border border-slate-200 bg-white px-2 py-1 text-center text-[0.9rem] text-slate-900 outline-none transition focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400" disabled={isBusy || isReadOnly} />
                                <input type="time" value={row.dailyHours[day.key]?.endTime || ""} onChange={(e) => handleTimeChange(row.localId, day.key, "endTime", e.target.value)} className="w-full rounded-[8px] border border-slate-200 bg-white px-2 py-1 text-center text-[0.9rem] text-slate-900 outline-none transition focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400" disabled={isBusy || isReadOnly} />
                              </div>
                              <p className="text-[0.88rem] text-slate-400">{formatHoursClock(getDayHours(row.dailyHours[day.key]))}</p>
                            </div>
                          )}
                        </td>
                      ))}
                      <td className="border-t border-slate-200 px-3 py-3 text-center align-top">
                        <div className="flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-[18px] bg-slate-50 px-2">
                          <span className="text-[1.4rem] font-semibold text-slate-950">{formatHoursClock(rowTotal)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-white">
                  <td className="border-t border-r border-slate-200 px-5 py-5">
                    <button type="button" onClick={addEntryRow} className="inline-flex items-center gap-2 text-[1.05rem] font-medium text-blue-600 transition hover:text-blue-700 disabled:opacity-50" disabled={isBusy || isReadOnly}>
                      <Icon path="M12 5v14M5 12h14" className="h-5 w-5" /><span>Add Time Entry</span>
                    </button>
                  </td>
                  {weekDates.map((day) => <td key={`empty-${day.isoDate}`} className="border-t border-r border-slate-200 bg-white" />)}
                  <td className="border-t border-slate-200 bg-white" />
                </tr>
                <tr className="bg-slate-50/90">
                  <td className="border-t border-r border-slate-200 px-5 py-5 text-right text-[1.1rem] font-semibold text-slate-900">Total hours/day</td>
                  {weekDates.map((day) => {
                    const isOver = (weekDayTotals[day.key] || 0) > MAX_DAILY_HOURS;
                    return (
                      <td key={`total-${day.isoDate}`} className={`border-t border-r border-slate-200 px-3 py-5 text-center text-[1.2rem] font-semibold ${isOver ? "bg-rose-50 text-rose-700" : "text-slate-950"}`}>
                        {formatHoursClock(weekDayTotals[day.key] || 0)}
                      </td>
                    );
                  })}
                  <td className="border-t border-slate-200 px-4 py-5 text-center text-[1.25rem] font-bold text-slate-950">{formatHoursClock(weekTotalHours)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 sm:px-7 xl:flex-row xl:items-center xl:justify-between">
          <button type="button" onClick={() => navigate("/leave")} className="inline-flex items-center gap-3 text-[1.05rem] font-medium text-blue-600 transition hover:text-blue-700">
            <Icon path="M3 7.5c2.5 2 5.3 3 8.5 3s6-1 8.5-3M4 15.5h15" className="h-5 w-5" /><span>Request Leave</span>
          </button>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end xl:justify-end">
            <button type="button" disabled title="File attachments coming soon" className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-blue-600 opacity-60">
              <Icon path="M21.4 11.1 12 20.5a5 5 0 0 1-7.1-7.1L14 4.3a3.5 3.5 0 0 1 5 5L9.2 19a2 2 0 0 1-2.8-2.8l8.5-8.5" /><span>Attach file</span>
            </button>
            {/* Change 5 & 6: Save button with pencil icon and last-saved label */}
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-2xl border border-blue-600 bg-white px-10 py-3 text-base font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-60"
                disabled={isBusy || isReadOnly}
              >
                <span className="inline-flex items-center gap-2">
                  {!isReadOnly && <Icon path="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 1 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732Z" className="h-4 w-4" />}
                  {busyAction === "save" ? "Saving..." : "Save"}
                </span>
              </button>
              {lastSavedLabel && <span className="text-xs text-slate-400">Last saved: {lastSavedLabel}</span>}
            </div>
            {/* Change 5: Submit button text varies by status */}
            <button
              type="button"
              onClick={isReadOnly ? undefined : handleSubmit}
              disabled={isBusy || isReadOnly}
              className={isReadOnly
                ? "rounded-2xl border border-green-500 bg-green-50 px-6 py-3 text-base font-semibold text-green-700 opacity-80 cursor-default"
                : "rounded-2xl border border-blue-600 bg-white px-6 py-3 text-base font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-60"
              }
            >
              <span className="inline-flex items-center gap-2">
                {isReadOnly
                  ? <><Icon path="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" className="h-4 w-4" /><span>✓ Submitted</span></>
                  : (<>
                      <Icon path="M8 7V4m8 3V4M5 11h14M5 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
                      <span>{busyAction === "submit" ? "Submitting..." : currentTimesheetStatus === "rejected" ? "Resubmit" : "Submit weekly timesheet"}</span>
                    </>)
                }
              </span>
            </button>
          </div>
        </div>
      </section>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Timesheet History</h3>
            <p className="text-xs text-slate-500 mt-0.5">All your submitted and draft timesheets</p>
          </div>
          <span className="text-xs text-slate-400">{history.length} records</span>
        </div>

        {historyLoading ? (
          <div className="flex gap-4 p-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 flex-1 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500">No timesheet history yet</p>
            <p className="text-xs text-slate-400 mt-1">Your submitted timesheets appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    {item.week_start
                      ? new Date(item.week_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
                      : '—'}
                    {' – '}
                    {item.week_end
                      ? new Date(item.week_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
                      : '—'}
                  </p>
                  {item.submitted_at && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Submitted: {new Date(item.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}
                    </p>
                  )}
                  {item.status === 'draft' && (
                    <p className="text-xs text-blue-500 mt-0.5">Draft — not yet submitted</p>
                  )}
                  {item.status === 'rejected' && item.review_note && (
                    <p className="text-xs text-red-500 mt-0.5">Rejected: {item.review_note}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <span className="text-sm font-bold text-slate-700">{item.total_hours || 0}h</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    item.status === 'approved'  ? 'bg-green-100 text-green-700'
                    : item.status === 'rejected'  ? 'bg-red-100 text-red-700'
                    : item.status === 'submitted' ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.status === 'approved'  ? 'Approved ✓'
                      : item.status === 'rejected'  ? 'Rejected'
                      : item.status === 'submitted' ? 'Pending Review'
                      : 'Draft'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-slate-100 px-5 py-3 text-center">
          <p className="text-xs text-slate-400">
            Timesheets auto-save as draft · Submit by Friday end of day
          </p>
        </div>
      </div>

    </div>
  );
}

export default EmployeeTimesheetsPage;
