/**
 * Property spec rows for cards.
 *
 * This module is now a thin, backwards-compatible façade over the property-type
 * framework (`src/lib/propertyType.ts`). Every existing caller keeps working,
 * but the facts returned are decided by the record's property type - a Land
 * card gets land facts, a Commercial card gets commercial facts, a Residential
 * card gets beds / baths / parking.
 *
 * Only values that actually exist are returned, so cards never render empty rows.
 */

import {
  buildCardFacts,
  resolvePropertyTypeKey,
  type CardFactValues,
  type PropertySpec,
  type PropertyTypeKey,
} from '@/lib/propertyType';

export type { PropertySpec } from '@/lib/propertyType';

/** Backwards-compatible kind alias (now the full property-type key). */
export type PropertyKind = PropertyTypeKey;

/** Values a card can supply when asking for its facts. */
export type PropertySpecValues = CardFactValues;

/**
 * Resolve the property kind for a record/type string.
 * Prefer `resolvePropertyTypeKey` from the framework for new code, which also
 * understands Joint Venture and New Development.
 */
export function getPropertyKind(propertyType?: string | null): PropertyKind {
  return resolvePropertyTypeKey(propertyType);
}

/**
 * Return the compact fact list for a card, driven by the property type.
 * The first argument may be a bare property-type string, or a fuller input
 * object when the caller also knows the category / sub-type.
 */
export function getPropertySpecs(
  propertyType: string | null | undefined,
  values: PropertySpecValues = {},
): PropertySpec[] {
  return buildCardFacts(resolvePropertyTypeKey(propertyType), values);
}

/** Full classifier for callers that know more than just the type string. */
export function getPropertyKindFromInput(input: {
  propertyType?: string | null;
  propertyCategory?: string | null;
  subType?: string | null;
  isNewDevelopment?: boolean | null;
  isJointVenture?: boolean | null;
}): PropertyKind {
  return resolvePropertyTypeKey(input);
}