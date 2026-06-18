export type Role = "employee" | "manager" | "admin";

export const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "employee", label: "Employee", description: "Personal workspace" },
  { value: "manager", label: "Manager", description: "Team operations" },
  { value: "admin", label: "Admin", description: "Organization control" },
];

export const currentUser = {
  name: "Aarav Sharma",
  email: "aarav.sharma@acme.co",
  initials: "AS",
  jobTitle: "Senior Product Designer",
  department: "Design",
  employeeId: "ACM-2041",
};

export const teamMembers = [
  { id: "1", name: "Priya Patel", role: "Product Designer", status: "active", attendance: 96, tasksOpen: 4 },
  { id: "2", name: "Rahul Verma", role: "Engineering Lead", status: "active", attendance: 92, tasksOpen: 7 },
  { id: "3", name: "Sara Khan", role: "QA Engineer", status: "leave", attendance: 88, tasksOpen: 2 },
  { id: "4", name: "Mohit Singh", role: "Frontend Engineer", status: "active", attendance: 99, tasksOpen: 5 },
  { id: "5", name: "Neha Gupta", role: "Marketing Manager", status: "active", attendance: 94, tasksOpen: 3 },
  { id: "6", name: "Arjun Mehta", role: "Backend Engineer", status: "active", attendance: 91, tasksOpen: 6 },
];

export const tasks = [
  { id: "T-204", title: "Q3 design review prep", project: "Atlas", priority: "High", status: "In progress", due: "Today" },
  { id: "T-211", title: "Refactor onboarding flow", project: "Onboarding", priority: "Medium", status: "Todo", due: "Wed" },
  { id: "T-187", title: "Audit accessibility on settings", project: "Atlas", priority: "Low", status: "In progress", due: "Fri" },
  { id: "T-220", title: "Draft engineering OKRs", project: "Org", priority: "High", status: "Todo", due: "Mon" },
  { id: "T-198", title: "Customer interview synthesis", project: "Research", priority: "Medium", status: "Done", due: "Last week" },
];

export const leaveRequests = [
  { id: "L-20", employee: "You", type: "Earned", from: "Apr 14", to: "Apr 18", days: 5, status: "Approved" as const },
  { id: "L-21", employee: "You", type: "Sick", from: "Mar 09", to: "Mar 10", days: 2, status: "Approved" as const },
  { id: "L-22", employee: "You", type: "Casual", from: "May 27", to: "May 27", days: 1, status: "Pending" as const },
  { id: "L-12", employee: "Sara Khan", type: "Sick", from: "May 12", to: "May 14", days: 3, status: "Pending" as const },
  { id: "L-13", employee: "Rahul Verma", type: "Casual", from: "May 18", to: "May 18", days: 1, status: "Pending" as const },
  { id: "L-09", employee: "Priya Patel", type: "Earned", from: "May 22", to: "May 26", days: 5, status: "Approved" as const },
  { id: "L-08", employee: "Mohit Singh", type: "Sick", from: "May 6", to: "May 7", days: 2, status: "Approved" as const },
  { id: "L-07", employee: "Neha Gupta", type: "Casual", from: "May 3", to: "May 3", days: 1, status: "Rejected" as const },
  { id: "L-15", employee: "Priya Patel", type: "Maternity", from: "Feb 01", to: "Aug 01", days: 182, status: "Approved" as const },
];

// Current user leave context — used by the leave policy engine.
export const meJoinDate = "2022-08-15";
export const meCarryForward: Record<string, number> = {
  Earned: 12,
  Sick: 0,
  Casual: 0,
  Maternity: 0,
  LossOfPay: 0,
};

export const announcements = [
  { id: "A1", title: "All-hands moved to Friday 4:00 PM", time: "2h ago", tag: "Company" },
  { id: "A2", title: "New leave policy effective June 1", time: "Yesterday", tag: "HR" },
  { id: "A3", title: "Office maintenance this Saturday", time: "2 days ago", tag: "Ops" },
];

export const meetings = [
  { id: "M1", title: "Sprint planning", time: "10:00 – 10:45", attendees: 8, room: "Atlas room" },
  { id: "M2", title: "1:1 with Priya", time: "12:30 – 13:00", attendees: 2, room: "Zoom" },
  { id: "M3", title: "Design critique", time: "15:00 – 16:00", attendees: 6, room: "Studio" },
];

