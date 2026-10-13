/**
 * crmSearch - the ONE shared search engine for every CRM area
 * (Listings / Leads / Deals / Contacts).
 *
 * It provides, in one place:
 *   1. Keyword tokenisation + a builder that turns several keywords into a
 *      single PostgREST filter (AND across keywords, OR across fields) so a
 *      keyword can never cancel another filter.
 *   2. Multi-location matching: `Location IN (Karen, Runda, Muthaiga)` is
 *      encoded as OR-within-location and AND-ed with every other criterion.
 *   3. A deterministic natural-language parser that turns a plain query like
 *      "furnished apartments in Karen, Runda and Muthaiga" into structured
 *      filters (property type, transaction, bedrooms, price, locations, and
 *      the leftover keywords).
 *
 * Nothing here re-queries a different dataset - it only builds filter strings
 * that the existing per-CRM queries apply. So every area searches its OWN
 * records while sharing the same matching rules and semantics.
 */

import { parsePropertySearch } from '@/lib/propertySearch';
import { allAreas } from '@/lib/locationRegistry';

/** Words that carry no search signal - dropped before keyword matching. */
const CRM_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'for', 'from',
  'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'the', 'to', 'we',
  'with', 'you', 'your', 'please', 'find', 'all', 'show', 'search', 'looking',
  'look', 'want', 'need', 'get', 'any', 'some', 'that', 'this', 'which', 'where',
]);

