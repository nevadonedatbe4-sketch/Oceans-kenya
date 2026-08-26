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

const FALLBACK_IMAGE =
  'https://readdy.ai/api/search-image?query=Modern%20architectural%20development%20site%20with%20construction%20cranes%20and%20concrete%20structure%20warm%20golden%20hour%20light%20clean%20urban%20real%20estate%20photography%20professional%20composition&width=800&height=600&seq=jv-fallback&orientation=landscape';

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
      alt: alt || (title ? `${title} — image ${result.length + 1}` : `Image ${result.length + 1}`),
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

  // Ultimate fallback so a card never renders a broken/empty image.
  if (result.length === 0) {
    push(FALLBACK_IMAGE, title, 1, true);
  }

  return result;
}