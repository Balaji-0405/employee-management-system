import type React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { useAuth } from "../lib/AuthContext";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";
import Login from "../pages/Login";
import { PlaceholderPage } from "../pages/manager/PlaceholderPage";

// Employee pages
import MyPayslips from "../pages/employee/MyPayslips";
import Dashboard from "../pages/employee/Dashboard";
import Attendance from "../pages/employee/Attendance";
import Timesheet from "../pages/employee/Timesheet";
import Leave from "../pages/employee/Leave";
import Projects from "../pages/employee/Projects";
import Tasks from "../pages/employee/Tasks";
import ProjectDetail from "../pages/employee/ProjectDetail";
import Profile from "../pages/employee/Profile";
import Documents from "../pages/employee/Documents";
import Helpdesk from "../pages/employee/Helpdesk";
import Announcements from "../pages/employee/Announcements";
import Notifications from "../pages/employee/Notifications";
import Settings from "../pages/employee/Settings";

// Manager pages
import ManagerDashboard from "../pages/manager/Dashboard";
import ManagerTeam from "../pages/manager/ManagerTeam";
import ManagerProjects from "../pages/manager/ManagerProjects";
import ManagerTasks from "../pages/manager/ManagerTasks";
import ManagerApprovals from "../pages/manager/ManagerApprovals";
import ManagerAttendance from "../pages/manager/ManagerAttendance";
import ManagerLeaves from "../pages/manager/ManagerLeaves";
import ManagerTimesheets from "../pages/manager/ManagerTimesheets";
import ManagerPayroll from "../pages/manager/ManagerPayroll";
import ManagerCalendar from "../pages/manager/ManagerCalendar";
import ManagerReports from "../pages/manager/ManagerReports";
import ManagerAnnouncements from "../pages/manager/ManagerAnnouncements";
import ManagerHelpdesk from "../pages/manager/ManagerHelpdesk";
import ManagerStaffDirectory from "../pages/manager/ManagerStaffDirectory";

// Admin pages
import AdminDashboard from "../pages/admin/Dashboard";
import AdminStaffDirectory from "../pages/admin/StaffDirectory";
import AdminProjects from "../pages/admin/AdminProjects";
import AdminTasks from "../pages/admin/AdminTasks";
import AdminCalendar from "../pages/admin/AdminCalendar";
import WorkforceHierarchy from "../pages/admin/workforce/Hierarchy";
import { ComingSoon } from "../pages/admin/ComingSoon";

// Departments
import DepartmentDirectory from "../pages/admin/departments/DepartmentDirectory";
import OrgStructure from "../pages/admin/departments/OrgStructure";
import HeadcountPlanning from "../pages/admin/departments/HeadcountPlanning";

// Recruitment
import JobOpenings from "../pages/admin/recruitment/JobOpenings";
import Candidates from "../pages/admin/recruitment/Candidates";
import InterviewPipeline from "../pages/admin/recruitment/InterviewPipeline";
import OfferManagement from "../pages/admin/recruitment/OfferManagement";

// Lifecycle
import OnboardingPage from "../pages/admin/lifecycle/onboarding/OnboardingPage";
import ProbationPage from "../pages/admin/lifecycle/probation/ProbationPage";
import TransfersPage from "../pages/admin/lifecycle/transfers/TransfersPage";
import PromotionsPage from "../pages/admin/lifecycle/promotions/PromotionsPage";
import OffboardingPage from "../pages/admin/lifecycle/offboarding/OffboardingPage";
import { MilestonesPage, ResourceAllocationPage } from "../pages/admin/projects/ProjectExtras";
import { ShiftSchedulingPage, OvertimeManagementPage } from "../pages/admin/time/TimeManagement";
import PayrollDashboard from "../pages/admin/payroll/PayrollDashboard";
import PayrollRegister from "../pages/admin/payroll/PayrollRegister";
import SalaryConfig from "../pages/admin/payroll/SalaryConfig";
import PayrollAnalytics from "../pages/admin/payroll/PayrollAnalytics";

// Shared pages
import CompanyCalendar from "../pages/company-calendar/CompanyCalendar";
import HolidayCalendar from "../pages/admin/HolidayCalendar";

// ── Route helpers ─────────────────────────────────────────────────────────────

function DashboardRoute() {
  const { user } = useAuth();
  if (user?.role === "admin") return <AdminDashboard />;
  return user?.role === "manager" ? <ManagerDashboard /> : <Dashboard />;
}

function StaffDirectoryRoute() {
  const { user } = useAuth();
  if (user?.role === "admin") return <AdminStaffDirectory />;
  if (user?.role === "manager") return <ManagerStaffDirectory />;
  return <PlaceholderPage title="Staff Directory" description="Browse your organization's staff and profiles." />;
}

function RoleRoute({ manager, employee }: { manager: React.ReactNode; employee: React.ReactNode }) {
  const { user } = useAuth();
  return user?.role === "manager" ? <>{manager}</> : <>{employee}</>;
}

