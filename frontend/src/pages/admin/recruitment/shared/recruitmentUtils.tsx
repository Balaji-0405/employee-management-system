import { useState, useRef, useEffect, useMemo } from "react";
import { Phone, Video, Users, ChevronDown, Search, Check, X } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

export type JobStatus = "Draft" | "Open" | "On Hold" | "Closed";
export type EmpType = "Full Time" | "Part Time" | "Contract" | "Internship";
export type Urgency = "Urgent" | "Normal";
export type CandidateStage = "Applied" | "Screening" | "Interview" | "Offer" | "Rejected";
export type CandidateSource = "LinkedIn" | "Referral" | "Direct" | "Agency";
export type InterviewType = "Phone" | "Video" | "In-person";
export type InterviewStatus = "Scheduled" | "Completed" | "Cancelled";
export type OfferStatus = "Pending" | "Accepted" | "Rejected" | "Expired";

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: EmpType;
  postedDate: string;
  closingDate: string;
  applicants: number;
  status: JobStatus;
  urgency: Urgency;
  recruiter: string;
  description: string;
  requirements: string;
  salaryMin: number;
  salaryMax: number;
}

export interface StageEvent {
  stage: CandidateStage;
  date: string;
  note: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  appliedFor: string;
  jobId: string;
  appliedDate: string;
  source: CandidateSource;
  stage: CandidateStage;
  matchScore: number;
  skills: string[];
  timeline: StageEvent[];
  feedback?: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  dayIdx: number;
  hour: number;
  date: string;
  time: string;
  type: InterviewType;
  interviewers: string[];
  status: InterviewStatus;
  notes?: string;
  feedbackRatings?: Record<string, number>;
  feedbackNotes?: string;
}

