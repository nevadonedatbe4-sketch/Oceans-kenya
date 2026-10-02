import { Link } from 'react-router-dom';
import { useState, FormEvent } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { resolveSocials } from '@/lib/socialIcons';
import type { HomePageContent, HomeHeroButton } from '@/hooks/useHomePageContent';

const defaultSocialLinks = [
  { icon: 'ri-facebook-fill', href: 'https://www.facebook.com/oceanskenya', label: 'Facebook' },
  { icon: 'ri-instagram-line', href: 'https://www.instagram.com/oceans_estateagents', label: 'Instagram' },
  { icon: 'ri-linkedin-fill', href: 'https://www.linkedin.com/company/oceans-estate-agents', label: 'LinkedIn' },
  { icon: 'ri-youtube-fill', href: 'https://www.youtube.com/@oceanskenya', label: 'YouTube' },
  { icon: 'ri-whatsapp-line', href: 'https://wa.me/254181408186', label: 'WhatsApp' },
];

interface HeroSectionProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  content: HomePageContent;
}

// Group hero buttons into rows of two so the layout stays clean at any count.
function chunkButtons(buttons: HomeHeroButton[]): HomeHeroButton[][] {
  const rows: HomeHeroButton[][] = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  return rows;
}

export default function HeroSection({ onSearch, initialQuery = '', content }: HeroSectionProps) {
  const { social } = useSiteSettings();
  const socialLinks = resolveSocials(social, 'header', defaultSocialLinks);
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  if (!content.hero_visible) return null;

  const overlayStyle = { opacity: Number(content.hero_overlay_opacity || 30) / 100 };
  const heightStyle = { minHeight: typeof window !== 'undefined' && window.innerWidth < 768 ? '70vh' : '100vh' };
  const buttons = content.hero_buttons.filter((b) => b.visible && b.label.trim());

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onSearch(searchQuery.trim());
  };

  return (
    <section className="relative w-full flex items-center justify-center overflow-hidden" style={heightStyle}>
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${content.hero_image})` }}
      ></div>
      {/* Dark overlay */}
      {content.hero_overlay_enabled && (
        <div className="absolute inset-0 bg-black" style={overlayStyle}></div>
      )}

      <div className="relative z-10 w-full px-4 md:px-8 lg:px-16 flex flex-col items-center text-center pt-20 md:pt-32">
        <h1 className="text-white text-[31px] sm:text-[43px] md:text-[52px] lg:text-[60px] mb-2 md:mb-3 font-[Prata,serif] font-normal tracking-[0] leading-[1.2]">
          {content.hero_title}
        </h1>
        {content.hero_subtitle && (
          <p className="mb-3 md:mb-4 font-roboto text-[12.6px] sm:text-[14.4px] md:text-[16.2px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.16em] md:tracking-[0.2em] whitespace-nowrap text-white"
            style={{ textShadow: '0 1px 12px rgba(0,0,0,0.45), 0 0 2px rgba(255,255,255,0.15)' }}
          >
            {content.hero_subtitle}
          </p>
        )}

        {content.hero_social_enabled && (
          <div className="flex items-center gap-3 sm:gap-6 justify-center mb-6 sm:mb-12">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                rel="nofollow noreferrer"
                aria-label={social.label}
                target="_blank"
                className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center hover:text-golden transition-colors duration-300 cursor-pointer text-white"
              >
                <i className={`${social.icon} text-xl sm:text-2xl md:text-3xl`}></i>
              </a>
            ))}
          </div>
        )}

        {content.hero_search_enabled && (
          <form onSubmit={handleSearch} className="w-full max-w-lg mb-6">
            <div className="flex items-stretch gap-0 bg-white/10 backdrop-blur-sm border border-white/50 rounded-none overflow-hidden">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={content.hero_search_placeholder}
                className="flex-1 min-w-0 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/60 focus:outline-none font-roboto"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-golden text-white text-sm font-roboto font-medium hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-search-line mr-1"></i>{content.hero_search_button}
              </button>
            </div>
          </form>
        )}

        {/* === Hero CTA Buttons — backend-managed list === */}
        {buttons.length > 0 && (
          <div className="flex flex-col items-center gap-2 sm:gap-3 w-full max-w-[380px] sm:max-w-[460px]">
            {chunkButtons(buttons).map((row, rowIdx) => (
              <div key={rowIdx} className="flex w-full gap-2 sm:gap-3">
                {row.map((btn) => (
                  <Link
                    key={`${btn.label}-${btn.link}`}
                    to={btn.link || '/all-properties'}
                    className={`${row.length > 1 ? 'flex-1' : 'w-full'} text-center whitespace-nowrap cursor-pointer bg-black/45 text-white border-[3px] border-white hover:bg-primary/70 hover:text-white transition-all duration-300 py-2 sm:py-2.5 px-2 text-sm sm:text-base font-roboto font-bold tracking-[0.3em] uppercase`}
                  >
                    {btn.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}