function MyPayslipsRoute() {
  const { user } = useAuth();
  return user?.role === "manager" ? <Navigate to="/payroll" replace /> : <MyPayslips />;
}

function CalendarRoute() {
  const { user } = useAuth();
  if (user?.role === "admin")   return <AdminCalendar />;
  if (user?.role === "manager") return <ManagerCalendar />;
  return <CompanyCalendar />;
}

function ProjectsRoute() {
  const { user } = useAuth();
  if (user?.role === "admin") return <AdminProjects />;
  if (user?.role === "manager") return <ManagerProjects />;
  return <Projects />;
}

function TasksRoute() {
  const { user } = useAuth();
  if (user?.role === "admin") return <AdminTasks />;
  if (user?.role === "manager") return <ManagerTasks />;
  return <Tasks />;
}

// ── Routes ────────────────────────────────────────────────────────────────────

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* All authenticated routes share AppLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" />} />

        {/* ── Shared routes (all authenticated roles) ── */}
        <Route path="dashboard" element={<DashboardRoute />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="attendance" element={<RoleRoute manager={<ManagerAttendance />} employee={<Attendance />} />} />
        <Route path="timesheet" element={<RoleRoute manager={<ManagerTimesheets />} employee={<Timesheet />} />} />
        <Route path="company-calendar" element={<CalendarRoute />} />
        <Route path="calendar" element={<CalendarRoute />} />
        <Route path="leave" element={<RoleRoute manager={<ManagerLeaves />} employee={<Leave />} />} />
        <Route path="projects" element={<ProjectsRoute />} />
        <Route path="projects/:projectId" element={<ProjectDetail />} />
        <Route path="tasks" element={<TasksRoute />} />
        <Route path="documents" element={<Documents />} />
        <Route path="helpdesk" element={<RoleRoute manager={<ManagerHelpdesk />} employee={<Helpdesk />} />} />
        <Route path="announcements" element={<RoleRoute manager={<ManagerAnnouncements />} employee={<Announcements />} />} />
        <Route path="settings" element={<Settings />} />
        <Route path="my/payslips"     element={<MyPayslipsRoute />} />
        <Route path="team" element={<RoleRoute manager={<ManagerTeam />} employee={<PlaceholderPage title="Team" description="Manage your team, workload, and staffing." />} />} />
        <Route path="approvals" element={<RoleRoute manager={<ManagerApprovals />} employee={<PlaceholderPage title="Approvals" description="Review and action pending requests." />} />} />
        <Route path="expenses" element={<PlaceholderPage title="Expenses" description="View submitted expenses and reimbursements." />} />
        <Route path="payroll" element={<RoleRoute manager={<ManagerPayroll />} employee={<PlaceholderPage title="Payroll" description="Run payroll and review salary payments." />} />} />
        <Route path="staff-directory" element={<StaffDirectoryRoute />} />
        <Route path="reports" element={<RoleRoute manager={<ManagerReports />} employee={<PlaceholderPage title="Reports" description="Track team performance, attendance, and payroll trends." />} />} />
        <Route path="performance" element={<PlaceholderPage title="Performance" description="Manage reviews, goals, and team performance metrics." />} />

        {/* ── Admin-only routes ── */}
        <Route element={<ProtectedRoute requireRole="admin" />}>
          {/* Workforce Management */}
          <Route path="workforce/directory" element={<AdminStaffDirectory />} />
          <Route path="workforce/hierarchy" element={<WorkforceHierarchy />} />
          <Route path="workforce/lifecycle/onboarding" element={<OnboardingPage />} />
          <Route path="workforce/lifecycle/probation" element={<ProbationPage />} />
          <Route path="workforce/lifecycle/transfers" element={<TransfersPage />} />
          <Route path="workforce/lifecycle/promotions" element={<PromotionsPage />} />
          <Route path="workforce/lifecycle/offboarding" element={<OffboardingPage />} />

          {/* Departments */}
          <Route path="departments/directory" element={<DepartmentDirectory />} />
          <Route path="departments/structure" element={<OrgStructure />} />
          <Route path="departments/headcount" element={<HeadcountPlanning />} />

          {/* Recruitment */}
          <Route path="recruitment/jobs" element={<JobOpenings />} />
          <Route path="recruitment/candidates" element={<Candidates />} />
          <Route path="recruitment/interviews" element={<InterviewPipeline />} />
          <Route path="recruitment/offers" element={<OfferManagement />} />

          {/* Payroll */}
          <Route path="payroll/dashboard" element={<PayrollDashboard />} />
          <Route path="payroll/register" element={<PayrollRegister />} />
          <Route path="payroll/register/:runId" element={<PayrollRegister />} />
          <Route path="payroll/config" element={<SalaryConfig />} />
          <Route path="payroll/analytics" element={<PayrollAnalytics />} />

          {/* System & Admin */}
          <Route path="system/roles" element={<ComingSoon title="Role Management" />} />
          <Route path="system/permissions" element={<ComingSoon title="Permission Matrix" />} />
          <Route path="system/access-groups" element={<ComingSoon title="Access Control Groups" />} />
          <Route path="system/audit/logs" element={<ComingSoon title="Audit Logs" />} />
          <Route path="system/audit/compliance" element={<ComingSoon title="Compliance Reports" />} />
          <Route path="system/audit/retention" element={<ComingSoon title="Data Retention" />} />
          <Route path="system/audit/security" element={<ComingSoon title="Security Monitoring" />} />
          <Route path="system/settings/company" element={<Settings />} />
          <Route path="system/settings/branding" element={<ComingSoon title="Branding" />} />
          <Route path="system/settings/integrations" element={<ComingSoon title="Integrations" />} />
          <Route path="system/settings/notifications" element={<ComingSoon title="Email & Notifications" />} />
          <Route path="system/settings/security" element={<ComingSoon title="Security Settings" />} />
          <Route path="system/settings/billing" element={<ComingSoon title="Billing & Subscription" />} />
          <Route path="system/settings/localization" element={<ComingSoon title="Localization & Timezone" />} />
        </Route>

        {/* ── Manager + Admin routes ── */}
        <Route element={<ProtectedRoute requireRole={["manager", "admin"]} />}>
          {/* Projects */}
          <Route path="projects/portfolio" element={<Projects />} />
          <Route path="projects/tasks" element={<Tasks />} />
          <Route path="projects/milestones" element={<MilestonesPage />} />
          <Route path="projects/resources" element={<ResourceAllocationPage />} />

          {/* Time Management */}
          <Route path="time-management/attendance" element={<Attendance />} />
          <Route path="time-management/timesheets" element={<Timesheet />} />
          <Route path="time-management/shifts" element={<ShiftSchedulingPage />} />
          <Route path="time-management/overtime" element={<OvertimeManagementPage />} />

          {/* Workflow & Approvals */}
          <Route path="workflow/leave" element={<Leave />} />
          <Route path="workflow/approvals" element={<ManagerApprovals />} />
          <Route path="workflow/automation" element={<ComingSoon title="Workflow Automation" />} />
          <Route path="workflow/escalations" element={<ComingSoon title="Escalation Rules" />} />

          {/* Compensation */}
          <Route path="compensation/payroll" element={<ComingSoon title="Payroll" />} />
          <Route path="compensation/salary" element={<ComingSoon title="Salary Structures" />} />
          <Route path="compensation/expenses" element={<ComingSoon title="Expenses & Claims" />} />
          <Route path="compensation/benefits" element={<ComingSoon title="Benefits & Deductions" />} />
          <Route path="compensation/tax" element={<ComingSoon title="Tax & Compliance" />} />

          {/* Intelligence */}
          <Route path="intelligence/workforce" element={<ManagerReports />} />
          <Route path="intelligence/attendance" element={<ComingSoon title="Attendance Analytics" />} />
          <Route path="intelligence/compensation" element={<ComingSoon title="Compensation Analytics" />} />
          <Route path="intelligence/projects" element={<ComingSoon title="Project Performance" />} />
          <Route path="intelligence/custom" element={<ComingSoon title="Custom Reports" />} />
          <Route path="intelligence/scheduled" element={<ComingSoon title="Scheduled Reports" />} />
          <Route path="intelligence/executive" element={<ComingSoon title="Executive Dashboard" />} />
        </Route>

        {/* ── All-role admin-accessible routes ── */}
        <Route path="documents/company" element={<Documents />} />
        <Route path="documents/employee" element={<ComingSoon title="Employee Documents" />} />
        <Route path="documents/templates" element={<ComingSoon title="Templates & Policies" />} />
        <Route path="calendar/organization" element={<CompanyCalendar />} />
        <Route path="calendar/holidays" element={<HolidayCalendar />} />
        <Route path="calendar/events" element={<ComingSoon title="Events & Scheduling" />} />
        <Route path="announcements/feed" element={<Announcements />} />
        <Route path="announcements/scheduled" element={<ComingSoon title="Scheduled Announcements" />} />
        <Route path="announcements/targeted" element={<ComingSoon title="Targeted Communications" />} />
        <Route path="assets/inventory" element={<ComingSoon title="Asset Inventory" />} />
        <Route path="assets/assigned" element={<ComingSoon title="Assigned Assets" />} />
        <Route path="assets/requests" element={<ComingSoon title="Asset Requests" />} />
        <Route path="assets/maintenance" element={<ComingSoon title="Maintenance Tracking" />} />
        <Route path="support/tickets" element={<Helpdesk />} />
        <Route path="support/knowledge" element={<ComingSoon title="Knowledge Base" />} />
        <Route path="support/sla" element={<ComingSoon title="SLA & Escalations" />} />
        <Route path="support/analytics" element={<ComingSoon title="Support Analytics" />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
