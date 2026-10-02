import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * useTypography - the missing link between Management → Typography and the
 * public frontend.
 *
 * The Management UI (GlobalDesign / ManagementTabContent) writes rows into the
 * `typography_settings` table, but for a long time NOTHING on the public site
 * read them - so changing a font, size, weight or transform in Management had
 * zero effect on rendered pages. This hook reads those rows once and applies
 * them to the root CSS variables that the base stylesheet + Tailwind font
 * utilities actually consume (see index.css / tailwind.config.ts).
 *
 * It mirrors the proven pattern used by useBrandTheme for colours: apply to
 * :root, fail silently so a DB hiccup can never leave the site unstyled, and
 * fall back to the index.css defaults.
 */

// A handful of families are serif; everything else resolves to a sans stack.
const SERIF_FONTS = new Set([
  'prata',
  'playfair display',
  'cormorant garamond',
  'merriweather',
  'lora',
  'source serif 4',
  'georgia',
  'times new roman',
  'garamond',
]);

function fontStack(name?: string | null): string | null {
  if (!name) return null;
  const clean = name.trim();
  if (!clean) return null;
  const isSerif = SERIF_FONTS.has(clean.toLowerCase());
  return `'${clean}', ${isSerif ? 'serif' : 'sans-serif'}`;
}

// A bare number ("14") becomes px; an explicit unit ("1.2rem") passes through.
function toSize(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

// A bare number ("0.02") becomes em; an explicit unit passes through.
function toSpacing(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (v === '0') return '0em';
  if (/^-?\d+(\.\d+)?$/.test(v)) return `${v}em`;
  return v;
}

type Transform = 'font' | 'size' | 'spacing' | 'raw';

// settings key -> the CSS variable it drives (names match the ones shown next
// to each control in Management → Typography).
const VAR_MAP: Record<string, { cssVar: string; transform: Transform }> = {
  display_font: { cssVar: '--font-display', transform: 'font' },
  heading_font: { cssVar: '--font-heading', transform: 'font' },
  body_font: { cssVar: '--font-body', transform: 'font' },

  hero_font_size: { cssVar: '--hero-font-size', transform: 'size' },
  hero_font_weight: { cssVar: '--hero-font-weight', transform: 'raw' },
  hero_line_height: { cssVar: '--hero-line-height', transform: 'raw' },
  hero_letter_spacing: { cssVar: '--hero-letter-spacing', transform: 'spacing' },

  body_font_size: { cssVar: '--body-font-size', transform: 'size' },
  body_font_weight: { cssVar: '--body-font-weight', transform: 'raw' },
  body_line_height: { cssVar: '--body-line-height', transform: 'raw' },
  body_letter_spacing: { cssVar: '--body-letter-spacing', transform: 'spacing' },

  nav_font_size: { cssVar: '--nav-font-size', transform: 'size' },
  nav_font_weight: { cssVar: '--nav-font-weight', transform: 'raw' },
  nav_letter_spacing: { cssVar: '--nav-letter-spacing', transform: 'spacing' },
  nav_text_transform: { cssVar: '--nav-text-transform', transform: 'raw' },

  card_title_font_size: { cssVar: '--card-title-font-size', transform: 'size' },
  card_title_font_weight: { cssVar: '--card-title-font-weight', transform: 'raw' },

  breadcrumb_font_size: { cssVar: '--breadcrumb-font-size', transform: 'size' },
  breadcrumb_font_weight: { cssVar: '--breadcrumb-font-weight', transform: 'raw' },

  button_font_size: { cssVar: '--button-font-size', transform: 'size' },
  button_font_weight: { cssVar: '--button-font-weight', transform: 'raw' },
  button_letter_spacing: { cssVar: '--button-letter-spacing', transform: 'spacing' },
  button_text_transform: { cssVar: '--button-text-transform', transform: 'raw' },

  footer_font_size: { cssVar: '--footer-font-size', transform: 'size' },
  footer_font_weight: { cssVar: '--footer-font-weight', transform: 'raw' },
};

function resolve(transform: Transform, value: string): string | null {
  switch (transform) {
    case 'font':
      return fontStack(value);
    case 'size':
      return toSize(value);
    case 'spacing':
      return toSpacing(value);
    default:
      return value.trim() || null;
  }
}

export function useTypography() {
  useEffect(() => {
    let cancelled = false;

    const apply = async () => {
      try {
        const { data, error } = await supabase
          .from('typography_settings')
          .select('key, value');

        if (cancelled || error || !data) return;

        const root = document.documentElement;
        data.forEach((row: { key: string; value: string | null }) => {
          const entry = VAR_MAP[row.key];
          if (!entry || row.value == null) return;
          const resolved = resolve(entry.transform, row.value);
          if (resolved) root.style.setProperty(entry.cssVar, resolved);
        });
      } catch {
        // Keep the index.css defaults on any failure.
      }
    };

    apply();
    return () => {
      cancelled = true;
    };
  }, []);
}