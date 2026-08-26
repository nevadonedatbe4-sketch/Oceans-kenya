import { PropertyPageHero } from '@/hooks/usePropertyPageSettings';

interface Props {
  hero: PropertyPageHero | null;
  defaultEyebrow?: string;
  defaultTitle?: string;
  defaultSubtitle?: string;
}

export default function ListingHero({ hero, defaultEyebrow, defaultTitle, defaultSubtitle }: Props) {
  // Show nothing during loading (hero is null)
  if (!hero) return null;

  const eyebrow = hero.eyebrow || defaultEyebrow || '';
  const title = hero.title || defaultTitle || '';
  const subtitle = hero.subtitle || defaultSubtitle || '';

  // Only render if there's at least some content
  if (!eyebrow && !title && !subtitle && !hero.bgImage) return null;

  return (
    <section className="relative w-full h-[210px] md:h-[250px] overflow-hidden">
      {/* Background image */}
      {hero.bgImage ? (
        <img
          src={hero.bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-[#1a1a2e]" />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        {eyebrow && (
          <p
            style={{
              fontWeight: hero.eyebrowWeight || '400',
              fontSize: `clamp(10px, 2vw, ${hero.eyebrowSize || '12'}px)`,
              letterSpacing: `${hero.eyebrowSpacing || '0.3'}em`,
              textTransform: (hero.eyebrowTransform || 'uppercase') as any,
              fontFamily: hero.eyebrowFont || undefined,
              color: '#C9A84C',
            }}
            className="mb-2 w-full max-w-3xl px-2"
          >
            {eyebrow}
          </p>
        )}
        {title && (
          <h1
            style={{
              fontFamily: hero.titleFont || undefined,
              fontWeight: hero.titleWeight || '400',
              fontSize: `clamp(20px, 5vw, ${hero.titleSize || '48'}px)`,
              letterSpacing: `${hero.titleSpacing || '0'}em`,
              lineHeight: hero.titleLineHeight || '1.2',
              textTransform: (hero.titleTransform || 'none') as any,
              color: '#FFFFFF',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
            className="mb-3 w-full max-w-3xl px-2"
          >
            {title}
          </h1>
        )}
        {subtitle && (
          <p
            style={{
              fontFamily: hero.subtitleFont || undefined,
              fontWeight: hero.subtitleWeight || '400',
              fontSize: `clamp(11px, 2.5vw, ${hero.subtitleSize || '14'}px)`,
              letterSpacing: `${hero.subtitleSpacing || '0'}em`,
              lineHeight: hero.subtitleLineHeight || '1.5',
              color: 'rgba(255,255,255,0.7)',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
            className="w-full max-w-2xl px-2"
          >
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}