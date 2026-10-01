/* ─────────────────────────────────────────────────────────────
   JV Land Listing / JV Opportunity CRM — shared constants.
   Used by the comprehensive Add/Edit form and the JV Desk.
   Self-contained vocabulary for land-use, deal structure,
   contribution, capital currency, development-period payments,
   agent commission and continuity & source.
   ───────────────────────────────────────────────────────────── */

export const JV_STATUS_OPTIONS = [
  { value: '', label: 'Select status' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'new', label: 'New' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed', label: 'Closed' },
];

export const JV_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending Approval',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  new: 'New',
  under_review: 'Under Review',
  negotiation: 'Negotiation',
  closed: 'Closed',
};

export const JV_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#f0f2f4] text-[#6b7684]',
  pending: 'bg-[#fff5e6] text-[#f58300]',
  approved: 'bg-[#e6f4ea] text-[#088135]',
  scheduled: 'bg-[#e8edf2] text-[#001731]',
  published: 'bg-[#088135] text-white',
  new: 'bg-[#e8edf2] text-[#001731]',
  under_review: 'bg-[#fff5e6] text-[#f58300]',
  negotiation: 'bg-[#e6f4ea] text-[#088135]',
  closed: 'bg-[#f0f2f4] text-[#6b7684]',
};

/* The publishing pipeline: Draft → Pending Approval → Approved → Published.
   Used for the status stepper and the manual pipeline dropdown. */
export const JV_WORKFLOW_STEPS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
] as const;

/* ── Scheduling without a schema change ──
   There is no dedicated schedule column, so the planned publish time is
   folded into the existing `status` text column as `scheduled|<ISO>`.
   `parseJvStatus` splits it back into a clean workflow status + the time. */
export const JV_SCHEDULE_PREFIX = 'scheduled';

export function encodeScheduledStatus(iso: string): string {
  return `${JV_SCHEDULE_PREFIX}|${iso}`;
}

export function parseJvStatus(raw: string | null | undefined): { status: string; scheduledAt: string | null } {
  const value = (raw || '').trim();
  if (value.startsWith(`${JV_SCHEDULE_PREFIX}|`)) {
    return { status: 'scheduled', scheduledAt: value.slice(JV_SCHEDULE_PREFIX.length + 1) };
  }
  if (value === JV_SCHEDULE_PREFIX) {
    return { status: 'scheduled', scheduledAt: null };
  }
  return { status: value, scheduledAt: null };
}

export const DEAL_TYPE_OPTIONS = [
  { value: '', label: 'Select deal type' },
  { value: 'jv', label: 'Joint Venture' },
  { value: 'lease', label: 'Lease' },
  { value: 'outright_sale', label: 'Outright Sale' },
  { value: 'lease_to_own', label: 'Lease-to-Own' },
  { value: 'management', label: 'Management / Revenue Contract' },
];

export const DEAL_TYPE_LABELS: Record<string, string> = {
  jv: 'Joint Venture',
  lease: 'Lease',
  outright_sale: 'Outright Sale',
  lease_to_own: 'Lease-to-Own',
  management: 'Management / Revenue Contract',
};

export const DEAL_STRUCTURE_OPTIONS = [
  { value: '', label: 'Select deal structure' },
  { value: 'land_for_units', label: 'Land for Units' },
  { value: 'land_for_equity', label: 'Land for Equity' },
  { value: 'land_for_revenue_share', label: 'Land for Revenue Share' },
  { value: 'land_for_profit_share', label: 'Land for Profit Share' },
  { value: 'land_cash', label: 'Land + Cash' },
  { value: 'cash_land', label: 'Cash + Land' },
  { value: 'dma', label: 'Development Management Agreement' },
  { value: 'joint_development', label: 'Joint Development' },
  { value: 'other', label: 'Other / Custom Structure' },
];

