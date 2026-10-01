import { supabase } from '@/lib/supabase';
import { broadcastSync } from '@/lib/syncEngine';
import {
  isBuiltinSubcategory,
  mergeSubcategories,
  subcategoryKeyForLabel,
  type AmenityCategoryRecord,
  type CustomSubcategory,
} from '@/lib/amenities';

/**
 * Places reference their category BOTH by the modern `category_id` and by the
 * legacy `category` slug, so every match has to consider both or a portion of
 * the directory silently slips through.
 */
function categoryOrFilter(cat: AmenityCategoryRecord): string {
  return cat.slug ? `category_id.eq.${cat.id},category.eq.${cat.slug}` : `category_id.eq.${cat.id}`;
}

// ─────────────────────────────────────────────────────────────
// Reads (place counts used by the delete decision step)
// ─────────────────────────────────────────────────────────────
export async function countPlacesInCategory(cat: AmenityCategoryRecord): Promise<number> {
  const { count, error } = await supabase
    .from('amenities')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .or(categoryOrFilter(cat));
  if (error) return 0;
  return count ?? 0;
}

export async function countPlacesInSubcategory(
  cat: AmenityCategoryRecord,
  key: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('amenities')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('subcategory', key)
    .or(categoryOrFilter(cat));
  if (error) return 0;
  return count ?? 0;
}

// ─────────────────────────────────────────────────────────────
// Category mutations
// ─────────────────────────────────────────────────────────────
export async function renameCategory(cat: AmenityCategoryRecord, name: string): Promise<boolean> {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const { error } = await supabase.from('amenity_categories').update({ name: trimmed }).eq('id', cat.id);
  if (error) return false;
  broadcastSync();
  return true;
}

/**
 * Delete a category. Callers MUST deal with its places first (move or unassign)
 * - the DB has no cascading rule, so leftover places would otherwise point at a
 * category that no longer exists.
 */
export async function deleteCategory(cat: AmenityCategoryRecord): Promise<boolean> {
  const { error } = await supabase.from('amenity_categories').delete().eq('id', cat.id);
  if (error) return false;
  broadcastSync();
  return true;
}

/**
 * Re-file every place from one category into another (or unassign it when `to`
 * is null). On a move, a place keeps its subcategory only if the target
 * category defines that same key; otherwise the subcategory is cleared so no
 * place ends up pointing at a subcategory the new category doesn't have.
 */
export async function moveCategoryPlaces(
  from: AmenityCategoryRecord,
  to: AmenityCategoryRecord | null,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('amenities')
    .select('id, subcategory')
    .is('deleted_at', null)
    .or(categoryOrFilter(from));

  if (error) return false;
  const rows = (data || []) as { id: string; subcategory: string | null }[];
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return true;

  if (!to) {
    const { error: unErr } = await supabase
      .from('amenities')
      .update({ category_id: null, category: null, subcategory: null })
      .in('id', ids);
    if (unErr) return false;
    broadcastSync();
    return true;
  }

  const { error: mvErr } = await supabase
    .from('amenities')
    .update({ category_id: to.id, category: to.slug })
    .in('id', ids);
  if (mvErr) return false;

  const keepKeys = new Set(mergeSubcategories(to.slug, to.subcategories).map((s) => s.key));
  const clearIds = rows
    .filter((r) => r.subcategory && !keepKeys.has(r.subcategory))
    .map((r) => r.id);
  if (clearIds.length) {
    await supabase.from('amenities').update({ subcategory: null }).in('id', clearIds);
  }

  broadcastSync();
  return true;
}

// ─────────────────────────────────────────────────────────────
// Subcategory mutations (stored on amenity_categories.subcategories)
// ─────────────────────────────────────────────────────────────
async function saveSubcategories(
  cat: AmenityCategoryRecord,
  next: CustomSubcategory[],
): Promise<boolean> {
  const { error } = await supabase
    .from('amenity_categories')
    .update({ subcategories: next })
    .eq('id', cat.id);
  if (error) return false;
  broadcastSync();
  return true;
}

/** Add a brand-new subcategory (or restore a previously hidden one). */
export async function addSubcategory(
  cat: AmenityCategoryRecord,
  label: string,
): Promise<{ ok: boolean; key: string }> {
  const key = subcategoryKeyForLabel(label);
  const current = Array.isArray(cat.subcategories) ? [...cat.subcategories] : [];
  const existing = current.find((s) => s.key === key);
  const next = existing
    ? current.map((s) => (s.key === key ? { ...s, label: label.trim(), hidden: false } : s))
    : [...current, { key, label: label.trim(), sort_order: current.length }];
  const ok = await saveSubcategories(cat, next);
  return { ok, key };
}

/** Rename a subcategory - works for custom AND built-in ones (via an override). */
export async function renameSubcategory(
  cat: AmenityCategoryRecord,
  key: string,
  label: string,
): Promise<boolean> {
  const trimmed = label.trim();
  if (!trimmed) return false;
  const current = Array.isArray(cat.subcategories) ? [...cat.subcategories] : [];
  const idx = current.findIndex((s) => s.key === key);
  const next = idx >= 0
    ? current.map((s) => (s.key === key ? { ...s, label: trimmed, hidden: false } : s))
    : [...current, { key, label: trimmed, sort_order: current.length }];
  return saveSubcategories(cat, next);
}

/**
 * Delete a subcategory. A custom one is removed from the list; a built-in one
 * (which lives in code) is hidden with a `hidden` marker so it disappears from
 * every dropdown without touching the built-in list.
 */
export async function deleteSubcategory(
  cat: AmenityCategoryRecord,
  key: string,
  label: string,
): Promise<boolean> {
  const current = Array.isArray(cat.subcategories) ? [...cat.subcategories] : [];
  let next: CustomSubcategory[];
  if (isBuiltinSubcategory(cat.slug, key)) {
    const idx = current.findIndex((s) => s.key === key);
    next = idx >= 0
      ? current.map((s) => (s.key === key ? { ...s, hidden: true } : s))
      : [...current, { key, label, hidden: true }];
  } else {
    next = current.filter((s) => s.key !== key);
  }
  return saveSubcategories(cat, next);
}

/**
 * Move every place filed under one subcategory to another subcategory of the
 * same category, or clear it (pass null) to leave them without a subcategory.
 */
export async function moveSubcategoryPlaces(
  cat: AmenityCategoryRecord,
  fromKey: string,
  toKey: string | null,
): Promise<boolean> {
  const { error } = await supabase
    .from('amenities')
    .update({ subcategory: toKey })
    .eq('subcategory', fromKey)
    .or(categoryOrFilter(cat));
  if (error) return false;
  broadcastSync();
  return true;
}