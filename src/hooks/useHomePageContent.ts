import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface HomeHeroButton {
  label: string;
  link: string;
  visible: boolean;
}

export interface HomePageContent {
  // Hero
  hero_visible: boolean;
  hero_image: string;
  hero_title: string;
  hero_subtitle: string;
  hero_overlay_enabled: boolean;
  hero_overlay_opacity: string;
  hero_search_enabled: boolean;
  hero_search_placeholder: string;
  hero_search_button: string;
  hero_social_enabled: boolean;
  hero_buttons: HomeHeroButton[];
  // Properties section
  properties_visible: boolean;
  properties_title_all: string;
  properties_subtitle_all: string;
  properties_title_sale: string;
  properties_subtitle_sale: string;
  properties_title_rent: string;
  properties_subtitle_rent: string;
  properties_search_label: string;
  properties_view_more_label: string;
  properties_view_more_link: string;
  properties_valuation_visible: boolean;
  properties_valuation_title: string;
  properties_valuation_text: string;
  properties_valuation_button_label: string;
  properties_valuation_button_link: string;
  // CTA banner
  cta_visible: boolean;
  cta_image: string;
  cta_title: string;
  cta_text: string;
  cta_button1_label: string;
  cta_button1_link: string;
  cta_button2_label: string;
  cta_button2_link: string;
}

// Seed values mirror the current published homepage content. The database is the
// single source of truth once the Home Page editor is saved; these are only the
// first-run fallback so the public page never renders empty before the first save.
export const DEFAULT_HOME_CONTENT: HomePageContent = {
  hero_visible: true,
  hero_image: 'https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/0551756e-243c-46c5-96d2-b607627173aa_oceans-ke-vip.jpg?v=db7f5a56d803035ed38b44c637e62fbc',
  hero_title: 'Oceans Kenya',
  hero_subtitle: 'Estate & Letting Agent',
  hero_overlay_enabled: true,
  hero_overlay_opacity: '30',
  hero_search_enabled: false,
  hero_search_placeholder: 'Search by location, property type...',
  hero_search_button: 'Search',
  hero_social_enabled: true,
  hero_buttons: [
    { label: 'Rent', link: '/rent', visible: true },
    { label: 'Buy', link: '/buy', visible: true },
    { label: 'New Developments', link: '/new-developments', visible: true },
  ],
  properties_visible: true,
  properties_title_all: 'Prime Residential Homes You\u2019ll Love',
  properties_subtitle_all: 'Residential homes for sale and rent in Nairobi',
  properties_title_sale: 'Prime Homes for Sale',
  properties_subtitle_sale: 'Homes for sale in Nairobi',
  properties_title_rent: 'Prime Homes for Rent',
  properties_subtitle_rent: 'Homes to let in Nairobi',
  properties_search_label: 'You searched for',
  properties_view_more_label: 'View More Properties',
  properties_view_more_link: '/all-properties',
  properties_valuation_visible: true,
  properties_valuation_title: 'Wondering what your property is worth?',
  properties_valuation_text: 'Get a free, no-obligation valuation from our team.',
  properties_valuation_button_label: 'Get a Free Valuation',
  properties_valuation_button_link: '/valuation',
  cta_visible: true,
  cta_image: 'https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/6a1b17c5-e791-4dd2-9b34-43d128d1a75c_edit.jpg?v=e8606cdcb818d22b0b8d00a0bd0717d5',
  cta_title: 'Know Your Property\u2019s Worth?',
  cta_text: 'Get a free, no-obligation valuation from Nairobi\u2019s leading estate agents.',
  cta_button1_label: 'Request Valuation',
  cta_button1_link: '/landlords',
  cta_button2_label: 'Valuation',
  cta_button2_link: '/valuation',
};

const BOOLEAN_KEYS: (keyof HomePageContent)[] = [
  'hero_visible', 'hero_overlay_enabled', 'hero_search_enabled', 'hero_social_enabled',
  'properties_visible', 'properties_valuation_visible', 'cta_visible',
];

// Module-level cache so the hero / properties / CTA blocks share a single fetch.
let cache: HomePageContent | null = null;
let inflight: Promise<HomePageContent> | null = null;

async function loadHomeContent(): Promise<HomePageContent> {
  const map: HomePageContent = {
    ...DEFAULT_HOME_CONTENT,
    hero_buttons: DEFAULT_HOME_CONTENT.hero_buttons.map((b) => ({ ...b })),
  };
  const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'page_home_%');
  if (data) {
    data.forEach((r: { key: string; value: string | null }) => {
      if (r.value === null) return;
      const field = r.key.replace('page_home_', '');
      if (field === 'hero_buttons') {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed) && parsed.length) {
            map.hero_buttons = parsed
              .map((b: { label?: string; link?: string; visible?: boolean }) => ({
                label: b.label || '',
                link: b.link || '',
                visible: b.visible !== false,
              }))
              .filter((b: HomeHeroButton) => b.label.trim());
          }
        } catch { /* keep default buttons */ }
        return;
      }
      if (!(field in map)) return;
      if (BOOLEAN_KEYS.includes(field as keyof HomePageContent)) {
        (map as unknown as Record<string, unknown>)[field] = r.value === 'true';
      } else {
        (map as unknown as Record<string, unknown>)[field] = r.value;
      }
    });
  }
  return map;
}

export function useHomePageContent() {
  const [content, setContent] = useState<HomePageContent>(cache || DEFAULT_HOME_CONTENT);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (cache) { setContent(cache); setLoading(false); return; }
    if (!inflight) inflight = loadHomeContent();
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

export function invalidateHomePageContentCache() {
  cache = null;
  inflight = null;
}