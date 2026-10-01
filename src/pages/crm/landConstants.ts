/* ─────────────────────────────────────────────────────────────
   Land CRM shared constants — all option lists, labels & helpers
   Used by the Land Listings CRM and the Land form.
   ───────────────────────────────────────────────────────────── */

export const LAND_TYPE_OPTIONS = [
  { value: '', label: 'Select land type' },
  { value: 'residential_land', label: 'Residential Land' },
  { value: 'commercial_land', label: 'Commercial Land' },
  { value: 'industrial_land', label: 'Industrial Land' },
  { value: 'agricultural_land', label: 'Agricultural Land' },
  { value: 'farm_land', label: 'Farm Land' },
  { value: 'development_land', label: 'Development Land' },
  { value: 'mixed_use_land', label: 'Mixed-Use Land' },
  { value: 'investment_land', label: 'Investment Land' },
  { value: 'recreational_land', label: 'Recreational Land' },
  { value: 'conservation_land', label: 'Conservation Land' },
  { value: 'educational_land', label: 'Educational Land' },
  { value: 'public_land', label: 'Public / Institutional Land' },
  { value: 'hospitality_land', label: 'Hospitality / Tourism Land' },
  { value: 'coastal_land', label: 'Coastal Land' },
  { value: 'special_use_land', label: 'Special-Use Land' },
  { value: 'general_land', label: 'General Land' },
];

export const LAND_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  LAND_TYPE_OPTIONS.filter((o) => o.value !== '').map((o) => [o.value, o.label]),
);

export const DISPOSITION_OPTIONS = [
  { value: '', label: 'Disposition type' },
  { value: 'outright', label: 'Outright Sale' },
  { value: 'lease', label: 'Lease / Long-term Lease' },
  { value: 'lease_to_own', label: 'Lease-to-Own' },
];

export const OFFER_TYPE_OPTIONS = [
  { value: '', label: 'Select offer type' },
  { value: 'sale', label: 'For Sale' },
  { value: 'rent', label: 'For Rent' },
  { value: 'lease', label: 'For Lease' },
];

/* Land types suggested per offer type — used to keep the form short & relevant */
export const LAND_TYPES_FOR_SALE = [
  'residential_land', 'commercial_land', 'industrial_land', 'agricultural_land', 'farm_land',
  'development_land', 'mixed_use_land', 'investment_land', 'recreational_land', 'coastal_land',
  'conservation_land', 'general_land',
];
export const LAND_TYPES_FOR_RENT_LEASE = [
  'residential_land', 'commercial_land', 'industrial_land', 'agricultural_land', 'farm_land',
  'development_land', 'investment_land', 'recreational_land', 'hospitality_land', 'mixed_use_land',
];

export const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'featured', label: 'Featured' },
  { value: 'paused', label: 'Paused' },
  { value: 'under_offer', label: 'Under Offer' },
  { value: 'sold', label: 'Sold' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'expired', label: 'Expired' },
];

export const MARKETING_LABELS = [
  'Featured', 'Hot Cake', 'Quick Sale', 'Urgent Sale', 'Price Reduced', 'New Listing',
  'Exclusive', 'Prime Location', 'Investment Opportunity', 'Development Opportunity',
  'Owner Direct', 'Distress Sale', 'Bank Sale', 'Auction', 'Inheritance Sale',
  'Motivated Seller', 'Negotiable', 'Installments Available',
  'High Growth Area', 'Beachfront', 'Lakefront', 'Scenic', 'Rare Opportunity',
];

export const TERRAIN_OPTIONS = [
  'Flat', 'Gently Sloping', 'Sloping', 'Steep', 'Hilly', 'Mountainous', 'Rocky', 'Mixed Terrain',
];

export const LAND_ENVIRONMENT_OPTIONS = [
  'Coastal', 'Beachfront', 'Seafront', 'Lakefront', 'Riverside', 'Wetland',
  'Swamp / Marshland', 'Forested', 'Bushland', 'Grassland', 'Agricultural',
  'Dry / Arid', 'Scenic / View Property',
];

export const WATER_FEATURES = [
  'Sea View', 'Ocean Front', 'Lake View', 'River Front', 'Seasonal River',
  'Permanent Water Source', 'Natural Spring', 'Borehole', 'Irrigation Potential',
];

