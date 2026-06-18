import { useMemo, useState, useEffect } from "react";
import { Bell, Clock, CheckSquare, Wallet, CalendarDays } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { notificationAPI } from "../../lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

type IconComponent = typeof Bell;

interface TypeConfig {
  Icon: IconComponent;
  colorClass: string;
  bgClass: string;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  leave: { Icon: CalendarDays, colorClass: "text-blue-500", bgClass: "bg-blue-100" },
  timesheet: { Icon: Clock, colorClass: "text-purple-500", bgClass: "bg-purple-100" },
  task: { Icon: CheckSquare, colorClass: "text-green-500", bgClass: "bg-green-100" },
  payroll: { Icon: Wallet, colorClass: "text-amber-500", bgClass: "bg-amber-100" },
};

const DEFAULT_CONFIG: TypeConfig = {
  Icon: Bell,
  colorClass: "text-slate-500",
  bgClass: "bg-slate-100",
};

function getTypeConfig(type: string, isRead: boolean): TypeConfig {
  if (isRead) return DEFAULT_CONFIG;
  return TYPE_CONFIG[type] ?? DEFAULT_CONFIG;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </section>
  );
}

function NotificationRow({
  item,
  onMarkRead,
}: {
  item: Notification;
  onMarkRead: () => void;
}) {
  const { Icon, colorClass, bgClass } = getTypeConfig(item.type, item.is_read);

  return (
    <div
      onClick={onMarkRead}
      className={`flex items-start gap-4 p-4 cursor-pointer border-b last:border-b-0 transition-colors ${
        !item.is_read
          ? "bg-blue-50 border-l-4 border-l-blue-500"
          : "bg-white hover:bg-slate-50"
      }`}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          !item.is_read ? bgClass : "bg-slate-100"
        }`}
      >
        <Icon className={`h-5 w-5 ${!item.is_read ? colorClass : "text-slate-500"}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm ${
              !item.is_read ? "font-bold text-slate-900" : "font-medium text-slate-700"
            }`}
          >
            {item.title}
          </p>
          {!item.is_read && (
            <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-blue-500 mt-1" />
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.message}</p>
        <p className="mt-2 text-[11px] text-slate-400">{formatTime(item.created_at)}</p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const TABS: [string, string][] = [
  ["All", "all"],
  ["Unread", "unread"],
  ["Leave", "leave"],
  ["Timesheet", "timesheet"],
  ["Payroll", "payroll"],
  ["Task", "task"],
];

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await notificationAPI.getAll();
        setNotifications(data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.is_read);
    if (filter === "all") return notifications;
    return notifications.filter((n) => n.type === filter);
  }, [filter, notifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const quickFilters: [string, string, number][] = [
    ["All Notifications", "all", notifications.length],
    ["Unread", "unread", unreadCount],
    ["Leave", "leave", notifications.filter((n) => n.type === "leave").length],
    ["Timesheet", "timesheet", notifications.filter((n) => n.type === "timesheet").length],
    ["Payroll", "payroll", notifications.filter((n) => n.type === "payroll").length],
    ["Task", "task", notifications.filter((n) => n.type === "task").length],
  ];

  if (loading) {
    return (
      <div className="min-h-full bg-[#f8fafc] p-4 lg:p-5">
      <div className="w-full space-y-4">
          <div className="h-8 w-52 animate-pulse rounded bg-slate-200" />
          <div className="h-[360px] animate-pulse rounded-lg bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f8fafc]">
      <div className="w-full space-y-4 p-4 lg:p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-semibold leading-tight text-slate-950">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="flex h-6 items-center justify-center rounded-full bg-blue-500 px-2.5 text-xs font-bold text-white">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="shrink-0 rounded-md border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-4">
            {/* Filter tabs */}
            <div className="flex items-center border-b border-slate-200 overflow-x-auto">
              {TABS.map(([label, value]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`shrink-0 border-b-2 px-4 py-3 text-[13px] font-semibold transition-colors ${
                    filter === value
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-600 hover:text-slate-950"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Notification list */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-lg border border-slate-200 bg-white py-16 text-center">
                <Bell className="h-12 w-12 text-slate-200" />
                <div>
                  <p className="text-[15px] font-semibold text-slate-700">No notifications</p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    Nothing to show for this filter.
                  </p>
                </div>
              </div>
            ) : (
              <Panel>
                {filtered.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onMarkRead={() => handleMarkRead(item.id)}
                  />
                ))}
              </Panel>
            )}
          </div>

          <aside className="space-y-4">
            <Panel className="p-4">
              <h2 className="text-[15px] font-semibold text-slate-950">
                Notification Settings
              </h2>
              <p className="mt-2 text-[12px] leading-5 text-slate-500">
                Configure how you want to receive notifications.
              </p>
              <button
                onClick={() => navigate("/settings")}
                className="mt-4 text-[12px] font-semibold text-blue-700"
              >
                Go to Settings
              </button>
            </Panel>
            <Panel className="p-4">
              <h2 className="text-[15px] font-semibold text-slate-950">Quick Filters</h2>
              <div className="mt-4 space-y-2">
                {quickFilters.map(([label, value, count]) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-[12px] font-semibold ${
                      filter === value
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      {label}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}
