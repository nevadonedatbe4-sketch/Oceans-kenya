/**
 * useMallListings - one broad, canonical fetch of published sale + rent
 * listings that carry coordinates, used by the mall explorer to compute
 * "nearby listings" per mall on the client (single query, no refetch storm).
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { applyPublicVisibility } from '@/lib/publicListings';
import { smartTitleCase, formatAreaName } from '@/lib/location';

interface ListingRow {
  id: string;
  title: string | null;
  slug: string | null;
  price: number | null;
  currency: string | null;
  price_prefix: string | null;
  price_postfix: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  main_image: string | null;
  images: string[] | null;
  neighbourhood: string | null;
  location: string | null;
  address: string | null;
  city: string | null;
  purpose: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface MallNearbyListing {
  id: string;
  slug: string;
  title: string;
  price: string;
  rawPrice: number;
  currency: string;
  purpose: 'sale' | 'rent';
  propertyType: string;
  category: string;
  beds: number;
  baths: number;
  image: string;
  area: string;
  lat: number;
  lng: number;
}

const SELECT =
  'id,title,slug,price,currency,price_prefix,price_postfix,property_type,bedrooms,bathrooms,main_image,images,neighbourhood,location,address,city,purpose,latitude,longitude';

function buildSlug(id: string, title: string): string {
  if (!title) return id;
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function toCategoryLabel(type: string): string {
  return (type || 'property')
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatPrice(price: number, currency: string, prefix?: string | null, postfix?: string | null): string {
  const p = prefix || '';
  const s = postfix || '';
  const cur = currency || 'KES';
  if (!price || price <= 0) return p || 'Price on request';
  const symbol =
    cur === 'USD' ? '$' : cur === 'KES' ? 'KES' : cur === 'GBP' ? '£' : cur === 'EUR' ? '€' : cur;
  return `${p}${symbol} ${price.toLocaleString()}${s}`;
}

function mapRow(row: ListingRow): MallNearbyListing | null {
  if (row.latitude == null || row.longitude == null) return null;
  const title = smartTitleCase(row.title || 'Untitled Property');
  const purpose: 'sale' | 'rent' = row.purpose === 'rent' ? 'rent' : 'sale';
  const images = row.images || [];
  const image = row.main_image || images[0] || '';
  const area = formatAreaName({
    address: row.address,
    neighbourhood: row.neighbourhood,
    location: row.location,
    city: row.city,
  });

  return {
    id: row.id,
    slug: row.slug || buildSlug(row.id, title),
    title,
    price: formatPrice(Number(row.price || 0), row.currency || 'KES', row.price_prefix, row.price_postfix),
    rawPrice: Number(row.price || 0),
    currency: row.currency || 'KES',
    purpose,
    propertyType: row.property_type || '',
    category: toCategoryLabel(row.property_type || ''),
    beds: Number(row.bedrooms ?? 0),
    baths: Number(row.bathrooms ?? 0),
    image,
    area,
    lat: Number(row.latitude),
    lng: Number(row.longitude),
  };
}

export function useMallListings() {
  const [listings, setListings] = useState<MallNearbyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const base = supabase
          .from('all_listings')
          .select(SELECT)
          .neq('title', '')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        // Canonical public visibility (is_published + live status).
        const query = applyPublicVisibility(base, 'active');
        const { data, error: queryError } = await query.limit(1000);
        if (queryError) throw queryError;

        const mapped = ((data || []) as unknown as ListingRow[])
          .map(mapRow)
          .filter((v): v is MallNearbyListing => v !== null);

        if (active) setListings(mapped);
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load listings');
      } finally {
        if (active) setLoading(false);
      }
    }

    run();
    return () => {
      active = false;
    };
  }, []);

  return { listings, loading, error };
}