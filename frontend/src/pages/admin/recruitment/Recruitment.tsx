import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Plus,
  Search,
  ChevronDown,
  X,
  Check,
  Eye,
  Pencil,
  Calendar,
  Clock,
  Video,
  Phone,
  Users,
  MapPin,
  Mail,
  ArrowRight,
  Briefcase,
  FileText,
  User,
  Building2,
  MessageSquare,
  MoreVertical,
  Download,
  Send,
  Star,
  LayoutGrid,
  AlignJustify,
  Filter,
  UserPlus,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  RotateCcw,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type JobStatus = "Draft" | "Open" | "On Hold" | "Closed";
type EmpType = "Full Time" | "Part Time" | "Contract" | "Internship";
type Urgency = "Urgent" | "Normal";
type CandidateStage = "Applied" | "Screening" | "Interview" | "Offer" | "Rejected";
type CandidateSource = "LinkedIn" | "Referral" | "Direct" | "Agency";
type InterviewType = "Phone" | "Video" | "In-person";
type InterviewStatus = "Scheduled" | "Completed" | "Cancelled";
type OfferStatus = "Pending" | "Accepted" | "Rejected" | "Expired";

interface Job {
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

interface StageEvent {
  stage: CandidateStage;
  date: string;
  note: string;
}

interface Candidate {
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

interface Interview {
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

interface Offer {
  id: string;
  candidateName: string;
  position: string;
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

const JOBS: Job[] = [
  { id: "JOB001", title: "Senior Frontend Engineer", department: "Engineering", location: "Bangalore", type: "Full Time", postedDate: "15 May 2026", closingDate: "30 Jun 2026", applicants: 24, status: "Open", urgency: "Urgent", recruiter: "Sneha Reddy", description: D, requirements: R, salaryMin: 15, salaryMax: 22 },
  { id: "JOB002", title: "Product Manager", department: "Product", location: "Remote", type: "Full Time", postedDate: "10 May 2026", closingDate: "25 Jun 2026", applicants: 18, status: "Open", urgency: "Normal", recruiter: "Sneha Reddy", description: D, requirements: R, salaryMin: 18, salaryMax: 28 },
  { id: "JOB003", title: "DevOps Engineer", department: "Engineering", location: "Pune", type: "Full Time", postedDate: "01 Jun 2026", closingDate: "15 Jul 2026", applicants: 12, status: "Open", urgency: "Urgent", recruiter: "Rahul Verma", description: D, requirements: R, salaryMin: 14, salaryMax: 20 },
  { id: "JOB004", title: "UX Designer", department: "Design", location: "Mumbai", type: "Full Time", postedDate: "20 Apr 2026", closingDate: "20 Jun 2026", applicants: 8, status: "On Hold", urgency: "Normal", recruiter: "Rahul Verma", description: D, requirements: R, salaryMin: 10, salaryMax: 16 },
  { id: "JOB005", title: "Sales Executive", department: "Sales", location: "Delhi", type: "Full Time", postedDate: "", closingDate: "31 Jul 2026", applicants: 0, status: "Draft", urgency: "Normal", recruiter: "Sneha Reddy", description: D, requirements: R, salaryMin: 8, salaryMax: 12 },
  { id: "JOB006", title: "Data Analyst", department: "Analytics", location: "Bangalore", type: "Full Time", postedDate: "05 May 2026", closingDate: "30 Jun 2026", applicants: 15, status: "Open", urgency: "Normal", recruiter: "Rahul Verma", description: D, requirements: R, salaryMin: 10, salaryMax: 15 },
  { id: "JOB007", title: "HR Business Partner", department: "HR", location: "Hyderabad", type: "Full Time", postedDate: "15 Mar 2026", closingDate: "30 Apr 2026", applicants: 32, status: "Closed", urgency: "Normal", recruiter: "Sneha Reddy", description: D, requirements: R, salaryMin: 8, salaryMax: 14 },
  { id: "JOB008", title: "Backend Developer", department: "Engineering", location: "Bangalore", type: "Full Time", postedDate: "", closingDate: "31 Jul 2026", applicants: 0, status: "Draft", urgency: "Normal", recruiter: "Rahul Verma", description: D, requirements: R, salaryMin: 12, salaryMax: 18 },
];

const CANDIDATES: Candidate[] = [
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

const INTERVIEWS: Interview[] = [
  { id: "IV001", candidateId: "C001", candidateName: "Priya Anand", jobTitle: "Senior Frontend Eng.", dayIdx: 0, hour: 10, date: "Mon, Jun 8", time: "10:00 AM", type: "Video", interviewers: ["Arun Kumar", "Lakshmi Menon"], status: "Scheduled", notes: "Technical round 2 — focus on system design" },
  { id: "IV002", candidateId: "C006", candidateName: "Meena Nair", jobTitle: "Senior Frontend Eng.", dayIdx: 1, hour: 14, date: "Tue, Jun 9", time: "2:00 PM", type: "In-person", interviewers: ["Arun Kumar", "Karan Mehta"], status: "Scheduled", notes: "Cultural fit round" },
  { id: "IV003", candidateId: "C004", candidateName: "Kavya Reddy", jobTitle: "UX Designer", dayIdx: 2, hour: 11, date: "Wed, Jun 10", time: "11:00 AM", type: "Phone", interviewers: ["Rahul Verma"], status: "Completed", feedbackRatings: { Technical: 4, Communication: 5, "Problem Solving": 4, "Culture Fit": 5 }, feedbackNotes: "Excellent design portfolio. Creative and articulate." },
  { id: "IV004", candidateId: "C001", candidateName: "Priya Anand", jobTitle: "Senior Frontend Eng.", dayIdx: 3, hour: 15, date: "Thu, Jun 11", time: "3:00 PM", type: "Video", interviewers: ["Vikram Singh", "Rajesh Kumar"], status: "Scheduled", notes: "Final technical round with VP Engineering" },
  { id: "IV005", candidateId: "C003", candidateName: "Sneha Iyer", jobTitle: "DevOps Engineer", dayIdx: 4, hour: 10, date: "Fri, Jun 12", time: "10:00 AM", type: "Video", interviewers: ["Vikram Singh"], status: "Scheduled" },
];

const OFFERS: Offer[] = [
  { id: "OF001", candidateName: "Rahul Bhat", position: "Product Manager", offeredSalary: 18, bonus: 2, offerDate: "03 Jun 2026", expiryDate: "17 Jun 2026", startDate: "01 Jul 2026", benefits: "Health insurance, 30 days PTO, ESOP, Remote-first policy", status: "Pending", specialConditions: "6-month performance review clause" },
  { id: "OF002", candidateName: "Pooja Sharma", position: "Data Analyst", offeredSalary: 12, bonus: 1, offerDate: "01 Jun 2026", expiryDate: "15 Jun 2026", startDate: "16 Jun 2026", benefits: "Health insurance, 25 days PTO, Learning budget ₹50K/yr", status: "Accepted" },
  { id: "OF003", candidateName: "Lakshmi Menon", position: "HR Business Partner", offeredSalary: 10, offerDate: "15 Apr 2026", expiryDate: "29 Apr 2026", startDate: "15 May 2026", benefits: "Health insurance, 25 days PTO", status: "Rejected" },
  { id: "OF004", candidateName: "Nitin Desai", position: "DevOps Engineer", offeredSalary: 14, bonus: 1, offerDate: "10 May 2026", expiryDate: "24 May 2026", startDate: "10 Jun 2026", benefits: "Health insurance, 25 days PTO, Remote work allowance", status: "Expired" },
];

const FUNNEL = [
  { stage: "Applied", count: 109, color: "bg-slate-400" },
  { stage: "Screening", count: 34, color: "bg-blue-400" },
  { stage: "Interview", count: 18, color: "bg-violet-500" },
  { stage: "Offer", count: 6, color: "bg-amber-500" },
  { stage: "Hired", count: 4, color: "bg-green-500" },
];

const DEPT_OPTIONS = ["Engineering", "Product", "Design", "HR", "Sales", "Finance", "Marketing", "Operations", "IT", "Analytics"];
const RECRUITER_OPTIONS = ["Sneha Reddy", "Rahul Verma", "Arun Kumar", "Priya Sharma"];
const EMPLOYEE_OPTIONS = ["Arun Kumar", "Vikram Singh", "Karan Mehta", "Priya Sharma", "Lakshmi Menon", "Rahul Verma", "Rajesh Kumar", "Sneha Reddy", "Anjali Mehta"];
const INTERVIEW_FEEDBACK_CRITERIA = ["Technical", "Communication", "Problem Solving", "Culture Fit"];

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

function fmtHour(h: number) {
  return h < 12 ? `${h}:00 AM` : h === 12 ? "12:00 PM" : `${h - 12}:00 PM`;
}

// ── Shared Small Components ────────────────────────────────────────────────────

function MiniAvatar({ name, size = "sm" }: { name: string; size?: "xs" | "sm" | "md" }) {
  const sizes = { xs: "h-6 w-6 text-[9px]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm" };
  return (
    <div className={`shrink-0 grid place-items-center rounded-full bg-gradient-to-br ${avatarGradient(name)} font-bold text-white ${sizes[size]}`}>
      {getInitials(name)}
    </div>
  );
}

function JobStatusBadge({ status }: { status: JobStatus }) {
  const s: Record<JobStatus, string> = {
    Draft: "bg-slate-100 text-slate-600", Open: "bg-green-50 text-green-700",
    "On Hold": "bg-amber-50 text-amber-700", Closed: "bg-rose-50 text-rose-700",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s[status]}`}>{status}</span>;
}

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return urgency === "Urgent"
    ? <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">Urgent</span>
    : <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-50 text-slate-500">Normal</span>;
}

function StageBadge({ stage }: { stage: CandidateStage }) {
  const s: Record<CandidateStage, string> = {
    Applied: "bg-slate-100 text-slate-600",
    Screening: "bg-blue-50 text-blue-700",
    Interview: "bg-violet-50 text-violet-700",
    Offer: "bg-green-50 text-green-700",
    Rejected: "bg-rose-50 text-rose-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s[stage]}`}>{stage}</span>;
}

function SourceBadge({ source }: { source: CandidateSource }) {
  const s: Record<CandidateSource, string> = {
    LinkedIn: "bg-blue-50 text-blue-700", Referral: "bg-emerald-50 text-emerald-700",
    Direct: "bg-slate-100 text-slate-600", Agency: "bg-purple-50 text-purple-700",
  };
  return <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${s[source]}`}>{source}</span>;
}

function IvTypeBadge({ type }: { type: InterviewType }) {
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

function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const s: Record<OfferStatus, string> = {
    Pending: "bg-amber-50 text-amber-700", Accepted: "bg-green-50 text-green-700",
    Rejected: "bg-rose-50 text-rose-600", Expired: "bg-slate-100 text-slate-500",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s[status]}`}>{status}</span>;
}

function MatchRing({ score }: { score: number }) {
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

function FilterDropdown({
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

// ── Recruitment Funnel Summary ────────────────────────────────────────────────

function FunnelSummary() {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-800">Recruitment Pipeline</p>
          <p className="text-xs text-slate-400">Current cycle · Jun 2026</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">109 total applicants</span>
      </div>
      <div className="flex items-center gap-0">
        {FUNNEL.map((step, i) => {
          const next = FUNNEL[i + 1];
          const conv = next ? Math.round((next.count / step.count) * 100) : null;
          return (
            <React.Fragment key={step.stage}>
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${step.color}`} />
                  <span className="text-xs font-semibold text-slate-700">{step.stage}</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">{step.count}</span>
              </div>
              {conv !== null && (
                <div className="flex flex-1 items-center justify-center gap-1 px-2">
                  <div className="h-px flex-1 border-t-2 border-dashed border-slate-200" />
                  <span className="text-[10px] font-bold text-slate-400">{conv}%</span>
                  <ArrowRight className="h-3 w-3 text-slate-300" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Add Job Modal ──────────────────────────────────────────────────────────────

function AddJobModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    title: "", department: "", location: "", type: "", salaryMin: "", salaryMax: "",
    description: "", requirements: "", closingDate: "", recruiter: "", urgency: "Normal",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setF(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); }

  function submit(asDraft: boolean) {
    const req = ["title", "department", "location", "type", "closingDate"];
    const errs: Record<string, string> = {};
    req.forEach((k) => { if (!form[k as keyof typeof form]) errs[k] = "Required"; });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onClose();
    void asDraft;
  }

  function ic(f: string) {
    return `h-9 w-full rounded-lg border px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors[f] ? "border-red-400" : "border-slate-200 focus:border-blue-400"}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">Add Job Opening</p>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Job Title<span className="text-red-500">*</span></label>
              <input type="text" value={form.title} onChange={(e) => setF("title", e.target.value)} placeholder="e.g. Senior Software Engineer" className={ic("title")} />
              {errors.title && <p className="mt-0.5 text-xs text-red-500">{errors.title}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Department<span className="text-red-500">*</span></label>
              <select value={form.department} onChange={(e) => setF("department", e.target.value)} className={ic("department")}>
                <option value="">Select...</option>
                {DEPT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <p className="mt-0.5 text-xs text-red-500">{errors.department}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Location<span className="text-red-500">*</span></label>
              <input type="text" value={form.location} onChange={(e) => setF("location", e.target.value)} placeholder="e.g. Bangalore / Remote" className={ic("location")} />
              {errors.location && <p className="mt-0.5 text-xs text-red-500">{errors.location}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Employment Type<span className="text-red-500">*</span></label>
              <select value={form.type} onChange={(e) => setF("type", e.target.value)} className={ic("type")}>
                <option value="">Select...</option>
                {["Full Time", "Part Time", "Contract", "Internship"].map((t) => <option key={t}>{t}</option>)}
              </select>
              {errors.type && <p className="mt-0.5 text-xs text-red-500">{errors.type}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Closing Date<span className="text-red-500">*</span></label>
              <input type="date" value={form.closingDate} onChange={(e) => setF("closingDate", e.target.value)} className={ic("closingDate")} />
              {errors.closingDate && <p className="mt-0.5 text-xs text-red-500">{errors.closingDate}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Min Salary (LPA)</label>
              <input type="number" value={form.salaryMin} onChange={(e) => setF("salaryMin", e.target.value)} placeholder="e.g. 12" className={ic("salaryMin")} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Max Salary (LPA)</label>
              <input type="number" value={form.salaryMax} onChange={(e) => setF("salaryMax", e.target.value)} placeholder="e.g. 20" className={ic("salaryMax")} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Recruiter</label>
              <select value={form.recruiter} onChange={(e) => setF("recruiter", e.target.value)} className={ic("recruiter")}>
                <option value="">Select...</option>
                {RECRUITER_OPTIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700">Urgency</label>
              <div className="flex gap-2">
                {["Normal", "Urgent"].map((u) => (
                  <button key={u} onClick={() => setF("urgency", u)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${form.urgency === u ? (u === "Urgent" ? "border-red-400 bg-red-50 text-red-700" : "border-blue-400 bg-blue-50 text-blue-700") : "border-slate-200 text-slate-600"}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Job Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder="Describe the role and responsibilities..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Requirements</label>
            <textarea rows={3} value={form.requirements} onChange={(e) => setF("requirements", e.target.value)} placeholder="List the required skills and qualifications..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={() => submit(true)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Save as Draft</button>
          <button onClick={() => submit(false)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Send className="h-3.5 w-3.5" /> Post Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Job Kanban ─────────────────────────────────────────────────────────────────

const KANBAN_COLS: JobStatus[] = ["Draft", "Open", "On Hold", "Closed"];

const KANBAN_COL_STYLES: Record<JobStatus, { header: string; dot: string }> = {
  Draft: { header: "bg-slate-50 border-slate-200", dot: "bg-slate-400" },
  Open: { header: "bg-green-50 border-green-200", dot: "bg-green-500" },
  "On Hold": { header: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  Closed: { header: "bg-rose-50 border-rose-200", dot: "bg-rose-500" },
};

function JobKanbanCard({ job, onView }: { job: Job; onView: (j: Job) => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md cursor-pointer transition-shadow" onClick={() => onView(job)}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-slate-900 leading-tight">{job.title}</p>
        <UrgencyBadge urgency={job.urgency} />
      </div>
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />{job.department}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />{job.location}
        </div>
        {job.postedDate && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="h-3.5 w-3.5" />Posted {job.postedDate}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          <Users className="h-3 w-3" />{job.applicants}
        </span>
        <MiniAvatar name={job.recruiter} size="xs" />
      </div>
    </div>
  );
}

function JobKanbanView({ jobs, onView, onAdd }: { jobs: Job[]; onView: (j: Job) => void; onAdd: () => void }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {KANBAN_COLS.map((col) => {
        const colJobs = jobs.filter((j) => j.status === col);
        const { header, dot } = KANBAN_COL_STYLES[col];
        return (
          <div key={col} className={`rounded-xl border ${header} p-3`}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                <span className="text-sm font-bold text-slate-700">{col}</span>
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 border border-slate-200">{colJobs.length}</span>
            </div>
            <div className="space-y-3">
              {colJobs.map((j) => <JobKanbanCard key={j.id} job={j} onView={onView} />)}
            </div>
            {col === "Draft" || col === "Open" ? (
              <button onClick={onAdd} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2.5 text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600">
                <Plus className="h-3.5 w-3.5" /> Add Job
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function JobTableView({ jobs, onView }: { jobs: Job[]; onView: (j: Job) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
            {["Job Title", "Department", "Location", "Type", "Posted", "Applicants", "Status", "Actions"].map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{job.title}</p>
                  <p className="text-slate-400">{job.id}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-700">{job.department}</td>
              <td className="px-4 py-3 text-slate-700">{job.location}</td>
              <td className="px-4 py-3 text-slate-500">{job.type}</td>
              <td className="px-4 py-3 text-slate-500">{job.postedDate || "—"}</td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Users className="h-3.5 w-3.5 text-slate-400" />{job.applicants}
                </span>
              </td>
              <td className="px-4 py-3"><JobStatusBadge status={job.status} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <button onClick={() => onView(job)} className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-blue-50 hover:text-blue-600">
                    <Eye className="h-3.5 w-3.5" /> View
                  </button>
                  <button className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-slate-100">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  {job.status === "Open" && (
                    <button className="flex items-center gap-1 rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50">
                      Close
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

// ── Job Detail Modal ───────────────────────────────────────────────────────────

function JobDetailModal({ job, onClose }: { job: Job; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-bold text-slate-900">{job.title}</p>
              <JobStatusBadge status={job.status} />
              <UrgencyBadge urgency={job.urgency} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{job.id} · {job.department}</p>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[["Location", job.location], ["Type", job.type], ["Salary", `₹${job.salaryMin}–${job.salaryMax} LPA`], ["Posted", job.postedDate || "—"], ["Closing", job.closingDate], ["Recruiter", job.recruiter]].map(([l, v]) => (
              <div key={l}>
                <p className="text-slate-400">{l}</p>
                <p className="font-semibold text-slate-800">{v}</p>
              </div>
            ))}
            <div>
              <p className="text-slate-400">Applicants</p>
              <p className="font-bold text-slate-900 text-lg">{job.applicants}</p>
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Description</p>
            <p className="text-xs text-slate-700 whitespace-pre-line">{job.description}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Requirements</p>
            <p className="text-xs text-slate-700 whitespace-pre-line">{job.requirements}</p>
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
          <button className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Pencil className="h-3.5 w-3.5" /> Edit Job
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Job Openings Tab ───────────────────────────────────────────────────────────

function JobOpeningsTab() {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return JOBS.filter((j) => {
      const ms = !q || j.title.toLowerCase().includes(q) || j.department.toLowerCase().includes(q);
      const md = deptFilter === "All Departments" || j.department === deptFilter;
      const ms2 = statusFilter === "All Status" || j.status === statusFilter;
      return ms && md && ms2;
    });
  }, [search, deptFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
        <FilterDropdown value={deptFilter} options={["All Departments", ...DEPT_OPTIONS]} onChange={setDeptFilter} className="min-w-[150px]" />
        <FilterDropdown value={statusFilter} options={["All Status", "Draft", "Open", "On Hold", "Closed"]} onChange={setStatusFilter} className="min-w-[120px]" />
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
          <button onClick={() => setView("kanban")} className={`flex h-8 w-8 items-center justify-center rounded-md ${view === "kanban" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setView("table")} className={`flex h-8 w-8 items-center justify-center rounded-md ${view === "table" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
            <AlignJustify className="h-4 w-4" />
          </button>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700">
          <Plus className="h-3.5 w-3.5" /> Add Job
        </button>
      </div>
      {view === "kanban"
        ? <JobKanbanView jobs={filtered} onView={setViewingJob} onAdd={() => setShowAddModal(true)} />
        : <JobTableView jobs={filtered} onView={setViewingJob} />
      }
      {showAddModal && <AddJobModal onClose={() => setShowAddModal(false)} />}
      {viewingJob && <JobDetailModal job={viewingJob} onClose={() => setViewingJob(null)} />}
    </div>
  );
}

// ── Candidate Detail Panel ─────────────────────────────────────────────────────

const STAGE_ORDER: CandidateStage[] = ["Applied", "Screening", "Interview", "Offer", "Rejected"];

function CandidateDetailPanel({ candidate, onClose, onSchedule, onReject }: {
  candidate: Candidate;
  onClose: () => void;
  onSchedule: () => void;
  onReject: (id: string) => void;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="shrink-0 border-b border-slate-100 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <MiniAvatar name={candidate.name} size="md" />
            <div>
              <p className="font-bold text-slate-900">{candidate.name}</p>
              <p className="text-xs text-slate-500">{candidate.appliedFor}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <StageBadge stage={candidate.stage} />
                <SourceBadge source={candidate.source} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><p className="text-slate-400">Email</p><p className="font-semibold text-slate-800 truncate">{candidate.email}</p></div>
          <div><p className="text-slate-400">Phone</p><p className="font-semibold text-slate-800">{candidate.phone}</p></div>
          <div><p className="text-slate-400">Applied</p><p className="font-semibold text-slate-800">{candidate.appliedDate}</p></div>
          <div><p className="text-slate-400">Match Score</p><div className="mt-0.5 flex items-center gap-2"><MatchRing score={candidate.matchScore} /><span className="text-sm font-bold text-slate-800">{candidate.matchScore}%</span></div></div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {candidate.skills.map((s) => (
              <span key={s} className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{s}</span>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Timeline</p>
          <div className="space-y-3">
            {candidate.timeline.map((ev, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-3 w-3 rounded-full border-2 ${ev.stage === "Rejected" ? "border-rose-400 bg-rose-100" : "border-blue-500 bg-blue-500"}`} />
                  {i < candidate.timeline.length - 1 && <div className="mt-1 h-full w-px bg-slate-200" />}
                </div>
                <div className="pb-3 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800">{ev.stage}</span>
                    <span className="text-[11px] text-slate-400">{ev.date}</span>
                  </div>
                  <p className="text-xs text-slate-500">{ev.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {candidate.feedback && (
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Feedback</p>
            <p className="text-xs text-slate-700 italic">"{candidate.feedback}"</p>
          </div>
        )}

        {showRejectForm && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="mb-2 text-xs font-semibold text-red-700">Rejection Reason</p>
            <textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Briefly explain the reason..."
              className="w-full rounded border border-red-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none" />
            <div className="mt-2 flex gap-2">
              <button onClick={() => { onReject(candidate.id); setShowRejectForm(false); }} className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700">Confirm Reject</button>
              <button onClick={() => setShowRejectForm(false)} className="rounded border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-white">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-100 p-4 space-y-2">
        <button onClick={onSchedule} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
          <Calendar className="h-3.5 w-3.5" /> Schedule Interview
        </button>
        {candidate.stage === "Interview" && (
          <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700">
            <Send className="h-3.5 w-3.5" /> Make Offer
          </button>
        )}
        {candidate.stage !== "Rejected" && (
          <button onClick={() => setShowRejectForm(true)} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
            <X className="h-3.5 w-3.5" /> Reject
          </button>
        )}
      </div>
    </div>
  );
}

// ── Candidates Tab ─────────────────────────────────────────────────────────────

const STAGE_OPTIONS: CandidateStage[] = ["Applied", "Screening", "Interview", "Offer", "Rejected"];
const SOURCE_OPTIONS: CandidateSource[] = ["LinkedIn", "Referral", "Direct", "Agency"];

function CandidatesTab({ onScheduleInterview }: { onScheduleInterview: () => void }) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [stageFilter, setStageFilter] = useState("All Stages");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return CANDIDATES.filter((c) => {
      const ms = !q || c.name.toLowerCase().includes(q) || c.appliedFor.toLowerCase().includes(q);
      const md = deptFilter === "All Departments" || JOBS.find((j) => j.id === c.jobId)?.department === deptFilter;
      const mst = stageFilter === "All Stages" || c.stage === stageFilter;
      const mso = sourceFilter === "All Sources" || c.source === sourceFilter;
      return ms && md && mst && mso;
    });
  }, [search, deptFilter, stageFilter, sourceFilter]);

  const selected = selectedId ? CANDIDATES.find((c) => c.id === selectedId) : null;

  return (
    <div className="flex gap-5">
      {/* Left: Filter Panel */}
      <aside className="w-48 shrink-0 space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">Department</p>
          <div className="space-y-1">
            {["All Departments", ...DEPT_OPTIONS.slice(0, 5)].map((d) => (
              <button key={d} onClick={() => setDeptFilter(d)}
                className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors ${deptFilter === d ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600 hover:bg-slate-100"}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">Stage</p>
          <div className="space-y-1">
            {["All Stages", ...STAGE_OPTIONS].map((s) => (
              <button key={s} onClick={() => setStageFilter(s)}
                className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors ${stageFilter === s ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600 hover:bg-slate-100"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">Source</p>
          <div className="space-y-1">
            {["All Sources", ...SOURCE_OPTIONS].map((s) => (
              <button key={s} onClick={() => setSourceFilter(s)}
                className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors ${sourceFilter === s ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600 hover:bg-slate-100"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Right: Candidate cards + optional detail panel */}
      <div className="flex min-w-0 flex-1 gap-4">
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search candidates..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <p className="text-xs text-slate-500 shrink-0">{filtered.length} candidates</p>
          </div>

          <div className={`grid gap-3 ${selected ? "grid-cols-2" : "grid-cols-3"}`}>
            {filtered.map((c) => (
              <div key={c.id}
                onClick={() => setSelectedId((id) => (id === c.id ? null : c.id))}
                className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${selectedId === c.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <MiniAvatar name={c.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{c.name}</p>
                      <p className="truncate text-xs text-slate-500">{c.appliedFor}</p>
                    </div>
                  </div>
                  <MatchRing score={c.matchScore} />
                </div>
                <div className="mb-2.5 flex flex-wrap gap-1">
                  <StageBadge stage={c.stage} />
                  <SourceBadge source={c.source} />
                </div>
                <p className="text-[11px] text-slate-400">Applied {c.appliedDate}</p>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div className="flex gap-1.5 text-slate-400">
                    <button onClick={(e) => { e.stopPropagation(); }} title="View CV" className="grid h-6 w-6 place-items-center rounded hover:bg-slate-100 hover:text-slate-600"><FileText className="h-3.5 w-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onScheduleInterview(); }} title="Schedule" className="grid h-6 w-6 place-items-center rounded hover:bg-slate-100 hover:text-slate-600"><Calendar className="h-3.5 w-3.5" /></button>
                    <button onClick={(e) => e.stopPropagation()} title="Move Stage" className="grid h-6 w-6 place-items-center rounded hover:bg-slate-100 hover:text-slate-600"><ChevronRight className="h-3.5 w-3.5" /></button>
                    <button onClick={(e) => e.stopPropagation()} title="Reject" className="grid h-6 w-6 place-items-center rounded text-rose-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
              <p className="text-sm text-slate-400">No candidates match your filters.</p>
            </div>
          )}
        </div>

        {selected && (
          <div className="w-[300px] shrink-0 sticky top-0 h-[calc(100vh-200px)]">
            <CandidateDetailPanel
              candidate={selected}
              onClose={() => setSelectedId(null)}
              onSchedule={onScheduleInterview}
              onReject={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Schedule Interview Modal ───────────────────────────────────────────────────

function ScheduleInterviewModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    candidateId: "", jobId: "", date: "", time: "", type: "", interviewers: [] as string[], location: "", notes: "",
  });
  const [empSearch, setEmpSearch] = useState("");

  function setF(k: string, v: unknown) { setForm((f) => ({ ...f, [k]: v })); }

  function toggleInterviewer(name: string) {
    setF("interviewers", form.interviewers.includes(name) ? form.interviewers.filter((i) => i !== name) : [...form.interviewers, name]);
  }

  const empResults = useMemo(() => {
    const q = empSearch.toLowerCase();
    return q ? EMPLOYEE_OPTIONS.filter((n) => n.toLowerCase().includes(q)) : EMPLOYEE_OPTIONS;
  }, [empSearch]);

  function ic(f: string) {
    return `h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${!form[f as keyof typeof form] ? "" : ""}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">Schedule Interview</p>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Candidate<span className="text-red-500">*</span></label>
            <select value={form.candidateId} onChange={(e) => setF("candidateId", e.target.value)} className={ic("candidateId")}>
              <option value="">Select candidate...</option>
              {CANDIDATES.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.appliedFor}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Job Position<span className="text-red-500">*</span></label>
            <select value={form.jobId} onChange={(e) => setF("jobId", e.target.value)} className={ic("jobId")}>
              <option value="">Select position...</option>
              {JOBS.filter((j) => j.status === "Open").map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Date<span className="text-red-500">*</span></label>
              <input type="date" value={form.date} onChange={(e) => setF("date", e.target.value)} className={ic("date")} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Time<span className="text-red-500">*</span></label>
              <input type="time" value={form.time} onChange={(e) => setF("time", e.target.value)} className={ic("time")} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Interview Type<span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {(["Phone", "Video", "In-person"] as InterviewType[]).map((t) => (
                <button key={t} onClick={() => setF("type", t)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${form.type === t ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {t === "Phone" ? <Phone className="h-3 w-3" /> : t === "Video" ? <Video className="h-3 w-3" /> : <Users className="h-3 w-3" />}{t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Interviewers (multi-select)</label>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input type="text" value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} placeholder="Search employees..."
                className="h-8 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-xs text-slate-700 focus:border-blue-400 focus:outline-none" />
            </div>
            <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200">
              {empResults.map((name) => (
                <button key={name} onClick={() => toggleInterviewer(name)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 ${form.interviewers.includes(name) ? "bg-blue-50" : ""}`}>
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
                    {n}<button onClick={() => toggleInterviewer(n)}><X className="h-2.5 w-2.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Location / Meeting Link</label>
            <input type="text" value={form.location} onChange={(e) => setF("location", e.target.value)} placeholder="e.g. Conference Room A / meet.google.com/xxx" className={ic("location")} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setF("notes", e.target.value)} placeholder="Any notes for the interviewers..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={onClose} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Calendar className="h-4 w-4" /> Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Interview Detail Popover ───────────────────────────────────────────────────

function FeedbackForm({ interview, onClose }: { interview: Interview; onClose: () => void }) {
  const [ratings, setRatings] = useState<Record<string, number>>(interview.feedbackRatings ?? {});
  const [notes, setNotes] = useState(interview.feedbackNotes ?? "");

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 space-y-3">
      <p className="text-xs font-bold text-slate-700">Add Feedback</p>
      {INTERVIEW_FEEDBACK_CRITERIA.map((c) => (
        <div key={c}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-slate-600">{c}</span>
            <span className="text-xs font-bold text-slate-700">{ratings[c] ?? 0}/5</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRatings((r) => ({ ...r, [c]: n }))}
                className={`h-6 w-6 rounded ${(ratings[c] ?? 0) >= n ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-400"} text-xs font-bold`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Notes</label>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Overall assessment..."
          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none" />
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Submit Feedback</button>
        <button onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button>
      </div>
    </div>
  );
}

function InterviewDetailPopover({ interview, onClose, onReschedule, onCancel }: {
  interview: Interview;
  onClose: () => void;
  onReschedule: () => void;
  onCancel: (id: string) => void;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute left-full top-0 z-50 ml-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{interview.candidateName}</p>
          <p className="text-xs text-slate-500">{interview.jobTitle}</p>
        </div>
        <button onClick={onClose} className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="space-y-2 text-xs mb-3">
        <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-slate-400" /><span>{interview.date} · {interview.time}</span></div>
        <div className="flex items-center gap-2"><IvTypeBadge type={interview.type} /></div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500">Interviewers:</span>
          {interview.interviewers.map((n) => (
            <span key={n} className="flex items-center gap-1">
              <MiniAvatar name={n} size="xs" />
              <span className="text-slate-700">{n}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${interview.status === "Completed" ? "bg-green-50 text-green-700" : interview.status === "Cancelled" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-700"}`}>
            {interview.status}
          </span>
        </div>
        {interview.notes && <p className="text-slate-500 italic">"{interview.notes}"</p>}
      </div>
      {!showFeedback && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button onClick={() => setShowFeedback(true)} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            <MessageSquare className="h-3 w-3" /> Add Feedback
          </button>
          <button onClick={() => { onReschedule(); onClose(); }} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <RotateCcw className="h-3 w-3" /> Reschedule
          </button>
          <button onClick={() => { onCancel(interview.id); onClose(); }} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
            <X className="h-3 w-3" /> Cancel
          </button>
        </div>
      )}
      {showFeedback && <FeedbackForm interview={interview} onClose={() => setShowFeedback(false)} />}
    </div>
  );
}

// ── Interviews Calendar ────────────────────────────────────────────────────────

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const WEEK_DATES = ["Jun 8", "Jun 9", "Jun 10", "Jun 11", "Jun 12"];

const IV_TYPE_CELL_STYLES: Record<InterviewType, string> = {
  Phone: "bg-green-100 border border-green-300 text-green-800",
  Video: "bg-blue-100 border border-blue-300 text-blue-800",
  "In-person": "bg-purple-100 border border-purple-300 text-purple-800",
};

function InterviewBlock({ interview, onBlockClick }: {
  interview: Interview;
  onBlockClick: (iv: Interview, e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onBlockClick(interview, e); }}
      className={`cursor-pointer rounded-md p-1.5 text-[10px] leading-tight ${IV_TYPE_CELL_STYLES[interview.type]} hover:opacity-80 transition-opacity`}
    >
      <p className="font-bold truncate">{interview.candidateName}</p>
      <p className="truncate opacity-75">{interview.jobTitle}</p>
      <div className="mt-1 flex items-center gap-1 flex-wrap">
        <IvTypeBadge type={interview.type} />
        <span className="opacity-60">
          {interview.interviewers.map((n) => getInitials(n)).join(", ")}
        </span>
      </div>
    </div>
  );
}

function CalendarWeekView({ interviews, onBlockClick }: {
  interviews: Interview[];
  onBlockClick: (iv: Interview, e: React.MouseEvent) => void;
}) {
  function getSlot(dayIdx: number, hour: number) {
    return interviews.filter((iv) => iv.dayIdx === dayIdx && iv.hour === hour);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-16 border-b border-r border-slate-200 bg-slate-50 p-2 text-center text-[11px] font-semibold text-slate-500">Time</th>
            {DAYS.map((d, i) => (
              <th key={d} className="border-b border-r border-slate-200 bg-slate-50 p-2 text-center last:border-r-0">
                <p className="font-bold text-slate-700">{d}</p>
                <p className="text-[11px] text-slate-400">{WEEK_DATES[i]}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => (
            <tr key={hour} className="group">
              <td className="border-b border-r border-slate-100 bg-slate-50 px-2 py-1 text-center text-[11px] font-medium text-slate-400 w-16">{fmtHour(hour)}</td>
              {DAYS.map((_, dayIdx) => {
                const slots = getSlot(dayIdx, hour);
                return (
                  <td key={dayIdx} className="relative border-b border-r border-slate-100 p-1 h-[60px] align-top last:border-r-0 hover:bg-slate-50">
                    {slots.map((iv) => (
                      <InterviewBlock key={iv.id} interview={iv} onBlockClick={onBlockClick} />
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Interviews Tab ─────────────────────────────────────────────────────────────

function InterviewsTab() {
  const [interviews, setInterviews] = useState<Interview[]>(INTERVIEWS);
  const [showSchedule, setShowSchedule] = useState(false);
  const [activePopover, setActivePopover] = useState<Interview | null>(null);

  function handleCancel(id: string) {
    setInterviews((prev) => prev.map((iv) => iv.id === id ? { ...iv, status: "Cancelled" } : iv));
  }

  const upcoming = interviews.filter((iv) => iv.status === "Scheduled");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
          <p className="text-sm font-semibold text-slate-700">Week of Jun 8 – 12, 2026</p>
          <button className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <button onClick={() => setShowSchedule(true)} className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700">
          <Plus className="h-3.5 w-3.5" /> Schedule Interview
        </button>
      </div>

      <div className="relative">
        <CalendarWeekView
          interviews={interviews}
          onBlockClick={(iv) => setActivePopover((prev) => (prev?.id === iv.id ? null : iv))}
        />
        {activePopover && (
          <div className="absolute top-16 z-50" style={{ left: `${(activePopover.dayIdx + 1) * 20}%` }}>
            <InterviewDetailPopover
              interview={activePopover}
              onClose={() => setActivePopover(null)}
              onReschedule={() => setShowSchedule(true)}
              onCancel={handleCancel}
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">Upcoming This Week</p>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{upcoming.length} scheduled</span>
        </div>
        <div className="divide-y divide-slate-100">
          {upcoming.length === 0 && (
            <p className="px-5 py-4 text-xs text-slate-400">No upcoming interviews scheduled.</p>
          )}
          {upcoming.map((iv) => (
            <div key={iv.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
              <div className="w-24 shrink-0 text-center">
                <p className="text-xs font-bold text-slate-700">{iv.date.split(",")[0]}</p>
                <p className="text-xs text-slate-500">{iv.time}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{iv.candidateName}</p>
                <p className="truncate text-xs text-slate-500">{iv.jobTitle}</p>
              </div>
              <IvTypeBadge type={iv.type} />
              <div className="flex -space-x-1">
                {iv.interviewers.map((n) => <MiniAvatar key={n} name={n} size="xs" />)}
              </div>
              <button onClick={() => setActivePopover(iv)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {showSchedule && <ScheduleInterviewModal onClose={() => setShowSchedule(false)} />}
    </div>
  );
}

// ── Create Offer Modal ─────────────────────────────────────────────────────────

function OfferLetterModal({ offer }: { offer: Partial<Offer> & { candidateName: string; position: string } }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm leading-relaxed max-w-2xl mx-auto font-serif">
      <div className="mb-6 border-b-2 border-blue-600 pb-4">
        <p className="text-xl font-bold text-blue-700">TechCorp Solutions Pvt. Ltd.</p>
        <p className="text-xs text-slate-500">123, Innovation Park, Bangalore – 560001 · hr@techcorp.in</p>
      </div>
      <p className="mb-2 text-slate-500 text-xs">{offer.offerDate ?? "—"}</p>
      <p className="mb-4 font-semibold text-slate-900">Dear {offer.candidateName},</p>
      <p className="mb-4 text-slate-700">We are pleased to extend an offer of employment for the position of <strong>{offer.position}</strong> at TechCorp Solutions Pvt. Ltd. This offer is subject to the terms and conditions outlined below.</p>
      <div className="mb-4 rounded-lg bg-slate-50 p-4 text-xs space-y-2">
        <div className="flex justify-between"><span className="text-slate-500">Position:</span><span className="font-semibold text-slate-800">{offer.position}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Start Date:</span><span className="font-semibold text-slate-800">{offer.startDate ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Base Salary:</span><span className="font-semibold text-slate-800">₹{offer.offeredSalary ?? "—"} LPA</span></div>
        {offer.bonus && <div className="flex justify-between"><span className="text-slate-500">Annual Bonus:</span><span className="font-semibold text-slate-800">₹{offer.bonus} LPA</span></div>}
        <div className="flex justify-between"><span className="text-slate-500">Offer Expires:</span><span className="font-semibold text-red-600">{offer.expiryDate ?? "—"}</span></div>
      </div>
      <p className="mb-2 text-slate-700"><strong>Benefits:</strong> {offer.benefits}</p>
      {offer.specialConditions && <p className="mb-4 text-slate-700"><strong>Special Conditions:</strong> {offer.specialConditions}</p>}
      <p className="mb-6 text-slate-700">Please sign and return this letter by the expiry date to confirm your acceptance. We look forward to welcoming you to the team.</p>
      <div className="grid grid-cols-2 gap-8 mt-8">
        <div><div className="h-12 border-b border-slate-400" /><p className="mt-1 text-xs text-slate-500">Authorized Signatory</p></div>
        <div><div className="h-12 border-b border-slate-400" /><p className="mt-1 text-xs text-slate-500">Candidate Signature & Date</p></div>
      </div>
    </div>
  );
}

function CreateOfferModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    candidateName: "", position: "", offerDate: "", expiryDate: "", offeredSalary: "", bonus: "",
    benefits: "", startDate: "", specialConditions: "",
  });
  const [showPreview, setShowPreview] = useState(false);

  function setF(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function ic() { return "h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"; }

  if (showPreview) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
            <p className="text-base font-bold text-slate-900">Offer Letter Preview</p>
            <button onClick={() => setShowPreview(false)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <OfferLetterModal offer={{ ...form, offeredSalary: Number(form.offeredSalary), bonus: form.bonus ? Number(form.bonus) : undefined }} />
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button onClick={() => setShowPreview(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to Form</button>
            <button onClick={onClose} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Send className="h-4 w-4" /> Send Offer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">Create Offer</p>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Candidate<span className="text-red-500">*</span></label>
            <select value={form.candidateName} onChange={(e) => setF("candidateName", e.target.value)} className={ic()}>
              <option value="">Select candidate...</option>
              {CANDIDATES.filter((c) => c.stage === "Interview" || c.stage === "Offer").map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Position<span className="text-red-500">*</span></label>
            <select value={form.position} onChange={(e) => setF("position", e.target.value)} className={ic()}>
              <option value="">Select position...</option>
              {JOBS.map((j) => <option key={j.id}>{j.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Offer Date<span className="text-red-500">*</span></label>
              <input type="date" value={form.offerDate} onChange={(e) => setF("offerDate", e.target.value)} className={ic()} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Expiry Date<span className="text-red-500">*</span></label>
              <input type="date" value={form.expiryDate} onChange={(e) => setF("expiryDate", e.target.value)} className={ic()} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Base Salary (LPA)<span className="text-red-500">*</span></label>
              <input type="number" value={form.offeredSalary} onChange={(e) => setF("offeredSalary", e.target.value)} placeholder="e.g. 18" className={ic()} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Annual Bonus (LPA)</label>
              <input type="number" value={form.bonus} onChange={(e) => setF("bonus", e.target.value)} placeholder="e.g. 2" className={ic()} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Start Date<span className="text-red-500">*</span></label>
              <input type="date" value={form.startDate} onChange={(e) => setF("startDate", e.target.value)} className={ic()} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Benefits Summary</label>
            <textarea rows={2} value={form.benefits} onChange={(e) => setF("benefits", e.target.value)} placeholder="Health insurance, PTO, ESOP..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Special Conditions</label>
            <textarea rows={2} value={form.specialConditions} onChange={(e) => setF("specialConditions", e.target.value)} placeholder="Any special terms or conditions..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={() => setShowPreview(true)} className="flex items-center gap-1.5 rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
            <Eye className="h-4 w-4" /> Preview Letter
          </button>
          <button onClick={onClose} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Send className="h-4 w-4" /> Send Offer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Offers Tab ─────────────────────────────────────────────────────────────────

function OffersTab() {
  const [offers] = useState<Offer[]>(OFFERS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingOffer, setViewingOffer] = useState<Offer | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{offers.length} offers total</p>
        <button onClick={() => setShowCreateModal(true)} className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700">
          <Plus className="h-3.5 w-3.5" /> Create Offer
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
              {["Candidate", "Position", "Offered Salary", "Offer Date", "Expiry Date", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {offers.map((offer) => (
              <tr key={offer.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <MiniAvatar name={offer.candidateName} size="sm" />
                    <span className="font-semibold text-slate-900">{offer.candidateName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{offer.position}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  ₹{offer.offeredSalary}L{offer.bonus ? <span className="text-slate-400 font-normal"> + ₹{offer.bonus}L</span> : null}
                </td>
                <td className="px-4 py-3 text-slate-500">{offer.offerDate}</td>
                <td className="px-4 py-3 text-slate-500">
                  <span className={offer.status === "Expired" ? "text-rose-500 font-semibold" : ""}>{offer.expiryDate}</span>
                </td>
                <td className="px-4 py-3"><OfferStatusBadge status={offer.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-slate-400">
                    <button onClick={() => setViewingOffer(offer)} className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-blue-50 hover:text-blue-600">
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                    {offer.status === "Pending" && (
                      <>
                        <button className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-slate-100">
                          <RotateCcw className="h-3 w-3" /> Resend
                        </button>
                        <button className="flex items-center gap-1 rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50">
                          <X className="h-3 w-3" /> Revoke
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
              <p className="text-base font-bold text-slate-900">Offer Letter — {viewingOffer.candidateName}</p>
              <button onClick={() => setViewingOffer(null)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <OfferLetterModal offer={viewingOffer} />
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setViewingOffer(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
              <button className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Download className="h-4 w-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && <CreateOfferModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

type TabKey = "jobs" | "candidates" | "interviews" | "offers";

interface RecruitmentProps {
  defaultTab?: TabKey;
}

const TAB_LABELS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "jobs", label: "Job Openings", icon: Briefcase },
  { key: "candidates", label: "Candidates", icon: Users },
  { key: "interviews", label: "Interviews", icon: Calendar },
  { key: "offers", label: "Offers", icon: FileText },
];

export default function Recruitment({ defaultTab = "jobs" }: RecruitmentProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  return (
    <div className="min-h-full bg-slate-50 px-6 py-5">
      {/* Page Header */}
      <div className="mb-5">
        <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
          <span className="cursor-pointer hover:text-blue-600">Dashboard</span>
          <span>›</span>
          <span className="font-semibold text-slate-700">Recruitment</span>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Recruitment</h1>
          <div className="flex items-center gap-2">
            <button className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button onClick={() => setShowScheduleModal(true)} className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Calendar className="h-3.5 w-3.5" /> Schedule Interview
            </button>
          </div>
        </div>
      </div>

      {/* Funnel summary — persistent */}
      <FunnelSummary />

      {/* Tabs */}
      <div className="mb-5 border-b border-slate-200">
        <div className="flex items-center gap-1">
          {TAB_LABELS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${activeTab === key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "jobs" && <JobOpeningsTab />}
      {activeTab === "candidates" && <CandidatesTab onScheduleInterview={() => setShowScheduleModal(true)} />}
      {activeTab === "interviews" && <InterviewsTab />}
      {activeTab === "offers" && <OffersTab />}

      {showScheduleModal && <ScheduleInterviewModal onClose={() => setShowScheduleModal(false)} />}
    </div>
  );
}
