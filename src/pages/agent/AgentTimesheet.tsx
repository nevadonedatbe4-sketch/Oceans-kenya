import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/pages/agent/ogroup/useAttendance';
import { fmtTime, fmtDur, fmtShortDur } from '@/pages/agent/ogroup/checkInTheme';

interface DayRow {
  date: string;
  in: string | null;
  out: string | null;
  breakSec: number;
  workedSec: number;
  status: 'complete' | 'open';
  timesheetStatus: string;
}

type RangeKey = 'today' | 'week' | 'month' | 'custom';

function rangeBounds(key: RangeKey, customFrom: string, customTo: string): { from: Date; to: Date } {
  const now = new Date();
  if (key === 'today') {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (key === 'week') {
    const from = new Date(now); from.setDate(from.getDate() - 6); from.setHours(0, 0, 0, 0);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (key === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  const from = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  from.setHours(0, 0, 0, 0);
  const to = customTo ? new Date(customTo) : new Date(now);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export default function AgentTimesheet() {
  const { user } = useAuth();
  const { schedule, refresh } = useAttendance();
  const [range, setRange] = useState<RangeKey>('week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [rows, setRows] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { from, to } = rangeBounds(range, customFrom, customTo);
      const { data, error: qErr } = await supabase
        .from('og_attendance_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('clock_in_at', from.toISOString())
        .lte('clock_in_at', to.toISOString())
        .order('clock_in_at', { ascending: true });
      if (qErr) throw qErr;

      const byDay = new Map<string, DayRow>();
      (data || []).forEach((s) => {
        const key = new Date(s.clock_in_at).toISOString().slice(0, 10);
        const existing = byDay.get(key) || { date: key, in: null, out: null, breakSec: 0, workedSec: 0, status: 'complete', timesheetStatus: 'open' };
        if (!existing.in || new Date(s.clock_in_at) < new Date(existing.in)) existing.in = s.clock_in_at;
        if (s.clock_out_at) {
          if (!existing.out || new Date(s.clock_out_at) > new Date(existing.out)) existing.out = s.clock_out_at;
        }
        existing.breakSec += s.break_sec || 0;
        existing.workedSec += s.hours_worked_sec || 0;
        if (!s.clock_out_at) { existing.status = 'open'; existing.timesheetStatus = 'open'; }
        else if (existing.timesheetStatus === 'open') existing.timesheetStatus = s.timesheet_status || 'open';
        byDay.set(key, existing);
      });
      setRows(Array.from(byDay.values()).sort((a, b) => (a.date < b.date ? 1 : -1)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your timesheet.');
    } finally {
      setLoading(false);
    }
  }, [user, range, customFrom, customTo]);

  useEffect(() => { void load(); }, [load]);

  const summary = useMemo(() => {
    const worked = rows.reduce((s, r) => s + r.workedSec, 0);
    const breakT = rows.reduce((s, r) => s + r.breakSec, 0);
    const daysWorked = rows.length;
    const overtime = rows.filter((r) => r.workedSec > 8 * 3600).reduce((s, r) => s + (r.workedSec - 8 * 3600), 0);
    // Scheduled hours derived from the work schedule (fallback 8h/day).
    let perDaySec = 8 * 3600;
    if (schedule?.start_time && schedule?.end_time) {
      const [sh, sm] = schedule.start_time.split(':').map(Number);
      const [eh, em] = schedule.end_time.split(':').map(Number);
      perDaySec = Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) * 60);
    }
    const scheduled = perDaySec * daysWorked;
    return { worked, breakT, daysWorked, overtime, scheduled, diff: worked - scheduled };
  }, [rows, schedule]);

  const hasOpen = rows.some((r) => r.status === 'open');
  const hasOpenTimesheet = rows.some((r) => r.timesheetStatus === 'open' || r.timesheetStatus === 'returned');

  const submitTimesheet = async () => {
    setSubmitting(true);
    try {
      const { from, to } = rangeBounds(range, customFrom, customTo);
      const { error: fnErr } = await supabase.functions.invoke('og-checkin', {
        body: { action: 'submit_timesheet', from: from.toISOString(), to: to.toISOString() },
      });
      if (fnErr) throw fnErr;
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3500);
      await load();
      await refresh();
    } catch {
      setError('Could not submit the timesheet. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = () => {
    const header = 'Date,In,Break,Out,Worked,Status';
    const lines = rows.map((r) => [
      new Date(r.date).toLocaleDateString('en-GB'),
      r.in ? fmtTime(r.in) : '',
      fmtShortDur(r.breakSec),
      r.out ? fmtTime(r.out) : '',
      fmtShortDur(r.workedSec),
      r.status === 'open' ? 'Open' : 'Complete',
    ].join(','));
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    { label: 'Regular hours', value: fmtDur(Math.max(0, summary.worked - summary.overtime)), icon: 'ri-time-line', tone: 'bg-[#2CDEBE]/10 text-[#0f766e]' },
    { label: 'Overtime', value: fmtDur(summary.overtime), icon: 'ri-timer-flash-line', tone: 'bg-emerald-100 text-emerald-700' },
    { label: 'Break time', value: fmtDur(summary.breakT), icon: 'ri-cup-line', tone: 'bg-amber-100 text-amber-700' },
    { label: 'Days worked', value: String(summary.daysWorked), icon: 'ri-calendar-check-line', tone: 'bg-neutral-100 text-neutral-700' },
    { label: 'Scheduled', value: fmtDur(summary.scheduled), icon: 'ri-calendar-schedule-line', tone: 'bg-neutral-100 text-neutral-700' },
    { label: 'Difference', value: `${summary.diff >= 0 ? '+' : '-'}${fmtShortDur(Math.abs(summary.diff))}`, icon: summary.diff >= 0 ? 'ri-arrow-up-line' : 'ri-arrow-down-line', tone: summary.diff >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600' },
  ];

  return (
    <div className="bg-white rounded-3xl p-4 md:p-7 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">My Timesheet</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Your hours, compiled from clock punches</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1 rounded-full bg-neutral-100 p-1">
            {(['today', 'week', 'month', 'custom'] as RangeKey[]).map((r) => (
              <button key={r} onClick={() => setRange(r)} aria-pressed={range === r}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors cursor-pointer whitespace-nowrap ${range === r ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-100 text-neutral-700 text-xs font-semibold hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-download-2-line" /> Export CSV
          </button>
        </div>
      </div>

      {range === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-semibold text-neutral-500">From</label>
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm cursor-pointer" />
          <label className="text-xs font-semibold text-neutral-500">To</label>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm cursor-pointer" />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-neutral-200 p-4">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.tone}`}><i className={c.icon} /></span>
            <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mt-3">{c.label}</p>
            <p className="text-lg font-bold text-neutral-900 tabular-nums mt-0.5">{c.value}</p>
          </div>
        ))}
      </div>

      {hasOpen && (
        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-amber-800">
          <i className="ri-alarm-warning-line mt-0.5" />
          <p className="text-sm">Some days have an open shift (no punch-out). Those will stay open until you punch out or an admin corrects them.</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 border border-red-100 p-3.5 text-red-600">
          <i className="ri-error-warning-line mt-0.5" /><p className="flex-1 text-sm">{error}</p>
          <button onClick={() => void load()} className="text-xs font-semibold underline cursor-pointer whitespace-nowrap">Retry</button>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-100 flex-wrap">
          <div className="flex items-center gap-2">
            <i className="ri-table-line text-[#0f766e]" />
            <p className="text-sm font-semibold text-neutral-800">Daily records</p>
          </div>
          <button onClick={submitTimesheet} disabled={submitting || !hasOpenTimesheet}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40">
            <i className="ri-send-plane-line" /> {submitting ? 'Submitting…' : 'Submit timesheet'}
          </button>
        </div>
        {loading ? (
          <div className="px-4 py-10 text-center text-neutral-400"><i className="ri-loader-4-line animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center"><p className="text-sm text-neutral-400">No punches in this period</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-500">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                  <th className="text-left px-4 py-2.5 font-semibold">In</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Break</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Out</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Worked</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.date} className="border-t border-neutral-100 hover:bg-neutral-50/70 transition-colors">
                    <td className="px-4 py-3 text-neutral-800 font-medium">{new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                    <td className="px-4 py-3 text-neutral-700 tabular-nums">{r.in ? fmtTime(r.in) : '—'}</td>
                    <td className="px-4 py-3 text-neutral-700 tabular-nums">{r.breakSec ? fmtShortDur(r.breakSec) : '—'}</td>
                    <td className="px-4 py-3 text-neutral-700 tabular-nums">{r.out ? fmtTime(r.out) : '—'}</td>
                    <td className="px-4 py-3 text-neutral-900 font-semibold tabular-nums">{fmtShortDur(r.workedSec)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${r.status === 'open' ? 'bg-amber-50 text-amber-700' : r.timesheetStatus === 'approved' ? 'bg-emerald-50 text-emerald-700' : r.timesheetStatus === 'submitted' ? 'bg-sky-50 text-sky-700' : 'bg-neutral-100 text-neutral-500'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {r.status === 'open' ? 'Open' : r.timesheetStatus === 'approved' ? 'Approved' : r.timesheetStatus === 'submitted' ? 'Submitted' : r.timesheetStatus === 'returned' ? 'Returned' : 'Complete'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {submitted && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm px-5 py-3 rounded-2xl">
          Timesheet submitted for review
        </div>
      )}
    </div>
  );
}