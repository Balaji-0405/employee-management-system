import React, { useState } from "react";
import { Pencil, X, Plus, Check, Building2, Users } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SubDept {
  id: string;
  name: string;
  headcount: number;
  openPositions: number;
}

interface OrgDept {
  id: string;
  name: string;
  head: string;
  headcount: number;
  openPositions: number;
  avgTenure: string;
  budgetUsed: number;
  subDepts: SubDept[];
  topMembers: { name: string; designation: string }[];
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const ORG_DEPTS: OrgDept[] = [
  {
    id: "engineering", name: "Engineering", head: "Priya Sharma", headcount: 340,
    openPositions: 14, avgTenure: "3.4 yrs", budgetUsed: 94,
    subDepts: [
      { id: "frontend", name: "Frontend", headcount: 89, openPositions: 3 },
      { id: "backend", name: "Backend", headcount: 120, openPositions: 5 },
      { id: "devops", name: "DevOps", headcount: 45, openPositions: 2 },
      { id: "qa", name: "QA", headcount: 86, openPositions: 4 },
    ],
    topMembers: [
      { name: "Arun Kumar", designation: "Frontend Lead" },
      { name: "Karan Mehta", designation: "Backend Lead" },
      { name: "Vikram Singh", designation: "DevOps Lead" },
    ],
  },
  {
    id: "product", name: "Product", head: "Rahul Verma", headcount: 89,
    openPositions: 4, avgTenure: "2.8 yrs", budgetUsed: 88, subDepts: [],
    topMembers: [
      { name: "Priya Sharma", designation: "VP Product" },
      { name: "Ankit Jain", designation: "Senior PM" },
      { name: "Neha Gupta", designation: "Product Analyst" },
    ],
  },
  {
    id: "hr", name: "HR", head: "Sneha Reddy", headcount: 28,
    openPositions: 1, avgTenure: "4.1 yrs", budgetUsed: 72, subDepts: [],
    topMembers: [
      { name: "Sneha Reddy", designation: "HR Manager" },
      { name: "Pooja Singh", designation: "HR Executive" },
      { name: "Ravi Kumar", designation: "Recruiter" },
    ],
  },
  {
    id: "sales", name: "Sales", head: "Anita Joshi", headcount: 180,
    openPositions: 12, avgTenure: "2.3 yrs", budgetUsed: 91, subDepts: [],
    topMembers: [
      { name: "Mohan Patel", designation: "VP Sales" },
      { name: "Anita Joshi", designation: "Sales Director" },
      { name: "Rajan Mehta", designation: "Account Executive" },
    ],
  },
  {
    id: "finance", name: "Finance", head: "Anjali Mehta", headcount: 67,
    openPositions: 3, avgTenure: "5.2 yrs", budgetUsed: 83, subDepts: [],
    topMembers: [
      { name: "Anjali Mehta", designation: "CFO" },
      { name: "Suresh Iyer", designation: "Finance Manager" },
      { name: "Kavita Rao", designation: "Senior Accountant" },
    ],
  },
  {
    id: "design", name: "Design", head: "Rahul Verma", headcount: 45,
    openPositions: 2, avgTenure: "3.0 yrs", budgetUsed: 79, subDepts: [],
    topMembers: [
      { name: "Rahul Verma", designation: "Head of Design" },
      { name: "Nisha Kapoor", designation: "UX Lead" },
      { name: "Arjun Das", designation: "Visual Designer" },
    ],
  },
  {
    id: "marketing", name: "Marketing", head: "Anita Joshi", headcount: 52,
    openPositions: 3, avgTenure: "2.6 yrs", budgetUsed: 86, subDepts: [],
    topMembers: [
      { name: "Anita Joshi", designation: "Head of Marketing" },
      { name: "Shreya Nair", designation: "Content Lead" },
      { name: "Vishal Sharma", designation: "Growth Manager" },
    ],
  },
  {
    id: "operations", name: "Operations", head: "Rajesh Bose", headcount: 78,
    openPositions: 5, avgTenure: "4.5 yrs", budgetUsed: 77, subDepts: [],
    topMembers: [
      { name: "Rajesh Bose", designation: "COO" },
      { name: "Meena Pillai", designation: "Ops Manager" },
      { name: "Dinesh Kumar", designation: "Vendor Manager" },
    ],
  },
  {
    id: "it", name: "IT", head: "Suresh Nair", headcount: 36,
    openPositions: 2, avgTenure: "3.8 yrs", budgetUsed: 68, subDepts: [],
    topMembers: [
      { name: "Suresh Nair", designation: "IT Manager" },
      { name: "Pradeep Pillai", designation: "Network Engineer" },
      { name: "Sandhya Rao", designation: "IT Support Lead" },
    ],
  },
  {
    id: "analytics", name: "Analytics", head: "Mohan Kumar", headcount: 33,
    openPositions: 2, avgTenure: "2.9 yrs", budgetUsed: 81, subDepts: [],
    topMembers: [
      { name: "Mohan Kumar", designation: "Analytics Lead" },
      { name: "Ritika Sharma", designation: "Data Scientist" },
      { name: "Ajay Nair", designation: "BI Analyst" },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const DEPT_ACCENT: Record<string, string> = {
  engineering: "border-blue-500",
  product: "border-purple-500",
  hr: "border-orange-500",
  sales: "border-green-500",
  finance: "border-teal-500",
  design: "border-pink-500",
  marketing: "border-rose-400",
  operations: "border-slate-400",
  it: "border-slate-400",
  analytics: "border-slate-400",
  frontend: "border-blue-400",
  backend: "border-indigo-500",
  devops: "border-violet-500",
  qa: "border-cyan-500",
};

const AVATAR_GRADIENTS = [
  "from-blue-400 to-indigo-500", "from-emerald-400 to-teal-500",
  "from-orange-400 to-amber-500", "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500", "from-cyan-400 to-sky-500",
];

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

function avatarGradient(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

function accentDot(id: string): string {
  const map: Record<string, string> = {
    engineering: "bg-blue-500", product: "bg-purple-500", hr: "bg-orange-500",
    sales: "bg-green-500", finance: "bg-teal-500", design: "bg-pink-500",
    marketing: "bg-rose-400", operations: "bg-slate-400", it: "bg-teal-500",
    analytics: "bg-purple-500",
  };
  return map[id] ?? "bg-slate-400";
}

// ── Add Department Modal ───────────────────────────────────────────────────────

function AddDepartmentModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!name.trim()) { setError("Required"); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">Add Sub-Department</p>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Sub-department Name<span className="ml-0.5 text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="e.g. Mobile"
              className={`h-9 w-full rounded-lg border px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 ${error ? "border-red-400" : "border-slate-200 focus:border-blue-400"}`} />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Head of Sub-department</label>
            <input type="text" placeholder="Search employee..."
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Check className="h-4 w-4" /> Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail Panel ───────────────────────────────────────────────────────────────

function DetailPanel({
  dept, onClose, onViewInDirectory, onAddSubDept,
}: {
  dept: OrgDept; onClose: () => void;
  onViewInDirectory: () => void; onAddSubDept: () => void;
}) {
  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col rounded-xl border border-slate-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarGradient(dept.name)} text-sm font-bold text-white`}>
            {dept.name[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{dept.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{dept.head}</p>
          </div>
        </div>
        <button onClick={onClose} className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Headcount", value: dept.headcount.toString() },
            { label: "Open Positions", value: dept.openPositions.toString() },
            { label: "Avg Tenure", value: dept.avgTenure },
            { label: "Budget Used", value: `${dept.budgetUsed}%` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-0.5 text-base font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Sub-departments */}
        {dept.subDepts.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold text-slate-700">Sub-departments</p>
            <div className="space-y-1.5">
              {dept.subDepts.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-xs font-semibold text-slate-800">{sub.name}</span>
                  <span className="text-xs text-slate-500">{sub.headcount} members</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top members */}
        <div>
          <p className="mb-2 text-xs font-bold text-slate-700">Top Members</p>
          <div className="space-y-2">
            {dept.topMembers.map((m) => (
              <div key={m.name} className="flex items-center gap-2.5">
                <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarGradient(m.name)} text-[10px] font-bold text-white`}>
                  {getInitials(m.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">{m.name}</p>
                  <p className="truncate text-[10px] text-slate-500">{m.designation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="border-t border-slate-100 p-3 space-y-2">
        <button onClick={onViewInDirectory}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          View in Directory
        </button>
        <button onClick={onAddSubDept}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
          <Plus className="h-3.5 w-3.5" /> Add Sub-Department
        </button>
      </div>
    </div>
  );
}

// ── Org Node Card ──────────────────────────────────────────────────────────────

function OrgNodeCard({
  id, name, head, headcount, openPositions, selected, editMode,
  onClick,
}: {
  id: string; name: string; head: string; headcount: number;
  openPositions: number; selected: boolean; editMode: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative min-w-[150px] cursor-pointer rounded-lg border-l-4 bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${DEPT_ACCENT[id] ?? "border-slate-400"} ${selected ? "ring-2 ring-blue-400" : ""}`}
    >
      {editMode && (
        <span className="absolute right-1.5 top-1.5 cursor-grab text-slate-300 select-none" title="Drag to reorder">⠿</span>
      )}
      <p className="text-[13px] font-semibold leading-tight text-slate-900 truncate pr-4">{name}</p>
      <p className="mt-0.5 text-[11px] text-slate-500 truncate">{head}</p>
      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{headcount}</span>
        {openPositions > 0 && (
          <span className="text-[11px] font-semibold text-orange-500">+{openPositions} open</span>
        )}
      </div>
    </div>
  );
}

function SubNodeCard({
  id, name, headcount, openPositions, selected, editMode,
  onClick,
}: {
  id: string; name: string; headcount: number;
  openPositions: number; selected: boolean; editMode: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative min-w-[130px] cursor-pointer rounded-lg border-l-4 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md ${DEPT_ACCENT[id] ?? "border-slate-400"} ${selected ? "ring-2 ring-blue-400" : ""}`}
    >
      {editMode && (
        <span className="absolute right-1.5 top-1.5 cursor-grab text-slate-300 select-none">⠿</span>
      )}
      <p className="text-[12px] font-semibold leading-tight text-slate-900 truncate pr-4">{name}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{headcount}</span>
        {openPositions > 0 && (
          <span className="text-[10px] font-semibold text-orange-500">+{openPositions}</span>
        )}
      </div>
    </div>
  );
}

// ── Tree View ──────────────────────────────────────────────────────────────────

function TreeView({
  selectedId, onSelect, editMode,
}: {
  selectedId: string | null; onSelect: (id: string) => void; editMode: boolean;
}) {
  return (
    <div className="overflow-x-auto pb-6">
      <div className="min-w-max flex flex-col items-center pt-6">
        {/* Company root */}
        <div className="rounded-xl border-2 border-slate-300 bg-white px-8 py-4 shadow-md">
          <div className="flex items-center gap-3">
            <Building2 className="h-7 w-7 text-slate-500" />
            <div>
              <p className="text-sm font-bold text-slate-900">TechCorp</p>
              <p className="text-xs text-slate-500">1,248 employees</p>
            </div>
          </div>
        </div>

        {/* Stem from company */}
        <div className="w-px bg-slate-200" style={{ height: 28 }} />

        {/* Department row */}
        <div className="flex items-start">
          {ORG_DEPTS.map((dept, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === ORG_DEPTS.length - 1;
            const isOnly = ORG_DEPTS.length === 1;

            return (
              <div key={dept.id} className="relative flex flex-col items-center px-3">
                {/* Horizontal connector segment at top */}
                {!isOnly && (
                  <div
                    className="absolute top-0 bg-slate-200"
                    style={{
                      height: 1,
                      left: isFirst ? "50%" : 0,
                      right: isLast ? "50%" : 0,
                    }}
                  />
                )}

                {/* Vertical stem down to node */}
                <div className="w-px bg-slate-200" style={{ height: 28 }} />

                <OrgNodeCard
                  id={dept.id} name={dept.name} head={dept.head}
                  headcount={dept.headcount} openPositions={dept.openPositions}
                  selected={selectedId === dept.id} editMode={editMode}
                  onClick={() => onSelect(dept.id)}
                />

                {/* Sub-departments for Engineering */}
                {dept.subDepts.length > 0 && (
                  <>
                    <div className="w-px bg-slate-200" style={{ height: 24 }} />
                    <div className="flex items-start">
                      {dept.subDepts.map((sub, sIdx) => {
                        const sFirst = sIdx === 0;
                        const sLast = sIdx === dept.subDepts.length - 1;
                        const sOnly = dept.subDepts.length === 1;
                        return (
                          <div key={sub.id} className="relative flex flex-col items-center px-2">
                            {!sOnly && (
                              <div
                                className="absolute top-0 bg-slate-200"
                                style={{
                                  height: 1,
                                  left: sFirst ? "50%" : 0,
                                  right: sLast ? "50%" : 0,
                                }}
                              />
                            )}
                            <div className="w-px bg-slate-200" style={{ height: 24 }} />
                            <SubNodeCard
                              id={sub.id} name={sub.name}
                              headcount={sub.headcount} openPositions={sub.openPositions}
                              selected={selectedId === sub.id} editMode={editMode}
                              onClick={() => onSelect(sub.id)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Table View ─────────────────────────────────────────────────────────────────

function TableView({ editMode }: { editMode: boolean }) {
  const rows: { id: string; name: string; parent: string; head: string; headcount: number; openPositions: number; level: number }[] = [];

  ORG_DEPTS.forEach((d) => {
    rows.push({ id: d.id, name: d.name, parent: "—", head: d.head, headcount: d.headcount, openPositions: d.openPositions, level: 0 });
    d.subDepts.forEach((s) => {
      rows.push({ id: s.id, name: s.name, parent: d.name, head: "—", headcount: s.headcount, openPositions: s.openPositions, level: 1 });
    });
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
            {["Department", "Parent Dept", "Head", "Headcount", "Open Positions", "Actions"].map((h) => (
              <th key={h} className="px-5 py-3 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              <td className="px-5 py-3">
                <div className="flex items-center gap-2" style={{ paddingLeft: row.level * 20 }}>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${accentDot(row.id)}`} />
                  <span className={`font-semibold text-slate-800 ${row.level > 0 ? "text-slate-600" : ""}`}>{row.name}</span>
                </div>
              </td>
              <td className="px-5 py-3 text-slate-600">{row.parent}</td>
              <td className="px-5 py-3 text-slate-700">{row.head}</td>
              <td className="px-5 py-3 font-semibold text-slate-900">{row.headcount}</td>
              <td className="px-5 py-3">
                {row.openPositions > 0 ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{row.openPositions}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <button className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {editMode && row.level === 0 && (
                    <button className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50" title="Add Child">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function OrgStructure() {
  const [viewMode, setViewMode] = useState<"tree" | "table">("tree");
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddSubDept, setShowAddSubDept] = useState(false);
  const [toast, setToast] = useState(false);

  const selectedDept = ORG_DEPTS.find((d) => d.id === selectedId) ?? null;

  function handleSave() {
    setEditMode(false);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex min-h-full flex-col bg-slate-50 px-6 py-5">
      {/* Breadcrumb */}
      <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
        <span className="cursor-pointer hover:text-blue-600">Dashboard</span>
        <span>›</span>
        <span className="cursor-pointer hover:text-blue-600">Departments</span>
        <span>›</span>
        <span className="font-semibold text-slate-700">Organizational Structure</span>
      </nav>

      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Organizational Structure</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
            {(["tree", "table"] as const).map((v) => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${viewMode === v ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                {v === "tree" ? "Tree" : "Table"}
              </button>
            ))}
          </div>

          {!editMode ? (
            <button onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Pencil className="h-3.5 w-3.5" /> Edit Structure
            </button>
          ) : (
            <>
              <button onClick={handleSave}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                <Check className="h-3.5 w-3.5" /> Save Changes
              </button>
              <button onClick={() => setEditMode(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit mode banner */}
      {editMode && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-xs font-semibold text-amber-800">Edit mode active — changes will affect employee records</span>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-lg">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-sm font-semibold text-green-800">Structure saved successfully</span>
        </div>
      )}

      {/* Content */}
      <div className="flex gap-5 flex-1">
        <div className="flex-1 min-w-0">
          {viewMode === "tree" ? (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-bold text-slate-800">Company Hierarchy</p>
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  10 departments · 4 sub-departments
                </span>
              </div>
              <div className="p-4">
                <TreeView selectedId={selectedId} onSelect={handleSelect} editMode={editMode} />
              </div>
            </div>
          ) : (
            <TableView editMode={editMode} />
          )}
        </div>

        {/* Detail panel */}
        {selectedDept && (
          <DetailPanel
            dept={selectedDept}
            onClose={() => setSelectedId(null)}
            onViewInDirectory={() => window.location.href = "/departments/directory"}
            onAddSubDept={() => setShowAddSubDept(true)}
          />
        )}
      </div>

      {showAddSubDept && <AddDepartmentModal onClose={() => setShowAddSubDept(false)} />}
    </div>
  );
}
