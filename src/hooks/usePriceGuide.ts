import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { hasValidPrice } from '@/lib/listingMeta';
import { smartTitleCase } from '@/lib/location';

/** A neighbourhood with the price fields needed for the price-guide pages. */
export interface PriceNeighbourhood {
  id: string;
  name: string;
  slug: string;
  average_sale_price: number | null;
  rental_range_kes: string | null;
  summary: string | null;
}

export interface UsePriceGuideReturn {
  /** The neighbourhood backing the current page (may be null if not found). */
  target: PriceNeighbourhood | null;
  /** All published neighbourhoods that carry price data, for the comparison table. */
  areas: PriceNeighbourhood[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch every published neighbourhood with its price fields once, then expose
 * the matching `slug` as `target` and the full priced set for the comparison
 * table. This makes the Property Intelligence pages genuinely data-backed.
 */
export function usePriceGuide(slug: string): UsePriceGuideReturn {
  const [areas, setAreas] = useState<PriceNeighbourhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAll = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('neighbourhoods')
        .select('id, name, slug, average_sale_price, rental_range_kes, summary')
        .eq('is_published', true)
        .order('average_sale_price', { ascending: false });

      if (err) throw err;
      if (controller.signal.aborted) return;

      // A stored `0` is NOT a real price - only positive values are kept so we
      // never render "KSh 0" on a price-guide page.
      const rows = ((data || []) as PriceNeighbourhood[]).filter(
        (r) => hasValidPrice(r.average_sale_price) && r.rental_range_kes != null,
      );
      const nonNull = rows
        .filter((r) => hasValidPrice(r.average_sale_price))
        .map((r) => ({ ...r, name: smartTitleCase(r.name) }));
      setAreas(nonNull);
    } catch (e: unknown) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load price data');
      setAreas([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchAll]);

  const refetch = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  const target = areas.find((a) => a.slug === slug) || areas.find((a) => a.slug === slug.replace('property-prices/', '')) || null;

  return { target, areas, loading, error, refetch };
}

/**
 * Format a KES number as "KSh 85,000,000".
 *
 * Returns '' for a missing / zero / invalid value so callers can show "-" or a
 * fallback instead of a fabricated "KSh 0".
 */
export function formatKes(value: number | null | undefined): string {
  if (!hasValidPrice(value)) return '';
  return `KSh ${(value as number).toLocaleString('en-KE')}`;
}

/** Trim the leading "KSh " from a stored rental range string, if present. */
export function cleanRentalRange(raw: string | null): string {
  if (!raw) return '';
  return raw.replace(/^KSh\s*/i, '');
}