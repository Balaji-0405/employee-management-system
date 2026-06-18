import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  Layers,
  List,
  Mail,
  MapPin,
  Minus,
  MoreHorizontal,
  Network,
  PenLine,
  Phone,
  Plus,
  Search,
  Share2,
  Users,
  X,
  Laptop,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "online" | "away" | "offline";
type ViewMode = "org" | "list" | "dept";

type OrgNode = {
  id: string;
  name: string;
  title: string;
  dept: string;
  deptColor: string;
  initials: string;
  avatarBg: string;
  status: Status;
  direct: number;
  total: number;
  isVacancy?: boolean;
  empId?: string;
  levelStr?: string;
  location?: string;
  workMode?: string;
  joinDate?: string;
};

type ReportAvatar = { initials: string; bg: string; name: string };

type PanelDetail = {
  reportingLine: { initials: string; bg: string; name: string; role: string; isCurrent?: boolean }[];
  directReportAvatars: ReportAvatar[];
  extraReports?: number;
  openPositionsInTeam?: number;
  orgDepth: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_W = 180;
const TREE_W = 1000;
const TREE_H = 650;

// ─── Data ─────────────────────────────────────────────────────────────────────

const NODES: OrgNode[] = [
  {
    id: "arun", name: "Arun Kumar", title: "CEO", dept: "Executive",
    deptColor: "text-teal-600", initials: "AK", avatarBg: "bg-teal-500",
    status: "online", direct: 4, total: 248,
    empId: "EMP00001", levelStr: "L1", location: "Mumbai, India", workMode: "Hybrid", joinDate: "10 Jan 2010",
  },
  {
    id: "priya", name: "Priya Sharma", title: "VP Engineering", dept: "Engineering",
    deptColor: "text-green-600", initials: "PS", avatarBg: "bg-emerald-500",
    status: "online", direct: 8, total: 89,
    empId: "EMP00123", levelStr: "L2", location: "Bengaluru, India", workMode: "Hybrid", joinDate: "15 Mar 2018",
  },
  {
    id: "rahul", name: "Rahul Verma", title: "VP Product", dept: "Product",
    deptColor: "text-purple-600", initials: "RV", avatarBg: "bg-purple-500",
    status: "away", direct: 6, total: 45,
    empId: "EMP00078", levelStr: "L2", location: "Bengaluru, India", workMode: "Remote", joinDate: "22 Jul 2019",
  },
  {
    id: "sneha", name: "Sneha Reddy", title: "VP HR", dept: "HR",
    deptColor: "text-orange-600", initials: "SR", avatarBg: "bg-orange-500",
    status: "online", direct: 5, total: 28,
    empId: "EMP00055", levelStr: "L2", location: "Hyderabad, India", workMode: "Office", joinDate: "05 Feb 2017",
  },
  {
    id: "open", name: "Open Position", title: "VP Finance", dept: "Finance",
    deptColor: "text-blue-600", initials: "?", avatarBg: "bg-slate-200",
    status: "offline", direct: 0, total: 0, isVacancy: true,
  },
  {
    id: "vikram", name: "Vikram Singh", title: "Engineering Manager", dept: "Engineering",
    deptColor: "text-green-600", initials: "VS", avatarBg: "bg-emerald-500",
    status: "online", direct: 12, total: 12,
    empId: "EMP00145", levelStr: "L3", location: "Bengaluru, India", workMode: "Hybrid", joinDate: "20 Aug 2020",
  },
  {
    id: "neha", name: "Neha Patel", title: "QA Lead", dept: "QA",
    deptColor: "text-teal-600", initials: "NP", avatarBg: "bg-teal-500",
    status: "online", direct: 8, total: 8,
    empId: "EMP00167", levelStr: "L3", location: "Pune, India", workMode: "Hybrid", joinDate: "12 Jan 2021",
  },
  {
    id: "rohit", name: "Rohit Gupta", title: "DevOps Lead", dept: "Engineering",
    deptColor: "text-green-600", initials: "RG", avatarBg: "bg-green-600",
    status: "online", direct: 6, total: 6,
    empId: "EMP00189", levelStr: "L3", location: "Bengaluru, India", workMode: "Remote", joinDate: "03 Mar 2021",
  },
];

// L2: 4*180 + 3*20 = 780 wide, start_x = (1000-780)/2 = 110
// CEO center_x = 110 + 390 = 500, left = 500 - 90 = 410
const POSITIONS: Record<string, { left: number; top: number }> = {
  arun:   { left: 410, top: 20  },
  priya:  { left: 110, top: 220 },
  rahul:  { left: 310, top: 220 },
  sneha:  { left: 510, top: 220 },
  open:   { left: 710, top: 220 },
  vikram: { left: 60,  top: 440 },
  neha:   { left: 260, top: 440 },
  rohit:  { left: 460, top: 440 },
};

// CEO bottom=(500,180), L2 top=220, mid_y=200
// priya bottom=(200,380), L3 top=440, mid_y=410
const PATHS = [
  "M 500,180 V 200 H 200 V 220",
  "M 500,180 V 200 H 400 V 220",
  "M 500,180 V 200 H 600 V 220",
  "M 500,180 V 200 H 800 V 220",
  "M 200,380 V 410 H 150 V 440",
  "M 200,380 V 410 H 350 V 440",
  "M 200,380 V 410 H 550 V 440",
];

const PANEL_DETAILS: Record<string, PanelDetail> = {
  arun: {
    reportingLine: [
      { initials: "AK", bg: "bg-teal-500", name: "Arun Kumar", role: "CEO", isCurrent: true },
    ],
    directReportAvatars: [
      { initials: "PS", bg: "bg-emerald-500", name: "Priya Sharma" },
      { initials: "RV", bg: "bg-purple-500",  name: "Rahul Verma" },
      { initials: "SR", bg: "bg-orange-500",  name: "Sneha Reddy" },
    ],
    extraReports: 1,
    orgDepth: 3,
  },
  priya: {
    reportingLine: [
      { initials: "AK", bg: "bg-teal-500",    name: "Arun Kumar",   role: "CEO" },
      { initials: "PS", bg: "bg-emerald-500", name: "Priya Sharma", role: "VP Engineering", isCurrent: true },
      { initials: "VS", bg: "bg-emerald-500", name: "Vikram Singh", role: "Engineering Manager" },
    ],
    directReportAvatars: [
      { initials: "VS", bg: "bg-emerald-500", name: "Vikram Singh" },
      { initials: "NP", bg: "bg-teal-500",    name: "Neha Patel" },
      { initials: "RG", bg: "bg-green-600",   name: "Rohit Gupta" },
      { initials: "AM", bg: "bg-blue-500",    name: "Arjun Mehta" },
      { initials: "SS", bg: "bg-pink-500",    name: "Swati Sharma" },
      { initials: "DK", bg: "bg-indigo-500",  name: "Dev Kumar" },
      { initials: "PB", bg: "bg-amber-500",   name: "Prerna Bhat" },
    ],
    extraReports: 1,
    openPositionsInTeam: 1,
    orgDepth: 3,
  },
  rahul: {
    reportingLine: [
      { initials: "AK", bg: "bg-teal-500",   name: "Arun Kumar",  role: "CEO" },
      { initials: "RV", bg: "bg-purple-500", name: "Rahul Verma", role: "VP Product", isCurrent: true },
    ],
    directReportAvatars: [
      { initials: "AM", bg: "bg-blue-500",   name: "Arjun Mehta" },
      { initials: "PB", bg: "bg-amber-500",  name: "Prerna Bhat" },
      { initials: "SS", bg: "bg-pink-500",   name: "Swati Sharma" },
      { initials: "DK", bg: "bg-indigo-500", name: "Dev Kumar" },
    ],
    extraReports: 2,
    orgDepth: 2,
  },
  sneha: {
    reportingLine: [
      { initials: "AK", bg: "bg-teal-500",   name: "Arun Kumar",  role: "CEO" },
      { initials: "SR", bg: "bg-orange-500", name: "Sneha Reddy", role: "VP HR", isCurrent: true },
    ],
    directReportAvatars: [
      { initials: "MB", bg: "bg-rose-500",   name: "Meera B." },
      { initials: "TK", bg: "bg-cyan-500",   name: "Tarun K." },
      { initials: "JD", bg: "bg-violet-500", name: "Jay D." },
    ],
    extraReports: 2,
    orgDepth: 2,
  },
  vikram: {
    reportingLine: [
      { initials: "AK", bg: "bg-teal-500",    name: "Arun Kumar",   role: "CEO" },
      { initials: "PS", bg: "bg-emerald-500", name: "Priya Sharma", role: "VP Engineering" },
      { initials: "VS", bg: "bg-emerald-500", name: "Vikram Singh", role: "Engineering Manager", isCurrent: true },
    ],
    directReportAvatars: [
      { initials: "RP", bg: "bg-blue-500",   name: "Raj P." },
      { initials: "SN", bg: "bg-pink-500",   name: "Sana N." },
      { initials: "AK", bg: "bg-indigo-500", name: "Aman K." },
    ],
    extraReports: 9,
    orgDepth: 1,
  },
  neha: {
    reportingLine: [
      { initials: "AK", bg: "bg-teal-500",    name: "Arun Kumar",   role: "CEO" },
      { initials: "PS", bg: "bg-emerald-500", name: "Priya Sharma", role: "VP Engineering" },
      { initials: "NP", bg: "bg-teal-500",    name: "Neha Patel",   role: "QA Lead", isCurrent: true },
    ],
    directReportAvatars: [
      { initials: "KG", bg: "bg-rose-500",  name: "Kavya G." },
      { initials: "RT", bg: "bg-amber-500", name: "Ravi T." },
      { initials: "SP", bg: "bg-cyan-500",  name: "Sonu P." },
    ],
    extraReports: 5,
    orgDepth: 1,
  },
  rohit: {
    reportingLine: [
      { initials: "AK", bg: "bg-teal-500",    name: "Arun Kumar",   role: "CEO" },
      { initials: "PS", bg: "bg-emerald-500", name: "Priya Sharma", role: "VP Engineering" },
      { initials: "RG", bg: "bg-green-600",   name: "Rohit Gupta",  role: "DevOps Lead", isCurrent: true },
    ],
    directReportAvatars: [
      { initials: "VK", bg: "bg-blue-500",   name: "Vivek K." },
      { initials: "MR", bg: "bg-pink-500",   name: "Mohan R." },
      { initials: "AD", bg: "bg-violet-500", name: "Akash D." },
    ],
    extraReports: 3,
    orgDepth: 1,
  },
};

const STATUS_DOT: Record<Status, string> = {
  online: "bg-green-500",
  away: "bg-amber-400",
  offline: "bg-slate-300",
};

// Filter option lists derived from static NODES data
const DEPT_OPTIONS = [
  "All Departments",
  ...Array.from(new Set(NODES.map((n) => n.dept))).sort(),
];
const LOCATION_OPTIONS = [
  "All Locations",
  ...Array.from(new Set(NODES.filter((n) => n.location).map((n) => n.location!))).sort(),
];
const LEVEL_OPTIONS = ["All Levels", "L1", "L2", "L3"];

// ─── FilterDropdown ───────────────────────────────────────────────────────────

function FilterDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        {value}
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                value === opt ? "font-semibold text-blue-600" : "text-slate-700"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NodeCard ─────────────────────────────────────────────────────────────────

function NodeCard({
  node,
  isSelected,
  onClick,
  dimmed,
}: {
  node: OrgNode;
  isSelected: boolean;
  onClick: () => void;
  dimmed?: boolean;
}) {
  const pos = POSITIONS[node.id];
  return (
    <div
      onClick={onClick}
      className={`absolute cursor-pointer rounded-xl bg-white shadow-sm transition-all hover:shadow-md ${
        isSelected
          ? "border-2 border-blue-500 ring-2 ring-blue-100"
          : node.isVacancy
          ? "border-2 border-dashed border-slate-300"
          : "border border-slate-200"
      }`}
      style={{
        left: pos.left,
        top: pos.top,
        width: NODE_W,
        ...(dimmed ? { opacity: 0.3, pointerEvents: "none" as const } : {}),
      }}
    >
      {node.isVacancy && (
        <span className="absolute -top-2.5 right-3 rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-600">
          Hiring
        </span>
      )}

      <div className="flex flex-col items-center px-4 pt-4 pb-2">
        <div className="relative">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${node.avatarBg} ${node.isVacancy ? "text-slate-400" : "text-white"}`}
          >
            {node.isVacancy ? <span className="text-lg font-bold text-slate-400">?</span> : node.initials}
          </div>
          {!node.isVacancy && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${STATUS_DOT[node.status]}`}
            />
          )}
        </div>
        <p className="mt-2 text-center text-[13px] font-semibold leading-tight text-slate-900">{node.name}</p>
        <p className="mt-0.5 text-center text-[11px] leading-tight text-slate-500">{node.title}</p>
        <span className={`mt-1 text-[11px] font-semibold ${node.deptColor}`}>{node.dept}</span>
      </div>

      <div className="mx-3 border-t border-slate-100" />

      <div className="flex items-center justify-center gap-1.5 px-4 py-2">
        <Users className="h-3 w-3 text-slate-400" />
        <span className="text-[11px] text-slate-500">
          {node.direct} direct · {node.total} total
        </span>
      </div>
    </div>
  );
}

