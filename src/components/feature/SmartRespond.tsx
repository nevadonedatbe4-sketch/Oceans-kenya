import { useEffect, useRef, useState } from 'react';
import { generateSmartReplies, type SmartRespondContext, type SmartReply } from '@/lib/smartRespond';

interface SmartRespondProps {
  /** Current conversation / record context used to compose suggestions. */
  context: SmartRespondContext;
  /** Insert a chosen suggestion into the composer (never auto-sends). */
  onInsert: (text: string) => void;
  tone?: 'light' | 'dark';
  disabled?: boolean;
  className?: string;
}

/**
 * "Smart Respond" entry point: opens a small panel of context-aware suggested
 * replies. Selecting one populates the composer — it is never sent
 * automatically, so the normal manual send workflow is untouched.
 */
export default function SmartRespond({
  context,
  onInsert,
  tone = 'light',
  disabled = false,
  className = '',
}: SmartRespondProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replies, setReplies] = useState<SmartReply[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const dark = tone === 'dark';

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    setReplies([]);
    // Suggesting is instant, offline work; the brief state keeps the UI honest
    // about "generating" without pretending to call a network service.
    window.setTimeout(() => {
      setReplies(generateSmartReplies(context));
      setLoading(false);
    }, 260);
  };

  const triggerClass = dark
    ? 'inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-[#00a884] hover:bg-[#00a884]/12 border border-[#00a884]/30 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'
    : 'inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-[#0d5959] hover:bg-[#0d5959]/8 border border-[#0d5959]/25 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed';

  const panelClass = dark
    ? 'bg-[#202c33] border border-[#2a3942] text-[#e9edef]'
    : 'bg-white border border-[#e5e7eb] text-[#001731]';
  const itemHover = dark ? 'hover:bg-[#2a3942]' : 'hover:bg-[#f7f8fa]';
  const muted = dark ? 'text-[#8696a0]' : 'text-[#88929e]';

  return (
    <div className={`relative inline-block ${className}`} ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Smart Respond — suggested replies"
        className={triggerClass}
      >
        <i className="ri-sparkling-2-line text-sm" />
        Smart Respond
      </button>

      {open && (
        <div className={`absolute bottom-full mb-2 right-0 z-40 w-[340px] max-w-[86vw] rounded-xl ${panelClass} overflow-hidden`}>
          <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${dark ? 'border-[#2a3942]' : 'border-[#f0f0f0]'}`}>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
              <i className="ri-sparkling-2-line text-[#0d5959] dark:text-[#00a884]" />
              Suggested replies
            </span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className={`w-6 h-6 flex items-center justify-center rounded-md cursor-pointer ${itemHover}`}>
              <i className="ri-close-line" />
            </button>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className={`h-3 w-24 rounded animate-pulse ${dark ? 'bg-[#2a3942]' : 'bg-[#f0f2f5]'}`} />
                    <div className={`h-3 w-full rounded animate-pulse ${dark ? 'bg-[#2a3942]' : 'bg-[#f0f2f5]'}`} />
                    <div className={`h-3 w-2/3 rounded animate-pulse ${dark ? 'bg-[#2a3942]' : 'bg-[#f0f2f5]'}`} />
                  </div>
                ))}
              </div>
            ) : replies.length === 0 ? (
              <div className="p-6 text-center">
                <i className={`ri-sparkling-line text-2xl ${muted}`} />
                <p className={`text-xs mt-2 ${muted}`}>No suggestions for this conversation yet.</p>
              </div>
            ) : (
              replies.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { onInsert(r.text); setOpen(false); }}
                  className={`w-full text-left px-3.5 py-3 border-b last:border-0 ${dark ? 'border-[#2a3942]/60' : 'border-[#f4f5f7]'} ${itemHover} cursor-pointer transition-colors`}
                >
                  <span className={`block text-[11px] font-bold uppercase tracking-wide mb-1 ${dark ? 'text-[#00a884]' : 'text-[#0d5959]'}`}>{r.label}</span>
                  <span className="block text-[13px] leading-relaxed line-clamp-3 whitespace-pre-wrap">{r.text}</span>
                </button>
              ))
            )}
          </div>

          <div className={`px-3.5 py-2 text-[10px] ${muted} ${dark ? 'bg-[#111b21]' : 'bg-[#f7f8fa]'}`}>
            Tap a suggestion to add it to your message — you can edit before sending.
          </div>
        </div>
      )}
    </div>
  );
}