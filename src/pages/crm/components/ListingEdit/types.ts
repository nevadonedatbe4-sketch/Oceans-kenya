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

export const getSteps = (propertyType: string) => {
  return propertyType === 'land' ? LAND_STEPS : STEPS;
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
  joint_ventures: 'Joint Ventures',
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

export const PROPERTY_TYPES = [
  'Apartment',
  'House',
  'Villa',
  'Townhouse',
  'Penthouse',
  'Studio Flat',
  'Detached',
  'Semi-detached',
  'Terraced',
  'Flat',
  'Bungalow',
  'Commercial',
  'Office',
  'Land',
  'Farms / Land',
  'Park Home',
];

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
  { value: 'joint_ventures', label: 'Joint Ventures' },
  { value: 'new_development', label: 'New Development' },
  { value: 'short_stay', label: 'Short Stay' },
  { value: 'sold', label: 'Sold' },
  { value: 'rented', label: 'Rented' },
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