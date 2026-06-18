import React, { useState, useMemo } from "react";
import {
  Plus, Search, Eye, X, Send, Download, RotateCcw,
  ChevronDown, ChevronUp, FileText,
} from "lucide-react";
import {
  type Offer, type OfferStatus,
  OFFERS, CANDIDATES, JOBS, DEPT_OPTIONS,
  MiniAvatar, OfferStatusBadge,
} from "./shared/recruitmentUtils";

// ── Offer Letter Preview ───────────────────────────────────────────────────────

function OfferLetterCard({ offer }: { offer: Partial<Offer> & { candidateName: string; position: string } }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm leading-relaxed font-serif">
      <div className="mb-6 border-b-2 border-blue-600 pb-4">
        <p className="text-xl font-bold text-blue-700">TechCorp Solutions Pvt. Ltd.</p>
        <p className="text-xs text-slate-500">123, Innovation Park, Bangalore – 560001 · hr@techcorp.in</p>
      </div>
      <p className="mb-2 text-xs text-slate-500">{offer.offerDate ?? "—"}</p>
      <p className="mb-4 font-semibold text-slate-900">Dear {offer.candidateName},</p>
      <p className="mb-4 text-slate-700">
        We are pleased to extend an offer of employment for the position of{" "}
        <strong>{offer.position}</strong> at TechCorp Solutions Pvt. Ltd.
        This offer is subject to the terms and conditions outlined below.
      </p>
      <div className="mb-4 rounded-lg bg-slate-50 p-4 text-xs space-y-2">
        <div className="flex justify-between"><span className="text-slate-500">Position:</span><span className="font-semibold text-slate-800">{offer.position}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Start Date:</span><span className="font-semibold text-slate-800">{offer.startDate ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Base Salary:</span><span className="font-semibold text-slate-800">₹{offer.offeredSalary ?? "—"} LPA</span></div>
        {offer.bonus && <div className="flex justify-between"><span className="text-slate-500">Annual Bonus:</span><span className="font-semibold text-slate-800">₹{offer.bonus} LPA</span></div>}
        <div className="flex justify-between"><span className="text-slate-500">Offer Expires:</span><span className="font-semibold text-red-600">{offer.expiryDate ?? "—"}</span></div>
      </div>
      {offer.benefits && <p className="mb-2 text-slate-700"><strong>Benefits:</strong> {offer.benefits}</p>}
      {offer.specialConditions && <p className="mb-4 text-slate-700"><strong>Special Conditions:</strong> {offer.specialConditions}</p>}
      <p className="mb-6 text-slate-700">
        Please sign and return this letter by the expiry date to confirm your acceptance.
        We look forward to welcoming you to the team.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-8">
        <div><div className="h-12 border-b border-slate-400" /><p className="mt-1 text-xs text-slate-500">Authorized Signatory</p></div>
        <div><div className="h-12 border-b border-slate-400" /><p className="mt-1 text-xs text-slate-500">Candidate Signature & Date</p></div>
      </div>
    </div>
  );
}

// ── View Offer Modal ───────────────────────────────────────────────────────────

