import ManagementLayout from '../ManagementLayout';
import ContentSchemaEditor, { type FieldSchema, type TabSchema } from './ContentSchemaEditor';
import { invalidatePageContent } from '@/hooks/usePageContent';
import { buildLegalDefaults } from '@/lib/pageCopy';
import { LEGAL_PAGES } from '@/pages/legal/page';

const PAGE_LABELS: Record<string, string> = {
  'privacy-policy': 'Privacy Policy',
  'terms-conditions': 'Terms & Conditions',
  'cookie-policy': 'Cookie Policy',
  disclaimer: 'Disclaimer',
  'help-center': 'Help Center',
  'report-a-listing': 'Report a Listing',
};

function pageFields(key: string): FieldSchema[] {
  const k = key.replace(/-/g, '_');
  return [
    { key: `${k}_title`, label: 'Page title (H1)', type: 'text' },
    { key: `${k}_eyebrow`, label: 'Eyebrow', type: 'text' },
    { key: `${k}_meta_title`, label: 'SEO title', type: 'text' },
    { key: `${k}_meta_description`, label: 'SEO description', type: 'textarea', rows: 2 },
    { key: `${k}_intro`, label: 'Intro paragraph', type: 'textarea' },
    {
      key: `${k}_sections`,
      label: 'Sections',
      type: 'jsonlist',
      itemLabelKey: 'heading',
      hint: 'Each section has a heading and a body. Separate paragraphs with a blank line.',
      itemFields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'body', label: 'Body (blank line between paragraphs)', type: 'textarea' },
      ],
    },
  ];
}

const TABS: TabSchema[] = [
  {
    key: 'shared', label: 'Shared', icon: 'ri-share-line',
    fields: [
      { key: 'contact_prompt', label: 'Contact prompt', type: 'text' },
      { key: 'contact_button', label: 'Contact button', type: 'text' },
      { key: 'notfound_title', label: 'Not found — title', type: 'text' },
      { key: 'notfound_link', label: 'Not found — link', type: 'text' },
    ],
  },
  ...Object.keys(PAGE_LABELS).map((key) => ({
    key: key.replace(/-/g, '_'),
    label: PAGE_LABELS[key],
    icon: 'ri-file-text-line',
    fields: pageFields(key),
  })),
];

export default function LegalPagesCMS() {
  return (
    <ManagementLayout title="Legal & Support Pages" description="Backend content for the Privacy Policy, Terms, Cookie Policy, Disclaimer, Help Center and Report a Listing pages." icon={<i className="ri-shield-check-line text-[#1B4332] text-lg"></i>}>
      <ContentSchemaEditor
        pageKey="legal"
        title="Legal & Support Pages"
        description="legal & support"
        icon={<i className="ri-shield-check-line text-[#1B4332] text-sm"></i>}
        tabs={TABS}
        defaults={buildLegalDefaults(LEGAL_PAGES)}
        onSaved={() => invalidatePageContent('legal')}
      />
    </ManagementLayout>
  );
}