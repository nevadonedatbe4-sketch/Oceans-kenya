import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/pages/agent/ogroup/components/Avatar';
import { fmtTime, fmtDur, fmtDay, isOpenShift, type SessionRow, type MemberRow } from './attendanceUtils';

interface Props { onOpenMember: (m: MemberRow) => void; }

export default function AttendanceDashboard({ onOpenMember }: Props) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [overtimeToday, setOvertimeToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Auto-close any shift that has passed its maximum length before we read,
      // so admin views never show a runaway open shift.
      try { await supabase.functions.invoke('og-checkin', { body: { action: 'admin_sweep_expired' } }); } catch { /* non-fatal */ }
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const [profilesRes, sessionsRes] = await Promise.all([
        supabase.from('profiles').select('user_id,name,avatar,role').eq('status', 'active'),
        supabase.from('og_attendance_sessions').select('*').gte('clock_in_at', todayStart.toISOString()).order('clock_in_at', { ascending: false }),
      ]);
      if (profilesRes.error) throw profilesRes.error;

      // Also fetch any abandoned open shift from before today.
      const { data: preOpen } = await supabase.from('og_attendance_sessions').select('*').is('clock_out_at', null).lt('clock_in_at', todayStart.toISOString());

      const all = [...((sessionsRes.data || []) as SessionRow[]), ...((preOpen || []) as SessionRow[])];
      const openByUser = new Map<string, SessionRow>();
      const workedByUser = new Map<string, number>();
      all.forEach((s) => {
        if (!s.clock_out_at && (!openByUser.has(s.user_id) || new Date(s.clock_in_at) > new Date(openByUser.get(s.user_id)!.clock_in_at))) {
          openByUser.set(s.user_id, s);
        }
        workedByUser.set(s.user_id, (workedByUser.get(s.user_id) || 0) + (s.hours_worked_sec || 0));
      });

      const rows: MemberRow[] = (profilesRes.data || []).map((p) => {
        const open = openByUser.get(p.user_id) || null;
        return {
          user_id: p.user_id, name: p.name || 'Team member', avatar: p.avatar, role: p.role,
          openSession: open, todayWorkedSec: workedByUser.get(p.user_id) || 0,
          openShift: !!open && isOpenShift(open, todayStart),
        };
      });
      setMembers(rows);
      setOvertimeToday((sessionsRes.data || []).reduce((sum, s: SessionRow) => sum + (s.overtime_sec || 0), 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load attendance.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setTick(Date.now()), 30000); return () => clearInterval(t); }, []);

  const stats = useMemo(() => {
    const working = members.filter((m) => m.openSession?.status === 'working').length;
    const onBreak = members.filter((m) => m.openSession?.status === 'break').length;
    const openShifts = members.filter((m) => m.openShift).length;
    const notIn = members.filter((m) => !m.openSession).length;
    const flagged = members.filter((m) => m.openSession?.flagged_geofence).length;
    return { working, onBreak, notIn, openShifts, missing: openShifts, overtimeToday, flagged };
  }, [members, overtimeToday]);

  const cards = [
    { label: 'Currently working', value: stats.working, tone: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' },
    { label: 'On break', value: stats.onBreak, tone: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
    { label: 'Not punched in', value: stats.notIn, tone: 'bg-[#012144] border-[#1c3a5e] text-white' },
    { label: 'Open shifts', value: stats.openShifts, tone: 'bg-red-500/10 border-red-500/30 text-red-300' },
    { label: 'Outside area', value: stats.flagged, tone: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
    { label: 'Missing punches', value: stats.missing, tone: 'bg-red-500/10 border-red-500/30 text-red-300' },
    { label: 'Overtime today', value: fmtDur(stats.overtimeToday), tone: 'bg-teal-500/10 border-teal-500/30 text-teal-300' },
  ];

  const since = (m: MemberRow) => {
    if (!m.openSession) return '—';
    if (m.openShift) return `${fmtDay(m.openSession.clock_in_at)}`;
    const secs = Math.max(0, Math.floor((tick - new Date(m.openSession.clock_in_at).getTime()) / 1000));
    return `for ${fmtDur(secs)}`;
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.tone}`}>
            <p className="text-[11px] uppercase tracking-wider opacity-80">{c.label}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 text-red-300">
          <i className="ri-error-warning-line" /><p className="flex-1 text-sm">{error}</p>
          <button onClick={() => void load()} className="text-xs font-semibold underline cursor-pointer whitespace-nowrap">Retry</button>
        </div>
      )}

      <div className="bg-[#012144] rounded-2xl border border-[#1c3a5e] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c3a5e]">
          <div className="flex items-center gap-2 text-white">
            <i className="ri-live-line text-teal-300" />
            <p className="text-sm font-semibold">Live team</p>
          </div>
          <button onClick={() => void load()} className="text-xs font-semibold text-[#9fb0c3] hover:text-white cursor-pointer whitespace-nowrap"><i className="ri-refresh-line mr-1" />Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#001731] text-xs text-[#8b98ab]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Employee</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Since</th>
                <th className="text-left px-4 py-3 font-semibold">Today</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8b98ab]"><i className="ri-loader-4-line animate-spin inline-block" /></td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8b98ab]">No team members</td></tr>
              ) : members.map((m) => {
                const st = m.openSession?.status;
                const badge = m.openShift
                  ? { text: 'Open shift', cls: 'bg-red-400/15 text-red-300' }
                  : st === 'working' ? { text: 'Working', cls: 'bg-emerald-400/15 text-emerald-300' }
                    : st === 'break' ? { text: 'On break', cls: 'bg-amber-400/15 text-amber-300' }
                      : { text: 'Off shift', cls: 'bg-white/10 text-white/60' };
                return (
                  <tr key={m.user_id} className="border-t border-[#1c3a5e] hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.name} avatar_url={m.avatar} userId={m.user_id} size={32} />
                        <div><p className="font-medium text-white">{m.name}</p><p className="text-[11px] text-[#8b98ab] capitalize">{m.role}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${badge.cls}`}>{badge.text}</span>
                        {m.openSession?.flagged_geofence && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap bg-amber-400/15 text-amber-300" title="Punched in outside the office area">
                            <i className="ri-map-pin-user-line" /> Outside area
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#c6d0dc]">{since(m)}</td>
                    <td className="px-4 py-3 text-[#c6d0dc] tabular-nums">{fmtDur(m.todayWorkedSec)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => onOpenMember(m)} className="text-xs font-semibold text-teal-300 hover:underline cursor-pointer whitespace-nowrap">View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}