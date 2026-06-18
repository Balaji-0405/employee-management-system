import { Plus, Pencil, Trash2, Megaphone, CheckCircle2, Clock3, FileText, CalendarDays, X, Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ManagerFrame,
  Stat,
  Panel,
} from "./shared";
import { announcementAPI } from "../../lib/api";
import { Skeleton } from "../../components/ui/skeleton";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  status: string;
  pinned: boolean;
  created_at: string;
  published_at?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isThisWeek(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return date > weekAgo && date <= now;
}

function statusColor(status: string): string {
  if (status === "published") return "bg-emerald-50 text-emerald-700";
  if (status === "scheduled") return "bg-amber-50 text-amber-700";
  if (status === "draft") return "bg-slate-50 text-slate-700";
  if (status === "archived") return "bg-slate-100 text-slate-600";
  return "bg-slate-50 text-slate-700";
}

function priorityColor(priority: string): string {
  if (priority === "high") return "bg-red-50 text-red-700";
  if (priority === "medium") return "bg-amber-50 text-amber-700";
  return "bg-green-50 text-green-700";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AnnouncementForm({
  announcement,
  onSave,
  onCancel,
  loading,
  error,
}: {
  announcement?: Announcement;
  onSave: (data: Partial<Announcement>) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [content, setContent] = useState(announcement?.content ?? "");
  const [priority, setPriority] = useState(announcement?.priority ?? "medium");
  const [pinned, setPinned] = useState(announcement?.pinned ?? false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ title, content, priority, pinned });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-slate-700">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
          required
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-700">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
          required
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-slate-700">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            id="pinned"
            className="h-4 w-4 rounded border-slate-200"
          />
          <label htmlFor="pinned" className="text-xs font-semibold text-slate-700">
            Pin to top
          </label>
        </div>
      </div>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {announcement ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ManagerAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async (ignore?: { cancelled: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await announcementAPI.getAll();
      if (!ignore?.cancelled) setAnnouncements(Array.isArray(data) ? (data as Announcement[]) : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load announcements";
      if (!ignore?.cancelled) setError(msg);
    } finally {
      if (!ignore?.cancelled) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ignore = { cancelled: false };
    void loadAnnouncements(ignore);
    return () => {
      ignore.cancelled = true;
    };
  }, [loadAnnouncements]);

  const handleCreate = async (data: Partial<Announcement>) => {
    setActingId("create");
    setFormError(null);
    try {
      const created: unknown = await announcementAPI.create({
        title: data.title,
        content: data.content,
        priority: data.priority,
        pinned: data.pinned,
      });
      setCreating(false);
      setAnnouncements((prev) => Array.isArray(created) ? prev : [created as Announcement, ...prev]);
      await loadAnnouncements();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create";
      setFormError(msg);
    } finally {
      setActingId(null);
    }
  };

  const handleEdit = async (data: Partial<Announcement>) => {
    if (!editingId) return;
    setActingId(editingId);
    setFormError(null);
    try {
      const updated: unknown = await announcementAPI.update(editingId, {
        title: data.title,
        content: data.content,
        priority: data.priority,
        pinned: data.pinned,
      });
      const updatedAnnouncement = updated as Announcement;
      setAnnouncements((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, ...updatedAnnouncement, title: data.title ?? item.title, content: data.content ?? item.content, priority: data.priority ?? item.priority, pinned: data.pinned ?? item.pinned }
            : item,
        ),
      );
      setEditingId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      setFormError(msg);
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    setDeletingId(id);
    try {
      await announcementAPI.delete(id);
      setAnnouncements((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Computed stats ────────────────────────────────────────────────────────

  const totalCount = announcements.length;
  const pinnedCount = announcements.filter((a) => a.pinned).length;
  const thisWeekCount = announcements.filter((a) => isThisWeek(a.created_at)).length;

  return (
    <ManagerFrame
      title="Announcements"
      subtitle="Communicate important updates and company-wide announcements"
      actions={
        !creating
          ? <button
              onClick={() => {
                setCreating(true);
                setEditingId(null);
                setFormError(null);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white shadow-sm shadow-blue-200"
            >
              <Plus className="h-4 w-4" />
              Create Announcement
            </button>
          : null
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Stat
            label="Total Announcements"
            value={String(totalCount)}
            hint="All time"
            icon={Megaphone}
            itemTone="blue"
          />
          <Stat
            label="Pinned"
            value={String(pinnedCount)}
            hint={totalCount > 0 ? `${Math.round((pinnedCount / totalCount) * 100)}% of total` : "—"}
            icon={CheckCircle2}
            itemTone="green"
          />
          <Stat
            label="This Week"
            value={String(thisWeekCount)}
            hint="Recent updates"
            icon={Clock3}
            itemTone="amber"
          />
          <Stat
            label="Active"
            value={String(announcements.filter((a) => a.status === "published").length)}
            hint="Published"
            icon={FileText}
            itemTone="purple"
          />
          <Stat
            label="Drafts"
            value={String(announcements.filter((a) => a.status === "draft").length)}
            hint="Not published"
            icon={CalendarDays}
            itemTone="slate"
          />
        </div>

        {creating && (
          <Panel>
            <div className="p-5">
              <h3 className="mb-4 text-sm font-bold text-slate-900">Create Announcement</h3>
              <AnnouncementForm
                onSave={handleCreate}
                onCancel={() => {
                  setCreating(false);
                  setFormError(null);
                }}
                loading={actingId === "create"}
                error={formError}
              />
            </div>
          </Panel>
        )}

        {error && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <Panel>
          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-12 text-center">
              <Megaphone className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">
                No announcements yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Create your first announcement to communicate with your team.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {announcements.map((ann) => (
                <div key={ann.id} className="border-b border-slate-100 p-5 last:border-b-0">
                  {editingId === ann.id ? (
                    <div>
                      <h3 className="mb-4 text-sm font-bold text-slate-900">Edit Announcement</h3>
                      <AnnouncementForm
                        announcement={ann}
                        onSave={handleEdit}
                        onCancel={() => {
                          setEditingId(null);
                          setFormError(null);
                        }}
                        loading={actingId === ann.id}
                        error={formError}
                      />
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-slate-900 truncate">
                            {ann.title}
                            {ann.pinned && <span className="ml-2 text-amber-600">📌</span>}
                          </p>
                          <div className="flex gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold ${statusColor(ann.status)}`}
                            >
                              {ann.status}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold ${priorityColor(ann.priority)}`}
                            >
                              {ann.priority}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 truncate">{ann.content}</p>
                        <p className="mt-2 text-[11px] text-slate-500">
                          {formatDate(ann.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setCreating(false);
                            setEditingId(ann.id);
                            setFormError(null);
                          }}
                          className="grid h-8 w-8 place-items-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ann.id)}
                          disabled={deletingId === ann.id}
                          className="grid h-8 w-8 place-items-center rounded border border-slate-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === ann.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </ManagerFrame>
  );
}
