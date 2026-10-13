/**
 * searchHeading - builds the human-readable results heading from the ACTUAL
 * search state (property type + transaction + location + radius), so the
 * heading always describes what the engine really queried.
 *
 * e.g. "Houses for rent in Karen", "Apartments for sale in Nairobi",
 *      "Houses for sale in Karen, within 5 miles", "Properties for rent".
 *
 * The heading is a summary of the active search - it is NOT an extra filter
 * and never replaces the real query.
 */

export interface ResultsHeadingInput {
  /** Property type label, singular (e.g. "House", "Apartment", "Studio flat"). */
  typeLabel?: string | null;
  /** Transaction the page is searching for. */
  purpose?: 'sale' | 'rent' | null;
  /** Resolved area or city name (e.g. "Karen" or "Nairobi"). */
  location?: string | null;
  /** Selected radius label (e.g. "5 miles"); omitted when "This area only". */
  radiusLabel?: string | null;
  /** Shown when there is nothing to describe (e.g. the page's default title). */
  fallback: string;
}

/** Types whose plural is irregular or uncountable. */
const IRREGULAR: Record<string, string> = {
  house: 'Houses',
  property: 'Properties',
  office: 'Offices',
  'office space': 'Office spaces',
  'office spaces': 'Office spaces',
  'retail shop': 'Retail spaces',
  'retail space': 'Retail spaces',
  studio: 'Studios',
  'studio flat': 'Studios',
  commercial: 'Commercial properties',
  'commercial property': 'Commercial properties',
};

const UNCOUNTABLE = new Set(['land', 'land parcel']);

/** Turn a canonical value like `studio_flat` into a display label. */
export function humanizeType(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/** Pluralise a singular type label using natural English rules. */
export function pluraliseType(raw: string): string {
  const label = (raw || '').trim();
  if (!label) return label;
  const lower = label.toLowerCase();
  if (IRREGULAR[lower]) return IRREGULAR[lower];
  if (UNCOUNTABLE.has(lower)) return label;
  if (/[^aeiou]y$/i.test(label)) return `${label.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(label)) return `${label}es`;
  if (/s$/i.test(label)) return label;
  return `${label}s`;
}

const NEAR_ME = /^near me$/i;

export function buildResultsHeading(input: ResultsHeadingInput): string {
  const { typeLabel, purpose, location, radiusLabel, fallback } = input;
  const hasType = !!typeLabel && typeLabel.trim() !== '' && typeLabel.trim() !== 'Show all';
  const type = hasType ? pluraliseType(typeLabel as string) : '';
  const txn = purpose ? (purpose === 'rent' ? 'for rent' : 'for sale') : '';
  const loc = location && !NEAR_ME.test(location.trim()) ? location.trim() : '';

  // Nothing to describe → the page's own default title.
  if (!hasType && !txn && !loc) return fallback;

  let heading = hasType ? type : 'Properties';
  if (txn) heading += ` ${txn}`;
  if (loc) heading += ` in ${loc}`;
  if (loc && radiusLabel && radiusLabel !== 'This area only') {
    heading += `, within ${radiusLabel}`;
  }
  return heading;
}