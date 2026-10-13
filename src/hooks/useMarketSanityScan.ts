import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { checkKesPriceSanity, kesMarketFloor } from '@/lib/priceSanity';

/**
 * Market sanity scan — surfaces every listing whose recorded price is below the
 * plausible Kenyan market floor for its context. These are almost always either
 * a price that was entered in USD but left labelled KES, or a junk placeholder
 * (KES 1 / KES 120), and they quietly sail through budget gates until fixed.
 */

export interface FlaggedListing {
  id: string;
  title: string;
  location: string | null;
  price: number;
  currency: string | null;
  purpose: string | null;
  frequency: string | null;
  status: string | null;
  slug: string | null;
  /** Human explanation of why this price looks wrong. */
  warning: string;
  /** A likely corrected currency for a mislabelled price. */
  suggestedCurrency: string;
  /** The KES market floor for this listing's context. */
  floor: number;
  /** True when the figure is so low it is almost certainly junk (KES 1 / 120). */
  junk: boolean;
}

export interface ScanPatchResult {
  ok: boolean;
  count: number;
  message?: string;
}

/** A price this low is not a real figure — it is a placeholder / typo. */
const isJunkPrice = (price: number): boolean => price > 0 && price < 500;

export default function useMarketSanityScan() {
  const [items, setItems] = useState<FlaggedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('listings')
        .select('id,title,location,price,currency,purpose,frequency,status,slug,price_placeholder')
        .eq('currency', 'KES')
        .gt('price', 0)
        .lt('price', 1000000)
        .order('price', { ascending: true })
        .limit(1000);
      if (err) throw err;

      const flagged: FlaggedListing[] = [];
      for (const row of (data || []) as Record<string, unknown>[]) {
        if (row.price_placeholder) continue;
        const price = Number(row.price);
        const purpose = (row.purpose as string) || null;
        const frequency = (row.frequency as string) || null;
        const currency = (row.currency as string) || null;
        const sanity = checkKesPriceSanity(currency, price, purpose, frequency);
        if (!sanity.warning) continue;
        flagged.push({
          id: String(row.id),
          title: (row.title as string) || 'Untitled listing',
          location: (row.location as string) || null,
          price,
          currency,
          purpose,
          frequency,
          status: (row.status as string) || null,
          slug: (row.slug as string) || null,
          warning: sanity.warning,
          suggestedCurrency: sanity.suggestedCurrency || 'USD',
          floor: kesMarketFloor(purpose, frequency),
          junk: isJunkPrice(price),
        });
      }
      setItems(flagged);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not scan listings.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const applyPatch = useCallback(async (ids: string[], patch: Record<string, unknown>): Promise<ScanPatchResult> => {
    if (ids.length === 0) return { ok: true, count: 0 };
    const { error: err } = await supabase.from('listings').update(patch).in('id', ids);
    if (err) return { ok: false, count: 0, message: err.message };
    // Drop the fixed rows out of the list in place.
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    return { ok: true, count: ids.length };
  }, []);

  /** Relabel the price as USD without changing the number (the common fix). */
  const setCurrencyUsd = useCallback(
    (ids: string[]) => applyPatch(ids, { currency: 'USD' }),
    [applyPatch],
  );

  /** Hide the junk figure behind "Price on Request". */
  const markPriceOnRequest = useCallback(
    (ids: string[]) => applyPatch(ids, { price: 0, price_placeholder: true }),
    [applyPatch],
  );

  return { items, loading, error, refresh: load, setCurrencyUsd, markPriceOnRequest };
}