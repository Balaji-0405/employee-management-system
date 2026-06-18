import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import { calendarAPI } from '../../lib/api'
import { useAuth } from '../../lib/AuthContext'

interface Holiday {
  id: string
  name: string
  date: string
  country?: string
  status?: 'pending' | 'approved' | 'rejected'
  creator?: { id: string; name: string }
}

const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December',
]

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May',
  'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function Panel({ children, className = '' }: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </section>
  )
}

export default function HolidayCalendar() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', date: '', country: 'India' })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [activeMonth, setActiveMonth] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')

  const load = async () => {
    setLoading(true)
    try {
      const data = await calendarAPI.getHolidays(year)
      setHolidays(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [year]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (!form.name.trim() || !form.date) {
      setFormError('Name and date are required')
      return
    }
    setFormLoading(true)
    setFormError('')
    try {
      await calendarAPI.createHoliday(form)
      setShowModal(false)
      setForm({ name: '', date: '', country: 'India' })
      await load()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await calendarAPI.deleteHoliday(id)
      await load()
    } catch (e) {
      console.error(e)
    }
  }

  const filteredHolidays = statusFilter === 'all'
    ? holidays
    : holidays.filter(h => h.status === statusFilter)

  // Group holidays by month
  const byMonth: Holiday[][] = Array.from({ length: 12 }, (_, m) =>
    filteredHolidays.filter(h => new Date(h.date + 'T00:00:00').getMonth() === m)
  )

  const monthsToShow =
    activeMonth !== null
      ? [activeMonth]
      : byMonth.map((_, i) => i).filter(i => byMonth[i].length > 0)

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-full bg-[#f8fafc]">
      <div className="w-full p-4 lg:p-5">

        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-slate-950">
              Holiday Calendar
            </h1>
            <p className="mt-1 text-[14px] text-slate-500">
              Manage public and company holidays
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-rose-600 px-4 text-[13px] font-semibold text-white hover:bg-rose-700"
            >
              <Plus className="h-4 w-4" />
              Add Holiday
            </button>
          )}
        </div>

        {/* Year navigation + month filter */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setYear(y => y - 1)}
              className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[18px] font-semibold text-slate-950">{year}</span>
            <button
              onClick={() => setYear(y => y + 1)}
              className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Month filter pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveMonth(null)}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${
                activeMonth === null
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {MONTH_SHORT.map((m, i) => (
              <button
                key={m}
                onClick={() => setActiveMonth(activeMonth === i ? null : i)}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${
                  activeMonth === i
                    ? 'bg-rose-600 text-white'
                    : byMonth[i].length > 0
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {m}
                {byMonth[i].length > 0 && (
                  <span className="ml-1">({byMonth[i].length})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="mt-4 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
          {(['all', 'approved', 'pending', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-4 py-1.5 text-[12px] font-semibold capitalize transition ${
                statusFilter === s
                  ? s === 'approved'
                    ? 'bg-emerald-600 text-white'
                    : s === 'pending'
                    ? 'bg-amber-500 text-white'
                    : s === 'rejected'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s}
              {s !== 'all' && (
                <span className="ml-1.5 opacity-70">
                  ({holidays.filter(h => h.status === s).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Holiday list */}
        <div className="mt-5 space-y-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-200" />
              ))}
            </div>
          ) : monthsToShow.length === 0 ? (
            <Panel className="p-8 text-center">
              <p className="text-[14px] text-slate-400">
                No holidays added for {year} yet.
              </p>
              {isAdmin && (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-3 text-[13px] font-semibold text-rose-600 hover:text-rose-700"
                >
                  + Add first holiday
                </button>
              )}
            </Panel>
          ) : (
            monthsToShow.map(m => (
              <div key={m}>
                <h2 className="mb-3 text-[15px] font-semibold text-slate-700">
                  {MONTHS[m]} {year}
                  <span className="ml-2 text-[12px] font-normal text-slate-400">
                    {byMonth[m].length} holiday{byMonth[m].length !== 1 ? 's' : ''}
                  </span>
                </h2>
                <div className="space-y-2">
                  {byMonth[m].map(h => {
                    const d = new Date(h.date + 'T00:00:00')
                    const isPast = h.date < todayStr
                    const isToday = h.date === todayStr
                    return (
                      <Panel
                        key={h.id}
                        className={`flex items-center gap-4 p-4 ${isPast ? 'opacity-60' : ''}`}
                      >
                        {/* Date box */}
                        <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg ${isToday ? 'bg-rose-600 text-white' : 'bg-rose-50'}`}>
                          <span className={`text-[20px] font-bold leading-none ${isToday ? 'text-white' : 'text-rose-700'}`}>
                            {d.getDate()}
                          </span>
                          <span className={`text-[11px] font-semibold uppercase ${isToday ? 'text-rose-100' : 'text-rose-500'}`}>
                            {MONTH_SHORT[d.getMonth()]}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold text-slate-950">{h.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              {h.country || 'India'}
                            </span>
                            <span className="text-[12px] text-slate-400">
                              {d.toLocaleDateString('en-IN', { weekday: 'long' })}
                            </span>
                            {isToday && (
                              <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                Today
                              </span>
                            )}
                            <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                              h.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700'
                                : h.status === 'rejected'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {h.status === 'approved' ? '✓ Approved'
                                : h.status === 'rejected' ? '✗ Rejected'
                                : '⏳ Pending'}
                            </span>
                          </div>
                          {isAdmin && h.status === 'pending' && (
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    await calendarAPI.approveHoliday(h.id, { action: 'approve' })
                                    await load()
                                  } catch (e) { console.error(e) }
                                }}
                                className="rounded-md bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await calendarAPI.approveHoliday(h.id, { action: 'reject' })
                                    await load()
                                  } catch (e) { console.error(e) }
                                }}
                                className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Delete */}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(h.id)}
                            className="text-slate-400 transition-colors hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </Panel>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Holiday Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Panel className="w-full max-w-[420px] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-slate-950">Add Holiday</h2>
              <button onClick={() => setShowModal(false)}>
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[12px] font-bold text-slate-700">Holiday Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Diwali, Christmas"
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-700">Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-700">Type</label>
                <select
                  value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-rose-400"
                >
                  <option value="India">National Holiday</option>
                  <option value="Regional">Regional Holiday</option>
                  <option value="Company">Company Holiday</option>
                  <option value="Optional">Optional Holiday</option>
                </select>
              </div>
            </div>

            {formError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600">
                {formError}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={formLoading || !form.name.trim() || !form.date}
                className="flex-1 rounded-lg bg-rose-600 py-2 text-[13px] font-bold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {formLoading ? 'Adding...' : 'Add Holiday'}
              </button>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
