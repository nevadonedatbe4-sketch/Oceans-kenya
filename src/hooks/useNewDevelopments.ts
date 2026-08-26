import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatAreaName } from '@/lib/location';

export interface NewDevListing {
  id: string;
  slug: string;
  title: string;
  location: string;
  area: string;
  price: number;
  currency: string;
  beds: number;
  baths: number;
  parking: number;
  sqft: number;
  propertyType: string;
  image: string;
  tag: string;
  featured: boolean;
  completionDate: string;
  developmentStage: string;
  developer: string;
  developerLogo: string;
  featureList?: string[];
  floorPlans?: string[];
}

export interface DevUnitOption {
  beds: number;
  fromPrice: number;
  currency: string;
}

export interface DevelopmentGroup {
  id: string;
  name: string;
  location: string;
  area: string;
  developer: string;
  developerLogo: string;
  image: string;
  featured: boolean;
  completionDate: string;
  developmentStage: string;
  propertyType: string;
  unitOptions: DevUnitOption[];
  slug: string;
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
  const [locations, setLocations] = useState<string[]>(['All Areas']);
  const abortRef = useRef<AbortController | null>(null);

  const fetchListings = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const [listingsResult, neighbourhoodsResult] = await Promise.all([
        supabase
          .from('listings')
          .select('*')
          .eq('is_published', true)
          .eq('is_new_development', true)
          .neq('property_type', 'land')
          .neq('title', '')
          .gt('price', 0)
          .order('created_at', { ascending: false }),
        supabase
          .from('neighbourhoods')
          .select('name')
          .eq('is_published', true)
          .order('name'),
      ]);

      const { data, error: dbError } = listingsResult;
      if (dbError) throw dbError;

      const rows = (data || []) as Record<string, unknown>[];

      const mapped: NewDevListing[] = rows.map((row) => {
        const priceVal = Number(row.price) || 0;
        const currency = String(row.currency || 'KES');
        const img = String(row.main_image || row.cover_image || '');
        const title = String(row.title || '');
        const rowSlug = row.slug ? String(row.slug) : '';
        const developer = String(row.owner_name || row.developer || '').trim();
        const area = formatAreaName({
          address: String(row.address || ''),
          neighbourhood: String(row.neighbourhood || ''),
          location: String(row.location || ''),
          city: String(row.city || ''),
        });
        return {
          id: String(row.id),
          slug: rowSlug || generateSlug(String(row.id), title),
          title,
          location: String(row.location || row.neighbourhood || ''),
          area,
          price: priceVal,
          currency,
          beds: Number(row.bedrooms) || 0,
          baths: Number(row.bathrooms) || 0,
          parking: Number(row.parking) || 0,
          sqft: Number(row.sqft) || 0,
          propertyType: String(row.property_type || ''),
          image: img,
          tag: 'For Sale',
          featured: Boolean(row.is_featured || row.featured_new_development),
          completionDate: String(row.completion_date || ''),
          developmentStage: String(row.development_stage || ''),
          developer,
          developerLogo: '',
          featureList: Array.isArray(row.amenities) ? row.amenities as string[] : [],
          floorPlans: Array.isArray(row.floor_plans) ? row.floor_plans as string[] : [],
        };
      });

      const validListings = mapped.filter((l) => l.title);

      if (validListings.length === 0) {
        setAllListings([]);
        setFeaturedListings([]);
        setLoading(false);
        return;
      }

      const featured = validListings.filter((l) => l.featured);
      const nonFeatured = validListings.filter((l) => !l.featured);
      setFeaturedListings([...featured, ...nonFeatured].slice(0, 12));
      setAllListings(validListings);

      // Process neighbourhoods from database
      const neighbourhoodNames = (neighbourhoodsResult.data || [])
        .map((n: Record<string, unknown>) => String(n.name || ''))
        .filter(Boolean);

      const sortedNeighbourhoods = neighbourhoodNames.sort((a, b) => {
        if (a.toLowerCase() === 'westlands') return -1;
        if (b.toLowerCase() === 'westlands') return 1;
        return a.localeCompare(b);
      });

      setLocations(['All Areas', ...sortedNeighbourhoods]);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setAllListings([]);
      setFeaturedListings([]);
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

  // Locations are populated from the database neighbourhoods table

  /**
   * Group individual listings into Zoopla-style development cards.
   * Listings that share the same developer AND location area are merged
   * into a single development with multiple bedroom/price options.
   * Standalone listings become single-unit development cards.
   */
  const developments = useMemo((): DevelopmentGroup[] => {
    const source = allListings.length > 0 ? allListings : [];
    const groups = new Map<string, NewDevListing[]>();

    source.forEach((listing) => {
      const area = listing.location.split(',')[0].trim().toLowerCase();
      const devKey = listing.developer
        ? `${listing.developer.toLowerCase()}|||${area}`
        : listing.id;
      const existing = groups.get(devKey) || [];
      existing.push(listing);
      groups.set(devKey, existing);
    });

    const result: DevelopmentGroup[] = [];
    groups.forEach((listings) => {
      const sorted = [...listings].sort((a, b) => a.beds - b.beds);
      if (listings.length === 1) {
        const l = listings[0];
        result.push({
          id: l.id,
          name: l.title,
          location: l.location,
          area: l.area,
          developer: l.developer,
          developerLogo: l.developerLogo,
          image: l.image,
          featured: l.featured,
          completionDate: l.completionDate,
          developmentStage: l.developmentStage,
          propertyType: l.propertyType,
          slug: l.slug,
          unitOptions: [{ beds: l.beds, fromPrice: l.price, currency: l.currency }],
        });
      } else {
        const primary = sorted[sorted.length - 1];
        const name = primary.developer || primary.title;
        result.push({
          id: primary.id,
          name,
          location: primary.location,
          area: primary.area,
          developer: primary.developer,
          developerLogo: primary.developerLogo,
          image: primary.image,
          featured: primary.featured || listings.some((l) => l.featured),
          completionDate: primary.completionDate,
          developmentStage: primary.developmentStage,
          propertyType: primary.propertyType,
          slug: primary.slug,
          unitOptions: sorted.map((l) => ({ beds: l.beds, fromPrice: l.price, currency: l.currency })),
        });
      }
    });

    return result;
  }, [allListings]);

  return { allListings, developments, featuredListings, loading, error, locations, refetch: fetchListings };
}