function ViewOfferModal({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <p className="text-base font-bold text-slate-900">Offer Letter — {offer.candidateName}</p>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <OfferLetterCard offer={offer} />
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
          <button className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Offer Modal ─────────────────────────────────────────────────────────

function CreateOfferModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    candidateName: "", position: "", offerDate: "", expiryDate: "",
    offeredSalary: "", bonus: "", joiningBonus: "", esops: "",
    noticeBuyout: "", startDate: "", benefits: "", specialConditions: "",
  });

  function setF(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  const ic = "h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

  if (step === 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <p className="text-base font-bold text-slate-900">Preview & Send Offer</p>
              <p className="text-xs text-slate-500">Step 2 of 2</p>
            </div>
            <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <OfferLetterCard
              offer={{
                candidateName: form.candidateName || "Candidate Name",
                position: form.position || "Position",
                offerDate: form.offerDate,
                expiryDate: form.expiryDate,
                offeredSalary: Number(form.offeredSalary),
                bonus: form.bonus ? Number(form.bonus) : undefined,
                startDate: form.startDate,
                benefits: form.benefits,
                specialConditions: form.specialConditions,
              }}
            />
          </div>
          <div className="flex shrink-0 justify-between gap-2 border-t border-slate-100 px-6 py-4">
            <button onClick={() => setStep(1)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              ← Edit Details
            </button>
            <button onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
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
          <div>
            <p className="text-base font-bold text-slate-900">Create Offer</p>
            <p className="text-xs text-slate-500">Step 1 of 2 — Offer Details</p>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Candidate<span className="text-red-500">*</span></label>
            <select value={form.candidateName} onChange={(e) => setF("candidateName", e.target.value)} className={ic}>
              <option value="">Select candidate (Offer stage)…</option>
              {CANDIDATES.filter((c) => c.stage === "Interview" || c.stage === "Offer").map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Position<span className="text-red-500">*</span></label>
            <select value={form.position} onChange={(e) => setF("position", e.target.value)} className={ic}>
              <option value="">Select position…</option>
              {JOBS.map((j) => <option key={j.id}>{j.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Offer Date<span className="text-red-500">*</span></label>
              <input type="date" value={form.offerDate} onChange={(e) => setF("offerDate", e.target.value)} className={ic} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Expiry Date<span className="text-red-500">*</span></label>
              <input type="date" value={form.expiryDate} onChange={(e) => setF("expiryDate", e.target.value)} className={ic} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Base Salary (₹ LPA)<span className="text-red-500">*</span></label>
              <input type="number" value={form.offeredSalary} onChange={(e) => setF("offeredSalary", e.target.value)} placeholder="e.g. 18" className={ic} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Performance Bonus (₹ LPA)</label>
              <input type="number" value={form.bonus} onChange={(e) => setF("bonus", e.target.value)} placeholder="e.g. 2" className={ic} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Joining Bonus (₹)</label>
              <input type="number" value={form.joiningBonus} onChange={(e) => setF("joiningBonus", e.target.value)} placeholder="Optional" className={ic} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Notice Period Buyout (₹)</label>
              <input type="number" value={form.noticeBuyout} onChange={(e) => setF("noticeBuyout", e.target.value)} placeholder="Optional" className={ic} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">ESOPs</label>
              <input type="text" value={form.esops} onChange={(e) => setF("esops", e.target.value)} placeholder="e.g. 500 options over 4 years" className={ic} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Start Date<span className="text-red-500">*</span></label>
              <input type="date" value={form.startDate} onChange={(e) => setF("startDate", e.target.value)} className={ic} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Benefits Summary</label>
            <textarea rows={2} value={form.benefits} onChange={(e) => setF("benefits", e.target.value)}
              placeholder="Health insurance, PTO, ESOP…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Special Conditions</label>
            <textarea rows={2} value={form.specialConditions} onChange={(e) => setF("specialConditions", e.target.value)}
              placeholder="Any special terms or conditions…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={() => setStep(2)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Next: Preview →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stats Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ── Row Accordion ──────────────────────────────────────────────────────────────

function OfferRowAccordion({ offer }: { offer: Offer }) {
  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
      <div className="grid grid-cols-3 gap-6 text-xs">
        <div>
          <p className="mb-2 font-bold uppercase tracking-wide text-slate-400">Salary Breakdown</p>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Base Salary</span><span className="font-semibold text-slate-800">₹{offer.offeredSalary} LPA</span></div>
            {offer.bonus && <div className="flex justify-between"><span className="text-slate-500">Bonus</span><span className="font-semibold text-slate-800">₹{offer.bonus} LPA</span></div>}
            <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
              <span className="text-slate-700">Total CTC</span>
              <span className="text-slate-900">₹{offer.offeredSalary + (offer.bonus ?? 0)} LPA</span>
            </div>
          </div>
        </div>
        <div>
          <p className="mb-2 font-bold uppercase tracking-wide text-slate-400">Details</p>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Joining Date</span><span className="font-semibold text-slate-800">{offer.startDate}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Department</span><span className="font-semibold text-slate-800">{offer.department ?? "—"}</span></div>
          </div>
        </div>
        <div>
          <p className="mb-2 font-bold uppercase tracking-wide text-slate-400">Conditions</p>
          <p className="text-slate-600">{offer.specialConditions ?? "None specified"}</p>
          {offer.benefits && (
            <>
              <p className="mb-1 mt-3 font-bold uppercase tracking-wide text-slate-400">Benefits</p>
              <p className="text-slate-600">{offer.benefits}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function OfferManagement() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingOffer, setViewingOffer] = useState<Offer | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OfferStatus | "All">("All");
  const [deptFilter, setDeptFilter] = useState("All Departments");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return OFFERS.filter((o) => {
      const ms = !q || o.candidateName.toLowerCase().includes(q) || o.position.toLowerCase().includes(q);
      const mst = statusFilter === "All" || o.status === statusFilter;
      const md = deptFilter === "All Departments" || o.department === deptFilter;
      return ms && mst && md;
    });
  }, [search, statusFilter, deptFilter]);

  const stats = useMemo(() => ({
    total: OFFERS.length,
    pending: OFFERS.filter((o) => o.status === "Pending").length,
    accepted: OFFERS.filter((o) => o.status === "Accepted").length,
    rejected: OFFERS.filter((o) => o.status === "Rejected").length,
    expired: OFFERS.filter((o) => o.status === "Expired").length,
  }), []);

  return (
    <div className="min-h-full bg-slate-50 px-6 py-5">
      {/* Breadcrumb */}
      <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
        <span className="cursor-pointer hover:text-blue-600">Dashboard</span>
        <span>›</span>
        <span className="cursor-pointer hover:text-blue-600">Recruitment</span>
        <span>›</span>
        <span className="font-semibold text-slate-700">Offer Management</span>
      </nav>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">Offer Management</h1>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Create Offer
        </button>
      </div>

      {/* Stats row */}
      <div className="mb-5 flex gap-3">
        <StatCard label="Total Offers" value={stats.total} color="text-slate-900" />
        <StatCard label="Pending" value={stats.pending} color="text-amber-600" />
        <StatCard label="Accepted" value={stats.accepted} color="text-green-600" />
        <StatCard label="Rejected" value={stats.rejected} color="text-rose-600" />
        <StatCard label="Expired" value={stats.expired} color="text-slate-500" />
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by candidate or position…"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OfferStatus | "All")}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-blue-400 focus:outline-none">
          <option value="All">All Status</option>
          {(["Pending", "Accepted", "Rejected", "Expired"] as OfferStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-blue-400 focus:outline-none">
          <option>All Departments</option>
          {DEPT_OPTIONS.map((d) => <option key={d}>{d}</option>)}
        </select>
        {(search || statusFilter !== "All" || deptFilter !== "All Departments") && (
          <button onClick={() => { setSearch(""); setStatusFilter("All"); setDeptFilter("All Departments"); }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800">Clear</button>
        )}
      </div>

      {/* Offers table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
              {["Candidate", "Position", "Department", "Offered CTC", "Offer Date", "Expiry", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((offer) => (
              <React.Fragment key={offer.id}>
                <tr className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <MiniAvatar name={offer.candidateName} size="sm" />
                      <span className="font-semibold text-slate-900">{offer.candidateName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{offer.position}</td>
                  <td className="px-4 py-3 text-slate-500">{offer.department ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    ₹{offer.offeredSalary}L
                    {offer.bonus ? <span className="text-slate-400 font-normal"> + ₹{offer.bonus}L</span> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{offer.offerDate}</td>
                  <td className="px-4 py-3">
                    <span className={offer.status === "Expired" ? "font-semibold text-rose-500" : "text-slate-500"}>
                      {offer.expiryDate}
                    </span>
                  </td>
                  <td className="px-4 py-3"><OfferStatusBadge status={offer.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-slate-400">
                      <button onClick={() => setViewingOffer(offer)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-blue-50 hover:text-blue-600">
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
                      {offer.status === "Accepted" && (
                        <button className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-green-50 hover:text-green-600">
                          <Send className="h-3 w-3" /> Joining Kit
                        </button>
                      )}
                      {(offer.status === "Rejected" || offer.status === "Expired") && (
                        <button className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-blue-50 hover:text-blue-600">
                          <RotateCcw className="h-3 w-3" /> Re-engage
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <button onClick={() => setExpandedId((id) => (id === offer.id ? null : offer.id))}
                      className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100">
                      {expandedId === offer.id
                        ? <ChevronUp className="h-3.5 w-3.5" />
                        : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                </tr>
                {expandedId === offer.id && (
                  <tr>
                    <td colSpan={9} className="p-0">
                      <OfferRowAccordion offer={offer} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-slate-400">No offers match your filters.</p>
          </div>
        )}
      </div>

      {viewingOffer && <ViewOfferModal offer={viewingOffer} onClose={() => setViewingOffer(null)} />}
      {showCreateModal && <CreateOfferModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
