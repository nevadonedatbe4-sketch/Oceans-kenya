/**
 * publicListings - THE single authoritative definition of a "PUBLIC LISTING".
 *
 * Every public surface (Buy, Rent, Land, Commercial, New Developments, area /
 * location pages, SEO landing pages, map results, homepage rails, "recently
 * viewed" rails, prev/next nav, sitemap) MUST derive its visibility from this
 * module. Pages must never invent their own publication criteria - that is how
 * the back-office inventory and the public search index drifted apart.
 *
 * THE RULE
 * --------
 * A listing is publicly discoverable when:
 *   is_published = true
 *   AND status is NOT one of the explicitly non-public lifecycle states
 *   AND it has a title
 *
 * This is deliberately a DENYLIST. A listing is only hidden when it has been
 * EXPLICITLY withdrawn (draft / unpublished / archived / withdrawn / deleted /
 * sold). Any other live status - including historical or newly introduced
 * labels such as `published` or `available` - is treated as discoverable.
 *
 * The old behaviour used an ALLOWLIST (`.in('status', ['available',
 * 'under_contract'])`). That silently dropped every listing saved with a
 * different live label (e.g. `published`) and is the exact reason the public
 * Land inventory showed 13 while the dashboard showed 21.
 */

/** The shared, read-only public listings view. */
export const PUBLIC_LISTING_TABLE = 'all_listings';

/** The database column carrying the coarse category ('land', 'residential', …). */
export const PUBLIC_CATEGORY_COLUMN = 'property_category';

/**
 * Lifecycle states that are NEVER publicly discoverable. Anything NOT in this
 * list is public, provided the row is published. Keep this list to states that
 * genuinely mean "do not show this publicly".
 */
export const NON_PUBLIC_STATUSES = [
  'draft',
  'unpublished',
  'archived',
  'withdrawn',
  'deleted',
  'sold',
] as const;

/**
 * Same as NON_PUBLIC_STATUSES but WITHOUT 'sold'. Used by "browse everything"
 * scopes where a recently-sold home may still be worth showing.
 */
export const NON_LIVE_STATUSES = [
  'draft',
  'unpublished',
  'archived',
  'withdrawn',
  'deleted',
] as const;

export type StatusScope = 'active' | 'available' | 'all';

/**
 * A ready-to-use PostgREST `in` list of non-public statuses, for the few places
 * that must express the rule inline (e.g. single-row maybeSingle chains) rather
 * than through a mutable query variable.
 */
export const NON_PUBLIC_STATUS_LIST = `(${NON_PUBLIC_STATUSES.join(',')})`;

/**
 * Apply the status portion of the public-visibility rule.
 *
 *  - 'active'    → everything except the explicitly non-public states
 *                  (this is the default and what every public page needs).
 *  - 'available' → strictly status = 'available' (used only when a surface
 *                  genuinely wants the single "available" label).
 *  - 'all'       → everything except drafts/withdrawn (sold may still show).
 */
export function applyStatusScope<T>(query: T, scope: StatusScope = 'active'): T {
  const q = query as unknown as {
    eq: (c: string, v: string) => unknown;
    not: (c: string, op: string, v: string) => unknown;
  };
  if (scope === 'available') {
    return q.eq('status', 'available') as unknown as T;
  }
  if (scope === 'all') {
    return q.not('status', 'in', `(${NON_LIVE_STATUSES.join(',')})`) as unknown as T;
  }
  return q.not('status', 'in', `(${NON_PUBLIC_STATUSES.join(',')})`) as unknown as T;
}

/**
 * Apply the FULL canonical public-visibility predicate:
 *   is_published = true  AND  status is a live state.
 *
 * Note: price is INTENTIONALLY not a constraint. A published listing with a
 * missing/zero price ("Price on request") is still a real, discoverable
 * listing - hiding it for an incomplete optional field is forbidden.
 */
export function applyPublicVisibility<T>(query: T, scope: StatusScope = 'active'): T {
  const q = applyStatusScope(query, scope) as unknown as { eq: (c: string, v: boolean) => unknown };
  return q.eq('is_published', true) as unknown as T;
}

/**
 * Map a legacy per-page `statusFilter` string onto the canonical scope so all
 * existing callers keep working while sharing ONE definition.
 */
export function statusScopeFromFilter(filter: string | undefined | null): StatusScope {
  if (filter === 'available') return 'available';
  if (filter === 'all') return 'all';
  return 'active';
}

/**
 * The canonical property-type list (matches listings.property_type values).
 * Kept here so the dropdown, the natural-language parser and the SEO pages all
 * agree on one vocabulary.
 */
export const PUBLIC_PROPERTY_TYPES = [
  'house',
  'bungalow',
  'villa',
  'townhouse',
  'apartment',
  'penthouse',
  'maisonette',
  'studio_flat',
  'detached',
  'semi_detached',
  'land',
  'office',
  'retail_shop',
  'warehouse',
  'industrial',
  'guest_house',
] as const;

/** Property types that belong to each category - used for dependent filters. */
export const LAND_PROPERTY_TYPES = ['land'] as const;
export const COMMERCIAL_PROPERTY_TYPES = ['office', 'retail_shop', 'warehouse', 'industrial', 'guest_house'] as const;
export const RESIDENTIAL_PROPERTY_TYPES = [
  'house',
  'bungalow',
  'villa',
  'townhouse',
  'apartment',
  'penthouse',
  'maisonette',
  'studio_flat',
  'detached',
  'semi_detached',
] as const;

/**
 * Filters that only make sense for LAND listings. Bedrooms / bathrooms /
 * reception rooms must never drive a Land result (item 11 of the spec) - and
 * equally, land-only refinements must not be offered for houses.
 */
export const LAND_ONLY_FILTER_KEYS = ['landSize', 'tenure', 'zoning', 'roadAccess', 'utilities', 'developmentPotential'] as const;
export const RESIDENTIAL_ONLY_FILTER_KEYS = ['bedrooms', 'bathrooms', 'receptionRooms'] as const;

/** True when the given values are all land (so we can hide residential filters). */
export function isLandOnlySelection(types: string[]): boolean {
  return types.length > 0 && types.every((t) => t === 'land');
}

/** True when the selection contains at least one non-land type. */
export function hasResidentialSelection(types: string[]): boolean {
  return types.some((t) => t !== 'land');
}