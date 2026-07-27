import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Convert a hex colour (#RRGGBB / #RGB) to a space-separated RGB channel
// string, e.g. "#001731" -> "0 23 49". Returns null for invalid input.
function hexToRgbChannels(hex: string): string | null {
  if (!hex) return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

// Maps a brand_settings key -> the CSS variable it drives.
const BRAND_VAR_MAP: Record<string, string> = {
  primary_color: '--color-primary',
  golden_color: '--color-golden',
  accent_color: '--color-accent',
};

/**
 * Reads brand colours from the brand_settings table and applies them to the
 * root CSS variables that Tailwind's primary/golden/accent tokens are bound to.
 * This is what finally connects the admin "Colour Palette" to the live site.
 *
 * Fails silently and leaves the index.css defaults in place on any error,
 * so a DB hiccup can never leave the site unstyled.
 */
export function useBrandTheme() {
  useEffect(() => {
    let cancelled = false;

    const applyTheme = async () => {
      try {
        const { data, error } = await supabase
          .from('brand_settings')
          .select('key, value')
          .in('key', Object.keys(BRAND_VAR_MAP));

        if (cancelled || error || !data) return;

        const root = document.documentElement;
        data.forEach((row: { key: string; value: string | null }) => {
          const cssVar = BRAND_VAR_MAP[row.key];
          if (!cssVar || !row.value) return;
          const channels = hexToRgbChannels(row.value);
          if (channels) {
            root.style.setProperty(cssVar, channels);
          }
        });
      } catch {
        // Keep index.css defaults on any failure.
      }
    };

    applyTheme();
    return () => { cancelled = true; };
  }, []);
}