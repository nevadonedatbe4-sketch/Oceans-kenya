/**
 * microGuides - the reusable engine behind the scalable "Best of" micro-guides
 * ("Best Cafés in Kilimani", "Best Gyms & Fitness in Lavington", "Best
 * Restaurants in Nairobi").
 *
 * A micro-guide is just a blog post (article_type = 'micro_guide') carrying a
 * small, CMS-editable config:
 *   • guide_area        - the neighbourhood it is about (null = Nairobi-wide)
 *   • guide_categories  - the directory categories to draw from (e.g. dining)
 *   • guide_match       - the subcategory keys OR best_for tags that qualify a
 *                         place (e.g. cafe/coffee, or gym/fitness_studio)
 *
 * Nothing is hardcoded and nothing is invented: the engine simply filters the
 * SAME real, curated `amenities` records the directory is built from, so one
 * content system powers hundreds of pages and every edit in the CMS updates
 * them live.
 */

import type { GuidePlace } from '@/lib/guidePlaces';
import { areaNameBelongsTo } from '@/lib/locationRegistry';

export interface MicroGuideConfig {
  /** Neighbourhood the guide covers, or null for a city-wide guide. */
  area: string | null;
  /** Directory category slugs to include (empty = any category). */
  categories: string[];
  /** Subcategory keys or best_for tags that qualify a place (empty = all). */
  match: string[];
}

/** Normalise a text[] column into clean, lowercased tokens. */
function cleanTokens(arr?: string[] | null): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => (s || '').trim().toLowerCase()).filter(Boolean);
}

/** Build the runtime config from the raw blog_posts row fields. */
export function resolveMicroGuideConfig(row: {
  guide_area?: string | null;
  guide_categories?: string[] | null;
  guide_match?: string[] | null;
}): MicroGuideConfig {
  return {
    area: (row.guide_area || '').trim() || null,
    categories: cleanTokens(row.guide_categories),
    match: cleanTokens(row.guide_match),
  };
}

/** True when this config is a city-wide guide (no specific area). */
export function microGuideIsCity(config: MicroGuideConfig): boolean {
  return !config.area;
}

function placeInArea(place: GuidePlace, area: string): boolean {
  if (!place.area) return false;
  return areaNameBelongsTo(place.area, area) || place.area.toLowerCase() === area.toLowerCase();
}

function matchesTerms(place: GuidePlace, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const tagTokens = [place.subcategory, ...place.bestFor]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  // The verified cuisine is free text ("Italian / Continental", "Brazilian
  // Steakhouse", "Swahili / Seafood"), so tokenise it on non-alphanumerics and
  // match each word. This is what lets a cuisine-led guide ("Best Italian...")
  // be driven by the real cuisine column instead of guesswork.
  const cuisineTokens = (place.cuisine || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const haystack = [...tagTokens, ...cuisineTokens];
  return terms.some((t) => haystack.includes(t));
}

/**
 * Filter the curated places down to exactly the ones this micro-guide is about.
 * A place qualifies when: its category is allowed, it sits in the guide's area
 * (if the guide is area-scoped), AND it matches one of the subcategory/tag terms.
 * Missing data never qualifies a place, so the list can never be padded with
 * unrelated venues.
 */
export function filterMicroGuidePlaces(places: GuidePlace[], config: MicroGuideConfig): GuidePlace[] {
  return places
    .filter((p) => {
      if (config.categories.length > 0 && !(p.category && config.categories.includes(p.category.toLowerCase()))) {
        return false;
      }
      if (config.area && !placeInArea(p, config.area)) return false;
      if (!matchesTerms(p, config.match)) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/** The distinct areas present across a set of places, most-populated first. */
export function areasPresentInPlaces(places: GuidePlace[]): string[] {
  const counts = new Map<string, number>();
  places.forEach((p) => {
    if (p.area) counts.set(p.area, (counts.get(p.area) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}