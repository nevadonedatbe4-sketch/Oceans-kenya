import { useState } from 'react';
import ManagementLayout from '../ManagementLayout';
import ContentSchemaEditor, { type TabSchema } from './ContentSchemaEditor';
import { invalidatePageContent } from '@/hooks/usePageContent';
import {
  DEFAULT_NEIGH_DETAIL,
  DEFAULT_NAIROBI_LIFE,
  DEFAULT_SCHOOLS,
  DEFAULT_AREA_GUIDE,
} from '@/lib/pageCopy';

const NEIGH_TABS: TabSchema[] = [
  {
    key: 'hero', label: 'Hero & States', icon: 'ri-image-2-line',
    fields: [
      { key: 'hero_badge_suffix', label: 'Hero badge suffix (after property count)', type: 'text' },
      { key: 'hero_title_suffix', label: 'Hero title suffix (after area name)', type: 'text' },
      { key: 'notfound_title', label: 'Not found — title', type: 'text' },
      { key: 'notfound_text', label: 'Not found — text', type: 'text' },
      { key: 'notfound_button', label: 'Not found — button', type: 'text' },
    ],
  },
  {
    key: 'listings', label: 'Listings & Empty', icon: 'ri-list-check-2',
    fields: [
      { key: 'listings_eyebrow', label: 'Listings — eyebrow', type: 'text' },
      { key: 'listings_heading_prefix', label: 'Listings — heading prefix', type: 'text' },
      { key: 'view_all_label', label: 'View all link', type: 'text' },
      { key: 'tab_sale', label: 'Tab — For Sale', type: 'text' },
      { key: 'tab_rent', label: 'Tab — To Let', type: 'text' },
      { key: 'empty_sale_title', label: 'Empty — for sale title', type: 'text' },
      { key: 'empty_rent_title', label: 'Empty — to let title', type: 'text' },
      { key: 'empty_text_suffix', label: 'Empty — text (after area name)', type: 'text' },
      { key: 'empty_button', label: 'Empty — button', type: 'text' },
    ],
  },
  {
    key: 'sections', label: 'Map, Nearby & Sidebar', icon: 'ri-layout-right-line',
    fields: [
      { key: 'location_heading', label: 'Location heading', type: 'text' },
      { key: 'nearby_heading', label: 'Nearby areas heading', type: 'text' },
      { key: 'nearby_property_word', label: 'Nearby — property word', type: 'text' },
      { key: 'strip_heading', label: 'Nearby strip — heading', type: 'text' },
      { key: 'strip_desc_prefix', label: 'Nearby strip — description prefix', type: 'text' },
      { key: 'strip_desc_suffix', label: 'Nearby strip — description suffix', type: 'text' },
      { key: 'sidebar_eyebrow', label: 'Sidebar — eyebrow', type: 'text' },
      { key: 'sidebar_heading', label: 'Sidebar — heading', type: 'text' },
      { key: 'sidebar_button_prefix', label: 'Sidebar button — prefix', type: 'text' },
      { key: 'sidebar_button_suffix', label: 'Sidebar button — suffix', type: 'text' },
    ],
  },
  {
    key: 'compare', label: 'CTA & Compare', icon: 'ri-table-line',
    fields: [
      { key: 'cta_title_prefix', label: 'CTA — title prefix', type: 'text' },
      { key: 'cta_text', label: 'CTA — text', type: 'textarea' },
      { key: 'cta_button', label: 'CTA — button', type: 'text' },
      { key: 'compare_heading', label: 'Compare — heading', type: 'text' },
      { key: 'compare_sub', label: 'Compare — sub text', type: 'text' },
      { key: 'this_page_label', label: 'Compare — "this page" label', type: 'text' },
    ],
  },
];

const LIFE_TABS: TabSchema[] = [
  {
    key: 'hero', label: 'Hero & Intro', icon: 'ri-image-2-line',
    fields: [
      { key: 'hero_badge', label: 'Hero badge', type: 'text' },
      { key: 'hero_title', label: 'Hero title', type: 'text' },
      { key: 'hero_subtitle', label: 'Hero subtitle', type: 'textarea' },
      { key: 'updated_label', label: 'Updated — label', type: 'text' },
      { key: 'updated_value', label: 'Updated — value', type: 'text' },
      { key: 'intro_text', label: 'Intro strip text', type: 'textarea' },
      { key: 'intro_link', label: 'Intro strip link', type: 'text' },
    ],
  },
  {
    key: 'states', label: 'States & Cards', icon: 'ri-list-check-2',
    fields: [
      { key: 'loading_text', label: 'Loading text', type: 'text' },
      { key: 'error_title', label: 'Error — title', type: 'text' },
      { key: 'retry_button', label: 'Retry button', type: 'text' },
      { key: 'empty_title', label: 'Empty — title', type: 'text' },
      { key: 'empty_text', label: 'Empty — text', type: 'text' },
      { key: 'card_badge', label: 'Card badge', type: 'text' },
      { key: 'card_read_label', label: 'Card read label', type: 'text' },
    ],
  },
  {
    key: 'cta', label: 'CTA', icon: 'ri-megaphone-line',
    fields: [
      { key: 'cta_title', label: 'CTA — title', type: 'text' },
      { key: 'cta_text', label: 'CTA — text', type: 'textarea' },
      { key: 'cta_primary', label: 'CTA — primary button', type: 'text' },
      { key: 'cta_secondary', label: 'CTA — secondary button', type: 'text' },
    ],
  },
];

