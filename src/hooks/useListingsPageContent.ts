import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface QuickLink {
  label: string;
  link: string;
}

export interface ListingsPageContent {
  // Results header
  heading_buy: string;
  heading_rent: string;
  count_label: string;
  search_label: string;
  // Sidebar section labels
  recently_viewed_label: string;
  refine_label: string;
  popular_areas_label: string;
  related_searches_label: string;
  quick_links_label: string;
  // Sidebar lists
  popular_areas: string[];
  related_searches_buy: string[];
  related_searches_rent: string[];
  rent_quick_links: QuickLink[];
  // Sidebar "List your property" CTA
  list_cta_heading: string;
  list_cta_text_buy: string;
  list_cta_text_rent: string;
  list_cta_button: string;
  list_cta_button_link: string;
  // Bottom alert CTA
  alert_heading: string;
  alert_text_buy: string;
  alert_text_rent: string;
  alert_button: string;
  // Footer CTA
  footer_eyebrow: string;
  footer_heading: string;
  footer_text_buy: string;
  footer_text_rent: string;
  footer_button_buy: string;
  footer_button_rent: string;
  footer_button_link: string;
  // Section visibility
  show_sidebar: boolean;
  show_alert_cta: boolean;
  show_footer_cta: boolean;
  // All Properties page
  ap_heading_all: string;
  ap_heading_sale: string;
  ap_heading_rent: string;
  ap_listings_label: string;
  ap_sort_label: string;
  ap_tab_all: string;
  ap_tab_sale: string;
  ap_tab_rent: string;
  ap_saved_label: string;
  ap_saved_text: string;
  ap_quick_links_label: string;
  ap_quick_links: QuickLink[];
  ap_show_sidebar: boolean;
}

// Seed values mirror the current published content. The database is the single
// source of truth once the Listing Pages editor is saved; these are only the
// first-run fallback so the public pages never render empty before the first save.
export const DEFAULT_LISTINGS_CONTENT: ListingsPageContent = {
  heading_buy: 'Properties for sale',
  heading_rent: 'Properties to rent',
  count_label: 'properties',
  search_label: 'You searched for',
  recently_viewed_label: 'Recently Viewed',
  refine_label: 'Refine your search',
  popular_areas_label: 'Popular areas',
  related_searches_label: 'Related searches',
  quick_links_label: 'Quick links',
  popular_areas: [
    'Karen', 'Runda', 'Lavington', 'Kilimani', 'Westlands', 'Kileleshwa',
    'Muthaiga', 'Parklands', 'Riverside', 'Gigiri', 'Spring Valley', 'Nyari',
    'Langata', 'Kiserian', 'Ongata Rongai', 'Ngong', 'Kitengela', 'Athi River',
  ],
  related_searches_buy: [
    'New homes for sale', 'Properties for sale', 'Explore house prices', 'Find estate agents',
    'Commercial properties for sale', 'Studios for sale', 'Houses for sale', 'Furnished apartments for sale',
  ],
  related_searches_rent: [
    'New homes', 'Properties for sale', 'Explore house prices', 'Find letting agents',
    'Commercial properties to rent', 'Studios to rent', 'Houses to rent', 'Furnished apartments',
  ],
  rent_quick_links: [
    { label: 'Properties for sale', link: '/buy' },
    { label: 'Neighbourhoods', link: '/neighbourhoods' },
    { label: 'Commute time search', link: '/commute-time' },
    { label: 'Schools near you', link: '/schools' },
    { label: 'New developments', link: '/new-developments' },
  ],
  list_cta_heading: 'List your property',
  list_cta_text_buy: 'Reach thousands of qualified buyers',
  list_cta_text_rent: 'Reach thousands of qualified tenants',
  list_cta_button: 'Get started',
  list_cta_button_link: '/landlords',
  alert_heading: "Can't find what you're looking for?",
  alert_text_buy: 'Register for property alerts and be the first to know about new homes for sale in your area.',
  alert_text_rent: 'Register for property alerts and be the first to know about new rentals in your area.',
  alert_button: 'Get alerts',
  footer_eyebrow: 'Own a Property?',
  footer_heading: 'List Your Property With Us',
  footer_text_buy: 'Reach thousands of qualified buyers. Get a free market valuation from our expert team today.',
  footer_text_rent: 'Reach thousands of qualified tenants. Get a free rental assessment from our expert team today.',
  footer_button_buy: 'Get Free Valuation',
  footer_button_rent: 'Get Rental Valuation',
  footer_button_link: '/landlords',
  show_sidebar: true,
  show_alert_cta: true,
  show_footer_cta: true,
  ap_heading_all: 'Luxury Residential Homes',
  ap_heading_sale: 'Luxury Homes for Sale',
  ap_heading_rent: 'Luxury Homes for Rent',
  ap_listings_label: 'listings',
  ap_sort_label: 'Sort:',
  ap_tab_all: 'All Properties',
  ap_tab_sale: 'For Sale',
  ap_tab_rent: 'For Rent',
  ap_saved_label: 'Search Filters Saved',
  ap_saved_text: 'Your filters are remembered. Return anytime to pick up where you left off.',
  ap_quick_links_label: 'Quick Links',
  ap_quick_links: [
    { label: 'Properties for Sale', link: '/buy' },
    { label: 'Properties for Rent', link: '/rent' },
    { label: 'New Developments', link: '/new-developments' },
  ],
  ap_show_sidebar: true,
};

