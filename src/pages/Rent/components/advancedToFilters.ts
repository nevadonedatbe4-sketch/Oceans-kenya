import type { ListingFilters } from '@/hooks/useListings';
import { PROPERTY_TYPE_TO_DB } from '@/pages/crm/components/ListingEdit/types';
import type { FilterState } from './AdvancedFilters';

// Maps the Advanced Filters panel (FilterState) onto the fields useListings
// actually applies. Without this, several controls were collected but never
// affected results (property types, baths, size, must-have features,
// furnishing). Keywords are handled separately (folded into the search term).
//
// Only fields backed by a real UI control and a real DB column/value are
// mapped. lettingType and the boolean toggles have no control in the current
// panel, and keywordsExclude has no column, so they are intentionally skipped.

const parseIntOrUndef = (v: string): number | undefined => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

// Must-have label -> one amenity GROUP (OR within the group). Values match the
// canonical amenities admins pick from in the listing editor, with synonyms so
// a near-miss still matches. Groups are AND-combined by useListings, which is
// the correct meaning of "must have".
const MUST_HAVE_GROUPS: Record<string, string[]> = {
  'Garden': ['Garden / Yard', 'Garden'],
  'Parking/garage': ['Parking'],
  'Balcony/terrace': ['Balcony', 'Rooftop Access'],
  'Pets allowed': ['Pet Friendly'],
  'Bills included': ['Serviced'],
  'Swimming pool': ['Swimming Pool'],
  'Gym': ['Gym'],
  'Power backup': ['Backup Power / Generator', 'Solar Power'],
};

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

  return out;
}
