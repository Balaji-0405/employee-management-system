import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface LeaveTypeBalance {
  entitled: number;
  used: number;
  balance: number;
}

interface EarnedLeaveBalance {
  accrued: number;
  used: number;
  balance: number;
}

export interface LeaveBalanceData {
  sick: LeaveTypeBalance;
  earned: EarnedLeaveBalance;
  casual: LeaveTypeBalance;
  pendingRequests: number;
}

interface RawLeaveBalance {
  sick_leave_total?: number;
  sick_leave_used?: number;
  earned_leave_accrued?: number;
  earned_leave_used?: number;
  carried_forward?: number;
  sick_available?: number;
  el_available?: number;
}

interface RawLeaveRequest {
  id: string;
  type?: string;
  leave_type?: string;
  status: string;
  days?: number;
}

const CASUAL_LEAVE_TOTAL = 5;

function transformBalance(
  raw: RawLeaveBalance,
  myLeaves: RawLeaveRequest[]
): LeaveBalanceData {
  const sickTotal = raw.sick_leave_total ?? 6;
  const sickUsed = raw.sick_leave_used ?? 0;

  const earnedAccrued = (raw.earned_leave_accrued ?? 0) + (raw.carried_forward ?? 0);
  const earnedUsed = raw.earned_leave_used ?? 0;

  const casualUsed = myLeaves
    .filter(r => {
      const t = r.type ?? r.leave_type ?? '';
      return t === 'casual' && r.status === 'approved';
    })
    .reduce((sum, r) => sum + (r.days ?? 0), 0);

  const pendingRequests = myLeaves.filter(r => r.status === 'pending').length;

  return {
    sick: { entitled: sickTotal, used: sickUsed, balance: sickTotal - sickUsed },
    earned: { accrued: earnedAccrued, used: earnedUsed, balance: earnedAccrued - earnedUsed },
    casual: {
      entitled: CASUAL_LEAVE_TOTAL,
      used: casualUsed,
      balance: CASUAL_LEAVE_TOTAL - casualUsed,
    },
    pendingRequests,
  };
}

interface UseLeaveBalanceReturn {
  data: LeaveBalanceData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLeaveBalance(): UseLeaveBalanceReturn {
  const [data, setData] = useState<LeaveBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [balanceRes, leavesRes] = await Promise.allSettled([
        apiFetch('/leave/balance') as Promise<RawLeaveBalance>,
        apiFetch('/leave/my') as Promise<RawLeaveRequest[]>,
      ]);

      if (balanceRes.status === 'rejected') {
        throw new Error(balanceRes.reason?.message ?? 'Failed to load leave balance');
      }

      const myLeaves =
        leavesRes.status === 'fulfilled' && Array.isArray(leavesRes.value)
          ? leavesRes.value
          : [];

      setData(transformBalance(balanceRes.value, myLeaves));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load leave balance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
