import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";
import {
  ChevronLeft, ChevronRight, Plus, AlertTriangle, X, Check,
  Download, Edit2, CheckCircle2, Clock, Users, TrendingUp,
  AlertCircle, Sun, Sunset, Moon, Calendar,
} from "lucide-react";

// ── shared ────────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600","from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600","from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600","from-indigo-500 to-blue-600",
  "from-fuchsia-500 to-violet-600","from-teal-500 to-emerald-600",
];
const avatarGradient = (n: string) => AVATAR_GRADIENTS[n.charCodeAt(0) % AVATAR_GRADIENTS.length];
const getInitials    = (n: string) => n.split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase();

// ════════════════════════════════════════════════════════════════════════════
// SHIFT SCHEDULING PAGE
// ════════════════════════════════════════════════════════════════════════════

type ShiftType = "Morning" | "Afternoon" | "Night" | "Off" | "Custom";

interface ShiftEntry { type: ShiftType; start: string; end: string; note?: string; }
type Schedule = Record<string, Record<number, ShiftEntry[]>>;

const WEEK_DAYS  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const WEEK_DATES = ["May 26","May 27","May 28","May 29","May 30","May 31","Jun 1"];

const SHIFT_EMPLOYEES = [
  { id:"e1", name:"Sarah Johnson",   dept:"Engineering"    },
  { id:"e2", name:"Marcus Chen",     dept:"Engineering"    },
  { id:"e3", name:"Emily Rodriguez", dept:"Mobile"         },
  { id:"e4", name:"Liam Park",       dept:"Infrastructure" },
  { id:"e5", name:"Priya Sharma",    dept:"Data"           },
  { id:"e6", name:"Vikram Singh",    dept:"Data"           },
];

const M: ShiftEntry = { type:"Morning",   start:"8:00 AM",  end:"4:00 PM"  };
const A: ShiftEntry = { type:"Afternoon", start:"2:00 PM",  end:"10:00 PM" };
const N: ShiftEntry = { type:"Night",     start:"10:00 PM", end:"6:00 AM"  };
const O: ShiftEntry = { type:"Off",       start:"",         end:""         };

const INITIAL_SCHEDULE: Schedule = {
  e1: { 0:[M],    1:[M],    2:[M],    3:[M],    4:[M],    5:[O],    6:[O]    },
  e2: { 0:[A],    1:[A],    2:[A],    3:[A],    4:[A],    5:[O],    6:[O]    },
  e3: { 0:[M],    1:[M],    2:[O],    3:[M],    4:[M],    5:[M],    6:[O]    },
  e4: { 0:[N],    1:[N],    2:[N],    3:[N],    4:[O],    5:[O],    6:[N]    },
  e5: { 0:[M],    1:[A],    2:[M],    3:[A],    4:[M],    5:[O],    6:[O]    },
  e6: { 0:[A],    1:[A],    2:[M,A],  3:[A],    4:[A],    5:[O],    6:[O]    }, // Wed = CONFLICT
};

const SHIFT_STYLE: Record<ShiftType,{ bg:string; text:string; border:string; label:string }> = {
  Morning:   { bg:"bg-blue-50",   text:"text-blue-800",   border:"border-blue-200",   label:"Morning"   },
  Afternoon: { bg:"bg-orange-50", text:"text-orange-800", border:"border-orange-200", label:"Afternoon" },
  Night:     { bg:"bg-purple-50", text:"text-purple-800", border:"border-purple-200", label:"Night"     },
  Off:       { bg:"bg-white",     text:"text-slate-400",  border:"border-slate-200",  label:"Off"       },
  Custom:    { bg:"bg-teal-50",   text:"text-teal-800",   border:"border-teal-200",   label:"Custom"    },
};

// ── ShiftPopover ──────────────────────────────────────────────────────────────

interface PopoverState {
  empId: string; dayIdx: number;
  existing: ShiftEntry | null;
  x: number; y: number;
}

