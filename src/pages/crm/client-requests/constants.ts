import { PROPERTY_CATEGORIES } from '@/lib/clientRequests';

/** category value → label, for badge rendering on match rows. */
export const CATEGORY_LABELS: Record<string, string> = PROPERTY_CATEGORIES.reduce(
  (acc, c) => { acc[c.value] = c.label; return acc; },
  {} as Record<string, string>,
);

/**
 * Why a client rejected a specific property. Captured separately from the free
 * note so rejections can be summarised and fed back into future refinements,
 * WITHOUT silently rewriting the client's permanent preferences.
 */
export const REJECTION_REASONS: { value: string; label: string }[] = [
  { value: 'price', label: 'Price / over budget' },
  { value: 'location', label: 'Location' },
  { value: 'layout_size', label: 'Layout & size' },
  { value: 'condition', label: 'Condition / state' },
  { value: 'amenities', label: 'Missing amenities' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'other', label: 'Other' },
];

export const REJECTION_REASON_LABELS: Record<string, string> = REJECTION_REASONS.reduce(
  (acc, r) => { acc[r.value] = r.label; return acc; },
  {} as Record<string, string>,
);

/**
 * Amenity options offered on the request form. Sourced from the values that
 * actually exist on published listings (see the inventory audit) so a client
 * request can only pick amenities the platform genuinely tracks.
 */
export const AMENITY_OPTIONS: string[] = [
  'Parking',
  'Swimming Pool',
  'Gym',
  "Children's Play Area",
  '24/7 Security',
  'CCTV Surveillance',
  'Gated Community',
  'Backup Power / Generator',
  'Internet / WiFi',
  'Air Conditioning',
  'Fully Fitted Kitchen',
  'En-suite Bedrooms',
  "Maid's Room",
  'Staff Quarters',
  'Study / Home Office',
  'Walk-in Closet',
  'Balcony',
  'Large Balcony',
  'Rooftop Terrace',
  'Mature Gardens',
  'BBQ Area',
  'Pet Friendly',
  'Lift / Elevator',
  'Water Tank',
  'Borehole',
  'Solar Heating',
  'Lounge',
  'Dining Area',
  'Guest Room',
  'Furnished',
];