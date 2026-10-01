import { Link } from 'react-router-dom';
import { useNotifications } from './useNotifications';

const ICONS: Record<string, string> = {
  appointment: 'ri-calendar-event-line',
  attendance: 'ri-fingerprint-line',
  message: 'ri-chat-3-line',
  lead: 'ri-user-star-line',
  deal: 'ri-hand-coin-line',
  system: 'ri-notification-3-line',
};

export default function OGroupNotifications() {
  const { items, loading, error, refresh, unreadCount, markRead, markAllRead } = useNotifications();

  const open = (id: string, link?: string | null) => {
    void markRead(id);
    void link;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium text-neutral-800">Notifications</h1>
          <p className="text-sm text-neutral-400 mt-0.5">{unreadCount > 0 ? `${unreadCount} unread` : 'You\'re all caught up'}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="px-3 py-1.5 rounded-lg border border-neutral-100 text-xs font-medium text-neutral-600 hover:bg-neutral-50 cursor-pointer whitespace-nowrap">
            <i className="ri-check-double-line mr-1" />Mark all read
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600 flex items-center justify-between">
          <span>Couldn't load notifications: {error}</span>
          <button onClick={refresh} className="text-xs font-semibold underline cursor-pointer">Retry</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400"><i className="ri-loader-4-line animate-spin text-xl" /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-300">
            <i className="ri-notification-3-line text-4xl" />
            <p className="text-sm text-neutral-400 mt-2">No notifications yet</p>
            <p className="text-xs text-neutral-300 mt-1">Appointment invites, reminders and attendance alerts show up here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-50">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  to={n.link || '/agent/notifications'}
                  onClick={() => open(n.id, n.link)}
                  className={`flex items-start gap-3 px-5 py-3.5 hover:bg-neutral-50/60 transition-colors ${n.is_read ? 'opacity-70' : ''}`}
                >
                  <span className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center ${n.is_read ? 'bg-neutral-100 text-neutral-400' : 'bg-teal-50 text-teal-600'}`}>
                    <i className={`${ICONS[n.type] || ICONS.system} text-base`} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.is_read ? 'font-medium text-neutral-600' : 'font-semibold text-neutral-800'}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-neutral-400 mt-0.5">{n.body}</p>}
                    <p className="text-[11px] text-neutral-300 mt-1">{relativeTime(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}