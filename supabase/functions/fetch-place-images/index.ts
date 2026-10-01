import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Fetches a real logo / photo for each place from its own website and saves it.
//
// For every place that has a website, this downloads the site's social/cover
// image (og:image → twitter:image → apple-touch-icon → favicon), stores the
// bytes in the public "images" bucket, and writes the resulting public URL into
// amenities.image — replacing the generic category image that is stored by
// default. Rows that already hold a real (non-category) image are left alone.
//
// It processes one small batch per call so a single invocation never times out;
// the frontend calls it repeatedly until nothing is left to do. Rows whose
// website can't be used or whose fetch fails are marked so they are not retried
// forever (pass force:true + ids to retry specific rows).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const BUCKET = 'images';
const FETCH_TIMEOUT = 9000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// A stored image is "still a placeholder" when it points at the generated
// category art rather than a real photo pulled from the place's own site.
const PLACEHOLDER_FILTER = 'image.is.null,image.like.*readdy.ai*';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Turn a messy stored website into a usable URL, or null when unusable. */
function sanitizeWebsite(raw: string | null): string | null {
  if (!raw) return null;
  let s = String(raw).replace(/\[[0-9 ,]+\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (/website\s*listed/i.test(s)) return null;
  if (/\s/.test(s)) s = s.split(' ')[0];
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!u.hostname.includes('.')) return null;
    return u.href;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = FETCH_TIMEOUT): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,image/*,*/*' },
    });
  } finally {
    clearTimeout(t);
  }
}

/** Pick the best available image for a page: cover image first, then icon. */
function extractImageUrl(html: string, base: string): string | null {
  const meta = [
    /<meta[^>]+(?:property|name)=["'](?:og:image:secure_url|og:image|twitter:image:src|twitter:image)["'][^>]*>/gi,
  ];
  for (const re of meta) {
    for (const m of html.matchAll(re)) {
      const content = m[0].match(/content=["']([^"']+)["']/i)?.[1];
      if (content) {
        try { return new URL(content, base).href; } catch { /* ignore */ }
      }
    }
  }
  const links = [
    /<link[^>]+rel=["']apple-touch-icon[^"']*["'][^>]*>/gi,
    /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi,
  ];
  for (const re of links) {
    for (const m of html.matchAll(re)) {
      const href = m[0].match(/href=["']([^"']+)["']/i)?.[1];
      if (href) {
        try { return new URL(href, base).href; } catch { /* ignore */ }
      }
    }
  }
  return null;
}

function extFromContentType(ct: string, url: string): string {
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('svg')) return 'svg';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  const m = url.split('?')[0].match(/\.(png|jpe?g|webp|gif|svg)$/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  let body: { limit?: number; ids?: string[]; force?: boolean } = {};
  try { body = await req.json(); } catch { body = {}; }

  const limit = Math.min(Math.max(Number(body.limit) || 8, 1), 25);
  const force = body.force === true;
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean).slice(0, 25) : [];

  const columns = 'id, name, website, image, attributes';

  let query = supabase.from('amenities').select(columns);
  if (ids.length) {
    query = query.in('id', ids);
  } else {
    query = query
      .not('website', 'is', null)
      .neq('website', '')
      .is('deleted_at', null)
      .is('attributes->>image_fetch_failed', null)
      .order('name', { ascending: true })
      .limit(limit);
    if (!force) query = query.or(PLACEHOLDER_FILTER);
  }

  const { data: rows, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const results: Array<{ id: string; name: string; image?: string; error?: string }> = [];

  await Promise.all((rows || []).map(async (row: Record<string, unknown>) => {
    const id = String(row.id);
    const name = String(row.name ?? '');
    const site = sanitizeWebsite(row.website as string | null);
    if (!site) {
      await supabase.from('amenities').update({
        attributes: { ...(row.attributes as Record<string, unknown> || {}), image_fetch_failed: true, image_fetch_error: 'no usable website' },
      }).eq('id', id);
      results.push({ id, name, error: 'no usable website' });
      return;
    }
    try {
      const pageRes = await fetchWithTimeout(site, { redirect: 'follow' });
      if (!pageRes.ok) throw new Error(`site ${pageRes.status}`);
      const html = (await pageRes.text()).slice(0, 400000);
      const imgUrl = extractImageUrl(html, pageRes.url || site);
      if (!imgUrl) throw new Error('no image found');

      const imgRes = await fetchWithTimeout(imgUrl, { redirect: 'follow' });
      if (!imgRes.ok) throw new Error(`image ${imgRes.status}`);
      const ct = imgRes.headers.get('content-type') || '';
      if (!ct.startsWith('image/')) throw new Error('not an image');
      const buf = new Uint8Array(await imgRes.arrayBuffer());
      if (buf.byteLength < 512) throw new Error('image too small');
      if (buf.byteLength > 8_000_000) throw new Error('image too large');

      const ext = extFromContentType(ct, imgUrl);
      const path = `places/${id}.${ext}`;
      const up = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true });
      if (up.error) throw new Error(up.error.message);
      const pub = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

      const attrs = { ...(row.attributes as Record<string, unknown> || {}) };
      delete attrs.image_fetch_failed;
      delete attrs.image_fetch_error;
      const upd = await supabase.from('amenities').update({ image: pub, alt_text: name || null, attributes: attrs }).eq('id', id);
      if (upd.error) throw new Error(upd.error.message);

      results.push({ id, name, image: pub });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'failed';
      await supabase.from('amenities').update({
        attributes: { ...(row.attributes as Record<string, unknown> || {}), image_fetch_failed: true, image_fetch_error: message },
      }).eq('id', id);
      results.push({ id, name, error: message });
    }
  }));

  const updated = results.filter((r) => r.image).length;

  let remaining = 0;
  if (!ids.length) {
    let countQuery = supabase
      .from('amenities')
      .select('id', { count: 'exact', head: true })
      .not('website', 'is', null)
      .neq('website', '')
      .is('deleted_at', null)
      .is('attributes->>image_fetch_failed', null);
    if (!force) countQuery = countQuery.or(PLACEHOLDER_FILTER);
    const { count } = await countQuery;
    remaining = count ?? 0;
  }

  return json({ processed: results.length, updated, remaining, results });
});
