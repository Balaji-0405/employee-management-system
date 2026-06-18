import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface TimesheetEntry {
  id: string;
  date: string;
  hours_worked: number;
  project_id?: string;
  task_id?: string;
  description?: string;
}

interface RawTimesheet {
  id: string;
  week_start: string;
  week_end: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  total_hours: number;
  submitted_at?: string;
  entries?: TimesheetEntry[];
}

export interface TimesheetData {
  totalLogged: string;
  pendingApproval: string;
  workDaysLogged: number;
  dailyBreakdown: { date: string; hours: number }[];
}

function formatHours(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return `${hours}h ${mins}m`;
}

function getCurrentMondayISO(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

function transformTimesheet(raw: RawTimesheet | null): TimesheetData {
  if (!raw) {
    return { totalLogged: '0h 0m', pendingApproval: '—', workDaysLogged: 0, dailyBreakdown: [] };
  }

  const totalLogged = formatHours(raw.total_hours ?? 0);
  const pendingApproval = raw.status === 'submitted' ? formatHours(raw.total_hours ?? 0) : '—';

  const entries = raw.entries ?? [];
  const workDayDates = new Set(
    entries
      .filter(e => {
        if (!e.hours_worked || e.hours_worked <= 0) return false;
        const dow = new Date(e.date + 'T00:00:00').getDay();
        return dow >= 1 && dow <= 5;
      })
      .map(e => e.date)
  );

  const dailyBreakdown = entries.map(e => ({ date: e.date, hours: e.hours_worked }));

  return {
    totalLogged,
    pendingApproval,
    workDaysLogged: workDayDates.size,
    dailyBreakdown,
  };
}

interface UseTimesheetReturn {
  data: TimesheetData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTimesheet(): UseTimesheetReturn {
  const [data, setData] = useState<TimesheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const monday = getCurrentMondayISO();
      const res: RawTimesheet | null = await apiFetch(
        `/timesheets/weekly?date=${monday}`
      );
      setData(transformTimesheet(res ?? null));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load timesheet');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30 * 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
