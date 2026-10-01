import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/pages/agent/ogroup/components/Avatar';
import { fmtDur, fmtDurShort, exportCsv, rangeStart, type SessionRow } from './attendanceUtils';

type RangeKey = 'today' | 'week' | 'month';

interface Row {
  user_id: string;
  name: string;
  avatar: string | null;
  role: string | null;
  workedSec: number;
  breakSec: number;
  overtimeSec: number;
  scheduledSec: number;
  daysWorked: number;
  openDays: number;
  status: 'complete' | 'open' | 'approved' | 'submitted' | 'returned';
}

export default function TeamTimesheets() {
  const [range, setRange] = useState<RangeKey>('week');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const start = rangeStart(range);
      const { data: sessions } = await supabase.from('og_attendance_sessions').select('*').gte('clock_in_at', start.toISOString());
      const { data: profiles } = await supabase.from('profiles').select('user_id,name,avatar,role').eq('status', 'active');
      const { data: schedules } = await supabase.from('og_work_schedules').select('user_id,start_time,end_time').eq('enabled', true);

      const schedMap = new Map<string, number>();
      (schedules || []).forEach((s) => {
        if (s.start_time && s.end_time) {
          const [sh, sm] = String(s.start_time).split(':').map(Number);
          const [eh, em] = String(s.end_time).split(':').map(Number);
          schedMap.set(s.user_id, Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) * 60));
        }
      });

      const byUser = new Map<string, SessionRow[]>();
      (sessions || []).forEach((s) => { const arr = byUser.get(s.user_id) || []; arr.push(s as SessionRow); byUser.set(s.user_id, arr); });

      const out: Row[] = (profiles || []).map((p) => {
        const list = byUser.get(p.user_id) || [];
        const days = new Set(list.map((s) => new Date(s.clock_in_at).toISOString().slice(0, 10)));
        const worked = list.reduce((a, s) => a + (s.hours_worked_sec || 0), 0);
        const breakSec = list.reduce((a, s) => a + (s.break_sec || 0), 0);
        const overtime = list.reduce((a, s) => a + (s.overtime_sec || 0), 0);
        const openDays = list.filter((s) => !s.clock_out_at).length;
        const perDay = schedMap.get(p.user_id) || 8 * 3600;
        let status: Row['status'] = 'complete';
        if (openDays > 0) status = 'open';
        else if (list.some((s) => s.timesheet_status === 'submitted')) status = 'submitted';
        else if (list.some((s) => s.timesheet_status === 'returned')) status = 'returned';
        else if (list.length > 0 && list.every((s) => s.timesheet_status === 'approved')) status = 'approved';
        return { user_id: p.user_id, name: p.name || 'Team member', avatar: p.avatar, role: p.role, workedSec: worked, breakSec, overtimeSec: overtime, scheduledSec: perDay * days.size, daysWorked: days.size, openDays, status };
      }).filter((r) => r.daysWorked > 0);

      setRows(out);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  }), [rows, search, statusFilter]);

  const setStatus = async (r: Row, statusValue: 'approved' | 'returned') => {
    setBusyId(r.user_id);
    try {
      const start = rangeStart(range);
      const { error } = await supabase.functions.invoke('og-checkin', {
        body: { action: 'admin_timesheet_status', user_id: r.user_id, status: statusValue, from: start.toISOString(), reason: statusValue === 'returned' ? 'Returned for correction' : 'Approved' },
      });
      if (error) throw error;
      setMessage(`${r.name}'s timesheet ${statusValue === 'approved' ? 'approved' : 'returned'}`);
      setTimeout(() => setMessage(null), 3200);
      await load();
    } catch {
      setMessage('Could not update the timesheet.');
      setTimeout(() => setMessage(null), 3200);
    } finally {
      setBusyId(null);
    }
  };

  const doExport = () => {
    exportCsv(`team-timesheets-${range}.csv`,
      ['Employee', 'Days worked', 'Scheduled', 'Worked', 'Break', 'Overtime', 'Status'],
      filtered.map((r) => [r.name, r.daysWorked, fmtDurShort(r.scheduledSec), fmtDurShort(r.workedSec), fmtDurShort(r.breakSec), fmtDurShort(r.overtimeSec), r.status]));
  };

  const badge = (s: Row['status']) => {
    const map: Record<Row['status'], string> = {
      complete: 'bg-white/10 text-white/70',
      approved: 'bg-emerald-400/15 text-emerald-300',
      submitted: 'bg-sky-400/15 text-sky-300',
      returned: 'bg-amber-400/15 text-amber-300',
      open: 'bg-red-400/15 text-red-300',
    };
    return map[s];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1 rounded-full bg-[#001731] p-1 border border-[#1c3a5e]">
            {(['today', 'week', 'month'] as RangeKey[]).map((r) => (
              <button key={r} onClick={() => setRange(r)} aria-pressed={range === r}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${range === r ? 'bg-[#0d5959] text-white' : 'text-[#9ca3af] hover:text-white'}`}>
                {r === 'today' ? 'Today' : r === 'week' ? 'This week' : 'This month'}
              </button>
            ))}
          </div>
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#8b98ab] text-sm" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee…"
              className="pl-9 pr-3 py-2 rounded-full bg-[#001731] border border-[#1c3a5e] text-sm text-white placeholder:text-[#8b98ab] focus:outline-none focus:border-[#2a5480] w-52" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-full bg-[#001731] border border-[#1c3a5e] text-sm text-white focus:outline-none cursor-pointer">
            <option value="all">All statuses</option>
            <option value="complete">Complete</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="returned">Returned</option>
            <option value="open">Open / missing</option>
          </select>
        </div>
        <button onClick={doExport} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-download-2-line" /> Export
        </button>
      </div>

      <div className="bg-[#012144] rounded-2xl border border-[#1c3a5e] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#001731] text-xs text-[#8b98ab]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Employee</th>
                <th className="text-right px-4 py-3 font-semibold">Days</th>
                <th className="text-right px-4 py-3 font-semibold">Scheduled</th>
                <th className="text-right px-4 py-3 font-semibold">Worked</th>
                <th className="text-right px-4 py-3 font-semibold">Break</th>
                <th className="text-right px-4 py-3 font-semibold">Overtime</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Approval</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#8b98ab]"><i className="ri-loader-4-line animate-spin inline-block" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#8b98ab]">No records in this period</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.user_id} className="border-t border-[#1c3a5e] hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.name} avatar_url={r.avatar} userId={r.user_id} size={32} />
                      <div><p className="font-medium text-white">{r.name}</p><p className="text-[11px] text-[#8b98ab] capitalize">{r.role}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-[#c6d0dc] tabular-nums">{r.daysWorked}</td>
                  <td className="px-4 py-3 text-right text-[#c6d0dc] tabular-nums">{fmtDur(r.scheduledSec)}</td>
                  <td className="px-4 py-3 text-right text-white font-semibold tabular-nums">{fmtDur(r.workedSec)}</td>
                  <td className="px-4 py-3 text-right text-[#c6d0dc] tabular-nums">{fmtDur(r.breakSec)}</td>
                  <td className="px-4 py-3 text-right text-[#c6d0dc] tabular-nums">{r.overtimeSec ? fmtDur(r.overtimeSec) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap capitalize ${badge(r.status)}`}>{r.status === 'open' ? 'Open shift' : r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button disabled={busyId === r.user_id || r.status === 'open'} onClick={() => setStatus(r, 'approved')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 cursor-pointer disabled:opacity-40 whitespace-nowrap">Approve</button>
                      <button disabled={busyId === r.user_id || r.status === 'open'} onClick={() => setStatus(r, 'returned')}
                        className="px-2.5 py-1 rounded-lg bg-white/10 text-white/80 text-[11px] font-semibold hover:bg-white/20 cursor-pointer disabled:opacity-40 whitespace-nowrap">Return</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {message && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm px-5 py-3 rounded-2xl">{message}</div>}
    </div>
  );
}