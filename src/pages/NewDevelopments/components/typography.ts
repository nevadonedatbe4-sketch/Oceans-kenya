import { smartTitleCase } from '@/lib/location';

/**
 * Presentation-layer typography helpers for the /new-developments surface.
 *
 * These only NORMALISE how backend content is displayed (case, pluralisation).
 * They never rewrite or fabricate the underlying data - item data is passed
 * through unchanged.
 */

/** Detect whether a string is fully uppercase (ignoring non-letters). */
function isAllCaps(input: string): boolean {
  const letters = input.replace(/[^a-zA-Z]/g, '');
  if (!letters.length) return false;
  const upperCount = letters.replace(/[^A-Z]/g, '').length;
  return upperCount === letters.length;
}

/**
 * Convert development / project names into clean Title Case.
 * "DIANI GATED STUDIOS" -> "Diani Gated Studios".
 * "diani gated studios" -> "Diani Gated Studios".
 * Already-correctly-cased content is returned untouched.
 *
 * Delegates to the shared normaliser so development names match the CRM.
 */
export function titleCase(input: string): string {
  if (!input) return input;
  return smartTitleCase(input.trim());
}

/**
 * Convert fully-uppercase description text into natural sentence case.
 * "BOUTIQUE COASTAL DEVELOPMENT..." -> "Boutique coastal development...".
 * Mixed-case / already-sentence content is returned untouched.
 */
export function sentenceCase(input: string): string {
  if (!input) return input;
  const trimmed = input.trim();
  if (!isAllCaps(trimmed)) return trimmed;
  const lowered = trimmed.toLowerCase();
  return lowered.replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (m) => m.toUpperCase());
}

/** Grammar-safe count: 1 Bath / 2 Baths, 1 Bed / 2 Beds, 1 Parking space / 2 Parking spaces. */
export function pluralCount(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}