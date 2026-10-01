import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fmtTime, fmtDur, fmtDurShort, fmtDay, exportCsv, rangeStart, type SessionRow } from './attendanceUtils';

type RangeKey = 'today' | 'week' | 'month';
type Tab = 'daily' | 'inout' | 'breaks' | 'sched' | 'exceptions' | 'errors' | 'audit';

interface EventRow { id: string; user_id: string; session_id: string; event_type: string; occurred_at: string; break_type: string | null; note: string | null; }
interface ErrorRow { id: string; user_id: string | null; error_type: string; detail: string | null; created_at: string; }
interface AuditRow { id: string; user_id: string | null; action: string; field: string | null; old_value: string | null; new_value: string | null; reason: string | null; created_at: string; }
interface BreakType { id: string; name: string; paid: boolean; }

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'daily', label: 'Daily Hours', icon: 'ri-calendar-line' },
  { key: 'inout', label: 'In/Out Activity', icon: 'ri-login-box-line' },
  { key: 'breaks', label: 'Breaks', icon: 'ri-cup-line' },
  { key: 'sched', label: 'Scheduled vs Actual', icon: 'ri-scales-3-line' },
  { key: 'exceptions', label: 'Exceptions', icon: 'ri-alarm-warning-line' },
  { key: 'errors', label: 'Error Log', icon: 'ri-bug-line' },
  { key: 'audit', label: 'Audit', icon: 'ri-shield-check-line' },
];

