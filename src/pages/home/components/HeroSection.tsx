import { Link } from 'react-router-dom';
import { useState, FormEvent } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { resolveSocials } from '@/lib/socialIcons';

const defaultSocialLinks = [
  { icon: 'ri-facebook-fill', href: 'https://www.facebook.com/oceanskenya', label: 'Facebook' },
  { icon: 'ri-instagram-line', href: 'https://www.instagram.com/oceans_estateagents', label: 'Instagram' },
  { icon: 'ri-linkedin-fill', href: 'https://www.linkedin.com/company/oceans-estate-agents', label: 'LinkedIn' },
  { icon: 'ri-youtube-fill', href: 'https://www.youtube.com/@oceanskenya', label: 'YouTube' },
  { icon: 'ri-whatsapp-line', href: 'https://wa.me/254703712984', label: 'WhatsApp' },
];

interface HeroSectionProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

export default function HeroSection({ onSearch, initialQuery = '' }: HeroSectionProps) {
  const { getHero, social } = useSiteSettings();
  const socialLinks = resolveSocials(social, 'header', defaultSocialLinks);
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const heroOverlay = getHero('hero_show_overlay') !== 'false';
  const heroSearch = getHero('hero_show_search') === 'true';
  const heroOverlayOpacity = getHero('hero_overlay_opacity') || '30';

  const overlayStyle = { opacity: Number(heroOverlayOpacity) / 100 };
  const heightStyle = { minHeight: typeof window !== 'undefined' && window.innerWidth < 768 ? '70vh' : '100vh' };

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
        style={{
          backgroundImage: 'url(https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/0551756e-243c-46c5-96d2-b607627173aa_oceans-ke-vip.jpg?v=db7f5a56d803035ed38b44c637e62fbc)',
        }}
      ></div>
      {/* Dark overlay */}
      {heroOverlay && (
        <div className="absolute inset-0 bg-black" style={overlayStyle}></div>
      )}

      <div className="relative z-10 w-full px-4 md:px-8 lg:px-16 flex flex-col items-center text-center pt-20 md:pt-32">
        <h1 className="text-white text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-2 md:mb-3 font-[Prata,serif] font-normal tracking-[0] leading-[1.2]">
          Oceans
        </h1>
        <p className="mb-3 md:mb-4 font-roboto text-sm sm:text-base md:text-lg font-bold uppercase tracking-[0.12em] sm:tracking-[0.16em] md:tracking-[0.2em] whitespace-nowrap text-white"
          style={{ textShadow: '0 1px 12px rgba(0,0,0,0.45), 0 0 2px rgba(255,255,255,0.15)' }}
        >
          Estate &amp; Letting Agent
        </p>

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

        {heroSearch && (
          <form onSubmit={handleSearch} className="w-full max-w-lg mb-6">
            <div className="flex items-stretch gap-0 bg-white/10 backdrop-blur-sm border border-white/50 rounded-none overflow-hidden">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by location, property type..."
                className="flex-1 min-w-0 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/60 focus:outline-none font-roboto"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-golden text-white text-sm font-roboto font-medium hover:bg-golden/90 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-search-line mr-1"></i>Search
              </button>
            </div>
          </form>
        )}

        {/* === Hero CTA Buttons — Oceans reference style === */}
        <div className="flex flex-col items-center gap-2 sm:gap-3 w-full max-w-[380px] sm:max-w-[460px]">
          <div className="flex w-full gap-2 sm:gap-3">
            <Link
              to="/rent"
              className="flex-1 text-center whitespace-nowrap cursor-pointer bg-black/45 text-white border-[3px] border-white hover:bg-golden hover:border-golden hover:text-white transition-all duration-300 py-2 sm:py-2.5 px-2 text-sm sm:text-base font-roboto font-bold tracking-[0.3em] uppercase"
            >
              Rent
            </Link>
            <Link
              to="/buy"
              className="flex-1 text-center whitespace-nowrap cursor-pointer bg-black/45 text-white border-[3px] border-white hover:bg-golden hover:border-golden hover:text-white transition-all duration-300 py-2 sm:py-2.5 px-2 text-sm sm:text-base font-roboto font-bold tracking-[0.3em] uppercase"
            >
              Buy
            </Link>
          </div>
          <Link
            to="/valuation"
            className="w-full text-center whitespace-nowrap cursor-pointer bg-black/45 text-white border-[3px] border-white hover:bg-golden hover:border-golden hover:text-white transition-all duration-300 py-2 sm:py-2.5 px-2 text-sm sm:text-base font-roboto font-bold tracking-[0.3em] uppercase"
          >
            Evaluation
          </Link>
        </div>
      </div>
    </section>
  );
}