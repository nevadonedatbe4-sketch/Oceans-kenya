export interface NewDevMock {
  id: string;
  slug: string;
  title: string;
  location: string;
  price: number;
  priceDisplay: string;
  beds: number;
  baths: number;
  parking: number;
  sqft: number;
  propertyType: string;
  image: string;
  tag: string;
  featured: boolean;
  completionDate: string;
  description: string;
  amenities: string[];
  floorPlans: string[];
  developer: string;
}

export const newDevMocks: NewDevMock[] = [
  {
    id: 'mock-dev-1',
    slug: 'off-plan-luxury-apartments-for-sale-in-karen',
    title: 'OFF-PLAN LUXURY APARTMENTS FOR SALE IN KAREN',
    location: 'Karen, Nairobi',
    price: 12_000_000,
    priceDisplay: 'KSh 12M',
    beds: 1,
    baths: 1,
    parking: 1,
    sqft: 750,
    propertyType: 'apartment',
    image: 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778757621679-xbpy3gho.JPG',
    tag: 'For Sale',
    featured: true,
    completionDate: 'Q3 2026',
    description: 'Discover off-plan luxury apartments in the heart of Karen, Nairobi\'s most prestigious neighbourhood. These meticulously designed residences offer a blend of contemporary architecture and timeless elegance. Each unit features open-plan living spaces, floor-to-ceiling windows, and premium finishes throughout. The development includes a rooftop terrace, landscaped gardens, secure underground parking, and 24/7 concierge service. Located minutes from Karen Hub, top international schools, and the Nairobi National Park.',
    amenities: ['Swimming Pool', 'Gym', 'Rooftop Terrace', 'Underground Parking', '24/7 Security', 'Concierge', 'Landscaped Gardens', 'Backup Generator'],
    floorPlans: [],
    developer: 'Prime Developments Ltd',
  },
  {
    id: 'mock-dev-2',
    slug: 'executive-apartments-penthouses-for-sale-in-karen-nairobi-prime-location',
    title: 'Executive Apartments & Penthouses for Sale in Karen Nairobi – Prime Location',
    location: 'Karen, Nairobi',
    price: 19_000_000,
    priceDisplay: 'KSh 19M',
    beds: 1,
    baths: 1,
    parking: 2,
    sqft: 950,
    propertyType: 'apartment',
    image: 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1778769316224-aj8sxten.jpg',
    tag: 'For Sale',
    featured: true,
    completionDate: 'Q1 2027',
    description: 'An exclusive collection of executive apartments and penthouses situated in a prime Karen location. Designed for the discerning buyer, these homes feature expansive living areas, private balconies with panoramic views, Italian kitchens, and spa-inspired bathrooms. Residents enjoy access to a state-of-the-art wellness centre, infinity pool, private cinema, and business lounge. The development is set within secure, gated grounds with 24-hour security and ample visitor parking.',
    amenities: ['Infinity Pool', 'Wellness Centre', 'Private Cinema', 'Business Lounge', '24/7 Security', 'Visitor Parking', 'Italian Kitchens', 'Smart Home System'],
    floorPlans: [],
    developer: 'Executive Homes Kenya',
  },
  {
    id: 'mock-dev-3',
    slug: 'buy-off-plan-affordable-luxury-in-westlands-nairobi',
    title: 'Buy off plan affordable Luxury in Westlands Nairobi',
    location: 'Westlands, Nairobi',
    price: 54_000_000,
    priceDisplay: 'KSh 54M',
    beds: 3,
    baths: 3,
    parking: 2,
    sqft: 1800,
    propertyType: 'apartment',
    image: 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1776957969634-7nepr2cs.jpg',
    tag: 'For Sale',
    featured: true,
    completionDate: 'Q4 2026',
    description: 'Affordable luxury redefined in the vibrant Westlands district. This off-plan development offers generous 3-bedroom apartments with en-suite bathrooms, open-plan living and dining areas, and private balconies overlooking the Nairobi skyline. The building features a swimming pool, fully equipped gym, children\'s play area, and secure basement parking. Located within walking distance to Sarit Centre, Westgate Mall, and major corporate offices, this is urban living at its finest.',
    amenities: ['Swimming Pool', 'Fully Equipped Gym', 'Children\'s Play Area', 'Basement Parking', '24/7 Security', 'CCTV Surveillance', 'Backup Water Supply', 'High-Speed Lifts'],
    floorPlans: [],
    developer: 'Urban Living Developers',
  },
  {
    id: 'mock-dev-4',
    slug: 'a-fully-furnished-4-bedroom-apartment-to-let',
    title: 'A Fully Furnished 4 Bedroom Apartment To Let',
    location: 'Kilimani, Nairobi',
    price: 22_000_000,
    priceDisplay: 'KSh 22M',
    beds: 4,
    baths: 4,
    parking: 2,
    sqft: 2200,
    propertyType: 'apartment',
    image: 'https://iisgbnbwbmxrdvhmolee.supabase.co/storage/v1/object/public/property-images/listings/1776957198509-wlo5yz3p.jpg',
    tag: 'For Sale',
    featured: false,
    completionDate: 'Completed',
    description: 'A stunning fully furnished 4-bedroom apartment in the sought-after Kilimani neighbourhood. This ready-to-move-in residence features spacious en-suite bedrooms, a modern open-plan kitchen, separate dining area, and a large living room that opens onto a private terrace. The development offers a swimming pool, gym, sauna, and 24-hour security. Perfect for families or executives seeking premium living in a central, well-connected location.',
    amenities: ['Swimming Pool', 'Gym & Sauna', 'Private Terrace', 'Open-Plan Kitchen', '24/7 Security', 'Ample Parking', 'DSQ', 'CCTV'],
    floorPlans: [],
    developer: 'Kilimani Estates Ltd',
  },
];

export function getMockBySlug(slug: string): NewDevMock | undefined {
  return newDevMocks.find((m) => m.slug === slug);
}