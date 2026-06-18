import { CalendarDays, Download, CheckCircle2, Check, X, Clock3, TimerReset, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import {
  ManagerFrame,
  Button,
  Stat,
  Panel,
  Tabs,
  Filters,
  Pagination,
  Avatar,
  mgfmtDate,
} from "./shared";
import { timesheetAPI } from "../../lib/api";
import {
  LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface AllTimesheet {
  id: string;
  status: string;
  total_hours?: number;
}

interface Timesheet {
  id: string;
  employee_id: string;
  week_start?: string;
  week_end?: string;
  total_hours?: number;
  status: string;
  submitted_at?: string;
  employee?: { name: string; department: string };
}

export default function ManagerTimesheets() {
  const [pendingTimesheets, setPendingTimesheets] = useState<Timesheet[]>([]);
  const [allTimesheets, setAllTimesheets] = useState<AllTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [selectedItem, setSelectedItem] = useState<Timesheet | null>(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected">("approved");
  const [reviewNote, setReviewNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pending, all] = await Promise.all([
        timesheetAPI.getPending(),
        timesheetAPI.getTeamAll(),
      ]);
      setPendingTimesheets(Array.isArray(pending) ? pending : []);
      setAllTimesheets(Array.isArray(all) ? all : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedItem) return;
    setActionLoading(selectedItem.id);
    try {
      await timesheetAPI.review(selectedItem.id, reviewStatus, reviewNote);
      setPendingTimesheets(pendingTimesheets.filter(t => t.id !== selectedItem.id));
      setToast(`Timesheet ${reviewStatus} successfully`);
      setReviewModal(false);
      setSelectedItem(null);
      setReviewNote("");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to review");
    } finally {
      setActionLoading("");
    }
  };

  const openReview = (timesheet: Timesheet, status: "approved" | "rejected") => {
    setSelectedItem(timesheet);
    setReviewStatus(status);
    setReviewNote("");
    setReviewModal(true);
  };

  const totalCount = allTimesheets.length;
  const approvedCount = allTimesheets.filter((t) => t.status === "approved").length;
  const rejectedCount = allTimesheets.filter((t) => t.status === "rejected").length;
  const approvedPct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const rejectedPct = totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0;

  // Billable hours — sum of all logged hours
  const totalHours = allTimesheets.reduce(
    (sum: number, t: any) => sum + (Number(t.total_hours) || 0), 0
  );
  const billableH = Math.floor(totalHours);
  const billableM = Math.round((totalHours - billableH) * 60);
  const billableDisplay = `${billableH}h ${billableM}m`;

  // Top projects by total hours
  const projectHoursMap: Record<string, number> = {};
  allTimesheets.forEach((t: any) => {
    const name = t.project_name || t.project?.name;
    if (name) {
      projectHoursMap[name] = (projectHoursMap[name] || 0) + (Number(t.total_hours) || 0);
    }
  });
  const topProjects = Object.entries(projectHoursMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, hours]) => ({ name, hours }));

  // Missing timesheets — employees with only draft submissions this week
  const getWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff)).toISOString().split('T')[0];
  };
  const weekStart = getWeekStart();
  const missingTimesheets = allTimesheets
    .filter((t: any) => t.week_start?.split('T')[0] >= weekStart && t.status === 'draft')
    .map((t: any) => t.employee_name || t.employee?.name || 'Unknown');
  const missingNames = [...new Set(missingTimesheets)] as string[];

  // Weekly trend for line chart
  const weeklyTrend = allTimesheets.reduce(
    (acc: Array<{ week: string; hours: number }>, t: any) => {
      const week = t.week_start?.split('T')[0] || 'Unknown';
      const existing = acc.find(w => w.week === week);
      if (existing) {
        existing.hours += Number(t.total_hours) || 0;
      } else {
        acc.push({ week, hours: Number(t.total_hours) || 0 });
      }
      return acc;
    }, []
  ).sort((a, b) => a.week.localeCompare(b.week));

  // Status distribution for pie chart
  const statusData = [
    { name: 'Approved', value: approvedCount, color: '#22c55e' },
    { name: 'Pending', value: pendingTimesheets.length, color: '#f59e0b' },
    { name: 'Rejected', value: rejectedCount, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <ManagerFrame title="Timesheets" subtitle="Review and approve time entries submitted by your team" actions={<><Button disabled title="Coming soon"><CalendarDays className="h-4 w-4" />12 May - 18 May 2026</Button><Button disabled title="Coming soon"><Download className="h-4 w-4" />Import</Button><Button disabled title="Coming soon"><Download className="h-4 w-4" />Export</Button><Button primary disabled title="Coming soon">Review & Approve</Button></>} search="Search employees, projects...">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Stat label="Total Timesheets" value={String(totalCount)} hint="Submitted" icon={CalendarDays} itemTone="blue" />
          <Stat label="Approved" value={String(approvedCount)} hint={`${approvedPct}% of submitted`} icon={CheckCircle2} itemTone="green" />
          <Stat label="Pending Review" value={String(pendingTimesheets.length)} hint="Requires Action" icon={Check} itemTone="amber" />
          <Stat label="Rejected" value={String(rejectedCount)} hint={`${rejectedPct}% of submitted`} icon={X} itemTone="red" />
          <Stat label="Hours Pending" value={`${Math.floor(pendingTimesheets.reduce((s, t) => s + (t.total_hours || 0), 0))}h`} hint="Pending review total" icon={Clock3} itemTone="purple" />
          <Stat label="Billable Hours" value={billableDisplay} hint="Total logged hours" icon={TimerReset} itemTone="green" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
          <div className="space-y-4">
            <Panel>
              <Tabs items={[`All Timesheets ${totalCount}`, `Pending ${pendingTimesheets.length}`, `Approved ${approvedCount}`, `Rejected ${rejectedCount}`, "Missing"]} />
              <Filters count={4} />
              <div className="overflow-x-auto px-5">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      {["Employee", "Week", "Total Hours", "Submitted On", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading timesheets...</td></tr>
                    ) : pendingTimesheets.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No pending timesheets</td></tr>
                    ) : pendingTimesheets.map((ts) => (
                      <tr key={ts.id}>
                        <td className="px-4 py-3">
                          <div className="flex gap-3">
                            <Avatar name={ts.employee?.name || "?"} />
                            <div>
                              <p className="font-bold">{ts.employee?.name || "—"}</p>
                              <p className="text-[11px] text-slate-500">{ts.employee?.department || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {mgfmtDate(ts.week_start)} - {mgfmtDate(ts.week_end)}
                        </td>
                        <td className="px-4 py-3 font-bold">{ts.total_hours || "—"}h</td>
                        <td className="px-4 py-3">{mgfmtDate(ts.submitted_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openReview(ts, "approved")}
                              disabled={actionLoading === ts.id}
                              className="text-green-600 hover:text-green-700 disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openReview(ts, "rejected")}
                              disabled={actionLoading === ts.id}
                              className="text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setSelectedItem(ts)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination text={`Showing 1 to ${Math.min(7, pendingTimesheets.length)} of ${pendingTimesheets.length} timesheets`} />
            </Panel>

            <div className="grid gap-4 xl:grid-cols-3">
              <Panel title="Hours Trend (This Week)" action="View Report">
                {weeklyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={weeklyTrend}>
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">No timesheet data yet</p>
                )}
              </Panel>
              <Panel title="Hours by Work Type" action="View Report">
                <p className="text-sm text-slate-400 text-center py-8">No work type data available</p>
              </Panel>
              <Panel title="Daily Breakdown (Avg Hours)" action="View Report">
                <p className="text-sm text-slate-400 text-center py-8">No daily breakdown data available</p>
              </Panel>
            </div>
          </div>

          <aside className="space-y-4">
            <Panel title="Status Distribution">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">No timesheet data yet</p>
              )}
            </Panel>
            <Panel title="Top Projects by Hours" action="View All">
              {topProjects.length === 0 ? (
                <p className="text-sm text-slate-400 px-5 pb-5">No project data available</p>
              ) : (
                <div className="space-y-3 px-5 pb-5">
                  {topProjects.map(({ name, hours }) => {
                    const maxHours = topProjects[0].hours;
                    const pct = maxHours > 0 ? Math.round((hours / maxHours) * 100) : 0;
                    return (
                      <div key={name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700 truncate">{name}</span>
                          <span className="text-slate-500 ml-2">{Math.floor(hours)}h</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
            <Panel title="Missing Timesheets">
              {missingNames.length === 0 ? (
                <p className="text-sm text-green-600 px-5 pb-5">✓ All team members have submitted timesheets</p>
              ) : (
                <div className="space-y-2 px-5 pb-5">
                  {missingNames.map((name: string) => (
                    <div key={name} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </aside>
        </div>
      </div>

      {reviewModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[420px] rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-950">Review Timesheet</h3>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-600">Employee</p>
                <p className="mt-1 text-sm font-bold">{selectedItem.employee?.name || selectedItem.employee_id}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600">Week</p>
                <p className="mt-1 text-sm">{mgfmtDate(selectedItem.week_start)} to {mgfmtDate(selectedItem.week_end)}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600">Total Hours</p>
                <p className="mt-1 text-sm font-bold">{selectedItem.total_hours}h</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">
                  Review Note {reviewStatus === "rejected" && <span className="text-red-600">*</span>}
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={reviewStatus === "rejected" ? "Reason for rejection" : "Optional note"}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setReviewModal(false)}
                className="flex-1 rounded-md border border-slate-200 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={actionLoading === selectedItem.id || (reviewStatus === "rejected" && !reviewNote.trim())}
                className={`flex-1 rounded-md py-2 text-sm font-bold text-white ${reviewStatus === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} disabled:opacity-50`}
              >
                {actionLoading === selectedItem.id ? "Processing..." : `${reviewStatus.charAt(0).toUpperCase()}${reviewStatus.slice(1)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </ManagerFrame>
  );
}
