/**
 * Predictive pricing - an estimation layer only.
 *
 * Projected value, rental yield and market momentum are DERIVED heuristically
 * from the development's own data (price, size, location, status, timing) and
 * a per-area baseline. All outputs are clearly meant to be "estimated /
 * projected" and should never be presented as a guarantee.
 */

export interface PredictiveInput {
  price: number;
  sizeMin?: number;
  location?: string;
  developmentStatus?: string; // off_plan | under_construction | completed
  completionStartYear?: number;
  completionEndYear?: number;
  propertyType?: string;
  currency?: string;
}

export interface PredictiveProfile {
  price: number;
  pricePerSqm: number;
  growthRate: number; // decimal, e.g. 0.09
  projectedValue3yr: number;
  projectedValue5yr: number;
  annualRent: number;
  monthlyRent: number;
  yieldPercent: number;
  momentum: 'high' | 'stable' | 'slow';
  momentumLabel: string;
  badges: string[];
}

// Base annual capital-appreciation assumption by area (heuristic, estimation only).
const LOCATION_GROWTH: Record<string, number> = {
  westlands: 0.07,
  kilimani: 0.065,
  kileleshwa: 0.065,
  riverside: 0.075,
  parklands: 0.055,
  lavington: 0.06,
  karen: 0.06,
  riara: 0.05,
  kitisuru: 0.055,
  langata: 0.045,
  embakasi: 0.05,
  ruaka: 0.06,
  syokimau: 0.055,
  kiambu: 0.05,
  thika: 0.045,
  athi: 0.055,
  nakuru: 0.045,
  kisumu: 0.045,
  mombasa: 0.05,
};

// Marginal gross rental yield assumption by area (estimation only).
const LOCATION_YIELD: Record<string, number> = {
  westlands: 0.055,
  kilimani: 0.06,
  kileleshwa: 0.055,
  riverside: 0.05,
  lavington: 0.06,
  parklands: 0.055,
  karen: 0.045,
  embakasi: 0.075,
  ruaka: 0.08,
  syokimau: 0.08,
  langata: 0.065,
  thika: 0.08,
  athi: 0.08,
  nakuru: 0.075,
  kisumu: 0.075,
  mombasa: 0.07,
};

const DEFAULT_GROWTH = 0.05;
const DEFAULT_YIELD = 0.065;

function normalize(s: string): string {
  return (s || '').toLowerCase().trim();
}

function areaKey(location?: string): string {
  const loc = normalize(location);
  if (!loc) return '';
  for (const key of Object.keys(LOCATION_GROWTH)) {
    if (loc.includes(key)) return key;
  }
  const first = loc.split(/[\s,]+/)[0] || '';
  return LOCATION_GROWTH[first] !== undefined ? first : '';
}

export function computePredictiveProfile(input: PredictiveInput): PredictiveProfile | null {
  const price = Number(input.price) || 0;
  if (price <= 0) return null;

  const status = (input.developmentStatus || '').toLowerCase();
  const area = areaKey(input.location);
  const baseGrowth = LOCATION_GROWTH[area] ?? DEFAULT_GROWTH;

  const devPremium = status === 'off_plan' ? 0.02 : status === 'under_construction' ? 0.01 : 0;
  const demandFactor = status === 'off_plan' ? 0.01 : status === 'under_construction' ? 0.005 : 0;
  const growthRate = Math.min(0.14, baseGrowth + devPremium + demandFactor);

  const sizeMin = Number(input.sizeMin) || 0;
  const pricePerSqm = sizeMin > 0 ? Math.round(price / sizeMin) : 0;

  const projectedValue3yr = Math.round(price * Math.pow(1 + growthRate, 3));
  const projectedValue5yr = Math.round(price * Math.pow(1 + growthRate, 5));

  const yieldPercent = LOCATION_YIELD[area] ?? DEFAULT_YIELD;
  const annualRent = Math.round(price * yieldPercent);
  const monthlyRent = Math.round(annualRent / 12);

  const momentum: PredictiveProfile['momentum'] =
    growthRate >= 0.08 ? 'high' : growthRate >= 0.05 ? 'stable' : 'slow';
  const momentumLabel =
    momentum === 'high' ? 'High Growth' : momentum === 'stable' ? 'Stable Growth' : 'Slow Market';

  const badges: string[] = [];
  if (yieldPercent >= 0.08) badges.push('High ROI');
  if (growthRate >= 0.08) badges.push('Strong Growth');
  if (status === 'off_plan') badges.push('Off-Plan Premium');

  return {
    price,
    pricePerSqm,
    growthRate: Math.round(growthRate * 1000) / 10,
    projectedValue3yr,
    projectedValue5yr,
    annualRent,
    monthlyRent,
    yieldPercent: Math.round(yieldPercent * 1000) / 10,
    momentum,
    momentumLabel,
    badges,
  };
}