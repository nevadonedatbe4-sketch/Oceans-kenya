import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { addToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import {
  slugifyJv, formatMoney, CURRENCY_SYMBOLS,
  parseJvStatus, JV_STATUS_LABELS, JV_STATUS_COLORS,
} from '@/pages/crm/jvOpportunityConstants';
import { emptyJVForm, type JVFormState, type LandOption } from '@/pages/crm/components/JVForm/types';
import { parseCoListingAgents, toCoListingAgentsPayload } from '@/pages/crm/components/coListingAgents';
import type { JvImageDraft } from '@/pages/crm/components/JVImageManager';
import { btnPrimary, btnSecondary, btnGhost } from '@/pages/crm/components/JVForm/ui';
import JVOverviewStep from '@/pages/crm/components/JVForm/JVOverviewStep';
import JVLandStep from '@/pages/crm/components/JVForm/JVLandStep';
import JVMediaStep from '@/pages/crm/components/JVForm/JVMediaStep';
import JVStructureStep from '@/pages/crm/components/JVForm/JVStructureStep';
import JVDealTermsStep from '@/pages/crm/components/JVForm/JVDealTermsStep';
import JVDeskCrmSteps from '@/pages/crm/components/JVForm/JVDeskCrmSteps';
import JVContinuityStep from '@/pages/crm/components/JVForm/JVContinuityStep';
import AgentAssignmentPanel from '@/pages/crm/components/AgentAssignmentPanel';

function toNum(v: string): number | null {
  const n = Number(v);
  return v && !Number.isNaN(n) ? n : null;
}
function toArr(v: string[] | null): string[] | null {
  return v && v.length > 0 ? v : null;
}
function toText(v: string | null | undefined): string | null {
  const s = (v || '').trim();
  return s ? s : null;
}
/* datetime-local <-> ISO helpers so the schedule field round-trips cleanly. */
function toLocalInput(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatScheduleLabel(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* Supabase/PostgREST errors are sometimes plain objects rather than Error
   instances, so pull the most useful text out of whichever shape we get.
   Without this the real reason gets hidden behind a generic message. */
function describeDbError(err: unknown): string {
  if (!err) return 'Failed to save JV land listing';
  if (err instanceof Error && err.message) return err.message;
  const e = err as { message?: string; details?: string; hint?: string; code?: string };
  const parts = [e.message, e.details, e.hint].filter(Boolean) as string[];
  if (parts.length) return parts.join(' — ');
  if (e.code) return `Database error (${e.code})`;
  return 'Failed to save JV land listing';
}

/* When Postgres/PostgREST reports a column that doesn't exist in the table,
   return its name so the caller can drop it and retry instead of failing. */
function missingColumnFromError(err: unknown): string | null {
  const e = err as { message?: string; details?: string };
  const text = `${e?.message || ''} ${e?.details || ''}`;
  const match = text.match(/Could not find the '([^']+)' column/i)
    || text.match(/column ["']?([A-Za-z0-9_]+)["']? does not exist/i);
  return match ? match[1] : null;
}

/* When a UNIQUE constraint is hit (e.g. two draft listings sharing the same
   blank/duplicate slug) the save would otherwise fail outright. Return the
   constraint name so the caller can regenerate the offending value and retry. */
function duplicateConstraintFromError(err: unknown): string | null {
  const e = err as { code?: string; message?: string; details?: string };
  const text = `${e?.message || ''} ${e?.details || ''}`;
  const isDuplicate = e?.code === '23505' || /duplicate key value/i.test(text);
  if (!isDuplicate) return null;
  const match = text.match(/unique constraint "([^"]+)"/i);
  return match ? match[1] : 'unique';
}

/* Small suffix that keeps a generated slug unique without changing readable URLs
   much — matches the pattern already used when converting JV submissions. */
function shortSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/* jv_opportunities.owner_id is foreign-keyed to profiles.id, but the signed-in
   user is identified by their auth id, which lives in profiles.user_id. Handing
   the raw auth id straight to owner_id fails the FK whenever the two differ, so
   resolve the real profile primary key first (and return null when there is no
   matching profile, so the listing can still be saved without an owner). */
async function resolveOwnerId(authUserId: string | null | undefined): Promise<string | null> {
  if (!authUserId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUserId)
      .maybeSingle();
    if (!error && data) {
      const id = (data as { id?: string }).id;
      if (id) return id;
    }
  } catch {
    /* fall through — treat as no owner rather than blocking the save */
  }
  return null;
}

/* True when the database rejected the write specifically because owner_id points
   at a profiles row that does not exist (FK violation, code 23503). */
function isOwnerFkError(err: unknown): boolean {
  const e = err as { code?: string; message?: string; details?: string; constraint?: string };
  if (e?.code !== '23503') return false;
  const text = `${e?.message || ''} ${e?.details || ''} ${e?.constraint || ''}`.toLowerCase();
  return text.includes('owner') || text.includes('profiles');
}

export default function JVOpportunityEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { user } = useAuth();

  const [form, setForm] = useState<JVFormState>(() => emptyJVForm());
  const [landOptions, setLandOptions] = useState<LandOption[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [savingIntent, setSavingIntent] = useState<'draft' | 'publish' | null>(null);
  const [error, setError] = useState('');
  const [fetchingLand, setFetchingLand] = useState(false);
  const [inheritedFields, setInheritedFields] = useState<Set<string>>(() => new Set());
  const [publishedInfo, setPublishedInfo] = useState<{ title: string; id: string | null; slug: string } | null>(null);
  const [agents, setAgents] = useState<{ id: string; name: string; title?: string | null }[]>([]);
  // Refs that make saving fast and safe:
  // - savingRef blocks a double-click before React re-renders the disabled buttons.
  // - droppedColumnsRef remembers columns the live table lacks so repeat saves go
  //   out as one request instead of re-discovering them on every single save.
  // - knownColumnsRef caches the table's real columns from one cheap probe.
  // - ownerIdRef memoises the resolved profiles.id used for the owner_id FK.
  const savingRef = useRef(false);
  const droppedColumnsRef = useRef<Set<string>>(new Set());
  const knownColumnsRef = useRef<Set<string> | null>(null);
  const ownerIdRef = useRef<string | null | undefined>(undefined);

  const update = (p: Partial<JVFormState>) => setForm((prev) => ({ ...prev, ...p }));

  // Load assignable agents for the Agent Assignment panel.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('agents').select('id, name, title').order('name');
      if (!cancelled) setAgents((data || []) as { id: string; name: string; title?: string | null }[]);
    })();
    return () => { cancelled = true; };
  }, []);

  // Load optional existing land listings for the link picker.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from('land_listings')
        .select('id, title, location, state_region')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!cancelled && !err) setLandOptions((data || []) as LandOption[]);
    })();
    return () => { cancelled = true; };
  }, []);

  // Load existing record when editing.
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('jv_opportunities')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (err || !data) {
        if (!cancelled) addToast('Failed to load JV land listing', 'error');
        setLoading(false);
        return;
      }
      const s = emptyJVForm();
      const d = data as Record<string, unknown>;
      const str = (k: string) => String(d[k] ?? '');
      const arr = (k: string) => Array.isArray(d[k]) ? (d[k] as string[]) : [];
      const parsed = parseJvStatus(str('status'));
      setForm({
        ...s,
        title: str('title'),
        slug: str('slug'),
        slugTouched: true,
        description: str('description'),
        status: parsed.status || 'draft',
        scheduled_at: parsed.scheduledAt ? toLocalInput(parsed.scheduledAt) : '',
        is_published: Boolean(d.is_published),
        is_featured: Boolean(d.is_featured),
        is_public_listing: Boolean(d.is_public_listing),
        public_summary: str('public_summary'),
        seo_title: str('seo_title'),
        seo_description: str('seo_description'),
        images: (Array.isArray(d.images) ? (d.images as unknown[]) : [])
          .map((it, idx) => ({
            url: typeof it === 'string' ? it : ((it as { url?: string })?.url || ''),
            alt: '',
            sortOrder: idx + 1,
            isCover: idx === 0,
          }))
          .filter((i) => i.url),
        amenities: arr('amenities'),
        land_listing_id: str('land_listing_id'),
        manual_land_description: str('manual_land_description'),
        land_record_mode: str('land_record_mode') || 'manual',
        land_location: str('land_location'),
        land_county: str('land_county'),
        land_area: str('land_area'),
        land_size: str('land_size'),
        land_size_value: d.land_size_value != null ? String(d.land_size_value) : '',
        land_size_unit: str('land_size_unit') || 'acres',
        land_tenure: str('land_tenure'),
        land_classification: str('land_classification'),
        plot_length: d.plot_length != null ? String(d.plot_length) : '',
        plot_width: d.plot_width != null ? String(d.plot_width) : '',
        plot_dim_unit: str('plot_dim_unit') || 'ft',
        plot_shape: str('plot_shape'),
        land_title_status: str('land_title_status'),
        land_road_access: str('land_road_access'),
        land_water: arr('land_water'),
        land_electricity: arr('land_electricity'),
        price: d.price != null ? String(d.price) : '',
        price_currency: str('price_currency'),
        price_basis: str('price_basis'),
        price_on_request: Boolean(d.price_on_request),
        payment_terms: arr('payment_terms'),
        land_primary_use: str('land_primary_use'),
        land_zoning: str('land_zoning'),
        land_secondary_uses: arr('land_secondary_uses'),
        land_suitable_for: arr('land_suitable_for'),
        land_development_potential: arr('land_development_potential'),
        land_development_characteristics: arr('land_development_characteristics'),
        land_development_description: str('land_development_description'),
        owner_name: str('owner_name'),
        owner_phone: str('owner_phone'),
        owner_email: str('owner_email'),
        source: str('source'),
        deal_type: str('deal_type'),
        deal_structure: str('deal_structure'),
        contribution: str('contribution'),
        contribution_type: str('contribution_type'),
        land_value: d.land_value != null ? String(d.land_value) : '',
        land_value_currency: str('land_value_currency'),
        valuation_basis: str('valuation_basis'),
        valuation_date: str('valuation_date'),
        valuation_status: str('valuation_status'),
        valuation_source: str('valuation_source'),
        consideration_type: str('consideration_type'),
        consideration_cash: d.consideration_cash != null ? String(d.consideration_cash) : '',
        developer_consideration_other: str('developer_consideration_other'),
        total_planned_units: d.total_planned_units != null ? String(d.total_planned_units) : '',
        landowner_units_min: d.landowner_units_min != null ? String(d.landowner_units_min) : '',
        landowner_units_max: d.landowner_units_max != null ? String(d.landowner_units_max) : '',
        landowner_percent: d.landowner_percent != null ? String(d.landowner_percent) : '',
        developer_units: str('developer_units'),
        landowner_allocation_summary: str('landowner_allocation_summary'),
        capital_amount: d.capital_amount != null ? String(d.capital_amount) : '',
        deal_currency: str('deal_currency'),
        local_currency: str('local_currency'),
        currency_conversion_note: str('currency_conversion_note'),
        expected_roi: d.expected_roi != null ? String(d.expected_roi) : '',
        revenue_share: d.revenue_share != null ? String(d.revenue_share) : '',
        exit_expectation: str('exit_expectation'),
        project_type: str('project_type'),
        estimated_scale: str('estimated_scale'),
        partnership_requirements: str('partnership_requirements'),
        timeline: str('timeline'),
        dev_payment_type: str('dev_payment_type'),
        dev_payment_amount: d.dev_payment_amount != null ? String(d.dev_payment_amount) : '',
        dev_payment_currency: str('dev_payment_currency'),
        dev_payment_frequency: str('dev_payment_frequency'),
        dev_payment_duration: str('dev_payment_duration'),
        dev_payment_start: str('dev_payment_start'),
        dev_payment_notes: str('dev_payment_notes'),
        dev_payment_recipient: str('dev_payment_recipient'),
        dev_payment_responsible: str('dev_payment_responsible'),
        commission_structure: str('commission_structure'),
        commission_basis: str('commission_basis'),
        commission_payer: str('commission_payer'),
        commission_percent: d.commission_percent != null ? String(d.commission_percent) : '',
        commission_amount: d.commission_amount != null ? String(d.commission_amount) : '',
        commission_currency: str('commission_currency'),
        commission_payment_timing: str('commission_payment_timing'),
        commission_payment_trigger: str('commission_payment_trigger'),
        commission_notes: str('commission_notes'),
        commission_internal: d.commission_internal !== false,
        continuity_type: str('continuity_type'),
        previous_reference: str('previous_reference'),
        previous_crm_record: str('previous_crm_record'),
        previous_agent: str('previous_agent'),
        relationship_owner: str('relationship_owner'),
        continuity_notes: str('continuity_notes'),
        source_detail_name: str('source_detail_name'),
        source_contact: str('source_contact'),
        source_company: str('source_company'),
        source_relationship: str('source_relationship'),
        referral_details: str('referral_details'),
        source_notes: str('source_notes'),
        co_listing_agents: parseCoListingAgents(d.co_listing_agents),
        agent_ids: Array.isArray(d.agent_ids) ? (d.agent_ids as string[]) : [],
        internal_notes: str('internal_notes'),
        internal_valuation_note: str('internal_valuation_note'),
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  /* The slug is always derived from the title — the user never edits it, so
     keep it in sync on every title change instead of exposing a form field. */
  const handleTitleChange = (v: string) => {
    setForm((prev) => ({ ...prev, title: v, slug: slugifyJv(v) }));
  };

  /* Selecting a linked land record pulls that record's details into the form.
     Only land-related fields are populated — anything the user already typed in
     the JV-specific sections is left untouched. The land record is only ever
     READ here, so saving/publishing a JV listing can never overwrite it.
     Every prefilled key is recorded in `inheritedFields` so the form can show a
     "From land listing" badge and keep inherited vs JV-specific data distinct. */
  const handleLinkLand = async (landId: string) => {
    update({ land_listing_id: landId });
    if (!landId) {
      setInheritedFields(new Set());
      return;
    }

    setFetchingLand(true);
    try {
      const { data, error: err } = await supabase
        .from('land_listings')
        .select('*')
        .eq('id', landId)
        .maybeSingle();

      if (err || !data) {
        addToast('Could not load the linked land record', 'error');
        return;
      }

      const d = data as Record<string, unknown>;
      const str = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : '');
      const numStr = (k: string) => (d[k] != null ? String(d[k]) : '');
      const arr = (k: string) => (Array.isArray(d[k]) ? (d[k] as unknown[]).filter((x): x is string => typeof x === 'string') : []);

      const sizeUnit = str('land_size_unit') || 'acres';
      const sizeValue = numStr('land_size') || numStr('acreage');
      const inherited = new Set<string>();
      const patch: Partial<JVFormState> = {};

      // Title / summary / SEO — only fill when the agent has not written their own.
      if (!form.title.trim() && str('title')) {
        patch.title = str('title');
        patch.slug = slugifyJv(str('title'));
        inherited.add('title');
      }
      if (!form.description.trim() && (str('description') || str('short_description'))) {
        patch.description = str('description') || str('short_description');
        inherited.add('description');
      }
      if (!form.public_summary.trim() && (str('headline') || str('short_description'))) {
        patch.public_summary = str('headline') || str('short_description');
        inherited.add('public_summary');
      }
      if (!form.seo_title.trim() && str('seo_title')) {
        patch.seo_title = str('seo_title');
        inherited.add('seo_title');
      }
      if (!form.seo_description.trim() && str('seo_description')) {
        patch.seo_description = str('seo_description');
        inherited.add('seo_description');
      }

      // Land & location — the linked record is the source of truth here.
      patch.land_location = str('location') || [str('area'), str('county')].filter(Boolean).join(', ');
      patch.land_county = str('county') || str('state_region');
      patch.land_area = str('area') || str('neighbourhood');
      patch.land_size_value = sizeValue;
      patch.land_size_unit = sizeUnit;
      patch.land_size = sizeValue ? `${sizeValue} ${sizeUnit}` : '';
      patch.land_tenure = str('tenure');
      patch.land_classification = str('land_classification');
      patch.plot_length = numStr('plot_length');
      patch.plot_width = numStr('plot_width');
      patch.plot_dim_unit = str('plot_dim_unit') || 'ft';
      patch.plot_shape = str('plot_shape');
      const tenureForTitle = str('tenure');
      if (tenureForTitle === 'freehold' || tenureForTitle === 'leasehold') patch.land_title_status = tenureForTitle;
      patch.land_road_access = str('road_access');
      patch.land_water = arr('water_supply');
      patch.land_electricity = arr('electricity');
      patch.land_primary_use = str('primary_land_use');
      patch.land_zoning = str('zoning') || str('permitted_use');
      patch.land_secondary_uses = arr('secondary_potential_uses');
      patch.land_suitable_for = arr('suitable_for');
      patch.land_development_potential = arr('development_indicators');
      patch.land_development_description = str('development_potential') || str('investment_opportunity');
      [
        'land_location', 'land_county', 'land_area', 'land_size_value', 'land_size_unit', 'land_size',
        'land_tenure', 'land_classification', 'plot_length', 'plot_width', 'plot_dim_unit', 'plot_shape',
        'land_title_status', 'land_road_access', 'land_water', 'land_electricity', 'land_primary_use',
        'land_zoning', 'land_secondary_uses', 'land_suitable_for', 'land_development_potential',
        'land_development_description',
      ].forEach((k) => inherited.add(k));

      // Ownership & source (private CRM) — carried over where available.
      patch.owner_name = str('owner_name');
      patch.owner_phone = str('owner_phone');
      patch.owner_email = str('owner_email');
      patch.source = str('source') || 'database';
      ['owner_name', 'owner_phone', 'owner_email', 'source'].forEach((k) => inherited.add(k));

      // Pricing & payment terms applicable to the deal.
      if (numStr('asking_price')) {
        patch.price = numStr('asking_price');
        inherited.add('price');
      }
      patch.price_currency = str('currency');
      patch.price_basis = str('price_basis');
      patch.price_on_request = str('price_status') === 'on_request';
      patch.payment_terms = arr('payment_terms');
      ['price_currency', 'price_basis', 'price_on_request', 'payment_terms'].forEach((k) => inherited.add(k));

      // Media — photos and on-site amenities inherit from the land record.
      const landImages = arr('images');
      patch.images = landImages.map((url, idx) => ({ url, alt: '', sortOrder: idx + 1, isCover: idx === 0 })) as JvImageDraft[];
      patch.amenities = Array.from(new Set([
        ...arr('water_supply'), ...arr('electricity'), ...arr('sewerage'),
        ...arr('connectivity'), ...arr('road_frontage'), ...arr('accessibility'),
        ...arr('water_features'),
      ]));
      if (landImages.length > 0) inherited.add('images');
      if (patch.amenities.length > 0) inherited.add('amenities');

      // Attaching a land listing to a JV opportunity means the deal is a Joint
      // Venture, so set it automatically — the agent can still change it.
      patch.deal_type = 'jv';
      inherited.add('deal_type');

      update(patch);
      setInheritedFields(inherited);
      addToast('Land details pulled from the linked record', 'success');
    } catch (err) {
      addToast(describeDbError(err), 'error');
    } finally {
      setFetchingLand(false);
    }
  };

  const buildPayload = () => {
    const f = form;
    return {
      title: toText(f.title) || 'Untitled JV Land Listing',
      slug: slugifyJv(f.title) || `jv-land-${shortSuffix()}`,
      description: toText(f.description),
      status: f.status || 'new',
      is_published: f.is_published,
      is_featured: f.is_featured,
      is_public_listing: f.is_public_listing,
      public_summary: toText(f.public_summary),
      seo_title: toText(f.seo_title),
      seo_description: toText(f.seo_description),
      images: f.images.map((i) => i.url),
      main_image: f.images[0]?.url || null,
      amenities: toArr(f.amenities),
      land_listing_id: f.land_listing_id || null,
      manual_land_description: toText(f.manual_land_description),
      land_record_mode: f.land_record_mode || 'manual',
      land_location: toText(f.land_location),
      land_county: toText(f.land_county),
      land_area: toText(f.land_area),
      land_size: toText(f.land_size),
      land_size_value: toNum(f.land_size_value),
      land_size_unit: f.land_size_unit || 'acres',
      land_tenure: toText(f.land_tenure),
      land_classification: toText(f.land_classification),
      plot_length: toNum(f.plot_length),
      plot_width: toNum(f.plot_width),
      plot_dim_unit: f.plot_dim_unit || 'ft',
      plot_shape: toText(f.plot_shape),
      land_title_status: toText(f.land_title_status),
      land_road_access: toText(f.land_road_access),
      land_water: toArr(f.land_water),
      land_electricity: toArr(f.land_electricity),
      price: toNum(f.price),
      price_currency: toText(f.price_currency),
      price_basis: toText(f.price_basis),
      price_on_request: f.price_on_request,
      payment_terms: toArr(f.payment_terms),
      land_primary_use: toText(f.land_primary_use),
      land_zoning: toText(f.land_zoning),
      land_secondary_uses: toArr(f.land_secondary_uses),
      land_suitable_for: toArr(f.land_suitable_for),
      land_development_potential: toArr(f.land_development_potential),
      land_development_characteristics: toArr(f.land_development_characteristics),
      land_development_description: toText(f.land_development_description),
      owner_name: toText(f.owner_name),
      owner_phone: toText(f.owner_phone),
      owner_email: toText(f.owner_email),
      source: toText(f.source),
      deal_type: toText(f.deal_type),
      deal_structure: toText(f.deal_structure),
      contribution: toText(f.contribution),
      contribution_type: toText(f.contribution_type),
      land_value: toNum(f.land_value),
      land_value_currency: toText(f.land_value_currency),
      valuation_basis: toText(f.valuation_basis),
      valuation_date: toText(f.valuation_date),
      valuation_status: toText(f.valuation_status),
      valuation_source: toText(f.valuation_source),
      consideration_type: toText(f.consideration_type),
      consideration_cash: toNum(f.consideration_cash),
      developer_consideration_other: toText(f.developer_consideration_other),
      total_planned_units: toNum(f.total_planned_units),
      landowner_units_min: toNum(f.landowner_units_min),
      landowner_units_max: toNum(f.landowner_units_max),
      landowner_percent: toNum(f.landowner_percent),
      developer_units: toText(f.developer_units),
      landowner_allocation_summary: toText(f.landowner_allocation_summary),
      capital_amount: toNum(f.capital_amount),
      deal_currency: toText(f.deal_currency),
      local_currency: toText(f.local_currency),
      currency_conversion_note: toText(f.currency_conversion_note),
      expected_roi: toNum(f.expected_roi),
      revenue_share: toNum(f.revenue_share),
      exit_expectation: toText(f.exit_expectation),
      project_type: toText(f.project_type),
      estimated_scale: toText(f.estimated_scale),
      partnership_requirements: toText(f.partnership_requirements),
      timeline: toText(f.timeline),
      dev_payment_type: toText(f.dev_payment_type),
      dev_payment_amount: toNum(f.dev_payment_amount),
      dev_payment_currency: toText(f.dev_payment_currency),
      dev_payment_frequency: toText(f.dev_payment_frequency),
      dev_payment_duration: toText(f.dev_payment_duration),
      dev_payment_start: toText(f.dev_payment_start),
      dev_payment_notes: toText(f.dev_payment_notes),
      dev_payment_recipient: toText(f.dev_payment_recipient),
      dev_payment_responsible: toText(f.dev_payment_responsible),
      commission_structure: toText(f.commission_structure),
      commission_basis: toText(f.commission_basis),
      commission_payer: toText(f.commission_payer),
      commission_percent: toNum(f.commission_percent),
      commission_amount: toNum(f.commission_amount),
      commission_currency: toText(f.commission_currency),
      commission_payment_timing: toText(f.commission_payment_timing),
      commission_payment_trigger: toText(f.commission_payment_trigger),
      commission_notes: toText(f.commission_notes),
      commission_internal: f.commission_internal,
      continuity_type: toText(f.continuity_type),
      previous_reference: toText(f.previous_reference),
      previous_crm_record: toText(f.previous_crm_record),
      previous_agent: toText(f.previous_agent),
      relationship_owner: toText(f.relationship_owner),
      continuity_notes: toText(f.continuity_notes),
      source_detail_name: toText(f.source_detail_name),
      source_contact: toText(f.source_contact),
      source_company: toText(f.source_company),
      source_relationship: toText(f.source_relationship),
      referral_details: toText(f.referral_details),
      source_notes: toText(f.source_notes),
      co_listing_agents: toCoListingAgentsPayload(f.co_listing_agents),
      agent_ids: f.agent_ids.length ? f.agent_ids : null,
      internal_notes: toText(f.internal_notes),
      internal_valuation_note: toText(f.internal_valuation_note),
      updated_at: new Date().toISOString(),
    };
  };

  const parsedStatus = parseJvStatus(form.status);
  const currentStatus = parsedStatus.status || 'draft';
  const currentStatusLabel = JV_STATUS_LABELS[currentStatus] || 'Draft';

  /* Required fields before a listing may go live. Drafts skip this entirely
     so an incomplete form can still be saved and completed later. */
  const validateForPublish = (): string[] => {
    const missing: string[] = [];
    if (!form.title.trim()) missing.push('a listing title');
    if (!form.land_listing_id && !form.land_location.trim() && !form.land_county.trim()) missing.push('the land location');
    if (!form.deal_type) missing.push('a deal type');
    return missing;
  };

  const handleSave = async (intent: 'draft' | 'publish') => {
    // Hard guard: a rapid double-click must never fire two saves/publishes.
    if (savingRef.current) return;
    setError('');

    if (intent !== 'draft') {
      const missing = validateForPublish();
      if (missing.length) {
        const msg = `Before publishing, add: ${missing.join(', ')}`;
        setError(msg);
        addToast(msg, 'error');
        return;
      }
    }

    savingRef.current = true;
    setSaving(true);
    setSavingIntent(intent);
    const payload = buildPayload();

    // A brand-new listing must always carry a non-empty slug so the database's
    // unique constraint can never silently reject the save.
    if (!payload.slug) {
      payload.slug = `jv-land-${shortSuffix()}`;
    }

    if (intent === 'draft') {
      payload.status = 'draft';
      payload.is_published = false;
      payload.is_public_listing = false;
    } else {
      payload.status = 'published';
      payload.is_published = true;
      payload.is_public_listing = true;
    }

    try {
      // Write the record. If the database is missing a column this form sends
      // (i.e. the live table lags behind the form), drop that column and retry
      // so the listing still saves instead of failing outright — then tell the
      // user exactly which field was skipped so the schema can catch up.
      // Resolve the profile key that owner_id actually references (profiles.id),
      // not the auth id — this is the root cause of the owner_id FK failure.
      // Memoised so repeat saves don't re-query profiles every time.
      let ownerId: string | null = null;
      if (!isEdit) {
        if (ownerIdRef.current === undefined) {
          ownerIdRef.current = await resolveOwnerId(user?.id);
        }
        ownerId = ownerIdRef.current ?? null;
      }
      let includeOwner = Boolean(ownerId);
      let ownerDropped = false;

      // Start from the columns we already know are missing so a repeat save is a
      // single request rather than one retry per missing column.
      const droppedColumns: string[] = Array.from(droppedColumnsRef.current);
      const working: Record<string, unknown> = { ...payload };
      for (const col of droppedColumnsRef.current) {
        delete working[col];
      }

      // One cheap probe to learn the table's real columns, then prune the payload
      // to what actually exists. This removes the slow trial-and-error retries on
      // the very first save too. Skipped forever after a successful probe.
      if (!knownColumnsRef.current) {
        try {
          const { data: probe, error: probeErr } = await supabase
            .from('jv_opportunities')
            .select('*')
            .limit(1);
          if (!probeErr && probe && probe.length > 0) {
            knownColumnsRef.current = new Set(Object.keys(probe[0] as Record<string, unknown>));
          }
        } catch {
          /* probe is best-effort only — fall back to the retry loop */
        }
      }
      if (knownColumnsRef.current) {
        for (const key of Object.keys(working)) {
          if (!knownColumnsRef.current.has(key)) {
            delete working[key];
            droppedColumns.push(key);
            droppedColumnsRef.current.add(key);
          }
        }
      }

      let saved = false;
      let savedRow: { id?: string; slug?: string } | null = null;
      let lastError: unknown = null;

      for (let attempt = 0; attempt < 50; attempt += 1) {
        const res = isEdit
          ? await supabase.from('jv_opportunities').update(working).eq('id', id).select('id, slug')
          : await supabase.from('jv_opportunities').insert({
              ...working,
              ...(includeOwner && ownerId ? { owner_id: ownerId } : {}),
              created_at: new Date().toISOString(),
            }).select('id, slug');

        if (!res.error) {
          saved = true;
          // Capture the real published row so the success card links to it.
          const firstRow = (res.data as { id?: string; slug?: string }[] | null)?.[0];
          if (firstRow) savedRow = firstRow;
          break;
        }

        lastError = res.error;

        // 1) Live table is missing a column this form sends → drop it and retry
        //    so the listing still saves instead of failing outright.
        const missing = missingColumnFromError(res.error);
        if (missing && Object.prototype.hasOwnProperty.call(working, missing)) {
          delete working[missing];
          droppedColumns.push(missing);
          droppedColumnsRef.current.add(missing);
          continue;
        }

        // 2) Duplicate slug → regenerate it and retry instead of dead-ending.
        const constraint = duplicateConstraintFromError(res.error);
        if (!isEdit && constraint && constraint.toLowerCase().includes('slug')) {
          working.slug = `${payload.slug}-${shortSuffix()}`;
          continue;
        }

        // 3) owner_id points at a profiles row that isn't there → save the
        //    listing without an owner instead of refusing to publish.
        if (!isEdit && includeOwner && isOwnerFkError(res.error)) {
          includeOwner = false;
          ownerDropped = true;
          continue;
        }

        break;
      }

      if (!saved) throw lastError;

      addToast(
        intent === 'publish'
          ? 'JV land listing published'
          : 'JV land listing saved as draft',
        'success',
      );
      if (droppedColumns.length > 0) {
        addToast(
          `Saved — but your jv_opportunities table is missing these fields, so they were not stored: ${droppedColumns.join(', ')}.`,
          'error',
        );
      }
      if (ownerDropped) {
        addToast(
          'Saved — but no matching profile was found to set as the listing owner, so it was stored without an owner.',
          'error',
        );
      }
      setError('');
      // Never let a best-effort sync/storage hiccup undo a save that already
      // succeeded — the record is persisted.
      try {
        broadcastSync();
      } catch {
        /* ignore — the save itself already succeeded */
      }

      if (intent === 'publish') {
        // Only reachable after the database CONFIRMED the write, so the success
        // card is bound to a real publish — never to the button click alone.
        setPublishedInfo({
          title: payload.title,
          id: savedRow?.id || (isEdit ? id || null : null),
          slug: savedRow?.slug || payload.slug,
        });
        savingRef.current = false;
        setSaving(false);
        setSavingIntent(null);
        return;
      }

      savingRef.current = false;
      setSaving(false);
      setSavingIntent(null);
      navigate('/admin/joint-ventures?tab=listings');
    } catch (err: unknown) {
      const msg = describeDbError(err);
      setError(msg);
      addToast(msg, 'error');
      // Leave everything the user typed untouched so they can fix and retry
      // without starting over.
      savingRef.current = false;
      setSaving(false);
      setSavingIntent(null);
    }
  };

  // Live snapshot of the deal.
  const snapshotItems: { label: string; value: string }[] = [];
  if (form.land_value || form.land_value_currency) {
    snapshotItems.push({ label: 'Land contribution', value: formatMoney(toNum(form.land_value), form.land_value_currency) });
  }
  if (form.total_planned_units) {
    const min = form.landowner_units_min || form.landowner_units_max;
    const max = form.landowner_units_max;
    const alloc = min && max && min !== max ? `${min}–${max}` : (min || max);
    snapshotItems.push({ label: 'Development', value: `${form.total_planned_units} units → ${alloc || '—'} to landowner` });
  }
  if (form.dev_payment_amount || form.dev_payment_frequency) {
    const sym = CURRENCY_SYMBOLS[form.dev_payment_currency?.toUpperCase()] || '';
    const amt = form.dev_payment_amount ? `${sym}${Number(form.dev_payment_amount).toLocaleString()}` : '';
    snapshotItems.push({ label: 'Dev-period payment', value: `${amt}${form.dev_payment_frequency ? ` / ${form.dev_payment_frequency}` : ''}` });
  }
  if (form.commission_structure && form.commission_payer) {
    snapshotItems.push({ label: 'Commission', value: `${form.commission_payer} · ${form.commission_structure}` });
  }

  /* Where the published listing can be viewed — the public JV land desk. The
     real slug is carried through so the destination is never hardcoded. */
  const viewListingUrl = publishedInfo?.slug
    ? `/joint-ventures?listing=${encodeURIComponent(publishedInfo.slug)}`
    : '/joint-ventures';

  const handleContinueEditing = () => {
    const targetId = publishedInfo?.id || id;
    setPublishedInfo(null);
    // A brand-new listing now has a real id — switch the URL to its edit route
    // so further saves update it instead of inserting a duplicate.
    if (!isEdit && targetId) {
      navigate(`/admin/jv-opportunities/edit/${targetId}`, { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white border border-[#e2e7ec] p-8 animate-pulse space-y-4">
          <div className="h-6 w-56 bg-[#f2f4f6] rounded" />
          <div className="h-10 bg-[#f2f4f6] rounded" />
          <div className="h-10 bg-[#f2f4f6] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="font-jost text-xl font-semibold text-[#001731]">
            {isEdit ? 'Edit JV Land Listing' : 'Add JV Land Listing'}
          </h1>
          <p className="text-sm font-roboto text-[#6b7684] mt-0.5">Self-contained JV submission — land, structure, capital, commission &amp; continuity</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-roboto font-semibold ${JV_STATUS_COLORS[currentStatus] || 'bg-[#f0f2f4] text-[#6b7684]'}`}>
            <i className="ri-price-tag-3-line" />
            {currentStatusLabel}
          </span>
          {currentStatus === 'scheduled' && form.scheduled_at && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-roboto font-medium text-[#001731] bg-[#e8edf2]">
              <i className="ri-calendar-schedule-line" /> Goes live {formatScheduleLabel(form.scheduled_at)}
            </span>
          )}
          <button type="button" onClick={() => navigate('/admin/joint-ventures?tab=listings')} className={btnGhost}>
            <i className="ri-arrow-left-line" />
            Back to JV Desk
          </button>
          <button type="button" onClick={() => handleSave('draft')} disabled={saving} className={btnSecondary}>
            <i className="ri-save-line" />
            Save Draft
          </button>
        </div>
      </div>

      {/* Deal snapshot */}
      {snapshotItems.length > 0 && (
        <div className="bg-[#001731] text-white border border-[#0d2340]">
          <div className="flex flex-col lg:flex-row gap-4 px-5 py-4">
            <div className="flex items-center gap-3 shrink-0">
              <span className="w-9 h-9 flex items-center justify-center bg-[#00ddb4]/20 text-[#00ddb4] rounded-md">
                <i className="ri-group-line text-lg" />
              </span>
              <p className="font-jost text-[15px] font-semibold">Deal snapshot</p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 flex-1">
              {snapshotItems.map((item) => (
                <div key={item.label} className="min-w-[140px]">
                  <p className="text-[11px] font-roboto uppercase tracking-wide text-white/50">{item.label}</p>
                  <p className="text-[16px] font-roboto font-semibold text-white mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success card — shown only after the database confirms the publish */}
      {publishedInfo && (
        <div className="bg-white border border-[#e2e7ec] overflow-hidden">
          <div className="bg-[#001731] px-6 py-6 flex items-start gap-4">
            <span className="w-12 h-12 rounded-full bg-[#00ddb4]/20 text-[#00ddb4] flex items-center justify-center shrink-0">
              <i className="ri-checkbox-circle-fill text-2xl" />
            </span>
            <div className="min-w-0">
              <h2 className="font-jost text-lg font-semibold text-white">🎉 Listing Published Successfully</h2>
              <p className="text-sm font-roboto text-white/70 mt-1 leading-relaxed">
                Your JV land listing has been published and is now available on the website.
              </p>
            </div>
          </div>
          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-3 bg-[#f8f9fb] border border-[#e2e7ec] px-4 py-3">
              <i className="ri-landscape-line text-[#001731] text-lg" />
              <div className="min-w-0">
                <p className="text-[11px] font-roboto uppercase tracking-wider text-[#6b7684]">Published listing</p>
                <p className="text-sm font-roboto font-semibold text-[#001731] truncate">{publishedInfo.title}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button type="button" onClick={() => navigate(viewListingUrl)} className={`${btnPrimary} w-full justify-center`}>
                <i className="ri-external-link-line" />
                View Listing
              </button>
              <button type="button" onClick={() => navigate('/')} className={`${btnSecondary} w-full justify-center`}>
                <i className="ri-global-line" />
                Back to Website
              </button>
              <button type="button" onClick={() => navigate('/admin/joint-ventures?tab=listings')} className={`${btnSecondary} w-full justify-center`}>
                <i className="ri-list-check-2" />
                Back to Listings
              </button>
              <button type="button" onClick={handleContinueEditing} className={`${btnGhost} w-full justify-center`}>
                <i className="ri-edit-line" />
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {!publishedInfo && (
      <form id="jv-opp-form" onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <JVOverviewStep state={form} update={update} onTitleChange={handleTitleChange} />
        <JVLandStep state={form} update={update} landOptions={landOptions} onLinkLand={handleLinkLand} linkingLand={fetchingLand} inheritedFields={inheritedFields} />
        <JVMediaStep state={form} update={update} inheritedFields={inheritedFields} />
        <JVStructureStep state={form} update={update} dealTypeFromLand={Boolean(form.land_listing_id)} />
        <JVDealTermsStep state={form} update={update} />
        <AgentAssignmentPanel
          agents={agents}
          value={form.agent_ids}
          onChange={(ids) => update({ agent_ids: ids })}
          variant="navy"
        />
        <JVDeskCrmSteps state={form} update={update} />
        <JVContinuityStep state={form} update={update} />

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm font-roboto text-red-700">
            <i className="ri-error-warning-line mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Publishing actions — Save Draft · Publish Now */}
        <div className="sticky bottom-0 bg-white border-t border-[#e2e7ec] py-4 sm:py-5">
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
            <button type="button" onClick={() => navigate('/admin/joint-ventures?tab=listings')} className={`${btnGhost} w-full sm:w-auto justify-center`}>
              Cancel
            </button>
            <button type="button" disabled={saving} onClick={() => handleSave('draft')} className={`${btnSecondary} w-full sm:w-auto justify-center`}>
              {saving && savingIntent === 'draft' ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-save-line" />}
              {saving && savingIntent === 'draft' ? 'Saving...' : 'Save Draft'}
            </button>
            <button type="button" disabled={saving} onClick={() => handleSave('publish')} className={`${btnPrimary} w-full sm:w-auto justify-center`}>
              {saving && savingIntent === 'publish' ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-send-plane-line" />}
              {saving && savingIntent === 'publish' ? 'Publishing...' : 'Publish Now'}
            </button>
          </div>
        </div>
      </form>
      )}
    </div>
  );
}