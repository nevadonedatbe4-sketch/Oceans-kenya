/**
 * bedrooms - the single source of truth for bedroom filtering.
 *
 * Every property search entry point (Buy, Rent, Commercial, All Properties,
 * SEO pages) uses these helpers, so the main bedroom selector and the Advanced
 * Search minimum/maximum fields behave identically everywhere and always map to
 * the SAME query constraints:
 *
 *   • Main selector: "2 beds" → exactly 2 · "10+ beds" → 10 or more
 *   • Advanced:      minimum-only, maximum-only, or a combined range
 *
 * The rules mirror how the free-text parser already behaves, so a dropdown
 * selection and a typed "2 bedroom" query produce the same database filter.
 */

/** The main bedroom-selector options. 1–9 are EXACT; only 10+ is open-ended. */
export const BEDROOM_OPTIONS: string[] = [
  'Any beds',
  'Studio',
  '1 bed',
  '2 beds',
  '3 beds',
  '4 beds',
  '5 beds',
  '6 beds',
  '7 beds',
  '8 beds',
  '9 beds',
  '10+ beds',
];

/** Advanced Search "Minimum bedrooms" options (open-ended at 10+). */
export const BEDROOM_MIN_OPTIONS: string[] = [
  'No min',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10+',
];

/** Advanced Search "Maximum bedrooms" options (bounded at 10). */
export const BEDROOM_MAX_OPTIONS: string[] = [
  'No max',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
];

/**
 * The subset of ListingFilters that a bedroom constraint maps onto.
 * `bedsExact` (including 0 for a studio) is a precise match; `bedsMin` /
 * `bedsMax` are inclusive bounds.
 */
export interface BedroomRange {
  bedsExact?: number;
  bedsMin?: number;
  bedsMax?: number;
}

/**
 * Translate a main-selector label into a concrete query constraint.
 * Unknown / "Any beds" → no constraint ().
 */
export function bedroomSelectionToRange(value: string | null | undefined): BedroomRange {
  if (!value || value === 'Any beds') return {};
  if (value === 'Studio') return { bedsExact: 0 };
  if (value === '10+ beds') return { bedsMin: 10 };
  const exact = /^(\d+)\s*beds?$/.exec(value.trim());
  if (exact) return { bedsExact: parseInt(exact[1], 10) };
  return {};
}

/**
 * Parse a single Advanced-Search bound label into a number.
 * "No min" / "No max" / "Any" / '' → undefined (meaning "not specified").
 * "10+" → 10.
 */
export function parseBedroomBound(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (v === '' || v === 'No min' || v === 'No max' || v.toLowerCase() === 'any') return undefined;
  const plus = /^(\d+)\+$/.exec(v);
  if (plus) return parseInt(plus[1], 10);
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * True when the min/max bedroom bounds are contradictory (min > max), so the
 * UI can block submission and show a validation message instead of returning
 * a confusing empty result.
 */
export function bedroomsRangeInvalid(minValue: string | null | undefined, maxValue: string | null | undefined): boolean {
  const min = parseBedroomBound(minValue);
  const max = parseBedroomBound(maxValue);
  return min !== undefined && max !== undefined && min > max;
}

/** Human label for a bedroom count, e.g. 1 → "1 bed", 3 → "3 beds". */
export function bedroomCountLabel(n: number): string {
  return `${n} bed${n === 1 ? '' : 's'}`;
}