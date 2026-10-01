// Shared accent themes + formatting for the OGroup punch clock.

export type AccentKey = 'teal' | 'navy';

export interface AccentTheme {
  label: string;
  dot: string;
  card: string;
  btnText: string;
  softBg: string;
  softText: string;
  softBorder: string;
  tileIcon: string;
  ring: string;
}

export const ACCENTS: Record<AccentKey, AccentTheme> = {
  teal: {
    label: 'Teal',
    dot: 'bg-[#2CDEBE]',
    card: 'from-[#0d9488] via-[#0f8074] to-[#115e59]',
    btnText: 'text-[#0f766e]',
    softBg: 'bg-[#2CDEBE]/10',
    softText: 'text-[#0f766e]',
    softBorder: 'border-[#2CDEBE]/30',
    tileIcon: 'bg-[#2CDEBE]/15 text-[#0f766e]',
    ring: 'border-[#2CDEBE]/60',
  },
  navy: {
    label: 'Navy',
    dot: 'bg-[#012144]',
    card: 'from-[#012144] via-[#001d3d] to-[#001731]',
    btnText: 'text-[#001731]',
    softBg: 'bg-[#001731]/10',
    softText: 'text-[#012144]',
    softBorder: 'border-[#001731]/25',
    tileIcon: 'bg-[#001731]/10 text-[#012144]',
    ring: 'border-white/40',
  },
};

export const CTA_COLOR = '#EF8A72';
export const CTA_HOVER = '#E5745B';

export function fmtTime(iso: string | null) {
  if (!iso) return '—:—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function fmtDur(sec: number) {
  const safe = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  return `${h}h ${m}m`;
}

export function fmtShortDur(sec: number) {
  const safe = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Total break seconds including any in-progress break. */
export function liveBreakSec(session: { break_sec: number | null; status: string; break_started_at: string | null }, now: number) {
  const base = session.break_sec || 0;
  if (session.status === 'break' && session.break_started_at) {
    return base + Math.max(0, Math.floor((now - new Date(session.break_started_at).getTime()) / 1000));
  }
  return base;
}