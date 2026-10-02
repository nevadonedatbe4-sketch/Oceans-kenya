import { useState } from 'react';
import ManagementLayout from '../ManagementLayout';
import ContentSchemaEditor, { type TabSchema } from './ContentSchemaEditor';
import { invalidatePageContent } from '@/hooks/usePageContent';
import {
  DEFAULT_BLOG_DETAIL,
  DEFAULT_COMMUTE,
  DEFAULT_ESTATE_AGENT,
  DEFAULT_PLACE_DETAIL,
  DEFAULT_NIGHTLIFE,
} from '@/lib/pageCopy';

const BLOG_TABS: TabSchema[] = [
  {
    key: 'states', label: 'States', icon: 'ri-error-warning-line',
    fields: [
      { key: 'loading_text', label: 'Loading text', type: 'text' },
      { key: 'notfound_title', label: 'Not found — title', type: 'text' },
      { key: 'notfound_text', label: 'Not found — text', type: 'text' },
      { key: 'notfound_button', label: 'Not found — button', type: 'text' },
      { key: 'back_label', label: 'Back link label', type: 'text' },
      { key: 'default_author', label: 'Default author', type: 'text' },
    ],
  },
  {
    key: 'body', label: 'Body & CTA', icon: 'ri-article-line',
    fields: [
      { key: 'related_heading', label: 'Related heading', type: 'text' },
      { key: 'guide_suffix', label: 'Guide card suffix', type: 'text' },
      { key: 'cta_title', label: 'CTA — title', type: 'text' },
      { key: 'cta_text', label: 'CTA — text', type: 'textarea' },
      { key: 'cta_button', label: 'CTA — button', type: 'text' },
      { key: 'seo_description', label: 'SEO description', type: 'textarea', rows: 2 },
    ],
  },
];

const COMMUTE_TABS: TabSchema[] = [
  {
    key: 'hero', label: 'Hero & Search', icon: 'ri-image-2-line',
    fields: [
      { key: 'hero_title', label: 'Hero title', type: 'text' },
      { key: 'hero_subtitle', label: 'Hero subtitle', type: 'text' },
      { key: 'live_note', label: 'Live-traffic note', type: 'text' },
      { key: 'straight_note', label: 'Straight-line note', type: 'text' },
      { key: 'results_heading_prefix', label: 'Results heading prefix', type: 'text' },
      { key: 'calculating_text', label: 'Calculating text', type: 'text' },
      { key: 'list_label', label: 'List toggle', type: 'text' },
      { key: 'map_label', label: 'Map toggle', type: 'text' },
    ],
  },
  {
    key: 'cards', label: 'Cards & States', icon: 'ri-layout-grid-line',
    fields: [
      { key: 'preview_label', label: 'Preview label', type: 'text' },
      { key: 'distance_unavailable', label: 'Distance unavailable', type: 'text' },
      { key: 'rent_label', label: 'To rent label', type: 'text' },
      { key: 'sale_label', label: 'For sale label', type: 'text' },
      { key: 'call_label', label: 'Call label', type: 'text' },
      { key: 'email_label', label: 'Email label', type: 'text' },
      { key: 'fallback_title', label: 'Fallback — title', type: 'text' },
      { key: 'fallback_text', label: 'Fallback — text', type: 'text' },
      { key: 'no_results_title', label: 'No results — title', type: 'text' },
      { key: 'no_results_text', label: 'No results — text', type: 'text' },
      { key: 'error_title', label: 'Error — title', type: 'text' },
      { key: 'try_again', label: 'Try again button', type: 'text' },
    ],
  },
  {
    key: 'sidebar', label: 'Sidebar & Tips', icon: 'ri-layout-right-line',
    fields: [
      { key: 'map_heading_prefix', label: 'Map heading prefix', type: 'text' },
      { key: 'api_key_note', label: 'Map API note', type: 'text' },
      { key: 'popular_destinations', label: 'Popular destinations title', type: 'text' },
      { key: 'tips_title', label: 'Tips — title', type: 'text' },
      { key: 'tips', label: 'Commute tips', type: 'jsonlist', itemLabelKey: 'text', itemFields: [{ key: 'icon', label: 'Icon class', type: 'text' }, { key: 'text', label: 'Tip text', type: 'text' }] },
    ],
  },
];

