import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  hours_worked: number | null;
  status: string;
}

interface UseAttendanceReturn {
  data: AttendanceRecord | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isClockedIn: boolean;
  elapsedDisplay: string;
  clockOut: () => Promise<void>;
}

function computeElapsed(clockInIso: string): string {
  const diffMs = Date.now() - new Date(clockInIso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  return `${h}h ${m}m`;
}

export function useAttendance(): UseAttendanceReturn {
  const [data, setData] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsedDisplay, setElapsedDisplay] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch('/attendance/today');
      setData(res ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const pollId = setInterval(fetchData, 30_000);
    return () => clearInterval(pollId);
  }, [fetchData]);

  const isClockedIn = Boolean(data?.clock_in && !data?.clock_out);

  useEffect(() => {
    if (!isClockedIn || !data?.clock_in) {
      setElapsedDisplay('');
      return;
    }
    setElapsedDisplay(computeElapsed(data.clock_in));
    const id = setInterval(() => {
      setElapsedDisplay(computeElapsed(data!.clock_in!));
    }, 60_000);
    return () => clearInterval(id);
  }, [isClockedIn, data?.clock_in]);

  const clockOut = useCallback(async () => {
    await apiFetch('/attendance/clock-out', { method: 'POST' });
    await fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, isClockedIn, elapsedDisplay, clockOut };
}