const SCHOOLS_TABS: TabSchema[] = [
  {
    key: 'hero', label: 'Hero & Search', icon: 'ri-image-2-line',
    fields: [
      { key: 'hero_title', label: 'Hero title', type: 'text' },
      { key: 'hero_subtitle', label: 'Hero subtitle', type: 'textarea' },
      { key: 'search_placeholder', label: 'Search placeholder', type: 'text' },
      { key: 'filters_label', label: 'Filters button', type: 'text' },
      { key: 'active_label', label: 'Active label', type: 'text' },
      { key: 'reset_label', label: 'Reset label', type: 'text' },
    ],
  },
  {
    key: 'filters', label: 'Filter Options', icon: 'ri-filter-3-line',
    fields: [
      { key: 'all_types_label', label: 'All schools pill', type: 'text' },
      { key: 'all_areas_label', label: 'All areas option', type: 'text' },
      { key: 'all_levels_label', label: 'All levels option', type: 'text' },
      { key: 'all_curriculums_label', label: 'All curriculums option', type: 'text' },
      { key: 'showing_word', label: 'Results — "Showing"', type: 'text' },
      { key: 'schools_word', label: 'Results — "schools"', type: 'text' },
    ],
  },
  {
    key: 'cards', label: 'Cards & Empty', icon: 'ri-layout-grid-line',
    fields: [
      { key: 'photo_coming_label', label: 'Photo placeholder', type: 'text' },
      { key: 'address_suffix', label: 'Address — city suffix', type: 'text' },
      { key: 'from_cbd_label', label: 'Distance — "from CBD"', type: 'text' },
      { key: 'established_prefix', label: 'Established prefix', type: 'text' },
      { key: 'students_word', label: 'Students word', type: 'text' },
      { key: 'properties_nearby', label: 'Properties nearby button', type: 'text' },
      { key: 'view_school', label: 'View school button', type: 'text' },
      { key: 'empty_title', label: 'Empty — title', type: 'text' },
      { key: 'empty_text_filtered', label: 'Empty — filtered text', type: 'text' },
      { key: 'empty_text_default', label: 'Empty — default text', type: 'text' },
      { key: 'clear_filters', label: 'Clear filters button', type: 'text' },
      { key: 'error_title', label: 'Error — title', type: 'text' },
      { key: 'retry_button', label: 'Retry button', type: 'text' },
    ],
  },
  {
    key: 'sidebar', label: 'Sidebar & CTA', icon: 'ri-layout-right-line',
    fields: [
      { key: 'by_neighbourhood_title', label: 'Sidebar — title', type: 'text' },
      { key: 'all_neighbourhoods_label', label: 'Sidebar — all neighbourhoods', type: 'text' },
      { key: 'types_title', label: 'Sidebar — types title', type: 'text' },
      { key: 'schools_count_word', label: 'Sidebar — count word', type: 'text' },
      { key: 'cta_title', label: 'CTA — title', type: 'text' },
      { key: 'cta_text', label: 'CTA — text', type: 'text' },
      { key: 'cta_button', label: 'CTA — button', type: 'text' },
    ],
  },
];

