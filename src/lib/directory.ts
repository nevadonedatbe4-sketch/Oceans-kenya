import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';

/**
 * Split an array into fixed-size batches.
 * PostgREST puts `.in('id', [...])` ids inside the request URL, so a selection
 * of ~1000 ids builds a URL far larger than the server's header limit and the
 * whole request gets rejected. Batching keeps every request small and reliable
 * no matter how many rows the user selects.
 */
const BULK_CHUNK_SIZE = 200;
function chunk<T>(arr: T[], size: number = BULK_CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface AmenityFolder {
  id: string;
  name: string;
  slug: string | null;
  color: string | null;
  icon: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AmenityReview {
  id: string;
  amenity_id: string;
  rating: number;
  review_text: string | null;
  reviewer_name: string | null;
  reviewer_email: string | null;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'hidden' | string;
  created_at: string;
}

export interface ActivityEntry {
  id: string;
  amenity_id: string | null;
  action: string;
  note: string | null;
  actor: string | null;
  created_at: string;
}

export type FlagReason =
  | 'No longer exists'
  | 'Permanently closed'
  | 'Moved'
  | 'Duplicate'
  | 'Incorrect information'
  | 'Needs verification'
  | 'Wrong category'
  | 'Other';

export const FLAG_REASONS: FlagReason[] = [
  'No longer exists',
  'Permanently closed',
  'Moved',
  'Duplicate',
  'Incorrect information',
  'Needs verification',
  'Wrong category',
  'Other',
];

// ─────────────────────────────────────────────────────────────
// Activity log
// ─────────────────────────────────────────────────────────────
export async function logActivity(amenityId: string | null, action: string, note?: string): Promise<void> {
  try {
    await supabase.from('amenity_activity_log').insert({
      amenity_id: amenityId,
      action,
      note: note || null,
      actor: 'Admin',
    });
  } catch {
    // Non-fatal: logging must never break an admin action.
  }
}

// ─────────────────────────────────────────────────────────────
// Folders
// ─────────────────────────────────────────────────────────────
export async function fetchFolders(): Promise<AmenityFolder[]> {
  const { data, error } = await supabase
    .from('amenity_folders')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    addToast('Failed to load folders', 'error');
    return [];
  }
  return (data || []) as AmenityFolder[];
}

export async function createFolder(name: string): Promise<AmenityFolder | null> {
  const { data, error } = await supabase
    .from('amenity_folders')
    .insert({ name, icon: 'ri-folder-2-line' })
    .select('*')
    .single();
  if (error) {
    addToast('Could not create folder', 'error');
    return null;
  }
  return data as AmenityFolder;
}

export async function renameFolder(id: string, name: string): Promise<boolean> {
  const { error } = await supabase.from('amenity_folders').update({ name }).eq('id', id);
  if (error) {
    addToast('Could not rename folder', 'error');
    return false;
  }
  return true;
}

export async function deleteFolder(id: string): Promise<boolean> {
  const { error } = await supabase.from('amenity_folders').delete().eq('id', id);
  if (error) {
    addToast('Could not delete folder', 'error');
    return false;
  }
  return true;
}

/** Fetch all amenity ids that belong to a folder. */
export async function fetchFolderAmenityIds(folderId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('amenity_folder_items')
    .select('amenity_id')
    .eq('folder_id', folderId);
  if (error) return [];
  return ((data || []) as { amenity_id: string }[]).map((r) => r.amenity_id);
}

/** Add amenities to a folder (idempotent). */
export async function addToFolder(folderId: string, amenityIds: string[]): Promise<number> {
  if (!amenityIds.length) return 0;
  const rows = amenityIds.map((id) => ({ folder_id: folderId, amenity_id: id }));
  const { error } = await supabase.from('amenity_folder_items').upsert(rows, { onConflict: 'folder_id,amenity_id' });
  if (error) {
    addToast('Could not move places into folder', 'error');
    return 0;
  }
  return amenityIds.length;
}

/** Remove amenities from a folder. */
export async function removeFromFolder(folderId: string, amenityIds: string[]): Promise<boolean> {
  if (!amenityIds.length) return true;
  for (const batch of chunk(amenityIds)) {
    const { error } = await supabase
      .from('amenity_folder_items')
      .delete()
      .eq('folder_id', folderId)
      .in('amenity_id', batch);
    if (error) {
      addToast('Could not remove from folder', 'error');
      return false;
    }
  }
  return true;
}

/** Fetch the comma/array of folders a single place belongs to (for detail view). */
export async function fetchAmenityFolders(amenityId: string): Promise<AmenityFolder[]> {
  const { data, error } = await supabase
    .from('amenity_folder_items')
    .select('folder_id')
    .eq('amenity_id', amenityId);
  if (error || !data || !data.length) return [];
  const ids = (data as { folder_id: string }[]).map((r) => r.folder_id);
  const { data: folders } = await supabase.from('amenity_folders').select('*').in('id', ids);
  return ((folders || []) as AmenityFolder[]).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

// ─────────────────────────────────────────────────────────────
// Star / importance
// ─────────────────────────────────────────────────────────────
export async function toggleStar(id: string, current: boolean): Promise<boolean> {
  const { error } = await supabase.from('amenities').update({ is_starred: !current }).eq('id', id);
  if (error) {
    addToast('Could not update star', 'error');
    return false;
  }
  const action = current ? 'Unstarred' : 'Starred';
  void logActivity(id, action);
  return true;
}

export async function bulkStar(ids: string[], value: boolean): Promise<boolean> {
  if (!ids.length) return true;
  for (const batch of chunk(ids)) {
    const { error } = await supabase.from('amenities').update({ is_starred: value }).in('id', batch);
    if (error) {
      addToast('Could not update stars', 'error');
      return false;
    }
  }
  void logActivity(null, value ? 'Bulk starred' : 'Bulk unstarred', `${ids.length} places`);
  return true;
}

export async function bulkFlag(ids: string[], reason: FlagReason, note?: string): Promise<void> {
  if (!ids.length) return;
  const timestamp = new Date().toISOString();
  for (const batch of chunk(ids)) {
    const { error } = await supabase
      .from('amenities')
      .update({ is_flagged: true, flag_reason: reason, flag_note: note || null, flagged_at: timestamp })
      .in('id', batch);
    if (error) {
      addToast('Could not flag places', 'error');
      return;
    }
  }
  void logActivity(null, 'Flagged', `${ids.length} places · ${reason}`);
}

// ─────────────────────────────────────────────────────────────
// Publish / unpublish
// ─────────────────────────────────────────────────────────────
export async function togglePublish(id: string, current: boolean): Promise<boolean> {
  const { error } = await supabase.from('amenities').update({ is_published: !current }).eq('id', id);
  if (error) {
    addToast('Failed to update status', 'error');
    return false;
  }
  void logActivity(id, current ? 'Unpublished' : 'Published');
  return true;
}

export async function bulkPublish(ids: string[], value: boolean): Promise<{ ok: number }> {
  if (!ids.length) return { ok: 0 };
  let ok = 0;
  for (const batch of chunk(ids)) {
    const { data, error } = await supabase
      .from('amenities')
      .update({ is_published: value })
      .in('id', batch)
      .select('id');
    if (error) {
      addToast('Bulk action failed', 'error');
      return { ok };
    }
    ok += (data || []).length;
  }
  void logActivity(null, value ? 'Bulk published' : 'Bulk unpublished', `${ids.length} places`);
  return { ok };
}

// ─────────────────────────────────────────────────────────────
// Guide curation ("shortlist") — the flag the micro-guides read.
// A place only appears in a live guide when is_guide_curated = true AND it is
// published, so this is the one switch that decides guide membership.
// ─────────────────────────────────────────────────────────────
export async function setGuideCurated(id: string, value: boolean): Promise<boolean> {
  const { error } = await supabase.from('amenities').update({ is_guide_curated: value }).eq('id', id);
  if (error) {
    addToast('Could not update guide status', 'error');
    return false;
  }
  void logActivity(id, value ? 'Added to guide' : 'Removed from guide');
  return true;
}

export async function bulkGuideCurated(ids: string[], value: boolean): Promise<number> {
  if (!ids.length) return 0;
  let affected = 0;
  for (const batch of chunk(ids)) {
    const { data, error } = await supabase
      .from('amenities')
      .update({ is_guide_curated: value })
      .in('id', batch)
      .select('id');
    if (error) {
      addToast('Could not update guide status', 'error');
      return affected;
    }
    affected += (data || []).length;
  }
  void logActivity(null, value ? 'Bulk added to guide' : 'Bulk removed from guide', `${ids.length} places`);
  return affected;
}

/**
 * Archive / unarchive places. Archived is its own status, stored on the
 * place's attributes so it never collides with Draft / Unpublished.
 * Archiving also hides the place from the public site (is_published = false).
 */
export async function setArchived(ids: string[], value: boolean): Promise<number> {
  if (!ids.length) return 0;
  const stamp = new Date().toISOString();
  let affected = 0;
  for (const batch of chunk(ids)) {
    const { data, error } = await supabase
      .from('amenities')
      .select('id, attributes')
      .in('id', batch);
    if (error) {
      addToast('Could not update archive status', 'error');
      return affected;
    }
    const rows = (data || []) as { id: string; attributes: Record<string, unknown> | null }[];
    for (const row of rows) {
      const next: Record<string, unknown> = { ...(row.attributes || {}) };
      if (value) {
        next.is_archived = true;
        next.archived_at = stamp;
      } else {
        delete next.is_archived;
        delete next.archived_at;
      }
      const patch: Record<string, unknown> = { attributes: next };
      if (value) patch.is_published = false;
      const { error: updateError } = await supabase.from('amenities').update(patch).eq('id', row.id);
      if (!updateError) affected += 1;
    }
  }
  void logActivity(null, value ? 'Archived' : 'Unarchived', `${affected} place(s)`);
  return affected;
}

// ─────────────────────────────────────────────────────────────
// Recycle bin (soft delete) + restore + permanent delete
// ─────────────────────────────────────────────────────────────
export async function softDelete(id: string, actor = 'Admin'): Promise<boolean> {
  const { data, error } = await supabase
    .from('amenities')
    .update({ deleted_at: new Date().toISOString(), deleted_by: actor })
    .eq('id', id)
    .select('id');
  if (error) {
    addToast(`Could not move to recycle bin: ${error.message}`, 'error');
    return false;
  }
  if (!data || data.length === 0) {
    addToast('Could not move to recycle bin - the change was not saved', 'error');
    return false;
  }
  void logActivity(id, 'Deleted (recycle bin)', `by ${actor}`);
  return true;
}

export async function bulkSoftDelete(ids: string[], actor = 'Admin'): Promise<number> {
  if (!ids.length) return 0;
  const stamp = new Date().toISOString();
  let affected = 0;
  for (const batch of chunk(ids)) {
    const { data, error } = await supabase
      .from('amenities')
      .update({ deleted_at: stamp, deleted_by: actor })
      .in('id', batch)
      .select('id');
    if (error) {
      addToast(`Could not move places to recycle bin: ${error.message}`, 'error');
      return affected;
    }
    affected += (data || []).length;
  }
  void logActivity(null, 'Bulk deleted (recycle bin)', `${ids.length} places`);
  return affected;
}

export async function restoreAmenity(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('amenities')
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', id);
  if (error) {
    addToast('Could not restore place', 'error');
    return false;
  }
  void logActivity(id, 'Restored');
  return true;
}

export async function bulkRestore(ids: string[]): Promise<void> {
  if (!ids.length) return;
  for (const batch of chunk(ids)) {
    const { error } = await supabase
      .from('amenities')
      .update({ deleted_at: null, deleted_by: null })
      .in('id', batch);
    if (error) {
      addToast('Could not restore places', 'error');
      return;
    }
  }
  void logActivity(null, 'Bulk restored', `${ids.length} places`);
}

export async function permanentDelete(id: string): Promise<boolean> {
  const { error } = await supabase.from('amenities').delete().eq('id', id);
  if (error) {
    addToast('Could not permanently delete place', 'error');
    return false;
  }
  return true;
}

export async function bulkPermanentDelete(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  let removed = 0;
  for (const batch of chunk(ids)) {
    const { data, error } = await supabase.from('amenities').delete().in('id', batch).select('id');
    if (error) {
      addToast(`Could not permanently delete places: ${error.message}`, 'error');
      return removed;
    }
    removed += (data || []).length;
  }
  return removed;
}

/**
 * Permanently remove EVERY place and service from the directory.
 * Used to "start fresh" before re-importing a clean dataset.
 * Folder links are cleared first so nothing is left orphaned.
 */
export async function wipeAllAmenities(): Promise<boolean> {
  // Clear folder memberships first (harmless when the folder is empty).
  await supabase.from('amenity_folder_items').delete().not('amenity_id', 'is', null);
  // Then remove every amenity row, including anything sitting in the bin.
  const { error } = await supabase.from('amenities').delete().not('id', 'is', null);
  if (error) {
    addToast('Could not clear the directory', 'error');
    return false;
  }
  void logActivity(null, 'Cleared directory', 'All places permanently removed');
  return true;
}

/** Fetch every id currently sitting in the Recycle Bin (paged, so nothing is missed). */
export async function fetchDeletedAmenityIds(): Promise<string[]> {
  const ids: string[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from('amenities')
      .select('id')
      .not('deleted_at', 'is', null)
      .range(from, from + size - 1);
    if (error || !data) break;
    ids.push(...(data as { id: string }[]).map((r) => r.id));
    if (data.length < size) break;
  }
  return ids;
}

/** Permanently delete EVERY place currently in the Recycle Bin. */
export async function emptyRecycleBin(): Promise<number> {
  const ids = await fetchDeletedAmenityIds();
  if (!ids.length) return 0;
  const removed = await bulkPermanentDelete(ids);
  if (removed) void logActivity(null, 'Emptied Recycle Bin', `${removed} places permanently deleted`);
  return removed;
}

/**
 * Auto-purge rule: permanently delete Recycle Bin items that were deleted more
 * than `days` days ago. Returns how many rows were purged.
 */
export async function purgeExpiredAmenities(days = 30): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const ids: string[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from('amenities')
      .select('id')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoff)
      .range(from, from + size - 1);
    if (error || !data) break;
    ids.push(...(data as { id: string }[]).map((r) => r.id));
    if (data.length < size) break;
  }
  if (!ids.length) return 0;
  const removed = await bulkPermanentDelete(ids);
  if (removed) void logActivity(null, 'Auto-purged Recycle Bin', `${removed} items older than ${days} days`);
  return removed;
}

