import type { Development, DevelopmentUnit } from '@/hooks/useNewDevelopments';

/**
 * Helpers that turn a development's real unit records into the "product with
 * variants" presentation: unit-type groups (beds → price range + availability)
 * and a single honest headline for the listing cards.
 *
 * Everything here derives from real CRM/listing data only - nothing is invented.
 */

export interface UnitTypeGroup {
  beds: number;
  /** "Studio" | "1 Bed" | "3 Beds" */
  shortLabel: string;
  /** "Studio" | "1 Bedroom" | "3 Bedrooms" */
  longLabel: string;
  minPrice: number;
  maxPrice: number;
  currency: string;
  /** Smallest unit size recorded in this type (0 when unknown). */
  minSize: number;
  /** Largest unit size recorded in this type (0 when unknown). */
  maxSize: number;
  /** Size unit shared by this type (e.g. sqm / sqft). */
  sizeUnit: string;
  /** Units in this type that are still available. */
  available: number;
  /** Total units recorded in this type. */
  total: number;
  status: AvailabilityState;
}

export type AvailabilityState = 'available' | 'limited' | 'sold_out' | 'unknown';

/** "Studio" | "1 Bed" | "3 Beds" - compact, for chips. */
export function unitBedLabel(beds: number): string {
  if (beds <= 0) return 'Studio';
  return `${beds} Bed${beds > 1 ? 's' : ''}`;
}

/** "Studio" | "1 Bedroom" | "3 Bedrooms" - for the headline. */
export function unitBedLongLabel(beds: number): string {
  if (beds <= 0) return 'Studio';
  return `${beds} Bedroom${beds > 1 ? 's' : ''}`;
}

function isAvailable(status: string): boolean {
  const s = (status || '').trim().toLowerCase();
  return s === '' || s === 'available' || s === 'active';
}

function isSold(status: string): boolean {
  const s = (status || '').trim().toLowerCase();
  return s === 'sold' || s === 'under_contract' || s === 'reserved';
}

/**
 * Group a development's units into one row per bedroom count, carrying the
 * real price range and availability for that type.
 */
