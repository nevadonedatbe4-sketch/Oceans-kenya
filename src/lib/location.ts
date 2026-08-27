/**
 * smartTitleCase — normalise casing for property titles & locations.
 *
 * Only transforms strings that are predominantly UPPERCASE (typed in ALL
 * CAPS, or near-ALL CAPS like a caps title containing a stray lowercase
 * "2 DSQs"). Correctly-cased strings are returned untouched so we never
 * mangle good data. Minor words (for, in, of, etc.) are lowercased, except
 * when they are the first word.
 */
const MINOR_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into',
  'nor', 'of', 'on', 'onto', 'or', 'per', 'the', 'to', 'via', 'vs', 'with',
]);

// A string counts as "mostly uppercase" when >=70% of its letters are caps.
// This catches genuine ALL CAPS data while ignoring a stray lowercase
// character (e.g. "DSQs") that would otherwise defeat a naive check.
function isMostlyUpperCase(str: string): boolean {
  const letters: string[] = str.match(/[A-Za-z]/g) || [];
  if (letters.length === 0) return false;
  const upperCount = letters.filter((c) => c >= 'A' && c <= 'Z').length;
  return upperCount / letters.length >= 0.7;
}

export function smartTitleCase(input?: string | null): string {
  const str = (input || '').trim();
  if (!str) return '';
  // Leave correctly-cased text untouched; only normalise shouty ALL-CAPS data.
  if (!isMostlyUpperCase(str)) return str;

  const tokens = str.toLowerCase().split(/(\s+|-)/); // keep separators
  let wordIndex = 0;
  return tokens
    .map((token) => {
      if (/^\s+$/.test(token) || token === '-') return token;
      const isFirst = wordIndex === 0;
      wordIndex += 1;
      const lower = token.toLowerCase();
      if (!isFirst && MINOR_WORDS.has(lower)) return lower;
      return token.replace(/[a-z]/i, (c) => c.toUpperCase());
    })
    .join('');
}

/**
 * formatLocation — smart location hierarchy for Oceans property cards.
 *
 * Priority order (highest → fallback):
 *   1. address   (street address, e.g. "23 Luthuli Drive")
 *   2. neighbourhood  (e.g. "Bugolobi", "Westlands", "Kilimani")
 *   3. location  (free-text field, already set on older listings)
 *   4. city      (e.g. "Nairobi" — last resort only)
 *
 * Rules:
 * - Never show a bare city (Nairobi / Kampala) when more specific info exists.
 * - If address already contains the neighbourhood, don't duplicate it.
 * - Trim & normalise whitespace.
 */
export function formatLocation(params: {
  address?: string | null;
  neighbourhood?: string | null;
  location?: string | null;
  city?: string | null;
  state_region?: string | null;
}): string {
  const { address, neighbourhood, location, city, state_region } = params;

  const clean = (v?: string | null) => smartTitleCase((v || '').trim());

  const addr = clean(address);
  const nb = clean(neighbourhood);
  const loc = clean(location);
  const cty = clean(city);

  // Generic city-only values we want to suppress when better data exists
  const genericCities = ['nairobi', 'kampala', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'kenya', 'uganda'];

  const isGeneric = (val: string) => genericCities.includes(val.toLowerCase());

  // Case 1: address + neighbourhood (don't duplicate if address contains neighbourhood)
  if (addr && nb) {
    const addrLower = addr.toLowerCase();
    const nbLower = nb.toLowerCase();
    if (addrLower.includes(nbLower)) {
      return addr; // neighbourhood already embedded in address
    }
    return `${addr}, ${nb}`;
  }

  // Case 2: address alone
  if (addr) return addr;

  // Case 3: neighbourhood alone
  if (nb) return nb;

  // Case 4: location field — use unless it's just a generic city
  if (loc && !isGeneric(loc)) return loc;

  // Case 5: location field even if generic (at least show something)
  if (loc) return loc;

  // Case 6: city / state_region as last resort
  const st = clean(state_region);
  if (cty && st && cty.toLowerCase() !== st.toLowerCase()) return `${cty}, ${st}`;
  if (cty) return cty;
  if (st) return st;

  return 'Location on request';
}

export interface LocationParts {
  line1: string;
  line2: string;
}

/**
 * formatLocationParts — two-line location hierarchy for property cards.
 *
 * Line 1: full street address (fallback → neighbourhood / location / city)
 * Line 2: "Area, City, Country" on a single line
 *
 * Example:
 *   line1: "12A Kololo Hill Drive"
 *   line2: "Kololo, Kampala, Uganda"
 */
export function formatLocationParts(params: {
  address?: string | null;
  neighbourhood?: string | null;
  location?: string | null;
  city?: string | null;
  state_region?: string | null;
  country?: string | null;
}): LocationParts {
  const clean = (v?: string | null) => smartTitleCase((v || '').trim());

  const addr = clean(params.address);
  const nb = clean(params.neighbourhood);
  const loc = clean(params.location);
  const cty = clean(params.city);
  const st = clean(params.state_region);
  const country = clean(params.country);

  const area = nb || loc || '';

  // Line 1 — full street address; fall back to area / city / region / country
  let line1 = addr;
  if (!line1) line1 = area || cty || st || country;

  // Line 2 — "Area, City, Country" (drop the area if it duplicates line 1)
  const areaForLine2 = area && area.toLowerCase() !== line1.toLowerCase() ? area : '';
  const line2 = [areaForLine2, cty || st, country].filter(Boolean).join(', ');

  return { line1: line1 || 'Location on request', line2 };
}

/**
 * formatAreaName — returns the primary area / neighbourhood name for a listing.
 *
 * Used on property cards where we want a single, clean, consistent location
 * label (e.g. "Kilimani") rather than a full address hierarchy.
 *
 * Priority order:
 *   1. neighbourhood
 *   2. location (first segment before a comma)
 *   3. address (first segment before a comma)
 *   4. city
 */
export function formatAreaName(params: {
  address?: string | null;
  neighbourhood?: string | null;
  location?: string | null;
  city?: string | null;
}): string {
  const clean = (v?: string | null) => smartTitleCase((v || '').trim());

  const nb = clean(params.neighbourhood);
  if (nb) return nb;

  const loc = clean(params.location);
  if (loc) return loc.split(',')[0].trim() || loc;

  const addr = clean(params.address);
  if (addr) return addr.split(',')[0].trim() || addr;

  const cty = clean(params.city);
  if (cty) return cty;

  return 'Location on request';
}