import type { SocialLink } from '@/hooks/useSiteSettings';

// Map a platform name -> Remix icon class (matches the admin Social Media manager)
export function socialIcon(platform: string): string {
  switch (platform.toLowerCase().trim()) {
    case 'facebook':
      return 'ri-facebook-fill';
    case 'instagram':
      return 'ri-instagram-line';
    case 'tiktok':
      return 'ri-linkedin-fill';
    case 'linkedin':
      return 'ri-linkedin-fill';
    case 'youtube':
      return 'ri-youtube-fill';
    case 'twitter':
    case 'x':
      return 'ri-twitter-x-fill';
    case 'whatsapp':
      return 'ri-whatsapp-line';
    default:
      return 'ri-global-line';
  }
}

export interface ResolvedSocial {
  icon: string;
  href: string;
  label: string;
}

// Build a display list from admin-managed social links, filtered by placement.
// Falls back to the provided defaults when nothing is configured for that placement.
export function resolveSocials(
  social: SocialLink[] | undefined,
  placement: 'header' | 'footer' | 'contact',
  defaults: ResolvedSocial[],
): ResolvedSocial[] {
  const flagKey =
    placement === 'header' ? 'show_in_header' : placement === 'footer' ? 'show_in_footer' : 'show_in_contact';
  const managed = (social || [])
    .filter((s) => (s as unknown as Record<string, boolean>)[flagKey] && s.url && s.url.trim())
    .map((s) => ({ icon: socialIcon(s.platform), href: s.url as string, label: s.platform }));
  return managed.length > 0 ? managed : defaults;
}