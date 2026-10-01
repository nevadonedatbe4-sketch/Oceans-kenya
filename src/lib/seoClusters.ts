/**
 * seoClusters - registries for the Estate Agents and Property Intelligence
 * SEO clusters on oceanske.com.
 *
 * Both clusters are fully data-driven from a single set of premium-area
 * profiles so a page can be added (or an area refreshed) with one entry, and
 * every page is keyword-targeted, crawl-ready and premium-only (Nairobi).
 *
 *   • ESTATE_AGENT_PAGES  → /estate-agents/{area}   (targets "estate agents in
 *     [area] Nairobi" etc.) rendered by EstateAgentPage.
 *   • PROPERTY_PRICE_PAGES → /property-prices/{area} and /rental-prices/{area}
 *     (data-backed authority pages) rendered by PriceGuidePage. The snapshot
 *     figures are fetched LIVE from the neighbourhoods table; the `price`
 *     notes in this registry are only a resilient fallback so the page never
 *     renders empty.
 */

import type { SeoFaq, SeoLink } from '@/lib/seoPages';

// ── Premium-area profiles (single source for the two clusters) ─────────────
export interface AreaProfile {
  name: string;
  slug: string;
  /** Unique, keyword-rich 2-4 sentence description of the area's character. */
  market: string;
  /** Authentic fallback figures; live neighbourhoods data wins at runtime. */
  avgSale?: number | null;
  rentalRange?: string | null;
}

export const PREMIUM_AREA_PROFILES: AreaProfile[] = [
  {
    name: 'Karen',
    slug: 'karen',
    market:
      "Karen is Nairobi's most coveted leafy enclave - a sweeping garden suburb of equestrian life, colonial-era farmhouses and embassy-grade serenity, minutes from the Karen Country Club, Karen Hospital and the region's finest international schools.",
    avgSale: 85000000,
    rentalRange: 'KSh 250,000 - 650,000',
  },
  {
    name: 'Runda',
    slug: 'runda',
    market:
      "Runda is the very definition of Nairobi's embassy belt - a secure, gated expanse of grand villas, manicured lawns and diplomatic residences home to ambassadors, business leaders and discerning families.",
    avgSale: 150000000,
    rentalRange: 'KSh 450,000 - 1,200,000',
  },
  {
    name: 'Gigiri',
    slug: 'gigiri',
    market:
      'Gigiri is Nairobi\'s international quarter, dominated by the UN complex, embassies and a cosmopolitan community that prizes greenery, security and easy access to malls, schools and the airport.',
    avgSale: 85000000,
    rentalRange: 'KSh 250,000 - 700,000',
  },
  {
    name: 'Muthaiga',
    slug: 'muthaiga',
    market:
      "Muthaiga is old-money Nairobi at its most prestigious - stately homes beside the Muthaiga Golf Club, embassies and grand avenues that keep property values amongst the very highest in Kenya.",
    avgSale: 300000000,
    rentalRange: 'KSh 500,000 - 2,000,000',
  },
  {
    name: 'Westlands',
    slug: 'westlands',
    market:
      "Westlands is Nairobi's commercial heartbeat - a cosmopolitan hub of skyscrapers, five-star hotels and premium high-rise apartments that fuel some of the strongest corporate and expat rental demand in the city.",
    avgSale: 60000000,
    rentalRange: 'KSh 200,000 - 650,000',
  },
  {
    name: 'Kilimani',
    slug: 'kilimani',
    market:
      'Kilimani is vibrant, walkable and increasingly modern - a mixed-use district of contemporary apartments, cafés and offices that attracts young professionals and delivers dependable rental yields.',
    avgSale: 55000000,
    rentalRange: 'KSh 180,000 - 550,000',
  },
  {
    name: 'Lavington',
    slug: 'lavington',
    market:
      "Lavington is the polished heart of Nairobi's desirable residential corridor - refined, leafy and quietly prestigious, with generous plots and top-tier security minutes from Westlands and the city's best dining.",
    avgSale: 70000000,
    rentalRange: 'KSh 220,000 - 600,000',
  },
  {
    name: 'Kileleshwa',
    slug: 'kileleshwa',
    market:
      'Kileleshwa offers a rare blend of tree-lined calm and central convenience - low-density gated compounds and generous family homes loved by young professionals and growing families.',
    avgSale: 45000000,
    rentalRange: 'KSh 150,000 - 450,000',
  },
  {
    name: 'Riverside',
    slug: 'riverside',
    market:
      "Riverside is an elite, riverside enclave of luxury apartments and secluded residences near the embassy belt - exclusive, secure and highly sought-after by executives and diplomats.",
    avgSale: 72000000,
    rentalRange: 'KSh 250,000 - 650,000',
  },
  {
    name: 'Kitisuru',
    slug: 'kitisuru',
    market:
      'Kitisuru is one of Nairobi\'s fastest-growing premium neighbourhoods, blending established family homes with a wave of new gated developments and strong access to schools and the UN precinct.',
    avgSale: 38000000,
    rentalRange: 'KSh 120,000 - 350,000',
  },
  {
    name: 'Spring Valley',
    slug: 'spring-valley',
    market:
      'Spring Valley is a quiet, upscale suburb prized by diplomats and executives for its mature gardens, gated family homes and calm, secure streets close to the UN and Westlands.',
    avgSale: 95000000,
    rentalRange: 'KSh 350,000 - 900,000',
  },
  {
    name: 'Parklands',
    slug: 'parklands',
    market:
      'Parklands is one of Nairobi\'s most cosmopolitan, centrally-located districts - a lively mix of residential and commercial with excellent schools, hospitals and strong rental demand.',
    avgSale: null,
    rentalRange: null,
  },
  {
    name: 'Upper Hill',
    slug: 'upper-hill',
    market:
      'Upper Hill is Nairobi\'s ascendant business district, home to corporate towers and premium serviced apartments that make it a prime, high-yield choice for investors and executives.',
    avgSale: null,
    rentalRange: null,
  },
  {
    name: 'Lower Kabete',
    slug: 'lower-kabete',
    market:
      'Lower Kabete is an emerging premium enclave offering generous mid-size family homes and new developments at an accessible price point, close to Kitisuru and the UN precinct.',
    avgSale: 38000000,
    rentalRange: 'KSh 120,000 - 350,000',
  },
  {
    name: 'Rosslyn',
    slug: 'rosslyn',
    market:
      'Rosslyn is a refined executive suburb of gated modern homes and new premium estates, prized for its proximity to the UN, international schools and the diplomatic corridor.',
    avgSale: 125000000,
    rentalRange: 'KSh 450,000 - 1,500,000',
  },
];

