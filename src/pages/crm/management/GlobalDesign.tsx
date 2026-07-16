import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ManagementLayout from '../ManagementLayout';
import {
  ImageSettingsTab,
  SpacingSettingsTab,
  ButtonsSettingsTab,
  CardBoxTab,
  CardContentTab,
  CardV7Tab,
  DateTab,
  CarouselTab,
  PageControlTab,
  ResponsiveTab,
  LivePreviewTab,
} from './DesignSubTabs';

type RowKey = 'global' | 'cards' | 'carousel' | 'pages' | 'preview';
type TabKey = string;

interface SubTab {
  key: TabKey;
  label: string;
  icon: string;
}

interface CategoryRow {
  key: RowKey;
  label: string;
  tabs: SubTab[];
}

const CATEGORY_ROWS: CategoryRow[] = [
  {
    key: 'global',
    label: 'Global',
    tabs: [
      { key: 'colours', label: 'Colours', icon: 'ri-drop-fill' },
      { key: 'typography', label: 'Typography', icon: 'ri-text' },
      { key: 'spacing', label: 'Spacing', icon: 'ri-layout-4-line' },
      { key: 'buttons', label: 'Buttons', icon: 'ri-cursor-line' },
      { key: 'image', label: 'Image', icon: 'ri-image-2-line' },
    ],
  },
  {
    key: 'cards',
    label: 'Cards',
    tabs: [
      { key: 'card-box', label: 'Card Box', icon: 'ri-layout-grid-2-line' },
      { key: 'card-content', label: 'Card Content', icon: 'ri-list-ordered' },
      { key: 'card-v7', label: 'Card v7', icon: 'ri-layout-masonry-line' },
      { key: 'date', label: 'Date', icon: 'ri-calendar-line' },
    ],
  },
  {
    key: 'carousel',
    label: 'Carousel',
    tabs: [
      { key: 'carousel', label: 'Carousel', icon: 'ri-slideshow-3-line' },
    ],
  },
  {
    key: 'pages',
    label: 'Pages & Responsive',
    tabs: [
      { key: 'page-control', label: 'Page Control', icon: 'ri-pages-line' },
      { key: 'responsive', label: 'Responsive', icon: 'ri-device-line' },
    ],
  },
  {
    key: 'preview',
    label: 'Preview',
    tabs: [
      { key: 'live-preview', label: 'Live Preview', icon: 'ri-eye-line' },
    ],
  },
];

const CONTEXT_DESCRIPTIONS: Record<string, string> = {
  colours: 'Global colour palette — Primary, Secondary, Accent, Text, Background, Borders, States. Cascades across Cards, Buttons, Sections and all pages.',
  typography: 'Font families, sizes, weights, line heights, and letter spacing — applied globally through CSS variables.',
  spacing: 'Container widths, section padding, grid gaps, and element spacing tokens.',
  buttons: 'Button styles, border radius, hover effects, and state colours.',
  image: 'Image border radius, fit (cover/contain), card height, focal point and hover effects.',
  'card-box': 'Card container styling — shadows, borders, padding, and hover effects.',
  'card-content': 'Content layout within cards — title, price, metadata, and badge positioning.',
  'card-v7': 'Advanced card variant with image overlays, gradient effects, and CTA placement.',
  date: 'Date display format, relative timestamps, and calendar widget styling.',
  carousel: 'Carousel behaviour — dots, arrows, autoplay, transition speed, and slide count.',
  'page-control': 'Per-page visibility toggles, section ordering, and conditional rendering rules.',
  responsive: 'Breakpoint-specific overrides for layout, font scaling, and element visibility.',
  'live-preview': 'Open a live preview of the frontend to see design changes in real time.',
};

interface ColorField {
  key: string;
  label: string;
  cssVar: string;
  hex: string;
  description: string;
  scope: string[];
}

