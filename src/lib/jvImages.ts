// Centralized JV project image normalization.
// Converts whatever Supabase returns (the jv_project_images relationship,
// or a legacy single `image` string) into one predictable ordered list.

export interface JvImage {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
  isCover: boolean;
}

interface RawImageRow {
  id?: string;
  image_url?: string | null;
  url?: string | null;
  src?: string | null;
  storage_path?: string | null;
  alt_text?: string | null;
  alt?: string | null;
  sort_order?: number | null;
  is_cover?: boolean | null;
}

function extractUrl(row: RawImageRow): string | null {
  const candidate = row.image_url ?? row.url ?? row.src;
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim();
  }
  return null;
}

/**
 * Normalize the images for a single JV project.
 * @param rawImages   the `jv_project_images` array from the Supabase relationship (or any array of image rows)
 * @param legacyImage the old single `image` column value, used only as a fallback when no related rows exist
 * @param title       project title, used to build meaningful alt text
 */
export function normalizeJvProjectImages(
  rawImages: unknown,
  legacyImage?: string | null,
  title?: string,
): JvImage[] {
  const result: JvImage[] = [];
  const seen = new Set<string>();

  const push = (url: string | null | undefined, alt: string | null | undefined, sortOrder: number, isCover: boolean, id?: string) => {
    const clean = url ? url.trim() : '';
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    result.push({
      id: id || `img-${result.length + 1}`,
      url: clean,
      alt: alt || (title ? `${title} - image ${result.length + 1}` : `Image ${result.length + 1}`),
      sortOrder,
      isCover,
    });
  };

  if (Array.isArray(rawImages)) {
    const rows = (rawImages as RawImageRow[])
      .map((r) => ({
        url: extractUrl(r),
        alt: r.alt_text ?? r.alt ?? null,
        sortOrder: Number(r.sort_order ?? 0),
        isCover: Boolean(r.is_cover),
        id: r.id,
      }))
      .sort((a, b) => {
        // Cover image always first, then by sort order.
        if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
        return a.sortOrder - b.sortOrder;
      });

    for (const row of rows) {
      push(row.url, row.alt, row.sortOrder, row.isCover, row.id);
    }
  }

  // Legacy single-image fallback (should only fire if the relationship is empty).
  if (result.length === 0) {
    push(legacyImage, title, 1, true);
  }

  // No generated fallback: a project without real images yields an empty list,
  // and the UI renders an honest placeholder instead of a fake picture.
  return result;
}