// ── Cluster 2: Estate Agents -----------------------------------------------
export interface EstateAgentDef {
  slug: string;
  area: string;
  areaSlug: string;
  purpose: 'sale' | 'rent';
  eyebrow: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string[];
  faqs: SeoFaq[];
  related: SeoLink[];
}

function buildEstateAgentDef(profile: AreaProfile): EstateAgentDef {
  const area = profile.name;
  const areaSlug = profile.slug;
  const slug = `estate-agents/${areaSlug}`;
  const market = profile.market;
  return {
    slug,
    area,
    areaSlug,
    purpose: 'sale',
    eyebrow: `Estate agents · ${area}`,
    h1: `Estate Agents in ${area}, Nairobi`,
    metaTitle: `Estate Agents In ${area}, Nairobi | Oceans Kenya`,
    metaDescription: `Find expert real estate agents in ${area}, Nairobi. Buy, sell or let luxury property in ${area} with Oceans Kenya's premium local agents.`,
    intro: [
      `${market} Our ${area} estate agents know every street, gated community and price band intimately - matching buyers, sellers and tenants with exactly the right premium property.`,
      `Searching for \"estate agents in ${area}, Nairobi\"? Oceans Kenya's local team delivers precise valuations, off-market opportunities and carefully negotiated sales across ${area}. Whether you are buying, selling or letting a luxury home, our ${area} real estate agents provide white-glove guidance from first viewing to completion.`,
    ],
    faqs: [
      {
        q: `How do I find the best real estate agents in ${area}, Nairobi?`,
        a: `Look for a locally-rooted, specialist agency with deep ${area} market knowledge and a transparent process. Oceans Kenya agents live and work the ${area} area, providing precise valuations, off-market listings and honest negotiation.`,
      },
      {
        q: `Do your ${area} agents handle both buying and selling?`,
        a: `Yes. Our ${area} estate agents manage the full lifecycle - acquisitions for private clients, discreet sales of family homes, investment purchases and premium rentals across ${area}.`,
      },
      {
        q: `Do you offer off-market property in ${area}?`,
        a: `Often, yes. Many of the best ${area} homes are sold privately. Speak to an Oceans Kenya ${area} agent to access our confidential, off-market collection.`,
      },
    ],
    related: [
      {
        label: `${area} Neighbourhood Guide`,
        href: `/neighbourhood/${areaSlug}`,
      },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
      { label: 'Property to rent in Nairobi', href: '/property-for-rent/nairobi' },
      {
        label: `Property prices in ${area}`,
        href: `/property-prices/${areaSlug}`,
      },
      {
        label: `Rental prices in ${area}`,
        href: `/rental-prices/${areaSlug}`,
      },
    ],
  };
}

/**
 * Every Estate Agent cluster page, keyed by its full URL path (e.g.
 * "estate-agents/karen"). Keying by the full path keeps the registry in sync
 * with the route path and the slug the page receives, so the lookup resolves.
 */
export const ESTATE_AGENT_PAGES: Record<string, EstateAgentDef> = Object.fromEntries(
  PREMIUM_AREA_PROFILES.map((p) => {
    const def = buildEstateAgentDef(p);
    return [def.slug, def];
  }),
);

// ── Cluster 3: Property Intelligence (price guides) ------------------------
export interface PriceGuideDef {
  slug: string;
  area: string;
  areaSlug: string;
  mode: 'property' | 'rental';
  eyebrow: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string[];
  faqs: SeoFaq[];
  related: SeoLink[];
}

