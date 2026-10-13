/**
 * Currency conversion — one shared source of truth for turning a listing price
 * into a client request's chosen currency.
 *
 * The platform stores exchange rates in `currency_settings.rate` as
 * "1 UNIT = X KES" (KES is the internal base and always 1). Internally we keep
 * the inverse — "1 KES = X units" — because converting is then a simple
 * multiply: KES = amount / rate[from]; target = KES * rate[to].
 */

import { supabase } from '@/lib/supabase';

/** Fallback rates (1 KES = X units). Used until currency_settings loads. */
export const DEFAULT_FX_RATES: Record<string, number> = {
  KES: 1,
  USD: 0.0077, // ≈ 1 USD = 130 KES
  GBP: 0.0061, // ≈ 1 GBP = 165 KES
  EUR: 0.0071, // ≈ 1 EUR = 140 KES
  UGX: 0.0303,
  AED: 0.0282,
  ZAR: 0.1449,
};

/** The display prefix for a currency code (kept as the code for CRM clarity). */
export function currencyPrefix(code: string | null | undefined): string {
  return (code || 'KES').toUpperCase();
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 1;
};

/**
 * Convert `amount` from one currency to another using a KES-based rate table
 * (1 KES = X units). Unknown currencies fall back to 1:1 rather than throwing,
 * so a missing rate can never blank out a price.
 */
export function convertCurrency(
  amount: number,
  from: string | null | undefined,
  to: string | null | undefined,
  rates?: Record<string, number> | null,
): number {
  if (!amount || amount <= 0) return amount;
  const f = (from || 'KES').toUpperCase();
  const t = (to || 'KES').toUpperCase();
  if (f === t) return amount;
  const table = rates || DEFAULT_FX_RATES;
  const rf = num(table[f] ?? DEFAULT_FX_RATES[f]);
  const rt = num(table[t] ?? DEFAULT_FX_RATES[t]);
  const kesAmount = f === 'KES' ? amount : amount / rf;
  return Math.round(kesAmount * rt);
}

/** Format an amount, converting into `currency` when a source currency is given. */
export function formatMoneyIn(
  amount: number | null | undefined,
  currency: string | null | undefined,
  rates?: Record<string, number> | null,
  fromCurrency?: string | null,
): string {
  const code = currencyPrefix(currency);
  if (amount == null || amount <= 0) return 'Price on request';
  const value = fromCurrency ? convertCurrency(amount, fromCurrency, code, rates) : amount;
  return `${code} ${Math.round(value).toLocaleString('en-US')}`;
}

/** Load the live rate table (1 KES = X units) from currency_settings. */
export async function fetchFxRates(): Promise<Record<string, number>> {
  const rates: Record<string, number> = { ...DEFAULT_FX_RATES };
  try {
    const { data, error } = await supabase
      .from('currency_settings')
      .select('code, rate')
      .order('display_order', { ascending: true });
    if (error || !data) return rates;
    for (const row of data as { code: string; rate: number }[]) {
      const code = (row.code || '').toUpperCase();
      const r = Number(row.rate);
      if (code && code !== 'KES' && r > 0) rates[code] = 1 / r;
    }
  } catch {
    // Keep the fallback table on any failure.
  }
  return rates;
}