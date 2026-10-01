import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useNeighbourhoods } from '@/hooks/useNeighbourhoods';
import type { DBNeighbourhood } from '@/hooks/useNeighbourhoods';
import Reveal from '@/components/feature/Reveal';
import Header from '@/components/feature/Header';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import PageBreadcrumbTrail from '@/components/feature/PageBreadcrumbTrail';
import PageContactSection from '@/components/feature/PageContactSection';
import EntityImage from '@/components/feature/EntityImage';
import { supabase } from '@/lib/supabase';
import { useAmenities } from '@/hooks/useAmenities';
import { countAmenitiesNearby, type AmenityCounts } from '@/lib/amenities';
import { AREA_GUIDE_PAGES } from '@/lib/areaGuides';
import { areaSearchHref } from '@/lib/areaSearch';
import HoodFilterBar from '@/pages/Neighbourhoods/components/HoodFilterBar';
import QuickDecisionGuide from '@/pages/Neighbourhoods/components/QuickDecisionGuide';
import { useImageFocalPoint } from '@/hooks/useImageFocalPoint';

// Prefer the SEO area-guide cluster page when one exists for this slug,
// otherwise fall back to the DB neighbourhood detail page.
function areaGuideHref(slug: string): string {
  return AREA_GUIDE_PAGES[`area-guides/${slug}`]
    ? `/area-guides/${slug}`
    : `/neighbourhood/${slug}`;
}

// Editable tag pill style - overridable from the CMS (Neighbourhoods Page → Styling tab)
interface TagStyle {
  textColor: string;
  fontSize: string; // px
  radius: string; // px corner rounding
  padX: string; // px horizontal padding
  padY: string; // px vertical padding
  tracking: string; // em letter-spacing
  weight: string; // font-weight
}

const DEFAULT_TAG_STYLE: TagStyle = {
  textColor: '#FFFFFF',
  fontSize: '11',
  radius: '0',
  padX: '8',
  padY: '2',
  tracking: '0.06',
  weight: '600',
};

// Tag keyword -> colour-category mapping (overridable from the CMS).
// Any tag listed here wins over the automatic keyword matcher below.
type TagMap = Record<string, string>;

const DEFAULT_TAG_MAP: TagMap = {};

// Blog category -> colour (editable, falls back to a semantic slot colour).
type BlogCatColors = Record<string, string>;

const DEFAULT_BLOG_CATEGORY_COLORS: BlogCatColors = {
  'Area Guides': '#F6A21E',
  'Market Trends': '#3E6B8A',
  'Schools & Family': '#1F7A6E',
  'Lifestyle & Dining': '#6B4423',
};

function getTagPillStyle(style: TagStyle): React.CSSProperties {
  return {
    color: style.textColor,
    fontSize: `${style.fontSize}px`,
    padding: `${style.padY}px ${style.padX}px`,
    borderRadius: `${style.radius}px`,
    letterSpacing: `${style.tracking}em`,
    fontWeight: Number(style.weight) || 600,
  };
}

function nz(v: string | null | undefined, fallback: string): string {
  return v !== undefined && v !== null && v !== '' ? v : fallback;
}

// Semantic tag -> Land + Sea palette background colour (all pills use white text)
interface TagColorOverrides {
  green: string;
  luxury: string;
  wealthy: string;
  family: string;
  young: string;
  gated: string;
  modern: string;
  default: string;
}

const DEFAULT_TAG_COLORS: TagColorOverrides = {
  green: '#2C5E1A',
  luxury: '#E55B13',
  wealthy: '#F6A21E',
  family: '#1F7A6E',
  young: '#7A871E',
  gated: '#3E6B8A',
  modern: '#32CD30',
  default: '#6B4423',
};

function getTagColorHex(
  tag: string,
  colors: TagColorOverrides = DEFAULT_TAG_COLORS,
  tagMap: TagMap = DEFAULT_TAG_MAP
): string {
  const t = tag.toLowerCase();
  const mapped = tagMap[t];
  if (mapped && colors[mapped as keyof TagColorOverrides]) {
    return colors[mapped as keyof TagColorOverrides];
  }
  // Green / nature / views -> forest green
  if (/(green|leafy|park|garden|arboretum|plant|nature|tree|view|scenic|panoramic|hill|ridge)/.test(t)) return colors.green;
  // Luxury / exclusive / prestige / historic -> red-orange terracotta
  if (/(luxury|prestigious|premium|ultra|exclusive|private|elite|historic|heritage|established|old|colonial)/.test(t)) return colors.luxury;
  // Wealthy / investment / nightlife / social -> vibrant orange
  if (/(wealthy|upscale|investment|affluent|prime|nightlife|entertainment|bar|club|social)/.test(t)) return colors.wealthy;
  // Family / schools / diplomatic / international -> sea teal
  if (/(family|school|kid|child|nursery|education|diplomatic|international|expat|embassy|\bun\b|consulate)/.test(t)) return colors.family;
  // Young professionals / value / emerging -> olive lime
  if (/(young|professional|starter|value|emerging|affordable|budget)/.test(t)) return colors.young;
  // Gated / secure / corporate / urban / hospitals -> weathered steel blue
  if (/(gated|secure|safety|safe|compound|corporate|business|bank|executive|office|commercial|central|urban|city|downtown|cbd|metro|northern|suburban|residential|quiet|peaceful|hospital|medical|health|clinic)/.test(t)) return colors.gated;
  // Modern / new / development -> bright lime
  if (/(modern|contemporary|new|development)/.test(t)) return colors.modern;
  // Default -> chocolate
  return colors.default;
}

const BLOG_CATEGORY_SLOTS: Record<string, keyof TagColorOverrides> = {
  'Area Guides': 'wealthy',
  'Market Trends': 'gated',
  'Schools & Family': 'family',
  'Lifestyle & Dining': 'default',
};

function getBlogCategoryColorHex(
  category: string | null,
  colors: TagColorOverrides,
  blogColors: BlogCatColors = DEFAULT_BLOG_CATEGORY_COLORS,
  tagMap: TagMap = DEFAULT_TAG_MAP
): string {
  if (category && blogColors[category]) return blogColors[category];
  if (category && BLOG_CATEGORY_SLOTS[category]) return colors[BLOG_CATEGORY_SLOTS[category]];
  return getTagColorHex(category || '', colors, tagMap);
}

interface NeighbourhoodComparison {
  slug: string;
  name: string;
  tagline: string;
  safety: { rating: number; description: string; note?: string };
  vibe: string;
  bestFor: string[];
  pros: string[];
  cons: string[];
  priceRange: string;
  rentalRange: string;
  typicalRent1BR: string;
  walkability: { rating: number; description: string; note?: string };
  nightlife: { rating: number; description: string; note?: string };
  familyFriendliness: { rating: number; description: string; note?: string };
  greenSpace: { rating: number; description: string; note?: string };
  valueForMoney: { rating: number; description: string; note?: string };
  prestige: { rating: number; description: string; note?: string };
  accessibility: { rating: number; description: string; note?: string };
  rentalYield: { rating: number; description: string; note?: string };
  schoolAccess: { rating: number; description: string; note?: string };
  healthAccess: { rating: number; description: string; note?: string };
  verdict: string;
}

type TabKey = 'neighbourhoods' | 'guides' | 'blog' | 'compare';
type FilterKey =
  | 'all'
  | 'luxury'
  | 'affordable-luxury'
  | 'family'
  | 'urban'
  | 'diplomatic'
  | 'green'
  | 'investment'
  | 'young-professionals'
  | 'secure'
  | 'nightlife';
type BlogCategoryKey = 'all' | 'Area Guides' | 'Market Trends' | 'Schools & Family' | 'Lifestyle & Dining';

// ── Neighbourhood category filters ────────────────────────────
const hasAnyTag = (tags: string[], keywords: string[]) =>
  tags.some((t) => keywords.some((k) => t.includes(k)));

interface HoodFilter {
  key: FilterKey;
  label: string;
  matches: (tags: string[]) => boolean;
}

const HOOD_FILTERS: HoodFilter[] = [
  { key: 'all', label: 'All Areas', matches: () => true },
  {
    key: 'luxury',
    label: 'Luxury & Prestige',
    matches: (t) =>
      hasAnyTag(t, ['luxury', 'ultra-exclusive', 'wealthy', 'upscale', 'exclusive', 'established', 'historic', 'executive', 'prestigious', 'premium']),
  },
  {
    key: 'affordable-luxury',
    label: 'Affordable Luxury',
    matches: (t) => hasAnyTag(t, ['value']) && hasAnyTag(t, ['views', 'investment']),
  },
  {
    key: 'family',
    label: 'Family & Schools',
    matches: (t) => hasAnyTag(t, ['family', 'school']),
  },
  {
    key: 'urban',
    label: 'Urban Convenience',
    matches: (t) => hasAnyTag(t, ['urban', 'central', 'corporate', 'banking', 'modern', 'skyscrapers']),
  },
  {
    key: 'diplomatic',
    label: 'Diplomatic & Expat',
    matches: (t) => hasAnyTag(t, ['diplomatic', 'international', 'expat']),
  },
  {
    key: 'green',
    label: 'Green & Leafy',
    matches: (t) => hasAnyTag(t, ['green', 'leafy', 'nature', 'park', 'garden', 'tree']),
  },
  {
    key: 'investment',
    label: 'Investment & Value',
    matches: (t) => hasAnyTag(t, ['investment', 'value', 'emerging']),
  },
  {
    key: 'young-professionals',
    label: 'Young Professionals',
    matches: (t) => hasAnyTag(t, ['young professional']),
  },
  {
    key: 'secure',
    label: 'Secure & Gated',
    matches: (t) => hasAnyTag(t, ['secure', 'gated', 'private', 'safe']),
  },
  {
    key: 'nightlife',
    label: 'Nightlife & Social',
    matches: (t) => hasAnyTag(t, ['nightlife', 'entertainment', 'club', 'bar']),
  },
];