// ─────────────────────────────────────────────────────────────
// Reviews (public + moderation)
// ─────────────────────────────────────────────────────────────
export async function fetchReviews(amenityId: string): Promise<AmenityReview[]> {
  // Exclude anything sitting in the review bin so live moderation and the
  // public page never see soft-deleted reviews.
  const { data, error } = await supabase
    .from('amenity_reviews')
    .select('*')
    .eq('amenity_id', amenityId)
    .neq('moderation_status', 'deleted')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as AmenityReview[];
}

/** Reviews currently sitting in the bin (soft-deleted, restorable). */
export async function fetchDeletedReviews(amenityId: string): Promise<AmenityReview[]> {
  const { data, error } = await supabase
    .from('amenity_reviews')
    .select('*')
    .eq('amenity_id', amenityId)
    .eq('moderation_status', 'deleted')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as AmenityReview[];
}

export async function setReviewStatus(id: string, status: string): Promise<boolean> {
  const { error } = await supabase.from('amenity_reviews').update({ moderation_status: status }).eq('id', id);
  if (error) {
    addToast('Could not update review', 'error');
    return false;
  }
  return true;
}

/**
 * Reviews use the same two-step delete as the Places Recycle Bin:
 *  - softDeleteReview marks the review as deleted → it lands in the bin and
 *    can be restored later (nothing is lost yet).
 *  - permanentDeleteReview removes the row for good. Only called from the bin.
 */
