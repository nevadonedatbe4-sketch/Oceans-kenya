/**
 * Client Request → Property Matching Engine (pure, explainable).
 *
 * Given a client requirement and a candidate property from the LIVE inventory,
 * decide whether the property is ELIGIBLE and, if so, how well it matches.
 *
 * Design rules (enforced here, not in the UI):
 *  - Hard requirements act as eligibility GATES: failing one disqualifies the
 *    property entirely (it can never be returned as a strong match).
 *  - Preferences only reduce the SCORE.
 *  - Missing data NEVER counts as a satisfied criterion — it is reported in
 *    `missingInfo` instead.
 *  - UNIFORM CURRENCY: a listing priced in a different currency is converted
 *    into the client request's chosen currency (`req.currency`) before any
 *    budget comparison, so budgets are always judged on one scale. Only a
 *    listing with no price at all is an unverifiable budget.
 *  - Only properties that are published AND live are eligible.
 */

import { NON_PUBLIC_STATUSES } from '@/lib/publicListings';
import { normalizeCategory, purposeForTransaction, furnishingMatchesAny, type PropertyCategory } from '@/lib/clientRequests';
import { areaCentreFor } from '@/lib/areaCentres';
import { haversineDistance } from '@/lib/distance';
import { convertCurrency } from '@/lib/fxRates';

export type MatchLabel = 'strong' | 'good' | 'partial' | 'alternative';

