import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, X, Search, ChevronDown, ArrowRight, Eye } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TransferType = "Department" | "Manager" | "Location" | "Internal Mobility";
type TransferStatus = "Submitted" | "Under Review" | "Approved" | "Rejected" | "Completed";

type TransferRecord = {
  id: string;
  name: string;
  initials: string;
  color: string;
  empId: string;
  transferType: TransferType;
  fromDept: string;
  toDept: string;
  fromManager: string;
  toManager: string;
  fromLocation: string;
  toLocation: string;
  fromGrade: string;
  toGrade: string;
  effectiveDate: string;
  requestedBy: string;
  submittedOn: string;
  daysPending: number;
  reason: string;
  status: TransferStatus;
  approvedBy?: string;
  approvedOn?: string;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PENDING: TransferRecord[] = [
  {
    id: "pt1", name: "Ananya Singh",  initials: "AS", color: "bg-blue-500",   empId: "EMP021",
    transferType: "Department", fromDept: "Engineering", toDept: "Product", fromManager: "Arun Kumar", toManager: "Priya Menon",
    fromLocation: "Bangalore", toLocation: "Bangalore", fromGrade: "L4", toGrade: "L4",
    effectiveDate: "1 Jul 2026", requestedBy: "Arun Kumar", submittedOn: "28 May 2026", daysPending: 9,
    reason: "Employee has shown strong product thinking and business acumen. Transfer aligns with career goals.",
    status: "Submitted",
  },
  {
    id: "pt2", name: "Siddharth Roy", initials: "SR", color: "bg-purple-500", empId: "EMP022",
    transferType: "Manager", fromDept: "Sales", toDept: "Sales", fromManager: "Rahul Desai", toManager: "Vikram Nair",
    fromLocation: "Mumbai", toLocation: "Mumbai", fromGrade: "L3", toGrade: "L3",
    effectiveDate: "15 Jul 2026", requestedBy: "Priya Menon", submittedOn: "25 May 2026", daysPending: 12,
    reason: "Team restructuring — Vikram Nair takes over the Mumbai sales territory.",
    status: "Under Review",
  },
  {
    id: "pt3", name: "Lakshmi Das",   initials: "LD", color: "bg-teal-500",   empId: "EMP023",
    transferType: "Location", fromDept: "HR", toDept: "HR", fromManager: "Sneha Patel", toManager: "Sneha Patel",
    fromLocation: "Hyderabad", toLocation: "Bangalore", fromGrade: "L2", toGrade: "L2",
    effectiveDate: "1 Jul 2026", requestedBy: "Rahul Desai", submittedOn: "20 May 2026", daysPending: 17,
    reason: "Employee relocation request — personal reasons.",
    status: "Submitted",
  },
  {
    id: "pt4", name: "Rohit Kapoor",  initials: "RK", color: "bg-orange-500", empId: "EMP024",
    transferType: "Internal Mobility", fromDept: "Marketing", toDept: "Growth", fromManager: "Anita Joshi", toManager: "Dev Sharma",
    fromLocation: "Delhi", toLocation: "Bangalore", fromGrade: "L3", toGrade: "L4",
    effectiveDate: "1 Aug 2026", requestedBy: "Anita Joshi", submittedOn: "15 May 2026", daysPending: 22,
    reason: "High performer moving to newly formed Growth team with grade bump.",
    status: "Under Review",
  },
  {
    id: "pt5", name: "Meera Reddy",   initials: "MR", color: "bg-pink-500",   empId: "EMP025",
    transferType: "Department", fromDept: "QA", toDept: "Engineering", fromManager: "Priya Menon", toManager: "Arun Kumar",
    fromLocation: "Bangalore", toLocation: "Bangalore", fromGrade: "L3", toGrade: "L3",
    effectiveDate: "15 Jul 2026", requestedBy: "Priya Menon", submittedOn: "10 May 2026", daysPending: 27,
    reason: "QA automation expertise needed in engineering team.",
    status: "Submitted",
  },
];

const HISTORY: TransferRecord[] = [
  {
    id: "th1", name: "Rahul Vyas",   initials: "RV", color: "bg-green-500",  empId: "EMP011",
    transferType: "Department", fromDept: "Design", toDept: "Engineering", fromManager: "Dev Gupta", toManager: "Arun Kumar",
    fromLocation: "Bangalore", toLocation: "Bangalore", fromGrade: "L3", toGrade: "L3",
    effectiveDate: "1 May 2026", requestedBy: "Sneha Patel", submittedOn: "1 Apr 2026", daysPending: 0,
    reason: "Cross-functional move to leverage design-dev experience.", status: "Completed",
    approvedBy: "Priya Menon", approvedOn: "10 Apr 2026",
  },
  {
    id: "th2", name: "Pooja Sharma", initials: "PS", color: "bg-orange-500", empId: "EMP012",
    transferType: "Location", fromDept: "Finance", toDept: "Finance", fromManager: "Anjali Mehta", toManager: "Anjali Mehta",
    fromLocation: "Delhi", toLocation: "Mumbai", fromGrade: "L2", toGrade: "L2",
    effectiveDate: "15 Apr 2026", requestedBy: "Arun Kumar", submittedOn: "10 Mar 2026", daysPending: 0,
    reason: "Employee personal relocation request approved.", status: "Completed",
    approvedBy: "Rahul Desai", approvedOn: "20 Mar 2026",
  },
  {
    id: "th3", name: "Dev Kapoor",   initials: "DK", color: "bg-blue-500",   empId: "EMP013",
    transferType: "Internal Mobility", fromDept: "Engineering", toDept: "DevOps", fromManager: "Arun Kumar", toManager: "Vikram Singh",
    fromLocation: "Bangalore", toLocation: "Pune", fromGrade: "L3", toGrade: "L4",
    effectiveDate: "1 Apr 2026", requestedBy: "Priya Menon", submittedOn: "1 Mar 2026", daysPending: 0,
    reason: "Internal mobility for career growth in DevOps.", status: "Completed",
    approvedBy: "Arun Kumar", approvedOn: "10 Mar 2026",
  },
  {
    id: "th4", name: "Aarti Mehta",  initials: "AM", color: "bg-purple-500", empId: "EMP014",
    transferType: "Manager", fromDept: "HR", toDept: "HR", fromManager: "Sneha Reddy", toManager: "Priya Menon",
    fromLocation: "Hyderabad", toLocation: "Hyderabad", fromGrade: "L2", toGrade: "L2",
    effectiveDate: "1 Mar 2026", requestedBy: "Rahul Desai", submittedOn: "1 Feb 2026", daysPending: 0,
    reason: "Manager restructuring — HR team under new lead.", status: "Completed",
    approvedBy: "Rahul Desai", approvedOn: "10 Feb 2026",
  },
  {
    id: "th5", name: "Rajan Nair",   initials: "RN", color: "bg-teal-500",   empId: "EMP015",
    transferType: "Department", fromDept: "Sales", toDept: "Account Management", fromManager: "Rahul Desai", toManager: "Kiran Bose",
    fromLocation: "Chennai", toLocation: "Chennai", fromGrade: "L3", toGrade: "L3",
    effectiveDate: "15 Feb 2026", requestedBy: "Arun Kumar", submittedOn: "15 Jan 2026", daysPending: 0,
    reason: "Strong client relationship skills better suited for key account management.", status: "Completed",
    approvedBy: "Priya Menon", approvedOn: "25 Jan 2026",
  },
  {
    id: "th6", name: "Sunita Rao",   initials: "SR", color: "bg-cyan-500",   empId: "EMP016",
    transferType: "Department", fromDept: "Marketing", toDept: "Content", fromManager: "Anita Joshi", toManager: "Pooja Singh",
    fromLocation: "Jaipur", toLocation: "Jaipur", fromGrade: "L2", toGrade: "L2",
    effectiveDate: "1 Jan 2026", requestedBy: "Anita Joshi", submittedOn: "1 Dec 2025", daysPending: 0,
    reason: "Specialization in content strategy.", status: "Rejected",
  },
  {
    id: "th7", name: "Mohan Bhat",   initials: "MB", color: "bg-indigo-500", empId: "EMP017",
    transferType: "Location", fromDept: "Operations", toDept: "Operations", fromManager: "Rajesh Bose", toManager: "Rajesh Bose",
    fromLocation: "Kolkata", toLocation: "Delhi", fromGrade: "L3", toGrade: "L3",
    effectiveDate: "1 Feb 2026", requestedBy: "Rajesh Bose", submittedOn: "5 Jan 2026", daysPending: 0,
    reason: "Operational expansion in Delhi.", status: "Rejected",
  },
  {
    id: "th8", name: "Kavya Das",    initials: "KD", color: "bg-rose-500",   empId: "EMP018",
    transferType: "Internal Mobility", fromDept: "HR", toDept: "People Ops", fromManager: "Sneha Reddy", toManager: "Aarti Mehta",
    fromLocation: "Hyderabad", toLocation: "Bangalore", fromGrade: "L3", toGrade: "L4",
    effectiveDate: "1 Mar 2026", requestedBy: "Sneha Reddy", submittedOn: "1 Feb 2026", daysPending: 0,
    reason: "People Ops team formation — strong HRBP candidate.", status: "Completed",
    approvedBy: "Priya Menon", approvedOn: "10 Feb 2026",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<TransferType, string> = {
  "Department":       "bg-blue-100 text-blue-700",
  "Manager":          "bg-purple-100 text-purple-700",
  "Location":         "bg-teal-100 text-teal-700",
  "Internal Mobility":"bg-orange-100 text-orange-700",
};

const STATUS_BADGE: Record<TransferStatus, string> = {
  "Submitted":    "bg-slate-100 text-slate-600",
  "Under Review": "bg-amber-100 text-amber-700",
  "Approved":     "bg-green-100 text-green-700",
  "Rejected":     "bg-red-100 text-red-700",
  "Completed":    "bg-green-100 text-green-700",
};

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${color}`}>
      {initials}
    </span>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({ rec, onClose }: { rec: TransferRecord; onClose: () => void }) {
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [mode, setMode] = useState<"view" | "reject">("view");
  const canAct = rec.status === "Submitted" || rec.status === "Under Review";

  const fields: { label: string; from: string; to: string }[] = [
    { label: "Department", from: rec.fromDept,     to: rec.toDept },
    { label: "Manager",    from: rec.fromManager,  to: rec.toManager },
    { label: "Location",   from: rec.fromLocation, to: rec.toLocation },
    { label: "Grade",      from: rec.fromGrade,    to: rec.toGrade },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Transfer Request — {rec.name}</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {/* Comparison */}
          <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Current</p>
              {fields.map((f) => (
                <div key={f.label} className="mb-1.5">
                  <p className="text-[10px] text-slate-400">{f.label}</p>
                  <p className="text-sm text-slate-700">{f.from}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">After Transfer</p>
              {fields.map((f) => (
                <div key={f.label} className="mb-1.5">
                  <p className="text-[10px] text-slate-400">{f.label}</p>
                  <p className={`text-sm font-semibold ${f.from !== f.to ? "text-blue-600" : "text-slate-700"}`}>{f.to}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-slate-400">Transfer Type</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_BADGE[rec.transferType]}`}>{rec.transferType}</span>
            </div>
            <div><p className="text-xs text-slate-400">Effective Date</p><p className="text-slate-700">{rec.effectiveDate}</p></div>
            <div><p className="text-xs text-slate-400">Requested By</p><p className="text-slate-700">{rec.requestedBy}</p></div>
            <div><p className="text-xs text-slate-400">Submitted On</p><p className="text-slate-700">{rec.submittedOn}</p></div>
            <div className="col-span-2"><p className="text-xs text-slate-400">Reason</p><p className="text-slate-700">{rec.reason}</p></div>
          </div>

          {canAct && !mode && (
            <div>
              <label className="text-xs font-semibold text-slate-600">Approval Notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
            </div>
          )}

          {mode === "reject" && (
            <div>
              <label className="text-xs font-semibold text-slate-600">Rejection Reason *</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Why is this transfer being rejected?" className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
            </div>
          )}

          {rec.approvedBy && (
            <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
              Approved by {rec.approvedBy} on {rec.approvedOn}
            </p>
          )}
        </div>

        {canAct && (
          <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
            {mode === "reject" ? (
              <>
                <button onClick={() => setMode("view")} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back</button>
                <button onClick={onClose} disabled={!rejectReason} className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">Confirm Rejection</button>
              </>
            ) : (
              <>
                <button onClick={() => setMode("reject")} className="flex-1 rounded-xl border border-red-200 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Reject</button>
                <button onClick={onClose} className="flex-1 rounded-xl bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700">Approve Transfer</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New Transfer Modal ────────────────────────────────────────────────────────

function NewTransferModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ employee: "", type: "" as TransferType | "", newDept: "", newManager: "", newLocation: "", newRole: "", newRoleDept: "", newRoleMgr: "", effectiveDate: "", reason: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">New Transfer Request</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Employee *</label>
            <select value={form.employee} onChange={set("employee")} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none">
              <option value="">Search employee…</option>
              <option>Ananya Singh</option><option>Siddharth Roy</option><option>Ravi Kumar</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Transfer Type *</label>
            <select value={form.type} onChange={set("type")} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none">
              <option value="">Select type…</option>
              <option>Department</option><option>Manager</option><option>Location</option><option>Internal Mobility</option>
            </select>
          </div>
          {form.type === "Department" && (
            <div>
              <label className="text-xs font-semibold text-slate-600">New Department *</label>
              <select value={form.newDept} onChange={set("newDept")} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none">
                <option value="">Select department…</option>
                <option>Engineering</option><option>Product</option><option>Design</option><option>HR</option><option>Finance</option>
              </select>
            </div>
          )}
          {form.type === "Manager" && (
            <div>
              <label className="text-xs font-semibold text-slate-600">New Manager *</label>
              <input value={form.newManager} onChange={set("newManager")} placeholder="Search employee…" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
            </div>
          )}
          {form.type === "Location" && (
            <div>
              <label className="text-xs font-semibold text-slate-600">New Location *</label>
              <input value={form.newLocation} onChange={set("newLocation")} placeholder="e.g. Bangalore" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
            </div>
          )}
          {form.type === "Internal Mobility" && (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">New Role *</label>
                <input value={form.newRole} onChange={set("newRole")} placeholder="Role title" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">New Department *</label>
                <input value={form.newRoleDept} onChange={set("newRoleDept")} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">New Manager *</label>
                <input value={form.newRoleMgr} onChange={set("newRoleMgr")} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-600">Effective Date *</label>
            <input type="date" value={form.effectiveDate} onChange={set("effectiveDate")} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Reason *</label>
            <textarea value={form.reason} onChange={set("reason")} rows={3} className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={onClose} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Submit</button>
        </div>
      </div>
    </div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────

function TransferRow({ rec, showActions, onReview }: { rec: TransferRecord; showActions: boolean; onReview: () => void }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar initials={rec.initials} color={rec.color} />
          <div>
            <p className="font-medium text-slate-900">{rec.name}</p>
            <p className="text-xs text-slate-400">{rec.empId}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_BADGE[rec.transferType]}`}>{rec.transferType}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <span>{rec.fromDept}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="font-medium text-slate-900">{rec.toDept}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{rec.effectiveDate}</td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{rec.requestedBy}</td>
      {showActions && (
        <td className="whitespace-nowrap px-4 py-3">
          <span className={rec.daysPending > 14 ? "font-semibold text-amber-600" : "text-slate-600"}>{rec.daysPending}d</span>
        </td>
      )}
      <td className="px-4 py-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[rec.status]}`}>{rec.status}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button onClick={onReview} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
            {(rec.status === "Submitted" || rec.status === "Under Review") ? "Review" : <><Eye className="h-3 w-3" /> View</>}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransfersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedRec, setSelectedRec] = useState<TransferRecord | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);

  const filterFn = (rec: TransferRecord) => {
    if (search && !rec.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && rec.transferType !== typeFilter) return false;
    if (deptFilter && rec.fromDept !== deptFilter && rec.toDept !== deptFilter) return false;
    if (statusFilter && rec.status !== statusFilter) return false;
    return true;
  };

  const filteredPending = PENDING.filter(filterFn);
  const filteredHistory = HISTORY.filter(filterFn);

  const stats = [
    { label: "Pending Review",      value: PENDING.length },
    { label: "Approved This Month", value: 8 },
    { label: "Completed",           value: HISTORY.filter((h) => h.status === "Completed").length },
    { label: "Rejected",            value: HISTORY.filter((h) => h.status === "Rejected").length },
  ];

  const theadCols = (showActions: boolean) => (
    <thead>
      <tr className="border-b border-slate-100 bg-slate-50">
        {["Employee", "Transfer Type", "From → To", "Effective Date", "Requested By",
          ...(showActions ? ["Days Pending"] : []), "Status", "Actions"
        ].map((h) => (
          <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
        ))}
      </tr>
    </thead>
  );

  return (
    <div className="min-h-full bg-[#f5f8ff] px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
        <button onClick={() => navigate("/dashboard")} className="hover:text-slate-600">Dashboard</button>
        <ChevronRight className="h-3 w-3" />
        <span>Workforce</span>
        <ChevronRight className="h-3 w-3" />
        <span>Lifecycle</span>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-slate-600">Transfers</span>
      </nav>

      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Employee Transfers</h1>
        <button onClick={() => setShowNew(true)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">New Transfer Request</button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee…" className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none shadow-sm" />
        </div>
        {[
          { label: "Transfer Type", value: typeFilter, set: setTypeFilter, opts: ["Department", "Manager", "Location", "Internal Mobility"] },
          { label: "Department",    value: deptFilter, set: setDeptFilter, opts: ["Engineering", "Product", "Design", "HR", "Finance", "Sales", "Marketing"] },
          { label: "Status",        value: statusFilter, set: setStatusFilter, opts: ["Submitted", "Under Review", "Approved", "Completed", "Rejected"] },
        ].map((f) => (
          <div key={f.label} className="relative">
            <select value={f.value} onChange={(e) => f.set(e.target.value)} className="appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none shadow-sm">
              <option value="">{f.label}</option>
              {f.opts.map((o) => <option key={o}>{o}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        ))}
      </div>

      {/* Pending section */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button onClick={() => setPendingOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-3 hover:bg-slate-50">
          <span className="text-sm font-semibold text-slate-900">Pending — {filteredPending.length}</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${pendingOpen ? "rotate-180" : ""}`} />
        </button>
        {pendingOpen && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {theadCols(true)}
              <tbody className="divide-y divide-slate-50">
                {filteredPending.length === 0
                  ? <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">No pending transfers</td></tr>
                  : filteredPending.map((rec) => <TransferRow key={rec.id} rec={rec} showActions onReview={() => setSelectedRec(rec)} />)
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History section */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button onClick={() => setHistoryOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-3 hover:bg-slate-50">
          <span className="text-sm font-semibold text-slate-900">Transfer History — {filteredHistory.length}</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
        </button>
        {historyOpen && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {theadCols(false)}
              <tbody className="divide-y divide-slate-50">
                {filteredHistory.map((rec) => <TransferRow key={rec.id} rec={rec} showActions={false} onReview={() => setSelectedRec(rec)} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRec && <ReviewModal rec={selectedRec} onClose={() => setSelectedRec(null)} />}
      {showNew && <NewTransferModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
