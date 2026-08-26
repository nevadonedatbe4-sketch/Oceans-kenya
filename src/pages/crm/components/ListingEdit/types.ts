import { supabase } from '@/lib/supabase';

export interface Agent {
  id: string;
  name: string;
  title: string;
}

export interface DocumentFile {
  name: string;
  url: string;
  size?: number;
  type?: string;
  category?: string;
}

export interface CustomField {
  key: string;
  value: string;
}

export interface FeatureItem {
  name: string;
  checked: boolean;
}

export interface ListingFormState {
  title: string;
  slug: string;
  description: string;
  location: string;
  neighbourhood: string;
  propertyType: string;
  propertyCategory: string;
  subType: string;
  purpose: 'sale' | 'rent' | 'joint_ventures' | 'new_development' | 'short_stay' | 'sold' | 'rented';
  price: string;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  size: string;
  landSize: string;
  acreage: string;
  landTitle: string;
  landType: string;
  sqft: string;
  amenities: string[];
  features: string;
  images: string[];
  mainImage: string;
  coverImage: string;
  floorPlans: string[];
  videoUrl: string;
  virtualTourUrl: string;
  documents: DocumentFile[];
  address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  agentId: string;
  seoTitle: string;
  seoDescription: string;
  isPublished: boolean;
  isPending: boolean;
  isFeatured: boolean;
  isHomepage: boolean;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  // Extended fields
  priceUgx: string;
  autoExchange: boolean;
  pricePrefix: string;
  pricePostfix: string;
  secondPrice: string;
  propertyLabel: string;
  serviceCharge: string;
  availabilityStatus: string;
  sizeUnit: string;
  landUnit: string;
  garages: number;
  garageSize: string;
  yearBuilt: string;
  rooms: number;
  propertyId: string;
  customFields: CustomField[];
  stateRegion: string;
  zipCode: string;
  customFeatures: string[];
  ownerContact: string;
  commissionTracking: string;
  leadAssignment: string;
  privateListing: boolean;
  stickyListing: boolean;
  includeSearch: boolean;
  includeFeatured: boolean;
  featuredNeighborhood: boolean;
  neighborhoodDropdown: string;
  neighborhoodList: { id: string; name: string }[];
  focalPoint: { x: number; y: number };
  cropPreset: string;
  dragImage: string | null;
  // Final fields
  featuredNewDevelopment: boolean;
  priorityRanking: string;
  autoSEO: boolean;
  openGraphImage: string;
  interiorFinish: string;
  flooringType: string;
  ceilingHeight: string;
  waterSupply: string;
  constructionType: string;
  completionDate: string;
  isNewDevelopment: boolean;
  developmentStage: string;
}

export const STEPS = [
  { id: 'basic-info', label: 'Basic Information', desc: 'Title, type & write-up' },
  { id: 'price', label: 'Price', desc: 'Main price, currency & options' },
  { id: 'details', label: 'Property Details', desc: 'Size, rooms & specs' },
  { id: 'media', label: 'Photos & Media', desc: 'Photos & floor plans' },
  { id: 'features', label: 'Features & Amenities', desc: 'Amenities & highlights' },
  { id: 'labels-tags', label: 'Labels & Tags', desc: 'Marketing badges' },
  { id: 'location', label: 'Location', desc: 'Address & map' },
  { id: 'attachments', label: 'Attachments', desc: 'Docs & brochures' },
  { id: 'contact-publish', label: 'Contact & Publish', desc: 'Agent, SEO & publish' },
  { id: 'summary', label: 'Summary', desc: 'Review & publish' },
];

export const LAND_STEPS = [
  { id: 'basic-info', label: 'Basic Information', desc: 'Title, type & write-up' },
  { id: 'price', label: 'Price', desc: 'Main price, currency & options' },
  { id: 'details', label: 'Property Details', desc: 'Land size, title & plot info' },
  { id: 'media', label: 'Photos & Media', desc: 'Photos & site images' },
  { id: 'features', label: 'Features & Amenities', desc: 'Land features & utilities' },
  { id: 'labels-tags', label: 'Labels & Tags', desc: 'Marketing badges' },
  { id: 'location', label: 'Location', desc: 'Address & map' },
  { id: 'attachments', label: 'Attachments', desc: 'Docs & brochures' },
  { id: 'contact-publish', label: 'Contact & Publish', desc: 'Agent, SEO & publish' },
  { id: 'summary', label: 'Summary', desc: 'Review & publish' },
];

// Treat every land-shaped type as land so the form switches to land-only fields.
export const isLandType = (type: string): boolean =>
  type === 'land' || type === 'farms_/_land' || type === 'farms_land';

