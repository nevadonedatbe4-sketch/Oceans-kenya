import { useState } from 'react';
import ManagementLayout from '../ManagementLayout';
import ContentSchemaEditor, { type TabSchema } from './ContentSchemaEditor';
import {
  DEFAULT_AREA_RESULTS,
  DEFAULT_SEO_LISTING,
  DEFAULT_PROPERTY_DETAIL,
  invalidateDynamicTemplateCache,
} from '@/hooks/useDynamicPageTemplates';

const AREA_TABS: TabSchema[] = [
  {
    key: 'hero', label: 'Hero & Tabs', icon: 'ri-image-2-line',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'heading_prefix', label: 'Heading prefix (before the area name)', type: 'text' },
      { key: 'intro', label: 'Intro text', type: 'textarea' },
      { key: 'tab_sale', label: 'Tab — For Sale', type: 'text' },
      { key: 'tab_rent', label: 'Tab — For Rent', type: 'text' },
    ],
  },
  {
    key: 'fallback', label: 'Widening Notices', icon: 'ri-map-pin-2-line',
    fields: [
      { key: 'fallback_nearby_title', label: 'Nearby — title', type: 'text', hint: 'Use {area} for the searched area.' },
      { key: 'fallback_nearby_text', label: 'Nearby — text', type: 'textarea', hint: 'Use {areas} for the nearby areas list.' },
      { key: 'fallback_broad_title', label: 'Broad — title', type: 'text', hint: 'Use {area} for the searched area.' },
      { key: 'fallback_broad_text', label: 'Broad — text', type: 'textarea' },
    ],
  },
  {
    key: 'results', label: 'Results & Empty', icon: 'ri-list-check-2',
    fields: [
      { key: 'results_exact_prefix', label: 'Results heading prefix (exact)', type: 'text' },
      { key: 'results_nearby', label: 'Results heading (nearby)', type: 'text' },
      { key: 'results_all', label: 'Results heading (all)', type: 'text' },
      { key: 'results_word', label: 'Results word (e.g. results)', type: 'text' },
      { key: 'empty_title', label: 'Empty — title', type: 'text' },
      { key: 'empty_text', label: 'Empty — text', type: 'textarea' },
      { key: 'empty_browse_sale', label: 'Empty — browse sale button', type: 'text' },
      { key: 'empty_browse_rent', label: 'Empty — browse rent button', type: 'text' },
    ],
  },
  {
    key: 'sidebar', label: 'Explore & Sidebar', icon: 'ri-layout-right-line',
    fields: [
      { key: 'explore_title', label: 'Explore — title', type: 'text' },
      { key: 'explore_all_label', label: 'Explore — all areas link', type: 'text' },
      { key: 'explore_contact_label', label: 'Explore — contact link', type: 'text', hint: 'Use {area} for the area name.' },
      { key: 'sidebar_eyebrow', label: 'Sidebar — eyebrow', type: 'text' },
      { key: 'sidebar_intro', label: 'Sidebar — intro', type: 'textarea' },
      { key: 'sidebar_browse_label', label: 'Sidebar — browse button', type: 'text' },
    ],
  },
];

const SEO_TABS: TabSchema[] = [
  {
    key: 'hero', label: 'Hero & Search', icon: 'ri-image-2-line',
    fields: [
      { key: 'hero_intro', label: 'Hero — intro text', type: 'textarea' },
      { key: 'search_placeholders', label: 'Search bar placeholders', type: 'stringlist', placeholder: 'e.g. Looking for a leafy suburb…' },
    ],
  },
  {
    key: 'body', label: 'Body & Lists', icon: 'ri-article-line',
    fields: [
      { key: 'about_title', label: 'Intro — heading', type: 'text' },
      { key: 'results_word', label: 'Results word (e.g. results)', type: 'text' },
      { key: 'load_more_label', label: 'Load more button', type: 'text' },
      { key: 'loading_label', label: 'Loading label', type: 'text' },
      { key: 'faq_heading', label: 'FAQ heading', type: 'text' },
      { key: 'related_heading', label: 'Related links heading', type: 'text' },
    ],
  },
  {
    key: 'states', label: 'Empty & CTA', icon: 'ri-megaphone-line',
    fields: [
      { key: 'empty_title', label: 'Empty — title', type: 'text' },
      { key: 'empty_text', label: 'Empty — text', type: 'textarea' },
      { key: 'empty_button', label: 'Empty — button', type: 'text' },
      { key: 'cta_title', label: 'CTA — title', type: 'text' },
      { key: 'cta_text', label: 'CTA — text', type: 'textarea' },
      { key: 'cta_button', label: 'CTA — button', type: 'text' },
    ],
  },
];

