/**
 * Client Requests — shared taxonomy + display metadata.
 *
 * ONE source of truth for every dropdown, label, badge colour and status used
 * by the Client Request → Property Matching system (admin AND agent portals).
 * Reuses the platform's existing property vocabulary (publicListings /
 * propertyType) so a client request can never introduce a duplicate value that
 * no real listing uses.
 */

import { PUBLIC_PROPERTY_TYPES, RESIDENTIAL_PROPERTY_TYPES, COMMERCIAL_PROPERTY_TYPES } from '@/lib/publicListings';

/* ── Transaction types ── */

export type TransactionType = 'buy' | 'rent' | 'lease' | 'joint_venture' | 'investment';

export const TRANSACTION_TYPES: { value: TransactionType; label: string; purpose: string | null }[] = [
  { value: 'buy', label: 'Buy', purpose: 'sale' },
  { value: 'rent', label: 'Rent', purpose: 'rent' },
  { value: 'lease', label: 'Lease', purpose: 'rent' },
  { value: 'investment', label: 'Investment', purpose: 'sale' },
  { value: 'joint_venture', label: 'Joint Venture', purpose: null },
];

export function purposeForTransaction(tx: string | null | undefined): string | null {
  return TRANSACTION_TYPES.find((t) => t.value === tx)?.purpose ?? null;
}

export function transactionLabel(tx: string | null | undefined): string {
  return TRANSACTION_TYPES.find((t) => t.value === tx)?.label ?? 'Buy';
}

/* ── Property categories ── */

export type PropertyCategory = 'residential' | 'commercial' | 'land' | 'new_development' | 'joint_venture';

export const PROPERTY_CATEGORIES: { value: PropertyCategory; label: string }[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land', label: 'Land' },
  { value: 'new_development', label: 'New Development' },
  { value: 'joint_venture', label: 'Joint Venture' },
];

export function categoryLabel(cat: string | null | undefined): string {
  return PROPERTY_CATEGORIES.find((c) => c.value === cat)?.label ?? 'Residential';
}

/** Normalise a category to the value the matching engine compares on. */
export function normalizeCategory(cat: string | null | undefined): PropertyCategory {
  if (cat === 'development') return 'new_development';
  if (cat && (PROPERTY_CATEGORIES as { value: string }[]).some((c) => c.value === cat)) {
    return cat as PropertyCategory;
  }
  return 'residential';
}

/* ── Property subtypes (reuse the platform's canonical property types) ── */

export const PROPERTY_SUBTYPES = PUBLIC_PROPERTY_TYPES.map((t) => ({
  value: t,
  label: t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
}));

/**
 * The property types that make sense for each category. Client requests use
 * this to offer only relevant types (a commercial request never offers
 * "bungalow") while still allowing an agent to add a custom type by hand.
 */
export const PROPERTY_TYPES_BY_CATEGORY: Record<PropertyCategory, string[]> = {
  residential: [...RESIDENTIAL_PROPERTY_TYPES],
  commercial: [...COMMERCIAL_PROPERTY_TYPES],
  land: ['land'],
  new_development: [...RESIDENTIAL_PROPERTY_TYPES],
  joint_venture: [...RESIDENTIAL_PROPERTY_TYPES],
};

