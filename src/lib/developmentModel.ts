/**
 * Shared development-building logic.
 *
 * A "development" is not a resale home: it is a project that groups several
 * unit listings under one project title. Both the New Developments index
 * (useNewDevelopments) and the development detail page (useDevelopmentDetail)
 * build the exact same model from real `listings` rows - so they must share
 * one implementation. Nothing here is fabricated; every value is derived from
 * the grouped records.
 */

import { listingHasFloorPlan } from '@/lib/listingMeta';

export interface DevelopmentUnit {
  id: string;
  slug: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  price: number;
  currency: string;
  size: number;
  sizeUnit: string;
  image: string;
  images: string[];
  description: string;
  descriptionText: string;
  createdAt: string;
  videoUrl: string;
  /** Raw CRM status of this unit record (available / reserved / sold…). */
  status: string;
  /** Manual agent-configured urgency message for this unit ('' when none). */
  urgencyMessage: string;
}

export interface DevelopmentBrochure {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Development {
  /** Stable grouping key (the real project link when present, else the name). */
  key: string;
  /** The real project link (`listings.development_id`) shared by every unit. */
  developmentId: string;
  name: string;
  slug: string;
  location: string;
  city: string;
  address: string;
  developer: string;
  description: string;
  descriptionText: string;
  status: string;
  category: string;
  listingType: string;
  propertyType: string;
  isFeatured: boolean;
  totalUnits: number;
  unitsSold: number;
  gallery: string[];
  features: string[];
  /** True only when the project genuinely has more than one distinct price. */
  hasPriceRange: boolean;
  lowestPrice: number;
  currency: string;
  unitTypes: { label: string; beds: number; price: number; currency: string }[];
  units: DevelopmentUnit[];
  /** Real attached brochure (validated), or null when the project has none. */
  brochure: DevelopmentBrochure | null;
  /** Real created_at of the primary unit (ISO string) for the "listed on" line. */
  createdAt: string;
  /** First real attached video across the project's units, or ''. */
  videoUrl: string;
  /** Expected/actual completion date (ISO) from the CRM, or ''. */
  completionDate: string;
  /** Developer contact channels, when captured in the CRM. */
  developerPhone: string;
  developerEmail: string;
  /** Number of floors in the project, when captured. */
  floors: number;
  /** Units reserved in the CRM, when captured. */
  unitsReserved: number;
  unitsRented: number;
  unitsOccupied: number;
  availableUnits: number;
  currentPrice: number;
  previousPrice: number;
  marketingType: string;
  paymentPlan: { depositPercent: number | null; installments: string };
  showUnitsRemaining: boolean;
  showPercentSold: boolean;
  showPercentRented: boolean;
  showDeveloperName: boolean;
  showUrgencyMessage: boolean;
  /**
   * Manual, agent-configured urgency message for the project ('' when none).
   * Takes priority over any automatic inventory message on the cards.
   */
  urgencyMessage: string;
  percentSold: number;
  /** True when at least one unit in the project carries a real floor plan. */
  hasFloorPlan: boolean;
  /** Project map coordinates, when captured in the CRM (0 = unknown). */
  latitude: number;
  longitude: number;
  /**
   * Project-level key information & utilities, read from the `developments`
   * record so the public page sources these from the CRM DB (never invented).
   */
  projectInfo: DevelopmentProjectInfo;
  /**
   * The representative raw listing row (the primary unit) so project-level
   * facts (ownership, service charge, utilities, custom fields) can be read
   * without enumerating every column on this interface.
   */
  primaryRow: ListingRow;
}

export type ListingRow = Record<string, unknown>;

/**
 * Project-level key information & utilities captured on the `developments`
 * record. These are the exact rows the public development page renders in its
 * "Key information" and "Utilities & more details" blocks, so the public page
 * reads straight from the CRM DB. A blank value renders as "Ask agent".
 */
export interface DevelopmentProjectInfo {
  tenure: string;
  serviceCharge: string;
  councilTaxBand: string;
  groundRent: string;
  groundRentReview: string;
  leaseLength: string;
  water: string;
  electricity: string;
  heating: string;
  sewerage: string;
  broadband: string;
  broadbandSpeed: string;
  mobileCoverage: string;
  parking: string;
}

export const EMPTY_PROJECT_INFO: DevelopmentProjectInfo = {
  tenure: '',
  serviceCharge: '',
  councilTaxBand: '',
  groundRent: '',
  groundRentReview: '',
  leaseLength: '',
  water: '',
  electricity: '',
  heating: '',
  sewerage: '',
  broadband: '',
  broadbandSpeed: '',
  mobileCoverage: '',
  parking: '',
};

/** Read the project-level key-info block off a `developments` DB record. */
export function buildProjectInfo(rec: ListingRow): DevelopmentProjectInfo {
  const s = (v: unknown): string => (v == null ? '' : String(v).trim());
  return {
    tenure: s(rec.tenure),
    serviceCharge: s(rec.service_charge),
    councilTaxBand: s(rec.council_tax_band),
    groundRent: s(rec.ground_rent),
    groundRentReview: s(rec.ground_rent_review),
    leaseLength: s(rec.lease_length),
    water: s(rec.water_supply),
    electricity: s(rec.electricity),
    heating: s(rec.heating),
    sewerage: s(rec.sewerage),
    broadband: s(rec.broadband),
    broadbandSpeed: s(rec.broadband_speed),
    mobileCoverage: s(rec.mobile_coverage),
    parking: s(rec.parking_notes),
  };
}

/** Prefer the incoming values, falling back to the existing ones per field. */
function mergeProjectInfo(
  base: DevelopmentProjectInfo,
  incoming: DevelopmentProjectInfo,
): DevelopmentProjectInfo {
  const pick = (a: string, b: string): string => (a && a.trim() ? a : b);
  return {
    tenure: pick(incoming.tenure, base.tenure),
    serviceCharge: pick(incoming.serviceCharge, base.serviceCharge),
    councilTaxBand: pick(incoming.councilTaxBand, base.councilTaxBand),
    groundRent: pick(incoming.groundRent, base.groundRent),
    groundRentReview: pick(incoming.groundRentReview, base.groundRentReview),
    leaseLength: pick(incoming.leaseLength, base.leaseLength),
    water: pick(incoming.water, base.water),
    electricity: pick(incoming.electricity, base.electricity),
    heating: pick(incoming.heating, base.heating),
    sewerage: pick(incoming.sewerage, base.sewerage),
    broadband: pick(incoming.broadband, base.broadband),
    broadbandSpeed: pick(incoming.broadbandSpeed, base.broadbandSpeed),
    mobileCoverage: pick(incoming.mobileCoverage, base.mobileCoverage),
    parking: pick(incoming.parking, base.parking),
  };
}

export const toNumber = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const toString = (v: unknown): string => (v == null ? '' : String(v));

export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stable project key used to group listings that belong to the same development. */
export function projectKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function bedLabel(beds: number): string {
  if (beds <= 0) return 'Studio / Off-plan';
  if (beds === 1) return '1 Bed';
  if (beds === 2) return '2 Beds';
  if (beds === 3) return '3 Beds';
  if (beds === 4) return '4 Beds';
  return `${beds} Beds`;
}

export const unique = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

/** Returns the first non-empty value for a column across a group's rows. */
function primaryMapped(rows: ListingRow[], key: string): unknown {
  for (const row of rows) {
    const v = row[key];
    if (v != null && String(v).trim() !== '') return v;
  }
  return rows[0]?.[key];
}

/** A URL is only usable as a brochure when it is a real, absolute http(s) link. */
function isUsableUrl(value: unknown): boolean {
  const s = toString(value).trim();
  return /^https?:\/\//i.test(s);
}

/**
 * Resolve the actual attached brochure for a project from its units' real
 * `documents` payload. We never trust a bare flag: the entry must exist, be a
 * brochure, and carry a well-formed URL - otherwise it counts as unavailable.
 */
export function resolveBrochure(rows: ListingRow[]): DevelopmentBrochure | null {
  for (const row of rows) {
    const docs = row.documents;
    if (!Array.isArray(docs)) continue;
    const normalized = docs
      .filter((d) => d && typeof d === 'object')
      .map((d) => d as ListingRow);
    if (normalized.length === 0) continue;
    const byCategory = normalized.filter((d) => toString(d.category).toLowerCase() === 'brochure');
    const byName = normalized.filter((d) => toString(d.name).toLowerCase().includes('brochure'));
    const candidate = [...byCategory, ...byName].find((d) => isUsableUrl(d.url));
    if (candidate) {
      return {
        name: toString(candidate.name) || 'Property Brochure',
        url: toString(candidate.url).trim(),
        type: toString(candidate.type) || 'pdf',
        size: toNumber(candidate.size),
      };
    }
  }
  return null;
}

const COLUMNS =
  'id, slug, title, development_id, description, location, neighbourhood, address, city, ' +
  'property_type, property_category, listing_type, bedrooms, bathrooms, parking, ' +
  'price, current_price, previous_price, currency, main_image, cover_image, images, sqft, size, size_unit, ' +
  'is_featured, development_stage, developer_name, developer_phone, developer_email, total_units, units_sold, ' +
  'units_reserved, units_rented, units_occupied, marketing_type, payment_plan, show_units_remaining, ' +
  'show_percent_sold, show_percent_rented, show_developer_name, show_urgency_message, floors, completion_date, ' +
  'status, amenities, documents, floor_plans, video_url, created_at, ' +
  // Project-level public facts (ownership, costs, utilities, location).
  'latitude, longitude, service_charge, availability_status, custom_fields, condition, land_title, ' +
  'lease_period, lease_expiry_date, utility_checkboxes, water_supply, construction_type, interior_finish, ' +
  'flooring_type, gated_community, swimming_pool, gym, backup_power, proximity_amenities, unique_features, ' +
  'urgency_message';

/** Columns every development query selects. */
export const DEVELOPMENT_COLUMNS = COLUMNS;

/** Map one listing row into a unit record. */
export function mapRowToUnit(row: ListingRow, smartTitleCase: (s: string) => string): DevelopmentUnit {
  const description = toString(row.description);
  const mainImg = toString(row.main_image);
  const coverImg = toString(row.cover_image);
  const images = Array.isArray(row.images) ? (row.images as unknown[]).map((i) => toString(i)).filter(Boolean) : [];
  const size = toNumber(row.size) || toNumber(row.sqft) || 0;
  return {
    id: toString(row.id),
    slug: toString(row.slug) || toString(row.id),
    name: smartTitleCase(toString(row.title)) || 'Untitled Development',
    bedrooms: toNumber(row.bedrooms),
    bathrooms: toNumber(row.bathrooms),
    parking: toNumber(row.parking),
    price: toNumber(row.price) || toNumber(row.current_price),
    currency: toString(row.currency) || 'KES',
    size,
    sizeUnit: toString(row.size_unit) || 'sqft',
    image: mainImg || coverImg || (images[0] as string) || '',
    images: unique([mainImg, coverImg, ...images].filter(Boolean)),
    description,
    descriptionText: stripHtml(description),
    createdAt: toString(row.created_at),
    videoUrl: toString(row.video_url),
    status: toString(row.status),
    urgencyMessage: toString(row.urgency_message),
  };
}

export interface BuildDevelopmentOptions {
  smartTitleCase: (s: string) => string;
  formatAreaName: (input: { neighbourhood: string; address: string; location: string; city: string }) => string;
}

/** Build one Development project from its grouped unit rows. */
export function buildDevelopment(groupRows: ListingRow[], opts: BuildDevelopmentOptions): Development {
  const { smartTitleCase, formatAreaName } = opts;
  const units: DevelopmentUnit[] = groupRows.map((row) => mapRowToUnit(row, smartTitleCase));

  const sorted = [...units].sort((a, b) => {
    if (a.price <= 0) return 1;
    if (b.price <= 0) return -1;
    return a.price - b.price;
  });
  const primary = sorted[0] || units[0];
  const primaryRow = groupRows.find((r) => toString(r.id) === primary.id) || groupRows[0];

  const positivePrices = sorted.map((u) => u.price).filter((p) => p > 0);
  const distinctPrices = new Set(positivePrices);
  const lowestPrice = positivePrices.length ? Math.min(...positivePrices) : 0;

  const gallery = unique(sorted.flatMap((u) => u.images));
  const videoUrl = sorted.find((u) => u.videoUrl)?.videoUrl || '';
  const features = unique(
    groupRows.flatMap((r) =>
      Array.isArray(r.amenities) ? (r.amenities as unknown[]).map((i) => toString(i)).filter(Boolean) : []
    )
  );

  const neighbourhood = toString(primaryMapped(groupRows, 'neighbourhood'));
  const area = formatAreaName({
    neighbourhood,
    address: toString(primaryMapped(groupRows, 'address')),
    location: toString(primaryMapped(groupRows, 'location')),
    city: toString(primaryMapped(groupRows, 'city')),
  });

  const totalUnits = toNumber(primaryMapped(groupRows, 'total_units'));
  const unitsSold = toNumber(primaryMapped(groupRows, 'units_sold'));
  const unitsReservedVal = toNumber(primaryMapped(groupRows, 'units_reserved'));
  const unitsRentedVal = toNumber(primaryMapped(groupRows, 'units_rented'));
  const unitsOccupiedVal = toNumber(primaryMapped(groupRows, 'units_occupied'));
  const availableUnits = totalUnits > 0 ? Math.max(0, totalUnits - unitsSold - unitsReservedVal) : 0;
  const percentSold = totalUnits > 0 ? Math.min(100, Math.round((unitsSold / totalUnits) * 100)) : 0;

  const rawPlan = primaryMapped(groupRows, 'payment_plan');
  const planObj = rawPlan && typeof rawPlan === 'object' ? (rawPlan as ListingRow) : {};
  const paymentPlan = {
    depositPercent:
      planObj.deposit_percent != null && String(planObj.deposit_percent) !== ''
        ? toNumber(planObj.deposit_percent)
        : null,
    installments: toString(planObj.installments),
  };
  const boolField = (key: string, fallback: boolean): boolean => {
    const v = primaryMapped(groupRows, key);
    return v === null || v === undefined ? fallback : Boolean(v);
  };

  return {
    key: (() => {
      const devId = toString(primaryMapped(groupRows, 'development_id'));
      return devId ? `dev:${devId}` : `title:${projectKey(toString(primaryMapped(groupRows, 'title')))}`;
    })(),
    developmentId: toString(primaryMapped(groupRows, 'development_id')),
    name: smartTitleCase(toString(primaryMapped(groupRows, 'title'))) || 'Untitled Development',
    slug: primary.slug,
    location: area,
    city: toString(primaryMapped(groupRows, 'city')),
    address: toString(primaryMapped(groupRows, 'address')),
    developer: toString(primaryMapped(groupRows, 'developer_name')),
    description: toString(primaryMapped(groupRows, 'description')),
    descriptionText: stripHtml(toString(primaryMapped(groupRows, 'description'))),
    status: toString(primaryMapped(groupRows, 'development_stage')),
    category: toString(primaryMapped(groupRows, 'property_category')),
    listingType: toString(primaryMapped(groupRows, 'listing_type')),
    propertyType: toString(primaryMapped(groupRows, 'property_type')) || 'apartment',
    isFeatured: groupRows.some((r) => Boolean(r.is_featured)),
    totalUnits,
    unitsSold,
    gallery,
    features,
    hasPriceRange: distinctPrices.size > 1,
    lowestPrice,
    currency: primary.currency || 'KES',
    unitTypes: sorted.map((u) => ({
      label: bedLabel(u.bedrooms),
      beds: u.bedrooms,
      price: u.price,
      currency: u.currency,
    })),
    units: sorted,
    brochure: resolveBrochure(groupRows),
    createdAt: primary.createdAt,
    videoUrl,
    completionDate: toString(primaryMapped(groupRows, 'completion_date')),
    developerPhone: toString(primaryMapped(groupRows, 'developer_phone')),
    developerEmail: toString(primaryMapped(groupRows, 'developer_email')),
    floors: toNumber(primaryMapped(groupRows, 'floors')),
    unitsReserved: unitsReservedVal,
    unitsRented: unitsRentedVal,
    unitsOccupied: unitsOccupiedVal,
    availableUnits,
    percentSold,
    currentPrice: toNumber(primaryMapped(groupRows, 'current_price')),
    previousPrice: toNumber(primaryMapped(groupRows, 'previous_price')),
    marketingType: toString(primaryMapped(groupRows, 'marketing_type')),
    paymentPlan,
    showUnitsRemaining: boolField('show_units_remaining', true),
    showPercentSold: boolField('show_percent_sold', true),
    showPercentRented: boolField('show_percent_rented', false),
    showDeveloperName: boolField('show_developer_name', true),
    showUrgencyMessage: boolField('show_urgency_message', true),
    urgencyMessage: toString(primaryMapped(groupRows, 'urgency_message')),
    hasFloorPlan: groupRows.some((r) => listingHasFloorPlan(r)),
    latitude: toNumber(primaryMapped(groupRows, 'latitude')),
    longitude: toNumber(primaryMapped(groupRows, 'longitude')),
    projectInfo: buildProjectInfo(primaryRow),
    primaryRow,
  };
}

/**
 * Group raw rows into projects.
 *
 * The real project link (`development_id`) is the primary grouping key, so every
 * unit of the SAME project groups together even when the units carry different
 * titles. When a listing has no project link yet, it falls back to the shared
 * normalised title (legacy behaviour) so nothing regresses.
 */
export function groupRowsByProject(rows: ListingRow[]): Map<string, ListingRow[]> {
  const groups = new Map<string, ListingRow[]>();
  for (const row of rows) {
    const devId = toString(row.development_id);
    const key = devId ? `dev:${devId}` : `title:${projectKey(toString(row.title))}`;
    const arr = groups.get(key) || [];
    arr.push(row);
    groups.set(key, arr);
  }
  return groups;
}

/**
 * Overlay the canonical `developments` record (the project entity) onto a
 * development built from its unit listings, so a real multi-unit project shows
 * the project's own name, description, gallery, developer and inventory - rather
 * than whichever unit happened to sort first.
 */
export function applyProjectRecord(dev: Development, rec: ListingRow): Development {
  const recGallery = Array.isArray(rec.gallery)
    ? (rec.gallery as unknown[]).map((i) => toString(i)).filter(Boolean)
    : [];
  const gallery = unique([...recGallery, ...dev.gallery]);

  const totalUnits = toNumber(rec.total_units) || dev.totalUnits;
  const unitsSold = toNumber(rec.units_sold) || dev.unitsSold;
  const unitsReserved = toNumber(rec.units_reserved) || dev.unitsReserved;
  const unitsRented = toNumber(rec.units_rented) || dev.unitsRented;
  const unitsOccupied = toNumber(rec.units_occupied) || dev.unitsOccupied;
  const availableUnits = totalUnits > 0
    ? Math.max(0, totalUnits - unitsSold - unitsReserved)
    : dev.availableUnits;
  const percentSold = totalUnits > 0
    ? Math.min(100, Math.round((unitsSold / totalUnits) * 100))
    : dev.percentSold;

  const rawPlan = rec.payment_plan;
  const planObj = rawPlan && typeof rawPlan === 'object' ? (rawPlan as ListingRow) : {};
  const hasPlan = planObj.deposit_percent != null || planObj.installments;

  return {
    ...dev,
    name: toString(rec.title) || dev.name,
    description: toString(rec.description) || dev.description,
    descriptionText: stripHtml(toString(rec.description)) || dev.descriptionText,
    gallery,
    developer: toString(rec.developer_name) || dev.developer,
    developerPhone: toString(rec.developer_phone) || dev.developerPhone,
    developerEmail: toString(rec.developer_email) || dev.developerEmail,
    completionDate: toString(rec.completion_date) || dev.completionDate,
    floors: toNumber(rec.floors) || dev.floors,
    totalUnits,
    unitsSold,
    unitsReserved,
    unitsRented,
    unitsOccupied,
    availableUnits,
    percentSold,
    status: toString(rec.development_status) || dev.status,
    isFeatured: dev.isFeatured || Boolean(rec.is_featured),
    latitude: toNumber(rec.latitude) || dev.latitude,
    longitude: toNumber(rec.longitude) || dev.longitude,
    projectInfo: mergeProjectInfo(dev.projectInfo, buildProjectInfo(rec)),
    ...(hasPlan
      ? {
          paymentPlan: {
            depositPercent:
              planObj.deposit_percent != null && String(planObj.deposit_percent) !== ''
                ? toNumber(planObj.deposit_percent)
                : dev.paymentPlan.depositPercent,
            installments: toString(planObj.installments) || dev.paymentPlan.installments,
          },
        }
      : {}),
  };
}