import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  Download,
  X,
  Check,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";
import {
  getPayrollRuns,
  createPayrollRun,
  computePayrollRun,
  lockPayrollRun,
  disbursePayrollRun,
  getBankFile,
} from "../../../services/payrollApi";
import { apiFetch } from "../../../lib/api";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function paiseToRs(paise: number | null | undefined): number {
  return Math.round((paise || 0) / 100);
}

function formatPeriod(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

// ── Status Badge ─────────────────────────────────────────────────────────────

type RunStatus = "draft" | "computed" | "locked" | "disbursed";

function StatusBadge({ status }: { status: RunStatus }) {
  const styles: Record<RunStatus, string> = {
    draft: "bg-slate-100 text-slate-600",
    computed: "bg-blue-100 text-blue-700",
    locked: "bg-amber-100 text-amber-700",
    disbursed: "bg-green-100 text-green-700",
  };
  const labels: Record<RunStatus, string> = {
    draft: "Draft",
    computed: "Computed — Ready to Review",
    locked: "Locked",
    disbursed: "Disbursed ✓",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${bg}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

// ── Run Payroll Modal ─────────────────────────────────────────────────────────

function RunPayrollModal({
  run,
  computing,
  computeResult,
  onCompute,
  onClose,
  onViewRegister,
}: {
  run: any;
  computing: boolean;
  computeResult: any;
  onCompute: () => void;
  onClose: () => void;
  onViewRegister: () => void;
}) {
  const period = run ? formatPeriod(run.month, run.year) : "";
  const checklist = [
    { label: "Salary configs complete", ok: true },
    { label: "Attendance locked", ok: true },
    { label: "Leave requests resolved", ok: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">Run Payroll — {period}</p>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!computeResult && (
            <>
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Pre-run Checklist
                </p>
                {checklist.map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-3 text-sm">
                    {ok ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-400" />
                    )}
                    <span className={ok ? "text-slate-700" : "text-red-600"}>{label}</span>
                  </div>
                ))}
              </div>

              {computing ? (
                <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Computing payroll for {run?.total_employees ?? "—"} employees...
                </div>
              ) : (
                <button
                  onClick={onCompute}
                  className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Start Computation
                </button>
              )}
            </>
          )}

          {computeResult && (
            <div className="space-y-4">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
                <p className="text-sm font-bold text-green-800">Computation Complete</p>
                <p className="text-xs text-green-700">
                  {computeResult.processed} employees processed
                </p>
                {computeResult.blockers > 0 && (
                  <p className="text-xs text-amber-700 font-semibold">
                    ⚠ {computeResult.blockers} blockers found — review required
                  </p>
                )}
              </div>
              <button
                onClick={onViewRegister}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                View Register
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Disburse Modal ────────────────────────────────────────────────────────────

function DisburseModal({
  run,
  onConfirm,
  onClose,
}: {
  run: any;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const period = run ? formatPeriod(run.month, run.year) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">
            Confirm Disbursement — {period}
          </p>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Total Employees</p>
              <p className="font-bold text-slate-900">{run?.total_employees ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Net Payout</p>
              <p className="font-bold text-slate-900">₹{formatINR(paiseToRs(run?.total_net))}</p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            This will release payslips to all employees and cannot be undone.
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              Confirm & Disburse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PayrollDashboard() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<any[]>([]);
  const [currentRun, setCurrentRun] = useState<any>(null);
  const [showRunModal, setShowRunModal] = useState(false);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [computing, setComputing] = useState(false);
  const [computeResult, setComputeResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);

  useEffect(() => {
    getPayrollRuns()
      .then((data) => {
        setRuns(data);
        if (data.length > 0) setCurrentRun(data[0]);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!currentRun) return;
    apiFetch(`/leaves/requests?status=pending&pay_month=${currentRun.month}&pay_year=${currentRun.year}`)
      .then((data: any) => {
        const count = Array.isArray(data) ? data.length : (data?.count ?? data?.total ?? 0);
        setPendingLeaveCount(count);
      })
      .catch(() => {});
  }, [currentRun]);

  async function handleCompute() {
    if (!currentRun) return;
    setComputing(true);
    setComputeResult(null);
    try {
      const result = await computePayrollRun(currentRun.id);
      setComputeResult(result);
      const updated = await getPayrollRuns();
      setRuns(updated);
      if (updated.length > 0) setCurrentRun(updated[0]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setComputing(false);
    }
  }

  async function handleLock() {
    if (!currentRun) return;
    try {
      setLoading(true);
      await lockPayrollRun(currentRun.id);
      const updated = await getPayrollRuns();
      setRuns(updated);
      if (updated.length > 0) setCurrentRun(updated[0]);
      setSuccess('Payroll locked successfully');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisburse() {
    if (!currentRun) return;
    try {
      await disbursePayrollRun(currentRun.id);
      setShowDisburseModal(false);
      const updated = await getPayrollRuns();
      setRuns(updated);
      if (updated.length > 0) setCurrentRun(updated[0]);
      setSuccess('Payroll disbursed! Employees can now view their payslips.');
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleCreateRun() {
    const now = new Date();
    try {
      await createPayrollRun(now.getMonth() + 1, now.getFullYear());
      const updated = await getPayrollRuns();
      setRuns(updated);
      if (updated.length > 0) setCurrentRun(updated[0]);
    } catch (e: any) {
      if (e.message?.includes('already exists') || e.status === 409) {
        // Run exists — just refresh, don't show error
        const updated = await getPayrollRuns();
        setRuns(updated);
        if (updated.length > 0) setCurrentRun(updated[0]);
      } else {
        setError(e.message);
      }
    }
  }

  const status: RunStatus | null = currentRun?.status ?? null;
  const blockers: any[] = currentRun?.blockers ?? [];
  const showBlockers =
    status &&
    (status === "draft" || status === "computed") &&
    blockers.length > 0;

  return (
    <div className="min-h-full bg-slate-50 px-5 py-5">
      {/* Breadcrumb */}
      <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
        <span className="cursor-pointer hover:text-blue-600">Dashboard</span>
        <span>›</span>
        <span className="cursor-pointer hover:text-blue-600">Payroll</span>
        <span>›</span>
        <span className="font-semibold text-slate-700">Dashboard</span>
      </nav>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Payroll Management</h1>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          <Check className="h-4 w-4 shrink-0" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Current Period Banner */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {!currentRun ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">No payroll run for this month</p>
              <p className="text-xs text-slate-400 mt-0.5">Create a new payroll run to get started</p>
            </div>
            <button
              onClick={handleCreateRun}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create One
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {formatPeriod(currentRun.month, currentRun.year)}
                </p>
                <div className="mt-1">
                  <StatusBadge status={currentRun.status} />
                </div>
              </div>
            </div>
            <div>
              {status === "draft" && (
                <button
                  onClick={() => { setShowRunModal(true); setComputeResult(null); }}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Run Payroll
                </button>
              )}
              {status === "computed" && (
                <button
                  onClick={handleLock}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {loading ? 'Locking...' : 'Lock Payroll'}
                </button>
              )}
              {status === "locked" && (
                <button
                  onClick={() => setShowDisburseModal(true)}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Disburse to Employees
                </button>
              )}
              {status === "disbursed" && (
                <button
                  onClick={() => navigate("/payroll/register")}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View Register
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      {currentRun && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={Users}
            label="Total Employees"
            value={String(currentRun.total_employees ?? "—")}
            bg="bg-blue-500"
          />
          <KpiCard
            icon={TrendingUp}
            label="Gross Payout"
            value={`₹${formatINR(paiseToRs(currentRun.total_gross))}`}
            bg="bg-emerald-500"
          />
          <KpiCard
            icon={DollarSign}
            label="Net Payout"
            value={`₹${formatINR(paiseToRs(currentRun.total_net))}`}
            bg="bg-indigo-500"
          />
          <KpiCard
            icon={TrendingDown}
            label="Total Deductions"
            value={`₹${formatINR(paiseToRs(currentRun.total_deductions))}`}
            bg="bg-rose-500"
          />
        </div>
      )}

      {/* Blockers */}
      {showBlockers && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-red-700 mb-3">
            <AlertCircle className="h-4 w-4" />
            ⚠ {blockers.length} employee{blockers.length !== 1 ? "s" : ""} have blockers — resolve before locking
          </div>
          <div className="space-y-2">
            {blockers.slice(0, 5).map((b: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white border border-red-100 px-3 py-2 text-xs">
                <span className="font-semibold text-slate-800">{b.employee_name}</span>
                <span className="text-red-600">{b.blocker_type}</span>
                <button className="text-blue-600 font-semibold hover:underline">Fix</button>
              </div>
            ))}
          </div>
          {blockers.length > 5 && (
            <button className="mt-2 text-xs font-semibold text-red-700 hover:underline">
              View all {blockers.length} blockers
            </button>
          )}
        </div>
      )}

      {/* Leave blocker */}
      {pendingLeaveCount > 0 && status && (status === "draft" || status === "computed") && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <AlertCircle className="h-4 w-4" />
            {pendingLeaveCount} pending leave request{pendingLeaveCount !== 1 ? "s" : ""} not yet approved
          </div>
          <button
            onClick={() => navigate("/manager/leaves")}
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            Go to Team Leaves →
          </button>
        </div>
      )}

      {/* Payroll History */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <p className="text-sm font-bold text-slate-900">Payroll History</p>
          <button
            onClick={handleCreateRun}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New Run
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-600">
                {["Period", "Employees", "Gross (₹)", "Net (₹)", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No payroll runs found
                  </td>
                </tr>
              ) : (
                runs.map((run: any) => (
                  <tr key={run.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {formatPeriod(run.month, run.year)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{run.total_employees ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700">₹{formatINR(paiseToRs(run.total_gross))}</td>
                    <td className="px-4 py-3 text-slate-700">₹{formatINR(paiseToRs(run.total_net))}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <button
                          title="View Register"
                          onClick={() => navigate("/payroll/register")}
                          className="grid h-7 w-7 place-items-center rounded-md hover:bg-slate-100 hover:text-blue-600"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {(run.status === "locked" || run.status === "disbursed") && (
                          <button
                            title="Download Bank File"
                            onClick={() => getBankFile(run.id)}
                            className="grid h-7 w-7 place-items-center rounded-md hover:bg-slate-100 hover:text-blue-600"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showRunModal && currentRun && (
        <RunPayrollModal
          run={currentRun}
          computing={computing}
          computeResult={computeResult}
          onCompute={handleCompute}
          onClose={() => setShowRunModal(false)}
          onViewRegister={() => { setShowRunModal(false); navigate("/payroll/register"); }}
        />
      )}

      {showDisburseModal && currentRun && (
        <DisburseModal
          run={currentRun}
          onConfirm={handleDisburse}
          onClose={() => setShowDisburseModal(false)}
        />
      )}
    </div>
  );
}
