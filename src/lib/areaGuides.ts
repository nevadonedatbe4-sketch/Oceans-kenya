/**
 * areaGuides - registry for the Area Guides SEO cluster on oceanske.com.
 *
 * Every premium Nairobi enclave gets a fully-offlined `/area-guides/{area}`
 * page rendered by `AreaGuidePage`, covering the living essentials buyers and
 * agents actually search for: schools, malls, lifestyle, map positioning and
 * live prices. Content is data-resilient (schools/malls/lifestyle/commutes are
 * authored here; the map uses each area's coordinates; price figures fall back
 * to live `neighbourhoods` data at runtime via `usePriceGuide`).
 */

import type { SeoFaq, SeoLink } from '@/lib/seoPages';
import { PREMIUM_AREA_PROFILES, type AreaProfile } from '@/lib/seoClusters';
import { areaSearchHref } from '@/lib/areaSearch';

export interface GuideSchool {
  name: string;
  note: string;
}

export interface GuideMall {
  name: string;
  note: string;
}

/**
 * The mall round-up article that the mall-focused area guides cross-link into.
 * Kept here so the guides and the article share one canonical destination.
 */
export const MALL_SHOPPING_BLOG = {
  href: '/blog/best-shopping-malls-nairobi-2026',
  label: 'The Best Shopping Malls in Nairobi in 2026',
  blurb:
    "Nairobi's top malls ranked, mapped and matched to the neighbourhoods they serve - plus homes for sale and rent near each one.",
};

/** Area guides whose shopping section surfaces the mall round-up article. */
const MALL_BLOG_AREAS = ['westlands', 'kilimani', 'karen'];

/** The mall-article deep link for a given area guide, or null. */
export function getMallBlogLink(areaSlug: string): SeoLink | null {
  if (!MALL_BLOG_AREAS.includes(areaSlug)) return null;
  return { label: MALL_SHOPPING_BLOG.label, href: MALL_SHOPPING_BLOG.href };
}

export interface AreaGuideDef {
  /** URL path + registry key, e.g. "area-guides/karen". */
  slug: string;
  area: string;
  areaSlug: string;
  eyebrow: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string[];
  schools: GuideSchool[];
  malls: GuideMall[];
  /** Short premium lifestyle highlights specific to the area. */
  lifestyle: string[];
  commuteMinutes: number;
  commuteKm: number;
  latitude: number;
  longitude: number;
  avgSale?: number | null;
  rentalRange?: string | null;
  faqs: SeoFaq[];
  related: SeoLink[];
}

/** Per-area coordinates (centred on the centroid Google uses for the map). */
const AREA_COORDS: Record<string, { lat: number; lng: number; minutes: number; km: number }> = {
  karen: { lat: -1.3197, lng: 36.7068, minutes: 30, km: 22 },
  runda: { lat: -1.2294, lng: 36.8242, minutes: 25, km: 17 },
  gigiri: { lat: -1.2359, lng: 36.81, minutes: 22, km: 15 },
  muthaiga: { lat: -1.2588, lng: 36.8367, minutes: 15, km: 9 },
  westlands: { lat: -1.2673, lng: 36.8023, minutes: 10, km: 6 },
  kilimani: { lat: -1.2921, lng: 36.7869, minutes: 12, km: 7 },
  lavington: { lat: -1.278, lng: 36.773, minutes: 15, km: 9 },
  kileleshwa: { lat: -1.2829, lng: 36.7792, minutes: 12, km: 7 },
  riverside: { lat: -1.266, lng: 36.796, minutes: 14, km: 8 },
  kitisuru: { lat: -1.243, lng: 36.769, minutes: 25, km: 16 },
  'spring-valley': { lat: -1.238, lng: 36.785, minutes: 24, km: 15 },
  parklands: { lat: -1.262, lng: 36.816, minutes: 12, km: 7 },
  'upper-hill': { lat: -1.3009, lng: 36.813, minutes: 8, km: 5 },
  'lower-kabete': { lat: -1.248, lng: 36.756, minutes: 28, km: 18 },
  rosslyn: { lat: -1.22, lng: 36.8, minutes: 26, km: 18 },
};

interface GuideSeed {
  schools: GuideSchool[];
  malls: GuideMall[];
  lifestyle: string[];
}

