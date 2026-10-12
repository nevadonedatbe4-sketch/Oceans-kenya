/**
 * sitemapRoutes - single source of truth for the STATIC public URLs that make
 * up the sitemap. Rather than hand-maintaining a drifting list, every group is
 * DERIVED from the real page registries the router already renders, so adding
 * an SEO page / area guide / price guide automatically adds a sitemap entry.
 *
 * Dynamic URLs (listings, developments, neighbourhoods, land, blog posts) are
 * resolved live from the database by the `sitemap` Edge Function - see
 * supabase/functions/sitemap/index.ts.
 */

import { SEO_PAGES } from '@/lib/seoPages';
import { ESTATE_AGENT_PAGES, PROPERTY_PRICE_PAGES } from '@/lib/seoClusters';
import { AREA_GUIDE_PAGES } from '@/lib/areaGuides';

export interface StaticRouteGroup {
  key: string;
  label: string;
  description: string;
  paths: string[];
}

/** Fixed public routes that always exist in the router. */
const FIXED_ROUTES: string[] = [
  '/',
  '/buy',
  '/rent',
  '/all-properties',
  '/neighbourhoods',
  '/new-developments',
  '/joint-ventures',
  '/living-in-nairobi',
  '/schools',
  '/commute-time',
  '/directory',
  '/night-life',
  '/about',
  '/contact',
  '/valuation',
  '/commercial-property',
  '/c/commercial-advertising',
  '/privacy-policy',
  '/terms-conditions',
  '/cookie-policy',
  '/disclaimer',
  '/help-center',
  '/report-a-listing',
];

/** Pull the `slug` off every entry of a page registry and prefix it with "/". */
function slugsOf(registry: Record<string, { slug: string }>): string[] {
  return Object.values(registry).map((p) => `/${p.slug}`);
}

export function getStaticSitemapGroups(): StaticRouteGroup[] {
  return [
    {
      key: 'core',
      label: 'Core pages',
      description: 'Handles, search, directory, legal and marketing pages.',
      paths: FIXED_ROUTES,
    },
    {
      key: 'seo',
      label: 'Popular searches & property-type clusters',
      description: 'Keyword landing pages from seoPages.ts.',
      paths: slugsOf(SEO_PAGES),
    },
    {
      key: 'estate-agents',
      label: 'Estate agent pages',
      description: 'Per-enclave estate agent pages from seoClusters.ts.',
      paths: slugsOf(ESTATE_AGENT_PAGES),
    },
    {
      key: 'price-guides',
      label: 'Property & rental price guides',
      description: 'Per-area price guide pages from seoClusters.ts.',
      paths: slugsOf(PROPERTY_PRICE_PAGES),
    },
    {
      key: 'area-guides',
      label: 'Area guides',
      description: 'Editorial area guides from areaGuides.ts.',
      paths: slugsOf(AREA_GUIDE_PAGES),
    },
  ];
}

/** The complete flat list of static public paths (deduplicated). */
export function getStaticSitemapPaths(): string[] {
  return Array.from(new Set(getStaticSitemapGroups().flatMap((g) => g.paths)));
}

/** Dynamic sources that the Edge Function reads live from the database. */
export const DYNAMIC_SITEMAP_SOURCES: { label: string; route: string; rule: string }[] = [
  { label: 'Property listings', route: '/property/{slug}', rule: 'is_published = true AND status = "available"' },
  { label: 'Land listings', route: '/property/{slug}', rule: 'is_published = true' },
  { label: 'Developments', route: '/development/{slug}', rule: 'is_published = true' },
  { label: 'Neighbourhoods', route: '/neighbourhood/{slug}', rule: 'is_published = true' },
  { label: 'Blog posts', route: '/blog/{slug}', rule: 'status = "published"' },
];

/** URLs / route classes that must NEVER appear in the public sitemap. */
export const EXCLUDED_FROM_SITEMAP: string[] = [
  'Drafts, unpublished and withdrawn listings',
  'Private, restricted and admin-only routes (/admin/*, /agent/*)',
  'Auth pages (login, signup, password reset, approvals)',
  'Cart, checkout, thank-you and other non-indexable utility routes',
  'Search result / query-string URLs (canonical pages are listed instead)',
];