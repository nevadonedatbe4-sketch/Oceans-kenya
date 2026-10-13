import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Shared header action group used by BOTH the admin portal and the agent portal
 * so the two shells stay visually identical:
 *
 *   [ ✉ tile + badge ]   [ 🔔 tile + badge + feed dropdown ]
 *
 * Both are solid, premium navy tiles (gradient fill + ring highlight for depth)
 * with a bold solid circular count badge overlapping the top-right corner. The
 * text hint ("Messages" / "Notifications") is a tooltip that appears on hover.
 *
 * Counter contract: the two badges are INDEPENDENT — the bell shows the unread
 * NOTIFICATION count only, the envelope shows the unread MESSAGE count only.
 * They are never merged, so opening/clearing notifications can never silently
 * mark messages read (or vice-versa). Each tile pulses on its own when its count
 * rises so a real-time arrival catches the eye.
 *
 * `size="sm"` renders the same premium tiles at a mobile-friendly scale so the
 * header keeps its look on phones.
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
  /** True while this notification is still unread — drives the dot + bold row. */
  unread?: boolean;
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
  /** Tile scale: 'md' (desktop) or 'sm' (mobile). */
  size?: 'md' | 'sm';
  /** Fired when the notifications panel is opened — mark the shown items read. */
  onOpen?: () => void;
  /** Fired when an individual feed item is clicked — mark that one read. */
  onItemClick?: (id: string) => void;
  /** Fired by the per-row "Mark as read" control — marks that one read without navigating. */
  onItemRead?: (id: string) => void;
  /** When set, an inline error row with a retry action is shown in the panel. */
  errorText?: string | null;
  onRetry?: () => void;
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
  className = 'hidden lg:flex items-center gap-2.5 flex-shrink-0',
  size = 'md',
  onOpen,
  onItemClick,
  onItemRead,
  errorText,
  onRetry,
}: PortalHeaderPillsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const tile = size === 'sm' ? 'w-9 h-9 rounded-lg' : 'w-10 h-10 rounded-lg';
  const iconCls = size === 'sm' ? 'text-base' : 'text-lg';

  // Independent pulse rings — each tile reacts only to its own count rising.
  const prevMsg = useRef(messengerUnread);
  const prevBell = useRef(notificationsCount);
  const [pulsingMsg, setPulsingMsg] = useState(false);
  const [pulsingBell, setPulsingBell] = useState(false);

  useEffect(() => {
    if (messengerUnread > prevMsg.current) {
      setPulsingMsg(true);
      const t = window.setTimeout(() => setPulsingMsg(false), 2200);
      prevMsg.current = messengerUnread;
      return () => window.clearTimeout(t);
    }
    prevMsg.current = messengerUnread;
    return undefined;
  }, [messengerUnread]);

  useEffect(() => {
    if (notificationsCount > prevBell.current) {
      setPulsingBell(true);
      const t = window.setTimeout(() => setPulsingBell(false), 2200);
      prevBell.current = notificationsCount;
      return () => window.clearTimeout(t);
    }
    prevBell.current = notificationsCount;
    return undefined;
  }, [notificationsCount]);

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

  // Independent badge values — notifications count is NEVER inflated by messages.
  const bellCount = notificationsCount;

  return (
    <div className={className}>
      {/* Messages — icon only; the hint appears on hover. */}
      <Link
        to={messagesHref}
        aria-label="Messages"
        className={`group relative inline-flex items-center justify-center bg-gradient-to-b from-[#123a63] to-[#012144] ring-1 ring-[#2a5688] hover:ring-[#3d6da3] hover:from-[#164a7c] text-white/90 hover:text-white transition-all cursor-pointer whitespace-nowrap ${tile}`}
      >
        <i className={`ri-mail-line ${iconCls} transition-colors ${pulsingMsg ? 'text-[#5eead4]' : ''}`} />
        {pulsingMsg && (
          <span className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-[#5eead4]/50 animate-ping" />
        )}
        {messengerUnread > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#e11d48] text-white text-[10px] font-bold leading-none ring-2 ring-[#012144]"
            aria-label={`${messengerUnread} unread messages`}
            title={`${messengerUnread} unread messages`}
          >
            {messengerUnread > 99 ? '99+' : messengerUnread}
          </span>
        )}
        <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#001731] border border-[#2a5688] px-2 py-1 text-[10px] font-roboto font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
          Messages
        </span>
      </Link>

      {/* Notifications — icon only + feed dropdown. */}
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next) onOpen?.();
          }}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Notifications"
          className={`group relative inline-flex items-center justify-center bg-gradient-to-b from-[#123a63] to-[#012144] ring-1 ring-[#2a5688] hover:ring-[#3d6da3] hover:from-[#164a7c] text-white/90 hover:text-white transition-all cursor-pointer whitespace-nowrap ${tile}`}
        >
          <i className={`ri-notification-3-line ${iconCls} transition-colors ${pulsingBell ? 'text-[#5eead4]' : ''}`} />
          {pulsingBell && (
            <span className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-[#5eead4]/50 animate-ping" />
          )}
          {bellCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#e11d48] text-white text-[10px] font-bold leading-none ring-2 ring-[#012144]"
              aria-label={`${bellCount} notifications`}
              title={`${bellCount} notifications`}
            >
              {bellCount > 99 ? '99+' : bellCount}
            </span>
          )}
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

            {errorText ? (
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#2a5688] bg-red-500/10">
                <span className="text-[11px] text-red-200 font-roboto">{errorText}</span>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="text-[10px] font-roboto font-semibold uppercase tracking-wider text-[#5eead4] hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    Retry
                  </button>
                )}
              </div>
            ) : null}

            <div className="max-h-[320px] overflow-y-auto divide-y divide-[#2a5688]">
              {feed.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-white/50 font-roboto">{emptyText}</div>
              ) : (
                feed.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-all ${entry.unread ? '' : 'opacity-70'}`}
                  >
                    <Link
                      to={entry.href}
                      onClick={() => { onItemClick?.(entry.id); setOpen(false); }}
                      className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <span className="relative mt-0.5 w-7 h-7 rounded-full bg-[#5eead4]/10 text-[#5eead4] flex items-center justify-center flex-shrink-0">
                        <i className={`${entry.icon} text-xs`} />
                        {entry.unread ? (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#e11d48] ring-2 ring-[#012144]" aria-hidden="true" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-xs font-roboto truncate ${entry.unread ? 'font-semibold text-white' : 'font-medium text-white/70'}`}>
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
                    {entry.unread && onItemRead ? (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onItemRead(entry.id); }}
                        title="Mark as read"
                        aria-label={`Mark "${entry.title}" as read`}
                        className="mt-0.5 w-6 h-6 flex items-center justify-center rounded-md text-white/45 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
                      >
                        <i className="ri-check-line text-sm" />
                      </button>
                    ) : null}
                  </div>
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