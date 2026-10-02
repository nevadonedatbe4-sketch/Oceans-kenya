import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface CommercialPropertyPageContent {
  // Hero (buy / rent variants)
  hero_image: string;
  hero_eyebrow_buy: string;
  hero_eyebrow_rent: string;
  hero_title_buy: string;
  hero_title_rent: string;
  hero_subtitle_buy: string;
  hero_subtitle_rent: string;
  // Results header
  results_heading_buy: string;
  results_heading_rent: string;
  results_count_label: string;
  // Sidebar
  sidebar_section_title: string;
  sidebar_refine_text: string;
  recently_viewed_label: string;
  popular_areas_label: string;
  popular_areas: string[];
  related_searches_label: string;
  related_searches: string[];
  // Sidebar "Advertise" CTA
  list_cta_heading: string;
  list_cta_text: string;
  list_cta_button: string;
  list_cta_button_link: string;
  // Bottom alert CTA
  alert_heading: string;
  alert_text: string;
  alert_button: string;
  alert_success: string;
  // Footer CTA
  footer_eyebrow: string;
  footer_heading: string;
  footer_text: string;
  footer_button: string;
  footer_button_link: string;
  // Empty / error states
  empty_title: string;
  empty_text: string;
  empty_clear_label: string;
  empty_advertise_label: string;
  error_title: string;
  error_retry_label: string;
  // Controls
  create_alert_label: string;
  sort_label: string;
  list_label: string;
  map_label: string;
  // Visibility
  show_hero: boolean;
  show_hero_image: boolean;
  show_sidebar: boolean;
  show_alert_cta: boolean;
  show_footer_cta: boolean;
}

// Seed values mirror the current published content. The database is the single
// source of truth once the Commercial Property editor is saved.
export const DEFAULT_COMMERCIAL_PROPERTY_CONTENT: CommercialPropertyPageContent = {
  hero_image: '',
  hero_eyebrow_buy: 'Commercial Sales',
  hero_eyebrow_rent: 'Commercial Lettings',
  hero_title_buy: 'Commercial Property For Sale',
  hero_title_rent: 'Commercial Property To Rent',
  hero_subtitle_buy: 'Discover premium office, retail, and industrial properties for sale.',
  hero_subtitle_rent: 'Explore premium office, retail, and industrial properties to rent.',
  results_heading_buy: 'Commercial properties for sale',
  results_heading_rent: 'Commercial properties to rent',
  results_count_label: 'properties',
  sidebar_section_title: 'Commercial property',
  sidebar_refine_text: 'Refine your search to find the perfect commercial space',
  recently_viewed_label: 'Recently Viewed',
  popular_areas_label: 'Popular areas',
  popular_areas: [
    'Karen', 'Westlands', 'Kilimani', 'Upper Hill', 'CBD', 'Industrial Area',
    'Mombasa Road', 'Parklands', 'Gigiri', 'Lavington', 'Ngong Road', 'Riverside',
  ],
  related_searches_label: 'Related searches',
  related_searches: [
    'Commercial offices to rent',
    'Retail shops to rent',
    'Warehouses to rent',
    'Industrial property for sale',
    'Commercial land for sale',
  ],
  list_cta_heading: 'Advertise your property',
  list_cta_text: 'List your commercial property with us',
  list_cta_button: 'Get started',
  list_cta_button_link: '/c/commercial-advertising/',
  alert_heading: "Can't find what you're looking for?",
  alert_text: 'Register for commercial property alerts and be the first to know about new listings.',
  alert_button: 'Get alerts',
  alert_success: "Thank you! We'll respond within 24 hours.",
  footer_eyebrow: 'Own Commercial Property?',
  footer_heading: 'Advertise Your Commercial Property',
  footer_text: 'Reach thousands of qualified businesses and investors. Get a free valuation today.',
  footer_button: 'List Your Property',
  footer_button_link: '/c/commercial-advertising/',
  empty_title: 'No commercial properties found',
  empty_text: 'There are currently no commercial listings available. Check back soon or advertise your property with us.',
  empty_clear_label: 'Clear filters',
  empty_advertise_label: 'Advertise with us',
  error_title: 'Something went wrong',
  error_retry_label: 'Try again',
  create_alert_label: 'Create alert',
  sort_label: 'Sort:',
  list_label: 'List',
  map_label: 'Map',
  show_hero: true,
  show_hero_image: false,
  show_sidebar: true,
  show_alert_cta: true,
  show_footer_cta: true,
};

const BOOLEAN_KEYS: (keyof CommercialPropertyPageContent)[] = [
  'show_hero', 'show_hero_image', 'show_sidebar', 'show_alert_cta', 'show_footer_cta',
];

const STRING_LIST_KEYS: (keyof CommercialPropertyPageContent)[] = [
  'popular_areas', 'related_searches',
];

let cache: CommercialPropertyPageContent | null = null;
let inflight: Promise<CommercialPropertyPageContent> | null = null;

function cloneDefaults(): CommercialPropertyPageContent {
  return {
    ...DEFAULT_COMMERCIAL_PROPERTY_CONTENT,
    popular_areas: [...DEFAULT_COMMERCIAL_PROPERTY_CONTENT.popular_areas],
    related_searches: [...DEFAULT_COMMERCIAL_PROPERTY_CONTENT.related_searches],
  };
}

async function loadContent(): Promise<CommercialPropertyPageContent> {
  const map = cloneDefaults();
  const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'page_commprop_%');
  if (data) {
    data.forEach((r: { key: string; value: string | null }) => {
      if (r.value === null) return;
      const field = r.key.replace('page_commprop_', '') as keyof CommercialPropertyPageContent;
      if (!(field in map)) return;
      if (STRING_LIST_KEYS.includes(field)) {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed)) {
            (map as unknown as Record<string, unknown>)[field] = parsed.map((v) => String(v).trim()).filter(Boolean);
          }
        } catch { /* keep default */ }
        return;
      }
      if (BOOLEAN_KEYS.includes(field)) {
        (map as unknown as Record<string, unknown>)[field] = r.value === 'true';
      } else {
        (map as unknown as Record<string, unknown>)[field] = r.value;
      }
    });
  }
  return map;
}

export function useCommercialPropertyPageContent() {
  const [content, setContent] = useState<CommercialPropertyPageContent>(cache || cloneDefaults());
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (cache) { setContent(cache); setLoading(false); return; }
    if (!inflight) inflight = loadContent();
    inflight
      .then((result) => {
        cache = result;
        if (active) { setContent(result); setLoading(false); }
      })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { content, loading };
}

export function invalidateCommercialPropertyPageContentCache() {
  cache = null;
  inflight = null;
}