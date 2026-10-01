/**
 * Property-type framework.
 *
 * ONE BRAND + MULTIPLE PROPERTY EXPERIENCES.
 *
 * The platform shares a single visual language (typography, colour, cards,
 * spacing, search-panel styling) but each property type carries its OWN
 * information model. This module is the single source of truth for:
 *
 *   1. How a record is classified into a property type (`resolvePropertyTypeKey`).
 *   2. What compact facts belong on a card for that type (`buildCardFacts`).
 *   3. The public identity of each type - label, heading, route (`PROPERTY_TYPE_META`).
 *
 * Land is never shown residential facts (beds / baths / furnishing). A JV is
 * never shown as "land + badge". A development is never shown as a resale home.
 * Everything is derived from the live CRM record - nothing is fabricated.
 */

export type PropertyTypeKey =
  | 'residential'
  | 'commercial'
  | 'land'
  | 'joint_venture'
  | 'development';

/** A single compact card fact (icon + human label). */
export interface CardFact {
  key: string;
  icon: string;
  label: string;
}

/** Backwards-compatible alias used by the older specs helper. */
export type PropertySpec = CardFact;

export interface PropertyTypeMeta {
  key: PropertyTypeKey;
  /** Singular label, e.g. "Land". */
  label: string;
  /** Plural / collection label, e.g. "Land & Plots". */
  plural: string;
  /** Page-identity heading, e.g. "Land for Sale in Nairobi". */
  heading: string;
  /** One-line purpose statement so a page's intent is instantly clear. */
  blurb: string;
  icon: string;
  route: string;
}

export const PROPERTY_TYPE_META: Record<PropertyTypeKey, PropertyTypeMeta> = {
  residential: {
    key: 'residential',
    label: 'Residential Home',
    plural: 'Homes & Residences',
    heading: 'Residential Property',
    blurb: 'Houses, apartments and homes to buy or rent.',
    icon: 'ri-home-5-line',
    route: '/buy',
  },
  commercial: {
    key: 'commercial',
    label: 'Commercial Property',
    plural: 'Commercial Property',
    heading: 'Commercial Property',
    blurb: 'Offices, retail, industrial and investment space.',
    icon: 'ri-building-2-line',
    route: '/commercial-property',
  },
  land: {
    key: 'land',
    label: 'Land',
    plural: 'Land & Plots',
    heading: 'Land for Sale',
    blurb: 'Plots and acreage for development, agriculture and investment.',
    icon: 'ri-landscape-line',
    route: '/joint-ventures',
  },
  joint_venture: {
    key: 'joint_venture',
    label: 'Joint Venture',
    plural: 'Joint Venture Opportunities',
    heading: 'Joint Venture Opportunities',
    blurb: 'Structured land partnerships seeking capital or development partners.',
    icon: 'ri-group-line',
    route: '/joint-ventures',
  },
  development: {
    key: 'development',
    label: 'New Development',
    plural: 'New Developments',
    heading: 'New Developments & Projects',
    blurb: 'Off-plan and completed projects from leading developers.',
    icon: 'ri-building-4-line',
    route: '/new-developments',
  },
};

/* ── Type classification sets (kept in sync with the CRM option lists) ── */

const RESIDENTIAL_TYPES = new Set([
  'house', 'apartment', 'bungalow', 'studio', 'studio_flat', 'maisonette',
  'villa', 'townhouse', 'penthouse', 'detached', 'semi_detached',
  'terraced', 'terraced_house', 'park_home', 'flat', 'flat_apartment', 'condo',
  'condominium_apartment', 'apartment_block',
]);

const COMMERCIAL_TYPES = new Set([
  'office', 'serviced_office', 'retail', 'retail_shop', 'shop',
  'warehouse', 'distribution_warehouse', 'industrial', 'industrial_park',
  'light_industrial', 'heavy_industrial', 'factory', 'storage', 'hotel', 'pub',
  'restaurant', 'cafe', 'guest_house', 'leisure', 'commercial',
]);

