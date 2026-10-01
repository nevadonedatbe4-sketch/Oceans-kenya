import type { CoListingAgent } from '@/pages/crm/components/coListingAgents';

export interface UnitType {
  id: string;
  name: string;
  variant: string;
  bedrooms: number;
  bathrooms: number;
  sizeMin: string;
  sizeMax: string;
  sizeUnit: string;
  priceMin: string;
  priceMax: string;
  currency: string;
  hasDsq: boolean;
  availableUnits: string;
}

export interface PaymentPlan {
  depositPercent: string;
  installments: string;
}

// Internal (agency-only) continuity contact — mirrors the listing form's
// "Source & Contact (Private)" block. Stored in DB, never sent to the public site.
export interface DeveloperProject {
  id: string;
  project_name: string;
  property_address: string;
  area_location: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
}

export interface DevelopmentFormState {
  title: string;
  slug: string;
  description: string;
  location: string;
  neighbourhood: string;
  address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  propertyType: string;
  developmentStatus: string;
  completionStartYear: string;
  completionEndYear: string;
  floors: number;
  totalUnits: number;
  developerName: string;
  developerPhone: string;
  developerEmail: string;
  amenities: string[];
  mainImage: string;
  coverImage: string;
  gallery: string[];
  floorPlans: string[];
  videoUrl: string;
  price: string;
  currency: string;
  baths: number;
  parking: number;
  marketingType: string;
  unitsSold: number;
  unitsReserved: number;
  unitsRented: number;
  unitsOccupied: number;
  currentPrice: string;
  previousPrice: string;
  showUnitsRemaining: boolean;
  showPercentSold: boolean;
  showPercentRented: boolean;
  showDeveloperName: boolean;
  showUrgencyMessage: boolean;
  unitsRemaining: string;
  isPublished: boolean;
  isFeatured: boolean;
  seoTitle: string;
  seoDescription: string;
  unitTypes: UnitType[];
  paymentPlan: PaymentPlan;
  // Internal continuity (agency-only)
  sourceName: string;
  sourceUrl: string;
  sourcePoster: string;
  dateSourced: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  ownerRole: string;
  // Unified Source & Continuity: Source/Owner → CRM Contact → Listing
  sourceContactId: string;
  caretakerName: string;
  caretakerPhone: string;
  caretakerRole: string;
  sourceNotes: string;
  // Other agents who also listed this development
  coListingAgents: CoListingAgent[];
  // Assigned agents who handle inquiries for this development
  agentIds: string[];
  developerProjects: DeveloperProject[];
  commissionTracking: string;
  negotiationNotes: string;
  availabilityReality: string;
}

export const DEVELOPMENT_STATUSES = [
  { value: 'off_plan', label: 'Off-Plan' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'completed', label: 'Completed' },
];

export const PROPERTY_TYPE_OPTIONS = [
  'Apartment',
  'Penthouse',
  'Villa',
  'Townhouse',
  'Studio',
  'Maisonette',
  'House',
  'Commercial',
];

export const SIZE_UNITS = ['sqm', 'sq ft'];

export const CURRENCIES = [
  { value: 'KES', label: 'KES (KSh)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

export const MEMBER_SERVICES_OPTIONS = [
  'Two Bedroom',
  'One Bedroom',
  'Executive Studio',
];

export const AMENITY_OPTIONS = [
  'Swimming Pool',
  'Gym',
  'Elevator',
  'CCTV',
  '24/7 Security',
  'Backup Power / Generator',
  'Borehole',
  'Water Tank',
  'Solar Power',
  "Children's Play Area",
  'Rooftop Access',
  'Pet Friendly',
  'Smart Home',
  'Fibre Internet',
  'Concierge',
  'Parking',
  'Clubhouse',
  'Landscaped Garden',
  'EV Charging',
  'Waste Management',
];

export const MARKETING_TYPES = [
  { value: 'for_sale', label: 'For Sale' },
  { value: 'for_rent', label: 'For Rent' },
  { value: 'both', label: 'Both Sale & Rent' },
];

export const CONTACT_ROLES = [
  { value: 'landlord', label: 'Landlord / Owner' },
  { value: 'caretaker', label: 'Caretaker / On-site Contact' },
  { value: 'poster', label: 'Original Poster' },
  { value: 'agent', label: 'Agent' },
  { value: 'other', label: 'Other' },
];

export function makeUnitType(): UnitType {
  return {
    id: `ut-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    name: '',
    variant: '',
    bedrooms: 0,
    bathrooms: 0,
    sizeMin: '',
    sizeMax: '',
    sizeUnit: 'sqm',
    priceMin: '',
    priceMax: '',
    currency: 'KES',
    hasDsq: false,
    availableUnits: '',
  };
}

export function makeDeveloperProject(): DeveloperProject {
  return {
    id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    project_name: '',
    property_address: '',
    area_location: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    contact_address: '',
  };
}

export function generateSlug(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 60);
}

export function formatPrice(v: string, currency: string): string {
  if (!v) return '—';
  const n = Number(v);
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : 'KES ';
  return `${sym}${n.toLocaleString()}`;
}