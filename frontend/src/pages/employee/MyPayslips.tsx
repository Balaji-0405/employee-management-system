import { useState, useEffect } from "react";
import { X, Eye, Download, ChevronRight, Send, FileText, Info } from "lucide-react";
import { getMyPayslips, getMyPayslipDetail } from "../../services/payrollApi";
import { getMyLeaveBalance } from "../../services/leaveApi";
import { helpdeskAPI } from "../../lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PayslipSummary {
  id: string;
  run_id?: string;
  month: number;
  year: number;
  gross_salary?: number;
  net_salary?: number;
  lop_days?: number;
  status?: string;
}

interface PayslipDetail extends PayslipSummary {
  employee_name?: string;
  employee_id?: string;
  department?: string;
  designation?: string;
  pay_period?: string;
  bank_account_last4?: string;
  bank_account?: string;
  pay_date?: string;
  working_days?: number;
  present_days?: number;
  sl_used?: number;
  el_used?: number;
  absent_days?: number;
  basic_salary?: number;
  overtime_pay?: number;
  performance_bonus?: number;
  total_earnings?: number;
  lop_deduction?: number;
  professional_tax?: number;
  insurance_deduction?: number;
  loan_emi?: number;
  total_deductions?: number;
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

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function fmtMonth(month: number, year: number): string {
  return `${MONTHS[(month ?? 1) - 1]} ${year}`;
}

function fmtRupees(v?: number | null): string {
  return `₹${Math.round((v ?? 0) / 100).toLocaleString("en-IN")}`;
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function MyPayslips() {
  const [payslips, setPayslips] = useState<PayslipSummary[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipDetail | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showQueryForm, setShowQueryForm] = useState(false);
  const [queryMsg, setQueryMsg] = useState("");
  const [sendingQuery, setSendingQuery] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([getMyPayslips(), getMyLeaveBalance()]).then(([ps, lb]) => {
      if (ps.status === "fulfilled") {
        const raw = (ps.value as any[]) ?? [];
        // Normalize: add month/year from joined payroll_runs so existing rendering works
        const normalized = raw.map((p: any) => ({
          ...p,
          month: p.payroll_runs?.pay_month ?? p.month,
          year: p.payroll_runs?.pay_year ?? p.year,
        }));
        setPayslips(normalized);
      }
      if (lb.status === "fulfilled") setLeaveBalance(lb.value as LeaveBalance);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleViewDetails(p: PayslipSummary) {
    setSelectedPayslip(p as PayslipDetail);
    setShowQueryForm(false);
    setLoadingDetail(true);
    try {
      const detail = await getMyPayslipDetail(p.run_id ?? p.id);
      if (detail) {
        setSelectedPayslip({
          ...detail,
          month: detail.payroll_runs?.pay_month ?? p.month,
          year: detail.payroll_runs?.pay_year ?? p.year,
        } as PayslipDetail);
      }
    } catch {
      // keep summary data shown
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleDownload(p: PayslipSummary) {
    const ps = p as any;
    const monthName = fmtMonth(p.month, p.year);
    const fmt = (v: number) => Math.round((v || 0) / 100).toLocaleString("en-IN");
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
    <tr><td>Working Days</td><td>${ps.working_days ?? "—"}</td></tr>
    <tr><td>Present Days</td><td>${ps.present_days ?? "—"}</td></tr>
    <tr><td>LOP Days</td><td>${p.lop_days ?? 0}</td></tr>
  </table>
  <table>
    <tr><th>Earnings</th><th></th></tr>
    <tr><td>Basic Salary</td><td>₹${fmt(ps.basic_salary)}</td></tr>
    ${ps.ot_pay > 0 ? `<tr><td>Overtime</td><td>₹${fmt(ps.ot_pay)}</td></tr>` : ""}
    ${ps.bonus > 0 ? `<tr><td>Bonus</td><td>₹${fmt(ps.bonus)}</td></tr>` : ""}
    <tr><td><strong>Gross Salary</strong></td><td><strong>₹${fmt(ps.gross_salary)}</strong></td></tr>
  </table>
  <table>
    <tr><th>Deductions</th><th></th></tr>
    ${ps.lop_deduction > 0 ? `<tr><td>LOP Deduction</td><td>−₹${fmt(ps.lop_deduction)}</td></tr>` : ""}
    <tr><td>Professional Tax</td><td>−₹${fmt(ps.pt_deduction)}</td></tr>
    <tr><td>Group Insurance</td><td>−₹${fmt(ps.insurance_deduction)}</td></tr>
    ${ps.loan_deduction > 0 ? `<tr><td>Loan EMI</td><td>−₹${fmt(ps.loan_deduction)}</td></tr>` : ""}
    <tr><td><strong>Total Deductions</strong></td><td><strong>−₹${fmt(ps.total_deductions)}</strong></td></tr>
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
      const monthLabel = selectedPayslip
        ? fmtMonth(selectedPayslip.month, selectedPayslip.year)
        : 'Payslip';
      await helpdeskAPI.createTicket({
        subject: `Payslip Query — ${monthLabel}`,
        description: queryMsg.trim(),
        category: 'payroll',
        priority: 'medium',
      });
      setQueryMsg('');
      setShowQueryForm(false);
      setToast('Query submitted to HR. Track it in the Helpdesk section.');
    } catch (err: any) {
      setToast('Failed to submit: ' + err.message);
    } finally {
      setSendingQuery(false);
    }
  }

  // Derived leave values
  const slBalance  = leaveBalance?.sl_balance  ?? 0;
  const slEntitled = leaveBalance?.sl_entitled ?? 6;
  const slUsed     = leaveBalance?.sl_used     ?? 0;
  const elBalance  = leaveBalance?.el_balance  ?? 0;
  const elOpening  = leaveBalance?.el_opening  ?? 0;
  const elAccrued  = leaveBalance?.el_accrued  ?? 0;
  const elUsed     = leaveBalance?.el_used     ?? 0;
  const nextAccrual   = nextAccrualDate();
  const currentMonthNum = new Date().getMonth() + 1;

  // Derived payslip detail values
  const sel = selectedPayslip;
  const detailEarnings   = (sel?.basic_salary ?? 0) + (sel?.overtime_pay ?? 0) + (sel?.performance_bonus ?? 0);
  const detailDeductions = (sel?.lop_deduction ?? 0) + (sel?.professional_tax ?? 200) + (sel?.insurance_deduction ?? 500) + (sel?.loan_emi ?? 0);
  const bankDisplay = sel?.bank_account_last4
    ? `****${sel.bank_account_last4}`
    : sel?.bank_account
    ? `****${sel.bank_account.slice(-4)}`
    : "****XXXX";

  return (
    <div className="min-h-full bg-[#f8fafc]">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-5 py-3 text-[13px] font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}

      <div className="w-full space-y-4 p-4 lg:p-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <span>My Account</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-slate-900">Payslips</span>
        </nav>

        <h1 className="text-[28px] font-semibold leading-tight text-slate-950">My Payslips</h1>

        {/* ── Leave Balance Banner ─────────────────────────────────────────── */}
        {!loading && leaveBalance && (
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Sick Leave */}
            <section className="rounded-lg border border-blue-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Sick Leave</p>
              <p className="mt-1 text-[40px] font-bold leading-none text-slate-950">{slBalance}</p>
              <p className="mt-1 text-[12px] text-slate-500">of {slEntitled} days this year</p>
              <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-red-400"    style={{ width: `${Math.min(100, (slUsed    / slEntitled) * 100)}%` }} />
                <div className="h-full bg-blue-400"   style={{ width: `${Math.min(100, (slBalance  / slEntitled) * 100)}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">Resets Jan 1 — unused SL lapses</p>
            </section>

            {/* Earned Leave — hover tooltip */}
            <section className="relative rounded-lg border border-green-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] group">
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide text-green-600">Earned Leave</p>
                <Info className="h-3.5 w-3.5 cursor-help text-slate-400" />
              </div>
              {/* Tooltip */}
              <div className="pointer-events-none absolute left-1/2 top-10 z-20 hidden w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg group-hover:block">
                <div className="space-y-1.5 text-[11px] text-slate-700">
                  <div className="flex justify-between">
                    <span>Carried from last year:</span>
                    <span className="font-semibold">{elOpening} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accrued ({currentMonthNum} months × 1.5):</span>
                    <span className="font-semibold">{elAccrued} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Used:</span>
                    <span className="font-semibold">{elUsed} days</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5 font-semibold">
                    <span>Balance:</span>
                    <span>{elBalance} days</span>
                  </div>
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

        {/* ── Payslip Table + Detail Panel ────────────────────────────────── */}
        <div className={`flex gap-4 ${sel ? "items-start" : ""}`}>
          {/* Table */}
          <section className="min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            {loading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />)}
              </div>
            ) : payslips.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-100">
                  <FileText className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-[15px] font-semibold text-slate-700">
                  Your payslips will appear here once payroll is processed
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead className="bg-slate-50 text-[12px] font-semibold text-slate-600">
                    <tr>
                      {["Month", "Gross", "Net Pay", "LOP Days", "Actions"].map(h => (
                        <th key={h} className="px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payslips.map(p => (
                      <tr
                        key={p.id}
                        className={`transition-colors hover:bg-slate-50/70 ${sel?.id === p.id ? "bg-blue-50/50" : ""}`}
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">{fmtMonth(p.month, p.year)}</td>
                        <td className="px-4 py-3 text-slate-700">{fmtRupees(p.gross_salary)}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">{fmtRupees(p.net_salary)}</td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${(p.lop_days ?? 0) > 0 ? "text-red-600" : "text-slate-400"}`}>
                            {p.lop_days ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDetails(p)}
                              title="View Details"
                              className="grid h-8 w-8 place-items-center rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-blue-600"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(p)}
                              title="Download PDF"
                              className="grid h-8 w-8 place-items-center rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-blue-600"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">TechCorp</p>
                      <h2 className="mt-0.5 text-[17px] font-semibold text-slate-950">
                        Payslip — {fmtMonth(sel.month, sel.year)}
                      </h2>
                    </div>
                    <button
                      onClick={() => { setSelectedPayslip(null); setShowQueryForm(false); }}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Employee Info */}
                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-[12px]">
                    <div className="space-y-2.5">
                      {[
                        ["Employee Name", sel.employee_name],
                        ["Employee ID",   sel.employee_id],
                        ["Department",    sel.department],
                        ["Designation",   sel.designation],
                      ].map(([label, value]) => (
                        <div key={label as string}>
                          <p className="text-slate-500">{label}</p>
                          <p className="font-semibold text-slate-900">{value ?? "—"}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2.5">
                      {[
                        ["Pay Period",    sel.pay_period ?? fmtMonth(sel.month, sel.year)],
                        ["Bank Account",  bankDisplay],
                        ["Pay Date",      sel.pay_date ?? "Last working day"],
                      ].map(([label, value]) => (
                        <div key={label as string}>
                          <p className="text-slate-500">{label}</p>
                          <p className="font-semibold text-slate-900">{value ?? "—"}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attendance mini-cards */}
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

                  {/* Earnings Table */}
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Earnings</p>
                    <div className="overflow-hidden rounded-lg border border-slate-100">
                      <table className="w-full text-[12px]">
                        <tbody className="divide-y divide-slate-50 bg-white">
                          <tr>
                            <td className="px-3 py-2 text-slate-700">Basic Salary</td>
                            <td className="px-3 py-2 text-right font-medium text-slate-900">{fmtRupees(sel.basic_salary)}</td>
                          </tr>
                          {(sel.overtime_pay ?? 0) > 0 && (
                            <tr>
                              <td className="px-3 py-2 text-slate-700">Overtime Pay</td>
                              <td className="px-3 py-2 text-right font-medium text-slate-900">{fmtRupees(sel.overtime_pay)}</td>
                            </tr>
                          )}
                          {(sel.performance_bonus ?? 0) > 0 && (
                            <tr>
                              <td className="px-3 py-2 text-slate-700">Performance Bonus</td>
                              <td className="px-3 py-2 text-right font-medium text-slate-900">{fmtRupees(sel.performance_bonus)}</td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-200 bg-slate-50">
                            <td className="px-3 py-2.5 font-bold text-slate-900">Total Earnings</td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                              {fmtRupees(sel.total_earnings ?? detailEarnings)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Deductions Table */}
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
                            <td className="px-3 py-2 text-right font-medium text-slate-900">{fmtRupees(sel.professional_tax ?? 200)}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 text-slate-700">Group Health Insurance</td>
                            <td className="px-3 py-2 text-right font-medium text-slate-900">{fmtRupees(sel.insurance_deduction ?? 500)}</td>
                          </tr>
                          {(sel.loan_emi ?? 0) > 0 && (
                            <tr>
                              <td className="px-3 py-2 text-slate-700">Loan EMI</td>
                              <td className="px-3 py-2 text-right font-medium text-slate-900">{fmtRupees(sel.loan_emi)}</td>
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

                  {/* Net Pay Card */}
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

                    {/* Raise Query Form */}
                    {showQueryForm && (
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <input
                          type="text"
                          readOnly
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none"
                          defaultValue={`Query — ${fmtMonth(sel.month, sel.year)} Payslip`}
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
      </div>
    </div>
  );
}