const LAND_TYPES = new Set([
  'land', 'farms_land',
  'mixed_use_land', 'development_land', 'residential_land', 'commercial_land',
  'industrial_land', 'agricultural_land', 'farmland', 'investment_land',
  'recreational_land',
]);

export interface PropertyTypeInput {
  propertyType?: string | null;
  propertyCategory?: string | null;
  subType?: string | null;
  isNewDevelopment?: boolean | null;
  isJointVenture?: boolean | null;
}

function norm(value?: string | null): string {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/\/+/g, '_')
    .replace(/__+/g, '_');
}

/**
 * Resolve a record to exactly one property type. Accepts either a bare
 * property-type string or the fuller classification input. New Development and
 * Joint Venture win over the generic land/commercial classification because
 * they are genuinely different information models.
 */
export function resolvePropertyTypeKey(
  input?: string | PropertyTypeInput | null,
): PropertyTypeKey {
  const obj: PropertyTypeInput =
    typeof input === 'string' || input == null ? { propertyType: input ?? undefined } : input;

  const t = norm(obj.propertyType);
  const cat = norm(obj.propertyCategory);
  const sub = norm(obj.subType);

  if (obj.isNewDevelopment || cat === 'new_development' || sub === 'new_development') {
    return 'development';
  }
  if (obj.isJointVenture || sub === 'joint_venture' || cat === 'joint_venture') {
    return 'joint_venture';
  }
  if (cat === 'land' || LAND_TYPES.has(t)) return 'land';
  if (cat === 'commercial' || COMMERCIAL_TYPES.has(t)) return 'commercial';
  return 'residential';
}

/* ── Formatting helpers ── */

const titleCase = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const fmtNum = (n: number): string =>
  Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

const positive = (n?: number | null): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);

const DEV_STAGE_LABELS: Record<string, string> = {
  off_plan: 'Off-plan',
  under_construction: 'Under Construction',
  completed: 'Completed',
  ready: 'Ready',
  launch: 'Launch',
  now_selling: 'Now Selling',
};

function stageLabel(value: string): string {
  const k = norm(value);
  return DEV_STAGE_LABELS[k] || titleCase(value);
}

function roadAccessLabel(value: string): string {
  const label = titleCase(value);
  if (!label) return '';
  return /access/i.test(label) ? label : `${label} Access`;
}

/* ── Card facts per type ── */

export interface CardFactValues {
  /* residential */
  beds?: number;
  baths?: number;
  parking?: number;
  /* size */
  sqft?: number;
  sqm?: number;
  /* land */
  acreage?: number;
  landSize?: number;
  landUnit?: string;
  tenure?: string;
  landType?: string;
  landUse?: string;
  roadAccess?: string;
  /* commercial */
  floors?: number;
  occupancy?: string;
  /* development */
  units?: number;
  bedsMin?: number;
  bedsMax?: number;
  completion?: string;
  stage?: string;
  /* joint venture */
  dealType?: string;
  projectType?: string;
}

const MAX_RESIDENTIAL = 4;
const MAX_COMMERCIAL = 3;
const MAX_LAND = 4;
const MAX_JV = 3;
const MAX_DEVELOPMENT = 4;

/**
 * Build the compact fact list shown inside a property card for a given type.
 * Only facts backed by real values are returned - empty values never render.
 */
