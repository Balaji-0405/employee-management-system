import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bell, Banknote, CalendarCheck2, Check, ChevronDown, ChevronLeft, ChevronRight,
  Download, Eye, FileBadge, FileText, Info, Landmark, ReceiptText, Send, WalletCards, X,
} from "lucide-react";
import { ManagerFrame, Panel, StatusPill } from "./shared";
import { getMyPayslips, getMyPayslipDetail, getPayrollRuns } from "../../services/payrollApi";
import { getMyLeaveBalance } from "../../services/leaveApi";
import { helpdeskAPI } from "../../lib/api";
import { Skeleton } from "../../components/ui/skeleton";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: string;
}

interface Payslip {
  id: string;
  run_id?: string;
  payroll_runs?: { pay_month?: number; pay_year?: number };
  // monetary – stored in paise
  basic_salary?: number;
  gross_salary?: number;
  net_salary?: number;
  total_deductions?: number;
  deductions?: number;
  ot_pay?: number;
  bonus?: number;
  lop_deduction?: number;
  pt_deduction?: number;
  insurance_deduction?: number;
  loan_deduction?: number;
  // attendance
  working_days?: number;
  present_days?: number;
  leave_days?: number;
  absent_days?: number;
  sl_used?: number;
  el_used?: number;
  lop_days?: number;
  // employee info (populated by detail endpoint join)
  employee_name?: string;
  employee_id?: string;
  department?: string;
  designation?: string;
  bank_account?: string;
  bank_account_last4?: string;
  pay_date?: string;
  pay_period?: string;
  // meta
  status?: string;
  processed_at?: string;
}

