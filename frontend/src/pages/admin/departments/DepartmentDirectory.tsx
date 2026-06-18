import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ChevronDown, ChevronRight, Plus, Search, Users, Briefcase,
  Clock, TrendingDown, Pencil, X, Mail, MapPin, Check,
  ArrowUpDown, UserPlus, Activity, AlertCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

type WorkMode = "Remote" | "Hybrid" | "Office";
type ActiveStatus = "Active" | "On Leave" | "On Probation" | "Inactive";
type OnlineStatus = "Online" | "Away" | "Offline";
type EmploymentType = "Full Time" | "Contract" | "Intern" | "Part Time";

interface DeptNode {
  id: string;
  name: string;
  headcount: number;
  dotColor: string;
  openPositions: number;
  headName: string;
  headEmail: string;
  headDesignation: string;
  description: string;
  locations: string[];
  costCenter: string;
  parentId: string | null;
  children?: DeptNode[];
}

interface DeptMember {
  id: string;
  name: string;
  designation: string;
  workMode: WorkMode;
  activeStatus: ActiveStatus;
  email: string;
  phone: string;
  onlineStatus: OnlineStatus;
  employmentType: EmploymentType;
  joinDate: string;
  location: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const DEPT_TREE: DeptNode[] = [
  {
    id: "engineering", name: "Engineering", headcount: 340, dotColor: "bg-blue-500",
    openPositions: 14, headName: "Rajesh Kumar", headEmail: "rajesh.kumar@company.com",
    headDesignation: "VP Engineering",
    description: "Responsible for building and maintaining all software products, infrastructure, and technical systems across the organization.",
    locations: ["Bangalore", "Mumbai", "Remote"], costCenter: "ENGR-001", parentId: null,
    children: [
      { id: "frontend", name: "Frontend", headcount: 89, dotColor: "bg-blue-400", openPositions: 3, headName: "Arun Kumar", headEmail: "arun.kumar@company.com", headDesignation: "Frontend Lead", description: "Builds user-facing web interfaces.", locations: ["Bangalore", "Remote"], costCenter: "ENGR-FE", parentId: "engineering" },
      { id: "backend", name: "Backend", headcount: 120, dotColor: "bg-indigo-500", openPositions: 5, headName: "Karan Mehta", headEmail: "karan.mehta@company.com", headDesignation: "Backend Lead", description: "Designs and maintains APIs and data systems.", locations: ["Bangalore", "Mumbai"], costCenter: "ENGR-BE", parentId: "engineering" },
      { id: "devops", name: "DevOps", headcount: 45, dotColor: "bg-violet-500", openPositions: 2, headName: "Vikram Singh", headEmail: "vikram.singh@company.com", headDesignation: "DevOps Lead", description: "Manages infrastructure, CI/CD, and cloud operations.", locations: ["Pune", "Remote"], costCenter: "ENGR-DO", parentId: "engineering" },
      { id: "qa", name: "QA", headcount: 86, dotColor: "bg-cyan-500", openPositions: 4, headName: "Priya Nair", headEmail: "priya.nair@company.com", headDesignation: "QA Lead", description: "Ensures quality across all product releases.", locations: ["Bangalore", "Hyderabad"], costCenter: "ENGR-QA", parentId: "engineering" },
    ],
  },
  { id: "product", name: "Product", headcount: 89, dotColor: "bg-emerald-500", openPositions: 4, headName: "Priya Sharma", headEmail: "priya.sharma@company.com", headDesignation: "VP Product", description: "Owns product vision, roadmap, and delivery across all product lines.", locations: ["Bangalore"], costCenter: "PROD-001", parentId: null },
  { id: "design", name: "Design", headcount: 45, dotColor: "bg-pink-500", openPositions: 2, headName: "Rahul Verma", headEmail: "rahul.verma@company.com", headDesignation: "Head of Design", description: "Creates intuitive experiences for customers and internal tools.", locations: ["Mumbai", "Remote"], costCenter: "DSGN-001", parentId: null },
  { id: "hr", name: "HR", headcount: 28, dotColor: "bg-orange-500", openPositions: 1, headName: "Sneha Reddy", headEmail: "sneha.reddy@company.com", headDesignation: "HR Manager", description: "Manages recruitment, employee relations, and people operations.", locations: ["Hyderabad"], costCenter: "HR-001", parentId: null },
  { id: "sales", name: "Sales", headcount: 180, dotColor: "bg-green-600", openPositions: 12, headName: "Mohan Patel", headEmail: "mohan.patel@company.com", headDesignation: "VP Sales", description: "Drives revenue through enterprise and mid-market sales motions.", locations: ["Delhi", "Mumbai", "Bangalore"], costCenter: "SALE-001", parentId: null },
  { id: "finance", name: "Finance", headcount: 67, dotColor: "bg-amber-500", openPositions: 3, headName: "Anjali Mehta", headEmail: "anjali.mehta@company.com", headDesignation: "CFO", description: "Manages financial planning, reporting, and compliance.", locations: ["Chennai"], costCenter: "FIN-001", parentId: null },
  { id: "marketing", name: "Marketing", headcount: 52, dotColor: "bg-rose-500", openPositions: 3, headName: "Anita Joshi", headEmail: "anita.joshi@company.com", headDesignation: "Head of Marketing", description: "Owns brand, demand generation, and customer communications.", locations: ["Bangalore", "Remote"], costCenter: "MKT-001", parentId: null },
  { id: "operations", name: "Operations", headcount: 78, dotColor: "bg-slate-500", openPositions: 5, headName: "Rajesh Bose", headEmail: "rajesh.bose@company.com", headDesignation: "COO", description: "Oversees day-to-day company operations and vendor management.", locations: ["Kolkata", "Bangalore"], costCenter: "OPS-001", parentId: null },
  { id: "it", name: "IT", headcount: 36, dotColor: "bg-teal-500", openPositions: 2, headName: "Suresh Nair", headEmail: "suresh.nair@company.com", headDesignation: "IT Manager", description: "Manages internal systems, networking, and end-user support.", locations: ["Kochi"], costCenter: "IT-001", parentId: null },
  { id: "analytics", name: "Analytics", headcount: 33, dotColor: "bg-purple-500", openPositions: 2, headName: "Mohan Kumar", headEmail: "mohan.kumar@company.com", headDesignation: "Analytics Lead", description: "Extracts insights from data to drive business decisions.", locations: ["Hyderabad", "Remote"], costCenter: "ANLYT-001", parentId: null },
];

const ENG_MEMBERS: DeptMember[] = [
  { id: "EMP001", name: "Arun Kumar", designation: "Senior Frontend Engineer", workMode: "Remote", activeStatus: "Active", email: "arun.kumar@company.com", phone: "+91 98765 43210", onlineStatus: "Online", employmentType: "Full Time", joinDate: "15 Jan 2022", location: "Bangalore" },
  { id: "EMP005", name: "Vikram Singh", designation: "DevOps Lead", workMode: "Remote", activeStatus: "Active", email: "vikram.singh@company.com", phone: "+91 98765 43214", onlineStatus: "Online", employmentType: "Full Time", joinDate: "15 Aug 2021", location: "Pune" },
  { id: "EMP009", name: "Karan Mehta", designation: "Backend Engineer", workMode: "Remote", activeStatus: "Active", email: "karan.mehta@company.com", phone: "+91 98765 43218", onlineStatus: "Online", employmentType: "Full Time", joinDate: "05 Sep 2022", location: "Bangalore" },
  { id: "EMP014", name: "Divya Nair", designation: "Frontend Developer", workMode: "Hybrid", activeStatus: "On Probation", email: "divya.nair@company.com", phone: "+91 98765 43223", onlineStatus: "Online", employmentType: "Full Time", joinDate: "01 Mar 2026", location: "Bangalore" },
  { id: "EMP006", name: "Neha Patel", designation: "QA Engineer", workMode: "Hybrid", activeStatus: "On Probation", email: "neha.patel@company.com", phone: "+91 98765 43215", onlineStatus: "Offline", employmentType: "Full Time", joinDate: "01 Apr 2026", location: "Bangalore" },
  { id: "EMP017", name: "Arjun Nair", designation: "Senior Backend Engineer", workMode: "Remote", activeStatus: "Active", email: "arjun.nair@company.com", phone: "+91 98765 43230", onlineStatus: "Online", employmentType: "Full Time", joinDate: "10 Jun 2020", location: "Mumbai" },
  { id: "EMP018", name: "Kavya Reddy", designation: "UI Engineer", workMode: "Office", activeStatus: "Active", email: "kavya.reddy@company.com", phone: "+91 98765 43231", onlineStatus: "Away", employmentType: "Full Time", joinDate: "22 Mar 2023", location: "Hyderabad" },
  { id: "EMP019", name: "Siddharth Rajan", designation: "Infrastructure Engineer", workMode: "Remote", activeStatus: "Active", email: "siddharth.rajan@company.com", phone: "+91 98765 43232", onlineStatus: "Online", employmentType: "Contract", joinDate: "01 Nov 2024", location: "Bangalore" },
  { id: "EMP020", name: "Meena Krishnan", designation: "QA Analyst", workMode: "Office", activeStatus: "Active", email: "meena.krishnan@company.com", phone: "+91 98765 43233", onlineStatus: "Away", employmentType: "Full Time", joinDate: "14 Jul 2021", location: "Chennai" },
  { id: "EMP021", name: "Prakash Iyer", designation: "Full Stack Developer", workMode: "Hybrid", activeStatus: "On Leave", email: "prakash.iyer@company.com", phone: "+91 98765 43234", onlineStatus: "Offline", employmentType: "Full Time", joinDate: "03 Feb 2023", location: "Bangalore" },
  { id: "EMP022", name: "Lakshmi Menon", designation: "Tech Lead", workMode: "Hybrid", activeStatus: "Active", email: "lakshmi.menon@company.com", phone: "+91 98765 43235", onlineStatus: "Online", employmentType: "Full Time", joinDate: "25 Sep 2019", location: "Kochi" },
  { id: "EMP023", name: "Rohit Desai", designation: "Backend Developer", workMode: "Remote", activeStatus: "Active", email: "rohit.desai@company.com", phone: "+91 98765 43236", onlineStatus: "Online", employmentType: "Intern", joinDate: "15 Jan 2026", location: "Pune" },
  { id: "EMP024", name: "Shreya Kapoor", designation: "Frontend Developer", workMode: "Remote", activeStatus: "Active", email: "shreya.kapoor@company.com", phone: "+91 98765 43237", onlineStatus: "Away", employmentType: "Full Time", joinDate: "08 May 2022", location: "Delhi" },
  { id: "EMP025", name: "Nitin Sharma", designation: "Platform Engineer", workMode: "Office", activeStatus: "Active", email: "nitin.sharma@company.com", phone: "+91 98765 43238", onlineStatus: "Online", employmentType: "Full Time", joinDate: "20 Oct 2021", location: "Bangalore" },
  { id: "EMP026", name: "Pooja Tiwari", designation: "QA Engineer", workMode: "Hybrid", activeStatus: "Active", email: "pooja.tiwari@company.com", phone: "+91 98765 43239", onlineStatus: "Online", employmentType: "Contract", joinDate: "11 Dec 2023", location: "Mumbai" },
];

const HEADCOUNT_TREND = [
  { month: "Jan", count: 315 }, { month: "Feb", count: 318 }, { month: "Mar", count: 322 },
  { month: "Apr", count: 328 }, { month: "May", count: 335 }, { month: "Jun", count: 340 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  "from-blue-400 to-indigo-500", "from-emerald-400 to-teal-500",
  "from-orange-400 to-amber-500", "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500", "from-cyan-400 to-sky-500",
  "from-lime-400 to-green-500", "from-fuchsia-400 to-pink-500",
];

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

function avatarGradient(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

function flattenTree(nodes: DeptNode[]): DeptNode[] {
  return nodes.flatMap((n) => [n, ...(n.children ? flattenTree(n.children) : [])]);
}

const ALL_DEPTS = flattenTree(DEPT_TREE);

function findDept(id: string): DeptNode | undefined {
  return ALL_DEPTS.find((d) => d.id === id);
}

// ── Badges ─────────────────────────────────────────────────────────────────────

function WorkModeBadge({ mode }: { mode: WorkMode }) {
  const styles: Record<WorkMode, string> = {
    Remote: "bg-emerald-50 text-emerald-700",
    Hybrid: "bg-orange-50 text-orange-700",
    Office: "bg-slate-100 text-slate-600",
  };
  return <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${styles[mode]}`}>{mode}</span>;
}

function ActiveStatusBadge({ status }: { status: ActiveStatus }) {
  const styles: Record<ActiveStatus, string> = {
    Active: "bg-green-50 text-green-700",
    "On Leave": "bg-amber-50 text-amber-700",
    "On Probation": "bg-blue-50 text-blue-700",
    Inactive: "bg-slate-100 text-slate-500",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[status]}`}>{status}</span>;
}

function OnlineDot({ status }: { status: OnlineStatus }) {
  const colors: Record<OnlineStatus, string> = {
    Online: "bg-green-500", Away: "bg-amber-400", Offline: "bg-slate-300",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status]}`} />;
}

function MemberAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm" };
  return (
    <div className={`shrink-0 grid place-items-center rounded-full bg-gradient-to-br ${avatarGradient(name)} font-bold text-white ${sizes[size]}`}>
      {getInitials(name)}
    </div>
  );
}

// ── Filter Dropdown ────────────────────────────────────────────────────────────

function FilterDropdown({ value, options, onChange, className = "" }: {
  value: string; options: string[]; onChange: (v: string) => void; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none"
      >
        <span className="truncate">{value}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 ${value === opt ? "font-semibold text-blue-600" : "text-slate-700"}`}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Department Tree ────────────────────────────────────────────────────────────

function DeptTreeItem({ node, selectedId, expandedIds, onSelect, onToggle, depth = 0 }: {
  node: DeptNode; selectedId: string; expandedIds: Set<string>;
  onSelect: (id: string) => void; onToggle: (id: string) => void; depth?: number;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const expanded = expandedIds.has(node.id);
  const selected = selectedId === node.id;

  return (
    <div>
      <div
        className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${selected ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"}`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            className="grid h-4 w-4 shrink-0 place-items-center text-slate-400">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${node.dotColor}`} />
        <span className="flex-1 truncate text-sm font-medium">{node.name}</span>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
          {node.headcount}
        </span>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <DeptTreeItem key={child.id} node={child} selectedId={selectedId}
              expandedIds={expandedIds} onSelect={onSelect} onToggle={onToggle} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Department Info view ───────────────────────────────────────────────────────

function DeptInfoView({ dept }: { dept: DeptNode }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    headName: dept.headName, headEmail: dept.headEmail,
    headDesignation: dept.headDesignation, description: dept.description,
    locations: dept.locations.join(", "), costCenter: dept.costCenter,
  });

  useEffect(() => {
    setEditing(false);
    setForm({
      headName: dept.headName, headEmail: dept.headEmail,
      headDesignation: dept.headDesignation, description: dept.description,
      locations: dept.locations.join(", "), costCenter: dept.costCenter,
    });
  }, [dept.id]);

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Total Headcount", value: dept.headcount.toString(), bg: "bg-blue-500" },
          { icon: Briefcase, label: "Open Positions", value: dept.openPositions.toString(), bg: "bg-emerald-500" },
          { icon: Clock, label: "Avg Tenure", value: "3.2 yrs", bg: "bg-violet-500" },
          { icon: TrendingDown, label: "Attrition (12mo)", value: "8.4%", bg: "bg-rose-500" },
        ].map(({ icon: Icon, label, value, bg }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xl font-bold text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-5">
        {/* Dept info card */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <p className="text-sm font-bold text-slate-800">Department Info</p>
            {!editing && (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
          </div>
          {!editing ? (
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <MemberAvatar name={dept.headName} />
                <div>
                  <p className="text-sm font-bold text-slate-900">{dept.headName}</p>
                  <p className="text-xs text-slate-500">{dept.headDesignation}</p>
                  <a href={`mailto:${dept.headEmail}`} className="text-xs text-blue-600 hover:underline">{dept.headEmail}</a>
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Description</p>
                <p className="text-xs text-slate-700">{dept.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Location(s)</p>
                  <p className="text-xs text-slate-700">{dept.locations.join(", ")}</p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cost Center</p>
                  <p className="text-xs font-semibold text-slate-700">{dept.costCenter}</p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Parent Department</p>
                  <p className="text-xs text-slate-700">
                    {dept.parentId
                      ? (findDept(dept.parentId)?.name ?? "—")
                      : <span className="text-slate-400">None (Top-level)</span>}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-5">
              {(["headName", "headEmail", "headDesignation", "costCenter", "locations"] as const).map((field) => {
                const labels: Record<string, string> = {
                  headName: "Head of Dept", headEmail: "Head Email",
                  headDesignation: "Head Designation", costCenter: "Cost Center",
                  locations: "Locations (comma-separated)",
                };
                return (
                  <div key={field}>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">{labels[field]}</label>
                    <input type="text" value={form[field]}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-700 focus:border-blue-400 focus:outline-none" />
                  </div>
                );
              })}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
                <textarea rows={2} value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-blue-400 focus:outline-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(false)} className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700">Save Changes</button>
                <button onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Headcount trend */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-sm font-bold text-slate-800">Headcount Trend</p>
            <p className="text-xs text-slate-400">Last 6 months</p>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={HEADCOUNT_TREND} barSize={28} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Headcount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sub-departments */}
      {dept.children && dept.children.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-sm font-bold text-slate-800">Sub-departments</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                  {["Department", "Head", "Headcount", "Open Positions"].map((h) => (
                    <th key={h} className="px-5 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dept.children.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${sub.dotColor}`} />
                        <span className="font-semibold text-slate-800">{sub.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{sub.headName}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{sub.headcount}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        <Briefcase className="h-3 w-3" />{sub.openPositions}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Health */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-sm font-bold text-slate-800">Department Health</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {[
            { label: "Attendance Rate", value: "91.2%", icon: Activity, color: "text-green-600", bg: "bg-green-50" },
            { label: "On Leave", value: "3.8%", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Pending Approvals", value: "7", icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-4">
              <div className={`grid h-9 w-9 place-items-center rounded-full ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Member Card & Popover ──────────────────────────────────────────────────────

function MemberCard({ member, onCardClick }: { member: DeptMember; onCardClick: (id: string) => void }) {
  return (
    <div onClick={() => onCardClick(member.id)}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
      <div className="mb-2 flex items-start justify-between">
        <div className="relative">
          <MemberAvatar name={member.name} />
          <span className="absolute -bottom-0.5 -right-0.5"><OnlineDot status={member.onlineStatus} /></span>
        </div>
        <WorkModeBadge mode={member.workMode} />
      </div>
      <p className="truncate text-xs font-bold text-slate-900">{member.name}</p>
      <p className="truncate text-[11px] text-slate-500">{member.designation}</p>
      <div className="mt-2"><ActiveStatusBadge status={member.activeStatus} /></div>
    </div>
  );
}

function MemberPopover({ member, onClose }: { member: DeptMember; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute z-50 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
      style={{ top: 0, left: "calc(100% + 8px)" }}>
      <button onClick={onClose} className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100">
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-3">
        <MemberAvatar name={member.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{member.name}</p>
          <p className="truncate text-xs text-slate-500">{member.designation}</p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Mail className="h-3.5 w-3.5 text-slate-400" /><span className="truncate">{member.email}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <MapPin className="h-3.5 w-3.5 text-slate-400" /><span>{member.location}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Clock className="h-3.5 w-3.5 text-slate-400" /><span>Joined {member.joinDate}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <WorkModeBadge mode={member.workMode} />
        <ActiveStatusBadge status={member.activeStatus} />
      </div>
    </div>
  );
}

// ── Members view ───────────────────────────────────────────────────────────────

function MembersView({ members, onAddMember }: { members: DeptMember[]; onAddMember: () => void }) {
  const [search, setSearch] = useState("");
  const [workFilter, setWorkFilter] = useState("All Modes");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortBy, setSortBy] = useState("Name A-Z");
  const [sortOpen, setSortOpen] = useState(false);
  const [popoverId, setPopoverId] = useState<string | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members
      .filter((m) => {
        const matchSearch = !q || m.name.toLowerCase().includes(q) || m.designation.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
        const matchWork = workFilter === "All Modes" || m.workMode === workFilter;
        const matchStatus = statusFilter === "All Status" || m.activeStatus === statusFilter;
        return matchSearch && matchWork && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === "Name A-Z") return a.name.localeCompare(b.name);
        if (sortBy === "Name Z-A") return b.name.localeCompare(a.name);
        if (sortBy === "Join Date") return a.joinDate.localeCompare(b.joinDate);
        return 0;
      });
  }, [members, search, workFilter, statusFilter, sortBy]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
        <FilterDropdown value={workFilter} options={["All Modes", "Remote", "Hybrid", "Office"]} onChange={setWorkFilter} className="min-w-[120px]" />
        <FilterDropdown value={statusFilter} options={["All Status", "Active", "On Leave", "On Probation", "Inactive"]} onChange={setStatusFilter} className="min-w-[130px]" />
        <div className="relative" ref={sortRef}>
          <button onClick={() => setSortOpen((o) => !o)}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
            <ArrowUpDown className="h-3 w-3 text-slate-400" />{sortBy}
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {["Name A-Z", "Name Z-A", "Join Date"].map((opt) => (
                <button key={opt} onClick={() => { setSortBy(opt); setSortOpen(false); }}
                  className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 ${sortBy === opt ? "font-semibold text-blue-600" : "text-slate-700"}`}>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onAddMember}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700">
          <UserPlus className="h-3.5 w-3.5" /> Add Member
        </button>
      </div>
      <p className="text-xs text-slate-500">{filtered.length} members</p>
      <div className="grid grid-cols-5 gap-3">
        {filtered.map((member) => (
          <div key={member.id} className="relative">
            <MemberCard member={member} onCardClick={(id) => setPopoverId((prev) => (prev === id ? null : id))} />
            {popoverId === member.id && <MemberPopover member={member} onClose={() => setPopoverId(null)} />}
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
          <p className="text-sm text-slate-400">No members match your filters.</p>
        </div>
      )}
    </div>
  );
}

// ── Modals ─────────────────────────────────────────────────────────────────────

function AddDepartmentModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", parentId: "", head: "", description: "", costCenter: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  }

  function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onClose();
  }

  const inputCls = (field: string) =>
    `h-9 w-full rounded-lg border px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors[field] ? "border-red-400" : "border-slate-200 focus:border-blue-400"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">Add Department</p>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Department Name<span className="ml-0.5 text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Data Science" className={inputCls("name")} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Parent Department</label>
            <select value={form.parentId} onChange={(e) => setField("parentId", e.target.value)} className={inputCls("parentId")}>
              <option value="">None (Top-level)</option>
              {DEPT_TREE.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Head of Department</label>
            <input type="text" value={form.head} onChange={(e) => setField("head", e.target.value)} placeholder="Search employee..." className={inputCls("head")} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setField("description", e.target.value)}
              placeholder="Brief description..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Cost Center</label>
            <input type="text" value={form.costCenter} onChange={(e) => setField("costCenter", e.target.value)} placeholder="e.g. DEPT-001" className={inputCls("costCenter")} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Check className="h-4 w-4" /> Create Department
          </button>
        </div>
      </div>
    </div>
  );
}

const ALL_EMPLOYEES = [
  "Arun Kumar", "Priya Sharma", "Rahul Verma", "Sneha Reddy", "Vikram Singh",
  "Neha Patel", "Rohit Gupta", "Anjali Mehta", "Karan Mehta", "Anita Joshi",
  "Suresh Nair", "Mohan Kumar", "Divya Nair", "Rajesh Bose",
];

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.toLowerCase();
    return q ? ALL_EMPLOYEES.filter((n) => n.toLowerCase().includes(q)) : ALL_EMPLOYEES.slice(0, 8);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">Add Member</p>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus placeholder="Search employees..."
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200">
            {results.map((name) => (
              <button key={name} onClick={() => setSelected((prev) => (prev === name ? null : name))}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-slate-50 ${selected === name ? "bg-blue-50" : ""}`}>
                <MemberAvatar name={name} size="sm" />
                <span className={`font-medium ${selected === name ? "text-blue-700" : "text-slate-800"}`}>{name}</span>
                {selected === name && <Check className="ml-auto h-4 w-4 text-blue-600" />}
              </button>
            ))}
            {results.length === 0 && <p className="px-3 py-4 text-center text-xs text-slate-400">No employees found.</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button disabled={!selected} onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            <UserPlus className="h-4 w-4" /> Assign Member
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DepartmentDirectory() {
  const [selectedDeptId, setSelectedDeptId] = useState("engineering");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["engineering"]));
  const [view, setView] = useState<"info" | "members">("info");
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  const selectedDept = findDept(selectedDeptId) ?? DEPT_TREE[0];

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSelectDept(id: string) {
    setSelectedDeptId(id);
    const dept = findDept(id);
    if (dept?.children?.length) {
      setExpandedIds((prev) => new Set([...prev, id]));
    }
  }

  return (
    <div className="flex min-h-full bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Departments</p>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search..."
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {DEPT_TREE.map((node) => (
            <DeptTreeItem key={node.id} node={node} selectedId={selectedDeptId}
              expandedIds={expandedIds} onSelect={handleSelectDept} onToggle={toggleExpand} />
          ))}
        </div>
        <div className="border-t border-slate-100 p-3">
          <button onClick={() => setShowAddDept(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600">
            <Plus className="h-3.5 w-3.5" /> Add Department
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-6 py-5">
        {/* Breadcrumb */}
        <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
          <span className="cursor-pointer hover:text-blue-600">Dashboard</span>
          <span>›</span>
          <span className="cursor-pointer hover:text-blue-600">Departments</span>
          <span>›</span>
          <span className="font-semibold text-slate-700">Department Directory</span>
        </nav>

        {/* Page header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Department Directory</h1>
          <button onClick={() => setShowAddDept(true)}
            className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Department
          </button>
        </div>

        {/* Selected dept context + view toggle */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`h-3.5 w-3.5 rounded-full ${selectedDept.dotColor}`} />
            <span className="text-base font-bold text-slate-900">{selectedDept.name}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {selectedDept.headcount} members
            </span>
          </div>
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
            {(["info", "members"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${view === v ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                {v === "info" ? "Department Info" : "Members"}
              </button>
            ))}
          </div>
        </div>

        {view === "info" && <DeptInfoView dept={selectedDept} />}
        {view === "members" && <MembersView members={ENG_MEMBERS} onAddMember={() => setShowAddMember(true)} />}
      </main>

      {showAddDept && <AddDepartmentModal onClose={() => setShowAddDept(false)} />}
      {showAddMember && <AddMemberModal onClose={() => setShowAddMember(false)} />}
    </div>
  );
}