export const PLOT_SHAPE_OPTIONS = [
  'Regular / Rectangular', 'Irregular Plot', 'Corner Plot', 'Curved Frontage',
  'Pie-Shaped', 'L-Shaped', 'Triangular', 'Not Available',
];

export const TERRAIN_TOPGRAPHY_OPTIONS = [
  'Flat', 'Gently Sloping', 'Sloping', 'Steep', 'Hilly', 'Mountainous',
  'Rocky Outcrops', 'Valley', 'Divided / Tiered', 'Black Cotton Soil', 'Red Soil', 'Mixed',
];

export const LAND_CLASSIFICATION_OPTIONS = [
  { value: '', label: 'Land ownership classification' },
  { value: 'private', label: 'Private Land' },
  { value: 'community', label: 'Community Land' },
  { value: 'public', label: 'Public Land' },
];

export const TENURE_OPTIONS = [
  { value: '', label: 'Select tenure' },
  { value: 'freehold', label: 'Freehold' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'customary', label: 'Customary' },
  { value: 'community', label: 'Community Land' },
  { value: 'government', label: 'Government / Public Land' },
  { value: 'partial_interest', label: 'Partial Interest' },
  { value: 'other', label: 'Other / Special Interest' },
];

export const TITLE_DOC_OPTIONS = [
  { value: '', label: 'Title / documentation' },
  { value: 'title_deed', label: 'Title Deed' },
  { value: 'certificate_lease', label: 'Certificate of Lease' },
  { value: 'allotment', label: 'Allotment / Allocation Documentation' },
  { value: 'community_doc', label: 'Community Documentation' },
  { value: 'sale_agreement', label: 'Sale Agreement' },
  { value: 'other', label: 'Other' },
  { value: 'pending', label: 'Documentation Pending' },
  { value: 'not_specified', label: 'Not Specified' },
];

export const ROAD_ACCESS_OPTIONS = [
  { value: '', label: 'Road access' },
  { value: 'tarmac', label: 'Tarmac Road' },
  { value: 'cabro', label: 'Cabro / Paved Road' },
  { value: 'gravel', label: 'Gravel / Murram Road' },
  { value: 'earth', label: 'Earth Road' },
  { value: 'track', label: 'Track / Unpaved Access' },
  { value: 'seasonal', label: 'Seasonal Access' },
  { value: 'no_access', label: 'No Direct Road Access' },
  { value: 'required', label: 'Access Road Required' },
];

export const ROAD_FRONTAGE_OPTIONS = [
  'Main Road Frontage', 'Secondary Road', 'Corner Plot', 'Multiple Road Frontage',
  'Interior Plot', 'Access via Shared Road',
];

export const ACCESSIBILITY_OPTIONS = [
  'Easy Access', 'All-Weather Access', 'Public Transport Nearby', 'Near Highway',
  'Near Town Centre', 'Near Airport', 'Near Beach', 'Near Lake', 'Near Major Infrastructure',
];

export const WATER_SUPPLY_OPTIONS = [
  'Mains Water', 'Borehole', 'Well', 'River / Natural Water', 'Rainwater Potential',
  'No Water', 'Nearby Water',
];

export const ELECTRICITY_OPTIONS = [
  'Electricity Connected', 'Electricity at Boundary', 'Electricity Nearby', 'Electricity Not Available',
];

export const SEWERAGE_OPTIONS = [
  'Sewer Connected', 'Septic Suitable', 'Septic Existing', 'Not Available', 'Other',
];

export const CONNECTIVITY_OPTIONS = [
  'Fibre', 'Mobile Network', 'Good Mobile Coverage', 'Limited Coverage',
];

export const PRIMARY_LAND_USE_OPTIONS = [
  { value: '', label: 'Primary land use' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'agricultural', label: 'Agricultural' },
  { value: 'education', label: 'Education' },
  { value: 'recreation', label: 'Recreation' },
  { value: 'conservation', label: 'Conservation' },
  { value: 'public_institutional', label: 'Public / Institutional' },
  { value: 'hospitality', label: 'Hospitality / Tourism' },
  { value: 'mixed_use', label: 'Mixed-Use' },
  { value: 'other', label: 'Other' },
];

