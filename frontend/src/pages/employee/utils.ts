export const weekdayFields = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
  ["sunday", "Sun"],
];

export function createEmptyDailyHours() {
  return {
    monday: { startTime: "", endTime: "" },
    tuesday: { startTime: "", endTime: "" },
    wednesday: { startTime: "", endTime: "" },
    thursday: { startTime: "", endTime: "" },
    friday: { startTime: "", endTime: "" },
    saturday: { startTime: "", endTime: "" },
    sunday: { startTime: "", endTime: "" },
  };
}

export function formatHoursClock(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  return `${h}:${String(m).padStart(2, "0")}`;
}

export function getDailyHoursTotal(dailyHours: Record<string, any>): number {
  return Object.values(dailyHours || {}).reduce((sum: number, day: any) => {
    if (!day?.startTime || !day?.endTime) return sum;

    const [sh, sm] = day.startTime.split(":").map(Number);
    const [eh, em] = day.endTime.split(":").map(Number);

    const start = sh + sm / 60;
    const end = eh + em / 60;

    return sum + Math.max(0, end - start);
  }, 0);
}

export function getWeekStartDateOnly(dateString: string) {
  const date = new Date(dateString || new Date());

  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);

  const monday = new Date(date.setDate(diff));

  return monday.toISOString().split("T")[0];
}

export function addDaysToDateOnly(dateString: string, days: number) {
  const date = new Date(dateString);

  date.setDate(date.getDate() + days);

  return date.toISOString().split("T")[0];
}

export function buildWeekDates(startDate: string) {
  const start = new Date(startDate);

  return weekdayFields.map(([key, label], index) => {
    const d = new Date(start);

    d.setDate(start.getDate() + index);

    return {
      key,
      label,
      isoDate: d.toISOString().split("T")[0],
      shortDateLabel: d.getDate(),
      isWeekend: index >= 5,
    };
  });
}

export function normalizeDailyHoursForForm(value: any) {
  return value || createEmptyDailyHours();
}

export function parseTimeEntryHours(value: any) {
  return Number(value || 0);
}

export function normalizeTimeEntryInput(value: any) {
  return value;
}

export function formatTimeEntryDraftInput(value: any) {
  return value;
}