export const attendanceWeek = [
  { day: "Mon", in: "09:02", out: "18:14", hours: 8.5, status: "Present" },
  { day: "Tue", in: "09:08", out: "18:30", hours: 8.7, status: "Present" },
  { day: "Wed", in: "09:15", out: "18:05", hours: 8.2, status: "Present" },
  { day: "Thu", in: "—", out: "—", hours: 0, status: "Leave" },
  { day: "Fri", in: "09:00", out: "—", hours: 0, status: "In progress" },
];

export const productivityTrend = [
  { week: "W1", you: 72, team: 68 },
  { week: "W2", you: 78, team: 71 },
  { week: "W3", you: 81, team: 74 },
  { week: "W4", you: 85, team: 76 },
  { week: "W5", you: 83, team: 78 },
  { week: "W6", you: 88, team: 80 },
];

export const departmentLoad = [
  { name: "Engineering", value: 42 },
  { name: "Design", value: 14 },
  { name: "Marketing", value: 9 },
  { name: "Sales", value: 18 },
  { name: "Ops", value: 11 },
];

export const employees = [
  ...teamMembers,
  { id: "7", name: "Ishita Roy", role: "Sales Lead", status: "active", attendance: 95, tasksOpen: 4 },
  { id: "8", name: "Karan Joshi", role: "Recruiter", status: "active", attendance: 89, tasksOpen: 2 },
  { id: "9", name: "Tanya Bose", role: "People Ops", status: "active", attendance: 97, tasksOpen: 1 },
  { id: "10", name: "Vikram Rao", role: "CTO", status: "active", attendance: 100, tasksOpen: 9 },
];

export const payslips = [
  { id: "PS-2026-05", period: "May 2026", gross: 185000, deductions: 32400, net: 152600, status: "Paid", date: "May 31" },
  { id: "PS-2026-04", period: "Apr 2026", gross: 185000, deductions: 32400, net: 152600, status: "Paid", date: "Apr 30" },
  { id: "PS-2026-03", period: "Mar 2026", gross: 180000, deductions: 31800, net: 148200, status: "Paid", date: "Mar 31" },
  { id: "PS-2026-02", period: "Feb 2026", gross: 180000, deductions: 31800, net: 148200, status: "Paid", date: "Feb 28" },
];

export const salaryBreakdown = [
  { component: "Basic", amount: 92500 },
  { component: "HRA", amount: 37000 },
  { component: "Allowances", amount: 41500 },
  { component: "Bonus", amount: 14000 },
];

export const reviews = [
  { id: "R1", cycle: "H1 2026", reviewer: "Vikram Rao", status: "In progress", due: "Jun 15", score: null },
  { id: "R2", cycle: "H2 2025", reviewer: "Vikram Rao", status: "Completed", due: "Dec 20", score: 4.4 },
  { id: "R3", cycle: "H1 2025", reviewer: "Neha Gupta", status: "Completed", due: "Jun 18", score: 4.2 },
];

export const goals = [
  { id: "G1", title: "Ship design system v3", progress: 72, owner: "You", due: "Jun 30" },
  { id: "G2", title: "Reduce onboarding drop-off by 20%", progress: 45, owner: "You", due: "Jul 15" },
  { id: "G3", title: "Mentor 2 junior designers", progress: 60, owner: "You", due: "Q3" },
  { id: "G4", title: "Publish accessibility playbook", progress: 30, owner: "Design", due: "Aug 1" },
];

export const documents = [
  { id: "D1", name: "Offer letter — Aarav Sharma.pdf", type: "Contract", size: "284 KB", updated: "Jan 12, 2024", owner: "HR" },
  { id: "D2", name: "Employee handbook v4.pdf", type: "Policy", size: "1.8 MB", updated: "Apr 02, 2026", owner: "HR" },
  { id: "D3", name: "Tax declaration FY26.xlsx", type: "Finance", size: "92 KB", updated: "Apr 18, 2026", owner: "You" },
  { id: "D4", name: "Health insurance card.pdf", type: "Benefits", size: "640 KB", updated: "Mar 04, 2026", owner: "HR" },
  { id: "D5", name: "Code of conduct.pdf", type: "Policy", size: "412 KB", updated: "Feb 11, 2026", owner: "Legal" },
  { id: "D6", name: "Q1 appraisal letter.pdf", type: "Performance", size: "188 KB", updated: "Apr 05, 2026", owner: "HR" },
];

export const tickets = [
  { id: "HD-104", subject: "Laptop replacement request", category: "IT", priority: "High", status: "Open", created: "2h ago", assignee: "IT Helpdesk" },
  { id: "HD-098", subject: "Reimbursement for Q2 travel", category: "Finance", priority: "Medium", status: "In progress", created: "Yesterday", assignee: "Finance" },
  { id: "HD-091", subject: "Update emergency contact", category: "HR", priority: "Low", status: "Resolved", created: "3 days ago", assignee: "People Ops" },
  { id: "HD-085", subject: "Access to Figma org", category: "IT", priority: "Medium", status: "Resolved", created: "Last week", assignee: "IT Helpdesk" },
];