function buildPriceGuideDef(profile: AreaProfile, mode: 'property' | 'rental'): PriceGuideDef {
  const area = profile.name;
  const areaSlug = profile.slug;
  const slug = mode === 'property' ? `property-prices/${areaSlug}` : `rental-prices/${areaSlug}`;
  const market = profile.market;

  if (mode === 'property') {
    return {
      slug,
      area,
      areaSlug,
      mode,
      eyebrow: `Property prices · ${area}`,
      h1: `Property Prices in ${area}, Nairobi`,
      metaTitle: `Property Prices In ${area} | Oceans Kenya`,
      metaDescription: `Current property prices in ${area}, Nairobi. Average sale prices, trends and investment insight for premium ${area} real estate.`,
      intro: [
        `${market} Understanding current property prices in ${area} is the key to a confident buy, sale or investment decision.`,
        `This ${area} property price guide is built directly from our live market data - indicating the average sale price for premium homes in ${area}, what drives values, and how ${area} compares with the surrounding premium enclaves of Nairobi, Kenya.`,
      ],
      faqs: [
        {
          q: `What is the average price of a home in ${area}, Nairobi?`,
          a: `Homes in ${area} span a wide premium band depending on size, plot and build quality. Our live market data shows the indicative average sale price for ${area} below, and values in ${area} have proven resilient and appreciating over the long term.`,
        },
        {
          q: `Is ${area} a good place to invest in property?`,
          a: `Yes. ${area} benefits from strong, sustained demand and premium positioning within Nairobi, offering dependable long-term capital appreciation for well-selected homes.`,
        },
        {
          q: `What affects property prices in ${area}?`,
          a: `Plot size, house type and condition, security, proximity to schools and amenities, and the area's reputation all drive values in ${area}. Premium homes on larger, well-located plots command the highest prices.`,
        },
      ],
      related: [
        { label: `Rental prices in ${area}`, href: `/rental-prices/${areaSlug}` },
        { label: `Estate agents in ${area}`, href: `/estate-agents/${areaSlug}` },
        { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
        { label: `${area} Neighbourhood Guide`, href: `/neighbourhood/${areaSlug}` },
      ],
    };
  }

  return {
    slug,
    area,
    areaSlug,
    mode,
    eyebrow: `Rental prices · ${area}`,
    h1: `Rental Prices in ${area}, Nairobi`,
    metaTitle: `Rental Prices In ${area} | Oceans Kenya`,
    metaDescription: `Current rental prices in ${area}, Nairobi. Monthly rent ranges, tenancy insight and investment yields for premium ${area} rentals.`,
    intro: [
      `${market} Knowing what premium properties rent for in ${area} is essential whether you are a tenant or an investor planning a buy-to-let.`,
      `This ${area} rental price guide is built directly from our live market data - showing the typical monthly rent range in ${area}, how yields compare with the surrounding premium enclaves, and what drives demand across Nairobi, Kenya.`,
    ],
    faqs: [
      {
        q: `How much does it cost to rent premium property in ${area}, Nairobi?`,
        a: `Rents in ${area} vary with property type, size and furnishing. Our live market data shows the indicative monthly rent range for ${area} below, and premium homes in ${area} command some of the strongest rents in Nairobi.`,
      },
      {
        q: `Are rentals in ${area} a good investment?`,
        a: `Yes. ${area} enjoys consistent tenant demand, and premium rentals typically deliver dependable yields with strong long-term capital growth, making it an attractive buy-to-let location.`,
      },
      {
        q: `What drives rental demand in ${area}?`,
        a: `Proximity to business districts, embassies, schools and amenities, plus strong security and lifestyle appeal, keep rental demand and rents in ${area} resilient year-round.`,
      },
    ],
    related: [
      { label: `Property prices in ${area}`, href: `/property-prices/${areaSlug}` },
      { label: `Estate agents in ${area}`, href: `/estate-agents/${areaSlug}` },
      { label: 'Property to rent in Nairobi', href: '/property-for-rent/nairobi' },
      { label: `${area} Neighbourhood Guide`, href: `/neighbourhood/${areaSlug}` },
    ],
  };
}

/** Build the price cluster entries only for areas that have authentic data. */
const PRICED_PROFILES = PREMIUM_AREA_PROFILES.filter((p) => p.avgSale != null && p.rentalRange != null);

/** Every Property / Rental Intelligence page, keyed by URL path. */
export const PROPERTY_PRICE_PAGES: Record<string, PriceGuideDef> = Object.fromEntries(
  PRICED_PROFILES.flatMap((p) => [
    [`property-prices/${p.slug}`, buildPriceGuideDef(p, 'property')],
    [`rental-prices/${p.slug}`, buildPriceGuideDef(p, 'rental')],
  ]),
);

// ── Convenience path lists (used for sitemap + validations) ────────────────
export const ESTATE_AGENT_PATHS: string[] = Object.keys(ESTATE_AGENT_PAGES);
export const PROPERTY_PRICE_PATHS: string[] = Object.keys(PROPERTY_PRICE_PAGES);