const BOOLEAN_KEYS: (keyof ListingsPageContent)[] = [
  'show_sidebar', 'show_alert_cta', 'show_footer_cta', 'ap_show_sidebar',
];

const STRING_LIST_KEYS: (keyof ListingsPageContent)[] = [
  'popular_areas', 'related_searches_buy', 'related_searches_rent',
];

const LINK_LIST_KEYS: (keyof ListingsPageContent)[] = [
  'rent_quick_links', 'ap_quick_links',
];

let cache: ListingsPageContent | null = null;
let inflight: Promise<ListingsPageContent> | null = null;

function cloneDefaults(): ListingsPageContent {
  return {
    ...DEFAULT_LISTINGS_CONTENT,
    popular_areas: [...DEFAULT_LISTINGS_CONTENT.popular_areas],
    related_searches_buy: [...DEFAULT_LISTINGS_CONTENT.related_searches_buy],
    related_searches_rent: [...DEFAULT_LISTINGS_CONTENT.related_searches_rent],
    rent_quick_links: DEFAULT_LISTINGS_CONTENT.rent_quick_links.map((l) => ({ ...l })),
    ap_quick_links: DEFAULT_LISTINGS_CONTENT.ap_quick_links.map((l) => ({ ...l })),
  };
}

async function loadListingsContent(): Promise<ListingsPageContent> {
  const map = cloneDefaults();
  const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'page_listings_%');
  if (data) {
    data.forEach((r: { key: string; value: string | null }) => {
      if (r.value === null) return;
      const field = r.key.replace('page_listings_', '') as keyof ListingsPageContent;
      if (!(field in map)) return;
      if (STRING_LIST_KEYS.includes(field)) {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed)) {
            (map as unknown as Record<string, unknown>)[field] = parsed
              .map((v) => String(v).trim())
              .filter(Boolean);
          }
        } catch { /* keep default list */ }
        return;
      }
      if (LINK_LIST_KEYS.includes(field)) {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed)) {
            (map as unknown as Record<string, unknown>)[field] = parsed
              .map((v: { label?: string; link?: string }) => ({ label: String(v.label || '').trim(), link: String(v.link || '').trim() }))
              .filter((v: QuickLink) => v.label || v.link);
          }
        } catch { /* keep default list */ }
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

export function useListingsPageContent() {
  const [content, setContent] = useState<ListingsPageContent>(cache || cloneDefaults());
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (cache) { setContent(cache); setLoading(false); return; }
    if (!inflight) inflight = loadListingsContent();
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

export function invalidateListingsPageContentCache() {
  cache = null;
  inflight = null;
}