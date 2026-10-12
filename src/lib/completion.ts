/**
 * Completion windows for the New Developments "Completion" filter.
 *
 * Instead of a handful of year values scraped from current records, the filter
 * offers a longer, relative ladder measured from today - from "Within 1 month"
 * out to "Within 5 years". Selecting a window shows projects completing from
 * today up to that point in time.
 */

export interface CompletionWindow {
  /** Visible option label (also used as the stored filter value). */
  label: string;
  /** Number of months from now that the window reaches. */
  months: number;
}

export const COMPLETION_WINDOWS: CompletionWindow[] = [
  { label: 'Within 1 month', months: 1 },
  { label: 'Within 2 months', months: 2 },
  { label: 'Within 3 months', months: 3 },
  { label: 'Within 6 months', months: 6 },
  { label: 'Within 9 months', months: 9 },
  { label: 'Within 1 year', months: 12 },
  { label: 'Within 18 months', months: 18 },
  { label: 'Within 2 years', months: 24 },
  { label: 'Within 3 years', months: 36 },
  { label: 'Within 4 years', months: 48 },
  { label: 'Within 5 years', months: 60 },
];

/** Build the full option list, keeping the neutral "any" choice first. */
export function completionWindowOptions(neutralLabel: string): string[] {
  return [neutralLabel, ...COMPLETION_WINDOWS.map((w) => w.label)];
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * True when the given completion date falls inside the selected window - i.e.
 * from today up to "now + window". The neutral/unknown label matches everything.
 */
export function matchesCompletionWindow(iso: string, label: string, now: Date = new Date()): boolean {
  const window = COMPLETION_WINDOWS.find((w) => w.label === label);
  if (!window) return true;
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = addMonths(now, window.months);
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}