interface LeaveBalance {
  sl_balance?: number;
  sl_entitled?: number;
  sl_used?: number;
  el_balance?: number;
  el_opening?: number;
  el_accrued?: number;
  el_used?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const rupee = "₹";

// API stores monetary values in paise (1 rupee = 100 paise)
function fmtRupees(amount: number | undefined): string {
  return `${rupee}${((amount ?? 0) / 100).toLocaleString("en-IN")}`;
}

function formatMonth(payslip: Payslip): string {
  const month = payslip.payroll_runs?.pay_month;
  const year = payslip.payroll_runs?.pay_year;
  if (!month || !year) return "Unknown period";
  return new Date(year, month - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

function nextAccrualDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

function daysUntil(d: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((d.getTime() - now.getTime()) / 86400000));
}

function statusBadgeCls(status: string | undefined): string {
  if (status === "processed" || status === "disbursed") return "bg-emerald-50 text-emerald-700";
  if (status === "draft") return "bg-slate-100 text-slate-600";
  if (status === "locked") return "bg-amber-50 text-amber-700";
  if (status === "computed") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

// ── Local sub-components ──────────────────────────────────────────────────────

function PayslipPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </section>
  );
}

function StatusBadge({ status }: { status: string | undefined }) {
  return (
    <span className={`rounded px-2 py-1 text-[11px] font-semibold ${statusBadgeCls(status)}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
    </span>
  );
}

function ActionBtn({ children, label, onClick }: { children: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="grid h-8 w-8 place-items-center rounded-md bg-slate-50 text-slate-700 hover:bg-slate-100" aria-label={label} title={label}>
      {children}
    </button>
  );
}

// ── TeamPayrollSummary ────────────────────────────────────────────────────────

function TeamPayrollSummary({ onSwitchToMyPayslips }: { onSwitchToMyPayslips?: () => void }) {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    getPayrollRuns()
      .then(data => setRuns((data as PayrollRun[]) ?? []))
      .catch(err => {
        const msg = err instanceof Error ? err.message : "Failed to load payroll runs";
        if (msg.toLowerCase().includes("forbidden") || msg.includes("403")) {
          setForbidden(true);
        } else {
          setError(msg);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <Panel>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
          </div>
        ) : forbidden ? (
          <div className="flex flex-col items-center gap-4 py-14 text-center px-6">
            <p className="text-[15px] font-semibold text-slate-700">Team payroll is managed by admin.</p>
            <p className="text-[13px] text-slate-500">Your personal payslips are in the My Payslips tab.</p>
            {onSwitchToMyPayslips && (
              <button
                onClick={onSwitchToMyPayslips}
                className="mt-2 inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-5 text-[13px] font-semibold text-white hover:bg-blue-700"
              >
                View My Payslips
              </button>
            )}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 m-5">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        ) : runs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">No payroll runs found</p>
            <p className="mt-1 text-xs text-slate-500">Contact your admin to process payroll.</p>
          </div>
        ) : (
          <div className="overflow-x-auto px-5 pt-2 pb-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Recent Payroll Runs</p>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-bold">Period</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map(run => (
                  <tr key={run.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {MONTHS[(run.month ?? 1) - 1]} {run.year}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill value={run.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {!forbidden && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
          Payroll processing and salary configuration is managed by admin.
          View your personal payslips in the <strong>My Payslips</strong> tab.
        </div>
      )}
    </div>
  );
}

// ── MyPayslipsSection ─────────────────────────────────────────────────────────

function MyPayslipsSection() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selected, setSelected] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showQueryForm, setShowQueryForm] = useState(false);
  const [queryMsg, setQueryMsg] = useState("");
  const [sendingQuery, setSendingQuery] = useState(false);

  useEffect(() => {
    Promise.allSettled([getMyPayslips(), getMyLeaveBalance()]).then(([ps, lb]) => {
      if (ps.status === "fulfilled") {
        const list = (ps.value as Payslip[]) ?? [];
        setPayslips(list);
        if (list.length > 0) setSelected(list[0]);
      }
      if (lb.status === "fulfilled") setLeaveBalance(lb.value as LeaveBalance);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const totalNetPay = useMemo(
    () => payslips.reduce((sum, p) => sum + (p.net_salary ?? 0), 0),
    [payslips]
  );
  const totalDeductions = useMemo(
    () => payslips.reduce((sum, p) => sum + (p.total_deductions ?? p.deductions ?? 0), 0),
    [payslips]
  );

  async function handleViewDetails(p: Payslip) {
    setSelected(p);
    setShowQueryForm(false);
    setLoadingDetail(true);
    try {
      const detail = await getMyPayslipDetail(p.run_id ?? p.id);
      if (detail) setSelected(detail as Payslip);
    } catch { /* keep summary data */ }
    finally { setLoadingDetail(false); }
  }

  function handleDownload(p: Payslip) {
    const month = p.payroll_runs?.pay_month ?? 1;
    const year = p.payroll_runs?.pay_year ?? new Date().getFullYear();
    const monthName = `${MONTHS[month - 1]} ${year}`;
    const fmt = (v: number | undefined) => Math.round((v || 0) / 100).toLocaleString("en-IN");
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Payslip - ${monthName}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; color: #1a1a1a; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; color: #666; padding: 8px 0; border-bottom: 2px solid #e5e7eb; }
    td { padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    td:last-child { text-align: right; }
    .net { background: #f0fdf4; padding: 16px; border-radius: 8px; display: flex; justify-content: space-between; margin-top: 16px; }
    .net-label { font-size: 14px; color: #166534; }
    .net-amount { font-size: 24px; font-weight: bold; color: #15803d; }
  </style>
</head>
<body>
  <h1>Kady Innovations</h1>
  <div class="subtitle">Payslip — ${monthName}</div>
  <table>
    <tr><th>Attendance</th><th></th></tr>
    <tr><td>Working Days</td><td>${p.working_days ?? "—"}</td></tr>
    <tr><td>Present Days</td><td>${p.present_days ?? "—"}</td></tr>
    <tr><td>LOP Days</td><td>${p.lop_days ?? 0}</td></tr>
  </table>
  <table>
    <tr><th>Earnings</th><th></th></tr>
    <tr><td>Basic Salary</td><td>₹${fmt(p.basic_salary)}</td></tr>
    ${(p.ot_pay ?? 0) > 0 ? `<tr><td>Overtime</td><td>₹${fmt(p.ot_pay)}</td></tr>` : ""}
    ${(p.bonus ?? 0) > 0 ? `<tr><td>Bonus</td><td>₹${fmt(p.bonus)}</td></tr>` : ""}
    <tr><td><strong>Gross Salary</strong></td><td><strong>₹${fmt(p.gross_salary)}</strong></td></tr>
  </table>
  <table>
    <tr><th>Deductions</th><th></th></tr>
    ${(p.lop_deduction ?? 0) > 0 ? `<tr><td>LOP Deduction</td><td>−₹${fmt(p.lop_deduction)}</td></tr>` : ""}
    <tr><td>Professional Tax</td><td>−₹${fmt(p.pt_deduction)}</td></tr>
    <tr><td>Group Insurance</td><td>−₹${fmt(p.insurance_deduction)}</td></tr>
    ${(p.loan_deduction ?? 0) > 0 ? `<tr><td>Loan EMI</td><td>−₹${fmt(p.loan_deduction)}</td></tr>` : ""}
    <tr><td><strong>Total Deductions</strong></td><td><strong>−₹${fmt(p.total_deductions)}</strong></td></tr>
  </table>
  <div class="net">
    <span class="net-label">Net Take-Home Pay</span>
    <span class="net-amount">₹${fmt(p.net_salary)}</span>
  </div>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); win.close(); }, 500);
    }
  }

  async function handleSendQuery() {
    if (!queryMsg.trim()) return;
    try {
      setSendingQuery(true);
      await helpdeskAPI.createTicket({
        subject: `Payslip Query — ${formatMonth(selected)}`,
        description: queryMsg.trim(),
        category: 'payroll',
        priority: 'medium',
      });
      setQueryMsg('');
      setShowQueryForm(false);
      setToastMsg('Query submitted to HR. Track it in the Helpdesk section.');
    } catch (err: any) {
      setToastMsg('Failed to submit: ' + err.message);
    } finally {
      setSendingQuery(false);
    }
  }

  // Leave balance derived values
  const slBalance  = leaveBalance?.sl_balance  ?? 0;
  const slEntitled = leaveBalance?.sl_entitled ?? 6;
  const slUsed     = leaveBalance?.sl_used     ?? 0;
  const elBalance  = leaveBalance?.el_balance  ?? 0;
  const elOpening  = leaveBalance?.el_opening  ?? 0;
  const elAccrued  = leaveBalance?.el_accrued  ?? 0;
  const elUsed     = leaveBalance?.el_used     ?? 0;
  const nextAccrual    = nextAccrualDate();
  const currentMonthNum = new Date().getMonth() + 1;

  // Detail panel derived values
  const sel = selected;
  const detailEarnings   = (sel?.basic_salary ?? 0) + (sel?.ot_pay ?? 0) + (sel?.bonus ?? 0);
  const detailDeductions = (sel?.lop_deduction ?? 0) + (sel?.pt_deduction ?? 0) + (sel?.insurance_deduction ?? 0) + (sel?.loan_deduction ?? 0);
  const bankDisplay = sel?.bank_account_last4
    ? `****${sel.bank_account_last4}`
    : sel?.bank_account
    ? `****${sel.bank_account.slice(-4)}`
    : "****XXXX";

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="h-[120px] animate-pulse rounded-lg bg-slate-200" />)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-[100px] animate-pulse rounded-lg bg-slate-200" />)}
        </div>
        <div className="h-[400px] animate-pulse rounded-lg bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-5 py-3 text-[13px] font-semibold text-white shadow-xl">
          {toastMsg}
        </div>
      )}

      {payslips.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-slate-200 bg-white py-20 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-100">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <div>
            <p className="text-[17px] font-semibold text-slate-900">No payslips generated yet</p>
            <p className="mt-2 text-[13px] text-slate-500">Contact your admin to process payroll.</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Leave Balance ─────────────────────────────────────────────── */}
          {leaveBalance && (
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Sick Leave */}
              <section className="rounded-lg border border-blue-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Sick Leave</p>
                <p className="mt-1 text-[40px] font-bold leading-none text-slate-950">{slBalance}</p>
                <p className="mt-1 text-[12px] text-slate-500">of {slEntitled} days this year</p>
                <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-red-400"  style={{ width: `${Math.min(100, (slUsed    / slEntitled) * 100)}%` }} />
                  <div className="h-full bg-blue-400" style={{ width: `${Math.min(100, (slBalance  / slEntitled) * 100)}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-slate-400">Resets Jan 1 — unused SL lapses</p>
              </section>

              {/* Earned Leave */}
              <section className="relative rounded-lg border border-green-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] group">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-green-600">Earned Leave</p>
                  <Info className="h-3.5 w-3.5 cursor-help text-slate-400" />
                </div>
                <div className="pointer-events-none absolute left-1/2 top-10 z-20 hidden w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg group-hover:block">
                  <div className="space-y-1.5 text-[11px] text-slate-700">
                    <div className="flex justify-between"><span>Carried from last year:</span><span className="font-semibold">{elOpening} days</span></div>
                    <div className="flex justify-between"><span>Accrued ({currentMonthNum} months × 1.5):</span><span className="font-semibold">{elAccrued} days</span></div>
                    <div className="flex justify-between"><span>Used:</span><span className="font-semibold">{elUsed} days</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5 font-semibold"><span>Balance:</span><span>{elBalance} days</span></div>
                  </div>
                </div>
                <p className="mt-1 text-[40px] font-bold leading-none text-slate-950">{elBalance}</p>
                <p className="mt-1 text-[12px] text-slate-500">days available</p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-green-400"
                    style={{ width: `${Math.min(100, (elOpening + elAccrued) > 0 ? (elBalance / (elOpening + elAccrued)) * 100 : 0)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-400">Max 20 days carry to next year</p>
              </section>

              {/* Next Accrual */}
              <section className="rounded-lg border border-purple-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="text-[11px] font-bold uppercase tracking-wide text-purple-600">Next Accrual</p>
                <p className="mt-3 text-[14px] font-medium text-slate-600">1.5 days EL on</p>
                <p className="mt-1 text-[26px] font-bold leading-none text-slate-950">
                  1st {MONTHS[nextAccrual.getMonth()]}
                </p>
                <p className="mt-2 text-[12px] text-slate-500">in {daysUntil(nextAccrual)} days</p>
              </section>
            </div>
          )}

          {/* ── Stats Row ─────────────────────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { title: `Net Pay (${sel ? formatMonth(sel) : "—"})`, value: fmtRupees(sel?.net_salary), hint: "Latest payslip", color: "blue", icon: WalletCards },
              { title: "Gross Salary", value: fmtRupees(sel?.gross_salary), hint: "This month", color: "emerald", icon: ReceiptText },
              { title: "Total Deductions", value: fmtRupees(sel?.total_deductions ?? sel?.deductions), hint: "Tax, PF & others", color: "rose", icon: Banknote },
              { title: "Working Days", value: String(sel?.working_days ?? "—"), hint: `Present: ${sel?.present_days ?? "—"}`, color: "violet", icon: CalendarCheck2 },
              { title: "YTD Net Pay", value: fmtRupees(totalNetPay), hint: `${payslips.length} payslips`, color: "amber", icon: Landmark },
            ].map(item => {
              const Icon = item.icon;
              const colorMap: Record<string, string> = {
                blue: "bg-blue-50 text-blue-600", emerald: "bg-emerald-50 text-emerald-600",
                rose: "bg-rose-50 text-rose-600", violet: "bg-violet-50 text-violet-600", amber: "bg-amber-50 text-amber-600",
              };
              return (
                <PayslipPanel key={item.title} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${colorMap[item.color]}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-slate-600">{item.title}</p>
                      <p className="mt-1 text-[22px] font-semibold leading-none text-slate-950">{item.value}</p>
                      <p className="mt-2 text-[12px] text-slate-500">{item.hint}</p>
                    </div>
                  </div>
                </PayslipPanel>
              );
            })}
          </div>

          {/* ── Table + Detail Panel ──────────────────────────────────────── */}
          <div className={`flex gap-4 ${sel ? "items-start" : ""}`}>
            {/* Table */}
            <section className="min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex gap-8 overflow-x-auto border-b border-slate-100 px-4 text-[13px] font-semibold text-slate-600">
                <button className="flex shrink-0 items-center gap-2 border-b-2 border-blue-600 py-4 text-blue-700">
                  <CalendarCheck2 className="h-4 w-4" />Payroll History
                </button>
              </div>
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[17px] font-semibold text-slate-950">Payroll History</h2>
                    <p className="mt-1 text-[13px] text-slate-500">Click the eye icon to view full breakdown</p>
                  </div>
                  <button className="inline-flex h-9 w-28 items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700">
                    {new Date().getFullYear()} <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full border-collapse text-left text-[13px]">
                    <thead className="bg-slate-50 text-[12px] font-semibold text-slate-600">
                      <tr>
                        {["Month","Gross","Net Pay","LOP Days","Status","Actions"].map(h => (
                          <th key={h} className="px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payslips.map(p => (
                        <tr
                          key={p.id}
                          onClick={() => setSelected(p)}
                          className={`cursor-pointer hover:bg-slate-50/70 ${sel?.id === p.id ? "bg-blue-50/40" : ""}`}
                        >
                          <td className="px-4 py-3 font-medium text-slate-800">{formatMonth(p)}</td>
                          <td className="px-4 py-3 text-slate-700">{fmtRupees(p.gross_salary)}</td>
                          <td className="px-4 py-3 font-semibold text-emerald-700">{fmtRupees(p.net_salary)}</td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${(p.lop_days ?? 0) > 0 ? "text-red-600" : "text-slate-400"}`}>
                              {p.lop_days ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <ActionBtn label="View payslip" onClick={() => handleViewDetails(p)}>
                                <Eye className="h-4 w-4" />
                              </ActionBtn>
                              <ActionBtn label="Download payslip" onClick={() => handleDownload(p)}>
                                <Download className="h-4 w-4" />
                              </ActionBtn>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 text-[12px] text-slate-500">
                  <span>Showing {payslips.length} of {payslips.length} entries</span>
                  <div className="flex items-center gap-2">
                    <button className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-400"><ChevronLeft className="h-4 w-4" /></button>
                    <button className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-[12px] font-semibold text-white">1</button>
                    <button className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-700"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            </section>

            {/* Detail Panel */}
            {sel && (
              <aside
                className="w-full shrink-0 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] xl:w-[420px]"
                style={{ maxHeight: "calc(100vh - 176px)" }}
              >
                {loadingDetail ? (
                  <div className="space-y-3 p-5">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />)}
                  </div>
                ) : (
                  <div className="space-y-5 p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Kady Innovations</p>
                        <h2 className="mt-0.5 text-[17px] font-semibold text-slate-950">
                          Payslip — {formatMonth(sel)}
                        </h2>
                      </div>
                      <button
                        onClick={() => { setSelected(null); setShowQueryForm(false); }}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Employee Info */}
                    <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-[12px]">
                      <div className="space-y-2.5">
                        {([
                          ["Employee Name", sel.employee_name],
                          ["Employee ID",   sel.employee_id],
                          ["Department",    sel.department],
                          ["Designation",   sel.designation],
                        ] as [string, string | undefined][]).map(([label, value]) => (
                          <div key={label}>
                            <p className="text-slate-500">{label}</p>
                            <p className="font-semibold text-slate-900">{value ?? "—"}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2.5">
                        {([
                          ["Pay Period",   sel.pay_period ?? formatMonth(sel)],
                          ["Bank Account", bankDisplay],
                          ["Pay Date",     sel.pay_date ?? "Last working day"],
                        ] as [string, string | undefined][]).map(([label, value]) => (
                          <div key={label}>
                            <p className="text-slate-500">{label}</p>
                            <p className="font-semibold text-slate-900">{value ?? "—"}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Attendance */}
                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Attendance</p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[
                          { label: "Working", value: sel.working_days, red: false },
                          { label: "Present",  value: sel.present_days,  red: false },
                          { label: "SL Used",  value: sel.sl_used ?? 0,  red: false },
                          { label: "EL Used",  value: sel.el_used ?? 0,  red: false },
                          { label: "LOP",      value: sel.lop_days ?? 0, red: (sel.lop_days ?? 0) > 0 },
                        ].map(({ label, value, red }) => (
                          <div key={label} className="flex flex-col items-center rounded-lg bg-slate-50 px-1 py-2.5">
                            <span className={`text-[20px] font-bold leading-none ${red ? "text-red-600" : "text-slate-950"}`}>
                              {value ?? "—"}
                            </span>
                            <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Earnings */}
                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Earnings</p>
                      <div className="overflow-hidden rounded-lg border border-slate-100">
                        <table className="w-full text-[12px]">
                          <tbody className="divide-y divide-slate-50 bg-white">
                            <tr>
                              <td className="px-3 py-2 text-slate-700">Basic Salary</td>
                              <td className="px-3 py-2 text-right font-medium text-slate-900">{fmtRupees(sel.basic_salary)}</td>
                            </tr>
                            {(sel.ot_pay ?? 0) > 0 && (
                              <tr>
                                <td className="px-3 py-2 text-slate-700">Overtime Pay</td>
                                <td className="px-3 py-2 text-right font-medium text-slate-900">{fmtRupees(sel.ot_pay)}</td>
                              </tr>
                            )}
                            {(sel.bonus ?? 0) > 0 && (
                              <tr>
                                <td className="px-3 py-2 text-slate-700">Performance Bonus</td>
                                <td className="px-3 py-2 text-right font-medium text-slate-900">{fmtRupees(sel.bonus)}</td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-200 bg-slate-50">
                              <td className="px-3 py-2.5 font-bold text-slate-900">Total Earnings</td>
                              <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                                {fmtRupees(sel.gross_salary ?? detailEarnings)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Deductions</p>
                      <div className="overflow-hidden rounded-lg border border-slate-100">
                        <table className="w-full text-[12px]">
                          <tbody className="divide-y divide-slate-50 bg-white">
                            {(sel.lop_deduction ?? 0) > 0 && (
                              <tr>
                                <td className="px-3 py-2 text-slate-700">LOP Deduction</td>
                                <td className="px-3 py-2 text-right font-medium text-red-600">{fmtRupees(sel.lop_deduction)}</td>
                              </tr>
                            )}
                            <tr>
                              <td className="px-3 py-2 text-slate-700">Professional Tax</td>
                              <td className="px-3 py-2 text-right font-medium text-slate-900">{fmtRupees(sel.pt_deduction)}</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 text-slate-700">Group Health Insurance</td>
                              <td className="px-3 py-2 text-right font-medium text-slate-900">{fmtRupees(sel.insurance_deduction)}</td>
                            </tr>
                            {(sel.loan_deduction ?? 0) > 0 && (
                              <tr>
                                <td className="px-3 py-2 text-slate-700">Loan EMI</td>
                                <td className="px-3 py-2 text-right font-medium text-slate-900">{fmtRupees(sel.loan_deduction)}</td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-200 bg-slate-50">
                              <td className="px-3 py-2.5 font-bold text-slate-900">Total Deductions</td>
                              <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                                {fmtRupees(sel.total_deductions ?? detailDeductions)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Net Pay */}
                    <div className="rounded-xl bg-emerald-50 px-5 py-4 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Net Take-Home Pay</p>
                      <p className="mt-1.5 text-[34px] font-bold leading-none text-emerald-700">
                        {fmtRupees(sel.net_salary)}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleDownload(sel)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Download className="h-4 w-4" /> Download PDF
                        </button>
                        <button
                          onClick={() => setShowQueryForm(v => !v)}
                          className="text-[13px] font-medium text-blue-600 underline hover:text-blue-700"
                        >
                          Raise a Query
                        </button>
                      </div>

                      {showQueryForm && (
                        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <input
                            type="text"
                            readOnly
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none"
                            defaultValue={`Query — ${formatMonth(sel)} Payslip`}
                          />
                          <textarea
                            rows={3}
                            value={queryMsg}
                            onChange={e => setQueryMsg(e.target.value)}
                            placeholder="Describe your query..."
                            className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={handleSendQuery}
                            disabled={sendingQuery || !queryMsg.trim()}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 py-2 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Send className="h-3.5 w-3.5" /> {sendingQuery ? 'Submitting...' : 'Submit'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </aside>
            )}
          </div>

          {/* ── Bottom Widgets ────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* Upcoming Payroll */}
            <PayslipPanel className="p-4">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="h-4 w-4 text-blue-600" />
                <h2 className="text-[15px] font-semibold text-slate-950">Upcoming Payroll</h2>
              </div>
              <div className="mt-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[13px] font-semibold text-slate-950">
                    {(() => {
                      const d = new Date();
                      const nextM = d.getMonth() + 2 > 12 ? 1 : d.getMonth() + 2;
                      const nextY = d.getMonth() + 2 > 12 ? d.getFullYear() + 1 : d.getFullYear();
                      return new Date(nextY, nextM - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
                    })()} Payroll
                  </p>
                  <p className="mt-3 text-[12px] text-slate-500">Expected on</p>
                  <p className="mt-1 text-[20px] font-semibold text-slate-950">Last day of month</p>
                </div>
                <div className="grid h-16 w-16 shrink-0 grid-cols-3 gap-1 rounded-lg bg-blue-100 p-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <span key={i} className={`rounded-sm ${i === 8 ? "bg-blue-600" : "bg-blue-300/70"}`} />
                  ))}
                </div>
              </div>
            </PayslipPanel>

            {/* YTD Summary */}
            <PayslipPanel className="p-4">
              <div className="flex items-center gap-2">
                <FileBadge className="h-4 w-4 text-slate-600" />
                <h2 className="text-[15px] font-semibold text-slate-950">Year-to-Date Summary</h2>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ["Total Net Pay", fmtRupees(totalNetPay)],
                  ["Total Deductions", fmtRupees(totalDeductions)],
                  ["Payslips", `${payslips.length} processed`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold text-slate-500">{label}</p>
                    <p className="text-[13px] font-semibold text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
            </PayslipPanel>

            {/* Quick Links */}
            <PayslipPanel className="p-4">
              <h2 className="text-[15px] font-semibold text-slate-950">Quick Links</h2>
              <div className="mt-4 space-y-3">
                {["Tax Documents", "Form 16", "Investment Declaration", "Loan Status"].map(link => (
                  <button key={link} className="flex w-full items-center justify-between gap-3 text-left text-[12px] font-semibold text-slate-700 hover:text-blue-700">
                    <span className="flex items-center gap-3"><FileText className="h-4 w-4 text-blue-600" />{link}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </PayslipPanel>

            {/* Finance Notifications */}
            <PayslipPanel className="p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-slate-600" />
                <h2 className="text-[15px] font-semibold text-slate-950">Finance Notifications</h2>
              </div>
              <div className="mt-4 space-y-3">
                {payslips.slice(0, 3).map(p => (
                  <div key={p.id} className="flex gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
                      <Check className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-slate-950">
                        {formatMonth(p)} payslip{" "}
                        {p.status === "processed" || p.status === "disbursed" ? "processed" : "available"}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">Net: {fmtRupees(p.net_salary)}</p>
                    </div>
                  </div>
                ))}
                {payslips.length === 0 && <p className="text-[12px] text-slate-500">No recent activity.</p>}
              </div>
            </PayslipPanel>
          </div>
        </>
      )}
    </div>
  );
}

// ── ManagerPayroll ────────────────────────────────────────────────────────────

export default function ManagerPayroll() {
  const [subTab, setSubTab] = useState<"team" | "my">("my");

  return (
    <ManagerFrame
      title="Payroll"
      subtitle="View your payslips and monitor team payroll status"
    >
      <div className="mb-5 flex w-fit gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setSubTab("my")}
          className={`rounded-lg px-5 py-2 text-sm font-bold transition-colors ${
            subTab === "my" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          My Payslips
        </button>
        <button
          onClick={() => setSubTab("team")}
          className={`rounded-lg px-5 py-2 text-sm font-bold transition-colors ${
            subTab === "team" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Team Summary
        </button>
      </div>

      {subTab === "my"   && <MyPayslipsSection />}
      {subTab === "team" && <TeamPayrollSummary onSwitchToMyPayslips={() => setSubTab("my")} />}
    </ManagerFrame>
  );
}
