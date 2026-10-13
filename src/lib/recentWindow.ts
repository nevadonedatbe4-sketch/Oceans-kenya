/**
 * recentWindow - the single source of truth for the "added in the last …"
 * time windows used across every property results page.
 *
 * The search bar (and the advanced panels) let a visitor pick a recency window
 * such as "Last 24 hours" / "Last 3 days". The zero-result note must report the
 * SAME window the visitor actually searched - never a hardcoded one - and, when
 * that window is empty, point them at the CLOSEST window that does contain
 * inventory (e.g. "nothing in 24 hours, but 8 were added in the last 3 days").
 *
 * Everything here is pure and label-driven so the note, the dropdowns and the
 * database query all agree on one definition.
 */

/** One selectable recency window and its length in hours. */
export interface RecentWindowOption {
  label: string;
  hours: number;
}

/**
 * The canonical OPTION list shown by every "Added to site" / "Added time"
 * control on the site (main search bars + advanced panels). 'Anytime' means no
 * time restriction; exactly one option may be selected at a time.
 */
export const ADDED_WINDOW_OPTIONS: string[] = [
  'Anytime',
  'Last 24 hours',
  'Last 3 days',
  'Last 7 days',
  'Last 14 days',
  'Last 30 days',
];

/**
 * The canonical ladder of "added" windows, ascending. Every property-search
 * surface (Buy, Rent, All Properties, Commercial, SEO landing pages and the
 * advanced panels) exposes EXACTLY these windows, so the selectable options,
 * the query boundary and the covering-window suggestion can never drift apart.
 */
export const ADDED_WINDOW_LADDER: RecentWindowOption[] = [
  { label: 'Last 24 hours', hours: 24 },
  { label: 'Last 3 days', hours: 72 },
  { label: 'Last 7 days', hours: 168 },
  { label: 'Last 14 days', hours: 336 },
  { label: 'Last 30 days', hours: 720 },
];

/**
 * Parse a human window label ("Last 24 hours", "Last 3 days", "Last 2 weeks")
 * into a number of hours. Returns null for 'Anytime' or anything unrecognised,
 * so callers can treat null as "no explicit window".
 */
export function hoursForWindowLabel(label: string | null | undefined): number | null {
  if (!label) return null;
  const match = label.trim().match(/^Last\s+(\d+)\s+(hour|hours|day|days|week|weeks|month|months)$/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = match[2].toLowerCase();
  if (unit.startsWith('hour')) return n;
  if (unit.startsWith('day')) return n * 24;
  if (unit.startsWith('week')) return n * 7 * 24;
  if (unit.startsWith('month')) return n * 30 * 24;
  return null;
}

/**
 * The smallest window on the ladder that fully covers `hoursAgo`. Returns null
 * when the closest record is older than the widest window (so callers fall back
 * to a plain "try widening your search" message instead of proposing a label
 * that would not change anything).
 */
export function windowLabelForHours(
  hoursAgo: number,
  ladder: RecentWindowOption[] = ADDED_WINDOW_LADDER,
): RecentWindowOption | null {
  if (!Number.isFinite(hoursAgo) || hoursAgo < 0) return null;
  for (const option of ladder) {
    if (option.hours >= hoursAgo) return option;
  }
  return null;
}

/** A short, human elapsed phrase: "less than an hour", "48 hours", "3 days", "2 weeks". */
export function formatElapsedHours(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return '';
  if (hours < 1) return 'less than an hour';
  if (hours <= 48) return `${Math.max(1, Math.round(hours))} hours`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days} ${days === 1 ? 'day' : 'days'}`;
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }
  const months = Math.round(days / 30);
  return `${months} ${months === 1 ? 'month' : 'months'}`;
}

/**
 * Turn a window label into the fragment used after "in the last ___", e.g.
 * "Last 24 hours" → "24 hours", "Last 3 days" → "3 days".
 */
export function windowPhrase(label: string): string {
  return label.replace(/^Last\s+/i, '').trim();
}

/**
 * The SINGLE shared boundary rule for the "Added to site" window. Turns a
 * window label into the INCLUSIVE lower bound (as an ISO string) for the
 * listing's first-listed timestamp (`listings.created_at`).
 *
 *  • 'Anytime' (or anything unrecognised) → null  → no time restriction at all.
 *  • 'Last 24 hours' → now − 24h, 'Last 3 days' → now − 72h, and so on.
 *
 * Callers apply it as `created_at >= bound`, which INCLUDES rows exactly on the
 * boundary and EXCLUDES older rows and rows with no valid timestamp. Because the
 * bound is recomputed from the current time on every query, the window is always
 * relative to the server-side "now" at request time - never a cached value.
 */
export function addedSinceISO(label: string | null | undefined): string | null {
  const hours = hoursForWindowLabel(label);
  if (hours == null) return null;
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}