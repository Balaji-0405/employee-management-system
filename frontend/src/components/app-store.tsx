import * as React from "react";
import {
  tasks as seedTasks,
  leaveRequests as seedLeave,
  attendanceWeek as seedWeek,
  calendarEvents as seedCalendarEvents,
  payslips as seedPayslips,
  salaryBreakdown as seedSalaryBreakdown,
  tickets as seedTickets,
  announcements as seedAnnouncements,
  goals as seedGoals,
  onboardingSteps as seedSteps,
  employees as seedEmployees,
  projects as seedProjects,
  timesheetEntries as seedTSEntries,
  timesheetWeeks as seedTSWeeks,
  expenses as seedExpenses,
  claims as seedClaims,
  overtimeRequests as seedOT,
  holidays2026,
  factoryWeekPattern,
  type ShiftCode,
  type Holiday,
  type OvertimeRequest,
} from "@/lib/mock-data";

export type Task = (typeof seedTasks)[number];
export type Leave = (typeof seedLeave)[number];
export type Ticket = (typeof seedTickets)[number];
export type Goal = (typeof seedGoals)[number];
export type Step = (typeof seedSteps)[number];
export type Employee = (typeof seedEmployees)[number];
export type Project = (typeof seedProjects)[number];
export type TSEntry = (typeof seedTSEntries)[number];
export type TSWeek = (typeof seedTSWeeks)[number];
export type Expense = (typeof seedExpenses)[number];
export type Claim = (typeof seedClaims)[number];
export type CalendarEvent = (typeof seedCalendarEvents)[number];
export type Payslip = (typeof seedPayslips)[number];
export type SalaryComponent = (typeof seedSalaryBreakdown)[number];

type Notif = (typeof seedAnnouncements)[number] & { read?: boolean };

type ClockState = {
  clockedInAt: string | null;
  clockedOutAt: string | null;
  onBreak: boolean;
  todayHours: number;
};

type Ctx = {
  tasks: Task[];
  addTask: (t: Omit<Task, "id">) => void;
  updateTaskStatus: (id: string, status: Task["status"]) => void;
  deleteTask: (id: string) => void;

  leave: Leave[];
  requestLeave: (l: Omit<Leave, "id" | "status" | "employee">) => void;
  setLeaveStatus: (id: string, status: Leave["status"]) => void;

  tickets: Ticket[];
  createTicket: (t: Pick<Ticket, "subject" | "category" | "priority">) => void;
  setTicketStatus: (id: string, status: Ticket["status"]) => void;

  notifications: Notif[];
  markAllRead: () => void;
  markRead: (id: string) => void;
  unreadCount: number;
  postAnnouncement: (a: Pick<Notif, "title" | "tag">) => void;

  goals: Goal[];
  updateGoal: (id: string, progress: number) => void;

  steps: Step[];
  toggleStep: (id: string) => void;

  employees: Employee[];
  addEmployee: (e: Omit<Employee, "id">) => void;
  removeEmployee: (id: string) => void;

  projects: Project[];
  addProject: (p: Omit<Project, "id">) => void;
  removeProject: (id: string) => void;
  assignMember: (projectId: string, employeeId: string) => void;
  unassignMember: (projectId: string, employeeId: string) => void;

  tsEntries: TSEntry[];
  addTSEntry: (e: Omit<TSEntry, "id" | "employeeId">) => void;
  removeTSEntry: (id: string) => void;

  tsWeeks: TSWeek[];
  submitTSWeek: (id: string) => void;
  setTSWeekStatus: (id: string, status: TSWeek["status"]) => void;

  expenses: Expense[];
  addExpense: (e: Omit<Expense, "id" | "status">) => void;
  setExpenseStatus: (id: string, status: Expense["status"]) => void;

  claims: Claim[];
  addClaim: (c: Omit<Claim, "id" | "status">) => void;
  setClaimStatus: (id: string, status: Claim["status"]) => void;

  clock: ClockState;
  clockIn: () => void;
  clockOut: () => void;
  toggleBreak: () => void;

  // Phase 2
  attendanceWeek: typeof seedWeek;
  calendarEvents: CalendarEvent[];
  payslips: Payslip[];
  salaryBreakdown: SalaryComponent[];
  pendingLeaveCount: number;
  pendingTimesheetCount: number;
  pendingExpenseCount: number;
  pendingClaimCount: number;
  teamOnLeave: number;
  approveLeave: (id: string) => void;
  rejectLeave: (id: string) => void;
  approveTSWeek: (id: string) => void;
  rejectTSWeek: (id: string) => void;
  approveExpense: (id: string) => void;
  rejectExpense: (id: string) => void;
  shiftPattern: ShiftCode[];
  setShiftForDay: (dayIdx: number, shift: ShiftCode) => void;
  holidays: Holiday[];
  addHoliday: (h: Holiday) => void;
  removeHoliday: (date: string) => void;
  overtime: OvertimeRequest[];
  requestOvertime: (o: Omit<OvertimeRequest, "id" | "status" | "employee">) => void;
  setOvertimeStatus: (id: string, status: OvertimeRequest["status"]) => void;
};

