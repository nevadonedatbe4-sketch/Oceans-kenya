import ManagementLayout from '../ManagementLayout';
import ContentSchemaEditor, { type TabSchema } from './ContentSchemaEditor';
import { DEFAULT_NEIGHBOURHOODS_CONTENT, invalidateNeighbourhoodsPageContentCache } from '@/hooks/useNeighbourhoodsPageContent';

const TABS: TabSchema[] = [
  {
    key: 'hero', label: 'Hero & Masthead', icon: 'ri-image-2-line',
    fields: [
      { key: 'masthead_title', label: 'Masthead — Title', type: 'text' },
      { key: 'masthead_subtitle', label: 'Masthead — Subtitle', type: 'text' },
      { key: 'masthead_issue', label: 'Masthead — Issue line', type: 'text' },
      { key: 'hero_eyebrow', label: 'Hero — Eyebrow', type: 'text' },
      { key: 'hero_title', label: 'Hero — Title', type: 'text' },
      { key: 'hero_intro', label: 'Hero — Intro paragraph', type: 'textarea', rows: 4 },
      { key: 'hero_note', label: 'Hero — Side note', type: 'textarea', rows: 3 },
    ],
  },
  {
    key: 'quicklinks', label: 'Quick Links & Stats', icon: 'ri-links-line',
    fields: [
      { key: 'show_quicklinks', label: 'Show quick links section', type: 'toggle' },
      { key: 'quicklinks', label: 'Quick link cards', type: 'jsonlist', itemLabelKey: 'title', hint: 'Icon uses a Remix Icon class (e.g. ri-store-2-line). Leave colour blank for the default blue.', itemFields: [
        { key: 'icon', label: 'Icon class', type: 'text' },
        { key: 'color', label: 'Colour (hex, optional)', type: 'text' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'text', label: 'Description', type: 'textarea' },
        { key: 'link', label: 'Link', type: 'text' },
      ] },
      { key: 'show_stats', label: 'Show stats strip', type: 'toggle' },
      { key: 'stat1_label', label: 'Stat 1 label', type: 'text' },
      { key: 'stat2_label', label: 'Stat 2 label', type: 'text' },
      { key: 'stat3_label', label: 'Stat 3 label', type: 'text' },
      { key: 'stat4_label', label: 'Stat 4 label', type: 'text' },
    ],
  },
  {
    key: 'tabs', label: 'Tabs & Filter Bar', icon: 'ri-filter-3-line',
    fields: [
      { key: 'tab_neighbourhoods', label: 'Tab — Neighbourhoods', type: 'text' },
      { key: 'tab_guides', label: 'Tab — Area Guides', type: 'text' },
      { key: 'tab_blog', label: 'Tab — Blog', type: 'text' },
      { key: 'tab_compare', label: 'Tab — Compare', type: 'text' },
      { key: 'search_placeholder', label: 'Search placeholder', type: 'text' },
      { key: 'areas_word', label: 'Result word (e.g. Areas)', type: 'text' },
      { key: 'filterbar_heading', label: 'Filter bar heading', type: 'text' },
      { key: 'filterbar_reset', label: 'Filter bar reset label', type: 'text' },
    ],
  },
  {
    key: 'cards', label: 'Cards & States', icon: 'ri-layout-grid-line',
    fields: [
      { key: 'card_properties_label', label: 'Card — properties label', type: 'text' },
      { key: 'card_explore_label', label: 'Card — explore button', type: 'text' },
      { key: 'guide_read_label', label: 'Guide card — read button', type: 'text' },
      { key: 'guide_card_suffix', label: 'Guide card — title suffix', type: 'text' },
      { key: 'blog_all_label', label: 'Blog — all posts label', type: 'text' },
      { key: 'error_title', label: 'Error — title', type: 'text' },
      { key: 'error_retry_label', label: 'Error — retry button', type: 'text' },
      { key: 'hood_empty_title', label: 'Empty (neighbourhoods) — title', type: 'text' },
      { key: 'hood_empty_text', label: 'Empty (neighbourhoods) — text', type: 'text' },
      { key: 'guides_empty_title', label: 'Empty (guides) — title', type: 'text' },
      { key: 'guides_empty_text', label: 'Empty (guides) — text', type: 'text' },
      { key: 'blog_empty_title', label: 'Empty (blog) — title', type: 'text' },
      { key: 'blog_empty_text', label: 'Empty (blog) — text', type: 'text' },
    ],
  },
  {
    key: 'compare', label: 'Compare', icon: 'ri-scales-line',
    fields: [
      { key: 'compare_title', label: 'Compare — heading', type: 'text' },
      { key: 'compare_text', label: 'Compare — intro text', type: 'textarea' },
      { key: 'compare_first_label', label: 'First dropdown label', type: 'text' },
      { key: 'compare_second_label', label: 'Second dropdown label', type: 'text' },
      { key: 'compare_popular_label', label: 'Popular comparisons label', type: 'text' },
      { key: 'compare_winner_label', label: 'Winner badge label', type: 'text' },
      { key: 'compare_tie_label', label: 'Tie badge label', type: 'text' },
      { key: 'compare_empty_title', label: 'Empty — title', type: 'text' },
      { key: 'compare_empty_text', label: 'Empty — text', type: 'textarea' },
    ],
  },
  {
    key: 'cta', label: 'Featured & CTA', icon: 'ri-megaphone-line',
    fields: [
      { key: 'show_featured', label: 'Show featured guides strip', type: 'toggle' },
      { key: 'featured_eyebrow', label: 'Featured — eyebrow', type: 'text' },
      { key: 'featured_title', label: 'Featured — title', type: 'text' },
      { key: 'featured_text', label: 'Featured — text', type: 'textarea' },
      { key: 'featured_read_more', label: 'Featured — read more label', type: 'text' },
      { key: 'show_cta', label: 'Show bottom CTA', type: 'toggle' },
      { key: 'cta_title', label: 'CTA — title', type: 'text' },
      { key: 'cta_text', label: 'CTA — text', type: 'textarea' },
    ],
  },
];

export default function NeighbourhoodsContentPageCMS() {
  return (
    <ManagementLayout title="Neighbourhoods — Page Copy" description="Edit the editorial copy on the Neighbourhoods landing page. Tag styling, the Quick Decision Guide and Other Notable Areas stay in the Neighbourhoods Styling editor." icon={<i className="ri-map-pin-line text-[#1B4332] text-lg"></i>}>
      <ContentSchemaEditor
        pageKey="neighcopy"
        title="Neighbourhoods Page Copy"
        description="Neighbourhoods page copy"
        icon={<i className="ri-file-text-line text-[#1B4332] text-sm"></i>}
        tabs={TABS}
        defaults={DEFAULT_NEIGHBOURHOODS_CONTENT as unknown as Record<string, unknown>}
        onSaved={invalidateNeighbourhoodsPageContentCache}
      />
    </ManagementLayout>
  );
}