const AGENT_TABS: TabSchema[] = [
  {
    key: 'hero', label: 'Hero & Intro', icon: 'ri-image-2-line',
    fields: [
      { key: 'hero_subtitle_prefix', label: 'Hero subtitle — prefix', type: 'text' },
      { key: 'hero_subtitle_suffix', label: 'Hero subtitle — suffix', type: 'text' },
      { key: 'hero_button_primary', label: 'Hero button — view', type: 'text' },
      { key: 'hero_button_primary_suffix', label: 'Hero button — "Homes"', type: 'text' },
      { key: 'hero_button_secondary', label: 'Hero button — secondary', type: 'text' },
      { key: 'intro_heading_prefix', label: 'Intro heading — prefix', type: 'text' },
      { key: 'intro_heading_suffix', label: 'Intro heading — suffix', type: 'text' },
    ],
  },
  {
    key: 'body', label: 'Listings & Empty', icon: 'ri-list-check-2',
    fields: [
      { key: 'properties_heading_prefix', label: 'Listings heading prefix', type: 'text' },
      { key: 'results_word', label: 'Results word', type: 'text' },
      { key: 'load_more', label: 'Load more button', type: 'text' },
      { key: 'loading_label', label: 'Loading label', type: 'text' },
      { key: 'empty_title', label: 'Empty — title', type: 'text' },
      { key: 'empty_text_prefix', label: 'Empty — text prefix', type: 'text' },
      { key: 'empty_text_suffix', label: 'Empty — text suffix', type: 'text' },
      { key: 'empty_button', label: 'Empty — button', type: 'text' },
    ],
  },
  {
    key: 'cta', label: 'FAQ, Related & CTA', icon: 'ri-megaphone-line',
    fields: [
      { key: 'faq_heading', label: 'FAQ heading', type: 'text' },
      { key: 'related_heading_prefix', label: 'Related heading prefix', type: 'text' },
      { key: 'cta_title_prefix', label: 'CTA — title prefix', type: 'text' },
      { key: 'cta_text_prefix', label: 'CTA — text prefix', type: 'text' },
      { key: 'cta_text_suffix', label: 'CTA — text suffix', type: 'text' },
      { key: 'cta_button', label: 'CTA — button', type: 'text' },
      { key: 'notfound_title', label: 'Not found — title', type: 'text' },
      { key: 'notfound_text', label: 'Not found — text', type: 'text' },
      { key: 'notfound_button', label: 'Not found — button', type: 'text' },
    ],
  },
];

const PLACE_TABS: TabSchema[] = [
  {
    key: 'states', label: 'States & Hero', icon: 'ri-error-warning-line',
    fields: [
      { key: 'loading_title', label: 'Loading title', type: 'text' },
      { key: 'notfound_title', label: 'Not found — title', type: 'text' },
      { key: 'notfound_text', label: 'Not found — text', type: 'textarea' },
      { key: 'notfound_button', label: 'Not found — button', type: 'text' },
      { key: 'no_image_label', label: 'No image label', type: 'text' },
    ],
  },
  {
    key: 'content', label: 'Content Sections', icon: 'ri-article-line',
    fields: [
      { key: 'about_heading', label: 'About heading', type: 'text' },
      { key: 'services_heading', label: 'Services heading', type: 'text' },
      { key: 'price_range_heading', label: 'Price range heading', type: 'text' },
      { key: 'location_label', label: 'Location label', type: 'text' },
      { key: 'hours_label', label: 'Opening hours label', type: 'text' },
      { key: 'phone_label', label: 'Phone label', type: 'text' },
      { key: 'email_label', label: 'Email label', type: 'text' },
      { key: 'features_heading', label: 'Features heading', type: 'text' },
      { key: 'gallery_heading', label: 'Gallery heading', type: 'text' },
      { key: 'related_heading_prefix', label: 'Related heading prefix', type: 'text' },
    ],
  },
  {
    key: 'reviews', label: 'Reviews', icon: 'ri-chat-3-line',
    fields: [
      { key: 'reviews_heading', label: 'Reviews heading', type: 'text' },
      { key: 'no_reviews_text', label: 'No reviews text', type: 'text' },
      { key: 'from_google_label', label: 'From Google label', type: 'text' },
      { key: 'verified_visitor', label: 'Verified visitor label', type: 'text' },
      { key: 'write_review_heading', label: 'Write review heading', type: 'text' },
      { key: 'rating_label', label: 'Rating label', type: 'text' },
      { key: 'name_label', label: 'Name label', type: 'text' },
      { key: 'name_placeholder', label: 'Name placeholder', type: 'text' },
      { key: 'review_label', label: 'Review label', type: 'text' },
      { key: 'review_placeholder', label: 'Review placeholder', type: 'text' },
      { key: 'moderated_note', label: 'Moderated note', type: 'text' },
      { key: 'submit_review', label: 'Submit button', type: 'text' },
      { key: 'submitting', label: 'Submitting label', type: 'text' },
    ],
  },
  {
    key: 'sidebar', label: 'Quick Facts & Actions', icon: 'ri-layout-right-line',
    fields: [
      { key: 'quick_facts', label: 'Quick facts title', type: 'text' },
      { key: 'category_label', label: 'Category label', type: 'text' },
      { key: 'type_label', label: 'Type label', type: 'text' },
      { key: 'price_fact_label', label: 'Price fact label', type: 'text' },
      { key: 'area_label', label: 'Area label', type: 'text' },
      { key: 'views_label', label: 'Views label', type: 'text' },
      { key: 'visit_website', label: 'Visit website button', type: 'text' },
      { key: 'get_directions', label: 'Get directions button', type: 'text' },
      { key: 'call_button', label: 'Call button', type: 'text' },
      { key: 'share_button', label: 'Share button', type: 'text' },
      { key: 'copy_link', label: 'Copy link', type: 'text' },
      { key: 'download_pdf', label: 'Download PDF', type: 'text' },
    ],
  },
];

