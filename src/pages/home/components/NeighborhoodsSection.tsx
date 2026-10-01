import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { smartTitleCase } from '@/lib/location';

interface Tile {
  name: string;
  link: string;
  image: string;
  span: number;
}

interface SectionSettings {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  accent: string;
  card_radius: string;
  overlay_opacity: string;
  tiles: Tile[];
}

const DEFAULT_TILES: Tile[] = [
  { name: 'Karen', link: '/neighbourhood/karen', span: 2, image: '' },
  { name: 'Westlands', link: '/neighbourhood/westlands', span: 1, image: '' },
  { name: 'Kilimani', link: '/neighbourhood/kilimani', span: 1, image: '' },
  { name: 'Lavington', link: '/neighbourhood/lavington', span: 1, image: '' },
  { name: 'Runda', link: '/neighbourhood/runda', span: 1, image: '' },
  { name: 'Muthaiga', link: '/neighbourhood/muthaiga', span: 2, image: '' },
  { name: 'Gigiri', link: '/neighbourhood/gigiri', span: 2, image: '' },
  { name: 'Kileleshwa', link: '/neighbourhood/kileleshwa', span: 1, image: '' },
  { name: 'Kitisuru', link: '/neighbourhood/kitisuru', span: 1, image: '' },
];

const DEFAULT_SETTINGS: SectionSettings = {
  enabled: true,
  eyebrow: 'Explore Our Areas',
  title: 'Nairobi Prime Neighbourhoods',
  subtitle: 'Premium Homes. Select Locations. Expat Representation.',
  cta_text: 'View More Neighbourhoods',
  cta_link: '/neighbourhoods',
  accent: '#C9A84C',
  card_radius: '0',
  overlay_opacity: '58',
  tiles: DEFAULT_TILES,
};

const colClass = (span: number) => (span >= 2 ? 'col-span-2' : 'col-span-1');

export default function NeighborhoodsSection() {
  const [settings, setSettings] = useState<SectionSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.from('site_settings').select('key, value').ilike('key', 'page_neighbourhoods_homepage_%');
        if (!active) return;
        const map: SectionSettings = { ...DEFAULT_SETTINGS, tiles: DEFAULT_TILES };
        if (data) {
          data.forEach((r: { key: string; value: string | null }) => {
            if (r.value === null) return;
            const f = r.key.replace('page_neighbourhoods_homepage_', '');
            if (f === 'enabled') map.enabled = r.value === 'true';
            else if (f === 'tiles') {
              try { const parsed = JSON.parse(r.value); if (Array.isArray(parsed)) map.tiles = parsed; } catch { /* ignore */ }
            } else if (f in map) (map as Record<string, unknown>)[f] = r.value;
          });
        }
        // Enrich tiles with each neighbourhood's real hero image so the section
        // always shows the actual photo instead of a grey placeholder.
        const { data: hoodRows } = await supabase
          .from('neighbourhoods')
          .select('name, slug, hero_image');
        if (!active) return;
        const hoodBySlug: Record<string, string | null> = {};
        (hoodRows || []).forEach((h) => { hoodBySlug[h.slug] = h.hero_image; });
        map.tiles = (map.tiles || []).map((tile) => {
          if (tile.image) return tile;
          const slug = (tile.link.split('/').filter(Boolean).pop() || '').toLowerCase();
          const hero = hoodBySlug[slug] || hoodBySlug[tile.name.toLowerCase()];
          return hero ? { ...tile, image: hero } : tile;
        });
        setSettings(map);
      } catch { /* keep defaults */ }
      setLoaded(true);
    })();
    return () => { active = false; };
  }, []);

  if (!settings.enabled) return null;

  const radius = settings.card_radius ? `${settings.card_radius}px` : undefined;
  const overlay = (Number(settings.overlay_opacity || 58) / 100).toFixed(2);

  const renderTile = (tile: Tile, mobile = false) => (
    <Link
      key={`${tile.name}-${mobile ? 'm' : 'd'}`}
      to={tile.link || '/neighbourhoods'}
      className={`relative overflow-hidden block group cursor-pointer ${colClass(tile.span)}`}
    >
      {tile.image ? (
        <img
          alt={tile.name}
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          src={tile.image}
          title={`${tile.name} neighbourhoods`}
        />
      ) : (
        <div className="w-full h-full bg-[#e8edf2] flex items-center justify-center">
          <i className="ri-image-line text-[#a5b3bf] text-2xl"></i>
        </div>
      )}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black to-black/12 group-hover:from-black/70 group-hover:to-black/25 transition-all duration-500"
        style={{ opacity: Number(overlay) }}
      />
      <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
        <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
          {smartTitleCase(tile.name)}
        </h3>
      </div>
    </Link>
  );

  return (
    <section id="neighborhoods" className="relative bg-white">
      <div className="text-center pt-10 md:pt-16 pb-6 md:pb-8 px-4 md:px-6 lg:px-10">
        {settings.eyebrow && (
          <p className="text-golden text-xs sm:text-sm font-roboto font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em] md:tracking-[0.22em] mb-2 md:mb-3" style={{ color: settings.accent }}>
            {settings.eyebrow}
          </p>
        )}
        <h2 className="font-roboto font-bold text-2xl md:text-3xl text-primary whitespace-nowrap">
          {settings.title}
        </h2>
        <p className="text-golden text-sm sm:text-base md:text-lg font-roboto font-bold uppercase tracking-[0.12em] sm:tracking-[0.16em] md:tracking-[0.2em] mt-2 md:mt-3" style={{ color: settings.accent }}>
          {settings.subtitle}
        </p>
      </div>

      {/* Desktop grid */}
      <div className="hidden md:grid grid-cols-4 gap-0.5 auto-rows-[260px] lg:auto-rows-[300px] xl:auto-rows-[340px] px-4 md:px-8 lg:px-12 xl:px-16">
        {settings.tiles.map((tile) => renderTile(tile))}
      </div>

      {/* Mobile grid */}
      <div className="grid md:hidden grid-cols-2 gap-0.5 auto-rows-[200px] sm:auto-rows-[220px] px-0">
        {settings.tiles.map((tile) => renderTile(tile, true))}
      </div>

      <div className="max-w-6xl mx-auto pt-7 pb-10 md:pt-10 md:pb-16 px-4 md:px-6 lg:px-10 text-center">
        <Link
          to={settings.cta_link || '/neighbourhoods'}
          className="group inline-flex w-full sm:w-auto max-w-full items-center justify-center gap-2 px-5 sm:px-12 py-2.5 border-2 border-[#002349] text-sm sm:text-base font-roboto font-semibold text-[#002349] hover:bg-[#002349] hover:text-white hover:border-[#002349] transition-all duration-200 whitespace-nowrap cursor-pointer"
          style={{ borderRadius: settings.card_radius ? `${settings.card_radius}px` : undefined }}
        >
          <span className="relative">
            {settings.cta_text}
            <span className="absolute left-0 -bottom-1.5 h-[2px] w-0 bg-current transition-all duration-300 group-hover:w-full"></span>
          </span>
          <span className="w-5 h-5 flex items-center justify-center bg-[#002349]/10 group-hover:bg-white/20 transition-colors">
            <i className="ri-arrow-right-line text-xs text-[#002349] group-hover:text-white"></i>
          </span>
        </Link>
      </div>

      {!loaded && <span className="hidden" aria-hidden="true">Loading</span>}
    </section>
  );
}