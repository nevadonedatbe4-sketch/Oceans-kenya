import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/pages/agent/ogroup/components/Avatar';
import type { AttendanceSession } from '@/pages/agent/ogroup/useAttendance';
import type { AvailabilityRow, TimeOffRow } from '@/pages/agent/ogroup/calendarTypes';
import { fmtTime, startOfDay, endOfDay, KIND_COLOR } from '@/pages/agent/ogroup/calendarTypes';

interface TeamAgent {
  user_id: string;
  name: string;
  avatar: string | null;
  role: string | null;
  session?: AttendanceSession | null;
}
interface Appt {
  id: string;
  title: string;
  kind: string;
  status: string;
  starts_at: string;
  ends_at: string;
  assigned_user_id: string | null;
  client_name: string | null;
  property_title: string | null;
  agent_name?: string;
}
type Tab = 'team' | 'schedule';

function fmtDur(sec: number | null | undefined) {
  if (sec == null) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function AdminTeamOverview() {
  const [tab, setTab] = useState<Tab>('team');
  const [agents, setAgents] = useState<TeamAgent[]>([]);
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const today = startOfDay(new Date());
    const end = endOfDay(new Date());

    const [{ data: profiles }, { data: sessions }, { data: appts }, { data: avail }] = await Promise.all([
      supabase.from('profiles').select('user_id,name,avatar,role').eq('status', 'active'),
      supabase.from('og_attendance_sessions').select('*').gte('clock_in_at', today.toISOString()).order('clock_in_at', { ascending: false }),
      supabase.from('og_appointments').select('*').gte('starts_at', today.toISOString()).lt('starts_at', end.toISOString()).order('starts_at', { ascending: true }),
      supabase.from('og_availability').select('*'),
    ]);

    const sessByUser: Record<string, AttendanceSession[]> = {};
    (sessions || []).forEach((s) => { (sessByUser[s.user_id] = sessByUser[s.user_id] || []).push(s as AttendanceSession); });

    setAgents((profiles || []).filter((p) => p.role !== 'super_admin').map((p) => ({
      user_id: p.user_id, name: p.name || 'Agent', avatar: p.avatar, role: p.role,
      session: (sessByUser[p.user_id] || [])[0] || null,
    })));

    const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.name]));
    setAppointments((appts || []).map((a) => ({ ...a, agent_name: nameMap.get(a.assigned_user_id) })));
    setAvailability((avail || []) as AvailabilityRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => {
    const working = agents.filter((a) => a.session?.status === 'working').length;
    const onBreak = agents.filter((a) => a.session?.status === 'break').length;
    const offline = agents.filter((a) => !a.session).length;
    const upcoming = appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show').length;
    const viewings = appointments.filter((a) => a.kind === 'viewing' && a.status !== 'cancelled').length;
    return { total: agents.length, working, onBreak, offline, upcoming, viewings };
  }, [agents, appointments]);

  const todayIsFree = (userId: string): boolean => {
    const now = new Date();
    const wd = now.toLocaleDateString('en-GB', { weekday: 'long' }).toLowerCase();
    return availability.some((a) => a.user_id === userId && a.weekday === wd && a.is_working);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium text-white">Team Overview</h1>
          <p className="text-base text-neutral-300 mt-0.5">Live team roster, attendance & today's calendar across the agency</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setTab('team')} className={`px-3 py-1.5 rounded-full text-base font-medium cursor-pointer whitespace-nowrap ${tab === 'team' ? 'bg-neutral-800 text-white' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'}`}>Live roster</button>
          <button onClick={() => setTab('schedule')} className={`px-3 py-1.5 rounded-full text-base font-medium cursor-pointer whitespace-nowrap ${tab === 'schedule' ? 'bg-neutral-800 text-white' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'}`}>Today's schedule</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Team members" value={stats.total} tone="neutral" />
        <StatCard label="Punched in" value={stats.working} tone="emerald" />
        <StatCard label="On break" value={stats.onBreak} tone="sky" />
        <StatCard label="Offline" value={stats.offline} tone="muted" />
        <StatCard label="Appointments" value={stats.upcoming} tone="teal" />
        <StatCard label="Viewings" value={stats.viewings} tone="sky" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-neutral-300"><i className="ri-loader-4-line animate-spin text-xl" /></div>
      ) : tab === 'team' ? (
        <RosterTable agents={agents} todayIsFree={todayIsFree} />
      ) : (
        <ScheduleTable appointments={appointments} />
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  const toneMap: Record<string, string> = {
    neutral: 'bg-neutral-50 border-neutral-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    sky: 'bg-sky-50 border-sky-100',
    muted: 'bg-neutral-100 border-neutral-200',
    teal: 'bg-[#e6faf4] border-[#b3ece0]',
  };
  return (
    <div className={`rounded-xl border p-4 ${toneMap[tone] || toneMap.neutral}`}>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="text-2xl font-medium text-neutral-800">{value}</p>
    </div>
  );
}

