import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import usePortalBase from '@/hooks/usePortalBase';
import { fetchStaffDirectory } from '@/pages/agent/ogroup/staffDirectory';
import { markMessageDelivered } from '@/pages/agent/ogroup/messengerData';
import { Avatar, presenceOf } from '@/pages/agent/ogroup/components/Avatar';
import { useGlobalPresence } from '@/hooks/useGlobalPresence';
import {
  getChatNotifyPrefs, getActiveChatConversation, openChatConversation,
  playChatChime, showDesktopNotification, desktopPermission, rawMessagePreview,
} from '@/pages/agent/ogroup/chatNotify';

interface ToastItem {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderName: string;
  senderAvatar?: string;
  preview: string;
  at: string;
}

const MAX_TOASTS = 3;
const TOAST_MS = 7000;

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Global Oceans Chat notification centre. Mounted once by the portal shell so
 * new messages surface even when the user is elsewhere in Oceans, not just on
 * the Messenger page. It:
 *   • records delivery receipts for messages that reach this active session,
 *   • shows an in-app toast (click → open the conversation),
 *   • mirrors to a native browser notification where permitted,
 *   • plays an optional chime.
 * It deliberately stays quiet for the conversation the user is currently
 * looking at, so messages they can already see don't double-notify.
 */
export function ChatNotificationCenter() {
  const { user } = useAuth();
  const presence = useGlobalPresence();
  const navigate = useNavigate();
  const base = usePortalBase();
  const location = useLocation();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const peopleRef = useRef<Map<string, { name: string; avatar?: string }>>(new Map());
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  // Cache sender id → name/avatar so notifications are human.
  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchStaffDirectory()
      .then((rows) => {
        if (!active) return;
        const map = new Map<string, { name: string; avatar?: string }>();
        rows.forEach((r) => map.set(r.user_id, { name: r.name || 'Teammate', avatar: r.avatar_url || undefined }));
        peopleRef.current = map;
      })
      .catch(() => { /* names fall back to a generic label */ });
    return () => { active = false; };
  }, [user]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) { clearTimeout(timers.current[id]); delete timers.current[id]; }
  }, []);

  const openConversation = useCallback((convId: string) => {
    openChatConversation(convId);
    navigate(`${base}/messenger`);
  }, [base, navigate]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    const onIncoming = (row: {
      id: string; conversation_id: string; sender_id: string | null;
      message_type?: string | null; body?: string | null; attachment_name?: string | null; created_at?: string;
    }) => {
      if (!row?.id || !row.conversation_id || row.sender_id === userId) return;

      // Reached this active session → record a delivery receipt (idempotent).
      void markMessageDelivered(row.id, userId);

      const visible = typeof document !== 'undefined' && document.visibilityState === 'visible';
      const isCurrent = getActiveChatConversation() === row.conversation_id;
      // Already looking at this exact conversation → the bubble is enough.
      if (isCurrent && visible) return;

      const person = peopleRef.current.get(row.sender_id || '');
      const senderName = person?.name || 'Teammate';
      const preview = rawMessagePreview(row);
      const at = row.created_at || new Date().toISOString();

      const toast: ToastItem = {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        senderName,
        senderAvatar: person?.avatar,
        preview,
        at,
      };
      setToasts((prev) => {
        const next = [toast, ...prev.filter((t) => t.id !== toast.id)];
        return next.slice(0, MAX_TOASTS);
      });
      if (timers.current[toast.id]) clearTimeout(timers.current[toast.id]);
      timers.current[toast.id] = setTimeout(() => dismiss(toast.id), TOAST_MS);

      const prefs = getChatNotifyPrefs();
      if (prefs.sound) playChatChime();

      const onMessenger = locationRef.current.endsWith('/messenger');
      if (prefs.desktop && desktopPermission() === 'granted' && (!visible || !onMessenger)) {
        showDesktopNotification(senderName, preview, () => openConversation(row.conversation_id));
      }
    };

    const channel = supabase
      .channel('oceans-chat-notify')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'og_messages' }, (payload) => {
        onIncoming(payload.new as Parameters<typeof onIncoming>[0]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, dismiss, openConversation]);

  // Clear pending timers on unmount.
  useEffect(() => () => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
  }, []);

  if (!user || toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[80] flex flex-col gap-2 w-[min(92vw,360px)]">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => { openConversation(t.conversationId); dismiss(t.id); }}
          className="w-full text-left flex items-start gap-3 p-3 rounded-xl bg-[#202c33] border border-[#2a3942] hover:bg-[#2a3942] transition-colors cursor-pointer animate-[fadeIn_0.2s_ease-out]"
        >
          <Avatar name={t.senderName} avatar_url={t.senderAvatar} userId={t.senderId || 'x'} size={38} showBadge={!!t.senderId} state={t.senderId ? presenceOf(t.senderId, presence) : undefined} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#e9edef] truncate">{t.senderName}</p>
              <span className="text-[10px] text-[#8696a0] flex-shrink-0">{timeLabel(t.at)}</span>
            </div>
            <p className="text-xs text-[#d1d7db] mt-0.5 line-clamp-2 break-words">{t.preview}</p>
            <p className="text-[10px] text-[#00a884] mt-1 font-semibold">Oceans Chat · tap to open</p>
          </div>
          <span
            onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
            className="text-[#8696a0] hover:text-[#e9edef] flex-shrink-0 cursor-pointer"
          >
            <i className="ri-close-line text-base" />
          </span>
        </button>
      ))}
    </div>
  );
}

export default ChatNotificationCenter;