/** Authored living-essentials content, keyed by area slug. */
const GUIDE_SEED: Record<string, GuideSeed> = {
  karen: {
    schools: [
      { name: 'Hillcrest International School', note: 'Renowned international school on Ngong Road, just minutes from south Karen.' },
      { name: 'Braeburn Karen', note: 'Established British-curriculum school serving the Karen and Bomas catchment.' },
      { name: 'German School Nairobi', note: 'German curriculum on Karen Road, popular with the diplomatic community.' },
    ],
    malls: [
      { name: 'The Hub Karen', note: 'The area\'s premier lifestyle mall - dining, cinema, gym and premium retail.' },
      { name: 'Karen Crossroads', note: 'Handy neighbourhood centre for daily groceries, services and eateries.' },
    ],
    lifestyle: [
      'Equestrian roots - enjoy the Karen Country Club, stables and rolling green countryside.',
      'Larger plots, mature gardens and embassy-grade serenity for a true garden-suburb life.',
      'Unhurried, family-first pace with golf, nature walks and cafés close by.',
    ],
  },
  runda: {
    schools: [
      { name: 'International School of Kenya (ISK)', note: 'Premier international school on Kianda Drive, minutes from Runda.' },
      { name: 'Rusinga School', note: 'Well-regarded private school serving the Runda and Loresho corridor.' },
    ],
    malls: [
      { name: 'Runda Mall', note: 'Convenient community mall for daily errands, dining and essentials.' },
      { name: 'The Village Market', note: 'Signature nature-adjacent mall just north, home to Theatre and retail.' },
    ],
    lifestyle: [
      'Nairobi\'s embassy belt - secure, gated estates and diplomatic neighbours.',
      'Manicured lawns, golf and a genuinely unhurried, prestigious pace.',
      'Top-tier security and controlled access across the whole enclave.',
    ],
  },
  gigiri: {
    schools: [
      { name: 'International School of Kenya (ISK)', note: 'World-renowned international school in the heart of the UN precinct.' },
      { name: 'Rosslyn Academy', note: 'Highly regarded American-curriculum school serving the Gigiri area.' },
    ],
    malls: [
      { name: 'The Village Market', note: 'Gigiri\'s flagship mall - artisan market, cinema, restaurants and riverfront.' },
      { name: 'Sarit Centre', note: 'A short drive south to one of Nairobi\'s best-established malls.' },
    ],
    lifestyle: [
      'Cosmopolitan, international community anchored by the UN and embassies.',
      'Leafy, secure streets with some of Nairobi\'s most attractive greenery.',
      'Easy access to malls, schools and the airport corridor for frequent flyers.',
    ],
  },
  muthaiga: {
    schools: [
      { name: 'Cavina School', note: 'Esteemed private school on the northern edge of Muthaiga.' },
      { name: 'Braeburn & international options', note: 'The wider Muthaiga-Lavington corridor hosts respected international curricula.' },
    ],
    malls: [
      { name: 'Muthaiga Shopping Centre', note: 'Quiet, refined local centre for boutique shopping and café life.' },
      { name: 'The Mall Westlands', note: 'A short drive to premium shopping, dining and services.' },
    ],
    lifestyle: [
      'Old-money prestige at Nairobi\'s most storied address.',
      'Golf at the Muthaiga Golf Club and embassy-lined avenues.',
      'Stately homes and grand, secure plots close to the CBD.',
    ],
  },
  westlands: {
    schools: [
      { name: 'Aga Khan Academy', note: 'International school a short drive from Westlands\' residential streets.' },
      { name: 'Braeburn Westlands', note: 'Well-known British-curriculum school within easy reach.' },
    ],
    malls: [
      { name: 'Westgate Mall', note: 'Westlands\' landmark shopping, dining and entertainment destination.' },
      { name: 'Sarit Centre', note: 'Long-established mall with groceries, cinema and services.' },
    ],
    lifestyle: [
      'Nairobi\'s commercial heartbeat - offices, hotels and nightlife on your doorstep.',
      'High-rise, amenity-rich apartment living with strong rental appeal.',
      'Restaurants, gyms and a lively social scene at the centre of the city.',
    ],
  },
  kilimani: {
    schools: [
      { name: 'Riara Group of Schools', note: 'Respected private schools on the nearby Kilimani-Riara corridor.' },
      { name: 'Aga Khan Academy', note: 'Leading international school within easy reach of Kilimani.' },
    ],
    malls: [
      { name: 'Yaya Centre', note: 'Kilimani\'s popular neighbourhood mall for groceries and dining.' },
      { name: 'Prestige Plaza', note: 'Convenient mall with shopping, food and services nearby.' },
    ],
    lifestyle: [
      'Vibrant, walkable and mixed-use - offices, cafés and apartments together.',
      'Perfect for young professionals wanting central, connected living.',
      'Dependable rental demand and a lively, cosmopolitan street life.',
    ],
  },
  lavington: {
    schools: [
      { name: 'Braeburn Lavington', note: 'Esteemed British-curriculum school in the heart of Lavington.' },
      { name: 'Riara Group of Schools', note: 'Leading private schools on the Lavington edge.' },
    ],
    malls: [
      { name: 'Lavington Mall', note: 'The area\'s primary shopping and dining destination.' },
      { name: 'The Mall Westlands', note: 'Premium retail minutes away in neighbouring Westlands.' },
    ],
    lifestyle: [
      'Refined, leafy and quietly prestigious - a polished residential corridor.',
      'Generous plots and top-tier security minutes from the CBD.',
      'First-class dining, schools and lifestyle on your doorstep.',
    ],
  },
  kileleshwa: {
    schools: [
      { name: 'Braeburn & Pumwani options', note: 'Access to respected schools across the Waiyaki Way corridor.' },
      { name: 'Westlands international schools', note: 'Leading international schools a short drive away.' },
    ],
    malls: [
      { name: 'Kileleshwa Plaza', note: 'Neighbourhood plaza for daily shopping and services.' },
      { name: 'The Mall Westlands', note: 'Premium shopping minutes from Kileleshwa.' },
    ],
    lifestyle: [
      'Tree-lined calm with central convenience - rare and sought after.',
      'Low-density gated compounds with generous family living.',
      'Balanced, family-friendly atmosphere close to everything.',
    ],
  },
  riverside: {
    schools: [
      { name: 'Premier international schools', note: 'Riverside sits close to the city\'s best international schools.' },
      { name: 'Aga Khan Academy', note: 'Leading international school within easy reach.' },
    ],
    malls: [
      { name: 'Riverside Square', note: 'Upmarket shopping and dining on Riverside Drive.' },
      { name: 'The Mall Westlands', note: 'Premium retail just across in Westlands.' },
    ],
    lifestyle: [
      'An elite, riverside enclave of luxury apartments and secluded homes.',
      'Exclusive and secure, prized by executives and diplomats.',
      'Greenery and calm yet minutes from the CBD and Westlands.',
    ],
  },
  kitisuru: {
    schools: [
      { name: 'International School of Kenya (ISK)', note: 'World-class international school on Kianda Drive nearby.' },
      { name: 'Rosslyn Academy', note: 'Respected American-curriculum school in the northern corridor.' },
    ],
    malls: [
      { name: 'The Village Market', note: 'Gigiri\'s flagship mall a short drive from Kitisuru.' },
      { name: 'Sarit Centre', note: 'Well-established mall to the south.' },
    ],
    lifestyle: [
      'One of Nairobi\'s fastest-growing premium neighbourhoods.',
      'Established family homes alongside brand-new gated developments.',
      'Great schools, greenery and strong access to the UN precinct.',
    ],
  },
  'spring-valley': {
    schools: [
      { name: 'International School of Kenya (ISK)', note: 'A short drive to Nairobi\'s most prestigious international school.' },
      { name: 'Rosslyn Academy', note: 'Respected international school in the northern corridor.' },
    ],
    malls: [
      { name: 'Spring Valley Mall', note: 'Convenient neighbourhood mall for daily essentials.' },
      { name: 'The Village Market', note: 'Flagship mall in neighbouring Gigiri.' },
    ],
    lifestyle: [
      'Quiet, upscale suburb loved by diplomats and executives.',
      'Mature gardens and calm, secure streets.',
      'Minutes to the UN and Westlands for work and leisure.',
    ],
  },
  parklands: {
    schools: [
      { name: 'Aga Khan Academy', note: 'Premium international school right in the Parklands area.' },
      { name: 'Parklands schools', note: 'A dense cluster of well-regarded private and international schools.' },
    ],
    malls: [
      { name: 'Sarit Centre', note: 'Parklands\' landmark mall just across the border.' },
      { name: 'Diamond Plaza', note: 'Vibrant shopping and dining hub in the heart of Parklands.' },
    ],
    lifestyle: [
      'Cosmopolitan and centrally located with rich heritage.',
      'Excellent schools, hospitals and strong rental demand.',
      'A lively, mixed-use district with everything on your doorstep.',
    ],
  },
  'upper-hill': {
    schools: [
      { name: 'Aga Khan Academy', note: 'Leading international school a short drive from Upper Hill.' },
      { name: 'Premier city schools', note: 'Access to Nairobi\'s top private schools nearby.' },
    ],
    malls: [
      { name: 'The Sails', note: 'Upper Hill\'s upscale dining, hotel and retail destination.' },
      { name: 'Yaya Centre', note: 'Neighbourhood mall near Kilimani.' },
    ],
    lifestyle: [
      'Nairobi\'s ascendant business district of corporate towers.',
      'Premium serviced apartments and high-yield investment.',
      'Easy access to the CBD and the city\'s professional core.',
    ],
  },
  'lower-kabete': {
    schools: [
      { name: 'International School of Kenya (ISK)', note: 'World-class international school within reach.' },
      { name: 'Kabete schools', note: 'A growing cluster of private schools in the corridor.' },
    ],
    malls: [
      { name: 'The Village Market', note: 'Flagship mall in Gigiri a short drive away.' },
      { name: 'Sarit Centre', note: 'Well-established mall to the south.' },
    ],
    lifestyle: [
      'An emerging premium enclave at an accessible price point.',
      'Generous mid-size family homes and new developments.',
      'Close to Kitisuru, schools and the UN precinct.',
    ],
  },
  rosslyn: {
    schools: [
      { name: 'Rosslyn Academy', note: 'Highly regarded American-curriculum school in Rosslyn itself.' },
      { name: 'International School of Kenya (ISK)', note: 'Premier international school on Kianda Drive nearby.' },
    ],
    malls: [
      { name: 'The Village Market', note: 'Gigiri\'s flagship mall literally next door.' },
      { name: 'Rosslyn malls', note: 'Convenient local retail and dining options.' },
    ],
    lifestyle: [
      'A refined executive suburb of gated modern homes.',
      'New premium estates and strong security.',
      'Proximity to the UN, international schools and the diplomatic belt.',
    ],
  },
};

