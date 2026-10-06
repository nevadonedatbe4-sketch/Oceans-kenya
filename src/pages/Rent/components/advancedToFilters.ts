import type { ListingFilters } from '@/hooks/useListings';
import { PROPERTY_TYPE_TO_DB } from '@/pages/crm/components/ListingEdit/types';
import type { FilterState } from './AdvancedFilters';

// Maps the Advanced Filters panel (FilterState) onto the fields useListings
// actually applies. Without this, several controls were collected but never
// affected results (property types, baths, size, must-have features,
// furnishing). Keywords are handled separately (folded into the search term).
//
// Every field here is backed by a real control and real data. Exclusion is
// handled via -terms in the keywords box (splitKeywords).

const parseIntOrUndef = (v: string): number | undefined => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

// Must-have label -> one amenity GROUP (OR within the group). Values match the
// canonical amenities admins pick from in the listing editor, with synonyms so
// a near-miss still matches. Groups are AND-combined by useListings, which is
// the correct meaning of "must have".
// Synonyms reflect the amenity strings actually stored on listings (verified
// against live data), not just the canonical editor list, so a "must have"
// matches real records. Groups are OR-within / AND-across in useListings.
const MUST_HAVE_GROUPS: Record<string, string[]> = {
  'Garden': ['Mature Gardens', 'Garden / Yard', 'Garden'],
  'Parking/garage': ['Parking', 'Underground Parking', 'Visitor Parking'],
  'Balcony/terrace': ['Large Balcony', 'Balcony', 'Rooftop Terrace', 'Rooftop Access'],
  'Pets allowed': ['Pet Friendly'],
  'Bills included': ['Serviced'],
  'Swimming pool': ['Swimming Pool', 'Swimming pool'],
  'Gym': ['Gym'],
  'Power backup': ['Backup Power / Generator', 'Backup power', 'Solar Power'],
  'Wheelchair access': ['Wheelchair Accessible', 'Wheelchair Access'],
};

/**
 * Split a keywords string into positive include text and -excluded terms.
 * "sea view -studio -\"ground floor\"" -> { include: "sea view",
 *   exclude: ["studio", "ground floor"] }. Quoted phrases are honoured.
 */
export function splitKeywords(raw: string): { include: string; exclude: string[] } {
  const tokens = (raw || '').match(/-?"[^"]+"|-?\S+/g) || [];
  const include: string[] = [];
  const exclude: string[] = [];
  for (const tok of tokens) {
    const neg = tok.startsWith('-');
    const body = (neg ? tok.slice(1) : tok).replace(/^"|"$/g, '').trim();
    if (!body) continue;
    (neg ? exclude : include).push(body);
  }
  return { include: include.join(' '), exclude };
}

/**
 * Translate the advanced-filter panel state into the subset of ListingFilters
 * that useListings understands. Returns only the keys that are set, so callers
 * can spread it over their base filters without clobbering dropdown values.
 */
export function advancedToFilters(a: FilterState): Partial<ListingFilters> {
  const out: Partial<ListingFilters> = {};

  // Property types -> DB property_type values. 'Commercial' is a category, so
  // route it to propertyCategory instead of the type list.
  const typeLabels = a.propertyTypes || [];
  const dbTypes = typeLabels
    .filter((t) => t !== 'Commercial')
    .map((t) => PROPERTY_TYPE_TO_DB[t] || t.toLowerCase())
    .filter(Boolean);
  if (dbTypes.length > 0) out.propertyTypes = dbTypes;
  if (typeLabels.includes('Commercial')) out.propertyCategory = 'commercial';

  // Beds / baths / size / price ranges.
  const minBeds = parseIntOrUndef(a.minBeds);
  const maxBeds = parseIntOrUndef(a.maxBeds);
  if (minBeds !== undefined) out.bedsMin = minBeds;
  if (maxBeds !== undefined) out.bedsMax = maxBeds;

  const minBaths = parseIntOrUndef(a.minBaths);
  if (minBaths !== undefined) out.bathsMin = minBaths;

  const minSize = parseIntOrUndef(a.minSize);
  const maxSize = parseIntOrUndef(a.maxSize);
  if (minSize !== undefined) out.sqmMin = minSize;
  if (maxSize !== undefined) out.sqmMax = maxSize;

  const minPrice = parseIntOrUndef(a.minPrice);
  const maxPrice = parseIntOrUndef(a.maxPrice);
  if (minPrice !== undefined) out.priceMin = minPrice;
  if (maxPrice !== undefined) out.priceMax = maxPrice;

  // Must-have features + "Furnished" furnishing -> amenity groups.
  const groups: string[][] = [];
  for (const label of a.mustHaves || []) {
    const g = MUST_HAVE_GROUPS[label];
    if (g) groups.push(g);
  }
  if ((a.furnished || []).includes('Furnished')) groups.push(['Furnished']);
  if (groups.length > 0) out.amenitiesGroups = groups;

  // Excluded keywords: the -terms typed in the keywords box.
  const exclude = splitKeywords(a.keywords || '').exclude;
  if (exclude.length > 0) out.excludeTerms = exclude;

  return out;
}
