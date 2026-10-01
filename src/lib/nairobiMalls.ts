/**
 * nairobiMalls - curated registry of the malls featured in the
 * "Best Shopping Malls in Nairobi" editorial article.
 *
 * Each entry carries the mall's map position, the neighbourhood it serves,
 * a short editorial blurb, lifestyle highlights and the area-guide deep link
 * so the article can cross-link readers into the neighbourhood clusters and
 * the interactive map can surface nearby sale/rent listings per mall.
 */

export interface MallEntry {
  id: string;
  /** Editorial rank used as the map pin number. */
  rank: number;
  name: string;
  /** Short area label shown on the card, e.g. "Westlands". */
  area: string;
  /** Area-guide slug this mall anchors, e.g. "westlands". */
  areaSlug: string;
  lat: number;
  lng: number;
  image: string;
  blurb: string;
  highlights: string[];
}

export const NAIROBI_MALLS: MallEntry[] = [
  {
    id: 'two-rivers',
    rank: 1,
    name: 'Two Rivers Mall',
    area: 'Runda / Limuru Road',
    areaSlug: 'runda',
    lat: -1.2124,
    lng: 36.7943,
    image:
      'https://readdy.ai/api/search-image?query=Modern%20riverside%20shopping%20mall%20exterior%20with%20curved%20glass%20facade%20and%20palm-lined%20forecourt%20in%20Nairobi%20Kenya%2C%20bright%20daylight%2C%20upscale%20retail%20architecture%2C%20editorial%20architectural%20photography%2C%20clean%20sky%2C%20warm%20neutral%20tones&width=800&height=600&seq=nairobi-mall-two-rivers&orientation=landscape',
    blurb:
      "Nairobi's largest mall, mixing international retail, a cinema, an ice rink and wide outdoor promenades just off Limuru Road.",
    highlights: ['Largest retail mix in the city', 'Ice rink, cinema & play areas', 'Best for Runda, Kitisuru & Gigiri residents'],
  },
  {
    id: 'westgate',
    rank: 2,
    name: 'Westgate Shopping Mall',
    area: 'Westlands',
    areaSlug: 'westlands',
    lat: -1.2569,
    lng: 36.8035,
    image:
      'https://readdy.ai/api/search-image?query=Upscale%20urban%20shopping%20centre%20entrance%20with%20stone%20cladding%20and%20glass%20atrium%20in%20Nairobi%20Kenya%2C%20bright%20daylight%2C%20mature%20landscaping%2C%20premium%20retail%20architecture%2C%20editorial%20architectural%20photography&width=800&height=600&seq=nairobi-mall-westgate&orientation=landscape',
    blurb:
      "Westlands' landmark destination for premium fashion, dining and entertainment, moments from the city's biggest office cluster.",
    highlights: ['Premium retail & dining', 'Central Westlands location', 'Walks to Sarit & Westlands offices'],
  },
  {
    id: 'yaya',
    rank: 3,
    name: 'Yaya Centre',
    area: 'Kilimani',
    areaSlug: 'kilimani',
    lat: -1.293,
    lng: 36.7873,
    image:
      'https://readdy.ai/api/search-image?query=Contemporary%20neighbourhood%20shopping%20mall%20with%20covered%20arcade%20and%20greenery%20in%20Nairobi%20Kenya%2C%20bright%20afternoon%20light%2C%20shoppers%20walking%2C%20clean%20modern%20architecture%2C%20editorial%20architectural%20photography&width=800&height=600&seq=nairobi-mall-yaya&orientation=landscape',
    blurb:
      "Kilimani's everyday hub for groceries, cafés, health clinics and boutique retail along Argwings Kodhek Road.",
    highlights: ['Everyday convenience', 'Strong café & clinic offering', 'Heart of Kilimani living'],
  },
  {
    id: 'sarit',
    rank: 4,
    name: 'Sarit Centre',
    area: 'Parklands / Westlands',
    areaSlug: 'parklands',
    lat: -1.2645,
    lng: 36.8037,
    image:
      'https://readdy.ai/api/search-image?query=Established%20shopping%20centre%20with%20terracotta%20and%20glass%20frontage%20and%20open-air%20plaza%20in%20Nairobi%20Kenya%2C%20sunny%20daylight%2C%20tropical%20planting%2C%20editorial%20architectural%20photography&width=800&height=600&seq=nairobi-mall-sarit&orientation=landscape',
    blurb:
      "One of Nairobi's oldest and best-loved malls, offering groceries, cinema, clinics and services to Parklands and Westlands.",
    highlights: ['Long-established & trusted', 'Great for Parklands residents', 'Cinema, clinics & services'],
  },
  {
    id: 'galleria',
    rank: 5,
    name: 'Galleria Shopping Mall',
    area: 'Karen / Langata Road',
    areaSlug: 'karen',
    lat: -1.3455,
    lng: 36.7495,
    image:
      'https://readdy.ai/api/search-image?query=Suburban%20shopping%20mall%20with%20wide%20parking%20and%20modern%20low-rise%20facade%20in%20Nairobi%20Kenya%2C%20clear%20daylight%2C%20palm%20trees%2C%20clean%20minimal%20architecture%2C%20editorial%20architectural%20photography&width=800&height=600&seq=nairobi-mall-galleria&orientation=landscape',
    blurb:
      "A family-friendly stop on Langata Road with a supermarket, kids' play areas, dining and ample parking for the Karen corridor.",
    highlights: ['Family & kids friendly', 'Easy Langata Road access', 'Serves Karen & South Nairobi'],
  },
  {
    id: 'the-junction',
    rank: 6,
    name: 'The Junction Mall',
    area: 'Ngong Road / Kilimani',
    areaSlug: 'kilimani',
    lat: -1.3016,
    lng: 36.7764,
    image:
      'https://readdy.ai/api/search-image?query=Modern%20retail%20mall%20with%20glass%20curtain%20wall%20and%20structured%20canopy%20in%20Nairobi%20Kenya%2C%20bright%20daylight%2C%20landscaped%20entrance%2C%20editorial%20architectural%20photography&width=800&height=600&seq=nairobi-mall-junction&orientation=landscape',
    blurb:
      "A relaxed, open-air favourite on Ngong Road with a strong food scene, supermarket and everyday retail for Kilimani and Kileleshwa.",
    highlights: ['Great food & dining scene', 'Open-air layout', 'Gateway to Kilimani & Kileleshwa'],
  },
  {
    id: 'diamond-plaza',
    rank: 7,
    name: 'Diamond Plaza',
    area: 'Parklands ("Little India")',
    areaSlug: 'parklands',
    lat: -1.2609,
    lng: 36.821,
    image:
      'https://readdy.ai/api/search-image?query=Vibrant%20Indian-inspired%20shopping%20plaza%20with%20colourful%20signage%20and%20busy%20arcade%20in%20Nairobi%20Kenya%2C%20warm%20daylight%2C%20distinct%20cultural%20retail%20architecture%2C%20editorial%20street%20photography&width=800&height=600&seq=nairobi-mall-diamond-plaza&orientation=landscape',
    blurb:
      "The heart of Parklands' Indian quarter - authentic dining, specialty groceries and bazaar shopping under one roof.",
    highlights: ['Authentic Indian dining', 'Specialty groceries & spices', 'A true local institution'],
  },
  {
    id: 'the-hub-karen',
    rank: 8,
    name: 'The Hub Karen',
    area: 'Karen',
    areaSlug: 'karen',
    lat: -1.3419,
    lng: 36.7071,
    image:
      'https://readdy.ai/api/search-image?query=Premium%20lifestyle%20mall%20with%20open%20courtyards%2C%20fountains%20and%20tropical%20landscaping%20in%20Karen%20Nairobi%20Kenya%2C%20golden%20daylight%2C%20upscale%20architecture%2C%20editorial%20architectural%20photography&width=800&height=600&seq=nairobi-mall-hub-karen&orientation=landscape',
    blurb:
      "Karen's premier lifestyle mall - boutique retail, cinema, gym and a landscaped courtyard the whole family can enjoy.",
    highlights: ['Karen premier lifestyle mall', 'Cinema, gym & dining', 'Serene garden-suburb setting'],
  },
  {
    id: 'lavington-mall',
    rank: 9,
    name: 'Lavington Mall',
    area: 'Lavington',
    areaSlug: 'lavington',
    lat: -1.2796,
    lng: 36.7712,
    image:
      'https://readdy.ai/api/search-image?query=Boutique%20neighbourhood%20shopping%20mall%20with%20timber%20and%20glass%20facade%20in%20Lavington%20Nairobi%20Kenya%2C%20soft%20daylight%2C%20leafy%20surroundings%2C%20editorial%20architectural%20photography&width=800&height=600&seq=nairobi-mall-lavington&orientation=landscape',
    blurb:
      "An intimate neighbourhood mall serving leafy Lavington with a supermarket, cafés, health services and boutique stores.",
    highlights: ['Quiet & upmarket', 'Perfect for Lavington locals', 'Groceries, cafés & clinics'],
  },
  {
    id: 'westlands-square',
    rank: 10,
    name: 'Broadwalk & Westlands Square',
    area: 'Westlands',
    areaSlug: 'westlands',
    lat: -1.2666,
    lng: 36.8047,
    image:
      'https://readdy.ai/api/search-image?query=Busy%20city%20shopping%20arcade%20with%20modern%20glass%20shopfronts%20in%20Westlands%20Nairobi%20Kenya%2C%20daylight%2C%20urban%20retail%20street%20scene%2C%20editorial%20architectural%20photography&width=800&height=600&seq=nairobi-mall-westlands-square&orientation=landscape',
    blurb:
      "A lively cluster of arcades and eateries in the middle of Westlands - handy for quick shopping, lunch and services.",
    highlights: ['Central Westlands arcades', 'Great quick-lunch spot', 'Steps from offices & hotels'],
  },
];

/** Look up a single mall by its id. */
export function getMallById(id: string): MallEntry | undefined {
  return NAIROBI_MALLS.find((m) => m.id === id);
}

/** Deep link into the area guide that a mall anchors. */
export function mallAreaGuideHref(mall: MallEntry): string {
  return `/area-guides/${mall.areaSlug}`;
}