export const getSteps = (propertyType: string) => {
  return isLandType(propertyType) ? LAND_STEPS : STEPS;
};

export const AMENITIES = [
  'Air Conditioning',
  'Swimming Pool',
  'Gym',
  'Garden / Yard',
  'Balcony',
  'Parking',
  'Security',
  'CCTV',
  'Backup Power / Generator',
  'Internet / WiFi',
  'Furnished',
  'Serviced',
  'Elevator',
  'Rooftop Access',
  'Pet Friendly',
  "Children's Play Area",
  'Borehole',
  'Water Tank',
  'Solar Power',
  'Smart Home',
];

export const LAND_AMENITIES = [
  'Title Deed Ready',
  'Surveyed / Beaconed',
  'Road Access',
  'Electricity Connection',
  'Water Connection',
  'Borehole',
  'Fenced / Walled',
  'Gated Community',
  'Security',
  'Solar Power',
  'River Frontage',
  'Lake View / Access',
  'Scenic / Hilltop View',
  'Near Main Road',
  'Near School',
  'Near Hospital',
  'Near Shopping Centre',
  'Ready to Build',
  'Agricultural Use',
  'Residential Zoning',
  'Commercial Zoning',
  'Mixed Use Zoning',
  'Water Tank',
  'Sewer Connection',
];

export const getAmenities = (propertyType: string) => {
  return propertyType === 'land' ? LAND_AMENITIES : AMENITIES;
};

export const PURPOSES = ['sale', 'rent', 'joint_ventures', 'new_development', 'short_stay', 'sold', 'rented'] as const;

export const PURPOSE_LABELS: Record<string, string> = {
  sale: 'For Sale',
  rent: 'For Rent',
  joint_ventures: 'Land & Joint Ventures',
  new_development: 'New Development',
  short_stay: 'Short Stay',
  sold: 'Sold',
  rented: 'Rented',
};

// Admin-only listing-editor chrome palette. Public-facing brand colours
// (primary/golden/accent) live in index.css :root and are DB-overridable via
// useBrandTheme — see that file for the single source of truth.
export const COLORS = {
  navy: '#0d1b2a',
  navyLight: '#1a2f45',
  yellow: '#f5c842',
  green: '#16a34a',
  gray: '#6b7280',
  border: '#e5e7eb',
  bg: '#f4f6f9',
  white: '#ffffff',
};

export const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const generateSlug = (t: string) => {
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 60);
};

export const fetchNeighborhoods = async () => {
  const { data } = await supabase.from('neighbourhoods').select('id, name').order('name');
  return data || [];
};

export const EXCHANGE_RATE = 130; // 1 USD = 130 KES

export const COMMERCIAL_PROPERTY_TYPES = [
  'Office',
  'Serviced Office',
  'Retail / Shop',
  'Warehouse',
  'Distribution Warehouse',
  'Industrial Park',
  'Light Industrial',
  'Heavy Industrial',
  'Factory',
  'Storage',
  'Hotel',
  'Pub',
  'Restaurant',
  'Cafe',
  'Guest House',
  'Land',
];

export const RESIDENTIAL_PROPERTY_TYPES = [
  'House',
  'Apartment',
  'Bungalow',
  'Studio',
  'Maisonette',
  'Villa',
  'Townhouse',
  'Penthouse',
  'Detached',
  'Semi-detached',
  'Terraced',
  'Land',
];

export const PROPERTY_TYPES = [
  ...RESIDENTIAL_PROPERTY_TYPES,
  ...COMMERCIAL_PROPERTY_TYPES,
  'Farms / Land',
  'Park Home',
];

// Maps display labels to the canonical DB value (matches existing listings)
export const PROPERTY_TYPE_TO_DB: Record<string, string> = {
  'House': 'house',
  'Apartment': 'apartment',
  'Bungalow': 'bungalow',
  'Studio': 'studio_flat',
  'Maisonette': 'maisonette',
  'Villa': 'villa',
  'Townhouse': 'townhouse',
  'Penthouse': 'penthouse',
  'Detached': 'detached',
  'Semi-detached': 'semi-detached',
  'Terraced': 'terraced',
  'Land': 'land',
  'Farms / Land': 'farms_/_land',
  'Park Home': 'park_home',
  'Office': 'office',
  'Serviced Office': 'serviced_office',
  'Retail / Shop': 'retail_shop',
  'Warehouse': 'warehouse',
  'Distribution Warehouse': 'distribution_warehouse',
  'Industrial Park': 'industrial_park',
  'Light Industrial': 'light_industrial',
  'Heavy Industrial': 'heavy_industrial',
  'Factory': 'factory',
  'Storage': 'storage',
  'Hotel': 'hotel',
  'Pub': 'pub',
  'Restaurant': 'restaurant',
  'Cafe': 'cafe',
  'Guest House': 'guest_house',
};

