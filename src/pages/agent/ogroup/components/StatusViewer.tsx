import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar } from './Avatar';
import { fetchStaffDirectory } from '../staffDirectory';
import { deleteStatus, fetchStatusViewers, markStatusViewed } from '../statusData';
import type { StatusGroup } from '../types';

interface StatusViewerProps {
  group: StatusGroup;
  isMine: boolean;
  viewerId: string;
  onClose: () => void;
  onChanged: () => void;
}

const IMAGE_MS = 5000;

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Full-screen status viewer with story-style progress bars, tap zones to move
 * between updates, auto-advance, a viewers list on your own updates, and
 * delete-own support. Marks each item viewed the moment it's shown.
 */
export function StatusViewer({ group, isMine, viewerId, onClose, onChanged }: StatusViewerProps) {
  const [index, setIndex] = useState(0);
  const [viewerNames, setViewerNames] = useState<{ user_id: string; viewed_at: string }[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = group.items[index];
  const lastIndex = group.items.length - 1;

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i >= lastIndex) { onClose(); return i; }
      return i + 1;
    });
  }, [lastIndex, onClose]);

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Mark viewed + auto-advance.
  useEffect(() => {
    if (!current) return;
    if (!isMine) {
      markStatusViewed(current.id, viewerId).then(onChanged).catch(() => undefined);
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(goNext, IMAGE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, isMine, viewerId]);

  // Load who viewed my current status.
  useEffect(() => {
    if (!isMine || !current) return;
    let active = true;
    (async () => {
      const rows = await fetchStatusViewers(current.id);
      if (!active) return;
      setViewerNames(rows);
      try {
        const dir = await fetchStaffDirectory();
        const map: Record<string, string> = {};
        dir.forEach((p) => { map[p.user_id] = p.name || 'Team member'; });
        if (active) setNames(map);
      } catch { /* best-effort */ }
    })();
    return () => { active = false; };
  }, [isMine, current?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goNext, goPrev]);

  const remove = async () => {
    if (!current) return;
    try {
      await deleteStatus(current.id);
      onChanged();
      if (index >= lastIndex) onClose();
      else setIndex((i) => Math.min(i, lastIndex - 1));
    } catch { /* ignore */ }
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[72] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/92" onClick={onClose} />
      <div className="relative w-full max-w-sm h-[85vh] rounded-2xl overflow-hidden bg-[#0b141a] border border-[#2a3942] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
          {group.items.map((it, i) => (
            <div key={it.id} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div className={`h-full bg-white transition-all duration-300 ${i <= index ? 'w-full' : 'w-0'}`} />
            </div>
          ))}
        </div>

        {/* header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2.5 px-3 pt-5 pb-3 bg-gradient-to-b from-black/70 to-transparent">
          <Avatar name={group.name} avatar_url={group.avatar_url} userId={group.user_id} size={38} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{group.name}</p>
            <p className="text-[11px] text-white/70">{timeAgo(current.created_at)} · {timeOnly(current.created_at)}</p>
          </div>
          {isMine && (
            <button onClick={remove} className="w-9 h-9 flex items-center justify-center rounded-full text-white/80 hover:bg-white/10 cursor-pointer" title="Delete status">
              <i className="ri-delete-bin-line text-lg" />
            </button>
          )}
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full text-white/80 hover:bg-white/10 cursor-pointer" title="Close">
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        {/* tap zones */}
        <button onClick={goPrev} className="absolute left-0 top-0 bottom-0 w-1/4 z-10 cursor-pointer" aria-label="Previous" />
        <button onClick={goNext} className="absolute right-0 top-0 bottom-0 w-1/2 z-10 cursor-pointer" aria-label="Next" />

        {/* content */}
        <div className="flex-1 flex items-center justify-center" style={current.kind === 'text' ? { background: current.background || '#0d5959' } : undefined}>
          {current.kind === 'image' && current.image_url ? (
            <img src={current.image_url} alt="status" className="w-full h-full object-contain bg-black" />
          ) : (
            <p className="text-white text-center text-xl font-medium px-8 whitespace-pre-wrap break-words">{current.body}</p>
          )}
        </div>

        {/* caption for image */}
        {current.kind === 'image' && current.body && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-sm text-white/90">{current.body}</p>
          </div>
        )}

        {/* own viewers */}
        {isMine && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/85 to-transparent">
            <button onClick={() => setIndex(index)} className="flex items-center gap-1.5 text-white/90 text-xs cursor-default">
              <i className="ri-eye-line" /> {viewerNames.length} {viewerNames.length === 1 ? 'view' : 'views'}
            </button>
            {viewerNames.length > 0 && (
              <p className="text-[11px] text-white/60 mt-1 truncate">
                {viewerNames.slice(0, 5).map((v) => names[v.user_id] || 'Someone').join(', ')}
                {viewerNames.length > 5 ? ` +${viewerNames.length - 5}` : ''}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}