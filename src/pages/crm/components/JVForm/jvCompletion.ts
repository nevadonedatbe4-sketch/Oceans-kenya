/* Per-section completion helpers for the JV Land Listing form.
   Sections are considered "complete" once their core fields have values.
   Optional commercial/media sections stay neutral — they never force the
   submission to be treated as finished unless genuinely filled. */
import type { JVFormState } from './types';

export const isCompleteOverview = (s: JVFormState): boolean =>
  s.title.trim().length > 0 && s.status.trim().length > 0;

export const isCompleteLand = (s: JVFormState): boolean => {
  if (s.land_record_mode === 'link') return s.land_listing_id.trim().length > 0;
  // Manual mode needs the physical profile (size) plus a location.
  return Boolean(
    (s.land_size_value.trim() || s.land_size.trim()) &&
    (s.land_location.trim() || s.land_county.trim())
  );
};

export const isCompleteLandUse = (s: JVFormState): boolean =>
  s.land_primary_use.trim().length > 0;

export const isCompleteOwner = (s: JVFormState): boolean =>
  Boolean(s.owner_name.trim()) || Boolean(s.owner_phone.trim()) || Boolean(s.owner_email.trim());

export const isCompleteStructure = (s: JVFormState): boolean =>
  Boolean(s.deal_type.trim()) || Boolean(s.deal_structure.trim()) || Boolean(s.contribution_type.trim());

export const isCompleteCapital = (s: JVFormState): boolean =>
  Boolean(s.deal_currency.trim() || s.local_currency.trim() || s.capital_amount.trim()) ||
  Boolean(s.total_planned_units.trim() || s.consideration_type.trim());

export const isCompleteIntent = (s: JVFormState): boolean =>
  Boolean(s.project_type.trim()) || Boolean(s.timeline.trim());

export const isCompleteDevPayment = (s: JVFormState): boolean =>
  s.dev_payment_type === 'none' || Boolean(s.dev_payment_amount.trim() || s.dev_payment_frequency.trim());

export const isCompleteCommission = (s: JVFormState): boolean =>
  s.commission_structure === 'none' || Boolean(s.commission_structure.trim() && s.commission_payer.trim());

export const isCompleteContinuity = (s: JVFormState): boolean =>
  Boolean(s.source.trim() || s.continuity_type.trim() || s.source_detail_name.trim());

export const isCompletePricing = (s: JVFormState): boolean =>
  s.price_on_request || Boolean(s.price.trim());

export const isCompleteMedia = (s: JVFormState): boolean =>
  s.images.length > 0 || s.amenities.length > 0;

export function isCompleteAll(s: JVFormState): boolean {
  return (
    isCompleteOverview(s) &&
    isCompleteLand(s) &&
    isCompleteLandUse(s) &&
    isCompleteOwner(s) &&
    isCompleteStructure(s) &&
    isCompleteCapital(s) &&
    isCompleteIntent(s) &&
    isCompleteDevPayment(s) &&
    isCompleteCommission(s) &&
    isCompleteContinuity(s)
  );
}