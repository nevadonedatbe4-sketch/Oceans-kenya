import { Link } from 'react-router-dom';

export interface HeroMetaItem {
  icon: string;
  label: string;
  value: string;
  /** Optional internal link - when present the chip becomes a link. */
  href?: string;
}

interface BlogHeroProps {
  eyebrow: string;
  title: string;
  category?: string;
  featuredImage?: string | null;
  dek?: string;
  meta?: HeroMetaItem[];
}

/**
 * Editorial destination-guide hero.
 *
 * A single large image with a dark, readable overlay; the destination title,
 * a short editorial descriptor and a row of useful, real-only metadata chips
 * (city, type, updated, homes). Callers must not pass placeholder values - if a
 * value does not exist, the chip is simply not rendered.
 */
export default function BlogHero({
  title,
  category,
  featuredImage,
  dek,
  meta = [],
}: BlogHeroProps) {
  const image = (featuredImage || '').trim();

  return (
    <section className="relative isolate overflow-hidden bg-primary pt-20 md:pt-40 lg:pt-44">
      {image && (
        <img
          src={image}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/85 to-primary/55"></div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-primary via-primary/70 to-transparent"></div>

      <div className="relative w-full max-w-6xl mx-auto px-4 md:px-6 pb-10 md:pb-16 min-h-[300px] md:min-h-[520px] flex flex-col justify-end">
        {category && (
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <span className="inline-flex items-center px-2.5 py-1 bg-white/15 backdrop-blur-sm text-white text-[11px] font-jost font-semibold uppercase tracking-[0.1em]">
              {category}
            </span>
          </div>
        )}

        <h1 className="font-prata font-bold text-white text-[23px] sm:text-[25px] md:text-[42px] lg:text-[48px] leading-[1.15] max-w-4xl mb-4 md:mb-5">
          {title}
        </h1>

        {dek && (
          <p className="font-roboto text-white/85 text-[13px] md:text-[16px] leading-[1.65] max-w-2xl">
            {dek}
          </p>
        )}

        {meta.length > 0 && (
          <div className="mt-7 pt-6 border-t border-white/20 flex flex-wrap gap-x-8 gap-y-4">
            {meta.map((item) =>
              item.href ? (
                <Link
                  key={item.label}
                  to={item.href}
                  className="group flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 text-white shrink-0">
                    <i className={`${item.icon} text-[15px]`}></i>
                  </span>
                  <span className="leading-tight">
                    <span className="block font-roboto text-white/55 text-[10px] uppercase tracking-[0.14em]">
                      {item.label}
                    </span>
                    <span className="block font-roboto text-white text-[13px] md:text-[14px] font-medium group-hover:text-golden transition-colors whitespace-nowrap">
                      {item.value}
                    </span>
                  </span>
                </Link>
              ) : (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 text-white shrink-0">
                    <i className={`${item.icon} text-[15px]`}></i>
                  </span>
                  <span className="leading-tight">
                    <span className="block font-roboto text-white/55 text-[10px] uppercase tracking-[0.14em]">
                      {item.label}
                    </span>
                    <span className="block font-roboto text-white text-[13px] md:text-[14px] font-medium whitespace-nowrap">
                      {item.value}
                    </span>
                  </span>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}