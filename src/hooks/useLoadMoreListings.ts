import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useListings, type ListingFilters, type MappedListing } from '@/hooks/useListings';

export interface UseLoadMoreListingsReturn {
  /** Every listing loaded so far (page 1 + each revealed batch), de-duplicated. */
  items: MappedListing[];
  /** Authoritative total for the active query (drives the Load More button). */
  totalCount: number;
  /** True while the FIRST batch is still loading (show the initial placeholder). */
  loading: boolean;
  /** True while a subsequent batch is loading (keep the grid, just spin the button). */
  loadingMore: boolean;
  error: string | null;
  /** True while there are still items beyond the ones already shown. */
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

/**
 * useLoadMoreListings - accumulates listing pages behind a "Load More" button
 * instead of replacing the whole grid on every page change.
 *
 * The first page is fetched immediately (the grid renders as soon as it
 * arrives). Each `loadMore()` advances the underlying page and APPENDS the new
 * batch to everything already shown, de-duplicated by id. When everything has
 * been displayed `hasMore` turns false so the button can be hidden - the user
 * never has to navigate away and the current results are never swapped out for
 * a loading screen.
 */
export function useLoadMoreListings(filters: ListingFilters): UseLoadMoreListingsReturn {
  const [page, setPage] = useState(1);
  const { listings, totalCount, loading, error, refetch } = useListings(filters, page);
  const [items, setItems] = useState<MappedListing[]>([]);

  // A stable signature of the query so we can tell when the underlying search
  // actually changed (and reset the accumulation) without false positives from
  // a freshly-created filters object on every render.
  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        purpose: filters.purpose,
        search: filters.search,
        propertyType: filters.propertyType,
        propertyTypes: filters.propertyTypes,
        propertyCategory: filters.propertyCategory,
        addedSince: filters.addedSince,
        sortBy: filters.sortBy,
        statusFilter: filters.statusFilter,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        bedsMin: filters.bedsMin,
        bedsMax: filters.bedsMax,
        amenitiesFilter: filters.amenitiesFilter,
        subTypeFilter: filters.subTypeFilter,
      }),
    [
      filters.purpose,
      filters.search,
      filters.propertyType,
      filters.propertyTypes,
      filters.propertyCategory,
      filters.addedSince,
      filters.sortBy,
      filters.statusFilter,
      filters.priceMin,
      filters.priceMax,
      filters.bedsMin,
      filters.bedsMax,
      filters.amenitiesFilter,
      filters.subTypeFilter,
    ],
  );

  // New query → start over from the first batch. Adjusting state during render
  // (rather than in an effect) resets page/items BEFORE the new query is fetched,
  // so a stale page can never resolve out of order and get appended.
  const keyRef = useRef(filtersKey);
  if (keyRef.current !== filtersKey) {
    keyRef.current = filtersKey;
    if (page !== 1) setPage(1);
    if (items.length > 0) setItems([]);
  }

  // A freshly-loaded batch → append it (de-duplicated by id).
  useEffect(() => {
    if (loading) return;
    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      const next = listings.filter((p) => !seen.has(p.id));
      if (next.length === 0) return prev;
      return [...prev, ...next];
    });
  }, [listings, loading]);

  const hasMore = items.length < totalCount;
  // Only treat loading as "loading more" once something is already on screen,
  // so the very first load still shows the initial placeholder.
  const loadingMore = loading && items.length > 0;

  const loadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  return { items, totalCount, loading, loadingMore, error, hasMore, loadMore, refetch };
}