export const SECONDARY_POTENTIAL_USES = [
  'Residential', 'Commercial', 'Mixed-Use', 'Industrial', 'Agricultural',
  'Education', 'Recreation', 'Conservation', 'Hospitality / Tourism', 'Retail', 'Offices',
];

export const SUITABLE_FOR_OPTIONS = [
  'Private Residence', 'Apartments', 'Gated Community', 'Estate Development',
  'Commercial Development', 'Retail', 'Offices', 'Industrial Development',
  'Warehouse', 'Hotel', 'Resort', 'Eco-Lodge', 'Farm', 'Agriculture', 'Ranch',
  'School', 'Hospital', 'Church / Religious Use', 'Mixed-Use Development',
  'Land Banking', 'Subdivision', 'Other',
];

export const DEVELOPMENT_INDICATORS = [
  'Ready for Development', 'Development Approved', 'Planning Permission Available',
  'Change of User Possible', 'Subdivision Potential', 'High-Density Potential',
  'Low-Density Potential', 'Mixed-Use Potential', 'Development Potential Not Assessed',
];

export const PRICE_BASIS_OPTIONS = [
  { value: '', label: 'Price basis' },
  { value: 'total', label: 'Total Property Price' },
  { value: 'per_acre', label: 'Price Per Acre' },
  { value: 'per_hectare', label: 'Price Per Hectare' },
  { value: 'per_sqm', label: 'Price Per Sqm' },
  { value: 'per_plot', label: 'Price Per Plot' },
];

export const PRICE_STATUS_OPTIONS = [
  { value: '', label: 'Price status' },
  { value: 'asking', label: 'Asking Price' },
  { value: 'negotiable', label: 'Negotiable' },
  { value: 'reduced', label: 'Price Reduced' },
  { value: 'on_request', label: 'Price on Request' },
  { value: 'contact_agent', label: 'Contact Agent' },
];

export const PAYMENT_TERMS_OPTIONS = [
  'Cash', 'Bank Financing Accepted', 'Mortgage Accepted', 'Installments Available',
  'Installments Not Available', 'Seller Financing', 'Flexible Terms', 'Negotiable',
];

export const PAYMENT_TERMS_CONCISE = [
  'Cash', 'Financing Accepted', 'Installments Available', 'Seller Financing',
  'Flexible / Negotiable', 'Other',
];

export const INSTALLMENT_FREQUENCY_OPTIONS = [
  'Monthly', 'Quarterly', 'Semi-Annually', 'Annually', 'Per Project Milestone',
];

export const VERIFICATION_STATUS_OPTIONS = [
  { value: '', label: 'Verification status' },
  { value: 'unverified', label: 'Unverified' },
  { value: 'in_progress', label: 'Verification in Progress' },
  { value: 'verified', label: 'Verified' },
  { value: 'flagged', label: 'Flagged / Needs Attention' },
];

export const SIZE_UNIT_OPTIONS = [
  { value: 'acres', label: 'Acres' },
  { value: 'hectares', label: 'Hectares' },
  { value: 'sqm', label: 'Square Metres' },
  { value: 'sqft', label: 'Square Feet' },
];

export const DIMENSION_UNIT_OPTIONS = [
  { value: 'ft', label: 'Feet (ft)' },
  { value: 'm', label: 'Metres (m)' },
  { value: 'acres', label: 'Acres' },
];

export const CURRENCY_OPTIONS = [
  { value: 'KES', label: 'KES — Kenyan Shilling' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
];

/* ── Size conversion helpers ─────────────────────────────── */
export function convertSize(value: number, from: string, to: string): number | null {
  if (!value || value <= 0) return null;
  // base: square metres
  const toSqm: Record<string, number> = {
    acres: 4046.8564224,
    hectares: 10000,
    sqm: 1,
    sqft: 0.09290304,
  };
  const sqm = value * (toSqm[from] || 1);
  const factor = toSqm[to] || 1;
  return sqm / factor;
}

export function formatSizeValue(value: number, unit: string): string {
  const num = value >= 100 ? Math.round(value).toLocaleString() : `${parseFloat(value.toFixed(2))}`;
  return `${num} ${unit}`;
}

export function slugifyValue(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}