export const DEAL_STRUCTURE_LABELS: Record<string, string> = {
  land_for_units: 'Land for Units',
  land_for_equity: 'Land for Equity',
  land_for_revenue_share: 'Land for Revenue Share',
  land_for_profit_share: 'Land for Profit Share',
  land_cash: 'Land + Cash',
  cash_land: 'Cash + Land',
  dma: 'Development Management Agreement',
  joint_development: 'Joint Development',
  other: 'Other / Custom Structure',
};

export const CONTRIBUTION_OPTIONS = [
  { value: '', label: 'Select contribution' },
  { value: 'land_only', label: 'Land only' },
  { value: 'land_cash', label: 'Land + cash' },
  { value: 'flexible', label: 'Flexible' },
  { value: 'cash_only', label: 'Capital only' },
  { value: 'asset_in_kind', label: 'Asset / In-kind' },
];

export const CONTRIBUTION_LABELS: Record<string, string> = {
  land_only: 'Land only',
  land_cash: 'Land + cash',
  flexible: 'Flexible',
  cash_only: 'Capital only',
  asset_in_kind: 'Asset / In-kind',
};

export const CONTRIBUTION_TYPE_OPTIONS = [
  { value: '', label: 'Contribution type' },
  { value: 'land', label: 'Land only' },
  { value: 'land_cash', label: 'Land + cash' },
  { value: 'cash', label: 'Cash / Capital' },
  { value: 'in_kind', label: 'In-kind / Asset' },
  { value: 'flexible', label: 'Flexible' },
];

export const CONSIDERATION_TYPE_OPTIONS = [
  { value: '', label: 'Developer consideration' },
  { value: 'units', label: 'Number of units' },
  { value: 'units_percent', label: 'Percentage of total units' },
  { value: 'equity', label: 'Equity percentage' },
  { value: 'revenue_share', label: 'Revenue share %' },
  { value: 'profit_share', label: 'Profit share %' },
  { value: 'cash', label: 'Cash consideration' },
  { value: 'cash_units', label: 'Cash + units' },
  { value: 'other', label: 'Other' },
];

export const CONSIDERATION_TYPE_LABELS: Record<string, string> = {
  units: 'Number of units',
  units_percent: 'Percentage of total units',
  equity: 'Equity percentage',
  revenue_share: 'Revenue share %',
  profit_share: 'Profit share %',
  cash: 'Cash consideration',
  cash_units: 'Cash + units',
  other: 'Other',
};

export const CURRENCY_OPTIONS = [
  { value: '', label: 'Select currency' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'UGX', label: 'UGX — Ugandan Shilling' },
  { value: 'KES', label: 'KES — Kenyan Shilling' },
  { value: 'TZS', label: 'TZS — Tanzanian Shilling' },
  { value: 'RWF', label: 'RWF — Rwandan Franc' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'other', label: 'Other' },
];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  UGX: 'USh',
  KES: 'KSh',
  TZS: 'TSh',
  RWF: 'RWF',
  EUR: '€',
  GBP: '£',
};

export const VALUATION_BASIS_OPTIONS = [
  { value: '', label: 'Valuation basis' },
  { value: 'market_comparables', label: 'Market comparables' },
  { value: 'appraisal', label: 'Professional appraisal' },
  { value: 'owner_estimate', label: 'Owner estimate' },
  { value: 'recent_offer', label: 'Recent offer / negotiation' },
  { value: 'other', label: 'Other' },
];

export const VALUATION_STATUS_OPTIONS = [
  { value: '', label: 'Valuation status' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'expired', label: 'Expired' },
  { value: 'other', label: 'Other' },
];

export const EXIT_EXPECTATION_OPTIONS = [
  { value: '', label: 'Select exit expectation' },
  { value: 'build_sell', label: 'Build & Sell (flip)' },
  { value: 'hold_rent', label: 'Hold & Rent (yield)' },
  { value: 'long_term', label: 'Long-term capital growth' },
  { value: 'revenue_share', label: 'Ongoing revenue share' },
  { value: 'flexible', label: 'Flexible / Not decided' },
];

