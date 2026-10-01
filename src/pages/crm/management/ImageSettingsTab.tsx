import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import { TabLoading, TabInfoBanner, SaveBar, FieldLabel, SelectField } from './DesignShared';

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
  { label: 'Bottom (middle bottom)', value: 'bottom' },
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
    try {
      const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'design_image_%');
      if (data) {
        const map = { ...IMAGE_DEFAULTS };
        data.forEach((row: { key: string; value: string | null }) => {
          const shortKey = row.key.replace('design_image_', '') as keyof ImageSettings;
          if (row.value && shortKey in map) (map as Record<string, string>)[shortKey] = row.value;
        });
        setSettings(map);
      }
    } catch {
      /* keep the safe defaults */
    } finally {
      setLoading(false);
    }
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
            <p className="text-[11px] text-stone-400">Which part of the image stays visible when cropping. Blog &amp; guide card images follow this setting.</p>
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