function RosterTable({ agents, todayIsFree }: { agents: TeamAgent[]; todayIsFree: (id: string) => boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-neutral-50 text-sm text-neutral-500">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Agent</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Punched in</th>
              <th className="text-left px-4 py-3 font-semibold">Hours today</th>
              <th className="text-left px-4 py-3 font-semibold">Scheduled today</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => {
              const status = a.session?.status;
              const scheduled = a.session ? fmtDur(a.session.hours_worked_sec) : '—';
              return (
                <tr key={a.user_id} className="border-t border-neutral-50 hover:bg-neutral-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={a.name} avatar_url={a.avatar} userId={a.user_id} size={32} />
                      <div><p className="font-medium text-neutral-800">{a.name}</p><p className="text-sm text-neutral-500 capitalize">{a.role || 'Agent'}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${status === 'working' ? 'bg-emerald-50 text-emerald-600' : status === 'break' ? 'bg-sky-50 text-sky-600' : status === 'completed' ? 'bg-neutral-100 text-neutral-500' : 'bg-neutral-100 text-neutral-500'}`}>
                      {status === 'working' ? 'Punched in' : status === 'break' ? 'On break' : status === 'completed' ? 'Completed' : 'Off shift'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{a.session ? fmtTime(a.session.clock_in_at!) : '—'}</td>
                  <td className="px-4 py-3 text-neutral-700">{scheduled}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${todayIsFree(a.user_id) ? 'bg-teal-50 text-teal-600' : 'bg-neutral-100 text-neutral-500'}`}>{todayIsFree(a.user_id) ? 'Available' : 'Blocked'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScheduleTable({ appointments }: { appointments: Appt[] }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-neutral-50 text-sm text-neutral-500">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Time</th>
              <th className="text-left px-4 py-3 font-semibold">Appointment</th>
              <th className="text-left px-4 py-3 font-semibold">Client / Property</th>
              <th className="text-left px-4 py-3 font-semibold">Agent</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">No appointments today</td></tr>
            ) : appointments.map((a) => (
              <tr key={a.id} className="border-t border-neutral-50 hover:bg-neutral-50/50">
                <td className="px-4 py-3 text-neutral-700">{fmtTime(a.starts_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${KIND_COLOR[a.kind as keyof typeof KIND_COLOR] || 'bg-neutral-300'}`} />
                    <span className="font-medium text-neutral-800">{a.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-500">{[a.client_name, a.property_title].filter(Boolean).join(' · ') || '—'}</td>
                <td className="px-4 py-3 text-neutral-700">{a.agent_name || 'Unassigned'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${a.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' : a.status === 'scheduled' ? 'bg-sky-50 text-sky-600' : a.status === 'rescheduled' ? 'bg-sky-50 text-sky-600' : a.status === 'completed' ? 'bg-neutral-100 text-neutral-500' : a.status === 'cancelled' ? 'bg-neutral-100 text-neutral-500' : 'bg-neutral-100 text-neutral-500'}`}>{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}