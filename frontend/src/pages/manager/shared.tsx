import React, { useState } from "react";
import {
  Bell,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
  FileText,
  Filter,
  Folder,
  Mail,
  MoreVertical,
  Plus,
  Search,
  Settings2,
  Star,
  TimerReset,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";

// ── Types & Constants ────────────────────────────────────────────────────────

export type Tone = "blue" | "green" | "amber" | "red" | "purple" | "slate";

export const tone: Record<Tone, { soft: string; text: string; bar: string; dot: string }> = {
  blue: { soft: "bg-blue-50", text: "text-blue-600", bar: "bg-blue-600", dot: "bg-blue-500" },
  green: { soft: "bg-emerald-50", text: "text-emerald-600", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  amber: { soft: "bg-amber-50", text: "text-amber-600", bar: "bg-amber-500", dot: "bg-amber-500" },
  red: { soft: "bg-red-50", text: "text-red-600", bar: "bg-red-500", dot: "bg-red-500" },
  purple: { soft: "bg-violet-50", text: "text-violet-600", bar: "bg-violet-500", dot: "bg-violet-500" },
  slate: { soft: "bg-slate-100", text: "text-slate-600", bar: "bg-slate-400", dot: "bg-slate-400" },
};

// ── Mock Data ────────────────────────────────────────────────────────────────

export const projectRows = [
  ["Website Redesign", "PRJ001", "Rahul Verma", 78, "On Track", "25 May 2026", "High", "green"],
  ["Mobile App Development", "PRJ002", "Anita Singh", 45, "Delayed", "20 May 2026", "High", "red"],
  ["API Integration", "PRJ003", "Vikram Patel", 60, "At Risk", "27 May 2026", "Medium", "amber"],
  ["Cloud Migration", "PRJ004", "Arjun Reddy", 90, "On Track", "30 May 2026", "Medium", "green"],
  ["Dashboard Analytics", "PRJ005", "Neha Gupta", 30, "Delayed", "15 May 2026", "Low", "red"],
  ["HRMS Module", "PRJ006", "Sandeep Kumar", 15, "On Hold", "02 Jun 2026", "Medium", "slate"],
] as const;

export const approvals = [
  ["Rahul Verma", "Backend Developer", "Casual Leave", "20 May 2026", "Personal work", "18 May 2026 10:30 AM"],
  ["Anita Singh", "UI/UX Designer", "Sick Leave", "21 May 2026", "Fever", "18 May 2026 11:15 AM"],
  ["Vikram Patel", "Frontend Developer", "Earned Leave", "25 May 2026 - 27 May 2026", "Family function", "16 May 2026 04:20 PM"],
  ["Neha Gupta", "QA Engineer", "Casual Leave", "30 May 2026", "Personal work", "17 May 2026 09:45 AM"],
  ["Arjun Reddy", "DevOps Engineer", "Earned Leave", "02 Jun 2026 - 04 Jun 2026", "Vacation", "18 May 2026 02:10 PM"],
] as const;

export const attendanceRows = [
  ["Rahul Verma", "Backend Developer", "09:15 AM", "06:30 PM", "8h 15m", "Present", "Office", "Bangalore"],
  ["Anita Singh", "UI/UX Designer", "10:05 AM", "07:10 PM", "8h 5m", "Late", "Office", "Bangalore"],
  ["Vikram Patel", "Frontend Developer", "09:00 AM", "06:00 PM", "8h 0m", "Present", "WFH", "Remote"],
  ["Neha Gupta", "QA Engineer", "-", "-", "-", "Absent", "-", "-"],
  ["Arjun Reddy", "DevOps Engineer", "09:20 AM", "06:45 PM", "8h 25m", "Present", "Office", "Hyderabad"],
  ["Pooja Sharma", "Marketing Executive", "09:10 AM", "06:20 PM", "8h 10m", "Present", "WFH", "Remote"],
  ["Sandeep Kumar", "Data Analyst", "-", "-", "-", "On Leave", "-", "-"],
  ["Karan Mehta", "Product Manager", "09:30 AM", "06:15 PM", "7h 45m", "Present", "Office", "Bangalore"],
] as const;

export const leaveRows = [
  ["Rahul Verma", "Backend Developer", "Casual Leave", "20 May 2026", "Personal work", "18 May 2026", "Pending"],
  ["Anita Singh", "UI/UX Designer", "Sick Leave", "21 May 2026", "Fever", "18 May 2026", "Pending"],
  ["Vikram Patel", "Frontend Developer", "Earned Leave", "25 May 2026 - 27 May 2026", "Family function", "16 May 2026", "Approved"],
  ["Neha Gupta", "QA Engineer", "Casual Leave", "30 May 2026", "Personal work", "17 May 2026", "Pending"],
  ["Arjun Reddy", "DevOps Engineer", "Earned Leave", "02 Jun 2026 - 04 Jun 2026", "Vacation", "18 May 2026", "Approved"],
  ["Pooja Sharma", "Marketing Executive", "Sick Leave", "18 May 2026", "Migraine", "18 May 2026", "Rejected"],
  ["Sandeep Kumar", "Data Analyst", "Comp Off", "28 May 2026", "Compensation", "17 May 2026", "Approved"],
] as const;

export const timesheetRows = [
  ["Rahul Verma", "Backend Developer", "12 May - 18 May 2026", "42h 30m", "34h 15m", "Pending", "18 May 2026 10:30 AM"],
  ["Anita Singh", "UI/UX Designer", "12 May - 18 May 2026", "40h 00m", "32h 00m", "Pending", "18 May 2026 11:15 AM"],
  ["Vikram Patel", "Frontend Developer", "12 May - 18 May 2026", "44h 15m", "36h 45m", "Approved", "18 May 2026 09:45 AM"],
  ["Neha Gupta", "QA Engineer", "12 May - 18 May 2026", "38h 00m", "28h 30m", "Approved", "17 May 2026 08:20 PM"],
  ["Arjun Reddy", "DevOps Engineer", "12 May - 18 May 2026", "43h 30m", "38h 00m", "Approved", "18 May 2026 10:05 AM"],
  ["Pooja Sharma", "Marketing Executive", "12 May - 18 May 2026", "32h 00m", "24h 00m", "Rejected", "17 May 2026 07:30 PM"],
  ["Sandeep Kumar", "Data Analyst", "-", "-", "-", "Missing", "-"],
] as const;

export const payrollRows = [
  ["Rahul Verma", "EMP001", "Engineering", "₹ 1,20,000", "₹ 22,500", "₹ 97,500", "Paid"],
  ["Anita Singh", "EMP002", "Design", "₹ 95,000", "₹ 17,800", "₹ 77,200", "Paid"],
  ["Vikram Patel", "EMP003", "Engineering", "₹ 1,10,000", "₹ 20,300", "₹ 89,700", "Paid"],
  ["Neha Gupta", "EMP004", "QA", "₹ 80,000", "₹ 14,600", "₹ 65,400", "Paid"],
  ["Arjun Reddy", "EMP005", "DevOps", "₹ 1,15,000", "₹ 21,200", "₹ 93,800", "Paid"],
  ["Pooja Sharma", "EMP006", "Marketing", "₹ 70,000", "₹ 12,400", "₹ 57,600", "Pending"],
  ["Sandeep Kumar", "EMP007", "Analytics", "₹ 85,000", "₹ 15,600", "₹ 69,400", "Pending"],
  ["Karan Mehta", "EMP008", "Management", "₹ 1,50,000", "₹ 28,600", "₹ 1,21,400", "Failed"],
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

export function mgfmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}

export function mgfmtHours(h: number | null | undefined): string {
  if (!h || h <= 0) return "—";
  const hrs = Math.floor(h);
  return `${hrs}h ${Math.round((h - hrs) * 60)}m`;
}

export function mgfmtDate(d: string | undefined): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Shared Components ────────────────────────────────────────────────────────

export function ManagerFrame({
  title,
  subtitle,
  children,
  actions,
  search,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  search?: string;
}) {
  return (
    <div className="min-h-full bg-[#f8fbff] px-5 py-5">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-normal text-slate-950">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        {actions && (
          <div className="flex gap-3">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export function TopIcon({ icon: Icon, badge }: { icon: typeof Bell; badge?: string }) {
  return (
    <button className="relative grid h-10 w-10 place-items-center rounded-full bg-white text-slate-800 shadow-sm ring-1 ring-slate-200">
      <Icon className="h-5 w-5" />
      {badge && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{badge}</span>}
    </button>
  );
}

export function Panel({ title, action, onAction, children, className = "" }: { title?: string; action?: string; onAction?: () => void; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-950">{title}</h2>
          {action && (
            <button
              onClick={onAction}
              title={!onAction ? "Coming soon" : undefined}
              className={`text-[11px] font-bold text-blue-600 ${!onAction ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {action}
            </button>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export function Button({ children, primary = false, onClick, disabled = false, title }: { children: React.ReactNode; primary?: boolean; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-bold shadow-sm ${primary ? "bg-blue-600 text-white shadow-blue-200" : "border border-slate-200 bg-white text-slate-800"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

export function Stat({ label, value, hint, icon: Icon, itemTone = "blue" as Tone }: { label: string; value: string; hint: string; icon: typeof UsersRound; itemTone?: Tone }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <span className={`grid h-14 w-14 place-items-center rounded-full ${tone[itemTone].soft} ${tone[itemTone].text}`}>
          <Icon className="h-7 w-7" />
        </span>
        <ChevronRight className="h-5 w-5 text-blue-900" />
      </div>
      <p className="mt-2 text-xs font-bold text-slate-600">{label}</p>
      <p className="text-3xl font-bold leading-tight text-slate-950">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-blue-600">{hint}</p>
    </article>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-200 to-sky-100 text-[11px] font-bold text-slate-800 ring-2 ring-white">
      {name.split(" ").map((part) => part[0]).join("")}
    </div>
  );
}

export function StatusPill({ value }: { value: string }) {
  const selected: Tone = value.includes("Paid") || value.includes("Approved") || value.includes("Present") || value.includes("On Track") || value.includes("Working") ? "green" : value.includes("Pending") || value.includes("Late") || value.includes("At Risk") ? "amber" : value.includes("Rejected") || value.includes("Failed") || value.includes("Delayed") || value.includes("Absent") ? "red" : value.includes("Leave") || value.includes("Remote") ? "purple" : "slate";
  return <span className={`inline-flex rounded px-2 py-1 text-[11px] font-bold ${tone[selected].soft} ${tone[selected].text}`}>{value}</span>;
}

export function Bar({ value, itemTone = "green" as Tone }: { value: number; itemTone?: Tone }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 flex-1 rounded-full bg-slate-100">
        <span className={`block h-full rounded-full ${tone[itemTone].bar}`} style={{ width: `${value}%` }} />
      </span>
      <span className="w-9 text-right text-xs font-bold text-slate-700">{value}%</span>
    </span>
  );
}

export function Donut({ label, sub = "Total", value = 72 }: { label: string; sub?: string; value?: number }) {
  return (
    <div className="grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(#10b981 0 ${value}%, #3b82f6 ${value}% 72%, #f59e0b 72% 88%, #ef4444 88% 100%)` }}>
      <div className="grid h-[62%] w-[62%] place-items-center rounded-full bg-white text-center">
        <div>
          <p className="text-2xl font-bold text-slate-950">{label}</p>
          <p className="text-[11px] font-semibold text-slate-500">{sub}</p>
        </div>
      </div>
    </div>
  );
}

export function Tabs({ items }: { items: string[] }) {
  return (
    <div className="flex gap-8 overflow-x-auto border-b border-slate-100 px-5 text-sm font-bold text-slate-600">
      {items.map((item, index) => (
        <button key={item} className={`shrink-0 border-b-2 py-4 ${index === 0 ? "border-blue-600 text-blue-600" : "border-transparent"}`}>{item}</button>
      ))}
    </div>
  );
}

export function Filters({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-3 px-5 py-4 md:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_110px]">
      {Array.from({ length: count }).map((_, index) => (
        <button key={index} className="flex h-10 items-center justify-between rounded-md border border-slate-200 bg-white px-4 text-left text-xs font-semibold text-slate-700">
          {["Department", "Project", "Status", "Location", "Work Mode"][index] || "All"} <ChevronDown className="h-4 w-4" />
        </button>
      ))}
      <button className="h-10 rounded-md border border-slate-200 text-xs font-bold text-blue-600">Reset Filters</button>
    </div>
  );
}

export function Pagination({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 text-xs text-slate-500">
      <span>{text}</span>
      <div className="flex items-center gap-2">
        <ChevronLeft className="h-4 w-4" />
        {[1, 2, 3, 4, 5].map((page) => <button key={page} className={`grid h-8 w-8 place-items-center rounded-md font-bold ${page === 1 ? "bg-blue-600 text-white" : "text-slate-700"}`}>{page}</button>)}
        <ChevronRight className="h-4 w-4" />
      </div>
    </div>
  );
}

export function SideList({ title, rows }: { title: string; rows: readonly (readonly string[])[] }) {
  return (
    <Panel title={title} action="View all">
      <div className="space-y-4 px-5 pb-5">
        {rows.map((row) => (
          <div key={row.join("-")} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={row[0]} />
              <div>
                <p className="text-xs font-bold text-slate-900">{row[0]}</p>
                <p className="text-[11px] text-slate-500">{row[1]}</p>
              </div>
            </div>
            <StatusPill value={row[2]} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function Legend({ rows }: { rows: readonly string[] }) {
  return <div className="space-y-3 text-xs font-semibold text-slate-600">{rows.map((row, index) => <p key={row} className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${[tone.green.dot, tone.blue.dot, tone.amber.dot, tone.red.dot][index % 4]}`} />{row}</p>)}</div>;
}

export function Bars({ rows }: { rows: readonly (readonly [string, number, string])[] }) {
  return <div className="space-y-4 p-5">{rows.map(([label, value, right], index) => <div key={label}><div className="mb-1 flex justify-between text-xs font-bold"><span>{label}</span><span>{right}</span></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${[tone.green.bar, tone.blue.bar, tone.amber.bar, tone.red.bar, tone.purple.bar][index % 5]}`} style={{ width: `${value}%` }} /></div></div>)}</div>;
}

export function DepartmentBars() {
  return <div className="p-5 text-xs"><div className="grid grid-cols-4 gap-2 pb-3 font-bold text-blue-600"><span></span><span>Total</span><span>On Leave</span><span>Overloaded</span></div>{["Engineering", "QA", "DevOps", "Data", "Marketing", "Design"].map((d, i) => <div key={d} className="grid grid-cols-4 gap-2 py-2"><span className="font-bold">{d}</span><span className="text-blue-600">{[18, 6, 5, 4, 5, 4][i]}</span><span className="text-orange-500">{[6, 1, 0, 1, 1, 0][i]}</span><span className="text-red-500">{[2, 0, 1, 0, 0, 0][i]}</span></div>)}</div>;
}

export function InfoList({ items }: { items: string[] }) {
  return <div className="space-y-4 px-5 pb-5 text-xs">{items.map((item) => <div key={item}><p className="font-bold text-slate-500">{item.includes("@") ? "Email" : item}</p><p className="mt-1 font-semibold text-slate-900">{item}</p></div>)}</div>;
}

export function InfoBlock({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-sm font-bold text-slate-950">{value}</p></div>;
}

export function ActivityList() {
  return <div className="space-y-4 px-5 pb-5 text-xs">{["Anita Singh requested for leave", "Vikram Patel completed task", "Rahul Verma submitted timesheet", "Neha Gupta applied for earned leave", "Arjun Reddy logged in"].map((item) => <div key={item} className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-700">{item}</span><span className="text-blue-600">30 mins ago</span></div>)}</div>;
}

export function ActivityStrip() {
  return <div className="grid gap-3 px-5 pb-5 xl:grid-cols-5">{["Rahul Verma updated progress", "Anita Singh created a new task", "Vikram Patel completed a task", "Arjun Reddy uploaded a document", "Neha Gupta changed status"].map((item) => <div key={item} className="flex items-center gap-3 border-r border-slate-100 py-3 text-xs"><span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue-600"><Check className="h-4 w-4" /></span><p className="font-semibold text-slate-700">{item}</p></div>)}</div>;
}

export function LineFake() {
  return <div className="p-5"><div className="relative h-44 rounded-lg bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:72px_36px]"><svg className="h-full w-full" viewBox="0 0 500 180" preserveAspectRatio="none"><polyline points="0,125 80,95 160,72 240,55 320,70 400,60 500,68" fill="none" stroke="#10b981" strokeWidth="4" /><polyline points="0,150 80,138 160,125 240,105 320,95 400,110 500,118" fill="none" stroke="#f97316" strokeWidth="4" /><polyline points="0,165 80,158 160,150 240,140 320,132 400,145 500,150" fill="none" stroke="#ef4444" strokeWidth="4" /></svg></div></div>;
}

export function AvatarStack() {
  return <div className="flex -space-x-2">{["A", "B", "C"].map((x) => <span key={x} className="grid h-7 w-7 place-items-center rounded-full bg-orange-100 text-[10px] font-bold ring-2 ring-white">{x}</span>)}<span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-[10px] font-bold ring-2 ring-white">+5</span></div>;
}

export function CalendarEvent({ title, index }: { title: string; index: number }) {
  const colors = ["bg-green-50 text-green-700 border-green-200", "bg-blue-50 text-blue-700 border-blue-200", "bg-purple-50 text-purple-700 border-purple-200", "bg-pink-50 text-pink-700 border-pink-200", "bg-orange-50 text-orange-700 border-orange-200"];
  return <div className={`rounded-md border p-2 text-[11px] font-bold ${colors[index % colors.length]}`}><p>{title}</p><p className="mt-1 font-medium">All Team</p></div>;
}

export function TaskCard({ title, progress }: { title: string; progress: number }) {
  return <div className="mb-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex justify-between"><p className="text-xs font-bold">{title}</p><MoreVertical className="h-4 w-4" /></div><p className="mt-2 text-[11px] font-semibold text-blue-600">Website Redesign</p><div className="mt-3 flex items-center gap-3"><Avatar name="Rahul Verma" /><span className="text-xs">Rahul Verma</span></div><div className="mt-3"><Bar value={progress} itemTone={progress > 80 ? "green" : "blue"} /></div></div>;
}

export function TaskDetail() {
  return <aside><Panel><div className="p-5"><div className="flex items-start justify-between"><h2 className="text-lg font-bold">API integration with payment gateway</h2><StatusPill value="High" /></div><p className="mt-3 text-xs text-blue-600">E-Commerce Platform • PRJ002</p><div className="mt-5 grid grid-cols-2 gap-4 border-b border-slate-100 pb-5"><InfoBlock label="Assigned to" value="Arjun Reddy" /><InfoBlock label="Due Date" value="23 May 2026" /><InfoBlock label="Status" value="In Progress" /><InfoBlock label="Priority" value="High" /></div><div className="mt-5 grid grid-cols-2 gap-4"><InfoBlock label="Estimated Hours" value="16h" /><InfoBlock label="Logged Hours" value="9.5h" /></div></div><Tabs items={["Overview", "Subtasks (3)", "Comments (4)", "Files (2)", "Activity", "Time Logs"]} /><div className="space-y-5 p-5 text-sm text-slate-600"><p>Integrate Razorpay payment gateway for online payments. Include order creation, payment capture, refunds and webhook handling.</p><div><p className="mb-2 text-xs font-bold text-slate-500">Attachments</p>{["API_Specification.pdf", "Payment_Flow_Diagram.png"].map((file) => <div key={file} className="mb-2 flex justify-between rounded-md border border-slate-200 p-3 text-xs font-bold"><span>{file}</span><Download className="h-4 w-4" /></div>)}</div><ActivityList /></div></Panel></aside>;
}

export function ProjectTable() {
  return (
    <div className="overflow-x-auto px-5 py-4">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-600"><tr>{["Project Name", "Project Manager", "Team", "Progress", "Status", "Deadline", "Priority", "Health", "Actions"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{projectRows.map((row) => <tr key={row[1]}><td className="px-3 py-3"><p className="font-bold">{row[0]}</p><p className="text-[11px] text-slate-500">{row[1]}</p></td><td className="px-3 py-3">{row[2]}</td><td className="px-3 py-3"><AvatarStack /></td><td className="px-3 py-3"><Bar value={row[3]} itemTone={row[7] as Tone} /></td><td className="px-3 py-3"><StatusPill value={row[4]} /></td><td className="px-3 py-3">{row[5]}</td><td className="px-3 py-3"><StatusPill value={row[6]} /></td><td className="px-3 py-3"><span className={`block h-2.5 w-2.5 rounded-full ${tone[row[7] as Tone].dot}`} /></td><td className="px-3 py-3"><Eye className="h-4 w-4" /></td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function ApprovalTable() {
  return <div className="overflow-x-auto p-5"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr>{["Employee", "Type", "Date / Duration", "Reason", "Applied On", "Status", "Actions"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{approvals.map((row) => <tr key={row[0]}><td className="px-4 py-3"><div className="flex gap-3"><Avatar name={row[0]} /><div><p className="font-bold">{row[0]}</p><p className="text-[11px] text-slate-500">{row[1]}</p></div></div></td><td className="px-4 py-3"><StatusPill value={row[2]} /></td><td className="px-4 py-3">{row[3]}</td><td className="px-4 py-3">{row[4]}</td><td className="px-4 py-3">{row[5]}</td><td className="px-4 py-3"><StatusPill value="Pending" /></td><td className="px-4 py-3"><div className="flex gap-3 text-blue-900"><Check className="h-4 w-4 text-green-600" /><X className="h-4 w-4 text-red-600" /><Eye className="h-4 w-4" /></div></td></tr>)}</tbody></table></div>;
}

export function LeaveTable() {
  return <div className="overflow-x-auto p-5"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr>{["Employee", "Leave Type", "Date / Duration", "Reason", "Applied On", "Status", "Actions"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{leaveRows.map((row) => <tr key={`${row[0]}-${row[2]}`}><td className="px-4 py-3"><div className="flex gap-3"><Avatar name={row[0]} /><div><p className="font-bold">{row[0]}</p><p className="text-[11px] text-slate-500">{row[1]}</p></div></div></td><td className="px-4 py-3"><StatusPill value={row[2]} /></td><td className="px-4 py-3">{row[3]}</td><td className="px-4 py-3">{row[4]}</td><td className="px-4 py-3">{row[5]}</td><td className="px-4 py-3"><StatusPill value={row[6]} /></td><td className="px-4 py-3"><Eye className="h-4 w-4" /></td></tr>)}</tbody></table></div>;
}

export function TimesheetTable() {
  return <div className="overflow-x-auto px-5"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr>{["Employee", "Date Range", "Total Hours", "Billable Hours", "Status", "Submitted On", "Actions"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{timesheetRows.map((row) => <tr key={row[0]}><td className="px-4 py-3"><div className="flex gap-3"><Avatar name={row[0]} /><div><p className="font-bold">{row[0]}</p><p className="text-[11px] text-slate-500">{row[1]}</p></div></div></td><td className="px-4 py-3">{row[2]}</td><td className="px-4 py-3 font-bold">{row[3]}</td><td className="px-4 py-3 font-bold">{row[4]}</td><td className="px-4 py-3"><StatusPill value={row[5]} /></td><td className="px-4 py-3">{row[6]}</td><td className="px-4 py-3"><div className="flex gap-2"><Eye className="h-4 w-4" /><Check className="h-4 w-4 text-green-600" /><X className="h-4 w-4 text-red-600" /></div></td></tr>)}</tbody></table></div>;
}

export function PayrollTable() {
  return <div className="overflow-x-auto px-5"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr>{["Employee", "Employee ID", "Department", "Gross Salary", "Deductions", "Net Pay", "Payment Method", "Status", "Actions"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{payrollRows.map((row) => <tr key={row[1]}><td className="px-4 py-3"><div className="flex gap-3"><Avatar name={row[0]} /><div><p className="font-bold">{row[0]}</p><p className="text-[11px] text-slate-500">{row[2]}</p></div></div></td><td className="px-4 py-3">{row[1]}</td><td className="px-4 py-3">{row[2]}</td><td className="px-4 py-3 font-bold">{row[3]}</td><td className="px-4 py-3">{row[4]}</td><td className="px-4 py-3 font-bold text-green-600">{row[5]}</td><td className="px-4 py-3">Bank Transfer</td><td className="px-4 py-3"><StatusPill value={row[6]} /></td><td className="px-4 py-3"><Eye className="h-4 w-4" /></td></tr>)}</tbody></table></div>;
}

export function AttendanceTable({ teamRows }: { teamRows: any[] }) {
  return (
    <div className="overflow-x-auto px-5">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>{["Employee", "Check In", "Check Out", "Hours Worked", "Status", "Actions"].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {teamRows.map(row => (
            <tr key={row.id}>
              <td className="px-4 py-3"><div className="flex gap-3"><Avatar name={row.employees?.name ?? "?"} /><div><p className="font-bold">{row.employees?.name ?? "—"}</p><p className="text-[11px] text-slate-500">{row.employees?.department ?? "—"}</p></div></div></td>
              <td className="px-4 py-3 font-bold text-green-600">{mgfmtTime(row.clock_in)}</td>
              <td className="px-4 py-3 font-bold text-slate-700">{mgfmtTime(row.clock_out)}</td>
              <td className="px-4 py-3 font-bold">{mgfmtHours(row.hours_worked)}</td>
              <td className="px-4 py-3"><StatusPill value={row.status === "on_leave" ? "On Leave" : row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : "—"} /></td>
              <td className="px-4 py-3"><Eye className="h-4 w-4 cursor-pointer text-slate-500 hover:text-blue-600" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Placeholder Components for Missing References ──────────────────────────

export function TopEmployeeTable() {
  return (
    <div className="space-y-3 p-5 text-xs">
      {["Rahul Verma - 42 points", "Vikram Patel - 38 points", "Anita Singh - 36 points", "Arjun Reddy - 32 points"].map((item) => (
        <div key={item} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 font-bold">
          <span>{item}</span>
          <span className="text-slate-500">★</span>
        </div>
      ))}
    </div>
  );
}

export function BarChartFake() {
  return (
    <div className="space-y-4 p-5">
      {["Budgeted", "Actual", "Variance"].map((item, idx) => (
        <div key={item}>
          <div className="mb-1 text-xs font-bold text-slate-600">{item}</div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${[tone.blue.bar, tone.green.bar, tone.red.bar][idx]}`} style={{ width: `${[75, 68, -7][idx] * 1.33}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-lg font-bold text-slate-950">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