export const calendarEvents = [
  { id: "C1", title: "Sprint planning", date: "Mon", time: "10:00", duration: "45m", type: "Meeting" },
  { id: "C2", title: "1:1 with Priya", date: "Mon", time: "12:30", duration: "30m", type: "1:1" },
  { id: "C3", title: "Design critique", date: "Tue", time: "15:00", duration: "60m", type: "Meeting" },
  { id: "C4", title: "All-hands", date: "Fri", time: "16:00", duration: "60m", type: "Company" },
  { id: "C5", title: "Deep work — design system", date: "Wed", time: "09:00", duration: "180m", type: "Focus" },
  { id: "C6", title: "Customer interview", date: "Thu", time: "11:00", duration: "45m", type: "Research" },
];

export const onboardingSteps = [
  { id: "O1", title: "Sign offer letter", owner: "You", done: true, due: "Day 0" },
  { id: "O2", title: "Submit ID & tax documents", owner: "You", done: true, due: "Day 1" },
  { id: "O3", title: "Set up workstation", owner: "IT", done: true, due: "Day 1" },
  { id: "O4", title: "Complete security training", owner: "You", done: true, due: "Day 3" },
  { id: "O5", title: "Meet your team", owner: "Manager", done: false, due: "Week 1" },
  { id: "O6", title: "First 30-day check-in", owner: "Manager", done: false, due: "Day 30" },
  { id: "O7", title: "Set quarterly goals", owner: "You", done: false, due: "Day 45" },
];

export const newHires = [
  { id: "N1", name: "Rohan Iyer", role: "Backend Engineer", startDate: "May 06", progress: 80 },
  { id: "N2", name: "Aisha Khan", role: "Product Manager", startDate: "May 12", progress: 45 },
  { id: "N3", name: "Daniel Wu", role: "Data Analyst", startDate: "May 19", progress: 15 },
];

export type ProjectStatus = "Planning" | "Active" | "On hold" | "Completed";

export const projects = [
  {
    id: "P-ATL",
    name: "Atlas",
    code: "ATL",
    client: "Internal",
    status: "Active" as ProjectStatus,
    startDate: "2026-01-10",
    endDate: "2026-08-30",
    budget: 4500000,
    manager: "Vikram Rao",
    description: "Customer-facing dashboard rebuild with new design system.",
    members: ["1", "2", "4"],
  },
  {
    id: "P-ONB",
    name: "Onboarding",
    code: "ONB",
    client: "Internal",
    status: "Active" as ProjectStatus,
    startDate: "2026-03-01",
    endDate: "2026-06-30",
    budget: 1200000,
    manager: "Neha Gupta",
    description: "End-to-end employee onboarding revamp.",
    members: ["1", "9"],
  },
  {
    id: "P-RES",
    name: "Research",
    code: "RES",
    client: "Acme Labs",
    status: "Planning" as ProjectStatus,
    startDate: "2026-05-15",
    endDate: "2026-09-15",
    budget: 800000,
    manager: "Vikram Rao",
    description: "Customer interview synthesis and discovery sprint.",
    members: ["1", "5"],
  },
];

export const timesheetEntries = [
  { id: "TS-1", employeeId: "1", project: "Atlas", task: "Q3 review prep", date: "2026-05-11", hours: 6, notes: "Wireframes" },
  { id: "TS-2", employeeId: "1", project: "Atlas", task: "Design review", date: "2026-05-12", hours: 4, notes: "Critique" },
  { id: "TS-3", employeeId: "1", project: "Onboarding", task: "Flow refactor", date: "2026-05-12", hours: 3, notes: "" },
  { id: "TS-4", employeeId: "2", project: "Atlas", task: "API wiring", date: "2026-05-11", hours: 7, notes: "" },
  { id: "TS-5", employeeId: "2", project: "Atlas", task: "Bug bash", date: "2026-05-13", hours: 5, notes: "" },
  { id: "TS-6", employeeId: "4", project: "Atlas", task: "Frontend polish", date: "2026-05-13", hours: 8, notes: "" },
  { id: "TS-7", employeeId: "5", project: "Research", task: "Interview synthesis", date: "2026-05-12", hours: 6, notes: "" },
];

export type TSStatus = "Draft" | "Submitted" | "Approved" | "Rejected";

