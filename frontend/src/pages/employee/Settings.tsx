import {
  Bell,
  CalendarDays,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  Mail,
  Monitor,
  Palette,
  Search,
  Shield,
  SlidersHorizontal,
  Smartphone,
  User,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { employeeAPI, employeeExtAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Employee {
  name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
}

type Section = "account" | "security" | "notifications" | "privacy" | "preferences" | "appearance";

// ── Sub-components ─────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-blue-600" : "bg-slate-300"}`}
      aria-checked={on}
      role="switch"
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "right-0.5" : "left-0.5"
        }`}
      />
    </button>
  );
}

function StatusMessage({ type, text }: { type: "success" | "error"; text: string }) {
  return (
    <p
      className={`rounded-md px-3 py-2 text-[12px] font-semibold ${
        type === "success"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-600"
      }`}
    >
      {text}
    </p>
  );
}

function ComingSoon() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-[15px] font-semibold text-slate-700">Coming soon</p>
      <p className="text-[13px] text-slate-500">This settings section is not yet available.</p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Settings() {
  const navigate = useNavigate();

  // ── Employee data ─────────────────────────────────────────────────────────────
  const [employee,     setEmployee]     = useState<Employee | null>(null);
  const [dataLoading,  setDataLoading]  = useState(true);
  const [dataError,    setDataError]    = useState<string | null>(null);

  // ── Sidebar ───────────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<Section>("account");

  // ── Account form ──────────────────────────────────────────────────────────────
  const [name,    setName]    = useState("");
  const [phone,   setPhone]   = useState("");
  const [dob,     setDob]     = useState("");
  const [address, setAddress] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg,     setSaveMsg]     = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Change password ───────────────────────────────────────────────────────────
  const [currentPwd,   setCurrentPwd]   = useState("");
  const [newPwd,       setNewPwd]       = useState("");
  const [confirmPwd,   setConfirmPwd]   = useState("");
  const [showCurrent,  setShowCurrent]  = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [pwdLoading,   setPwdLoading]   = useState(false);
  const [pwdMsg,       setPwdMsg]       = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Notification preferences (local state only — no backend yet) ──────────────
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs,  setPushNotifs]  = useState(true);
  const [taskNotifs,  setTaskNotifs]  = useState(true);

  // ── Load employee ─────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    employeeAPI.getProfile()
      .then((data) => {
        if (cancelled) return;
        const emp = data as Employee;
        setEmployee(emp);
        setName(emp.name    ?? "");
        setPhone(emp.phone  ?? "");
        setDob(emp.date_of_birth ?? "");
        setAddress(emp.address  ?? "");
      })
      .catch((e: unknown) => {
        if (!cancelled) setDataError(e instanceof Error ? e.message : "Failed to load settings");
      })
      .finally(() => { if (!cancelled) setDataLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Save account ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!name.trim()) {
      setSaveMsg({ type: "error", text: "Full name is required" });
      return;
    }
    setSaveLoading(true);
    setSaveMsg(null);
    try {
      await employeeExtAPI.updateMyProfile({ name: name.trim(), phone, address });
      setEmployee((prev) => prev ? { ...prev, name: name.trim(), phone, address } : prev);
      setSaveMsg({ type: "success", text: "Profile updated successfully" });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e: unknown) {
      setSaveMsg({ type: "error", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────────

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdMsg({ type: "error", text: "All password fields are required" });
      return;
    }
    if (newPwd.length < 8) {
      setPwdMsg({ type: "error", text: "New password must be at least 8 characters" });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: "error", text: "New passwords do not match" });
      return;
    }
    setPwdLoading(true);
    setPwdMsg(null);
    try {
      await employeeExtAPI.changePassword(currentPwd, newPwd);
      setPwdMsg({ type: "success", text: "Password changed successfully" });
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setTimeout(() => setPwdMsg(null), 3000);
    } catch (e: unknown) {
      setPwdMsg({ type: "error", text: e instanceof Error ? e.message : "Password change failed" });
    } finally {
      setPwdLoading(false);
    }
  };

  // ── Sidebar menu ──────────────────────────────────────────────────────────────

  const menu: { key: Section; label: string; Icon: typeof User }[] = [
    { key: "account",       label: "Account",       Icon: User            },
    { key: "security",      label: "Security",      Icon: Lock            },
    { key: "notifications", label: "Notifications", Icon: Bell            },
    { key: "privacy",       label: "Privacy",       Icon: Shield          },
    { key: "preferences",   label: "Preferences",   Icon: SlidersHorizontal },
    { key: "appearance",    label: "Appearance",    Icon: Palette         },
  ];

  // ── Loading skeleton ──────────────────────────────────────────────────────────

  if (dataLoading) {
    return (
      <div className="min-h-full bg-[#f8fafc]">
        <div className="w-full space-y-4 p-4 lg:p-5">
          <Skeleton className="h-8 w-36 rounded" />
          <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_420px]">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-full bg-[#f8fafc] p-4 lg:p-5">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-slate-200 bg-white py-16 text-center">
          <p className="text-[15px] font-semibold text-slate-700">{dataError}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-[#f8fafc]">
      <div className="w-full space-y-4 p-4 lg:p-5">

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-slate-950">Settings</h1>
            <p className="mt-1 text-[14px] text-slate-500">Manage your account preferences and security</p>
          </div>
          <div className="relative w-full sm:w-[340px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Search settings..."
            />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_420px]">

          {/* ── Sidebar ── */}
          <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="space-y-1">
              {menu.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-[13px] font-semibold transition-colors ${
                    activeSection === key
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />{label}
                </button>
              ))}
            </div>
          </section>

          {/* ── Main content ── */}
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">

            {/* Account */}
            {activeSection === "account" && (
              <>
                <h2 className="text-[17px] font-semibold text-slate-950">Account Settings</h2>
                <div className="mt-5 grid gap-4">
                  <label className="block space-y-2 text-[12px] font-semibold text-slate-700">
                    Full Name
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block space-y-2 text-[12px] font-semibold text-slate-700">
                    Email Address
                    <input
                      value={employee?.email ?? ""}
                      readOnly
                      className="mt-1 h-10 w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 text-[13px] font-medium text-slate-500 outline-none"
                      title="Email cannot be changed"
                    />
                    <span className="text-[11px] font-normal text-slate-400">Email address cannot be changed.</span>
                  </label>

                  <label className="block space-y-2 text-[12px] font-semibold text-slate-700">
                    Phone Number
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block space-y-2 text-[12px] font-semibold text-slate-700">
                    Date of Birth
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block space-y-2 text-[12px] font-semibold text-slate-700">
                    Address
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={2}
                      className="mt-1 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-[12px] font-semibold text-slate-700">
                      Language
                      <select className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] font-medium text-slate-900 outline-none">
                        <option>English</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-[12px] font-semibold text-slate-700">
                      Timezone
                      <select className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] font-medium text-slate-900 outline-none">
                        <option>(GMT +05:30) Asia/Kolkata</option>
                      </select>
                    </label>
                  </div>

                  {saveMsg && <StatusMessage type={saveMsg.type} text={saveMsg.text} />}

                  <button
                    onClick={handleSave}
                    disabled={saveLoading}
                    className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-blue-600 px-5 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saveLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </>
            )}

            {/* Security */}
            {activeSection === "security" && (
              <>
                <h2 className="text-[17px] font-semibold text-slate-950">Change Password</h2>
                <div className="mt-5 grid gap-4 max-w-md">

                  <label className="block space-y-2 text-[12px] font-semibold text-slate-700">
                    Current Password
                    <div className="relative mt-1">
                      <input
                        type={showCurrent ? "text" : "password"}
                        value={currentPwd}
                        onChange={(e) => setCurrentPwd(e.target.value)}
                        className="h-10 w-full rounded-md border border-slate-200 px-3 pr-10 text-[13px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>

                  <label className="block space-y-2 text-[12px] font-semibold text-slate-700">
                    New Password
                    <div className="relative mt-1">
                      <input
                        type={showNew ? "text" : "password"}
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        className="h-10 w-full rounded-md border border-slate-200 px-3 pr-10 text-[13px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <span className="text-[11px] font-normal text-slate-400">Minimum 8 characters.</span>
                  </label>

                  <label className="block space-y-2 text-[12px] font-semibold text-slate-700">
                    Confirm New Password
                    <input
                      type="password"
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  {pwdMsg && <StatusMessage type={pwdMsg.type} text={pwdMsg.text} />}

                  <button
                    onClick={handleChangePassword}
                    disabled={pwdLoading}
                    className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-blue-600 px-5 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                  >
                    {pwdLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {pwdLoading ? "Changing..." : "Change Password"}
                  </button>
                </div>

                <div className="mt-8 divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {[
                    [Lock,        "Two-Factor Authentication", "Add an extra layer of security",   true],
                    [Monitor,     "Login Sessions",             "Manage your active sessions",      false],
                    [Smartphone,  "Trusted Devices",            "Manage trusted devices",           false],
                  ].map(([Icon, title, desc, badge]) => {
                    const RowIcon = Icon as typeof Lock;
                    return (
                      <button
                        key={title as string}
                        disabled
                        className="flex w-full cursor-not-allowed items-center gap-3 p-4 text-left opacity-60"
                      >
                        <RowIcon className="h-4 w-4 text-blue-600" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold text-slate-900">{title as string}</span>
                          <span className="text-[11px] text-slate-500">{desc as string}</span>
                        </span>
                        {badge && (
                          <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                            Coming soon
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Notifications */}
            {activeSection === "notifications" && (
              <>
                <h2 className="text-[17px] font-semibold text-slate-950">Notification Preferences</h2>
                <p className="mt-2 text-[13px] text-slate-500">
                  These preferences are saved locally. Backend sync coming soon.
                </p>
                <div className="mt-5 space-y-4">
                  {[
                    [Mail,        "Email Notifications", "Receive updates via email",    emailNotifs, () => setEmailNotifs((v) => !v)],
                    [Bell,        "Push Notifications",  "Receive push notifications",   pushNotifs,  () => setPushNotifs((v)  => !v)],
                    [CalendarDays,"Task Notifications",  "Get notified about tasks",     taskNotifs,  () => setTaskNotifs((v)  => !v)],
                  ].map(([Icon, title, desc, on, toggle]) => {
                    const RowIcon = Icon as typeof Mail;
                    return (
                      <div key={title as string} className="flex items-center gap-3">
                        <RowIcon className="h-5 w-5 shrink-0 text-slate-600" />
                        <div className="flex-1">
                          <p className="text-[13px] font-semibold text-slate-900">{title as string}</p>
                          <p className="text-[11px] text-slate-500">{desc as string}</p>
                        </div>
                        <Toggle on={on as boolean} onToggle={toggle as () => void} />
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => navigate("/notifications")}
                  className="mt-6 text-[12px] font-semibold text-blue-700 hover:underline"
                >
                  View all notifications →
                </button>
              </>
            )}

            {/* Privacy */}
            {activeSection === "privacy" && (
              <>
                <h2 className="text-[17px] font-semibold text-slate-950">Privacy Settings</h2>
                <div className="mt-5 space-y-4">
                  {[
                    [Eye,  "Profile Visibility",  "Who can see your profile"],
                    [User, "Contacts Visibility", "Who can see your contact details"],
                  ].map(([Icon, title, desc]) => {
                    const RowIcon = Icon as typeof Eye;
                    return (
                      <button
                        key={title as string}
                        disabled
                        className="flex w-full cursor-not-allowed items-center gap-3 text-left opacity-60"
                      >
                        <RowIcon className="h-4 w-4 text-slate-600" />
                        <span className="flex-1">
                          <span className="block text-[13px] font-semibold text-slate-900">{title as string}</span>
                          <span className="text-[11px] text-slate-500">{desc as string}</span>
                        </span>
                        <span className="text-[11px] text-slate-400">Coming soon</span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {activeSection === "preferences" && <ComingSoon />}
            {activeSection === "appearance"   && <ComingSoon />}
          </section>

          {/* ── Right panel — always shows security snapshot ── */}
          <div className="space-y-4">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <h2 className="text-[17px] font-semibold text-slate-950">Security Settings</h2>
              <div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-100">
                <button
                  onClick={() => setActiveSection("security")}
                  className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50"
                >
                  <Lock className="h-4 w-4 text-blue-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-slate-900">Change Password</span>
                    <span className="text-[11px] text-slate-500">Update your account password</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </button>
                {[
                  [Lock,        "Two-Factor Authentication", "Add an extra layer of security"],
                  [Monitor,     "Login Sessions",            "Manage your active sessions"],
                  [Smartphone,  "Trusted Devices",           "Manage trusted devices"],
                ].map(([Icon, title, desc]) => {
                  const RowIcon = Icon as typeof Lock;
                  return (
                    <button
                      key={title as string}
                      disabled
                      className="flex w-full cursor-not-allowed items-center gap-3 p-4 text-left opacity-60"
                    >
                      <RowIcon className="h-4 w-4 text-blue-600" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-slate-900">{title as string}</span>
                        <span className="text-[11px] text-slate-500">{desc as string}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <h2 className="text-[17px] font-semibold text-slate-950">Notification Preferences</h2>
              <div className="mt-5 space-y-4">
                {[
                  [Mail,        "Email Notifications",  emailNotifs, () => setEmailNotifs((v) => !v)],
                  [Bell,        "Push Notifications",   pushNotifs,  () => setPushNotifs((v)  => !v)],
                  [CalendarDays,"Task Notifications",   taskNotifs,  () => setTaskNotifs((v)  => !v)],
                ].map(([Icon, title, on, toggle]) => {
                  const RowIcon = Icon as typeof Mail;
                  return (
                    <div key={title as string} className="flex items-center gap-3">
                      <RowIcon className="h-5 w-5 text-slate-600" />
                      <p className="flex-1 text-[13px] font-semibold text-slate-900">{title as string}</p>
                      <Toggle on={on as boolean} onToggle={toggle as () => void} />
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => navigate("/notifications")}
                className="mt-5 text-[12px] font-semibold text-blue-700 hover:underline"
              >
                Manage All Notifications
              </button>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <h2 className="text-[17px] font-semibold text-slate-950">Privacy Settings</h2>
              <div className="mt-5 space-y-4">
                {[
                  [Eye,  "Profile Visibility",  "Who can see your profile"],
                  [User, "Contacts Visibility", "Who can see your contact details"],
                ].map(([Icon, title, desc]) => {
                  const RowIcon = Icon as typeof Eye;
                  return (
                    <button
                      key={title as string}
                      disabled
                      className="flex w-full cursor-not-allowed items-center gap-3 text-left opacity-60"
                    >
                      <RowIcon className="h-4 w-4 text-slate-600" />
                      <span className="flex-1">
                        <span className="block text-[13px] font-semibold text-slate-900">{title as string}</span>
                        <span className="text-[11px] text-slate-500">{desc as string}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