export default function AttendanceReports() {
  const [range, setRange] = useState<RangeKey>('week');
  const [tab, setTab] = useState<Tab>('daily');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [scheduleMap, setScheduleMap] = useState<Map<string, number>>(new Map());
  const [breakTypes, setBreakTypes] = useState<BreakType[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const start = rangeStart(range).toISOString();
      const [sessRes, evRes, errRes, audRes, profRes, schedRes, btRes] = await Promise.all([
        supabase.from('og_attendance_sessions').select('*').gte('clock_in_at', start).order('clock_in_at', { ascending: true }),
        supabase.from('og_attendance_events').select('id,user_id,session_id,event_type,occurred_at,break_type,note').gte('occurred_at', start).order('occurred_at', { ascending: true }),
        supabase.from('og_attendance_errors').select('*').gte('created_at', start).order('created_at', { ascending: false }).limit(300),
        supabase.from('og_attendance_audit').select('*').gte('created_at', start).order('created_at', { ascending: false }).limit(300),
        supabase.from('profiles').select('user_id,name'),
        supabase.from('og_work_schedules').select('user_id,start_time,end_time').eq('enabled', true),
        supabase.from('og_break_types').select('id,name,paid'),
      ]);
      setSessions((sessRes.data || []) as SessionRow[]);
      setEvents((evRes.data || []) as EventRow[]);
      setErrors((errRes.data || []) as ErrorRow[]);
      setAudit((audRes.data || []) as AuditRow[]);
      setNames(new Map((profRes.data || []).map((p) => [p.user_id, p.name || 'Team member'])));
      const sm = new Map<string, number>();
      (schedRes.data || []).forEach((s) => {
        if (s.start_time && s.end_time) {
          const [sh, smn] = String(s.start_time).split(':').map(Number);
          const [eh, em] = String(s.end_time).split(':').map(Number);
          sm.set(s.user_id, Math.max(0, ((eh * 60 + em) - (sh * 60 + smn)) * 60));
        }
      });
      setScheduleMap(sm);
      setBreakTypes((btRes.data || []) as BreakType[]);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { void load(); }, [load]);

  const nm = (id: string | null) => (id ? names.get(id) || 'Team member' : '—');
  const paidFor = (t: string | null) => breakTypes.find((b) => b.name === t)?.paid ?? false;

  const daily = useMemo(() => {
    const map = new Map<string, { date: string; user: string; worked: number }>();
    sessions.forEach((s) => {
      const d = new Date(s.clock_in_at).toISOString().slice(0, 10);
      const key = `${s.user_id}|${d}`;
      const cur = map.get(key) || { date: d, user: nm(s.user_id), worked: 0 };
      cur.worked += s.hours_worked_sec || 0;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [sessions, names]);

  const breaks = useMemo(() => {
    const starts = events.filter((e) => e.event_type === 'break_start');
    const ends = events.filter((e) => e.event_type === 'break_end');
    const out: { date: string; user: string; type: string; start: string; end: string | null; dur: number; paid: boolean }[] = [];
    starts.forEach((s) => {
      const end = ends.find((e) => e.user_id === s.user_id && new Date(e.occurred_at) >= new Date(s.occurred_at));
      const dur = end ? Math.max(0, Math.floor((new Date(end.occurred_at).getTime() - new Date(s.occurred_at).getTime()) / 1000)) : 0;
      out.push({ date: s.occurred_at, user: nm(s.user_id), type: s.break_type || 'Other', start: s.occurred_at, end: end?.occurred_at || null, dur, paid: paidFor(s.break_type) });
    });
    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [events, names, breakTypes]);

  const schedRows = useMemo(() => {
    const byUser = new Map<string, { user: string; worked: number; days: Set<string> }>();
    sessions.forEach((s) => {
      const cur = byUser.get(s.user_id) || { user: nm(s.user_id), worked: 0, days: new Set<string>() };
      cur.worked += s.hours_worked_sec || 0;
      cur.days.add(new Date(s.clock_in_at).toISOString().slice(0, 10));
      byUser.set(s.user_id, cur);
    });
    return Array.from(byUser.entries()).map(([uid, v]) => {
      const per = scheduleMap.get(uid) || 8 * 3600;
      const scheduled = per * v.days.size;
      return { user: v.user, scheduled, actual: v.worked, diff: v.worked - scheduled };
    }).sort((a, b) => a.user.localeCompare(b.user));
  }, [sessions, names, scheduleMap]);

  const exceptions = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const out: { user: string; type: string; detail: string; when: string }[] = [];
    sessions.forEach((s) => {
      if (!s.clock_out_at && new Date(s.clock_in_at) < todayStart) out.push({ user: nm(s.user_id), type: 'Open shift', detail: `Punched in ${fmtDay(s.clock_in_at)} ${fmtTime(s.clock_in_at)}, no punch-out`, when: s.clock_in_at });
      if (s.status === 'break' && s.break_started_at && (Date.now() - new Date(s.break_started_at).getTime()) > 2 * 3600 * 1000) out.push({ user: nm(s.user_id), type: 'Excessive break', detail: `On break since ${fmtTime(s.break_started_at)}`, when: s.break_started_at });
      if ((s.late_sec || 0) > 0) out.push({ user: nm(s.user_id), type: 'Late arrival', detail: `${fmtDurShort(s.late_sec)} late on ${fmtDay(s.clock_in_at)}`, when: s.clock_in_at });
      if ((s.early_depart_sec || 0) >= 15 * 60) out.push({ user: nm(s.user_id), type: 'Early departure', detail: `${fmtDurShort(s.early_depart_sec)} early on ${fmtDay(s.clock_in_at)}`, when: s.clock_in_at });
    });
    return out.sort((a, b) => (a.when < b.when ? 1 : -1));
  }, [sessions, names]);

  const doExport = () => {
    if (tab === 'daily') exportCsv(`daily-hours-${range}.csv`, ['Date', 'Employee', 'Hours'], daily.map((d) => [d.date, d.user, fmtDurShort(d.worked)]));
    else if (tab === 'breaks') exportCsv(`breaks-${range}.csv`, ['Date', 'Employee', 'Type', 'Start', 'End', 'Duration', 'Paid'], breaks.map((b) => [fmtDay(b.date), b.user, b.type, fmtTime(b.start), b.end ? fmtTime(b.end) : 'Open', fmtDurShort(b.dur), b.paid ? 'Paid' : 'Unpaid']));
    else if (tab === 'sched') exportCsv(`scheduled-vs-actual-${range}.csv`, ['Employee', 'Scheduled', 'Actual', 'Difference'], schedRows.map((r) => [r.user, fmtDurShort(r.scheduled), fmtDurShort(r.actual), `${r.diff >= 0 ? '+' : '-'}${fmtDurShort(Math.abs(r.diff))}`]));
    else if (tab === 'exceptions') exportCsv(`attendance-exceptions-${range}.csv`, ['Employee', 'Type', 'Detail'], exceptions.map((e) => [e.user, e.type, e.detail]));
    else if (tab === 'errors') exportCsv(`attendance-errors-${range}.csv`, ['When', 'Employee', 'Type', 'Detail'], errors.map((e) => [new Date(e.created_at).toLocaleString('en-GB'), nm(e.user_id), e.error_type, e.detail || '']));
    else if (tab === 'audit') exportCsv(`attendance-audit-${range}.csv`, ['When', 'Employee', 'Action', 'Field', 'Old', 'New', 'Reason'], audit.map((a) => [new Date(a.created_at).toLocaleString('en-GB'), nm(a.user_id), a.action, a.field || '', a.old_value || '', a.new_value || '', a.reason || '']));
    else exportCsv(`inout-activity-${range}.csv`, ['When', 'Employee', 'Event', 'Note'], events.map((e) => [new Date(e.occurred_at).toLocaleString('en-GB'), nm(e.user_id), e.event_type, e.note || '']));
  };

  const th = 'text-left px-4 py-3 font-semibold';
  const td = 'px-4 py-3';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} aria-pressed={tab === t.key}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap border transition-all ${tab === t.key ? 'bg-[#0d5959] border-[#0d5959] text-white' : 'bg-[#012144] border-[#1c3a5e] text-[#9ca3af] hover:text-white'}`}>
              <i className={t.icon} /> {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full bg-[#001731] p-1 border border-[#1c3a5e]">
            {(['today', 'week', 'month'] as RangeKey[]).map((r) => (
              <button key={r} onClick={() => setRange(r)} aria-pressed={range === r}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${range === r ? 'bg-[#0d5959] text-white' : 'text-[#9ca3af] hover:text-white'}`}>
                {r === 'today' ? 'Today' : r === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
          <button onClick={doExport} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-download-2-line" /> Export
          </button>
        </div>
      </div>

      <div className="bg-[#012144] rounded-2xl border border-[#1c3a5e] overflow-hidden">
        {loading ? (
          <div className="px-4 py-10 text-center text-[#8b98ab]"><i className="ri-loader-4-line animate-spin inline-block" /></div>
        ) : (
          <div className="overflow-x-auto">
            {tab === 'daily' && (
              <table className="w-full text-sm">
                <thead className="bg-[#001731] text-xs text-[#8b98ab]"><tr><th className={th}>Date</th><th className={th}>Employee</th><th className="text-right px-4 py-3 font-semibold">Hours</th></tr></thead>
                <tbody>
                  {daily.length === 0 ? <tr><td colSpan={3} className={`${td} text-center text-[#8b98ab] py-8`}>No data</td></tr>
                    : daily.map((d, i) => <tr key={i} className="border-t border-[#1c3a5e] hover:bg-white/5"><td className={td}><span className="text-[#c6d0dc]">{fmtDay(d.date)}</span></td><td className={td}><span className="text-white">{d.user}</span></td><td className={`${td} text-right text-white font-semibold tabular-nums`}>{fmtDur(d.worked)}</td></tr>)}
                </tbody>
              </table>
            )}

            {tab === 'inout' && (
              <table className="w-full text-sm">
                <thead className="bg-[#001731] text-xs text-[#8b98ab]"><tr><th className={th}>When</th><th className={th}>Employee</th><th className={th}>Event</th><th className={th}>Note</th></tr></thead>
                <tbody>
                  {events.length === 0 ? <tr><td colSpan={4} className={`${td} text-center text-[#8b98ab] py-8`}>No events</td></tr>
                    : events.slice(0, 300).map((e) => {
                      const label = e.event_type === 'punch_in' ? 'Punched in' : e.event_type === 'punch_out' ? 'Punched out' : e.event_type === 'break_start' ? `Break start${e.break_type ? ` (${e.break_type})` : ''}` : 'Break end';
                      const dot = e.event_type === 'punch_in' ? 'bg-emerald-400' : e.event_type === 'punch_out' ? 'bg-sky-400' : 'bg-amber-400';
                      return <tr key={e.id} className="border-t border-[#1c3a5e] hover:bg-white/5"><td className={td}><span className="text-[#c6d0dc]">{new Date(e.occurred_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></td><td className={td}><span className="text-white">{nm(e.user_id)}</span></td><td className={td}><span className="inline-flex items-center gap-2 text-[#c6d0dc]"><span className={`w-1.5 h-1.5 rounded-full ${dot}`} />{label}</span></td><td className={td}><span className="text-[#8b98ab] text-xs">{e.note || '—'}</span></td></tr>;
                    })}
                </tbody>
              </table>
            )}

            {tab === 'breaks' && (
              <table className="w-full text-sm">
                <thead className="bg-[#001731] text-xs text-[#8b98ab]"><tr><th className={th}>Date</th><th className={th}>Employee</th><th className={th}>Type</th><th className={th}>Start</th><th className={th}>End</th><th className="text-right px-4 py-3 font-semibold">Duration</th><th className={th}>Paid</th></tr></thead>
                <tbody>
                  {breaks.length === 0 ? <tr><td colSpan={7} className={`${td} text-center text-[#8b98ab] py-8`}>No breaks</td></tr>
                    : breaks.map((b, i) => <tr key={i} className="border-t border-[#1c3a5e] hover:bg-white/5"><td className={td}><span className="text-[#c6d0dc]">{fmtDay(b.date)}</span></td><td className={td}><span className="text-white">{b.user}</span></td><td className={td}><span className="text-[#c6d0dc]">{b.type}</span></td><td className={td}><span className="text-[#c6d0dc] tabular-nums">{fmtTime(b.start)}</span></td><td className={td}><span className="text-[#c6d0dc] tabular-nums">{b.end ? fmtTime(b.end) : 'Open'}</span></td><td className={`${td} text-right text-white tabular-nums`}>{b.dur ? fmtDurShort(b.dur) : '—'}</td><td className={td}><span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${b.paid ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/60'}`}>{b.paid ? 'Paid' : 'Unpaid'}</span></td></tr>)}
                </tbody>
              </table>
            )}

            {tab === 'sched' && (
              <table className="w-full text-sm">
                <thead className="bg-[#001731] text-xs text-[#8b98ab]"><tr><th className={th}>Employee</th><th className="text-right px-4 py-3 font-semibold">Scheduled</th><th className="text-right px-4 py-3 font-semibold">Actual</th><th className="text-right px-4 py-3 font-semibold">Difference</th></tr></thead>
                <tbody>
                  {schedRows.length === 0 ? <tr><td colSpan={4} className={`${td} text-center text-[#8b98ab] py-8`}>No data</td></tr>
                    : schedRows.map((r, i) => <tr key={i} className="border-t border-[#1c3a5e] hover:bg-white/5"><td className={td}><span className="text-white">{r.user}</span></td><td className={`${td} text-right text-[#c6d0dc] tabular-nums`}>{fmtDur(r.scheduled)}</td><td className={`${td} text-right text-white font-semibold tabular-nums`}>{fmtDur(r.actual)}</td><td className={`${td} text-right tabular-nums font-semibold ${r.diff >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{r.diff >= 0 ? '+' : '-'}{fmtDurShort(Math.abs(r.diff))}</td></tr>)}
                </tbody>
              </table>
            )}

            {tab === 'exceptions' && (
              <table className="w-full text-sm">
                <thead className="bg-[#001731] text-xs text-[#8b98ab]"><tr><th className={th}>Employee</th><th className={th}>Exception</th><th className={th}>Detail</th></tr></thead>
                <tbody>
                  {exceptions.length === 0 ? <tr><td colSpan={3} className={`${td} text-center text-[#8b98ab] py-8`}>No exceptions — all clean</td></tr>
                    : exceptions.map((e, i) => <tr key={i} className="border-t border-[#1c3a5e] hover:bg-white/5"><td className={td}><span className="text-white">{e.user}</span></td><td className={td}><span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-400/15 text-amber-300 whitespace-nowrap">{e.type}</span></td><td className={td}><span className="text-[#c6d0dc] text-xs">{e.detail}</span></td></tr>)}
                </tbody>
              </table>
            )}

            {tab === 'errors' && (
              <table className="w-full text-sm">
                <thead className="bg-[#001731] text-xs text-[#8b98ab]"><tr><th className={th}>When</th><th className={th}>Employee</th><th className={th}>Type</th><th className={th}>Detail</th></tr></thead>
                <tbody>
                  {errors.length === 0 ? <tr><td colSpan={4} className={`${td} text-center text-[#8b98ab] py-8`}>No errors logged</td></tr>
                    : errors.map((e) => <tr key={e.id} className="border-t border-[#1c3a5e] hover:bg-white/5"><td className={td}><span className="text-[#c6d0dc]">{new Date(e.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></td><td className={td}><span className="text-white">{nm(e.user_id)}</span></td><td className={td}><span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-red-400/15 text-red-300 whitespace-nowrap">{e.error_type}</span></td><td className={td}><span className="text-[#8b98ab] text-xs">{e.detail || '—'}</span></td></tr>)}
                </tbody>
              </table>
            )}

            {tab === 'audit' && (
              <table className="w-full text-sm">
                <thead className="bg-[#001731] text-xs text-[#8b98ab]"><tr><th className={th}>When</th><th className={th}>Employee</th><th className={th}>Action</th><th className={th}>Change</th><th className={th}>Reason</th></tr></thead>
                <tbody>
                  {audit.length === 0 ? <tr><td colSpan={5} className={`${td} text-center text-[#8b98ab] py-8`}>No audit entries</td></tr>
                    : audit.map((a) => <tr key={a.id} className="border-t border-[#1c3a5e] hover:bg-white/5"><td className={td}><span className="text-[#c6d0dc]">{new Date(a.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></td><td className={td}><span className="text-white">{nm(a.user_id)}</span></td><td className={td}><span className="text-[#c6d0dc] capitalize">{a.action.replace(/_/g, ' ')}</span></td><td className={td}><span className="text-[#8b98ab] text-xs">{a.field ? `${a.field}: ${a.old_value ? fmtTime(a.old_value) : '—'} → ${a.new_value ? fmtTime(a.new_value) : '—'}` : '—'}</span></td><td className={td}><span className="text-[#8b98ab] text-xs">{a.reason || '—'}</span></td></tr>)}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}