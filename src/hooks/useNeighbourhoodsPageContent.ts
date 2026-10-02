import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface NeighQuickLink {
  icon: string;
  color: string;
  title: string;
  text: string;
  link: string;
}

export interface NeighbourhoodsPageContent {
  // Masthead
  masthead_title: string;
  masthead_subtitle: string;
  masthead_issue: string;
  // Hero
  hero_eyebrow: string;
  hero_title: string;
  hero_intro: string;
  hero_note: string;
  // Quick links
  quicklinks: NeighQuickLink[];
  // Stats labels
  stat1_label: string;
  stat2_label: string;
  stat3_label: string;
  stat4_label: string;
  // Tabs
  tab_neighbourhoods: string;
  tab_guides: string;
  tab_blog: string;
  tab_compare: string;
  // Filter bar
  search_placeholder: string;
  areas_word: string;
  filterbar_heading: string;
  filterbar_reset: string;
  // Errors / empty states
  error_title: string;
  error_text: string;
  error_retry_label: string;
  hood_empty_title: string;
  hood_empty_text: string;
  guides_empty_title: string;
  guides_empty_text: string;
  blog_empty_title: string;
  blog_empty_text: string;
  // Cards
  card_properties_label: string;
  card_explore_label: string;
  guide_read_label: string;
  guide_card_suffix: string;
  blog_all_label: string;
  // Compare
  compare_title: string;
  compare_text: string;
  compare_first_label: string;
  compare_second_label: string;
  compare_popular_label: string;
  compare_winner_label: string;
  compare_tie_label: string;
  compare_empty_title: string;
  compare_empty_text: string;
  // Featured guides strip
  featured_eyebrow: string;
  featured_title: string;
  featured_text: string;
  featured_read_more: string;
  // CTA
  cta_title: string;
  cta_text: string;
  // Visibility
  show_quicklinks: boolean;
  show_stats: boolean;
  show_featured: boolean;
  show_cta: boolean;
}

export const DEFAULT_NEIGHBOURHOODS_CONTENT: NeighbourhoodsPageContent = {
  masthead_title: 'THE LOCAL',
  masthead_subtitle: "Oceans Kenya's Guide to the City",
  masthead_issue: 'ISSUE - NAIROBI 2026',
  hero_eyebrow: 'Explore the City',
  hero_title: 'Neighbourhoods & Guides',
  hero_intro:
    "Discover Nairobi's most desirable residential enclaves. From the diplomatic grandeur of Runda to the urban energy of Kilimani, each neighbourhood offers a distinct lifestyle and investment opportunity.",
  hero_note:
    "A curated field guide to Nairobi's residential enclaves - safety, lifestyle, schools, and value, area by area.",
  quicklinks: [
    { icon: 'ri-store-2-line', color: '#C05621', title: 'Social Directory', text: 'Hotels, restaurants, hospitals, schools, gyms & every essential service across the city.', link: '/directory' },
    { icon: 'ri-graduation-cap-line', color: '', title: 'Schools in Nairobi', text: 'International, Montessori & top private schools - and which neighbourhoods sit nearest.', link: '/schools' },
    { icon: 'ri-book-open-line', color: '#0D5959', title: 'Living in Nairobi', text: 'Guides on eating, shopping, things to do, healthcare & family life across the city.', link: '/living-in-nairobi' },
  ],
  stat1_label: 'Neighbourhoods',
  stat2_label: 'Active Listings',
  stat3_label: 'For Sale',
  stat4_label: 'To Let',
  tab_neighbourhoods: 'Neighbourhoods',
  tab_guides: 'Area Guides',
  tab_blog: 'Blog',
  tab_compare: 'Compare',
  search_placeholder: 'Looking for a neighbourhood…',
  areas_word: 'Areas',
  filterbar_heading: 'Browse by vibe',
  filterbar_reset: 'Reset',
  error_title: 'Something went wrong',
  error_text: 'Try Again',
  error_retry_label: 'Try Again',
  hood_empty_title: 'No Neighbourhoods Found',
  hood_empty_text: 'Try adjusting your search or filters.',
  guides_empty_title: 'No Guides Yet',
  guides_empty_text: 'Area guides are coming soon.',
  blog_empty_title: 'No Blog Posts Yet',
  blog_empty_text: 'Check back soon for neighbourhood insights.',
  card_properties_label: 'Properties',
  card_explore_label: 'Explore',
  guide_read_label: 'Read Guide',
  guide_card_suffix: 'Guide',
  blog_all_label: 'All Posts',
  compare_title: 'Compare Neighbourhoods',
  compare_text: 'Pick two neighbourhoods to see how they stack up across safety, lifestyle, schools, value, and more.',
  compare_first_label: 'First Neighbourhood',
  compare_second_label: 'Second Neighbourhood',
  compare_popular_label: 'Popular Comparisons',
  compare_winner_label: 'Winner',
  compare_tie_label: 'Tie',
  compare_empty_title: 'Select Two Neighbourhoods',
  compare_empty_text: 'Pick any two neighbourhoods from the dropdowns above to see a detailed side-by-side comparison across safety, lifestyle, schools, value, and more.',
  featured_eyebrow: 'Featured Area Guides',
  featured_title: 'Area Guides & Insights',
  featured_text: "In-depth guides to help you understand each neighbourhood's unique character, property market, and lifestyle.",
  featured_read_more: 'Read more',
  cta_title: 'Let Our Agents Guide You',
  cta_text: 'Not sure which neighbourhood fits your lifestyle and budget? Our experienced agents have deep local knowledge of every Nairobi enclave. Tell us your priorities and we will match you with the perfect area.',
  show_quicklinks: true,
  show_stats: true,
  show_featured: true,
  show_cta: true,
};

const BOOLEAN_KEYS: (keyof NeighbourhoodsPageContent)[] = ['show_quicklinks', 'show_stats', 'show_featured', 'show_cta'];
const LIST_KEYS: (keyof NeighbourhoodsPageContent)[] = ['quicklinks'];

let cache: NeighbourhoodsPageContent | null = null;
let inflight: Promise<NeighbourhoodsPageContent> | null = null;

function cloneDefaults(): NeighbourhoodsPageContent {
  return { ...DEFAULT_NEIGHBOURHOODS_CONTENT, quicklinks: DEFAULT_NEIGHBOURHOODS_CONTENT.quicklinks.map((q) => ({ ...q })) };
}

async function loadContent(): Promise<NeighbourhoodsPageContent> {
  const map = cloneDefaults();
  const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'page_neighcopy_%');
  if (data) {
    (data as { key: string; value: string | null }[]).forEach((r) => {
      if (r.value === null) return;
      const field = r.key.replace('page_neighcopy_', '') as keyof NeighbourhoodsPageContent;
      if (!(field in map)) return;
      if (LIST_KEYS.includes(field)) {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed)) (map as unknown as Record<string, unknown>)[field] = parsed;
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

export function useNeighbourhoodsPageContent() {
  const [content, setContent] = useState<NeighbourhoodsPageContent>(cache || cloneDefaults());
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (cache) { setContent(cache); setLoading(false); return; }
    if (!inflight) inflight = loadContent();
    inflight
      .then((result) => { cache = result; if (active) { setContent(result); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { content, loading };
}

export function invalidateNeighbourhoodsPageContentCache() {
  cache = null;
  inflight = null;
}