export const timesheetWeeks = [
  { id: "TW-19", employeeId: "1", week: "Week 19", from: "May 5", to: "May 9", hours: 38, status: "Approved" as TSStatus },
  { id: "TW-20", employeeId: "1", week: "Week 20", from: "May 12", to: "May 16", hours: 13, status: "Submitted" as TSStatus },
  { id: "TW-20-2", employeeId: "2", week: "Week 20", from: "May 12", to: "May 16", hours: 12, status: "Submitted" as TSStatus },
  { id: "TW-20-4", employeeId: "4", week: "Week 20", from: "May 12", to: "May 16", hours: 8, status: "Submitted" as TSStatus },
];

export type ExpenseStatus = "Draft" | "Submitted" | "Approved" | "Rejected" | "Reimbursed";

export const expenses = [
  { id: "EX-201", category: "Travel", merchant: "Indigo Airlines", amount: 12400, date: "2026-05-08", status: "Submitted" as ExpenseStatus, receipt: "indigo-receipt.pdf" },
  { id: "EX-202", category: "Meals", merchant: "Blue Tokai", amount: 850, date: "2026-05-09", status: "Approved" as ExpenseStatus, receipt: "blue-tokai.jpg" },
  { id: "EX-203", category: "Software", merchant: "Figma", amount: 4200, date: "2026-05-01", status: "Reimbursed" as ExpenseStatus, receipt: "figma-invoice.pdf" },
];

export const claims = [
  { id: "CL-44", title: "Internet reimbursement Apr", amount: 1500, date: "2026-05-02", status: "Approved" as ExpenseStatus },
  { id: "CL-45", title: "Conference ticket — UXIndia", amount: 9800, date: "2026-05-10", status: "Submitted" as ExpenseStatus },
];

// ---- Phase 2: Factory calendar, holidays, overtime ----

export type ShiftCode = "G" | "A" | "B" | "C" | "OFF";
export const SHIFTS: Record<ShiftCode, { label: string; start: string; end: string; hours: number; color: string }> = {
  G: { label: "General (09:00–18:00)", start: "09:00", end: "18:00", hours: 9, color: "var(--chart-1)" },
  A: { label: "Morning A (06:00–14:00)", start: "06:00", end: "14:00", hours: 8, color: "var(--chart-3)" },
  B: { label: "Afternoon B (14:00–22:00)", start: "14:00", end: "22:00", hours: 8, color: "var(--chart-4)" },
  C: { label: "Night C (22:00–06:00)", start: "22:00", end: "06:00", hours: 8, color: "var(--chart-5)" },
  OFF: { label: "Week off", start: "—", end: "—", hours: 0, color: "var(--muted-foreground)" },
};

// Factory weekly pattern (Mon..Sun)
export const factoryWeekPattern: ShiftCode[] = ["G", "G", "G", "G", "G", "A", "OFF"];

export type Holiday = {
  date: string; // YYYY-MM-DD
  name: string;
  type: "National" | "Restricted" | "Plant";
  region?: string;
};

export const holidays2026: Holiday[] = [
  { date: "2026-01-01", name: "New Year's Day", type: "National" },
  { date: "2026-01-26", name: "Republic Day", type: "National" },
  { date: "2026-03-06", name: "Holi", type: "National" },
  { date: "2026-04-03", name: "Good Friday", type: "Restricted" },
  { date: "2026-05-01", name: "Labour Day", type: "Plant", region: "Plant 1" },
  { date: "2026-08-15", name: "Independence Day", type: "National" },
  { date: "2026-08-26", name: "Janmashtami", type: "Restricted" },
  { date: "2026-10-02", name: "Gandhi Jayanti", type: "National" },
  { date: "2026-10-20", name: "Diwali", type: "National" },
  { date: "2026-11-04", name: "Annual maintenance shutdown", type: "Plant", region: "Plant 1" },
  { date: "2026-12-25", name: "Christmas", type: "National" },
];

export type OvertimeRequest = {
  id: string;
  employee: string;
  date: string;
  hours: number;
  reason: string;
  chargeCode?: string;
  status: "Pending" | "Approved" | "Rejected";
};

export const overtimeRequests: OvertimeRequest[] = [
  { id: "OT-101", employee: "Rahul Verma", date: "2026-05-10", hours: 3, reason: "Production line catch-up", chargeCode: "KADY001.WBS.01", status: "Pending" },
  { id: "OT-102", employee: "Mohit Singh", date: "2026-05-09", hours: 2, reason: "Release support", chargeCode: "ATL.WBS.04", status: "Approved" },
];