const NIGHT_TABS: TabSchema[] = [
  {
    key: 'hero', label: 'Hero & Stats', icon: 'ri-image-2-line',
    fields: [
      { key: 'hero_badge', label: 'Hero badge', type: 'text' },
      { key: 'hero_title', label: 'Hero title', type: 'text' },
      { key: 'hero_subtitle', label: 'Hero subtitle', type: 'textarea' },
      { key: 'hero_button_primary', label: 'Hero button — primary', type: 'text' },
      { key: 'hero_button_secondary', label: 'Hero button — secondary', type: 'text' },
      { key: 'stat_spots', label: 'Stat — night spots', type: 'text' },
      { key: 'stat_areas', label: 'Stat — areas', type: 'text' },
      { key: 'stat_clubs', label: 'Stat — clubs & lounges', type: 'text' },
      { key: 'stat_casinos', label: 'Stat — casinos', type: 'text' },
    ],
  },
  {
    key: 'body', label: 'Body & States', icon: 'ri-list-check-2',
    fields: [
      { key: 'intro_heading', label: 'Intro heading', type: 'text' },
      { key: 'intro_sub', label: 'Intro sub text', type: 'text' },
      { key: 'showing_word', label: '"Showing" word', type: 'text' },
      { key: 'spot_word', label: '"night spot" word', type: 'text' },
      { key: 'clear_all', label: 'Clear all', type: 'text' },
      { key: 'load_more_prefix', label: 'Load more prefix', type: 'text' },
      { key: 'remaining_word', label: '"remaining" word', type: 'text' },
      { key: 'error_title', label: 'Error — title', type: 'text' },
      { key: 'retry_button', label: 'Retry button', type: 'text' },
      { key: 'empty_title', label: 'Empty — title', type: 'text' },
      { key: 'empty_text_filtered', label: 'Empty — filtered text', type: 'text' },
      { key: 'empty_text_default', label: 'Empty — default text', type: 'text' },
      { key: 'reset_filters', label: 'Reset filters', type: 'text' },
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

export default function LocalPagesCMS() {
  const [which, setWhich] = useState<'blog' | 'commute' | 'agent' | 'place' | 'night'>('blog');
  const switchTabs = [
    ['blog', 'Blog Detail'],
    ['commute', 'Commute Time'],
    ['agent', 'Estate Agent'],
    ['place', 'Place Detail'],
    ['night', 'Night Life'],
  ] as const;
  return (
    <ManagementLayout title="Local & Utility Pages" description="Backend content for the blog article template, commute search, estate-agent pages, place detail and Night Life. Edit once — it applies live across every generated page." icon={<i className="ri-compass-3-line text-[#1B4332] text-lg"></i>}>
      <div className="mb-5">
        <div className="inline-flex gap-1 bg-stone-100 p-1 rounded-lg flex-wrap">
          {switchTabs.map(([k, label]) => (
            <button key={k} onClick={() => setWhich(k)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${which === k ? 'bg-white text-[#1B4332] shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {which === 'blog' && (
        <ContentSchemaEditor key="blog" pageKey="blog_detail" title="Blog Detail" description="blog article template" icon={<i className="ri-article-line text-[#1B4332] text-sm"></i>} tabs={BLOG_TABS} defaults={DEFAULT_BLOG_DETAIL as unknown as Record<string, unknown>} onSaved={() => invalidatePageContent('blog_detail')} />
      )}
      {which === 'commute' && (
        <ContentSchemaEditor key="commute" pageKey="commute" title="Commute Time" description="commute search" icon={<i className="ri-route-line text-[#1B4332] text-sm"></i>} tabs={COMMUTE_TABS} defaults={DEFAULT_COMMUTE as unknown as Record<string, unknown>} onSaved={() => invalidatePageContent('commute')} />
      )}
      {which === 'agent' && (
        <ContentSchemaEditor key="agent" pageKey="estate_agent" title="Estate Agent Template" description="estate agent template" icon={<i className="ri-user-star-line text-[#1B4332] text-sm"></i>} tabs={AGENT_TABS} defaults={DEFAULT_ESTATE_AGENT as unknown as Record<string, unknown>} onSaved={() => invalidatePageContent('estate_agent')} />
      )}
      {which === 'place' && (
        <ContentSchemaEditor key="place" pageKey="place_detail" title="Place Detail Template" description="place detail template" icon={<i className="ri-map-pin-2-line text-[#1B4332] text-sm"></i>} tabs={PLACE_TABS} defaults={DEFAULT_PLACE_DETAIL as unknown as Record<string, unknown>} onSaved={() => invalidatePageContent('place_detail')} />
      )}
      {which === 'night' && (
        <ContentSchemaEditor key="night" pageKey="nightlife" title="Night Life" description="night life directory" icon={<i className="ri-moon-clear-line text-[#1B4332] text-sm"></i>} tabs={NIGHT_TABS} defaults={DEFAULT_NIGHTLIFE as unknown as Record<string, unknown>} onSaved={() => invalidatePageContent('nightlife')} />
      )}
    </ManagementLayout>
  );
}