export const MATCH_LABELS: Record<MatchLabel, { label: string; className: string; dot: string }> = {
  strong: { label: 'Strong Match', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  good: { label: 'Good Match', className: 'bg-[#00ddb4]/15 text-[#0f766e] border-[#00ddb4]/40', dot: 'bg-[#00b894]' },
  partial: { label: 'Partial Match', className: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  alternative: { label: 'Alternative — Requires Client Approval', className: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
};

/** Central, configurable criterion weights (sum = 100). */
export const MATCH_WEIGHTS = {
  location: 25,
  budget: 25,
  category: 10,
  type: 12,
  bedrooms: 8,
  bathrooms: 5,
  size: 5,
  amenities: 5,
  furnishing: 5,
} as const;

export const SCORE_THRESHOLDS = { strong: 80, good: 60, partial: 40 };

/** A normalised property candidate from either `listings` or `land_listings`. */
export interface CandidateProperty {
  id: string;
  source: 'listings' | 'land_listings';
  slug: string | null;
  title: string;
  purpose: string | null;
  category: PropertyCategory;
  propertyType: string | null;
  subType: string | null;
  price: number | null;
  currency: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqm: number | null;
  landSize: number | null;
  neighbourhood: string | null;
  location: string | null;
  address: string | null;
  furnished: string | null;
  amenities: string[];
  image: string | null;
  status: string | null;
  isPublished: boolean;
  agentId: string | null;
  /** WGS84 coordinates — the listing's own when recorded, otherwise its area hub. */
  lat?: number | null;
  lng?: number | null;
}

/** The requirement side of a match. */
export interface MatchRequestInput {
  transaction_type: string | null;
  property_category: string | null;
  /** Single type (legacy). Kept so older callers/tests keep working. */
  property_subtype: string | null;
  /** Preferred property types (multi-choice). When present and non-empty this
   *  takes precedence over the single `property_subtype`. */
  property_subtypes?: string[] | null;
  locations: string[] | null;
  allow_alternatives: boolean | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string | null;
  /** KES-based exchange rates (1 KES = X units) used to convert listing prices
   *  into the request's currency. Omitted = sensible built-in fallbacks. */
  rates?: Record<string, number> | null;
  bedrooms_min: number | null;
  bathrooms_min: number | null;
  size_min: number | null;
  /** Legacy single furnishing value. Kept so older callers/tests keep working. */
  furnishing: string | null;
  /** Independent furnishing toggles. When present and non-empty this takes
   *  precedence over the single `furnishing`. */
  furnishing_options?: string[] | null;
  preferred_amenities: string[] | null;
  hard_criteria: string[] | null;
  /** Max search radius (km) around the requested locations. Null/0 = area only. */
  location_radius_km?: number | null;
  /** Resolved coordinates of the requested locations, enabling distance matching. */
  location_anchors?: { name: string; lat: number; lng: number }[] | null;
}

export interface MatchOutcome {
  eligible: boolean;
  score: number;
  label: MatchLabel;
  /** Human-readable reasons the property fits. */
  satisfied: string[];
  /** Human-readable reasons it falls short. */
  unmet: string[];
  /** Information that was missing and reduced confidence. */
  missingInfo: string[];
  /** Why it was excluded, when eligible === false. */
  excludedReason?: string;
}

const LIVE_STATUSES_EXCLUDED = new Set(NON_PUBLIC_STATUSES.map((s) => s.toLowerCase()));

const money = (n: number, currency: string | null) => `${currency || ''} ${Math.round(n).toLocaleString()}`.trim();
const titleCase = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const norm = (v: string | null | undefined) => (v || '').trim().toLowerCase();

/**
 * Resolve a listing's furnishing from BOTH its `furnished_status` field and its
 * title. Real inventory is inconsistent — some homes are recorded as
 * "Furnished" yet explicitly titled "… Unfurnished …". When the title plainly
 * says "unfurnished", that human-facing signal wins, so a "furnished only"
 * client requirement can never surface an unfurnished property.
 */
function resolveFurnishing(status: string | null, title: string | null): string | null {
  const t = (title || '').toLowerCase();
  if (/\bunfurnished\b/.test(t)) return 'unfurnished';
  return status;
}

/** Category relatedness — residential buyers may accept a new-development unit. */
function categoryRatio(requested: PropertyCategory, actual: PropertyCategory): number {
  if (requested === actual) return 1;
  if ((requested === 'residential' && actual === 'new_development') ||
      (requested === 'new_development' && actual === 'residential')) return 0.7;
  return 0;
}

/**
 * Default radius (km) applied when the client is "open to nearby areas" but no
 * explicit radius was chosen. Keeps the "nearby" promise distance-based rather
 * than a blind name-difference allowance.
 */
export const DEFAULT_NEARBY_RADIUS_KM = 5;

/**
 * A "maximum budget" is an ABSOLUTE ceiling. When the client ticks budget as a
 * mandatory (hard) criterion, a property priced even 1 unit above the maximum
 * is disqualified entirely — there is NO tolerance band. The maximum means the
 * maximum.
 */
export const BUDGET_MAX_TOLERANCE = 0;

type LocationKind = 'exact' | 'nearby' | 'alternative' | 'none';

interface LocationResult {
  ratio: number;
  exact: boolean;
  hasData: boolean;
  kind: LocationKind;
  distanceKm: number | null;
  anchorName: string | null;
}

/**
 * Location relatedness. Exact area names always match. When they do not, the
 * property is matched by DISTANCE to the requested area's hub — so "open to
 * nearby areas" genuinely searches the surrounding geography instead of only
 * matching identical name strings.
 *
 *  - exact      → identical area name (ratio 1)
 *  - nearby     → within the (explicit or default) radius of a requested area
 *  - alternative→ no usable coordinates, but the client allowed alternatives
 *  - none       → outside the approved scope
 */
function locationRatio(
  locations: string[],
  property: CandidateProperty,
  opts: { allowAlternatives: boolean; radiusKm: number | null; anchors: { name: string; lat: number; lng: number }[] },
): LocationResult {
  const haystack = [property.neighbourhood, property.location, property.address]
    .filter(Boolean)
    .map((s) => norm(s as string));
  if (haystack.length === 0) {
    return { ratio: 0, exact: false, hasData: false, kind: 'none', distanceKm: null, anchorName: null };
  }

  const exact = locations.some((loc) => haystack.some((h) => h.includes(norm(loc)) || norm(loc).includes(h)));
  if (exact) return { ratio: 1, exact: true, hasData: true, kind: 'exact', distanceKm: 0, anchorName: null };

  const anchors = opts.anchors || [];
  const hasCoords = property.lat != null && property.lng != null;
  const radius = opts.radiusKm && opts.radiusKm > 0
    ? opts.radiusKm
    : (opts.allowAlternatives ? DEFAULT_NEARBY_RADIUS_KM : null);

  if (radius && anchors.length && hasCoords) {
    let best = Infinity;
    let anchorName: string | null = null;
    for (const a of anchors) {
      const d = haversineDistance(a.lat, a.lng, property.lat as number, property.lng as number) / 1000;
      if (d < best) { best = d; anchorName = a.name; }
    }
    const distanceKm = Math.round(best * 10) / 10;
    if (best <= radius) {
      // Closer to the requested area scores higher (≈0.78 → 0.92).
      const ratio = Math.max(0.78, Math.min(0.92, 0.92 - 0.14 * (best / radius)));
      return { ratio, exact: false, hasData: true, kind: 'nearby', distanceKm, anchorName };
    }
    return { ratio: 0, exact: false, hasData: true, kind: 'none', distanceKm, anchorName };
  }

  // No usable coordinates (or no radius): fall back to the broad alternative allowance.
  if (opts.allowAlternatives) {
    return { ratio: 0.5, exact: false, hasData: true, kind: 'alternative', distanceKm: null, anchorName: null };
  }
  return { ratio: 0, exact: false, hasData: true, kind: 'none', distanceKm: null, anchorName: null };
}

/** The client's chosen currency — the single currency everything is compared in. */
function requestCurrency(req: MatchRequestInput): string {
  return (req.currency || 'KES').toUpperCase();
}

/**
 * A listing's price expressed in the client's chosen currency. Non-KES listings
 * are converted using the live rate table so a USD listing can be compared
 * against a KES budget (and vice-versa) on one uniform scale. Returns null only
 * when the listing genuinely has no price.
 */
function priceInRequestCurrency(req: MatchRequestInput, property: CandidateProperty): number | null {
  if (property.price == null || property.price <= 0) return null;
  return convertCurrency(property.price, property.currency, requestCurrency(req), req.rates);
}

function budgetRatio(
  req: MatchRequestInput,
  property: CandidateProperty,
): { ratio: number; missing: boolean; note?: string } {
  const { budget_min, budget_max } = req;
  if (budget_min == null && budget_max == null) return { ratio: 1, missing: false };
  const p = priceInRequestCurrency(req, property);
  if (p == null) {
    return { ratio: 0, missing: true, note: 'Price on request' };
  }
  if (budget_max != null && p > budget_max) {
    const over = (p - budget_max) / budget_max;
    return { ratio: over <= BUDGET_MAX_TOLERANCE ? 0.4 : 0, missing: false };
  }
  if (budget_min != null && p < budget_min) return { ratio: 0.7, missing: false };
  return { ratio: 1, missing: false };
}

function countRatio(actual: number | null, min: number | null): { ratio: number; missing: boolean } {
  if (min == null) return { ratio: 1, missing: false };
  if (actual == null || actual <= 0) return { ratio: 0, missing: true };
  if (actual >= min) return { ratio: 1, missing: false };
  if (actual === min - 1) return { ratio: 0.4, missing: false };
  return { ratio: 0, missing: false };
}

function sizeRatio(actual: number | null, min: number | null): { ratio: number; missing: boolean } {
  if (min == null) return { ratio: 1, missing: false };
  if (actual == null || actual <= 0) return { ratio: 0, missing: true };
  if (actual >= min) return { ratio: 1, missing: false };
  return { ratio: Math.max(0, actual / min), missing: false };
}

/**
 * Property-type relatedness between the requested type(s) (e.g. "house",
 * "villa") and what the listing actually is. The listing stores its REAL type
 * in `propertyType`; `subType` is only a descriptive variant (e.g. "modern"),
 * so both are inspected. A listing with no usable type at all is reported as
 * `known: false` — per the engine's rules, missing data must never be counted
 * as a satisfied criterion (and must never silently disqualify either).
 *
 * The client may name MORE THAN ONE acceptable type (multi-choice); the
 * property qualifies when it matches ANY of them.
 */
function typeRatio(
  requested: string | string[] | null,
  property: CandidateProperty,
): { ratio: number; known: boolean; actual: string | null } {
  const wants = (Array.isArray(requested) ? requested : requested ? [requested] : [])
    .map((r) => norm(r))
    .filter(Boolean);
  if (wants.length === 0) return { ratio: 1, known: true, actual: property.propertyType };
  const actual = property.propertyType || property.subType || null;
  const tokens = [property.propertyType, property.subType]
    .filter(Boolean)
    .map((t) => norm(t as string));
  if (tokens.length === 0) return { ratio: 0, known: false, actual: null };
  return { ratio: tokens.some((t) => wants.includes(t)) ? 1 : 0, known: true, actual };
}

/** Human label for one or many requested property types, e.g. "House / Villa". */
const typesLabel = (requested: string | string[] | null): string => {
  const arr = Array.isArray(requested) ? requested : requested ? [requested] : [];
  return arr.map((t) => titleCase(t)).join(' / ');
};

/** The requested types, preferring the multi-choice array when present. */
function requestedTypes(req: MatchRequestInput): string[] {
  const multi = (req.property_subtypes || []).filter(Boolean);
  if (multi.length) return multi;
  return req.property_subtype ? [req.property_subtype] : [];
}

/** The furnishing states the client will accept. Multi-choice wins over legacy. */
function requestedFurnishing(req: MatchRequestInput): string[] {
  const multi = (req.furnishing_options || []).filter((f) => f && f !== 'any');
  if (multi.length) return multi;
  if (req.furnishing && req.furnishing !== 'any') return [req.furnishing];
  return [];
}

/** Relatedness of a listing's furnishing to the client's chosen states. */
function furnishingRatio(wanted: string[], actual: string | null): { ratio: number; missing: boolean } {
  const states = (wanted || []).filter(Boolean);
  if (states.length === 0) return { ratio: 1, missing: false };
  if (!norm(actual)) return { ratio: 0, missing: true };
  return { ratio: furnishingMatchesAny(states, actual) ? 1 : 0, missing: false };
}

function amenitiesRatio(wanted: string[], actual: string[]): { ratio: number; matched: string[]; missingList: string[] } {
  if (wanted.length === 0) return { ratio: 1, matched: [], missingList: [] };
  const have = actual.map((a) => norm(a));
  const matched: string[] = [];
  const missingList: string[] = [];
  for (const w of wanted) {
    if (have.some((h) => h.includes(norm(w)) || norm(w).includes(h))) matched.push(w);
    else missingList.push(w);
  }
  return { ratio: matched.length / wanted.length, matched, missingList };
}

function labelFor(score: number, usedAlternative: boolean): MatchLabel {
  if (usedAlternative) return 'alternative';
  if (score >= SCORE_THRESHOLDS.strong) return 'strong';
  if (score >= SCORE_THRESHOLDS.good) return 'good';
  if (score >= SCORE_THRESHOLDS.partial) return 'partial';
  return 'alternative';
}

/**
 * Evaluate one candidate against one request. Deterministic and side-effect free.
 */
export function scoreCandidate(req: MatchRequestInput, property: CandidateProperty): MatchOutcome {
  const satisfied: string[] = [];
  const unmet: string[] = [];
  const missingInfo: string[] = [];
  const hard = new Set(req.hard_criteria || []);
  const fail = (reason: string): MatchOutcome =>
    ({ eligible: false, score: 0, label: 'alternative', satisfied, unmet, missingInfo, excludedReason: reason });

  /* ── Hard availability gate: only published + live properties qualify. ── */
  if (!property.isPublished) return fail('Not published');
  if (property.status && LIVE_STATUSES_EXCLUDED.has(norm(property.status))) {
    return fail(`Listing is ${property.status}`);
  }

  const requestedCategory = normalizeCategory(req.property_category);

  /* ── Hard transaction gate ── */
  const wantedPurpose = purposeForTransaction(req.transaction_type);
  if (hard.has('transaction') && wantedPurpose && property.purpose && norm(property.purpose) !== wantedPurpose) {
    return fail(`${titleCase(property.purpose)} listing (client wants ${titleCase(wantedPurpose)})`);
  }

  /* ── Hard category gate ── */
  if (hard.has('category') && requestedCategory !== property.category) {
    return fail(`${titleCase(property.category)} (client wants ${titleCase(requestedCategory)})`);
  }

  /* ── Hard property-type gate ──
   * Property type is ALWAYS strict: when the client specifies a type, only a
   * listing of that exact type is eligible. It used to be a gate only when
   * "subtype" was explicitly ticked as mandatory, which let a wrong type (e.g.
   * an apartment on a "house" request) still rank as a perfect match. */
  const types = requestedTypes(req);
  if (types.length) {
    const t = typeRatio(types, property);
    if (t.known && t.ratio < 1) {
      return fail(`${titleCase(t.actual || 'property type')} (client wants ${typesLabel(types)})`);
    }
    // A listing whose type is entirely unrecorded cannot be confirmed as the
    // requested type, so it is not eligible for a type-specific request.
    if (!t.known) {
      return fail(`Property type not recorded (client wants ${typesLabel(types)})`);
    }
  }

  /* ── Hard location gate ── */
  const locations = (req.locations || []).filter(Boolean);
  const loc = locations.length
    ? locationRatio(locations, property, {
        allowAlternatives: req.allow_alternatives ?? true,
        radiusKm: req.location_radius_km ?? null,
        anchors: req.location_anchors || [],
      })
    : { ratio: 1, exact: true, hasData: true, kind: 'exact' as const, distanceKm: 0, anchorName: null };
  // A hard location requirement accepts the exact area OR a within-radius nearby
  // area (the client opted into a radius); only truly out-of-scope fails.
  if (hard.has('location') && locations.length && loc.kind !== 'exact' && loc.kind !== 'nearby') {
    return fail('Outside the client’s approved location(s)');
  }

  /* ── Hard max-budget gate (only when currencies are comparable) ──
   * A "maximum budget" is an absolute ceiling: any property priced above it
   * (after conversion into the client's currency) is disqualified entirely —
   * no tolerance. Out-of-reach properties are never considered. */
  if (hard.has('budget') && req.budget_max != null) {
    const reqCur = requestCurrency(req);
    const price = priceInRequestCurrency(req, property);
    if (price != null && price > req.budget_max) {
      const over = Math.round(((price - req.budget_max) / req.budget_max) * 100);
      return fail(
        `Over budget (${money(price, reqCur)} is ${over}% above the ${money(req.budget_max, reqCur)} maximum)`,
      );
    }
  }

  /* ── Hard bedrooms gate ── */
  if (hard.has('bedrooms') && req.bedrooms_min != null) {
    if (property.bedrooms != null && property.bedrooms < req.bedrooms_min) {
      return fail(`Only ${property.bedrooms} bed(s); client needs ${req.bedrooms_min}+`);
    }
  }

  /* ── Hard furnishing gate ── */
  const furnWanted = requestedFurnishing(req);
  if (hard.has('furnishing') && furnWanted.length) {
    const fr = furnishingRatio(furnWanted, property.furnished);
    if (fr.ratio < 0.5) return fail(`Furnishing mismatch (${property.furnished || 'unknown'})`);
  }

  /* ── Weighted scoring (renormalised over the criteria the client set) ── */
  let weighted = 0;
  let denom = 0;

  const add = (weight: number, ratio: number, requested: boolean) => {
    if (!requested) return;
    denom += weight;
    weighted += weight * ratio;
  };

  // Location
  if (locations.length) {
    add(MATCH_WEIGHTS.location, loc.ratio, true);
    if (loc.kind === 'exact') satisfied.push(`In ${property.neighbourhood || property.location}`);
    else if (loc.kind === 'nearby') satisfied.push(`Nearby: ${loc.distanceKm} km from ${loc.anchorName || locations[0]} (within radius)`);
    else if (loc.kind === 'alternative') unmet.push(`Outside requested area (${locations.join(', ')}) — alternative location`);
    else unmet.push(`Outside requested area (${locations.join(', ')})`);
    if (!loc.hasData) missingInfo.push('Location data missing on listing');
  }

  // Budget
  const budgetReq = req.budget_min != null || req.budget_max != null;
  if (budgetReq) {
    const b = budgetRatio(req, property);
    add(MATCH_WEIGHTS.budget, b.ratio, true);
    const reqCur = requestCurrency(req);
    const price = priceInRequestCurrency(req, property);
    if (b.missing) missingInfo.push(b.note || 'Budget could not be verified');
    else if (b.ratio >= 0.99) satisfied.push(`Within budget (${money(price!, reqCur)})`);
    else if (b.ratio > 0) unmet.push(`Price ${money(price!, reqCur)} is outside the ideal budget`);
    else unmet.push(`Price ${money(price!, reqCur)} exceeds the budget`);
  }

  // Category
  add(MATCH_WEIGHTS.category, categoryRatio(requestedCategory, property.category), true);
  if (requestedCategory === property.category) satisfied.push(`${titleCase(property.category)} property`);
  else if (categoryRatio(requestedCategory, property.category) > 0) unmet.push(`Category ${titleCase(property.category)} (client wanted ${titleCase(requestedCategory)})`);
  else unmet.push(`Wrong category (${titleCase(property.category)})`);

  // Property type — the listing's REAL type vs the client's requested type(s).
  // (Previously unscored, which let apartments rank as perfect house matches.)
  if (types.length) {
    const t = typeRatio(types, property);
    add(MATCH_WEIGHTS.type, t.ratio, true);
    if (!t.known) missingInfo.push('Property type not recorded');
    else if (t.ratio >= 0.99) satisfied.push(`Type: ${typesLabel(types)}`);
    else unmet.push(`Type: ${titleCase(t.actual || 'unknown')} (client wants ${typesLabel(types)})`);
  }

  // Bedrooms
  if (req.bedrooms_min != null) {
    const r = countRatio(property.bedrooms, req.bedrooms_min);
    add(MATCH_WEIGHTS.bedrooms, r.ratio, true);
    if (r.missing) missingInfo.push('Bedroom count not recorded');
    else if (r.ratio >= 0.99) satisfied.push(`${property.bedrooms} bedrooms`);
    else unmet.push(`${property.bedrooms ?? 0} bedrooms (client wants ${req.bedrooms_min}+)`);
  }

  // Bathrooms
  if (req.bathrooms_min != null) {
    const r = countRatio(property.bathrooms, req.bathrooms_min);
    add(MATCH_WEIGHTS.bathrooms, r.ratio, true);
    if (r.missing) missingInfo.push('Bathroom count not recorded');
    else if (r.ratio >= 0.99) satisfied.push(`${property.bathrooms} bathrooms`);
    else unmet.push(`${property.bathrooms ?? 0} bathrooms (client wants ${req.bathrooms_min}+)`);
  }

  // Size
  if (req.size_min != null) {
    const size = property.sizeSqm ?? property.landSize;
    const r = sizeRatio(size, req.size_min);
    add(MATCH_WEIGHTS.size, r.ratio, true);
    if (r.missing) missingInfo.push('Size not recorded');
    else if (r.ratio >= 0.99) satisfied.push(`Meets size requirement`);
    else unmet.push(`Smaller than requested size`);
  }

  // Amenities
  const wantedAmenities = (req.preferred_amenities || []).filter(Boolean);
  if (wantedAmenities.length) {
    const a = amenitiesRatio(wantedAmenities, property.amenities);
    add(MATCH_WEIGHTS.amenities, a.ratio, true);
    if (a.matched.length) satisfied.push(`Has ${a.matched.join(', ')}`);
    if (a.missingList.length) unmet.push(`Missing ${a.missingList.join(', ')}`);
  }

  // Furnishing
  if (furnWanted.length) {
    const fr = furnishingRatio(furnWanted, property.furnished);
    add(MATCH_WEIGHTS.furnishing, fr.ratio, true);
    if (fr.missing) missingInfo.push('Furnishing not recorded');
    else if (fr.ratio >= 0.99) satisfied.push(`Furnishing: ${property.furnished || 'as requested'}`);
    else unmet.push(`Furnishing: ${property.furnished || 'unknown'}`);
  }

  const score = denom > 0 ? Math.round((weighted / denom) * 100) : 100;
  // Only the unapproved fallback (different area, no distance evidence) is forced
  // down to the "alternative — requires approval" label. Distance-based nearby
  // matches keep their real score, since the client opted into nearby areas.
  const usedAlternative = locations.length > 0 && loc.kind === 'alternative';

  return {
    eligible: true,
    score,
    label: labelFor(score, usedAlternative),
    satisfied,
    unmet,
    missingInfo,
  };
}

/** Normalise a `listings` row into a CandidateProperty. */
export function normalizeListingRow(row: Record<string, unknown>): CandidateProperty {
  const num = (v: unknown) => (v == null || v === '' ? null : Number(v));
  const sqm = num(row.size) ?? (num(row.sqft) != null ? Math.round((num(row.sqft) as number) * 0.0929) : null);
  const amenities = Array.isArray(row.amenities) ? (row.amenities as string[]).filter(Boolean) : [];
  const images = Array.isArray(row.images) ? (row.images as string[]) : [];
  return {
    id: String(row.id),
    source: 'listings',
    slug: (row.slug as string) || null,
    title: (row.title as string) || 'Untitled property',
    purpose: (row.purpose as string) || null,
    category: normalizeCategory((row.property_category as string) || null),
    propertyType: (row.property_type as string) || null,
    subType: (row.sub_type as string) || null,
    price: num(row.price),
    currency: (row.currency as string) || null,
    bedrooms: num(row.bedrooms),
    bathrooms: num(row.bathrooms),
    sizeSqm: sqm,
    landSize: num(row.land_size),
    neighbourhood: (row.neighbourhood as string) || null,
    location: (row.location as string) || null,
    address: (row.address as string) || null,
    furnished: resolveFurnishing((row.furnished_status as string) || null, (row.title as string) || null),
    amenities,
    image: (row.main_image as string) || images[0] || null,
    status: (row.status as string) || null,
    isPublished: row.is_published === true,
    agentId: (row.agent_id as string) || null,
    lat: num(row.latitude) ?? areaCentreFor((row.neighbourhood as string) || null, (row.location as string) || null, (row.address as string) || null)?.lat ?? null,
    lng: num(row.longitude) ?? areaCentreFor((row.neighbourhood as string) || null, (row.location as string) || null, (row.address as string) || null)?.lng ?? null,
  };
}

/** Normalise a `land_listings` row into a CandidateProperty. */
export function normalizeLandRow(row: Record<string, unknown>): CandidateProperty {
  const num = (v: unknown) => (v == null || v === '' ? null : Number(v));
  const images = Array.isArray(row.images) ? (row.images as string[]) : [];
  return {
    id: String(row.id),
    source: 'land_listings',
    slug: (row.slug as string) || null,
    title: (row.title as string) || 'Untitled land',
    purpose: 'sale',
    category: 'land',
    propertyType: 'land',
    subType: (row.land_type as string) || (row.sub_type as string) || null,
    price: num(row.asking_price),
    currency: (row.currency as string) || null,
    bedrooms: null,
    bathrooms: null,
    sizeSqm: null,
    landSize: num(row.acreage) ?? num(row.plot_size),
    neighbourhood: (row.neighbourhood as string) || null,
    location: (row.location as string) || null,
    address: (row.address as string) || null,
    furnished: null,
    amenities: [],
    image: (row.main_image as string) || images[0] || null,
    status: (row.status as string) || null,
    isPublished: row.is_published === true,
    agentId: (row.agent_id as string) || null,
    lat: num(row.latitude) ?? areaCentreFor((row.neighbourhood as string) || null, (row.location as string) || null, (row.address as string) || null)?.lat ?? null,
    lng: num(row.longitude) ?? areaCentreFor((row.neighbourhood as string) || null, (row.location as string) || null, (row.address as string) || null)?.lng ?? null,
  };
}