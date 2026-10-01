import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * The CRM "Focal Point" (Design -> Image settings) controls which part of a
 * cropped photo stays visible. Blog and guide card images read it so the crop
 * can be adjusted from the backend without touching code.
 *
 * Defaults to the centre crop (centre-centre) when the setting has not been
 * saved yet, so cropped photos always keep their central subject visible.
 */
const DEFAULT_FOCAL_POINT = 'center';

const ALLOWED_FOCAL_POINTS = new Set([
  'center',
  'top',
  'top right',
  'right',
  'bottom right',
  'bottom',
  'bottom left',
  'left',
  'top left',
]);

const SETTINGS_KEY = 'design_image_focal_point';

export function useImageFocalPoint(): string {
  const [focalPoint, setFocalPoint] = useState(DEFAULT_FOCAL_POINT);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', SETTINGS_KEY)
          .maybeSingle();

        if (!active || error) return;

        const value = (data?.value || '').trim().toLowerCase();
        if (value && ALLOWED_FOCAL_POINTS.has(value)) {
          setFocalPoint(value);
        }
      } catch {
        /* keep the safe default crop */
      }
    })();

    return () => { active = false; };
  }, []);

  return focalPoint;
}