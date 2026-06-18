import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  UserPlus,
  FolderKanban,
  Clock,
  GitBranch,
  Wallet,
  CreditCard,
  FileText,
  CalendarDays,
  Megaphone,
  Package,
  Headphones,
  BarChart3,
  Shield,
  ClipboardList,
  Settings as SettingsIcon,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useRole } from "../role-context";
import { useAuth } from "../../lib/AuthContext";
import { timesheetAPI } from "../../lib/api";
import { getPendingApprovals } from "../../services/leaveApi";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "../ui/sidebar";

// ── Types ──────────────────────────────────────────────────────────────────────
type NavLeaf = { kind: "leaf"; title: string; url: string };
type NavGroup = { kind: "group"; title: string; children: NavLeaf[] };
type NavChild = NavLeaf | NavGroup;

interface NavL1 {
  title: string;
  icon: React.ElementType;
  url?: string;
  children?: NavChild[];
}

interface NavSection {
  label?: string;
  items: NavL1[];
}

// ── Navigation data ────────────────────────────────────────────────────────────
const navSections: NavSection[] = [
  {
    items: [{ title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" }],
  },
  {
    label: "PEOPLE",
    items: [
      {
        title: "Workforce Management",
        icon: Users,
        children: [
          { kind: "leaf", title: "Directory", url: "/workforce/directory" },
          { kind: "leaf", title: "Hierarchy", url: "/workforce/hierarchy" },
          {
            kind: "group",
            title: "Lifecycle Management",
            children: [
              { kind: "leaf", title: "Onboarding", url: "/workforce/lifecycle/onboarding" },
              { kind: "leaf", title: "Probation", url: "/workforce/lifecycle/probation" },
              { kind: "leaf", title: "Transfers", url: "/workforce/lifecycle/transfers" },
              { kind: "leaf", title: "Promotions", url: "/workforce/lifecycle/promotions" },
              { kind: "leaf", title: "Offboarding", url: "/workforce/lifecycle/offboarding" },
            ],
          },
        ],
      },
      {
        title: "Payroll",
        icon: CreditCard,
        children: [
          { kind: "leaf", title: "Dashboard", url: "/payroll/dashboard" },
          { kind: "leaf", title: "Payroll Register", url: "/payroll/register" },
          { kind: "leaf", title: "Salary Config", url: "/payroll/config" },
          { kind: "leaf", title: "Analytics", url: "/payroll/analytics" },
        ],
      },
      {
        title: "Departments",
        icon: Building2,
        children: [
          { kind: "leaf", title: "Department Directory", url: "/departments/directory" },
          { kind: "leaf", title: "Organizational Structure", url: "/departments/structure" },
          { kind: "leaf", title: "Headcount Planning", url: "/departments/headcount" },
        ],
      },
      {
        title: "Recruitment",
        icon: UserPlus,
        children: [
          { kind: "leaf", title: "Job Openings", url: "/recruitment/jobs" },
          { kind: "leaf", title: "Candidates", url: "/recruitment/candidates" },
          { kind: "leaf", title: "Interview Pipeline", url: "/recruitment/interviews" },
          { kind: "leaf", title: "Offer Management", url: "/recruitment/offers" },
        ],
      },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      {
        title: "Projects",
        icon: FolderKanban,
        children: [
          { kind: "leaf", title: "Project Portfolio", url: "/projects" },
          { kind: "leaf", title: "Tasks & Work Items", url: "/tasks" },
          { kind: "leaf", title: "Milestones", url: "/projects/milestones" },
          { kind: "leaf", title: "Resource Allocation", url: "/projects/resources" },
        ],
      },
      {
        title: "Time Management",
        icon: Clock,
        children: [
          { kind: "leaf", title: "Attendance", url: "/time-management/attendance" },
          { kind: "leaf", title: "Timesheets", url: "/time-management/timesheets" },
          { kind: "leaf", title: "Shift Scheduling", url: "/time-management/shifts" },
          { kind: "leaf", title: "Overtime Management", url: "/time-management/overtime" },
        ],
      },
      {
        title: "Workflow & Approvals",
        icon: GitBranch,
        children: [
          { kind: "leaf", title: "Leave Management", url: "/workflow/leave" },
          { kind: "leaf", title: "Approval Center", url: "/workflow/approvals" },
          { kind: "leaf", title: "Workflow Automation", url: "/workflow/automation" },
          { kind: "leaf", title: "Escalation Rules", url: "/workflow/escalations" },
        ],
      },
    ],
  },
  {
    label: "COMPENSATION",
    items: [
      {
        title: "Payroll & Compensation",
        icon: Wallet,
        children: [
          { kind: "leaf", title: "Payroll Processing", url: "/compensation/payroll" },
          { kind: "leaf", title: "Salary Structures", url: "/compensation/salary" },
          { kind: "leaf", title: "Expenses & Claims", url: "/compensation/expenses" },
          { kind: "leaf", title: "Benefits & Deductions", url: "/compensation/benefits" },
          { kind: "leaf", title: "Tax & Compliance", url: "/compensation/tax" },
        ],
      },
    ],
  },
  {
    label: "WORKSPACE",
    items: [
      {
        title: "Documents",
        icon: FileText,
        children: [
          { kind: "leaf", title: "Company Documents", url: "/documents/company" },
          { kind: "leaf", title: "Employee Documents", url: "/documents/employee" },
          { kind: "leaf", title: "Templates & Policies", url: "/documents/templates" },
        ],
      },
      {
        title: "Calendar",
        icon: CalendarDays,
        children: [
          { kind: "leaf", title: "Organization Calendar", url: "/calendar/organization" },
          { kind: "leaf", title: "Holiday Calendar", url: "/calendar/holidays" },
          { kind: "leaf", title: "Events & Scheduling", url: "/calendar/events" },
        ],
      },
      {
        title: "Announcements",
        icon: Megaphone,
        children: [
          { kind: "leaf", title: "Announcements Feed", url: "/announcements/feed" },
          { kind: "leaf", title: "Scheduled Announcements", url: "/announcements/scheduled" },
          { kind: "leaf", title: "Targeted Communications", url: "/announcements/targeted" },
        ],
      },
      {
        title: "Assets Management",
        icon: Package,
        children: [
          { kind: "leaf", title: "Asset Inventory", url: "/assets/inventory" },
          { kind: "leaf", title: "Assigned Assets", url: "/assets/assigned" },
          { kind: "leaf", title: "Asset Requests", url: "/assets/requests" },
          { kind: "leaf", title: "Maintenance Tracking", url: "/assets/maintenance" },
        ],
      },
    ],
  },
  {
    label: "SUPPORT",
    items: [
      {
        title: "Helpdesk",
        icon: Headphones,
        children: [
          { kind: "leaf", title: "Ticket Center", url: "/support/tickets" },
          { kind: "leaf", title: "Knowledge Base", url: "/support/knowledge" },
          { kind: "leaf", title: "SLA & Escalations", url: "/support/sla" },
          { kind: "leaf", title: "Support Analytics", url: "/support/analytics" },
        ],
      },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      {
        title: "Reports & Analytics",
        icon: BarChart3,
        children: [
          { kind: "leaf", title: "Workforce Intelligence", url: "/intelligence/workforce" },
          { kind: "leaf", title: "Attendance Analytics", url: "/intelligence/attendance" },
          { kind: "leaf", title: "Compensation Analytics", url: "/intelligence/compensation" },
          { kind: "leaf", title: "Project Performance", url: "/intelligence/projects" },
          { kind: "leaf", title: "Custom Reports", url: "/intelligence/custom" },
          { kind: "leaf", title: "Scheduled Reports", url: "/intelligence/scheduled" },
          { kind: "leaf", title: "Executive Dashboard", url: "/intelligence/executive" },
        ],
      },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      {
        title: "Roles & Permissions",
        icon: Shield,
        children: [
          { kind: "leaf", title: "Role Management", url: "/system/roles" },
          { kind: "leaf", title: "Permission Matrix", url: "/system/permissions" },
          { kind: "leaf", title: "Access Control Groups", url: "/system/access-groups" },
        ],
      },
      {
        title: "Audit & Compliance",
        icon: ClipboardList,
        children: [
          { kind: "leaf", title: "Audit Logs", url: "/system/audit/logs" },
          { kind: "leaf", title: "Compliance Reports", url: "/system/audit/compliance" },
          { kind: "leaf", title: "Data Retention", url: "/system/audit/retention" },
          { kind: "leaf", title: "Security Monitoring", url: "/system/audit/security" },
        ],
      },
      {
        title: "Settings",
        icon: SettingsIcon,
        children: [
          { kind: "leaf", title: "Company Profile", url: "/system/settings/company" },
          { kind: "leaf", title: "Branding", url: "/system/settings/branding" },
          { kind: "leaf", title: "Integrations", url: "/system/settings/integrations" },
          { kind: "leaf", title: "Email & Notifications", url: "/system/settings/notifications" },
          { kind: "leaf", title: "Security Settings", url: "/system/settings/security" },
          { kind: "leaf", title: "Billing & Subscription", url: "/system/settings/billing" },
          { kind: "leaf", title: "Localization & Timezone", url: "/system/settings/localization" },
        ],
      },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function matchesPath(current: string, url: string): boolean {
  return current === url || current.startsWith(url + "/");
}

function l1ContainsPath(item: NavL1, path: string): boolean {
  if (item.url && matchesPath(path, item.url)) return true;
  for (const child of item.children ?? []) {
    if (child.kind === "leaf" && matchesPath(path, child.url)) return true;
    if (child.kind === "group") {
      for (const leaf of child.children) {
        if (matchesPath(path, leaf.url)) return true;
      }
    }
  }
  return false;
}

function groupContainsPath(group: NavGroup, path: string): boolean {
  return group.children.some((leaf) => matchesPath(path, leaf.url));
}

function firstLeafUrl(item: NavL1): string {
  if (item.url) return item.url;
  const first = item.children?.[0];
  if (!first) return "/dashboard";
  if (first.kind === "leaf") return first.url;
  return first.children[0]?.url ?? "/dashboard";
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { setRole } = useRole();
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const displayName = user?.name ?? "";

  const [openL1, setOpenL1] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [leaves, sheets] = await Promise.all([
          getPendingApprovals(),
          timesheetAPI.getPending(),
        ]);
        setPendingCount((leaves?.length || 0) + (sheets?.length || 0));
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    for (const section of navSections) {
      for (const item of section.items) {
        if (l1ContainsPath(item, path)) {
          setOpenL1(item.title);
          const newGroups = new Set<string>();
          for (const child of item.children ?? []) {
            if (child.kind === "group" && groupContainsPath(child, path)) {
              newGroups.add(child.title);
            }
          }
          setOpenGroups(newGroups);
          return;
        }
      }
    }
  }, [location.pathname]);

  const toggleL1 = (title: string) =>
    setOpenL1((prev) => (prev === title ? null : title));

  const toggleGroup = (title: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  const handleLogout = () => {
    setRole("employee");
    logout();
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderLeaf = (leaf: NavLeaf, indentClass: string) => {
    const active = matchesPath(location.pathname, leaf.url);
    return (
      <NavLink
        key={leaf.url}
        to={leaf.url}
        className={`relative flex items-center rounded-md ${indentClass} pr-3 py-1.5 text-sm transition-colors duration-150 ${
          active
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        {active && (
          <span className="absolute left-0 inset-y-1 w-0.5 rounded-r bg-primary" />
        )}
        {leaf.title}
      </NavLink>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const isOpen = openGroups.has(group.title);
    const active = groupContainsPath(group, location.pathname);
    return (
      <div key={group.title}>
        <button
          type="button"
          onClick={() => toggleGroup(group.title)}
          className={`flex w-full items-center gap-1.5 rounded-md pl-9 pr-2 py-1.5 text-sm transition-colors duration-150 ${
            active
              ? "text-primary font-medium"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <span className="flex-1 truncate text-left">{group.title}</span>
          <ChevronRight
            className={`h-3 w-3 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
          />
        </button>
        <div
          className={`overflow-hidden transition-all duration-150 ease-in-out ${
            isOpen ? "max-h-[300px]" : "max-h-0"
          }`}
        >
          <div className="mt-0.5 space-y-0.5">
            {group.children.map((leaf) => renderLeaf(leaf, "pl-14"))}
          </div>
        </div>
      </div>
    );
  };

  const renderL1Expanded = (item: NavL1) => {
    if (item.url && !item.children) {
      const active = matchesPath(location.pathname, item.url);
      return (
        <NavLink
          key={item.url}
          to={item.url}
          className={`relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
            active
              ? "bg-primary/10 text-primary"
              : "text-foreground hover:bg-accent"
          }`}
        >
          {active && (
            <span className="absolute left-0 inset-y-1.5 w-0.5 rounded-r bg-primary" />
          )}
          <item.icon className="h-4 w-4 shrink-0" />
          <span>{item.title}</span>
        </NavLink>
      );
    }

    const isOpen = openL1 === item.title;
    const active = l1ContainsPath(item, location.pathname);

    return (
      <div key={item.title}>
        <button
          type="button"
          onClick={() => toggleL1(item.title)}
          className={`relative flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
            active
              ? "bg-primary/10 text-primary"
              : "text-foreground hover:bg-accent"
          }`}
        >
          {active && !isOpen && (
            <span className="absolute left-0 inset-y-1.5 w-0.5 rounded-r bg-primary" />
          )}
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-left">{item.title}</span>
          {item.title === "Workflow & Approvals" && pendingCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {pendingCount}
            </span>
          )}
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
          />
        </button>
        <div
          className={`overflow-hidden transition-all duration-150 ease-in-out ${
            isOpen ? "max-h-[400px]" : "max-h-0"
          }`}
        >
          <div className="mt-0.5 mb-1 space-y-0.5">
            {item.children?.map((child) =>
              child.kind === "leaf"
                ? renderLeaf(child, "pl-9")
                : renderNavGroup(child)
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderL1Collapsed = (item: NavL1) => {
    const active = l1ContainsPath(item, location.pathname);
    const href = firstLeafUrl(item);

    return (
      <div key={item.title} className="group/citem relative">
        <button
          type="button"
          title={item.title}
          onClick={() => navigate(href)}
          className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-150 ${
            active
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <item.icon className="h-4 w-4" />
        </button>
        {item.children && (
          <div className="pointer-events-none absolute left-full top-0 z-50 ml-2 hidden min-w-[200px] rounded-md border bg-popover shadow-md group-hover/citem:pointer-events-auto group-hover/citem:block">
            <div className="border-b px-3 py-2">
              <p className="text-xs font-semibold text-foreground">{item.title}</p>
            </div>
            <div className="p-1.5 space-y-0.5 max-h-[400px] overflow-y-auto">
              {item.children.map((child) =>
                child.kind === "leaf" ? (
                  <NavLink
                    key={child.url}
                    to={child.url}
                    className={({ isActive }) =>
                      `block rounded px-2.5 py-1.5 text-sm transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-accent"
                      }`
                    }
                  >
                    {child.title}
                  </NavLink>
                ) : (
                  <div key={child.title}>
                    <p className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {child.title}
                    </p>
                    {child.children.map((leaf) => (
                      <NavLink
                        key={leaf.url}
                        to={leaf.url}
                        className={({ isActive }) =>
                          `block rounded px-5 py-1.5 text-sm transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground hover:bg-accent"
                          }`
                        }
                      >
                        {leaf.title}
                      </NavLink>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="relative">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="text-sm font-semibold">Kady Innovations</span>
              <span className="text-xs text-muted-foreground">Admin Workspace</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        <div className={`flex flex-col p-2 ${collapsed ? "items-center gap-1" : "gap-0"}`}>
          {navSections.map((section, si) => (
            <div key={si} className={collapsed ? "" : "mb-1"}>
              {!collapsed && section.label && (
                <p className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground select-none">
                  {section.label}
                </p>
              )}
              <div className={`space-y-0.5 ${collapsed ? "flex flex-col items-center gap-1" : ""}`}>
                {section.items.map((item) =>
                  collapsed ? renderL1Collapsed(item) : renderL1Expanded(item)
                )}
              </div>
            </div>
          ))}
        </div>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 rounded-md border bg-card p-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-xs font-medium">{displayName}</span>
              <span className="truncate text-[11px] text-muted-foreground">Administrator</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className={
              collapsed
                ? "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
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
