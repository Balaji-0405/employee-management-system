import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { timesheetAPI } from "../../lib/api";
import { getPendingApprovals } from "../../services/leaveApi";
import {
  LayoutDashboard,
  Clock4,
  CalendarDays,
  CheckSquare,
  UsersRound,
  BarChart3,
  Bell,
  Settings,
  Building2,
  Wallet,
  FileText,
  LifeBuoy,
  Briefcase,
  Timer,
  Megaphone,
  User,
  HelpCircle,
  ClipboardList,
  Send,
  LogOut,
} from "lucide-react";
import { useRole } from "../role-context";
import { useAuth } from "../../lib/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "../ui/sidebar";

type Item = { title: string; url: string; icon: typeof LayoutDashboard; badge?: string };

const dashboardItem: Item = { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard };


const personalEmployee: Item[] = [
  dashboardItem,
  { title: "My Profile", url: "/profile", icon: User },
  { title: "Attendance", url: "/attendance", icon: Clock4 },
  { title: "Timesheet", url: "/timesheet", icon: Timer },
  { title: "Company calendar", url: "/company-calendar", icon: CalendarDays },
  { title: "Leave", url: "/leave", icon: CalendarDays },
];

const workEmployee: Item[] = [
  { title: "Projects", url: "/projects", icon: Briefcase },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "My Payslips", url: "/my/payslips", icon: Wallet },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Helpdesk", url: "/helpdesk", icon: LifeBuoy },
];

const managerOverview: Item[] = [
  dashboardItem,
];

const managerWorkforce: Item[] = [
  { title: "Team", url: "/team", icon: UsersRound },
  { title: "Attendance", url: "/attendance", icon: Clock4 },
  { title: "Leaves", url: "/leave", icon: CalendarDays },
  { title: "Timesheets", url: "/timesheet", icon: Timer },
];

const managerWork: Item[] = [
  { title: "Approvals", url: "/approvals", icon: ClipboardList },
  { title: "Projects", url: "/projects", icon: Briefcase },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const managerFinance: Item[] = [
  { title: "Payroll", url: "/payroll", icon: Wallet },
  { title: "Expenses", url: "/expenses", icon: Wallet },
];


const managerCommunication: Item[] = [
  { title: "Announcements", url: "/announcements", icon: Send, badge: "3" },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Notifications", url: "/notifications", icon: Bell, badge: "8" },
];

const managerSystem: Item[] = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Helpdesk", url: "/helpdesk", icon: HelpCircle },
];

const employeeSystem: Item[] = [
  { title: "Announcements", url: "/announcements", icon: Megaphone },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role, setRole } = useRole();
  const { user, logout } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        if (role === "manager") {
          const [leaves, sheets] = await Promise.all([
            getPendingApprovals(),
            timesheetAPI.getPending(),
          ]);
          setPendingCount((leaves?.length || 0) + (sheets?.length || 0));
        }
      } catch {}
    };
    load();
  }, [role]);

  // Admin gets its own sidebar — all hooks are declared above this return.
  if (role === "admin") return <AdminSidebar />;

  const initials = user?.name
    ? user.name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const displayName = user?.name ?? "";
  const displayRole = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "";

  const isActive = (url: string) => path === url;

  const renderGroup = (label: string, items: Item[]) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url + item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
              >
                <NavLink
                  to={item.url}
                  className={collapsed ? "flex w-full items-center justify-center" : "flex items-center gap-2"}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
              {!collapsed && item.url === "/approvals" && pendingCount > 0 && (
                <SidebarMenuBadge className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {pendingCount}
                </SidebarMenuBadge>
              )}
              {!collapsed && item.badge && item.url !== "/approvals" && (
                <SidebarMenuBadge className="rounded-full bg-primary px-2 text-[10px] font-semibold text-primary-foreground">
                  {item.badge}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  const handleLogout = () => {
    setRole("employee");
    logout();
  };

  return (
    <Sidebar>
      <SidebarHeader className="relative">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold leading-tight">Kady Innovations</span>
              <span className="text-xs text-muted-foreground capitalize">{role} workspace</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {role === "employee" && (
          <>
            {renderGroup("Personal", personalEmployee)}
            {renderGroup("Workspace", workEmployee)}
            {renderGroup("System", employeeSystem)}
          </>
        )}
        {role === "manager" && (
          <>
            {renderGroup("OVERVIEW", managerOverview)}
            {renderGroup("WORKFORCE", managerWorkforce)}
            {renderGroup("WORK", managerWork)}
            {renderGroup("FINANCE", managerFinance)}
            {renderGroup("COMMUNICATION", managerCommunication)}
            {renderGroup("SYSTEM", managerSystem)}
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 rounded-md border bg-card p-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-xs font-medium">{displayName}</span>
              <span className="truncate text-[11px] text-muted-foreground">{displayRole}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className={
              collapsed
                ? "ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                : "ml-auto inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-semibold hover:bg-accent"
            }
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="text-[11px]">Logout</span>}
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
