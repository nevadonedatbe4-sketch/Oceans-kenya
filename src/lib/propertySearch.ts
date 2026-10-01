/**
 * propertySearch - canonical natural-language & structured search-intent parser.
 *
 * Turns free-form queries like "Looking for a house to buy in Karen" or
 * "2 bedroom apartment to rent in Kileleshwa" into a single canonical
 * PropertySearchIntent that every listing page feeds into the SAME database
 * query. This is the single source of truth for: transaction, property type,
 * location, bedrooms, price and furnishing.
 *
 * The parser never broadens a search: it only ever ADDS constraints, so a
 * query with criteria can never silently fall back to returning everything.
 */

import { resolveLocation, buildCityOrClause, allAreas, type NairobiArea } from '@/lib/locationRegistry';

// ── Canonical vocabulary (maps to real listings DB values) ──────────────
export type SearchTransaction = 'sale' | 'rent';

export interface PropertySearchIntent {
  /** Buy / sale or rent - derived from the query. */
  transaction?: SearchTransaction;
  /** Canonical listings.property_type value, e.g. 'house', 'apartment'. */
  propertyType?: string;
  /** Canonical listings.property_category value derived from the type when possible. */
  propertyCategory?: string;
  /** Specific area / neighbourhood the user is looking in (e.g. "Karen"). */
  location?: string;
  /** City parent - set for every resolved location (e.g. "Nairobi"). */
  city?: string;
  /**
   * 'area' when the user named a concrete neighbourhood (Karen),
   * 'city' when the user named the city itself (Nairobi → all Nairobi areas).
   */
  locationLevel?: 'area' | 'city';
  /** Minimum bedrooms, derived from "3 bedroom" / "3 bed". */
  bedroomsMin?: number;
  /** Maximum bedrooms (currently only set when explicit like "up to 4 beds"). */
  bedroomsMax?: number;
  /** Minimum price in KES, derived from "under 30 million" / "above 20M". */
  priceMin?: number;
  /** Maximum price in KES. */
  priceMax?: number;
  /** Whether the user asked for a furnished home. */
  furnished?: boolean;
  /** Remaining meaningful keywords (e.g. "luxury") kept for title matching. */
  terms: string[];
}

// ── Transaction synonyms ────────────────────────────────────────────────
const TRANSACTION_PHRASES: [string, SearchTransaction][] = [
  ['for sale', 'sale'],
  ['purchase property', 'sale'],
  ['on sale', 'sale'],
  ['to buy', 'sale'],
  ['to purchase', 'sale'],
  ['buying', 'sale'],
  ['purchase', 'sale'],
  ['buy', 'sale'],
  ['selling', 'sale'],
  ['sale', 'sale'],
  ['for rent', 'rent'],
  ['to rent', 'rent'],
  ['rental', 'rent'],
  ['renting', 'rent'],
  ['to let', 'rent'],
  ['let', 'rent'],
  ['letting', 'rent'],
  ['lease', 'rent'],
  ['rent', 'rent'],
];

// ── Property type synonyms (key = canonical listings.property_type) ─────
const PROPERTY_TYPE_SYNONYMS: Record<string, string[]> = {
  house: ['house', 'home', 'detached house', 'mansion', 'family home', 'family house', 'residence'],
  bungalow: ['bungalow'],
  villa: ['villa', 'villas'],
  townhouse: ['townhouse', 'town house', 'town home'],
  apartment: ['apartment', 'flat', 'appartment', 'apartments', 'flats', 'condo', 'serviced apartment', 'residential apartment', 'apartment building', 'apartment block'],
  penthouse: ['penthouse', 'pent house'],
  maisonette: ['maisonette', 'masionette', 'maisonette', 'maisonette home'],
  studio_flat: ['studio', 'studio flat', 'studio apartment', 'bedsitter', 'bed sitter', 'bedsit', 'single room'],
  detached: ['detached', 'detached house'],
  semi_detached: ['semi detatched', 'semi-detached', 'semi detached'],
  land: ['land', 'plot', 'acre', 'acres', 'acreage', 'parcel', 'piece of land', 'quarter acre', 'half acre', 'commercial plot', 'residential land', 'prime plot'],
  office: ['office', 'office space', 'serviced office', 'workspace', 'coworking office', 'office building', 'offices', 'bpo office'],
  retail_shop: ['retail', 'retail shop', 'shop', 'store', 'shopfront', 'commercial unit', 'shop space', 'retail space'],
  warehouse: ['warehouse', 'depot', 'godown', 'storage facility'],
  industrial: ['industrial', 'factory', 'plant', 'manufacturing', 'logistics'],
  guest_house: ['guest house', 'guesthouse', 'airbnb', 'short let', 'serviced apartment'],
};

