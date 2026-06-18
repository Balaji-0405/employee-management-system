import { Bell, ChevronDown, ChevronUp, Pin } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { apiFetch } from "../../lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority?: string;
  pinned?: boolean;
  created_at: string;
  created_by_employee?: { name: string };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function priorityBadge(priority: string | undefined): string {
  switch (priority?.toLowerCase()) {
    case "high": return "bg-red-50 text-red-600";
    case "medium": return "bg-orange-50 text-orange-600";
    case "low": return "bg-blue-50 text-blue-600";
    default: return "bg-slate-100 text-slate-600";
  }
}

function priorityLabel(priority: string | undefined): string {
  if (!priority) return "General";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

const TAB_KEYWORDS: Record<string, string[]> = {
  Important: ["important", "urgent", "critical", "action required", "mandatory"],
  HR: ["hr", "human resources", "policy", "leave", "insurance", "health", "payroll", "salary"],
  IT: ["it", "security", "software", "hardware", "vpn", "system", "password", "access"],
  Events: ["event", "meeting", "workshop", "webinar", "training", "conference"],
  Celebrations: ["birthday", "anniversary", "congratulations", "achievement", "welcome", "farewell"],
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </section>
  );
}

function AnnouncementCard({ ann, expanded, onToggle }: { ann: Announcement; expanded: boolean; onToggle: () => void }) {
  const preview = ann.content.slice(0, 150);
  const hasMore = ann.content.length > 150;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {ann.pinned && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
              <Pin className="h-3 w-3" /> Pinned
            </span>
          )}
          <span className={`rounded px-2 py-1 text-[11px] font-semibold ${priorityBadge(ann.priority)}`}>
            {priorityLabel(ann.priority)}
          </span>
        </div>
      </div>
      <h3 className="mt-3 text-[15px] font-semibold text-slate-950">{ann.title}</h3>
      <p className="mt-2 text-[13px] leading-6 text-slate-600">
        {expanded || !hasMore ? ann.content : `${preview}…`}
      </p>
      {hasMore && (
        <button onClick={onToggle} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:text-blue-700">
          {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Read more</>}
        </button>
      )}
      <p className="mt-3 text-[11px] text-slate-400">
        {ann.created_by_employee?.name ?? "Team"} · {timeAgo(ann.created_at)}
      </p>
    </article>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const TABS = ["All", "Important", "HR", "IT", "Events", "Celebrations"] as const;
type Tab = typeof TABS[number];

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/announcements");
      setAnnouncements(Array.isArray(data) ? (data as Announcement[]) : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAnnouncements(); }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = announcements.filter((a) => {
    if (activeTab === "All") return true;
    const keywords = TAB_KEYWORDS[activeTab] ?? [];
    const text = (a.title + " " + a.content).toLowerCase();
    return keywords.some((kw) => text.includes(kw));
  });

  const pinned = announcements.filter((a) => a.pinned);

  return (
    <div className="min-h-full bg-[#f8fafc]">
      <div className="w-full space-y-4 p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-slate-950">Announcements</h1>
            <p className="mt-1 text-[14px] text-slate-500">Stay updated with company news and important updates</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 overflow-x-auto border-b border-slate-200 text-[13px] font-semibold text-slate-600">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 border-b-2 py-3 ${activeTab === tab ? "border-blue-600 text-blue-700" : "border-transparent hover:text-slate-950"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[13px] font-medium text-red-700">{error}</p>
            <button onClick={() => { setError(null); loadAnnouncements(); }} className="ml-4 text-[12px] font-bold text-red-800 underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-lg bg-slate-200" />)}
          </div>
        ) : (
          <>
            {/* Pinned section — only shown when pinned announcements exist */}
            {activeTab === "All" && pinned.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Pin className="h-4 w-4 text-amber-600" />
                  <h2 className="text-[15px] font-semibold text-slate-950">Pinned Announcements</h2>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {pinned.map((a) => (
                    <AnnouncementCard key={a.id} ann={a} expanded={expandedIds.has(a.id)} onToggle={() => toggleExpand(a.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* All announcements */}
            <Panel className="p-4">
              <h2 className="mb-4 text-[15px] font-semibold text-slate-950">
                {activeTab === "All" ? "All Announcements" : `${activeTab} Announcements`}
              </h2>

              {filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-4 text-[14px] font-semibold text-slate-700">
                    {announcements.length === 0 ? "No announcements yet" : `No ${activeTab.toLowerCase()} announcements found`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((a) => (
                    <AnnouncementCard key={a.id} ann={a} expanded={expandedIds.has(a.id)} onToggle={() => toggleExpand(a.id)} />
                  ))}
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
