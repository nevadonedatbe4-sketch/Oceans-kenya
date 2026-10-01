/**
 * Land → public detail model.
 *
 * Maps a raw `land_listings` record into the shared PropertyDetailModel.
 * Labels/content parity is guaranteed by reusing the SAME option lists the
 * Land CRM form uses (landConstants), so nothing is a second, reduced schema.
 *
 * Rule: a field is only surfaced when it actually carries a value. We never
 * fabricate "0", "No", "Freehold" or default amenities.
 */

import {
  LAND_TYPE_LABELS,
  OFFER_TYPE_OPTIONS,
  DISPOSITION_OPTIONS,
  STATUS_OPTIONS,
  TENURE_OPTIONS,
  LAND_CLASSIFICATION_OPTIONS,
  TITLE_DOC_OPTIONS,
  VERIFICATION_STATUS_OPTIONS,
  ROAD_ACCESS_OPTIONS,
  PRIMARY_LAND_USE_OPTIONS,
  PRICE_BASIS_OPTIONS,
  PRICE_STATUS_OPTIONS,
} from '@/pages/crm/landConstants';
import type {
  DetailField,
  DetailSection,
  DetailTagGroup,
  PropertyDetailModel,
} from '@/lib/propertyDetail/types';

type Row = Record<string, unknown>;

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());

const arr = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
    : [];

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const isTrue = (v: unknown): boolean => v === true;