const PD_TABS: TabSchema[] = [
  {
    key: 'states', label: 'States & Notices', icon: 'ri-error-warning-line',
    fields: [
      { key: 'loading_text', label: 'Loading text', type: 'text' },
      { key: 'notfound_title', label: 'Not found — title', type: 'text' },
      { key: 'notfound_text', label: 'Not found — text', type: 'text' },
      { key: 'error_title', label: 'Error — title', type: 'text' },
      { key: 'error_text', label: 'Error — text', type: 'text' },
      { key: 'back_home_label', label: 'Back-home button', type: 'text' },
      { key: 'sold_title', label: 'Sold — notice title', type: 'text' },
      { key: 'let_title', label: 'Let — notice title', type: 'text' },
      { key: 'sold_text', label: 'Sold/let — notice text', type: 'textarea' },
      { key: 'sold_button', label: 'Sold/let — button', type: 'text' },
    ],
  },
  {
    key: 'land', label: 'Land / JV Copy', icon: 'ri-landscape-line',
    fields: [
      { key: 'land_about_heading', label: 'About heading', type: 'text' },
      { key: 'land_investment_heading', label: 'Investment heading', type: 'text' },
      { key: 'land_location_heading', label: 'Location heading', type: 'text' },
      { key: 'land_enquiry_title', label: 'Enquiry — title', type: 'text' },
      { key: 'land_enquiry_text', label: 'Enquiry — text', type: 'textarea' },
      { key: 'land_enquiry_button', label: 'Enquiry — button', type: 'text' },
      { key: 'land_contact_title', label: 'Contact card — title', type: 'text' },
      { key: 'land_contact_text', label: 'Contact card — text', type: 'textarea' },
      { key: 'land_contact_button', label: 'Contact card — button', type: 'text' },
      { key: 'land_back_label', label: 'Back link label', type: 'text' },
    ],
  },
  {
    key: 'labels', label: 'Detail Labels', icon: 'ri-list-settings-line',
    fields: [
      { key: 'section_description', label: 'Section — Description', type: 'text' },
      { key: 'section_details', label: 'Section — Property Details', type: 'text' },
      { key: 'section_additional', label: 'Section — Additional Details', type: 'text' },
      { key: 'section_features', label: 'Section — Features & Amenities', type: 'text' },
      { key: 'section_location', label: 'Section — Location', type: 'text' },
      { key: 'no_description', label: 'No description text', type: 'text' },
      { key: 'show_less', label: 'Show less', type: 'text' },
      { key: 'read_full', label: 'Read full description', type: 'text' },
      { key: 'view_less', label: 'View less', type: 'text' },
      { key: 'view_all_features_prefix', label: 'View-all features — prefix', type: 'text' },
      { key: 'view_all_features_suffix', label: 'View-all features — suffix', type: 'text' },
      { key: 'na_value', label: 'Empty value placeholder (N/A)', type: 'text' },
      { key: 'unfurnished', label: 'Furnished — fallback', type: 'text' },
      { key: 'status_sale', label: 'Status — for sale', type: 'text' },
      { key: 'status_rent', label: 'Status — for rent', type: 'text' },
      { key: 'per_month', label: 'Rent — per period label', type: 'text' },
      { key: 'label_property_id', label: 'Row — Property ID', type: 'text' },
      { key: 'label_price', label: 'Row — Price', type: 'text' },
      { key: 'label_bedrooms', label: 'Row — Bedrooms', type: 'text' },
      { key: 'label_bathrooms', label: 'Row — Bathrooms', type: 'text' },
      { key: 'label_garage_parking', label: 'Row — Garage / Parking', type: 'text' },
      { key: 'label_property_size', label: 'Row — Property Size', type: 'text' },
      { key: 'label_property_type', label: 'Row — Property Type', type: 'text' },
      { key: 'label_furnished', label: 'Row — Furnished', type: 'text' },
      { key: 'label_status', label: 'Row — Property Status', type: 'text' },
      { key: 'label_location', label: 'Row — Location', type: 'text' },
      { key: 'label_commission', label: 'Row — Commission', type: 'text' },
      { key: 'label_commission_amount', label: 'Row — Commission Amount', type: 'text' },
      { key: 'label_date_listed', label: 'Row — Date Listed', type: 'text' },
      { key: 'commission_yes', label: 'Commission — yes', type: 'text' },
      { key: 'commission_no', label: 'Commission — no', type: 'text' },
      { key: 'commission_on_request', label: 'Commission — on request', type: 'text' },
      { key: 'stat_type', label: 'Stat — Type', type: 'text' },
      { key: 'stat_beds', label: 'Stat — Beds', type: 'text' },
      { key: 'stat_baths', label: 'Stat — Baths', type: 'text' },
      { key: 'stat_garage', label: 'Stat — Garage', type: 'text' },
      { key: 'stat_id', label: 'Stat — ID', type: 'text' },
    ],
  },
];

