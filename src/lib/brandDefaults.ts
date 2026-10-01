/**
 * brandDefaults - single source of truth for brand asset fallbacks.
 *
 * The live logo is resolved as:
 *   site_settings.logo_url  →  brand_settings.main_logo  →  FALLBACK_LOGO
 * so an admin upload always wins and the site never shows a broken image.
 */
export const FALLBACK_LOGO =
  'https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/55202c71-05ff-4d5d-a3e9-edf3986c0610_ceans-logo-main.webp?v=89ffc16e7b8bb77db0fda233ffe29e3b';

/**
 * Logo shown ONLY in the site header (main navigation bar).
 * This is the previous header mark and is pinned here, so it does not
 * change when the global site/brand logo is updated elsewhere.
 */
export const HEADER_LOGO =
  'https://public.readdy.ai/ai/img_res/5a259fc0-b661-4296-bd55-dab174b0a993.png';

/**
 * Default mark shown beside "OCEANS CHAT" in the messenger top bar.
 * Overridable from Site Settings → General → Chat Image (site_settings.chat_logo_url).
 */
export const FALLBACK_CHAT_LOGO =
  'https://static.readdy.ai/image/853f4d37c96de87f4aec39b30d187d5a/b5340804c4629528968ede6d92d4371a.png';