function ShiftPopover({
  state, onSave, onRemove, onClose,
}: {
  state: PopoverState;
  onSave: (empId: string, dayIdx: number, entry: ShiftEntry) => void;
  onRemove: (empId: string, dayIdx: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shiftType, setShiftType] = useState<ShiftType>(state.existing?.type ?? "Morning");
  const [customStart, setCustomStart] = useState("09:00");
  const [customEnd,   setCustomEnd]   = useState("17:00");
  const [note, setNote]               = useState(state.existing?.note ?? "");
  const [applyTo, setApplyTo]         = useState<"day"|"week">("day");

  const PRESETS: Record<Exclude<ShiftType,"Off"|"Custom">, ShiftEntry> = {
    Morning:   { type:"Morning",   start:"8:00 AM",  end:"4:00 PM"  },
    Afternoon: { type:"Afternoon", start:"2:00 PM",  end:"10:00 PM" },
    Night:     { type:"Night",     start:"10:00 PM", end:"6:00 AM"  },
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Keep popover on screen
  const left = Math.min(state.x, window.innerWidth - 320);
  const top  = Math.min(state.y, window.innerHeight - 380);

  const handleSave = () => {
    let entry: ShiftEntry;
    if (shiftType === "Off") {
      entry = { type:"Off", start:"", end:"", note };
    } else if (shiftType === "Custom") {
      entry = { type:"Custom", start:customStart, end:customEnd, note };
    } else {
      entry = { ...PRESETS[shiftType as keyof typeof PRESETS], note };
    }
    onSave(state.empId, state.dayIdx, entry);
    if (applyTo === "week") {
      for (let d = state.dayIdx; d < 7; d++) onSave(state.empId, d, entry);
    }
    onClose();
  };

  return (
    <div ref={ref} className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 w-72 p-4"
      style={{ left, top }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-800">
          {state.existing ? "Edit Shift" : "Assign Shift"}
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={15}/></button>
      </div>

      {/* Shift type */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Shift Type</label>
        <div className="grid grid-cols-2 gap-1.5">
          {(["Morning","Afternoon","Night","Off","Custom"] as ShiftType[]).map(t => (
            <button key={t}
              onClick={() => setShiftType(t)}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                shiftType === t
                  ? `${SHIFT_STYLE[t].bg} ${SHIFT_STYLE[t].text} ${SHIFT_STYLE[t].border} ring-1 ring-current`
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {t === "Morning" ? "Morning (8–4)" : t === "Afternoon" ? "Afternoon (2–10)" :
               t === "Night"   ? "Night (10–6)"  : t}
            </button>
          ))}
        </div>
      </div>

      {/* Custom times */}
      {shiftType === "Custom" && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Start</label>
            <input type="time" value={customStart} onChange={e=>setCustomStart(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">End</label>
            <input type="time" value={customEnd} onChange={e=>setCustomEnd(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        </div>
      )}

      {/* Note */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
        <input value={note} onChange={e=>setNote(e.target.value)}
          placeholder="e.g. On-call duty"
          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>

      {/* Apply to */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Apply to</label>
        <div className="flex gap-2">
          {[{v:"day",l:"Just this day"},{v:"week",l:"Rest of week"}].map(o => (
            <button key={o.v}
              onClick={()=>setApplyTo(o.v as "day"|"week")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                applyTo===o.v ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >{o.l}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {state.existing && (
          <button onClick={()=>{ onRemove(state.empId, state.dayIdx); onClose(); }}
            className="flex-1 py-2 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
            Remove
          </button>
        )}
        <button onClick={handleSave}
          className="flex-1 py-2 rounded-lg bg-blue-600 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
          Save
        </button>
      </div>
    </div>
  );
}

// ── PublishModal ──────────────────────────────────────────────────────────────

function PublishModal({ onClose, onPublish }: { onClose:()=>void; onPublish:()=>void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-50 rounded-xl"><Calendar size={22} className="text-emerald-600"/></div>
          <div>
            <h3 className="font-semibold text-slate-800">Publish Schedule</h3>
            <p className="text-xs text-slate-500">Week of May 26 – Jun 1, 2026</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-6">
          All 6 employees will be notified of their shifts via email and in-app notification.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={onPublish}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700">
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message:string; onDone:()=>void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 bg-slate-800 text-white rounded-xl shadow-2xl text-sm font-medium animate-fade-in">
      <CheckCircle2 size={16} className="text-emerald-400"/>{message}
    </div>
  );
}

// ── Main: ShiftSchedulingPage ─────────────────────────────────────────────────

export function ShiftSchedulingPage() {
  const [schedule, setSchedule] = useState<Schedule>(INITIAL_SCHEDULE);
  const [popover, setPopover]   = useState<PopoverState|null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [toast, setToast]       = useState<string|null>(null);

  // Detect conflicts: any cell with >1 shifts
  const conflicts = Object.entries(schedule).flatMap(([empId, days]) =>
    Object.entries(days)
      .filter(([,shifts]) => shifts.length > 1)
      .map(([dayIdx]) => ({ empId, dayIdx: Number(dayIdx) }))
  );

  const hasConflicts = conflicts.length > 0;

  const openCell = (e: React.MouseEvent, empId: string, dayIdx: number) => {
    const shifts = schedule[empId]?.[dayIdx] ?? [];
    setPopover({ empId, dayIdx, existing: shifts[0] ?? null, x: e.clientX + 10, y: e.clientY + 10 });
  };

  const saveShift = (empId: string, dayIdx: number, entry: ShiftEntry) => {
    setSchedule(prev => ({
      ...prev,
      [empId]: { ...(prev[empId]??{}), [dayIdx]: [entry] },
    }));
  };

  const removeShift = (empId: string, dayIdx: number) => {
    setSchedule(prev => ({
      ...prev,
      [empId]: { ...(prev[empId]??{}), [dayIdx]: [{ type:"Off", start:"", end:"" }] },
    }));
  };

  // Shift summary counts
  const countByType = (type: ShiftType) =>
    SHIFT_EMPLOYEES.filter(emp => {
      const empSched = schedule[emp.id] ?? {};
      return Object.values(empSched).some(shifts => shifts[0]?.type === type);
    });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-full px-6 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Time Management / Shifts</p>
            <h1 className="text-2xl font-bold text-slate-800">Shift Scheduling</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Week navigator */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
              <button className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-500">
                <ChevronLeft size={15}/>
              </button>
              <span className="text-sm font-medium text-slate-700 px-2">Week of May 26</span>
              <button className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-500">
                <ChevronRight size={15}/>
              </button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm transition-colors">
              <Plus size={15}/> Add Shift
            </button>
            <button onClick={()=>setShowPublish(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-sm font-medium text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-colors">
              <Check size={15}/> Publish Schedule
            </button>
          </div>
        </div>

        {/* Conflict banner */}
        {hasConflicts && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertTriangle size={16} className="shrink-0"/>
            <span>
              <strong>Shift conflict detected:</strong>{" "}
              {conflicts.map(c => {
                const emp = SHIFT_EMPLOYEES.find(e=>e.id===c.empId);
                return `${emp?.name} on ${WEEK_DATES[c.dayIdx]}`;
              }).join(", ")} — multiple shifts assigned.
            </span>
          </div>
        )}

        {/* Schedule grid */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{minWidth:900}}>
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="sticky left-0 bg-white z-10 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">
                    Employee
                  </th>
                  {WEEK_DAYS.map((d,i) => (
                    <th key={d} className="px-2 py-3 text-center min-w-[110px]">
                      <div className={`text-xs font-semibold ${i>=5?"text-slate-400":"text-slate-600"}`}>{d}</div>
                      <div className={`text-xs mt-0.5 ${i>=5?"text-slate-300":"text-slate-400"}`}>{WEEK_DATES[i]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {SHIFT_EMPLOYEES.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="sticky left-0 bg-white/95 backdrop-blur z-10 px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient(emp.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {getInitials(emp.name)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800 leading-tight">{emp.name}</div>
                          <div className="text-xs text-slate-400">{emp.dept}</div>
                        </div>
                      </div>
                    </td>
                    {WEEK_DAYS.map((_d,dayIdx) => {
                      const shifts = schedule[emp.id]?.[dayIdx] ?? [];
                      const isConflict = shifts.length > 1;
                      const shift = shifts[0];
                      const s = shift ? SHIFT_STYLE[shift.type] : null;

                      return (
                        <td key={dayIdx} className="px-2 py-2">
                          <div className="relative" onClick={e => openCell(e, emp.id, dayIdx)}>
                            {isConflict ? (
                              <div className="border-2 border-red-300 bg-red-50 rounded-lg p-2 cursor-pointer hover:bg-red-100 transition-colors min-h-[52px]">
                                <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
                                  <AlertCircle size={12}/> Conflict
                                </div>
                                <div className="text-xs text-red-500 mt-0.5">{shifts.length} shifts</div>
                              </div>
                            ) : shift && shift.type !== "Off" && s ? (
                              <div className={`${s.bg} ${s.text} border ${s.border} rounded-lg p-2 cursor-pointer hover:opacity-80 transition-opacity min-h-[52px]`}>
                                <div className="text-xs font-semibold leading-tight">{shift.type}</div>
                                <div className="text-xs opacity-75 mt-0.5">{shift.start}–{shift.end}</div>
                                {shift.note && <div className="text-xs opacity-60 mt-0.5 truncate">{shift.note}</div>}
                              </div>
                            ) : shift?.type === "Off" ? (
                              <div className="border border-dashed border-slate-200 rounded-lg p-2 cursor-pointer hover:bg-slate-50 transition-colors min-h-[52px] flex items-center justify-center">
                                <span className="text-xs text-slate-300 font-medium">Off</span>
                              </div>
                            ) : (
                              <div className="border border-dashed border-slate-100 rounded-lg p-2 cursor-pointer hover:bg-slate-50 hover:border-slate-200 transition-all min-h-[52px] flex items-center justify-center group">
                                <Plus size={14} className="text-slate-200 group-hover:text-slate-400 transition-colors"/>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shift summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {([
            { type:"Morning"   as ShiftType, label:"Morning Shift",   icon:<Sun size={18}/>,    color:"text-blue-600",   bg:"bg-blue-50"   },
            { type:"Afternoon" as ShiftType, label:"Afternoon Shift", icon:<Sunset size={18}/>, color:"text-orange-600", bg:"bg-orange-50" },
            { type:"Night"     as ShiftType, label:"Night Shift",     icon:<Moon size={18}/>,   color:"text-purple-600", bg:"bg-purple-50" },
          ]).map(card => {
            const employees = countByType(card.type);
            return (
              <div key={card.type} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}>{card.icon}</div>
                  <span className="text-sm font-semibold text-slate-700">{card.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {employees.slice(0,4).map(e => (
                      <div key={e.id}
                        className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGradient(e.name)} flex items-center justify-center text-white text-xs font-bold ring-2 ring-white`}>
                        {getInitials(e.name)}
                      </div>
                    ))}
                    {employees.length > 4 && (
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold ring-2 ring-white">
                        +{employees.length-4}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-slate-600">{employees.length} employee{employees.length!==1?"s":""}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {popover && (
        <ShiftPopover
          state={popover}
          onSave={saveShift}
          onRemove={removeShift}
          onClose={()=>setPopover(null)}
        />
      )}
      {showPublish && (
        <PublishModal
          onClose={()=>setShowPublish(false)}
          onPublish={()=>{ setShowPublish(false); setToast("Schedule published! Employees have been notified."); }}
        />
      )}
      {toast && <Toast message={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// OVERTIME MANAGEMENT PAGE
// ════════════════════════════════════════════════════════════════════════════

type OTType   = "Planned" | "Emergency" | "Compensatory";
type OTStatus = "Pending" | "Approved" | "Rejected" | "Compensated";

interface OTRequest {
  id: string; employee: string; department: string; date: string;
  regularHours: number; otHours: number; otType: OTType;
  reason: string; approvedBy: string; status: OTStatus;
}

const OT_REQUESTS: OTRequest[] = [
  { id:"ot1",  employee:"Sarah Johnson",   department:"Engineering",    date:"Jun 2, 2026",  regularHours:8, otHours:3,   otType:"Planned",       reason:"Sprint deadline",          approvedBy:"David Kim",    status:"Approved"     },
  { id:"ot2",  employee:"Marcus Chen",     department:"Engineering",    date:"Jun 3, 2026",  regularHours:8, otHours:2.5, otType:"Planned",       reason:"API integration deadline",  approvedBy:"David Kim",    status:"Approved"     },
  { id:"ot3",  employee:"Liam Park",       department:"Infrastructure", date:"Jun 1, 2026",  regularHours:8, otHours:4,   otType:"Emergency",     reason:"Server outage response",    approvedBy:"Pending",      status:"Pending"      },
  { id:"ot4",  employee:"Priya Sharma",    department:"Data",           date:"May 30, 2026", regularHours:8, otHours:3,   otType:"Planned",       reason:"Pipeline migration",        approvedBy:"Raj Nair",     status:"Compensated"  },
  { id:"ot5",  employee:"Vikram Singh",    department:"Data",           date:"Jun 4, 2026",  regularHours:8, otHours:5,   otType:"Emergency",     reason:"Data breach investigation",  approvedBy:"Pending",      status:"Pending"      },
  { id:"ot6",  employee:"Emily Rodriguez", department:"Mobile",         date:"Jun 2, 2026",  regularHours:8, otHours:2,   otType:"Planned",       reason:"App store release prep",    approvedBy:"Nina Torres",  status:"Approved"     },
  { id:"ot7",  employee:"Aisha Patel",     department:"Quality",        date:"Jun 3, 2026",  regularHours:8, otHours:3.5, otType:"Planned",       reason:"Regression test suite",     approvedBy:"Pending",      status:"Pending"      },
  { id:"ot8",  employee:"Tom Wilson",      department:"Product",        date:"May 29, 2026", regularHours:8, otHours:2,   otType:"Compensatory",  reason:"Saturday on-call duty",     approvedBy:"Raj Nair",     status:"Compensated"  },
  { id:"ot9",  employee:"Sarah Johnson",   department:"Engineering",    date:"May 28, 2026", regularHours:8, otHours:4,   otType:"Emergency",     reason:"Critical production bug",   approvedBy:"David Kim",    status:"Approved"     },
  { id:"ot10", employee:"Marcus Chen",     department:"Engineering",    date:"May 27, 2026", regularHours:8, otHours:3,   otType:"Compensatory",  reason:"Weekend deployment",        approvedBy:"David Kim",    status:"Approved"     },
  { id:"ot11", employee:"Liam Park",       department:"Infrastructure", date:"May 25, 2026", regularHours:8, otHours:2.5, otType:"Planned",       reason:"Network maintenance",       approvedBy:"Raj Nair",     status:"Approved"     },
  { id:"ot12", employee:"Priya Sharma",    department:"Data",           date:"Jun 5, 2026",  regularHours:8, otHours:3,   otType:"Planned",       reason:"Monthly analytics report",  approvedBy:"Pending",      status:"Pending"      },
];

const OT_BY_DEPT = [
  { dept:"Engineering",    hours:120 },
  { dept:"Data",           hours:85  },
  { dept:"Infrastructure", hours:60  },
  { dept:"Product",        hours:45  },
  { dept:"Quality",        hours:25  },
  { dept:"Mobile",         hours:12  },
];

const OT_TREND = [
  { month:"Jan", hours:280 },
  { month:"Feb", hours:310 },
  { month:"Mar", hours:295 },
  { month:"Apr", hours:320 },
  { month:"May", hours:347 },
  { month:"Jun", hours:182 },
];

const TOP_OT_EMPLOYEES = [
  { rank:1, name:"Sarah Johnson",   dept:"Engineering",    totalOT:58, cost:"₹13,050", avgWeek:"14.5h", active:true  },
  { rank:2, name:"Vikram Singh",    dept:"Data",           totalOT:52, cost:"₹11,700", avgWeek:"13.0h", active:true  },
  { rank:3, name:"Marcus Chen",     dept:"Engineering",    totalOT:49, cost:"₹11,025", avgWeek:"12.25h",active:true  },
  { rank:4, name:"Liam Park",       dept:"Infrastructure", totalOT:45, cost:"₹10,125", avgWeek:"11.25h",active:true  },
  { rank:5, name:"Priya Sharma",    dept:"Data",           totalOT:38, cost:"₹8,550",  avgWeek:"9.5h",  active:false },
];

const OT_TYPE_STYLE: Record<OTType, string> = {
  Planned:      "bg-blue-50 text-blue-700 border-blue-200",
  Emergency:    "bg-red-50 text-red-700 border-red-200",
  Compensatory: "bg-purple-50 text-purple-700 border-purple-200",
};
const OT_STATUS_STYLE: Record<OTStatus, string> = {
  Pending:     "bg-amber-50 text-amber-700 border-amber-200",
  Approved:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected:    "bg-red-50 text-red-700 border-red-200",
  Compensated: "bg-teal-50 text-teal-700 border-teal-200",
};

// ── OTPolicyCard ──────────────────────────────────────────────────────────────

function OTPolicyCard() {
  const [editing, setEditing] = useState(false);
  const [policy, setPolicy]   = useState({
    dailyLimit:3, weeklyLimit:12, monthlyLimit:40,
    weekdayRate:1.5, weekendRate:2.0,
  });
  const [draft, setDraft]     = useState(policy);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">OT Policy</h3>
        {!editing ? (
          <button onClick={()=>setEditing(true)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
            <Edit2 size={12}/> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={()=>setEditing(false)}
              className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
            <button onClick={()=>{ setPolicy(draft); setEditing(false); }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium">Save</button>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {[
          { label:"Daily OT limit",   key:"dailyLimit",   suffix:"hrs" },
          { label:"Weekly OT limit",  key:"weeklyLimit",  suffix:"hrs" },
          { label:"Monthly OT limit", key:"monthlyLimit", suffix:"hrs" },
          { label:"Weekday OT rate",  key:"weekdayRate",  suffix:"×"   },
          { label:"Weekend OT rate",  key:"weekendRate",  suffix:"×"   },
        ].map(row => (
          <div key={row.key} className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{row.label}</span>
            {editing ? (
              <input
                type="number" step={row.suffix==="×"?0.5:1} min={0}
                value={draft[row.key as keyof typeof draft]}
                onChange={e=>setDraft(p=>({...p,[row.key]:parseFloat(e.target.value)}))}
                className="w-20 text-right border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="text-xs font-semibold text-slate-800">
                {policy[row.key as keyof typeof policy]}{row.suffix}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 leading-relaxed">
        OT pay = base hourly × rate × OT hours. Weekend rate applies to Sat &amp; Sun.
      </div>
    </div>
  );
}

// ── Main: OvertimeManagementPage ──────────────────────────────────────────────

export function OvertimeManagementPage() {
  const [requests, setRequests] = useState<OTRequest[]>(OT_REQUESTS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterType,   setFilterType]   = useState<string>("All");

  const toggleRow = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });

  const toggleAll = () =>
    setSelected(prev => prev.size===visible.length ? new Set() : new Set(visible.map(r=>r.id)));

  const approve = (id: string) =>
    setRequests(prev => prev.map(r => r.id===id ? {...r, status:"Approved", approvedBy:"Admin"} : r));

  const reject = (id: string) =>
    setRequests(prev => prev.map(r => r.id===id ? {...r, status:"Rejected"} : r));

  const bulkApprove = () => {
    setRequests(prev => prev.map(r => selected.has(r.id) ? {...r,status:"Approved",approvedBy:"Admin"} : r));
    setSelected(new Set());
  };
  const bulkReject = () => {
    setRequests(prev => prev.map(r => selected.has(r.id) ? {...r,status:"Rejected"} : r));
    setSelected(new Set());
  };

  const visible = requests.filter(r =>
    (filterStatus==="All" || r.status===filterStatus) &&
    (filterType  ==="All" || r.otType===filterType)
  );

  const totalHours = requests.reduce((s,r)=>s+r.otHours,0);
  const empCount   = new Set(requests.map(r=>r.employee)).size;
  const avgOT      = (totalHours/empCount).toFixed(1);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Time Management / Overtime</p>
            <h1 className="text-2xl font-bold text-slate-800">Overtime Management</h1>
          </div>
          <div className="flex items-center gap-3">
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>June 2026</option>
              <option>May 2026</option>
              <option>April 2026</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm transition-colors">
              <Download size={15}/> Export Report
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:"Total OT Hours",    value:"347",  sub:"this month",             icon:<Clock size={20}/>,     bg:"bg-blue-50",    ic:"text-blue-600"   },
            { label:"Employees with OT", value:"8",    sub:"out of 24 total",        icon:<Users size={20}/>,     bg:"bg-violet-50",  ic:"text-violet-600" },
            { label:"Avg OT / Employee", value:avgOT+"h", sub:"per month",           icon:<TrendingUp size={20}/>,bg:"bg-amber-50",   ic:"text-amber-600"  },
            { label:"Est. OT Cost",      value:"₹52,050", sub:"at policy rates",     icon:<Calendar size={20}/>,  bg:"bg-emerald-50", ic:"text-emerald-600"},
          ].map(c=>(
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">{c.label}</span>
                <div className={`p-2 rounded-lg ${c.bg} ${c.ic}`}>{c.icon}</div>
              </div>
              <div className="text-3xl font-bold text-slate-800">{c.value}</div>
              <div className="text-xs text-slate-500 mt-1">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Main content + sidebar */}
        <div className="flex gap-5 items-start">
          <div className="flex-1 min-w-0 space-y-5">

            {/* OT Requests Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Toolbar */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-semibold text-slate-800 mr-auto">OT Requests</h2>
                {selected.size > 0 && (
                  <>
                    <span className="text-xs text-slate-500">{selected.size} selected</span>
                    <button onClick={bulkApprove}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors">
                      <Check size={13}/> Approve Selected
                    </button>
                    <button onClick={bulkReject}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors">
                      <X size={13}/> Reject Selected
                    </button>
                  </>
                )}
                <select value={filterType} onChange={e=>setFilterType(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="All">All Types</option>
                  <option>Planned</option><option>Emergency</option><option>Compensatory</option>
                </select>
                <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="All">All Statuses</option>
                  <option>Pending</option><option>Approved</option><option>Rejected</option><option>Compensated</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3 text-left w-8">
                        <input type="checkbox" className="rounded"
                          checked={selected.size===visible.length && visible.length>0}
                          onChange={toggleAll}/>
                      </th>
                      <th className="px-4 py-3 text-left">Employee</th>
                      <th className="px-4 py-3 text-left">Dept</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-center">Reg Hrs</th>
                      <th className="px-4 py-3 text-center">OT Hrs</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Reason</th>
                      <th className="px-4 py-3 text-left">Approved By</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {visible.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <input type="checkbox" className="rounded"
                            checked={selected.has(req.id)} onChange={()=>toggleRow(req.id)}/>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGradient(req.employee)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                              {getInitials(req.employee)}
                            </div>
                            <span className="font-medium text-slate-800 whitespace-nowrap">{req.employee}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{req.department}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{req.date}</td>
                        <td className="px-4 py-3 text-center text-slate-600 text-xs">{req.regularHours}h</td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-slate-800 text-xs">{req.otHours}h</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${OT_TYPE_STYLE[req.otType]}`}>
                            {req.otType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs max-w-[160px] truncate">{req.reason}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {req.status==="Pending" ? <span className="text-slate-300">Pending</span> : req.approvedBy}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${OT_STATUS_STYLE[req.status]}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {req.status==="Pending" ? (
                            <div className="flex items-center gap-1">
                              <button onClick={()=>approve(req.id)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors" title="Approve">
                                <Check size={13}/>
                              </button>
                              <button onClick={()=>reject(req.id)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Reject">
                                <X size={13}/>
                              </button>
                            </div>
                          ) : (
                            <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">View</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visible.length===0 && (
                  <div className="py-12 text-center text-slate-400 text-sm">No records match your filters.</div>
                )}
              </div>
            </div>

            {/* Analytics charts */}
            <div className="grid grid-cols-2 gap-5">
              {/* Bar: OT by dept */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">OT Hours by Department</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={OT_BY_DEPT} margin={{top:0,right:10,left:-10,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="dept" tick={{fontSize:10,fill:"#94a3b8"}} tickLine={false} axisLine={false}
                      tickFormatter={v=>v.length>8?v.slice(0,8)+"…":v}/>
                    <YAxis tick={{fontSize:10,fill:"#94a3b8"}} tickLine={false} axisLine={false}/>
                    <Tooltip contentStyle={{borderRadius:"8px",border:"1px solid #e2e8f0",fontSize:12}}
                      formatter={(v:number)=>[`${v}h`,"OT Hours"]}/>
                    <Bar dataKey="hours" fill="#6366f1" radius={[4,4,0,0]} maxBarSize={40}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Line: OT trend */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">OT Trend — Last 6 Months</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={OT_TREND} margin={{top:5,right:10,left:-10,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="month" tick={{fontSize:10,fill:"#94a3b8"}} tickLine={false} axisLine={false}/>
                    <YAxis tick={{fontSize:10,fill:"#94a3b8"}} tickLine={false} axisLine={false}/>
                    <Tooltip contentStyle={{borderRadius:"8px",border:"1px solid #e2e8f0",fontSize:12}}
                      formatter={(v:number)=>[`${v}h`,"Total OT"]}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <Line type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2}
                      dot={{r:4,fill:"#6366f1"}} name="OT Hours"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top 5 OT employees */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Top 5 Overtime Employees</h3>
                <p className="text-xs text-slate-500 mt-0.5">Ranked by total OT hours this month</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3 text-center w-12">Rank</th>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-center">Total OT Hrs</th>
                    <th className="px-4 py-3 text-center">OT Cost</th>
                    <th className="px-4 py-3 text-center">Avg / Week</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {TOP_OT_EMPLOYEES.map(emp => (
                    <tr key={emp.rank} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          emp.rank===1?"bg-amber-100 text-amber-700":
                          emp.rank===2?"bg-slate-100 text-slate-600":
                          emp.rank===3?"bg-orange-50 text-orange-600":"bg-slate-50 text-slate-500"
                        }`}>
                          {emp.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient(emp.name)} flex items-center justify-center text-white text-xs font-bold`}>
                            {getInitials(emp.name)}
                          </div>
                          <span className="font-medium text-slate-800">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{emp.dept}</td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-800">{emp.totalOT}h</td>
                      <td className="px-4 py-3 text-center text-slate-700 text-sm font-medium">{emp.cost}</td>
                      <td className="px-4 py-3 text-center text-slate-600 text-xs">{emp.avgWeek}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${
                          emp.active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {emp.active?"Active":"On Leave"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* Sidebar */}
          <div className="w-72 shrink-0">
            <OTPolicyCard />
          </div>
        </div>

      </div>
    </div>
  );
}
