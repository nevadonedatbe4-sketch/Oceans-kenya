import { useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { STATUS_BACKGROUNDS, postTextStatus, postImageStatus } from '../statusData';

interface StatusComposerProps {
  onClose: () => void;
  onPosted: () => void;
}

/**
 * Create a Status update — either a text update on a coloured background or a
 * photo with an optional caption. Nothing is posted until the user confirms.
 */
export function StatusComposer({ onClose, onPosted }: StatusComposerProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const [caption, setCaption] = useState('');
  const [background, setBackground] = useState(STATUS_BACKGROUNDS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickImage = (f: File) => {
    if (!f.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    setError(null);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return url; });
  };

  const post = async () => {
    if (!user) { setError('Your session has expired. Please sign in again.'); return; }
    if (tab === 'text' && !text.trim()) { setError('Write something for your status.'); return; }
    if (tab === 'image' && !file) { setError('Choose a photo for your status.'); return; }
    setBusy(true);
    setError(null);
    try {
      if (tab === 'text') await postTextStatus(user.id, text, background);
      else await postImageStatus(user.id, file as File, caption);
      if (preview) URL.revokeObjectURL(preview);
      onPosted();
    } catch (e) {
      setError((e as Error)?.message || 'Could not post your status. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[68] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-[#111b21] rounded-2xl border border-[#2a3942] flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a3942]">
          <h2 className="text-base font-semibold text-[#e9edef]">New status</h2>
          <button onClick={onClose} disabled={busy} className="text-[#8696a0] hover:text-[#e9edef] cursor-pointer p-1 disabled:opacity-40"><i className="ri-close-line text-xl" /></button>
        </div>

        <div className="flex gap-1.5 p-3">
          <button onClick={() => setTab('text')} className={`flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer whitespace-nowrap ${tab === 'text' ? 'bg-[#00a884] text-[#0b141a]' : 'bg-[#202c33] text-[#aebac1]'}`}>
            <i className="ri-text mr-1.5" /> Text
          </button>
          <button onClick={() => setTab('image')} className={`flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer whitespace-nowrap ${tab === 'image' ? 'bg-[#00a884] text-[#0b141a]' : 'bg-[#202c33] text-[#aebac1]'}`}>
            <i className="ri-image-line mr-1.5" /> Photo
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs text-red-300">
              <i className="ri-error-warning-line text-sm mt-0.5" /><span>{error}</span>
            </div>
          )}

          {tab === 'text' ? (
            <>
              <div className="rounded-xl flex items-center justify-center p-6 min-h-[180px]" style={{ background }}>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={280}
                  rows={4}
                  placeholder="Type a status…"
                  className="w-full bg-transparent text-center text-white text-lg font-medium placeholder:text-white/60 focus:outline-none resize-none"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {STATUS_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setBackground(bg)}
                    className={`w-8 h-8 rounded-full cursor-pointer ${background === bg ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#111b21]' : ''}`}
                    style={{ background: bg }}
                    aria-label="Background"
                  />
                ))}
                <span className="ml-auto text-[11px] text-[#667781]">{text.length}/280</span>
              </div>
            </>
          ) : (
            <>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pickImage(e.target.files[0])} />
              {preview ? (
                <div className="relative rounded-xl overflow-hidden bg-black/40 border border-[#2a3942]">
                  <img src={preview} alt="preview" className="w-full max-h-[300px] object-contain" />
                  <button onClick={() => { setFile(null); URL.revokeObjectURL(preview); setPreview(null); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"><i className="ri-close-line" /></button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} className="w-full h-40 rounded-xl border-2 border-dashed border-[#2a3942] text-[#8696a0] hover:border-[#00a884] hover:text-[#00a884] cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors">
                  <i className="ri-image-add-line text-3xl" />
                  <span className="text-sm">Choose a photo</span>
                </button>
              )}
              <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} placeholder="Add a caption (optional)" className="w-full px-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]" />
            </>
          )}
          <p className="text-[11px] text-[#667781]"><i className="ri-time-line mr-1" />Statuses disappear automatically after 24 hours.</p>
        </div>

        <div className="px-5 py-3 border-t border-[#2a3942] flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg text-sm text-[#8696a0] hover:bg-[#202c33] cursor-pointer whitespace-nowrap disabled:opacity-50">Cancel</button>
          <button onClick={post} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00a884] text-[#0b141a] text-sm font-semibold hover:bg-[#06cf9c] cursor-pointer whitespace-nowrap disabled:opacity-50">
            {busy ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-send-plane-2-fill" />}
            {busy ? 'Posting…' : 'Post status'}
          </button>
        </div>
      </div>
    </div>
  );
}