const CORE_PALETTE: ColorField[] = [
  { key: 'primary', label: 'Primary', cssVar: '--color-primary', hex: '#001731', description: 'Main brand color — headings, nav, primary buttons.', scope: ['Cards', 'Buttons', 'Nav', 'Sections'] },
  { key: 'secondary', label: 'Secondary', cssVar: '--color-secondary', hex: '#002349', description: 'Secondary brand color — hover states, sub-sections.', scope: ['Hover', 'Sub-sections'] },
  { key: 'accent', label: 'Accent', cssVar: '--color-accent', hex: '#0D5959', description: 'Accent — active filters, highlights, links.', scope: ['Cards', 'Buttons', 'Sections'] },
  { key: 'golden', label: 'Golden / Highlight', cssVar: '--color-golden', hex: '#C9A84C', description: 'Labels, badges, featured tags, decorative accents.', scope: ['Cards', 'Badges', 'Sections'] },
];

const TEXT_COLORS: ColorField[] = [
  { key: 'text-primary', label: 'Text Primary', cssVar: '--color-text-primary', hex: '#1a1a1a', description: 'Main body text, headings, card titles.', scope: ['Cards', 'Sections'] },
  { key: 'text-secondary', label: 'Text Secondary', cssVar: '--color-text-secondary', hex: '#636363', description: 'Subtitles, descriptions, secondary info.', scope: ['Cards', 'Sections'] },
  { key: 'text-muted', label: 'Text Muted', cssVar: '--color-text-muted', hex: '#9ca3af', description: 'Labels, hints, placeholders, meta info.', scope: ['Cards', 'Forms'] },
  { key: 'text-inverse', label: 'Text Inverse', cssVar: '--color-text-inverse', hex: '#ffffff', description: 'Text on dark backgrounds (buttons, hero).', scope: [] },
];

const BACKGROUND_COLORS: ColorField[] = [
  { key: 'bg-page', label: 'Page Background', cssVar: '--color-bg-page', hex: '#f7f5f0', description: 'Main page canvas — applied to body and root containers.', scope: ['All Pages'] },
  { key: 'bg-section', label: 'Section Background', cssVar: '--color-bg-section', hex: '#ffffff', description: 'Individual section and module backgrounds.', scope: ['Sections', 'Modules'] },
  { key: 'bg-card', label: 'Card Background', cssVar: '--color-bg-card', hex: '#ffffff', description: 'Property cards, info cards, feature cards.', scope: ['Cards', 'Lists'] },
  { key: 'bg-footer', label: 'Footer Background', cssVar: '--color-bg-footer', hex: '#1a1a2e', description: 'Site-wide footer background color.', scope: ['Footer'] },
];

const BORDER_COLORS: ColorField[] = [
  { key: 'border-light', label: 'Border Light', cssVar: '--color-border-light', hex: '#e7e5e4', description: 'Subtle dividers, card borders, light separators.', scope: ['Cards', 'Sections'] },
  { key: 'border-medium', label: 'Border Medium', cssVar: '--color-border-medium', hex: '#d6d3d1', description: 'Input borders, default strokes, dividers.', scope: ['Forms', 'Cards'] },
  { key: 'border-strong', label: 'Border Strong', cssVar: '--color-border-strong', hex: '#a8a29e', description: 'Active borders, focus rings, emphasis dividers.', scope: ['Forms', 'Cards'] },
];

const STATE_COLORS: ColorField[] = [
  { key: 'state-success', label: 'Success', cssVar: '--color-success', hex: '#088135', description: 'Success badges, positive indicators, confirmations.', scope: ['Badges', 'Cards'] },
  { key: 'state-warning', label: 'Warning', cssVar: '--color-warning', hex: '#f58300', description: 'Warning badges, alerts, caution indicators.', scope: ['Badges', 'Forms'] },
  { key: 'state-error', label: 'Error', cssVar: '--color-error', hex: '#dc2626', description: 'Error messages, validation failures, destructive actions.', scope: ['Forms', 'Buttons'] },
  { key: 'state-info', label: 'Info', cssVar: '--color-info', hex: '#023655', description: 'Info banners, tips, help text backgrounds.', scope: ['Cards', 'Sections'] },
];

const ALL_COLOR_FIELDS = [...CORE_PALETTE, ...TEXT_COLORS, ...BACKGROUND_COLORS, ...BORDER_COLORS, ...STATE_COLORS];

const SCOPE_TAGS = ['Cards', 'Buttons', 'Sections', 'Nav', 'Forms', 'Hero', 'Footer', 'Badges', 'Pages'];

