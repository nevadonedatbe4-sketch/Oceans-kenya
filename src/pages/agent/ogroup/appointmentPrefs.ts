import type { AppointmentKind } from './calendarTypes';

/**
 * Per-user appointment convenience memory (last-used type + assignee) so
 * repeat bookings are effectively a single click.
 *
 * Stored in localStorage keyed by user id — this is a UI convenience only,
 * never a source of truth, and never shared between users on one machine.
 */
export interface ApptPrefs {
  kind?: AppointmentKind;
  assigneeId?: string;
}

const keyFor = (userId?: string | null) => `og_appt_prefs:${userId || 'anon'}`;

export function readApptPrefs(userId?: string | null): ApptPrefs {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ApptPrefs;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeApptPrefs(userId: string | null | undefined, patch: ApptPrefs): void {
  try {
    if (!userId) return;
    const next = { ...readApptPrefs(userId), ...patch };
    localStorage.setItem(keyFor(userId), JSON.stringify(next));
  } catch {
    // Best-effort convenience only — never block a booking on this.
  }
}