export interface Offer {
  id: string;
  candidateName: string;
  position: string;
  department?: string;
  offeredSalary: number;
  bonus?: number;
  offerDate: string;
  expiryDate: string;
  startDate: string;
  benefits: string;
  status: OfferStatus;
  specialConditions?: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const D = "We're looking for a talented professional to join our growing team. You will work on challenging problems and collaborate with cross-functional teams to deliver high-quality solutions that impact millions of users.";
const R = "• 3+ years of relevant experience\n• Strong problem-solving skills\n• Excellent communication\n• Experience with agile methodologies\n• Degree in relevant field preferred";

export const JOBS: Job[] = [
  { id: "JOB001", title: "Senior Frontend Engineer", department: "Engineering", location: "Bangalore", type: "Full Time", postedDate: "15 May 2026", closingDate: "30 Jun 2026", applicants: 24, status: "Open", urgency: "Urgent", recruiter: "Sneha Reddy", description: D, requirements: R, salaryMin: 15, salaryMax: 22 },
  { id: "JOB002", title: "Product Manager", department: "Product", location: "Remote", type: "Full Time", postedDate: "10 May 2026", closingDate: "25 Jun 2026", applicants: 18, status: "Open", urgency: "Normal", recruiter: "Sneha Reddy", description: D, requirements: R, salaryMin: 18, salaryMax: 28 },
  { id: "JOB003", title: "DevOps Engineer", department: "Engineering", location: "Pune", type: "Full Time", postedDate: "01 Jun 2026", closingDate: "15 Jul 2026", applicants: 12, status: "Open", urgency: "Urgent", recruiter: "Rahul Verma", description: D, requirements: R, salaryMin: 14, salaryMax: 20 },
  { id: "JOB004", title: "UX Designer", department: "Design", location: "Mumbai", type: "Full Time", postedDate: "20 Apr 2026", closingDate: "20 Jun 2026", applicants: 8, status: "On Hold", urgency: "Normal", recruiter: "Rahul Verma", description: D, requirements: R, salaryMin: 10, salaryMax: 16 },
  { id: "JOB005", title: "Sales Executive", department: "Sales", location: "Delhi", type: "Full Time", postedDate: "", closingDate: "31 Jul 2026", applicants: 0, status: "Draft", urgency: "Normal", recruiter: "Sneha Reddy", description: D, requirements: R, salaryMin: 8, salaryMax: 12 },
  { id: "JOB006", title: "Data Analyst", department: "Analytics", location: "Bangalore", type: "Full Time", postedDate: "05 May 2026", closingDate: "30 Jun 2026", applicants: 15, status: "Open", urgency: "Normal", recruiter: "Rahul Verma", description: D, requirements: R, salaryMin: 10, salaryMax: 15 },
  { id: "JOB007", title: "HR Business Partner", department: "HR", location: "Hyderabad", type: "Full Time", postedDate: "15 Mar 2026", closingDate: "30 Apr 2026", applicants: 32, status: "Closed", urgency: "Normal", recruiter: "Sneha Reddy", description: D, requirements: R, salaryMin: 8, salaryMax: 14 },
  { id: "JOB008", title: "Backend Developer", department: "Engineering", location: "Bangalore", type: "Full Time", postedDate: "", closingDate: "31 Jul 2026", applicants: 0, status: "Draft", urgency: "Normal", recruiter: "Rahul Verma", description: D, requirements: R, salaryMin: 12, salaryMax: 18 },
];

export const CANDIDATES: Candidate[] = [
  { id: "C001", name: "Priya Anand", email: "priya.anand@gmail.com", phone: "+91 98765 11111", appliedFor: "Senior Frontend Engineer", jobId: "JOB001", appliedDate: "18 May 2026", source: "LinkedIn", stage: "Interview", matchScore: 87, skills: ["React", "TypeScript", "Node.js", "CSS", "GraphQL"], timeline: [{ stage: "Applied", date: "18 May 2026", note: "Application received via LinkedIn" }, { stage: "Screening", date: "22 May 2026", note: "Phone screen completed — strong candidate" }, { stage: "Interview", date: "28 May 2026", note: "Technical round 1 scheduled" }], feedback: "Strong technical skills, good cultural fit. Recommended for offer." },
  { id: "C002", name: "Rahul Bhat", email: "rahul.bhat@gmail.com", phone: "+91 98765 22222", appliedFor: "Product Manager", jobId: "JOB002", appliedDate: "12 May 2026", source: "Referral", stage: "Offer", matchScore: 91, skills: ["Product Strategy", "Roadmapping", "Agile", "SQL", "User Research"], timeline: [{ stage: "Applied", date: "12 May 2026", note: "Referred by Priya Sharma" }, { stage: "Screening", date: "16 May 2026", note: "HR screen passed" }, { stage: "Interview", date: "23 May 2026", note: "3 rounds completed" }, { stage: "Offer", date: "01 Jun 2026", note: "Offer letter sent" }], feedback: "Exceptional product thinking. Top candidate." },
  { id: "C003", name: "Sneha Iyer", email: "sneha.iyer@gmail.com", phone: "+91 98765 33333", appliedFor: "DevOps Engineer", jobId: "JOB003", appliedDate: "03 Jun 2026", source: "Direct", stage: "Screening", matchScore: 72, skills: ["Kubernetes", "AWS", "CI/CD", "Terraform", "Docker"], timeline: [{ stage: "Applied", date: "03 Jun 2026", note: "Applied via career page" }, { stage: "Screening", date: "05 Jun 2026", note: "Resume shortlisted" }] },
  { id: "C004", name: "Kavya Reddy", email: "kavya.reddy@gmail.com", phone: "+91 98765 44444", appliedFor: "UX Designer", jobId: "JOB004", appliedDate: "25 Apr 2026", source: "Agency", stage: "Interview", matchScore: 78, skills: ["Figma", "User Research", "Prototyping", "Design Systems", "Accessibility"], timeline: [{ stage: "Applied", date: "25 Apr 2026", note: "Sourced via design agency" }, { stage: "Screening", date: "29 Apr 2026", note: "Portfolio review done" }, { stage: "Interview", date: "08 May 2026", note: "Design challenge in progress" }] },
  { id: "C005", name: "Arjun Kumar", email: "arjun.kumar@gmail.com", phone: "+91 98765 55555", appliedFor: "Data Analyst", jobId: "JOB006", appliedDate: "07 May 2026", source: "LinkedIn", stage: "Applied", matchScore: 65, skills: ["Python", "SQL", "Tableau", "Excel"], timeline: [{ stage: "Applied", date: "07 May 2026", note: "Application under review" }] },
  { id: "C006", name: "Meena Nair", email: "meena.nair@gmail.com", phone: "+91 98765 66666", appliedFor: "Senior Frontend Engineer", jobId: "JOB001", appliedDate: "20 May 2026", source: "Direct", stage: "Interview", matchScore: 83, skills: ["Vue.js", "React", "TypeScript", "Testing Library", "Webpack"], timeline: [{ stage: "Applied", date: "20 May 2026", note: "Direct application" }, { stage: "Screening", date: "25 May 2026", note: "Good communication skills" }, { stage: "Interview", date: "02 Jun 2026", note: "Technical round scheduled" }] },
  { id: "C007", name: "Siddharth Rao", email: "siddharth.rao@gmail.com", phone: "+91 98765 77777", appliedFor: "Product Manager", jobId: "JOB002", appliedDate: "14 May 2026", source: "LinkedIn", stage: "Screening", matchScore: 70, skills: ["Product Management", "Data Analysis", "Stakeholder Management"], timeline: [{ stage: "Applied", date: "14 May 2026", note: "Applied via LinkedIn" }, { stage: "Screening", date: "19 May 2026", note: "Initial screening scheduled" }] },
  { id: "C008", name: "Lakshmi Menon", email: "lakshmi.menon@gmail.com", phone: "+91 98765 88888", appliedFor: "HR Business Partner", jobId: "JOB007", appliedDate: "20 Mar 2026", source: "Referral", stage: "Rejected", matchScore: 55, skills: ["HRBP", "Talent Management", "Employee Relations"], timeline: [{ stage: "Applied", date: "20 Mar 2026", note: "Employee referral" }, { stage: "Screening", date: "25 Mar 2026", note: "Screening completed" }, { stage: "Interview", date: "01 Apr 2026", note: "Interview completed" }, { stage: "Rejected", date: "10 Apr 2026", note: "Experience level not matching" }] },
  { id: "C009", name: "Nitin Desai", email: "nitin.desai@gmail.com", phone: "+91 98765 99999", appliedFor: "DevOps Engineer", jobId: "JOB003", appliedDate: "02 Jun 2026", source: "Agency", stage: "Applied", matchScore: 68, skills: ["Linux", "AWS", "Jenkins", "Python"], timeline: [{ stage: "Applied", date: "02 Jun 2026", note: "Sourced via staffing agency" }] },
  { id: "C010", name: "Pooja Sharma", email: "pooja.sharma@gmail.com", phone: "+91 98765 10101", appliedFor: "Data Analyst", jobId: "JOB006", appliedDate: "08 May 2026", source: "LinkedIn", stage: "Offer", matchScore: 88, skills: ["Python", "SQL", "Power BI", "Statistics", "ML Basics"], timeline: [{ stage: "Applied", date: "08 May 2026", note: "LinkedIn apply" }, { stage: "Screening", date: "13 May 2026", note: "Strong analytical skills" }, { stage: "Interview", date: "20 May 2026", note: "3 rounds — excellent performance" }, { stage: "Offer", date: "01 Jun 2026", note: "Offer extended" }], feedback: "Best candidate in the pool." },
  { id: "C011", name: "Rohit Nair", email: "rohit.nair@gmail.com", phone: "+91 98765 11211", appliedFor: "Backend Developer", jobId: "JOB008", appliedDate: "04 Jun 2026", source: "Direct", stage: "Applied", matchScore: 60, skills: ["Java", "Spring Boot", "MySQL", "REST APIs"], timeline: [{ stage: "Applied", date: "04 Jun 2026", note: "Career page application" }] },
  { id: "C012", name: "Divya Patel", email: "divya.patel@gmail.com", phone: "+91 98765 12121", appliedFor: "Senior Frontend Engineer", jobId: "JOB001", appliedDate: "22 May 2026", source: "LinkedIn", stage: "Screening", matchScore: 74, skills: ["React", "JavaScript", "CSS", "Jest"], timeline: [{ stage: "Applied", date: "22 May 2026", note: "LinkedIn InMail" }, { stage: "Screening", date: "28 May 2026", note: "Resume shortlisted" }] },
];

export const INTERVIEWS: Interview[] = [
  { id: "IV001", candidateId: "C001", candidateName: "Priya Anand", jobTitle: "Senior Frontend Eng.", dayIdx: 0, hour: 10, date: "Mon, Jun 8", time: "10:00 AM", type: "Video", interviewers: ["Arun Kumar", "Lakshmi Menon"], status: "Scheduled", notes: "Technical round 2 — focus on system design" },
  { id: "IV002", candidateId: "C006", candidateName: "Meena Nair", jobTitle: "Senior Frontend Eng.", dayIdx: 1, hour: 14, date: "Tue, Jun 9", time: "2:00 PM", type: "In-person", interviewers: ["Arun Kumar", "Karan Mehta"], status: "Scheduled", notes: "Cultural fit round" },
  { id: "IV003", candidateId: "C004", candidateName: "Kavya Reddy", jobTitle: "UX Designer", dayIdx: 2, hour: 11, date: "Wed, Jun 10", time: "11:00 AM", type: "Phone", interviewers: ["Rahul Verma"], status: "Completed", feedbackRatings: { "Technical Skills": 4, Communication: 5, "Problem Solving": 4, "Cultural Fit": 5 }, feedbackNotes: "Excellent design portfolio. Creative and articulate." },
  { id: "IV004", candidateId: "C001", candidateName: "Priya Anand", jobTitle: "Senior Frontend Eng.", dayIdx: 3, hour: 15, date: "Thu, Jun 11", time: "3:00 PM", type: "Video", interviewers: ["Vikram Singh", "Rajesh Kumar"], status: "Scheduled", notes: "Final technical round with VP Engineering" },
  { id: "IV005", candidateId: "C003", candidateName: "Sneha Iyer", jobTitle: "DevOps Engineer", dayIdx: 4, hour: 10, date: "Fri, Jun 12", time: "10:00 AM", type: "Video", interviewers: ["Vikram Singh"], status: "Scheduled" },
];

export const OFFERS: Offer[] = [
  { id: "OF001", candidateName: "Rahul Bhat", position: "Product Manager", department: "Product", offeredSalary: 18, bonus: 2, offerDate: "03 Jun 2026", expiryDate: "17 Jun 2026", startDate: "01 Jul 2026", benefits: "Health insurance, 30 days PTO, ESOP, Remote-first policy", status: "Pending", specialConditions: "6-month performance review clause" },
  { id: "OF002", candidateName: "Pooja Sharma", position: "Data Analyst", department: "Analytics", offeredSalary: 12, bonus: 1, offerDate: "01 Jun 2026", expiryDate: "15 Jun 2026", startDate: "16 Jun 2026", benefits: "Health insurance, 25 days PTO, Learning budget ₹50K/yr", status: "Accepted" },
  { id: "OF003", candidateName: "Lakshmi Menon", position: "HR Business Partner", department: "HR", offeredSalary: 10, offerDate: "15 Apr 2026", expiryDate: "29 Apr 2026", startDate: "15 May 2026", benefits: "Health insurance, 25 days PTO", status: "Rejected" },
  { id: "OF004", candidateName: "Nitin Desai", position: "DevOps Engineer", department: "Engineering", offeredSalary: 14, bonus: 1, offerDate: "10 May 2026", expiryDate: "24 May 2026", startDate: "10 Jun 2026", benefits: "Health insurance, 25 days PTO, Remote work allowance", status: "Expired" },
];

export const DEPT_OPTIONS = ["Engineering", "Product", "Design", "HR", "Sales", "Finance", "Marketing", "Operations", "IT", "Analytics"];
export const RECRUITER_OPTIONS = ["Sneha Reddy", "Rahul Verma", "Arun Kumar", "Priya Sharma"];
export const EMPLOYEE_OPTIONS = ["Arun Kumar", "Vikram Singh", "Karan Mehta", "Priya Sharma", "Lakshmi Menon", "Rahul Verma", "Rajesh Kumar", "Sneha Reddy", "Anjali Mehta"];
export const INTERVIEW_FEEDBACK_CRITERIA = ["Technical Skills", "Communication", "Problem Solving", "Cultural Fit"];
export const STAGE_OPTIONS: CandidateStage[] = ["Applied", "Screening", "Interview", "Offer", "Rejected"];
export const SOURCE_OPTIONS: CandidateSource[] = ["LinkedIn", "Referral", "Direct", "Agency"];

// ── Helpers ────────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  "from-blue-400 to-indigo-500", "from-emerald-400 to-teal-500",
  "from-orange-400 to-amber-500", "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500", "from-cyan-400 to-sky-500",
  "from-lime-400 to-green-500", "from-fuchsia-400 to-pink-500",
];