const GOOGLE_FONTS = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Jost', value: 'Jost' },
  { label: 'Prata', value: 'Prata' },
  { label: 'Playfair Display', value: 'Playfair Display' },
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Lora', value: 'Lora' },
  { label: 'Poppins', value: 'Poppins' },
  { label: 'DM Sans', value: 'DM Sans' },
  { label: 'Cormorant Garamond', value: 'Cormorant Garamond' },
  { label: 'Source Serif 4', value: 'Source Serif 4' },
  { label: 'Work Sans', value: 'Work Sans' },
  { label: 'Merriweather', value: 'Merriweather' },
  { label: 'Raleway', value: 'Raleway' },
  { label: 'Outfit', value: 'Outfit' },
];

const FONT_WEIGHTS = [
  { label: 'Light (300)', value: '300' },
  { label: 'Regular (400)', value: '400' },
  { label: 'Medium (500)', value: '500' },
  { label: 'Semi Bold (600)', value: '600' },
  { label: 'Bold (700)', value: '700' },
];

const TEXT_TRANSFORMS = [
  { label: 'None', value: 'none' },
  { label: 'Uppercase', value: 'uppercase' },
  { label: 'Capitalize', value: 'capitalize' },
  { label: 'Lowercase', value: 'lowercase' },
];

const DEFAULT_TYPO_VALUES: Record<string, string> = {
  display_font: 'Prata',
  heading_font: 'Jost',
  body_font: 'Roboto',
  hero_font_size: '48px',
  hero_font_weight: '400',
  hero_line_height: '1.2',
  hero_letter_spacing: '0em',
  body_font_size: '14px',
  body_font_weight: '400',
  body_line_height: '1.6',
  body_letter_spacing: '0em',
  nav_font_size: '14px',
  nav_font_weight: '500',
  nav_letter_spacing: '0.02em',
  nav_text_transform: 'uppercase',
  card_title_font_size: '16px',
  card_title_font_weight: '500',
  breadcrumb_font_size: '12px',
  breadcrumb_font_weight: '400',
  button_font_size: '14px',
  button_font_weight: '500',
  button_letter_spacing: '0.02em',
  button_text_transform: 'uppercase',
  footer_font_size: '14px',
  footer_font_weight: '400',
};

