import { useState } from 'react';
import ManagementLayout from '../ManagementLayout';
import ContentSchemaEditor, { type TabSchema } from './ContentSchemaEditor';
import {
  DEFAULT_DIRECTORY_LANDING,
  DEFAULT_DIRECTORY_CATEGORY,
  invalidateDirectoryContentCache,
} from '@/hooks/useDirectoryPageContent';

const LANDING_TABS: TabSchema[] = [
  {
    key: 'hero', label: 'Hero & Counter', icon: 'ri-image-2-line',
    fields: [
      { key: 'hero_eyebrow', label: 'Hero — eyebrow', type: 'text' },
      { key: 'hero_title', label: 'Hero — title', type: 'text' },
      { key: 'hero_text', label: 'Hero — text', type: 'textarea' },
      { key: 'counter_label', label: 'Counter label', type: 'text' },
    ],
  },
  {
    key: 'tiles', label: 'Category Tiles', icon: 'ri-layout-grid-line',
    fields: [
      { key: 'tiles_eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'tiles_title', label: 'Title', type: 'text' },
      { key: 'tiles_text', label: 'Text', type: 'textarea' },
      { key: 'view_category_label', label: 'Dropdown — view category label', type: 'text' },
    ],
  },
  {
    key: 'search', label: 'Search & Results', icon: 'ri-search-line',
    fields: [
      { key: 'search_placeholder', label: 'Search placeholder', type: 'text' },
      { key: 'suggestions_label', label: 'Suggestions heading', type: 'text' },
      { key: 'suggestions', label: 'Search suggestions', type: 'stringlist', placeholder: 'e.g. SIM cards' },
      { key: 'showing_label', label: 'Results — showing label', type: 'text' },
      { key: 'place_word', label: 'Results — place word', type: 'text' },
      { key: 'category_word', label: 'Results — category word (e.g. in)', type: 'text' },
    ],
  },
  {
    key: 'states', label: 'Empty & CTA', icon: 'ri-megaphone-line',
    fields: [
      { key: 'empty_title', label: 'Empty — title', type: 'text' },
      { key: 'empty_text', label: 'Empty — text', type: 'textarea' },
      { key: 'cta_heading', label: 'CTA — heading', type: 'text' },
      { key: 'cta_text', label: 'CTA — text', type: 'textarea' },
      { key: 'cta_button', label: 'CTA — button label', type: 'text' },
    ],
  },
];

const CATEGORY_TABS: TabSchema[] = [
  {
    key: 'hero', label: 'Hero & Subcategories', icon: 'ri-image-2-line',
    fields: [
      { key: 'hero_intro', label: 'Hero — intro', type: 'textarea', hint: 'Use {category} to insert the category name.' },
      { key: 'subcat_heading', label: 'Subcategory heading', type: 'text' },
      { key: 'subcat_all_label', label: 'Subcategory — All label', type: 'text' },
      { key: 'showing_label', label: 'Results — showing label', type: 'text' },
      { key: 'place_word', label: 'Results — place word', type: 'text' },
      { key: 'load_more_label', label: 'Load more label', type: 'text' },
      { key: 'remaining_label', label: 'Load more — remaining word', type: 'text' },
    ],
  },
  {
    key: 'nightlife', label: 'Night Life Bridge', icon: 'ri-moon-line',
    fields: [
      { key: 'nightlife_title', label: 'Title', type: 'text' },
      { key: 'nightlife_text', label: 'Text', type: 'textarea' },
      { key: 'nightlife_button', label: 'Button label', type: 'text' },
    ],
  },
  {
    key: 'states', label: 'States', icon: 'ri-error-warning-line',
    fields: [
      { key: 'error_title', label: 'Error — title', type: 'text' },
      { key: 'error_retry_label', label: 'Error — retry label', type: 'text' },
      { key: 'empty_title', label: 'Empty — title', type: 'text' },
      { key: 'empty_text', label: 'Empty — text', type: 'textarea' },
      { key: 'notfound_title', label: 'Not found — title', type: 'text' },
      { key: 'notfound_text', label: 'Not found — text', type: 'textarea' },
      { key: 'notfound_button', label: 'Not found — button', type: 'text' },
    ],
  },
  {
    key: 'cta', label: 'CTA', icon: 'ri-megaphone-line',
    fields: [
      { key: 'cta_heading', label: 'Heading', type: 'text' },
      { key: 'cta_text', label: 'Text', type: 'textarea' },
      { key: 'cta_button_primary', label: 'Primary button', type: 'text' },
      { key: 'cta_button_secondary', label: 'Secondary button', type: 'text' },
    ],
  },
];

type Which = 'landing' | 'category';

export default function DirectoryPagesPageCMS() {
  const [which, setWhich] = useState<Which>('landing');
  return (
    <ManagementLayout title="Directory Pages" description="Edit the Social Directory landing page and the shared category template copy." icon={<i className="ri-store-2-line text-[#1B4332] text-lg"></i>}>
      <div className="mb-5">
        <div className="inline-flex gap-1 bg-stone-100 p-1 rounded-lg">
          {(['landing', 'category'] as Which[]).map((w) => (
            <button key={w} onClick={() => setWhich(w)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${which === w ? 'bg-white text-[#1B4332] shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>
              {w === 'landing' ? 'Directory Landing' : 'Category Template'}
            </button>
          ))}
        </div>
      </div>
      {which === 'landing' ? (
        <ContentSchemaEditor
          key="landing"
          pageKey="directory"
          title="Directory Landing"
          description="Directory landing"
          icon={<i className="ri-store-2-line text-[#1B4332] text-sm"></i>}
          tabs={LANDING_TABS}
          defaults={DEFAULT_DIRECTORY_LANDING as unknown as Record<string, unknown>}
          onSaved={invalidateDirectoryContentCache}
        />
      ) : (
        <ContentSchemaEditor
          key="category"
          pageKey="dircat"
          title="Directory Category Template"
          description="Directory category template"
          icon={<i className="ri-price-tag-3-line text-[#1B4332] text-sm"></i>}
          tabs={CATEGORY_TABS}
          defaults={DEFAULT_DIRECTORY_CATEGORY as unknown as Record<string, unknown>}
          onSaved={invalidateDirectoryContentCache}
        />
      )}
    </ManagementLayout>
  );
}