export function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

export function avatarGradient(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

export function fmtHour(h: number) {
  return h < 12 ? `${h}:00 AM` : h === 12 ? "12:00 PM" : `${h - 12}:00 PM`;
}

// ── Shared Components ──────────────────────────────────────────────────────────

export function MiniAvatar({ name, size = "sm" }: { name: string; size?: "xs" | "sm" | "md" }) {
  const sizes = { xs: "h-6 w-6 text-[9px]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm" };
  return (
    <div className={`shrink-0 grid place-items-center rounded-full bg-gradient-to-br ${avatarGradient(name)} font-bold text-white ${sizes[size]}`}>
      {getInitials(name)}
    </div>
  );
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const s: Record<JobStatus, string> = {
    Draft: "bg-slate-100 text-slate-600", Open: "bg-green-50 text-green-700",
    "On Hold": "bg-amber-50 text-amber-700", Closed: "bg-rose-50 text-rose-700",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s[status]}`}>{status}</span>;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return urgency === "Urgent"
    ? <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">Urgent</span>
    : <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-50 text-slate-500">Normal</span>;
}

export function StageBadge({ stage }: { stage: CandidateStage }) {
  const s: Record<CandidateStage, string> = {
    Applied: "bg-slate-100 text-slate-600",
    Screening: "bg-blue-50 text-blue-700",
    Interview: "bg-violet-50 text-violet-700",
    Offer: "bg-amber-50 text-amber-700",
    Rejected: "bg-rose-50 text-rose-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s[stage]}`}>{stage}</span>;
}

