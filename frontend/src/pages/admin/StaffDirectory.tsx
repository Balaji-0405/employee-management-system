import React, { useState, useMemo, useRef, useEffect } from "react";
import { employeeAPI } from "../../lib/api";
import {
  Search,
  Plus,
  Upload,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  AlignJustify,
  GitBranch,
  Share2,
  Eye,
  Pencil,
  MoreVertical,
  X,
  Mail,
  Phone,
  Video,
  MoreHorizontal,
  MapPin,
  Building2,
  Users,
  UserCheck,
  Clock,
  AlertCircle,
  ArrowUpDown,
  Check,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type OnlineStatus = "Online" | "Away" | "Offline";
type EmploymentType = "Full Time" | "Part Time" | "Probation";
type WorkMode = "Remote" | "Hybrid" | "Office";
type ActiveStatus = "Active" | "On Leave" | "On Probation" | "Inactive";

interface Employee {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  onlineStatus: OnlineStatus;
  employmentType: EmploymentType;
  workMode: WorkMode;
  joinDate: string;
  dob: string;
  gender: string;
  maritalStatus: string;
  activeStatus: ActiveStatus;
  manager: string;
  team: string;
  location: string;
  address: string;
}

function mapApiEmployee(raw: any): Employee {
  const empType: EmploymentType =
    raw.employment_type === "part_time" ? "Part Time"
    : raw.employment_type === "probation" ? "Probation"
    : "Full Time";

  const activeStatus: ActiveStatus =
    !raw.is_active ? "Inactive"
    : empType === "Probation" ? "On Probation"
    : "Active";

  return {
    id: raw.employee_code || raw.id,
    name: raw.name || "—",
    designation: raw.position || "—",
    department: raw.department || "—",
    email: raw.email || "—",
    phone: raw.phone || "—",
    onlineStatus: "Offline",
    employmentType: empType,
    workMode: (raw.work_location as WorkMode) || "Office",
    joinDate: raw.joining_date
      ? new Date(raw.joining_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "—",
    dob: "—",
    gender: "—",
    maritalStatus: "—",
    activeStatus,
    manager: raw.manager?.name || "—",
    team: raw.department || "—",
    location: raw.work_location || "—",
    address: raw.address || "—",
  };
}

const SORT_OPTIONS = ["Name A-Z", "Name Z-A", "Department", "Designation", "Date of Joining"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_GRADIENTS = [
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-orange-400 to-amber-500",
  "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500",
  "from-cyan-400 to-sky-500",
  "from-lime-400 to-green-500",
  "from-fuchsia-400 to-pink-500",
];

function avatarGradient(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

function exportToCSV(employees: Employee[]) {
  const headers = ["ID", "Name", "Designation", "Department", "Manager", "Employment Type", "Work Mode", "Status", "Email", "Phone", "Join Date", "Location"];
  const rows = employees.map((e) =>
    [e.id, e.name, e.designation, e.department, e.manager, e.employmentType, e.workMode, e.activeStatus, e.email, e.phone, e.joinDate, e.location]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "employees_export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function EmployeeAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-11 w-11 text-sm", lg: "h-16 w-16 text-lg", xl: "h-20 w-20 text-xl" };
  return (
    <div className={`shrink-0 grid place-items-center rounded-full bg-gradient-to-br ${avatarGradient(name)} font-bold text-white ${sizes[size]}`}>
      {getInitials(name)}
    </div>
  );
}

function OnlineDot({ status }: { status: OnlineStatus }) {
  const colors: Record<OnlineStatus, string> = { Online: "bg-green-500", Away: "bg-amber-400", Offline: "bg-slate-300" };
  return <span className={`h-2.5 w-2.5 rounded-full border-2 border-white ${colors[status]}`} />;
}

function OnlineBadge({ status }: { status: OnlineStatus }) {
  const styles: Record<OnlineStatus, string> = {
    Online: "text-green-600",
    Away: "text-amber-500",
    Offline: "text-slate-400",
  };
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${styles[status]}`}>
      <OnlineDot status={status} />
      {status}
    </span>
  );
}

function EmpTypeBadge({ type }: { type: EmploymentType }) {
  const styles: Record<EmploymentType, string> = {
    "Full Time": "bg-blue-50 text-blue-700",
    "Part Time": "bg-purple-50 text-purple-700",
    Probation: "bg-amber-50 text-amber-700",
  };
  return <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${styles[type]}`}>{type}</span>;
}

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
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>{status}</span>;
}

// ── Filter Dropdown ──────────────────────────────────────────────────────────

function FilterDropdown({
  value,
  options,
  onChange,
  className = "",
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none"
      >
        <span className="truncate">{value}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${value === opt ? "font-semibold text-blue-600" : "text-slate-700"}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sort Dropdown ────────────────────────────────────────────────────────────

function SortDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        {value}
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${value === opt ? "font-semibold text-blue-600" : "text-slate-700"}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Employee Card ────────────────────────────────────────────────────────────

function EmployeeCard({
  emp,
  selected,
  onClick,
}: {
  emp: Employee;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border bg-white shadow-sm transition-all hover:shadow-md ${selected ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="relative">
            <EmployeeAvatar name={emp.name} size="md" />
            <span className="absolute -bottom-0.5 -right-0.5">
              <OnlineDot status={emp.onlineStatus} />
            </span>
          </div>
          <OnlineBadge status={emp.onlineStatus} />
        </div>

        <div className="mt-3">
          <p className="truncate text-sm font-bold text-slate-900">{emp.name}</p>
          <p className="truncate text-xs text-slate-500">{emp.designation}</p>
        </div>

        <div className="mt-3 space-y-1.5">
          <InfoRow icon={<MapPin className="h-3.5 w-3.5 text-slate-400" />} text={emp.department} />
          <InfoRow icon={<Mail className="h-3.5 w-3.5 text-slate-400" />} text={emp.email} />
          <InfoRow icon={<Building2 className="h-3.5 w-3.5 text-slate-400" />} text={emp.id} />
          <InfoRow icon={<Phone className="h-3.5 w-3.5 text-slate-400" />} text={emp.phone} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <EmpTypeBadge type={emp.employmentType} />
          <WorkModeBadge mode={emp.workMode} />
        </div>
      </div>

      <div className="flex items-center justify-around border-t border-slate-100 px-4 py-2.5">
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      {icon}
      <span className="truncate">{text}</span>
    </div>
  );
}

// ── Table View ───────────────────────────────────────────────────────────────

function TableView({
  employees,
  selectedId,
  onSelect,
}: {
  employees: Employee[];
  selectedId: string | null;
  onSelect: (emp: Employee) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-slate-600">
            {["Employee", "Department", "Designation", "Manager", "Status", "Work Mode", "Actions"].map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {employees.map((emp) => (
            <tr
              key={emp.id}
              onClick={() => onSelect(emp)}
              className={`cursor-pointer hover:bg-slate-50 ${selectedId === emp.id ? "bg-blue-50" : ""}`}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <EmployeeAvatar name={emp.name} size="sm" />
                  <div>
                    <p className="font-semibold text-slate-900">{emp.name}</p>
                    <p className="text-slate-500">{emp.id}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-700">{emp.department}</td>
              <td className="px-4 py-3 text-slate-700">{emp.designation}</td>
              <td className="px-4 py-3 text-slate-700">{emp.manager}</td>
              <td className="px-4 py-3"><ActiveStatusBadge status={emp.activeStatus} /></td>
              <td className="px-4 py-3"><WorkModeBadge mode={emp.workMode} /></td>
              <td className="px-4 py-3">
                <div className="flex gap-2 text-slate-500">
                  <Eye className="h-4 w-4 cursor-pointer hover:text-blue-600" />
                  <Pencil className="h-4 w-4 cursor-pointer hover:text-blue-600" />
                  <MoreVertical className="h-4 w-4 cursor-pointer hover:text-blue-600" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Hierarchy / Org Chart Placeholder ────────────────────────────────────────

function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400">
      <div className="text-center">
        <GitBranch className="mx-auto h-10 w-10 opacity-40" />
        <p className="mt-3 text-sm font-medium">{title} coming soon</p>
      </div>
    </div>
  );
}

// ── Employee Detail Panel ────────────────────────────────────────────────────

const PANEL_TABS = ["Overview", "Job Details", "Attendance", "Documents", "More"];

function EmployeePanel({
  emp,
  activeTab,
  onTabChange,
  onClose,
}: {
  emp: Employee;
  activeTab: string;
  onTabChange: (t: string) => void;
  onClose: () => void;
}) {
  const managerInitials = emp.manager.split(" ").map((p) => p[0]).join("").toUpperCase();

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="shrink-0 border-b border-slate-100 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <EmployeeAvatar name={emp.name} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-slate-900">{emp.name}</p>
                <OnlineBadge status={emp.onlineStatus} />
              </div>
              <p className="text-sm text-slate-500">{emp.designation}</p>
              <p className="text-xs text-slate-400">{emp.department} Department</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {[
            { icon: Mail, label: "Email" },
            { icon: Phone, label: "Call" },
            { icon: Video, label: "Video" },
            { icon: MoreHorizontal, label: "More" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              title={label}
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 flex overflow-x-auto border-b border-slate-100 bg-white">
        {PANEL_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`shrink-0 border-b-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "Overview" && <OverviewTab emp={emp} managerInitials={managerInitials} />}
        {activeTab !== "Overview" && (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">
            {activeTab} content
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ emp, managerInitials }: { emp: Employee; managerInitials: string }) {
  return (
    <div className="space-y-5 p-4">
      <section>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-700">Basic Information</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {[
            ["Employee ID", emp.id],
            ["Date of Joining", emp.joinDate],
            ["Date of Birth", emp.dob],
            ["Employment Type", emp.employmentType],
            ["Gender", emp.gender],
            ["Work Mode", emp.workMode],
            ["Marital Status", emp.maritalStatus],
            ["Status", ""],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] text-slate-400">{label}</p>
              {label === "Status" ? (
                <ActiveStatusBadge status={emp.activeStatus} />
              ) : (
                <p className="mt-0.5 text-xs font-semibold text-slate-800">{value}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-100 pt-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-700">Reporting & Department</p>
        <div className="space-y-3">
          {[
            ["Department", emp.department],
            ["Designation", emp.designation],
            ["Team", emp.team],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-2">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-xs font-semibold text-slate-800 text-right">{value}</p>
            </div>
          ))}
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-slate-400">Reporting Manager</p>
            <div className="flex items-center gap-1.5">
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(emp.manager)} text-[9px] font-bold text-white`}>
                {managerInitials}
              </div>
              <p className="text-xs font-semibold text-slate-800">{emp.manager}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 pt-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-700">Contact Information</p>
        <div className="space-y-2.5">
          {[
            ["Email", emp.email],
            ["Phone", emp.phone],
            ["Location", emp.location],
            ["Address", emp.address],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] text-slate-400">{label}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-100 pt-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-700">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Edit Profile
          </button>
          <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Assign Manager
          </button>
          <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Change Department
          </button>
          <button className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
            Deactivate Employee
          </button>
          <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Reset Password
          </button>
        </div>
      </section>
    </div>
  );
}

// ── Add Employee Modal ───────────────────────────────────────────────────────

interface AddEmpForm {
  fullName: string;
  dob: string;
  gender: string;
  maritalStatus: string;
  employeeId: string;
  designation: string;
  department: string;
  employmentType: string;
  workMode: string;
  dateOfJoining: string;
  reportingManager: string;
  email: string;
  phone: string;
  location: string;
  address: string;
}

const EMPTY_ADD_FORM: AddEmpForm = {
  fullName: "", dob: "", gender: "", maritalStatus: "",
  employeeId: "", designation: "", department: "",
  employmentType: "", workMode: "", dateOfJoining: "", reportingManager: "",
  email: "", phone: "", location: "", address: "",
};

const STEP_REQUIRED: Record<number, (keyof AddEmpForm)[]> = {
  1: ["fullName", "dob"],
  2: ["designation", "department", "employmentType", "workMode", "dateOfJoining"],
  3: ["email", "phone", "location"],
};

function AddEmployeeModal({
  onClose,
  onAdd,
  deptOptions,
  managerOptions,
  nextId,
}: {
  onClose: () => void;
  onAdd: (emp: Employee) => void;
  deptOptions: string[];
  managerOptions: string[];
  nextId: string;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<AddEmpForm>({ ...EMPTY_ADD_FORM, employeeId: nextId });
  const [errors, setErrors] = useState<Partial<Record<keyof AddEmpForm, string>>>({});
  const [showDiscard, setShowDiscard] = useState(false);
  const TOTAL_STEPS = 4;
  const STEP_LABELS = ["Personal Info", "Job Details", "Contact Info", "Confirm"];

  function hasAnyValue() {
    return (Object.keys(form) as (keyof AddEmpForm)[])
      .filter((k) => k !== "employeeId")
      .some((k) => form[k] !== "");
  }

  function handleClose() {
    if (hasAnyValue()) { setShowDiscard(true); } else { onClose(); }
  }

  function setField(key: keyof AddEmpForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(s: number): boolean {
    const required = STEP_REQUIRED[s] || [];
    const newErrors: Partial<Record<keyof AddEmpForm, string>> = {};
    for (const field of required) { if (!form[field]) newErrors[field] = "Required"; }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (!validate(step)) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleConfirm() {
    onAdd({
      id: form.employeeId,
      name: form.fullName,
      designation: form.designation,
      department: form.department,
      email: form.email,
      phone: form.phone,
      onlineStatus: "Offline",
      employmentType: (form.employmentType || "Full Time") as EmploymentType,
      workMode: (form.workMode || "Office") as WorkMode,
      joinDate: form.dateOfJoining,
      dob: form.dob,
      gender: form.gender || "—",
      maritalStatus: form.maritalStatus || "—",
      activeStatus: "Active",
      manager: form.reportingManager || "—",
      team: form.department,
      location: form.location,
      address: form.address || "—",
    });
    try {
      const token = localStorage.getItem("ems_token");
      await fetch("/api/v1/leaves/prorate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          employee_id: form.employeeId,
          joining_date: form.dateOfJoining,
        }),
      });
    } catch {}
  }

  function inputCls(field: keyof AddEmpForm) {
    return `h-10 w-full rounded-lg border px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors[field] ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-blue-400"}`;
  }

  function selectCls(field: keyof AddEmpForm) {
    return `h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors[field] ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-blue-400"}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl" style={{ maxHeight: "90vh" }}>
        {showDiscard && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/30">
            <div className="mx-4 w-full max-w-xs rounded-xl bg-white p-6 shadow-lg">
              <p className="text-sm font-bold text-slate-900">Discard changes?</p>
              <p className="mt-1 text-xs text-slate-500">All entered information will be lost.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowDiscard(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-base font-bold text-slate-900">Add Employee</p>
            <p className="text-xs text-slate-400">Step {step} of {TOTAL_STEPS}</p>
          </div>
          <button
            onClick={handleClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="shrink-0 px-6 pt-5 pb-3">
          <div className="flex items-center">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
              const s = i + 1;
              const done = s < step;
              const active = s === step;
              return (
                <React.Fragment key={s}>
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done
                        ? "bg-blue-600 text-white"
                        : active
                        ? "border-2 border-blue-600 text-blue-600"
                        : "border-2 border-slate-200 text-slate-400"
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : s}
                  </div>
                  {i < TOTAL_STEPS - 1 && (
                    <div className={`h-0.5 flex-1 ${done ? "bg-blue-600" : "bg-slate-200"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-700">{STEP_LABELS[step - 1]}</p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Full Name<span className="ml-0.5 text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className={inputCls("fullName")}
                />
                {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Date of Birth<span className="ml-0.5 text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setField("dob", e.target.value)}
                  className={inputCls("dob")}
                />
                {errors.dob && <p className="mt-1 text-xs text-red-500">{errors.dob}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setField("gender", e.target.value)}
                  className={selectCls("gender")}
                >
                  <option value="">Select gender...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Marital Status</label>
                <select
                  value={form.maritalStatus}
                  onChange={(e) => setField("maritalStatus", e.target.value)}
                  className={selectCls("maritalStatus")}
                >
                  <option value="">Select status...</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Job Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Employee ID<span className="ml-0.5 text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.employeeId}
                  readOnly
                  className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Designation<span className="ml-0.5 text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.designation}
                  onChange={(e) => setField("designation", e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className={inputCls("designation")}
                />
                {errors.designation && <p className="mt-1 text-xs text-red-500">{errors.designation}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Department<span className="ml-0.5 text-red-500">*</span>
                </label>
                <select
                  value={form.department}
                  onChange={(e) => setField("department", e.target.value)}
                  className={selectCls("department")}
                >
                  <option value="">Select department...</option>
                  {deptOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {errors.department && <p className="mt-1 text-xs text-red-500">{errors.department}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Employment Type<span className="ml-0.5 text-red-500">*</span>
                </label>
                <select
                  value={form.employmentType}
                  onChange={(e) => setField("employmentType", e.target.value)}
                  className={selectCls("employmentType")}
                >
                  <option value="">Select type...</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Probation">Probation</option>
                </select>
                {errors.employmentType && <p className="mt-1 text-xs text-red-500">{errors.employmentType}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Work Mode<span className="ml-0.5 text-red-500">*</span>
                </label>
                <select
                  value={form.workMode}
                  onChange={(e) => setField("workMode", e.target.value)}
                  className={selectCls("workMode")}
                >
                  <option value="">Select mode...</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Office">Office</option>
                </select>
                {errors.workMode && <p className="mt-1 text-xs text-red-500">{errors.workMode}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Date of Joining<span className="ml-0.5 text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.dateOfJoining}
                  onChange={(e) => setField("dateOfJoining", e.target.value)}
                  className={inputCls("dateOfJoining")}
                />
                {errors.dateOfJoining && <p className="mt-1 text-xs text-red-500">{errors.dateOfJoining}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Reporting Manager</label>
                <select
                  value={form.reportingManager}
                  onChange={(e) => setField("reportingManager", e.target.value)}
                  className={selectCls("reportingManager")}
                >
                  <option value="">Select manager...</option>
                  {managerOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Contact Info */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Email<span className="ml-0.5 text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="employee@company.com"
                  className={inputCls("email")}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Phone<span className="ml-0.5 text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="+91 99999 99999"
                  className={inputCls("phone")}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Location<span className="ml-0.5 text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setField("location", e.target.value)}
                  placeholder="e.g. Bangalore, India"
                  className={inputCls("location")}
                />
                {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  rows={3}
                  placeholder="Full address..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Personal Info</p>
                  <button
                    onClick={() => { setErrors({}); setStep(1); }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div><p className="text-slate-400">Full Name</p><p className="font-semibold text-slate-800">{form.fullName}</p></div>
                  <div><p className="text-slate-400">Date of Birth</p><p className="font-semibold text-slate-800">{form.dob}</p></div>
                  <div><p className="text-slate-400">Gender</p><p className="font-semibold text-slate-800">{form.gender || "—"}</p></div>
                  <div><p className="text-slate-400">Marital Status</p><p className="font-semibold text-slate-800">{form.maritalStatus || "—"}</p></div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Job Details</p>
                  <button
                    onClick={() => { setErrors({}); setStep(2); }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div><p className="text-slate-400">Employee ID</p><p className="font-semibold text-slate-800">{form.employeeId}</p></div>
                  <div><p className="text-slate-400">Designation</p><p className="font-semibold text-slate-800">{form.designation}</p></div>
                  <div><p className="text-slate-400">Department</p><p className="font-semibold text-slate-800">{form.department}</p></div>
                  <div><p className="text-slate-400">Employment Type</p><p className="font-semibold text-slate-800">{form.employmentType}</p></div>
                  <div><p className="text-slate-400">Work Mode</p><p className="font-semibold text-slate-800">{form.workMode}</p></div>
                  <div><p className="text-slate-400">Date of Joining</p><p className="font-semibold text-slate-800">{form.dateOfJoining}</p></div>
                  {form.reportingManager && (
                    <div><p className="text-slate-400">Reporting Manager</p><p className="font-semibold text-slate-800">{form.reportingManager}</p></div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Contact Info</p>
                  <button
                    onClick={() => { setErrors({}); setStep(3); }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div><p className="text-slate-400">Email</p><p className="break-all font-semibold text-slate-800">{form.email}</p></div>
                  <div><p className="text-slate-400">Phone</p><p className="font-semibold text-slate-800">{form.phone}</p></div>
                  <div><p className="text-slate-400">Location</p><p className="font-semibold text-slate-800">{form.location}</p></div>
                  {form.address && (
                    <div className="col-span-2"><p className="text-slate-400">Address</p><p className="font-semibold text-slate-800">{form.address}</p></div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-6 py-4">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <div />
          )}
          {step < TOTAL_STEPS ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Check className="h-4 w-4" /> Add Employee
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

type ViewMode = "grid" | "table" | "hierarchy" | "orgchart";

export default function AdminStaffDirectory() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [designFilter, setDesignFilter] = useState("All Designations");
  const [managerFilter, setManagerFilter] = useState("All Managers");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState("Name A-Z");
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [panelTab, setPanelTab] = useState("Overview");
  const [page, setPage] = useState(1);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const perPage = 16;
  const TOTAL = 1248;

  useEffect(() => {
    if (!successBanner) return;
    const t = setTimeout(() => setSuccessBanner(false), 3000);
    return () => clearTimeout(t);
  }, [successBanner]);

  useEffect(() => {
    employeeAPI.getAll(100)
      .then((data: any) => {
        const mapped = Array.isArray(data) ? data.map(mapApiEmployee) : [];
        setEmployees(mapped);
      })
      .catch(() => {})
      .finally(() => setLoadingEmployees(false));
  }, []);

  const departments = useMemo(
    () => ["All Departments", ...Array.from(new Set(employees.map((e) => e.department))).sort()],
    [employees]
  );
  const designations = useMemo(
    () => ["All Designations", ...Array.from(new Set(employees.map((e) => e.designation))).sort()],
    [employees]
  );
  const managers = useMemo(
    () => ["All Managers", ...Array.from(new Set(employees.map((e) => e.manager))).sort()],
    [employees]
  );
  const statuses = ["All Status", "Active", "On Leave", "On Probation", "Inactive"];

  const nextId = useMemo(
    () => `EMP${String(employees.length + 1).padStart(3, "0")}`,
    [employees]
  );

  const activeFilterCount = [
    deptFilter !== "All Departments",
    designFilter !== "All Designations",
    managerFilter !== "All Managers",
    statusFilter !== "All Status",
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees
      .filter((emp) => {
        const matchSearch =
          !q ||
          emp.name.toLowerCase().includes(q) ||
          emp.email.toLowerCase().includes(q) ||
          emp.id.toLowerCase().includes(q) ||
          emp.department.toLowerCase().includes(q) ||
          emp.designation.toLowerCase().includes(q);
        const matchDept = deptFilter === "All Departments" || emp.department === deptFilter;
        const matchDesign = designFilter === "All Designations" || emp.designation === designFilter;
        const matchManager = managerFilter === "All Managers" || emp.manager === managerFilter;
        const matchStatus = statusFilter === "All Status" || emp.activeStatus === statusFilter;
        return matchSearch && matchDept && matchDesign && matchManager && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === "Name A-Z") return a.name.localeCompare(b.name);
        if (sortBy === "Name Z-A") return b.name.localeCompare(a.name);
        if (sortBy === "Department") return a.department.localeCompare(b.department);
        if (sortBy === "Designation") return a.designation.localeCompare(b.designation);
        return 0;
      });
  }, [employees, search, deptFilter, designFilter, managerFilter, statusFilter, sortBy]);

  function clearFilters() {
    setSearch("");
    setDeptFilter("All Departments");
    setDesignFilter("All Designations");
    setManagerFilter("All Managers");
    setStatusFilter("All Status");
    setPage(1);
  }

  function handleSelectEmp(emp: Employee) {
    setSelectedEmp(emp);
    setPanelTab("Overview");
  }

  function handleAddEmployee(emp: Employee) {
    setEmployees((prev) => [...prev, emp]);
    setShowAddModal(false);
    setSuccessBanner(true);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMoreActions(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const totalPages = Math.ceil(TOTAL / perPage);
  const startEntry = (page - 1) * perPage + 1;
  const endEntry = Math.min(page * perPage, TOTAL);

  const viewTabs: { key: ViewMode; label: string; icon: React.ElementType }[] = [
    { key: "grid", label: "Grid View", icon: LayoutGrid },
    { key: "table", label: "Table View", icon: AlignJustify },
    { key: "hierarchy", label: "Hierarchy View", icon: GitBranch },
    { key: "orgchart", label: "Org Chart View", icon: Share2 },
  ];

  return (
    <div className="min-h-full bg-slate-50 px-5 py-5">
      {/* Success Banner */}
      {successBanner && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          <Check className="h-5 w-5 shrink-0" />
          Employee added successfully!
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="mb-5">
        <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
          <span className="cursor-pointer hover:text-blue-600">Dashboard</span>
          <span>›</span>
          <span className="cursor-pointer hover:text-blue-600">Workforce Management</span>
          <span>›</span>
          <span className="font-semibold text-slate-700">Staff Directory</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Staff Directory</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
            <button className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Upload className="h-4 w-4" />
              Import
            </button>
            <button
              onClick={() => exportToCSV(filtered)}
              className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setShowMoreActions((o) => !o)}
                className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                More Actions
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {showMoreActions && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {["Generate Report", "Bulk Update", "Archive Selected", "Send Announcement"].map((a) => (
                    <button key={a} className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                      {a}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { icon: Users, label: "Total Employees", value: "1,248", sub: "5.4% from last month", bg: "bg-blue-500" },
          { icon: UserCheck, label: "Active Employees", value: "1,180", sub: "94.5% of total", bg: "bg-emerald-500" },
          { icon: Clock, label: "On Leave", value: "32", sub: "2.6% of total", bg: "bg-amber-500" },
          { icon: AlertCircle, label: "On Probation", value: "24", sub: "1.9% of total", bg: "bg-indigo-500" },
          { icon: X, label: "Inactive", value: "12", sub: "0.9% of total", bg: "bg-rose-500" },
        ].map(({ icon: Icon, label, value, sub, bg }) => (
          <div key={label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-full p-3 ${bg}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-[11px] text-slate-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filters ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, ID, email, department..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <FilterDropdown
          value={deptFilter}
          options={departments}
          onChange={(v) => { setDeptFilter(v); setPage(1); }}
          className="min-w-[160px]"
        />
        <FilterDropdown
          value={designFilter}
          options={designations}
          onChange={(v) => { setDesignFilter(v); setPage(1); }}
          className="min-w-[170px]"
        />
        <FilterDropdown
          value={managerFilter}
          options={managers}
          onChange={(v) => { setManagerFilter(v); setPage(1); }}
          className="min-w-[155px]"
        />
        <FilterDropdown
          value={statusFilter}
          options={statuses}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          className="min-w-[130px]"
        />

        <button
          onClick={clearFilters}
          className="relative flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Filter className="h-4 w-4 text-slate-400" />
          {activeFilterCount > 0 ? "Clear Filters" : "Filters"}
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── View Controls ── */}
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-1">
        <div className="flex items-center gap-1">
          {viewTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                viewMode === key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Sort By :</span>
          <SortDropdown value={sortBy} onChange={setSortBy} />
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className={`flex gap-4 ${selectedEmp ? "items-start" : ""}`}>
        {/* Left: Grid / Table / Other Views */}
        <div className="min-w-0 flex-1">
          {viewMode === "grid" && (
            <div className={`grid gap-4 ${selectedEmp ? "grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"}`}>
              {loadingEmployees ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                ))
              ) : filtered.length === 0 ? (
                <div className="col-span-full py-16 text-center text-sm text-slate-400">No employees found</div>
              ) : (
                filtered.slice(0, perPage).map((emp) => (
                  <EmployeeCard
                    key={emp.id}
                    emp={emp}
                    selected={selectedEmp?.id === emp.id}
                    onClick={() => handleSelectEmp(emp)}
                  />
                ))
              )}
            </div>
          )}

          {viewMode === "table" && (
            <TableView
              employees={filtered.slice(0, perPage)}
              selectedId={selectedEmp?.id ?? null}
              onSelect={handleSelectEmp}
            />
          )}

          {viewMode === "hierarchy" && <PlaceholderView title="Hierarchy View" />}
          {viewMode === "orgchart" && <PlaceholderView title="Org Chart View" />}

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>
              Showing {startEntry} to {endEntry} of {TOTAL.toLocaleString()} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`grid h-8 w-8 place-items-center rounded-md text-sm font-semibold ${
                    page === p
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              ))}
              <span className="px-1 text-slate-400">…</span>
              <button
                onClick={() => setPage(totalPages)}
                className={`grid h-8 w-8 place-items-center rounded-md text-sm font-semibold ${
                  page === totalPages
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {totalPages}
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="ml-2 flex items-center gap-1.5">
                <span className="text-xs">16 / page</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Employee Detail Panel */}
        {selectedEmp && (
          <div
            className="w-[360px] shrink-0 sticky top-4 flex flex-col"
            style={{ height: "calc(100vh - 6rem)", maxHeight: "calc(100vh - 6rem)" }}
          >
            <EmployeePanel
              emp={selectedEmp}
              activeTab={panelTab}
              onTabChange={setPanelTab}
              onClose={() => setSelectedEmp(null)}
            />
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddEmployee}
          deptOptions={departments.slice(1)}
          managerOptions={managers.slice(1)}
          nextId={nextId}
        />
      )}
    </div>
  );
}
