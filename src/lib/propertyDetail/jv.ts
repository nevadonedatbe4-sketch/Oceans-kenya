/**
 * Joint Venture → public detail model.
 *
 * A JV opportunity is its OWN thing: the land is only the asset, while the deal
 * itself is defined by how it is structured, what each party contributes, and
 * what will actually be built. This maps a raw `jv_opportunities` record into
 * the shared PropertyDetailModel so the public page renders it through the SAME
 * unified spec table as every other property type - but with JV-native sections
 * (Commercial Structure, Contributions, Project Info) instead of a generic land
 * layout.
 *
 * Rule: a field is only surfaced when it actually carries a value, and only
 * PUBLIC-facing fields are ever shown (internal CRM notes, commission, owner
 * contacts and continuity data are never exposed here).
 */

import {
  DEAL_TYPE_LABELS,
  DEAL_STRUCTURE_LABELS,
  CONTRIBUTION_LABELS,
  CONSIDERATION_TYPE_LABELS,
  PROJECT_TYPE_LABELS,
  TIMELINE_LABELS,
  EXIT_EXPECTATION_LABELS,
  LAND_TENURE_LABELS,
  LAND_TITLE_STATUS_LABELS,
  LAND_PLOT_SHAPE_LABELS,
  LAND_SIZE_UNIT_LABELS,
  VALUATION_BASIS_OPTIONS,
  VALUATION_STATUS_OPTIONS,
  DEV_PAYMENT_TYPE_OPTIONS,
  formatMoney,
} from '@/pages/crm/jvOpportunityConstants';
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

const titleCase = (v: string): string =>
  v
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Resolve an enum value to its human label, falling back to a readable form. */
const optLabel = (map: Record<string, string>, value: string): string => {
  if (!value) return '';
  return map[value] || titleCase(value);
};

const optLabelFromList = (
  options: { value: string; label: string }[],
  value: string,
): string => {
  if (!value) return '';
  const found = options.find((o) => o.value === value && o.value !== '');
  return found ? found.label : titleCase(value);
};

function makeFields(pairs: Array<[string, string, boolean?]>): DetailField[] {
  return pairs
    .map(([label, value, emphasis]) => ({
      label,
      value: (value || '').trim(),
      emphasis: Boolean(emphasis),
    }))
    .filter((f) => f.value);
}

function makeTagGroups(groups: Array<[string, string[]]>): DetailTagGroup[] {
  return groups
    .map(([label, items]) => ({ label, items: items.filter(Boolean) }))
    .filter((g) => g.items.length > 0);
}

export interface JvModelOptions {
  /** Currency formatter supplied by the page (keeps JV in sync with the site). */
  formatMoney?: (amount: number, currency: string) => string;
}

