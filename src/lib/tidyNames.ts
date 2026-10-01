import { supabase } from '@/lib/supabase';
import { smartTitleCase } from '@/lib/location';
import { broadcastSync } from '@/lib/syncEngine';

/**
 * tidyNames — the single "Tidy all names" maintenance routine.
 *
 * It rewrites shouty stored values (ALL CAPS / all-lowercase / messy spacing)
 * into clean Title Case AT THE SOURCE, using the exact same shared normaliser
 * (smartTitleCase) that every display surface already uses. Correctly-cased
 * values are never touched, so running it twice is safe (idempotent).
 *
 * Only the columns that hold a human-readable NAME / TITLE are touched — never
 * slugs, keys, ids, emails or any other machine value.
 */

export interface TidyFieldResult {
  key: string;
  label: string;
  scanned: number;
  updated: number;
  error?: string;
}

export interface TidyReport {
  totalScanned: number;
  totalUpdated: number;
  fields: TidyFieldResult[];
}

interface TextTarget {
  table: string;
  column: string;
  label: string;
}

/** Every name/title column that should read consistently across the site. */
const TEXT_TARGETS: TextTarget[] = [
  { table: 'listings', column: 'title', label: 'Property titles' },
  { table: 'listings', column: 'neighbourhood', label: 'Property neighbourhoods' },
  { table: 'developments', column: 'title', label: 'Development titles' },
  { table: 'developments', column: 'neighbourhood', label: 'Development neighbourhoods' },
  { table: 'land_listings', column: 'title', label: 'Land listing titles' },
  { table: 'land_listings', column: 'neighbourhood', label: 'Land neighbourhoods' },
  { table: 'jv_projects', column: 'title', label: 'JV project titles' },
  { table: 'neighbourhoods', column: 'name', label: 'Neighbourhood names' },
  { table: 'amenities', column: 'name', label: 'Place & service names' },
  { table: 'amenity_categories', column: 'name', label: 'Amenity category names' },
  { table: 'blog_posts', column: 'title', label: 'Blog post titles' },
  { table: 'blog_posts', column: 'category', label: 'Blog categories' },
];

/** Return the tidied value, or null when nothing should change. */
function tidyValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const tidied = smartTitleCase(value);
  if (!tidied || tidied === value) return null;
  return tidied;
}

/** Tidy every row of a single text column, one row at a time. */
async function tidyTextColumn(target: TextTarget): Promise<TidyFieldResult> {
  const result: TidyFieldResult = {
    key: `${target.table}.${target.column}`,
    label: target.label,
    scanned: 0,
    updated: 0,
  };
  try {
    const { data, error } = await supabase.from(target.table).select(`id, ${target.column}`);
    if (error) {
      result.error = error.message;
      return result;
    }
    const rows = (data || []) as Record<string, unknown>[];
    result.scanned = rows.length;

    let updated = 0;
    for (const row of rows) {
      const next = tidyValue(row[target.column]);
      if (next == null) continue;
      const { error: updateError } = await supabase
        .from(target.table)
        .update({ [target.column]: next })
        .eq('id', row.id as string);
      if (!updateError) updated += 1;
    }
    result.updated = updated;
  } catch (err) {
    result.error = err instanceof Error ? err.message : 'Unknown error';
  }
  return result;
}

/**
 * Tidy the custom sub-category labels stored on amenity_categories.subcategories
 * (a jsonb array of { key, label }). Only the label text is rewritten; the key
 * is left untouched because it links places to their sub-category.
 */
async function tidySubcategoryLabels(): Promise<TidyFieldResult> {
  const result: TidyFieldResult = {
    key: 'amenity_categories.subcategories',
    label: 'Amenity sub-category names',
    scanned: 0,
    updated: 0,
  };
  try {
    const { data, error } = await supabase.from('amenity_categories').select('id, subcategories');
    if (error) {
      result.error = error.message;
      return result;
    }
    const rows = (data || []) as { id: string; subcategories: unknown }[];
    result.scanned = rows.length;

    let updated = 0;
    for (const row of rows) {
      if (!Array.isArray(row.subcategories)) continue;
      let changed = false;
      const next = (row.subcategories as Record<string, unknown>[]).map((sub) => {
        const original = typeof sub.label === 'string' ? sub.label : '';
        const tidied = smartTitleCase(original);
        if (tidied && tidied !== original) {
          changed = true;
          return { ...sub, label: tidied };
        }
        return sub;
      });
      if (!changed) continue;
      const { error: updateError } = await supabase
        .from('amenity_categories')
        .update({ subcategories: next })
        .eq('id', row.id);
      if (!updateError) updated += 1;
    }
    result.updated = updated;
  } catch (err) {
    result.error = err instanceof Error ? err.message : 'Unknown error';
  }
  return result;
}

/**
 * Run the tidy pass across every name/title column and return a per-field
 * report of what was scanned and how many rows were rewritten.
 */
export async function tidyAllNames(): Promise<TidyReport> {
  const fields: TidyFieldResult[] = [];
  for (const target of TEXT_TARGETS) {
    // Sequential on purpose: keeps the load on the database predictable.
    // eslint-disable-next-line no-await-in-loop
    fields.push(await tidyTextColumn(target));
  }
  fields.push(await tidySubcategoryLabels());

  const totalScanned = fields.reduce((sum, f) => sum + f.scanned, 0);
  const totalUpdated = fields.reduce((sum, f) => sum + f.updated, 0);

  if (totalUpdated > 0) broadcastSync();

  return { totalScanned, totalUpdated, fields };
}