export function groupUnitTypes(units: DevelopmentUnit[]): UnitTypeGroup[] {
  const map = new Map<number, DevelopmentUnit[]>();
  for (const u of units) {
    const arr = map.get(u.bedrooms) || [];
    arr.push(u);
    map.set(u.bedrooms, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([beds, group]) => {
      const prices = group.map((u) => u.price).filter((p) => p > 0);
      const sizes = group.map((u) => u.size).filter((s) => s > 0);
      const total = group.length;
      const available = group.filter((u) => isAvailable(u.status)).length;
      const knownSold = group.filter((u) => isSold(u.status)).length;
      let status: AvailabilityState = 'unknown';
      if (total > 0) {
        if (available === 0 && knownSold === total) status = 'sold_out';
        else if (available === 0) status = 'sold_out';
        else if (available <= 3) status = 'limited';
        else status = 'available';
      }
      return {
        beds,
        shortLabel: unitBedLabel(beds),
        longLabel: unitBedLongLabel(beds),
        minPrice: prices.length ? Math.min(...prices) : 0,
        maxPrice: prices.length ? Math.max(...prices) : 0,
        currency: group[0]?.currency || 'KES',
        minSize: sizes.length ? Math.min(...sizes) : 0,
        maxSize: sizes.length ? Math.max(...sizes) : 0,
        sizeUnit: group[0]?.sizeUnit || 'sqm',
        available,
        total,
        status,
      };
    });
}

/** Availability badge label + palette for a unit type or project. */
export function availabilityBadge(state: AvailabilityState): { label: string; className: string } {
  switch (state) {
    case 'sold_out':
      return { label: 'Sold Out', className: 'bg-red-50 text-red-600 border-red-100' };
    case 'limited':
      return { label: 'Few Left', className: 'bg-amber-50 text-amber-700 border-amber-100' };
    case 'available':
      return { label: 'Available', className: 'bg-green-50 text-green-700 border-green-100' };
    default:
      return { label: 'Enquire', className: 'bg-stone-50 text-stone-600 border-stone-200' };
  }
}

/** True when the project offers more than one distinct unit type. */
export function hasMultipleUnitTypes(dev: Development): boolean {
  return groupUnitTypes(dev.units).length > 1;
}

/**
 * The single, honest headline for a listing card, e.g.
 *   "From 1 Bed · Multiple Units Available"
 *   "From 2 Bedrooms · 5 Units Available"
 *   "4 Bedroom Villas"
 * Uses only real unit data; falls back gracefully when units are missing.
 */
export function unitsHeadline(dev: Development): string {
  const groups = groupUnitTypes(dev.units);
  if (groups.length === 0) return '';

  const minBeds = groups[0].beds;
  const typeWord = singularType(dev.propertyType);
  const fromPhrase = minBeds <= 0 ? 'From Studio' : `From ${unitBedLongLabel(minBeds)}`;

  const availableTotal = dev.availableUnits > 0
    ? dev.availableUnits
    : dev.units.filter((u) => isAvailable(u.status)).length;

  if (groups.length > 1) {
    if (availableTotal > 0) {
      return `${fromPhrase} \u00b7 ${availableTotal} Unit${availableTotal > 1 ? 's' : ''} Available`;
    }
    return `${fromPhrase} \u00b7 Multiple Units Available`;
  }

  // Single unit type - describe the type itself.
  if (minBeds <= 0) return `Studio ${pluralType(dev.propertyType)}`;
  return `${unitBedLongLabel(minBeds)} ${pluralType(dev.propertyType)}`.trim() || `${unitBedLongLabel(minBeds)} ${typeWord}${typeWord.endsWith('s') ? '' : 's'}`;
}

/** Join a list of labels the human way: ["1","2","3"] -> "1, 2 & 3". */
function joinBedList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} & ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} & ${items[items.length - 1]}`;
}

/**
 * The project's bedroom range as one compact, human label - exactly the kind of
 * single badge a portal shows for a development, e.g.
 *   "1, 2 & 3 bedroom properties"
 *   "Studio & 1 bedroom apartments"
 *   "4 bedroom villas"
 * Derived from the real unit records only; '' when there are no units.
 */
export function unitTypeRangeLabel(dev: Development): string {
  const groups = groupUnitTypes(dev.units);
  if (groups.length === 0) return '';
  const noun = dev.propertyType ? pluralType(dev.propertyType).toLowerCase() : 'properties';
  const beds = groups.map((g) => g.beds);
  if (beds.every((b) => b <= 0)) return `Studio ${noun}`;
  const labels = beds.map((b) => (b <= 0 ? 'Studio' : String(b)));
  if (labels.length === 1) return `${labels[0]} bedroom ${noun}`;
  return `${joinBedList(labels)} bedroom ${noun}`;
}

function typeWord(pt: string): string {
  const s = (pt || '').trim().toLowerCase();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function singularType(pt: string): string {
  return typeWord(pt);
}

function pluralType(pt: string): string {
  const t = typeWord(pt);
  if (!t) return 'Units';
  if (t.toLowerCase() === 'apartment') return 'Apartments';
  if (t.toLowerCase() === 'villa') return 'Villas';
  if (t.toLowerCase() === 'townhouse') return 'Townhouses';
  if (t.toLowerCase() === 'maisonette') return 'Maisonettes';
  if (t.toLowerCase() === 'office') return 'Offices';
  return t.endsWith('s') ? t : `${t}s`;
}

/** Overall project availability state, for a card-level scarcity cue. */export function projectAvailability(dev: Development): AvailabilityState {
  if (dev.availableUnits > 0) {
    if (dev.availableUnits <= 4) return 'limited';
    return 'available';
  }
  const groups = groupUnitTypes(dev.units);
  if (groups.length === 0) return 'unknown';
  if (groups.every((g) => g.status === 'sold_out')) return 'sold_out';
  if (groups.some((g) => g.status === 'limited')) return 'limited';
  if (groups.some((g) => g.status === 'available')) return 'available';
  return 'unknown';
}

/** Lowest and highest unit price across the project (0 when unknown). */
export function priceBounds(dev: Development): { min: number; max: number; currency: string } {
  const prices = dev.units.map((u) => u.price).filter((p) => p > 0);
  const all = dev.lowestPrice > 0 ? [...prices, dev.lowestPrice] : prices;
  if (all.length === 0) {
    return { min: 0, max: 0, currency: dev.currency };
  }
  return {
    min: Math.min(...all),
    max: Math.max(...all),
    currency: dev.units[0]?.currency || dev.currency,
  };
}

/**
 * Per-unit-type availability label for the compact inventory chips. Uses the
 * real available count so "5 Available" / "2 Left" are always backed by actual
 * unit records rather than a vague status flag.
 */
export function unitTypeBadge(group: UnitTypeGroup): { label: string; className: string } {
  switch (group.status) {
    case 'sold_out':
      return { label: 'Sold out', className: 'text-red-600' };
    case 'limited':
      return {
        label:
          group.available === 1
            ? 'Last one at this price'
            : `Only ${group.available} left at this price`,
        className: 'text-red-600',
      };
    case 'available':
      return { label: `${group.available} available`, className: 'text-green-700' };
    default:
      return { label: 'Enquire', className: 'text-stone-500' };
  }
}

/** "studio units" | "one-bedroom units" | "3-bedroom units" */
function unitTypePhrase(beds: number): string {
  const words = ['studio units', 'one-bedroom units', 'two-bedroom units', 'three-bedroom units', 'four-bedroom units'];
  return words[beds] || `${beds}-bedroom units`;
}

/**
 * One honest, factual availability line derived ONLY from real inventory.
 * Returns null when there is nothing trustworthy to say - scarcity is never
 * invented. Examples:
 *   "Only 2 left in two-bedroom units" / "Only 3 units left" / "12 homes available"
 */
export function inventoryAlert(dev: Development): string | null {
  const groups = groupUnitTypes(dev.units);
  const fromGroups = groups.reduce((sum, g) => sum + g.available, 0);
  const total = dev.availableUnits > 0 ? dev.availableUnits : fromGroups;
  if (total <= 0) return null;

  // A single scarce unit type is the most useful signal when several exist.
  const scarce = groups.filter((g) => g.available > 0 && g.available <= 3);
  if (groups.length > 1 && scarce.length === 1) {
    const g = scarce[0];
    return `Only ${g.available} left in ${unitTypePhrase(g.beds)}`;
  }
  if (total <= 4) return `Only ${total} unit${total > 1 ? 's' : ''} left`;
  return `${total} home${total > 1 ? 's' : ''} available`;
}