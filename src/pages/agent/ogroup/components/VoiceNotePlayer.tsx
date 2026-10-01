import { useEffect, useMemo, useRef, useState } from 'react';
import { formatClock, waveformBars } from '../mediaUtils';

interface VoiceNotePlayerProps {
  url: string;
  duration?: number | null;
  isOwn: boolean;
}

const BAR_COUNT = 30;

/**
 * WhatsApp-style voice note: play/pause bubble with a waveform that fills as
 * it plays. Click anywhere on the waveform to seek. Works for both the sender
 * and the receiver.
 */
export function VoiceNotePlayer({ url, duration, isOwn }: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [total, setTotal] = useState(duration && duration > 0 ? duration : 0);
  const [loading, setLoading] = useState(false);

  const bars = useMemo(() => waveformBars(url, BAR_COUNT), [url]);

  useEffect(() => {
    setPlaying(false);
    setElapsed(0);
    setTotal(duration && duration > 0 ? duration : 0);
  }, [url, duration]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      setLoading(true);
      el.play().catch(() => setLoading(false));
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * total;
    setElapsed(ratio * total);
  };

  const progress = total > 0 ? Math.min(1, elapsed / total) : 0;
  const filledBars = Math.round(progress * bars.length);

  const accent = isOwn ? 'bg-white' : 'bg-[#00a884]';
  const mutedBar = isOwn ? 'bg-white/35' : 'bg-[#8696a0]/45';
  const text = isOwn ? 'text-white/80' : 'text-[#8696a0]';

  return (
    <div className="flex items-center gap-2.5 w-[220px] sm:w-[248px] max-w-full">
      <button
        type="button"
        onClick={toggle}
        className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center cursor-pointer ${isOwn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-[#00a884]/20 text-[#00a884] hover:bg-[#00a884]/30'} transition-colors`}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
      >
        {loading && !playing ? (
          <i className="ri-loader-4-line animate-spin text-lg" />
        ) : (
          <i className={`${playing ? 'ri-pause-fill' : 'ri-play-fill'} text-lg`} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className="flex items-center gap-[3px] h-8 cursor-pointer"
          onClick={seek}
          role="slider"
          aria-label="Seek voice note"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(elapsed)}
          tabIndex={0}
        >
          {bars.map((h, i) => (
            <span
              key={i}
              className={`flex-1 rounded-full transition-colors ${i < filledBars ? accent : mutedBar}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className={`flex items-center justify-between mt-0.5 text-[10px] tabular-nums ${text}`}>
          <span>{formatClock(playing || elapsed > 0 ? elapsed : total)}</span>
          <span className="flex items-center gap-1">
            {isOwn && <i className="ri-mic-fill text-[11px]" />}
            {formatClock(total)}
          </span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => { setPlaying(true); setLoading(false); }}
        onPause={() => setPlaying(false)}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setTotal(d);
        }}
        onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
        onEnded={() => { setPlaying(false); setElapsed(0); }}
      />
    </div>
  );
}