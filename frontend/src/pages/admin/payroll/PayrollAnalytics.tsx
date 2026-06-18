import React, { useState } from "react";
import { Download } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ── Mock data ─────────────────────────────────────────────────────────────────

const MONTHS = [
  "Jul '25", "Aug '25", "Sep '25", "Oct '25", "Nov '25", "Dec '25",
  "Jan '26", "Feb '26", "Mar '26", "Apr '26", "May '26", "Jun '26",
];

const TREND_DATA = [
  { month: "Jul '25", gross: 8200000, net: 7350000, deductions: 850000 },
  { month: "Aug '25", gross: 8350000, net: 7480000, deductions: 870000 },
  { month: "Sep '25", gross: 8180000, net: 7290000, deductions: 890000 },
  { month: "Oct '25", gross: 8420000, net: 7530000, deductions: 890000 },
  { month: "Nov '25", gross: 9100000, net: 8150000, deductions: 950000 },
  { month: "Dec '25", gross: 9500000, net: 8500000, deductions: 1000000 },
  { month: "Jan '26", gross: 8600000, net: 7700000, deductions: 900000 },
  { month: "Feb '26", gross: 8650000, net: 7740000, deductions: 910000 },
  { month: "Mar '26", gross: 8800000, net: 7880000, deductions: 920000 },
  { month: "Apr '26", gross: 8950000, net: 7990000, deductions: 960000 },
  { month: "May '26", gross: 9100000, net: 8120000, deductions: 980000 },
  { month: "Jun '26", gross: 9250000, net: 8260000, deductions: 990000 },
];

const DEPT_DATA = [
  { department: "Engineering", gross: 3200000 },
  { department: "Product", gross: 1100000 },
  { department: "Design", gross: 780000 },
  { department: "HR", gross: 620000 },
  { department: "Finance", gross: 880000 },
  { department: "Marketing", gross: 950000 },
  { department: "Operations", gross: 680000 },
  { department: "IT", gross: 540000 },
];

const LOP_DATA = [
  { month: "Jan '26", paid: 8420000, lop: 180000 },
  { month: "Feb '26", paid: 8510000, lop: 140000 },
  { month: "Mar '26", paid: 8670000, lop: 130000 },
  { month: "Apr '26", paid: 8820000, lop: 130000 },
  { month: "May '26", paid: 8980000, lop: 120000 },
  { month: "Jun '26", paid: 9130000, lop: 120000 },
];

const STATS_DATA = TREND_DATA.slice().reverse().map((row, i) => ({
  month: row.month,
  employees: 142 + i,
  gross: row.gross,
  net: row.net,
  deductions: row.deductions,
  lop_impact: Math.round(row.gross * 0.015),
  avg_salary: Math.round(row.net / (142 + i)),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatINR(n: number): string {
  return n.toLocaleString("en-IN");
}

function formatLakhs(n: number): string {
  return (n / 100000).toFixed(1) + "L";
}

function exportCSV(data: typeof STATS_DATA) {
  const headers = ["Month", "Employees", "Gross", "Net", "Deductions", "LOP Impact", "Avg Salary"];
  const rows = data.map((r) =>
    [r.month, r.employees, r.gross, r.net, r.deductions, r.lop_impact, r.avg_salary]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "payroll_analytics.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function RupeeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-lg text-xs space-y-1">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-800">₹{formatINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function LakhsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-lg text-xs space-y-1">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-800">₹{formatINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PayrollAnalytics() {
  const [statsData] = useState(STATS_DATA);

  return (
    <div className="min-h-full bg-slate-50 px-5 py-5">
      {/* Breadcrumb */}
      <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
        <span className="cursor-pointer hover:text-blue-600">Dashboard</span>
        <span>›</span>
        <span className="cursor-pointer hover:text-blue-600">Payroll</span>
        <span>›</span>
        <span className="font-semibold text-slate-700">Analytics</span>
      </nav>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Payroll Analytics</h1>
      </div>

      {/* Chart 1 — Monthly Trend (full width) */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-bold text-slate-800">Monthly Payroll Trend — Last 12 Months</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={TREND_DATA} margin={{ top: 4, right: 20, left: 20, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tickFormatter={formatLakhs} tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip content={<RupeeTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
              formatter={(v) =>
                v === "gross"
                  ? "Gross Payout"
                  : v === "net"
                  ? "Net Payout"
                  : "Total Deductions"
              }
            />
            <Line
              type="monotone"
              dataKey="gross"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="gross"
            />
            <Line
              type="monotone"
              dataKey="net"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              name="net"
            />
            <Line
              type="monotone"
              dataKey="deductions"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="deductions"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Charts 2 & 3 — side by side */}
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Chart 2 — Department Cost */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-bold text-slate-800">Department Payroll Cost</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={DEPT_DATA}
              margin={{ top: 4, right: 16, left: 16, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="department"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tickFormatter={formatLakhs} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip content={<LakhsTooltip />} />
              <Bar dataKey="gross" fill="#6366f1" radius={[4, 4, 0, 0]} name="Gross Payout" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3 — LOP Impact */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-bold text-slate-800">LOP Impact — Last 6 Months</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={LOP_DATA}
              margin={{ top: 4, right: 16, left: 16, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tickFormatter={formatLakhs} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip content={<RupeeTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <Bar dataKey="paid" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Salary Paid" />
              <Bar dataKey="lop" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="LOP Deducted" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <p className="text-sm font-bold text-slate-900">Monthly Summary — Last 12 Months</p>
          <button
            onClick={() => exportCSV(statsData)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-600">
                {["Month", "Employees", "Gross (₹)", "Net (₹)", "Deductions (₹)", "LOP Impact (₹)", "Avg Salary (₹)"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statsData.map((row) => (
                <tr key={row.month} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.month}</td>
                  <td className="px-4 py-3 text-slate-700">{row.employees}</td>
                  <td className="px-4 py-3 text-right text-slate-700">₹{formatINR(row.gross)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">₹{formatINR(row.net)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">₹{formatINR(row.deductions)}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-semibold">₹{formatINR(row.lop_impact)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">₹{formatINR(row.avg_salary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
