import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ApptRow { id: string; title: string; starts_at: string; kind: string; status: string; }
interface SessionRow { id: string; clock_in_at: string; status: string; }

interface OGroupTodayProps {
  /** Preview mode: scope the widget to this user instead of the signed-in one. */
  userIdOverride?: string | null;
  /** Preview mode: re-point the widget's links (e.g. to Admin editors). */
  resolveHref?: (path: string) => string;
}

export default function OGroupToday({ userIdOverride, resolveHref }: OGroupTodayProps = {}) {
  const { user } = useAuth();
  const effectiveUserId = userIdOverride ?? user?.id ?? null;
  const href = (path: string) => (resolveHref ? resolveHref(path) : path);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [appts, setAppts] = useState<ApptRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!effectiveUserId) return;
    (async () => {
      try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const [sess, apptsRes, members] = await Promise.all([
          supabase.from('og_attendance_sessions').select('id,clock_in_at,status').eq('user_id', effectiveUserId).is('clock_out_at', null).in('status', ['working', 'break']).order('clock_in_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('og_appointments').select('id,title,starts_at,kind,status').eq('assigned_user_id', effectiveUserId).gte('starts_at', today.toISOString()).order('starts_at', { ascending: true }),
          supabase.from('og_conversation_members').select('conversation_id,last_read_at').eq('user_id', effectiveUserId),
        ]);
        setSession((sess.data as SessionRow | null) || null);
        setAppts((apptsRes.data || []) as ApptRow[]);

        let unreadTotal = 0;
        const mems = (members.data || []) as { conversation_id: string; last_read_at: string | null }[];
        const ids = mems.map((m) => m.conversation_id);
        if (ids.length) {
          const groups = await Promise.all(
            mems.map(async (m) => {
              const { count } = await supabase
                .from('og_messages')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', m.conversation_id)
                .is('deleted_at', null)
                .gt('created_at', m.last_read_at ?? new Date(0).toISOString())
                .neq('sender_id', effectiveUserId);
              return count || 0;
            }),
          );
          unreadTotal = groups.reduce((a, b) => a + b, 0);
        }
        setUnread(unreadTotal);
      } catch { /* noop */ }
      finally { setDone(true); }
    })();
  }, [effectiveUserId]);

  const checkedIn = !!session && (session.status === 'working' || session.status === 'break');
  const onBreak = session?.status === 'break';
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white rounded-xl p-5 border border-[#e4e9e6]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-roboto font-medium text-base text-[#1a1a2e]">OGroup Today</h3>
        <span className="text-[11px] font-roboto font-semibold uppercase tracking-wide text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">Team OS</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Attendance */}
        <Link to={href('/agent/check-in')} className="rounded-lg border border-[#e4e9e6] p-3 hover:border-teal-400 transition-colors cursor-pointer">
          <p className="text-[11px] font-roboto font-medium text-gray-400 mb-1">Attendance</p>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${checkedIn ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            <p className="font-roboto text-xs font-semibold text-[#1a1a2e]">{done ? (checkedIn ? `${onBreak ? 'On break' : 'Checked in'} · ${fmt(session.clock_in_at)}` : 'Not checked in') : 'Loading…'}</p>
          </div>
          <p className="text-[11px] font-roboto font-medium text-teal-600 mt-1.5">{checkedIn ? 'Check out →' : 'Check in →'}</p>
        </Link>

        {/* Appointments */}
        <Link to={href('/agent/check-in')} className="rounded-lg border border-[#e4e9e6] p-3 hover:border-teal-400 transition-colors cursor-pointer">
          <p className="text-[11px] font-roboto font-medium text-gray-400 mb-1">Appointments</p>
          <p className="font-roboto text-xs font-semibold text-[#1a1a2e]">{appts.length} today</p>
          {appts.slice(0, 2).map((a) => (
            <p key={a.id} className="text-[11px] font-roboto text-gray-500 truncate mt-0.5">{fmt(a.starts_at)} {a.title}</p>
          ))}
          <p className="text-[11px] font-roboto font-medium text-teal-600 mt-1.5">View calendar →</p>
        </Link>

        {/* Messenger */}
        <Link to={href('/agent/messenger')} className="rounded-lg border border-[#e4e9e6] p-3 hover:border-teal-400 transition-colors cursor-pointer">
          <p className="text-[11px] font-roboto font-medium text-gray-400 mb-1">Messenger</p>
          <p className="font-roboto text-xs font-semibold text-[#1a1a2e]">{unread} unread message{unread !== 1 ? 's' : ''}</p>
          <p className="text-[11px] font-roboto font-medium text-teal-600 mt-1.5">Open OGroup →</p>
        </Link>
      </div>
    </div>
  );
}