// ── Compare helpers ──────────────────────────────────────────
const clampRating = (n: number) => Math.max(1, Math.min(5, Math.round(n)));

function formatKshPrice(value: number): string {
  if (value >= 1_000_000_000) return `KSh ${(value / 1_000_000_000).toFixed(1)} B`;
  if (value >= 1_000_000) return `KSh ${Math.round(value / 1_000_000)} M`;
  if (value >= 1_000) return `KSh ${Math.round(value / 1_000)} K`;
  return `KSh ${Math.round(value)}`;
}

function parseLowerRent(rental: string | null): string {
  if (!rental) return 'On request';
  const nums = rental.match(/[\d,]+/g);
  if (nums && nums.length) {
    const low = parseInt(nums[0].replace(/,/g, ''), 10);
    if (low) return `KSh ${low.toLocaleString()}`;
  }
  return rental;
}

function describeRating(r: number, high: string, low: string): string {
  if (r >= 5) return `Excellent - ${high}`;
  if (r >= 4) return `Strong - ${high}`;
  if (r >= 3) return `Good - ${low}`;
  if (r >= 2) return `Moderate - ${low}`;
  return `Limited - ${low}`;
}

function buildComparisonFromNeighbourhood(h: DBNeighbourhood): NeighbourhoodComparison {
  const tags = (h.tags || []).map((t) => t.toLowerCase());
  const has = (...keys: string[]) => tags.some((t) => keys.some((k) => t.includes(k)));
  // A stored 0 is not a real price - treat it as missing so the comparison
  // shows "Price on request" instead of "KSh 0".
  const price =
    h.average_sale_price != null && Number(h.average_sale_price) > 0
      ? Number(h.average_sale_price)
      : null;

  const rating = (key: string): number => {
    let r = 3;
    switch (key) {
      case 'safety':
        if (has('secure', 'gated', 'private', 'exclusive')) r = 5;
        else if (has('luxury', 'diplomatic', 'ultra-exclusive', 'international', 'historic', 'established')) r = 4;
        else if (has('urban', 'nightlife', 'investment')) r = 2;
        break;
      case 'greenSpace':
        if (has('green', 'leafy', 'suburban', 'arboretum')) r = 5;
        else if (has('family', 'diplomatic', 'exclusive')) r = 4;
        else if (has('urban', 'skyscrapers', 'banking', 'corporate')) r = 2;
        break;
      case 'nightlife':
        if (has('nightlife')) r = 5;
        else if (has('urban', 'young professionals', 'entertainment')) r = 4;
        else if (has('suburban', 'family', 'green', 'gated', 'diplomatic', 'historic')) r = 1;
        else r = 2;
        break;
      case 'familyFriendliness':
        if (has('family', 'schools', 'international schools')) r = 5;
        else if (has('green', 'gated', 'suburban', 'secure')) r = 4;
        else if (has('nightlife', 'young professionals', 'corporate', 'banking')) r = 2;
        break;
      case 'valueForMoney':
        if (has('value', 'emerging')) r = 5;
        else if (price != null && price < 50_000_000) r = 5;
        else if (price != null && price < 80_000_000) r = 4;
        else if (price != null && price > 150_000_000) r = 2;
        else r = 3;
        break;
      case 'prestige':
        if (has('ultra-exclusive', 'luxury', 'wealthy', 'historic')) r = 5;
        else if (has('upscale', 'diplomatic', 'exclusive', 'established')) r = 4;
        else if (has('value', 'emerging', 'budget')) r = 2;
        break;
      case 'accessibility':
        if (has('central', 'urban', 'cbd', 'corporate', 'banking')) r = 5;
        else if (has('northern', 'investment', 'hospitals')) r = 4;
        else if (has('green', 'suburban', 'exclusive', 'private')) r = 2;
        break;
      case 'walkability':
        if (has('urban', 'central', 'cbd', 'corporate')) r = 5;
        else if (has('investment', 'young professionals', 'hospitals', 'banking')) r = 4;
        else if (has('suburban', 'green', 'gated', 'private', 'exclusive')) r = 2;
        break;
      case 'rentalYield':
        if (has('investment', 'value', 'young professionals')) r = 5;
        else if (has('urban', 'central')) r = 4;
        else if (has('ultra-exclusive', 'luxury')) r = 2;
        break;
      case 'schoolAccess':
        if (has('international schools', 'schools')) r = 5;
        else if (has('family', 'diplomatic', 'expat')) r = 4;
        else if (has('urban', 'nightlife', 'corporate')) r = 2;
        break;
      case 'healthAccess':
        if (has('hospitals')) r = 5;
        else if (has('central', 'urban', 'upscale')) r = 4;
        else if (has('suburban', 'green', 'private')) r = 3;
        break;
    }
    return clampRating(r);
  };

  const dim = (key: string, high: string, low: string) => {
    const r = rating(key);
    return { rating: r, description: describeRating(r, high, low) };
  };

  const proGroups: [string[], string][] = [
    [['luxury', 'ultra-exclusive', 'wealthy', 'upscale'], 'Prestigious and sought-after'],
    [['secure', 'gated', 'private', 'exclusive'], 'Strong security and privacy'],
    [['green', 'leafy', 'arboretum'], 'Lush, green surroundings'],
    [['family', 'schools', 'international schools'], 'Excellent family & school options'],
    [['diplomatic', 'international', 'expat'], 'Diplomatic & expat community'],
    [['investment', 'value', 'emerging'], 'Strong investment potential'],
    [['central', 'urban', 'corporate', 'banking'], 'Central and well-connected'],
    [['nightlife', 'young professionals', 'entertainment'], 'Vibrant lifestyle & entertainment'],
    [['hospitals'], 'Close to healthcare facilities'],
  ];
  const pros = proGroups.filter(([keys]) => has(...keys)).map(([, label]) => label);
  const finalPros = pros.length ? pros.slice(0, 5) : ['Desirable Nairobi address'];

  const cons: string[] = [];
  if (price != null && price > 100_000_000) cons.push('Premium pricing limits entry');
  if (has('urban', 'nightlife')) cons.push('Can be busy and noisy');
  if (has('green', 'suburban', 'private')) cons.push('Car-dependent with limited walkability');
  if (has('luxury', 'ultra-exclusive')) cons.push('Lower rental yields for high-end homes');
  if (cons.length === 0) cons.push('Few notable drawbacks');

  const bestFor = h.target_market
    ? h.target_market.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5)
    : tags.slice(0, 5);
  const finalBestFor = bestFor.length ? bestFor : ['A range of buyers'];

  const tagline = h.vibe || h.summary || 'A sought-after Nairobi neighbourhood';
  const verdict = `${h.name} is ${(h.vibe || 'a well-regarded area').toLowerCase()}, best suited to ${finalBestFor[0].toLowerCase()}.`;

  return {
    slug: h.slug,
    name: h.name,
    tagline,
    safety: dim('safety', 'safe and secure', 'safety level'),
    vibe: h.vibe || 'A well-established Nairobi neighbourhood',
    bestFor: finalBestFor,
    pros: finalPros,
    cons,
    priceRange: price != null ? formatKshPrice(price) : 'Price on request',
    rentalRange: h.rental_range_kes || 'Rent on request',
    typicalRent1BR: `from ${parseLowerRent(h.rental_range_kes)}`,
    walkability: dim('walkability', 'walkable streets', 'walkability'),
    nightlife: dim('nightlife', 'vibrant nightlife', 'nightlife scene'),
    familyFriendliness: dim('familyFriendliness', 'family-friendly', 'family appeal'),
    greenSpace: dim('greenSpace', 'green space', 'green space'),
    valueForMoney: dim('valueForMoney', 'value for money', 'value'),
    prestige: dim('prestige', 'prestigious', 'prestige'),
    accessibility: dim('accessibility', 'well-connected', 'accessibility'),
    rentalYield: dim('rentalYield', 'rental yield', 'rental yield'),
    schoolAccess: dim('schoolAccess', 'school access', 'school access'),
    healthAccess: dim('healthAccess', 'healthcare access', 'healthcare access'),
    verdict,
  };
}

