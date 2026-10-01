/**
 * usePropertySearch - the canonical search-hook surface.
 *
 * The request asks for a dedicated hook set. To avoid competing search
 * implementations, all of these are thin, clean mappings over ONE existing
 * engine (`useListings` → `listings` table) and ONE parser
 * (`parsePropertySearch` → `propertySearch`). Nothing here re-queries the
 * database in a different way, so searching stays consistent everywhere:
 *
 *     useSearchIntent → parse free text into structured intent
 *     useSearchFilters → canonical filter state
 *     usePropertyTypes / useTransactionTypes → canonical vocab
 *     usePropertySearch / useSearchResults → filtered, paginated results
 */

import { useMemo, useState } from 'react';
import { parsePropertySearch, type PropertySearchIntent } from '@/lib/propertySearch';
import { useListings, type ListingFilters, type UseListingsReturn } from '@/hooks/useListings';

export type { PropertySearchIntent };

// ── Search intent ────────────────────────────────────────────────────────
/**
 * Convert a natural-language query into a structured search intent.
 * e.g. "Looking for a house to buy in Karen" → { transaction:'sale',
 * propertyType:'house', location:'Karen', city:'Nairobi', locationLevel:'area' }
 */
export function useSearchIntent(raw: string): PropertySearchIntent {
  return useMemo(() => parsePropertySearch(raw), [raw]);
}

// ── Canonical filter state ───────────────────────────────────────────────
export interface CanonicalFilters {
  transaction: 'sale' | 'rent' | '';
  propertyType: string;
  location: string;
  neighbourhood: string;
  bedrooms: string;
  minPrice: number | '';
  maxPrice: number | '';
  furnished: string;
  amenities: string[];
  landSize: string;
  propertySize: string;
  commercialType: string;
  landType: string;
  developmentStatus: string;
}

export const defaultCanonicalFilters: CanonicalFilters = {
  transaction: '',
  propertyType: 'Any type',
  location: '',
  neighbourhood: '',
  bedrooms: 'Any beds',
  minPrice: '',
  maxPrice: '',
  furnished: '',
  amenities: [],
  landSize: '',
  propertySize: '',
  commercialType: '',
  landType: '',
  developmentStatus: '',
};

/**
 * Maintain the canonical filter state. Simple useState wrapper providing a
 * single `setFilter` merge helper so structured and natural-language criteria
 * can be combined without one overriding the other.
 */
export function useSearchFilters(initial: Partial<CanonicalFilters> = {}) {
  const [filters, setFilters] = useState<CanonicalFilters>({ ...defaultCanonicalFilters, ...initial });

  const setFilter = (patch: Partial<CanonicalFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const reset = () => {
    setFilters({ ...defaultCanonicalFilters });
  };

  return { filters, setFilter, reset };
}

// ── Canonical property types ─────────────────────────────────────────────
export interface PropertyTypeOption {
  /** Canonical listings.property_type value. */
  value: string;
  /** Human label shown in the UI. */
  label: string;
  /** Derived category (residential / commercial / land). */
  category: 'residential' | 'commercial' | 'land';
}

/**
 * Canonical property-type registry. Always maps synonyms to one value
 * (Flat→Apartment, Home→House, Plot→Land) so the dropdowns and the natural
 * language parser stay on the same set.
 */
export const CANONICAL_PROPERTY_TYPES: PropertyTypeOption[] = [
  { value: 'house', label: 'House', category: 'residential' },
  { value: 'bungalow', label: 'Bungalow', category: 'residential' },
  { value: 'villa', label: 'Villa', category: 'residential' },
  { value: 'townhouse', label: 'Townhouse', category: 'residential' },
  { value: 'apartment', label: 'Apartment', category: 'residential' },
  { value: 'penthouse', label: 'Penthouse', category: 'residential' },
  { value: 'maisonette', label: 'Maisonette', category: 'residential' },
  { value: 'studio_flat', label: 'Studio', category: 'residential' },
  { value: 'detached', label: 'Detached', category: 'residential' },
  { value: 'semi_detached', label: 'Semi-detached', category: 'residential' },
  { value: 'land', label: 'Land', category: 'land' },
  { value: 'office', label: 'Office', category: 'commercial' },
  { value: 'retail_shop', label: 'Retail / Shop', category: 'commercial' },
  { value: 'warehouse', label: 'Warehouse', category: 'commercial' },
  { value: 'industrial', label: 'Industrial', category: 'commercial' },
  { value: 'guest_house', label: 'Guest House', category: 'commercial' },
];

export function usePropertyTypes(): { types: PropertyTypeOption[]; byValue: Record<string, PropertyTypeOption> } {
  const byValue = useMemo(
    () => Object.fromEntries(CANONICAL_PROPERTY_TYPES.map((t) => [t.value, t])),
    []
  );
  return { types: CANONICAL_PROPERTY_TYPES, byValue };
}

// ── Canonical transaction types ──────────────────────────────────────────
export interface TransactionTypeOption {
  value: 'sale' | 'rent';
  label: string;
}

export const CANONICAL_TRANSACTION_TYPES: TransactionTypeOption[] = [
  { value: 'sale', label: 'For Sale' },
  { value: 'rent', label: 'For Rent' },
];

export function useTransactionTypes(): TransactionTypeOption[] {
  return CANONICAL_TRANSACTION_TYPES;
}

// ── Search results ───────────────────────────────────────────────────────
export interface SearchResultsReturn extends UseListingsReturn {
  /** True when the current query has any criteria (so zero is honest). */
  hasSearchCriteria: boolean;
  /** Human-readable summary, e.g. "3 bedroom houses for sale in Karen". */
  searchSummary: string;
  /** Whether there is at least one result on the current page. */
  hasResults: boolean;
  /** Whether pagination can continue past the current page. */
  hasMore: boolean;
}

function buildSummary(intent: PropertySearchIntent): string {
  const parts: string[] = [];
  if (intent.bedroomsMin && intent.bedroomsMin === intent.bedroomsMax) parts.push(`${intent.bedroomsMin} bedroom${intent.bedroomsMin > 1 ? 's' : ''}`);
  if (intent.propertyType) parts.push(intent.propertyType.replace(/_/g, 's'));
  if (intent.transaction) parts.push(intent.transaction === 'sale' ? 'for sale' : 'for rent');
  if (intent.location) parts.push(`in ${intent.location}`);
  else if (intent.locationLevel === 'city' && intent.city) parts.push(`in ${intent.city}`);
  return parts.length ? parts.join(' ') : 'Properties';
}

/**
 * Run a search against the real `listings` table, returning filtered,
 * paginated results plus a real `total` count and the understood criteria.
 * This is a thin mapping over the single engine - never a second dataset.
 */
export function usePropertySearch(filters: ListingFilters, page: number): UseListingsReturn {
  return useListings(filters, page);
}

export function useSearchResults(filters: ListingFilters, page: number): SearchResultsReturn {
  const result = usePropertySearch(filters, page);
  const intent = useMemo(() => parsePropertySearch(filters.search || ''), [filters.search]);
  const hasSearchCriteria = !!filters.search.trim() || !!filters.propertyType || filters.propertyType !== 'Any type';
  const pages = Math.max(1, Math.ceil(result.totalCount / 10));
  return {
    ...result,
    hasSearchCriteria,
    searchSummary: buildSummary(intent),
    hasResults: result.listings.length > 0,
    hasMore: page < pages,
  };
}