// ── Property type → canonical category (keeps search consistent) ────────
const PROPERTY_CATEGORY_BY_TYPE: Record<string, string> = {
  land: 'land',
  office: 'commercial',
  retail_shop: 'commercial',
  warehouse: 'commercial',
  industrial: 'commercial',
  guest_house: 'commercial',
};

// ── Known Kenyan areas / neighbourhoods & sub-locations (matched in free text) ──
const KNOWN_AREAS: string[] = [
  // Core Nairobi enclaves
  'Karen', 'Runda', 'Lavington', 'Kilimani', 'Westlands', 'Kileleshwa',
  'Muthaiga', 'Parklands', 'Riverside', 'Gigiri', 'Highridge', 'Spring Valley',
  'Nyari', 'Langata', 'Kiserian', 'Ongata Rongai', 'Ngong', 'Kitengela',
  'Athi River', 'Syokimau', 'Roysambu', 'Ruiru', 'Kamakis', 'Juja', 'Rironi',
  'Kitisuru', 'Old Kitisuru', 'Loresho', 'Lower Kabete', 'Rosslyn', 'Enaki Town',
  'Arboretum', 'Upper Hill', 'Umoja', 'South B', 'South C', 'Embakasi', 'Pipeline',
  'Eastleigh', 'CBD', 'Kasarani', 'Kahawa', 'Thika', 'Naivasha', 'Nanyuki',
  // Coast
  'Mombasa', 'Nyali', 'Bamburi', 'Diani', 'Watamu', 'Malindi', 'Kilifi',
  'Mtwapa', 'Shanzu', 'Tudor', 'Nyali Beach',
  // Upcountry cities
  'Nakuru', 'Kisumu', 'Kisumu Milimani', 'Eldoret', 'Kampala', 'Kiambu',
  'Limuru', 'Kikuyu', 'Machakos', 'Bungoma', 'Nyeri', 'Meru', 'Kericho',
  'Naivasha', 'Nanyuki', 'Thika', 'Thika Road',
  // Sub-locations / villages within known areas
  'Milimani', 'Riat', 'Nairobi West', 'Donholm', 'Buruburu', 'Kawangware',
  'Ruaka', 'Kimironko', 'Ridgeside', 'Brookside', 'Kianda', 'Membley',
  'Utawala', 'Kamulu', 'Ruiru', 'Kahawa West', 'Kahawa Sukari',
  'Kapsabet', 'Eldama Ravine', 'Nyahera', 'Muhoroni',
  // Broad regions - only matched when a user explicitly names them
  'Nairobi', 'Naoirobi', 'Kiambu', 'Kisumu', 'Mombasa', 'Machakos',
];

// ── Stopwords (ignored for leftover keyword matching) ───────────────────
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'for', 'from',
  'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'please', 'to', 'the',
  'we', 'with', 'looking', 'look', 'want', 'wants', 'need', 'needs', 'am',
  'can', 'could', 'you', 'your', 'there', 'that', 'this', 'some', 'any',
  'properties', 'property', 'home', 'homes', 'houses', 'have', 'has', 'find',
  'search', 'including', 'near', 'around', 'within', 'inside', 'living', 'live',
  'just', 'nice', 'good', 'great', 'show', 'get', 'which', 'where', 'what',
  'buy', 'sale', 'rent', 'beds', 'bedrooms', 'bedroom', 'bed',
  'affordable', 'budget', 'cheap', 'inexpensive', 'expensive', 'luxury',
  'luxurious', 'premium', 'nice', 'lovely', 'beautiful', 'modern',
  'spacious', 'big', 'huge', 'small', 'compact', 'cozy', 'new', 'recent',
]);

