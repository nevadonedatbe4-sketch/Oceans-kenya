import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/* ── Area Results (template used by every /area/:slug page) ── */
export interface AreaResultsContent {
  eyebrow: string;
  heading_prefix: string;
  intro: string;
  tab_sale: string;
  tab_rent: string;
  fallback_nearby_title: string;
  fallback_nearby_text: string;
  fallback_broad_title: string;
  fallback_broad_text: string;
  results_exact_prefix: string;
  results_nearby: string;
  results_all: string;
  results_word: string;
  empty_title: string;
  empty_text: string;
  empty_browse_sale: string;
  empty_browse_rent: string;
  explore_title: string;
  explore_all_label: string;
  explore_contact_label: string;
  sidebar_eyebrow: string;
  sidebar_intro: string;
  sidebar_browse_label: string;
}

/* ── SEO Listing (template used by every /seo-listing page) ── */
export interface SeoListingContent {
  hero_intro: string;
  about_title: string;
  results_word: string;
  faq_heading: string;
  related_heading: string;
  load_more_label: string;
  loading_label: string;
  empty_title: string;
  empty_text: string;
  empty_button: string;
  cta_title: string;
  cta_text: string;
  cta_button: string;
  search_placeholders: string[];
}

/* ── Property Detail (page-level copy — layout tab stays untouched) ── */
export interface PropertyDetailContent {
  loading_text: string;
  notfound_title: string;
  notfound_text: string;
  error_title: string;
  error_text: string;
  back_home_label: string;
  sold_title: string;
  let_title: string;
  sold_text: string;
  sold_button: string;
  land_about_heading: string;
  land_investment_heading: string;
  land_location_heading: string;
  land_enquiry_title: string;
  land_enquiry_text: string;
  land_enquiry_button: string;
  land_contact_title: string;
  land_contact_text: string;
  land_contact_button: string;
  land_back_label: string;
  // LeftColumn / StatsBar / detail-section labels
  section_description: string;
  section_details: string;
  section_additional: string;
  section_features: string;
  section_location: string;
  no_description: string;
  show_less: string;
  read_full: string;
  view_less: string;
  view_all_features_prefix: string;
  view_all_features_suffix: string;
  na_value: string;
  unfurnished: string;
  status_sale: string;
  status_rent: string;
  per_month: string;
  label_property_id: string;
  label_price: string;
  label_bedrooms: string;
  label_bathrooms: string;
  label_garage_parking: string;
  label_property_size: string;
  label_property_type: string;
  label_furnished: string;
  label_status: string;
  label_location: string;
  label_commission: string;
  label_commission_amount: string;
  label_date_listed: string;
  commission_yes: string;
  commission_no: string;
  commission_on_request: string;
  stat_type: string;
  stat_beds: string;
  stat_baths: string;
  stat_garage: string;
  stat_id: string;
}

export const DEFAULT_AREA_RESULTS: AreaResultsContent = {
  eyebrow: 'Area Property Search',
  heading_prefix: 'Properties in',
  intro: 'Live, verified listings for this area - filtered from the same published inventory used across Oceans Kenya.',
  tab_sale: 'For Sale',
  tab_rent: 'For Rent',
  fallback_nearby_title: 'No current listings in {area}',
  fallback_nearby_text: 'Showing nearby areas instead ({areas}) so you still see relevant options.',
  fallback_broad_title: 'No current listings in {area} or nearby areas',
  fallback_broad_text: 'Showing all published properties here so you are never left on an empty page. Refine the area below or speak to an agent.',
  results_exact_prefix: 'Homes in',
  results_nearby: 'Nearby homes',
  results_all: 'All published properties',
  results_word: 'results',
  empty_title: 'No published properties right now',
  empty_text: 'There is currently no live inventory for this search. New listings arrive regularly - register your interest or browse the full collection.',
  empty_browse_sale: 'Browse for sale',
  empty_browse_rent: 'Browse to rent',
  explore_title: 'Explore other neighbourhoods',
  explore_all_label: 'All neighbourhoods & area guides',
  explore_contact_label: 'Ask an agent about {area}',
  sidebar_eyebrow: 'Area search',
  sidebar_intro: 'Live, verified listings filtered from the same published inventory used across Oceans Kenya.',
  sidebar_browse_label: 'Browse All Areas',
};

export const DEFAULT_SEO_LISTING: SeoListingContent = {
  hero_intro: "Premium homes across Nairobi, Kenya - hand-vetted by Oceans Kenya's estate agents.",
  about_title: 'About this collection',
  results_word: 'results',
  faq_heading: 'Frequently Asked Questions',
  related_heading: 'Explore More Premium Nairobi Property',
  load_more_label: 'Load More Properties',
  loading_label: 'Loading…',
  empty_title: 'No properties available yet',
  empty_text: 'New premium listings arrive regularly. Register your interest to be contacted first.',
  empty_button: 'Register Interest',
  cta_title: 'Speak to a Premium Nairobi Agent',
  cta_text: 'Our specialist agents know every premium enclave intimately. Tell us your priorities and we will match you with the ideal property across Nairobi, Kenya.',
  cta_button: 'Contact an Agent',
  search_placeholders: [
    'Looking for a home in a leafy suburb...',
    'Looking for an apartment with a view...',
    'Looking for a family house with garden...',
    'Looking for a prime investment...',
  ],
};

