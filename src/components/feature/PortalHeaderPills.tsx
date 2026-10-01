import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CountBadge from '@/pages/agent/components/CountBadge';

/**
 * Shared header action group used by BOTH the admin portal and the agent portal
 * so the two shells stay visually identical:
 *
 *   [ ✉ icon + badge ]   [ 🔔 icon + badge + feed dropdown ]
 *
 * Both pills are icon-only; the text hint ("Messages" / "Notifications") is a
 * tooltip that appears on hover. Unread messages are merged into the bell's
 * badge too, so the notification icon always reflects new messages (like FB
 * Messenger). When new messages arrive in real time (the unread count
 * increases) BOTH pills play a small pulse ring so they catch the eye.
 */
export interface PortalFeedItem {
  id: string;
  icon: string;
  title: string;
  /** Optional muted suffix appended after the title (e.g. "· Listings"). */
  titleMuted?: string;
  subtitle?: string;
  meta?: string;
  href: string;
}

interface PortalHeaderPillsProps {
  messagesHref: string;
  messengerUnread: number;
  notificationsCount: number;
  feed: PortalFeedItem[];
  onMarkAllRead: () => void;
  viewAllHref: string;
  viewAllLabel: string;
  emptyText?: string;
  className?: string;
}

export default function PortalHeaderPills({
  messagesHref,
  messengerUnread,
  notificationsCount,
  feed,
  onMarkAllRead,
  viewAllHref,
  viewAllLabel,
  emptyText = "Nothing new — you're all caught up.",
  className = 'hidden lg:flex items-center gap-1.5 flex-shrink-0',
}: PortalHeaderPillsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Pulse ring when the unread-message count rises (real-time arrivals).
  const prevUnread = useRef(messengerUnread);
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (messengerUnread > prevUnread.current) {
      setPulsing(true);
      const t = window.setTimeout(() => setPulsing(false), 2200);
      prevUnread.current = messengerUnread;
      return () => window.clearTimeout(t);
    }
    prevUnread.current = messengerUnread;
    return undefined;
  }, [messengerUnread]);

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Messages also surface on the bell, so a new message lights up both pills.
  const bellCount = notificationsCount + messengerUnread;

  return (
    <div className={className}>
      {/* Messages — icon only; the hint appears on hover. */}
      <Link
        to={messagesHref}
        aria-label="Messages"
        className="group relative inline-flex items-center gap-1.5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer whitespace-nowrap"
      >
        <span className="relative flex items-center justify-center w-4 h-4">
          <i className={`ri-mail-line text-sm transition-colors ${pulsing ? 'text-[#5eead4]' : ''}`} />
          {pulsing && (
            <span className="pointer-events-none absolute -inset-1 rounded-full bg-[#5eead4]/30 animate-ping" />
          )}
        </span>
        <CountBadge count={messengerUnread} label="unread messages" />
        <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#001731] border border-[#2a5688] px-2 py-1 text-[10px] font-roboto font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
          Messages
        </span>
      </Link>

      {/* Notifications — icon only + feed dropdown. */}
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Notifications"
          className="group relative inline-flex items-center gap-1.5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer whitespace-nowrap"
        >
          <span className="relative flex items-center justify-center w-4 h-4">
            <i className={`ri-notification-3-line text-sm transition-colors ${pulsing ? 'text-[#5eead4]' : ''}`} />
            {pulsing && (
              <span className="pointer-events-none absolute -inset-1 rounded-full bg-[#5eead4]/30 animate-ping" />
            )}
          </span>
          <CountBadge count={bellCount} label="notifications" />
          <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#001731] border border-[#2a5688] px-2 py-1 text-[10px] font-roboto font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
            Notifications
          </span>
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-2 w-[340px] max-w-[85vw] bg-[#012144] border border-[#2a5688] rounded-lg overflow-hidden z-40"
            role="menu"
          >
            <div className="px-4 py-3 border-b border-[#2a5688] flex items-center justify-between">
              <p className="font-roboto font-semibold text-sm text-white">Notifications</p>
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 text-[10px] font-roboto font-semibold uppercase tracking-wider text-[#5eead4] hover:text-white transition-colors cursor-pointer"
              >
                <i className="ri-check-double-line text-xs" />
                Mark all read
              </button>
            </div>
            <div className="max-h-[320px] overflow-y-auto divide-y divide-[#2a5688]">
              {feed.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-white/50 font-roboto">{emptyText}</div>
              ) : (
                feed.map((entry) => (
                  <Link
                    key={entry.id}
                    to={entry.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <span className="mt-0.5 w-7 h-7 rounded-full bg-[#5eead4]/10 text-[#5eead4] flex items-center justify-center flex-shrink-0">
                      <i className={`${entry.icon} text-xs`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-roboto font-medium text-white truncate">
                        {entry.title}
                        {entry.titleMuted ? <span className="text-white/60"> {entry.titleMuted}</span> : null}
                      </span>
                      {entry.subtitle ? (
                        <span className="block text-[11px] text-white/45 font-roboto truncate">{entry.subtitle}</span>
                      ) : null}
                    </span>
                    {entry.meta ? (
                      <span className="text-[10px] text-white/40 font-roboto whitespace-nowrap flex-shrink-0 mt-1">
                        {entry.meta}
                      </span>
                    ) : null}
                  </Link>
                ))
              )}
            </div>
            <Link
              to={viewAllHref}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-center text-xs font-roboto font-semibold text-[#5eead4] hover:bg-white/5 transition-all cursor-pointer border-t border-[#2a5688]"
            >
              {viewAllLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}