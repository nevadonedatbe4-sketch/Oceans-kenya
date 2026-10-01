import { useState } from 'react';
import { fileIconKind, fileIconMeta, fileKindLabel, formatBytes, formatClock } from '../mediaUtils';

interface VideoMessageProps {
  url: string;
  duration?: number | null;
}

/** Inline video message with native player (preview / play / fullscreen). */
export function VideoMessage({ url, duration }: VideoMessageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm font-medium underline"
      >
        <i className="ri-movie-2-line text-lg" /> Open video
      </a>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden bg-black/40 mb-1.5">
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        className="rounded-lg max-h-72 w-full bg-black object-contain"
      />
      {!!duration && (
        <span className="pointer-events-none absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          <i className="ri-movie-2-line text-[11px]" /> {formatClock(duration)}
        </span>
      )}
    </div>
  );
}

interface FileCardProps {
  url: string;
  name?: string | null;
  size?: number | null;
  mime?: string | null;
  isOwn: boolean;
}

/** Downloadable file attachment: icon, name, type + size, download action. */
export function FileCard({ url, name, size, mime, isOwn }: FileCardProps) {
  const kind = fileIconKind(mime, name);
  const meta = fileIconMeta(kind);
  const displayName = name || decodeURIComponent(url.split('/').pop() || 'File').split('?')[0];
  const sizeLabel = formatBytes(size);
  const typeLabel = fileKindLabel(kind);

  const surface = isOwn ? 'bg-black/20 hover:bg-black/30' : 'bg-[#111b21] hover:bg-[#182229]';
  const nameColor = isOwn ? 'text-white' : 'text-[#e9edef]';
  const subColor = isOwn ? 'text-white/70' : 'text-[#8696a0]';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={displayName}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors cursor-pointer max-w-full ${surface}`}
    >
      <span className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${meta.bg} ${meta.fg}`}>
        <i className={`${meta.icon} text-xl`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-medium truncate ${nameColor}`}>{displayName}</span>
        <span className={`block text-[11px] ${subColor}`}>
          {typeLabel}{sizeLabel ? ` · ${sizeLabel}` : ''}
        </span>
      </span>
      <span className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center ${isOwn ? 'text-white/80' : 'text-[#00a884]'}`}>
        <i className="ri-download-2-line text-lg" />
      </span>
    </a>
  );
}

interface ImageMessageProps {
  url: string;
  onOpen: () => void;
}

/** Clickable image thumbnail (opens the full viewer). */
export function ImageMessage({ url, onOpen }: ImageMessageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium underline">
        <i className="ri-image-line text-lg" /> View photo
      </a>
    );
  }
  return (
    <button type="button" onClick={onOpen} className="block cursor-pointer w-full">
      <img
        src={url}
        alt="attachment"
        onError={() => setFailed(true)}
        className="rounded-lg mb-1.5 max-h-72 object-cover w-full"
      />
    </button>
  );
}

interface ImageViewerProps {
  url: string;
  caption?: string | null;
  onClose: () => void;
}

/** Full-screen image viewer with a download action. */
export function ImageViewer({ url, caption, onClose }: ImageViewerProps) {
  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-end gap-2 px-4 py-3 flex-shrink-0">
        <a
          href={url}
          download
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
          title="Download"
        >
          <i className="ri-download-2-line text-lg" />
        </a>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
          title="Close"
        >
          <i className="ri-close-line text-xl" />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center px-4 pb-4">
        <img
          src={url}
          alt={caption || 'attachment'}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full object-contain rounded-lg"
        />
      </div>
      {caption && <p className="px-6 pb-6 text-center text-sm text-white/85 flex-shrink-0">{caption}</p>}
    </div>
  );
}