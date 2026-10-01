import { smartTitleCase } from '@/lib/location';

/**
 * toTitleCase - normalise casing for property / land / development / JV titles.
 *
 * Delegates to the single shared normaliser (smartTitleCase) so every surface
 * behaves identically: ALL-CAPS and all-lowercase names become clean Title
 * Case, while already-correctly-cased names are left untouched.
 */
export function toTitleCase(input: string): string {
  return smartTitleCase(input);
}