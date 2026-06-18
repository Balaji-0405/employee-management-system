import {
  Download,
  Eye,
  FileArchive,
  FileSpreadsheet,
  FileText,
  FolderPlus,
  Loader2,
  MoreVertical,
  Search,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { useState, useEffect, useRef, type ReactNode, type ChangeEvent } from "react";
import { documentAPI } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Document {
  id: string;
  name: string;
  employee_id: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  folder?: string;
  category?: string;
  created_at: string;
}

interface DocStats {
  total_files?: number;
  shared_with_me?: number;
  total_size?: number;
  recent?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number | undefined): string {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getFileIconColor(type: string | undefined): string {
  const t = (type ?? "").toLowerCase();
  if (t.includes("pdf")) return "bg-red-500";
  if (t.includes("doc") || t.includes("word")) return "bg-blue-600";
  if (t.includes("xls") || t.includes("sheet") || t.includes("csv")) return "bg-emerald-600";
  if (t.includes("zip") || t.includes("rar")) return "bg-amber-500";
  if (t.includes("ppt") || t.includes("presentation")) return "bg-orange-500";
  return "bg-slate-500";
}

function getFileIcon(type: string | undefined) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("zip") || t.includes("rar")) return FileArchive;
  if (t.includes("xls") || t.includes("sheet") || t.includes("csv")) return FileSpreadsheet;
  return FileText;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Documents() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"my" | "shared">("my");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [docsData, statsData] = await Promise.all([
        documentAPI.getAll({ tab: activeTab }),
        documentAPI.getStats(),
      ]);
      setDocs(Array.isArray(docsData) ? (docsData as Document[]) : []);
      if (statsData) setStats(statsData as DocStats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      formData.append("folder", "general");
      formData.append("category", "personal");
      await documentAPI.upload(formData);
      await loadData();
      setToast("File uploaded successfully");
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleView = (doc: Document) => {
    if (doc.file_url) window.open(doc.file_url, "_blank");
  };

  const handleDownload = async (doc: Document) => {
    try {
      const result = await documentAPI.download(doc.id) as { download_url?: string } | null;
      const url = result?.download_url ?? doc.file_url;
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await documentAPI.delete(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      setToast("Document deleted");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const filteredDocs = docs.filter((doc) =>
    doc.name.toLowerCase().includes(search.toLowerCase())
  );

  const statCards = [
    { label: "My Documents", value: String(stats?.total_files ?? "—"), hint: "Files", Icon: FileText, color: "bg-blue-50 text-blue-600" },
    { label: "Shared with Me", value: String(stats?.shared_with_me ?? "—"), hint: "Files", Icon: Share2, color: "bg-emerald-50 text-emerald-600" },
    { label: "Storage Used", value: formatFileSize(stats?.total_size), hint: "Used", Icon: Upload, color: "bg-indigo-50 text-indigo-600" },
    { label: "Recent Uploads", value: String(stats?.recent ?? "—"), hint: "Files", Icon: FileSpreadsheet, color: "bg-green-50 text-green-600" },
  ];

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
            <h1 className="text-[28px] font-semibold leading-tight text-slate-950">Documents</h1>
            <p className="mt-1 text-[14px] text-slate-500">Store, access and manage your important files</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-[300px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Search documents..."
              />
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
              <FolderPlus className="h-4 w-4" /> New Folder
            </button>
            <button className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-700">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
            {uploadError}
          </div>
        )}

        <div className="flex gap-8 overflow-x-auto border-b border-slate-200 text-[13px] font-semibold text-slate-600">
          {(["my", "shared"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 border-b-2 py-3 ${activeTab === tab ? "border-blue-600 text-blue-700" : "border-transparent hover:text-slate-950"}`}
            >
              {tab === "my" ? "My Documents" : "Shared with Me"}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ label, value, hint, Icon, color }) => (
            <Panel key={label} className="p-4">
              <div className="flex items-center gap-4">
                <div className={`grid h-12 w-12 place-items-center rounded-full ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-600">{label}</p>
                  <p className="mt-1 text-[26px] font-semibold leading-none text-slate-950">{value}</p>
                  <p className="mt-2 text-[12px] text-slate-500">{hint}</p>
                </div>
              </div>
            </Panel>
          ))}
        </div>

        {error && (
          <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[13px] font-medium text-red-700">{error}</p>
            <button onClick={() => { setError(null); loadData(); }} className="ml-4 text-[12px] font-bold text-red-800 underline">
              Retry
            </button>
          </div>
        )}

        <Panel className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-slate-950">
              {activeTab === "my" ? "My Documents" : "Shared with Me"}
            </h2>
          </div>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 animate-pulse rounded-lg bg-slate-100" />)}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-[14px] font-semibold text-slate-700">
                {search
                  ? "No documents found"
                  : activeTab === "my"
                  ? "No documents uploaded yet. Click Upload to add your first document."
                  : "No documents shared with you yet."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {filteredDocs.map((doc) => {
                const Icon = getFileIcon(doc.file_type);
                const isOwner = user?.id === doc.employee_id;
                return (
                  <article key={doc.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start justify-between">
                      <div className={`grid h-12 w-12 place-items-center rounded-md ${getFileIconColor(doc.file_type)} text-white`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleView(doc)} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDownload(doc)} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Download">
                          <Download className="h-4 w-4" />
                        </button>
                        {isOwner && (
                          <button onClick={() => handleDelete(doc)} className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <h3 className="mt-4 truncate text-[14px] font-semibold text-slate-950">{doc.name}</h3>
                    <p className="mt-1 text-[12px] text-slate-500">{doc.folder ?? "—"}</p>
                    <p className="mt-3 text-[11px] text-slate-500">
                      {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