// Reverse: DB value → display label
export const DB_TO_PROPERTY_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(PROPERTY_TYPE_TO_DB).map(([k, v]) => [v, k])
);

// Infer property category from the canonical DB property_type value
export const inferCategoryFromType = (type: string): string => {
  const residentialTypes = new Set([
    'house', 'apartment', 'bungalow', 'studio', 'studio_flat', 'maisonette', 'villa',
    'townhouse', 'penthouse', 'detached', 'semi-detached',
    'terraced', 'park_home',
  ]);
  const commercialTypes = new Set([
    'office', 'serviced_office', 'retail_shop', 'warehouse',
    'distribution_warehouse', 'industrial_park', 'light_industrial',
    'heavy_industrial', 'factory', 'storage', 'hotel', 'pub', 'restaurant',
    'cafe', 'guest_house',
  ]);
  if (residentialTypes.has(type)) return 'residential';
  if (commercialTypes.has(type)) return 'commercial';
  if (type === 'land' || type === 'farms_land' || type === 'farms_/_land') return 'land';
  return '';
};

// Legacy DB values that should be normalized to current canonical values
export const LEGACY_PROPERTY_TYPE_MAP: Record<string, string> = {
  'flat_apartment': 'apartment',
  'flat': 'apartment',
  'condo': 'apartment',
  'semi_detached': 'semi-detached',
  'terraced_house': 'terraced',
  'retail_/_shop': 'retail_shop',
  'flat_/_apartment': 'apartment',
  'studio': 'studio_flat',
  'farms_land': 'farms_/_land',
};

export const SUB_TYPES = [
  'Long Term Rental',
  'Short Term Rental',
  'Off Plan',
  'New Development',
  'Commercial',
];

export const PURPOSE_OPTIONS = [
  { value: 'sale', label: 'For Sale' },
  { value: 'rent', label: 'For Rent' },
  { value: 'joint_ventures', label: 'Land & Joint Ventures' },
  { value: 'short_stay', label: 'Short Stay' },
  { value: 'sold', label: 'Sold' },
  { value: 'rented', label: 'Rented' },
];

// Primary classification: what the property IS (Standard Property vs New Development).
export const LISTING_TYPES = [
  { value: 'standard', label: 'Standard Property' },
  { value: 'new_development', label: 'New Development' },
];

// Secondary development stage labels shown alongside NEW DEVELOPMENT.
export const DEVELOPMENT_STAGES = [
  { value: '', label: 'Select stage (optional)' },
  { value: 'off_plan', label: 'Off-Plan' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'completed', label: 'Completed' },
  { value: 'sold_off_plan', label: 'Sold Off-Plan' },
  { value: 'sold_out', label: 'Sold Out' },
];

// Sale sub-types (New Developments is under Sale, not a separate purpose)
export const SALE_SUB_TYPES = [
  { value: 'residential_sale', label: 'Residential Sale' },
  { value: 'commercial_sale', label: 'Commercial Sale' },
  { value: 'land_sale', label: 'Land Sale' },
  { value: 'new_development', label: 'New Development' },
];

// Rent sub-types (Short Term Rentals is under Rent, not a separate purpose)
export const RENT_SUB_TYPES = [
  { value: 'long_term_rental', label: 'Long Term Rental' },
  { value: 'short_term_rental', label: 'Short Term Rental' },
  { value: 'furnished_rental', label: 'Furnished Rental' },
  { value: 'commercial_rental', label: 'Commercial Rental' },
];

export const AVAILABILITY_STATUS = [
  'Available',
  'Reserved',
  'Sold',
  'Rented',
];

export const SIZE_UNITS = ['sqft', 'sqm'];

export const COUNTRIES = [
  'Kenya',
  'Uganda',
  'Rwanda',
  'Tanzania',
  'Burundi',
  'South Sudan',
  'DR Congo',
];

export const INTERIOR_FINISHES = [
  'Basic',
  'Standard',
  'High-End',
  'Luxury',
];

export const WATER_SUPPLIES = [
  'Municipal',
  'Borehole',
  'Tanker',
];

export const CONSTRUCTION_TYPES = [
  'Concrete',
  'Steel',
  'Timber',
  'Mixed',
];

export const LAND_TITLE_TYPES = [
  'Freehold',
  'Leasehold',
  'Sectional Title',
  'Absolute',
  'Customary',
  'Grant',
];

export const LAND_TYPES = [
  'Residential Land',
  'Commercial Land',
  'Agricultural Land',
  'Development Land',
  'Mixed-Use Land',
  'Investment Land',
  'Industrial Land',
];