function fmtNum(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function optionLabel(options: { value: string; label: string }[], value: string): string {
  if (!value) return '';
  const found = options.find((o) => o.value === value && o.value !== '');
  return found ? found.label : '';
}

function resolveOffer(value: string): string {
  if (!value) return '';
  return optionLabel(OFFER_TYPE_OPTIONS, value) || optionLabel(DISPOSITION_OPTIONS, value) || value;
}

function landTypeLabel(value: string): string {
  if (!value) return '';
  return LAND_TYPE_LABELS[value] || value;
}

// Workflow/internal statuses must never surface on the public page - only
// statuses a visitor actually cares about are shown.
const WORKFLOW_STATUSES = new Set(['draft', 'pending', 'under_review', 'approved', 'published', 'featured']);
function publicStatus(value: string): string {
  if (!value || WORKFLOW_STATUSES.has(value)) return '';
  return optionLabel(STATUS_OPTIONS, value) || value;
}

/** Build a field list, dropping anything empty. */
function makeFields(pairs: Array<[string, string, boolean?]>): DetailField[] {
  return pairs
    .map(([label, value, emphasis]) => ({ label, value: (value || '').trim(), emphasis: Boolean(emphasis) }))
    .filter((f) => f.value);
}

function makeTagGroups(groups: Array<[string, string[]]>): DetailTagGroup[] {
  return groups
    .map(([label, items]) => ({ label, items: items.filter(Boolean) }))
    .filter((g) => g.items.length > 0);
}

export interface LandModelOptions {
  formatMoney: (amount: number, currency: string) => string;
}

export function buildLandModel(row: Row, opts: LandModelOptions): PropertyDetailModel {
  const currency = str(row.currency) || 'KES';
  const unit = str(row.land_size_unit) || str(row.plot_size_unit) || 'acres';
  const sizeNum = num(row.land_size) ?? num(row.plot_size);
  const priceOnRequest = str(row.price_status) === 'on_request';
  const askingPrice = num(row.asking_price);

  const dimUnit = str(row.plot_dim_unit) || 'ft';
  const plotLength = num(row.plot_length);
  const plotWidth = num(row.plot_width);
  let dimText = '';
  if (plotLength && plotWidth) dimText = `${fmtNum(plotLength)} × ${fmtNum(plotWidth)} ${dimUnit}`;
  else if (plotLength) dimText = `${fmtNum(plotLength)} ${dimUnit}`;
  else if (plotWidth) dimText = `${fmtNum(plotWidth)} ${dimUnit}`;

  const fields = (pairs: Array<[string, string, boolean?]>) => makeFields(pairs);
  const tags = (groups: Array<[string, string[]]>) => makeTagGroups(groups);

  /* ── Land Overview ── */
  const overview: DetailSection = {
    id: 'land-overview',
    title: 'Land Overview',
    icon: 'ri-landscape-line',
    fields: fields([
      ['Land Type', landTypeLabel(str(row.land_type))],
      ['Offer Type', resolveOffer(str(row.sub_type))],
      ['Primary Land Use', optionLabel(PRIMARY_LAND_USE_OPTIONS, str(row.primary_land_use))],
      ['Status', publicStatus(str(row.status))],
      ['Subdivision Potential', isTrue(row.subdivision_potential) ? 'Subdivision possible' : ''],
      ['Development Potential', str(row.development_potential)],
    ]),
    tagGroups: tags([
      ['Suitable For', arr(row.suitable_for)],
      [
        'Potential',
        [
          isTrue(row.residential_potential) ? 'Residential' : '',
          isTrue(row.commercial_potential) ? 'Commercial' : '',
          isTrue(row.agricultural_potential) ? 'Agricultural' : '',
          isTrue(row.jv_potential) || isTrue(row.jv_available) ? 'Joint Venture' : '',
        ].filter(Boolean),
      ],
    ]),
  };

  /* ── Size & Dimensions ── */
  const size: DetailSection = {
    id: 'land-size',
    title: 'Size & Dimensions',
    icon: 'ri-ruler-2-line',
    fields: fields([
      ['Land Size', sizeNum ? `${fmtNum(sizeNum)} ${unit}` : ''],
      ['Acreage', num(row.acreage) ? `${fmtNum(num(row.acreage) as number)} acres` : ''],
      ['Plot Dimensions', dimText],
      ['Plot Shape', str(row.plot_shape)],
    ]),
    tagGroups: tags([['Frontage', arr(row.road_frontage)]]),
  };

  /* ── Title & Tenure ── */
  const title: DetailSection = {
    id: 'land-title',
    title: 'Title & Tenure',
    icon: 'ri-file-shield-2-line',
    fields: fields([
      ['Tenure', optionLabel(TENURE_OPTIONS, str(row.tenure))],
      ['Land Classification', optionLabel(LAND_CLASSIFICATION_OPTIONS, str(row.land_classification))],
      ['Title Document', optionLabel(TITLE_DOC_OPTIONS, str(row.title_document))],
      ['Verification', optionLabel(VERIFICATION_STATUS_OPTIONS, str(row.verification_status))],
      ['Title Information', str(row.title_info)],
    ]),
  };

  /* ── Location ── */
  const location: DetailSection = {
    id: 'land-location',
    title: 'Location',
    icon: 'ri-map-pin-2-line',
    fields: fields([
      ['County', str(row.county)],
      ['Sub-County', str(row.sub_county)],
      ['Ward', str(row.ward)],
      ['Area', str(row.area)],
      ['Neighbourhood', str(row.neighbourhood)],
      ['Landmark', str(row.landmark)],
      ['Street', str(row.street)],
      ['City', str(row.city)],
      ['Country', str(row.country)],
      ['Address', str(row.address)],
    ]),
  };

  /* ── Infrastructure & Utilities ── */
  const infrastructure: DetailSection = {
    id: 'land-infrastructure',
    title: 'Infrastructure & Utilities',
    icon: 'ri-plug-line',
    fields: fields([
      ['Road Access', optionLabel(ROAD_ACCESS_OPTIONS, str(row.road_access))],
      ['Existing Structures', str(row.existing_structures)],
    ]),
    tagGroups: tags([
      ['Accessibility', arr(row.accessibility)],
      ['Water Supply', arr(row.water_supply)],
      ['Electricity', arr(row.electricity)],
      ['Sewerage', arr(row.sewerage)],
      ['Connectivity', arr(row.connectivity)],
    ]),
  };

  /* ── Planning & Zoning ── */
  const planning: DetailSection = {
    id: 'land-planning',
    title: 'Planning & Zoning',
    icon: 'ri-community-line',
    fields: fields([
      ['Zoning', str(row.zoning)],
      ['Permitted Use', str(row.permitted_use)],
    ]),
    tagGroups: tags([
      ['Secondary Potential Uses', arr(row.secondary_potential_uses)],
      ['Development Indicators', arr(row.development_indicators)],
    ]),
  };

  /* ── Land Characteristics ── */
  const characteristics: DetailSection = {
    id: 'land-characteristics',
    title: 'Land Characteristics',
    icon: 'ri-tree-line',
    fields: fields([
      ['Topography', str(row.topography)],
    ]),
    tagGroups: tags([
      ['Terrain', arr(row.terrain)],
      ['Environment', arr(row.land_environment)],
      ['Water Features', arr(row.water_features)],
    ]),
  };

  /* ── Pricing ── */
  const pricePerAcre = num(row.price_per_acre);
  const pricePerHectare = num(row.price_per_hectare);
  const pricePerSqm = num(row.price_per_sqm);
  const pricing: DetailSection = {
    id: 'land-pricing',
    title: 'Pricing',
    icon: 'ri-price-tag-3-line',
    fields: fields([
      ['Asking Price', priceOnRequest ? 'Price on request' : (askingPrice ? opts.formatMoney(askingPrice, currency) : ''), true],
      ['Price Basis', optionLabel(PRICE_BASIS_OPTIONS, str(row.price_basis))],
      ['Price Per Acre', pricePerAcre ? opts.formatMoney(pricePerAcre, currency) : ''],
      ['Price Per Hectare', pricePerHectare ? opts.formatMoney(pricePerHectare, currency) : ''],
      ['Price Per Sqm', pricePerSqm ? opts.formatMoney(pricePerSqm, currency) : ''],
      ['Price Status', priceOnRequest ? '' : optionLabel(PRICE_STATUS_OPTIONS, str(row.price_status))],
    ]),
  };

  /* ── Payment Terms ── */
  const payment: DetailSection = {
    id: 'land-payment',
    title: 'Payment Terms',
    icon: 'ri-bank-card-line',
    fields: fields([
      ['Deposit Required', str(row.deposit_required)],
      ['Installment Period', str(row.installment_period)],
      ['Installment Frequency', str(row.installment_frequency)],
      ['Balance Terms', str(row.balance_terms)],
      ['Interest', isTrue(row.interest_applies) ? 'Interest applies' : ''],
      ['Payment Notes', str(row.payment_notes)],
    ]),
    tagGroups: tags([['Accepted Payment Terms', arr(row.payment_terms)]]),
  };

  const sections = [overview, size, title, location, infrastructure, planning, characteristics, pricing, payment]
    .filter((s) => (s.fields && s.fields.length > 0) || (s.tagGroups && s.tagGroups.length > 0) || (s.paragraphs && s.paragraphs.length > 0));

  /* ── Hero stat strip ── */
  const heroStats: DetailField[] = fields([
    ['Size', sizeNum ? `${fmtNum(sizeNum)} ${unit}` : ''],
    ['Land Type', landTypeLabel(str(row.land_type))],
    ['Tenure', optionLabel(TENURE_OPTIONS, str(row.tenure))],
    ['Price', priceOnRequest ? 'On request' : (askingPrice ? opts.formatMoney(askingPrice, currency) : ''), true],
  ]);

  /* ── Sidebar quick facts ── */
  const quickFacts: DetailField[] = fields([
    ['Offer', resolveOffer(str(row.sub_type))],
    ['Land Type', landTypeLabel(str(row.land_type))],
    ['Size', sizeNum ? `${fmtNum(sizeNum)} ${unit}` : ''],
    ['Tenure', optionLabel(TENURE_OPTIONS, str(row.tenure))],
    ['Location', [str(row.area) || str(row.neighbourhood), str(row.county) || str(row.city)].filter(Boolean).join(', ') || str(row.location)],
  ]);

  return {
    headline: str(row.headline),
    summary: str(row.short_description),
    investmentOpportunity: str(row.investment_opportunity),
    heroStats,
    sections,
    quickFacts,
  };
}