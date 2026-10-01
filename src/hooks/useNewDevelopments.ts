import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatAreaName, smartTitleCase } from '@/lib/location';

/**
 * A single unit/listing that belongs to a development.
 */
export interface DevelopmentUnit {
  id: string;
  slug: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  price: number;
  currency: string;
  size: number;
  sizeUnit: string;
  image: string;
  images: string[];
  description: string;
  descriptionText: string;
  createdAt: string;
  videoUrl: string;
  /** Raw CRM status of this unit record (available / reserved / sold…). */
  status: string;
}

/**
 * A development/project grouped from its underlying listings/units.
 * Grouping is a real, data-driven provision: listings that share a project
 * name are merged into one Development (a single-title project stays one).
 * All unit types, features, gallery and prices are derived from the grouped
 * records - nothing is invented, nothing is hard-coded.
 */
export interface DevelopmentBrochure {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Development {
  /** Stable grouping key (normalised project name). */
  key: string;
  name: string;
  slug: string;
  location: string;
  city: string;
  address: string;
  developer: string;
  description: string;
  descriptionText: string;
  status: string;
  category: string;
  listingType: string;
  propertyType: string;
  isFeatured: boolean;
  totalUnits: number;
  unitsSold: number;
  gallery: string[];
  features: string[];
  /** True only when the project genuinely has more than one distinct price. */
  hasPriceRange: boolean;
  lowestPrice: number;
  currency: string;
  unitTypes: { label: string; beds: number; price: number; currency: string }[];
  units: DevelopmentUnit[];
  /** Real attached brochure (validated), or null when the project has none. */
  brochure: DevelopmentBrochure | null;
  /** Real created_at of the primary unit (ISO string) for the "listed on" line. */
  createdAt: string;
  /** First real attached video across the project's units, or ''. */
  videoUrl: string;
  /** Expected/actual completion date (ISO) from the CRM, or ''. */
  completionDate: string;
  /** Developer contact channels, when captured in the CRM. */
  developerPhone: string;
  developerEmail: string;
  /** Number of floors in the project, when captured. */
  floors: number;
  /** Units reserved in the CRM, when captured. */
  unitsReserved: number;
}

const toNumber = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toString = (v: unknown): string => (v == null ? '' : String(v));

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitle(input?: string): string {
  const s = smartTitleCase(input || '');
  return s || 'Untitled Development';
}

/** Stable project key used to group listings that belong to the same development. */
function projectKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function bedLabel(beds: number): string {
  if (beds <= 0) return 'Studio / Off-plan';
  if (beds === 1) return '1 Bed';
  if (beds === 2) return '2 Beds';
  if (beds === 3) return '3 Beds';
  if (beds === 4) return '4 Beds';
  return `${beds} Beds`;
}

const UNIQUE = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

/** A URL is only usable as a brochure when it is a real, absolute http(s) link. */
function isUsableUrl(value: unknown): boolean {
  const s = toString(value).trim();
  return /^https?:\/\//i.test(s);
}

/**
 * Resolve the actual attached brochure for a project from its units' real
 * `documents` payload. We never trust a bare flag: the entry must exist, be a
 * brochure, and carry a well-formed URL - otherwise it counts as unavailable.
 */
function resolveBrochure(rows: Record<string, unknown>[]): DevelopmentBrochure | null {
  for (const row of rows) {
    const docs = row.documents;
    if (!Array.isArray(docs)) continue;
    const normalized = docs
      .filter((d) => d && typeof d === 'object')
      .map((d) => d as Record<string, unknown>);
    if (normalized.length === 0) continue;
    const byCategory = normalized.filter((d) => toString(d.category).toLowerCase() === 'brochure');
    const byName = normalized.filter((d) => toString(d.name).toLowerCase().includes('brochure'));
    const candidate = [...byCategory, ...byName].find((d) => isUsableUrl(d.url));
    if (candidate) {
      return {
        name: toString(candidate.name) || 'Property Brochure',
        url: toString(candidate.url).trim(),
        type: toString(candidate.type) || 'pdf',
        size: toNumber(candidate.size),
      };
    }
  }
  return null;
}

/**
 * Fetch published New Developments straight from `listings`, then group the
 * returned records into real Development projects.
 *
 * One flat query (no joins, no Promise.all). A failed query is reported as an
 * error - it is never converted into "0 results".
 */
export function useNewDevelopments() {
  const [developments, setDevelopments] = useState<Development[]>([]);
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
        .select(
          'id, slug, title, description, location, neighbourhood, address, city, ' +
            'property_type, property_category, listing_type, bedrooms, bathrooms, parking, ' +
            'price, current_price, currency, main_image, cover_image, images, sqft, size, size_unit, ' +
            'is_featured, development_stage, developer_name, developer_phone, developer_email, total_units, units_sold, units_reserved, floors, completion_date, status, amenities, documents, video_url, created_at'
        )
        .eq('is_new_development', true)
        .eq('is_published', true)
        .order('title', { ascending: true });

      if (dbError) {
        console.error('[NewDevelopments] query failed:', dbError);
        setError(dbError.message || 'Failed to load developments.');
        setDevelopments([]);
        return;
      }

      const rows = (data || []) as Record<string, unknown>[];

      // ---- group into projects keyed by normalised name ----
      const groups = new Map<string, Record<string, unknown>[]>();
      for (const row of rows) {
        const key = projectKey(toString(row.title));
        const arr = groups.get(key) || [];
        arr.push(row);
        groups.set(key, arr);
      }

      const mapped: Development[] = Array.from(groups.values()).map((groupRows) => {
        const units: DevelopmentUnit[] = groupRows.map((row) => {
          const description = toString(row.description);
          const mainImg = toString(row.main_image);
          const coverImg = toString(row.cover_image);
          const images = Array.isArray(row.images)
            ? (row.images as unknown[]).map((i) => toString(i)).filter(Boolean)
            : [];
          const size = toNumber(row.size) || toNumber(row.sqft) || 0;
          return {
            id: toString(row.id),
            slug: toString(row.slug) || toString(row.id),
            name: toTitle(toString(row.title)),
            bedrooms: toNumber(row.bedrooms),
            bathrooms: toNumber(row.bathrooms),
            parking: toNumber(row.parking),
            price: toNumber(row.price) || toNumber(row.current_price),
            currency: toString(row.currency) || 'KES',
            size,
            sizeUnit: toString(row.size_unit) || 'sqft',
            image: mainImg || coverImg || (images[0] as string) || '',
            images: UNIQUE([mainImg, coverImg, ...images].filter(Boolean)),
            description,
            descriptionText: stripHtml(description),
            createdAt: toString(row.created_at),
            videoUrl: toString(row.video_url),
            status: toString(row.status),
          };
        });

        // Sort units by price ascending so the first is the genuine lowest.
        const sorted = [...units].sort((a, b) => {
          if (a.price <= 0) return 1;
          if (b.price <= 0) return -1;
          return a.price - b.price;
        });
        const primary = sorted[0] || units[0];

        const positivePrices = sorted.map((u) => u.price).filter((p) => p > 0);
        const distinctPrices = new Set(positivePrices);
        const lowestPrice = positivePrices.length ? Math.min(...positivePrices) : 0;

        const gallery = UNIQUE(sorted.flatMap((u) => u.images));
        const videoUrl = sorted.find((u) => u.videoUrl)?.videoUrl || '';
        const features = UNIQUE(
          groupRows.flatMap((r) =>
            Array.isArray(r.amenities) ? (r.amenities as unknown[]).map((i) => toString(i)).filter(Boolean) : []
          )
        );

        const neighbourhood = toString(primaryMapped(groupRows, 'neighbourhood'));
        const area = formatAreaName({
          neighbourhood,
          address: toString(primaryMapped(groupRows, 'address')),
          location: toString(primaryMapped(groupRows, 'location')),
          city: toString(primaryMapped(groupRows, 'city')),
        });

        const totalUnits = toNumber(primaryMapped(groupRows, 'total_units'));
        const unitsSold = toNumber(primaryMapped(groupRows, 'units_sold'));

        return {
          key: projectKey(toString(primaryMapped(groupRows, 'title'))),
          name: toTitle(toString(primaryMapped(groupRows, 'title'))),
          slug: primary.slug,
          location: area,
          city: toString(primaryMapped(groupRows, 'city')),
          address: toString(primaryMapped(groupRows, 'address')),
          developer: toString(primaryMapped(groupRows, 'developer_name')),
          description: toString(primaryMapped(groupRows, 'description')),
          descriptionText: stripHtml(toString(primaryMapped(groupRows, 'description'))),
          status: toString(primaryMapped(groupRows, 'development_stage')),
          category: toString(primaryMapped(groupRows, 'property_category')),
          listingType: toString(primaryMapped(groupRows, 'listing_type')),
          propertyType: toString(primaryMapped(groupRows, 'property_type')) || 'apartment',
          isFeatured: groupRows.some((r) => Boolean(r.is_featured)),
          totalUnits,
          unitsSold,
          gallery,
          features,
          hasPriceRange: distinctPrices.size > 1,
          lowestPrice,
          currency: primary.currency || 'KES',
          unitTypes: sorted.map((u) => ({
            label: bedLabel(u.bedrooms),
            beds: u.bedrooms,
            price: u.price,
            currency: u.currency,
          })),
          units: sorted,
          brochure: resolveBrochure(groupRows),
          createdAt: primary.createdAt,
          videoUrl,
          completionDate: toString(primaryMapped(groupRows, 'completion_date')),
          developerPhone: toString(primaryMapped(groupRows, 'developer_phone')),
          developerEmail: toString(primaryMapped(groupRows, 'developer_email')),
          floors: toNumber(primaryMapped(groupRows, 'floors')),
          unitsReserved: toNumber(primaryMapped(groupRows, 'units_reserved')),
        };
      });

      setDevelopments(
        mapped.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred loading developments.';
      console.error('[NewDevelopments] unexpected error:', err);
      setError(message);
      setDevelopments([]);
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

  return { developments, loading, error, refetch: fetchListings };
}

/** Returns the first non-empty value for a column across a group's rows. */
function primaryMapped(rows: Record<string, unknown>[], key: string): unknown {
  for (const row of rows) {
    const v = row[key];
    if (v != null && String(v).trim() !== '') return v;
  }
  return rows[0]?.[key];
}