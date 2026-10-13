/**
 * areaCentres - static "hub" coordinates for the known search areas.
 *
 * WHY THIS EXISTS
 * ---------------
 * Distance ("within X miles") search needs a coordinate for every listing.
 * The database only carries explicit latitude/longitude on a handful of
 * listings, so a radius search returned almost nothing. The agreed approach is
 * to fall back to the CENTRE of the listing's area - e.g. a home in Karen with
 * no coordinates is treated as sitting at the Karen hub. A search centred on
 * Karen (5-mile radius) then correctly includes Karen homes and excludes far
 * areas, without inventing a precise address.
 *
 * This is a coarse, static, well-known-hub model on purpose: it is honest about
 * being an approximation and never pretends to street-level precision.
 */

export interface AreaCentre {
  lat: number;
  lng: number;
}

/** Canonical area hubs, keyed by a normalised (lower-case) area name. */
const AREA_CENTRES: Record<string, AreaCentre> = {
  nairobi: { lat: -1.2921, lng: 36.8219 },
  karen: { lat: -1.3192, lng: 36.7073 },
  runda: { lat: -1.2184, lng: 36.8263 },
  lavington: { lat: -1.2766, lng: 36.7694 },
  kilimani: { lat: -1.2916, lng: 36.7869 },
  westlands: { lat: -1.2675, lng: 36.8042 },
  kileleshwa: { lat: -1.2855, lng: 36.783 },
  muthaiga: { lat: -1.2547, lng: 36.836 },
  parklands: { lat: -1.262, lng: 36.819 },
  riverside: { lat: -1.2694, lng: 36.802 },
  gigiri: { lat: -1.233, lng: 36.805 },
  'spring valley': { lat: -1.243, lng: 36.792 },
  nyari: { lat: -1.219, lng: 36.81 },
  loresho: { lat: -1.237, lng: 36.78 },
  kitisuru: { lat: -1.24, lng: 36.79 },
  'lower kabete': { lat: -1.238, lng: 36.775 },
  rosslyn: { lat: -1.208, lng: 36.8 },
  arboretum: { lat: -1.283, lng: 36.807 },
  'upper hill': { lat: -1.299, lng: 36.815 },
  'industrial area': { lat: -1.31, lng: 36.85 },
  'nairobi west': { lat: -1.315, lng: 36.83 },
  'south c': { lat: -1.32, lng: 36.83 },
  'south b': { lat: -1.31, lng: 36.84 },
  langata: { lat: -1.363, lng: 36.741 },
  embakasi: { lat: -1.32, lng: 36.89 },
  kasarani: { lat: -1.23, lng: 36.9 },
  ruaka: { lat: -1.21, lng: 36.78 },
  'enaki town': { lat: -1.212, lng: 36.84 },
  kiambu: { lat: -1.171, lng: 36.835 },
  thika: { lat: -1.033, lng: 37.09 },
  'ongata rongai': { lat: -1.4, lng: 36.757 },
  ngong: { lat: -1.36, lng: 36.654 },
  kitengela: { lat: -1.476, lng: 36.962 },
  'athi river': { lat: -1.458, lng: 36.978 },
  syokimau: { lat: -1.4, lng: 36.94 },
  kiserian: { lat: -1.43, lng: 36.674 },
  mombasa: { lat: -4.0435, lng: 39.6682 },
  nyali: { lat: -4.0333, lng: 39.7 },
  diani: { lat: -4.279, lng: 39.588 },
  kisumu: { lat: -0.0917, lng: 34.768 },
  'kisumu milimani': { lat: -0.09, lng: 34.755 },
  nakuru: { lat: -0.3031, lng: 36.08 },
  eldoret: { lat: 0.5143, lng: 35.2698 },
};

/** Known misspellings / variant labels → the canonical hub key above. */
const AREA_ALIASES: Record<string, string> = {
  'old kitisuru': 'kitisuru',
  'peponi westlands': 'westlands',
  'nairobi west': 'nairobi west',
  roysambu: 'kasarani',
  rongai: 'ongata rongai',
};

/** Normalise a free-text area label for lookup. */
function normaliseKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,;!?()"'\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Longest hub keys first so "nairobi west" is preferred over "nairobi".
const SORTED_KEYS = Object.keys(AREA_CENTRES).sort((a, b) => b.length - a.length);

/**
 * Live area centres loaded from the database (the admin "Neighbourhoods &
 * Geo-Mapping" section). Once registered they OVERRIDE the static fallbacks
 * above, so an administrator's edit to a centre/landmark is reflected in search
 * everywhere - no page keeps its own copy of the coordinates.
 */
let DB_CENTRES: Record<string, AreaCentre> = {};
let DB_ALIASES: Record<string, string> = {};
let DB_SORTED_KEYS: string[] = [];

/**
 * Register database-backed area centres (called once at app start by the
 * shared areaGeo loader). Entries without valid coordinates are ignored so a
 * half-configured area never overwrites a good static fallback.
 */
export function registerAreaCentres(
  entries: Array<{ name: string; lat: number | null; lng: number | null; aliases?: string[] | null }>,
): void {
  const centres: Record<string, AreaCentre> = {};
  const aliases: Record<string, string> = {};
  for (const e of entries) {
    if (!e || !e.name) continue;
    if (typeof e.lat !== 'number' || typeof e.lng !== 'number') continue;
    if (!Number.isFinite(e.lat) || !Number.isFinite(e.lng)) continue;
    const key = normaliseKey(e.name);
    if (!key) continue;
    centres[key] = { lat: e.lat, lng: e.lng };
    for (const a of e.aliases || []) {
      const ak = normaliseKey(a);
      if (ak && !centres[ak]) aliases[ak] = key;
    }
  }
  DB_CENTRES = centres;
  DB_ALIASES = aliases;
  DB_SORTED_KEYS = Object.keys(centres).sort((a, b) => b.length - a.length);
}

/** True once database centres have been registered (diagnostics / UI hints). */
export function hasRegisteredAreaCentres(): boolean {
  return DB_SORTED_KEYS.length > 0;
}

/**
 * Resolve the nearest known area hub from one or more location strings
 * (neighbourhood, area, city, region). Database-registered centres take
 * precedence over the static fallbacks. Returns null when nothing matches.
 */
export function areaCentreFor(...texts: Array<string | null | undefined>): AreaCentre | null {
  for (const raw of texts) {
    if (!raw) continue;
    const key = normaliseKey(String(raw));
    if (!key) continue;

    // 1) Database centres (admin-managed) win.
    if (DB_CENTRES[key]) return DB_CENTRES[key];
    const dbAlias = DB_ALIASES[key];
    if (dbAlias && DB_CENTRES[dbAlias]) return DB_CENTRES[dbAlias];

    // 2) Static fallbacks.
    if (AREA_CENTRES[key]) return AREA_CENTRES[key];
    const alias = AREA_ALIASES[key];
    if (alias && AREA_CENTRES[alias]) return AREA_CENTRES[alias];

    // 3) Contains-scan: DB keys first, then static keys.
    for (const hub of DB_SORTED_KEYS) {
      if (key.includes(hub)) return DB_CENTRES[hub];
    }
    for (const hub of SORTED_KEYS) {
      if (key.includes(hub)) return AREA_CENTRES[hub];
    }
  }
  return null;
}