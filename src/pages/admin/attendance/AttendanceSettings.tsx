import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOfficeLocations } from '@/hooks/useOfficeLocations';
import OfficeGeofenceSettings from './OfficeGeofenceSettings';

interface BreakType { id: string; name: string; paid: boolean; enabled: boolean; sort_order: number; }
interface Staff { user_id: string; name: string | null; role: string | null; }
interface Schedule { id?: string; work_days: number[]; start_time: string; end_time: string; break_minutes: number; }
interface Policy { mode: string; work_start_time: string; work_end_time: string; lateness_grace_min: number; overtime_threshold_min: number; break_minutes: number; office_location_id: string | null; allowed_radius_m: number | null; max_shift_minutes: number; }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#001731] border border-[#1c3a5e] text-sm text-white focus:outline-none focus:border-[#2a5480]';
const labelCls = 'text-[11px] font-semibold uppercase tracking-wider text-[#8b98ab] mb-1 block';

export default function AttendanceSettings() {
  const officeState = useOfficeLocations();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [breakTypes, setBreakTypes] = useState<BreakType[]>([]);
  const [userId, setUserId] = useState('');
  const [schedule, setSchedule] = useState<Schedule>({ work_days: [1, 2, 3, 4, 5], start_time: '08:30', end_time: '17:00', break_minutes: 60 });
  const [policy, setPolicy] = useState<Policy>({ mode: 'hybrid', work_start_time: '08:30', work_end_time: '17:00', lateness_grace_min: 5, overtime_threshold_min: 0, break_minutes: 60, office_location_id: null, allowed_radius_m: null, max_shift_minutes: 720 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newBreak, setNewBreak] = useState('');
  const [newPaid, setNewPaid] = useState(false);

  const loadBase = useCallback(async () => {
    const [profRes, btRes] = await Promise.all([
      supabase.from('profiles').select('user_id,name,role').eq('status', 'active').order('name'),
      supabase.from('og_break_types').select('*').order('sort_order'),
    ]);
    setStaff((profRes.data || []) as Staff[]);
    setBreakTypes((btRes.data || []) as BreakType[]);
    if (!userId && profRes.data?.[0]) setUserId(profRes.data[0].user_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadForUser = useCallback(async (uid: string) => {
    if (!uid) return;
    const [schedRes, polRes] = await Promise.all([
      supabase.from('og_work_schedules').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('og_attendance_policies').select('*').eq('user_id', uid).maybeSingle(),
    ]);
    if (schedRes.data) setSchedule({ id: schedRes.data.id, work_days: schedRes.data.work_days || [1, 2, 3, 4, 5], start_time: String(schedRes.data.start_time).slice(0, 5), end_time: String(schedRes.data.end_time).slice(0, 5), break_minutes: schedRes.data.break_minutes });
    else setSchedule({ work_days: [1, 2, 3, 4, 5], start_time: '08:30', end_time: '17:00', break_minutes: 60 });
    if (polRes.data) setPolicy({ mode: polRes.data.mode || 'hybrid', work_start_time: String(polRes.data.work_start_time).slice(0, 5), work_end_time: String(polRes.data.work_end_time).slice(0, 5), lateness_grace_min: polRes.data.lateness_grace_min ?? 5, overtime_threshold_min: polRes.data.overtime_threshold_min ?? 0, break_minutes: polRes.data.break_minutes ?? 60, office_location_id: polRes.data.office_location_id ?? null, allowed_radius_m: polRes.data.allowed_radius_m ?? null, max_shift_minutes: polRes.data.max_shift_minutes ?? 720 });
    else setPolicy({ mode: 'hybrid', work_start_time: '08:30', work_end_time: '17:00', lateness_grace_min: 5, overtime_threshold_min: 0, break_minutes: 60, office_location_id: null, allowed_radius_m: null, max_shift_minutes: 720 });
  }, []);

  useEffect(() => { void loadBase(); }, [loadBase]);
  useEffect(() => { void loadForUser(userId); }, [userId, loadForUser]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  const saveSchedule = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const payload = { user_id: userId, scope: 'agent', work_days: schedule.work_days, start_time: schedule.start_time, end_time: schedule.end_time, break_minutes: schedule.break_minutes, enabled: true };
      const { error } = schedule.id
        ? await supabase.from('og_work_schedules').update(payload).eq('id', schedule.id)
        : await supabase.from('og_work_schedules').insert(payload);
      if (error) throw error;
      flash('Shift schedule saved'); await loadForUser(userId);
    } catch { flash('Could not save the schedule'); } finally { setBusy(false); }
  };

  const savePolicy = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const { data: existing } = await supabase.from('og_attendance_policies').select('id').eq('user_id', userId).maybeSingle();
      const payload = { user_id: userId, scope: 'agent', mode: policy.mode, work_start_time: policy.work_start_time, work_end_time: policy.work_end_time, lateness_grace_min: policy.lateness_grace_min, overtime_threshold_min: policy.overtime_threshold_min, break_minutes: policy.break_minutes, office_location_id: policy.office_location_id || null, allowed_radius_m: policy.allowed_radius_m ?? null, max_shift_minutes: policy.max_shift_minutes || 720, enabled: true };
      const { error } = existing
        ? await supabase.from('og_attendance_policies').update(payload).eq('id', existing.id)
        : await supabase.from('og_attendance_policies').insert(payload);
      if (error) throw error;
      flash('Attendance policy saved');
    } catch { flash('Could not save the policy'); } finally { setBusy(false); }
  };

  const addBreakType = async () => {
    if (!newBreak.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('og_break_types').insert({ name: newBreak.trim(), paid: newPaid, sort_order: breakTypes.length + 1, enabled: true });
      if (error) throw error;
      setNewBreak(''); setNewPaid(false);
      const { data } = await supabase.from('og_break_types').select('*').order('sort_order');
      setBreakTypes((data || []) as BreakType[]);
      flash('Break type added');
    } catch { flash('Could not add the break type'); } finally { setBusy(false); }
  };

  const toggleBreakType = async (b: BreakType, patch: Partial<BreakType>) => {
    await supabase.from('og_break_types').update(patch).eq('id', b.id);
    setBreakTypes((prev) => prev.map((x) => (x.id === b.id ? { ...x, ...patch } : x)));
  };

  const removeBreakType = async (b: BreakType) => {
    await supabase.from('og_break_types').delete().eq('id', b.id);
    setBreakTypes((prev) => prev.filter((x) => x.id !== b.id));
  };

  const card = 'bg-[#012144] rounded-2xl border border-[#1c3a5e] p-5';

  return (
    <div className="space-y-5">
      <OfficeGeofenceSettings state={officeState} />

      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <i className="ri-cup-line text-teal-300" />
          <h2 className="text-white font-semibold text-sm">Break types</h2>
        </div>
        <p className="text-xs text-[#8b98ab] mb-4">Configure which breaks agents can take and whether each is paid or unpaid.</p>
        <div className="space-y-2">
          {breakTypes.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#001731] border border-[#1c3a5e] px-3.5 py-2.5">
              <span className="text-sm text-white">{b.name}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleBreakType(b, { paid: !b.paid })} className={`text-[11px] px-2.5 py-1 rounded-full font-semibold cursor-pointer whitespace-nowrap ${b.paid ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/60'}`}>{b.paid ? 'Paid' : 'Unpaid'}</button>
                <button onClick={() => toggleBreakType(b, { enabled: !b.enabled })} className={`text-[11px] px-2.5 py-1 rounded-full font-semibold cursor-pointer whitespace-nowrap ${b.enabled ? 'bg-teal-400/15 text-teal-300' : 'bg-white/10 text-white/40'}`}>{b.enabled ? 'Enabled' : 'Disabled'}</button>
                <button onClick={() => removeBreakType(b)} aria-label="Delete" className="w-7 h-7 rounded-lg hover:bg-red-500/15 text-red-300 flex items-center justify-center cursor-pointer"><i className="ri-delete-bin-line" /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <input value={newBreak} onChange={(e) => setNewBreak(e.target.value)} placeholder="New break type (e.g. Prayer)" className={`${inputCls} flex-1 min-w-[180px]`} />
          <button onClick={() => setNewPaid((v) => !v)} className={`text-[11px] px-3 py-2 rounded-lg font-semibold cursor-pointer whitespace-nowrap ${newPaid ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/60'}`}>{newPaid ? 'Paid' : 'Unpaid'}</button>
          <button onClick={addBreakType} disabled={busy || !newBreak.trim()} className="px-4 py-2 rounded-lg bg-[#0d5959] text-white text-xs font-semibold hover:bg-[#0f6a6a] cursor-pointer disabled:opacity-40 whitespace-nowrap">Add</button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#8b98ab]">Configure for</label>
        <select value={userId} onChange={(e) => setUserId(e.target.value)} className="px-3 py-2 rounded-lg bg-[#001731] border border-[#1c3a5e] text-sm text-white cursor-pointer min-w-[220px]">
          {staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.name || 'Team member'} ({s.role})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={card}>
          <div className="flex items-center gap-2 mb-1">
            <i className="ri-calendar-schedule-line text-teal-300" />
            <h2 className="text-white font-semibold text-sm">Shift schedule</h2>
          </div>
          <p className="text-xs text-[#8b98ab] mb-4">Expected working hours. A schedule never creates a punch — it only defines expectations.</p>
          <label className={labelCls}>Working days</label>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => setSchedule((s) => ({ ...s, work_days: s.work_days.includes(i) ? s.work_days.filter((x) => x !== i) : [...s.work_days, i] }))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${schedule.work_days.includes(i) ? 'bg-[#0d5959] text-white' : 'bg-white/10 text-white/50'}`}>{d}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Start</label><input type="time" value={schedule.start_time} onChange={(e) => setSchedule((s) => ({ ...s, start_time: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>End</label><input type="time" value={schedule.end_time} onChange={(e) => setSchedule((s) => ({ ...s, end_time: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Break (min)</label><input type="number" min={0} value={schedule.break_minutes} onChange={(e) => setSchedule((s) => ({ ...s, break_minutes: Number(e.target.value) }))} className={inputCls} /></div>
          </div>
          <button onClick={saveSchedule} disabled={busy} className="mt-4 px-4 py-2 rounded-lg bg-[#0d5959] text-white text-xs font-semibold hover:bg-[#0f6a6a] cursor-pointer disabled:opacity-40 whitespace-nowrap">Save schedule</button>
        </div>

        <div className={card}>
          <div className="flex items-center gap-2 mb-1">
            <i className="ri-settings-3-line text-teal-300" />
            <h2 className="text-white font-semibold text-sm">Attendance policy</h2>
          </div>
          <p className="text-xs text-[#8b98ab] mb-4">Work mode, lateness and overtime rules for this employee.</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Mode</label>
              <select value={policy.mode} onChange={(e) => setPolicy((p) => ({ ...p, mode: e.target.value }))} className={`${inputCls} cursor-pointer`}>
                <option value="hybrid">Hybrid</option>
                <option value="office">Office</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div><label className={labelCls}>Grace (min)</label><input type="number" min={0} value={policy.lateness_grace_min} onChange={(e) => setPolicy((p) => ({ ...p, lateness_grace_min: Number(e.target.value) }))} className={inputCls} /></div>
            <div><label className={labelCls}>Work start</label><input type="time" value={policy.work_start_time} onChange={(e) => setPolicy((p) => ({ ...p, work_start_time: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Work end</label><input type="time" value={policy.work_end_time} onChange={(e) => setPolicy((p) => ({ ...p, work_end_time: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Overtime after (min past shift)</label><input type="number" min={0} value={policy.overtime_threshold_min} onChange={(e) => setPolicy((p) => ({ ...p, overtime_threshold_min: Number(e.target.value) }))} className={inputCls} /></div>
            <div><label className={labelCls}>Break (min)</label><input type="number" min={0} value={policy.break_minutes} onChange={(e) => setPolicy((p) => ({ ...p, break_minutes: Number(e.target.value) }))} className={inputCls} /></div>
            <div className="col-span-2">
              <label className={labelCls}>Maximum shift length (hours)</label>
              <input type="number" min={1} max={24} step={0.5} value={policy.max_shift_minutes ? policy.max_shift_minutes / 60 : 12} onChange={(e) => setPolicy((p) => ({ ...p, max_shift_minutes: Math.round(Number(e.target.value) * 60) || 720 }))} className={inputCls} />
              <p className="text-[11px] text-[#8b98ab] mt-1">A shift is automatically punched out when it reaches this length (default 12 hours).</p>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Geofence office (override)</label>
              <select value={policy.office_location_id || ''} onChange={(e) => setPolicy((p) => ({ ...p, office_location_id: e.target.value || null }))} className={`${inputCls} cursor-pointer`}>
                <option value="">Use the default office</option>
                {officeState.offices.map((o) => <option key={o.id} value={o.id}>{o.name}{o.is_default ? ' (default)' : ''}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Allowed radius override (m)</label>
              <input type="number" min={0} value={policy.allowed_radius_m ?? ''} onChange={(e) => setPolicy((p) => ({ ...p, allowed_radius_m: e.target.value === '' ? null : Number(e.target.value) }))} placeholder="Leave blank to use the office radius" className={inputCls} />
            </div>
          </div>
          <button onClick={savePolicy} disabled={busy} className="mt-4 px-4 py-2 rounded-lg bg-[#0d5959] text-white text-xs font-semibold hover:bg-[#0f6a6a] cursor-pointer disabled:opacity-40 whitespace-nowrap">Save policy</button>
        </div>
      </div>

      {msg && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm px-5 py-3 rounded-2xl">{msg}</div>}
    </div>
  );
}