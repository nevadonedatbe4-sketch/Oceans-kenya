import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from './Avatar';
import { StatusComposer } from './StatusComposer';
import { StatusViewer } from './StatusViewer';
import { useStatusFeed } from '../statusData';
import type { StatusGroup } from '../types';

function relTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Ringed avatar: unseen statuses get a bright ring, seen ones a muted ring. */
function RingAvatar({ group, name, avatar, userId, unseen, size = 54 }: {
  group: StatusGroup; name: string; avatar?: string; userId: string; unseen: boolean; size?: number;
}) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full p-[2.5px]"
      style={{ background: unseen ? 'linear-gradient(135deg,#00a884,#06cf9c)' : 'rgba(134,150,160,0.5)' }}
    >
      <span className="rounded-full bg-[#111b21] p-[2px]">
        <Avatar name={name} avatar_url={avatar} userId={userId} size={size} />
      </span>
    </span>
  );
}

/**
 * The Status tab: your own status plus live team updates across the whole
 * Oceans organization. Unseen updates float to the top with a bright ring.
 */
export function StatusPanel() {
  const { user } = useAuth();
  const feed = useStatusFeed();
  const [composer, setComposer] = useState(false);
  const [viewing, setViewing] = useState<{ group: StatusGroup; mine: boolean } | null>(null);

  const name = user?.name || 'You';

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#111b21] w-full">
      <div className="px-4 pt-4 pb-3 border-b border-[#2a3942] bg-[#202c33]">
        <h2 className="text-xl font-extrabold tracking-tight text-[#e9edef]">Status</h2>
        <p className="text-[11px] text-[#8696a0] mt-0.5">Team updates · expire after 24 hours</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {feed.error && (
          <div className="m-2 flex items-start gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs text-red-300">
            <i className="ri-error-warning-line text-sm mt-0.5" /><span>{feed.error}</span>
          </div>
        )}

        {/* my status */}
        <button
          onClick={() => (feed.mine ? setViewing({ group: feed.mine, mine: true }) : setComposer(true))}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#202c33] cursor-pointer text-left transition-colors"
        >
          <div className="relative">
            {feed.mine ? (
              <RingAvatar group={feed.mine} name={name} avatar={user?.avatar} userId={user?.id || 'me'} unseen={false} />
            ) : (
              <Avatar name={name} avatar_url={user?.avatar} userId={user?.id || 'me'} size={54} />
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#00a884] text-[#0b141a] flex items-center justify-center border-2 border-[#111b21]">
              <i className={feed.mine ? 'ri-add-line text-sm' : 'ri-add-line text-sm'} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#e9edef]">My status</p>
            <p className="text-xs text-[#8696a0] truncate">
              {feed.mine
                ? `${feed.mine.items.length} update${feed.mine.items.length !== 1 ? 's' : ''} · ${relTime(feed.mine.latestAt)}`
                : 'Tap to add a status update'}
            </p>
          </div>
          {feed.mine && (
            <button
              onClick={(e) => { e.stopPropagation(); setComposer(true); }}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#2a3942] text-[#00a884] hover:bg-[#324650] cursor-pointer"
              title="Add another status"
            >
              <i className="ri-add-line" />
            </button>
          )}
        </button>

        <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8696a0]">
          Recent updates
        </p>

        {feed.loading ? (
          <div className="flex items-center justify-center py-10"><i className="ri-loader-4-line animate-spin text-[#8696a0] text-2xl" /></div>
        ) : feed.others.length === 0 ? (
          <div className="text-center py-10 px-6">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#202c33] flex items-center justify-center mb-3">
              <i className="ri-emotion-happy-line text-[#00a884] text-xl" />
            </div>
            <p className="text-sm text-[#8696a0]">No team updates right now</p>
            <p className="text-xs text-[#667781] mt-1">When teammates post a status it shows here</p>
          </div>
        ) : (
          feed.others.map((g) => (
            <button
              key={g.user_id}
              onClick={() => setViewing({ group: g, mine: false })}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#202c33] cursor-pointer text-left transition-colors"
            >
              <RingAvatar group={g} name={g.name} avatar={g.avatar_url} userId={g.user_id} unseen={g.unseenCount > 0} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm truncate ${g.unseenCount > 0 ? 'font-bold text-[#e9edef]' : 'font-semibold text-[#d1d7db]'}`}>{g.name}</p>
                <p className="text-xs text-[#8696a0] truncate">
                  {relTime(g.latestAt)} · {g.items.length} update{g.items.length !== 1 ? 's' : ''}
                </p>
              </div>
              {g.unseenCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#00a884] text-[#0b141a] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {g.unseenCount}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      {composer && (
        <StatusComposer
          onClose={() => setComposer(false)}
          onPosted={() => { setComposer(false); feed.refresh(); }}
        />
      )}

      {viewing && user && (
        <StatusViewer
          group={viewing.group}
          isMine={viewing.mine}
          viewerId={user.id}
          onClose={() => { setViewing(null); feed.refresh(); }}
          onChanged={feed.refresh}
        />
      )}
    </div>
  );
}