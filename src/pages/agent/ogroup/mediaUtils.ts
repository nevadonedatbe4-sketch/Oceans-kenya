// ─────────────────────────────────────────────────────────────
// OCEANS CHAT — media helpers
// Small, dependency-free utilities shared by the composer, message
// bubbles and the conversation previews.
// ─────────────────────────────────────────────────────────────

export type MediaKind = 'image' | 'video' | 'voice' | 'file';

export type FileIconKind = 'pdf' | 'word' | 'excel' | 'ppt' | 'csv' | 'text' | 'archive' | 'image' | 'video' | 'audio' | 'file';

/** Human-readable file size ("4.2 MB"). */
export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 10 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

/** Duration in m:ss (or h:mm:ss) from a number of seconds. */
export function formatClock(seconds?: number | null): string {
  const total = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** True when an attachment URL points at a video clip. */
export function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v|ogv|ogg|mkv)(\?|$)/i.test(url) || url.includes('/video/');
}

/** True when an attachment URL points at an audio clip. */
export function isAudioUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(webm|mp3|m4a|ogg|wav|aac|opus)(\?|$)/i.test(url) || url.includes('voice-notes');
}

/** Classify a MIME type into a coarse icon bucket. */
export function fileIconKind(mime?: string | null, name?: string | null): FileIconKind {
  const m = (mime || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|heic)$/.test(n)) return 'image';
  if (m.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv)$/.test(n)) return 'video';
  if (m.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|aac|opus)$/.test(n)) return 'audio';
  if (m === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (m.includes('word') || /\.(docx?|rtf|odt)$/.test(n)) return 'word';
  if (m.includes('excel') || m.includes('spreadsheet') || /\.(xlsx?|ods)$/.test(n)) return 'excel';
  if (m.includes('powerpoint') || m.includes('presentation') || /\.(pptx?|odp)$/.test(n)) return 'ppt';
  if (m === 'text/csv' || n.endsWith('.csv')) return 'csv';
  if (m.startsWith('text/') || /\.(txt|md|json|log)$/.test(n)) return 'text';
  if (m.includes('zip') || m.includes('compressed') || /\.(zip|rar|7z|tar|gz)$/.test(n)) return 'archive';
  return 'file';
}

const ICONS: Record<FileIconKind, { icon: string; bg: string; fg: string }> = {
  pdf: { icon: 'ri-file-pdf-2-line', bg: 'bg-red-500/20', fg: 'text-red-300' },
  word: { icon: 'ri-file-word-2-line', bg: 'bg-sky-500/20', fg: 'text-sky-300' },
  excel: { icon: 'ri-file-excel-2-line', bg: 'bg-emerald-500/20', fg: 'text-emerald-300' },
  ppt: { icon: 'ri-file-ppt-2-line', bg: 'bg-amber-500/20', fg: 'text-amber-300' },
  csv: { icon: 'ri-file-chart-2-line', bg: 'bg-emerald-500/20', fg: 'text-emerald-300' },
  text: { icon: 'ri-file-text-line', bg: 'bg-slate-500/20', fg: 'text-slate-200' },
  archive: { icon: 'ri-file-zip-line', bg: 'bg-amber-500/20', fg: 'text-amber-300' },
  image: { icon: 'ri-image-2-line', bg: 'bg-violet-500/20', fg: 'text-violet-200' },
  video: { icon: 'ri-movie-2-line', bg: 'bg-rose-500/20', fg: 'text-rose-200' },
  audio: { icon: 'ri-music-2-line', bg: 'bg-teal-500/20', fg: 'text-teal-200' },
  file: { icon: 'ri-file-line', bg: 'bg-white/10', fg: 'text-[#aebac1]' },
};

export function fileIconMeta(kind: FileIconKind): { icon: string; bg: string; fg: string } {
  return ICONS[kind] || ICONS.file;
}

/** A short, human "file type" label ("PDF", "Word", "Excel"…). */
export function fileKindLabel(kind: FileIconKind): string {
  switch (kind) {
    case 'pdf': return 'PDF';
    case 'word': return 'Word document';
    case 'excel': return 'Spreadsheet';
    case 'ppt': return 'Presentation';
    case 'csv': return 'CSV file';
    case 'text': return 'Text file';
    case 'archive': return 'Archive';
    case 'image': return 'Image';
    case 'video': return 'Video';
    case 'audio': return 'Audio';
    default: return 'File';
  }
}

/**
 * Deterministic pseudo-waveform so every voice note looks stable across
 * re-renders (the same URL always produces the same bars), without needing
 * to decode real audio data on the client.
 */
export function waveformBars(seed: string, count = 30): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const bars: number[] = [];
  for (let i = 0; i < count; i += 1) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const base = 22 + (h % 70);
    // Soften the first/last bars so the clip reads like a voice envelope.
    const edge = Math.min(i, count - 1 - i);
    const taper = edge < 3 ? 0.55 + edge * 0.15 : 1;
    bars.push(Math.round(base * taper));
  }
  return bars;
}

/** Probe the duration (seconds) of a local image/video/audio File. */
export function probeMediaDuration(file: File): Promise<number | null> {
  if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
    let settled = false;
    const done = (value: number | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      const d = Number.isFinite(el.duration) ? el.duration : null;
      done(d && d > 0 && d < 86400 ? d : null);
    };
    el.onerror = () => done(null);
    setTimeout(() => done(null), 4000);
    el.src = url;
  });
}