function buildGuideDef(profile: AreaProfile): AreaGuideDef {
  const area = profile.name;
  const areaSlug = profile.slug;
  const slug = `area-guides/${areaSlug}`;
  const seed = GUIDE_SEED[areaSlug] || { schools: [], malls: [], lifestyle: [] };
  const coords = AREA_COORDS[areaSlug] || { lat: -1.2921, lng: 36.8219, minutes: 20, km: 12 };
  const market = profile.market;

  const related: SeoLink[] = [
    { label: `Property prices in ${area}`, href: `/property-prices/${areaSlug}` },
    { label: `Rental prices in ${area}`, href: `/rental-prices/${areaSlug}` },
    { label: `Estate agents in ${area}`, href: `/estate-agents/${areaSlug}` },
    { label: `${area} Properties`, href: areaSearchHref(area) },
    { label: 'Properties for sale in Nairobi', href: '/property-for-sale/nairobi' },
  ];
  const mallLink = getMallBlogLink(areaSlug);
  if (mallLink) related.push(mallLink);

  return {
    slug,
    area,
    areaSlug,
    eyebrow: `Area guide · ${area}`,
    h1: `Where to Live in ${area}, Nairobi`,
    metaTitle: `${area} Area Guide, Nairobi | Oceans Kenya`,
    metaDescription: `Thinking of living in ${area}, Nairobi? Schools, malls, lifestyle, property prices and map location - the complete premium ${area} area guide from Oceans Kenya.`,
    intro: [
      `${market} This ${area} area guide covers everything a discerning buyer, tenant or investor needs to decide if it is the right premium neighbourhood in Nairobi, Kenya.`,
      `Below you will find the area in five minutes: the schools and malls that define everyday life, the lifestyle and commute, a map showing exactly where ${area} sits in the city, and the current property prices that shape the market.`,
    ],
    schools: seed.schools,
    malls: seed.malls,
    lifestyle: seed.lifestyle,
    commuteMinutes: coords.minutes,
    commuteKm: coords.km,
    latitude: coords.lat,
    longitude: coords.lng,
    avgSale: profile.avgSale,
    rentalRange: profile.rentalRange,
    faqs: [
      {
        q: `Is ${area} a good place to live in Nairobi?`,
        a: `Yes. ${area} is one of Nairobi's premium enclaves, combining security, greenery and convenience with strong property values - well suited to families, professionals and investors seeking an elevated lifestyle.`,
      },
      {
        q: `Which international schools are near ${area}?`,
        a: `${area} sits close to several of Nairobi's leading international and private schools. See the schools listed in this guide for the standout options serving the area.`,
      },
      {
        q: `How long is the commute from ${area} to the Nairobi CBD?`,
        a: `The drive from ${area} to the CBD is typically around ${coords.minutes} minutes (${coords.km} km) depending on traffic. See the commute snapshot and map below.`,
      },
      {
        q: `What is the market like in ${area}?`,
        a: `Property values in ${area} are well-established and resilient, with strong demand and premium positioning. Check the live price figures in this guide and on our ${area} property price page for current averages.`,
      },
    ],
    related,
  };
}

/**
 * Every Area Guide cluster page, keyed by its full URL path (e.g.
 * "area-guides/runda"). This MUST match the route path and the slug the page
 * receives, otherwise AREA_GUIDE_PAGES[slug] misses and the guide renders as
 * "not found". Mirrors PROPERTY_PRICE_PAGES which is keyed by full path too.
 */
export const AREA_GUIDE_PAGES: Record<string, AreaGuideDef> = Object.fromEntries(
  PREMIUM_AREA_PROFILES.map((p) => {
    const def = buildGuideDef(p);
    return [def.slug, def];
  }),
);

/** Convenience path list (used for sitemap + validations). */
export const AREA_GUIDE_PATHS: string[] = Object.keys(AREA_GUIDE_PAGES);