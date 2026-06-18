import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface RawPayslip {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  basic_salary?: number;
  net_salary?: number;
  status?: string;
  processed_at?: string;
  working_days?: number;
  present_days?: number;
}

export interface PayslipData {
  id: string;
  month: string;
  year: number;
  netPay: number;
  status: string;
  generatedDate: string;
  downloadUrl: string;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function transformPayslip(raw: RawPayslip): PayslipData {
  return {
    id: raw.id,
    month: MONTHS[(raw.month ?? 1) - 1],
    year: raw.year,
    netPay: raw.net_salary ?? 0,
    status: raw.status ?? 'processed',
    generatedDate: raw.processed_at ?? '',
    downloadUrl: '',
  };
}

interface UsePayslipReturn {
  data: PayslipData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isNew: boolean;
}

export function usePayslip(): UsePayslipReturn {
  const [data, setData] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res: RawPayslip[] = await apiFetch('/payroll/my');
      const latest = Array.isArray(res) && res.length > 0 ? res[0] : null;
      setData(latest ? transformPayslip(latest) : null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payslip');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isNew = Boolean(
    data?.generatedDate &&
      Date.now() - new Date(data.generatedDate).getTime() < 7 * 24 * 60 * 60 * 1000
  );

  return { data, loading, error, refetch: fetchData, isNew };
}
