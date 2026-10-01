import { supabase } from '@/lib/supabase';

export interface PersistResult {
  ok: boolean;
  error?: string;
}

/**
 * Persist one or more image-related columns on a single record and then READ
 * the values straight back to confirm they actually stuck.
 *
 * Why the read-back: a Supabase `UPDATE` that is blocked by a Row Level
 * Security policy (or silently no-ops) resolves successfully with zero rows
 * changed and NO error. Without verification the UI can cheerfully report
 * "saved" while the database still holds the previous value - which is exactly
 * the "I press Save and it reverts after refresh" symptom. Verifying here makes
 * the write honest: a change that didn't persist is reported as a failure
 * instead of a fake success.
 */
export async function persistImageColumns(
  table: string,
  id: string,
  patch: Record<string, string | string[] | null>,
): Promise<PersistResult> {
  if (!id) return { ok: false, error: 'Missing record id' };

  const { error: writeError } = await supabase.from(table).update(patch).eq('id', id);
  if (writeError) return { ok: false, error: writeError.message };

  const columns = Object.keys(patch);
  if (columns.length === 0) return { ok: true };

  const { data, error: readError } = await supabase
    .from(table)
    .select(columns.join(', '))
    .eq('id', id)
    .maybeSingle();

  if (readError) return { ok: false, error: readError.message };
  if (!data) return { ok: false, error: 'The change could not be verified - record not found.' };

  const row = data as Record<string, unknown>;
  const mismatch = columns.some((column) => {
    const saved = row[column] ?? null;
    const wanted = patch[column] ?? null;
    if (Array.isArray(saved) || Array.isArray(wanted)) {
      return JSON.stringify(saved ?? []) !== JSON.stringify(wanted ?? []);
    }
    return saved !== wanted;
  });

  if (mismatch) {
    return { ok: false, error: 'The change did not save - please check your permissions and try again.' };
  }

  return { ok: true };
}