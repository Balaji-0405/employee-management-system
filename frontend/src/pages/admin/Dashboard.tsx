import { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  AlertCircle,
  Award,
  BarChart2,
  Briefcase,
  Building2,
  Calendar,
  CalendarOff,
  Check,
  ChevronRight,
  Clock,
  ClockAlert,
  FileText,
  Lock,
  Mail,
  Megaphone,
  Plus,
  Shield,
  TrendingDown,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { getPayrollRuns } from "../../services/payrollApi";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const CRITICAL_ALERTS = [
  "Payroll cutoff in 4 hours — 12 timesheets still pending approval",
  "2 leave approvals have breached 72hr SLA",
  "EMP0234 contract expires in 3 days",
];

type KpiCardData = {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  sub: string;
  subColor: string;
  route: string;
  redBorder?: boolean;
  loading?: boolean;
};


const WORKFORCE_SNAPSHOT = [
  { label: "Active", count: 1180, pct: 94, color: "bg-green-500" },
  { label: "On Leave", count: 32, pct: 3, color: "bg-orange-500" },
  { label: "On Probation", count: 24, pct: 2, color: "bg-purple-500" },
  { label: "Inactive", count: 12, pct: 1, color: "bg-slate-400" },
];

const ATTENDANCE_DONUT = [
  { name: "Present", value: 1094, pct: "87.6%", color: "#22c55e" },
  { name: "Absent", value: 98, pct: "7.9%", color: "#ef4444" },
  { name: "Late", value: 31, pct: "2.5%", color: "#f97316" },
  { name: "On Leave", value: 32, pct: "2.6%", color: "#a855f7" },
];

const PAYROLL_STEPS = ["Data", "Validate", "Lock", "Process", "Disburse"];
const PAYROLL_STEPS_DONE = 3;

const PAYROLL_BLOCKERS = [
  "12 timesheets pending approval",
  "3 salary revisions not confirmed",
  "1 new joiner bank details missing",
];

const DEPT_HEALTH = [
  { dept: "Engineering", hc: 340, attendance: 76, ok: false, leave: 8, score: 72 },
  { dept: "Product", hc: 89, attendance: 91, ok: true, leave: 2, score: 94 },
  { dept: "Design", hc: 45, attendance: 88, ok: true, leave: 1, score: 91 },
  { dept: "HR", hc: 28, attendance: 95, ok: true, leave: 0, score: 97 },
  { dept: "Sales", hc: 180, attendance: 78, ok: false, leave: 12, score: 75 },
];

const RECRUITMENT_FUNNEL = [
  { stage: "Applied", count: 186, widthPct: "100%" },
  { stage: "Screening", count: 43, widthPct: "46%" },
  { stage: "Interview", count: 18, widthPct: "28%" },
  { stage: "Offer", count: 6, widthPct: "14%" },
];

type Priority = "red" | "orange" | "yellow";

type ActionItem = {
  id: number;
  priority: Priority;
  title: string;
  detail: string;
  meta: string;
  actions: { label: string; variant: "primary" | "default" | "danger" }[];
};

const PENDING_ACTIONS: ActionItem[] = [
  {
    id: 1, priority: "red", title: "Leave SLA breach", detail: "John M.", meta: "74hrs pending · Annual leave 3d",
    actions: [{ label: "Approve", variant: "primary" }, { label: "Reject", variant: "danger" }, { label: "Reassign", variant: "default" }],
  },
  {
    id: 2, priority: "orange", title: "Timesheet approval", detail: "8 employees", meta: "Week of 19 May",
    actions: [{ label: "Bulk Approve", variant: "primary" }, { label: "View All", variant: "default" }],
  },
  {
    id: 3, priority: "orange", title: "Expense claim", detail: "Sarah K.", meta: "₹12,400 · Travel",
    actions: [{ label: "Review", variant: "default" }, { label: "Approve", variant: "primary" }, { label: "Reject", variant: "danger" }],
  },
  {
    id: 4, priority: "yellow", title: "Document expiry", detail: "EMP0234", meta: "Contract expires in 3 days",
    actions: [{ label: "View", variant: "default" }, { label: "Notify Employee", variant: "default" }],
  },
];

const PRIORITY_DOT: Record<Priority, string> = { red: "bg-red-500", orange: "bg-orange-400", yellow: "bg-yellow-400" };

const DEADLINES = [
  {
    label: "TODAY",
    items: [
      { text: "Probation review — Neha P.", icon: Clock },
      { text: "IT asset return — Rahul V. exit", icon: Building2 },
    ],
  },
  {
    label: "THIS WEEK",
    items: [
      { text: "Payroll cutoff — 31 May", icon: Calendar },
      { text: "Appraisal cycle end — 30 May", icon: Award },
      { text: "Contract renewal — EMP0234", icon: FileText },
    ],
  },
  {
    label: "NEXT WEEK",
    items: [
      { text: "New joiner batch — 3 employees", icon: UserPlus },
      { text: "Q1 compliance report due", icon: Shield },
    ],
  },
];

const QUICK_ACTIONS = [
  { label: "Add Employee", icon: Plus, route: "/workforce/directory" },
  { label: "Announce", icon: Megaphone, route: "/announcements/feed" },
  { label: "Run Payroll", icon: Wallet, route: "/compensation/payroll" },
  { label: "Report", icon: BarChart2, route: "/intelligence/workforce" },
  { label: "Lock Attendance", icon: Lock, route: "/time-management/attendance" },
  { label: "Bulk Email", icon: Mail, route: "/announcements/feed" },
];

const HEADCOUNT_TREND = [
  { month: "Jun", count: 1180 }, { month: "Jul", count: 1192 },
  { month: "Aug", count: 1198 }, { month: "Sep", count: 1205 },
  { month: "Oct", count: 1210 }, { month: "Nov", count: 1215 },
  { month: "Dec", count: 1218 }, { month: "Jan", count: 1222 },
  { month: "Feb", count: 1228 }, { month: "Mar", count: 1234 },
  { month: "Apr", count: 1240 }, { month: "May", count: 1248 },
];

const ATTRITION_DATA = [
  { dept: "HR", rate: 3 }, { dept: "Product", rate: 4 },
  { dept: "Design", rate: 5 }, { dept: "Finance", rate: 6 },
  { dept: "Eng", rate: 9 }, { dept: "Sales", rate: 14 },
];

const COST_BUDGET_DATA = [
  { month: "Jan", actual: 2.2, budget: 2.4 },
  { month: "Feb", actual: 2.3, budget: 2.4 },
  { month: "Mar", actual: 2.35, budget: 2.4 },
  { month: "Apr", actual: 2.38, budget: 2.4 },
  { month: "May", actual: 2.5, budget: 2.4 },
];

const COMPLIANCE_ITEMS = [
  { label: "Document expiries", status: "3 this week", color: "bg-orange-100 text-orange-700" },
  { label: "Contract renewals", status: "2 this month", color: "bg-orange-100 text-orange-700" },
  { label: "Probation reviews", status: "5 pending", color: "bg-yellow-100 text-yellow-700" },
  { label: "Policy acknowledgements", status: "18 pending", color: "bg-yellow-100 text-yellow-700" },
  { label: "Statutory filings", status: "All clear", color: "bg-green-100 text-green-700" },
  { label: "Open audit items", status: "2 open", color: "bg-red-100 text-red-700" },
];

const ACTIVITY_FEED = [
  { dot: "bg-green-500", text: "Priya S. clocked in", time: "9:02 AM" },
  { dot: "bg-blue-500", text: "Leave approved — Rahul V. (3 days)", time: "8:55 AM" },
  { dot: "bg-yellow-500", text: "New ticket raised — EMP0445 #TK-892", time: "8:41 AM" },
  { dot: "bg-red-500", text: "Timesheet rejected — Vikram S.", time: "8:30 AM" },
  { dot: "bg-green-500", text: "Offer accepted — Candidate #REC-234", time: "8:15 AM" },
  { dot: "bg-purple-500", text: "Salary revised — Anjali M. (+12%)", time: "8:02 AM" },
];

const ACTIVITY_POOL = [
  { dot: "bg-green-500", text: "Arun K. clocked in" },
  { dot: "bg-blue-500", text: "Leave approved — Neha P. (2 days)" },
  { dot: "bg-yellow-500", text: "New ticket raised — EMP0501 #TK-903" },
  { dot: "bg-red-500", text: "Timesheet rejected — Ravi T." },
  { dot: "bg-green-500", text: "Offer accepted — Candidate #REC-241" },
  { dot: "bg-purple-500", text: "Salary revised — Vikram S. (+8%)" },
  { dot: "bg-orange-500", text: "Probation review completed — Neha P." },
  { dot: "bg-blue-500", text: "Policy acknowledged — 24 employees" },
];

// ─── Toast System ─────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => dismissRef.current(toast.id), 3000);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [toast.id]);

  const bg =
    toast.type === "success" ? "bg-green-600" :
    toast.type === "error"   ? "bg-red-600"   :
    "bg-blue-600";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${bg}`}
      style={{
        transition: "opacity 0.25s, transform 0.25s",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
      }}
    >
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => dismissRef.current(toast.id)} className="shrink-0 opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function ConfirmPayrollModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-base font-semibold text-slate-900">Process Payroll</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          The following blockers are still unresolved. You can resolve them first or process anyway.
        </p>
        <div className="mt-4 space-y-2">
          {PAYROLL_BLOCKERS.map((b, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-orange-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <span>{b}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Process Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickAnnounceModal({ onClose, onSend }: { onClose: () => void; onSend: () => void }) {
  const [text, setText] = useState("");
  const [audience, setAudience] = useState("All Employees");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-base font-semibold text-slate-900">New Announcement</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-600">Audience</p>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none"
            >
              {["All Employees", "Engineering", "Product", "Design", "HR", "Sales"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Message</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Type your announcement..."
              className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (text.trim()) onSend(); }}
            disabled={!text.trim()}
            className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmLockModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-base font-semibold text-slate-900">Lock Attendance</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          This will lock today's attendance records. Employees will no longer be able to submit corrections. Continue?
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Lock
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

// ─── Section 1: Greeting Banner ───────────────────────────────────────────────

function GreetingBanner() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{getGreeting()}, Admin</h1>
        <p className="mt-1 text-sm text-slate-500">{getFormattedDate()}</p>
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-bold text-red-600">3</span> critical items need your attention today
        </p>
      </div>
      <div className="shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Org health score</p>
        <p className="mt-1 text-4xl font-bold text-green-600">
          87<span className="text-xl font-normal text-slate-400">/100</span>
        </p>
        <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-[87%] rounded-full bg-green-500" />
        </div>
        <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
          <TrendingDown className="h-3.5 w-3.5 text-red-400" />
          3 pts from yesterday
        </p>
      </div>
    </div>
  );
}

// ─── Section 2: Critical Alerts Banner ────────────────────────────────────────

function CriticalAlertsBanner({ onDismiss }: { onDismiss: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
      <div className="flex-1 space-y-1.5">
        {CRITICAL_ALERTS.map((alert, i) => (
          <p key={i} className="text-sm text-red-800">{alert}</p>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <button
          onClick={() => navigate("/workflow/approvals")}
          className="text-sm font-semibold text-red-700 underline underline-offset-2 hover:text-red-900"
        >
          View All
        </button>
        <button
          onClick={onDismiss}
          className="text-sm font-semibold text-red-400 hover:text-red-600"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Section 3: KPI Cards ─────────────────────────────────────────────────────

function KpiCard({ icon: Icon, iconBg, iconColor, value, label, sub, subColor, route, redBorder, loading }: KpiCardData) {
  const navigate = useNavigate();
  return (
    <article
      onClick={() => navigate(route)}
      className="relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      {redBorder && (
        <span className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-red-500" />
      )}
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </span>
        <div>
          {loading ? (
            <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
          ) : (
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          )}
          <p className="text-xs font-medium text-slate-500">{label}</p>
        </div>
      </div>
      <p className={`mt-3 text-xs font-semibold ${subColor}`}>{sub}</p>
    </article>
  );
}

// ─── Section 4 Left — Widget 1: Workforce Snapshot ────────────────────────────

function WorkforceSnapshot({ deptBreakdown, loading }: { deptBreakdown: { name: string; count: number }[]; loading: boolean }) {
  const navigate = useNavigate();
  const total = deptBreakdown.reduce((s, d) => s + d.count, 0);
  const maxCount = deptBreakdown.length > 0 ? Math.max(...deptBreakdown.map(d => d.count)) : 1;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Workforce snapshot</h2>
        <button
          onClick={() => navigate("/workforce/directory")}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
        >
          View directory <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <span className="h-4 w-14 animate-pulse rounded bg-slate-200" />
              <div className="h-2 flex-1 animate-pulse rounded-full bg-slate-200" />
            </div>
          ))
        ) : deptBreakdown.length > 0 ? (
          deptBreakdown.map(({ name, count }) => (
            <div key={name} className="flex items-center gap-3">
              <span className="w-28 truncate text-sm text-slate-700">{name}</span>
              <span className="w-14 text-right text-sm font-semibold text-slate-900">
                {count.toLocaleString()}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.round((count / maxCount) * 100)}%` }} />
              </div>
              <span className="w-8 text-right text-xs text-slate-500">
                {total > 0 ? `${Math.round((count / total) * 100)}%` : '—'}
              </span>
            </div>
          ))
        ) : (
          WORKFORCE_SNAPSHOT.map(({ label, count, pct, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-28 text-sm text-slate-700">{label}</span>
              <span className="w-14 text-right text-sm font-semibold text-slate-900">
                {count.toLocaleString()}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 text-right text-xs text-slate-500">{pct}%</span>
            </div>
          ))
        )}
      </div>
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        {deptBreakdown.length > 0 ? (
          <>Department breakdown · <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> employees</>
        ) : (
          <>This month: <span className="font-medium text-green-600">+8 joined</span> · <span className="font-medium text-red-500">-3 resigned</span> · Net: <span className="font-semibold text-slate-700">+5</span></>
        )}
      </p>
    </div>
  );
}