const StoreCtx = React.createContext<Ctx | null>(null);

const ME_ID = "1";

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = React.useState<Task[]>(seedTasks);
  const [leave, setLeave] = React.useState<Leave[]>(seedLeave);
  const [tickets, setTickets] = React.useState<Ticket[]>(seedTickets);
  const [notifications, setNotifications] = React.useState<Notif[]>(
    seedAnnouncements.map((a) => ({ ...a, read: false })),
  );
  const [goals, setGoals] = React.useState<Goal[]>(seedGoals);
  const [steps, setSteps] = React.useState<Step[]>(seedSteps);
  const [employees, setEmployees] = React.useState<Employee[]>(seedEmployees);
  const [projects, setProjects] = React.useState<Project[]>(seedProjects);
  const [tsEntries, setTsEntries] = React.useState<TSEntry[]>(seedTSEntries);
  const [tsWeeks, setTsWeeks] = React.useState<TSWeek[]>(seedTSWeeks);
  const [expenses, setExpenses] = React.useState<Expense[]>(seedExpenses);
  const [claims, setClaims] = React.useState<Claim[]>(seedClaims);
  const [clock, setClock] = React.useState<ClockState>({
    clockedInAt: null,
    clockedOutAt: null,
    onBreak: false,
    todayHours: seedWeek.reduce((a, b) => a + b.hours, 0),
  });
  const [attendanceWeek, setAttendanceWeek] = React.useState<typeof seedWeek>(seedWeek);
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>(seedCalendarEvents);
  const [payslips, setPayslips] = React.useState<Payslip[]>(seedPayslips);
  const [salaryBreakdown, setSalaryBreakdown] = React.useState<SalaryComponent[]>(seedSalaryBreakdown);

  const addTask: Ctx["addTask"] = (t) =>
    setTasks((prev) => [{ ...t, id: `T-${Math.floor(Math.random() * 900 + 100)}` }, ...prev]);
  const updateTaskStatus: Ctx["updateTaskStatus"] = (id, status) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  const deleteTask: Ctx["deleteTask"] = (id) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  const requestLeave: Ctx["requestLeave"] = (l) =>
    setLeave((prev) => [
      { id: `L-${Math.floor(Math.random() * 90 + 10)}`, employee: "You", status: "Pending", ...l },
      ...prev,
    ]);

  const createTicket: Ctx["createTicket"] = (t) => {
    const ticket = {
      id: `HD-${Math.floor(Math.random() * 900 + 100)}`,
      status: "Open" as const,
      created: "just now",
      assignee: t.category === "IT" ? "IT Helpdesk" : t.category === "HR" ? "People Ops" : "Finance",
      ...t,
    };
    setTickets((prev) => [ticket, ...prev]);
    setNotifications((prev) => [
      { id: `A-${Math.floor(Math.random() * 900 + 100)}`, title: `New ticket created: ${t.subject}`, tag: "IT", time: "just now", read: false },
      ...prev,
    ]);
  };
  const setTicketStatus: Ctx["setTicketStatus"] = (id, status) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    setNotifications((prev) => [
      { id: `A-${Math.floor(Math.random() * 900 + 100)}`, title: `Ticket ${id} is now ${status}`, tag: "Helpdesk", time: "just now", read: false },
      ...prev,
    ]);
  };

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const unreadCount = notifications.filter((n) => !n.read).length;
  const postAnnouncement: Ctx["postAnnouncement"] = (a) => {
    setNotifications((prev) => [
      { id: `A-${Math.floor(Math.random() * 900 + 100)}`, time: "just now", read: false, ...a },
      ...prev,
    ]);
  };

  const notify = (title: string, tag = "HR") =>
    setNotifications((prev) => [
      { id: `A-${Math.floor(Math.random() * 900 + 100)}`, title, tag, time: "just now", read: false },
      ...prev,
    ]);

  const setLeaveStatus: Ctx["setLeaveStatus"] = (id, status) => {
    setLeave((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    notify(`Leave ${id} ${status.toLowerCase()}`, "HR");
  };
  const approveLeave: Ctx["approveLeave"] = (id) => setLeaveStatus(id, "Approved");
  const rejectLeave: Ctx["rejectLeave"] = (id) => setLeaveStatus(id, "Rejected");

  const updateGoal: Ctx["updateGoal"] = (id, progress) =>
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, progress: Math.max(0, Math.min(100, progress)) } : g)),
    );

  const toggleStep: Ctx["toggleStep"] = (id) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));

  const addEmployee: Ctx["addEmployee"] = (e) =>
    setEmployees((prev) => [{ ...e, id: String(prev.length + 1) }, ...prev]);
  const removeEmployee: Ctx["removeEmployee"] = (id) =>
    setEmployees((prev) => prev.filter((e) => e.id !== id));

  const addProject: Ctx["addProject"] = (p) =>
    setProjects((prev) => [
      { ...p, id: `P-${Math.random().toString(36).slice(2, 6).toUpperCase()}` },
      ...prev,
    ]);
  const removeProject: Ctx["removeProject"] = (id) =>
    setProjects((prev) => prev.filter((p) => p.id !== id));
  const assignMember: Ctx["assignMember"] = (projectId, employeeId) =>
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId && !p.members.includes(employeeId)
          ? { ...p, members: [...p.members, employeeId] }
          : p,
      ),
    );
  const unassignMember: Ctx["unassignMember"] = (projectId, employeeId) =>
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, members: p.members.filter((m) => m !== employeeId) } : p,
      ),
    );

  const addTSEntry: Ctx["addTSEntry"] = (e) =>
    setTsEntries((prev) => [
      { id: `TS-${Math.floor(Math.random() * 900 + 100)}`, employeeId: ME_ID, ...e },
      ...prev,
    ]);
  const removeTSEntry: Ctx["removeTSEntry"] = (id) =>
    setTsEntries((prev) => prev.filter((e) => e.id !== id));

  const submitTSWeek: Ctx["submitTSWeek"] = (id) => {
    setTsWeeks((prev) => prev.map((w) => (w.id === id ? { ...w, status: "Submitted" } : w)));
    notify(`Timesheet ${id} submitted for review`, "Timesheet");
  };
  const setTSWeekStatus: Ctx["setTSWeekStatus"] = (id, status) => {
    setTsWeeks((prev) => prev.map((w) => (w.id === id ? { ...w, status } : w)));
    notify(`Timesheet ${id} is now ${status}`, "Timesheet");
  };
  const approveTSWeek: Ctx["approveTSWeek"] = (id) => setTSWeekStatus(id, "Approved");
  const rejectTSWeek: Ctx["rejectTSWeek"] = (id) => setTSWeekStatus(id, "Rejected");

  const addExpense: Ctx["addExpense"] = (e) => {
    const newExpense = { id: `EX-${Math.floor(Math.random() * 900 + 100)}`, status: "Submitted" as const, ...e };
    setExpenses((prev) => [newExpense, ...prev]);
    notify(`Expense request submitted: ${e.category}`, "Finance");
  };
  const setExpenseStatus: Ctx["setExpenseStatus"] = (id, status) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    notify(`Expense ${id} ${status.toLowerCase()}`, "Finance");
  };
  const approveExpense: Ctx["approveExpense"] = (id) => setExpenseStatus(id, "Approved");
  const rejectExpense: Ctx["rejectExpense"] = (id) => setExpenseStatus(id, "Rejected");

  const addClaim: Ctx["addClaim"] = (c) => {
    const newClaim = { id: `CL-${Math.floor(Math.random() * 90 + 10)}`, status: "Submitted" as const, ...c };
    setClaims((prev) => [newClaim, ...prev]);
    notify(`Expense claim submitted: ${c.title}`, "Finance");
  };
  const setClaimStatus: Ctx["setClaimStatus"] = (id, status) => {
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    notify(`Claim ${id} ${status.toLowerCase()}`, "Finance");
  };

  const clockIn = () => setClock((c) => ({ ...c, clockedInAt: nowTime(), clockedOutAt: null, onBreak: false }));
  const clockOut = () =>
    setClock((c) => ({ clockedInAt: null, clockedOutAt: nowTime(), onBreak: false, todayHours: c.todayHours + 0.1 }));
  const toggleBreak = () => setClock((c) => ({ ...c, onBreak: !c.onBreak }));

  const [shiftPattern, setShiftPattern] = React.useState<ShiftCode[]>(factoryWeekPattern);
  const setShiftForDay: Ctx["setShiftForDay"] = (idx, shift) =>
    setShiftPattern((prev) => prev.map((s, i) => (i === idx ? shift : s)));
  const [holidays, setHolidays] = React.useState<Holiday[]>(holidays2026);
  const addHoliday: Ctx["addHoliday"] = (h) =>
    setHolidays((prev) => [...prev, h].sort((a, b) => a.date.localeCompare(b.date)));
  const removeHoliday: Ctx["removeHoliday"] = (date) =>
    setHolidays((prev) => prev.filter((h) => h.date !== date));
  const [overtime, setOvertime] = React.useState<OvertimeRequest[]>(seedOT);
  const requestOvertime: Ctx["requestOvertime"] = (o) =>
    setOvertime((prev) => [
      { id: `OT-${Math.floor(Math.random() * 900 + 100)}`, employee: "You", status: "Pending", ...o },
      ...prev,
    ]);
  const setOvertimeStatus: Ctx["setOvertimeStatus"] = (id, status) =>
    setOvertime((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

  const pendingLeaveCount = leave.filter((item) => item.status === "Pending").length;
  const pendingTimesheetCount = tsWeeks.filter((item) => item.status === "Submitted").length;
  const pendingExpenseCount = expenses.filter((item) => item.status === "Submitted").length;
  const pendingClaimCount = claims.filter((item) => item.status === "Submitted").length;
  const teamOnLeave = leave.filter((item) => item.status === "Approved" && item.employee !== "You").length;

  const value: Ctx = {
    tasks, addTask, updateTaskStatus, deleteTask,
    leave, requestLeave, setLeaveStatus, approveLeave, rejectLeave,
    tickets, createTicket, setTicketStatus,
    notifications, markAllRead, markRead, unreadCount, postAnnouncement,
    goals, updateGoal,
    steps, toggleStep,
    employees, addEmployee, removeEmployee,
    projects, addProject, removeProject, assignMember, unassignMember,
    tsEntries, addTSEntry, removeTSEntry,
    tsWeeks, submitTSWeek, setTSWeekStatus, approveTSWeek, rejectTSWeek,
    expenses, addExpense, setExpenseStatus, approveExpense, rejectExpense,
    claims, addClaim, setClaimStatus,
    clock, clockIn, clockOut, toggleBreak,
    attendanceWeek, calendarEvents, payslips, salaryBreakdown,
    pendingLeaveCount, pendingTimesheetCount, pendingExpenseCount, pendingClaimCount, teamOnLeave,
    shiftPattern, setShiftForDay,
    holidays, addHoliday, removeHoliday,
    overtime, requestOvertime, setOvertimeStatus,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside AppStoreProvider");
  return ctx;
}

export const ME_EMPLOYEE_ID = ME_ID;