// ── Bedroom detection ───────────────────────────────────────────────────
const BED_PATTERN = [
  /\b(\d+)\s*(?:bedroom|bedrooms|bed|beds|br)\b/,
  /\b(one|two|three|four|five|six|seven)\s*(?:bedroom|bedrooms|bed|beds|br)\b/,
];
const BED_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
};

// ── Price detection (KES) ───────────────────────────────────────────────
const PRICE_PATTERNS: { re: RegExp; kind: 'under' | 'over' | 'between' | 'max' | 'min' }[] = [
  { re: /\b(?:below|under|less than|up to|max(?:imum)?)\s*(\d+(?:\.\d+)?)\s*(million|m|k)\b/i, kind: 'under' },
  { re: /\b(?:above|over|more than|min(?:imum)?|from)\s*(\d+(?:\.\d+)?)\s*(million|m|k)\b/i, kind: 'over' },
  { re: /\b(\d+(?:\.\d+)?)\s*(?:million|m|k)\s*(?:to|and|-|-)\s*(\d+(?:\.\d+)?)\s*(?:million|m|k)\b/i, kind: 'between' },
  { re: /\b(\d+(?:\.\d+)?)\s*(?:million|m|k)\b/i, kind: 'max' },
];

function priceToKes(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u === 'million' || u === 'm') return Math.round(value * 1_000_000);
  if (u === 'k') return Math.round(value * 1_000);
  return Math.round(value);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse a natural-language or structured query into a canonical intent.
 * Returns an empty intent (with no criteria) only when the query is blank -
 * never broadens an existing search.
 */
export function parsePropertySearch(raw: string): PropertySearchIntent {
  const q = (raw || '').toLowerCase().replace(/[.,;!?()"']/g, ' ').replace(/\s+/g, ' ').trim();
  const intent: PropertySearchIntent = { terms: [] };
  if (!q) return intent;

  // 1) Transaction (match longest phrase first)
  for (const [phrase, txn] of TRANSACTION_PHRASES) {
    if (q.includes(phrase)) {
      intent.transaction = txn;
      break;
    }
  }

  // 2) Property type - prefer longer synonym so "detached house" wins over "house"
  let matchedType: string | null = null;
  let matchedTypePhrase = '';
  let bestLen = 0;
  for (const [canonical, synonyms] of Object.entries(PROPERTY_TYPE_SYNONYMS)) {
    for (const syn of synonyms) {
      if (q.includes(syn) && syn.length > bestLen) {
        matchedType = canonical;
        matchedTypePhrase = syn;
        bestLen = syn.length;
      }
    }
  }
  if (matchedType) {
    intent.propertyType = matchedType;
    intent.propertyCategory = PROPERTY_CATEGORY_BY_TYPE[matchedType];
  }

  // 3) Location - rely on the canonical registry (alias-aware). This is the
  //    single source of truth so "Karen", "Karen Nairobi" and "Karen area" all
  //    resolve to the same area. "Nairobi" resolves to the CITY parent, meaning
  //    ALL Nairobi areas - never a literal "Nairobi County" field.
  const resolved = resolveLocation(q);
  if (resolved) {
    if (resolved.area) {
      intent.location = resolved.name;
      intent.city = resolved.city;
      intent.locationLevel = 'area';
    } else {
      intent.city = resolved.city;
      intent.locationLevel = 'city';
    }
  } else {
    // Fallback: scan known areas (longest first) for anything not in the registry.
    const sortedAreas = [...KNOWN_AREAS].sort((a, b) => b.length - a.length);
    for (const area of sortedAreas) {
      if (q.includes(area.toLowerCase()) || q.includes(area.toUpperCase().toLowerCase())) {
        intent.location = area;
        intent.city = 'Nairobi';
        intent.locationLevel = 'area';
        break;
      }
    }
  }

  // 4) Bedrooms
  for (const re of BED_PATTERN) {
    const m = q.match(re);
    if (m) {
      const numText = m[1];
      const num = /^\d+$/.test(numText) ? parseInt(numText, 10) : BED_WORDS[numText];
      if (num && num > 0) {
        intent.bedroomsMin = num;
        intent.bedroomsMax = num;
      }
      break;
    }
  }

  // 5) Price
  for (const pat of PRICE_PATTERNS) {
    const m = q.match(pat.re);
    if (m) {
      if (pat.kind === 'between' && m[1] && m[2] && m[3]) {
        intent.priceMin = priceToKes(parseFloat(m[1]), m[3]);
        intent.priceMax = priceToKes(parseFloat(m[2]), m[3]);
      } else if (pat.kind === 'under' && m[1] && m[2]) {
        intent.priceMax = priceToKes(parseFloat(m[1]), m[2]);
      } else if (pat.kind === 'over' && m[1] && m[2]) {
        intent.priceMin = priceToKes(parseFloat(m[1]), m[2]);
      } else if (pat.kind === 'max' && m[1] && m[2]) {
        intent.priceMax = priceToKes(parseFloat(m[1]), m[2]);
      }
      break;
    }
  }

  // 6) Furnished
  if (/\bfurnished\b/.test(q)) {
    intent.furnished = true;
  }

  // 7) Leftover meaningful terms (constrain further - never broaden)
  let rest = q;
  if (matchedTypePhrase) rest = rest.replace(new RegExp(`\\b${escapeRegExp(matchedTypePhrase)}\\b`, 'g'), ' ');
  if (intent.location) rest = rest.replace(new RegExp(`\\b${escapeRegExp(intent.location.toLowerCase())}\\b`, 'g'), ' ').replace(new RegExp(`\\b${escapeRegExp(intent.location)}\\b`, 'gi'), ' ');
  // remove matched price phrase
  for (const pat of PRICE_PATTERNS) {
    rest = rest.replace(pat.re, ' ');
  }
  // remove bedroom phrase
  for (const re of BED_PATTERN) {
    rest = rest.replace(re, ' ');
  }
  rest = rest.replace(/\bfurnished\b/g, ' ');
  // remove transaction words
  for (const [phrase] of TRANSACTION_PHRASES) {
    rest = rest.replace(new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'g'), ' ');
  }

  const terms = rest
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));

  intent.terms = terms;

  return intent;
}

