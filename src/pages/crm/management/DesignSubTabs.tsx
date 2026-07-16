import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';

/* ================================================================== */
/*  Shared Helpers                                                      */
/* ================================================================== */

function TabLoading() {
  return (
    <div className="bg-white rounded-xl border border-stone-100 p-10 text-center">
      <i className="ri-loader-4-line animate-spin text-stone-300 text-2xl"></i>
      <p className="text-xs text-stone-400 mt-2">Loading settings...</p>
    </div>
  );
}

function TabInfoBanner({ icon, title, description, tags }: { icon: string; title: string; description: string; tags: string[] }) {
  return (
    <div className="bg-white rounded-xl border border-stone-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-5 h-5 flex items-center justify-center">
          <i className={`${icon} text-[#1B4332] text-sm`}></i>
        </span>
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">{title}</h3>
      </div>
      <p className="text-xs text-stone-500 mb-4">{description}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t} className="px-2.5 py-1 bg-[#1B4332]/8 text-[#1B4332] text-[10px] font-semibold rounded-full uppercase tracking-wide">{t}</span>
        ))}
      </div>
    </div>
  );
}

function SaveBar({ count, saving, onSave }: { count: number; saving: boolean; onSave: () => void }) {
  return (
    <div className="sticky bottom-0 z-10">
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-between gap-4 mx-1 mb-1">
        <p className="text-xs text-stone-400">
          <span className="font-medium text-stone-600">{count}</span> tokens configured
        </p>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#1B4332]/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-save-3-line text-sm"></i>Save Changes</>}
        </button>
      </div>
    </div>
  );
}

function FieldLabel({ label, cssVar }: { label: string; cssVar: string }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium text-stone-600 uppercase tracking-widest">{label}</label>
      <span className="text-[9px] font-mono text-stone-300 bg-[#f5f5f5] px-1.5 py-0.5 rounded">{cssVar}</span>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      className="w-full border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] font-mono rounded-md bg-white"
      placeholder={placeholder}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input className="w-10 h-10 border border-stone-200 cursor-pointer p-0.5 rounded shrink-0" type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <input className="flex-1 border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] font-mono rounded-md uppercase" type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] rounded-md cursor-pointer bg-white"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${value ? 'bg-[#1B4332]' : 'bg-stone-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}></span>
    </button>
  );
}

