import { useState, useEffect } from "react";
import { CalendarDays, Download, Plus, Briefcase, Clock3, TimerReset, Filter, ChevronDown } from "lucide-react";
import {
  ManagerFrame,
  Button,
  Stat,
  Panel,
  Tabs,
  SideList,
  Donut,
  Legend,
  Bars,
} from "./shared";
import { projectAPI, taskAPI, employeeAPI } from "../../lib/api";

export default function ManagerReports() {
  const [projectCount, setProjectCount] = useState(0);
  const [teamSize, setTeamSize] = useState(0);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [workloadRows, setWorkloadRows] = useState<[string, number, string][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      projectAPI.getForRole(),
      taskAPI.getTeam(),
      employeeAPI.getAll(100),
    ]).then(([projects, tasks, employees]) => {
      if (projects.status === "fulfilled") {
        const p = (projects.value as any)?.projects || projects.value || [];
        setProjectCount(Array.isArray(p) ? p.length : 0);
      }
      if (tasks.status === "fulfilled") {
        const allTasks: any[] = (tasks.value as any)?.tasks || tasks.value || [];
        setTasksTotal(allTasks.length);
        setTasksCompleted(allTasks.filter((t: any) => t.status === "completed").length);
        const byEmployee: Record<string, number> = {};
        allTasks.forEach((t: any) => {
          const name = t.assignee_name || t.assigned_to_name;
          if (name) byEmployee[name] = (byEmployee[name] || 0) + (Number(t.hours_logged) || 0);
        });
        const rows = Object.entries(byEmployee)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, hours]) => [name, Math.round(hours), `${Math.round(hours)}h`] as [string, number, string]);
        setWorkloadRows(rows);
      }
      if (employees.status === "fulfilled") {
        const e = (employees.value as any)?.employees || employees.value || [];
        setTeamSize(Array.isArray(e) ? e.length : 0);
      }
      setLoading(false);
    });
  }, []);

  const taskCompletionPct = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  return (
    <ManagerFrame title="Reports" subtitle="Analyze performance, productivity and business insights" actions={<><Button><CalendarDays className="h-4 w-4" />Schedule Report</Button><Button><Download className="h-4 w-4" />Export</Button><Button primary><Plus className="h-4 w-4" />Create Custom Report</Button></>} search="Search reports, metrics, employees...">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Stat label="Total Projects" value={loading ? "—" : String(projectCount)} hint="↑ 14% vs last month" icon={Briefcase} itemTone="blue" />
          <Stat label="Team Size" value={loading ? "—" : String(teamSize)} hint="↑ 6% vs last month" icon={CalendarDays} itemTone="green" />
          <Stat label="On Time Delivery" value="92%" hint="↑ 8% vs last month" icon={Clock3} itemTone="amber" />
          <Stat label="Avg. Task Completion" value={loading ? "—" : `${taskCompletionPct}%`} hint="↑ 5% vs last month" icon={TimerReset} itemTone="purple" />
          <Stat label="Total Hours Logged" value="1,248h" hint="↑ 12% vs last month" icon={Clock3} itemTone="blue" />
          <Stat label="Budget Utilization" value="68%" hint="↓ 5% vs last month" icon={CalendarDays} itemTone="red" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Panel>
              <Tabs items={["Overview", "Projects", "Tasks", "Team", "Time & Attendance", "Payroll", "Finance", "Custom Reports"]} />
              <div className="grid gap-3 px-5 py-4 md:grid-cols-2 xl:grid-cols-[180px_1fr_1fr_1fr_110px]">
                {["12 May - 18 May 2026", "All Departments", "All Projects", "All Locations"].map((filter) => (
                  <button key={filter} className="flex h-10 items-center justify-between rounded-md border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700">{filter}<ChevronDown className="h-4 w-4" /></button>
                ))}
                <Button><Filter className="h-4 w-4" />Filters</Button>
              </div>
            </Panel>

            <div className="grid gap-4 xl:grid-cols-3">
              <Panel title="Project Progress Overview" action="View Full Report">
                <div className="flex items-center justify-center gap-6 p-5">
                  <Donut label={loading ? "—" : String(projectCount)} sub="Total Projects" />
                  <Legend rows={["Completed (33%)", "In Progress (42%)", "On Hold (13%)", "Not Started (12%)"]} />
                </div>
              </Panel>

              <Panel title="Tasks Status Summary" action="View Full Report">
                <div className="flex items-center justify-center gap-6 p-5">
                  <Donut label={loading ? "—" : String(tasksTotal)} sub="Total Tasks" />
                  <Legend rows={[
                    `Completed ${tasksCompleted} (${taskCompletionPct}%)`,
                    `Remaining ${tasksTotal - tasksCompleted} (${100 - taskCompletionPct}%)`,
                    "In Progress",
                    "Blocked",
                  ]} />
                </div>
              </Panel>

              <Panel title="Team Productivity Trend" action="View Full Report">
                <div className="flex items-center justify-center p-8 text-sm text-slate-400">No data available</div>
              </Panel>

              <Panel title="Hours Logged Trend" action="View Full Report">
                <div className="flex items-center justify-center p-8 text-sm text-slate-400">No data available</div>
              </Panel>

              <Panel title="Top Performing Employees" action="View Full Report">
                {workloadRows.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-sm text-slate-400">No data available</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {workloadRows.map(([name, , label], idx) => (
                      <div key={name} className="flex items-center justify-between px-5 py-3 text-sm">
                        <span className="font-semibold text-slate-700">#{idx + 1} {name}</span>
                        <span className="text-xs font-bold text-slate-500">{label} logged</span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Workload Distribution" action="View Full Report">
                {workloadRows.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-sm text-slate-400">No data available</div>
                ) : (
                  <Bars rows={workloadRows} />
                )}
              </Panel>

              <Panel title="Budget vs Actual" action="View Full Report">
                <div className="flex items-center justify-center p-8 text-sm text-slate-400">No data available</div>
              </Panel>

              <Panel title="Project Health" action="View Full Report">
                <div className="grid grid-cols-3 gap-4 p-5 text-center text-sm font-bold">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-emerald-700">Healthy<br /><span className="text-3xl">—</span></div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-700">At Risk<br /><span className="text-3xl">—</span></div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">Critical<br /><span className="text-3xl">—</span></div>
                </div>
              </Panel>

              <Panel title="Department wise Productivity" action="View Full Report">
                <div className="flex items-center justify-center p-8 text-sm text-slate-400">No data available</div>
              </Panel>
            </div>
          </div>

          <aside className="space-y-4">
            <SideList title="Key Insights" rows={[["Productivity increased by 6%", "Compared to last month", "Good"], ["8 projects are at risk of delay", "Need immediate attention", "Warning"], ["Design department needs support", "Lower productivity this week", "Action"], ["Budget utilization is on track", "68% of total budget used", "Good"]]} />
            <SideList title="Report Shortcuts" rows={[["Project Status Report", "Quick report", "Open"], ["Task Completion Report", "Quick report", "Open"], ["Time & Attendance Report", "Quick report", "Open"], ["Payroll Summary Report", "Quick report", "Open"], ["Custom Report Builder", "Create report", "Open"]]} />
            <SideList title="Recent Reports" rows={[["Weekly Performance Report", "Generated on 18 May 2026 08:30 AM", "Download"], ["Project Status Report", "Generated on 17 May 2026 06:15 PM", "Download"], ["Payroll Summary (May 2026)", "Generated on 17 May 2026 11:20 AM", "Download"], ["Timesheet Summary Report", "Generated on 16 May 2026 09:45 AM", "Download"]]} />
          </aside>
        </div>
      </div>
    </ManagerFrame>
  );
}