/**
 * Human-readable summary of what the parser understood - used to render
 * active search chips (e.g. "For sale", "House", "Karen", "3 bedrooms").
 * Each chip carries a `key` so it can be removed on its own without
 * resetting the whole search.
 */
export interface IntentChip {
  key: 'transaction' | 'propertyType' | 'location' | 'bedrooms' | 'price' | 'furnished';
  label: string;
}

export function intentToChips(intent: PropertySearchIntent): IntentChip[] {
  const chips: IntentChip[] = [];
  if (intent.transaction) {
    chips.push({ key: 'transaction', label: intent.transaction === 'sale' ? 'For sale' : 'For rent' });
  }
  if (intent.propertyType) {
    chips.push({ key: 'propertyType', label: intent.propertyType.replace(/_/g, ' ') });
  }
  if (intent.location) {
    chips.push({ key: 'location', label: intent.location });
  } else if (intent.locationLevel === 'city' && intent.city) {
    chips.push({ key: 'location', label: intent.city });
  }
  if (intent.bedroomsMin && intent.bedroomsMax && intent.bedroomsMin === intent.bedroomsMax) {
    chips.push({ key: 'bedrooms', label: `${intent.bedroomsMin} bedroom${intent.bedroomsMin > 1 ? 's' : ''}` });
  } else if (intent.bedroomsMin) {
    chips.push({ key: 'bedrooms', label: `${intent.bedroomsMin}+ bedrooms` });
  }
  if (intent.priceMin && intent.priceMax) {
    chips.push({ key: 'price', label: `KES ${intent.priceMin.toLocaleString()} - ${intent.priceMax.toLocaleString()}` });
  } else if (intent.priceMax) {
    chips.push({ key: 'price', label: `Under KES ${intent.priceMax.toLocaleString()}` });
  } else if (intent.priceMin) {
    chips.push({ key: 'price', label: `Over KES ${intent.priceMin.toLocaleString()}` });
  }
  if (intent.furnished) chips.push({ key: 'furnished', label: 'Furnished' });
  return chips;
}