export const EXIT_EXPECTATION_LABELS: Record<string, string> = {
  build_sell: 'Build & Sell (flip)',
  hold_rent: 'Hold & Rent (yield)',
  long_term: 'Long-term capital growth',
  revenue_share: 'Ongoing revenue share',
  flexible: 'Flexible / Not decided',
};

export const PROJECT_TYPE_OPTIONS = [
  { value: '', label: 'Select project type' },
  { value: 'apartments', label: 'Apartments' },
  { value: 'gated_community', label: 'Gated Community' },
  { value: 'estate_development', label: 'Estate Development' },
  { value: 'commercial_complex', label: 'Commercial Complex' },
  { value: 'mixed_use', label: 'Mixed-Use' },
  { value: 'hospitality', label: 'Hotel / Resort' },
  { value: 'industrial', label: 'Industrial / Warehouse' },
  { value: 'retail', label: 'Retail' },
  { value: 'agricultural', label: 'Agriculture / Agri-processing' },
  { value: 'recreational', label: 'Recreational' },
  { value: 'office', label: 'Offices' },
  { value: 'other', label: 'Other' },
];

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  apartments: 'Apartments',
  gated_community: 'Gated Community',
  estate_development: 'Estate Development',
  commercial_complex: 'Commercial Complex',
  mixed_use: 'Mixed-Use',
  hospitality: 'Hotel / Resort',
  industrial: 'Industrial / Warehouse',
  retail: 'Retail',
  agricultural: 'Agriculture / Agri-processing',
  recreational: 'Recreational',
  office: 'Offices',
  other: 'Other',
};

export const TIMELINE_OPTIONS = [
  { value: '', label: 'Select timeline' },
  { value: 'immediate', label: 'Immediate' },
  { value: '3_months', label: 'Within 3 months' },
  { value: '6_months', label: 'Within 6 months' },
  { value: '12_months', label: 'Within 12 months' },
  { value: 'flexible', label: 'Flexible' },
];

export const TIMELINE_LABELS: Record<string, string> = {
  immediate: 'Immediate',
  '3_months': 'Within 3 months',
  '6_months': 'Within 6 months',
  '12_months': 'Within 12 months',
  flexible: 'Flexible',
};

export const LAND_TITLE_STATUS_OPTIONS = [
  { value: '', label: 'Select title status' },
  { value: 'freehold', label: 'Freehold' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'mailo', label: 'Mailo' },
  { value: 'kibanja', label: 'Kibanja / Customary' },
  { value: 'in_process', label: 'In Process' },
  { value: 'unknown', label: 'Not known' },
];

export const LAND_TITLE_STATUS_LABELS: Record<string, string> = {
  freehold: 'Freehold',
  leasehold: 'Leasehold',
  mailo: 'Mailo',
  kibanja: 'Kibanja / Customary',
  in_process: 'In Process',
  unknown: 'Not known',
};

export const LAND_ROAD_ACCESS_OPTIONS = [
  'Tarmac Road', 'Cabro / Paved Road', 'Gravel / Murram Road', 'Earth Road',
  'Track / Unpaved Access', 'Seasonal Access', 'No Direct Road Access', 'Access Road Required',
];

export const LAND_WATER_OPTIONS = [
  'Mains Water', 'Borehole', 'Well', 'River / Natural Water', 'Rainwater Potential', 'No Water', 'Nearby Water',
];

export const LAND_ELECTRICITY_OPTIONS = [
  'Electricity Connected', 'Electricity at Boundary', 'Electricity Nearby', 'Electricity Not Available',
];

