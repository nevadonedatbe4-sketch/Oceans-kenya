import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface NewDevBenefit {
  icon: string;
  title: string;
  desc: string;
}

export interface NewDevSortOption {
  label: string;
  value: string;
}

export interface NewDevelopmentsPageContent {
  // Error state (shown only on a real query failure)
  error_title: string;
  error_text: string;
  error_retry_label: string;
  error_back_label: string;
  // Hero
  hero_visible: boolean;
  hero_eyebrow: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  // Benefits
  benefits_visible: boolean;
  benefits_eyebrow: string;
  benefits_title: string;
  benefits_collapse_label: string;
  benefits_open_label: string;
  benefits: NewDevBenefit[];
  // Featured
  featured_visible: boolean;
  featured_eyebrow: string;
  featured_title: string;
  featured_text: string;
  // Browse / results
  browse_visible: boolean;
  browse_eyebrow: string;
  browse_title: string;
  search_placeholders: string[];
  filter_area_label: string;
  filter_status_label: string;
  filter_clear_label: string;
  developer_default_label: string;
  completion_default_label: string;
  results_suffix: string;
  sort_label: string;
  sort_options: NewDevSortOption[];
  beds_options: string[];
  stage_options: string[];
  empty_title: string;
  empty_text: string;
  empty_button: string;
  // Developer CTA
  devcta_visible: boolean;
  devcta_title: string;
  devcta_collapse_label: string;
  devcta_open_label: string;
  devcta_summary: string;
  devcta_text: string;
  devcta_button1_label: string;
  devcta_button1_link: string;
  devcta_button2_label: string;
  devcta_button2_link: string;
  // Section ordering
  section_order: string;
}