export function buildJvModel(row: Row, opts: JvModelOptions = {}): PropertyDetailModel {
  const money = (amount: unknown, currency: unknown): string => {
    const n = num(amount);
    if (!n) return '';
    const cur = str(currency) || 'USD';
    return opts.formatMoney ? opts.formatMoney(n, cur) : formatMoney(n, cur);
  };

  const fields = (pairs: Array<[string, string, boolean?]>) => makeFields(pairs);
  const tags = (groups: Array<[string, string[]]>) => makeTagGroups(groups);

  const sizeValue = num(row.land_size_value);
  const sizeUnitRaw = str(row.land_size_unit);
  const sizeUnit = LAND_SIZE_UNIT_LABELS[sizeUnitRaw] || sizeUnitRaw || 'acres';
  const sizeText = str(row.land_size)
    || (sizeValue ? `${sizeValue.toLocaleString()} ${sizeUnit}` : '');

  const dimUnit = str(row.plot_dim_unit) || 'ft';
  const plotLength = num(row.plot_length);
  const plotWidth = num(row.plot_width);
  let dimText = '';
  if (plotLength && plotWidth) dimText = `${plotLength.toLocaleString()} × ${plotWidth.toLocaleString()} ${dimUnit}`;
  else if (plotLength) dimText = `${plotLength.toLocaleString()} ${dimUnit}`;
  else if (plotWidth) dimText = `${plotWidth.toLocaleString()} ${dimUnit}`;

  const locationText = [str(row.land_area) || str(row.land_location), str(row.land_county)]
    .filter(Boolean)
    .join(', ');

  const priceRequest = isChecked(row.price_on_request);
  const priceText = priceRequest
    ? 'Price on request'
    : money(row.price, row.price_currency);

  const dealType = optLabel(DEAL_TYPE_LABELS, str(row.deal_type));
  const projectType = optLabel(PROJECT_TYPE_LABELS, str(row.project_type));
  const tenure = optLabel(LAND_TENURE_LABELS, str(row.land_tenure));

  /* ── Deal Overview ── */
  const overview: DetailSection = {
    id: 'jv-overview',
    title: 'Deal Overview',
    icon: 'ri-group-line',
    fields: fields([
      ['Deal Type', dealType],
      ['Deal Structure', optLabel(DEAL_STRUCTURE_LABELS, str(row.deal_structure))],
      ['Contribution', optLabel(CONTRIBUTION_LABELS, str(row.contribution))],
      ['Contribution Type', optLabel(CONTRIBUTION_LABELS, str(row.contribution_type))],
      ['Exit Expectation', optLabel(EXIT_EXPECTATION_LABELS, str(row.exit_expectation))],
      ['Expected ROI', num(row.expected_roi) ? `${num(row.expected_roi)}%` : ''],
      ['Revenue Share', num(row.revenue_share) ? `${num(row.revenue_share)}%` : ''],
    ]),
  };

  /* ── Commercial Structure ── */
  const commercial: DetailSection = {
    id: 'jv-commercial',
    title: 'Commercial Structure',
    icon: 'ri-scales-3-line',
    fields: fields([
      ['Land Value', money(row.land_value, row.land_value_currency)],
      ['Valuation Basis', optLabelFromList(VALUATION_BASIS_OPTIONS, str(row.valuation_basis))],
      ['Valuation Status', optLabelFromList(VALUATION_STATUS_OPTIONS, str(row.valuation_status))],
      ['Developer Consideration', optLabel(CONSIDERATION_TYPE_LABELS, str(row.consideration_type))],
      ['Cash Consideration', money(row.consideration_cash, row.deal_currency || row.land_value_currency)],
      ['Consideration Notes', str(row.developer_consideration_other)],
    ]),
  };

  /* ── Contributions & Allocation ── */
  const contributions: DetailSection = {
    id: 'jv-contributions',
    title: 'Contributions & Allocation',
    icon: 'ri-exchange-funds-line',
    fields: fields([
      ['Capital Required', money(row.capital_amount, row.deal_currency) || str(row.capital_required)],
      ['Deal Currency', str(row.deal_currency)],
      ['Local Currency', str(row.local_currency)],
      ['Total Planned Units', num(row.total_planned_units) ? String(num(row.total_planned_units)) : ''],
      ['Landowner Units', unitsRange(num(row.landowner_units_min), num(row.landowner_units_max))],
      ['Landowner Share', num(row.landowner_percent) ? `${num(row.landowner_percent)}%` : ''],
      ['Developer Units', str(row.developer_units)],
    ]),
    paragraphs: [
      { label: 'Allocation', text: str(row.landowner_allocation_summary) },
      { label: 'Currency Note', text: str(row.currency_conversion_note) },
    ].filter((p) => p.text),
  };

  /* ── Project Info ── */
  const project: DetailSection = {
    id: 'jv-project',
    title: 'Project Info',
    icon: 'ri-building-4-line',
    fields: fields([
      ['Project Type', projectType],
      ['Estimated Scale', str(row.estimated_scale)],
      ['Timeline', optLabel(TIMELINE_LABELS, str(row.timeline))],
    ]),
  };

  /* ── Development-Period Terms ── */
  const devPayment: DetailSection = {
    id: 'jv-dev-payment',
    title: 'Development-Period Terms',
    icon: 'ri-calendar-check-line',
    fields: fields([
      ['Payment Type', optLabelFromList(DEV_PAYMENT_TYPE_OPTIONS, str(row.dev_payment_type))],
      ['Amount', money(row.dev_payment_amount, row.dev_payment_currency)],
      ['Frequency', str(row.dev_payment_frequency)],
      ['Duration', str(row.dev_payment_duration)],
      ['Starts', str(row.dev_payment_start)],
      ['Paid By', str(row.dev_payment_responsible)],
      ['Paid To', str(row.dev_payment_recipient)],
    ]),
    paragraphs: [{ label: 'Notes', text: str(row.dev_payment_notes) }].filter((p) => p.text),
  };

  /* ── Land & Location ── */
  const land: DetailSection = {
    id: 'jv-land',
    title: 'Land & Location',
    icon: 'ri-landscape-line',
    fields: fields([
      ['Land Size', sizeText],
      ['Tenure', tenure],
      ['Title Status', optLabel(LAND_TITLE_STATUS_LABELS, str(row.land_title_status))],
      ['Classification', titleCase(str(row.land_classification))],
      ['Plot Dimensions', dimText],
      ['Plot Shape', optLabel(LAND_PLOT_SHAPE_LABELS, str(row.plot_shape))],
      ['Location', str(row.land_location)],
      ['Area', str(row.land_area)],
      ['County', str(row.land_county)],
      ['Road Access', str(row.land_road_access)],
      ['Zoning', str(row.land_zoning)],
      ['Primary Land Use', titleCase(str(row.land_primary_use))],
    ]),
    tagGroups: tags([
      ['Suitable For', arr(row.land_suitable_for)],
      ['Secondary Uses', arr(row.land_secondary_uses)],
      ['Development Potential', arr(row.land_development_potential)],
      ['Water', arr(row.land_water)],
      ['Electricity', arr(row.land_electricity)],
      ['Amenities', arr(row.amenities)],
    ]),
    paragraphs: [{ label: 'Development Notes', text: str(row.land_development_description) }]
      .filter((p) => p.text),
  };

  /* ── Pricing & Payment Terms ── */
  const pricing: DetailSection = {
    id: 'jv-pricing',
    title: 'Pricing & Payment Terms',
    icon: 'ri-price-tag-3-line',
    fields: fields([
      ['Price', priceText, true],
      ['Price Basis', titleCase(str(row.price_basis))],
    ]),
    tagGroups: tags([['Payment Terms', arr(row.payment_terms)]]),
  };

  const sections = [overview, commercial, contributions, project, devPayment, land, pricing].filter(
    (s) =>
      (s.fields && s.fields.length > 0)
      || (s.tagGroups && s.tagGroups.length > 0)
      || (s.paragraphs && s.paragraphs.length > 0),
  );

  /* ── Hero stat strip ── */
  const heroStats: DetailField[] = fields([
    ['Land Size', sizeText],
    ['Deal', dealType],
    ['Project', projectType],
    ['Price', priceRequest ? 'On request' : priceText, true],
  ]);

  /* ── Sidebar quick facts ── */
  const quickFacts: DetailField[] = fields([
    ['Deal Type', dealType],
    ['Structure', optLabel(DEAL_STRUCTURE_LABELS, str(row.deal_structure))],
    ['Land Size', sizeText],
    ['Tenure', tenure],
    ['Location', locationText],
  ]);

  return {
    headline: '',
    summary: str(row.public_summary) || str(row.manual_land_description),
    investmentOpportunity: str(row.partnership_requirements),
    heroStats,
    sections,
    quickFacts,
  };
}

function isChecked(v: unknown): boolean {
  return v === true || v === 'true';
}

function unitsRange(min: number | null, max: number | null): string {
  if (min && max && min !== max) return `${min} - ${max}`;
  if (min || max) return String(min || max);
  return '';
}