import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface DirectoryLandingContent {
  hero_eyebrow: string;
  hero_title: string;
  hero_text: string;
  counter_label: string;
  tiles_eyebrow: string;
  tiles_title: string;
  tiles_text: string;
  view_category_label: string;
  search_placeholder: string;
  suggestions_label: string;
  suggestions: string[];
  showing_label: string;
  place_word: string;
  category_word: string;
  empty_title: string;
  empty_text: string;
  cta_heading: string;
  cta_text: string;
  cta_button: string;
}

export interface DirectoryCategoryContent {
  hero_intro: string;
  subcat_heading: string;
  subcat_all_label: string;
  showing_label: string;
  place_word: string;
  load_more_label: string;
  remaining_label: string;
  error_title: string;
  error_retry_label: string;
  empty_title: string;
  empty_text: string;
  notfound_title: string;
  notfound_text: string;
  notfound_button: string;
  nightlife_title: string;
  nightlife_text: string;
  nightlife_button: string;
  cta_heading: string;
  cta_text: string;
  cta_button_primary: string;
  cta_button_secondary: string;
}

export const DEFAULT_DIRECTORY_LANDING: DirectoryLandingContent = {
  hero_eyebrow: 'Everything Around You',
  hero_title: 'Social Directory',
  hero_text: 'Explore the people, places, services and facilities that make each neighbourhood work - schools, healthcare, fitness, transport, recreation, shopping, dining and more.',
  counter_label: 'Places & Services',
  tiles_eyebrow: 'Browse by Category',
  tiles_title: 'What are you looking for?',
  tiles_text: "Tap a category to see what's in it, or jump straight to its full page.",
  view_category_label: 'View the full category',
  search_placeholder: 'Search or ask - e.g. “Where can I get a SIM card?”',
  suggestions_label: 'Try searching for:',
  suggestions: ['SIM cards', 'Fibre internet', 'Groceries', 'ATM', 'Schools', 'Vets', 'Dog grooming', 'Parks', 'Restaurants', 'Banks', 'Shopping centres', 'Pharmacy', 'Gym', 'Laundry', 'Car wash', 'Coworking', 'Tailor', 'Phone repair'],
  showing_label: 'Showing',
  place_word: 'places',
  category_word: 'in',
  empty_title: 'No verified listings currently recorded',
  empty_text: "We don't have verified listings for this yet - data is being updated regularly.",
  cta_heading: 'Find a home near the things you love',
  cta_text: 'From top schools to the best restaurants and green spaces, explore neighbourhoods that match your lifestyle.',
  cta_button: 'Explore Neighbourhoods',
};

export const DEFAULT_DIRECTORY_CATEGORY: DirectoryCategoryContent = {
  hero_intro: 'Explore verified {category} spots across our neighbourhoods.',
  subcat_heading: 'What are you after?',
  subcat_all_label: 'All',
  showing_label: 'Showing',
  place_word: 'places',
  load_more_label: 'Load more',
  remaining_label: 'remaining',
  error_title: 'Unable to verify results',
  error_retry_label: 'Try again',
  empty_title: 'No verified listings in this category yet',
  empty_text: "We don't have verified listings for this yet - data is being updated regularly.",
  notfound_title: 'Category not found',
  notfound_text: "We couldn't find that category. Browse all places and services from the Directory instead.",
  notfound_button: 'Back to Directory',
  nightlife_title: 'Night Life has its own guide',
  nightlife_text: 'Filter clubs, lounges, casinos and late-night spots by vibe, area, price and rating.',
  nightlife_button: 'Open Night Life',
  cta_heading: 'Find a home near the things you love',
  cta_text: 'From top schools to the best restaurants and green spaces, explore neighbourhoods that match your lifestyle.',
  cta_button_primary: 'Explore Neighbourhoods',
  cta_button_secondary: 'Back to Directory',
};

const LANDING_LIST_KEYS: string[] = ['suggestions'];

let landingCache: DirectoryLandingContent | null = null;
let landingInflight: Promise<DirectoryLandingContent> | null = null;
let categoryCache: DirectoryCategoryContent | null = null;
let categoryInflight: Promise<DirectoryCategoryContent> | null = null;

async function loadLanding(): Promise<DirectoryLandingContent> {
  const map = { ...DEFAULT_DIRECTORY_LANDING, suggestions: [...DEFAULT_DIRECTORY_LANDING.suggestions] } as unknown as Record<string, unknown>;
  const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'page_directory_%');
  if (data) {
    (data as { key: string; value: string | null }[]).forEach((r) => {
      if (r.value === null) return;
      const field = r.key.replace('page_directory_', '');
      if (!(field in map)) return;
      if (LANDING_LIST_KEYS.includes(field)) {
        try { const parsed = JSON.parse(r.value); if (Array.isArray(parsed)) map[field] = parsed.map((v) => String(v).trim()).filter(Boolean); } catch { /* keep */ }
        return;
      }
      map[field] = r.value;
    });
  }
  return map as unknown as DirectoryLandingContent;
}

async function loadCategory(): Promise<DirectoryCategoryContent> {
  const map = { ...DEFAULT_DIRECTORY_CATEGORY } as unknown as Record<string, unknown>;
  const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'page_dircat_%');
  if (data) {
    (data as { key: string; value: string | null }[]).forEach((r) => {
      if (r.value === null) return;
      const field = r.key.replace('page_dircat_', '');
      if (field in map) map[field] = r.value;
    });
  }
  return map as unknown as DirectoryCategoryContent;
}

export function useDirectoryLandingContent() {
  const [content, setContent] = useState<DirectoryLandingContent>(landingCache || DEFAULT_DIRECTORY_LANDING);
  const [loading, setLoading] = useState(!landingCache);
  useEffect(() => {
    let active = true;
    if (landingCache) { setContent(landingCache); setLoading(false); return; }
    if (!landingInflight) landingInflight = loadLanding();
    landingInflight.then((r) => { landingCache = r; if (active) { setContent(r); setLoading(false); } }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { content, loading };
}

export function useDirectoryCategoryContent() {
  const [content, setContent] = useState<DirectoryCategoryContent>(categoryCache || DEFAULT_DIRECTORY_CATEGORY);
  const [loading, setLoading] = useState(!categoryCache);
  useEffect(() => {
    let active = true;
    if (categoryCache) { setContent(categoryCache); setLoading(false); return; }
    if (!categoryInflight) categoryInflight = loadCategory();
    categoryInflight.then((r) => { categoryCache = r; if (active) { setContent(r); setLoading(false); } }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { content, loading };
}

export function invalidateDirectoryContentCache() {
  landingCache = null;
  landingInflight = null;
  categoryCache = null;
  categoryInflight = null;
}