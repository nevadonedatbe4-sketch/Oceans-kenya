import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Public XML sitemap for oceanske.com. Registers every static SEO landing
// page plus every live listing and neighbourhood page, so search engines can
// discover the entire premium property architecture at once.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const SITE = 'https://www.oceanske.com';

// Static SEO landing pages (Popular Searches + property-type clusters).
// Keep in sync with src/lib/seoPages.ts and src/lib/seoClusters.ts.
const SEO_PATHS: string[] = [
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
  '/about',
  '/contact',
  '/property-for-sale/nairobi',
  '/property-for-rent/nairobi',
  '/apartments-for-sale/westlands',
  '/apartments-to-rent/westlands',
  '/apartments-for-sale/kileleshwa',
  '/houses-for-sale/karen',
  '/houses-to-rent/karen',
  '/houses-for-sale/lavington',
  '/houses-to-rent/lavington',
  '/townhouses-for-sale/lavington',
  '/villas-for-sale/runda',
  '/penthouses-for-sale/westlands',
  '/furnished-apartments/westlands',
  '/serviced-apartments/nairobi',
  '/luxury-homes-nairobi',
  '/investment-property-nairobi',
  '/properties-with-pool/nairobi',
  '/gated-community-homes/nairobi',
  '/modern-apartments/nairobi',
  '/duplex-apartments/nairobi',
  '/apartments-for-sale/nairobi',
  '/apartments-to-rent/nairobi',
  '/houses-for-sale/nairobi',
  '/houses-to-rent/nairobi',
  '/townhouses-for-sale/nairobi',
  '/land-for-sale/nairobi',
  '/commercial-property-for-sale/nairobi',
  '/commercial-property-to-rent/nairobi',
  '/commercial-property',
];

// Premium Nairobi enclaves → /estate-agents/{area} (Estate Agents cluster).
const PREMIUM_AREA_SLUGS: string[] = [
  'karen',
  'runda',
  'gigiri',
  'muthaiga',
  'westlands',
  'kilimani',
  'lavington',
  'kileleshwa',
  'riverside',
  'kitisuru',
  'spring-valley',
  'parklands',
  'upper-hill',
  'lower-kabete',
  'rosslyn',
];

// Areas with live price data → /property-prices/{area} + /rental-prices/{area}.
const PRICED_AREA_SLUGS: string[] = [
  'karen',
  'runda',
  'gigiri',
  'muthaiga',
  'westlands',
  'kilimani',
  'lavington',
  'kileleshwa',
  'riverside',
  'kitisuru',
  'spring-valley',
  'lower-kabete',
  'rosslyn',
];

// Premium enclaves → /area-guides/{area} (Area Guides cluster).
const AREA_GUIDE_SLUGS: string[] = [
  'karen',
  'runda',
  'gigiri',
  'muthaiga',
  'westlands',
  'kilimani',
  'lavington',
  'kileleshwa',
  'riverside',
  'kitisuru',
  'spring-valley',
  'parklands',
  'upper-hill',
  'lower-kabete',
  'rosslyn',
];

function buildClusterPaths(): string[] {
  const out: string[] = [];
  for (const area of PREMIUM_AREA_SLUGS) out.push(`/estate-agents/${area}`);
  for (const area of PRICED_AREA_SLUGS) {
    out.push(`/property-prices/${area}`, `/rental-prices/${area}`);
  }
  for (const area of AREA_GUIDE_SLUGS) out.push(`/area-guides/${area}`);
  return out;
}

const ALL_SEO_PATHS: string[] = [...SEO_PATHS, ...buildClusterPaths()];

function xmlEscape(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc: string, priority: string, changefreq: string, lastmod?: string): string {
  const lm = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
  return `<url><loc>${xmlEscape(loc)}</loc>${lm}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

function buildSitemap(extraUrls: { loc: string; lastmod?: string }[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls: string[] = [];

  for (const path of ALL_SEO_PATHS) {
    let priority = '0.5';
    let changefreq = 'weekly';
    if (path === '/') { priority = '1.0'; changefreq = 'daily'; }
    else if (path === '/buy' || path === '/rent' || path === '/all-properties') { priority = '0.8'; changefreq = 'daily'; }
    else if (path.startsWith('/property-') || path === '/neighbourhoods') { priority = '0.7'; changefreq = 'weekly'; }
    urls.push(urlEntry(`${SITE}${path}`, priority, changefreq, today));
  }

  for (const u of extraUrls) {
    urls.push(urlEntry(u.loc, '0.6', 'weekly', u.lastmod ?? today));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
}

Deno.serve(async (_req: Request) => {
  try {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON);
    const extraUrls: { loc: string; lastmod?: string }[] = [];

    const [listingsRes, hoodsRes] = await Promise.allSettled([
      client
        .from('listings')
        .select('slug, updated_at')
        .eq('is_published', true)
        .eq('status', 'available')
        .neq('title', '')
        .limit(5000),
      client
        .from('neighbourhoods')
        .select('slug, updated_at')
        .eq('is_published', true)
        .limit(500),
    ]);

    if (listingsRes.status === 'fulfilled' && listingsRes.value.data) {
      for (const row of listingsRes.value.data as Array<{ slug?: string | null; updated_at?: string | null }>) {
        const slug = (row.slug ?? '').trim();
        if (!slug) continue;
        extraUrls.push({ loc: `${SITE}/property/${slug}`, lastmod: row.updated_at?.slice(0, 10) });
      }
    }

    if (hoodsRes.status === 'fulfilled' && hoodsRes.value.data) {
      for (const row of hoodsRes.value.data as Array<{ slug?: string | null; updated_at?: string | null }>) {
        const slug = (row.slug ?? '').trim();
        if (!slug) continue;
        extraUrls.push({ loc: `${SITE}/neighbourhood/${slug}`, lastmod: row.updated_at?.slice(0, 10) });
      }
    }

    const xml = buildSitemap(extraUrls);
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sitemap generation failed';
    return new Response(xmlEscape(message), { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
});