export function SourceBadge({ source }: { source: CandidateSource }) {
  const s: Record<CandidateSource, string> = {
    LinkedIn: "bg-blue-50 text-blue-700", Referral: "bg-emerald-50 text-emerald-700",
    Direct: "bg-slate-100 text-slate-600", Agency: "bg-purple-50 text-purple-700",
  };
  return <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${s[source]}`}>{source}</span>;
}

export function IvTypeBadge({ type }: { type: InterviewType }) {
  const s: Record<InterviewType, string> = {
    Phone: "bg-green-100 text-green-700", Video: "bg-blue-100 text-blue-700", "In-person": "bg-purple-100 text-purple-700",
  };
  const Icon = type === "Phone" ? Phone : type === "Video" ? Video : Users;
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${s[type]}`}>
      <Icon className="h-2.5 w-2.5" />{type}
    </span>
  );
}

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const s: Record<OfferStatus, string> = {
    Pending: "bg-amber-50 text-amber-700", Accepted: "bg-green-50 text-green-700",
    Rejected: "bg-rose-50 text-rose-600", Expired: "bg-slate-100 text-slate-500",
  };
  const dot: Record<OfferStatus, string> = {
    Pending: "bg-amber-400", Accepted: "bg-green-500", Rejected: "bg-rose-500", Expired: "bg-slate-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s[status]}`}>
      {status === "Pending" && (
        <span className={`h-1.5 w-1.5 rounded-full ${dot[status]} animate-pulse`} />
      )}
      {status !== "Pending" && <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />}
      {status}
    </span>
  );
}

