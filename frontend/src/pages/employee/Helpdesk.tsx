import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Headphones,
  Loader2,
  MessageCircleQuestion,
  MessageSquare,
  Plus,
  Search,
  Ticket,
  X,
  Zap,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { helpdeskAPI } from "../../lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface HelpdeskStats {
  open?: number;
  in_progress?: number;
  resolved?: number;
  avg_resolution_hours?: number;
}

interface HelpdeskTicket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description?: string;
  created_at: string;
  resolution?: string;
}

interface TicketComment {
  id: string;
  content: string;
  created_at: string;
  employee?: { name: string };
}

interface TicketDetail extends HelpdeskTicket {
  comments: TicketComment[];
}

interface CreateForm {
  category: string;
  subject: string;
  description: string;
  priority: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function priorityBadge(priority: string): string {
  switch (priority?.toLowerCase()) {
    case "high": return "bg-red-50 text-red-600";
    case "medium": return "bg-amber-50 text-amber-600";
    case "low": return "bg-emerald-50 text-emerald-600";
    default: return "bg-slate-100 text-slate-600";
  }
}

function statusBadge(status: string): string {
  switch (status?.toLowerCase()) {
    case "open": return "bg-blue-50 text-blue-700";
    case "in_progress": return "bg-indigo-50 text-indigo-700";
    case "waiting_for_reply": return "bg-violet-50 text-violet-700";
    case "resolved": return "bg-emerald-50 text-emerald-700";
    case "closed": return "bg-slate-100 text-slate-600";
    default: return "bg-slate-100 text-slate-600";
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    in_progress: "In Progress",
    waiting_for_reply: "Waiting",
    resolved: "Resolved",
    closed: "Closed",
    open: "Open",
  };
  return map[status?.toLowerCase()] ?? status;
}

function formatResolutionTime(hours: number | undefined): string {
  if (!hours) return "—";
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)} days`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const PAGE_SIZE = 10;

const DEFAULT_FORM: CreateForm = { category: "IT Support", subject: "", description: "", priority: "medium" };

// ── Sub-components ─────────────────────────────────────────────────────────────

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Helpdesk() {
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [stats, setStats] = useState<HelpdeskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateForm>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [selectedTicket, setSelectedTicket] = useState<HelpdeskTicket | null>(null);
  const [ticketDetail, setTicketDetail] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketsData, statsData] = await Promise.all([
        helpdeskAPI.getTickets(statusFilter ? { status: statusFilter } : undefined),
        helpdeskAPI.getStats(),
      ]);
      setTickets(Array.isArray(ticketsData) ? (ticketsData as HelpdeskTicket[]) : []);
      if (statsData) setStats(statsData as HelpdeskStats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openTicketDetail = async (ticket: HelpdeskTicket) => {
    setSelectedTicket(ticket);
    setDetailLoading(true);
    try {
      const detail = await helpdeskAPI.getTicket(ticket.id);
      setTicketDetail(detail as TicketDetail);
    } catch {
      setTicketDetail({ ...ticket, comments: [] });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!form.subject.trim()) { setFormError("Subject is required"); return; }
    if (!form.description.trim()) { setFormError("Description is required"); return; }
    setFormLoading(true);
    setFormError(null);
    try {
      await helpdeskAPI.createTicket(form);
      setShowModal(false);
      setForm(DEFAULT_FORM);
      await loadData();
      setToast("Ticket created successfully");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!ticketDetail || !commentText.trim()) return;
    setCommentLoading(true);
    try {
      await helpdeskAPI.addComment(ticketDetail.id, commentText.trim());
      const detail = await helpdeskAPI.getTicket(ticketDetail.id);
      setTicketDetail(detail as TicketDetail);
      setCommentText("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  // Filter + paginate
  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase();
    return !q || t.subject.toLowerCase().includes(q) || t.ticket_number?.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statCards = [
    { label: "Open", value: stats?.open ?? "—", hint: "Tickets", Icon: Ticket, color: "bg-blue-50 text-blue-600" },
    { label: "In Progress", value: stats?.in_progress ?? "—", hint: "Tickets", Icon: Zap, color: "bg-amber-50 text-amber-600" },
    { label: "Waiting", value: "—", hint: "Tickets", Icon: MessageCircleQuestion, color: "bg-violet-50 text-violet-600" },
    { label: "Resolved", value: stats?.resolved ?? "—", hint: "Tickets", Icon: CheckSquare, color: "bg-emerald-50 text-emerald-600" },
  ];

  // ── If viewing a ticket detail ───────────────────────────────────────────────
  if (selectedTicket) {
    return (
      <div className="min-h-full bg-[#f8fafc]">
        <div className="w-full space-y-4 p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedTicket(null); setTicketDetail(null); }} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <h1 className="text-[20px] font-semibold text-slate-950">{selectedTicket.ticket_number}</h1>
          </div>

          <Panel className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-semibold text-slate-950">{selectedTicket.subject}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`rounded px-2 py-1 text-[11px] font-semibold ${priorityBadge(selectedTicket.priority)}`}>
                    {selectedTicket.priority}
                  </span>
                  <span className={`rounded px-2 py-1 text-[11px] font-semibold ${statusBadge(selectedTicket.status)}`}>
                    {statusLabel(selectedTicket.status)}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                    {selectedTicket.category}
                  </span>
                </div>
              </div>
              <p className="text-[12px] text-slate-500">{formatDate(selectedTicket.created_at)}</p>
            </div>
            {selectedTicket.description && (
              <p className="mt-4 text-[14px] leading-6 text-slate-700">{selectedTicket.description}</p>
            )}
          </Panel>

          <Panel className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-slate-950">
              <MessageSquare className="h-4 w-4" /> Comments
            </h3>
            {detailLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {(ticketDetail?.comments ?? []).length === 0 ? (
                  <p className="text-[13px] text-slate-500">No comments yet.</p>
                ) : (
                  (ticketDetail?.comments ?? []).map((c) => (
                    <div key={c.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[12px] font-semibold text-slate-700">{c.employee?.name ?? "Support"}</p>
                      <p className="mt-1 text-[13px] text-slate-700">{c.content}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{formatDate(c.created_at)}</p>
                    </div>
                  ))
                )}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                placeholder="Add a comment..."
                className="flex-1 resize-none rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500"
              />
              <button
                onClick={handleAddComment}
                disabled={commentLoading || !commentText.trim()}
                className="rounded-md bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
              </button>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  // ── Main list view ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-[#f8fafc]">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="w-full space-y-4 p-4 lg:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-slate-950">Helpdesk</h1>
            <p className="mt-1 text-[14px] text-slate-500">Raise a request or report an issue</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-[300px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Search tickets..."
              />
            </div>
            <button
              onClick={() => { setForm(DEFAULT_FORM); setFormError(null); setShowModal(true); }}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Create Ticket
            </button>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 outline-none"
            >
              <option value="">All Tickets</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[13px] font-medium text-red-700">{error}</p>
            <button onClick={() => { setError(null); loadData(); }} className="ml-4 text-[12px] font-bold text-red-800 underline">Retry</button>
          </div>
        )}

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {/* Stat cards */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map(({ label, value, hint, Icon, color }) => (
                <Panel key={label} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`grid h-12 w-12 place-items-center rounded-full ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-600">{label}</p>
                      <p className="mt-1 text-[26px] font-semibold leading-none text-slate-950">{String(value)}</p>
                      <p className="mt-2 text-[12px] text-slate-500">{hint}</p>
                    </div>
                  </div>
                </Panel>
              ))}
            </div>

            {/* Ticket table */}
            <Panel className="p-4">
              <h2 className="mb-4 text-[17px] font-semibold text-slate-950">My Tickets</h2>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <Ticket className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-4 text-[14px] font-semibold text-slate-700">
                    {search || statusFilter ? "No tickets match your filters" : "No tickets yet. Create your first support ticket."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="w-full border-collapse text-left text-[13px]">
                      <thead className="bg-slate-50 text-[12px] font-semibold text-slate-600">
                        <tr>
                          {["Ticket #", "Subject", "Category", "Priority", "Status", "Created"].map((h) => (
                            <th key={h} className="px-4 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginated.map((t) => (
                          <tr key={t.id} className="cursor-pointer hover:bg-slate-50/70" onClick={() => openTicketDetail(t)}>
                            <td className="px-4 py-4 font-semibold text-blue-700">{t.ticket_number}</td>
                            <td className="px-4 py-4 text-slate-800">{t.subject}</td>
                            <td className="px-4 py-4 text-slate-600">{t.category}</td>
                            <td className="px-4 py-4">
                              <span className={`rounded px-2 py-1 text-[11px] font-semibold ${priorityBadge(t.priority)}`}>{t.priority}</span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`rounded px-2 py-1 text-[11px] font-semibold ${statusBadge(t.status)}`}>{statusLabel(t.status)}</span>
                            </td>
                            <td className="px-4 py-4 text-slate-600">{formatDate(t.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between text-[12px]">
                      <p className="text-slate-500">
                        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                      </p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="h-7 rounded border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                          return start + i;
                        }).map((n) => (
                          <button key={n} onClick={() => setPage(n)} className={`h-7 min-w-[28px] rounded border px-1.5 text-xs font-bold ${n === page ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
                            {n}
                          </button>
                        ))}
                        <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} className="h-7 rounded border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Panel>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <Panel className="p-4 text-center">
              <h2 className="text-left text-[15px] font-semibold text-slate-950">Need Help?</h2>
              <div className="mx-auto mt-6 grid h-24 w-24 place-items-center rounded-full bg-blue-50 text-blue-600">
                <Headphones className="h-12 w-12" />
              </div>
              <p className="mt-5 text-[12px] leading-5 text-slate-500">Our support team is here to help you. Create a ticket and we will get back to you.</p>
              <button onClick={() => { setForm(DEFAULT_FORM); setFormError(null); setShowModal(true); }} className="mt-5 h-10 w-full rounded-md bg-blue-600 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-700">
                Create Ticket
              </button>
            </Panel>
            <Panel className="p-4">
              <h2 className="text-[15px] font-semibold text-slate-950">Helpdesk Hours</h2>
              <div className="mt-4 space-y-4 text-[13px]">
                <div><p className="text-slate-500">Monday - Friday</p><p className="mt-1 font-semibold text-slate-900">9:00 AM - 6:00 PM</p></div>
                <div><p className="text-slate-500">Saturday</p><p className="mt-1 font-semibold text-slate-900">10:00 AM - 2:00 PM</p></div>
              </div>
            </Panel>
            <Panel className="p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-emerald-50 text-emerald-600">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[12px] text-slate-500">Avg resolution</p>
                  <p className="text-[18px] font-semibold text-slate-950">{formatResolutionTime(stats?.avg_resolution_hours)}</p>
                </div>
              </div>
            </Panel>
          </aside>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[480px] rounded-lg bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-slate-950">New Support Ticket</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[12px] font-bold text-slate-700">Category</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
                  {["IT Support", "HR", "Finance", "Facilities", "Other"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-bold text-slate-700">Subject *</label>
                <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Brief description of your issue" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[12px] font-bold text-slate-700">Description *</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Describe the issue in detail..." className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[12px] font-bold text-slate-700">Priority</label>
                <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {formError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600">{formError}</p>}

            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={handleCreateTicket} disabled={formLoading} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-[13px] font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {formLoading ? "Submitting..." : "Submit Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
