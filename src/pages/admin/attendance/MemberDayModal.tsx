import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/pages/agent/ogroup/components/Avatar';
import { fmtTime, fmtDur, isOpenShift, isAutoClosed, type SessionRow, type MemberRow } from './attendanceUtils';

interface EventRow { id: string; event_type: string; occurred_at: string; break_type: string | null; note: string | null; session_id: string; }

interface Props { member: MemberRow; onClose: () => void; onDone: () => void; }

export default function MemberDayModal({ member, onClose, onDone }: Props) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { data: sess } = await supabase.from('og_attendance_sessions').select('*')
        .eq('user_id', member.user_id).gte('clock_in_at', todayStart.toISOString()).order('clock_in_at', { ascending: true });
      const list = (sess || []) as SessionRow[];
      // include a pre-today open shift if present
      const { data: pre } = await supabase.from('og_attendance_sessions').select('*').eq('user_id', member.user_id).is('clock_out_at', null).lt('clock_in_at', todayStart.toISOString());
      const all = [...((pre || []) as SessionRow[]), ...list];
      setSessions(all);
      const ids = all.map((s) => s.id);
      if (ids.length) {
        const { data: ev } = await supabase.from('og_attendance_events').select('id,event_type,occurred_at,break_type,note,session_id').in('session_id', ids).order('occurred_at', { ascending: true });
        setEvents((ev || []) as EventRow[]);
      } else setEvents([]);
    } finally { setLoading(false); }
  }, [member.user_id]);

  useEffect(() => { void load(); }, [load]);

  const openSession = sessions.find((s) => !s.clock_out_at) || null;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const abandoned = openSession ? isOpenShift(openSession, todayStart) : false;

  const submitEdit = async () => {
    if (!openSession || !editValue || !reason.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('og-checkin', {
        body: { action: 'admin_edit_time', session_id: openSession.id, field: 'clock_out', value: new Date(editValue).toISOString(), reason },
      });
      if (error) throw error;
      setMsg('Punch-out set and logged');
      setEditOpen(false); setEditValue(''); setReason('');
      await load(); onDone();
    } catch { setMsg('Could not update the time'); } finally { setBusy(false); }
  };

  const evLabel = (e: EventRow) => e.event_type === 'punch_in' ? 'Punched in' : e.event_type === 'punch_out' ? 'Punched out' : e.event_type === 'break_start' ? `Break start${e.break_type ? ` (${e.break_type})` : ''}` : 'Break end';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#012144] rounded-2xl border border-[#1c3a5e] p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Avatar name={member.name} avatar_url={member.avatar} userId={member.user_id} size={40} />
            <div>
              <h3 className="text-base font-semibold text-white">{member.name}</h3>
              <p className="text-xs text-[#8b98ab] capitalize">{member.role} · today {fmtDur(member.todayWorkedSec)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8b98ab] hover:text-white cursor-pointer"><i className="ri-close-line text-xl" /></button>
        </div>

        {abandoned && openSession && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 mb-4">
            <div className="flex items-start gap-2">
              <i className="ri-alarm-warning-line text-red-300 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-300">Open shift since {fmtTime(openSession.clock_in_at)}</p>
                <p className="text-xs text-[#c6d0dc] mt-0.5">This employee never punched out. Set an accurate punch-out time (an audit entry will be recorded).</p>
              </div>
            </div>
            {!editOpen ? (
              <button onClick={() => { setEditOpen(true); setEditValue(new Date().toISOString().slice(0, 16)); }}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20 cursor-pointer whitespace-nowrap">
                <i className="ri-edit-2-line" /> Edit time
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8b98ab]">Correct punch-out</label>
                <input type="datetime-local" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#001731] border border-[#1c3a5e] text-sm text-white focus:outline-none" />
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8b98ab]">Reason (required)</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} placeholder="Employee forgot to punch out" className="w-full px-3 py-2 rounded-lg bg-[#001731] border border-[#1c3a5e] text-sm text-white resize-none focus:outline-none" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditOpen(false)} className="px-3 py-1.5 rounded-lg text-xs text-[#9ca3af] hover:bg-white/5 cursor-pointer">Cancel</button>
                  <button disabled={busy || !reason.trim() || !editValue} onClick={submitEdit} className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer disabled:opacity-40 whitespace-nowrap">Save correction</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8b98ab] mb-2">Sessions</p>
            {loading ? <p className="text-sm text-[#8b98ab]"><i className="ri-loader-4-line animate-spin" /></p> : sessions.length === 0 ? <p className="text-sm text-[#8b98ab]">No sessions today</p> : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div key={s.id} className="rounded-xl bg-[#001731] border border-[#1c3a5e] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white tabular-nums">{fmtTime(s.clock_in_at)} → {s.clock_out_at ? fmtTime(s.clock_out_at) : <span className="text-red-300">open</span>}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${s.status === 'completed' ? 'bg-emerald-400/15 text-emerald-300' : s.status === 'break' ? 'bg-amber-400/15 text-amber-300' : 'bg-sky-400/15 text-sky-300'}`}>{s.status}</span>
                    </div>
                    {isAutoClosed(s) && (
                      <p className="text-[11px] text-amber-300 mt-1.5 inline-flex items-center gap-1"><i className="ri-timer-flash-line" /> Auto-closed at max shift length</p>
                    )}
                    <p className="text-xs text-[#8b98ab] mt-1">Worked {s.hours_worked_sec != null ? fmtDur(s.hours_worked_sec) : '—'} · Break {s.break_sec ? fmtDur(s.break_sec) : '0m'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8b98ab] mb-2">Punch events</p>
            {events.length === 0 ? <p className="text-sm text-[#8b98ab]">No events</p> : (
              <ol className="relative border-l border-[#1c3a5e] ml-1 space-y-3">
                {events.map((e) => (
                  <li key={e.id} className="ml-4">
                    <span className="absolute -left-[5px] w-2.5 h-2.5 rounded-full bg-teal-400" />
                    <p className="text-sm text-white">{evLabel(e)}</p>
                    <p className="text-[11px] text-[#8b98ab]">{new Date(e.occurred_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {msg && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm px-5 py-3 rounded-2xl">{msg}</div>}
      </div>
    </div>
  );
}