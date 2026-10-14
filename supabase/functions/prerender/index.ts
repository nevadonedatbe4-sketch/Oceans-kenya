import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────
// Crawler prerender (dynamic rendering).
//
// Social scrapers (Facebook/WhatsApp/LinkedIn/X/…) and search crawlers don't run
// the SPA's JavaScript, so a shared deep link would otherwise show the generic
// homepage card. Vercel rewrites ONLY crawler user-agents for content routes to
// this function (humans hit the SPA untouched); it returns a small, fully-formed
// HTML document with the correct <title>, meta, Open Graph/Twitter tags, JSON-LD
// and the real page content for that one record.
//
// Routes handled (via ?type=&slug=):
//   property      → listings, then land_listings   (/property/:slug)
//   development   → developments                   (/development/:slug)
//   neighbourhood → neighbourhoods                 (/neighbourhood/:slug)
//   blog          → blog_posts                     (/blog/:slug)
// ─────────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SITE = 'https://www.oceanske.com';
const DEFAULT_IMAGE =
  'https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/55202c71-05ff-4d5d-a3e9-edf3986c0610_ceans-logo-main.webp';

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Strip HTML, decode a few common entities, collapse whitespace. */
function toPlain(s: unknown): string {
  return String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}

/** Pick the best available image from a record and normalise array/JSON fields. */
function pickImage(row: Record<string, unknown>): string {
  const direct = ['seo_image', 'open_graph_image', 'cover_image', 'main_image', 'hero_image', 'image', 'featured_image'];
  for (const k of direct) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  let images = row.images ?? row.gallery ?? row.photos;
  if (typeof images === 'string') {
    try { images = JSON.parse(images); } catch { images = [images]; }
  }
  if (Array.isArray(images) && images.length) {
    const first = images[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
    if (first && typeof first === 'object') {
      const u = (first as Record<string, unknown>).url ?? (first as Record<string, unknown>).src;
      if (typeof u === 'string' && u.trim()) return u.trim();
    }
  }
  return DEFAULT_IMAGE;
}

interface Meta {
  title: string;
  description: string;
  image: string;
  canonical: string;
  jsonLd: Record<string, unknown>;
  bodyHtml: string;
  found: boolean;
}

function withBrand(title: string): string {
  const t = title.trim();
  return /oceans/i.test(t) ? t : `${t} | Oceans Kenya`;
}

async function loadMeta(type: string, slug: string): Promise<Meta> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON);
  const notFound: Meta = {
    title: 'Oceans Kenya',
    description: 'Premium houses, apartments, land and joint ventures across Nairobi and Kenya.',
    image: DEFAULT_IMAGE,
    canonical: `${SITE}/`,
    jsonLd: {},
    bodyHtml: '',
    found: false,
  };

  const firstRow = async (table: string, extra?: (q: ReturnType<ReturnType<typeof client.from>['select']>) => unknown) => {
    let q = client.from(table).select('*').eq('slug', slug).limit(1);
    if (extra) q = extra(q) as typeof q;
    const { data } = await q;
    return (data && data[0]) as Record<string, unknown> | undefined;
  };

  if (type === 'property') {
    const row =
      (await firstRow('listings', (q) => q.eq('is_published', true))) ||
      (await firstRow('land_listings', (q) => q.eq('is_published', true)));
    if (!row) return notFound;
    const title = withBrand(String(row.seo_title || row.title || 'Property for sale in Nairobi'));
    const description = truncate(
      toPlain(row.seo_description || row.description || `${row.property_type || 'Property'} in ${row.location || row.neighbourhood || 'Nairobi'}, Kenya.`),
      160,
    );
    const image = pickImage(row);
    const canonical = `${SITE}/property/${slug}`;
    const price = Number(row.price);
    const currency = String(row.currency || 'KES');
    const facts = [
      row.bedrooms ? `${row.bedrooms} bed` : '',
      row.bathrooms ? `${row.bathrooms} bath` : '',
      row.property_type || '',
      row.location || row.neighbourhood || '',
    ].filter(Boolean).join(' · ');
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: String(row.title || title),
      url: canonical,
      image: [image],
      description,
      ...(row.bedrooms ? { numberOfRooms: Number(row.bedrooms) } : {}),
      ...(row.bathrooms ? { numberOfBathroomsTotal: Number(row.bathrooms) } : {}),
      address: {
        '@type': 'PostalAddress',
        streetAddress: String(row.address || row.location || ''),
        addressLocality: String(row.city || 'Nairobi'),
        addressCountry: 'KE',
      },
      ...(Number.isFinite(price) && price > 0
        ? { offers: { '@type': 'Offer', priceCurrency: currency, price } }
        : {}),
    };
    const bodyHtml = `
      <h1>${esc(row.title || title)}</h1>
      ${facts ? `<p>${esc(facts)}</p>` : ''}
      ${Number.isFinite(price) && price > 0 ? `<p>${esc(currency)} ${esc(price.toLocaleString())}</p>` : ''}
      <img src="${esc(image)}" alt="${esc(row.title || title)}" width="1200" />
      <p>${esc(truncate(toPlain(row.description), 600))}</p>`;
    return { title, description, image, canonical, jsonLd, bodyHtml, found: true };
  }

  if (type === 'development') {
    const row = await firstRow('developments', (q) => q.eq('is_published', true));
    if (!row) return notFound;
    const title = withBrand(String(row.seo_title || row.title || 'New development in Nairobi'));
    const description = truncate(toPlain(row.seo_description || row.description || `New development in ${row.location || 'Nairobi'}, Kenya.`), 160);
    const image = pickImage(row);
    const canonical = `${SITE}/development/${slug}`;
    return {
      title, description, image, canonical,
      jsonLd: { '@context': 'https://schema.org', '@type': 'Residence', name: String(row.title || title), url: canonical, image: [image], description },
      bodyHtml: `<h1>${esc(row.title || title)}</h1><img src="${esc(image)}" alt="${esc(row.title || title)}" width="1200" /><p>${esc(truncate(toPlain(row.description), 600))}</p>`,
      found: true,
    };
  }

  if (type === 'neighbourhood') {
    const row = await firstRow('neighbourhoods', (q) => q.eq('is_published', true));
    if (!row) return notFound;
    const name = String(row.name || row.title || slug);
    const title = withBrand(`${name} — Property & Area Guide`);
    const description = truncate(toPlain(row.seo_description || row.description || row.intro || `Homes for sale and rent in ${name}, Nairobi.`), 160);
    const image = pickImage(row);
    const canonical = `${SITE}/neighbourhood/${slug}`;
    return {
      title, description, image, canonical,
      jsonLd: { '@context': 'https://schema.org', '@type': 'Place', name: `${name}, Nairobi, Kenya`, url: canonical, image: [image], description },
      bodyHtml: `<h1>${esc(name)}</h1><img src="${esc(image)}" alt="${esc(name)}" width="1200" /><p>${esc(truncate(toPlain(row.description || row.intro), 600))}</p>`,
      found: true,
    };
  }

  if (type === 'blog') {
    const row = await firstRow('blog_posts', (q) => q.eq('status', 'published'));
    if (!row) return notFound;
    const title = withBrand(String(row.seo_title || row.title || 'Oceans Kenya Blog'));
    const description = truncate(toPlain(row.seo_description || row.excerpt || row.summary || row.content), 160);
    const image = pickImage(row);
    const canonical = `${SITE}/blog/${slug}`;
    return {
      title, description, image, canonical,
      jsonLd: {
        '@context': 'https://schema.org', '@type': 'Article', headline: String(row.title || title), url: canonical,
        image: [image], description,
        ...(row.published_at || row.created_at ? { datePublished: String(row.published_at || row.created_at) } : {}),
        ...(row.updated_at ? { dateModified: String(row.updated_at) } : {}),
        publisher: { '@type': 'Organization', name: 'Oceans Kenya' },
      },
      bodyHtml: `<h1>${esc(row.title || title)}</h1><img src="${esc(image)}" alt="${esc(row.title || title)}" width="1200" /><p>${esc(truncate(toPlain(row.excerpt || row.summary || row.content), 600))}</p>`,
      found: true,
    };
  }

  return notFound;
}

