import { useState } from 'react';
import { Avatar } from './Avatar';
import { ShareCard } from './ShareCard';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { VideoMessage, FileCard, ImageMessage, ImageViewer } from './MessageMedia';
import { isAudioAttachment } from '../messengerData';
import { isVideoUrl } from '../mediaUtils';
import type { MessageItem, PresenceUser, ShareObject } from '../types';

interface MessageBubbleProps {
  message: MessageItem;
  isOwn: boolean;
  isGroup: boolean;
  presence: Record<string, PresenceUser>;
  highlight?: boolean;
  onReply: (msg: MessageItem) => void;
  onReact: (msgId: string, reaction: string) => void;
  onDelete: (msg: MessageItem) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🙏', '🎉'];

function time(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Delivery state for the sender's own messages:
 *   ⏱ Sending…  ·  ✓ Sent  ·  ✓✓ grey Delivered  ·  ✓✓ blue Read.
 */
function Ticks({ readCount, deliveredCount, pending, failed }: { readCount?: number; deliveredCount?: number; pending?: boolean; failed?: boolean }) {
  if (pending) return <i className="ri-time-line text-[13px] leading-none text-white/60" title="Sending…" />;
  if (failed) return <i className="ri-error-warning-fill text-[13px] leading-none text-red-300" title="Not sent" />;
  if (readCount && readCount > 0) {
    return <i className="ri-check-double-line text-[13px] leading-none text-[#53bdeb]" title="Read" />;
  }
  if (deliveredCount && deliveredCount > 0) {
    return <i className="ri-check-double-line text-[13px] leading-none text-white/60" title="Delivered" />;
  }
  return <i className="ri-check-line text-[13px] leading-none text-white/60" title="Sent" />;
}

export function MessageBubble({
  message, isOwn, isGroup, presence, highlight, onReply, onReact, onDelete,
}: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactOpen, setReactOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);

  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] text-[#8696a0] bg-[#182229] border border-[#2a3942] px-3 py-1 rounded-full">{message.body}</span>
      </div>
    );
  }

  if (message.deleted_at) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} my-1 px-4`}>
        <div className="text-[11px] text-[#667781] italic px-3 py-2">{isOwn ? 'You' : 'This member'} deleted this message</div>
      </div>
    );
  }

  const shareObject: ShareObject | null = message.message_type === 'share' && message.shared_object_type
    ? {
        type: message.shared_object_type as ShareObject['type'],
        id: message.shared_object_id || '',
        title: message.shared_object_title || '',
        subtitle: message.shared_object_subtitle || '',
      }
    : null;

  const isVoice = message.message_type === 'voice' || (!!message.attachment_url && isAudioAttachment(message.attachment_url));
  const isVideo = message.message_type === 'video'
    || (!isVoice && !!message.attachment_url && isVideoUrl(message.attachment_url));
  const isImage = message.message_type === 'image';
  const isFile = message.message_type === 'file' && !isVoice && !isVideo;
  const hasMedia = isImage || isVideo || isFile || isVoice;

  return (
    <div className={`group flex ${isOwn ? 'justify-end' : 'justify-start'} px-3 md:px-4 my-1`}>
      {!isOwn && isGroup && (
        <div className="mr-2 mt-0.5 flex-shrink-0">
          <Avatar name={message.sender_name} avatar_url={message.sender_avatar} userId={message.sender_id} size={32} />
        </div>
      )}

      <div className={`relative max-w-[85%] md:max-w-[62%] flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${message.pending ? 'opacity-70' : ''}`}>
        {isGroup && !isOwn && (
          <span className="text-[11px] font-semibold text-[#2dd4bf] mb-0.5 px-1">{message.sender_name || 'Member'}</span>
        )}

        {message.reply_to_message_id && message.reply_preview && (
          <div className={`mb-1 text-[11px] px-3 py-1 rounded-md border-l-2 ${isOwn ? 'bg-black/20 border-white/50 text-white/85' : 'bg-black/30 border-[#00a884] text-[#8696a0]'} w-fit max-w-full truncate`}>
            ⇢ {message.reply_preview}
          </div>
        )}

        {/* quick reactions */}
        {reactOpen && (
          <div className={`absolute -top-8 ${isOwn ? 'right-0' : 'left-0'} z-30 flex items-center gap-0.5 bg-[#233138] rounded-full border border-[#2a3942] px-1.5 py-1`}>
            {QUICK_REACTIONS.map((r) => (
              <button key={r} onClick={() => { onReact(message.id, r); setReactOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#182229] text-base cursor-pointer">
                {r}
              </button>
            ))}
          </div>
        )}

        <div className={`relative transition-shadow ${isOwn ? 'bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-br-md' : 'bg-[#202c33] text-[#e9edef] border border-[#202c33] rounded-2xl rounded-bl-md'} px-3 py-2 ${highlight ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-[#0b141a]' : ''}`}>
          {isImage && message.attachment_url && (
            <ImageMessage url={message.attachment_url} onOpen={() => setImageOpen(true)} />
          )}
          {isVideo && message.attachment_url && (
            <VideoMessage url={message.attachment_url} duration={message.duration_seconds} />
          )}
          {isVoice && message.attachment_url && (
            <div className="mb-1">
              <VoiceNotePlayer url={message.attachment_url} duration={message.duration_seconds} isOwn={isOwn} />
            </div>
          )}
          {isFile && message.attachment_url && (
            <div className="mb-1.5">
              <FileCard
                url={message.attachment_url}
                name={message.attachment_name}
                size={message.attachment_size}
                mime={message.attachment_mime}
                isOwn={isOwn}
              />
            </div>
          )}
          {shareObject && <ShareCard object={shareObject} />}
          {message.body && (
            <p className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${hasMedia || shareObject ? 'mt-1' : ''}`}>{message.body}</p>
          )}

          <span className={`text-[10px] mt-0.5 flex items-center justify-end gap-1 ${isOwn ? 'text-white/60' : 'text-[#8696a0]'}`}>
            {message.edited_at ? 'edited · ' : ''}{time(message.created_at)}
            {isOwn && <Ticks readCount={message.read_count} deliveredCount={message.delivered_count} pending={message.pending} failed={message.failed} />}
          </span>
        </div>

        {message.failed && (
          <span className="text-[10px] text-red-300 mt-0.5 px-1">Not sent — tap to retry</span>
        )}

        {/* reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex mt-1 gap-1 flex-wrap">
            {message.reactions.map((r, i) => (
              <button
                key={`${r.reaction}-${i}`}
                onClick={() => onReact(message.id, r.reaction)}
                className="text-xs bg-[#233138] border border-[#2a3942] rounded-full px-2 py-0.5 hover:bg-[#182229] cursor-pointer"
              >
                {r.reaction}
              </button>
            ))}
          </div>
        )}

        {/* hover actions */}
        {!message.pending && (
          <div className={`absolute top-1 ${isOwn ? 'right-full mr-1' : 'left-full ml-1'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5`}>
            <button onClick={() => { setReactOpen((v) => !v); setMenuOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-[#233138] border border-[#2a3942] text-[#8696a0] hover:text-[#e9edef] cursor-pointer" title="React">
              <i className="ri-emotion-line text-sm" />
            </button>
            <button onClick={() => { setMenuOpen((v) => !v); setReactOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-[#233138] border border-[#2a3942] text-[#8696a0] hover:text-[#e9edef] cursor-pointer" title="More">
              <i className="ri-more-2-fill text-sm" />
            </button>
          </div>
        )}

        {menuOpen && (
          <div className={`absolute top-9 ${isOwn ? 'right-0' : 'left-0'} z-20 bg-[#233138] rounded-lg border border-[#2a3942] min-w-[150px] py-1`}>
            <button onClick={() => { onReply(message); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-[#182229] cursor-pointer text-[#d1d7db]">
              <i className="ri-reply-line" /> Reply
            </button>
            <button onClick={() => { onReact(message.id, '👍'); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-[#182229] cursor-pointer text-[#d1d7db]">
              <i className="ri-thumb-up-line" /> React 👍
            </button>
            {isOwn && (
              <button onClick={() => { onDelete(message); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-red-500/10 cursor-pointer text-red-400">
                <i className="ri-delete-bin-line" /> Delete for me
              </button>
            )}
          </div>
        )}
      </div>

      {imageOpen && message.attachment_url && (
        <ImageViewer url={message.attachment_url} caption={message.body} onClose={() => setImageOpen(false)} />
      )}
    </div>
  );
}