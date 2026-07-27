import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Bell, CheckCheck, Building2, Users, Handshake, UserPlus, FileText, Star } from 'lucide-react';

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  module: string;
  record_id: string;
  record_title: string;
  before_value: any;
  after_value: any;
  metadata: any;
  created_at: string;
}

const MODULE_ICONS: Record<string, any> = {
  deals: Handshake,
  leads: Users,
  contacts: UserPlus,
  listings: Building2,
  blog: FileText,
  testimonials: Star,
};

const MODULE_COLORS: Record<string, string> = {
  deals: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  leads: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  contacts: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  listings: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  blog: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  testimonials: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatAction(log: ActivityLog): { icon: string; title: string; detail: string } {
  const title = log.record_title || 'Untitled';
  const name = log.user_name || 'Someone';

  switch (log.module) {
    case 'deals':
      if (log.action === 'created') return { icon: 'ri-add-circle-line', title: 'New deal created', detail: `${name} created "${title}"` };
      if (log.action === 'status_changed') {
        const newStatus = log.after_value?.status || log.metadata?.new_status || 'updated';
        return { icon: 'ri-arrow-left-right-line', title: 'Deal stage changed', detail: `"${title}" moved to ${newStatus}` };
      }
      return { icon: 'ri-edit-line', title: 'Deal updated', detail: `${name} updated "${title}"` };

    case 'leads':
      if (log.action === 'created') return { icon: 'ri-user-add-line', title: 'New lead received', detail: `${name} submitted an enquiry` };
      if (log.action === 'assigned') return { icon: 'ri-user-received-line', title: 'Lead assigned', detail: `${name} assigned "${title}"` };
      if (log.action === 'status_changed') return { icon: 'ri-arrow-left-right-line', title: 'Lead status changed', detail: `"${title}" marked as ${log.after_value?.status || 'updated'}` };
      return { icon: 'ri-user-line', title: 'Lead updated', detail: `${name} updated "${title}"` };

    case 'contacts':
      if (log.action === 'created') return { icon: 'ri-contacts-line', title: 'Contact added', detail: `${name} added "${title}"` };
      return { icon: 'ri-contacts-line', title: 'Contact updated', detail: `${name} updated "${title}"` };

    case 'listings':
      if (log.action === 'created') return { icon: 'ri-building-2-line', title: 'Property listed', detail: `${name} added "${title}"` };
      if (log.action === 'updated') return { icon: 'ri-building-line', title: 'Property updated', detail: `${name} updated "${title}"` };
      return { icon: 'ri-building-line', title: 'Property change', detail: `${name} modified "${title}"` };

    case 'blog':
      if (log.action === 'created') return { icon: 'ri-article-line', title: 'Article published', detail: `${name} published "${title}"` };
      return { icon: 'ri-article-line', title: 'Article updated', detail: `${name} updated "${title}"` };

    case 'testimonials':
      if (log.action === 'created') return { icon: 'ri-star-line', title: 'Testimonial added', detail: `${name} added a testimonial` };
      return { icon: 'ri-star-line', title: 'Testimonial updated', detail: `${name} updated "${title}"` };

    default:
      return { icon: 'ri-notification-line', title: 'Activity', detail: `${name}: ${log.action} ${title}` };
  }
}

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const LAST_SEEN_KEY = 'crm_notifications_last_seen';

  const getLastSeen = useCallback((): string => {
    return localStorage.getItem(LAST_SEEN_KEY) || new Date(0).toISOString();
  }, []);

  const markAllRead = useCallback(() => {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    setUnreadCount(0);
  }, []);

  const fetchLogs = useCallback(async () => {
    // Don't attempt fetch if user isn't authenticated yet
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        setLogs([]);
        setUsingFallback(false);
        return;
      }

      if (data && data.length > 0) {
        setLogs(data as ActivityLog[]);
        setUsingFallback(false);

        if (!open) {
          const lastSeen = getLastSeen();
          const newCount = data.filter(
            (log) => new Date(log.created_at).getTime() > new Date(lastSeen).getTime()
          ).length;
          setUnreadCount(newCount);
        }
      } else {
        setLogs([]);
        setUsingFallback(false);
      }
    } catch (_err) {
      setLogs([]);
      setUsingFallback(false);
    } finally {
      setLoading(false);
    }
  }, [open, getLastSeen, user]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

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

  useEffect(() => {
    if (open) {
      markAllRead();
      fetchLogs();
    }
  }, [open, markAllRead, fetchLogs]);

  const handleOpen = () => {
    setOpen(!open);
  };

  const handleItemClick = (log: ActivityLog) => {
    setOpen(false);

    switch (log.module) {
      case 'deals':
        navigate('/crm/deals');
        break;
      case 'leads':
        navigate('/crm/leads');
        break;
      case 'contacts':
        navigate('/crm/contacts');
        break;
      case 'listings':
        if (log.record_id) {
          navigate(`/crm/listings/edit/${log.record_id}`);
        } else {
          navigate('/crm/listings');
        }
        break;
      case 'blog':
        navigate('/crm/blog');
        break;
      case 'testimonials':
        navigate('/crm/testimonials');
        break;
      default:
        break;
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={handleOpen}
        className={`p-2 rounded-md cursor-pointer relative transition-all font-semibold ${
          open ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-gray-400'
        }`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[#dc2626] text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#012144] border border-[#1c3a5e] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
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

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto custom-scroll">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <Bell size={32} className="text-[#374151] mb-3" />
                <p className="text-[#6b7280] text-sm font-inter">No notifications yet</p>
                <p className="text-[#4b5563] text-xs font-inter mt-1">Activity will appear here</p>
              </div>
            ) : (
              logs.map((log) => {
                const formatted = formatAction(log);
                const ModuleIcon = MODULE_ICONS[log.module];

                return (
                  <button
                    key={log.id}
                    onClick={() => handleItemClick(log)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors cursor-pointer text-left border-b border-[#1c3a5e]/50 last:border-b-0"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                        MODULE_COLORS[log.module] || 'bg-white/10 text-white/60 border-white/10'
                      }`}
                    >
                      {ModuleIcon ? <ModuleIcon size={16} /> : <i className={`${formatted.icon} text-base`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white text-sm font-inter font-medium truncate">{formatted.title}</p>
                        <span className="text-[10px] text-[#4b5563] font-inter flex-shrink-0">{timeAgo(log.created_at)}</span>
                      </div>
                      <p className="text-[#6b7280] text-xs font-inter mt-0.5 truncate">{formatted.detail}</p>
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