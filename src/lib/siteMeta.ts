import { supabase } from '@/lib/supabase';

export const DEFAULT_SITE_NAME = 'Oceans Kenya';

type SiteMetaMap = Record<string, string>;

let cached: SiteMetaMap | null = null;
let inflight: Promise<SiteMetaMap> | null = null;

/**
 * Load the public `site_settings` rows once per page session and cache them.
 *
 * This is a lightweight companion to `useSiteSettings` for non-React call
 * sites (SEO meta tags, listing mappers) that only need a couple of values and
 * must not spin up the full multi-table settings fetch on every render.
 */
export async function loadSiteMeta(): Promise<SiteMetaMap> {
  if (cached) return cached;
  if (!inflight) {
    inflight = (async () => {
      try {
        const { data } = await supabase.from('site_settings').select('key,value');
        const map: SiteMetaMap = {};
        (data || []).forEach((row: { key: string; value: string | null }) => {
          map[row.key] = row.value || '';
        });
        cached = map;
        return map;
      } catch {
        cached = {};
        return {};
      }
    })();
  }
  return inflight;
}

/** Synchronous read of the cached site name (falls back to the default). */
export function getSiteNameSync(): string {
  return cached?.site_name || DEFAULT_SITE_NAME;
}

/** Resolve the current site name, loading + caching the settings if needed. */
export async function getSiteName(): Promise<string> {
  const map = await loadSiteMeta();
  return map.site_name || DEFAULT_SITE_NAME;
}

/** Clear the cache so the next read re-fetches (used after settings are saved). */
export function clearSiteMetaCache(): void {
  cached = null;
  inflight = null;
}