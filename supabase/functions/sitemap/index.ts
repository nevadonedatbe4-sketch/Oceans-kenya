import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Public XML sitemap for oceanske.com. Registers every static SEO landing page
// plus every live, published listing / land listing / development /
// neighbourhood / blog post, so search engines can discover the entire premium
// property architecture at once.
//
// Only ELIGIBLE public URLs are emitted (published / available content).
// Draft, private, restricted and non-indexable routes are never included, and
// duplicate URLs are collapsed automatically.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const SITE = 'https://www.oceanske.com';

// Static SEO landing pages (Popular Searches + property-type clusters).
// Mirrors the derived registry in src/lib/sitemapRoutes.ts / seoPages.ts.
const SEO_PATHS: string[] = [
  '/', '/buy', '/rent', '/all-properties', '/neighbourhoods', '/new-developments',
  '/joint-ventures', '/living-in-nairobi', '/schools', '/commute-time', '/directory',
  '/about', '/contact',
  '/property-for-sale/nairobi', '/property-for-rent/nairobi',
  '/apartments-for-sale/westlands', '/apartments-to-rent/westlands',
  '/apartments-for-sale/kileleshwa',
  '/houses-for-sale/karen', '/houses-to-rent/karen',
  '/houses-for-sale/lavington', '/houses-to-rent/lavington',
  '/townhouses-for-sale/lavington', '/villas-for-sale/runda',
  '/penthouses-for-sale/westlands', '/furnished-apartments/westlands',
  '/serviced-apartments/nairobi', '/luxury-homes-nairobi',
  '/investment-property-nairobi', '/properties-with-pool/nairobi',
  '/gated-community-homes/nairobi', '/modern-apartments/nairobi',
  '/duplex-apartments/nairobi', '/apartments-for-sale/nairobi',
  '/apartments-to-rent/nairobi', '/houses-for-sale/nairobi',
  '/houses-to-rent/nairobi', '/townhouses-for-sale/nairobi',
  '/land-for-sale/nairobi', '/commercial-property-for-sale/nairobi',
  '/commercial-property-to-rent/nairobi', '/commercial-property',
];

const PREMIUM_AREA_SLUGS: string[] = [
  'karen', 'runda', 'gigiri', 'muthaiga', 'westlands', 'kilimani', 'lavington',
  'kileleshwa', 'riverside', 'kitisuru', 'spring-valley', 'parklands',
  'upper-hill', 'lower-kabete', 'rosslyn',
];

const PRICED_AREA_SLUGS: string[] = [
  'karen', 'runda', 'gigiri', 'muthaiga', 'westlands', 'kilimani', 'lavington',
  'kileleshwa', 'riverside', 'kitisuru', 'spring-valley', 'lower-kabete', 'rosslyn',
];

const AREA_GUIDE_SLUGS: string[] = [
  'karen', 'runda', 'gigiri', 'muthaiga', 'westlands', 'kilimani', 'lavington',
  'kileleshwa', 'riverside', 'kitisuru', 'spring-valley', 'parklands',
  'upper-hill', 'lower-kabete', 'rosslyn',
];

function buildClusterPaths(): string[] {
  const out: string[] = [];
  for (const area of PREMIUM_AREA_SLUGS) out.push(`/estate-agents/${area}`);
  for (const area of PRICED_AREA_SLUGS) out.push(`/property-prices/${area}`, `/rental-prices/${area}`);
  for (const area of AREA_GUIDE_SLUGS) out.push(`/area-guides/${area}`);
  return out;
}

const ALL_SEO_PATHS: string[] = [...SEO_PATHS, ...buildClusterPaths()];

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  priority?: string;
  changefreq?: string;
  image?: string;
}

