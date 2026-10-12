import { useSiteSettings } from '@/hooks/useSiteSettings';
import { resolveSocialLinks, type SocialPlacement } from '@/lib/socialIcons';

interface SocialLinksProps {
  /** Where these icons are being rendered - drives which configured links show. */
  placement: SocialPlacement;
  /** Tile size. Scales responsively (mobile -> desktop). */
  size?: 'sm' | 'md' | 'lg';
  /** Extra classes for the wrapping flex row (spacing / alignment). */
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<SocialLinksProps['size']>, string> = {
  sm: 'w-8 h-8 text-[15px]',
  md: 'w-9 h-9 md:w-10 md:h-10 text-[17px] md:text-lg',
  lg: 'w-10 h-10 md:w-12 md:h-12 text-lg md:text-xl',
};

/**
 * SocialLinks - the ONE shared renderer for every social icon on the site.
 *
 * It reads the single admin-managed configuration (`social_links`) and renders
 * a solid, consistently-styled tile per platform:
 *   solid background + platform glyph on top + consistent rounding + responsive sizing.
 *
 * Renders nothing when the placement has no configured + active links, so a
 * disconnected account simply disappears - it never falls back to a stale URL.
 */
export default function SocialLinks({ placement, size = 'md', className = '' }: SocialLinksProps) {
  const { social } = useSiteSettings();
  const links = resolveSocialLinks(social, placement);

  if (links.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 md:gap-2.5 ${className}`}>
      {links.map((s) => (
        <a
          key={s.platform}
          href={s.href}
          target="_blank"
          rel="nofollow noreferrer"
          aria-label={s.label}
          title={s.label}
          className={`${SIZE_CLASS[size]} flex items-center justify-center rounded-md bg-primary text-white ring-1 ring-white/20 hover:bg-accent hover:text-white transition-colors duration-200 cursor-pointer shrink-0`}
        >
          <i className={s.icon}></i>
        </a>
      ))}
    </div>
  );
}