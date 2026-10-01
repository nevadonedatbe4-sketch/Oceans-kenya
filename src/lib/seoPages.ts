/**
 * seoPages - canonical SEO page registry for oceanske.com.
 *
 * Each entry defines ONE crawl-ready, keyword-driven page that renders through
 * the shared `SeoListingPage` template (H1, SEO intro, dynamic listing grid,
 * FAQs with schema, breadcrumbs, and internal links) and pulls live listings
 * from the same engine used by /buy and /rent.
 *
 * Naming discipline:
 *   • `slug` is BOTH the URL path and the registry key.
 *   • `search` is the free-text location fed to the shared parser so the
 *     engine applies exactly the right Nairobi / area filter.
 *   • `propertyType` is a canonical listings.property_type value.
 *   • `amenitiesFilter` maps to the listings.amenities array (additive filter).
 *
 * ONLY premium Nairobi neighbourhoods are used (never mass-market areas).
 */

export interface SeoFaq {
  q: string;
  a: string;
}

export interface SeoLink {
  label: string;
  href: string;
}

export interface SeoPageDef {
  /** URL path + registry key, e.g. "houses-for-sale/karen". */
  slug: string;
  /** Breadcrumb parent cluster label. */
  section: 'Buy' | 'Rent' | 'Property';
  /** purpose filter passed to the listing engine. */
  purpose: 'sale' | 'rent';
  /** Location text fed to the shared search parser (area or city). */
  search: string;
  /** Optional canonical listings.property_type value. */
  propertyType?: string;
  /** Optional listings.property_category filter (e.g. 'commercial', 'land'). */
  propertyCategory?: string;
  /** Optional additive amenities filter (listings.amenities array). */
  amenitiesFilter?: string[];
  /** Optional strict sub-type discriminator (listings.sub_type), e.g. 'duplex' or 'modern'. */
  subTypeFilter?: string;
  /** Optional minimum-price floor used for "luxury" styled pages (KES). */
  priceMin?: number;
  eyebrow: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string[];
  faqs: SeoFaq[];
  related: SeoLink[];
}

/** Premium-only Nairobi enclaves (canonical slugs from the location registry). */
export const PREMIUM_AREAS: SeoLink[] = [
  { label: 'Karen', href: '/neighbourhood/karen' },
  { label: 'Runda', href: '/neighbourhood/runda' },
  { label: 'Gigiri', href: '/neighbourhood/gigiri' },
  { label: 'Muthaiga', href: '/neighbourhood/muthaiga' },
  { label: 'Westlands', href: '/neighbourhood/westlands' },
  { label: 'Kilimani', href: '/neighbourhood/kilimani' },
  { label: 'Lavington', href: '/neighbourhood/lavington' },
  { label: 'Kileleshwa', href: '/neighbourhood/kileleshwa' },
  { label: 'Riverside', href: '/neighbourhood/riverside' },
  { label: 'Kitisuru', href: '/neighbourhood/kitisuru' },
  { label: 'Spring Valley', href: '/neighbourhood/spring-valley' },
  { label: 'Parklands', href: '/neighbourhood/parklands' },
  { label: 'Upper Hill', href: '/neighbourhood/upper-hill' },
];

/**
 * SEO landing heroes deliberately use a branded gradient band instead of a
 * generated image - directory/neighbourhood content must never show fictional
 * or AI-generated imagery.
 */