function FieldRow({ label, cssVar, description, children }: { label: string; cssVar: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <FieldLabel label={label} cssVar={cssVar} />
      {children}
      <p className="text-[11px] text-stone-400">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Image Settings                                                     */
/* ------------------------------------------------------------------ */

interface ImageSettings {
  border_radius: string;
  object_fit: string;
  card_height: string;
  focal_point: string;
  hover_effect: string;
  overlay_opacity: string;
  lazy_loading: string;
}

const IMAGE_DEFAULTS: ImageSettings = {
  border_radius: '8px',
  object_fit: 'cover',
  card_height: '280px',
  focal_point: 'center',
  hover_effect: 'scale',
  overlay_opacity: '0',
  lazy_loading: 'true',
};

const IMAGE_FIELD_META: { key: keyof ImageSettings; label: string; cssVar: string; description: string }[] = [
  { key: 'border_radius', label: 'Border Radius', cssVar: '--img-border-radius', description: 'Rounded corners on all images — cards, galleries, thumbnails.' },
  { key: 'object_fit', label: 'Object Fit', cssVar: '--img-object-fit', description: 'How images fill their container — cover crops, contain shows full image.' },
  { key: 'card_height', label: 'Card Image Height', cssVar: '--img-card-height', description: 'Default height of property card images across listing grids.' },
  { key: 'focal_point', label: 'Focal Point', cssVar: '--img-focal-point', description: 'Which part of the image stays visible when cropping (cover mode).' },
  { key: 'hover_effect', label: 'Hover Effect', cssVar: '--img-hover-effect', description: 'Effect applied when hovering over card images — scale, brightness, none.' },
  { key: 'overlay_opacity', label: 'Overlay Opacity', cssVar: '--img-overlay-opacity', description: 'Dark overlay intensity for images with text overlays (0–1).' },
  { key: 'lazy_loading', label: 'Lazy Loading', cssVar: '--img-lazy-loading', description: 'Defer loading off-screen images for better page speed.' },
];

const OBJECT_FIT_OPTIONS = [
  { label: 'Cover (crop to fill)', value: 'cover' },
  { label: 'Contain (show full image)', value: 'contain' },
  { label: 'Fill (stretch)', value: 'fill' },
  { label: 'None (natural size)', value: 'none' },
];

const FOCAL_POINT_OPTIONS = [
  { label: 'Center', value: 'center' },
  { label: 'Top', value: 'top' },
  { label: 'Top Right', value: 'top right' },
  { label: 'Right', value: 'right' },
  { label: 'Bottom Right', value: 'bottom right' },
  { label: 'Bottom', value: 'bottom' },
  { label: 'Bottom Left', value: 'bottom left' },
  { label: 'Left', value: 'left' },
  { label: 'Top Left', value: 'top left' },
];

const HOVER_EFFECT_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Slight Zoom (1.05x)', value: 'scale-sm' },
  { label: 'Zoom (1.1x)', value: 'scale' },
  { label: 'Brightness boost', value: 'brightness' },
  { label: 'Zoom + Brightness', value: 'scale-brightness' },
];

export function ImageSettingsTab() {
  const [settings, setSettings] = useState<ImageSettings>({ ...IMAGE_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'design_image_%');
    if (data) {
      const map = { ...IMAGE_DEFAULTS };
      data.forEach((row: { key: string; value: string | null }) => {
        const shortKey = row.key.replace('design_image_', '') as keyof ImageSettings;
        if (row.value && shortKey in map) (map as Record<string, string>)[shortKey] = row.value;
      });
      setSettings(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateField = (key: keyof ImageSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const upserts = IMAGE_FIELD_META.map((f) =>
      supabase.from('site_settings').upsert({ key: `design_image_${f.key}`, value: settings[f.key] }, { onConflict: 'key' })
    );
    const results = await Promise.all(upserts);
    const errors = results.filter((r) => r.error);
    showToast(errors.length ? 'Some image settings failed to save' : 'Image settings saved successfully', errors.length ? 'error' : 'success');
    setSaving(false);
  };

  if (loading) return <TabLoading />;

  return (
    <div className="space-y-6">
      <TabInfoBanner icon="ri-image-2-line" title="Global Image Settings" description="These image tokens cascade across Property Cards, Gallery Images, Hero Backgrounds, Thumbnails and all pages — homepage, listing pages, property detail pages and neighbourhood pages." tags={['Cards', 'Galleries', 'Hero', 'Thumbnails', 'Listings', 'Detail Pages']} />

      <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 flex items-center justify-center">
            <i className="ri-image-2-line text-[#1B4332] text-sm"></i>
          </span>
          <div>
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Image Display</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">Border radius, fit mode, card height and focal point.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <FieldLabel label="Border Radius" cssVar="--img-border-radius" />
            <input className="w-full border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] font-mono rounded-md" placeholder="8px" type="text" value={settings.border_radius} onChange={(e) => updateField('border_radius', e.target.value)} />
            <p className="text-[11px] text-stone-400">Rounded corners on all images — cards, galleries, thumbnails.</p>
          </div>
          <div className="space-y-2">
            <FieldLabel label="Object Fit" cssVar="--img-object-fit" />
            <SelectField value={settings.object_fit} onChange={(v) => updateField('object_fit', v)} options={OBJECT_FIT_OPTIONS} />
            <p className="text-[11px] text-stone-400">How images fill their container — cover crops, contain shows full image.</p>
          </div>
          <div className="space-y-2">
            <FieldLabel label="Card Image Height" cssVar="--img-card-height" />
            <input className="w-full border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] font-mono rounded-md" placeholder="280px" type="text" value={settings.card_height} onChange={(e) => updateField('card_height', e.target.value)} />
            <p className="text-[11px] text-stone-400">Default height of property card images across listing grids.</p>
          </div>
          <div className="space-y-2">
            <FieldLabel label="Focal Point" cssVar="--img-focal-point" />
            <SelectField value={settings.focal_point} onChange={(v) => updateField('focal_point', v)} options={FOCAL_POINT_OPTIONS} />
            <p className="text-[11px] text-stone-400">Which part of the image stays visible when cropping (cover mode).</p>
          </div>
          <div className="space-y-2">
            <FieldLabel label="Hover Effect" cssVar="--img-hover-effect" />
            <SelectField value={settings.hover_effect} onChange={(v) => updateField('hover_effect', v)} options={HOVER_EFFECT_OPTIONS} />
            <p className="text-[11px] text-stone-400">Effect applied when hovering over card images — scale, brightness, none.</p>
          </div>
          <div className="space-y-2">
            <FieldLabel label="Overlay Opacity" cssVar="--img-overlay-opacity" />
            <input className="w-full border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] font-mono rounded-md" placeholder="0" type="text" value={settings.overlay_opacity} onChange={(e) => updateField('overlay_opacity', e.target.value)} />
            <p className="text-[11px] text-stone-400">Dark overlay intensity for images with text overlays (0–1).</p>
          </div>
        </div>
      </div>

      <SaveBar count={IMAGE_FIELD_META.length} saving={saving} onSave={handleSave} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Spacing Settings                                                   */
/* ------------------------------------------------------------------ */

interface SpacingSettings {
  container_width: string;
  section_padding_y: string;
  section_padding_x: string;
  grid_gap: string;
  card_gap: string;
  element_spacing: string;
  content_max_width: string;
}

const SPACING_DEFAULTS: SpacingSettings = {
  container_width: '1280px',
  section_padding_y: '80px',
  section_padding_x: '24px',
  grid_gap: '24px',
  card_gap: '20px',
  element_spacing: '16px',
  content_max_width: '960px',
};

const SPACING_FIELDS: { key: keyof SpacingSettings; label: string; cssVar: string; desc: string }[] = [
  { key: 'container_width', label: 'Container Width', cssVar: '--spacing-container', desc: 'Max width of the main content container across all pages.' },
  { key: 'section_padding_y', label: 'Section Padding (Y)', cssVar: '--spacing-section-y', desc: 'Vertical padding above and below each page section.' },
  { key: 'section_padding_x', label: 'Section Padding (X)', cssVar: '--spacing-section-x', desc: 'Horizontal padding inside each page section container.' },
  { key: 'grid_gap', label: 'Grid Gap', cssVar: '--spacing-grid-gap', desc: 'Gap between grid items — property cards, feature grids, etc.' },
  { key: 'card_gap', label: 'Card Gap', cssVar: '--spacing-card-gap', desc: 'Internal gap between elements inside cards.' },
  { key: 'element_spacing', label: 'Element Spacing', cssVar: '--spacing-element', desc: 'Default spacing between adjacent elements (headings, paragraphs).' },
  { key: 'content_max_width', label: 'Content Max Width', cssVar: '--spacing-content-max', desc: 'Max width for text-heavy content areas (blog, description).' },
];

export function SpacingSettingsTab() {
  const [settings, setSettings] = useState<SpacingSettings>({ ...SPACING_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'design_spacing_%');
    if (data) {
      const map = { ...SPACING_DEFAULTS };
      data.forEach((row: { key: string; value: string | null }) => {
        const sk = row.key.replace('design_spacing_', '') as keyof SpacingSettings;
        if (row.value && sk in map) (map as Record<string, string>)[sk] = row.value;
      });
      setSettings(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async () => {
    setSaving(true);
    const upserts = SPACING_FIELDS.map((f) =>
      supabase.from('site_settings').upsert({ key: `design_spacing_${f.key}`, value: settings[f.key] }, { onConflict: 'key' })
    );
    await Promise.all(upserts);
    showToast('Spacing settings saved', 'success');
    setSaving(false);
  };

  if (loading) return <TabLoading />;

  return (
    <div className="space-y-6">
      <TabInfoBanner icon="ri-layout-4-line" title="Global Spacing System" description="Container widths, section padding, grid gaps, and element spacing tokens applied globally." tags={['Container', 'Sections', 'Grid', 'Cards', 'Elements']} />
      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 flex items-center justify-center"><i className="ri-layout-4-line text-[#1B4332] text-sm"></i></span>
          <div>
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Spacing Tokens</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">Define the core spacing scale used throughout the site.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
          {SPACING_FIELDS.map((f) => (
            <div key={f.key} className="space-y-2">
              <FieldLabel label={f.label} cssVar={f.cssVar} />
              <input className="w-full border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] font-mono rounded-md" type="text" value={settings[f.key]} onChange={(e) => setSettings((p) => ({ ...p, [f.key]: e.target.value }))} />
              <p className="text-[11px] text-stone-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <SaveBar count={SPACING_FIELDS.length} saving={saving} onSave={handleSave} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Buttons Settings                                                   */
/* ------------------------------------------------------------------ */

interface ButtonSettings {
  border_radius: string;
  padding_x: string;
  padding_y: string;
  font_size: string;
  font_weight: string;
  text_transform: string;
  primary_bg: string;
  primary_text: string;
  hover_brightness: string;
}

const BUTTON_DEFAULTS: ButtonSettings = {
  border_radius: '8px',
  padding_x: '24px',
  padding_y: '12px',
  font_size: '14px',
  font_weight: '500',
  text_transform: 'none',
  primary_bg: '#1B4332',
  primary_text: '#ffffff',
  hover_brightness: '0.9',
};

const BUTTON_FIELDS: { key: keyof ButtonSettings; label: string; cssVar: string; desc: string; type?: string }[] = [
  { key: 'border_radius', label: 'Border Radius', cssVar: '--btn-border-radius', desc: 'Rounding on all buttons — primary, secondary, ghost.' },
  { key: 'padding_x', label: 'Padding X', cssVar: '--btn-padding-x', desc: 'Horizontal padding inside buttons.' },
  { key: 'padding_y', label: 'Padding Y', cssVar: '--btn-padding-y', desc: 'Vertical padding inside buttons.' },
  { key: 'font_size', label: 'Font Size', cssVar: '--btn-font-size', desc: 'Button label text size.' },
  { key: 'font_weight', label: 'Font Weight', cssVar: '--btn-font-weight', desc: 'Weight of button label text.' },
  { key: 'text_transform', label: 'Text Transform', cssVar: '--btn-text-transform', desc: 'Case transformation for button labels.' },
  { key: 'primary_bg', label: 'Primary BG', cssVar: '--btn-primary-bg', desc: 'Background color for primary buttons.', type: 'color' },
  { key: 'primary_text', label: 'Primary Text', cssVar: '--btn-primary-text', desc: 'Text color for primary buttons.', type: 'color' },
  { key: 'hover_brightness', label: 'Hover Brightness', cssVar: '--btn-hover-brightness', desc: 'Brightness multiplier on hover (0–1 darkens, >1 brightens).' },
];

const BUTTON_TEXT_TRANSFORMS = [
  { label: 'None', value: 'none' },
  { label: 'Uppercase', value: 'uppercase' },
  { label: 'Capitalize', value: 'capitalize' },
  { label: 'Lowercase', value: 'lowercase' },
];

export function ButtonsSettingsTab() {
  const [settings, setSettings] = useState<ButtonSettings>({ ...BUTTON_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'design_button_%');
    if (data) {
      const map = { ...BUTTON_DEFAULTS };
      data.forEach((row: { key: string; value: string | null }) => {
        const sk = row.key.replace('design_button_', '') as keyof ButtonSettings;
        if (row.value && sk in map) (map as Record<string, string>)[sk] = row.value;
      });
      setSettings(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async () => {
    setSaving(true);
    const upserts = BUTTON_FIELDS.map((f) =>
      supabase.from('site_settings').upsert({ key: `design_button_${f.key}`, value: settings[f.key] }, { onConflict: 'key' })
    );
    await Promise.all(upserts);
    showToast('Button settings saved', 'success');
    setSaving(false);
  };

  if (loading) return <TabLoading />;

  return (
    <div className="space-y-6">
      <TabInfoBanner icon="ri-cursor-line" title="Global Button System" description="Button styles, border radius, hover effects and state colours applied globally." tags={['Primary', 'Secondary', 'Ghost', 'Outline', 'CTA']} />
      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 flex items-center justify-center"><i className="ri-cursor-line text-[#1B4332] text-sm"></i></span>
          <div>
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Button Tokens</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">Core button styling applied to all button variants.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
          {BUTTON_FIELDS.map((f) => (
            <div key={f.key} className="space-y-2">
              <FieldLabel label={f.label} cssVar={f.cssVar} />
              {f.key === 'text_transform' ? (
                <SelectField value={settings.text_transform} onChange={(v) => setSettings((p) => ({ ...p, text_transform: v }))} options={BUTTON_TEXT_TRANSFORMS} />
              ) : f.type === 'color' ? (
                <ColorInput value={settings[f.key]} onChange={(v) => setSettings((p) => ({ ...p, [f.key]: v }))} />
              ) : (
                <input className="w-full border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] font-mono rounded-md" type="text" value={settings[f.key]} onChange={(e) => setSettings((p) => ({ ...p, [f.key]: e.target.value }))} />
              )}
              <p className="text-[11px] text-stone-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <SaveBar count={BUTTON_FIELDS.length} saving={saving} onSave={handleSave} />
    </div>
  );
}

/* ================================================================== */
/*  Card Box Tab — site_settings (design_cardbox_)                       */
/* ================================================================== */

const CARD_BOX_STRUCTURE_DEFAULTS: Record<string, string> = {
  card_padding_y: '16',
  card_padding_x: '20',
  border_radius: '0',
  layout_spacing: '25',
  separator_style: 'hairline',
  separator_color: '#d6d6d6',
};

type ColorMode = 'normal' | 'hover';

interface ColorFieldDef {
  key: string;
  label: string;
}

const CARD_BOX_COLOR_FIELDS: ColorFieldDef[] = [
  { key: 'title_color', label: 'Title Color' },
  { key: 'address_color', label: 'Address Color' },
  { key: 'price_color', label: 'Price Color' },
  { key: 'icons_color', label: 'Icons Color' },
  { key: 'figure_color', label: 'Figure Color' },
  { key: 'labels_color', label: 'Labels Color' },
  { key: 'card_background', label: 'Card Background' },
  { key: 'item_tools_background', label: 'Item Tools Background' },
  { key: 'item_tools_icon_color', label: 'Item Tools Icon Color' },
];

const CARD_BOX_COLOR_DEFAULTS: Record<string, string> = {
  normal_title_color: '#011328',
  normal_address_color: '#636363',
  normal_price_color: '#002349',
  normal_icons_color: '#636363',
  normal_figure_color: '#363535',
  normal_labels_color: '#1f1f1f',
  normal_card_background: '#ffffff',
  normal_item_tools_background: 'rgba(0,0,0,0.08)',
  normal_item_tools_icon_color: '#4f4f4f',
  hover_title_color: '#011328',
  hover_address_color: '#636363',
  hover_price_color: '#002349',
  hover_icons_color: '#636363',
  hover_figure_color: '#363535',
  hover_labels_color: '#1f1f1f',
  hover_card_background: '#ffffff',
  hover_item_tools_background: 'rgba(0,0,0,0.12)',
  hover_item_tools_icon_color: '#4f4f4f',
};

const SEPARATOR_STYLE_OPTIONS = [
  { label: 'Hairline (1px solid)', value: 'hairline' },
  { label: 'None', value: 'none' },
];

export function CardBoxTab() {
  const [structureSettings, setStructureSettings] = useState<Record<string, string>>({ ...CARD_BOX_STRUCTURE_DEFAULTS });
  const [colorSettings, setColorSettings] = useState<Record<string, string>>({ ...CARD_BOX_COLOR_DEFAULTS });
  const [colorMode, setColorMode] = useState<ColorMode>('normal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'design_cardbox_%');
    if (data) {
      const structMap = { ...CARD_BOX_STRUCTURE_DEFAULTS };
      const colorMap = { ...CARD_BOX_COLOR_DEFAULTS };
      data.forEach((row: { key: string; value: string | null }) => {
        const sk = row.key.replace('design_cardbox_', '');
        if (row.value) {
          if (sk in structMap) structMap[sk] = row.value;
          if (sk in colorMap) colorMap[sk] = row.value;
        }
      });
      setStructureSettings(structMap);
      setColorSettings(colorMap);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    const allStructure = Object.entries(structureSettings).map(([k, v]) =>
      supabase.from('site_settings').upsert({ key: `design_cardbox_${k}`, value: v }, { onConflict: 'key' })
    );
    const allColors = Object.entries(colorSettings).map(([k, v]) =>
      supabase.from('site_settings').upsert({ key: `design_cardbox_${k}`, value: v }, { onConflict: 'key' })
    );
    const results = await Promise.all([...allStructure, ...allColors]);
    const errors = results.filter((r) => r.error);
    showToast(errors.length ? 'Some card box settings failed to save' : 'Card box settings saved', errors.length ? 'error' : 'success');
    setSaving(false);
  };

  if (loading) return <TabLoading />;

  const structUpdate = (key: string, value: string) => setStructureSettings((p) => ({ ...p, [key]: value }));
  const colorUpdate = (colorKey: string, value: string) =>
    setColorSettings((p) => ({ ...p, [`${colorMode}_${colorKey}`]: value }));

  const activeColors = CARD_BOX_COLOR_FIELDS.map((f) => ({
    ...f,
    value: colorSettings[`${colorMode}_${f.key}`] || '',
  }));

  const totalTokenCount = Object.keys(structureSettings).length + Object.keys(colorSettings).length;

  return (
    <div className="space-y-6">
      {/* A. Structure */}
      <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 flex items-center justify-center">
            <i className="ri-layout-grid-2-line text-[#1B4332] text-sm"></i>
          </span>
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">A. Structure</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Card Padding Y */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700 block">Card Padding (Top/Bottom)</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white flex-1"
                type="number"
                min={0}
                max={48}
                value={structureSettings.card_padding_y}
                onChange={(e) => structUpdate('card_padding_y', e.target.value)}
              />
              <span className="text-sm text-stone-500 shrink-0">px</span>
            </div>
          </div>

          {/* Card Padding X */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700 block">Card Padding (Left/Right)</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white flex-1"
                type="number"
                min={0}
                max={48}
                value={structureSettings.card_padding_x}
                onChange={(e) => structUpdate('card_padding_x', e.target.value)}
              />
              <span className="text-sm text-stone-500 shrink-0">px</span>
            </div>
          </div>

          {/* Card Border Radius */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700 block">Card Border Radius</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white flex-1"
                type="number"
                min={0}
                max={24}
                value={structureSettings.border_radius}
                onChange={(e) => structUpdate('border_radius', e.target.value)}
              />
              <span className="text-sm text-stone-500 shrink-0">px</span>
            </div>
          </div>

          {/* Layout Spacing */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700 block">Layout Spacing (between rows)</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white flex-1"
                type="number"
                min={0}
                max={32}
                value={structureSettings.layout_spacing}
                onChange={(e) => structUpdate('layout_spacing', e.target.value)}
              />
              <span className="text-sm text-stone-500 shrink-0">px</span>
            </div>
          </div>

          {/* Separator Style */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700 block">Separator Style</label>
            <SelectField
              value={structureSettings.separator_style}
              onChange={(v) => structUpdate('separator_style', v)}
              options={SEPARATOR_STYLE_OPTIONS}
            />
            <p className="text-xs text-stone-400">Only hairline separators are allowed — no thick borders.</p>
          </div>

          {/* Separator Color */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700 block">Separator Color</label>
            <ColorInput
              value={structureSettings.separator_color}
              onChange={(v) => structUpdate('separator_color', v)}
            />
          </div>
        </div>
      </div>

      {/* B. Colors */}
      <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-drop-fill text-[#1B4332] text-sm"></i>
            </span>
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">B. Colors</h3>
          </div>
          <div className="flex items-center gap-1 bg-stone-100 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setColorMode('normal')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${colorMode === 'normal' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setColorMode('hover')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${colorMode === 'hover' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Hover
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {activeColors.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700 block">{f.label}</label>
              <ColorInput
                value={f.value}
                onChange={(v) => colorUpdate(f.key, v)}
              />
            </div>
          ))}
        </div>

        <div className="mt-2 pt-3 border-t border-stone-100">
          <p className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <i className="ri-information-line"></i>No shadows. No colored borders. Clean minimal only — by design.
          </p>
        </div>
      </div>

      {/* Live Card Preview */}
      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-4">Live Card Preview</h3>
        <div className="max-w-[240px] overflow-hidden"
          style={{
            borderRadius: `${structureSettings.border_radius}px`,
            border: structureSettings.separator_style === 'none' ? 'none' : `1px solid ${structureSettings.separator_color}`,
            background: colorSettings.normal_card_background,
          }}
        >
          <div className="w-full h-36 bg-stone-100 overflow-hidden">
            <img
              alt="preview"
              className="w-full h-full object-cover object-top"
              src="https://readdy.ai/api/search-image?query=modern%20luxury%20apartment%20interior%20living%20room%20elegant%20minimal%20design%20bright%20natural%20light%20Kampala%20Uganda&width=480&height=288&seq=card-box-preview-2&orientation=landscape"
            />
          </div>
          <div style={{ padding: `${structureSettings.card_padding_y}px ${structureSettings.card_padding_x}px` }}>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: colorSettings.normal_labels_color }}>For Sale · Featured</p>
            <h3 className="text-sm font-semibold leading-snug mb-1" style={{ color: colorSettings.normal_title_color, marginBottom: '10px' }}>Luxury 3-Bed Apartment</h3>
            <p className="text-xs mb-2" style={{ color: colorSettings.normal_address_color, marginBottom: '8px' }}>Kololo, Kampala</p>
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-1 text-xs" style={{ color: colorSettings.normal_figure_color }}>
                <i className="ri-hotel-bed-line" style={{ color: colorSettings.normal_icons_color }}></i> 3 beds
              </span>
              <span className="flex items-center gap-1 text-xs" style={{ color: colorSettings.normal_figure_color }}>
                <i className="ri-showers-line" style={{ color: colorSettings.normal_icons_color }}></i> 2 baths
              </span>
            </div>
            <div className="flex items-center justify-between pt-2" style={{ borderTop: structureSettings.separator_style === 'none' ? 'none' : `1px solid ${structureSettings.separator_color}` }}>
              <span className="font-bold text-sm" style={{ color: colorSettings.normal_price_color }}>$450,000</span>
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 flex items-center justify-center rounded cursor-pointer" style={{ background: colorSettings.normal_item_tools_background }}>
                  <i className="ri-heart-line text-xs" style={{ color: colorSettings.normal_item_tools_icon_color }}></i>
                </span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-stone-400 mt-3 text-center">
          Live preview — reflects current structure and {colorMode} colour settings in real time.
        </p>
      </div>

      <SaveBar count={totalTokenCount} saving={saving} onSave={handleSave} />
    </div>
  );
}

/* ================================================================== */
/*  Card Content Tab — site_settings (design_cardcontent_)              */
/* ================================================================== */

interface CardFieldDef {
  key: string;
  label: string;
  icon: string;
  defaultVisible: boolean;
}

const CARD_FIELD_DEFS: CardFieldDef[] = [
  { key: 'status', label: 'Status (For Sale / For Rent)', icon: 'ri-price-tag-3-line', defaultVisible: true },
  { key: 'featured', label: 'Featured Label', icon: 'ri-star-line', defaultVisible: true },
  { key: 'address', label: 'Address / Location', icon: 'ri-map-pin-line', defaultVisible: true },
  { key: 'title', label: 'Property Title', icon: 'ri-heading', defaultVisible: true },
  { key: 'meta', label: 'Meta (Beds, Baths, Parking)', icon: 'ri-hotel-bed-line', defaultVisible: true },
  { key: 'property_type', label: 'Property Type', icon: 'ri-building-2-line', defaultVisible: true },
  { key: 'area', label: 'Area / Size', icon: 'ri-ruler-line', defaultVisible: false },
  { key: 'price', label: 'Price', icon: 'ri-money-dollar-circle-line', defaultVisible: true },
  { key: 'sub_price', label: 'Sub Price (PCM etc.)', icon: 'ri-coins-line', defaultVisible: true },
  { key: 'date', label: 'Listed Date', icon: 'ri-time-line', defaultVisible: true },
  { key: 'agent_name', label: 'Agent Name', icon: 'ri-user-line', defaultVisible: false },
  { key: 'cta', label: 'CTA Button', icon: 'ri-cursor-line', defaultVisible: false },
];

const DEFAULT_FIELD_ORDER = CARD_FIELD_DEFS.map((f) => f.key);

export function CardContentTab() {
  const [fieldOrder, setFieldOrder] = useState<string[]>([...DEFAULT_FIELD_ORDER]);
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    CARD_FIELD_DEFS.forEach((f) => { map[f.key] = f.defaultVisible; });
    return map;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .or('key.eq.design_cardcontent_field_order,key.ilike.design_cardcontent_visible_%');
    if (data) {
      let order = [...DEFAULT_FIELD_ORDER];
      const vis: Record<string, boolean> = {};
      CARD_FIELD_DEFS.forEach((f) => { vis[f.key] = f.defaultVisible; });

      data.forEach((row: { key: string; value: string | null }) => {
        if (row.key === 'design_cardcontent_field_order' && row.value) {
          try {
            const parsed = JSON.parse(row.value);
            if (Array.isArray(parsed)) order = parsed;
          } catch { /* ignore */ }
        } else if (row.key.startsWith('design_cardcontent_visible_') && row.value) {
          const key = row.key.replace('design_cardcontent_visible_', '');
          vis[key] = row.value === 'true';
        }
      });
      setFieldOrder(order);
      setVisibleMap(vis);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    const upserts = [
      supabase.from('site_settings').upsert(
        { key: 'design_cardcontent_field_order', value: JSON.stringify(fieldOrder) },
        { onConflict: 'key' }
      ),
      ...CARD_FIELD_DEFS.map((f) =>
        supabase.from('site_settings').upsert(
          { key: `design_cardcontent_visible_${f.key}`, value: visibleMap[f.key] ? 'true' : 'false' },
          { onConflict: 'key' }
        )
      ),
    ];
    await Promise.all(upserts);
    showToast('Card content order and visibility saved', 'success');
    setSaving(false);
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= fieldOrder.length) return;
    setFieldOrder((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const toggleVisible = (key: string) => {
    setVisibleMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setFieldOrder((prev) => {
      const next = [...prev];
      const [removed] = next.splice(dragIndex, 1);
      next.splice(index, 0, removed);
      return next;
    });
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  if (loading) return <TabLoading />;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 flex items-center justify-center">
            <i className="ri-list-ordered text-[#1B4332] text-sm"></i>
          </span>
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Card Content Manager</h3>
        </div>
        <p className="text-xs text-stone-400">Drag rows to reorder fields on the property card. Toggle visibility with the eye icon. Changes save automatically.</p>

        <div className="space-y-1.5 mt-2">
          {fieldOrder.map((key, index) => {
            const def = CARD_FIELD_DEFS.find((f) => f.key === key);
            if (!def) return null;
            const visible = visibleMap[key] ?? def.defaultVisible;
            return (
              <div
                key={key}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => { e.preventDefault(); handleDragEnd(); }}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${dragIndex === index ? 'border-[#1B4332] bg-[#1B4332]/5' : 'border-stone-100 bg-[#f5f5f5] hover:bg-stone-100'}`}
              >
                <span className="w-4 h-4 flex items-center justify-center text-stone-300 shrink-0">
                  <i className="ri-draggable text-base"></i>
                </span>
                <span className="w-5 h-5 flex items-center justify-center bg-stone-200 text-stone-500 text-[10px] font-bold rounded shrink-0">{index + 1}</span>
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  <i className={`${def.icon} text-sm ${visible ? 'text-stone-400' : 'text-stone-300'}`}></i>
                </span>
                <span className={`flex-1 text-sm ${visible ? 'text-stone-700' : 'text-stone-300 line-through'}`}>{def.label}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveField(index, -1)}
                    className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <i className="ri-arrow-up-s-line text-sm"></i>
                  </button>
                  <button
                    type="button"
                    disabled={index === fieldOrder.length - 1}
                    onClick={() => moveField(index, 1)}
                    className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <i className="ri-arrow-down-s-line text-sm"></i>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => toggleVisible(key)}
                  className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer shrink-0 ${visible ? 'text-[#1B4332] bg-[#1B4332]/10 hover:bg-[#1B4332]/20' : 'text-stone-300 bg-stone-100 hover:bg-stone-200'}`}
                >
                  <i className={`${visible ? 'ri-eye-line' : 'ri-eye-off-line'} text-sm`}></i>
                </button>
              </div>
            );
          })}
        </div>
        <div className="pt-3 border-t border-stone-100 flex items-center gap-2">
          <i className="ri-information-line text-stone-400 text-sm"></i>
          <p className="text-xs text-stone-400">Drag to reorder. Eye icon toggles visibility. No fixed layout — fields render in the order shown above.</p>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-4">Card Field Order Preview</h3>
        <div className="max-w-[220px] border border-stone-100 rounded-lg overflow-hidden">
          <div className="w-full h-28 bg-stone-100">
            <img alt="preview" className="w-full h-full object-cover object-top" src="https://readdy.ai/api/search-image?query=modern%20luxury%20apartment%20interior%20living%20room%20elegant%20minimal%20design%20bright%20natural%20light%20Kampala&width=440&height=224&seq=card-content-preview-1&orientation=landscape" />
          </div>
          <div className="p-3 space-y-1">
            {fieldOrder.map((key) => {
              const def = CARD_FIELD_DEFS.find((f) => f.key === key);
              if (!def || !visibleMap[key]) return null;
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 flex items-center justify-center shrink-0">
                    <i className={`${def.icon} text-[10px] text-stone-300`}></i>
                  </span>
                  <span className="text-[10px] text-stone-400">{def.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SaveBar count={CARD_FIELD_DEFS.length} saving={saving} onSave={handleSave} />
    </div>
  );
}

/* ================================================================== */
/*  Card v7 Tab — site_settings (design_cardv7_)                        */
/* ================================================================== */

type CardV7SubTab = 'content' | 'style' | 'advanced';

const CARDV7_SUBTABS: { key: CardV7SubTab; label: string; icon: string; letter: string }[] = [
  { key: 'content', label: 'Content', icon: 'ri-list-check', letter: 'A' },
  { key: 'style', label: 'Style', icon: 'ri-palette-line', letter: 'B' },
  { key: 'advanced', label: 'Advanced', icon: 'ri-settings-4-line', letter: 'C' },
];

const CARDV7_CONTEXT_DESC: Record<CardV7SubTab, string> = {
  content: 'Control field visibility, order and data binding for property card v7',
  style: 'Overlay gradients, colors, typography and visual styling for card v7',
  advanced: 'Advanced layout options, aspect ratios, CTA positioning and hover effects',
};

/* -------------------------------------------------- */
/*  Content Sub-tab Fields                             */
/* -------------------------------------------------- */

const CARDV7_CONTENT_FIELDS = [
  { key: 'show_status_label', label: 'Status Label (For Sale / For Rent)', type: 'toggle' as const, default: 'true' },
  { key: 'show_featured_badge', label: 'Featured Badge', type: 'toggle' as const, default: 'true' },
  { key: 'show_title', label: 'Property Title', type: 'toggle' as const, default: 'true' },
  { key: 'show_address', label: 'Address / Location', type: 'toggle' as const, default: 'true' },
  { key: 'show_meta', label: 'Meta (Beds, Baths, Parking)', type: 'toggle' as const, default: 'true' },
  { key: 'show_property_type', label: 'Property Type', type: 'toggle' as const, default: 'true' },
  { key: 'show_area', label: 'Area / Size (sqm)', type: 'toggle' as const, default: 'false' },
  { key: 'show_price', label: 'Price', type: 'toggle' as const, default: 'true' },
  { key: 'show_sub_price', label: 'Sub Price (PCM)', type: 'toggle' as const, default: 'true' },
  { key: 'show_agent_name', label: 'Agent Name', type: 'toggle' as const, default: 'false' },
  { key: 'show_date', label: 'Listed Date', type: 'toggle' as const, default: 'true' },
  { key: 'show_cta', label: 'CTA Button', type: 'toggle' as const, default: 'true' },
];

const CARDV7_DATA_BINDING_DEFAULTS: Record<string, string> = {
  price_source: 'price',
  title_max_lines: '1',
  address_max_lines: '1',
  cta_button_label: 'View Property',
  date_format: 'relative',
  show_location_icon: 'true',
};

const PRICE_SOURCE_OPTIONS = [
  { label: 'Price field', value: 'price' },
  { label: 'Price + Note', value: 'price_note' },
];

const DATE_FORMAT_OPTIONS_CARDV7 = [
  { label: 'Relative (3 days ago)', value: 'relative' },
  { label: 'Short (Jan 12, 2025)', value: 'short' },
  { label: 'Long (12 January 2025)', value: 'long' },
];

/* -------------------------------------------------- */
/*  Style Sub-tab Fields (legacy + new)                */
/* -------------------------------------------------- */

const CARDV7_STYLE_DEFAULTS: Record<string, string> = {
  overlay_gradient: 'bottom',
  overlay_opacity: '0.6',
  overlay_color_start: '#000000',
  overlay_color_end: '#000000',
  title_font_size: '16',
  title_font_weight: '600',
  price_font_size: '18',
  price_font_weight: '700',
  badge_font_size: '11',
  meta_font_size: '12',
  cta_bg: '#ffffff',
  cta_text: '#1a1a1a',
  cta_border_radius: '9999',
};

const CARDV7_STYLE_FIELDS = [
  { key: 'overlay_gradient', label: 'Overlay Gradient', type: 'select' as const, default: 'bottom', options: [{ label: 'Bottom to Top', value: 'bottom' }, { label: 'Top to Bottom', value: 'top' }, { label: 'Left to Right', value: 'left' }, { label: 'Full Overlay', value: 'full' }, { label: 'None', value: 'none' }] },
  { key: 'overlay_opacity', label: 'Overlay Opacity', type: 'text' as const, default: '0.6' },
  { key: 'overlay_color_start', label: 'Overlay Color Start', type: 'color' as const, default: '#000000' },
  { key: 'overlay_color_end', label: 'Overlay Color End', type: 'color' as const, default: '#000000' },
  { key: 'title_font_size', label: 'Title Font Size', type: 'text' as const, default: '16', unit: 'px' },
  { key: 'title_font_weight', label: 'Title Font Weight', type: 'select' as const, default: '600', options: [{ label: '400 — Regular', value: '400' }, { label: '500 — Medium', value: '500' }, { label: '600 — SemiBold', value: '600' }, { label: '700 — Bold', value: '700' }] },
  { key: 'price_font_size', label: 'Price Font Size', type: 'text' as const, default: '18', unit: 'px' },
  { key: 'price_font_weight', label: 'Price Font Weight', type: 'select' as const, default: '700', options: [{ label: '500 — Medium', value: '500' }, { label: '600 — SemiBold', value: '600' }, { label: '700 — Bold', value: '700' }] },
  { key: 'badge_font_size', label: 'Badge Font Size', type: 'text' as const, default: '11', unit: 'px' },
  { key: 'meta_font_size', label: 'Meta Font Size', type: 'text' as const, default: '12', unit: 'px' },
  { key: 'cta_bg', label: 'CTA Button Background', type: 'color' as const, default: '#ffffff' },
  { key: 'cta_text', label: 'CTA Button Text', type: 'color' as const, default: '#1a1a1a' },
  { key: 'cta_border_radius', label: 'CTA Button Border Radius', type: 'text' as const, default: '9999', unit: 'px' },
];

/* -------------------------------------------------- */
/*  Advanced Sub-tab Fields                            */
/* -------------------------------------------------- */

const CARDV7_ADVANCED_DEFAULTS: Record<string, string> = {
  image_aspect: '4/3',
  cta_position: 'center',
  title_position: 'bottom-left',
  hover_effect: 'lift',
  image_scale_on_hover: '1.05',
  content_animation: 'fade-up',
};

const CARDV7_ADVANCED_FIELDS = [
  { key: 'image_aspect', label: 'Image Aspect Ratio', type: 'select' as const, default: '4/3', options: [{ label: '4:3 (Standard)', value: '4/3' }, { label: '16:9 (Wide)', value: '16/9' }, { label: '1:1 (Square)', value: '1/1' }, { label: '3:2 (Photo)', value: '3/2' }, { label: '2:1 (Panoramic)', value: '2/1' }] },
  { key: 'cta_position', label: 'CTA Position', type: 'select' as const, default: 'center', options: [{ label: 'Center', value: 'center' }, { label: 'Bottom Center', value: 'bottom-center' }, { label: 'Bottom Right', value: 'bottom-right' }, { label: 'Hidden', value: 'hidden' }] },
  { key: 'title_position', label: 'Title Position', type: 'select' as const, default: 'bottom-left', options: [{ label: 'Bottom Left', value: 'bottom-left' }, { label: 'Bottom Center', value: 'bottom-center' }, { label: 'Center', value: 'center' }, { label: 'Top Left', value: 'top-left' }] },
  { key: 'hover_effect', label: 'Hover Effect', type: 'select' as const, default: 'lift', options: [{ label: 'None', value: 'none' }, { label: 'Lift', value: 'lift' }, { label: 'Scale', value: 'scale' }, { label: 'Glow', value: 'glow' }, { label: 'Lift + Scale', value: 'lift-scale' }] },
  { key: 'image_scale_on_hover', label: 'Image Scale on Hover', type: 'text' as const, default: '1.05' },
  { key: 'content_animation', label: 'Content Animation', type: 'select' as const, default: 'fade-up', options: [{ label: 'Fade Up', value: 'fade-up' }, { label: 'Fade In', value: 'fade-in' }, { label: 'Slide Up', value: 'slide-up' }, { label: 'None', value: 'none' }] },
];

export function CardV7Tab() {
  const [activeSubTab, setActiveSubTab] = useState<CardV7SubTab>('content');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'design_cardv7_%');
    const map: Record<string, string> = {};
    // merge all defaults
    CARDV7_CONTENT_FIELDS.forEach((f) => { map[f.key] = f.default; });
    Object.entries(CARDV7_DATA_BINDING_DEFAULTS).forEach(([k, v]) => { map[k] = v; });
    CARDV7_STYLE_FIELDS.forEach((f) => { map[f.key] = f.default; });
    CARDV7_ADVANCED_FIELDS.forEach((f) => { map[f.key] = f.default; });
    if (data) {
      data.forEach((row: { key: string; value: string | null }) => {
        const sk = row.key.replace('design_cardv7_', '');
        if (row.value && sk in map) map[sk] = row.value;
      });
    }
    setSettings(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    const keysToSave = Object.keys(settings);
    const upserts = keysToSave.map((k) =>
      supabase.from('site_settings').upsert({ key: `design_cardv7_${k}`, value: settings[k] }, { onConflict: 'key' })
    );
    await Promise.all(upserts);
    showToast('Card v7 settings saved', 'success');
    setSaving(false);
  };

  if (loading) return <TabLoading />;

  const update = (key: string, value: string) => setSettings((p) => ({ ...p, [key]: value }));

  const visibleCount = CARDV7_CONTENT_FIELDS.filter((f) => settings[f.key] === 'true').length;

  const renderContentTab = () => (
    <div className="space-y-5">
      {/* Field Visibility */}
      <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-1">
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Field Visibility</h3>
        {CARDV7_CONTENT_FIELDS.map((f) => (
          <div key={f.key} className="flex items-start justify-between gap-4 py-3 border-b border-stone-100 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-700">{f.label}</p>
            </div>
            <ToggleSwitch value={settings[f.key] === 'true'} onChange={(v) => update(f.key, v ? 'true' : 'false')} />
          </div>
        ))}
      </div>

      {/* Data Binding */}
      <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-1">Data Binding</h3>
        <p className="text-xs text-stone-400 mb-3">Control how data is sourced and displayed for each field.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Price Source */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700 block">Price Source</label>
            <SelectField value={settings.price_source || CARDV7_DATA_BINDING_DEFAULTS.price_source} onChange={(v) => update('price_source', v)} options={PRICE_SOURCE_OPTIONS} />
          </div>

          {/* Title Max Lines */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700 block">Title Max Lines</label>
            <div>
              <input className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white" type="number" min={1} max={4} value={settings.title_max_lines || CARDV7_DATA_BINDING_DEFAULTS.title_max_lines} onChange={(e) => update('title_max_lines', e.target.value)} />
            </div>
            <p className="text-xs text-stone-400">Clamp title to N lines.</p>
          </div>

          {/* Address Max Lines */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700 block">Address Max Lines</label>
            <div>
              <input className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white" type="number" min={1} max={3} value={settings.address_max_lines || CARDV7_DATA_BINDING_DEFAULTS.address_max_lines} onChange={(e) => update('address_max_lines', e.target.value)} />
            </div>
          </div>

          {/* CTA Button Label */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700 block">CTA Button Label</label>
            <div>
              <input className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white" type="text" value={settings.cta_button_label || CARDV7_DATA_BINDING_DEFAULTS.cta_button_label} onChange={(e) => update('cta_button_label', e.target.value)} />
            </div>
          </div>

          {/* Date Format */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700 block">Date Format</label>
            <SelectField value={settings.date_format || CARDV7_DATA_BINDING_DEFAULTS.date_format} onChange={(v) => update('date_format', v)} options={DATE_FORMAT_OPTIONS_CARDV7} />
          </div>

          {/* Show Location Icon */}
          <div className="flex items-start justify-between gap-4 py-3 border-b border-stone-100 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-700">Show Location Icon</p>
            </div>
            <ToggleSwitch value={(settings.show_location_icon || CARDV7_DATA_BINDING_DEFAULTS.show_location_icon) === 'true'} onChange={(v) => update('show_location_icon', v ? 'true' : 'false')} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStyleTab = () => (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 flex items-center justify-center"><i className="ri-palette-line text-[#1B4332] text-sm"></i></span>
          <div>
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Overlay &amp; Visual Style</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">Gradient overlays, colors and typography for the Card v7 layout.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
          {CARDV7_STYLE_FIELDS.map((f) => (
            <FieldRow key={f.key} label={f.label} cssVar={`--cardv7-${f.key.replace(/_/g, '-')}`} description="">
              {f.type === 'color' ? <ColorInput value={settings[f.key]} onChange={(v) => update(f.key, v)} /> :
               f.type === 'select' ? <SelectField value={settings[f.key]} onChange={(v) => update(f.key, v)} options={f.options!} /> :
               f.type === 'text' ? (
                 <div className="flex items-center gap-2">
                   <input className="w-full border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] font-mono rounded-md bg-white" type="text" value={settings[f.key]} onChange={(e) => update(f.key, e.target.value)} />
                   {f.unit && <span className="text-sm text-stone-500 shrink-0">{f.unit}</span>}
                 </div>
               ) : null}
            </FieldRow>
          ))}
        </div>
      </div>

      {/* Card v7 Style Preview */}
      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-4">Card v7 Preview</h3>
        <div className="max-w-[380px] mx-auto">
          <div className="relative rounded-lg overflow-hidden cursor-pointer" style={{ aspectRatio: settings.image_aspect || '4/3' }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #2d3a2d 0%, #4a6741 40%, #6b8f5e 70%, #8aad7a 100%)' }}></div>
            <div
              className="absolute inset-0"
              style={{
                background: settings.overlay_gradient === 'none' ? 'transparent' :
                  settings.overlay_gradient === 'bottom' ? `linear-gradient(to top, ${settings.overlay_color_start} 0%, transparent 70%)` :
                  settings.overlay_gradient === 'top' ? `linear-gradient(to bottom, ${settings.overlay_color_start} 0%, transparent 70%)` :
                  settings.overlay_gradient === 'left' ? `linear-gradient(to right, ${settings.overlay_color_start} 0%, transparent 70%)` :
                  `linear-gradient(to top, ${settings.overlay_color_start} 0%, ${settings.overlay_color_end} 100%)`,
                opacity: settings.overlay_opacity || '0.6',
              }}
            ></div>
            <div
              className="absolute p-5"
              style={{
                ...(settings.title_position === 'bottom-left' && { bottom: 0, left: 0 }),
                ...(settings.title_position === 'bottom-center' && { bottom: 0, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' as const }),
                ...(settings.title_position === 'center' && { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' as const }),
                ...(settings.title_position === 'top-left' && { top: 0, left: 0 }),
              }}
            >
              <p className="text-white text-sm font-semibold mb-1" style={{ fontSize: `${settings.title_font_size || '16'}px`, fontWeight: settings.title_font_weight || '600' }}>Luxury Penthouse</p>
              <p className="text-white/80 text-xs" style={{ fontSize: `${settings.price_font_size || '18'}px`, fontWeight: settings.price_font_weight || '700' }}>AED 18,900,000</p>
            </div>
            {(settings.cta_position !== 'hidden') && (
              <div
                className="absolute"
                style={{
                  ...(settings.cta_position === 'center' && { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
                  ...(settings.cta_position === 'bottom-center' && { bottom: '16px', left: '50%', transform: 'translateX(-50%)' }),
                  ...(settings.cta_position === 'bottom-right' && { bottom: '16px', right: '16px' }),
                }}
              >
                <button
                  className="px-4 py-2 text-xs font-medium rounded-full cursor-pointer whitespace-nowrap transition-colors"
                  style={{ background: settings.cta_bg || '#ffffff', color: settings.cta_text || '#1a1a1a', borderRadius: `${settings.cta_border_radius || '9999'}px` }}
                >{settings.cta_button_label || 'View Property'}</button>
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-stone-400 mt-3 text-center">Live preview of the Card v7 overlay layout.</p>
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 flex items-center justify-center"><i className="ri-settings-4-line text-[#1B4332] text-sm"></i></span>
          <div>
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Advanced Layout</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">Aspect ratios, CTA positioning, hover effects and animation settings.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
          {CARDV7_ADVANCED_FIELDS.map((f) => (
            <FieldRow key={f.key} label={f.label} cssVar={`--cardv7-${f.key.replace(/_/g, '-')}`} description="">
              {f.type === 'select' ? <SelectField value={settings[f.key]} onChange={(v) => update(f.key, v)} options={f.options!} /> :
               f.type === 'text' ? (
                 <input className="w-full border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] font-mono rounded-md bg-white" type="text" value={settings[f.key]} onChange={(e) => update(f.key, e.target.value)} />
               ) : null}
            </FieldRow>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Sub-tab Switcher */}
      <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
        <div className="flex border-b border-stone-100">
          {CARDV7_SUBTABS.map((st) => {
            const isActive = activeSubTab === st.key;
            return (
              <button
                key={st.key}
                onClick={() => setActiveSubTab(st.key)}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
                  isActive
                    ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4'
                    : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center"><i className={`${st.icon} text-sm`}></i></span>
                {st.letter}. {st.label}
              </button>
            );
          })}
        </div>
        <div className="px-5 py-2.5 bg-[#f5f5f5] border-b border-stone-100">
          <p className="text-[11px] text-stone-400">{CARDV7_CONTEXT_DESC[activeSubTab]}</p>
        </div>
      </div>

      {/* Sub-tab Content */}
      {activeSubTab === 'content' && renderContentTab()}
      {activeSubTab === 'style' && renderStyleTab()}
      {activeSubTab === 'advanced' && renderAdvancedTab()}

      <SaveBar count={Object.keys(settings).length} saving={saving} onSave={handleSave} />
    </div>
  );
}

/* ================================================================== */
/*  Date Tab — site_settings (design_date_)                             */
/* ================================================================== */

const DATE_DEFAULTS: Record<string, string> = {
  show_date: 'true',
  date_position: 'bottom',
  date_format: 'relative',
  date_font_size: '12',
  date_font_weight: '500',
  date_color: '#005733',
  show_clock_icon: 'true',
  date_text_transform: 'capitalize',
};

const DATE_FIELDS = [
  { key: 'show_date', label: 'Show Listed Date', cssVar: '--date-show', desc: 'Toggle visibility of the listed date on property cards.', type: 'toggle' as const },
  { key: 'date_position', label: 'Date Position', cssVar: '--date-position', desc: 'Where the date appears inside the card layout.', type: 'select' as const, options: [{ label: 'Bottom (after price)', value: 'bottom' }, { label: 'Top (before title)', value: 'top' }, { label: 'Inline (next to price)', value: 'inline' }] },
  { key: 'date_format', label: 'Date Format', cssVar: '--date-format', desc: 'How dates are displayed — relative, short or long format.', type: 'select' as const, options: [{ label: 'Relative (Listed 3 days ago)', value: 'relative' }, { label: 'Short (Jan 12, 2025)', value: 'short' }, { label: 'Long (12 January 2025)', value: 'long' }] },
  { key: 'date_font_size', label: 'Date Font Size', cssVar: '--date-font-size', desc: 'Font size of the date text (px).', type: 'text' as const },
  { key: 'date_font_weight', label: 'Date Font Weight', cssVar: '--date-font-weight', desc: 'Font weight of the date text.', type: 'select' as const, options: [{ label: '300 — Light', value: '300' }, { label: '400 — Regular', value: '400' }, { label: '500 — Medium', value: '500' }, { label: '600 — SemiBold', value: '600' }] },
  { key: 'date_color', label: 'Date Color', cssVar: '--date-color', desc: 'Text color of the listed date.', type: 'color' as const },
  { key: 'show_clock_icon', label: 'Show Clock Icon', cssVar: '--date-icon', desc: 'Show the clock icon next to the date.', type: 'toggle' as const },
  { key: 'date_text_transform', label: 'Date Text Transform', cssVar: '--date-transform', desc: 'Case transformation for the date text.', type: 'select' as const, options: [{ label: 'None', value: 'none' }, { label: 'Uppercase', value: 'uppercase' }, { label: 'Capitalize', value: 'capitalize' }] },
];

const DATE_FORMAT_LABELS: Record<string, string> = {
  relative: 'Listed 3 days ago',
  short: 'Jan 12, 2025',
  long: '12 January 2025',
};

export function DateTab() {
  const [settings, setSettings] = useState<Record<string, string>>({ ...DATE_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'design_date_%');
    if (data) {
      const map = { ...DATE_DEFAULTS };
      data.forEach((row: { key: string; value: string | null }) => {
        const sk = row.key.replace('design_date_', '');
        if (row.value && sk in map) map[sk] = row.value;
      });
      setSettings(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    const upserts = DATE_FIELDS.map((f) =>
      supabase.from('site_settings').upsert({ key: `design_date_${f.key}`, value: settings[f.key] }, { onConflict: 'key' })
    );
    await Promise.all(upserts);
    showToast('Date settings saved', 'success');
    setSaving(false);
  };

  if (loading) return <TabLoading />;

  const update = (key: string, value: string) => setSettings((p) => ({ ...p, [key]: value }));
  const datePreviewText = DATE_FORMAT_LABELS[settings.date_format] || DATE_FORMAT_LABELS.relative;

  return (
    <div className="space-y-6">
      <TabInfoBanner icon="ri-calendar-line" title="Date Control System" description="Controls how listing dates appear on property cards — visibility, position, format, typography, and icon styling. Applies to all cards across listing grids, search results, and homepage sections." tags={['Date', 'Format', 'Position', 'Typography', 'Icon']} />

      <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 flex items-center justify-center"><i className="ri-calendar-line text-[#1B4332] text-sm"></i></span>
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Date Control System</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {DATE_FIELDS.map((f) => (
            <div key={f.key} className={f.type === 'toggle' ? 'flex items-start justify-between gap-4 py-3 border-b border-stone-100 last:border-0 col-span-full sm:col-span-1' : 'space-y-1.5'}>
              {f.type === 'toggle' ? (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700">{f.label}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{f.desc}</p>
                  </div>
                  <ToggleSwitch value={settings[f.key] === 'true'} onChange={(v) => update(f.key, v ? 'true' : 'false')} />
                </>
              ) : f.type === 'color' ? (
                <>
                  <label className="text-sm font-medium text-stone-700 block">{f.label}</label>
                  <ColorInput value={settings[f.key]} onChange={(v) => update(f.key, v)} />
                </>
              ) : f.type === 'select' ? (
                <>
                  <label className="text-sm font-medium text-stone-700 block">{f.label}</label>
                  <SelectField value={settings[f.key]} onChange={(v) => update(f.key, v)} options={f.options!} />
                </>
              ) : (
                <>
                  <label className="text-sm font-medium text-stone-700 block">{f.label}</label>
                  <div className="flex items-center gap-2">
                    <input className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white flex-1" type="number" min={8} max={24} value={settings[f.key]} onChange={(e) => update(f.key, e.target.value)} />
                    <span className="text-sm text-stone-500 shrink-0">px</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-4">Date Preview</h3>
        <div className="flex items-center gap-2 p-3 bg-[#f5f5f5] rounded-lg w-fit">
          {settings.show_clock_icon === 'true' && (
            <i className="ri-time-line" style={{ color: settings.date_color, fontSize: `${settings.date_font_size}px` }}></i>
          )}
          <span style={{ color: settings.date_color, fontSize: `${settings.date_font_size}px`, fontWeight: settings.date_font_weight, textTransform: settings.date_text_transform as any }}>
            {datePreviewText}
          </span>
        </div>
        <p className="text-xs text-stone-400 mt-2">Position is controlled via the Card Content Manager (drag &amp; drop).</p>
      </div>

      <SaveBar count={DATE_FIELDS.length} saving={saving} onSave={handleSave} />
    </div>
  );
}

/* ================================================================== */
/*  Carousel Tab — site_settings (design_carousel_)                     */
/* ================================================================== */

const CAROUSEL_DEFAULTS: Record<string, string> = {
  autoplay: 'true',
  autoplay_speed: '4000',
  loop: 'true',
  show_dots: 'true',
  show_arrows: 'true',
  touch: 'true',
  transition_speed: '500',
  slides_per_view: '3',
};

const CAROUSEL_FIELDS = [
  { key: 'autoplay', label: 'Autoplay', cssVar: '--carousel-autoplay', desc: 'Automatically advance slides without user interaction.', type: 'toggle' as const },
  { key: 'autoplay_speed', label: 'Autoplay Speed', cssVar: '--carousel-speed', desc: 'Time between auto-advances in milliseconds.', type: 'text' as const, unit: 'ms' },
  { key: 'loop', label: 'Loop / Infinite', cssVar: '--carousel-loop', desc: 'Continuously loop slides — first slide follows the last.', type: 'toggle' as const },
  { key: 'show_dots', label: 'Show Dots', cssVar: '--carousel-dots', desc: 'Show pagination dots below the carousel.', type: 'toggle' as const },
  { key: 'show_arrows', label: 'Show Arrows', cssVar: '--carousel-arrows', desc: 'Show left/right navigation arrows on the carousel.', type: 'toggle' as const },
  { key: 'touch', label: 'Touch Enabled', cssVar: '--carousel-touch', desc: 'Allow swipe gestures on touch-enabled devices.', type: 'toggle' as const },
  { key: 'transition_speed', label: 'Transition Speed', cssVar: '--carousel-transition', desc: 'Duration of the slide transition animation in ms.', type: 'text' as const, unit: 'ms' },
  { key: 'slides_per_view', label: 'Slides Per View', cssVar: '--carousel-slides', desc: 'Number of slides visible at once on desktop.', type: 'text' as const },
];

export function CarouselTab() {
  const [settings, setSettings] = useState<Record<string, string>>({ ...CAROUSEL_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'design_carousel_%');
    if (data) {
      const map = { ...CAROUSEL_DEFAULTS };
      data.forEach((row: { key: string; value: string | null }) => {
        const sk = row.key.replace('design_carousel_', '');
        if (row.value && sk in map) map[sk] = row.value;
      });
      setSettings(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    const upserts = CAROUSEL_FIELDS.map((f) =>
      supabase.from('site_settings').upsert({ key: `design_carousel_${f.key}`, value: settings[f.key] }, { onConflict: 'key' })
    );
    await Promise.all(upserts);
    showToast('Carousel settings saved', 'success');
    setSaving(false);
  };

  if (loading) return <TabLoading />;

  const update = (key: string, value: string) => setSettings((p) => ({ ...p, [key]: value }));

  return (
    <div className="space-y-6">
      <TabInfoBanner icon="ri-slideshow-3-line" title="Carousel System" description="Controls carousel behaviour across the site — autoplay, dots, arrows, touch swipe, transition speed, and slide count. Applies to property carousels, testimonial sliders, and neighbourhood showcases on homepage and listing pages." tags={['Autoplay', 'Dots', 'Arrows', 'Touch', 'Speed', 'Slides']} />

      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 flex items-center justify-center"><i className="ri-slideshow-3-line text-[#1B4332] text-sm"></i></span>
          <div>
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Carousel Tokens</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">Behaviour, navigation and timing settings for all carousels.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
          {CAROUSEL_FIELDS.map((f) => (
            <FieldRow key={f.key} label={f.label} cssVar={f.cssVar} description={f.desc}>
              {f.type === 'toggle' ? (
                <ToggleSwitch value={settings[f.key] === 'true'} onChange={(v) => update(f.key, v ? 'true' : 'false')} />
              ) : (
                <div className="flex items-center gap-2">
                  <input className="w-full border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#1B4332] font-mono rounded-md bg-white" type="text" value={settings[f.key]} onChange={(e) => update(f.key, e.target.value)} />
                  {f.unit && <span className="text-sm text-stone-500 shrink-0">{f.unit}</span>}
                </div>
              )}
            </FieldRow>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-4">Carousel Preview</h3>
        <div className="max-w-[600px] mx-auto bg-[#f5f5f5] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            {settings.show_arrows === 'true' ? (
              <span className="w-8 h-8 flex items-center justify-center bg-white rounded-full border border-stone-200 cursor-pointer text-stone-400"><i className="ri-arrow-left-s-line"></i></span>
            ) : <span></span>}
            <div className="flex gap-2">
              <div className="w-20 h-14 rounded bg-stone-300"></div>
              <div className="w-20 h-14 rounded bg-[#1B4332]/20 border border-[#1B4332]/30"></div>
              <div className="w-20 h-14 rounded bg-stone-300"></div>
            </div>
            {settings.show_arrows === 'true' ? (
              <span className="w-8 h-8 flex items-center justify-center bg-white rounded-full border border-stone-200 cursor-pointer text-stone-400"><i className="ri-arrow-right-s-line"></i></span>
            ) : <span></span>}
          </div>
          {settings.show_dots === 'true' && (
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B4332]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
            </div>
          )}
        </div>
        <p className="text-xs text-stone-400 mt-3 text-center">
          {settings.autoplay === 'true' && `Autoplay every ${settings.autoplay_speed}ms`}{settings.loop === 'true' && ' · Looping'}{settings.touch === 'true' && ' · Touch enabled'} · {settings.slides_per_view} slides per view
        </p>
      </div>

      <SaveBar count={CAROUSEL_FIELDS.length} saving={saving} onSave={handleSave} />
    </div>
  );
}

/* ================================================================== */
/*  Page Control Tab — site_settings (design_pagecontrol_)              */
/* ================================================================== */

const PAGECONTROL_DEFAULTS: Record<string, string> = {
  show_hero: 'true',
  show_properties: 'true',
  show_neighborhoods: 'true',
  show_new_developments: 'true',
  show_contact: 'true',
  show_testimonials: 'true',
  show_blog: 'true',
  show_valuation: 'true',
  show_commute: 'true',
  show_schools: 'true',
};

const PAGECONTROL_FIELDS = [
  { key: 'show_hero', label: 'Show Hero Section', cssVar: '--page-hero', desc: 'Toggle the homepage hero banner visibility.', type: 'toggle' as const },
  { key: 'show_properties', label: 'Show Properties Section', cssVar: '--page-props', desc: 'Toggle the featured properties section on homepage.', type: 'toggle' as const },
  { key: 'show_neighborhoods', label: 'Show Neighborhoods', cssVar: '--page-nhood', desc: 'Toggle the neighbourhoods showcase section.', type: 'toggle' as const },
  { key: 'show_new_developments', label: 'Show New Developments', cssVar: '--page-newdev', desc: 'Toggle the new developments section.', type: 'toggle' as const },
  { key: 'show_contact', label: 'Show Contact Section', cssVar: '--page-contact', desc: 'Toggle the contact / enquiry section.', type: 'toggle' as const },
  { key: 'show_testimonials', label: 'Show Testimonials', cssVar: '--page-testim', desc: 'Toggle the testimonials carousel section.', type: 'toggle' as const },
  { key: 'show_blog', label: 'Show Blog Section', cssVar: '--page-blog', desc: 'Toggle the latest blog posts section.', type: 'toggle' as const },
  { key: 'show_valuation', label: 'Show Valuation CTA', cssVar: '--page-valuation', desc: 'Toggle the property valuation call-to-action.', type: 'toggle' as const },
  { key: 'show_commute', label: 'Show Commute Time', cssVar: '--page-commute', desc: 'Toggle the commute time calculator section.', type: 'toggle' as const },
  { key: 'show_schools', label: 'Show Schools Section', cssVar: '--page-schools', desc: 'Toggle the nearby schools section.', type: 'toggle' as const },
];

export function PageControlTab() {
  const [settings, setSettings] = useState<Record<string, string>>({ ...PAGECONTROL_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'design_pagecontrol_%');
    if (data) {
      const map = { ...PAGECONTROL_DEFAULTS };
      data.forEach((row: { key: string; value: string | null }) => {
        const sk = row.key.replace('design_pagecontrol_', '');
        if (row.value && sk in map) map[sk] = row.value;
      });
      setSettings(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    const upserts = PAGECONTROL_FIELDS.map((f) =>
      supabase.from('site_settings').upsert({ key: `design_pagecontrol_${f.key}`, value: settings[f.key] }, { onConflict: 'key' })
    );
    await Promise.all(upserts);
    showToast('Page control settings saved', 'success');
    setSaving(false);
  };

  if (loading) return <TabLoading />;

  const update = (key: string, value: string) => setSettings((p) => ({ ...p, [key]: value }));
  const enabledCount = PAGECONTROL_FIELDS.filter((f) => settings[f.key] === 'true').length;

  return (
    <div className="space-y-6">
      <TabInfoBanner icon="ri-pages-line" title="Page Control System" description="Per-page visibility toggles and section ordering. Control which sections appear on the homepage and in what order — toggle entire sections on or off with one click." tags={['Homepage', 'Sections', 'Visibility', 'Ordering']} />

      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 flex items-center justify-center"><i className="ri-pages-line text-[#1B4332] text-sm"></i></span>
          <div>
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Homepage Sections</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">
              <span className="font-medium text-[#1B4332]">{enabledCount}</span> of {PAGECONTROL_FIELDS.length} sections currently visible.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-0 divide-y divide-stone-100">
          {PAGECONTROL_FIELDS.map((f) => (
            <div key={f.key} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-700">{f.label}</p>
                <p className="text-xs text-stone-400 mt-0.5">{f.desc}</p>
              </div>
              <ToggleSwitch value={settings[f.key] === 'true'} onChange={(v) => update(f.key, v ? 'true' : 'false')} />
            </div>
          ))}
        </div>
      </div>

      <SaveBar count={PAGECONTROL_FIELDS.length} saving={saving} onSave={handleSave} />
    </div>
  );
}

/* ================================================================== */
/*  Responsive Tab — site_settings (design_responsive_{viewport}_{field}) */
/* ================================================================== */

type ViewportKey = 'desktop' | 'tablet' | 'mobile';

const VIEWPORTS: { key: ViewportKey; label: string; icon: string; range: string }[] = [
  { key: 'desktop', label: 'Desktop', icon: 'ri-computer-line', range: '\u2265 1024px' },
  { key: 'tablet', label: 'Tablet', icon: 'ri-tablet-line', range: '768px \u2013 1023px' },
  { key: 'mobile', label: 'Mobile', icon: 'ri-smartphone-line', range: '< 768px' },
];

interface ResponsiveDefaults {
  base_font_size: string;
  heading_scale: string;
  line_height: string;
  card_title_size: string;
  price_size: string;
  meta_label_size: string;
  section_padding_y: string;
  container_padding_x: string;
  card_gap: string;
  card_padding_x: string;
  card_padding_y: string;
  title_margin_bottom: string;
  property_grid_columns: string;
  card_image_height: string;
  carousel_slides_visible: string;
  show_sidebar: string;
  show_meta_labels: string;
}

const RESPONSIVE_DEFAULTS: Record<ViewportKey, ResponsiveDefaults> = {
  desktop: {
    base_font_size: '15',
    heading_scale: '1',
    line_height: '160',
    card_title_size: '14',
    price_size: '20',
    meta_label_size: '12',
    section_padding_y: '80',
    container_padding_x: '24',
    card_gap: '20',
    card_padding_x: '16',
    card_padding_y: '16',
    title_margin_bottom: '8',
    property_grid_columns: '3',
    card_image_height: '260',
    carousel_slides_visible: '3',
    show_sidebar: 'true',
    show_meta_labels: 'true',
  },
  tablet: {
    base_font_size: '14',
    heading_scale: '0.95',
    line_height: '150',
    card_title_size: '13',
    price_size: '18',
    meta_label_size: '11',
    section_padding_y: '60',
    container_padding_x: '20',
    card_gap: '16',
    card_padding_x: '14',
    card_padding_y: '14',
    title_margin_bottom: '6',
    property_grid_columns: '2',
    card_image_height: '220',
    carousel_slides_visible: '2',
    show_sidebar: 'false',
    show_meta_labels: 'true',
  },
  mobile: {
    base_font_size: '13',
    heading_scale: '0.9',
    line_height: '150',
    card_title_size: '12',
    price_size: '16',
    meta_label_size: '10',
    section_padding_y: '40',
    container_padding_x: '16',
    card_gap: '12',
    card_padding_x: '12',
    card_padding_y: '12',
    title_margin_bottom: '4',
    property_grid_columns: '1',
    card_image_height: '200',
    carousel_slides_visible: '1',
    show_sidebar: 'false',
    show_meta_labels: 'false',
  },
};

const TYPOGRAPHY_OVERRIDE_FIELDS: { key: keyof ResponsiveDefaults; label: string; cssVar: string; min: number; max: number; unit: string; desc: string }[] = [
  { key: 'base_font_size', label: 'Base Font Size', cssVar: '--resp-base-font', min: 10, max: 20, unit: 'px', desc: 'Body text size on this device.' },
  { key: 'line_height', label: 'Line Height', cssVar: '--resp-line-height', min: 120, max: 200, unit: '%', desc: 'Line height for body text.' },
  { key: 'price_size', label: 'Price Size', cssVar: '--resp-price', min: 10, max: 28, unit: 'px', desc: 'Price display font size.' },
  { key: 'meta_label_size', label: 'Meta Label Size', cssVar: '--resp-meta', min: 8, max: 16, unit: 'px', desc: 'Meta label font size (bed, bath, sqft).' },
];

const HEADING_SCALE_OPTIONS = [
  { label: '100% (full size)', value: '1' },
  { label: '95%', value: '0.95' },
  { label: '90%', value: '0.9' },
  { label: '85%', value: '0.85' },
  { label: '80%', value: '0.8' },
  { label: '75%', value: '0.75' },
  { label: '70%', value: '0.7' },
];

const SPACING_OVERRIDE_FIELDS: { key: keyof ResponsiveDefaults; label: string; cssVar: string; min: number; max: number; unit: string; desc: string }[] = [
  { key: 'section_padding_y', label: 'Section Padding (Top/Bottom)', cssVar: '--resp-section-y', min: 16, max: 160, unit: 'px', desc: 'Vertical spacing between page sections.' },
  { key: 'container_padding_x', label: 'Container Padding (Left/Right)', cssVar: '--resp-container-x', min: 8, max: 64, unit: 'px', desc: 'Horizontal page container padding.' },
  { key: 'card_gap', label: 'Card Gap', cssVar: '--resp-card-gap', min: 4, max: 48, unit: 'px', desc: 'Gap between cards in grid layouts.' },
  { key: 'card_padding_x', label: 'Card Padding X', cssVar: '--resp-card-pad-x', min: 0, max: 40, unit: 'px', desc: 'Internal horizontal padding inside cards.' },
  { key: 'card_padding_y', label: 'Card Padding Y', cssVar: '--resp-card-pad-y', min: 0, max: 40, unit: 'px', desc: 'Internal vertical padding inside cards.' },
  { key: 'title_margin_bottom', label: 'Title Margin Bottom', cssVar: '--resp-title-mb', min: 0, max: 32, unit: 'px', desc: 'Space below card titles.' },
];

const GRID_OVERRIDE_FIELDS: { key: keyof ResponsiveDefaults; label: string; cssVar: string; min: number; max: number; unit: string; desc: string }[] = [
  { key: 'property_grid_columns', label: 'Property Grid Columns', cssVar: '--resp-grid-cols', min: 1, max: 6, unit: '', desc: 'Number of columns in property listing grids.' },
  { key: 'card_image_height', label: 'Card Image Height', cssVar: '--resp-img-height', min: 80, max: 500, unit: 'px', desc: 'Property card image height on this device.' },
  { key: 'carousel_slides_visible', label: 'Carousel Slides Visible', cssVar: '--resp-carousel', min: 1, max: 6, unit: '', desc: 'Number of carousel slides visible at once.' },
];

const TOGGLE_FIELDS: { key: keyof ResponsiveDefaults; label: string; cssVar: string; desc: string }[] = [
  { key: 'show_sidebar', label: 'Show Sidebar', cssVar: '--resp-sidebar', desc: 'Show filter sidebar on listing pages for this viewport.' },
  { key: 'show_meta_labels', label: 'Show Meta Labels', cssVar: '--resp-meta-lbl', desc: 'Show bed, bath, sqft meta labels on cards for this viewport.' },
];

const VIEWPORT_CONTEXT: Record<ViewportKey, string> = {
  desktop: 'Full desktop layout \u2014 primary design target. All settings inherit globally unless overridden in smaller viewports.',
  tablet: 'Tablet layout \u2014 inherits from desktop unless overridden here. Adjust columns, spacing and font scale for medium screens.',
  mobile: 'Mobile layout \u2014 inherits from tablet unless overridden. Use single-column grids, compact spacing and smaller type.',
};

export function ResponsiveTab() {
  const [activeViewport, setActiveViewport] = useState<ViewportKey>('desktop');
  const [settings, setSettings] = useState<Record<ViewportKey, ResponsiveDefaults>>(() => {
    const initial: Record<ViewportKey, ResponsiveDefaults> = {
      desktop: { ...RESPONSIVE_DEFAULTS.desktop },
      tablet: { ...RESPONSIVE_DEFAULTS.tablet },
      mobile: { ...RESPONSIVE_DEFAULTS.mobile },
    };
    return initial;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'design_responsive_%');
    if (data) {
      const map: Record<ViewportKey, ResponsiveDefaults> = {
        desktop: { ...RESPONSIVE_DEFAULTS.desktop },
        tablet: { ...RESPONSIVE_DEFAULTS.tablet },
        mobile: { ...RESPONSIVE_DEFAULTS.mobile },
      };
      data.forEach((row: { key: string; value: string | null }) => {
        const match = row.key.match(/^design_responsive_(desktop|tablet|mobile)_(.+)$/);
        if (match && row.value) {
          const [, viewport, field] = match;
          if (viewport in map && field in map[viewport as ViewportKey]) {
            (map[viewport as ViewportKey] as Record<string, string>)[field] = row.value;
          }
        }
      });
      setSettings(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const update = (viewport: ViewportKey, key: keyof ResponsiveDefaults, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [viewport]: { ...prev[viewport], [key]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const upserts: Promise<{ error: unknown }>[] = [];
    (Object.keys(settings) as ViewportKey[]).forEach((vp) => {
      (Object.keys(settings[vp]) as (keyof ResponsiveDefaults)[]).forEach((field) => {
        upserts.push(
          supabase.from('site_settings').upsert(
            { key: `design_responsive_${vp}_${field}`, value: settings[vp][field] },
            { onConflict: 'key' }
          )
        );
      });
    });
    await Promise.all(upserts);
    showToast('Responsive settings saved', 'success');
    setSaving(false);
  };

  const countAllFields = () => {
    const vp = settings[activeViewport];
    return Object.keys(vp).length;
  };

  if (loading) return <TabLoading />;

  const vp = settings[activeViewport];

  const renderNumberInput = (field: { key: keyof ResponsiveDefaults; label: string; min: number; max: number; unit: string; desc: string }) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-stone-700 block">{field.label}</label>
      <div className="flex items-center gap-2">
        <input
          className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white flex-1"
          type="number"
          min={field.min}
          max={field.max}
          value={vp[field.key]}
          onChange={(e) => update(activeViewport, field.key, e.target.value)}
        />
        {field.unit && <span className="text-sm text-stone-500 shrink-0">{field.unit}</span>}
      </div>
      <p className="text-xs text-stone-400">{field.desc}</p>
    </div>
  );

  const renderToggle = (field: { key: keyof ResponsiveDefaults; label: string; desc: string }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-stone-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-700">{field.label}</p>
        <p className="text-xs text-stone-400 mt-0.5">{field.desc}</p>
      </div>
      <ToggleSwitch value={vp[field.key] === 'true'} onChange={(val) => update(activeViewport, field.key, val ? 'true' : 'false')} />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Info Banner */}
      <div className="bg-[#1B4332]/5 border border-[#1B4332]/15 rounded-xl p-4 flex items-start gap-3">
        <span className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
          <i className="ri-device-line text-[#1B4332] text-sm"></i>
        </span>
        <div>
          <p className="text-sm font-semibold text-[#1B4332] mb-1">Responsive Control \u2014 No Breaking Layouts</p>
          <p className="text-xs text-stone-600">
            Each setting supports Desktop, Tablet and Mobile overrides. Desktop-first \u2014 tablet and mobile inherit from desktop unless overridden here. All settings use CSS variables \u2014 no hardcoded breakpoint styles.
          </p>
        </div>
      </div>

      {/* Viewport Switcher */}
      <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
        <div className="flex border-b border-stone-100">
          {VIEWPORTS.map((v) => {
            const isActive = activeViewport === v.key;
            return (
              <button
                key={v.key}
                onClick={() => setActiveViewport(v.key)}
                className={`flex-1 flex flex-col items-center gap-1 py-3.5 text-xs font-medium transition-colors cursor-pointer border-b-2 ${
                  isActive
                    ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/4'
                    : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-[#f5f5f5]'
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className={`${v.icon} text-base`}></i>
                </span>
                <span>{v.label}</span>
                <span className="text-[9px] font-mono text-stone-400">{v.range}</span>
              </button>
            );
          })}
        </div>
        <div className="px-5 py-2.5 bg-[#f5f5f5] border-b border-stone-100">
          <p className="text-xs text-stone-500">{VIEWPORT_CONTEXT[activeViewport]}</p>
        </div>
      </div>

      {/* Typography Overrides */}
      <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 flex items-center justify-center">
            <i className="ri-text text-[#1B4332] text-sm"></i>
          </span>
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Typography Overrides</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {TYPOGRAPHY_OVERRIDE_FIELDS.map((f) => (
            <div key={f.key}>{renderNumberInput(f)}</div>
          ))}

          {/* Heading Scale — custom select */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700 block">Heading Scale</label>
            <select
              value={vp.heading_scale}
              onChange={(e) => update(activeViewport, 'heading_scale', e.target.value)}
              className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
            >
              {HEADING_SCALE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-stone-400">Scale headings proportionally.</p>
          </div>

          {/* Card Title Size — custom select */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700 block">Card Title Size</label>
            <select
              value={vp.card_title_size}
              onChange={(e) => update(activeViewport, 'card_title_size', e.target.value)}
              className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
            >
              <option value="10">XS (10px)</option>
              <option value="12">SM (12px)</option>
              <option value="14">Base (14px)</option>
              <option value="16">MD (16px)</option>
              <option value="18">LG (18px)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Spacing Overrides */}
      <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 flex items-center justify-center">
            <i className="ri-layout-4-line text-[#1B4332] text-sm"></i>
          </span>
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Spacing Overrides</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {SPACING_OVERRIDE_FIELDS.map((f) => (
            <div key={f.key}>{renderNumberInput(f)}</div>
          ))}
        </div>
      </div>

      {/* Grid & Layout Overrides */}
      <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 flex items-center justify-center">
            <i className="ri-layout-grid-line text-[#1B4332] text-sm"></i>
          </span>
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Grid &amp; Layout Overrides</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {GRID_OVERRIDE_FIELDS.map((f) => (
            <div key={f.key}>{renderNumberInput(f)}</div>
          ))}
          {TOGGLE_FIELDS.map((f) => (
            <div key={f.key} className="col-span-full sm:col-span-1">{renderToggle(f)}</div>
          ))}
        </div>
      </div>

      {/* Grid Preview */}
      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-4">Grid Preview</h3>
        <div className="flex flex-wrap gap-4 justify-center">
          <div className="text-center">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-2">Mobile</p>
            <div className="w-[120px] bg-[#f5f5f5] rounded-lg p-2 space-y-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-3 bg-stone-300 rounded" style={{ width: i === 0 ? '100%' : `${60 + i * 15}%` }}></div>
              ))}
            </div>
            <p className="text-[9px] text-stone-400 mt-1">{settings.mobile.property_grid_columns} column{settings.mobile.property_grid_columns !== '1' ? 's' : ''}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-2">Tablet</p>
            <div className="w-[200px] bg-[#f5f5f5] rounded-lg p-3 flex gap-2">
              {Array.from({ length: Math.min(4, parseInt(settings.tablet.property_grid_columns) || 2) }).map((_, i) => (
                <div key={i} className="flex-1 space-y-1.5">
                  <div className="h-10 bg-stone-300 rounded"></div>
                  <div className="h-2 bg-stone-300 rounded w-3/4"></div>
                  <div className="h-2 bg-stone-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-stone-400 mt-1">{settings.tablet.property_grid_columns} columns</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-2">Desktop</p>
            <div className="w-[300px] bg-[#f5f5f5] rounded-lg p-3 flex gap-2">
              {Array.from({ length: Math.min(4, parseInt(settings.desktop.property_grid_columns) || 3) }).map((_, i) => (
                <div key={i} className="flex-1 space-y-1.5">
                  <div className="h-16 bg-stone-300 rounded"></div>
                  <div className="h-2 bg-stone-300 rounded w-3/4"></div>
                  <div className="h-2 bg-stone-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-stone-400 mt-1">{settings.desktop.property_grid_columns} columns</p>
          </div>
        </div>
      </div>

      <SaveBar count={countAllFields()} saving={saving} onSave={handleSave} />
    </div>
  );
}

/* ================================================================== */
/*  Live Preview Tab                                                    */
/* ================================================================== */

export function LivePreviewTab() {
  return (
    <div className="bg-white rounded-xl border border-stone-100 p-8 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#1B4332]/8 flex items-center justify-center">
        <i className="ri-eye-line text-[#1B4332] text-xl"></i>
      </div>
      <p className="text-sm font-medium text-stone-700 mb-1">Live Preview</p>
      <p className="text-[11px] text-stone-400 max-w-sm mx-auto mb-5">Open a live preview of the frontend to see design changes in real time.</p>
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#163828] transition-colors cursor-pointer whitespace-nowrap"
      >
        <i className="ri-external-link-line"></i>Open Live Preview
      </a>
    </div>
  );
}