export async function softDeleteReview(id: string): Promise<boolean> {
  const { error } = await supabase.from('amenity_reviews').update({ moderation_status: 'deleted' }).eq('id', id);
  if (error) {
    addToast('Could not move review to the Recycle Bin', 'error');
    return false;
  }
  return true;
}

/** Restore a review from the bin. It returns as "hidden" so it only reappears
 *  publicly once it is approved again. */
export async function restoreReview(id: string): Promise<boolean> {
  const { error } = await supabase.from('amenity_reviews').update({ moderation_status: 'hidden' }).eq('id', id);
  if (error) {
    addToast('Could not restore review', 'error');
    return false;
  }
  return true;
}

/** Permanently remove a review. Irreversible - bin only. */
export async function permanentDeleteReview(id: string): Promise<boolean> {
  const { error } = await supabase.from('amenity_reviews').delete().eq('id', id);
  if (error) {
    addToast('Could not permanently delete review', 'error');
    return false;
  }
  return true;
}

/**
 * Recompute a place's aggregate review count/average after a review change,
 * then persist it. Keeps summary + list in sync.
 */
export async function recomputeAmenityRating(amenityId: string): Promise<void> {
  const reviews = await fetchReviews(amenityId);
  const approved = reviews.filter((r) => r.moderation_status === 'approved');
  const count = approved.length;
  const avg = count ? approved.reduce((s, r) => s + r.rating, 0) / count : null;
  await supabase
    .from('amenities')
    .update({ review_count: count, avg_rating: avg, rating: avg })
    .eq('id', amenityId);
}

// ─────────────────────────────────────────────────────────────
// Public view counter
// ─────────────────────────────────────────────────────────────
export async function incrementViewCount(id: string): Promise<void> {
  // Atomic read-increment-write on the stored counter. Only ever called from
  // the PUBLIC place detail page (never from admin preview screens).
  const { data } = await supabase.from('amenities').select('view_count').eq('id', id).single();
  const current = (data && data.view_count) || 0;
  await supabase.from('amenities').update({ view_count: current + 1 }).eq('id', id);
}

// ─────────────────────────────────────────────────────────────
// Activity feed
// ─────────────────────────────────────────────────────────────
export async function fetchActivity(limit = 60): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from('amenity_activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []) as ActivityEntry[];
}