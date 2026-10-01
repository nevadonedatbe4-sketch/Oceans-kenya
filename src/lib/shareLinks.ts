/**
 * Public-facing link builders for CRM records.
 *
 * The public site addresses every property-like record (residential listings,
 * land plots and new developments) through the same detail route —
 * `/property/{slug}` — which resolves against the `all_listings` view. JV
 * projects get their own detail route. These helpers keep the format in one
 * place so every CRM Share action produces a link that actually opens.
 */

const siteOrigin = () => (typeof window !== 'undefined' ? window.location.origin : '');

/** Public page for a residential listing, land plot or new development. */
export function propertyPublicUrl(slug?: string | null, id?: string | null): string {
  const key = (slug && slug.trim()) || (id ? String(id) : '');
  return `${siteOrigin()}/property/${key}`;
}

/** Public detail page for a JV project seeking partners. */
export function jvProjectPublicUrl(slug?: string | null, id?: string | null): string {
  const key = (slug && slug.trim()) || (id ? String(id) : '');
  return `${siteOrigin()}/joint-ventures/project/${key}`;
}

/**
 * Public link for a JV land listing (opportunity). Published opportunities are
 * surfaced publicly through their property page; when no slug is available we
 * fall back to the JV desk landing page so the link is never broken.
 */
export function jvOpportunityPublicUrl(slug?: string | null): string {
  const key = (slug && slug.trim()) || '';
  return key ? `${siteOrigin()}/property/${key}` : `${siteOrigin()}/joint-ventures`;
}

/** Public JV desk landing page. */
export function jvDeskPublicUrl(): string {
  return `${siteOrigin()}/joint-ventures`;
}