/** Human label for a canonical or custom type value, e.g. "semi_detached" → "Semi Detached". */
export function typeLabel(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function subtypeLabel(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Furnishing ── */

export type FurnishingValue = 'any' | 'furnished' | 'semi' | 'unfurnished';

/** Legacy single-select values (kept for backwards compatibility). */
export const FURNISHING_OPTIONS: { value: FurnishingValue; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'furnished', label: 'Furnished' },
  { value: 'semi', label: 'Semi Furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
];

/**
 * The furnishing states a client can accept, offered as INDEPENDENT toggles
 * (any combination may be ticked). Values are canonical; they are matched
 * against the variety of free-text furnishing labels real listings carry
 * ("Furnished", "Fully Furnished", "Semi Furnished", "Unfurnished").
 */
export type FurnishingState = 'furnished' | 'semi_furnished' | 'fully_furnished' | 'unfurnished';

export const FURNISHING_STATES: { value: FurnishingState; label: string }[] = [
  { value: 'furnished', label: 'Furnished' },
  { value: 'semi_furnished', label: 'Semi Furnished' },
  { value: 'fully_furnished', label: 'Fully Furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
];

/** Human label for a canonical furnishing state (falls back to a tidy title). */
export function furnishingStateLabel(value: string | null | undefined): string {
  if (!value) return '';
  return FURNISHING_STATES.find((f) => f.value === value)?.label ?? typeLabel(value);
}

/**
 * Does a listing's stored furnishing text satisfy ANY of the client's chosen
 * states? Independent toggles: ticking more states widens the acceptable set.
 * Missing furnishing data on the listing is never a pass (handled by caller).
 */
export function furnishingMatchesAny(
  selected: string[] | null | undefined,
  actual: string | null | undefined,
): boolean {
  const sel = (selected || []).filter(Boolean);
  if (sel.length === 0) return true;
  const a = (actual || '').trim().toLowerCase();
  if (!a) return false;
  return sel.some((s) => {
    switch (s) {
      case 'furnished':
        return a.includes('furnished') && !a.includes('unfurnished') && !a.includes('semi');
      case 'fully_furnished':
        return a.includes('fully');
      case 'semi_furnished':
      case 'semi':
        return a.includes('semi');
      case 'unfurnished':
        return a.includes('unfurnished');
      default:
        return a.includes(s.toLowerCase());
    }
  });
}

/* ── Request status ── */

export type RequestStatus =
  | 'new'
  | 'matching'
  | 'shared'
  | 'viewing'
  | 'offer'
  | 'fulfilled'
  | 'on_hold'
  | 'closed'
  | 'cancelled';

export const REQUEST_STATUSES: { value: RequestStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'matching', label: 'Matching' },
  { value: 'shared', label: 'Shared with Client' },
  { value: 'viewing', label: 'Viewing' },
  { value: 'offer', label: 'Offer / Reservation' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const STATUS_META: Record<string, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-sky-100 text-sky-800' },
  matching: { label: 'Matching', className: 'bg-[#00ddb4]/15 text-[#0f766e]' },
  shared: { label: 'Shared', className: 'bg-indigo-100 text-indigo-800' },
  viewing: { label: 'Viewing', className: 'bg-amber-100 text-amber-800' },
  offer: { label: 'Offer', className: 'bg-orange-100 text-orange-800' },
  fulfilled: { label: 'Fulfilled', className: 'bg-emerald-100 text-emerald-800' },
  on_hold: { label: 'On Hold', className: 'bg-slate-200 text-slate-700' },
  closed: { label: 'Closed', className: 'bg-slate-200 text-slate-600' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
};

export function statusMeta(status: string | null | undefined) {
  return STATUS_META[status || 'new'] || STATUS_META.new;
}

/** Requests in these states are still "open" and appear in active work lists. */
export const OPEN_STATUSES: RequestStatus[] = ['new', 'matching', 'shared', 'viewing', 'offer', 'on_hold'];

/* ── Priority ── */

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const PRIORITY_META: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-slate-100 text-slate-600' },
  normal: { label: 'Normal', className: 'bg-slate-100 text-slate-700' },
  high: { label: 'High', className: 'bg-amber-100 text-amber-800' },
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700' },
};

export function priorityMeta(priority: string | null | undefined) {
  return PRIORITY_META[priority || 'normal'] || PRIORITY_META.normal;
}

/* ── Source ── */

export const REQUEST_SOURCES = [
  { value: 'website', label: 'Website Enquiry' },
  { value: 'referral', label: 'Referral' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'existing_client', label: 'Existing Client' },
  { value: 'manual', label: 'Manual' },
];

export function sourceLabel(source: string | null | undefined): string {
  return REQUEST_SOURCES.find((s) => s.value === source)?.label ?? 'Manual';
}

/* ── Contact methods ── */

export const CONTACT_METHODS = [
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
];

/* ── Hard criterion keys ── */

export const HARD_CRITERIA_OPTIONS: { value: string; label: string }[] = [
  { value: 'transaction', label: 'Transaction type' },
  { value: 'category', label: 'Property category' },
  { value: 'subtype', label: 'Property subtype' },
  { value: 'location', label: 'Location(s)' },
  { value: 'budget', label: 'Maximum budget' },
  { value: 'bedrooms', label: 'Bedrooms' },
  { value: 'furnishing', label: 'Furnishing' },
  { value: 'availability', label: 'Availability' },
];

/**
 * A request is "unassigned" when it has no assigned agent.
 * "Overdue" when its next follow-up is in the past and it is still open.
 */
export function isOverdue(nextFollowUpAt: string | null | undefined, status: string | null | undefined): boolean {
  if (!nextFollowUpAt) return false;
  if (!OPEN_STATUSES.includes((status || 'new') as RequestStatus)) return false;
  return new Date(nextFollowUpAt).getTime() < Date.now();
}

/**
 * A still-open request that the engine has computed but found NO available
 * matches for. Requests never computed (match_count === null) are excluded so
 * the count never reports a false "unmatched" signal for untouched records.
 */
export function hasNoMatches(r: {
  match_count?: number | null;
  status?: string | null;
}): boolean {
  return OPEN_STATUSES.includes((r.status || 'new') as RequestStatus) && r.match_count === 0;
}