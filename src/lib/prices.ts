/**
 * prices - the single source of truth for the property-search PRICE filters.
 *
 * Every property search entry point (Buy, Rent, Commercial, All Properties,
 * SEO pages, Property Detail) uses these helpers, so the separate
 * "Min price" / "Max price" dropdowns behave identically everywhere and always
 * map to the SAME database constraints:
 *
 *   • Rent  -> KSh 5,000 up to KSh 1,000,000+ per month (pcm)
 *   • Sale  -> KSh 1,000,000 up to KSh 500,000,000+
 *
 * The ladders use granular steps at the lower end and progressively wider
 * steps for premium properties (matching the granularity of a leading portal),
 * expressed in KSh - the site's currency. Labels are rendered for the active
 * display currency, but the stored VALUES are always KES so filtering is
 * currency-independent.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  KES: 'KES',
  USD: '$',
  GBP: '£',
  EUR: '€',
  UGX: 'UGX',
  AED: 'AED',
  ZAR: 'R',
};

export type PriceRates = Record<string, number>;

/**
 * Monthly RENT steps in KES - fine at the bottom (KES 5,000 steps), widening
 * progressively towards the top, matching the granularity of a leading portal
 * while keeping the original range (KES 5,000 -> KES 1,000,000+ per month).
 */
export const KES_RENT_PRICE_STEPS: number[] = [
  5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000,
  55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000,
  110000, 120000, 130000, 140000, 150000, 160000, 170000, 180000, 190000, 200000,
  210000, 220000, 230000, 240000, 250000, 275000, 300000, 325000, 350000, 375000,
  400000, 425000, 450000, 475000, 500000, 525000, 550000, 575000, 600000, 625000,
  650000, 675000, 700000, 725000, 750000, 775000, 800000, 825000, 850000, 875000,
  900000, 925000, 950000, 975000, 1000000,
];

/**
 * SALE steps in KES - detailed at the bottom, widening for premium stock,
 * keeping the original range (KES 1,000,000 -> KES 500,000,000+).
 */
export const KES_SALE_PRICE_STEPS: number[] = [
  1_000_000, 1_500_000, 2_000_000, 2_500_000, 3_000_000, 3_500_000, 4_000_000,
  4_500_000, 5_000_000, 5_500_000, 6_000_000, 6_500_000, 7_000_000, 7_500_000,
  8_000_000, 8_500_000, 9_000_000, 9_500_000, 10_000_000, 10_500_000,
  11_000_000, 11_500_000, 12_000_000, 12_500_000, 13_000_000, 13_500_000,
  14_000_000, 14_500_000, 15_000_000, 15_500_000, 16_000_000, 16_500_000,
  17_000_000, 17_500_000, 18_000_000, 18_500_000, 19_000_000, 19_500_000,
  20_000_000, 21_000_000, 22_000_000, 23_000_000, 24_000_000, 25_000_000,
  26_000_000, 27_500_000, 30_000_000, 32_500_000, 35_000_000, 37_500_000,
  40_000_000, 42_500_000, 45_000_000, 47_500_000, 50_000_000, 55_000_000,
  60_000_000, 65_000_000, 70_000_000, 75_000_000, 80_000_000, 85_000_000,
  90_000_000, 95_000_000, 100_000_000, 110_000_000, 120_000_000, 125_000_000,
  150_000_000, 175_000_000, 200_000_000, 250_000_000, 300_000_000,
  400_000_000, 500_000_000,
];

export interface PriceOptionSet {
  /** Human labels shown in the dropdown (index 0 is "No min" / "No max"). */
  labels: string[];
  /** Numeric KES values parallel to `labels`; index 0 is undefined (no bound). */
  values: (number | undefined)[];
}

/**
 * Build a min/max option set from a KES step ladder.
 * `kind === 'min'` prepends "No min"; `kind === 'max'` prepends "No max".
 */
export function buildPriceOptionSet(
  steps: number[],
  kind: 'min' | 'max',
  currency: string,
  rates: PriceRates,
  perMonthSuffix = '',
): PriceOptionSet {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  const labels: string[] = [kind === 'min' ? 'No min' : 'No max'];
  const values: (number | undefined)[] = [undefined];
  for (const kes of steps) {
    const shown = currency === 'KES' ? kes : Math.round(kes * (rates[currency] ?? 1));
    labels.push(`${sym} ${shown.toLocaleString('en-US')}${perMonthSuffix ? ` ${perMonthSuffix}` : ''}`);
    values.push(kes);
  }
  return { labels, values };
}

/** Rental MIN price options (Monthly / pcm). */
export function rentPriceMinOptions(currency: string, rates: PriceRates): PriceOptionSet {
  return buildPriceOptionSet(KES_RENT_PRICE_STEPS, 'min', currency, rates, 'pcm');
}

/** Rental MAX price options (Monthly / pcm). */
export function rentPriceMaxOptions(currency: string, rates: PriceRates): PriceOptionSet {
  return buildPriceOptionSet(KES_RENT_PRICE_STEPS, 'max', currency, rates, 'pcm');
}

/** Sale MIN price options. */
export function salePriceMinOptions(currency: string, rates: PriceRates): PriceOptionSet {
  return buildPriceOptionSet(KES_SALE_PRICE_STEPS, 'min', currency, rates);
}

/** Sale MAX price options. */
export function salePriceMaxOptions(currency: string, rates: PriceRates): PriceOptionSet {
  return buildPriceOptionSet(KES_SALE_PRICE_STEPS, 'max', currency, rates);
}

/**
 * Map a selected dropdown label back to its numeric KES value.
 * "No min" / "No max" / unknown -> undefined (meaning "not specified").
 */
export function parsePriceSelection(optionSet: PriceOptionSet, selected: string | null | undefined): number | undefined {
  if (!selected) return undefined;
  const idx = optionSet.labels.indexOf(selected);
  return idx > 0 ? optionSet.values[idx] : undefined;
}

/**
 * True when a minimum exceeds a maximum (contradictory range), so the UI can
 * warn instead of silently relaxing the criteria.
 */
export function priceRangeInvalid(min?: number, max?: number): boolean {
  return min !== undefined && max !== undefined && min > max;
}