// Seed values mirror the current published New Developments page. The database is
// the single source of truth once the editor is saved; these are only the
// first-run fallback so the public page never renders empty before the first save.
export const DEFAULT_NEWDEV_CONTENT: NewDevelopmentsPageContent = {
  error_title: 'Unable to load developments',
  error_text: 'Please try again in a moment.',
  error_retry_label: 'Retry',
  error_back_label: 'Back to Home',
  hero_visible: true,
  hero_eyebrow: 'Premium Developments',
  hero_title: 'New Developments & Projects',
  hero_subtitle:
    'Off-plan and completed projects from leading developers. Secure your unit at launch pricing - choose your unit type and reserve today.',
  hero_image: '',
  benefits_visible: true,
  benefits_eyebrow: 'The Benefits',
  benefits_title: 'Why Buy a New Development?',
  benefits_collapse_label: 'See the key benefits',
  benefits_open_label: 'Hide the benefits',
  benefits: [
    { icon: 'ri-price-tag-3-line', title: 'Early-Bird Pricing', desc: 'Secure units at pre-construction prices, often 15-20% below completion value.' },
    { icon: 'ri-palette-line', title: 'Personalised Finishes', desc: 'Choose layouts and finishes to match your taste before construction completes.' },
    { icon: 'ri-shield-check-line', title: 'Modern Standards', desc: 'Latest building codes, energy efficiency and contemporary design included.' },
    { icon: 'ri-line-chart-line', title: 'Capital Growth', desc: 'Units typically gain significant value between launch and completion.' },
    { icon: 'ri-file-list-3-line', title: 'Staged Payment Plans', desc: 'Payments tied to construction milestones make buying more accessible.' },
    { icon: 'ri-tools-line', title: 'Warranty Protection', desc: 'Structural warranties and builder guarantees for complete peace of mind.' },
  ],
  featured_visible: true,
  featured_eyebrow: 'Featured',
  featured_title: 'Featured New Developments',
  featured_text: "Launch offers and final units from Kenya's leading developers - reserve your unit at entry pricing.",
  browse_visible: true,
  browse_eyebrow: 'Development Projects',
  browse_title: 'New Development Projects',
  search_placeholders: [
    'Looking for an off-plan apartment...',
    'Looking for a gated community home...',
    'Looking for a new townhouse...',
    'Looking for a completed development...',
  ],
  filter_area_label: 'Area',
  filter_status_label: 'Status',
  filter_clear_label: 'Clear',
  developer_default_label: 'All Developers',
  completion_default_label: 'Any Completion',
  results_suffix: 'development projects',
  sort_label: 'Sort:',
  sort_options: [
    { label: 'Name: A to Z', value: 'name' },
    { label: 'Newest First', value: 'newest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
  ],
  beds_options: ['Any unit', 'Studio', '1 Bed', '2 Beds', '3 Beds', '4 Beds', '5+ Beds'],
  stage_options: ['All Status', 'Completed', 'Off-Plan', 'Under Construction'],
  empty_title: 'No developments found',
  empty_text: 'Try adjusting your filters or search terms.',
  empty_button: 'Clear All Filters',
  devcta_visible: true,
  devcta_title: 'Have a Development to Sell?',
  devcta_collapse_label: 'Why partner with us?',
  devcta_open_label: 'Hide details',
  devcta_summary: 'Trusted agency · Qualified buyers · Full marketing',
  devcta_text:
    'We work with leading developers to market and sell premium new developments. Partner with a trusted agency and reach qualified buyers.',
  devcta_button1_label: 'Contact Our Team',
  devcta_button1_link: '/contact',
  devcta_button2_label: 'Request Valuation',
  devcta_button2_link: '/landlords',
  section_order: 'featured,browse,benefits,devcta',
};

const BOOLEAN_KEYS: (keyof NewDevelopmentsPageContent)[] = [
  'hero_visible', 'benefits_visible', 'featured_visible', 'browse_visible', 'devcta_visible',
];

const BENEFIT_KEY = 'benefits';
const STRING_LIST_KEYS: (keyof NewDevelopmentsPageContent)[] = ['search_placeholders', 'beds_options', 'stage_options'];
const SORT_LIST_KEY = 'sort_options';

let cache: NewDevelopmentsPageContent | null = null;
let inflight: Promise<NewDevelopmentsPageContent> | null = null;

function cloneDefaults(): NewDevelopmentsPageContent {
  return {
    ...DEFAULT_NEWDEV_CONTENT,
    benefits: DEFAULT_NEWDEV_CONTENT.benefits.map((b) => ({ ...b })),
    search_placeholders: [...DEFAULT_NEWDEV_CONTENT.search_placeholders],
    beds_options: [...DEFAULT_NEWDEV_CONTENT.beds_options],
    stage_options: [...DEFAULT_NEWDEV_CONTENT.stage_options],
    sort_options: DEFAULT_NEWDEV_CONTENT.sort_options.map((s) => ({ ...s })),
  };
}

async function loadNewDevContent(): Promise<NewDevelopmentsPageContent> {
  const map = cloneDefaults();
  const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'page_newdev_%');
  if (data) {
    data.forEach((r: { key: string; value: string | null }) => {
      if (r.value === null) return;
      const field = r.key.replace('page_newdev_', '');
      if (field === BENEFIT_KEY) {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed) && parsed.length) {
            map.benefits = parsed
              .map((b: { icon?: string; title?: string; desc?: string }) => ({
                icon: String(b.icon || '').trim(),
                title: String(b.title || '').trim(),
                desc: String(b.desc || '').trim(),
              }))
              .filter((b: NewDevBenefit) => b.title || b.desc);
          }
        } catch { /* keep default benefits */ }
        return;
      }
      if (field === SORT_LIST_KEY) {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed) && parsed.length) {
            map.sort_options = parsed
              .map((s: { label?: string; value?: string }) => ({ label: String(s.label || '').trim(), value: String(s.value || '').trim() }))
              .filter((s: NewDevSortOption) => s.label && s.value);
          }
        } catch { /* keep defaults */ }
        return;
      }
      if (STRING_LIST_KEYS.includes(field as keyof NewDevelopmentsPageContent)) {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed)) {
            (map as unknown as Record<string, unknown>)[field] = parsed.map((v) => String(v).trim()).filter(Boolean);
          }
        } catch { /* keep default list */ }
        return;
      }
      if (!(field in map)) return;
      if (BOOLEAN_KEYS.includes(field as keyof NewDevelopmentsPageContent)) {
        (map as unknown as Record<string, unknown>)[field] = r.value === 'true';
      } else {
        (map as unknown as Record<string, unknown>)[field] = r.value;
      }
    });
  }
  return map;
}

export function useNewDevelopmentsPageContent() {
  const [content, setContent] = useState<NewDevelopmentsPageContent>(cache || cloneDefaults());
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (cache) { setContent(cache); setLoading(false); return; }
    if (!inflight) inflight = loadNewDevContent();
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

export function invalidateNewDevelopmentsContentCache() {
  cache = null;
  inflight = null;
}