function xmlEscape(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc: string, priority: string, changefreq: string, lastmod?: string, image?: string): string {
  const lm = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
  const img = image ? `<image:image><image:loc>${xmlEscape(image)}</image:loc></image:image>` : '';
  return `<url><loc>${xmlEscape(loc)}</loc>${lm}<changefreq>${changefreq}</changefreq><priority>${priority}</priority>${img}</url>`;
}

function buildSitemap(entries: SitemapUrl[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set<string>();
  const urls: string[] = [];

  const push = (u: SitemapUrl) => {
    const loc = (u.loc || '').trim();
    if (!loc || seen.has(loc)) return; // dedupe - never emit the same URL twice
    seen.add(loc);
    urls.push(urlEntry(loc, u.priority ?? '0.5', u.changefreq ?? 'weekly', u.lastmod ?? today, u.image));
  };

  for (const path of ALL_SEO_PATHS) {
    let priority = '0.5';
    let changefreq = 'weekly';
    if (path === '/') { priority = '1.0'; changefreq = 'daily'; }
    else if (path === '/buy' || path === '/rent' || path === '/all-properties') { priority = '0.8'; changefreq = 'daily'; }
    else if (path.startsWith('/property-') || path === '/neighbourhoods') { priority = '0.7'; changefreq = 'weekly'; }
    push({ loc: `${SITE}${path}`, priority, changefreq, lastmod: today });
  }

  for (const e of entries) push(e);

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>`;
}

function day(v?: string | null): string | undefined {
  return v ? v.slice(0, 10) : undefined;
}

Deno.serve(async (_req: Request) => {
  try {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON);
    const entries: SitemapUrl[] = [];

    const [listingsRes, hoodsRes, devRes, landRes, blogRes] = await Promise.allSettled([
      client.from('listings').select('slug, updated_at, cover_image, main_image').eq('is_published', true).eq('status', 'available').neq('title', '').limit(8000),
      client.from('neighbourhoods').select('slug, updated_at').eq('is_published', true).limit(500),
      client.from('developments').select('slug, updated_at, cover_image, main_image').eq('is_published', true).neq('title', '').limit(2000),
      client.from('land_listings').select('slug, updated_at, cover_image, main_image').eq('is_published', true).neq('title', '').limit(5000),
      client.from('blog_posts').select('slug, updated_at').eq('status', 'published').limit(2000),
    ]);

    // deno-lint-ignore no-explicit-any
    type Row = { slug?: string | null; updated_at?: string | null; cover_image?: string | null; main_image?: string | null };
    // deno-lint-ignore no-explicit-any
    const collect = (res: any, make: (slug: string, updatedAt?: string | null, row?: Row) => SitemapUrl) => {
      if (!res || res.status !== 'fulfilled' || !res.value || !res.value.data) return;
      for (const row of res.value.data as Array<Row>) {
        const slug = (row.slug ?? '').trim();
        if (!slug) continue;
        entries.push(make(slug, row.updated_at, row));
      }
    };

    const img = (row?: Row) => (row?.cover_image || row?.main_image || undefined) ?? undefined;

    collect(listingsRes, (slug, u, row) => ({ loc: `${SITE}/property/${slug}`, lastmod: day(u), priority: '0.6', changefreq: 'weekly', image: img(row) }));
    collect(landRes, (slug, u, row) => ({ loc: `${SITE}/property/${slug}`, lastmod: day(u), priority: '0.6', changefreq: 'weekly', image: img(row) }));
    collect(devRes, (slug, u, row) => ({ loc: `${SITE}/development/${slug}`, lastmod: day(u), priority: '0.7', changefreq: 'weekly', image: img(row) }));
    collect(hoodsRes, (slug, u) => ({ loc: `${SITE}/neighbourhood/${slug}`, lastmod: day(u), priority: '0.6', changefreq: 'weekly' }));
    collect(blogRes, (slug, u) => ({ loc: `${SITE}/blog/${slug}`, lastmod: day(u), priority: '0.6', changefreq: 'weekly' }));

    const xml = buildSitemap(entries);
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
