import { useRef, useState } from 'react';
import { EmojiPicker } from './EmojiPicker';
import { useVoiceRecorder } from '../useVoiceRecorder';
import { formatBytes, probeMediaDuration } from '../mediaUtils';
import type { MessageItem, OutgoingAttachment } from '../types';

interface ComposerProps {
  onSend: (text: string, attachment?: OutgoingAttachment) => void;
  onUpload: (file: File, kind: 'image' | 'video' | 'file', onProgress?: (percent: number) => void) => Promise<string>;
  onSendVoice: (blob: Blob, seconds: number, extension: string) => Promise<void>;
  replyTo: MessageItem | null;
  onCancelReply: () => void;
  onOpenShare: () => void;
  onTyping?: () => void;
  disabled?: boolean;
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const BAR_DELAYS = ['0ms', '120ms', '240ms', '360ms', '480ms'];

const ATTACH_OPTIONS: { kind: 'image' | 'video' | 'file'; label: string; icon: string; accept: string; tint: string }[] = [
  { kind: 'image', label: 'Photo', icon: 'ri-image-add-line', accept: 'image/*', tint: 'bg-violet-500/20 text-violet-200' },
  { kind: 'video', label: 'Video', icon: 'ri-video-add-line', accept: 'video/*', tint: 'bg-rose-500/20 text-rose-200' },
  { kind: 'file', label: 'Document', icon: 'ri-file-add-line', accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,.rar,.7z', tint: 'bg-teal-500/20 text-teal-200' },
];

export function Composer({
  onSend, onUpload, onSendVoice, replyTo, onCancelReply, onOpenShare, onTyping, disabled,
}: ComposerProps) {
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pendingAttach, setPendingAttach] = useState<OutgoingAttachment | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const recorder = useVoiceRecorder();

  const recording = recorder.status === 'recording';
  const uploading = uploadPct !== null;

  const inputFor = (kind: 'image' | 'video' | 'file') =>
    (kind === 'image' ? imageRef : kind === 'video' ? videoRef : docRef);

  const submit = () => {
    const body = text.trim();
    if (!body && !pendingAttach) return;
    onSend(body, pendingAttach || undefined);
    setPendingAttach(null);
    setText('');
  };

  const handleChange = (value: string) => {
    setText(value);
    if (value.trim().length > 0) onTyping?.();
  };

  const handleFile = async (file: File, kind: 'image' | 'video' | 'file') => {
    setLocalError(null);
    setAttachOpen(false);
    setUploadPct(0);
    try {
      const duration = kind === 'video' ? await probeMediaDuration(file) : null;
      const url = await onUpload(file, kind, (p) => setUploadPct(p));
      setPendingAttach({
        kind,
        url,
        name: file.name,
        size: file.size,
        mime: file.type || undefined,
        duration: duration || undefined,
      });
    } catch (e) {
      setLocalError((e as Error)?.message?.includes('large')
        ? 'That file is too large (max 50 MB). Please pick a smaller one.'
        : 'Upload failed. Please try a different file.');
    } finally {
      setUploadPct(null);
      [imageRef, videoRef, docRef].forEach((r) => { if (r.current) r.current.value = ''; });
    }
  };

  const startRecording = async () => {
    setLocalError(null);
    setEmojiOpen(false);
    await recorder.start();
  };

  const sendRecording = async () => {
    setSendingVoice(true);
    try {
      const blob = await recorder.stop();
      if (!blob) { setLocalError('That recording was too short to send.'); return; }
      await onSendVoice(blob, recorder.seconds, recorder.extensionFor(blob));
    } catch {
      setLocalError('Could not send the voice note. Please try again.');
    } finally {
      setSendingVoice(false);
    }
  };

  const hasContent = !!text.trim() || !!pendingAttach;

  return (
    <div className="relative border-t border-[#2a3942] bg-[#202c33] px-3 py-2.5 md:px-4 md:py-3">
      {(localError || recorder.error) && (
        <div className="flex items-center gap-2 mb-2 rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs text-red-300">
          <i className="ri-error-warning-line text-sm flex-shrink-0" />
          <span>{localError || recorder.error}</span>
          <button onClick={() => { setLocalError(null); recorder.reset(); }} className="ml-auto text-red-300/70 hover:text-red-200 cursor-pointer">
            <i className="ri-close-line" />
          </button>
        </div>
      )}

      {uploading && (
        <div className="mb-2 rounded-xl bg-[#2a3942] px-3 py-2.5 border border-[#324650]">
          <div className="flex items-center gap-2 text-xs text-[#aebac1]">
            <i className="ri-upload-cloud-2-line text-base text-[#00a884]" />
            <span>Uploading… {uploadPct}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-[#111b21] overflow-hidden">
            <div className="h-full bg-[#00a884] transition-all duration-200" style={{ width: `${uploadPct}%` }} />
          </div>
        </div>
      )}

      {pendingAttach && !recording && (
        <div className="flex items-center gap-2.5 mb-2 bg-[#2a3942] rounded-xl px-3 py-2 border border-[#324650]">
          {pendingAttach.kind === 'image' ? (
            <img src={pendingAttach.url} alt="pending" className="w-14 h-11 object-cover rounded-lg flex-shrink-0" />
          ) : (
            <span className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${pendingAttach.kind === 'video' ? 'bg-rose-500/20 text-rose-200' : 'bg-teal-500/20 text-teal-200'}`}>
              <i className={`${pendingAttach.kind === 'video' ? 'ri-movie-2-line' : 'ri-file-3-line'} text-xl`} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-[#e9edef] truncate">{pendingAttach.name || (pendingAttach.kind === 'image' ? 'Photo' : 'Attachment')}</span>
            <span className="block text-[11px] text-[#8696a0]">
              {pendingAttach.kind === 'image' ? 'Photo' : pendingAttach.kind === 'video' ? 'Video' : 'Document'}
              {pendingAttach.size ? ` · ${formatBytes(pendingAttach.size)}` : ''}
            </span>
          </span>
          <button onClick={() => setPendingAttach(null)} className="text-[#8696a0] hover:text-[#e9edef] cursor-pointer flex-shrink-0">
            <i className="ri-close-line text-lg" />
          </button>
        </div>
      )}

      {replyTo && !recording && (
        <div className="flex items-center gap-2 mb-2 bg-[#2a3942] rounded-xl px-3 py-2 text-xs text-[#aebac1] border-l-2 border-[#00a884]">
          <i className="ri-reply-line" />
          <span className="truncate">Replying to {replyTo.sender_name || 'message'}</span>
          <button onClick={onCancelReply} className="ml-auto text-[#8696a0] hover:text-[#e9edef] cursor-pointer"><i className="ri-close-line" /></button>
        </div>
      )}

      {recording ? (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-3 py-2.5">
          <button onClick={recorder.cancel} disabled={sendingVoice} className="w-9 h-9 flex items-center justify-center rounded-full text-[#8696a0] hover:bg-[#2a3942] cursor-pointer disabled:opacity-40" title="Discard">
            <i className="ri-delete-bin-line text-lg" />
          </button>
          <span className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-semibold text-red-300 tabular-nums">{fmt(recorder.seconds)}</span>
          </span>
          <span className="flex items-center gap-0.5 flex-1 min-w-0 overflow-hidden">
            {BAR_DELAYS.map((d, i) => (
              <span key={i} className="w-1 rounded-full bg-red-400/70 animate-pulse" style={{ height: 8 + (i % 3) * 8, animationDelay: d }} />
            ))}
          </span>
          <span className="hidden sm:block text-[11px] text-[#8696a0] whitespace-nowrap">Recording…</span>
          <button
            onClick={sendRecording}
            disabled={sendingVoice}
            className="w-10 h-10 rounded-full bg-accent text-white hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center flex-shrink-0"
            title="Send voice note"
          >
            {sendingVoice ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-send-plane-2-fill text-lg" />}
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-1.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setEmojiOpen((v) => !v)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-[#8696a0] hover:bg-[#2a3942] cursor-pointer"
            >
              <i className="ri-emotion-happy-line text-xl" />
            </button>
            {emojiOpen && <EmojiPicker onPick={(e) => setText((t) => t + e)} onClose={() => setEmojiOpen(false)} />}
          </div>

          {/* + attach menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setAttachOpen((v) => !v)}
              disabled={uploading || disabled || recording}
              className={`w-10 h-10 flex items-center justify-center rounded-full cursor-pointer disabled:opacity-50 transition-colors ${attachOpen ? 'bg-[#2a3942] text-[#00a884]' : 'text-[#8696a0] hover:bg-[#2a3942]'}`}
              title="Attach"
            >
              {uploading ? <i className="ri-loader-4-line animate-spin text-lg" /> : <i className={`${attachOpen ? 'ri-close-line' : 'ri-add-line'} text-2xl`} />}
            </button>
            {attachOpen && (
              <div className="absolute bottom-12 left-0 z-30 w-52 bg-[#233138] rounded-2xl border border-[#2a3942] p-1.5 shadow-xl">
                {ATTACH_OPTIONS.map((opt) => (
                  <button
                    key={opt.kind}
                    type="button"
                    onClick={() => inputFor(opt.kind).current?.click()}
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-[#182229] cursor-pointer transition-colors"
                  >
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${opt.tint}`}>
                      <i className={`${opt.icon} text-lg`} />
                    </span>
                    <span className="text-sm text-[#e9edef] font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], 'image')} />
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], 'video')} />
          <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,.rar,.7z" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], 'file')} />

          <button
            type="button"
            onClick={onOpenShare}
            disabled={disabled || recording}
            className="hidden sm:flex w-10 h-10 items-center justify-center rounded-full text-[#8696a0] hover:bg-[#2a3942] cursor-pointer disabled:opacity-50 whitespace-nowrap"
            title="Share from CRM"
          >
            <i className="ri-link-m text-xl" />
          </button>

          <textarea
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder={pendingAttach ? 'Add a caption…' : 'Type a message'}
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none px-4 py-2.5 bg-[#2a3942] border border-transparent rounded-2xl text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] disabled:opacity-50 max-h-32 transition-colors"
          />

          {hasContent ? (
            <button
              type="button"
              onClick={submit}
              disabled={disabled || uploading}
              className="w-10 h-10 rounded-full bg-accent text-white hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center flex-shrink-0"
              title="Send"
            >
              <i className="ri-send-plane-2-fill text-lg" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled || !recorder.supported}
              className="w-10 h-10 rounded-full bg-accent text-white hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center flex-shrink-0"
              title={recorder.supported ? 'Record a voice note' : 'Voice notes are not supported in this browser'}
            >
              <i className="ri-mic-fill text-lg" />
            </button>
          )}
        </div>
      )}

      <p className="text-[10px] text-[#667781] mt-1.5 px-1">
        {recording
          ? 'Tap the send icon to share your voice note'
          : 'Enter to send · Shift+Enter for a new line · + for photo, video or document · tap the mic for a voice note'}
      </p>
    </div>
  );
}