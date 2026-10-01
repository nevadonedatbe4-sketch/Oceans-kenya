import { useEffect, useMemo, useRef, useState } from 'react';
import { searchMessages } from '../messengerData';
import { Avatar } from './Avatar';
import type { ConversationSummary, MessageSearchHit } from '../types';

interface GlobalSearchProps {
  conversations: ConversationSummary[];
  onPickChat: (id: string) => void;
  onPickMessage: (convId: string, msgId: string) => void;
  onClose: () => void;
}

function relTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function snippet(body: string | null, q: string): { before: string; match: string; after: string } {
  const text = body || '';
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0 || q.length === 0) return { before: text.slice(0, 90), match: '', after: '' };
  const start = Math.max(0, idx - 30);
  return {
    before: (start > 0 ? '…' : '') + text.slice(start, idx),
    match: text.slice(idx, idx + q.length),
    after: text.slice(idx + q.length, idx + q.length + 50),
  };
}

/**
 * Command-palette style global search. Filters conversations by name AND
 * queries every message body the user can read, so you can find a chat by
 * what was said inside it — not just by its title.
 */
export function GlobalSearch({ conversations, onPickChat, onPickMessage, onClose }: GlobalSearchProps) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<MessageSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const query = q.trim();

  // Chat-name matches (local, instant).
  const chatMatches = useMemo(() => {
    if (!query) return conversations.slice(0, 6);
    const lower = query.toLowerCase();
    return conversations
      .filter((c) => {
        const title = c.type === 'group' ? (c.name || 'Group') : (c.members?.[0]?.name || c.name || '');
        return title.toLowerCase().includes(lower);
      })
      .slice(0, 6);
  }, [conversations, query]);

  // Message-body matches (remote).
  useEffect(() => {
    if (query.length < 2) { setHits([]); setLoading(false); setError(null); return; }
    const mySeq = ++seq.current;
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      searchMessages(query)
        .then((rows) => { if (mySeq === seq.current) setHits(rows); })
        .catch(() => { if (mySeq === seq.current) { setHits([]); setError('Could not search messages right now.'); } })
        .finally(() => { if (mySeq === seq.current) setLoading(false); });
    }, 260);
    return () => clearTimeout(t);
  }, [query]);

  const titleFor = (c: ConversationSummary) =>
    c.type === 'group' ? (c.name || 'Group') : (c.members?.[0]?.name || c.name || 'Conversation');

  const empty = chatMatches.length === 0 && hits.length === 0 && !loading;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#111b21] rounded-2xl border border-[#2a3942] overflow-hidden flex flex-col max-h-[70vh]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a3942]">
          <i className="ri-search-2-line text-lg text-[#00a884]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats and messages…"
            className="flex-1 bg-transparent text-[15px] text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none"
          />
          {loading && <i className="ri-loader-4-line animate-spin text-[#8696a0]" />}
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8696a0] hover:bg-[#202c33] cursor-pointer">
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && <p className="px-4 py-3 text-xs text-red-400">{error}</p>}

          {chatMatches.length > 0 && (
            <div className="py-1.5">
              <p className="px-4 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#8696a0]">Chats</p>
              {chatMatches.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onPickChat(c.id); onClose(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#202c33] cursor-pointer text-left"
                >
                  <Avatar name={titleFor(c)} avatar_url={c.type === 'group' ? c.avatar_url : c.members?.[0]?.avatar_url} userId={c.type === 'group' ? c.id : (c.members?.[0]?.user_id || c.id)} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#e9edef] truncate">{titleFor(c)}</p>
                    <p className="text-xs text-[#8696a0] truncate">{c.preview || 'No messages yet'}</p>
                  </div>
                  <span className="text-[11px] text-[#8696a0] flex-shrink-0">{relTime(c.preview_at)}</span>
                </button>
              ))}
            </div>
          )}

          {hits.length > 0 && (
            <div className="py-1.5 border-t border-[#2a3942]">
              <p className="px-4 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#8696a0]">Messages</p>
              {hits.map((h) => {
                const conv = conversations.find((c) => c.id === h.conversation_id);
                const convTitle = conv ? titleFor(conv) : 'Conversation';
                const s = snippet(h.body, query);
                return (
                  <button
                    key={h.id}
                    onClick={() => { onPickMessage(h.conversation_id, h.id); onClose(); }}
                    className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-[#202c33] cursor-pointer text-left"
                  >
                    <span className="w-9 h-9 rounded-full bg-[#202c33] text-[#00a884] flex items-center justify-center flex-shrink-0">
                      <i className="ri-message-2-line text-base" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#e9edef] truncate">{convTitle}</p>
                        <span className="text-[11px] text-[#8696a0] flex-shrink-0">{relTime(h.created_at)}</span>
                      </div>
                      <p className="text-xs text-[#8696a0] line-clamp-2">
                        {h.sender_name ? <span className="font-semibold text-[#aebac1]">{h.sender_name}: </span> : null}
                        {s.before}
                        <mark className="bg-[#005c4b] text-[#d1fae5] rounded px-0.5">{s.match}</mark>
                        {s.after}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {empty && (
            <div className="py-12 text-center">
              <i className="ri-search-line text-3xl text-[#667781]" />
              <p className="text-sm text-[#8696a0] mt-2">
                {query.length < 2 ? 'Type a name or keyword to search' : 'No matches found'}
              </p>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#2a3942] flex items-center gap-2 text-[11px] text-[#8696a0]">
          <kbd className="px-1.5 py-0.5 rounded bg-[#202c33] border border-[#2a3942]">Esc</kbd> to close
          <span className="ml-auto">Searches every chat &amp; message you can access</span>
        </div>
      </div>
    </div>
  );
}