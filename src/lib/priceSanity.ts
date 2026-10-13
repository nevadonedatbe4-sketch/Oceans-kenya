/**
 * Market sanity checks for listing prices.
 *
 * A recurring data-entry mistake is recording a price in KES that is really a
 * USD figure — e.g. a $5,000 Nairobi rental stored as "5,000 KES", which reads
 * as roughly $38 and silently sails through budget gates. These helpers flag the
 * obvious cases so the editor can warn BEFORE the listing goes live.
 */

/** Lowest price (in KES) that is plausibly a real Kenyan market figure. */
const MIN_PLAUSIBLE_KES: Record<string, number> = {
  sale: 1000000,
  per_month: 20000,
  per_year: 200000,
  per_week: 8000,
  per_day: 2000,
  once_off: 20000,
};

/** Lowest plausible KES floor for a rental, taking billing frequency into account. */
const rentFloor = (frequency: string | null | undefined): number => {
  const key = (frequency || 'once_off').toLowerCase();
  return MIN_PLAUSIBLE_KES[key] ?? MIN_PLAUSIBLE_KES.per_month;
};

/**
 * The lowest price (in KES) that is plausibly a real Kenyan market figure for a
 * given context. Anything below this is almost certainly a currency or value
 * mix-up — used both by the editor warning and the CRM market-sanity scan.
 */
export function kesMarketFloor(
  purpose: string | null | undefined,
  frequency?: string | null,
): number {
  return purpose === 'sale' ? MIN_PLAUSIBLE_KES.sale : rentFloor(frequency);
}

export interface PriceSanityResult {
  /** Warning message to show the editor, or null when the price looks fine. */
  warning: string | null;
  /** A likely corrected currency, when the value looks mislabelled. */
  suggestedCurrency: string | null;
}

const parseAmount = (v: string | number | null | undefined): number => {
  if (typeof v === 'number') return v;
  const cleaned = String(v ?? '').replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Flag a price stored in KES that is far below the market floor for its context
 * (a monthly rent or a sale price). Returns a human warning + a likely fix.
 */
export function checkKesPriceSanity(
  currency: string | null | undefined,
  priceRaw: string | number | null | undefined,
  purpose: string | null | undefined,
  frequency?: string | null,
): PriceSanityResult {
  const code = (currency || '').toUpperCase();
  const price = parseAmount(priceRaw);
  if (code !== 'KES' || !Number.isFinite(price) || price <= 0) {
    return { warning: null, suggestedCurrency: null };
  }

  const isSale = purpose === 'sale';
  const floor = kesMarketFloor(purpose, frequency);
  if (price >= floor) return { warning: null, suggestedCurrency: null };

  const context = isSale
    ? 'a for-sale price'
    : frequency === 'per_day'
      ? 'a daily rate'
      : frequency === 'per_week'
        ? 'a weekly rate'
        : 'a monthly rent';
  return {
    warning: `KES ${price.toLocaleString('en-US')} is unusually low for ${context} in the Kenyan market. This usually means the figure was entered in USD — check the currency before publishing.`,
    suggestedCurrency: 'USD',
  };
}