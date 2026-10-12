import type { SocialLink } from '@/hooks/useSiteSettings';

/** Where a social link can be displayed on the public site. */
export type SocialPlacement = 'hero' | 'header' | 'footer' | 'contact';

/**
 * Map a platform name -> Remix icon class.
 * Uses the SOLID (fill) variants so the glyph reads clearly on a solid tile.
 * NOTE: TikTok maps to `ri-tiktok-fill` (it previously pointed at the LinkedIn
 * glyph, which rendered the wrong icon everywhere).
 */
export function socialIcon(platform: string): string {
  switch ((platform || '').toLowerCase().trim()) {
    case 'facebook':
      return 'ri-facebook-fill';
    case 'instagram':
      return 'ri-instagram-fill';
    case 'tiktok':
      return 'ri-tiktok-fill';
    case 'linkedin':
      return 'ri-linkedin-fill';
    case 'youtube':
      return 'ri-youtube-fill';
    case 'twitter':
    case 'x':
      return 'ri-twitter-x-fill';
    case 'whatsapp':
      return 'ri-whatsapp-fill';
    case 'threads':
      return 'ri-threads-fill';
    case 'telegram':
      return 'ri-telegram-fill';
    case 'pinterest':
      return 'ri-pinterest-fill';
    case 'snapchat':
      return 'ri-snapchat-fill';
    case 'messenger':
    case 'facebook-messenger':
      return 'ri-messenger-fill';
    default:
      return 'ri-global-fill';
  }
}

export interface ResolvedSocial {
  platform: string;
  icon: string;
  href: string;
  label: string;
}

/**
 * Resolve the social links that should render for a given placement.
 *
 * SINGLE SOURCE OF TRUTH: this reads ONLY the admin-managed `social_links`
 * rows (see useSiteSettings). A link is included only when it is enabled for
 * the placement AND has a real, non-empty URL.
 *
 * There is deliberately NO hardcoded fallback - a disconnected account can
 * therefore never surface a stale, cached or placeholder link.
 */
export function resolveSocialLinks(
  social: SocialLink[] | undefined,
  placement: SocialPlacement,
): ResolvedSocial[] {
  const flagKey = `show_in_${placement}` as keyof SocialLink;
  const seen = new Set<string>();
  const out: ResolvedSocial[] = [];

  for (const s of social || []) {
    if (!s || !s.platform) continue;
    if (!s[flagKey]) continue;
    const url = (s.url || '').trim();
    if (!url) continue;
    const platform = s.platform.toLowerCase().trim();
    if (seen.has(platform)) continue;
    seen.add(platform);
    out.push({ platform, icon: socialIcon(s.platform), href: url, label: s.platform });
  }
  return out;
}