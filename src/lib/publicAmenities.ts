/**
 * publicAmenities - THE single authoritative definition of a "PUBLIC AMENITY".
 *
 * Every public surface that shows a place / business / school - the Directory,
 * a Directory category page, Schools, Night Life, the Neighbourhood "Around
 * Here" section, "Life Around Here", individual Place pages and any search /
 * filter that reads the directory - MUST derive its visibility from this
 * module. No page may invent its own publication rule, because that is exactly
 * how the Amenities back-office and the public site drift apart.
 *
 * THE RULE
 * --------
 * An amenity is publicly discoverable when ALL of the following hold:
 *   is_published = true
 *   AND deleted_at IS NULL          (Recycle Bin items are NEVER public)
 *   AND it is NOT archived          (attributes->>is_archived IS NULL)
 *
 * This mirrors the management console exactly: the admin's "Published" view
 * shows `is_published = true AND deleted_at IS NULL AND is_archived IS NULL`,
 * so the public site now shows precisely the same set of records - no more
 * recycling-bin leftovers leaking onto pages, and no silently hidden drafts.
 *
 * Archived is stored on the place's `attributes` jsonb (`is_archived: true`),
 * kept deliberately separate from Draft / Unpublished. Because the row is
 * written with a missing key when un-archived, `attributes->>is_archived IS
 * NULL` is the correct "not archived" test.
 */

import { supabase } from '@/lib/supabase';
import { smartTitleCase } from '@/lib/location';
import type { Amenity } from '@/lib/amenities';

/** The shared directory table. */
export const AMENITY_TABLE = 'amenities';

/**
 * Rows are read in pages so a single unbounded select (silently capped at
 * ~1000 rows) can never drop part of a large directory.
 */
export const PUBLIC_AMENITY_PAGE_SIZE = 1000;

/**
 * Apply the canonical public-visibility predicate to any amenities query.
 * Works on a fresh `supabase.from('amenities')` builder or one that already
 * carries `.select()` / `.eq()` filters, and returns the same builder so
 * `.order()` / `.range()` / `.maybeSingle()` can still be chained.
 */
export function applyPublicAmenityVisibility<T>(query: T): T {
  const q = query as unknown as {
    eq: (column: string, value: boolean) => unknown;
    is: (column: string, value: null) => unknown;
  };
  return q
    .eq('is_published', true)
    .is('deleted_at', null)
    .is('attributes->>is_archived', null) as unknown as T;
}

/**
 * Normalise a place's DISPLAY text (name / address / neighbourhood) so every
 * public surface shows the same casing everywhere.
 *
 * Only shouty ALL-CAPS or all-lowercase values are transformed - correctly-cased
 * names (e.g. "K1 Klub House") are returned untouched, so nothing is mangled.
 */
export function normalizeAmenityRow(a: Amenity): Amenity {
  return {
    ...a,
    name: smartTitleCase(a.name) || a.name,
    address: a.address ? smartTitleCase(a.address) : a.address,
    neighbourhood_name: a.neighbourhood_name
      ? smartTitleCase(a.neighbourhood_name)
      : a.neighbourhood_name,
  };
}

/**
 * Fetch every published amenity (optionally narrowed by type / category /
 * neighbourhood), paging through the whole result set. This is the one reader
 * the public directory hook uses, so all public surfaces stay in lock-step.
 */
export async function fetchPublicAmenities(filters?: {
  type?: string;
  category?: string;
  neighbourhoodId?: string;
  neighbourhoodName?: string;
}): Promise<Amenity[]> {
  const all: Amenity[] = [];
  for (let from = 0; ; from += PUBLIC_AMENITY_PAGE_SIZE) {
    let query = applyPublicAmenityVisibility(supabase.from(AMENITY_TABLE).select('*'))
      .order('is_featured', { ascending: false })
      .order('name', { ascending: true })
      .range(from, from + PUBLIC_AMENITY_PAGE_SIZE - 1);

    if (filters?.type) query = query.eq('type', filters.type);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.neighbourhoodId) query = query.eq('neighbourhood_id', filters.neighbourhoodId);
    else if (filters?.neighbourhoodName) query = query.eq('neighbourhood_name', filters.neighbourhoodName);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []) as Amenity[];
    all.push(...rows.map(normalizeAmenityRow));
    if (rows.length < PUBLIC_AMENITY_PAGE_SIZE) break;
  }
  return all;
}