const GUIDE_TABS: TabSchema[] = [
  {
    key: 'hero', label: 'Hero', icon: 'ri-image-2-line',
    fields: [
      { key: 'hero_subtitle_prefix', label: 'Hero subtitle — prefix', type: 'text' },
      { key: 'hero_subtitle_suffix', label: 'Hero subtitle — suffix', type: 'text' },
      { key: 'hero_button_view', label: 'Hero button — view', type: 'text' },
      { key: 'hero_button_view_suffix', label: 'Hero button — "Homes"', type: 'text' },
      { key: 'hero_button_ask', label: 'Hero button — ask', type: 'text' },
    ],
  },
  {
    key: 'body', label: 'Body & Listings', icon: 'ri-article-line',
    fields: [
      { key: 'about_heading_prefix', label: 'About heading — prefix', type: 'text' },
      { key: 'about_heading_suffix', label: 'About heading — suffix', type: 'text' },
      { key: 'life_eyebrow', label: 'Life — eyebrow', type: 'text' },
      { key: 'life_heading_prefix', label: 'Life — heading prefix', type: 'text' },
      { key: 'life_full_directory', label: 'Full directory link', type: 'text' },
      { key: 'results_word', label: 'Results word', type: 'text' },
      { key: 'load_more', label: 'Load more button', type: 'text' },
      { key: 'faq_heading', label: 'FAQ heading', type: 'text' },
      { key: 'related_heading_prefix', label: 'Related heading prefix', type: 'text' },
    ],
  },
  {
    key: 'states', label: 'Sidebar, Empty & CTA', icon: 'ri-megaphone-line',
    fields: [
      { key: 'empty_title', label: 'Empty — title', type: 'text' },
      { key: 'empty_text_prefix', label: 'Empty — text prefix', type: 'text' },
      { key: 'empty_text_suffix', label: 'Empty — text suffix', type: 'text' },
      { key: 'empty_search_label', label: 'Empty — search button', type: 'text' },
      { key: 'empty_register', label: 'Empty — register button', type: 'text' },
      { key: 'sidebar_eyebrow', label: 'Sidebar — eyebrow', type: 'text' },
      { key: 'sidebar_heading_suffix', label: 'Sidebar — heading suffix', type: 'text' },
      { key: 'sidebar_best_for', label: 'Sidebar — best for value', type: 'text' },
      { key: 'sidebar_drive_label', label: 'Sidebar — drive label', type: 'text' },
      { key: 'cta_title_prefix', label: 'CTA — title prefix', type: 'text' },
      { key: 'cta_title_suffix', label: 'CTA — title suffix', type: 'text' },
      { key: 'cta_text_prefix', label: 'CTA — text prefix', type: 'text' },
      { key: 'cta_text_suffix', label: 'CTA — text suffix', type: 'text' },
      { key: 'cta_button', label: 'CTA — button', type: 'text' },
      { key: 'notfound_title', label: 'Not found — title', type: 'text' },
      { key: 'notfound_text', label: 'Not found — text', type: 'text' },
      { key: 'notfound_button', label: 'Not found — button', type: 'text' },
    ],
  },
];

export default function ExplorePagesCMS() {
  const [which, setWhich] = useState<'neigh' | 'life' | 'schools' | 'guide'>('neigh');
  const switchTabs = [
    ['neigh', 'Neighbourhood Detail'],
    ['life', 'Living in Nairobi'],
    ['schools', 'Schools'],
    ['guide', 'Area Guide'],
  ] as const;
  return (
    <ManagementLayout title="Neighbourhood & Guide Pages" description="Backend content for the neighbourhood detail, Living in Nairobi hub, Schools directory and every Area Guide page. Edit once — it applies live." icon={<i className="ri-map-pin-2-line text-[#1B4332] text-lg"></i>}>
      <div className="mb-5">
        <div className="inline-flex gap-1 bg-stone-100 p-1 rounded-lg flex-wrap">
          {switchTabs.map(([k, label]) => (
            <button key={k} onClick={() => setWhich(k)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${which === k ? 'bg-white text-[#1B4332] shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {which === 'neigh' && (
        <ContentSchemaEditor key="neigh" pageKey="neigh_detail" title="Neighbourhood Detail" description="neighbourhood detail template" icon={<i className="ri-map-pin-2-line text-[#1B4332] text-sm"></i>} tabs={NEIGH_TABS} defaults={DEFAULT_NEIGH_DETAIL as unknown as Record<string, unknown>} onSaved={() => invalidatePageContent('neigh_detail')} />
      )}
      {which === 'life' && (
        <ContentSchemaEditor key="life" pageKey="nairobi_life" title="Living in Nairobi" description="living in Nairobi hub" icon={<i className="ri-book-open-line text-[#1B4332] text-sm"></i>} tabs={LIFE_TABS} defaults={DEFAULT_NAIROBI_LIFE as unknown as Record<string, unknown>} onSaved={() => invalidatePageContent('nairobi_life')} />
      )}
      {which === 'schools' && (
        <ContentSchemaEditor key="schools" pageKey="schools" title="Schools" description="schools directory" icon={<i className="ri-school-line text-[#1B4332] text-sm"></i>} tabs={SCHOOLS_TABS} defaults={DEFAULT_SCHOOLS as unknown as Record<string, unknown>} onSaved={() => invalidatePageContent('schools')} />
      )}
      {which === 'guide' && (
        <ContentSchemaEditor key="guide" pageKey="area_guide" title="Area Guide Template" description="area guide template" icon={<i className="ri-road-map-line text-[#1B4332] text-sm"></i>} tabs={GUIDE_TABS} defaults={DEFAULT_AREA_GUIDE as unknown as Record<string, unknown>} onSaved={() => invalidatePageContent('area_guide')} />
      )}
    </ManagementLayout>
  );
}