export const DEFAULT_PROPERTY_DETAIL: PropertyDetailContent = {
  loading_text: 'Loading property...',
  notfound_title: 'Listing Not Found',
  notfound_text: 'This listing does not exist or may have been removed.',
  error_title: 'Something went wrong',
  error_text: 'Please try again in a moment.',
  back_home_label: 'Back to Home',
  sold_title: 'This property has been sold.',
  let_title: 'This property has been let.',
  sold_text: 'It is kept for reference only. Browse similar available properties still on the market.',
  sold_button: 'View similar',
  land_about_heading: 'About This Plot',
  land_investment_heading: 'Investment Opportunity',
  land_location_heading: 'Location',
  land_enquiry_title: 'Interested in this plot?',
  land_enquiry_text: 'Submit your enquiry and a partner manager will reach out with full disclosure, site visit options, and next steps.',
  land_enquiry_button: 'Enquire About This Plot',
  land_contact_title: 'Contact the Desk',
  land_contact_text: 'Our joint ventures desk handles all land enquiries.',
  land_contact_button: 'Speak to the Desk',
  land_back_label: 'Back to all listings',
  section_description: 'Description',
  section_details: 'Property Details',
  section_additional: 'Additional Details',
  section_features: 'Features & Amenities',
  section_location: 'Location',
  no_description: 'No description available for this property.',
  show_less: 'Show less',
  read_full: 'Read full description',
  view_less: 'View less',
  view_all_features_prefix: 'View all',
  view_all_features_suffix: 'features',
  na_value: 'N/A',
  unfurnished: 'Unfurnished',
  status_sale: 'For Sale',
  status_rent: 'For Rent',
  per_month: 'per calendar month',
  label_property_id: 'Property ID',
  label_price: 'Price',
  label_bedrooms: 'Bedrooms',
  label_bathrooms: 'Bathrooms',
  label_garage_parking: 'Garage / Parking',
  label_property_size: 'Property Size',
  label_property_type: 'Property Type',
  label_furnished: 'Furnished',
  label_status: 'Property Status',
  label_location: 'Location',
  label_commission: 'Commission',
  label_commission_amount: 'Commission Amount',
  label_date_listed: 'Date Listed',
  commission_yes: 'Yes',
  commission_no: 'No',
  commission_on_request: 'On request',
  stat_type: 'Type',
  stat_beds: 'Beds',
  stat_baths: 'Baths',
  stat_garage: 'Garage',
  stat_id: 'ID',
};

let areaCache: AreaResultsContent | null = null;
let areaInflight: Promise<AreaResultsContent> | null = null;
let seoCache: SeoListingContent | null = null;
let seoInflight: Promise<SeoListingContent> | null = null;
let pdCache: PropertyDetailContent | null = null;
let pdInflight: Promise<PropertyDetailContent> | null = null;

// T is not constrained to Record<string, unknown>: the content interfaces have
// no index signature, so the constraint would reject them. Internal writes cast
// through Record where needed.
async function loadSimple<T extends object>(prefix: string, defaults: T, listKeys: string[]): Promise<T> {
  const map = JSON.parse(JSON.stringify(defaults)) as T;
  const { data } = await supabase.from('site_settings').select('key, value').ilike('key', `${prefix}%`);
  if (data) {
    (data as { key: string; value: string | null }[]).forEach((r) => {
      if (r.value === null) return;
      const field = r.key.replace(prefix, '');
      if (!(field in map)) return;
      if (listKeys.includes(field)) {
        try { const parsed = JSON.parse(r.value); if (Array.isArray(parsed)) (map as Record<string, unknown>)[field] = parsed; } catch { /* keep */ }
        return;
      }
      (map as Record<string, unknown>)[field] = r.value;
    });
  }
  return map;
}

export function useAreaResultsContent() {
  const [content, setContent] = useState<AreaResultsContent>(areaCache || DEFAULT_AREA_RESULTS);
  const [loading, setLoading] = useState(!areaCache);
  useEffect(() => {
    let active = true;
    if (areaCache) { setContent(areaCache); setLoading(false); return; }
    if (!areaInflight) areaInflight = loadSimple('page_area_results_', DEFAULT_AREA_RESULTS, []);
    areaInflight.then((r) => { areaCache = r; if (active) { setContent(r); setLoading(false); } }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { content, loading };
}

export function useSeoListingContent() {
  const [content, setContent] = useState<SeoListingContent>(seoCache || DEFAULT_SEO_LISTING);
  const [loading, setLoading] = useState(!seoCache);
  useEffect(() => {
    let active = true;
    if (seoCache) { setContent(seoCache); setLoading(false); return; }
    if (!seoInflight) seoInflight = loadSimple('page_seo_listing_', DEFAULT_SEO_LISTING, ['search_placeholders']);
    seoInflight.then((r) => { seoCache = r; if (active) { setContent(r); setLoading(false); } }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { content, loading };
}

export function usePropertyDetailContent() {
  const [content, setContent] = useState<PropertyDetailContent>(pdCache || DEFAULT_PROPERTY_DETAIL);
  const [loading, setLoading] = useState(!pdCache);
  useEffect(() => {
    let active = true;
    if (pdCache) { setContent(pdCache); setLoading(false); return; }
    if (!pdInflight) pdInflight = loadSimple('page_property_detail_', DEFAULT_PROPERTY_DETAIL, []);
    pdInflight.then((r) => { pdCache = r; if (active) { setContent(r); setLoading(false); } }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { content, loading };
}

export function invalidateDynamicTemplateCache() {
  areaCache = null; areaInflight = null;
  seoCache = null; seoInflight = null;
  pdCache = null; pdInflight = null;
}