export const LAND_PRIMARY_USE_OPTIONS = [
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

export const LAND_SECONDARY_USES = [
  'Residential', 'Commercial', 'Mixed-Use', 'Industrial', 'Agricultural',
  'Education', 'Recreation', 'Conservation', 'Hospitality / Tourism',
  'Retail', 'Offices', 'Other / Specify',
];

export const LAND_SUITABLE_FOR = [
  'Private Residence', 'Apartments', 'Gated Community', 'Estate Development',
  'Commercial Development', 'Retail', 'Offices', 'Industrial Development',
  'Warehouse', 'Hotel', 'Resort', 'Eco-Lodge', 'Farm', 'Agriculture', 'Ranch',
  'School', 'Hospital', 'Church / Religious Use', 'Mixed-Use Development',
  'Land Banking', 'Subdivision', 'Other / Specify',
];

export const LAND_DEVELOPMENT_POTENTIAL = [
  'Ready for Development', 'Development Approved', 'Planning Permission Available',
  'Change of User Possible', 'Subdivision Potential', 'High-Density Potential',
  'Low-Density Potential', 'Mixed-Use Potential', 'Development Potential Not Assessed',
  'Other / Specify',
];

export const LAND_DEVELOPMENT_CHARACTERISTICS = [
  'Subdivision potential', 'Agricultural', 'Commercial', 'Residential',
];

export const DEV_PAYMENT_TYPE_OPTIONS = [
  { value: '', label: 'Payment during development' },
  { value: 'none', label: 'None' },
  { value: 'monthly_rent', label: 'Monthly rent' },
  { value: 'quarterly', label: 'Quarterly payment' },
  { value: 'annual', label: 'Annual payment' },
  { value: 'lump_sum', label: 'Lump-sum payment' },
  { value: 'other', label: 'Other' },
];

export const DEV_PAYMENT_FREQUENCY_OPTIONS = [
  'Monthly', 'Quarterly', 'Semi-annually', 'Annually', 'Per milestone', 'Other',
];

export const COMMISSION_STRUCTURE_OPTIONS = [
  { value: '', label: 'Commission structure' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed amount' },
  { value: 'per_unit', label: 'Per unit' },
  { value: 'negotiated', label: 'Negotiated' },
  { value: 'none', label: 'No commission' },
  { value: 'other', label: 'Other' },
];

export const COMMISSION_BASIS_OPTIONS = [
  { value: '', label: 'Commission basis' },
  { value: 'land_value', label: 'Land value' },
  { value: 'transaction_value', label: 'Transaction value' },
  { value: 'cash_consideration', label: 'Cash consideration' },
  { value: 'developer_consideration', label: 'Developer\'s consideration' },
  { value: 'completed_units', label: 'Completed units' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'profit', label: 'Profit' },
  { value: 'other', label: 'Other' },
];

export const COMMISSION_PAYER_OPTIONS = [
  { value: '', label: 'Commission payer' },
  { value: 'landowner', label: 'Landowner' },
  { value: 'developer', label: 'Developer' },
  { value: 'both', label: 'Both parties' },
  { value: 'spv', label: 'JV company / SPV' },
  { value: 'other', label: 'Other' },
];

export const COMMISSION_PAYMENT_TIMING_OPTIONS = [
  { value: '', label: 'Payment timing' },
  { value: 'upon_agreement', label: 'Upon execution of JV agreement' },
  { value: 'completion', label: 'Upon completion' },
  { value: 'closing', label: 'At closing' },
  { value: 'milestones', label: 'Per milestone' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'other', label: 'Other' },
];

export const CONTINUITY_TYPE_OPTIONS = [
  { value: '', label: 'Select continuity' },
  { value: 'new_opportunity', label: 'New opportunity' },
  { value: 'existing_relationship', label: 'Existing relationship' },
  { value: 'existing_client', label: 'Existing client' },
  { value: 'previously_listed', label: 'Previously listed' },
  { value: 'previously_submitted', label: 'Previously submitted' },
  { value: 'referred', label: 'Referred opportunity' },
  { value: 'returning', label: 'Returning opportunity' },
  { value: 'converted', label: 'Converted from another CRM record' },
];

export const SOURCE_TYPE_OPTIONS = [
  { value: '', label: 'Select source' },
  { value: 'owner', label: 'Owner' },
  { value: 'direct_agent', label: 'Direct agent' },
  { value: 'broker', label: 'Broker' },
  { value: 'developer', label: 'Developer' },
  { value: 'jv_partner', label: 'JV partner' },
  { value: 'referral', label: 'Referral' },
  { value: 'database', label: 'Existing database' },
  { value: 'website', label: 'Website submission' },
  { value: 'other', label: 'Other' },
];

export const SOURCE_LABELS: Record<string, string> = {
  owner: 'Owner',
  direct_agent: 'Direct agent',
  broker: 'Broker',
  developer: 'Developer',
  jv_partner: 'JV partner',
  referral: 'Referral',
  database: 'Existing database',
  website: 'Website submission',
  other: 'Other',
};

export function slugifyJv(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/* ── JV Pricing (optional — a JV does not have to be price-free) ── */
export const PRICE_BASIS_OPTIONS = [
  { value: '', label: 'Select price basis' },
  { value: 'total', label: 'Total deal price' },
  { value: 'per_acre', label: 'Price per acre' },
  { value: 'per_hectare', label: 'Price per hectare' },
  { value: 'per_sqm', label: 'Price per sqm' },
  { value: 'per_plot', label: 'Price per plot' },
  { value: 'per_unit', label: 'Price per unit' },
];

/* ── On-site amenities / utilities for a JV land listing (Section 4) ──
   A curated base list; values prefilled from the linked land listing that are
   not already here are appended at runtime by the Photos & Amenities step. */
export const JV_AMENITY_OPTIONS = [
  'Mains Water', 'Borehole', 'Well', 'River / Natural Water', 'Rainwater Potential',
  'Electricity Connected', 'Electricity at Boundary', 'Electricity Nearby',
  'Sewer Connected', 'Septic Tank', 'Fibre Internet', 'Mobile Network',
  'Tarmac Road', 'Graded / Murram Road', 'Access Road Required',
  'Perimeter Wall', 'Gate House', 'Security', 'Street Lighting', 'Drainage',
  'Flat Terrain', 'Gently Sloping', 'Scenic / View', 'Lakefront', 'Riverside',
];

/* Optional multi-select payment terms — rectangular checkable pills. */
export const PAYMENT_TERMS_OPTIONS = [
  'Cash',
  'Installments',
  'Deposit + balance',
  'Flexible terms',
  'Negotiable',
  'Equity participation',
  'Profit share',
  'Custom terms',
];

/* ── Land Details (Section 4) — size, units, dimensions, tenure ── */
export const LAND_SIZE_UNIT_OPTIONS = [
  { value: 'acres', label: 'Acres' },
  { value: 'hectares', label: 'Hectares' },
  { value: 'sqm', label: 'Square Metres' },
  { value: 'sqft', label: 'Square Feet' },
  { value: 'other', label: 'Other / Specify' },
];

export const LAND_SIZE_UNIT_LABELS: Record<string, string> = {
  acres: 'acres',
  hectares: 'hectares',
  sqm: 'sq.m',
  sqft: 'sq.ft',
  other: 'units',
};

export const LAND_DIM_UNIT_OPTIONS = [
  { value: 'ft', label: 'Feet (ft)' },
  { value: 'm', label: 'Metres (m)' },
  { value: 'acres', label: 'Acres' },
  { value: 'other', label: 'Other / Specify' },
];

export const LAND_PLOT_SHAPE_OPTIONS = [
  { value: '', label: 'Select plot shape' },
  { value: 'regular', label: 'Regular / Rectangular' },
  { value: 'irregular', label: 'Irregular Plot' },
  { value: 'corner', label: 'Corner Plot' },
  { value: 'curved', label: 'Curved Frontage' },
  { value: 'pie', label: 'Pie-Shaped' },
  { value: 'l_shape', label: 'L-Shaped' },
  { value: 'triangular', label: 'Triangular' },
  { value: 'not_available', label: 'Not Available' },
];

export const LAND_PLOT_SHAPE_LABELS: Record<string, string> = {
  regular: 'Regular / Rectangular',
  irregular: 'Irregular Plot',
  corner: 'Corner Plot',
  curved: 'Curved Frontage',
  pie: 'Pie-Shaped',
  l_shape: 'L-Shaped',
  triangular: 'Triangular',
  not_available: 'Not Available',
};

export const LAND_TENURE_OPTIONS = [
  { value: '', label: 'Select tenure' },
  { value: 'freehold', label: 'Freehold' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'customary', label: 'Customary' },
  { value: 'community', label: 'Community Land' },
  { value: 'government', label: 'Government / Public Land' },
  { value: 'partial_interest', label: 'Partial Interest' },
  { value: 'other', label: 'Other / Special Interest' },
];

export const LAND_TENURE_LABELS: Record<string, string> = {
  freehold: 'Freehold',
  leasehold: 'Leasehold',
  customary: 'Customary',
  community: 'Community Land',
  government: 'Government / Public Land',
  partial_interest: 'Partial Interest',
  other: 'Other / Special Interest',
};

export const LAND_CLASSIFICATION_OPTIONS = [
  { value: '', label: 'Ownership classification' },
  { value: 'private', label: 'Private Land' },
  { value: 'community', label: 'Community Land' },
  { value: 'public', label: 'Public Land' },
];

export const LAND_CLASSIFICATION_LABELS: Record<string, string> = {
  private: 'Private Land',
  community: 'Community Land',
  public: 'Public Land',
};

/* Convert a land size to another unit. Returns null when not computable. */
export function convertLandSize(value: number, from: string, to: string): number | null {
  if (!value || value <= 0) return null;
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

export function formatLandSize(value: number, unit: string): string {
  const num = value >= 100 ? Math.round(value).toLocaleString() : `${parseFloat(value.toFixed(2))}`;
  const unitLabel = LAND_SIZE_UNIT_LABELS[unit] || unit || 'units';
  return `${num} ${unitLabel}`;
}

/* ── Land record mode ── */
export const LAND_RECORD_MODE_OPTIONS = [
  { value: 'link', label: 'Link Existing Land Record' },
  { value: 'manual', label: 'Enter Land Details Manually' },
];

export const LAND_RECORD_MODE_LABELS: Record<string, string> = {
  link: 'Link Existing Land Record',
  manual: 'Enter Land Details Manually',
};

/* ── JV Submission pricing / payment terms ── */
export const SUBMISSION_PRICE_BASIS_OPTIONS = [
  { value: '', label: 'Select price basis' },
  { value: 'total', label: 'Total deal price' },
  { value: 'per_acre', label: 'Price per acre' },
  { value: 'per_hectare', label: 'Price per hectare' },
  { value: 'per_sqm', label: 'Price per sqm' },
  { value: 'per_plot', label: 'Price per plot' },
  { value: 'per_unit', label: 'Price per unit' },
];

export const SUBMISSION_PAYMENT_TERMS_OPTIONS = [
  'Cash',
  'Installments',
  'Deposit + balance',
  'Flexible terms',
  'Negotiable',
  'Equity participation',
  'Profit share',
  'Custom terms',
];

/* Format a currency amount with its symbol, compact where large. */
export function formatMoney(value: number | null, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency?.toUpperCase()] || '';
  const base = sym ? `${sym} ` : '';
  if (value == null || value === 0) return `${base}On request`;
  if (value >= 1000000000) return `${base}${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${base}${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
  if (value >= 1000) return `${base}${(value / 1000).toFixed(0)}K`;
  return `${base}${value.toLocaleString()}`;
}