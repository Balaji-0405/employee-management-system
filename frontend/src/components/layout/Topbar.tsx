import { useState, useEffect, useRef } from "react";
import { Bell, HelpCircle, LogOut, Mail, Search, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useRole } from "../role-context";
import { useAuth } from "../../lib/AuthContext";
import { SidebarTrigger } from "../ui/sidebar";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import { notificationAPI } from "../../lib/api";

export function Topbar() {
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { role }          = useRole();
  const { user, logout }  = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll notification unread count every 30 s
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await notificationAPI.getUnreadCount();
        setUnreadCount(data?.count || 0);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const displayName = user?.name ?? (role === "admin" ? "Admin" : "User");

  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel =
    role === "admin"   ? "System Administrator" :
    role === "manager" ? "Manager"              : "Employee";

  const handleBellClick = () => {
    navigate("/notifications");
    notificationAPI.markAllRead().catch(() => {});
    setUnreadCount(0);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur">
      <SidebarTrigger />

      <Separator orientation="vertical" className="mx-1 h-5" />

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search people, tasks, projects…"
          className="h-9 border-transparent bg-muted/40 pl-8 focus-visible:bg-background"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">

        {/* Bell with unread badge */}
        <button
          onClick={handleBellClick}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Mail — placeholder for future inbox */}
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Mail"
        >
          <Mail className="h-5 w-5" />
        </button>

        {/* Help → helpdesk */}
        <button
          onClick={() => navigate("/helpdesk")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        <Separator orientation="vertical" className="mx-2 h-5" />

        {/* Avatar + Name + Role — clickable, opens dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-accent"
            aria-label="Profile menu"
            aria-expanded={dropdownOpen}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">
              {initials}
            </div>
            <div className="hidden flex-col leading-tight md:flex">
              <span className="text-xs font-semibold leading-tight">{displayName}</span>
              <span className="text-[11px] text-muted-foreground">{roleLabel}</span>
            </div>
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]">

              {/* User info header */}
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">{displayName}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {user?.department ? `${user.department} · ` : ""}{roleLabel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation items */}
              <div className="py-1">
                <button
                  onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  <User className="h-4 w-4 text-slate-500" />
                  My Profile
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); navigate("/settings"); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="h-4 w-4 text-slate-500" />
                  Settings
                </button>
              </div>

              <div className="border-t border-slate-100 py-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); logout(); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
