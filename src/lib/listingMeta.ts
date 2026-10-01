/**
 * listingMeta - THE shared validator + formatter for every piece of listing
 * metadata shown to users (listing age, price, and the guards around them).
 *
 * WHY THIS EXISTS
 * ---------------
 * Metadata used to be produced in several places with different rules, which is
 * how values like "Listed 0 months ago" or "KSh 0" leaked onto the site. The
 * problem was never the UI layer - it was that missing / invalid values were
 * being coerced into `0` (or an empty string) somewhere in the pipeline.
 *
 * This module is the single source of truth. Every listing surface imports its
 * rules from here so the behaviour can never drift again:
 *
 *   • Missing  (null / undefined / '')   → treated as MISSING (never a value)
 *   • NaN / Infinity                     → INVALID  (never a value)
 *   • Numeric 0 for price / age          → INVALID  (never displayed)
 *   • Valid positive numbers             → formatted normally
 *
 * AGE RULES
 * ---------
 * A newly published listing shows "Listed recently" - never "0 days ago".
 * An age of 0 months / 0 weeks / 0 years can NEVER be produced. A missing or
 * invalid publication date returns an EMPTY string so callers omit the age
 * entirely rather than invent a placeholder.
 *
 * PRICE RULES
 * -----------
 * A missing / zero / invalid price returns the human label "Price on request".
 * Zero is treated as "no price supplied", never as a real price.
 */

export const PRICE_ON_REQUEST = 'Price on request';

/** True when a value carries no usable information (null / undefined / '' / NaN). */
export function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'number') return !Number.isFinite(value);
  return false;
}

/**
 * Coerce a value to a finite number, or return null when it is missing or
 * invalid. NEVER returns 0 as a stand-in for "missing" - invalid input is null.
 */
export function toValidNumber(value: unknown): number | null {
  if (isMissingValue(value)) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * A price is only valid when it is a finite number greater than zero.
 * Zero is explicitly INVALID for a price (it almost always means "not set").
 */
export function hasValidPrice(value: unknown): boolean {
  const n = toValidNumber(value);
  return n !== null && n > 0;
}

export type ListingAgeUnit = 'day' | 'week' | 'month' | 'year';

export interface ListingAge {
  /** Whole units. `0` means "newly listed" (rendered as "recently"). */
  value: number;
  unit: ListingAgeUnit;
}

/**
 * Resolve a publication date into a human age broken into a value + unit.
 *
 * Returns null for a missing / unparseable / future date so the caller can omit
 * the metadata entirely. A value of 0 (same day) is valid and means "recently".
 *
 * The month branch is only used once a FULL month has elapsed, so 28-29 day old
 * listings fall through to "4 weeks ago" instead of the old "0 months ago" bug.
 */
export function listingAge(dateInput: unknown): ListingAge | null {
  if (dateInput === null || dateInput === undefined || dateInput === '') return null;
  const date = dateInput instanceof Date ? dateInput : new Date(String(dateInput));
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return null; // future / invalid date - never fabricate

  const days = Math.floor(diffMs / 86_400_000);
  if (days < 1) return { value: 0, unit: 'day' };
  if (days < 7) return { value: days, unit: 'day' };

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return { value: weeks, unit: 'week' };

  const months = Math.floor(days / 30);
  if (months >= 1 && months < 12) return { value: months, unit: 'month' };

  const years = Math.floor(days / 365);
  if (years >= 1) return { value: years, unit: 'year' };

  // 28-29 days: not yet a full month, and exactly 4 weeks. Show weeks so we
  // never render a "0 months ago".
  return { value: weeks, unit: 'week' };
}

/**
 * The bare age phrase, e.g. "recently", "3 days ago", "1 month ago".
 * Returns '' when the date is missing / invalid so callers can omit it.
 */
export function formatListingAgeAgo(dateInput: unknown): string {
  const age = listingAge(dateInput);
  if (!age) return '';
  if (age.unit === 'day' && age.value === 0) return 'recently';
  const unit = age.value === 1 ? age.unit : `${age.unit}s`;
  return `${age.value} ${unit} ago`;
}

/**
 * The full listing-age label, e.g. "Listed recently", "Listed 2 weeks ago".
 * Returns '' when the date is missing / invalid, so **omit the metadata**
 * rather than ever showing a zero or a placeholder.
 */
export function formatListingAge(dateInput: unknown, options?: { prefix?: string }): string {
  const core = formatListingAgeAgo(dateInput);
  if (!core) return '';
  const prefix = options?.prefix ?? 'Listed';
  return prefix ? `${prefix} ${core}` : core;
}

/**
 * Format a listing price, falling back to "Price on request" for any missing /
 * zero / invalid value. An optional formatter (e.g. the currency converter) is
 * only invoked once the value has passed validation.
 */
export function formatListingPrice(
  amount: unknown,
  currency?: string | null,
  format?: (value: number, currency: string) => string,
): string {
  if (!hasValidPrice(amount)) return PRICE_ON_REQUEST;
  const n = toValidNumber(amount) as number;
  if (format) return format(n, currency || 'KES');
  const symbol = (currency || 'KES').toUpperCase();
  return `${symbol} ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}