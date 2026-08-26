import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Bell, CheckCheck } from 'lucide-react';

interface CrmNotification {
  id: string;
  recipient_id: string | null;
  type: string | null;
  title: string | null;
  body: string | null;
  lead_id: string | null;
  enquiry_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_META: Record<string, { icon: string; color: string }> = {
  new_enquiry: { icon: 'ri-mail-add-line', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  lead_created: { icon: 'ri-user-add-line', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  lead_assigned: { icon: 'ri-user-received-line', color: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
  message: { icon: 'ri-chat-3-line', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
  follow_up: { icon: 'ri-calendar-line', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  deal_updated: { icon: 'ri-briefcase-3-line', color: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
};

function timeAgo(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<CrmNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAgent = user?.role === 'agent';

  const buildQuery = useCallback(() => {
    let q = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    if (isAgent && user?.id) {
      q = q.eq('recipient_id', user.id);
    }
    return q;
  }, [isAgent, user?.id]);

  const fetchNotifs = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await buildQuery();
      if (error) {
        setNotifs([]);
        return;
      }
      setNotifs((data || []) as CrmNotification[]);
    } catch {
      setNotifs([]);
    } finally {
      setLoading(false);
    }
  }, [buildQuery, user]);

  const fetchUnread = useCallback(async () => {
    if (!user) {
      setUnread(0);
      return;
    }
    let q = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);
    if (isAgent && user.id) {
      q = q.eq('recipient_id', user.id);
    }
    const { count } = await q;
    setUnread(count ?? 0);
  }, [isAgent, user]);

  useEffect(() => {
    fetchNotifs();
    fetchUnread();
    const interval = setInterval(() => {
      fetchNotifs();
      fetchUnread();
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchNotifs, fetchUnread]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const markAllRead = async () => {
    let q = supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
    if (isAgent && user?.id) {
      q = q.eq('recipient_id', user.id);
    }
    await q;
    setUnread(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleItemClick = async (n: CrmNotification) => {
    setOpen(false);
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      setUnread((prev) => Math.max(0, prev - 1));
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    const link =
      n.link ||
      (n.enquiry_id ? '/crm/inbox' : n.lead_id ? '/crm/leads' : n.contact_id ? '/crm/contacts' : n.deal_id ? '/crm/deals' : null);
    if (link) navigate(link);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`p-2 rounded-md cursor-pointer relative transition-all font-bold ${
          open ? 'bg-white/15 text-white' : 'hover:bg-white/10 text-[#e5e7eb]'
        }`}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[#dc2626] text-white text-[10px] font-bold rounded-full px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#012144] border border-[#1c3a5e] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c3a5e]">
            <h3 className="text-white font-inter font-semibold text-sm">Notifications</h3>
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-[#6b7280] hover:text-white transition-colors cursor-pointer font-inter"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          </div>

          <div className="max-h-[380px] overflow-y-auto custom-scroll">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <Bell size={32} className="text-[#374151] mb-3" />
                <p className="text-[#6b7280] text-sm font-inter">No notifications yet</p>
                <p className="text-[#4b5563] text-xs font-inter mt-1">New enquiries and activity will appear here</p>
              </div>
            ) : (
              notifs.map((n) => {
                const meta = TYPE_META[n.type || ''] || {
                  icon: 'ri-notification-3-line',
                  color: 'bg-white/10 text-white/60 border-white/10',
                };
                return (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer text-left border-b border-[#1c3a5e]/50 last:border-b-0 ${
                      !n.is_read ? 'bg-white/[0.04]' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${meta.color}`}>
                      <i className={`${meta.icon} text-base`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-inter truncate ${!n.is_read ? 'text-white font-semibold' : 'text-[#cbd5e1] font-medium'}`}>
                          {n.title || 'Notification'}
                        </p>
                        <span className="text-[10px] text-[#4b5563] font-inter flex-shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-[#6b7280] text-xs font-inter mt-0.5 truncate">{n.body || ''}</p>
                      {!n.is_read && <span className="inline-block w-2 h-2 rounded-full bg-[#dc2626] mt-1.5" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}