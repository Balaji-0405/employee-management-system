import { useState, useMemo, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail, CheckCircle2, Shield, X } from "lucide-react";

import { useAuth } from "../lib/AuthContext";

// ── Logo SVG ──────────────────────────────────────────────────────────────────
function KadyLogo({ size = 48 }: { size?: number }) {
  const h = Math.round((size * 40) / 48);
  return (
    <svg width={size} height={h} viewBox="0 0 48 40" fill="none">
      <polyline
        points="2,2 22,20 2,38"
        stroke="#5CB85C"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="18,2 38,20 18,38"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
    </svg>
  );
}

function KadyLogoNav() {
  return (
    <svg width="36" height="30" viewBox="0 0 48 40" fill="none">
      <polyline
        points="2,2 22,20 2,38"
        stroke="#5CB85C"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="18,2 38,20 18,38"
        stroke="#00AEEF"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  "Smart Attendance Tracking",
  "Leave & Approval Workflows",
  "Automated Payroll Processing",
  "Real-time Team Analytics",
];

const BADGES = [
  { icon: Lock, label: "256-bit SSL" },
  { icon: Shield, label: "SOC 2 Compliant" },
  { icon: CheckCircle2, label: "GDPR Ready" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const greeting = useMemo(() => getGreeting(), []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#F0F7FF",
        backgroundImage: "radial-gradient(circle, #00AEEF22 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="fixed inset-x-0 top-0 z-20 flex h-14 items-center justify-between border-b border-slate-100 bg-white/90 px-6 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <KadyLogoNav />
          <div className="leading-tight">
            <p className="text-[13px] font-bold text-slate-800">
              kady innovations &amp; solutions LLP
            </p>
            <p className="text-[10px] font-medium" style={{ color: "#5CB85C" }}>
              Drives Technology
            </p>
          </div>
        </div>
        <p className="hidden text-[12px] text-slate-400 sm:block">
          Need help?{" "}
          <span className="font-medium" style={{ color: "#00AEEF" }}>
            support@kadyinnovations.com
          </span>
        </p>
      </nav>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="flex min-h-screen items-center justify-center px-4 pb-8 pt-20">
        <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-200/80">
          <div className="flex flex-col lg:flex-row">

            {/* ── Left panel ───────────────────────────────────────────── */}
            <div
              className="flex flex-col justify-between gap-10 p-10 lg:w-[45%] lg:rounded-l-2xl lg:p-12"
              style={{
                background: "linear-gradient(145deg, #00AEEF 0%, #0090cc 55%, #006fa3 100%)",
              }}
            >
              {/* Logo */}
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <KadyLogo size={44} />
                  <div>
                    <p className="text-[15px] font-bold text-white leading-tight">
                      kady innovations
                    </p>
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                      &amp; solutions LLP
                    </p>
                    <p
                      className="text-[10px] font-semibold tracking-wider mt-0.5"
                      style={{ color: "#a8e6a3" }}
                    >
                      Drives Technology
                    </p>
                  </div>
                </div>

                {/* Headline */}
                <h1 className="max-w-xs text-[30px] font-bold leading-tight text-white">
                  Empowering Your Workforce, Simplified.
                </h1>
                <p
                  className="mt-3 max-w-xs text-[13px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.72)" }}
                >
                  One platform for attendance, leave, payroll, and team management.
                </p>

                {/* Feature list */}
                <ul className="mt-8 space-y-3">
                  {FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-3">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{ background: "rgba(255,255,255,0.2)" }}
                      >
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </span>
                      <span className="text-[13px] font-medium text-white">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Testimonial — hidden on mobile */}
              <div
                className="hidden rounded-xl p-4 lg:block"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                <p className="text-[13px]" style={{ color: "#FFD700" }}>★★★★★</p>
                <p
                  className="mt-2 text-[13px] leading-relaxed italic"
                  style={{ color: "rgba(255,255,255,0.88)" }}
                >
                  "Transformed how we manage our 1,200+ employee workforce."
                </p>
                <div className="mt-3 flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: "rgba(255,255,255,0.25)" }}
                  >
                    HD
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-white">HR Director</p>
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                      Leading Tech Company
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right panel (form) ────────────────────────────────────── */}
            <div className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-12 lg:py-14">
              {/* Greeting */}
              <p className="text-[13px] text-slate-400">
                {greeting} 👋
              </p>

              <h2 className="mt-1 text-[26px] font-bold text-slate-900">
                Sign in to EMS PRO
              </h2>
              <p className="mt-1 text-[13px] text-slate-500">
                Enter your credentials to access your workspace
              </p>

              {/* Error banner */}
              {error && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <X className="h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-[13px] text-red-600">{error}</p>
                </div>
              )}

              {/* Form */}
              <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-[13px] font-semibold text-slate-700"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                      style={{ color: "#00AEEF" }}
                    />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@kadyinnovations.com"
                      required
                      className="h-12 w-full rounded-xl bg-white pl-10 pr-4 text-[14px] text-slate-900 placeholder-slate-400 outline-none transition-all"
                      style={{
                        border: "1.5px solid #E2E8F0",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.border = "1.5px solid #00AEEF";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,174,239,0.12)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.border = "1.5px solid #E2E8F0";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-[13px] font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                      style={{ color: "#00AEEF" }}
                    />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="h-12 w-full rounded-xl bg-white pl-10 pr-11 text-[14px] text-slate-900 placeholder-slate-400 outline-none transition-all"
                      style={{
                        border: "1.5px solid #E2E8F0",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.border = "1.5px solid #00AEEF";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,174,239,0.12)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.border = "1.5px solid #E2E8F0";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword
                        ? <EyeOff className="h-4 w-4" />
                        : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 accent-[#00AEEF]"
                    />
                    Remember me for 30 days
                  </label>
                  <button
                    type="button"
                    className="text-[13px] font-semibold transition hover:opacity-75"
                    style={{ color: "#00AEEF" }}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-xl text-[15px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "#00AEEF" }}
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Signing in…
                    </>
                  ) : (
                    <>Sign In &rarr;</>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Secure Access
                </span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              {/* Security badges */}
              <div className="flex items-center justify-center gap-6">
                {BADGES.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[11px] font-medium text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