export default function DynamicPageTemplatesPageCMS() {
  const [which, setWhich] = useState<'area' | 'seo' | 'pd'>('area');
  return (
    <ManagementLayout title="SEO & Dynamic Page Templates" description="Template-level content shared by every generated page (area results, SEO listing pages, property detail). Edit once — it applies across all generated pages." icon={<i className="ri-file-copy-2-line text-[#1B4332] text-lg"></i>}>
      <div className="mb-5">
        <div className="inline-flex gap-1 bg-stone-100 p-1 rounded-lg">
          {([['area', 'Area Results'], ['seo', 'SEO Listing Pages'], ['pd', 'Property Detail']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setWhich(k)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${which === k ? 'bg-white text-[#1B4332] shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {which === 'area' && (
        <ContentSchemaEditor
          key="area"
          pageKey="area_results"
          title="Area Results Template"
          description="Area results template"
          icon={<i className="ri-map-pin-2-line text-[#1B4332] text-sm"></i>}
          tabs={AREA_TABS}
          defaults={DEFAULT_AREA_RESULTS as unknown as Record<string, unknown>}
          onSaved={invalidateDynamicTemplateCache}
        />
      )}
      {which === 'seo' && (
        <ContentSchemaEditor
          key="seo"
          pageKey="seo_listing"
          title="SEO Listing Template"
          description="SEO listing template"
          icon={<i className="ri-search-line text-[#1B4332] text-sm"></i>}
          tabs={SEO_TABS}
          defaults={DEFAULT_SEO_LISTING as unknown as Record<string, unknown>}
          onSaved={invalidateDynamicTemplateCache}
        />
      )}
      {which === 'pd' && (
        <ContentSchemaEditor
          key="pd"
          pageKey="property_detail"
          title="Property Detail Copy"
          description="Property detail copy"
          icon={<i className="ri-home-4-line text-[#1B4332] text-sm"></i>}
          tabs={PD_TABS}
          defaults={DEFAULT_PROPERTY_DETAIL as unknown as Record<string, unknown>}
          onSaved={invalidateDynamicTemplateCache}
        />
      )}
    </ManagementLayout>
  );
}