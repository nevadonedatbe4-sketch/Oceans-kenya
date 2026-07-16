import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

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
          'id, name, slug, sort_order, city, country, hero_image, summary, description, tags, vibe, target_market, content_html, expat_guide, practical_info, average_sale_price, rental_range_kes, is_published'
        )
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (hoodError) throw hoodError;
      if (controller.signal.aborted) return;

      const hoodList = dbHoods || [];

      // Step 2: Fetch listings for property counts
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('neighbourhood, purpose, location')
        .eq('is_published', true)
        .eq('status', 'available');

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
        return {
          ...(h as unknown as DBNeighbourhood),
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

      // Step 3: Fetch blog posts
      const { data: posts, error: blogError } = await supabase
        .from('blog_posts')
        .select('id, title, slug, category, author, featured_image, excerpt, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(6);

      if (controller.signal.aborted) return;

      if (blogError) throw blogError;

      setBlogPosts((posts || []) as BlogPost[]);
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