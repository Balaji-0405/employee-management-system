import { useState, useEffect } from "react";
import { Plus, Download, FileText, UsersRound, CheckCircle2, CalendarDays, TimerReset, X, Filter, ChevronDown } from "lucide-react";
import {
  ManagerFrame,
  Button,
  Stat,
  Panel,
  Tabs,
  Avatar,
  StatusPill,
  InfoList,
} from "./shared";
import { employeeAPI } from "../../lib/api";

export default function ManagerStaffDirectory() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  useEffect(() => {
    employeeAPI.getAll(100)
      .then((data: any) => {
        const list = data?.employees || data || [];
        setEmployees(list);
        if (list.length > 0) setSelectedEmployee(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeCount = employees.filter((e: any) => e.is_active).length;
  const inactiveCount = employees.filter((e: any) => !e.is_active).length;

  return (
    <ManagerFrame title="Staff Directory" subtitle="Manage and organize your company workforce" actions={<><Button primary><Plus className="h-4 w-4" />Add Employee</Button><Button><Download className="h-4 w-4" />Import</Button><Button><Download className="h-4 w-4" />Export</Button><Button><FileText className="h-4 w-4" />Generate Report</Button></>} search="Search employees...">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Stat label="Total Employees" value={loading ? "—" : String(employees.length)} hint="↗ 12 this month" icon={UsersRound} itemTone="purple" />
          <Stat label="Active Today" value={loading ? "—" : String(activeCount)} hint="↗ 5 this week" icon={CheckCircle2} itemTone="green" />
          <Stat label="On Leave" value="0" hint="↗ 2 this week" icon={CalendarDays} itemTone="amber" />
          <Stat label="On Probation" value="—" hint="↗ 3 this month" icon={TimerReset} itemTone="blue" />
          <Stat label="Inactive" value={loading ? "—" : String(inactiveCount)} hint="↗ 1 this month" icon={X} itemTone="red" />
        </div>

        <Panel>
          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-[1.5fr_repeat(4,1fr)_110px]">
            {["Search by name, ID, email, department...", "All Departments", "All Designations", "All Managers", "All Status"].map((filter) => (
              <button key={filter} className="flex h-10 items-center justify-between rounded-md border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700">{filter}<ChevronDown className="h-4 w-4" /></button>
            ))}
            <Button><Filter className="h-4 w-4" />More Filters</Button>
          </div>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_520px]">
          <div>
            <Tabs items={["Grid View", "Table View", "Hierarchy View", "Org Chart"]} />
            <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {loading ? (
                [1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-[200px] animate-pulse rounded-lg bg-slate-200" />
                ))
              ) : employees.length === 0 ? (
                <div className="col-span-3 py-12 text-center text-sm text-slate-500">No employees found</div>
              ) : employees.map((emp: any) => {
                const isActive = emp.is_active !== false;
                const statusLabel = isActive ? "Online" : "Offline";
                const statusColor = isActive ? "text-green-600" : "text-slate-400";
                return (
                  <Panel key={emp.id || emp.employee_code}>
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <Avatar name={emp.name || "?"} />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between gap-3">
                            <div>
                              <h2 className="text-lg font-bold text-slate-950">{emp.name || "—"}</h2>
                              <p className="text-sm font-semibold text-slate-700">{emp.designation || "—"}</p>
                            </div>
                            <span className={`text-xs font-bold ${statusColor}`}>{statusLabel}</span>
                          </div>
                          <div className="mt-5 space-y-2 text-xs text-slate-500">
                            <p>{emp.department || "—"}</p>
                            <p>{emp.email || "—"}</p>
                            <p>ID: {emp.employee_code || "—"}</p>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <StatusPill value={emp.employment_type || "Full Time"} />
                            <StatusPill value={emp.work_mode || emp.work_type || "Office"} />
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 flex justify-around border-t border-slate-100 pt-4 text-xs font-bold text-slate-600">
                        <button onClick={() => setSelectedEmployee(emp)}>View</button>
                        <button>Edit</button>
                        <button>More</button>
                      </div>
                    </div>
                  </Panel>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <Panel>
              <div className="p-5">
                <div className="flex justify-end">
                  <button onClick={() => setSelectedEmployee(null)}>
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                </div>
                {selectedEmployee ? (
                  <div className="flex items-center gap-5">
                    <Avatar name={selectedEmployee.name || "?"} />
                    <div>
                      <h2 className="text-xl font-bold">{selectedEmployee.name}</h2>
                      <p className="font-semibold text-blue-600">{selectedEmployee.designation || "—"}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {selectedEmployee.email || "—"} · {selectedEmployee.department || "—"}
                      </p>
                    </div>
                    <StatusPill value={selectedEmployee.is_active !== false ? "Active" : "Inactive"} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Select an employee to view details</p>
                )}
              </div>
              <Tabs items={["Overview", "Attendance", "Leave", "Projects", "Tasks", "Payroll", "Documents", "More"]} />
              {selectedEmployee && (
                <div className="grid gap-4 p-5 md:grid-cols-[1.2fr_0.8fr]">
                  <Panel title="Employee Information">
                    <InfoList items={[
                      selectedEmployee.department || "—",
                      selectedEmployee.designation || "—",
                      selectedEmployee.manager_name || "—",
                      selectedEmployee.joining_date || selectedEmployee.created_at?.split("T")[0] || "—",
                      selectedEmployee.employment_type || "—",
                      selectedEmployee.work_mode || selectedEmployee.work_type || "—",
                    ]} />
                  </Panel>
                  <Panel title="Quick Actions">
                    <div className="space-y-2 p-5 text-xs font-bold">
                      {["Assign Project", "Change Manager", "Reset Password", "Deactivate Employee", "View Profile"].map((item) => (
                        <button key={item} className="block w-full rounded-md bg-slate-100 px-4 py-3 text-left">{item}</button>
                      ))}
                    </div>
                  </Panel>
                </div>
              )}
            </Panel>
          </aside>
        </div>
      </div>
    </ManagerFrame>
  );
}