// ─── OrgChart Canvas ──────────────────────────────────────────────────────────

function OrgChartCanvas({
  selectedId,
  zoom,
  onSelect,
  onZoomIn,
  onZoomOut,
  onFit,
  onClosePanel,
  panelOpen,
  containerRef,
  matchFn,
}: {
  selectedId: string;
  zoom: number;
  onSelect: (id: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onClosePanel: () => void;
  panelOpen: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  matchFn: (node: OrgNode) => boolean;
}) {
  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden bg-slate-50">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
        <div className="flex items-center divide-x divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <button
            onClick={onZoomOut}
            className="flex h-8 w-8 items-center justify-center text-slate-500 hover:bg-slate-50"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="flex h-8 items-center px-3 text-xs font-semibold text-slate-700">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            className="flex h-8 w-8 items-center justify-center text-slate-500 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onFit}
            className="flex h-8 items-center px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Fit
          </button>
        </div>
        {panelOpen && (
          <button
            onClick={onClosePanel}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        )}
      </div>

      <div className="h-full overflow-x-hidden overflow-y-auto">
        <div className="flex justify-center py-16">
          <div
            className="relative origin-top shrink-0"
            style={{ width: TREE_W, height: TREE_H, transform: `scale(${zoom})` }}
          >
            <svg
              className="pointer-events-none absolute inset-0"
              width={TREE_W}
              height={TREE_H}
            >
              {PATHS.map((d, i) => (
                <path key={i} d={d} stroke="#CBD5E1" strokeWidth={1.5} fill="none" />
              ))}
            </svg>

            {NODES.map((node) => (
              <NodeCard
                key={node.id}
                node={node}
                isSelected={selectedId === node.id}
                onClick={() => onSelect(node.id)}
                dimmed={!matchFn(node)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListViewComponent({
  onSelect,
  selectedId,
  matchFn,
}: {
  onSelect: (id: string) => void;
  selectedId: string;
  matchFn: (node: OrgNode) => boolean;
}) {
  const [search, setSearch] = useState("");

  const visible = NODES.filter((node) => {
    if (!matchFn(node)) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      node.name.toLowerCase().includes(q) ||
      node.title.toLowerCase().includes(q) ||
      node.dept.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-3">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, title, or department..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Employee", "Title", "Department", "Level", "Direct", "Total", "Work Mode", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((node) => (
                <tr
                  key={node.id}
                  onClick={() => !node.isVacancy && onSelect(node.id)}
                  className={`transition-colors ${
                    node.isVacancy
                      ? "bg-orange-50/40 cursor-default"
                      : selectedId === node.id
                      ? "bg-blue-50 cursor-pointer"
                      : "cursor-pointer hover:bg-slate-50"
                  }`}
                >
                  <td className={`px-4 py-3 ${node.isVacancy ? "border-l-2 border-orange-300" : ""}`}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${node.avatarBg} ${node.isVacancy ? "text-slate-400" : "text-white"}`}
                      >
                        {node.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-slate-900">{node.name}</p>
                          {!node.isVacancy && (
                            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[node.status]}`} />
                          )}
                          {node.isVacancy && (
                            <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
                              Hiring
                            </span>
                          )}
                        </div>
                        {node.empId && <p className="text-[11px] text-slate-400">{node.empId}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">{node.title}</td>
                  <td className={`px-4 py-3 text-xs font-semibold ${node.deptColor}`}>{node.dept}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{node.levelStr ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{node.direct}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{node.total}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{node.workMode ?? "—"}</td>
                  <td className="px-4 py-3">
                    {!node.isVacancy ? (
                      <span className="flex items-center gap-1.5 text-xs capitalize text-slate-700">
                        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[node.status]}`} />
                        {node.status}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                    No employees match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Dept View ────────────────────────────────────────────────────────────────

function DeptViewComponent({
  onSelect,
  onSwitchToOrg,
  matchFn,
}: {
  onSelect: (id: string) => void;
  onSwitchToOrg: (id: string) => void;
  matchFn: (node: OrgNode) => boolean;
}) {
  const groups: Map<string, OrgNode[]> = new Map();
  NODES.forEach((node) => {
    const existing = groups.get(node.dept);
    if (existing) existing.push(node);
    else groups.set(node.dept, [node]);
  });

  const filteredGroups = Array.from(groups.entries()).filter(([, nodes]) =>
    nodes.some((n) => matchFn(n))
  );

  return (
    <div className="flex-1 overflow-y-auto p-5">
      {filteredGroups.length === 0 && (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">
          No departments match the current filters.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredGroups.map(([dept, nodes]) => {
          const matchingNodes = nodes.filter((n) => matchFn(n));
          const firstNode = nodes[0];
          const firstSelectable = nodes.find((n) => !n.isVacancy) ?? nodes[0];

          return (
            <div key={dept} className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${firstNode.avatarBg}`} />
                  <p className="text-sm font-bold text-slate-900">{dept}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {matchingNodes.length}
                </span>
              </div>

              {/* Body */}
              <div className="flex-1 divide-y divide-slate-100 px-4">
                {matchingNodes.map((node) =>
                  node.isVacancy ? (
                    <div
                      key={node.id}
                      className="my-2 flex items-center gap-3 rounded-lg border border-dashed border-orange-300 bg-orange-50/60 px-3 py-2"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${node.avatarBg} text-slate-400`}
                      >
                        {node.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-700">{node.name}</p>
                        <p className="truncate text-[11px] text-slate-500">{node.title}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                        Hiring
                      </span>
                    </div>
                  ) : (
                    <div
                      key={node.id}
                      onClick={() => onSelect(node.id)}
                      className="-mx-4 flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
                    >
                      <div className="relative">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${node.avatarBg}`}
                        >
                          {node.initials}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${STATUS_DOT[node.status]}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">{node.name}</p>
                        <p className="truncate text-[11px] text-slate-500">{node.title}</p>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 px-4 py-3">
                <button
                  onClick={() => onSwitchToOrg(firstSelectable.id)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  View in org chart →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  nodeId,
  onClose,
  onReassign,
}: {
  nodeId: string;
  onClose: () => void;
  onReassign: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "team" | "timeline">("overview");
  const node = NODES.find((n) => n.id === nodeId)!;
  const detail = PANEL_DETAILS[nodeId];

  const statusLabel = node.status === "online" ? "Online" : node.status === "away" ? "Away" : "Offline";
  const statusColor =
    node.status === "online"
      ? "text-green-600 bg-green-50"
      : node.status === "away"
      ? "text-amber-600 bg-amber-50"
      : "text-slate-500 bg-slate-100";
  const statusDot = STATUS_DOT[node.status];

  return (
    <div className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white">
      {/* Header */}
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white ${node.avatarBg}`}>
              {node.initials}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{node.name}</p>
              <p className="text-sm text-slate-500">{node.title}</p>
              <p className={`mt-1 text-xs font-semibold ${node.deptColor}`}>{node.dept}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
              {statusLabel}
            </span>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {node.empId && <p className="mt-2 text-xs text-slate-400">{node.empId}</p>}
      </div>

      {/* Stats */}
      {!node.isVacancy && (
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          <div className="py-3 text-center">
            <p className="text-xl font-bold text-slate-900">{node.direct}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">Direct Reports</p>
          </div>
          <div className="py-3 text-center">
            <p className="text-xl font-bold text-slate-900">{node.total}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">Total Reports</p>
          </div>
          <div className="py-3 text-center">
            <p className="text-xl font-bold text-slate-900">{node.levelStr}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">Level</p>
          </div>
        </div>
      )}

      {/* Action icons */}
      {!node.isVacancy && (
        <div className="flex items-center justify-center gap-4 border-b border-slate-100 py-3">
          {[Mail, Phone, PenLine, MoreHorizontal].map((Icon, i) => (
            <button key={i} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        {(["overview", "team", "timeline"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-2.5 text-xs font-semibold capitalize ${
              activeTab === t
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && !node.isVacancy && (
        <div className="flex-1 space-y-5 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Position details</p>
            <div className="mt-2 space-y-2">
              {[
                { icon: Building2, label: "Department", value: node.dept },
                { icon: Layers, label: "Level", value: node.levelStr },
                { icon: MapPin, label: "Location", value: node.location },
                { icon: Laptop, label: "Work Mode", value: node.workMode },
                { icon: Calendar, label: "Date Joined", value: node.joinDate },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="w-24 text-xs text-slate-500">{label}</span>
                  <span className="flex-1 text-xs font-medium text-slate-700">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {detail?.reportingLine && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reporting line</p>
              <div className="mt-2 space-y-2">
                {detail.reportingLine.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" />}
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${r.bg} ${r.isCurrent ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
                    >
                      {r.initials}
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate text-xs font-semibold ${r.isCurrent ? "text-blue-700" : "text-slate-700"}`}>
                        {r.name}
                      </p>
                      {r.role && <p className="truncate text-[10px] text-slate-400">{r.role}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail?.directReportAvatars && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Direct reports ({node.direct})
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {detail.directReportAvatars.map((a, i) => (
                  <div
                    key={i}
                    title={a.name}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white ${a.bg}`}
                  >
                    {a.initials}
                  </div>
                ))}
                {detail.extraReports && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                    +{detail.extraReports}
                  </div>
                )}
              </div>
              {detail.openPositionsInTeam && (
                <p className="mt-2 text-xs font-semibold text-orange-600">
                  {detail.openPositionsInTeam} open position{detail.openPositionsInTeam > 1 ? "s" : ""} in direct reports
                </p>
              )}
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Span of control</p>
            <div className="mt-2 space-y-1.5">
              {[
                { label: "Direct Reports", value: node.direct },
                { label: "Total Org Size", value: node.total },
                { label: "Org Depth (Levels below)", value: detail?.orgDepth ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-xs font-semibold text-slate-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "overview" && node.isVacancy && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Users className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Open Position</p>
          <p className="text-xs text-slate-500">This position is currently open and hiring.</p>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">Hiring</span>
        </div>
      )}

      {activeTab === "team" && (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <p className="text-sm text-slate-400">Team view coming soon</p>
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <p className="text-sm text-slate-400">Timeline coming soon</p>
        </div>
      )}

      {!node.isVacancy && (
        <div className="border-t border-slate-100 p-4">
          <div className="flex gap-2">
            <button className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              View full profile
            </button>
            <button className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              View subtree
            </button>
          </div>
          <button
            onClick={onReassign}
            className="mt-2 w-full py-2 text-xs font-semibold text-red-600 hover:underline"
          >
            Reassign manager
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Reassign Manager Modal ───────────────────────────────────────────────────

function ReassignModal({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const [newManager, setNewManager] = useState("");
  const [reason, setReason] = useState("");
  const parent = PANEL_DETAILS[nodeId]?.reportingLine.find((r) => !r.isCurrent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Reassign manager</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">Current manager</label>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              {parent ? (
                <>
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${parent.bg}`}>
                    {parent.initials}
                  </div>
                  <span className="text-sm text-slate-700">{parent.name} ({parent.role})</span>
                </>
              ) : (
                <span className="text-sm text-slate-500">—</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">
              New manager <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <input
                type="text"
                value={newManager}
                onChange={(e) => setNewManager(e.target.value)}
                placeholder="Search and select new manager"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-8 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">
              Effective date <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                defaultValue="29 May 2026"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for reassigning manager"
              rows={3}
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Confirm Reassignment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkforceHierarchy() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState("priya");
  const [panelOpen, setPanelOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<ViewMode>("org");
  const [reassignOpen, setReassignOpen] = useState(false);
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [levelFilter, setLevelFilter] = useState("All Levels");
  const [locationFilter, setLocationFilter] = useState("All Locations");

  const canvasRef = useRef<HTMLDivElement>(null);

  const matchFn = useCallback(
    (node: OrgNode): boolean => {
      if (deptFilter !== "All Departments" && node.dept !== deptFilter) return false;
      if (levelFilter !== "All Levels" && node.levelStr !== levelFilter) return false;
      if (locationFilter !== "All Locations" && node.location !== locationFilter) return false;
      return true;
    },
    [deptFilter, levelFilter, locationFilter]
  );

  const recalcZoom = useCallback(() => {
    if (!canvasRef.current) return;
    const w = canvasRef.current.offsetWidth;
    setZoom(Math.min((w - 48) / TREE_W, 1));
  }, []);

  useLayoutEffect(() => { recalcZoom(); }, [recalcZoom]);

  useEffect(() => {
    window.addEventListener("resize", recalcZoom);
    return () => window.removeEventListener("resize", recalcZoom);
  }, [recalcZoom]);

  useEffect(() => { recalcZoom(); }, [panelOpen, view, recalcZoom]);

  const handleSelect = (id: string) => {
    if (id === "open") return;
    setSelectedId(id);
    setPanelOpen(true);
  };

  const handleSwitchToOrg = (id: string) => {
    setView("org");
    handleSelect(id);
  };

  const handleZoomIn  = () => setZoom((z) => Math.min(+(z + 0.1).toFixed(1), 1.5));
  const handleZoomOut = () => setZoom((z) => Math.max(+(z - 0.1).toFixed(1), 0.3));
  const handleFit     = recalcZoom;

  const views = [
    { id: "org" as const, label: "Org Chart", icon: Network },
    { id: "list" as const, label: "List View", icon: List },
    { id: "dept" as const, label: "Dept View", icon: Building2 },
  ];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-white">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <nav className="flex items-center gap-1.5 text-sm">
          <button onClick={() => navigate("/dashboard")} className="text-slate-500 hover:text-slate-700">
            Dashboard
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <button onClick={() => navigate("/workforce/directory")} className="text-slate-500 hover:text-slate-700">
            Workforce Management
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className="font-semibold text-slate-900">Hierarchy</span>
        </nav>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Search className="h-4 w-4" />
            Search employee
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Add position
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-2.5">
        <div className="flex items-center divide-x divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {views.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                view === id ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <FilterDropdown value={deptFilter} options={DEPT_OPTIONS} onChange={setDeptFilter} />
          <FilterDropdown value={levelFilter} options={LEVEL_OPTIONS} onChange={setLevelFilter} />
          <FilterDropdown value={locationFilter} options={LOCATION_OPTIONS} onChange={setLocationFilter} />
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">
        {view === "org" && (
          <OrgChartCanvas
            selectedId={selectedId}
            zoom={zoom}
            onSelect={handleSelect}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFit={handleFit}
            onClosePanel={() => setPanelOpen(false)}
            panelOpen={panelOpen}
            containerRef={canvasRef}
            matchFn={matchFn}
          />
        )}

        {view === "list" && (
          <ListViewComponent
            onSelect={handleSelect}
            selectedId={selectedId}
            matchFn={matchFn}
          />
        )}

        {view === "dept" && (
          <DeptViewComponent
            onSelect={handleSelect}
            onSwitchToOrg={handleSwitchToOrg}
            matchFn={matchFn}
          />
        )}

        {panelOpen && (
          <DetailPanel
            nodeId={selectedId}
            onClose={() => setPanelOpen(false)}
            onReassign={() => setReassignOpen(true)}
          />
        )}
      </div>

      {reassignOpen && (
        <ReassignModal
          nodeId={selectedId}
          onClose={() => setReassignOpen(false)}
        />
      )}
    </div>
  );
}
