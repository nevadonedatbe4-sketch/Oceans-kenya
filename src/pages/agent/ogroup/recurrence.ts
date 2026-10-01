import type { RecurrenceRule } from './calendarTypes';
import { addDays, addMonths } from './calendarTypes';

// ─────────────────────────────────────────────────────────────
// RECURRENCE — one canonical engine for recurring appointments.
//
// `RecurringEditScope` controls what a recurring edit applies to:
//   this    → detach a single occurrence into a standalone appointment
//   future  → end the old series here, start a fresh series from here
//   series  → update every occurrence in the series
// ─────────────────────────────────────────────────────────────

export type RecurringEditScope = 'this' | 'future' | 'series';

export const EDIT_SCOPE_OPTIONS: { value: RecurringEditScope; label: string; hint: string }[] = [
  { value: 'this', label: 'This appointment only', hint: 'Detach this occurrence from the series' },
  { value: 'future', label: 'This and future appointments', hint: 'Keep the past, rebuild from here' },
  { value: 'series', label: 'Entire series', hint: 'Change every occurrence' },
];

export interface RecurrencePreset {
  value: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  label: string;
}

export const RECURRENCE_PRESETS: RecurrencePreset[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

export function presetForRule(rule: RecurrenceRule | null): RecurrencePreset['value'] {
  if (!rule) return 'none';
  if (rule.interval && rule.interval > 1) return 'custom';
  if (rule.frequency === 'daily') return 'daily';
  if (rule.frequency === 'weekly' && !rule.byWeekday?.length) return 'weekly';
  if (rule.frequency === 'monthly') return 'monthly';
  return 'custom';
}

export function describeRecurrence(rule: RecurrenceRule | null): string {
  if (!rule) return 'Does not repeat';
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const unit = rule.frequency === 'daily' ? 'day' : rule.frequency === 'monthly' ? 'month' : 'week';
  let label =
    rule.interval && rule.interval > 1
      ? `Every ${rule.interval} ${unit}s`
      : `Every ${unit}`;
  if (rule.frequency === 'weekly' && rule.byWeekday?.length) {
    label += ` on ${rule.byWeekday.map((d) => names[d]).join(', ')}`;
  }
  if (rule.count && rule.count > 0) label += `, ${rule.count} times`;
  else if (rule.until) {
    label += `, until ${new Date(rule.until).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  }
  return label;
}

export interface Occurrence {
  starts_at: string;
  ends_at: string;
}

/**
 * Expand a rule into concrete occurrences (including the original first one).
 * Capped so a bad rule can never explode the calendar.
 */
export function buildOccurrences(
  startIso: string,
  endIso: string,
  rule: RecurrenceRule,
  limit = 60,
): Occurrence[] {
  const durationMs = new Date(endIso).getTime() - new Date(startIso).getTime();
  const out: Occurrence[] = [{ starts_at: startIso, ends_at: endIso }];
  const until = rule.until ? new Date(rule.until).getTime() : null;
  const max = rule.count && rule.count > 0 ? Math.min(rule.count, limit) : limit;
  const step = Math.max(1, rule.interval || 1);

  let cursor = new Date(startIso);
  let guard = 0;
  while (out.length < max && guard < 500) {
    guard += 1;
    if (rule.frequency === 'daily') cursor = addDays(cursor, step);
    else if (rule.frequency === 'weekly') cursor = addDays(cursor, step * 7);
    else cursor = addMonths(cursor, step);
    if (until && cursor.getTime() > until) break;
    out.push({
      starts_at: cursor.toISOString(),
      ends_at: new Date(cursor.getTime() + durationMs).toISOString(),
    });
  }
  return out;
}