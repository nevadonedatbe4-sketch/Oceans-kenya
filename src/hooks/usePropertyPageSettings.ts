import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface PropertyPageHero {
  eyebrow: string;
  title: string;
  subtitle: string;
  bgImage: string;
  // Eyebrow typography
  eyebrowFont: string;
  eyebrowWeight: string;
  eyebrowSize: string;
  eyebrowSpacing: string;
  eyebrowTransform: string;
  // Title typography
  titleFont: string;
  titleWeight: string;
  titleSize: string;
  titleSpacing: string;
  titleLineHeight: string;
  titleTransform: string;
  // Subtitle typography
  subtitleFont: string;
  subtitleWeight: string;
  subtitleSize: string;
  subtitleSpacing: string;
  subtitleLineHeight: string;
}

const DEFAULTS: Record<string, string> = {
  hero_eyebrow_font: '',
  hero_eyebrow_weight: '400',
  hero_eyebrow_size: '12',
  hero_eyebrow_spacing: '0.3',
  hero_eyebrow_transform: 'uppercase',
  hero_title_font: '',
  hero_title_weight: '400',
  hero_title_size: '48',
  hero_title_spacing: '0',
  hero_title_lineheight: '1.1',
  hero_title_transform: 'none',
  hero_subtitle_font: '',
  hero_subtitle_weight: '400',
  hero_subtitle_size: '14',
  hero_subtitle_spacing: '0',
  hero_subtitle_lineheight: '1.5',
};

export function usePropertyPageSettings(pageKey: string) {
  const [hero, setHero] = useState<PropertyPageHero | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('property_page_settings')
        .select('key, value')
        .like('key', `${pageKey}_%`);

      if (cancelled) return;

      const map: Record<string, string> = {};
      if (data) {
        data.forEach((row: any) => {
          map[row.key] = row.value || '';
        });
      }

      setHero({
        eyebrow: map[`${pageKey}_hero_eyebrow`] || '',
        title: map[`${pageKey}_hero_title`] || '',
        subtitle: map[`${pageKey}_hero_subtitle`] || '',
        bgImage: map[`${pageKey}_hero_bg`] || '',
        eyebrowFont: map[`${pageKey}_hero_eyebrow_font`] || DEFAULTS.hero_eyebrow_font,
        eyebrowWeight: map[`${pageKey}_hero_eyebrow_weight`] || DEFAULTS.hero_eyebrow_weight,
        eyebrowSize: map[`${pageKey}_hero_eyebrow_size`] || DEFAULTS.hero_eyebrow_size,
        eyebrowSpacing: map[`${pageKey}_hero_eyebrow_spacing`] || DEFAULTS.hero_eyebrow_spacing,
        eyebrowTransform: map[`${pageKey}_hero_eyebrow_transform`] || DEFAULTS.hero_eyebrow_transform,
        titleFont: map[`${pageKey}_hero_title_font`] || DEFAULTS.hero_title_font,
        titleWeight: map[`${pageKey}_hero_title_weight`] || DEFAULTS.hero_title_weight,
        titleSize: map[`${pageKey}_hero_title_size`] || DEFAULTS.hero_title_size,
        titleSpacing: map[`${pageKey}_hero_title_spacing`] || DEFAULTS.hero_title_spacing,
        titleLineHeight: map[`${pageKey}_hero_title_lineheight`] || DEFAULTS.hero_title_lineheight,
        titleTransform: map[`${pageKey}_hero_title_transform`] || DEFAULTS.hero_title_transform,
        subtitleFont: map[`${pageKey}_hero_subtitle_font`] || DEFAULTS.hero_subtitle_font,
        subtitleWeight: map[`${pageKey}_hero_subtitle_weight`] || DEFAULTS.hero_subtitle_weight,
        subtitleSize: map[`${pageKey}_hero_subtitle_size`] || DEFAULTS.hero_subtitle_size,
        subtitleSpacing: map[`${pageKey}_hero_subtitle_spacing`] || DEFAULTS.hero_subtitle_spacing,
        subtitleLineHeight: map[`${pageKey}_hero_subtitle_lineheight`] || DEFAULTS.hero_subtitle_lineheight,
      });

      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [pageKey]);

  return { hero, loading };
}