function NeighbourhoodSearchSelect({
  label,
  value,
  options,
  excludedSlug,
  onChange,
}: {
  label: string;
  value: string;
  options: NeighbourhoodComparison[];
  excludedSlug?: string;
  onChange: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.slug === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = options.filter((o) => o.slug !== excludedSlug);
    if (!q) return base;
    return base.filter(
      (o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q)
    );
  }, [options, excludedSlug, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = open ? query : selected ? selected.name : '';

  return (
    <div ref={containerRef} className="relative">
      <label className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] block mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          placeholder={selected ? selected.name : 'Type or select a neighbourhood...'}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
          }}
          className="w-full pl-3 pr-8 py-2.5 border-[3px] border-[#1a1a1a]/20 rounded-sm text-[15px] font-roboto text-[#1a1a1a] bg-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
        />
        <i className="ri-arrow-down-wide-fill absolute right-2.5 top-1/2 -translate-y-1/2 text-[#636363] text-base pointer-events-none"></i>
      </div>
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border-2 border-[#1a1a1a]/10 rounded-sm">
          {filtered.length === 0 ? (
            <div className="px-3 py-2.5 text-sm font-roboto text-[#636363]">No matches</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.slug}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o.slug);
                  setOpen(false);
                  setQuery('');
                }}
                className={`w-full text-left px-3 py-2.5 text-[15px] font-roboto cursor-pointer transition-colors whitespace-nowrap ${
                  o.slug === value
                    ? 'bg-primary/5 text-primary font-medium'
                    : 'text-[#1a1a1a] hover:bg-[#F5F5F5]'
                }`}
              >
                {o.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function RatingBar({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-5 h-1.5 rounded-sm transition-colors ${
            i < rating ? 'bg-primary' : 'bg-[#1a1a1a]/10'
          }`}
        />
      ))}
    </div>
  );
}

function ComparisonCard({
  data,
  isWinner,
  winnerLabel,
}: {
  data: NeighbourhoodComparison;
  isWinner?: boolean;
  winnerLabel?: string;
}) {
  return (
    <div className={`flex-1 min-w-0 ${isWinner ? 'ring-1 ring-[#0D5959]/40' : ''}`}>
      {isWinner && winnerLabel && (
        <div className="bg-[#0D5959]/10 text-[#0D5959] text-xs font-jost font-semibold uppercase tracking-[0.1em] text-center py-2">
          {winnerLabel}
        </div>
      )}
      <div className="bg-white border-2 border-[#1a1a1a]/10 p-5 md:p-6 h-full">
        <div className="mb-4">
          <h3 className="font-prata font-semibold text-primary text-[23px] mb-0.5">{data.name}</h3>
          <p className="font-roboto text-[15px] text-[#636363] leading-relaxed">{data.tagline}</p>
        </div>

        {/* Price */}
        <div className="mb-4 pb-4 border-b-2 border-[#1a1a1a]/10">
          <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-1">Price Range</p>
          <p className="font-roboto text-sm font-semibold text-[#1a1a1a]">{data.priceRange}</p>
          <p className="font-roboto text-sm text-[#636363] mt-0.5">Rent: {data.rentalRange}</p>
          <p className="font-roboto text-sm text-[#636363]">1BR: {data.typicalRent1BR}</p>
        </div>

        {/* Dimensions */}
        <div className="space-y-3">
          {[
            { key: 'safety' as const, label: 'Safety' },
            { key: 'walkability' as const, label: 'Walkability' },
            { key: 'nightlife' as const, label: 'Nightlife' },
            { key: 'familyFriendliness' as const, label: 'Family-Friendly' },
            { key: 'greenSpace' as const, label: 'Green Space' },
            { key: 'valueForMoney' as const, label: 'Value for Money' },
            { key: 'prestige' as const, label: 'Prestige' },
            { key: 'accessibility' as const, label: 'Accessibility' },
            { key: 'rentalYield' as const, label: 'Rental Yield' },
            { key: 'schoolAccess' as const, label: 'Schools' },
            { key: 'healthAccess' as const, label: 'Healthcare' },
          ].map(({ key, label }) => {
            const dim = data[key];
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="font-roboto text-sm font-medium text-[#1a1a1a]">{label}</p>
                  <RatingBar rating={dim.rating} />
                </div>
                <p className="font-roboto text-sm text-[#636363] leading-relaxed">{dim.description}</p>
                {dim.note && (
                  <p className="font-roboto text-sm text-[#1a1a1a] font-medium mt-0.5">{dim.note}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Best For */}
        <div className="mt-4 pt-4 border-t-2 border-[#1a1a1a]/10">
          <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-1.5">Best For</p>
          <div className="flex flex-wrap gap-1">
            {data.bestFor.slice(0, 5).map((b) => (
              <span key={b} className="px-2 py-0.5 bg-[#F5F5F5] text-[11px] font-jost text-[#1a1a1a] uppercase tracking-[0.08em] border-2 border-[#1a1a1a]/10">
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Pros & Cons */}
        <div className="mt-4 pt-4 border-t-2 border-[#1a1a1a]/10">
          <div className="mb-3">
            <p className="font-jost text-[#088135] text-xs uppercase tracking-[0.1em] mb-1 font-semibold">Pros</p>
            <ul className="space-y-0.5">
              {data.pros.map((p) => (
                <li key={p} className="flex items-start gap-1.5">
                  <i className="ri-check-line text-[#088135] text-xs mt-0.5 shrink-0"></i>
                  <span className="font-roboto text-sm text-[#636363] leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-jost text-rose-500 text-xs uppercase tracking-[0.1em] mb-1 font-semibold">Cons</p>
            <ul className="space-y-0.5">
              {data.cons.map((c) => (
                <li key={c} className="flex items-start gap-1.5">
                  <i className="ri-close-line text-rose-400 text-xs mt-0.5 shrink-0"></i>
                  <span className="font-roboto text-sm text-[#636363] leading-relaxed">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Verdict */}
        <div className="mt-4 pt-4 border-t-2 border-[#1a1a1a]/10">
          <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-1">Verdict</p>
          <p className="font-roboto text-sm text-[#636363] leading-relaxed">{data.verdict}</p>
        </div>
      </div>
    </div>
  );
}

function FloatingScrollArrows({
  showPrev,
  showNext,
  onPrev,
  onNext,
}: {
  showPrev: boolean;
  showNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (!showPrev && !showNext) return null;
  return (
    <div className="md:hidden absolute -top-10 right-1 flex items-center gap-1.5 z-10">
      {showPrev && (
        <button
          onClick={onPrev}
          aria-label="Scroll back"
          className="w-7 h-11 flex items-center justify-center rounded-md bg-white/90 text-primary border border-[#1a1a1a]/10 hover:bg-white transition-colors cursor-pointer"
        >
          <i className="ri-arrow-left-s-line text-lg leading-none"></i>
        </button>
      )}
      {showNext && (
        <button
          onClick={onNext}
          aria-label="Scroll next"
          className="w-7 h-11 flex items-center justify-center rounded-md bg-white/90 text-primary border border-[#1a1a1a]/10 hover:bg-white transition-colors cursor-pointer"
        >
          <i className="ri-arrow-right-s-line text-lg leading-none"></i>
        </button>
      )}
    </div>
  );
}

export default function Neighbourhoods() {
  const [activeTab, setActiveTab] = useState<TabKey>('neighbourhoods');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [blogCategory, setBlogCategory] = useState<BlogCategoryKey>('all');
  const [guideFilter, setGuideFilter] = useState<string[]>([]);
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [tagColors, setTagColors] = useState<TagColorOverrides>(DEFAULT_TAG_COLORS);
  const [tagStyle, setTagStyle] = useState<TagStyle>(DEFAULT_TAG_STYLE);
  const [tagMap, setTagMap] = useState<TagMap>(DEFAULT_TAG_MAP);
  const [blogCatColors, setBlogCatColors] = useState<BlogCatColors>(DEFAULT_BLOG_CATEGORY_COLORS);
  const [amenityRadius, setAmenityRadius] = useState(3000);
  const tabScrollRef = useRef<HTMLDivElement | null>(null);
  const filterScrollRef = useRef<HTMLDivElement | null>(null);
  const blogScrollRef = useRef<HTMLDivElement | null>(null);
  const compareScrollRef = useRef<HTMLDivElement | null>(null);
  const [tabHasMore, setTabHasMore] = useState(false);
  const [tabCanPrev, setTabCanPrev] = useState(false);
  const [blogHasMore, setBlogHasMore] = useState(false);
  const [blogCanPrev, setBlogCanPrev] = useState(false);
  const [compareHasMore, setCompareHasMore] = useState(false);
  const [compareCanPrev, setCompareCanPrev] = useState(false);

  useEffect(() => {
    let active = true;
    const keys = [
      'page_neighbourhoods_tag_green', 'page_neighbourhoods_tag_luxury', 'page_neighbourhoods_tag_wealthy',
      'page_neighbourhoods_tag_family', 'page_neighbourhoods_tag_young', 'page_neighbourhoods_tag_gated',
      'page_neighbourhoods_tag_modern', 'page_neighbourhoods_tag_default',
      'page_neighbourhoods_tag_text_color', 'page_neighbourhoods_tag_text_size', 'page_neighbourhoods_tag_radius',
      'page_neighbourhoods_tag_pad_x', 'page_neighbourhoods_tag_pad_y', 'page_neighbourhoods_tag_tracking',
      'page_neighbourhoods_tag_weight', 'page_neighbourhoods_tag_map', 'page_neighbourhoods_blogcat_map',
    ];
    supabase
      .from('site_settings')
      .select('key, value')
      .in('key', keys)
      .then(({ data }) => {
        if (!active || !data) return;
        const m: Record<string, string | null> = Object.fromEntries(
          data.map((r: { key: string; value: string | null }) => [r.key, r.value])
        );
        const colorField: Record<string, keyof TagColorOverrides> = {
          green: 'green', luxury: 'luxury', wealthy: 'wealthy', family: 'family',
          young: 'young', gated: 'gated', modern: 'modern', default: 'default',
        };
        setTagColors((prev) => {
          const overrides = { ...prev };
          Object.entries(colorField).forEach(([k, field]) => {
            const v = m[`page_neighbourhoods_tag_${k}`];
            if (v !== undefined && v !== null && v !== '') (overrides as any)[field] = v;
          });
          return overrides;
        });
        setTagStyle((prev) => ({
          textColor: nz(m['page_neighbourhoods_tag_text_color'], prev.textColor),
          fontSize: nz(m['page_neighbourhoods_tag_text_size'], prev.fontSize),
          radius: nz(m['page_neighbourhoods_tag_radius'], prev.radius),
          padX: nz(m['page_neighbourhoods_tag_pad_x'], prev.padX),
          padY: nz(m['page_neighbourhoods_tag_pad_y'], prev.padY),
          tracking: nz(m['page_neighbourhoods_tag_tracking'], prev.tracking),
          weight: nz(m['page_neighbourhoods_tag_weight'], prev.weight),
        }));
        const mapRaw = m['page_neighbourhoods_tag_map'];
        if (mapRaw) {
          try {
            const parsed = JSON.parse(mapRaw);
            if (parsed && typeof parsed === 'object') setTagMap(parsed);
          } catch { /* ignore malformed map */ }
        }
        const blogRaw = m['page_neighbourhoods_blogcat_map'];
        if (blogRaw) {
          try {
            const parsed = JSON.parse(blogRaw);
            if (parsed && typeof parsed === 'object') setBlogCatColors(parsed);
          } catch { /* ignore malformed map */ }
        }
      });
    return () => { active = false; };
  }, []);

  // Scroll overflow detection for pill rows
  function checkHasMore(el: HTMLDivElement | null) {
    if (!el) return false;
    return el.scrollWidth > el.clientWidth + 2 && el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
  }

  function checkCanPrev(el: HTMLDivElement | null) {
    return !!el && el.scrollLeft > 2;
  }

  useEffect(() => {
    function update() {
      const tabEl = tabScrollRef.current;
      const blogEl = blogScrollRef.current;
      const compareEl = compareScrollRef.current;
      setTabHasMore(checkHasMore(tabEl));
      setTabCanPrev(checkCanPrev(tabEl));
      setBlogHasMore(checkHasMore(blogEl));
      setBlogCanPrev(checkCanPrev(blogEl));
      setCompareHasMore(checkHasMore(compareEl));
      setCompareCanPrev(checkCanPrev(compareEl));
    }
    update();
    const els = [tabScrollRef.current, filterScrollRef.current, blogScrollRef.current, compareScrollRef.current].filter(Boolean) as HTMLDivElement[];
    els.forEach((el) => el.addEventListener('scroll', update, { passive: true }));
    window.addEventListener('resize', update);
    return () => {
      els.forEach((el) => el.removeEventListener('scroll', update));
      window.removeEventListener('resize', update);
    };
  }, []);

  const {
    neighbourhoods: hoods,
    blogPosts: supabaseBlogPosts,
    stats: supabaseStats,
    loading,
    error,
    refetch,
  } = useNeighbourhoods();

  const { amenities } = useAmenities();
  const focalPoint = useImageFocalPoint();

  const displayBlogPosts = useMemo(() => supabaseBlogPosts, [supabaseBlogPosts]);

  const filteredBlogPosts = useMemo(() => {
    if (blogCategory === 'all') return displayBlogPosts;
    return displayBlogPosts.filter((bp) => bp.category === blogCategory);
  }, [displayBlogPosts, blogCategory]);

  const blogCategories: BlogCategoryKey[] = ['all', 'Area Guides', 'Market Trends', 'Schools & Family', 'Lifestyle & Dining'];

  const filteredHoods = useMemo(() => {
    let result = [...hoods];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          (h.summary && h.summary.toLowerCase().includes(q)) ||
          (h.description && h.description.toLowerCase().includes(q)) ||
          (h.tags && h.tags.some((t) => t.toLowerCase().includes(q))) ||
          h.city.toLowerCase().includes(q)
      );
    }

    if (activeFilter !== 'all') {
      const filter = HOOD_FILTERS.find((f) => f.key === activeFilter);
      if (filter) {
        result = result.filter((h) =>
          filter.matches((h.tags || []).map((t) => t.toLowerCase()))
        );
      }
    }

    if (guideFilter.length > 0) {
      result = result.filter((h) =>
        guideFilter.some((name) => h.name.toLowerCase() === name.toLowerCase())
      );
    }

    return result;
  }, [hoods, searchQuery, activeFilter, guideFilter]);

  const guideHoods = useMemo(() => hoods, [hoods]);

  // Resolve an area name (e.g. "Spring Valley") to its Area Guide / detail page.
  const hoodSlugByName = useMemo(() => {
    const map: Record<string, string> = {};
    hoods.forEach((h) => {
      map[h.name.toLowerCase()] = h.slug;
    });
    return map;
  }, [hoods]);

  const areaHref = (name: string): string => {
    const slug =
      hoodSlugByName[name.toLowerCase()]
      || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return areaGuideHref(slug);
  };

  const comparisonData = useMemo<NeighbourhoodComparison[]>(
    () => hoods.map(buildComparisonFromNeighbourhood),
    [hoods]
  );

  const amenityCountsBySlug = useMemo(() => {
    const map: Record<string, AmenityCounts> = {};
    hoods.forEach((h) => {
      if (h.latitude != null && h.longitude != null) {
        map[h.slug] = countAmenitiesNearby(amenities, h.latitude, h.longitude, amenityRadius);
      }
    });
    return map;
  }, [hoods, amenities, amenityRadius]);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Masthead */}
      <div className="mt-[62px] md:mt-[132px] lg:mt-[156px] bg-primary border-t-2 border-white/20 border-b-2 border-white/10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div>
            <span className="font-prata font-bold text-golden text-[24px] md:text-[33px] uppercase tracking-[0.04em]">
              THE LOCAL
            </span>
            <span className="block font-roboto text-white/60 text-xs uppercase tracking-[0.12em] mt-0.5">
              Oceans Kenya&apos;s Guide to the City
            </span>
          </div>
          <span className="font-roboto text-white/60 text-xs uppercase tracking-[0.12em] hidden sm:block">
            ISSUE - NAIROBI 2026
          </span>
        </div>
      </div>

      {/* Hero - editorial magazine block on solid dark blue */}
      <section className="bg-primary pb-20 md:pb-28">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 pt-10 md:pt-14">
            <div className="lg:col-span-8">
              <p className="font-jost font-bold text-golden text-[15px] uppercase tracking-[0.18em] mb-4">
                Explore the City
              </p>
              <h1 className="font-prata font-bold text-white text-[30px] sm:text-[38px] md:text-[61px] leading-[1.08] mb-5">
                Neighbourhoods &amp; Guides
              </h1>
              <p className="font-roboto text-white/85 text-[14px] leading-[1.7] max-w-[60ch]">
                Discover Nairobi&apos;s most desirable residential enclaves. From the diplomatic grandeur
                of Runda to the urban energy of Kilimani, each neighbourhood offers a distinct lifestyle
                and investment opportunity.
              </p>
            </div>
            <div className="lg:col-span-4 flex items-end">
              <p className="font-roboto text-white/60 text-[15px] leading-relaxed border-l-4 border-golden pl-4">
                A curated field guide to Nairobi&apos;s residential enclaves - safety, lifestyle,
                schools, and value, area by area.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick links to Schools & Living guides */}
      <Reveal>
        <section className="bg-[#F7F9F9] border-b-2 border-[#1a1a1a]/10">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/directory"
                className="group flex items-center gap-4 bg-white border-2 border-[#1a1a1a]/10 p-5 hover:border-primary/40 transition-colors cursor-pointer"
              >
                <div className="w-14 h-14 flex items-center justify-center bg-[#C05621] text-white shrink-0">
                  <i className="ri-store-2-line text-2xl"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-prata font-semibold text-primary text-[21px] leading-tight group-hover:text-[#0D5959] transition-colors">
                    Social Directory
                  </h3>
                  <p className="font-roboto text-[15px] text-[#636363] leading-relaxed mt-0.5">
                    Hotels, restaurants, hospitals, schools, gyms &amp; every essential service across the city.
                  </p>
                </div>
                <i className="ri-arrow-right-line text-primary text-xl group-hover:translate-x-1 transition-transform shrink-0"></i>
              </Link>
              <Link
                to="/schools"
                className="group flex items-center gap-4 bg-white border-2 border-[#1a1a1a]/10 p-5 hover:border-primary/40 transition-colors cursor-pointer"
              >
                <div className="w-14 h-14 flex items-center justify-center bg-primary text-white shrink-0">
                  <i className="ri-graduation-cap-line text-2xl"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-prata font-semibold text-primary text-[21px] leading-tight group-hover:text-[#0D5959] transition-colors">
                    Schools in Nairobi
                  </h3>
                  <p className="font-roboto text-[15px] text-[#636363] leading-relaxed mt-0.5">
                    International, Montessori &amp; top private schools - and which neighbourhoods sit nearest.
                  </p>
                </div>
                <i className="ri-arrow-right-line text-primary text-xl group-hover:translate-x-1 transition-transform shrink-0"></i>
              </Link>
              <Link
                to="/living-in-nairobi"
                className="group flex items-center gap-4 bg-white border-2 border-[#1a1a1a]/10 p-5 hover:border-primary/40 transition-colors cursor-pointer"
              >
                <div className="w-14 h-14 flex items-center justify-center bg-[#0D5959] text-white shrink-0">
                  <i className="ri-book-open-line text-2xl"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-prata font-semibold text-primary text-[21px] leading-tight group-hover:text-[#0D5959] transition-colors">
                    Living in Nairobi
                  </h3>
                  <p className="font-roboto text-[15px] text-[#636363] leading-relaxed mt-0.5">
                    Guides on eating, shopping, things to do, healthcare &amp; family life across the city.
                  </p>
                </div>
                <i className="ri-arrow-right-line text-primary text-xl group-hover:translate-x-1 transition-transform shrink-0"></i>
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Stats Strip */}
      <Reveal>
        <section className="bg-white border-y-2 border-[#1a1a1a]/10 py-2 md:py-0">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden">
              <div className="px-4 py-5 md:py-6 text-center border-r-2 border-b-2 md:border-b-0 border-[#1a1a1a]/10 overflow-hidden">
                <p className="font-prata text-primary text-[18px] sm:text-[24px] md:text-[40px] leading-none">{supabaseStats.totalNeighbourhoods}</p>
                <p className="font-jost text-golden text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-[0.02em] sm:tracking-[0.08em] md:tracking-[0.14em] mt-2 whitespace-nowrap">Neighbourhoods</p>
              </div>
              <div className="px-4 py-5 md:py-6 text-center border-b-2 md:border-b-0 md:border-r-2 border-[#1a1a1a]/10 overflow-hidden">
                <p className="font-prata text-primary text-[18px] sm:text-[24px] md:text-[40px] leading-none">{supabaseStats.totalListings}</p>
                <p className="font-jost text-golden text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-[0.02em] sm:tracking-[0.08em] md:tracking-[0.14em] mt-2 whitespace-nowrap">Active Listings</p>
              </div>
              <div className="px-4 py-5 md:py-6 text-center border-r-2 border-[#1a1a1a]/10 overflow-hidden">
                <p className="font-prata text-primary text-[18px] sm:text-[24px] md:text-[40px] leading-none">{supabaseStats.forSale}</p>
                <p className="font-jost text-golden text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-[0.02em] sm:tracking-[0.08em] md:tracking-[0.14em] mt-2 whitespace-nowrap">For Sale</p>
              </div>
              <div className="px-4 py-5 md:py-6 text-center overflow-hidden">
                <p className="font-prata text-primary text-[18px] sm:text-[24px] md:text-[40px] leading-none">{supabaseStats.forRent}</p>
                <p className="font-jost text-golden text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-[0.02em] sm:tracking-[0.08em] md:tracking-[0.14em] mt-2 whitespace-nowrap">To Let</p>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <main className="py-10 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          {/* Breadcrumb + Back */}
          <PageBreadcrumbTrail
            className="mb-8 md:mb-10"
            items={[
              { label: 'Home', to: '/' },
              { label: 'Neighbourhoods' },
            ]}
          />

          {/* Tabs */}
          <div className="relative">
            <div
              ref={tabScrollRef}
              className="flex items-center gap-0 border-b-2 border-[#1a1a1a]/10 mb-8 md:mb-10 overflow-x-auto no-scrollbar -mx-4 px-4 pr-20 md:mx-0 md:px-0 md:pr-0"
            >
              {[
                { key: 'neighbourhoods' as TabKey, label: 'Neighbourhoods', icon: 'ri-map-pin-2-line' },
                { key: 'guides' as TabKey, label: 'Area Guides', icon: 'ri-book-open-line' },
                { key: 'blog' as TabKey, label: 'Blog', icon: 'ri-article-line' },
                { key: 'compare' as TabKey, label: 'Compare', icon: 'ri-scales-line' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-5 py-3 md:py-4 font-jost text-[13px] sm:text-[15px] md:text-[18px] font-semibold uppercase tracking-[0.04em] sm:tracking-[0.05em] md:tracking-[0.06em] transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                    activeTab === tab.key
                      ? 'border-golden text-primary'
                      : 'border-transparent text-primary/60 hover:text-primary'
                  }`}
                >
                  <i className={`${tab.icon} text-base sm:text-lg`}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
            {/* Mobile scroll-to-more arrows - float above the tab text, in clear space */}
            <FloatingScrollArrows
              showPrev={tabCanPrev}
              showNext={tabHasMore}
              onPrev={() => {
                const el = tabScrollRef.current;
                if (el) el.scrollBy({ left: -320, behavior: 'smooth' });
              }}
              onNext={() => {
                const el = tabScrollRef.current;
                if (el) el.scrollBy({ left: 320, behavior: 'smooth' });
              }}
            />
          </div>

          {/* Tab: Neighbourhoods */}
          {activeTab === 'neighbourhoods' && (
            <div className="space-y-6 md:space-y-8">
              {/* Search + category filters - wrapping pills, no horizontal scroll */}
              <HoodFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filters={HOOD_FILTERS.map((f) => ({ key: f.key, label: f.label }))}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                resultCount={filteredHoods.length}
                totalCount={hoods.length}
              />

              {/* Quick Decision Guide - Collapsible */}
              <QuickDecisionGuide
                expanded={guideExpanded}
                onExpandedChange={setGuideExpanded}
                activeMatches={guideFilter}
                onSelectProfile={(matches) => {
                  setGuideFilter(matches);
                  if (matches.length > 0) setSearchQuery('');
                }}
                onClear={() => setGuideFilter([])}
                areaHref={areaHref}
              />

              {/* Error State */}
              {error && !loading && (
                <div className="text-center py-12 bg-[#F5F5F5] border-2 border-[#1a1a1a]/10">
                  <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3">
                    <i className="ri-error-warning-line text-white text-xl"></i>
                  </div>
                  <p className="font-prata font-semibold text-primary text-[23px] mb-1">Something went wrong</p>
                  <p className="font-roboto text-[15px] text-[#636363] mb-4">{error}</p>
                  <button
                    onClick={refetch}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-[13px] font-jost font-semibold uppercase tracking-[0.08em] hover:bg-[#002349] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-refresh-line"></i>
                    Try Again
                  </button>
                </div>
              )}

              {/* Cards Grid */}
              {!error && (
                <div>
                  <div className="flex-1 min-w-0">
                    {loading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="bg-[#F5F5F5] aspect-[4/5] animate-pulse" />
                        ))}
                      </div>
                    ) : filteredHoods.length === 0 ? (
                      <div className="text-center py-16 bg-[#F5F5F5] border-2 border-[#1a1a1a]/10">
                        <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3">
                          <i className="ri-map-pin-line text-white text-xl"></i>
                        </div>
                        <p className="font-prata font-semibold text-primary text-[23px] mb-1">No Neighbourhoods Found</p>
                        <p className="font-roboto text-[15px] text-[#636363]">Try adjusting your search or filters.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredHoods.map((n, i) => (
                          <Reveal key={n.id} delay={i * 80}>
                            <div className="group bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] hover:shadow-[0_2px_4px_rgba(0,23,49,0.06),0_8px_24px_rgba(0,23,49,0.10),0_24px_64px_rgba(0,23,49,0.12)] transition-shadow duration-300">
                              <Link
                                to={`/neighbourhood/${n.slug}`}
                                className="block relative aspect-[4/5] overflow-hidden cursor-pointer"
                              >
                                <img
                                  alt={n.name}
                                  className="w-full h-full object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-110"
                                  src={n.hero_image || ''}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent"></div>
                                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                                  {n.tags &&
                                    n.tags.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="font-jost uppercase"
                                        style={{ ...getTagPillStyle(tagStyle), backgroundColor: getTagColorHex(tag, tagColors, tagMap) }}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                </div>
                                <div className="absolute bottom-3 left-3 right-3">
                                  <h3 className="font-prata font-semibold text-white text-[25px] leading-tight">{n.name}</h3>
                                </div>
                              </Link>
                              <div className="p-4">
                                <Link to={`/neighbourhood/${n.slug}`} className="block cursor-pointer">
                                  <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-2 hover:text-[#0D5959] transition-colors">
                                    {n.summary || n.description || ''}
                                  </p>
                                </Link>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-[#1a1a1a]/10">
                                  <Link
                                    to={areaSearchHref(n.name)}
                                    className="font-jost text-golden text-[13px] font-semibold uppercase tracking-[0.08em] cursor-pointer hover:text-[#8a6d1f] transition-colors"
                                  >
                                    {n.propertyCount} Properties
                                  </Link>
                                  <Link
                                    to={`/neighbourhood/${n.slug}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-[12px] font-jost font-semibold uppercase tracking-[0.08em] whitespace-nowrap transition-colors hover:bg-[#002349]"
                                  >
                                    Explore
                                    <i className="ri-arrow-right-line"></i>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </Reveal>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Other Notable Areas */}
              {!loading && (
                <Reveal delay={200}>
                  <div className="mt-12 md:mt-16 bg-[#FAFAF8] border-y-2 border-[#1a1a1a]/10 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-8 md:py-10">
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-5 bg-golden"></div>
                        <span className="font-jost text-golden text-[12px] uppercase tracking-[0.15em] font-semibold">
                          Also Worth Knowing
                        </span>
                      </div>
                      <h3 className="font-prata font-bold text-primary text-[25px] md:text-[35px]">Other Notable Areas</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 md:gap-x-6 gap-y-0">
                      <div className="py-6 border-b-2 border-[#1a1a1a]/10">
                        <h4 className="font-prata font-semibold text-primary text-[23px] mb-2">South B &amp; South C</h4>
                        <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-3 mb-3">
                          More local, affordable, and close to Nairobi National Park - ideal for experienced residents and budget-conscious travellers who want space without the Karen price tag. Strong community feel with markets, local eateries, and easy access to the CBD.
                        </p>
                        <Link
                          to={areaSearchHref('South B & South C')}
                          className="inline-flex items-center gap-1 font-jost text-[13px] font-semibold uppercase tracking-[0.08em] text-golden hover:text-[#8a6d1f] transition-colors"
                        >
                          Browse South B &amp; South C
                          <i className="ri-arrow-right-line"></i>
                        </Link>
                      </div>
                      <div className="py-6 border-b-2 border-[#1a1a1a]/10 md:pl-8">
                        <h4 className="font-prata font-semibold text-primary text-[23px] mb-2">City Centre &amp; Upper Hill</h4>
                        <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-3 mb-3">
                          Busy, central, and all business - ideal for short stays and professionals who need to be in the thick of it. Upper Hill hosts major corporate HQs and hotels. The CBD offers unmatched convenience but can be hectic.
                        </p>
                        <Link
                          to={areaSearchHref('City Centre & Upper Hill')}
                          className="inline-flex items-center gap-1 font-jost text-[13px] font-semibold uppercase tracking-[0.08em] text-golden hover:text-[#8a6d1f] transition-colors"
                        >
                          Browse City Centre &amp; Upper Hill
                          <i className="ri-arrow-right-line"></i>
                        </Link>
                      </div>
                      <div className="py-6 border-b-2 border-[#1a1a1a]/10">
                        <h4 className="font-prata font-semibold text-primary text-[23px] mb-2">Langata</h4>
                        <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-3 mb-3">
                          Nature-focused living on a budget - bordering Nairobi National Park and close to the Giraffe Centre and Elephant Orphanage. More affordable than neighbouring Karen while sharing the same green, relaxed atmosphere. Popular with families seeking space.
                        </p>
                        <Link
                          to={areaSearchHref('Langata')}
                          className="inline-flex items-center gap-1 font-jost text-[13px] font-semibold uppercase tracking-[0.08em] text-golden hover:text-[#8a6d1f] transition-colors"
                        >
                          Browse Langata
                          <i className="ri-arrow-right-line"></i>
                        </Link>
                      </div>
                      <div className="py-6 border-b-2 border-[#1a1a1a]/10 md:pl-8">
                        <h4 className="font-prata font-semibold text-primary text-[23px] mb-2">Ruaka</h4>
                        <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-3 mb-3">
                          A fast-growing satellite suburb north of the city - significantly cheaper rents than Gigiri or Runda but only 15-20 minutes from the UN and diplomatic quarter. Popular with young professionals and families priced out of the core northern suburbs.
                        </p>
                        <Link
                          to={areaSearchHref('Ruaka')}
                          className="inline-flex items-center gap-1 font-jost text-[13px] font-semibold uppercase tracking-[0.08em] text-golden hover:text-[#8a6d1f] transition-colors"
                        >
                          Browse Ruaka
                          <i className="ri-arrow-right-line"></i>
                        </Link>
                      </div>
                    </div>
                    <p className="font-roboto text-[15px] text-[#636363] mt-6 pt-4 border-t-2 border-[#1a1a1a]/10 leading-relaxed">
                      These areas are not yet covered by full Area Guides but have active property listings. Our agents can provide detailed local knowledge on any of them.
                    </p>
                  </div>
                </Reveal>
              )}
            </div>
          )}

          {/* Tab: Area Guides */}
          {activeTab === 'guides' && (
            <div className="space-y-6">
              {error && !loading ? (
                <div className="text-center py-12 bg-[#F5F5F5] border-2 border-[#1a1a1a]/10">
                  <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3">
                    <i className="ri-error-warning-line text-white text-xl"></i>
                  </div>
                  <p className="font-prata font-semibold text-primary text-[23px] mb-1">Something went wrong</p>
                  <p className="font-roboto text-[15px] text-[#636363] mb-4">{error}</p>
                  <button
                    onClick={refetch}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-[13px] font-jost font-semibold uppercase tracking-[0.08em] hover:bg-[#002349] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-refresh-line"></i>
                    Try Again
                  </button>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-[#F5F5F5] h-48 animate-pulse" />
                  ))}
                </div>
              ) : guideHoods.length === 0 ? (
                <div className="text-center py-16 bg-[#F5F5F5] border-2 border-[#1a1a1a]/10">
                  <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3">
                    <i className="ri-book-open-line text-white text-xl"></i>
                  </div>
                  <p className="font-prata font-semibold text-primary text-[23px] mb-1">No Guides Yet</p>
                  <p className="font-roboto text-[15px] text-[#636363]">Area guides are coming soon.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {guideHoods.map((h, i) => (
                    <Reveal key={h.id} delay={i * 100}>
                      <div className="group flex flex-row bg-white overflow-hidden h-[256px] shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] hover:shadow-[0_2px_4px_rgba(0,23,49,0.06),0_8px_24px_rgba(0,23,49,0.10),0_24px_64px_rgba(0,23,49,0.12)] transition-shadow duration-300">
                        <Link
                          to={areaGuideHref(h.slug)}
                          className="w-36 sm:w-44 md:w-52 h-full shrink-0 relative overflow-hidden bg-[#F5F5F5] block cursor-pointer"
                        >
                          {h.hero_image ? (
                            <img
                              alt={h.name}
                              className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                              style={{ objectPosition: focalPoint }}
                              src={h.hero_image}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <i className="ri-image-line text-[#636363] text-2xl" />
                            </div>
                          )}
                        </Link>
                        <div className="p-5 flex flex-col justify-between flex-1 min-w-0 overflow-hidden">
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              {h.tags &&
                                h.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="font-jost uppercase"
                                    style={{ ...getTagPillStyle(tagStyle), backgroundColor: getTagColorHex(tag, tagColors, tagMap) }}
                                  >
                                    {tag}
                                  </span>
                                ))}
                            </div>
                            <Link to={areaGuideHref(h.slug)} className="block cursor-pointer">
                              <h3 className="font-prata font-semibold text-primary text-[23px] mb-1 group-hover:text-[#0D5959] transition-colors">{h.name} Guide</h3>
                            </Link>
                            <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-2">
                              {h.summary || h.description || ''}
                            </p>
                            <p className="flex items-center gap-1 font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mt-2">
                              <i className="ri-map-pin-2-line text-[#636363]"></i>
                              {h.name}, {h.city}
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t-2 border-[#1a1a1a]/10 flex items-center justify-between gap-3">
                            <Link
                              to={areaSearchHref(h.name)}
                              className="font-jost text-golden text-[13px] font-semibold uppercase tracking-[0.08em] cursor-pointer hover:text-[#8a6d1f] transition-colors whitespace-nowrap"
                            >
                              {h.propertyCount} Properties
                            </Link>
                            <Link
                              to={areaGuideHref(h.slug)}
                              className="flex items-center gap-1 font-jost text-[13px] font-semibold uppercase tracking-[0.08em] text-[#1a1a1a] hover:text-[#0D5959] transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Read Guide
                              <i className="ri-arrow-right-line"></i>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Blog */}
          {activeTab === 'blog' && (
            <div className="space-y-6">
              {/* Blog Category Filters */}
              <div className="relative">
                <div ref={blogScrollRef} className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pr-14">
                  {blogCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setBlogCategory(cat)}
                      className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-jost font-semibold uppercase tracking-[0.08em] transition-all cursor-pointer whitespace-nowrap border ${
                        blogCategory === cat
                          ? 'bg-primary text-white border-primary'
                          : 'border-primary text-primary hover:bg-primary hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? 'All Posts' : cat}
                    </button>
                  ))}
                </div>
              </div>
              <FloatingScrollArrows
                showPrev={blogCanPrev}
                showNext={blogHasMore}
                onPrev={() => {
                  const el = blogScrollRef.current;
                  if (el) el.scrollBy({ left: -160, behavior: 'smooth' });
                }}
                onNext={() => {
                  const el = blogScrollRef.current;
                  if (el) el.scrollBy({ left: 160, behavior: 'smooth' });
                }}
              />
              {error && !loading ? (
                <div className="text-center py-12 bg-[#F5F5F5] border-2 border-[#1a1a1a]/10">
                  <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3">
                    <i className="ri-error-warning-line text-white text-xl"></i>
                  </div>
                  <p className="font-prata font-semibold text-primary text-[23px] mb-1">Something went wrong</p>
                  <p className="font-roboto text-[15px] text-[#636363] mb-4">{error}</p>
                  <button
                    onClick={refetch}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-[13px] font-jost font-semibold uppercase tracking-[0.08em] hover:bg-[#002349] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-refresh-line"></i>
                    Try Again
                  </button>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-[#F5F5F5] h-56 animate-pulse" />
                  ))}
                </div>
              ) : filteredBlogPosts.length === 0 ? (
                <div className="text-center py-16 bg-[#F5F5F5] border-2 border-[#1a1a1a]/10">
                  <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3">
                    <i className="ri-article-line text-white text-xl"></i>
                  </div>
                  <p className="font-prata font-semibold text-primary text-[23px] mb-1">No Blog Posts Yet</p>
                  <p className="font-roboto text-[15px] text-[#636363]">Check back soon for neighbourhood insights.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBlogPosts.map((post, i) => (
                    <Reveal key={post.id} delay={i * 90}>
                      <Link
                        to={`/blog/${post.slug}`}
                        className="group block bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,23,49,0.04),0_4px_12px_rgba(0,23,49,0.06),0_16px_48px_rgba(0,23,49,0.08)] hover:shadow-[0_2px_4px_rgba(0,23,49,0.06),0_8px_24px_rgba(0,23,49,0.10),0_24px_64px_rgba(0,23,49,0.12)] transition-shadow duration-300"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <EntityImage
                            src={post.featured_image}
                            alt={post.title}
                            icon="ri-article-line"
                            className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                            style={{ objectPosition: focalPoint }}
                          />
                          {post.category && (
                            <div className="absolute top-3 left-3">
                              <span
                                className="font-jost uppercase"
                                style={{ ...getTagPillStyle(tagStyle), backgroundColor: getBlogCategoryColorHex(post.category, tagColors, blogCatColors, tagMap) }}
                              >
                                {post.category}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="font-prata font-semibold text-primary text-[21px] leading-snug mb-2 line-clamp-2 group-hover:text-[#0D5959] transition-colors">
                            {post.title}
                          </h3>
                          <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-2 mb-3">
                            {post.excerpt || ''}
                          </p>
                          <div className="flex items-center gap-2 font-jost text-[#636363] text-xs uppercase tracking-[0.1em]">
                            {post.author && <span>{post.author}</span>}
                            {post.author && post.published_at && <span>&middot;</span>}
                            {post.readTime && <span>{post.readTime}</span>}
                          </div>
                        </div>
                      </Link>
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Compare */}
          {activeTab === 'compare' && (
            <div className="space-y-6 md:space-y-8">
              {/* Selector Panel */}
              <Reveal>
                <div className="bg-white border-2 border-[#1a1a1a]/10 p-6 md:p-8">
                  <div className="flex items-start gap-3 mb-6">
                    <div className="w-8 h-8 flex items-center justify-center bg-primary text-white shrink-0">
                      <i className="ri-scales-line text-white"></i>
                    </div>
                    <div>
                      <h3 className="font-prata font-semibold text-primary text-[25px] mb-1">Compare Neighbourhoods</h3>
                      <p className="font-roboto text-[15px] text-[#636363] leading-relaxed">
                        Pick two neighbourhoods to see how they stack up across safety, lifestyle, schools, value, and more.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-1 w-full">
                      <NeighbourhoodSearchSelect
                        label="First Neighbourhood"
                        value={compareA}
                        options={comparisonData}
                        excludedSlug={compareB}
                        onChange={setCompareA}
                      />
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 bg-primary border border-primary shrink-0">
                      <span className="font-jost font-bold text-white text-sm">vs</span>
                    </div>
                    <div className="flex-1 w-full">
                      <NeighbourhoodSearchSelect
                        label="Second Neighbourhood"
                        value={compareB}
                        options={comparisonData}
                        excludedSlug={compareA}
                        onChange={setCompareB}
                      />
                    </div>
                  </div>
                  {/* Quick suggestions */}
                  <div className="mt-6 pt-6 border-t-2 border-[#1a1a1a]/10">
                    <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-3">Popular Comparisons</p>
                    <div className="relative">
                      <div ref={compareScrollRef} className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto md:overflow-visible pb-1 no-scrollbar pr-14 md:pr-0">
                        {[
                          { a: 'karen', b: 'westlands', label: 'Karen vs Westlands' },
                          { a: 'kilimani', b: 'westlands', label: 'Kilimani vs Westlands' },
                          { a: 'karen', b: 'runda', label: 'Karen vs Runda' },
                          { a: 'lavington', b: 'kilimani', label: 'Lavington vs Kilimani' },
                          { a: 'gigiri', b: 'muthaiga', label: 'Gigiri vs Muthaiga' },
                          { a: 'kileleshwa', b: 'parklands', label: 'Kileleshwa vs Parklands' },
                          { a: 'spring-valley', b: 'lavington', label: 'Spring Valley vs Lavington' },
                          { a: 'rosslyn', b: 'runda', label: 'Rosslyn vs Runda' },
                          { a: 'lower-kabete', b: 'spring-valley', label: 'Lower Kabete vs Spring Valley' },
                        ].map((pair) => (
                          <button
                            key={pair.label}
                            onClick={() => { setCompareA(pair.a); setCompareB(pair.b); }}
                            className={`shrink-0 px-3 py-1.5 text-[13px] font-jost uppercase tracking-[0.08em] transition-all cursor-pointer whitespace-nowrap border ${
                              compareA === pair.a && compareB === pair.b
                                ? 'border-primary text-primary bg-primary/5'
                                : 'border-primary/30 text-primary hover:bg-primary/5'
                            }`}
                          >
                            <span className="font-semibold">{pair.label.split(' vs ')[0]}</span>
                            <span className="text-golden font-semibold mx-1">vs</span>
                            <span className="font-semibold">{pair.label.split(' vs ')[1]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <FloatingScrollArrows
                      showPrev={compareCanPrev}
                      showNext={compareHasMore}
                      onPrev={() => {
                        const el = compareScrollRef.current;
                        if (el) el.scrollBy({ left: -160, behavior: 'smooth' });
                      }}
                      onNext={() => {
                        const el = compareScrollRef.current;
                        if (el) el.scrollBy({ left: 160, behavior: 'smooth' });
                      }}
                    />
                  </div>
                </div>
              </Reveal>

              {/* Comparison Results */}
              {compareA && compareB ? (
                (() => {
                  const dataA = comparisonData.find((c) => c.slug === compareA);
                  const dataB = comparisonData.find((c) => c.slug === compareB);
                  if (!dataA || !dataB) return null;

                  // Determine winners for key dimensions
                  const dims = [
                    { key: 'safety' as const, label: 'Safety', higherIsBetter: true },
                    { key: 'familyFriendliness' as const, label: 'Family-Friendly', higherIsBetter: true },
                    { key: 'valueForMoney' as const, label: 'Value', higherIsBetter: true },
                    { key: 'accessibility' as const, label: 'Accessibility', higherIsBetter: true },
                    { key: 'greenSpace' as const, label: 'Green Space', higherIsBetter: true },
                    { key: 'walkability' as const, label: 'Walkability', higherIsBetter: true },
                    { key: 'nightlife' as const, label: 'Nightlife', higherIsBetter: true },
                    { key: 'rentalYield' as const, label: 'Rental Yield', higherIsBetter: true },
                  ];

                  const aWins = dims.filter((d) => dataA[d.key].rating > dataB[d.key].rating);
                  const bWins = dims.filter((d) => dataB[d.key].rating > dataA[d.key].rating);

                  let winnerA = false;
                  let winnerB = false;
                  if (aWins.length > bWins.length) winnerA = true;
                  if (bWins.length > aWins.length) winnerB = true;

                  return (
                    <div className="space-y-6">
                      {/* Scoreboard */}
                      <Reveal>
                        <div className="bg-white border-2 border-[#1a1a1a]/10 p-4 md:p-5">
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <div className="text-center">
                              <p className="font-prata font-semibold text-primary text-[25px]">{dataA.name}</p>
                              <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mt-1">Wins {aWins.length} of 8</p>
                            </div>
                            <div className="text-center">
                              <p className="font-jost font-bold text-[#636363] text-xs uppercase tracking-[0.1em]">HEAD-TO-HEAD</p>
                              <div className="flex items-center justify-center gap-3 mt-2">
                                {winnerA && (
                                  <span className="px-2 py-0.5 bg-[#0D5959]/10 text-[#0D5959] text-xs font-jost font-semibold uppercase tracking-[0.08em]">Winner</span>
                                )}
                                {!winnerA && !winnerB && (
                                  <span className="px-2 py-0.5 bg-[#F5F5F5] text-[#636363] text-xs font-jost font-medium uppercase tracking-[0.08em]">Tie</span>
                                )}
                                {winnerB && (
                                  <span className="px-2 py-0.5 bg-[#0D5959]/10 text-[#0D5959] text-xs font-jost font-semibold uppercase tracking-[0.08em]">Winner</span>
                                )}
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="font-prata font-semibold text-primary text-[25px]">{dataB.name}</p>
                              <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mt-1">Wins {bWins.length} of 8</p>
                            </div>
                          </div>
                        </div>
                      </Reveal>

                      {/* Amenities Nearby (data-driven) */}
                      <Reveal>
                        <div className="bg-white border-2 border-[#1a1a1a]/10 p-4 md:p-5">
                          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 flex items-center justify-center bg-[#0D5959]/10 text-[#0D5959] shrink-0">
                                <i className="ri-store-2-line"></i>
                              </div>
                              <div>
                                <h3 className="font-prata font-semibold text-primary text-[21px] leading-none">Amenities Nearby</h3>
                                <p className="font-roboto text-[13px] text-[#636363] mt-1">
                                  Real counts of schools, malls and hospitals within a set distance of each neighbourhood.
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 bg-[#F5F5F5] p-1 rounded-full">
                              {[{ v: 1000, l: '1 km' }, { v: 3000, l: '3 km' }, { v: 5000, l: '5 km' }].map((r) => (
                                <button
                                  key={r.v}
                                  onClick={() => setAmenityRadius(r.v)}
                                  className={`px-3 py-1 rounded-full text-[12px] font-jost font-semibold uppercase tracking-[0.06em] cursor-pointer whitespace-nowrap transition-colors ${amenityRadius === r.v ? 'bg-primary text-white' : 'text-[#636363] hover:text-primary'}`}
                                >
                                  {r.l}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                              { key: 'schools' as const, label: 'Schools', icon: 'ri-graduation-cap-line' },
                              { key: 'malls' as const, label: 'Malls', icon: 'ri-store-2-line' },
                              { key: 'hospitals' as const, label: 'Hospitals', icon: 'ri-hospital-line' },
                            ].map((cat) => {
                              const countA = amenityCountsBySlug[compareA]?.[cat.key] ?? 0;
                              const countB = amenityCountsBySlug[compareB]?.[cat.key] ?? 0;
                              const max = Math.max(countA, countB, 1);
                              return (
                                <div key={cat.key} className="border-2 border-[#1a1a1a]/10 p-3 md:p-4">
                                  <div className="flex items-center gap-1.5 mb-3">
                                    <i className={`${cat.icon} text-[#0D5959] text-base`}></i>
                                    <span className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em]">{cat.label}</span>
                                  </div>
                                  <div className="space-y-3">
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-roboto text-sm font-medium text-primary">{dataA.name}</span>
                                        <span className="font-roboto text-sm font-semibold text-primary">{countA}</span>
                                      </div>
                                      <div className="h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
                                        <div className="h-full bg-[#0D5959] transition-all" style={{ width: `${(countA / max) * 100}%` }} />
                                      </div>
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-roboto text-sm font-medium text-primary">{dataB.name}</span>
                                        <span className="font-roboto text-sm font-semibold text-primary">{countB}</span>
                                      </div>
                                      <div className="h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
                                        <div className="h-full bg-golden transition-all" style={{ width: `${(countB / max) * 100}%` }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </Reveal>

                      {/* Top-line comparison: Safety, Price, Best For, Vibe */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                        <Reveal delay={80}>
                          <div className="bg-white border-2 border-[#1a1a1a]/10 p-4">
                            <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-2">Safety</p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a] mb-1">{dataA.name}</p>
                                <RatingBar rating={dataA.safety.rating} />
                              </div>
                              <span className="text-sm font-roboto text-[#636363]">vs</span>
                              <div className="flex-1">
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a] mb-1">{dataB.name}</p>
                                <RatingBar rating={dataB.safety.rating} />
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t-2 border-[#1a1a1a]/10 space-y-1.5">
                              <p className="font-roboto text-sm text-[#636363] leading-relaxed"><span className="font-medium">{dataA.name}:</span> {dataA.safety.description}</p>
                              <p className="font-roboto text-sm text-[#636363] leading-relaxed"><span className="font-medium">{dataB.name}:</span> {dataB.safety.description}</p>
                            </div>
                          </div>
                        </Reveal>
                        <Reveal delay={160}>
                          <div className="bg-white border-2 border-[#1a1a1a]/10 p-4">
                            <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-2">Price &amp; Value</p>
                            <div className="space-y-2">
                              <div>
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a]">{dataA.name}</p>
                                <p className="font-roboto text-sm font-semibold text-[#1a1a1a]">{dataA.priceRange}</p>
                                <p className="font-roboto text-sm text-[#636363]">1BR Rent: {dataA.typicalRent1BR}</p>
                              </div>
                              <div className="border-t-2 border-[#1a1a1a]/10 pt-2">
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a]">{dataB.name}</p>
                                <p className="font-roboto text-sm font-semibold text-[#1a1a1a]">{dataB.priceRange}</p>
                                <p className="font-roboto text-sm text-[#636363]">1BR Rent: {dataB.typicalRent1BR}</p>
                              </div>
                            </div>
                          </div>
                        </Reveal>
                      </div>

                      {/* Vibe & Best For */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                        <Reveal delay={80}>
                          <div className="bg-white border-2 border-[#1a1a1a]/10 p-4">
                            <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-2">Vibe</p>
                            <div className="space-y-3">
                              <div>
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a] mb-0.5">{dataA.name}</p>
                                <p className="font-roboto text-sm text-[#636363] leading-relaxed">{dataA.vibe}</p>
                              </div>
                              <div className="border-t-2 border-[#1a1a1a]/10 pt-3">
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a] mb-0.5">{dataB.name}</p>
                                <p className="font-roboto text-sm text-[#636363] leading-relaxed">{dataB.vibe}</p>
                              </div>
                            </div>
                          </div>
                        </Reveal>
                        <Reveal delay={160}>
                          <div className="bg-white border-2 border-[#1a1a1a]/10 p-4">
                            <p className="font-jost text-[#636363] text-xs uppercase tracking-[0.1em] mb-2">Best For</p>
                            <div className="space-y-3">
                              <div>
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a] mb-1">{dataA.name}</p>
                                <div className="flex flex-wrap gap-1">
                                  {dataA.bestFor.slice(0, 4).map((b) => (
                                    <span key={b} className="px-2 py-0.5 bg-[#F5F5F5] text-[11px] font-jost text-[#1a1a1a] uppercase tracking-[0.08em] border-2 border-[#1a1a1a]/10">{b}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="border-t-2 border-[#1a1a1a]/10 pt-3">
                                <p className="font-roboto text-sm font-medium text-[#1a1a1a] mb-1">{dataB.name}</p>
                                <div className="flex flex-wrap gap-1">
                                  {dataB.bestFor.slice(0, 4).map((b) => (
                                    <span key={b} className="px-2 py-0.5 bg-[#F5F5F5] text-[11px] font-jost text-[#1a1a1a] uppercase tracking-[0.08em] border-2 border-[#1a1a1a]/10">{b}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Reveal>
                      </div>

                      {/* Full side-by-side cards */}
                      <div className="flex flex-col md:flex-row gap-5">
                        <Reveal className="flex-1" delay={80}>
                          <ComparisonCard data={dataA} isWinner={winnerA} winnerLabel={winnerA ? 'Best Overall' : undefined} />
                        </Reveal>
                        <Reveal className="flex-1" delay={160}>
                          <ComparisonCard data={dataB} isWinner={winnerB} winnerLabel={winnerB ? 'Best Overall' : undefined} />
                        </Reveal>
                      </div>

                      {/* Dimension-by-dimension comparison table */}
                      <Reveal>
                        <div className="overflow-x-auto bg-white border-2 border-[#1a1a1a]/10">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b-2 border-[#1a1a1a]/10">
                                <th className="py-3 px-4 font-jost text-xs text-[#636363] uppercase tracking-[0.1em]">Dimension</th>
                                <th className="py-3 px-4 font-prata text-sm text-primary font-medium text-center">{dataA.name}</th>
                                <th className="py-3 px-4 font-prata text-sm text-primary font-medium text-center">{dataB.name}</th>
                                <th className="py-3 px-4 font-jost text-xs text-[#636363] uppercase tracking-[0.1em] text-center">Edge</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dims.map((dim, idx) => {
                                const rA = dataA[dim.key].rating;
                                const rB = dataB[dim.key].rating;
                                const edge = rA > rB ? dataA.name : rB > rA ? dataB.name : 'Tie';
                                return (
                                  <tr key={dim.key} className={`border-b border-[#1a1a1a]/5 ${idx % 2 === 0 ? 'bg-[#F5F5F5]/50' : ''}`}>
                                    <td className="py-2.5 px-4 font-roboto text-sm font-medium text-[#1a1a1a]">{dim.label}</td>
                                    <td className="py-2.5 px-4">
                                      <div className="flex justify-center">
                                        <RatingBar rating={rA} />
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-4">
                                      <div className="flex justify-center">
                                        <RatingBar rating={rB} />
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-4 text-center">
                                      <span className={`text-sm font-roboto font-medium ${
                                        edge === dataA.name ? 'text-primary' : edge === dataB.name ? 'text-primary' : 'text-[#636363]'
                                      }`}>
                                        {edge}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </Reveal>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-16 bg-[#F5F5F5] border-2 border-[#1a1a1a]/10">
                  <div className="w-12 h-12 flex items-center justify-center bg-primary mx-auto mb-3">
                    <i className="ri-scales-line text-white text-xl"></i>
                  </div>
                  <p className="font-prata font-semibold text-primary text-[23px] mb-1">Select Two Neighbourhoods</p>
                  <p className="font-roboto text-[15px] text-[#636363] max-w-sm mx-auto">
                    Pick any two neighbourhoods from the dropdowns above to see a detailed side-by-side comparison across safety, lifestyle, schools, value, and more.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Area Guides & Insights Section */}
          {activeTab === 'neighbourhoods' && !loading && filteredHoods.length > 0 && (
            <div className="mt-16 md:mt-24 bg-[#F7F9F9]">
              <Reveal>
                <div className="mb-8 md:mb-10 px-4 md:px-6 lg:px-8 pt-8 md:pt-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-5 bg-[#0D5959]"></div>
                    <span className="font-jost text-[#0D5959] text-[12px] uppercase tracking-[0.15em] font-semibold">
                      Featured Area Guides
                    </span>
                  </div>
                  <h2 className="font-prata font-bold text-primary text-[25px] md:text-[35px]">
                    Area Guides &amp; Insights
                  </h2>
                  <p className="font-roboto text-[15px] text-[#636363] max-w-2xl mt-2 leading-relaxed">
                    In-depth guides to help you understand each neighbourhood&apos;s unique character, property market, and lifestyle.
                  </p>
                </div>
              </Reveal>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 md:px-6 lg:px-8 pb-8 md:pb-10 -mx-4 md:-mx-6 lg:-mx-8">
                {filteredHoods.slice(0, 3).map((n, i) => (
                  <Reveal key={n.id} delay={i * 100}>
                    <Link
                      to={areaGuideHref(n.slug)}
                      className="group flex gap-4 cursor-pointer"
                    >
                      <div className="w-20 h-20 shrink-0 overflow-hidden bg-[#F5F5F5]">
                        {n.hero_image ? (
                          <img
                            alt={n.name}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: focalPoint }}
                            src={n.hero_image}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <i className="ri-image-line text-[#636363]"></i>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-prata font-semibold text-primary text-[21px] mb-1 group-hover:text-[#0D5959] transition-colors">
                          {n.name} Guide
                        </h4>
                        <p className="font-roboto text-[15px] text-[#1a1a1a] leading-[1.6] line-clamp-2">
                          {n.summary || n.description || ''}
                        </p>
                        <span className="inline-flex items-center gap-1 font-jost text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0D5959] mt-2 group-hover:text-[#084242] transition-colors">
                          Read more
                          <i className="ri-arrow-right-line"></i>
                        </span>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <Reveal>
            <div className="mt-16 md:mt-24 bg-primary py-14 md:py-20 px-4 md:px-6 text-center -mx-4 md:-mx-6 lg:-mx-8">
              <h3 className="font-prata font-semibold text-white text-[25px] md:text-[33px] mb-4">Let Our Agents Guide You</h3>
              <p className="font-roboto text-white/80 text-[17px] max-w-xl mx-auto leading-relaxed">
                Not sure which neighbourhood fits your lifestyle and budget? Our experienced agents have deep local knowledge of every Nairobi enclave. Tell us your priorities and we will match you with the perfect area.
              </p>
            </div>
          </Reveal>
        </div>
      </main>

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}