export function MatchRing({ score }: { score: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#22c55e" : score >= 65 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center">
      <svg className="absolute inset-0" width="36" height="36" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="18" cy="18" r={r} fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="text-[9px] font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

export function FilterDropdown({
  value, options, onChange, className = "",
}: { value: string; options: string[]; onChange: (v: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className={`relative ${className}`} ref={ref}>
      <button onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
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

// ── Schedule Interview Modal (shared: used by Candidates + InterviewPipeline) ──

export function ScheduleInterviewModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    candidateId: "", date: "", startTime: "", endTime: "",
    type: "" as InterviewType | "",
    interviewers: [] as string[],
    videoLink: "", location: "",
    candidateNotes: "", internalNotes: "", sendCalendarInvite: true,
  });
  const [empSearch, setEmpSearch] = useState("");

  function setF(k: string, v: unknown) { setForm((f) => ({ ...f, [k]: v })); }

  function toggleInterviewer(name: string) {
    setF("interviewers", form.interviewers.includes(name)
      ? form.interviewers.filter((i) => i !== name)
      : [...form.interviewers, name]);
  }

  const empResults = useMemo(() => {
    const q = empSearch.toLowerCase();
    return q ? EMPLOYEE_OPTIONS.filter((n) => n.toLowerCase().includes(q)) : EMPLOYEE_OPTIONS;
  }, [empSearch]);

  const selectedCandidate = CANDIDATES.find((c) => c.id === form.candidateId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">Schedule Interview</p>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Candidate<span className="text-red-500">*</span></label>
            <select value={form.candidateId} onChange={(e) => setF("candidateId", e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none">
              <option value="">Select candidate (Screening / Interview stage)…</option>
              {CANDIDATES.filter((c) => c.stage === "Screening" || c.stage === "Interview").map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.appliedFor}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Job Position<span className="text-red-500">*</span></label>
            <input type="text" readOnly
              value={selectedCandidate ? selectedCandidate.appliedFor : ""}
              placeholder="Auto-filled from candidate"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Date<span className="text-red-500">*</span></label>
              <input type="date" value={form.date} onChange={(e) => setF("date", e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Start Time<span className="text-red-500">*</span></label>
              <input type="time" value={form.startTime} onChange={(e) => setF("startTime", e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">End Time<span className="text-red-500">*</span></label>
              <input type="time" value={form.endTime} onChange={(e) => setF("endTime", e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Type<span className="text-red-500">*</span></label>
              <div className="flex gap-1.5 pt-1">
                {(["Phone", "Video", "In-person"] as InterviewType[]).map((t) => (
                  <button key={t} onClick={() => setF("type", t)}
                    className={`flex-1 rounded-lg border py-1.5 text-[11px] font-semibold ${form.type === t ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Interviewers<span className="text-red-500">*</span></label>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input type="text" value={empSearch} onChange={(e) => setEmpSearch(e.target.value)}
                placeholder="Search employees…"
                className="h-8 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-xs text-slate-700 focus:border-blue-400 focus:outline-none" />
            </div>
            <div className="max-h-28 overflow-y-auto rounded-lg border border-slate-200">
              {empResults.map((name) => (
                <button key={name} onClick={() => toggleInterviewer(name)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-slate-50 ${form.interviewers.includes(name) ? "bg-blue-50" : ""}`}>
                  <MiniAvatar name={name} size="xs" />
                  <span className={`flex-1 font-medium ${form.interviewers.includes(name) ? "text-blue-700" : "text-slate-700"}`}>{name}</span>
                  {form.interviewers.includes(name) && <Check className="h-3.5 w-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
            {form.interviewers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {form.interviewers.map((n) => (
                  <span key={n} className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {n}
                    <button onClick={() => toggleInterviewer(n)}><X className="h-2.5 w-2.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {form.type === "Video" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Video Link</label>
              <input type="text" value={form.videoLink} onChange={(e) => setF("videoLink", e.target.value)}
                placeholder="e.g. meet.google.com/abc-def-ghi"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
            </div>
          )}
          {form.type === "In-person" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Location</label>
              <input type="text" value={form.location} onChange={(e) => setF("location", e.target.value)}
                placeholder="e.g. Conference Room A, Floor 3"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Notes for Candidate</label>
            <textarea rows={2} value={form.candidateNotes} onChange={(e) => setF("candidateNotes", e.target.value)}
              placeholder="Instructions or information for the candidate…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Internal Notes</label>
            <textarea rows={2} value={form.internalNotes} onChange={(e) => setF("internalNotes", e.target.value)}
              placeholder="Notes for interviewers (not shown to candidate)…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={form.sendCalendarInvite}
              onChange={(e) => setF("sendCalendarInvite", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600" />
            <span className="text-xs font-medium text-slate-700">Send calendar invite to all participants</span>
          </label>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={onClose} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