/**
 * Return the raw query with a single understood concept removed, so a chip
 * can be dismissed without resetting the entire search.
 */
export function withoutIntent(raw: string, key: IntentChip['key']): string {
  let q = (raw || '').toLowerCase().replace(/[.,;!?()"']/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) return q;
  const esc = (s: string) => escapeRegExp(s);

  if (key === 'transaction') {
    for (const [phrase] of TRANSACTION_PHRASES) {
      q = q.replace(new RegExp(`\\b${esc(phrase)}\\b`, 'g'), ' ');
    }
  } else if (key === 'propertyType') {
    for (const synonyms of Object.values(PROPERTY_TYPE_SYNONYMS)) {
      for (const syn of synonyms) {
        q = q.replace(new RegExp(`\\b${esc(syn)}\\b`, 'gi'), ' ');
      }
    }
  } else if (key === 'location') {
    for (const area of KNOWN_AREAS) {
      q = q.replace(new RegExp(`\\b${esc(area)}\\b`, 'gi'), ' ');
    }
    // Also strip aliases + city parents so a city chip can be removed cleanly.
    for (const word of ['Nairobi', 'Naoirobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Spring Valley']) {
      q = q.replace(new RegExp(`\\b${esc(word)}\\b`, 'gi'), ' ');
    }
  } else if (key === 'bedrooms') {
    for (const re of BED_PATTERN) q = q.replace(re, ' ');
  } else if (key === 'price') {
    for (const pat of PRICE_PATTERNS) q = q.replace(pat.re, ' ');
  } else if (key === 'furnished') {
    q = q.replace(/\bfurnished\b/g, ' ');
  }

  return q.replace(/\s+/g, ' ').trim();
}

/**
 * Build a PostgREST `.or()` filter string for the understood location + leftover
 * terms. Shared by the listing engine and the homepage so a query produces the
 * SAME location matching everywhere. Returns null when there is nothing to match.
 */
export function buildIntentOr(intent: PropertySearchIntent): string | null {
  const conds: string[] = [];

  // City-level search ("Nairobi") → all Nairobi areas, never a literal field.
  if (intent.locationLevel === 'city' && intent.city) {
    const cityClause = buildCityOrClause(intent.city);
    if (cityClause) conds.push(cityClause);
  }

  // Specific area search ("Karen") → only that area, never broadened to the city.
  if (intent.locationLevel === 'area' && intent.location) {
    const loc = intent.location;
    conds.push(
      `neighbourhood.ilike.%${loc}%`,
      `location.ilike.%${loc}%`,
      `address.ilike.%${loc}%`,
    );
  }

  for (const term of intent.terms) {
    conds.push(
      `title.ilike.%${term}%`,
      `location.ilike.%${term}%`,
      `neighbourhood.ilike.%${term}%`,
    );
  }
  return conds.length > 0 ? conds.join(',') : null;
}

/**
 * Apply a parsed intent to a PostgREST query builder as structured filters.
 * Never broadens a search - only ever ADDS constraints. Returns the (possibly
 * reassigned) query builder so callers can chain further filters.
 */
export function applyIntentToQuery(query: any, intent: PropertySearchIntent): any {
  const orClause = buildIntentOr(intent);
  if (orClause) query = query.or(orClause);
  if (intent.propertyType) query = query.eq('property_type', intent.propertyType);
  if (intent.propertyCategory) query = query.eq('property_category', intent.propertyCategory);
  if (intent.bedroomsMin !== undefined && intent.bedroomsMin > 0) query = query.gte('bedrooms', intent.bedroomsMin);
  if (intent.bedroomsMax !== undefined && intent.bedroomsMax > 0) query = query.lte('bedrooms', intent.bedroomsMax);
  if (intent.priceMin !== undefined && intent.priceMin > 0) query = query.gte('price', intent.priceMin);
  if (intent.priceMax !== undefined && intent.priceMax > 0) query = query.lte('price', intent.priceMax);
  return query;
}

// ────────────────────────────────────────────────────────────────────────
// ── COMPOUND / MULTI-CLAUSE SEARCH ───────────────────────────────────
// ────────────────────────────────────────────────────────────────────────
// A single natural-language query can contain MULTIPLE independent clauses,
// e.g. "house to buy in Karen, Runda or Lavington or a villa in Gigiri or a
// town house in Muthaiga or office space to rent in Uphill". Each clause has
// its own transaction / property type / location, and is OR-ed together. This
// layer splits that into a SearchClause[] AND builds a single PostgREST or()
// that encodes the whole compound query at the database level.

export interface SearchClause {
  transaction?: SearchTransaction;
  /** Canonical listings.property_type values for this clause (OR-ed). */
  propertyTypes: string[];
  /** Resolved area / neighbourhood names for this clause (OR-ed). */
  locations: string[];
  /** 'area' when named neighbourhoods, 'city' when the user named the city itself. */
  locationLevel?: 'area' | 'city';
  /** City parent when the user named the city (Nairobi → all Nairobi areas). */
  city?: string;
  bedroomsMin?: number;
  bedroomsMax?: number;
  priceMin?: number;
  priceMax?: number;
  furnished?: boolean;
  /** Leftover meaningful keywords kept for title/location matching. */
  terms: string[];
}

/** Normalise a raw query for clause-level parsing. */
function normalizeQuery(raw: string): string {
  return (raw || '').toLowerCase().replace(/[.,;!?()"]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Find the earliest transaction phrase in a string (whole-query default). */
function findTransaction(q: string): SearchTransaction | null {
  let found: SearchTransaction | null = null;
  let best = Infinity;
  for (const [phrase, txn] of TRANSACTION_PHRASES) {
    const idx = q.indexOf(phrase);
    if (idx !== -1 && idx < best) {
      best = idx;
      found = txn;
    }
  }
  return found;
}

/** City-parent detection (Nairobi → all Nairobi areas). */
const CITY_NAMES: { re: RegExp; name: string }[] = [
  { re: /\.?\bnairobi\b|\.?\bnaoirobi\b/, name: 'Nairobi' },
  { re: /\bmombasa\b/, name: 'Mombasa' },
  { re: /\bkisumu\b/, name: 'Kisumu' },
  { re: /\bnakuru\b/, name: 'Nakuru' },
  { re: /\beldoret\b/, name: 'Eldoret' },
];

function detectCity(chunk: string): string | null {
  for (const c of CITY_NAMES) {
    if (c.re.test(chunk)) return c.name;
  }
  return null;
}

/**
 * Extract every known area / neighbourhood / alias occurrence in a clause.
 * Returns resolved canonical area names, plus a city parent when the clause
 * named a city instead of a specific area.
 */
function extractLocations(chunk: string): { locations: string[]; level: 'area' | 'city'; city?: string } {
  const cands: { area: NairobiArea; alias: string; index: number }[] = [];
  for (const area of allAreas()) {
    pushMatch(area, area.name.toLowerCase());
    for (const alias of area.aliases) pushMatch(area, alias.toLowerCase());
  }
  function pushMatch(area: NairobiArea, alias: string) {
    const idx = chunk.indexOf(alias);
    if (idx !== -1) cands.push({ area, alias, index: idx });
  }
  // Longest alias first so "Old Kitisuru" wins over a shorter coincidental match,
  // then sort the surviving areas by their position in the query (so the result
  // reads in the order the user typed: Karen, Runda, Lavington).
  cands.sort((a, b) => b.alias.length - a.alias.length);
  const byName = new Map<string, { name: string; index: number }>();
  for (const cd of cands) {
    if (!byName.has(cd.area.name)) {
      byName.set(cd.area.name, { name: cd.area.name, index: cd.index });
    }
  }
  const names = [...byName.values()].sort((a, b) => a.index - b.index).map((v) => v.name);
  if (names.length > 0) {
    return { locations: names, level: 'area' };
  }
  const city = detectCity(chunk);
  if (city) {
    return { locations: [], level: 'city', city };
  }
  // Fallback: legacy known-area scan (also in query order).
  const sortedAreas = [...KNOWN_AREAS].sort((a, b) => chunk.indexOf(b.toLowerCase()) - chunk.indexOf(a.toLowerCase()));
  for (const area of sortedAreas) {
    const idx = chunk.indexOf(area.toLowerCase());
    if (idx !== -1) {
      return { locations: [area], level: 'area' };
    }
  }
  return { locations: [], level: 'area' };
}

/** Parse ONE clause chunk using the existing single-clause helpers. */
function parseClauseChunk(chunk: string, defaultTxn: SearchTransaction | null, typesInClause: string[]): SearchClause {
  const clause: SearchClause = { propertyTypes: typesInClause.slice(), locations: [], terms: [] };
  clause.transaction = findTransaction(chunk) || defaultTxn || undefined;

  const loc = extractLocations(chunk);
  clause.locations = loc.locations;
  clause.locationLevel = loc.level;
  clause.city = loc.city;

  // Bedrooms
  for (const re of BED_PATTERN) {
    const m = chunk.match(re);
    if (m) {
      const numText = m[1];
      const num = /^\d+$/.test(numText) ? parseInt(numText, 10) : BED_WORDS[numText];
      if (num && num > 0) {
        clause.bedroomsMin = num;
        clause.bedroomsMax = num;
      }
      break;
    }
  }
  // Price
  for (const pat of PRICE_PATTERNS) {
    const m = chunk.match(pat.re);
    if (m) {
      if (pat.kind === 'between' && m[1] && m[2] && m[3]) {
        clause.priceMin = priceToKes(parseFloat(m[1]), m[3]);
        clause.priceMax = priceToKes(parseFloat(m[2]), m[3]);
      } else if (pat.kind === 'under' && m[1] && m[2]) {
        clause.priceMax = priceToKes(parseFloat(m[1]), m[2]);
      } else if (pat.kind === 'over' && m[1] && m[2]) {
        clause.priceMin = priceToKes(parseFloat(m[1]), m[2]);
      } else if (pat.kind === 'max' && m[1] && m[2]) {
        clause.priceMax = priceToKes(parseFloat(m[1]), m[2]);
      }
      break;
    }
  }
  if (/\bfurnished\b/.test(chunk)) clause.furnished = true;

  // Leftover keywords.
  let rest = chunk;
  for (const [canonical, synonyms] of Object.entries(PROPERTY_TYPE_SYNONYMS)) {
    if (typesInClause.includes(canonical)) {
      for (const syn of synonyms) rest = rest.replace(new RegExp(`\\b${escapeRegExp(syn)}\\b`, 'g'), ' ');
    }
  }
  for (const name of clause.locations) {
    rest = rest.replace(new RegExp(`\\b${escapeRegExp(name.toLowerCase())}\\b`, 'gi'), ' ');
  }
  if (clause.city) rest = rest.replace(new RegExp(`\\b${escapeRegExp(clause.city.toLowerCase())}\\b`, 'gi'), ' ');
  for (const pat of PRICE_PATTERNS) rest = rest.replace(pat.re, ' ');
  for (const re of BED_PATTERN) rest = rest.replace(re, ' ');
  rest = rest.replace(/\bfurnished\b/g, ' ');
  for (const [phrase] of TRANSACTION_PHRASES) rest = rest.replace(new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'g'), ' ');
  clause.terms = rest.split(/\s+/).map((t) => t.trim()).filter((t) => t.length > 1 && !STOPWORDS.has(t));

  return clause;
}

/** True when a clause carries at least one real search constraint. */
function clauseHasCriteria(c: SearchClause): boolean {
  return !!c.transaction || c.propertyTypes.length > 0 || c.locations.length > 0 || !!c.city ||
    !!c.bedroomsMin || !!c.priceMin || !!c.priceMax || c.terms.length > 0;
}

/** All property-type occurrence spans in a query, longest match wins. */
function findTypeSpans(q: string): { index: number; canonical: string }[] {
  const matches: { start: number; end: number; canonical: string }[] = [];
  for (const [canonical, synonyms] of Object.entries(PROPERTY_TYPE_SYNONYMS)) {
    for (const syn of synonyms) {
      const lower = syn.toLowerCase();
      let idx = q.indexOf(lower);
      while (idx !== -1) {
        matches.push({ start: idx, end: idx + lower.length, canonical });
        idx = q.indexOf(lower, idx + 1);
      }
    }
  }
  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: { start: number; end: number; canonical: string }[] = [];
  for (const m of matches) {
    const contained = kept.some((k) => m.start >= k.start && m.end <= k.end);
    if (!contained) kept.push(m);
  }
  return kept.map((m) => ({ index: m.start, canonical: m.canonical }));
}

/**
 * Split a natural-language query into one or more OR-ed search clauses.
 * A simple query ("house for sale in Karen") returns a single clause; a
 * compound query ("house to buy in Karen, Runda or Lavington or a villa in
 * Gigiri...") returns multiple clauses, each with its own constraints.
 */
export function parseSearchClauses(raw: string): SearchClause[] {
  const q = normalizeQuery(raw);
  if (!q) return [];
  const defaultTxn = findTransaction(q);
  const typeSpans = findTypeSpans(q);

  if (typeSpans.length === 0) {
    const single = parseClauseChunk(q, defaultTxn, []);
    return clauseHasCriteria(single) ? [single] : [];
  }

  const clauses: SearchClause[] = [];
  for (let i = 0; i < typeSpans.length; i++) {
    const start = typeSpans[i].index;
    const end = i + 1 < typeSpans.length ? typeSpans[i + 1].index : q.length;
    const chunk = q.slice(start, end);
    const clause = parseClauseChunk(chunk, defaultTxn, [typeSpans[i].canonical]);
    if (clauseHasCriteria(clause)) clauses.push(clause);
  }
  return clauses;
}

/**
 * Build a single PostgREST `.or()` filter string that ORs every clause.
 * AND = within a clause; OR = between clauses. Returns null when there are
 * no clauses, so callers can fall through to a plain browse query (never a
 * broad fallback that ignores criteria).
 */
export function buildClausesOr(clauses: SearchClause[]): string | null {
  if (!clauses || clauses.length === 0) return null;
  const groups: string[] = [];
  for (const c of clauses) {
    const conds: string[] = [];
    if (c.transaction) conds.push(`purpose.eq.${c.transaction}`);
    if (c.propertyTypes.length === 1) {
      conds.push(`property_type.eq.${c.propertyTypes[0]}`);
    } else if (c.propertyTypes.length > 1) {
      conds.push(`or(${c.propertyTypes.map((t) => `property_type.eq.${t}`).join(',')})`);
    }
    if (c.locationLevel === 'city' && c.city) {
      const cc = buildCityOrClause(c.city);
      if (cc) conds.push(`or(${cc})`);
    } else if (c.locations.length > 0) {
      const locs: string[] = [];
      for (const L of c.locations) {
        locs.push(`neighbourhood.ilike.%${L}%`, `location.ilike.%${L}%`, `address.ilike.%${L}%`);
      }
      conds.push(`or(${locs.join(',')})`);
    }
    if (c.bedroomsMin && c.bedroomsMin > 0) conds.push(`bedrooms.gte.${c.bedroomsMin}`);
    if (c.bedroomsMax && c.bedroomsMax > 0) conds.push(`bedrooms.lte.${c.bedroomsMax}`);
    if (c.priceMin && c.priceMin > 0) conds.push(`price.gte.${c.priceMin}`);
    if (c.priceMax && c.priceMax > 0) conds.push(`price.lte.${c.priceMax}`);
    for (const term of c.terms) {
      conds.push(`or(title.ilike.%${term}%,location.ilike.%${term}%,neighbourhood.ilike.%${term}%)`);
    }
    if (conds.length === 1) {
      groups.push(conds[0]);
    } else {
      groups.push(`and(${conds.join(',')})`);
    }
  }
  return groups.join(',');
}

/** Human-readable summary of a clause, e.g. "House for sale in Karen". */
export function clauseSummary(c: SearchClause): string {
  const parts: string[] = [];
  const type = c.propertyTypes.length ? c.propertyTypes[0].replace(/_/g, ' ') : null;
  if (type) parts.push(type.charAt(0).toUpperCase() + type.slice(1));
  if (c.transaction) parts.push(c.transaction === 'sale' ? 'for sale' : 'for rent');
  if (c.locations.length) parts.push(`in ${c.locations.join(' / ')}`);
  else if (c.locationLevel === 'city' && c.city) parts.push(`in ${c.city}`);
  return parts.length ? parts.join(' ') : 'Any property';
}