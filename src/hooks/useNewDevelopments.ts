import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { newDevMocks } from '@/mocks/newDevelopments';
import type { NewDevMock } from '@/mocks/newDevelopments';

export interface NewDevListing {
  id: string;
  slug: string;
  title: string;
  location: string;
  price: number;
  priceDisplay: string;
  beds: number;
  baths: number;
  parking: number;
  sqft: number;
  propertyType: string;
  image: string;
  tag: string;
  featured: boolean;
  completionDate: string;
}

function formatPrice(price: number, currency: string): string {
  const symbol = currency === 'USD' ? '$' : currency === 'KES' ? 'KSh ' : currency === 'UGX' ? 'UGX ' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '';
  if (price >= 1_000_000) {
    return `${symbol}${(price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (price >= 1_000) {
    return `${symbol}${(price / 1_000).toFixed(0)}K`;
  }
  return `${symbol}${price.toLocaleString()}`;
}

function generateSlug(id: string, title: string): string {
  if (!title) return id;
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export function useNewDevelopments() {
  const [allListings, setAllListings] = useState<NewDevListing[]>([]);
  const [featuredListings, setFeaturedListings] = useState<NewDevListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchListings = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('listings')
        .select('*')
        .eq('is_published', true)
        .eq('purpose', 'sale')
        .neq('property_type', 'land')
        .neq('title', '')
        .gt('price', 0)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      const rows = (data || []) as Record<string, unknown>[];

      const mapped: NewDevListing[] = rows.map((row) => {
        const priceVal = Number(row.price) || 0;
        const currency = String(row.currency || 'KES');
        const img = String(row.main_image || row.cover_image || '');
        const title = String(row.title || '');
        const rowSlug = row.slug ? String(row.slug) : '';
        return {
          id: String(row.id),
          slug: rowSlug || generateSlug(String(row.id), title),
          title,
          location: String(row.location || ''),
          price: priceVal,
          priceDisplay: formatPrice(priceVal, currency),
          beds: Number(row.bedrooms) || 0,
          baths: Number(row.bathrooms) || 0,
          parking: Number(row.parking) || 0,
          sqft: Number(row.sqft) || 0,
          propertyType: String(row.property_type || ''),
          image: img,
          tag: 'For Sale',
          featured: Boolean(row.is_featured || row.featured_new_development),
          completionDate: String(row.completion_date || ''),
        };
      });

      // Filter to only listings that have at least a title and either a real slug or a valid id
      const validListings = mapped.filter((l) => l.title);

      if (validListings.length === 0) {
        // Fallback to mock data when Supabase has no matching listings
        setAllListings(newDevMocks);
        setFeaturedListings(newDevMocks.filter((l) => l.featured));
        setLoading(false);
        return;
      }

      const featured = validListings.filter((l) => l.featured);
      setFeaturedListings(featured.length > 0 ? featured.slice(0, 3) : validListings.slice(0, 3));
      setAllListings(validListings);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      // On error, fallback to mock data so the page still works
      setAllListings(newDevMocks);
      setFeaturedListings(newDevMocks.filter((l) => l.featured));
      setError(null);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchListings]);

  return { allListings, featuredListings, loading, error, refetch: fetchListings };
}