/* Shared type for the comprehensive JV Land Listing form. */
import type { JvImageDraft } from '@/pages/crm/components/JVImageManager';
import type { CoListingAgent } from '@/pages/crm/components/coListingAgents';

export interface JVFormState {
  /* ── Overview & publishing ── */
  title: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  status: string;
  is_published: boolean;
  is_featured: boolean;
  is_public_listing: boolean;
  scheduled_at: string;
  public_summary: string;
  seo_title: string;
  seo_description: string;

  /* ── Media & amenities (JvImageDraft holds the full list, order & cover) ── */
  images: JvImageDraft[];
  amenities: string[];

  /* ── Land reference ── */
  land_listing_id: string;
  manual_land_description: string;
  land_record_mode: string;
  land_location: string;
  land_county: string;
  land_area: string;
  land_size: string;
  land_size_value: string;
  land_size_unit: string;
  land_tenure: string;
  land_classification: string;
  plot_length: string;
  plot_width: string;
  plot_dim_unit: string;
  plot_shape: string;
  land_title_status: string;
  land_road_access: string;
  land_water: string[];
  land_electricity: string[];

  /* ── Pricing & payment terms (a JV does not have to be price-free) ── */
  price: string;
  price_currency: string;
  price_basis: string;
  price_on_request: boolean;
  payment_terms: string[];

  /* ── Land Use & Development Potential (section 7) ── */
  land_primary_use: string;
  land_zoning: string;
  land_secondary_uses: string[];
  land_suitable_for: string[];
  land_development_potential: string[];
  land_development_characteristics: string[];
  land_development_description: string;

  /* ── Owner details ── */
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  source: string;

  /* ── Deal structure & contribution ── */
  deal_type: string;
  deal_structure: string;
  contribution: string;
  contribution_type: string;
  land_value: string;
  land_value_currency: string;
  valuation_basis: string;
  valuation_date: string;
  valuation_status: string;
  valuation_source: string;

  /* ── Capital / consideration ── */
  consideration_type: string;
  consideration_cash: string;
  developer_consideration_other: string;
  total_planned_units: string;
  landowner_units_min: string;
  landowner_units_max: string;
  landowner_percent: string;
  developer_units: string;
  landowner_allocation_summary: string;
  capital_amount: string;
  deal_currency: string;
  local_currency: string;
  currency_conversion_note: string;
  expected_roi: string;
  revenue_share: string;
  exit_expectation: string;

  /* ── Development intent & timeline ── */
  project_type: string;
  estimated_scale: string;
  partnership_requirements: string;
  timeline: string;

  /* ── Development-period payments ── */
  dev_payment_type: string;
  dev_payment_amount: string;
  dev_payment_currency: string;
  dev_payment_frequency: string;
  dev_payment_duration: string;
  dev_payment_start: string;
  dev_payment_notes: string;
  dev_payment_recipient: string;
  dev_payment_responsible: string;

  /* ── Agent commission ── */
  commission_structure: string;
  commission_basis: string;
  commission_payer: string;
  commission_percent: string;
  commission_amount: string;
  commission_currency: string;
  commission_payment_timing: string;
  commission_payment_trigger: string;
  commission_notes: string;
  commission_internal: boolean;

  /* ── Continuity & source ── */
  continuity_type: string;
  previous_reference: string;
  previous_crm_record: string;
  previous_agent: string;
  relationship_owner: string;
  continuity_notes: string;
  source_detail_name: string;
  source_contact: string;
  source_company: string;
  source_relationship: string;
  referral_details: string;
  source_notes: string;
  /* Other agents who also posted this opportunity */
  co_listing_agents: CoListingAgent[];

  /* Assigned agents who handle inquiries for this opportunity */
  agent_ids: string[];

  /* ── Internal CRM ── */
  internal_notes: string;
  internal_valuation_note: string;
}

export interface LandOption {
  id: string;
  title: string;
  location: string | null;
  state_region: string | null;
}

export function emptyJVForm(): JVFormState {
  return {
    title: '', slug: '', slugTouched: false, description: '', status: 'draft',
    is_published: false, is_featured: false, is_public_listing: false, scheduled_at: '', public_summary: '',
    seo_title: '', seo_description: '',
    images: [], amenities: [],
    land_listing_id: '', manual_land_description: '', land_location: '', land_county: '',
    land_area: '', land_size: '', land_title_status: '', land_road_access: '',
    land_water: [], land_electricity: [],
    land_record_mode: 'manual',
    land_size_value: '', land_size_unit: 'acres',
    land_tenure: '', land_classification: '',
    plot_length: '', plot_width: '', plot_dim_unit: 'ft', plot_shape: '',
    price: '', price_currency: '', price_basis: '', price_on_request: false, payment_terms: [],
    land_primary_use: '', land_zoning: '', land_secondary_uses: [], land_suitable_for: [],
    land_development_potential: [], land_development_characteristics: [], land_development_description: '',
    owner_name: '', owner_phone: '', owner_email: '', source: '',
    deal_type: '', deal_structure: '', contribution: '', contribution_type: '',
    land_value: '', land_value_currency: '', valuation_basis: '', valuation_date: '',
    valuation_status: '', valuation_source: '',
    consideration_type: '', consideration_cash: '', developer_consideration_other: '',
    total_planned_units: '', landowner_units_min: '', landowner_units_max: '', landowner_percent: '',
    developer_units: '', landowner_allocation_summary: '', capital_amount: '',
    deal_currency: '', local_currency: '', currency_conversion_note: '', expected_roi: '',
    revenue_share: '', exit_expectation: '',
    project_type: '', estimated_scale: '', partnership_requirements: '', timeline: '',
    dev_payment_type: '', dev_payment_amount: '', dev_payment_currency: '', dev_payment_frequency: '',
    dev_payment_duration: '', dev_payment_start: '', dev_payment_notes: '', dev_payment_recipient: '',
    dev_payment_responsible: '',
    commission_structure: '', commission_basis: '', commission_payer: '', commission_percent: '',
    commission_amount: '', commission_currency: '', commission_payment_timing: '',
    commission_payment_trigger: '', commission_notes: '', commission_internal: true,
    continuity_type: '', previous_reference: '', previous_crm_record: '', previous_agent: '',
    relationship_owner: '', continuity_notes: '', source_detail_name: '', source_contact: '',
    source_company: '', source_relationship: '', referral_details: '', source_notes: '',
    co_listing_agents: [],
    agent_ids: [],
    internal_notes: '', internal_valuation_note: '',
  };
}