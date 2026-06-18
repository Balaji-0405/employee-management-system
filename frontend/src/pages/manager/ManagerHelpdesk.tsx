import { useState, useEffect } from "react";
import { BookOpen, Download, Plus, Ticket, Briefcase, CheckCircle2, Clock3, TimerReset, Eye, MoreVertical } from "lucide-react";
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
  Donut,
  Legend,
  Bars,
  LineFake,
} from "./shared";
import { helpdeskAPI } from "../../lib/api";

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  reporter?: { name: string; department: string };
  assignee?: { name: string } | null;
}

interface HelpdeskStats {
  open: number;
  in_progress: number;
  waiting_for_reply: number;
  resolved: number;
  avg_resolution_hours: number;
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function fmtHours(h: number): string {
  if (!h) return "—";
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export default function ManagerHelpdesk() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<HelpdeskStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      helpdeskAPI.getTickets(),
      helpdeskAPI.getStats(),
    ])
      .then(([ticketData, statsData]) => {
        setTickets(Array.isArray(ticketData) ? ticketData : []);
        setStats(statsData ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total = stats
    ? (stats.open + stats.in_progress + stats.waiting_for_reply + stats.resolved)
    : 0;

  const statusLabel = (s: string) => {
    if (s === "in_progress") return "In Progress";
    if (s === "waiting_for_reply") return "Waiting";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <ManagerFrame
      title="Helpdesk"
      subtitle="Raise, track and resolve queries efficiently"
      actions={
        <>
          <Button><BookOpen className="h-4 w-4" />Knowledge Base</Button>
          <Button><Download className="h-4 w-4" />Export</Button>
          <Button primary><Plus className="h-4 w-4" />New Ticket</Button>
        </>
      }
      search="Search tickets, employees or keywords..."
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Stat label="Total Tickets" value={String(total)} hint="All statuses" icon={Ticket} itemTone="blue" />
          <Stat label="Open Tickets" value={String(stats?.open ?? "—")} hint={total > 0 ? `${Math.round(((stats?.open ?? 0) / total) * 100)}% of total` : "—"} icon={Briefcase} itemTone="green" />
          <Stat label="In Progress" value={String(stats?.in_progress ?? "—")} hint={total > 0 ? `${Math.round(((stats?.in_progress ?? 0) / total) * 100)}% of total` : "—"} icon={Clock3} itemTone="amber" />
          <Stat label="Resolved" value={String(stats?.resolved ?? "—")} hint={total > 0 ? `${Math.round(((stats?.resolved ?? 0) / total) * 100)}% of total` : "—"} icon={CheckCircle2} itemTone="green" />
          <Stat label="Waiting Reply" value={String(stats?.waiting_for_reply ?? "—")} hint={total > 0 ? `${Math.round(((stats?.waiting_for_reply ?? 0) / total) * 100)}% of total` : "—"} icon={TimerReset} itemTone="purple" />
          <Stat label="Avg. Resolution Time" value={stats ? fmtHours(stats.avg_resolution_hours) : "—"} hint="Resolved tickets" icon={Clock3} itemTone="blue" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Panel>
              <Tabs items={[`All Tickets ${tickets.length}`, "Unassigned", "Mentions"]} />
              <Filters count={5} />
              <div className="overflow-x-auto p-5">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      {["Ticket ID", "Subject", "Requester", "Department", "Priority", "Status", "Created On", "Assigned To", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 9 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-4 animate-pulse rounded bg-slate-100" style={{ width: j === 1 ? 160 : 80 }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : tickets.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-500">No tickets found</td>
                      </tr>
                    ) : (
                      tickets.map((t) => (
                        <tr key={t.id}>
                          <td className="px-4 py-3"><StatusPill value={t.ticket_number} /></td>
                          <td className="px-4 py-3">
                            <p className="font-bold">{t.subject}</p>
                            <p className="text-[11px] text-slate-500">{t.status}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Avatar name={t.reporter?.name ?? "?"} />
                              <span className="font-bold">{t.reporter?.name ?? "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">{t.reporter?.department ?? "—"}</td>
                          <td className="px-4 py-3"><StatusPill value={t.priority.charAt(0).toUpperCase() + t.priority.slice(1)} /></td>
                          <td className="px-4 py-3"><StatusPill value={statusLabel(t.status)} /></td>
                          <td className="px-4 py-3">{fmtDate(t.created_at)}</td>
                          <td className="px-4 py-3">{t.assignee?.name ?? "Unassigned"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Eye className="h-4 w-4" />
                              <MoreVertical className="h-4 w-4" />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination text={`Showing 1 to ${Math.min(8, tickets.length)} of ${tickets.length} tickets`} />
            </Panel>
            <div className="grid gap-4 xl:grid-cols-3">
              <Panel title="Tickets Over Time" action="View Report"><LineFake /></Panel>
              <SideList title="Top Requesters" rows={[["—", "—", "Open"], ["—", "—", "Open"]]} />
              <Panel title="Top Categories" action="View Report">
                <Bars rows={[["Access & Permissions", 90, "—"], ["Payroll & Finance", 72, "—"], ["Technical Issues", 62, "—"], ["Software Requests", 48, "—"], ["Others", 40, "—"]]} />
              </Panel>
            </div>
          </div>

          <aside className="space-y-4">
            <Panel title="Tickets by Status" action="View Report">
              <div className="flex items-center justify-center gap-5 p-5">
                <Donut label={String(total)} />
                <Legend rows={[
                  `Open ${stats?.open ?? 0}`,
                  `In Progress ${stats?.in_progress ?? 0}`,
                  `Waiting ${stats?.waiting_for_reply ?? 0}`,
                  `Resolved ${stats?.resolved ?? 0}`,
                ]} />
              </div>
            </Panel>
            <Panel title="Tickets by Priority" action="View Report">
              <Bars rows={[["High", 35, "—"], ["Medium", 48, "—"], ["Low", 17, "—"]]} />
            </Panel>
            <Panel title="Quick Actions">
              <div className="grid grid-cols-3 gap-3 p-5 text-center text-[11px] font-bold">
                <button className="rounded-lg border p-4">My Tickets</button>
                <button className="rounded-lg border p-4">Create Ticket</button>
                <button className="rounded-lg border p-4">Unassigned</button>
                <button className="rounded-lg border p-4">Mentions</button>
                <button className="rounded-lg border p-4">Knowledge Base</button>
                <button className="rounded-lg border p-4">SLA Policies</button>
              </div>
            </Panel>
            <Panel title="SLA Compliance" action="View Report">
              <div className="flex items-center justify-center gap-5 p-5">
                <Donut label="—" sub="Compliant" value={0} />
                <Legend rows={["Within SLA", "Breaching", "Breached"]} />
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </ManagerFrame>
  );
}
