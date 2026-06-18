import { useState, useEffect } from "react";
import { Download, Eye, UsersRound, TimerReset, CalendarDays, UserPlus, Star, MoreVertical } from "lucide-react";
import {
  ManagerFrame,
  Button,
  Stat,
  Panel,
  Tabs,
  Filters,
  Pagination,
  SideList,
  Avatar,
  StatusPill,
  Bar,
  Donut,
  Legend,
  Bars,
  DepartmentBars,
  ActivityList,
  InfoList,
  type Tone,
} from "./shared";
import { employeeAPI } from "../../lib/api";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  department: string;
  is_active: boolean;
  position?: string | null;
  employee_code?: string | null;
}

export default function ManagerTeam() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    employeeAPI.getAll()
      .then((data: any) => setTeamMembers(Array.isArray(data) ? data : []))
      .catch((err: unknown) => console.error("Team fetch failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const total = teamMembers.length;
  const active = teamMembers.filter((m) => m.is_active).length;

  return (
    <ManagerFrame title="Team Management" subtitle="Manage your team members, workload and productivity" actions={<Button><Download className="h-4 w-4" />Export</Button>} search="Search employees, skills, projects...">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Stat label="Total Employees" value={String(total)} hint="View all" icon={UsersRound} itemTone="purple" />
            <Stat label="Active Today" value={String(active)} hint="View all" icon={TimerReset} itemTone="green" />
            <Stat label="On Leave" value="—" hint="View all" icon={CalendarDays} itemTone="amber" />
            <Stat label="Overloaded" value="—" hint="View all" icon={UserPlus} itemTone="red" />
            <Stat label="Need Attention" value="—" hint="View all" icon={Star} itemTone="amber" />
          </div>
          <Panel>
            <Tabs items={[`All Employees (${total})`, `Active (${active})`]} />
            <Filters />
            <div className="overflow-x-auto px-5">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {["Employee", "Department", "Designation", "Status", "Workload", "Active Projects", "Tasks", "Leave Status", "Actions"].map((h) => (
                      <th key={h} className="px-3 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <td key={j} className="px-3 py-3">
                            <div className="h-4 animate-pulse rounded bg-slate-100" style={{ width: j === 0 ? 140 : 80 }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : teamMembers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-slate-500">No team members found</td>
                    </tr>
                  ) : (
                    teamMembers.map((emp) => (
                      <tr key={emp.id}>
                        <td className="px-3 py-3">
                          <div className="flex gap-3">
                            <Avatar name={emp.name} />
                            <div>
                              <p className="font-bold">{emp.name}</p>
                              <p className="text-[11px] text-slate-500">{emp.employee_code || emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">{emp.department || "—"}</td>
                        <td className="px-3 py-3">{emp.position || "—"}</td>
                        <td className="px-3 py-3">
                          <StatusPill value={emp.is_active ? "Working" : "Inactive"} />
                        </td>
                        <td className="px-3 py-3">
                          <Bar value={0} itemTone={"green" as Tone} />
                        </td>
                        <td className="px-3 py-3 font-bold">
                          —<p className="text-[11px] text-blue-600">View</p>
                        </td>
                        <td className="px-3 py-3 font-bold">
                          —<p className="text-[11px] text-slate-500">Pending</p>
                        </td>
                        <td className="px-3 py-3">—</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <Eye className="h-4 w-4" />
                            <UsersRound className="h-4 w-4 text-blue-600" />
                            <MoreVertical className="h-4 w-4" />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination text={`Showing 1 to ${Math.min(7, teamMembers.length)} of ${teamMembers.length} employees`} />
          </Panel>
          <div className="grid gap-4 xl:grid-cols-4">
            <Panel title="Team Workload Distribution" action="View Report"><div className="flex items-center justify-center gap-5 p-5"><Donut label={String(total)} /><Legend rows={["0 - 50%", "51 - 80%", "81 - 100%", "Over 100%"]} /></div></Panel>
            <Panel title="Department Overview" action="View Report"><DepartmentBars /></Panel>
            <Panel title="Recent Activities" action="View All"><ActivityList /></Panel>
            <Panel title="Attendance Summary (Today)" action="View Report"><div className="flex items-center justify-center gap-5 p-5"><Donut label="—" sub="Present" value={0} /><Legend rows={["Present", "Absent", "Late"]} /></div></Panel>
          </div>
        </div>
        <aside className="space-y-4">
          <Panel>
            <div className="p-7 text-center">
              <Avatar name="Select a member" />
              <h2 className="mt-4 text-xl font-bold">Select a member</h2>
              <p className="text-sm font-semibold text-blue-600">Click a row to view details</p>
              <p className="mt-3 text-xs text-slate-500">Employee details will appear here</p>
              <div className="mt-6 grid grid-cols-4 gap-3">
                {["Attendance", "Tasks", "Workload", "Rating"].map((item) => (
                  <div key={item} className="rounded-lg border border-slate-100 p-3 text-xs font-bold">—<p className="font-normal text-slate-400">{item}</p></div>
                ))}
              </div>
            </div>
          </Panel>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            <Panel title="Employee Details"><InfoList items={["—", "—", "—", "—", "—", "—"]} /></Panel>
            <Panel title="Current Status"><InfoList items={["—", "—", "—", "—", "—"]} /></Panel>
          </div>
          <SideList title="Recent Activity" rows={[["Loading…", "—", "—"]]} />
          <Panel title="Leave Balance" action="View all"><Bars rows={[["Casual Leave", 0, "—"], ["Sick Leave", 0, "—"], ["Earned Leave", 0, "—"], ["Comp Off", 0, "—"]]} /></Panel>
        </aside>
      </div>
    </ManagerFrame>
  );
}
