import {
  Banknote,
  Briefcase,
  Camera,
  Check,
  Edit3,
  FileText,
  GraduationCap,
  Lock,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import type { ReactNode, ChangeEvent } from "react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { employeeAPI, employeeExtAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  position: string | null;
  employee_code: string | null;
  phone: string | null;
  address: string | null;
  bio: string | null;
  emergency_contact: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  joining_date: string | null;
  work_location: string | null;
  employment_type: string | null;
  manager: { name: string; department: string | null } | null;
}

interface EditForm {
  name: string;
  phone: string;
  address: string;
  bio: string;
  emergency_contact: string;
}

type TabKey = "overview" | "personal" | "documents" | "bank" | "education" | "emergency" | "security";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(s: string | null | undefined): string {
  if (!s) return "Not provided";
  try {
    return new Date(s + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return s;
  }
}

function capitalize(s: string | null | undefined): string {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function computeCompletion(e: Employee): number {
  const fields: (string | null)[] = [
    e.name, e.email, e.phone, e.department, e.position,
    e.address, e.bio, e.emergency_contact, e.avatar_url,
    e.date_of_birth, e.joining_date, e.employee_code,
    e.work_location, e.employment_type,
  ];
  const filled = fields.filter((f) => f !== null && f !== "").length;
  return Math.round((filled / fields.length) * 100);
}

function completionLabel(pct: number): string {
  if (pct >= 80) return "Excellent";
  if (pct >= 60) return "Good";
  if (pct >= 40) return "Fair";
  return "Getting started";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 text-[12px] font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-[15px] font-semibold text-slate-700">{title}</p>
      <p className="text-[13px] text-slate-500">This section is coming soon.</p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Profile() {
  const navigate = useNavigate();

  const [employee,     setEmployee]     = useState<Employee | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [activeTab,    setActiveTab]    = useState<TabKey>("overview");

  // Photo upload
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError,   setPhotoError]   = useState<string | null>(null);

  // Edit profile modal
  const [showEdit,    setShowEdit]    = useState(false);
  const [editForm,    setEditForm]    = useState<EditForm>({ name: "", phone: "", address: "", bio: "", emergency_contact: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError,   setEditError]   = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await employeeAPI.getProfile() as Employee;
      setEmployee(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  // Pre-fill edit form when employee data loads
  useEffect(() => {
    if (employee) {
      setEditForm({
        name:              employee.name              ?? "",
        phone:             employee.phone             ?? "",
        address:           employee.address           ?? "",
        bio:               employee.bio               ?? "",
        emergency_contact: employee.emergency_contact ?? "",
      });
    }
  }, [employee]);

  // ── Photo upload ──────────────────────────────────────────────────────────────

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Image must be under 2 MB");
      return;
    }

    setPhotoError(null);
    setPhotoLoading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const result = await employeeExtAPI.uploadPhoto(formData) as { avatar_url: string };
      setEmployee((prev) => prev ? { ...prev, avatar_url: result.avatar_url } : prev);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPhotoLoading(false);
      // Reset so the same file can be re-selected if needed
      e.target.value = "";
    }
  };

  // ── Edit profile ──────────────────────────────────────────────────────────────

  const handleEditSubmit = async () => {
    if (!editForm.name.trim()) {
      setEditError("Name is required");
      return;
    }
    setEditLoading(true);
    setEditError(null);
    setEditSuccess(false);
    try {
      const updated = await employeeExtAPI.updateMyProfile(editForm) as Employee;
      setEmployee((prev) => prev ? { ...prev, ...updated } : prev);
      setEditSuccess(true);
      setTimeout(() => {
        setShowEdit(false);
        setEditSuccess(false);
      }, 1200);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const completionPct = employee ? computeCompletion(employee) : 0;

  const tabs: { key: TabKey; label: string; Icon: typeof Briefcase }[] = [
    { key: "overview",  label: "Overview",           Icon: Briefcase  },
    { key: "personal",  label: "Personal Information",Icon: Phone      },
    { key: "documents", label: "Documents",           Icon: FileText   },
    { key: "bank",      label: "Bank Details",        Icon: Banknote   },
    { key: "education", label: "Education",           Icon: GraduationCap },
    { key: "emergency", label: "Emergency Contact",   Icon: ShieldCheck },
    { key: "security",  label: "Account & Security",  Icon: Lock       },
  ];

  // ── Loading skeleton ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-full bg-[#f8fafc]">
        <div className="w-full space-y-4 p-4 lg:p-5">
          <Skeleton className="h-8 w-48 rounded" />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <Panel className="p-5">
              <div className="flex gap-5">
                <Skeleton className="h-28 w-28 rounded-full" />
                <div className="flex-1 space-y-3 pt-2">
                  <Skeleton className="h-6 w-48 rounded" />
                  <Skeleton className="h-4 w-64 rounded" />
                  <Skeleton className="h-4 w-72 rounded" />
                  <div className="grid grid-cols-4 gap-3 pt-2">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-md" />)}
                  </div>
                </div>
              </div>
            </Panel>
            <Skeleton className="h-48 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────────

  if (error || !employee) {
    return (
      <div className="min-h-full bg-[#f8fafc] p-4 lg:p-5">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-slate-200 bg-white py-16 text-center">
          <p className="text-[15px] font-semibold text-slate-700">
            {error ?? "Failed to load profile"}
          </p>
          <button
            onClick={fetchProfile}
            className="rounded-md bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const initials = employee.name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-[#f8fafc]">
      <div className="w-full space-y-4 p-4 lg:p-5">

        {/* Page header */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-slate-950">My Profile</h1>
            <p className="mt-1 text-[14px] text-slate-500">Manage your personal and professional information</p>
          </div>
          <div className="flex min-w-[360px] items-center gap-4">
            <div className="flex-1">
              <div className="mb-2 flex justify-between text-[13px]">
                <span className="font-semibold text-slate-900">Profile Completion</span>
                <span>
                  <b className="text-blue-700">{completionPct}%</b>{" "}
                  <span className="text-slate-500">Complete</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => setShowEdit(true)}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <Edit3 className="h-4 w-4" />Edit Profile
            </button>
          </div>
        </div>

        {/* Profile hero + quick actions */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Panel className="p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

              {/* Avatar */}
              <div className="relative h-28 w-28 shrink-0">
                {photoLoading ? (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-200">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                  </div>
                ) : employee.avatar_url ? (
                  <img
                    src={employee.avatar_url}
                    alt={employee.name}
                    className="h-28 w-28 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-100 text-[28px] font-bold text-blue-700">
                    {initials}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-white hover:bg-blue-700"
                  title="Change photo"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              {/* Identity */}
              <div className="min-w-0 flex-1">
                {photoError && (
                  <p className="mb-2 text-[12px] text-red-600">{photoError}</p>
                )}
                <div className="flex items-center gap-3">
                  <h2 className="text-[26px] font-semibold text-slate-950">{employee.name}</h2>
                  <span className="rounded bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                    {capitalize(employee.role)}
                  </span>
                </div>
                <p className="mt-2 text-[14px] font-semibold text-slate-700">
                  {employee.position ?? capitalize(employee.role)}
                  {employee.department ? ` • ${employee.department}` : ""}
                </p>
                <p className="mt-2 text-[12px] text-slate-500">
                  {employee.employee_code ?? "No code"} • {employee.email}
                  {employee.phone ? ` • ${employee.phone}` : ""}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoRow label="Joining Date"      value={formatDate(employee.joining_date)} />
                  <InfoRow label="Reporting To"      value={employee.manager?.name ?? "Not assigned"} />
                  <InfoRow label="Employment Type"   value={capitalize(employee.employment_type) ?? "Full Time"} />
                  <InfoRow label="Work Location"     value={employee.work_location ?? "Not provided"} />
                </div>
              </div>

              {/* Complete profile prompt — only shown when <80% */}
              {completionPct < 80 && (
                <div className="rounded-lg bg-blue-50 p-5 lg:w-[280px]">
                  <h3 className="text-[14px] font-semibold text-blue-700">Complete your profile</h3>
                  <p className="mt-3 text-[12px] leading-5 text-slate-600">
                    Add missing information to reach 100% — it helps HR and your team.
                  </p>
                  <button
                    onClick={() => setShowEdit(true)}
                    className="mt-5 h-9 rounded-md bg-white px-4 text-[12px] font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
                  >
                    Update Profile
                  </button>
                </div>
              )}
            </div>
          </Panel>

          {/* Quick Actions */}
          <Panel className="p-5">
            <h2 className="text-[15px] font-semibold text-slate-950">Quick Actions</h2>
            <div className="mt-5 space-y-4 text-[13px] font-semibold text-slate-700">
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-3 hover:text-blue-700"
              >
                <Edit3 className="h-4 w-4" />Edit Profile
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 hover:text-blue-700"
              >
                <Camera className="h-4 w-4" />Upload Photo
              </button>
              <button
                onClick={() => navigate("/documents")}
                className="flex items-center gap-3 hover:text-blue-700"
              >
                <Upload className="h-4 w-4" />Upload Documents
              </button>
              {/* Download ID Card has no backend route yet */}
              <button
                disabled
                className="flex items-center gap-3 cursor-not-allowed opacity-50"
                title="Coming soon"
              >
                <FileText className="h-4 w-4" />Download ID Card
              </button>
            </div>
          </Panel>
        </div>

        {/* Tabs */}
        <Panel className="overflow-hidden">
          <div className="flex gap-8 overflow-x-auto border-b border-slate-100 px-4 text-[13px] font-semibold text-slate-600">
            {tabs.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex shrink-0 items-center gap-2 border-b-2 py-4 transition-colors ${
                  activeTab === key
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent hover:text-slate-950"
                }`}
              >
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>

          <div className="p-4">

            {/* ── OVERVIEW ── */}
            {activeTab === "overview" && (
              <div className="grid gap-4 xl:grid-cols-4">
                <div className="space-y-4">
                  <Panel className="p-4">
                    <h3 className="text-[15px] font-semibold text-slate-950">About Me</h3>
                    <p className="mt-4 text-[12px] leading-5 text-slate-500">
                      {employee.bio ?? "No bio provided. Click Edit Profile to add one."}
                    </p>
                  </Panel>
                  <Panel className="p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-[15px] font-semibold text-slate-950">Contact Information</h3>
                      <button onClick={() => setShowEdit(true)}>
                        <Edit3 className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                      </button>
                    </div>
                    <div className="space-y-3 text-[12px] text-slate-600">
                      <p className="flex gap-3">
                        <Phone className="h-4 w-4 shrink-0 text-blue-600" />
                        {employee.phone ?? "Not provided"}
                      </p>
                      <p className="flex gap-3">
                        <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                        {employee.email}
                      </p>
                      <p className="flex gap-3">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-500" />
                        {employee.address ?? "Not provided"}
                      </p>
                    </div>
                  </Panel>
                </div>

                {/* Profile Strength */}
                <Panel className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-slate-950">Profile Strength</h3>
                    <span className={`text-[12px] font-semibold ${completionPct >= 60 ? "text-emerald-600" : "text-amber-600"}`}>
                      {completionLabel(completionPct)}
                    </span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                  <p className="mt-4 text-[12px] leading-5 text-slate-500">
                    {completionPct < 100
                      ? "Complete missing fields to strengthen your profile."
                      : "Your profile is complete!"}
                  </p>
                  <div className="mt-5 space-y-3 text-[12px]">
                    {[
                      ["Name",             !!employee.name],
                      ["Phone",            !!employee.phone],
                      ["Bio",              !!employee.bio],
                      ["Emergency Contact",!!employee.emergency_contact],
                      ["Address",          !!employee.address],
                    ].map(([label, done]) => (
                      <div key={label as string} className="flex justify-between">
                        <span>{label as string}</span>
                        <span className={done ? "text-emerald-600" : "text-amber-600"}>
                          {done ? "Completed" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </Panel>

                {/* Documents summary */}
                <Panel className="p-4">
                  <div className="flex justify-between">
                    <h3 className="text-[15px] font-semibold text-slate-950">Documents</h3>
                    <button
                      onClick={() => navigate("/documents")}
                      className="text-[12px] font-semibold text-blue-700 hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <div className="mt-4 flex flex-col items-center gap-3 py-6 text-center">
                    <FileText className="h-10 w-10 text-slate-300" />
                    <p className="text-[12px] text-slate-500">
                      Manage all your uploaded documents from the Documents page.
                    </p>
                    <button
                      onClick={() => navigate("/documents")}
                      className="rounded-md bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Go to Documents
                    </button>
                  </div>
                </Panel>

                {/* Activity Timeline */}
                <Panel className="p-4">
                  <h3 className="text-[15px] font-semibold text-slate-950">Activity Timeline</h3>
                  <div className="mt-4 flex flex-col items-center gap-3 py-6 text-center">
                    <p className="text-[12px] text-slate-500">Activity tracking coming soon.</p>
                  </div>
                </Panel>
              </div>
            )}

            {/* ── PERSONAL INFORMATION ── */}
            {activeTab === "personal" && (
              <div className="max-w-xl space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">Full Name</p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-950">{employee.name}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">Email</p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-950">{employee.email}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">Phone</p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-950">{employee.phone ?? "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">Date of Birth</p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-950">{formatDate(employee.date_of_birth)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">Department</p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-950">{employee.department ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">Position</p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-950">{employee.position ?? capitalize(employee.role)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">Work Location</p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-950">{employee.work_location ?? "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">Employment Type</p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-950">{capitalize(employee.employment_type) ?? "Full Time"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[11px] font-semibold text-slate-500">Address</p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-950">{employee.address ?? "Not provided"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEdit(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700"
                >
                  <Edit3 className="h-4 w-4" />Edit Information
                </button>
              </div>
            )}

            {/* ── DOCUMENTS ── */}
            {activeTab === "documents" && (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <FileText className="h-12 w-12 text-slate-300" />
                <p className="text-[15px] font-semibold text-slate-700">Manage your documents</p>
                <p className="text-[13px] text-slate-500">Upload, view and download your documents from the Documents page.</p>
                <button
                  onClick={() => navigate("/documents")}
                  className="rounded-md bg-blue-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-blue-700"
                >
                  Go to Documents
                </button>
              </div>
            )}

            {/* ── BANK DETAILS ── */}
            {activeTab === "bank" && <ComingSoon title="Bank Details" />}

            {/* ── EDUCATION ── */}
            {activeTab === "education" && <ComingSoon title="Education & Certifications" />}

            {/* ── EMERGENCY CONTACT ── */}
            {activeTab === "emergency" && (
              <div className="max-w-md space-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">Emergency Contact</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-950">
                    {employee.emergency_contact ?? "Not provided"}
                  </p>
                </div>
                <button
                  onClick={() => setShowEdit(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700"
                >
                  <Edit3 className="h-4 w-4" />Update Emergency Contact
                </button>
              </div>
            )}

            {/* ── ACCOUNT & SECURITY ── */}
            {activeTab === "security" && (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <Lock className="h-12 w-12 text-slate-300" />
                <p className="text-[15px] font-semibold text-slate-700">Account & Security Settings</p>
                <p className="text-[13px] text-slate-500">Manage your password and security preferences in Settings.</p>
                <button
                  onClick={() => navigate("/settings")}
                  className="rounded-md bg-blue-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-blue-700"
                >
                  Go to Settings
                </button>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* ── Edit Profile Modal ── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[480px] rounded-lg bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-slate-950">Edit Profile</h2>
              <button onClick={() => setShowEdit(false)} className="text-slate-500 hover:text-slate-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1 text-[12px] font-semibold text-slate-700">
                Full Name *
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block space-y-1 text-[12px] font-semibold text-slate-700">
                Phone
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="+91 98765 43210"
                />
              </label>

              <label className="block space-y-1 text-[12px] font-semibold text-slate-700">
                Address
                <textarea
                  value={editForm.address}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block space-y-1 text-[12px] font-semibold text-slate-700">
                Bio
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Short professional bio..."
                />
              </label>

              <label className="block space-y-1 text-[12px] font-semibold text-slate-700">
                Emergency Contact
                <input
                  value={editForm.emergency_contact}
                  onChange={(e) => setEditForm((f) => ({ ...f, emergency_contact: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Name and phone number"
                />
              </label>
            </div>

            {editError && (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                {editError}
              </p>
            )}
            {editSuccess && (
              <p className="mt-4 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700">
                <Check className="h-4 w-4" />Profile updated successfully
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowEdit(false)}
                className="flex-1 rounded-md border border-slate-200 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={editLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {editLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
