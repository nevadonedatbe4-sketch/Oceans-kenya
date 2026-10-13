import { useEffect, useState } from 'react';
import { DEFAULT_FX_RATES, fetchFxRates } from '@/lib/fxRates';

/**
 * Live KES-based exchange rates (1 KES = X units) for converting listing prices
 * into a client request's chosen currency. Starts from sensible fallbacks and
 * upgrades to currency_settings once loaded, so prices never flash empty.
 */
export default function useFxRates(): Record<string, number> {
  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_FX_RATES);

  useEffect(() => {
    let alive = true;
    fetchFxRates().then((r) => { if (alive) setRates(r); });
    return () => { alive = false; };
  }, []);

  return rates;
}