function renderHtml(m: Meta): string {
  const robots = m.found ? 'index, follow' : 'noindex, follow';
  const jsonLd = Object.keys(m.jsonLd).length ? `<script type="application/ld+json">${JSON.stringify(m.jsonLd)}</script>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(m.title)}</title>
<meta name="description" content="${esc(m.description)}" />
<meta name="robots" content="${robots}" />
<link rel="canonical" href="${esc(m.canonical)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Oceans Kenya" />
<meta property="og:title" content="${esc(m.title)}" />
<meta property="og:description" content="${esc(m.description)}" />
<meta property="og:url" content="${esc(m.canonical)}" />
<meta property="og:image" content="${esc(m.image)}" />
<meta property="og:locale" content="en_KE" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(m.title)}" />
<meta name="twitter:description" content="${esc(m.description)}" />
<meta name="twitter:image" content="${esc(m.image)}" />
${jsonLd}
</head>
<body>
${m.bodyHtml}
<p><a href="${esc(m.canonical)}">View on Oceans Kenya</a></p>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const type = (url.searchParams.get('type') || '').trim();
    const slug = (url.searchParams.get('slug') || '').trim().replace(/[^a-zA-Z0-9\-_]/g, '');

    if (!type || !slug) {
      return new Response('Bad request', { status: 400, headers: { 'Content-Type': 'text/plain' } });
    }

    const meta = await loadMeta(type, slug);
    return new Response(renderHtml(meta), {
      status: meta.found ? 200 : 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Cache at the CDN so repeated crawler hits don't re-query the DB.
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error('prerender error:', err instanceof Error ? err.message : err);
    // Never fail the crawl hard — return a minimal, valid, non-indexed document.
    return new Response(
      renderHtml({
        title: 'Oceans Kenya',
        description: 'Premium property across Nairobi and Kenya.',
        image: DEFAULT_IMAGE,
        canonical: `${SITE}/`,
        jsonLd: {},
        bodyHtml: '',
        found: false,
      }),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
});