// ─── Section 4 Left — Widget 2: Attendance Today ──────────────────────────────

function AttendanceToday() {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Attendance today</h2>
          <p className="text-xs text-slate-500">{today}</p>
        </div>
        <button
          onClick={() => navigate("/time-management/attendance")}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
        >
          View attendance <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex items-center gap-6">
        <div className="shrink-0">
          <PieChart width={160} height={160}>
            <Pie
              data={ATTENDANCE_DONUT}
              cx={80}
              cy={80}
              innerRadius={48}
              outerRadius={72}
              dataKey="value"
              stroke="none"
            >
              {ATTENDANCE_DONUT.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </div>
        <div className="flex-1 space-y-2.5">
          {ATTENDANCE_DONUT.map(({ name, value, pct, color }) => (
            <div key={name} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="flex-1 text-sm text-slate-700">{name}</span>
              <span className="text-sm font-semibold text-slate-900">{value.toLocaleString()}</span>
              <span className="w-12 text-right text-xs text-slate-500">{pct}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
          Engineering 76% ⚠
        </span>
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
          Sales 78% ⚠
        </span>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPeriod(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function statusToSteps(status: string): number {
  if (status === "draft")     return 1;
  if (status === "computed")  return 2;
  if (status === "locked")    return 3;
  if (status === "disbursed") return 5;
  return 0;
}

// ─── Section 4 Left — Widget 3: Payroll Processing Status ────────────────────

const PAYROLL_STATUS_BADGE: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-600",
  computed:  "bg-blue-100 text-blue-700",
  locked:    "bg-purple-100 text-purple-700",
  disbursed: "bg-green-100 text-green-700",
};

function payrollActionLabel(status?: string): string {
  if (status === "draft")     return "Run Payroll";
  if (status === "computed")  return "Review & Lock";
  if (status === "locked")    return "Disburse";
  if (status === "disbursed") return "View Register";
  return "Create Payroll Run";
}

function PayrollProcessingStatus({
  onProcessPayroll,
  stepsDone,
  blockers,
  period,
  status,
  totalNet,
}: {
  onProcessPayroll: () => void;
  stepsDone: number;
  blockers: string[];
  period: string;
  status?: string;
  totalNet?: number;
}) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Payroll processing — {period}</h2>
        {status && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PAYROLL_STATUS_BADGE[status] ?? "bg-slate-100 text-slate-600"}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-start">
        {PAYROLL_STEPS.map((step, i) => (
          <Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                  i < stepsDone
                    ? "border-green-500 bg-green-500"
                    : "border-slate-300 bg-white"
                }`}
              >
                {i < stepsDone && <Check className="h-3.5 w-3.5 text-white" />}
              </div>
              <span className="mt-1.5 text-center text-[10px] font-medium text-slate-500">{step}</span>
            </div>
            {i < PAYROLL_STEPS.length - 1 && (
              <div
                className={`mb-3.5 mt-3.5 h-0.5 flex-1 ${
                  i < stepsDone - 1 ? "bg-green-500" : "bg-slate-200"
                }`}
              />
            )}
          </Fragment>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Readiness score</span>
          <span className="font-bold text-green-600">
            {stepsDone >= 5 ? "100%" : `${Math.round((stepsDone / PAYROLL_STEPS.length) * 100)}%`}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-green-500"
            style={{ width: `${stepsDone >= 5 ? 100 : Math.round((stepsDone / PAYROLL_STEPS.length) * 100)}%` }}
          />
        </div>
        {totalNet !== undefined && (
          <p className="mt-3 text-sm text-slate-600">
            Total Net:{" "}
            <span className="font-bold text-slate-900">
              ₹{(totalNet / 100).toLocaleString("en-IN")}
            </span>
          </p>
        )}
      </div>

      {blockers.length > 0 && (
        <div className="mt-4 space-y-2">
          {blockers.map((b, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-orange-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <span>{b}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <button
          onClick={() => navigate("/workflow/approvals")}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Resolve Blockers
        </button>
        <button
          onClick={status === "disbursed" ? () => navigate("/compensation/payroll") : onProcessPayroll}
          className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {payrollActionLabel(status)}
        </button>
      </div>
    </div>
  );
}

// ─── Section 4 Left — Widget 4: Department Health Matrix ─────────────────────

function DepartmentHealthMatrix() {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Department health</h2>
        <button
          onClick={() => navigate("/departments/directory")}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
        >
          View all <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Department</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">HC</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Attendance</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Leave</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {DEPT_HEALTH.map(({ dept, hc, attendance, ok, leave, score }) => (
              <tr key={dept}>
                <td className="py-2.5 font-medium text-slate-900">{dept}</td>
                <td className="py-2.5 text-center text-slate-600">{hc}</td>
                <td className={`py-2.5 text-center text-sm font-semibold ${ok ? "text-green-600" : "text-orange-600"}`}>
                  {attendance}% {ok ? "✓" : "⚠"}
                </td>
                <td className="py-2.5 text-center text-slate-600">{leave}</td>
                <td className="py-2.5 text-center">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      score >= 85 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {score}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section 4 Left — Widget 5: Recruitment Pipeline ─────────────────────────

function RecruitmentPipeline() {
  const navigate = useNavigate();
  const barColors = ["bg-blue-500", "bg-cyan-500", "bg-violet-500", "bg-green-500"];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Recruitment pipeline</h2>
        <button
          onClick={() => navigate("/recruitment/jobs")}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
        >
          View recruitment <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {RECRUITMENT_FUNNEL.map(({ stage, count, widthPct }, i) => (
          <div key={stage} className="flex items-center gap-3">
            <span className="w-20 text-sm text-slate-600">{stage}</span>
            <div
              className={`flex h-7 min-w-[40px] items-center rounded-md px-3 ${barColors[i]}`}
              style={{ width: widthPct }}
            >
              <span className="text-xs font-bold text-white">{count}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-600">
        <span>Avg time to hire: <strong className="text-slate-900">23 days</strong></span>
        <span>Offer acceptance: <strong className="text-slate-900">78%</strong></span>
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Critical openings</p>
        <p className="mt-2 text-sm text-slate-700">• Senior Backend Engineer <span className="text-slate-400">(Engineering)</span></p>
        <p className="mt-1 text-sm text-slate-700">• Product Manager <span className="text-slate-400">(Product)</span></p>
      </div>
    </div>
  );
}

// ─── Section 4 Right — Panel 1: Pending Actions Queue ────────────────────────

type TabId = "all" | "critical" | "approvals";

function PendingActionsQueue({ addToast }: { addToast: (msg: string, type: ToastType) => void }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("all");
  const [items, setItems] = useState<ActionItem[]>(PENDING_ACTIONS);

  const filtered = items.filter((a) => {
    if (tab === "critical") return a.priority === "red";
    if (tab === "approvals") return a.title.includes("Leave") || a.title.includes("Timesheet");
    return true;
  });

  function handleAction(itemId: number, label: string, title: string) {
    switch (label) {
      case "Approve":
        addToast(`${title} approved`, "success");
        break;
      case "Reject":
        addToast(`${title} rejected`, "error");
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        break;
      case "Bulk Approve":
        addToast("All timesheets approved", "success");
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        break;
      case "Reassign":
        addToast(`${title} reassigned`, "info");
        break;
      case "View All":
        navigate("/workflow/approvals");
        break;
      case "Review":
        addToast(`Opening ${title} for review`, "info");
        navigate("/workflow/approvals");
        break;
      case "View":
        addToast(`Viewing ${title}`, "info");
        break;
      case "Notify Employee":
        addToast("Employee notified", "success");
        break;
      default:
        addToast(`${label}: ${title}`, "info");
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Pending actions</h2>
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">47</span>
      </div>

      <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1">
        {(["all", "critical", "approvals"] as TabId[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-colors ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {filtered.map(({ id, priority, title, detail, meta, actions }) => (
          <div key={id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-start gap-2">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[priority]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="text-xs text-slate-600">{detail}</p>
                <p className="text-xs text-slate-400">{meta}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {actions.map(({ label, variant }) => (
                    <button
                      key={label}
                      onClick={() => handleAction(id, label, title)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        variant === "primary"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : variant === "danger"
                          ? "bg-red-50 text-red-600 hover:bg-red-100"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate("/workflow/approvals")}
        className="mt-3 flex w-full items-center justify-center gap-1 text-sm font-medium text-blue-600 hover:underline"
      >
        View all 47 actions <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Section 4 Right — Panel 2: Upcoming Deadlines ───────────────────────────

function UpcomingDeadlinesPanel() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Upcoming deadlines</h2>
      <div className="mt-4 space-y-5">
        {DEADLINES.map(({ label, items }) => (
          <div key={label}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
            <div className="mt-2 space-y-2">
              {items.map(({ text, icon: Icon }) => (
                <div key={text} className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="text-sm text-slate-700">{text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section 4 Right — Panel 3: Quick Actions ────────────────────────────────

function QuickActionsPanel({
  addToast,
  onRunPayroll,
}: {
  addToast: (msg: string, type: ToastType) => void;
  onRunPayroll: () => void;
}) {
  const navigate = useNavigate();
  const [showAnnounce, setShowAnnounce] = useState(false);
  const [showLock, setShowLock] = useState(false);

  function handleQuickAction(label: string, route: string) {
    switch (label) {
      case "Add Employee":
        navigate(route);
        addToast("Navigating to Add Employee", "info");
        break;
      case "Announce":
        setShowAnnounce(true);
        break;
      case "Run Payroll":
        onRunPayroll();
        break;
      case "Report":
        navigate(route);
        break;
      case "Lock Attendance":
        setShowLock(true);
        break;
      case "Bulk Email":
        navigate(route);
        addToast("Navigating to Bulk Email", "info");
        break;
      default:
        navigate(route);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Quick actions</h2>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map(({ label, icon: Icon, route }) => (
          <button
            key={label}
            onClick={() => handleQuickAction(label, route)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Icon className="h-4 w-4 text-slate-500" />
            {label}
          </button>
        ))}
      </div>
      {showAnnounce && (
        <QuickAnnounceModal
          onClose={() => setShowAnnounce(false)}
          onSend={() => { setShowAnnounce(false); addToast("Announcement sent", "success"); }}
        />
      )}
      {showLock && (
        <ConfirmLockModal
          onClose={() => setShowLock(false)}
          onConfirm={() => { setShowLock(false); addToast("Attendance locked successfully", "success"); }}
        />
      )}
    </div>
  );
}

// ─── Section 5 — Chart 1: Headcount Trend ────────────────────────────────────

function HeadcountTrendChart() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Headcount trend</h2>
      <p className="text-xs text-slate-500">Last 12 months</p>
      <div className="mt-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={HEADCOUNT_TREND} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[1150, 1260]} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "none" }}
              formatter={(value: number) => [value, "Employees"]}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Section 5 — Chart 2: Attrition by Department ────────────────────────────

function AttritionChart() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Attrition by department</h2>
      <p className="text-xs text-slate-500">Benchmark: 8.5%</p>
      <div className="mt-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ATTRITION_DATA} margin={{ top: 4, right: 24, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="dept" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[0, 16]} unit="%" />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "none" }}
              formatter={(value: number) => [`${value}%`, "Attrition"]}
            />
            <ReferenceLine
              y={8.5}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: "8.5%", position: "right", fontSize: 10, fill: "#94a3b8" }}
            />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
              {ATTRITION_DATA.map((entry, i) => (
                <Cell key={i} fill={entry.rate > 8.5 ? "#ef4444" : "#22c55e"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Section 5 — Chart 3: Cost vs Budget ─────────────────────────────────────

function CostVsBudgetChart() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Cost vs budget</h2>
      <p className="text-xs text-slate-500">Jan–May 2026 · May over by 4.2%</p>
      <div className="mt-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={COST_BUDGET_DATA} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit="M" />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "none" }}
              formatter={(value: number) => [`$${value}M`, ""]}
            />
            <Bar dataKey="actual" radius={[4, 4, 0, 0]} name="Actual">
              {COST_BUDGET_DATA.map((entry, i) => (
                <Cell key={i} fill={entry.actual > entry.budget ? "#ef4444" : "#3b82f6"} />
              ))}
            </Bar>
            <Bar dataKey="budget" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Budget" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-sm bg-blue-500" />Actual
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-sm bg-slate-400" />Budget
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-sm bg-red-500" />Over budget
        </span>
      </div>
    </div>
  );
}

// ─── Section 6 Left — Compliance Status ──────────────────────────────────────

function ComplianceStatus() {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Compliance status</h2>
        <button
          onClick={() => navigate("/system/audit/logs")}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
        >
          View audit <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {COMPLIANCE_ITEMS.map(({ label, status, color }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-sm text-slate-700">{label}</span>
            <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${color}`}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section 6 Right — Activity Feed ─────────────────────────────────────────

type FeedItem = { dot: string; text: string; time: string; isNew: boolean };

function ActivityFeed() {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<FeedItem[]>(() =>
    ACTIVITY_FEED.map((f) => ({ ...f, isNew: false }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const item = ACTIVITY_POOL[Math.floor(Math.random() * ACTIVITY_POOL.length)];
      const now = new Date();
      const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      setFeed((prev) => [{ ...item, time, isNew: true }, ...prev.slice(0, 9)]);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Activity feed</h2>
        <button
          onClick={() => navigate("/system/audit/logs")}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
        >
          View audit log <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {feed.map(({ dot, text, time, isNew }, i) => (
          <div
            key={i}
            className="flex items-center gap-3"
            style={isNew ? { animation: "feedFadeIn 0.4s ease" } : undefined}
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
            <span className="flex-1 text-sm text-slate-700">{text}</span>
            <span className="shrink-0 text-xs text-slate-400">{time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [showAlerts, setShowAlerts] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [payrollRun, setPayrollRun] = useState<any>(null);
  const toastId = useRef(0);

  const [totalEmployees, setTotalEmployees] = useState(0);
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [onLeaveToday, setOnLeaveToday] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [pendingTimesheets, setPendingTimesheets] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [deptBreakdown, setDeptBreakdown] = useState<{ name: string; count: number }[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    getPayrollRuns().then((runs) => {
      if (runs && runs.length > 0) {
        const now = new Date();
        const current = runs.find((r: any) =>
          (r.pay_month ?? r.month) === now.getMonth() + 1 &&
          (r.pay_year ?? r.year) === now.getFullYear()
        ) || runs[0];
        setPayrollRun(current);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ems_token');
    const headers: HeadersInit = { Authorization: `Bearer ${token}` };

    Promise.allSettled([
      fetch('/api/employees?limit=1000', { headers }).then(r => r.json()),
      fetch('/api/attendance/team', { headers }).then(r => r.json()),
      fetch('/api/v1/leaves/requests/pending', { headers }).then(r => r.json()),
      fetch('/api/timesheets/pending', { headers }).then(r => r.json()),
      fetch('/api/projects', { headers }).then(r => r.json()),
      fetch('/api/tasks/all', { headers }).then(r => r.json()),
    ]).then(([emps, att, leaves, timesheets, projects, tasks]) => {

      if (emps.status === 'fulfilled') {
        const list: any[] = emps.value.employees || emps.value || [];
        setTotalEmployees(list.length);
        setActiveEmployees(list.filter((e: any) => e.is_active).length);
        const deptMap: Record<string, number> = {};
        list.forEach((e: any) => {
          if (e.department) deptMap[e.department] = (deptMap[e.department] || 0) + 1;
        });
        setDeptBreakdown(
          Object.entries(deptMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6)
        );
      }

      if (att.status === 'fulfilled') {
        const list: any[] = att.value.attendance || att.value || [];
        setPresentToday(list.filter((a: any) => a.clock_in).length);
        setOnLeaveToday(list.filter((a: any) => a.status === 'on_leave').length);
      }

      if (leaves.status === 'fulfilled') {
        const list = leaves.value || [];
        setPendingLeaves(Array.isArray(list) ? list.length : 0);
      }

      if (timesheets.status === 'fulfilled') {
        const list: any[] = timesheets.value.timesheets || timesheets.value || [];
        setPendingTimesheets(Array.isArray(list) ? list.length : 0);
      }

      if (projects.status === 'fulfilled') {
        const list: any[] = projects.value.projects || projects.value || [];
        setActiveProjects(
          list.filter((p: any) => p.status === 'active' || p.status === 'in_progress').length
        );
      }

      if (tasks.status === 'fulfilled') {
        const list: any[] = tasks.value.tasks || tasks.value || [];
        setPendingTasks(
          list.filter((t: any) => t.status === 'pending' || t.status === 'in_progress').length
        );
      }

    }).finally(() => setStatsLoading(false));
  }, []);

  function addToast(message: string, type: ToastType) {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function handleProcessPayroll() {
    setShowPayrollModal(false);
    addToast("Payroll processed successfully", "success");
  }

  return (
    <div className="min-h-full bg-[#f5f8ff] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <style>{`@keyframes feedFadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div className="space-y-4">

        {/* Section 1 */}
        <GreetingBanner />

        {/* Section 2 */}
        {showAlerts && <CriticalAlertsBanner onDismiss={() => setShowAlerts(false)} />}

        {/* Section 3 */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard loading={statsLoading} icon={Users} iconBg="bg-blue-100" iconColor="text-blue-600"
            value={totalEmployees.toLocaleString('en-IN')} label="Total Employees"
            sub={`${activeEmployees.toLocaleString('en-IN')} active`} subColor="text-green-600"
            route="/workforce/directory" />
          <KpiCard loading={statsLoading} icon={UserCheck} iconBg="bg-green-100" iconColor="text-green-600"
            value={presentToday.toLocaleString('en-IN')} label="Present Today"
            sub={totalEmployees > 0 ? `${Math.round((presentToday / totalEmployees) * 100)}% attendance` : '—'}
            subColor="text-slate-500" route="/time-management/attendance" />
          <KpiCard loading={statsLoading} icon={CalendarOff} iconBg="bg-orange-100" iconColor="text-orange-600"
            value={onLeaveToday.toString()} label="On Leave Today"
            sub={`${pendingLeaves} pending approval`} subColor="text-slate-500" route="/workflow/leave" />
          <KpiCard loading={statsLoading} icon={Briefcase} iconBg="bg-purple-100" iconColor="text-purple-600"
            value="0" label="Open Positions"
            sub="Recruitment module coming soon" subColor="text-slate-500" route="/recruitment/jobs" />
          <KpiCard loading={statsLoading} icon={Wallet} iconBg="bg-teal-100" iconColor="text-teal-600"
            value={payrollRun ? `${Math.round((statusToSteps(payrollRun.status) / PAYROLL_STEPS.length) * 100)}%` : '—'}
            label="Payroll Ready"
            sub={payrollRun ? payrollRun.status : 'No run this month'} subColor="text-slate-500"
            route="/compensation/payroll" />
          <KpiCard loading={statsLoading} icon={ClockAlert} iconBg="bg-red-100" iconColor="text-red-600"
            value={(pendingLeaves + pendingTimesheets).toString()} label="Pending Actions"
            sub={`${pendingLeaves} leave · ${pendingTimesheets} timesheet`} subColor="text-red-600"
            route="/workflow/approvals" redBorder />
        </div>

        {/* Section 4 */}
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1 space-y-4">
            <WorkforceSnapshot deptBreakdown={deptBreakdown} loading={statsLoading} />
            <AttendanceToday />
            <PayrollProcessingStatus
              onProcessPayroll={() => setShowPayrollModal(true)}
              stepsDone={payrollRun ? statusToSteps(payrollRun.status) : PAYROLL_STEPS_DONE}
              blockers={payrollRun?.blockers ?? PAYROLL_BLOCKERS}
              period={payrollRun ? fmtPeriod(payrollRun.month, payrollRun.year) : "This Month"}
              status={payrollRun?.status}
              totalNet={payrollRun?.total_net}
            />
            <DepartmentHealthMatrix />
            <RecruitmentPipeline />
          </div>
          <div className="w-80 shrink-0 space-y-4">
            <PendingActionsQueue addToast={addToast} />
            <UpcomingDeadlinesPanel />
            <QuickActionsPanel addToast={addToast} onRunPayroll={() => setShowPayrollModal(true)} />
          </div>
        </div>

        {/* Section 5 */}
        <div className="grid gap-4 lg:grid-cols-3">
          <HeadcountTrendChart />
          <AttritionChart />
          <CostVsBudgetChart />
        </div>

        {/* Section 6 */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ComplianceStatus />
          <ActivityFeed />
        </div>

      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {showPayrollModal && (
        <ConfirmPayrollModal
          onClose={() => setShowPayrollModal(false)}
          onConfirm={handleProcessPayroll}
        />
      )}
    </div>
  );
}