/** All Popular Searches cluster pages, keyed by URL path. */
export const SEO_PAGES: Record<string, SeoPageDef> = {
  'property-for-sale/nairobi': {
    slug: 'property-for-sale/nairobi',
    section: 'Buy',
    purpose: 'sale',
    search: 'Nairobi',
    eyebrow: 'Premium property',
    h1: 'Property for Sale in Nairobi',
    metaTitle: 'Property For Sale In Nairobi | Oceans Kenya',
    metaDescription:
      'Browse premium property for sale in Nairobi, Kenya. Luxury houses, apartments, villas and townhouses across the city\'s most sought-after neighbourhoods.',
    intro: [
      "Nairobi is East Africa's most dynamic property market, and Oceans Kenya curates only its finest homes. From modern high-rise apartments in Westlands and Kilimani to grand family residences in Karen and Runda, every listing in this collection is hand-vetted by our agents for quality, provenance and genuine value.",
      'Whether you are a first-time buyer seeking a secure, gated apartment or an investor hunting long-term appreciation in the diplomatic belt, this is the definitive guide to property for sale in Nairobi, Kenya. Every home is priced in the local currency with full transparency, and our agents offer private viewings across all premium enclaves.',
    ],
    faqs: [
      {
        q: 'What is the typical price of property for sale in Nairobi?',
        a: "Prime Nairobi prices vary widely by neighbourhood: apartments in Westlands and Kilimani typically range from KES 30-100 million, while family houses in Karen, Runda and Muthaiga commonly start around KES 50 million and can exceed KES 200 million for estates on full acre plots.",
      },
      {
        q: 'Which Nairobi neighbourhood are best for investment?',
        a: 'Westlands, Upper Hill and Kilimani offer strong rental yields from the corporate and expat demand, while Runda, Gigiri and Muthaiga deliver long-term capital appreciation and prestige. Our investment property pages break down yields and trends for each enclave.',
      },
      {
        q: 'Do you handle off-market property in Nairobi?',
        a: "Yes. Many of our premium homes are sold off-market. Speak to an Oceans Kenya agent to access unlisted opportunities across Nairobi's most desirable streets.",
      },
    ],
    related: [
      { label: 'Houses for sale in Karen', href: '/houses-for-sale/karen' },
      { label: 'Apartments for sale in Westlands', href: '/apartments-for-sale/westlands' },
      { label: 'Luxury homes in Nairobi', href: '/luxury-homes-nairobi' },
      { label: 'Investment property in Nairobi', href: '/investment-property-nairobi' },
      { label: 'Property to rent in Nairobi', href: '/property-for-rent/nairobi' },
    ],
  },

  'property-for-rent/nairobi': {
    slug: 'property-for-rent/nairobi',
    section: 'Rent',
    purpose: 'rent',
    search: 'Nairobi',
    eyebrow: 'Premium rentals',
    h1: 'Property to Rent in Nairobi',
    metaTitle: 'Property To Rent In Nairobi | Oceans Kenya',
    metaDescription:
      'Find premium property to rent in Nairobi, Kenya. Luxury apartments, houses, villas and serviced homes in Westlands, Kilimani, Karen and more.',
    intro: [
      "Renting in Nairobi has never been easier with Oceans Kenya. Our premium lettings portfolio covers the city's most desirable addresses - from furnished executive apartments in Westlands to gated family houses in Karen and Lavington. Every rental is inspected, priced and managed to the highest standard.",
      "Whether you are an expat relocating for work or a family seeking a calm, secure enclave, our lettings team matches you with the right home and negotiates favourable terms. This is your complete guide to premium property to rent in Nairobi, Kenya.",
    ],
    faqs: [
      {
        q: 'How much does it cost to rent premium property in Nairobi?',
        a: 'A one-bedroom apartment in Kilimani or Westlands typically rents from KES 60-120k per month, while a two or three-bedroom luxury unit ranges KES 120-250k. Family houses in Karen, Lavington and Runda usually start around KES 200k and rise to KES 600k+ for large gated estates.',
      },
      {
        q: 'Are furnished and serviced apartments available in Nairobi?',
        a: "Yes. Furnished and serviced apartments are widely available in Westlands, Kilimani and Upper Hill, ideal for executives and long-term visitors who want a premium home without the hassle of furnishing.",
      },
      {
        q: 'How do I arrange a viewing for a rental in Nairobi?',
        a: 'Simply contact our lettings team or request a viewing through any listing. We schedule private, guided viewings across Nairobi at times that suit you, and can arrange virtual tours for international clients.',
      },
    ],
    related: [
      { label: 'Apartments to rent in Westlands', href: '/apartments-to-rent/westlands' },
      { label: 'Houses to rent in Karen', href: '/houses-to-rent/karen' },
      { label: 'Furnished apartments in Westlands', href: '/furnished-apartments/westlands' },
      { label: 'Serviced apartments in Nairobi', href: '/serviced-apartments/nairobi' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
    ],
  },

  'apartments-for-sale/westlands': {
    slug: 'apartments-for-sale/westlands',
    section: 'Buy',
    purpose: 'sale',
    search: 'Westlands',
    propertyType: 'apartment',
    eyebrow: 'Apartments · Westlands',
    h1: 'Apartments for Sale in Westlands, Nairobi',
    metaTitle: 'Apartments For Sale In Westlands | Oceans Kenya',
    metaDescription:
      'Buy premium apartments for sale in Westlands, Nairobi. Modern high-rise, penthouses and gated apartment blocks in the city\'s corporate heart.',
    intro: [
      "Westlands is Nairobi's commercial powerhouse and the epicentre of modern high-rise living. Our exclusive collection of apartments for sale in Westlands ranges from sleek one-bedroom executive units to sprawling penthouses with sweeping skyline views, all set within gated, amenity-rich developments minutes from the business district.",
      "For buyers seeking both lifestyle and a strong rental return, Westlands delivers. World-class restaurants, shopping malls, hotels and offices are steps away, while dedicated gyms, pools and secure parking come as standard. Explore Westlands apartments for sale with Oceans Kenya and secure your place in the city's most connected neighbourhood.",
    ],
    faqs: [
      {
        q: 'Are Westlands apartments a good investment?',
        a: 'Yes. Westlands consistently offers some of the strongest rental yields in Nairobi thanks to the corporate, hotel and expat demand concentrated there. New developments also appreciate well as the area continues to densify.',
      },
      {
        q: 'What amenities do Westlands apartments offer?',
        a: 'Most premium buildings provide a pool, gym, secure underground parking, 24-hour security, borehole water, backup power and high-speed lifts. Penthouses add private terraces and panoramic skyline views.',
      },
      {
        q: 'How much is an apartment in Westlands?',
        a: 'Apartments for sale in Westlands typically range from about KES 30 million for a modern one-bedroom up to KES 150 million-plus for large penthouses. Prices vary with floor level, views and building amenities.',
      },
    ],
    related: [
      { label: 'Westlands Neighbourhood Guide', href: '/neighbourhood/westlands' },
      { label: 'Penthouses for sale in Westlands', href: '/penthouses-for-sale/westlands' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
      { label: 'Apartments for sale in Kileleshwa', href: '/apartments-for-sale/kileleshwa' },
      { label: 'Serviced apartments in Nairobi', href: '/serviced-apartments/nairobi' },
    ],
  },

  'apartments-to-rent/westlands': {
    slug: 'apartments-to-rent/westlands',
    section: 'Rent',
    purpose: 'rent',
    search: 'Westlands',
    propertyType: 'apartment',
    eyebrow: 'Rentals · Westlands',
    h1: 'Apartments to Rent in Westlands, Nairobi',
    metaTitle: 'Apartments To Rent In Westlands | Oceans Kenya',
    metaDescription:
      'Rent premium apartments in Westlands, Nairobi. Furnished and unfurnished executive apartments, serviced units and modern rentals.',
    intro: [
      "If you want to live at the heart of Nairobi's business scene, apartments to rent in Westlands are the answer. Our lettings portfolio features bright, modern executive units - from compact studios for young professionals to generous three-bedroom apartments for families - all in secure, gated developments with excellent amenities.",
      "Living here means easy commuting, top-tier dining and shopping on your doorstep. Whether you need a fully furnished corporate let or an unfurnished family home, Oceans Kenya's Westlands lettings team makes securing the right apartment fast, transparent and stress-free.",
    ],
    faqs: [
      {
        q: 'How much is a Westlands apartment per month?',
        a: 'Rents in Westlands range from about KES 60,000 for a modest studio to KES 250,000+ for a premium three-bedroom apartment. Furnished and serviced units command a premium over unfurnished ones.',
      },
      {
        q: 'Are furnished apartments available in Westlands?',
        a: 'Yes - Westlands is the most supplied area for furnished and serviced apartments in Nairobi, made for executives and international staff, often with housekeeping, gym and concierge services included.',
      },
      {
        q: 'Can I rent in Westlands on a short-term basis?',
        a: 'Yes. Many buildings offer flexible and serviced short-term rentals. Contact our lettings team for availability and rates on corporate, furnished and short-let units.',
      },
    ],
    related: [
      { label: 'Westlands Neighbourhood Guide', href: '/neighbourhood/westlands' },
      { label: 'Furnished apartments in Westlands', href: '/furnished-apartments/westlands' },
      { label: 'Property to rent in Nairobi', href: '/property-for-rent/nairobi' },
      { label: 'Serviced apartments in Nairobi', href: '/serviced-apartments/nairobi' },
      { label: 'Apartments for sale in Westlands', href: '/apartments-for-sale/westlands' },
    ],
  },

  'apartments-for-sale/kileleshwa': {
    slug: 'apartments-for-sale/kileleshwa',
    section: 'Buy',
    purpose: 'sale',
    search: 'Kileleshwa',
    propertyType: 'apartment',
    eyebrow: 'Apartments · Kileleshwa',
    h1: 'Apartments for Sale in Kileleshwa, Nairobi',
    metaTitle: 'Apartments For Sale In Kileleshwa | Oceans Kenya',
    metaDescription:
      'Buy premium apartments for sale in Kileleshwa, Nairobi. Modern gated apartments, penthouses and family homes in a leafy central enclave.',
    intro: [
      "Kileleshwa offers a rare blend of tree-lined calm and central convenience. Our curated apartments for sale in Kileleshwa sit in low-density gated communities loved by young professionals and growing families, offering generous living space, gardens and strong security at a sensible premium.",
      "Located minutes from Westlands, the CBD and the key lifestyle corridors, Kileleshwa apartments deliver excellent value and reliable rental demand. Let Oceans Kenya help you find the ideal Kileleshwa apartment for sale - a smart, serene investment in one of Nairobi's most balanced neighbourhoods.",
    ],
    faqs: [
      {
        q: 'How much is an apartment in Kileleshwa?',
        a: 'Kileleshwa apartments for sale typically range from about KES 25-35 million for a two-bedroom to KES 70-100 million for large four-bedroom units and penthouses. The leafy setting and security command a premium over nearby areas.',
      },
      {
        q: 'Is Kileleshwa good for families?',
        a: 'Yes. Kileleshwa is residential and secure with many gated compounds, gardens and good schools nearby, making it a popular choice for families wanting central but peaceful living.',
      },
      {
        q: 'What is the rental yield in Kileleshwa?',
        a: 'Kileleshwa delivers dependable yields of around 5-7% thanks to the steady demand from young professionals, families and expat tenants drawn to its location and leafy charm.',
      },
    ],
    related: [
      { label: 'Kileleshwa Neighbourhood Guide', href: '/neighbourhood/kileleshwa' },
      { label: 'Apartments for sale in Westlands', href: '/apartments-for-sale/westlands' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
      { label: 'Luxury homes in Nairobi', href: '/luxury-homes-nairobi' },
    ],
  },

  'houses-for-sale/karen': {
    slug: 'houses-for-sale/karen',
    section: 'Buy',
    purpose: 'sale',
    search: 'Karen',
    propertyType: 'house',
    eyebrow: 'Houses · Karen',
    h1: 'Houses for Sale in Karen, Nairobi',
    metaTitle: 'Houses For Sale In Karen, Nairobi | Oceans Kenya',
    metaDescription:
      'Buy luxury houses for sale in Karen, Nairobi. Leafy plots, gated family homes and contemporary residences in Nairobi\'s greenest enclave.',
    intro: [
      "Karen is Nairobi's most celebrated residential address - a sweeping, leafy garden suburb of mature trees, equestrian lifestyle and embassy-grade serenity. Our houses for sale in Karen span grand colonial-era farmhouses, modern architectural masterpieces and family estates on generous green plots, all within reach of the Karen Country Club, Karen Hospital and the region's best international schools.",
      "For buyers who prize space, privacy and enduring value, Karen delivers like nowhere else in the capital. Explore Karen houses for sale with Oceans Kenya and discover a home defined by nature, exclusivity and a genuinely elevated way of living.",
    ],
    faqs: [
      {
        q: 'How much is a house in Karen?',
        a: 'Houses for sale in Karen typically range from about KES 50 million for a family home on a quarter-acre to KES 200 million+ for large estates. Plots alone in Karen commonly sell for KES 25-60 million depending on size and location.',
      },
      {
        q: 'Are Karen houses suitable for families?',
        a: 'Absolutely. Karen is renowned for its excellent international schools, safe streets, greenery and equestrian facilities - making it the top choice for families and diplomats seeking a premium, nature-rich life.',
      },
      {
        q: 'Does Karen have good security?',
        a: "Yes. Karen gated communities, private estates and the ambassador-level presence ensure some of the strongest security in Nairobi. Many homes sit within secure compounds with 24-hour manned gates and CCTV.",
      },
    ],
    related: [
      { label: 'Karen Neighbourhood Guide', href: '/neighbourhood/karen' },
      { label: 'Luxury homes in Nairobi', href: '/luxury-homes-nairobi' },
      { label: 'Houses for sale in Lavington', href: '/houses-for-sale/lavington' },
      { label: 'Villas for sale in Runda', href: '/villas-for-sale/runda' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
    ],
  },

  'houses-to-rent/karen': {
    slug: 'houses-to-rent/karen',
    section: 'Rent',
    purpose: 'rent',
    search: 'Karen',
    propertyType: 'house',
    eyebrow: 'Rentals · Karen',
    h1: 'Houses to Rent in Karen, Nairobi',
    metaTitle: 'Houses To Rent In Karen, Nairobi | Oceans Kenya',
    metaDescription:
      'Rent premium houses in Karen, Nairobi. Gated family homes, serviced residences and spacious gardens in Nairobi\'s greenest suburb.',
    intro: [
      "Experience the calm of Nairobi's greenest suburb with our houses to rent in Karen. Our lettings portfolio features spacious gated family homes, elegant serviced residences and expansive garden properties - the perfect backdrop for a secure, family-first lifestyle in the capital.",
      "From the open green lawns to the equestrian clubs, international schools and the Karen Country Club, a Karen home offers quality of life that is hard to match. Whether you need a corporate lease or a long-term family home, Oceans Kenya's Karen lettings team is here to help.",
    ],
    faqs: [
      {
        q: 'How much is it to rent a house in Karen?',
        a: 'Karen house rents typically range from KES 200,000 per month for a standard four-bedroom family home to KES 600,000+ for expansive gated estates. Furnished and serviced homes command a premium.',
      },
      {
        q: 'Are Karen rentals suitable for expats?',
        a: 'Yes. Karen is one of Nairobi\'s most expat-friendly areas, with international schools, a strong diplomatic community, and easy access to Karen Country Club, malls and the airport.',
      },
      {
        q: 'What should I look for in a Karen rental?',
        a: 'Prioritise gated compounds with 24-hour security, backup power and water, ample parking and clear lease terms. Many families also value a servant quarter, garden space and proximity to international schools.',
      },
    ],
    related: [
      { label: 'Karen Neighbourhood Guide', href: '/neighbourhood/karen' },
      { label: 'Property to rent in Nairobi', href: '/property-for-rent/nairobi' },
      { label: 'Houses for sale in Karen', href: '/houses-for-sale/karen' },
      { label: 'Houses to rent in Lavington', href: '/houses-to-rent/lavington' },
    ],
  },

  'houses-for-sale/lavington': {
    slug: 'houses-for-sale/lavington',
    section: 'Buy',
    purpose: 'sale',
    search: 'Lavington',
    propertyType: 'house',
    eyebrow: 'Houses · Lavington',
    h1: 'Houses for Sale in Lavington, Nairobi',
    metaTitle: 'Houses For Sale In Lavington, Nairobi | Oceans Kenya',
    metaDescription:
      'Buy premium houses for sale in Lavington, Nairobi. Refined family homes, bungalows and residences in one of Nairobi\'s most coveted enclaves.',
    intro: [
      "Lavington is the polished heart of Nairobi's desirable residential corridor - refined, leafy and quietly prestigious. Our houses for sale in Lavington combine generous plots, elegant architecture and top-tier security, all minutes from Westlands, schools and the city's best dining.",
      "It is a neighbourhood that has long attracted families, professionals and government figures seeking a calm but connected base. Browse Lavington houses for sale with Oceans Kenya and invest in one of Nairobi's most enduring and liveable addresses.",
    ],
    faqs: [
      {
        q: 'How much is a house in Lavington?',
        a: 'Lavington houses for sale typically range from KES 46 million for a family home to KES 120 million+ for large modern residences on quarter-acre plots. Land and redevelopment value remains strong.',
      },
      {
        q: 'Why do buyers choose Lavington?',
        a: 'Lavington offers a rare mix of luxury, security and convenience - close to Westlands and the city yet calm and leafy, with excellent schools and family amenities nearby.',
      },
      {
        q: 'Is Lavington a good long-term investment?',
        a: 'Yes. Continual demand, limited supply of prime plots and enduring prestige make Lavington one of Nairobi\'s most resilient and appreciating residential markets.',
      },
    ],
    related: [
      { label: 'Lavington Neighbourhood Guide', href: '/neighbourhood/lavington' },
      { label: 'Houses for sale in Karen', href: '/houses-for-sale/karen' },
      { label: 'Townhouses for sale in Lavington', href: '/townhouses-for-sale/lavington' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
    ],
  },

  'houses-to-rent/lavington': {
    slug: 'houses-to-rent/lavington',
    section: 'Rent',
    purpose: 'rent',
    search: 'Lavington',
    propertyType: 'house',
    eyebrow: 'Rentals · Lavington',
    h1: 'Houses to Rent in Lavington, Nairobi',
    metaTitle: 'Houses To Rent In Lavington, Nairobi | Oceans Kenya',
    metaDescription:
      'Rent premium houses in Lavington, Nairobi. Refined family homes and gated residences in one of Nairobi\'s most coveted enclaves.',
    intro: [
      "Secure a refined home in one of Nairobi's most beloved enclaves with our houses to rent in Lavington. The portfolio offers elegant family homes, gated compounds and spacious residences set among mature trees, combining premium quality of life with easy access to the city.",
      "Lavington's leafy streets, excellent schools and family-friendly atmosphere make it a top choice for executives and families alike. Whether you seek a furnished corporate home or a long-term family residence, Oceans Kenya's Lavington lettings team will find the perfect fit.",
    ],
    faqs: [
      {
        q: 'How much does it cost to rent a house in Lavington?',
        a: 'Lavington house rents typically range from KES 150,000 per month for a comfortable four-bedroom home to KES 400,000+ for large gated residences. Serviced homes are priced higher.',
      },
      {
        q: 'Is Lavington good for families?',
        a: 'Yes. Lavington is exceptionally family-friendly with security, green space, and proximity to leading schools and amenities, making it ideal for long-term family living.',
      },
      {
        q: 'Are Lavington rentals furnished?',
        a: 'Some premium homes come furnished and serviced on request. Contact our lettings team to discuss furnished options and corporate leasing terms for Lavington.',
      },
    ],
    related: [
      { label: 'Lavington Neighbourhood Guide', href: '/neighbourhood/lavington' },
      { label: 'House to rent in Karen', href: '/houses-to-rent/karen' },
      { label: 'Property to rent in Nairobi', href: '/property-for-rent/nairobi' },
      { label: 'Houses for sale in Lavington', href: '/houses-for-sale/lavington' },
    ],
  },

  'townhouses-for-sale/lavington': {
    slug: 'townhouses-for-sale/lavington',
    section: 'Buy',
    purpose: 'sale',
    search: 'Lavington',
    propertyType: 'townhouse',
    eyebrow: 'Townhouses · Lavington',
    h1: 'Townhouses for Sale in Lavington, Nairobi',
    metaTitle: 'Townhouses For Sale In Lavington | Oceans Kenya',
    metaDescription:
      'Buy premium townhouses for sale in Lavington, Nairobi. Modern gated townhouses, duplexes and family homes in a refined enclave.',
    intro: [
      "For those who want the space of a house with the services and security of a modern development, townhouses for sale in Lavington are the perfect answer. These contemporary gated homes offer open-plan living, private gardens, parking and premium finishes, all within Lavington's tranquil, tree-lined setting.",
      "Townhouses combine strong capital appreciation with excellent family livability and lower maintenance than a standalone residence. Explore Lavington townhouses for sale with Oceans Kenya and secure a refined, low-maintenance home in one of the city's most sought-after enclaves.",
    ],
    faqs: [
      {
        q: 'How much is a townhouse in Lavington?',
        a: 'Lavington townhouses for sale typically range from about KES 40 million for a three-bedroom modern unit to KES 90 million+ for large four-bedroom duplexes in premium gated communities.',
      },
      {
        q: 'Do Lavington townhouses come with security and amenities?',
        a: 'Yes - most are within gated communities offering 24-hour security, backup power, water, and often a communal pool and gym, plus private parking and gardens.',
      },
      {
        q: 'Are townhouses a good investment in Nairobi?',
        a: 'Townhouses are increasingly popular with families and offer solid appreciation. Their low maintenance and high rental appeal make them a strong, versatile investment.',
      },
    ],
    related: [
      { label: 'Lavington Neighbourhood Guide', href: '/neighbourhood/lavington' },
      { label: 'Houses for sale in Lavington', href: '/houses-for-sale/lavington' },
      { label: 'Villas for sale in Runda', href: '/villas-for-sale/runda' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
    ],
  },

  'villas-for-sale/runda': {
    slug: 'villas-for-sale/runda',
    section: 'Buy',
    purpose: 'sale',
    search: 'Runda',
    propertyType: 'villa',
    eyebrow: 'Villas · Runda',
    h1: 'Villas for Sale in Runda, Nairobi',
    metaTitle: 'Villas For Sale In Runda, Nairobi | Oceans Kenya',
    metaDescription:
      'Buy luxury villas for sale in Runda, Nairobi. Gated estate villas and ambassador homes in Nairobi\'s prestigious diplomatic belt.',
    intro: [
      "Runda is the very definition of Nairobi's embassy belt - a secure, gated expanse of grand villas, manicured lawns and diplomatic residences. Our villas for sale in Runda represent the pinnacle of Nairobi living: sprawling multi-bedroom homes on generous plots within fully managed, gated estates.",
      "Home to ambassadors, business leaders and discerning families, Runda offers unmatched prestige, privacy and security. Explore Runda villas for sale with Oceans Kenya and secure your place in Nairobi's most exclusive residential corridor.",
    ],
    faqs: [
      {
        q: 'How much is a villa in Runda?',
        a: 'Runda villas for sale typically range from about KES 100 million to KES 300 million+, depending on plot size, build quality and finishes. Runda\'s prestige keeps values amongst Nairobi\'s highest.',
      },
      {
        q: 'Is Runda secure?',
        a: 'Yes - Runda is one of the most secure areas in Nairobi, home to numerous embassies and diplomatic residences. Most villas sit within gated estates with 24-hour security and controlled access.',
      },
      {
        q: 'Who usually buys villas in Runda?',
        a: 'Runda attracts high-net-worth individuals, diplomats, executives and families seeking prestige and security. The area\'s exclusivity and limited availability make it a premium, long-term asset.',
      },
    ],
    related: [
      { label: 'Runda Neighbourhood Guide', href: '/neighbourhood/runda' },
      { label: 'Luxury homes in Nairobi', href: '/luxury-homes-nairobi' },
      { label: 'Houses for sale in Karen', href: '/houses-for-sale/karen' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
    ],
  },

  'penthouses-for-sale/westlands': {
    slug: 'penthouses-for-sale/westlands',
    section: 'Buy',
    purpose: 'sale',
    search: 'Westlands',
    propertyType: 'penthouse',
    eyebrow: 'Penthouses · Westlands',
    h1: 'Penthouses for Sale in Westlands, Nairobi',
    metaTitle: 'Penthouses For Sale In Westlands | Oceans Kenya',
    metaDescription:
      'Buy luxury penthouses for sale in Westlands, Nairobi. Skyline penthouses, duplex rooftops and premium apartments in the CBD.',
    intro: [
      "For the very pinnacle of Nairobi apartment living, explore our penthouses for sale in Westlands. They deliver jaw-dropping skyline views, private terraces, duplex layouts and the finest finishes, set within the city's most vibrant and connected district.",
      "A Westlands penthouse is more than a home - it is a statement. With the business district, five-star hotels, malls and restaurants at your doorstep, these residences offer the ultimate urban lifestyle alongside strong investment appeal. Explore Westlands penthouses for sale with Oceans Kenya today.",
    ],
    faqs: [
      {
        q: 'How much is a penthouse in Westlands?',
        a: 'Westlands penthouses for sale typically range from about KES 80 million to KES 250 million+, depending on size, floor level, views and building quality. Duplex rooftop penthouses command the highest prices.',
      },
      {
        q: 'What makes a Westlands penthouse special?',
        a: 'Penthouses offer the topmost floor, expansive private terraces, panoramic skyline views and premium interiors. Many include concierge, pool, gym and secure parking within the development.',
      },
      {
        q: 'Are penthouses a good investment in Nairobi?',
        a: 'Yes. Penthouses are the rarest and most aspirational apartment type in Nairobi. Their scarcity, prime location and enduring desirability make them a premium, appreciating asset.',
      },
    ],
    related: [
      { label: 'Westlands Neighbourhood Guide', href: '/neighbourhood/westlands' },
      { label: 'Apartments for sale in Westlands', href: '/apartments-for-sale/westlands' },
      { label: 'Luxury homes in Nairobi', href: '/luxury-homes-nairobi' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
    ],
  },

  'furnished-apartments/westlands': {
    slug: 'furnished-apartments/westlands',
    section: 'Rent',
    purpose: 'rent',
    search: 'Westlands',
    propertyType: 'apartment',
    amenitiesFilter: ['Furnished'],
    eyebrow: 'Furnished · Westlands',
    h1: 'Furnished Apartments in Westlands, Nairobi',
    metaTitle: 'Furnished Apartments In Westlands | Oceans Kenya',
    metaDescription:
      'Rent furnished apartments in Westlands, Nairobi. Fully furnished executive and serviced apartments with premium amenities.',
    intro: [
      "Discover the ease of turn-key living with our furnished apartments in Westlands. These fully equipped executive residences are professionally furnished to hotel-standard - ready for you to move in with nothing but a suitcase, and ideal for executives, expats and long-term corporate stays.",
      "Set in the heart of Nairobi's business district, Westlands furnished apartments offer convenience, premium amenities and flexible terms. Whether for a long-term let or a serviced corporate booking, Oceans Kenya's furnished Westlands collection is the smart, seamless choice.",
    ],
    faqs: [
      {
        q: 'How much is a furnished apartment in Westlands per month?',
        a: 'Furnished apartments in Westlands typically rent from KES 120,000 per month for a one-bedroom to KES 350,000+ for a large three-bedroom serviced unit, depending on build quality and amenities.',
      },
      {
        q: 'What is included in a furnished apartment?',
        a: 'Furnished units include all furniture, appliances, kitchenware and often utilities, housekeeping, gym, pool and concierge. Serviced apartments may add cleaning, Wi-Fi and security.',
      },
      {
        q: 'Can I book a furnished apartment short-term?',
        a: 'Yes - many Westlands furnished and serviced apartments accept short and medium-term stays. Contact our lettings team for rates and availability on corporate and short-let units.',
      },
    ],
    related: [
      { label: 'Westlands Neighbourhood Guide', href: '/neighbourhood/westlands' },
      { label: 'Apartments to rent in Westlands', href: '/apartments-to-rent/westlands' },
      { label: 'Serviced apartments in Nairobi', href: '/serviced-apartments/nairobi' },
      { label: 'Property to rent in Nairobi', href: '/property-for-rent/nairobi' },
    ],
  },

  'serviced-apartments/nairobi': {
    slug: 'serviced-apartments/nairobi',
    section: 'Rent',
    purpose: 'rent',
    search: 'Nairobi',
    propertyType: 'apartment',
    amenitiesFilter: ['Serviced'],
    eyebrow: 'Serviced · Nairobi',
    h1: 'Serviced Apartments in Nairobi',
    metaTitle: 'Serviced Apartments In Nairobi | Oceans Kenya',
    metaDescription:
      'Rent serviced apartments in Nairobi, Kenya. Fully serviced corporate apartments with hotel-style amenities for executives and expats.',
    intro: [
      "For executives and expats who demand convenience, our serviced apartments in Nairobi deliver hotel-standard living with the space and privacy of a home. Every serviced residence comes fully furnished with housekeeping, utilities, Wi-Fi, security and premium amenities bundled into one transparent monthly rate.",
      "Located across the city's premium districts - Westlands, Kilimani, Upper Hill and Gigiri - our serviced apartments in Nairobi are the preferred choice for corporate relocations and long-stay professionals. Enjoy a seamless, worry-free stay with Oceans Kenya's serviced lettings collection.",
    ],
    faqs: [
      {
        q: 'How much is a serviced apartment in Nairobi per month?',
        a: 'Serviced apartments in Nairobi typically range from KES 150,000 per month for a one-bedroom to KES 500,000+ for a large executive three-bedroom, with utilities, housekeeping and many amenities included.',
      },
      {
        q: 'What services are included?',
        a: 'Most serviced apartments include housekeeping, Wi-Fi, utilities, security, gym and pool access, and often concierge. Some add breakfast, transport and laundry for a true hotel-style experience.',
      },
      {
        q: 'Are serviced apartments good for corporate housing?',
        a: 'Yes. Serviced apartments are the preferred choice for corporate relocations and long-stay assignments, offering flexible terms, weekly billing and fully furnished, move-in-ready homes.',
      },
    ],
    related: [
      { label: 'Furnished apartments in Westlands', href: '/furnished-apartments/westlands' },
      { label: 'Property to rent in Nairobi', href: '/property-for-rent/nairobi' },
      { label: 'Apartments to rent in Westlands', href: '/apartments-to-rent/westlands' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
    ],
  },

  'luxury-homes-nairobi': {
    slug: 'luxury-homes-nairobi',
    section: 'Buy',
    purpose: 'sale',
    search: 'Nairobi',
    propertyType: 'house',
    amenitiesFilter: ['Luxury'],
    eyebrow: 'Luxury collection',
    h1: 'Luxury Homes in Nairobi',
    metaTitle: 'Luxury Homes In Nairobi | Oceans Kenya',
    metaDescription:
      'Explore luxury homes for sale in Nairobi, Kenya. Premium villas, mansions and estates across Karen, Runda, Muthaiga and beyond.',
    intro: [
      "Nairobi's luxury property market is among the most exciting in Africa, and Oceans Kenya curates its finest homes. Our luxury collection spans grand estates in Karen and Runda, villas in Muthaiga and Gigiri, and contemporary mansions across the city's most prestigious enclaves - each hand-selected for impeccable quality and provenance.",
      "Buying luxury property in Nairobi is about more than a home; it is an investment in an enduring, appreciating lifestyle. With our deep knowledge of the exclusive market, Oceans Kenya helps discerning buyers secure exceptional residences and off-market opportunities across the capital.",
    ],
    faqs: [
      {
        q: 'What defines a luxury home in Nairobi?',
        a: 'A luxury home in Nairobi typically means a large residence on a generous plot in a prime enclave such as Karen, Runda, Muthaiga or Gigiri, with premium finishes, pool, garden and high-end security.',
      },
      {
        q: 'What is the price of a luxury home in Nairobi?',
        a: 'Luxury homes in Nairobi generally start around KES 100 million and can exceed KES 400 million for the most exceptional estates on large, well-located plots.',
      },
      {
        q: 'Do you offer off-market luxury homes?',
        a: "Yes. Many of Nairobi's finest homes are sold privately. Speak to an Oceans Kenya specialist to access our confidential off-market collection of luxury residences.",
      },
    ],
    related: [
      { label: 'Houses for sale in Karen', href: '/houses-for-sale/karen' },
      { label: 'Villas for sale in Runda', href: '/villas-for-sale/runda' },
      { label: 'Penthouses for sale in Westlands', href: '/penthouses-for-sale/westlands' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
      { label: 'Investment property in Nairobi', href: '/investment-property-nairobi' },
    ],
  },

  'investment-property-nairobi': {
    slug: 'investment-property-nairobi',
    section: 'Buy',
    purpose: 'sale',
    search: 'Nairobi',
    eyebrow: 'Investor insight',
    h1: 'Investment Property in Nairobi',
    metaTitle: 'Investment Property In Nairobi | Oceans Kenya',
    metaDescription:
      'Discover investment property in Nairobi, Kenya. High-yield apartments, houses and prime real estate in the city\'s best locations.',
    intro: [
      "Nairobi remains one of Africa's most resilient investment markets, and Oceans Kenya curates property designed to grow your wealth. Our investment portfolio spans high-yield apartments in Westlands and Upper Hill, appreciating family homes in Karen and Lavington, and prime land in the diplomatic belt - each selected for strong rental demand and capital growth.",
      "Whether you are a first-time investor or a seasoned portfolio builder, our specialists help you identify the right asset, location and strategy. From rental yield analysis to off-market opportunities, this is your gateway to premium investment property in Nairobi, Kenya.",
    ],
    faqs: [
      {
        q: 'Where are the best rental yields in Nairobi?',
        a: 'Westlands, Upper Hill and Kilimani offer some of the strongest rental yields, driven by corporate and expat demand. Serviced and furnished units also command premium rents.',
      },
      {
        q: 'What is the average return on Nairobi property?',
        a: 'Net rental yields in Nairobi typically range from 5-8% for well-selected investments, while prime neighbourhoods like Karen, Runda and Muthaiga offer strong long-term capital appreciation.',
      },
      {
        q: 'Is Nairobi a good place to invest in property?',
        a: 'Yes. Nairobi combines a growing economy, strong demand and a stable currency backdrop, making premium property a compelling, long-term investment with dependable yields.',
      },
    ],
    related: [
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
      { label: 'Luxury homes in Nairobi', href: '/luxury-homes-nairobi' },
      { label: 'Apartments for sale in Westlands', href: '/apartments-for-sale/westlands' },
      { label: 'Property to rent in Nairobi', href: '/property-for-rent/nairobi' },
    ],
  },

  'properties-with-pool/nairobi': {
    slug: 'properties-with-pool/nairobi',
    section: 'Buy',
    purpose: 'sale',
    search: 'Nairobi',
    amenitiesFilter: ['Swimming Pool'],
    eyebrow: 'Pool homes · Nairobi',
    h1: 'Properties with Pool in Nairobi',
    metaTitle: 'Properties With Pool In Nairobi | Oceans Kenya',
    metaDescription:
      "Find premium properties with pool in Nairobi, Kenya. Luxury homes and apartments with private swimming pools across Karen, Runda and beyond.",
    intro: [
      "A private swimming pool transforms a premium Nairobi home into a personal retreat. Our exclusive collection of properties with pool in Nairobi spans grand family houses in Karen and Runda to luxury apartments in Westlands - each with a sparkling pool, private gardens and the premium amenities that define elevated living.",
      "Pool homes are among the most sought-after in the city, offering year-round leisure, strong rental appeal and enduring value. Browse premium properties with pool in Nairobi with Oceans Kenya and discover a home designed for relaxation, entertaining and family life.",
    ],
    faqs: [
      {
        q: 'Which Nairobi areas have the most pool homes?',
        a: "Karen, Runda, Muthaiga and Lavington are home to the most private-pool residences in Nairobi, while premium apartments in Westlands and Riverside frequently feature communal and private pools.",
      },
      {
        q: 'Do pool homes cost more in Nairobi?',
        a: 'Yes. A private pool adds significant value. Pool homes in Karen and Runda typically command a substantial premium over comparable homes without a pool, reflecting both lifestyle value and build cost.',
      },
      {
        q: 'Are pool homes good rental investments?',
        a: 'Absolutely. Pools boost both desirability and rental value, making pool homes popular with executive tenants and short-stay guests - a strong advantage in Nairobi\'s premium lettings market.',
      },
    ],
    related: [
      { label: 'Houses for sale in Karen', href: '/houses-for-sale/karen' },
      { label: 'Villas for sale in Runda', href: '/villas-for-sale/runda' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
      { label: 'Gated community homes in Nairobi', href: '/gated-community-homes/nairobi' },
    ],
  },

  'gated-community-homes/nairobi': {
    slug: 'gated-community-homes/nairobi',
    section: 'Buy',
    purpose: 'sale',
    search: 'Nairobi',
    amenitiesFilter: ['Gated Community'],
    eyebrow: 'Gated homes · Nairobi',
    h1: 'Gated Community Homes in Nairobi',
    metaTitle: 'Gated Community Homes In Nairobi | Oceans Kenya',
    metaDescription:
      "Buy premium gated community homes in Nairobi, Kenya. Secure family houses, villas and townhouses in exclusive gated estates and compounds.",
    intro: [
      "Gated community living is the gold standard of security and serenity in Nairobi. Our curated gated community homes in Nairobi offer private, managed estates with 24-hour security, landscaped communal grounds and a genuine sense of community - ideal for families and executives who value both safety and lifestyle.",
      "From elegant townhouses in Lavington to secure compounds in Karen and Westlands, each gated home delivers privacy, convenience and peace of mind. Explore premium gated community homes in Nairobi with Oceans Kenya and invest in a truly secure way of life.",
    ],
    faqs: [
      {
        q: 'What are the benefits of a gated community home in Nairobi?',
        a: 'Gated communities provide 24-hour manned security, controlled access, shared amenities like pools and gyms, landscaped grounds and low-maintenance living - combining safety with social ease.',
      },
      {
        q: 'Which neighbourhoods have the best gated communities?',
        a: 'Karen, Runda, Muthaiga, Lavington, Gigiri and Rosslyn are renowned for their exclusive gated communities and secure compounds, while Westlands and Kilimani offer gated apartment complexes.',
      },
      {
        q: 'Are gated community homes a good investment?',
        a: 'Yes. Gated homes command strong premiums and tenant demand, delivering both capital appreciation and reliable rental returns in Nairobi\'s security-conscious market.',
      },
    ],
    related: [
      { label: 'Properties with pool in Nairobi', href: '/properties-with-pool/nairobi' },
      { label: 'Houses for sale in Karen', href: '/houses-for-sale/karen' },
      { label: 'Townhouses for sale in Lavington', href: '/townhouses-for-sale/lavington' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
    ],
  },

  'modern-apartments/nairobi': {
    slug: 'modern-apartments/nairobi',
    section: 'Buy',
    purpose: 'sale',
    search: 'Nairobi',
    propertyType: 'apartment',
    subTypeFilter: 'modern',
    eyebrow: 'Modern apartments · Nairobi',
    h1: 'Modern Apartments in Nairobi',
    metaTitle: 'Modern Apartments In Nairobi | Oceans Kenya',
    metaDescription:
      "Buy modern apartments for sale in Nairobi, Kenya. Contemporary, new-build and smart apartments in Westlands, Kilimani, Upper Hill and more.",
    intro: [
      "Nairobi's skyline is defined by its modern apartments - sleek, contemporary residences in the city's most vibrant districts. Our modern apartments in Nairobi collection features new-build and recently completed developments in Westlands, Kilimani, Upper Hill and Riverside, with open-plan layouts, floor-to-ceiling glass and premium finishes.",
      "These residences embody a sophisticated urban lifestyle: resident gyms, pools, secure parking, smart home touches and unbeatable access to business, dining and entertainment. Discover modern apartments in Nairobi with Oceans Kenya and elevate your city living.",
    ],
    faqs: [
      {
        q: 'Where are the newest modern apartments in Nairobi?',
        a: 'The densest pipeline of modern apartments is in Westlands, Upper Hill, Kilimani and Riverside, with recent high-spec towers and boutique developments continuing to come online.',
      },
      {
        q: 'What amenities do modern Nairobi apartments include?',
        a: 'Modern developments typically offer a pool, gym, secure underground parking, 24-hour security, borehole water, backup power and high-speed lifts, with many adding concierge and smart home features.',
      },
      {
        q: 'Are modern apartments a good investment in Nairobi?',
        a: 'Yes. New and modern apartments in the corporate districts attract strong tenant demand and deliver competitive yields, making them a popular choice for investors and owner-occupiers alike.',
      },
    ],
    related: [
      { label: 'Apartments for sale in Westlands', href: '/apartments-for-sale/westlands' },
      { label: 'Apartments for sale in Kileleshwa', href: '/apartments-for-sale/kileleshwa' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
      { label: 'Property prices in Nairobi', href: '/property-prices/westlands' },
    ],
  },

  'duplex-apartments/nairobi': {
    slug: 'duplex-apartments/nairobi',
    section: 'Buy',
    purpose: 'sale',
    search: 'Nairobi',
    propertyType: 'apartment',
    subTypeFilter: 'duplex',
    eyebrow: 'Duplex apartments · Nairobi',
    h1: 'Duplex Apartments in Nairobi',
    metaTitle: 'Duplex Apartments In Nairobi | Oceans Kenya',
    metaDescription:
      "Buy duplex apartments for sale in Nairobi, Kenya. Spacious two-level apartment homes and split-level residences in premium city districts.",
    intro: [
      "For buyers wanting the space of a house with the services of a modern apartment, duplex apartments in Nairobi are the perfect match. These multi-level residences - with homes split across two floors and often private terraces - deliver generous, flexible living in the city's premium districts.",
      "Duplex layouts are prized for their sense of space, natural light and separation of living and sleeping zones, all within secure, amenity-rich apartments. Explore duplex apartments in Nairobi with Oceans Kenya and enjoy the best of apartment living with a family-friendly footprint.",
    ],
    faqs: [
      {
        q: 'What is a duplex apartment in Nairobi?',
        a: 'A duplex apartment is a residence spanning two connected levels within a building, typically with living and entertaining areas downstairs and bedrooms upstairs - offering a house-like layout in an apartment setting.',
      },
      {
        q: 'Why choose a duplex in Nairobi?',
        a: 'Duplexes provide more space, better light and clearer zoning than a single-level flat, plus private terraces and a family-friendly layout - great value in premium districts.',
      },
      {
        q: 'Are duplex apartments in Nairobi good for families?',
        a: 'Yes. Their generous floorplans, separate levels and private outdoor space make duplexes popular with families who want the security and amenities of a modern development.',
      },
    ],
    related: [
      { label: 'Modern apartments in Nairobi', href: '/modern-apartments/nairobi' },
      { label: 'Apartments for sale in Westlands', href: '/apartments-for-sale/westlands' },
      { label: 'Townhouses for sale in Lavington', href: '/townhouses-for-sale/lavington' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
    ],
  },

  // ── Property-type landing pages (city-wide) ─────────────────────────────
  'apartments-for-sale/nairobi': {
    slug: 'apartments-for-sale/nairobi',
    section: 'Buy',
    purpose: 'sale',
    search: 'Nairobi',
    propertyType: 'apartment',
    eyebrow: 'Apartments · Nairobi',
    h1: 'Apartments for Sale in Nairobi',
    metaTitle: 'Apartments For Sale In Nairobi | Oceans Kenya',
    metaDescription:
      'Buy premium apartments for sale in Nairobi, Kenya. Modern high-rise, gated and serviced apartments across Westlands, Kilimani, Kileleshwa and more.',
    intro: [
      "Nairobi's apartment market spans sleek high-rise towers, low-density gated compounds and serviced residences, and Oceans Kenya curates its best. Our apartments for sale in Nairobi range from compact executive studios to expansive penthouses with skyline views, all within secure, amenity-rich buildings close to the business districts.",
      "Whether you are buying your first home, downsizing, or building a rental portfolio, apartments in Nairobi offer strong yields and dependable demand. Explore premium apartments for sale across the city's most connected neighbourhoods with Oceans Kenya.",
    ],
    faqs: [
      {
        q: 'What is the price of an apartment in Nairobi?',
        a: 'Apartments for sale in Nairobi typically range from about KES 8 million for a modern one-bedroom in emerging areas to KES 30-100 million for two and three-bedroom units in Westlands, Kilimani and Kileleshwa, rising higher for penthouses.',
      },
      {
        q: 'Which Nairobi areas are best for apartments?',
        a: 'Westlands, Kilimani, Kileleshwa, Riverside and Upper Hill are the most popular apartment districts, offering the strongest rental demand, best amenities and closest access to offices, malls and dining.',
      },
      {
        q: 'Are Nairobi apartments a good investment?',
        a: 'Yes. Well-located apartments in Nairobi deliver dependable rental yields of around 5-8% and benefit from continued urban demand, making them a strong, liquid investment choice.',
      },
    ],
    related: [
      { label: 'Apartments for sale in Westlands', href: '/apartments-for-sale/westlands' },
      { label: 'Apartments for sale in Kileleshwa', href: '/apartments-for-sale/kileleshwa' },
      { label: 'Penthouses for sale in Westlands', href: '/penthouses-for-sale/westlands' },
      { label: 'Apartments to rent in Nairobi', href: '/apartments-to-rent/nairobi' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
    ],
  },

  'apartments-to-rent/nairobi': {
    slug: 'apartments-to-rent/nairobi',
    section: 'Rent',
    purpose: 'rent',
    search: 'Nairobi',
    propertyType: 'apartment',
    eyebrow: 'Apartments to rent · Nairobi',
    h1: 'Apartments to Rent in Nairobi',
    metaTitle: 'Apartments To Rent In Nairobi | Oceans Kenya',
    metaDescription:
      'Rent premium apartments in Nairobi, Kenya. Furnished, serviced and unfurnished apartments across Westlands, Kilimani, Kileleshwa and Upper Hill.',
    intro: [
      "Finding the right apartment to rent in Nairobi is easy with Oceans Kenya. Our lettings portfolio covers the city's most desirable addresses - modern executive studios, spacious family apartments and fully serviced units in secure, amenity-rich developments with pools, gyms and backup utilities.",
      "Whether you are relocating for work, studying, or simply want central, connected living, our lettings team will match you with the ideal apartment and negotiate the best terms. Explore premium apartments to rent across Nairobi, Kenya today.",
    ],
    faqs: [
      {
        q: 'How much is an apartment to rent in Nairobi?',
        a: 'Apartment rents in Nairobi range from about KES 30,000 per month for a modest studio to KES 250,000+ for a premium three-bedroom in Westlands or Kilimani. Furnished and serviced units command a premium.',
      },
      {
        q: 'Are furnished and serviced apartments available in Nairobi?',
        a: 'Yes. Nairobi has an excellent supply of furnished and serviced apartments in Westlands, Kilimani and Upper Hill, ideal for executives and long-stay visitors who want a move-in-ready home.',
      },
      {
        q: 'What amenities come with Nairobi apartments?',
        a: 'Most premium apartments include 24-hour security, backup power, borehole water, secure parking and often a shared pool and gym. Serviced units add housekeeping, Wi-Fi and concierge services.',
      },
    ],
    related: [
      { label: 'Apartments to rent in Westlands', href: '/apartments-to-rent/westlands' },
      { label: 'Furnished apartments in Westlands', href: '/furnished-apartments/westlands' },
      { label: 'Serviced apartments in Nairobi', href: '/serviced-apartments/nairobi' },
      { label: 'Apartments for sale in Nairobi', href: '/apartments-for-sale/nairobi' },
      { label: 'Property to rent in Nairobi', href: '/property-for-rent/nairobi' },
    ],
  },

  'houses-for-sale/nairobi': {
    slug: 'houses-for-sale/nairobi',
    section: 'Buy',
    purpose: 'sale',
    search: 'Nairobi',
    propertyType: 'house',
    eyebrow: 'Houses · Nairobi',
    h1: 'Houses for Sale in Nairobi',
    metaTitle: 'Houses For Sale In Nairobi | Oceans Kenya',
    metaDescription:
      'Buy premium houses for sale in Nairobi, Kenya. Family homes, villas, bungalows and townhouses in Karen, Runda, Lavington and beyond.',
    intro: [
      "A house in Nairobi is about space, privacy and a place to put down roots. Oceans Kenya curates the city's best houses for sale - from grand family residences on generous green plots in Karen and Runda to elegant bungalows and villas in Lavington, Kitisuru and Muthaiga.",
      "Every home is hand-vetted for quality, security and genuine value, with plots that offer room to grow. Explore premium houses for sale in Nairobi, Kenya and find the family home you have been looking for.",
    ],
    faqs: [
      {
        q: 'How much is a house in Nairobi?',
        a: 'Houses for sale in Nairobi typically start around KES 25-40 million for a family home in mid-tier areas and rise to KES 50-200 million+ for large residences and estates in Karen, Runda and Muthaiga.',
      },
      {
        q: 'Which areas are best for family houses in Nairobi?',
        a: 'Karen, Runda, Lavington, Kitisuru, Muthaiga and Spring Valley are the leading family-house areas, prized for space, greenery, security and proximity to top schools.',
      },
      {
        q: 'Do Nairobi houses come with gardens and security?',
        a: 'Most houses in Nairobi\'s premium areas sit on generous plots with gardens, parking and often staff quarters. Many are within gated communities or secure compounds with 24-hour security.',
      },
    ],
    related: [
      { label: 'Houses for sale in Karen', href: '/houses-for-sale/karen' },
      { label: 'Houses for sale in Lavington', href: '/houses-for-sale/lavington' },
      { label: 'Villas for sale in Runda', href: '/villas-for-sale/runda' },
      { label: 'Houses to rent in Nairobi', href: '/houses-to-rent/nairobi' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
    ],
  },

  'houses-to-rent/nairobi': {
    slug: 'houses-to-rent/nairobi',
    section: 'Rent',
    purpose: 'rent',
    search: 'Nairobi',
    propertyType: 'house',
    eyebrow: 'Houses to rent · Nairobi',
    h1: 'Houses to Rent in Nairobi',
    metaTitle: 'Houses To Rent In Nairobi | Oceans Kenya',
    metaDescription:
      'Rent premium houses in Nairobi, Kenya. Gated family homes, villas and bungalows in Karen, Lavington, Runda and other sought-after suburbs.',
    intro: [
      "For families and executives who want space, privacy and a garden, a house to rent in Nairobi is the natural choice. Oceans Kenya's lettings portfolio features spacious gated family homes, elegant villas and comfortable bungalows across the city's most desirable suburbs.",
      "From Karen's leafy estates to Lavington's refined streets, a Nairobi rental house offers quality of life, security and room to breathe. Let our lettings team find the right home for you, with clear lease terms and private viewings.",
    ],
    faqs: [
      {
        q: 'How much is it to rent a house in Nairobi?',
        a: 'House rents in Nairobi range from around KES 80,000 per month for a modest family home to KES 250,000-600,000+ for large gated residences in Karen, Runda and Lavington. Furnished and serviced homes cost more.',
      },
      {
        q: 'Are Nairobi rental houses suitable for families and expats?',
        a: 'Yes. Single-family houses in areas like Karen, Lavington and Runda are ideal for families and expats, offering space, gardens, security and proximity to international schools and amenities.',
      },
      {
        q: 'What should I look for in a Nairobi rental house?',
        a: 'Prioritise secure compounds with 24-hour security, backup power and water, ample parking and clear lease terms. Families often value garden space, servant quarters and proximity to schools.',
      },
    ],
    related: [
      { label: 'Houses to rent in Karen', href: '/houses-to-rent/karen' },
      { label: 'Houses to rent in Lavington', href: '/houses-to-rent/lavington' },
      { label: 'Houses for sale in Nairobi', href: '/houses-for-sale/nairobi' },
      { label: 'Property to rent in Nairobi', href: '/property-for-rent/nairobi' },
    ],
  },

  'townhouses-for-sale/nairobi': {
    slug: 'townhouses-for-sale/nairobi',
    section: 'Buy',
    purpose: 'sale',
    search: 'Nairobi',
    propertyType: 'townhouse',
    eyebrow: 'Townhouses · Nairobi',
    h1: 'Townhouses for Sale in Nairobi',
    metaTitle: 'Townhouses For Sale In Nairobi | Oceans Kenya',
    metaDescription:
      'Buy premium townhouses for sale in Nairobi, Kenya. Modern gated townhouses and duplexes in Lavington, Kileleshwa, Westlands and beyond.',
    intro: [
      "Townhouses are among the most popular homes in Nairobi, combining the space of a house with the security and low maintenance of a managed development. Oceans Kenya's townhouses for sale span contemporary gated compounds across Lavington, Kileleshwa, Westlands and the wider city.",
      "With open-plan living, private gardens, parking and premium finishes, townhouses offer strong family livability and excellent capital appreciation. Explore premium townhouses for sale in Nairobi, Kenya with Oceans Kenya.",
    ],
    faqs: [
      {
        q: 'How much is a townhouse in Nairobi?',
        a: 'Townhouses for sale in Nairobi typically range from about KES 25 million for a modern three-bedroom unit to KES 90 million+ for large four-bedroom duplexes in premium gated communities.',
      },
      {
        q: 'What is the difference between a townhouse and a house?',
        a: 'A townhouse is a multi-floor home within a managed, often gated development - sharing grounds and amenities - while a standalone house sits on its own larger plot with more private outdoor space.',
      },
      {
        q: 'Are Nairobi townhouses a good investment?',
        a: 'Yes. Townhouses are increasingly favoured by families and offer solid appreciation plus high rental appeal, thanks to their low maintenance and secure, amenity-rich settings.',
      },
    ],
    related: [
      { label: 'Townhouses for sale in Lavington', href: '/townhouses-for-sale/lavington' },
      { label: 'Houses for sale in Nairobi', href: '/houses-for-sale/nairobi' },
      { label: 'Apartments for sale in Nairobi', href: '/apartments-for-sale/nairobi' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
    ],
  },

  'land-for-sale/nairobi': {
    slug: 'land-for-sale/nairobi',
    section: 'Buy',
    purpose: 'sale',
    search: 'Nairobi',
    propertyCategory: 'land',
    eyebrow: 'Land · Nairobi',
    h1: 'Land for Sale in Nairobi',
    metaTitle: 'Land For Sale In Nairobi | Oceans Kenya',
    metaDescription:
      'Buy land for sale in Nairobi, Kenya. Residential, commercial and development plots with title deeds across the city\'s growing corridors.',
    intro: [
      "Land is Nairobi's most durable asset, and Oceans Kenya curates plots for buyers, developers and investors alike. Our land for sale in Nairobi includes residential plots, commercial sites and larger development parcels with clean, ready title deeds across the city's growth corridors.",
      "Whether you are building a family home or planning a development, location, access and title are everything. Our team verifies every plot's documentation and guides you through due diligence. Explore premium land for sale in Nairobi, Kenya - including joint venture opportunities.",
    ],
    faqs: [
      {
        q: 'How much does land cost in Nairobi?',
        a: 'Land prices in Nairobi vary widely by location and zoning - from around KES 5-15 million for a residential plot in emerging corridors to KES 25-60 million+ per acre in prime areas like Karen and Runda. Commercial land commands a premium.',
      },
      {
        q: 'What should I check before buying land in Nairobi?',
        a: 'Always verify the title deed, search the land registry, confirm zoning and access, and check for encumbrances or disputes. Oceans Kenya assists with full due diligence on every plot we list.',
      },
      {
        q: 'Are joint venture land opportunities available?',
        a: 'Yes. Oceans Kenya offers joint venture land opportunities where landowners partner with developers. Explore our Joint Venture page for current opportunities across Nairobi.',
      },
    ],
    related: [
      { label: 'Joint Venture Opportunities', href: '/joint-ventures' },
      { label: 'New Developments in Nairobi', href: '/new-developments' },
      { label: 'Land & Joint Ventures', href: '/joint-ventures' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
    ],
  },

  'commercial-property-for-sale/nairobi': {
    slug: 'commercial-property-for-sale/nairobi',
    section: 'Buy',
    purpose: 'sale',
    search: 'Nairobi',
    propertyCategory: 'commercial',
    eyebrow: 'Commercial · Nairobi',
    h1: 'Commercial Property for Sale in Nairobi',
    metaTitle: 'Commercial Property For Sale In Nairobi | Oceans Kenya',
    metaDescription:
      'Buy commercial property for sale in Nairobi, Kenya. Offices, retail, warehouses and industrial space in Westlands, Upper Hill and beyond.',
    intro: [
      "Nairobi is East Africa's commercial capital, and Oceans Kenya curates its best commercial property for sale. Our portfolio spans office buildings and serviced offices, retail and shop space, warehouses, industrial units and mixed-use investments across the city's prime business districts.",
      "Commercial property in Nairobi offers strong yields and long-term growth, particularly around Westlands, Upper Hill, Kilimani and the industrial corridors. Explore premium commercial property for sale in Nairobi, Kenya with Oceans Kenya's specialist team.",
    ],
    faqs: [
      {
        q: 'What types of commercial property are available in Nairobi?',
        a: 'Nairobi offers offices and serviced offices, retail and shop space, warehouses, distribution and industrial units, hotels, and mixed-use developments - across Westlands, Upper Hill, Kilimani, Industrial Area and beyond.',
      },
      {
        q: 'What yields do Nairobi commercial properties deliver?',
        a: 'Well-located commercial property in Nairobi typically delivers net yields of around 7-10%, with prime offices and prime retail commanding the strongest, most stable returns on long leases.',
      },
      {
        q: 'Which Nairobi areas are best for commercial investment?',
        a: 'Westlands and Upper Hill are the leading office districts, while Industrial Area and the Mombasa Road corridor dominate warehousing and logistics. Retail performs best in dense, affluent neighbourhoods.',
      },
    ],
    related: [
      { label: 'Commercial Property in Nairobi', href: '/commercial-property' },
      { label: 'Commercial property to rent in Nairobi', href: '/commercial-property-to-rent/nairobi' },
      { label: 'Property for sale in Nairobi', href: '/property-for-sale/nairobi' },
      { label: 'Investment property in Nairobi', href: '/investment-property-nairobi' },
    ],
  },

  'commercial-property-to-rent/nairobi': {
    slug: 'commercial-property-to-rent/nairobi',
    section: 'Rent',
    purpose: 'rent',
    search: 'Nairobi',
    propertyCategory: 'commercial',
    eyebrow: 'Commercial to rent · Nairobi',
    h1: 'Commercial Property to Rent in Nairobi',
    metaTitle: 'Commercial Property To Rent In Nairobi | Oceans Kenya',
    metaDescription:
      'Rent commercial property in Nairobi, Kenya. Offices, serviced offices, retail space and warehouses in Westlands, Upper Hill and beyond.',
    intro: [
      "Whether you need a head office, a retail unit or a warehouse, Oceans Kenya has commercial space to rent across Nairobi. Our lettings portfolio covers prime offices and serviced offices, retail and shop space, and industrial and warehouse units in the city's leading business districts.",
      "We work with landlords and occupiers to agree practical, flexible lease terms and transparent service charges. Explore commercial property to rent in Nairobi, Kenya - in Westlands, Upper Hill, Kilimani, Industrial Area and more.",
    ],
    faqs: [
      {
        q: 'How much is office space to rent in Nairobi?',
        a: 'Prime Nairobi office rents typically range from around USD 10-20 per square metre per month, depending on location, grade and fit-out. Retail and warehouse rates vary by frontage, size and location.',
      },
      {
        q: 'Are serviced offices available in Nairobi?',
        a: 'Yes. Nairobi has a strong supply of serviced and co-working offices in Westlands, Kilimani and Upper Hill, offering flexible desks, meeting rooms and inclusive utilities - ideal for startups and corporates.',
      },
      {
        q: 'Which Nairobi areas are best for commercial rentals?',
        a: 'Westlands and Upper Hill lead for offices, Kilimani and the affluent suburbs for retail, and Industrial Area and Mombasa Road for warehousing and logistics.',
      },
    ],
    related: [
      { label: 'Commercial Property in Nairobi', href: '/commercial-property' },
      { label: 'Commercial property for sale in Nairobi', href: '/commercial-property-for-sale/nairobi' },
      { label: 'Property to rent in Nairobi', href: '/property-for-rent/nairobi' },
      { label: 'Serviced apartments in Nairobi', href: '/serviced-apartments/nairobi' },
    ],
  },
};

/** Convenience list of every SEO page path (used for sitemap + validations). */
export const SEO_PAGE_PATHS: string[] = Object.keys(SEO_PAGES);