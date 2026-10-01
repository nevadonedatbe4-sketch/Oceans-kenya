import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AREA_GUIDE_PAGES } from '@/lib/areaGuides';
import { smartTitleCase } from '@/lib/location';
import {
  PROPERTY_TYPE_LINKS,
  COMMERCIAL_TYPE_LINKS,
  DEFAULT_TYPE_LINKS,
  FALLBACK_FOOTER_AREAS,
  type FooterLink,
} from '@/lib/footerLinks';

/** Prefer the SEO area-guide cluster page when one exists for this slug. */
function areaHref(slug: string): string {
  return AREA_GUIDE_PAGES[`area-guides/${slug}`]
    ? `/area-guides/${slug}`
    : `/neighbourhood/${slug}`;
}

export interface FooterData {
  areas: FooterLink[];
  typeLinks: FooterLink[];
}

/**
 * Load the dynamic footer data straight from the database:
 *   • published neighbourhoods → Popular Locations
 *   • published property types → Property Types (residential only shown when real)
 * Falls back to curated defaults so the footer is never empty or broken.
 */
export function useFooterData(): FooterData {
  const [areas, setAreas] = useState<FooterLink[]>(FALLBACK_FOOTER_AREAS);
  const [typeLinks, setTypeLinks] = useState<FooterLink[]>(DEFAULT_TYPE_LINKS);

  useEffect(() => {
    let cancelled = false;

    // Popular Locations - from live published neighbourhoods.
    supabase
      .from('neighbourhoods')
      .select('name, slug')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .limit(20)
      .then(({ data }) => {
        if (cancelled || !data || data.length === 0) return;
        const mapped = (data as Array<{ name: string | null; slug: string | null }>)
          .filter((r) => r.slug && r.name)
          .map((r) => ({ label: smartTitleCase(String(r.name)), href: areaHref(String(r.slug)) }));
        if (mapped.length > 0) setAreas(mapped);
      });

    // Property Types - only surface types that actually exist in listings.
    supabase
      .from('listings')
      .select('property_type')
      .eq('is_published', true)
      .limit(2000)
      .then(({ data }) => {
        if (cancelled || !data || data.length === 0) return;
        const present = new Set(
          (data as Array<{ property_type: string | null }>).map((r) =>
            String(r.property_type || '')
              .toLowerCase()
              .trim()
              .replace(/\s+/g, '_'),
          ),
        );
        const matched = PROPERTY_TYPE_LINKS.filter((l) =>
          l.match.some((m) => present.has(m.replace(/\s+/g, '_'))),
        ).map(({ label, href }) => ({ label, href }));
        if (matched.length > 0) setTypeLinks([...matched, ...COMMERCIAL_TYPE_LINKS]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { areas, typeLinks };
}