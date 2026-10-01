import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/pages/agent/ogroup/components/Avatar';

interface StaffMember {
  user_id: string;
  name: string;
  avatar: string | null;
  role: string | null;
}
interface Notif {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  announcement: { icon: 'ri-megaphone-line', label: 'Announcement', color: 'bg-teal-50 text-teal-600' },
  appointment: { icon: 'ri-calendar-event-line', label: 'Appointment', color: 'bg-indigo-50 text-indigo-600' },
  attendance: { icon: 'ri-fingerprint-line', label: 'Attendance', color: 'bg-sky-50 text-sky-600' },
  message: { icon: 'ri-chat-3-line', label: 'Message', color: 'bg-emerald-50 text-emerald-600' },
  lead: { icon: 'ri-user-star-line', label: 'Lead', color: 'bg-amber-50 text-amber-600' },
  deal: { icon: 'ri-hand-coin-line', label: 'Deal', color: 'bg-violet-50 text-violet-600' },
  system: { icon: 'ri-notification-3-line', label: 'System', color: 'bg-neutral-50 text-neutral-500' },
};

function meta(type: string) {
  return TYPE_META[type] || TYPE_META.system;
}

function rel(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function AdminTeamNotifications() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'announcements' | 'activity'>('announcements');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annLink, setAnnLink] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3200); };

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: notifRows }] = await Promise.all([
      supabase.from('profiles').select('user_id,name,avatar,role').eq('status', 'active'),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(300),
    ]);
    setStaff((profiles || []).filter((p) => p.role !== 'super_admin').map((p) => ({
      user_id: p.user_id, name: p.name || 'Team member', avatar: p.avatar, role: p.role,
    })));
    setNotifs((notifRows || []) as Notif[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const nameOf = (id: string) => staff.find((s) => s.user_id === id)?.name || 'Team member';

  const announcements = useMemo(
    () => notifs.filter((n) => n.type === 'announcement'),
    [notifs],
  );

  const perAgent = useMemo(() => {
    const window = notifs.filter((n) => n.type !== 'announcement');
    return staff.map((s) => {
      const own = window.filter((n) => n.recipient_id === s.user_id);
      return { ...s, total: own.length, unread: own.filter((n) => !n.is_read).length };
    }).sort((a, b) => b.total - a.total);
  }, [staff, notifs]);

  const activeFeed = useMemo(() => {
    let rows = typeFilter === 'announcement' ? announcements
      : view === 'activity' ? notifs.filter((n) => n.type !== 'announcement')
      : announcements;
    if (selectedAgent !== 'all') rows = rows.filter((n) => n.recipient_id === selectedAgent);
    if (typeFilter !== 'all' && typeFilter !== 'announcement') rows = rows.filter((n) => n.type === typeFilter);
    return rows.slice(0, 60);
  }, [notifs, announcements, view, selectedAgent, typeFilter]);

  const sendAnnouncement = async () => {
    if (!annTitle.trim()) { showToast('Give the announcement a title.'); return; }
    if (staff.length === 0) { showToast('No active team members to notify.'); return; }
    setSending(true);
    try {
      const rows = staff.map((s) => ({
        recipient_id: s.user_id,
        type: 'announcement',
        title: annTitle.trim(),
        body: annBody.trim() || null,
        link: annLink.trim() || '/agent/notifications',
        is_read: false,
      }));
      const { error } = await supabase.from('notifications').insert(rows);
      if (error) throw error;
      showToast(`Announcement sent to ${staff.length} team members.`);
      setAnnTitle(''); setAnnBody(''); setAnnLink('');
      setComposerOpen(false);
      void load();
    } catch (e) {
      showToast((e as Error).message || 'Could not send announcement.');
    } finally { setSending(false); }
  };

  const stats = useMemo(() => {
    const recent = notifs;
    return {
      total: recent.length,
      unread: recent.filter((n) => !n.is_read).length,
      announcements: announcements.length,
      activeCount: staff.filter((s) => s.role !== 'admin' && s.role !== 'super_admin').length,
    };
  }, [notifs, announcements, staff]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium text-white">Team Notifications</h1>
          <p className="text-lg font-medium text-neutral-300 mt-1">Team-scoped announcements & activity — individual agents are only shown on drill-down</p>
        </div>
        <button onClick={() => setComposerOpen((v) => !v)} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 cursor-pointer whitespace-nowrap">
          <i className="ri-megaphone-line mr-1" />Send announcement
        </button>
      </div>

      {/* Announcement composer */}
      {composerOpen && (
        <div className="bg-white rounded-2xl border border-neutral-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-800">New team announcement</h3>
            <button onClick={() => setComposerOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer"><i className="ri-close-line" /></button>
          </div>
          <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Announcement title" className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
          <textarea value={annBody} onChange={(e) => setAnnBody(e.target.value)} maxLength={500} rows={2} placeholder="Message (optional)" className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input value={annLink} onChange={(e) => setAnnLink(e.target.value)} placeholder="Link (optional, e.g. /agent/calendar)" className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 min-w-0" />
            <button disabled={sending} onClick={sendAnnouncement} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 cursor-pointer disabled:opacity-40 whitespace-nowrap">
              {sending ? 'Sending…' : `Send to ${staff.length} members`}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-4"><p className="text-[11px] text-neutral-500">Notifications (window)</p><p className="text-2xl font-medium text-neutral-800">{stats.total}</p></div>
        <div className="rounded-xl bg-teal-50 border border-teal-100 p-4"><p className="text-[11px] text-teal-600">Announcements</p><p className="text-2xl font-medium text-neutral-800">{stats.announcements}</p></div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4"><p className="text-[11px] text-amber-600">Unread (team)</p><p className="text-2xl font-medium text-neutral-800">{stats.unread}</p></div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4"><p className="text-[11px] text-emerald-600">Active agents</p><p className="text-2xl font-medium text-neutral-800">{stats.activeCount}</p></div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => { setView('announcements'); setSelectedAgent('all'); setTypeFilter('announcement'); }} className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap ${view === 'announcements' ? 'bg-neutral-800 text-white' : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'}`}>Announcements</button>
        <button onClick={() => { setView('activity'); setSelectedAgent('all'); }} className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap ${view === 'activity' ? 'bg-neutral-800 text-white' : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'}`}>Team activity</button>
      </div>

      {view === 'activity' && (
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-400">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Team member</th>
                  <th className="text-left px-4 py-3 font-semibold">Recent notifications</th>
                  <th className="text-left px-4 py-3 font-semibold">Unread</th>
                  <th className="text-left px-4 py-3 font-semibold">View</th>
                </tr>
              </thead>
              <tbody>
                {perAgent.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-400">No team members to show</td></tr>
                ) : perAgent.map((a) => (
                  <tr key={a.user_id} className="border-t border-neutral-50 hover:bg-neutral-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={a.name} avatar_url={a.avatar} userId={a.user_id} size={32} />
                        <div><p className="font-medium text-neutral-800">{a.name}</p><p className="text-[11px] text-neutral-400 capitalize">{a.role || 'Agent'}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{a.total}</td>
                    <td className="px-4 py-3">
                      {a.unread > 0 ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold">{a.unread} unread</span> : <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setSelectedAgent(a.user_id); }} className="px-3 py-1.5 rounded-lg border border-neutral-100 text-xs font-medium text-neutral-600 hover:bg-neutral-50 cursor-pointer whitespace-nowrap">Drill in</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap items-center">
        {view === 'activity' && (
          <>
            <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className="bg-white border border-neutral-100 rounded-lg px-3 py-1.5 text-xs text-neutral-600 focus:outline-none">
              <option value="all">All team members</option>
              {staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.name}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-white border border-neutral-100 rounded-lg px-3 py-1.5 text-xs text-neutral-600 focus:outline-none">
              <option value="all">All types</option>
              {Object.entries(TYPE_META).filter(([k]) => k !== 'announcement').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </>
        )}
        {selectedAgent !== 'all' && view === 'activity' && (
          <span className="text-xs text-neutral-500">Showing {nameOf(selectedAgent)}'s notifications</span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400"><i className="ri-loader-4-line animate-spin text-xl" /></div>
        ) : activeFeed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-300">
            <i className="ri-notification-3-line text-4xl" />
            <p className="text-sm text-neutral-400 mt-2">{view === 'announcements' ? 'No announcements yet.' : 'No notifications for this filter.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-50">
            {activeFeed.map((n) => {
              const m = meta(n.type);
              return (
                <li key={n.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-neutral-50/60 transition-colors">
                  <span className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center ${m.color}`}>
                    <i className={`${m.icon} text-base`} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-50 text-neutral-500 font-medium">{m.label}</span>
                      {view === 'activity' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-50 text-neutral-400">to {nameOf(n.recipient_id)}</span>}
                    </div>
                    <p className={`text-sm mt-1 ${n.is_read ? 'font-medium text-neutral-600' : 'font-semibold text-neutral-800'}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-neutral-400 mt-0.5">{n.body}</p>}
                    <p className="text-[11px] text-neutral-300 mt-1">{rel(n.created_at)}{!n.is_read ? ' · unread' : ''}</p>
                  </div>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg">{toast}</div>
      )}
    </div>
  );
}