export default function GlobalDesignPage() {
  const [activeRow, setActiveRow] = useState<RowKey>('global');
  const [activeTab, setActiveTab] = useState<TabKey>('colours');
  const [saving, setSaving] = useState(false);
  const [loadingTypo, setLoadingTypo] = useState(true);

  const [colors, setColors] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    ALL_COLOR_FIELDS.forEach((c) => {
      initial[c.key] = c.hex;
    });
    return initial;
  });

  const [typo, setTypo] = useState<Record<string, string>>({ ...DEFAULT_TYPO_VALUES });

  const fetchTypoSettings = useCallback(async () => {
    setLoadingTypo(true);
    const { data } = await supabase.from('typography_settings').select('key, value');
    if (data) {
      const map = { ...DEFAULT_TYPO_VALUES };
      data.forEach((row: { key: string; value: string | null }) => {
        if (row.value) map[row.key] = row.value;
      });
      setTypo(map);
    }
    setLoadingTypo(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'typography') {
      fetchTypoSettings();
    }
  }, [activeTab, fetchTypoSettings]);

  const handleColorChange = (key: string, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const handleTypoChange = (key: string, value: string) => {
    setTypo((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveColours = async () => {
    setSaving(true);
    try {
      const upserts = ALL_COLOR_FIELDS.map((f) =>
        supabase.from('site_settings').upsert({ key: `design_color_${f.key}`, value: colors[f.key] }, { onConflict: 'key' })
      );
      const results = await Promise.all(upserts);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        showToast('Some color settings failed to save', 'error');
      } else {
        showToast('Color palette saved successfully', 'success');
      }
    } catch {
      showToast('Failed to save color settings', 'error');
    }
    setSaving(false);
  };

  const handleSaveTypo = async () => {
    setSaving(true);
    try {
      const upserts = Object.entries(typo).map(([key, value]) =>
        supabase.from('typography_settings').upsert({ key, value }, { onConflict: 'key' })
      );
      const results = await Promise.all(upserts);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        showToast('Some typography settings failed to save', 'error');
      } else {
        showToast('Typography settings saved successfully', 'success');
      }
    } catch {
      showToast('Failed to save typography settings', 'error');
    }
    setSaving(false);
  };

  const activeRowTabs = CATEGORY_ROWS.find((r) => r.key === activeRow)?.tabs || [];
  const contextDesc = CONTEXT_DESCRIPTIONS[activeTab] || '';
  const renderColorField = (field: ColorField) => (
    <div key={field.key} className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-stone-600 uppercase tracking-widest">{field.label}</label>
        <span className="text-[9px] font-mono text-stone-300 bg-[#f5f5f5] px-1.5 py-0.5 rounded">{field.cssVar}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          className="w-10 h-10 border border-stone-200 cursor-pointer p-0.5 rounded shrink-0"
          type="color"
          value={colors[field.key]}
          onChange={(e) => handleColorChange(field.key, e.target.value)}
        />
        <input
          className="flex-1 border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] font-mono rounded-md"
          placeholder={field.hex}
          type="text"
          value={colors[field.key]}
          onChange={(e) => handleColorChange(field.key, e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-stone-400">{field.description}</p>
        <div className="flex gap-1 flex-wrap justify-end">
          {field.scope.map((s) => (
            <span key={s} className="text-[9px] px-1.5 py-0.5 bg-stone-100 text-stone-400 rounded">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderColorSection = (
    icon: string,
    title: string,
    subtitle: string,
    fields: ColorField[],
  ) => (
    <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 flex items-center justify-center">
          <i className={`${icon} text-[#1B4332] text-sm`}></i>
        </span>
        <div>
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3>
          <p className="text-[11px] text-stone-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {fields.map(renderColorField)}
      </div>
    </div>
  );

  const renderTypoSelect = (
    label: string,
    cssVar: string,
    keyName: string,
    options: { label: string; value: string }[],
    description: string,
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-stone-600 uppercase tracking-widest">{label}</label>
        <span className="text-[9px] font-mono text-stone-300 bg-[#f5f5f5] px-1.5 py-0.5 rounded">{cssVar}</span>
      </div>
      <select
        value={typo[keyName]}
        onChange={(e) => handleTypoChange(keyName, e.target.value)}
        className="w-full border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] rounded-md cursor-pointer bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <p className="text-[11px] text-stone-400">{description}</p>
    </div>
  );

  const renderTypoInput = (
    label: string,
    cssVar: string,
    keyName: string,
    placeholder: string,
    description: string,
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-stone-600 uppercase tracking-widest">{label}</label>
        <span className="text-[9px] font-mono text-stone-300 bg-[#f5f5f5] px-1.5 py-0.5 rounded">{cssVar}</span>
      </div>
      <input
        className="w-full border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] font-mono rounded-md"
        placeholder={placeholder}
        type="text"
        value={typo[keyName]}
        onChange={(e) => handleTypoChange(keyName, e.target.value)}
      />
      <p className="text-[11px] text-stone-400">{description}</p>
    </div>
  );

  const renderTypoSection = (
    icon: string,
    title: string,
    subtitle: string,
    children: React.ReactNode,
  ) => (
    <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 flex items-center justify-center">
          <i className={`${icon} text-[#1B4332] text-sm`}></i>
        </span>
        <div>
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3>
          <p className="text-[11px] text-stone-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {children}
      </div>
    </div>
  );

  const renderPlaceholderTab = () => (
    <div className="bg-white rounded-xl border border-stone-100 p-8 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#1B4332]/8 flex items-center justify-center">
        <i className={`${activeRowTabs.find((t) => t.key === activeTab)?.icon || 'ri-settings-3-line'} text-[#1B4332] text-xl`}></i>
      </div>
      <p className="text-sm font-medium text-stone-700 mb-1">
        {activeRowTabs.find((t) => t.key === activeTab)?.label || activeTab} Settings
      </p>
      <p className="text-[11px] text-stone-400 max-w-sm mx-auto">{contextDesc}</p>
    </div>
  );

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'colours': return null; // handled below
      case 'typography': return null; // handled below
      case 'spacing': return <SpacingSettingsTab />;
      case 'buttons': return <ButtonsSettingsTab />;
      case 'image': return <ImageSettingsTab />;
      case 'card-box': return <CardBoxTab />;
      case 'card-content': return <CardContentTab />;
      case 'card-v7': return <CardV7Tab />;
      case 'date': return <DateTab />;
      case 'carousel': return <CarouselTab />;
      case 'page-control': return <PageControlTab />;
      case 'responsive': return <ResponsiveTab />;
      case 'live-preview': return <LivePreviewTab />;
      default: return renderPlaceholderTab();
    }
  };

  const renderPalettePreview = () => (
    <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 flex items-center justify-center">
          <i className="ri-palette-line text-[#1B4332] text-sm"></i>
        </span>
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Palette Preview</h3>
      </div>
      <div className="flex flex-wrap gap-3">
        {ALL_COLOR_FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col items-center gap-1.5">
            <div
              className="w-10 h-10 border border-stone-200 rounded"
              style={{ background: colors[f.key] }}
            ></div>
            <span className="text-[9px] font-mono text-stone-400 text-center max-w-[56px] leading-tight">
              {f.label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-stone-400 flex items-center gap-1.5">
        <i className="ri-information-line"></i>Colors are injected as CSS variables on save and cascade globally — no hardcoded styles.
      </p>
    </div>
  );

  const renderSaveBar = () => (
    <div className="sticky bottom-0 z-10 transition-all duration-300">
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4 mx-1 mb-1">
        <p className="text-xs text-stone-400">
          <span className="font-medium text-stone-600">
            {activeTab === 'colours' ? Object.keys(colors).length : Object.keys(typo).length}
          </span>{' '}
          {activeTab === 'colours' ? 'color tokens configured' : 'typography tokens configured'}
        </p>
        <button
          onClick={() => { activeTab === 'colours' ? handleSaveColours() : handleSaveTypo(); }}
          disabled={saving}
          className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#1B4332]/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <><i className="ri-loader-4-line animate-spin"></i> Saving...</>
          ) : (
            <><i className="ri-save-3-line text-sm"></i>Save Changes</>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <ManagementLayout
      title="Global Design System"
      description="Full frontend control — no hardcoded styles, no inline overrides, no duplicate logic. All settings use CSS variables and cascade globally."
      icon={<i className="ri-palette-line text-[#1B4332] text-lg"></i>}
    >
      <div className="space-y-5 pb-24">
        {/* Badge Row */}
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold text-red-500 bg-red-50">
            <i className="ri-close-circle-line text-xs"></i>No hardcoded styles
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold text-red-500 bg-red-50">
            <i className="ri-close-circle-line text-xs"></i>No inline CSS overrides
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold text-red-500 bg-red-50">
            <i className="ri-close-circle-line text-xs"></i>No duplicate styling logic
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold text-[#1B4332] bg-[#1B4332]/8">
            <i className="ri-checkbox-circle-line text-xs"></i>CSS variables
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold text-[#1B4332] bg-[#1B4332]/8">
            <i className="ri-checkbox-circle-line text-xs"></i>CMS-driven settings
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold text-[#1B4332] bg-[#1B4332]/8">
            <i className="ri-checkbox-circle-line text-xs"></i>Reusable components
          </span>
        </div>

        {/* Category Navigation */}
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="overflow-x-auto">
            {CATEGORY_ROWS.map((row) => (
              <div key={row.key} className="flex items-center border-b border-stone-100 last:border-0">
                <div className="px-3 py-2 shrink-0 w-[110px] border-r border-stone-100 bg-[#f5f5f5]">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">{row.label}</p>
                </div>
                <div className="flex overflow-x-auto">
                  {row.tabs.map((tab) => {
                    const isActive = activeRow === row.key && activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => { setActiveRow(row.key); setActiveTab(tab.key); }}
                        className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 shrink-0 ${
                          isActive
                            ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4'
                            : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'
                        }`}
                      >
                        <span className="w-4 h-4 flex items-center justify-center shrink-0">
                          <i className={`${tab.icon} text-sm`}></i>
                        </span>
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-[#f5f5f5] border-t border-stone-100 flex items-center gap-2">
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              <i className={`${activeRowTabs.find((t) => t.key === activeTab)?.icon || 'ri-drop-fill'} text-[#1B4332] text-sm`}></i>
            </span>
            <p className="text-xs text-stone-500 flex-1">{contextDesc}</p>
          </div>
        </div>

        {/* Colours Tab */}
        {activeTab === 'colours' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-stone-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-information-line text-[#1B4332] text-sm"></i>
                </span>
                <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Global Color System</h3>
              </div>
              <p className="text-xs text-stone-500 mb-4">
                These colors are injected as CSS variables and cascade across{' '}
                <strong>Cards</strong>, <strong>Buttons</strong>, <strong>Sections</strong>,{' '}
                <strong>Navigation</strong> and all pages — homepage, listing pages, property pages,
                neighbourhood pages and guide pages.
              </p>
              <div className="flex flex-wrap gap-2">
                {SCOPE_TAGS.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 bg-[#1B4332]/8 text-[#1B4332] text-[10px] font-semibold rounded-full uppercase tracking-wide">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {renderColorSection('ri-drop-fill', 'Core Palette', 'Primary brand colors used across cards, buttons, sections and navigation.', CORE_PALETTE)}
            {renderColorSection('ri-font-color', 'Text Colors', 'Controls all text rendering across the site.', TEXT_COLORS)}
            {renderColorSection('ri-layout-fill', 'Background Colors', 'Page and section background colors.', BACKGROUND_COLORS)}
            {renderColorSection('ri-checkbox-multiple-blank-line', 'Border Colors', 'Border, divider and stroke colors used throughout the interface.', BORDER_COLORS)}
            {renderColorSection('ri-error-warning-line', 'State Colors', 'Feedback colors for success, warning, error and info states across badges, forms and alerts.', STATE_COLORS)}
            {renderPalettePreview()}
            {renderSaveBar()}
          </div>
        )}

        {/* Typography Tab */}
        {activeTab === 'typography' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-stone-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-information-line text-[#1B4332] text-sm"></i>
                </span>
                <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Global Typography System</h3>
              </div>
              <p className="text-xs text-stone-500 mb-4">
                These typography tokens are injected as CSS variables and cascade across{' '}
                <strong>Hero</strong>, <strong>Body Text</strong>, <strong>Navigation</strong>,{' '}
                <strong>Cards</strong>, <strong>Buttons</strong> and all pages — homepage, listing pages,
                property pages, neighbourhood pages and guide pages.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Display', 'Heading', 'Body', 'Hero', 'Nav', 'Cards', 'Buttons', 'Breadcrumbs', 'Footer'].map((tag) => (
                  <span key={tag} className="px-2.5 py-1 bg-[#1B4332]/8 text-[#1B4332] text-[10px] font-semibold rounded-full uppercase tracking-wide">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {loadingTypo ? (
              <div className="bg-white rounded-xl border border-stone-100 p-10 text-center">
                <i className="ri-loader-4-line animate-spin text-stone-300 text-2xl"></i>
                <p className="text-xs text-stone-400 mt-2">Loading typography settings...</p>
              </div>
            ) : (
              <>
                {renderTypoSection('ri-font-family', 'Font Families', 'Core font stack — Display, Heading and Body fonts applied globally.',
                  <>
                    {renderTypoSelect('Display Font', '--font-display', 'display_font', GOOGLE_FONTS, 'Hero titles, large display headings, featured text.')}
                    {renderTypoSelect('Heading Font', '--font-heading', 'heading_font', GOOGLE_FONTS, 'Section headings, card titles, H1–H6 elements.')}
                    {renderTypoSelect('Body Font', '--font-body', 'body_font', GOOGLE_FONTS, 'Paragraphs, descriptions, form labels, general body text.')}
                  </>
                )}

                {renderTypoSection('ri-shining-line', 'Hero Typography', 'Controls the main hero heading appearance across all pages.',
                  <>
                    {renderTypoInput('Font Size', '--hero-font-size', 'hero_font_size', '48px', 'Hero heading size. Use px, rem or em units.')}
                    {renderTypoSelect('Font Weight', '--hero-font-weight', 'hero_font_weight', FONT_WEIGHTS, 'Weight of hero heading text.')}
                    {renderTypoInput('Line Height', '--hero-line-height', 'hero_line_height', '1.2', 'Line height multiplier for hero headings.')}
                    {renderTypoInput('Letter Spacing', '--hero-letter-spacing', 'hero_letter_spacing', '0em', 'Letter spacing for hero headings. Use 0em, 0.02em, etc.')}
                  </>
                )}

                {renderTypoSection('ri-text', 'Body Typography', 'Default body text settings applied to paragraphs and general content.',
                  <>
                    {renderTypoInput('Font Size', '--body-font-size', 'body_font_size', '14px', 'Base body text size. Use px, rem or em units.')}
                    {renderTypoSelect('Font Weight', '--body-font-weight', 'body_font_weight', FONT_WEIGHTS, 'Weight of body/paragraph text.')}
                    {renderTypoInput('Line Height', '--body-line-height', 'body_line_height', '1.6', 'Line height multiplier for body text.')}
                    {renderTypoInput('Letter Spacing', '--body-letter-spacing', 'body_letter_spacing', '0em', 'Letter spacing for body text.')}
                  </>
                )}

                {renderTypoSection('ri-menu-line', 'Navigation Typography', 'Top navigation and menu text appearance.',
                  <>
                    {renderTypoInput('Font Size', '--nav-font-size', 'nav_font_size', '14px', 'Navigation link text size.')}
                    {renderTypoSelect('Font Weight', '--nav-font-weight', 'nav_font_weight', FONT_WEIGHTS, 'Weight of navigation links.')}
                    {renderTypoInput('Letter Spacing', '--nav-letter-spacing', 'nav_letter_spacing', '0.02em', 'Letter spacing for nav links.')}
                    {renderTypoSelect('Text Transform', '--nav-text-transform', 'nav_text_transform', TEXT_TRANSFORMS, 'Case transformation for navigation links.')}
                  </>
                )}

                {renderTypoSection('ri-price-tag-3-line', 'Card Title Typography', 'Property card and content card title styling.',
                  <>
                    {renderTypoInput('Font Size', '--card-title-font-size', 'card_title_font_size', '16px', 'Card title text size.')}
                    {renderTypoSelect('Font Weight', '--card-title-font-weight', 'card_title_font_weight', FONT_WEIGHTS, 'Weight of card titles.')}
                  </>
                )}

                {renderTypoSection('ri-arrow-right-s-line', 'Breadcrumb Typography', 'Breadcrumb navigation text styling.',
                  <>
                    {renderTypoInput('Font Size', '--breadcrumb-font-size', 'breadcrumb_font_size', '12px', 'Breadcrumb text size.')}
                    {renderTypoSelect('Font Weight', '--breadcrumb-font-weight', 'breadcrumb_font_weight', FONT_WEIGHTS, 'Weight of breadcrumb text.')}
                  </>
                )}

                {renderTypoSection('ri-cursor-line', 'Button Typography', 'Button label text appearance across all buttons.',
                  <>
                    {renderTypoInput('Font Size', '--button-font-size', 'button_font_size', '14px', 'Button label text size.')}
                    {renderTypoSelect('Font Weight', '--button-font-weight', 'button_font_weight', FONT_WEIGHTS, 'Weight of button labels.')}
                    {renderTypoInput('Letter Spacing', '--button-letter-spacing', 'button_letter_spacing', '0.02em', 'Letter spacing for button labels.')}
                    {renderTypoSelect('Text Transform', '--button-text-transform', 'button_text_transform', TEXT_TRANSFORMS, 'Case transformation for button labels.')}
                  </>
                )}

                {renderTypoSection('ri-layout-bottom-line', 'Footer Typography', 'Site-wide footer text styling.',
                  <>
                    {renderTypoInput('Font Size', '--footer-font-size', 'footer_font_size', '14px', 'Footer text size.')}
                    {renderTypoSelect('Font Weight', '--footer-font-weight', 'footer_font_weight', FONT_WEIGHTS, 'Weight of footer text.')}
                  </>
                )}
              </>
            )}

            {renderPalettePreview()}
            {renderSaveBar()}
          </div>
        )}

        {activeTab !== 'colours' && activeTab !== 'typography' && renderActiveTabContent()}
      </div>
    </ManagementLayout>
  );
}