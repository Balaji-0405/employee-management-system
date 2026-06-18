import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  projects?: { name: string };
  project_id?: string;
  due_date: string | null;
  priority: string;
  status: string;
  assigned_to?: string;
  created_at?: string;
}

interface UseTasksReturn {
  data: TaskRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  totalCount: number;
  overdueCount: number;
  inProgressCount: number;
  reviewCount: number;
  completedCount: number;
}

export function useTasks(): UseTasksReturn {
  const [data, setData] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch('/tasks/my');
      setData(Array.isArray(res) ? res : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 2 * 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const today = new Date().toISOString().split('T')[0];

  const totalCount = data.length;
  const overdueCount = data.filter(
    t => t.due_date && t.due_date < today && t.status !== 'done'
  ).length;
  const inProgressCount = data.filter(t => t.status === 'in_progress').length;
  const reviewCount = data.filter(t => t.status === 'review').length;
  const completedCount = data.filter(t => t.status === 'done').length;

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    totalCount,
    overdueCount,
    inProgressCount,
    reviewCount,
    completedCount,
  };
}
