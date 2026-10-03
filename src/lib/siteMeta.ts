import { supabase } from '@/lib/supabase';

export const DEFAULT_SITE_NAME = 'Oceans Kenya';

/**
 * Country / locality fallbacks used only when the admin-managed site address
 * is genuinely empty. Kept here (not baked into pages) so every consumer reads
 * the same real, DB-derived values.
 */
export const DEFAULT_SITE_COUNTRY = 'Kenya';
export const DEFAULT_SITE_LOCALITY = 'Nairobi';

export interface SiteLocale {
  locality: string;
  country: string;
}

export interface SiteMetaSnapshot {
  siteName: string;
  address: string;
  locality: string;
  country: string;
}

type SiteMetaMap = Record<string, string>;

let cached: SiteMetaMap | null = null;
let inflight: Promise<SiteMetaMap> | null = null;

/**
 * Derive a locality + country from a free-text address such as
 * "Plot 9, Mandera Rd, Kileleshwa, Nairobi, Kenya".
 *
 * Convention: the last comma-separated part is the country, the part before it
 * is the city/locality. If the value is empty we fall back to the documented
 * defaults so structured data never emits a blank field.
 */
export function parseAddressLocale(address: string): SiteLocale {
  const parts = (address || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { locality: DEFAULT_SITE_LOCALITY, country: DEFAULT_SITE_COUNTRY };
  }
  const country = parts.length >= 2 ? parts[parts.length - 1] : DEFAULT_SITE_COUNTRY;
  const locality = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  return {
    locality: locality || DEFAULT_SITE_LOCALITY,
    country: country || DEFAULT_SITE_COUNTRY,
  };
}

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

/** Synchronous snapshot of the brand name + address-derived locale. */
export function getSiteMetaSync(): SiteMetaSnapshot {
  const address = cached?.address || '';
  const locale = parseAddressLocale(address);
  return {
    siteName: cached?.site_name || DEFAULT_SITE_NAME,
    address,
    locality: locale.locality,
    country: locale.country,
  };
}

/** Resolve the brand name + address-derived locale, loading the cache first. */
export async function loadSiteMetaSnapshot(): Promise<SiteMetaSnapshot> {
  const map = await loadSiteMeta();
  const address = map.address || '';
  const locale = parseAddressLocale(address);
  return {
    siteName: map.site_name || DEFAULT_SITE_NAME,
    address,
    locality: locale.locality,
    country: locale.country,
  };
}

/** Clear the cache so the next read re-fetches (used after settings are saved). */
export function clearSiteMetaCache(): void {
  cached = null;
  inflight = null;
}