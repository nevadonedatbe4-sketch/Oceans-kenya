// Shared helpers for the admin attendance surfaces.

export interface SessionRow {
  id: string;
  user_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  status: 'working' | 'break' | 'completed' | string;
  break_sec: number | null;
  break_started_at: string | null;
  break_type: string | null;
  hours_worked_sec: number | null;
  overtime_sec: number | null;
  late_sec: number | null;
  early_depart_sec: number | null;
  flagged_geofence: boolean;
  location_method: string | null;
  note: string | null;
  timesheet_status: string | null;
}

export interface MemberRow {
  user_id: string;
  name: string;
  avatar: string | null;
  role: string | null;
  openSession?: SessionRow | null;
  todayWorkedSec: number;
  openShift: boolean;
}

export function fmtTime(iso?: string | null) {
  return iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
}

export function fmtDur(sec: number | null | undefined) {
  if (sec == null) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function fmtDurShort(sec: number | null | undefined) {
  if (sec == null) return '0m';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function liveBreakSec(s: SessionRow, now: number) {
  const base = s.break_sec || 0;
  if (s.status === 'break' && s.break_started_at) {
    return base + Math.max(0, Math.floor((now - new Date(s.break_started_at).getTime()) / 1000));
  }
  return base;
}

export function isOpenShift(s: SessionRow, todayStart: Date) {
  return !s.clock_out_at && new Date(s.clock_in_at) < todayStart;
}

export const MAX_SHIFT_MINUTES_DEFAULT = 720;

/**
 * Prefix the server writes into `note` when it auto-closes a shift at the
 * maximum length. Auto-close is detected from here — NOT from `location_method`,
 * which is a CHECK-constrained enum that only holds HOW clock-in coordinates
 * were obtained ('gps' | 'manual' | 'none') and never a punch-out reason.
 */
export const AUTO_CLOSE_NOTE_PREFIX = 'Auto punched out:';

/** A session the server auto-closed because it reached the maximum shift length. */
export function isAutoClosed(s: Pick<SessionRow, 'note'>) {
  return !!s.note && s.note.includes(AUTO_CLOSE_NOTE_PREFIX);
}

export function exportCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function rangeStart(key: 'today' | 'week' | 'month'): Date {
  const d = new Date();
  if (key === 'today') d.setHours(0, 0, 0, 0);
  else if (key === 'week') { d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); }
  else { d.setDate(1); d.setHours(0, 0, 0, 0); }
  return d;
}