import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Maps property_cards_style key -> the CSS variable it drives.
// These are the text / label colours that appear across listing cards.
const CARD_TEXT_VAR_MAP: Record<string, string> = {
  title_color: '--card-title-text',
  price_color: '--card-price-text',
  category_color: '--card-category-text',
  location_color: '--card-location-text',
  specs_color: '--card-specs-text',
  time_ago_color: '--card-time-text',
};

// Maps property_cards_style key -> the CSS variable driving each badge /
// label colour. This is what makes every listing badge editable in the admin.
const BADGE_VAR_MAP: Record<string, string> = {
  potw_badge_color: '--badge-potw-bg',
  potw_badge_text_color: '--badge-potw-text',
  just_listed_badge_color: '--badge-just-listed-bg',
  just_listed_badge_text_color: '--badge-just-listed-text',
  featured_badge_color: '--badge-featured-bg',
  featured_badge_text_color: '--badge-featured-text',
  back_on_market_badge_color: '--badge-back-market-bg',
  back_on_market_badge_text_color: '--badge-back-market-text',
  reduced_badge_color: '--badge-reduced-bg',
  reduced_badge_text_color: '--badge-reduced-text',
  new_home_badge_color: '--badge-new-home-bg',
  new_home_badge_text_color: '--badge-new-home-text',
  refurbished_badge_color: '--badge-refurbished-bg',
  refurbished_badge_text_color: '--badge-refurbished-text',
  joint_venture_badge_color: '--badge-jv-bg',
  joint_venture_badge_text_color: '--badge-jv-text',
  house_share_badge_color: '--badge-house-share-bg',
  house_share_badge_text_color: '--badge-house-share-text',
  tour_badge_color: '--badge-tour-bg',
  tour_badge_text_color: '--badge-tour-text',
  sale_badge_color: '--badge-sale-bg',
  sale_badge_text_color: '--badge-sale-text',
  rent_badge_color: '--badge-rent-bg',
  rent_badge_text_color: '--badge-rent-text',
  new_dev_badge_color: '--badge-new-dev-bg',
  new_dev_badge_text_color: '--badge-new-dev-text',
  completed_badge_color: '--badge-completed-bg',
  completed_badge_text_color: '--badge-completed-text',
  offplan_badge_color: '--badge-offplan-bg',
  offplan_badge_text_color: '--badge-offplan-text',
  under_construction_badge_color: '--badge-under-construction-bg',
  under_construction_badge_text_color: '--badge-under-construction-text',
  sold_off_plan_badge_color: '--badge-sold-off-plan-bg',
  sold_off_plan_badge_text_color: '--badge-sold-off-plan-text',
  sold_out_badge_color: '--badge-sold-out-bg',
  sold_out_badge_text_color: '--badge-sold-out-text',
  investment_badge_color: '--badge-investment-bg',
  investment_badge_text_color: '--badge-investment-text',
};

// Maps property_cards_style key -> the CSS variable driving the card
// surface and card action-button colours (Call / Email / Message links).
const CARD_CHROME_VAR_MAP: Record<string, string> = {
  card_background: '--card-bg',
  button_bg_color: '--card-btn-bg',
  button_text_color: '--card-btn-text',
  button_hover_color: '--card-btn-hover',
};

const ALL_KEYS = [...Object.keys(CARD_TEXT_VAR_MAP), ...Object.keys(BADGE_VAR_MAP), ...Object.keys(CARD_CHROME_VAR_MAP)];
const ALL_VAR_MAP: Record<string, string> = { ...CARD_TEXT_VAR_MAP, ...BADGE_VAR_MAP, ...CARD_CHROME_VAR_MAP };

/**
 * Reads card text/label and badge colours from the property_cards_style table
 * and applies them to root CSS variables consumed by the listing cards. This
 * connects the admin "Colour Palette → Card Colors" section to the live site.
 *
 * Fails silently and keeps the index.css defaults on any error, so a DB
 * hiccup never leaves cards unstyled.
 */
export function useCardTheme() {
  useEffect(() => {
    let cancelled = false;

    const applyTheme = async () => {
      try {
        const { data, error } = await supabase
          .from('property_cards_style')
          .select('key, value')
          .in('key', ALL_KEYS);

        if (cancelled || error || !data) return;

        const root = document.documentElement;
        data.forEach((row: { key: string; value: string | null }) => {
          const cssVar = ALL_VAR_MAP[row.key];
          if (!cssVar || !row.value) return;
          const value = row.value.trim();
          if (value) root.style.setProperty(cssVar, value);
        });
      } catch {
        // Keep index.css defaults on any failure.
      }
    };

    applyTheme();
    return () => { cancelled = true; };
  }, []);
}