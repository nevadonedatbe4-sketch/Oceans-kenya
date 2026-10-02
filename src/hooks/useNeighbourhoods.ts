import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { NON_PUBLIC_STATUS_LIST } from '@/lib/publicListings';
import { smartTitleCase } from '@/lib/location';

// ── DB row shapes ─────────────────────────────────────────────
export interface DBNeighbourhood {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  city: string;
  country: string;
  hero_image: string | null;
  summary: string | null;
  description: string | null;
  tags: string[] | null;
  vibe: string | null;
  target_market: string | null;
  is_published: boolean;
  content_html: string | null;
  expat_guide: string | null;
  practical_info: string | null;
  average_sale_price: number | null;
  rental_range_kes: string | null;
  latitude: number | null;
  longitude: number | null;
  propertyCount: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  author: string | null;
  featured_image: string | null;
  excerpt: string | null;
  published_at: string | null;
}

export interface NeighbourhoodStats {
  totalNeighbourhoods: number;
  totalListings: number;
  forSale: number;
  forRent: number;
}

export interface UseNeighbourhoodsReturn {
  neighbourhoods: DBNeighbourhood[];
  blogPosts: BlogPost[];
  stats: NeighbourhoodStats;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useNeighbourhoods(): UseNeighbourhoodsReturn {
  const [neighbourhoods, setNeighbourhoods] = useState<DBNeighbourhood[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState<NeighbourhoodStats>({
    totalNeighbourhoods: 0,
    totalListings: 0,
    forSale: 0,
    forRent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch published neighbourhoods
      const { data: dbHoods, error: hoodError } = await supabase
        .from('neighbourhoods')
        .select(
          'id, name, slug, sort_order, city, country, hero_image, summary, description, tags, vibe, target_market, content_html, expat_guide, practical_info, average_sale_price, rental_range_kes, latitude, longitude, is_published'
        )
        .eq('is_published', true)
        .order('name', { ascending: true });

      if (hoodError) throw hoodError;
      if (controller.signal.aborted) return;

      const hoodList = dbHoods || [];

      // Resolve a real photo for every neighbourhood. The public card/detail
      // render `hero_image`, but a photo uploaded through the admin Gallery tab
      // is stored in `neighbourhood_images` (the `hero_image` column can
      // legitimately be empty). Fall back to the first gallery image so a
      // neighbourhood that HAS an uploaded photo never shows an empty card.
      // (neighbourhood_images has a public read policy, so this works for
      // anonymous visitors too.)
      const { data: galleryRows } = await supabase
        .from('neighbourhood_images')
        .select('neighbourhood_id, url, sort_order')
        .order('sort_order', { ascending: true });

      const galleryFirst: Record<string, string> = {};
      (galleryRows || []).forEach((g: { neighbourhood_id: string | null; url: string | null }) => {
        if (g.neighbourhood_id && g.url && !galleryFirst[g.neighbourhood_id]) {
          galleryFirst[g.neighbourhood_id] = g.url;
        }
      });

      // Step 2: Fetch listings for property counts.
      // Visibility rules MUST match the search engine (is_published, non-sold,
      // not a new-development row) so the page count equals what a search shows.
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('neighbourhood, purpose, location')
        .eq('is_published', true)
        .not('status', 'in', NON_PUBLIC_STATUS_LIST)
        .or('is_new_development.eq.false,is_new_development.is.null');

      if (listingsError) throw listingsError;
      if (controller.signal.aborted) return;

      const allListings = listingsData || [];

      // Enrich neighbourhoods with property counts
      const enriched: DBNeighbourhood[] = hoodList.map((h) => {
        const name = (h as Record<string, unknown>).name as string;
        const areaListings = allListings.filter(
          (l) =>
            (l.neighbourhood && l.neighbourhood.toLowerCase() === name.toLowerCase()) ||
            (l.location && l.location.toLowerCase().includes(name.toLowerCase()))
        );
        const rawHero = (h as { hero_image?: string | null }).hero_image;
        const resolvedHero =
          (rawHero && rawHero.trim()) ||
          galleryFirst[(h as { id: string }).id] ||
          rawHero ||
          null;
        return {
          ...(h as unknown as DBNeighbourhood),
          hero_image: resolvedHero,
          // Normalise the display name through the shared casing normaliser so
          // neighbourhood titles stay consistent with the rest of the site.
          name: smartTitleCase(name),
          // Run the tag badges through the same normaliser so filter pills and
          // badges read consistently alongside titles across the whole site.
          tags: (h.tags || []).map((t) => smartTitleCase(t)).filter(Boolean),
          propertyCount: areaListings.length,
        };
      });

      setNeighbourhoods(enriched);
      setStats({
        totalNeighbourhoods: hoodList.length,
        totalListings: allListings.length,
        forSale: allListings.filter((l) => l.purpose === 'sale').length,
        forRent: allListings.filter((l) => l.purpose === 'rent').length,
      });

      // Step 3: Fetch blog posts.
      // Pull a generous slice so the Neighbourhoods "Blog" tab surfaces the full
      // publishing library (area guides, living guides, dining, market reports),
      // not just the most recent handful.
      const { data: posts, error: blogError } = await supabase
        .from('blog_posts')
        .select('id, title, slug, category, author, featured_image, excerpt, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(120);

      if (controller.signal.aborted) return;

      if (blogError) throw blogError;

      // Run every blog title through the same shared casing normaliser as
      // neighbourhoods and listings for site-wide uniformity.
      setBlogPosts(
        ((posts || []) as BlogPost[]).map((p) => ({
          ...p,
          title: smartTitleCase(p.title),
          // Same normaliser over the blog category so the filter pills and the
          // category badge read consistently with neighbourhoods and listings.
          category: p.category ? smartTitleCase(p.category) : p.category,
        })),
      );
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : 'Failed to load neighbourhoods';
      setError(message);
      setNeighbourhoods([]);
      setBlogPosts([]);
      setStats({ totalNeighbourhoods: 0, totalListings: 0, forSale: 0, forRent: 0 });
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { neighbourhoods, blogPosts, stats, loading, error, refetch };
}