/** Strip characters that are structural in a PostgREST filter expression. */
// NOTE: dots, @, hyphens and spaces are all safe INSIDE a filter value (they
// only matter in the column/operator segment), so emails like name@site.com
// keep working. Only the true separators are removed.
function sanitizeValue(raw: string): string {
  return (raw || '')
    .replace(/[%(),\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Split free text into meaningful keyword tokens. Trims, lower-cases, drops
 * stopwords & structural characters, and removes single characters.
 */
export function tokenizeKeywords(raw: string): string[] {
  return (raw || '')
    .toLowerCase()
    .replace(/[.,;!?()"'`]/g, ' ')
    .split(/\s+/)
    .map((t) => sanitizeValue(t))
    .filter((t) => t.length > 1 && !CRM_STOPWORDS.has(t));
}

/**
 * Build a filter GROUP (no surrounding or()/and()) matching several keywords:
 * AND across keywords, OR across the supplied fields. So "furnished apartment"
 * requires BOTH words to appear somewhere, each can match ANY field.
 * Returns null when there are no usable terms/fields.
 */
function buildKeywordGroup(terms: string[], fields: string[]): string | null {
  const cleanTerms = (terms || []).map(sanitizeValue).filter(Boolean);
  const cleanFields = (fields || []).filter(Boolean);
  if (cleanTerms.length === 0 || cleanFields.length === 0) return null;

  const termGroups = cleanTerms.map((term) => {
    const conds = cleanFields.map((f) => `${f}.ilike.%${term}%`);
    return conds.length === 1 ? conds[0] : `or(${conds.join(',')})`;
  });

  return termGroups.length === 1 ? termGroups[0] : `and(${termGroups.join(',')})`;
}

/**
 * Build a filter GROUP matching ANY of the selected locations: a property in
 * Karen OR Runda OR Muthaiga matches. Each location is checked against every
 * location field (neighbourhood, location, address) so legacy records that
 * only carry a name still surface. Returns null when no locations selected.
 */
function buildLocationGroup(locations: string[], locationFields: string[]): string | null {
  const cleanLocations = (locations || []).map(sanitizeValue).filter(Boolean);
  const cleanFields = (locationFields || []).filter(Boolean);
  if (cleanLocations.length === 0 || cleanFields.length === 0) return null;

  const conds: string[] = [];
  for (const loc of cleanLocations) {
    for (const f of cleanFields) conds.push(`${f}.ilike.%${loc}%`);
  }
  return conds.length === 1 ? conds[0] : `or(${conds.join(',')})`;
}

export interface CrmFilterInput {
  /** Keyword tokens (already tokenised or raw words). */
  terms?: string[];
  /** DB columns a keyword may match. */
  fields?: string[];
  /** Selected locations - matched with OR. */
  locations?: string[];
  /** DB columns a location may match. */
  locationFields?: string[];
}

/**
 * Combine keyword + multi-location criteria into ONE PostgREST filter string
 * suitable for `.or(...)`. Keyword criteria and location criteria are AND-ed
 * together; multiple locations are OR-ed. Returns null when nothing applies,
 * so callers fall back to a plain browse query (never a broad unfiltered one).
 */
export function buildCrmFilterString(input: CrmFilterInput): string | null {
  const groups: string[] = [];
  const kw = buildKeywordGroup(input.terms || [], input.fields || []);
  if (kw) groups.push(kw);
  const loc = buildLocationGroup(input.locations || [], input.locationFields || []);
  if (loc) groups.push(loc);
  if (groups.length === 0) return null;
  if (groups.length === 1) return groups[0];
  return `and(${groups.join(',')})`;
}

/**
 * Standard keyword columns for property listings.
 *
 * `search_text` is a DB-maintained column that already concatenates the
 * title, description, amenities and features (lower-cased, trigram-indexed),
 * so a single keyword like "furnished" or "pool" matches those amenity /
 * feature values reliably - not just the title.
 */
export const LISTING_KEYWORD_FIELDS = [
  'search_text',
  'title',
  'description',
  'location',
  'neighbourhood',
  'address',
  'property_type',
  'sub_type',
  'status',
  'city',
  'owner_name',
  'slug',
];

/** Standard location columns for property listings. */
export const LISTING_LOCATION_FIELDS = ['neighbourhood', 'location', 'address'];

/** Standard keyword columns for leads. */
export const LEAD_KEYWORD_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'notes',
  'message',
  'client_type',
  'source',
  'status',
];

/**
 * Location-match columns for leads. Leads carry no dedicated neighbourhood
 * column, so a requested area (e.g. "Karen") is matched inside the enquiry
 * message / notes - which is where clients state the areas they want.
 */
export const LEAD_LOCATION_FIELDS = ['message', 'notes'];

/** Standard keyword columns for deals. */
export const DEAL_KEYWORD_FIELDS = ['title', 'notes', 'status'];

/** Standard keyword columns for contacts. */
export const CONTACT_KEYWORD_FIELDS = ['name', 'first_name', 'last_name', 'email', 'phone', 'company', 'type', 'role', 'source', 'location', 'notes'];

/**
 * Location-match columns for contacts. Contacts have no dedicated
 * neighbourhood relationship, so a requested area ("Karen") is matched across
 * the stored location, the company name and the notes — everywhere an area can
 * realistically appear on a client record.
 */
export const CONTACT_LOCATION_FIELDS = ['location', 'notes', 'company'];

/** Structured furnishing values on listings, split for exact matching. */
export const FURNISHED_VALUES = ['Furnished', 'Fully Furnished', 'Semi Furnished'];
export const UNFURNISHED_VALUES = ['Unfurnished'];

// ────────────────────────────────────────────────────────────────────────
// Natural-language interpretation (deterministic)
// ────────────────────────────────────────────────────────────────────────

export interface CrmParsedQuery {
  /** Leftover keyword tokens after recognised criteria are removed. */
  terms: string[];
  /** Every neighbourhood/area found in the query, in the order typed. */
  locations: string[];
  transaction?: 'sale' | 'rent';
  /** Canonical listings.property_type value, e.g. 'apartment'. */
  propertyType?: string;
  bedroomsMin?: number;
  priceMin?: number;
  priceMax?: number;
  furnished?: boolean;
}

/**
 * Extract EVERY known area / alias from a query (not just the first one), in
 * the order the user typed them, deduplicated by canonical area name.
 */
export function extractAllLocations(raw: string): string[] {
  const q = (raw || '').toLowerCase();
  if (!q) return [];
  const hits: { name: string; index: number }[] = [];
  const seen = new Set<string>();
  for (const area of allAreas()) {
    const phrases = [area.name, ...area.aliases];
    let idx = -1;
    for (const p of phrases) {
      const phrase = (p || '').toLowerCase();
      if (!phrase) continue;
      const m = new RegExp(`\\b${escapeRegExp(phrase)}\\b`).exec(q);
      if (m && (idx === -1 || m.index < idx)) idx = m.index;
    }
    const key = area.name.toLowerCase();
    if (idx !== -1 && !seen.has(key)) {
      seen.add(key);
      hits.push({ name: area.name, index: idx });
    }
  }
  return hits.sort((a, b) => a.index - b.index).map((h) => h.name);
}

/**
 * Turn a plain-language query into structured CRM filters. Deterministic -
 * no external service - so results are reproducible. Ambiguous input simply
 * yields fewer structured filters plus the leftover keywords, which the user
 * can review/correct in the visible filter chips before results apply.
 */
export function parseCrmQuery(raw: string): CrmParsedQuery {
  const text = (raw || '').trim();
  const parsed: CrmParsedQuery = { terms: [], locations: [] };
  if (!text) return parsed;

  const intent = parsePropertySearch(text);

  parsed.locations = extractAllLocations(text);
  parsed.transaction = intent.transaction;
  parsed.propertyType = intent.propertyType;
  parsed.bedroomsMin = intent.bedroomsMin;
  parsed.priceMin = intent.priceMin;
  parsed.priceMax = intent.priceMax;
  parsed.furnished = intent.furnished;

  // Leftover keywords: the parser's terms, minus anything that is really part
  // of a matched area name (e.g. "karen", "runda").
  const locWords = new Set<string>();
  for (const loc of parsed.locations) {
    loc.toLowerCase().split(/\s+/).forEach((w) => locWords.add(w));
  }
  const terms = intent.terms.filter((t) => !locWords.has(t));

  // Furnishing is a STRUCTURED listings field (furnished_status), so it is no
  // longer pushed in as a keyword here — the caller lifts `parsed.furnished`
  // into the exact Furnished / Unfurnished filter instead. This keeps "furnished"
  // from also matching "unfurnished" listings as free text.
  parsed.terms = Array.from(new Set(terms));
  return parsed;
}