export function buildCardFacts(key: PropertyTypeKey, v: CardFactValues = {}): CardFact[] {
  const facts: CardFact[] = [];

  if (key === 'land') {
    const area = positive(v.acreage) || positive(v.landSize);
    if (area > 0) {
      facts.push({ key: 'land-size', icon: 'ri-landscape-line', label: `${fmtNum(area)} ${v.landUnit || 'Acres'}` });
    }
    if (v.tenure) {
      facts.push({ key: 'land-tenure', icon: 'ri-file-shield-2-line', label: titleCase(v.tenure) });
    }
    const use = v.landUse || v.landType;
    if (use) {
      facts.push({ key: 'land-use', icon: 'ri-community-line', label: titleCase(use) });
    }
    if (v.roadAccess) {
      facts.push({ key: 'land-access', icon: 'ri-road-map-line', label: roadAccessLabel(v.roadAccess) });
    }
    return facts.slice(0, MAX_LAND);
  }

  if (key === 'joint_venture') {
    const area = positive(v.acreage) || positive(v.landSize);
    if (area > 0) {
      facts.push({ key: 'jv-size', icon: 'ri-landscape-line', label: `${fmtNum(area)} ${v.landUnit || 'Acres'}` });
    }
    facts.push({
      key: 'jv-deal',
      icon: 'ri-group-line',
      label: v.dealType ? `${titleCase(v.dealType)} JV` : 'Joint Venture',
    });
    facts.push({
      key: 'jv-project',
      icon: 'ri-building-4-line',
      label: v.projectType ? titleCase(v.projectType) : 'Development Opportunity',
    });
    return facts.slice(0, MAX_JV);
  }

  if (key === 'development') {
    const units = positive(v.units);
    if (units > 0) {
      facts.push({ key: 'dev-units', icon: 'ri-building-4-line', label: `${fmtNum(units)} Units` });
    }
    const min = positive(v.bedsMin);
    const max = positive(v.bedsMax);
    if (min > 0 && max > 0 && min !== max) {
      facts.push({ key: 'dev-beds', icon: 'ri-hotel-bed-line', label: `${min}-${max} Beds` });
    } else if (min > 0 || max > 0) {
      const b = min || max;
      facts.push({ key: 'dev-beds', icon: 'ri-hotel-bed-line', label: `${b} ${b === 1 ? 'Bed' : 'Beds'}` });
    }
    if (v.stage) {
      facts.push({ key: 'dev-stage', icon: 'ri-hammer-line', label: stageLabel(v.stage) });
    }
    if (v.completion) {
      facts.push({ key: 'dev-completion', icon: 'ri-calendar-check-line', label: `Completion ${v.completion}` });
    }
    return facts.slice(0, MAX_DEVELOPMENT);
  }

  if (key === 'commercial') {
    const sqm = positive(v.sqm) || (positive(v.sqft) ? Math.round(positive(v.sqft) * 0.0929) : 0);
    if (sqm > 0) {
      facts.push({ key: 'comm-size', icon: 'ri-ruler-line', label: `${fmtNum(sqm)} sqm` });
    }
    const floors = positive(v.floors);
    if (floors > 0) {
      facts.push({ key: 'comm-floors', icon: 'ri-building-line', label: `${fmtNum(floors)} ${floors === 1 ? 'Floor' : 'Floors'}` });
    }
    const parking = positive(v.parking);
    if (parking > 0) {
      facts.push({ key: 'comm-parking', icon: 'ri-car-line', label: `${fmtNum(parking)} Parking` });
    }
    return facts.slice(0, MAX_COMMERCIAL);
  }

  /* residential */
  const beds = positive(v.beds);
  const baths = positive(v.baths);
  const parking = positive(v.parking);
  if (beds > 0) facts.push({ key: 'beds', icon: 'ri-hotel-bed-line', label: `${beds} ${beds === 1 ? 'Bed' : 'Beds'}` });
  if (baths > 0) facts.push({ key: 'baths', icon: 'fa-solid fa-bath', label: `${baths} ${baths === 1 ? 'Bath' : 'Baths'}` });
  if (parking > 0) facts.push({ key: 'parking', icon: 'ri-car-line', label: `${parking} Parking` });
  // Floor area gives every residential card a size fact even when the record
  // has no bed / bath counts captured yet.
  const sqft = positive(v.sqft);
  if (sqft > 0) facts.push({ key: 'size', icon: 'ri-ruler-2-line', label: `${fmtNum(sqft)} sqft` });
  return facts.slice(0, MAX_RESIDENTIAL);
}