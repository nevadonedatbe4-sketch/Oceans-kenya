import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import usePortalBase from '@/hooks/usePortalBase';
import type { JvImageDraft } from '@/pages/crm/components/JVImageManager';
import type { LandDocumentDraft } from '@/pages/crm/components/LandDocumentManager';
import { slugifyValue, convertSize, LAND_TYPE_LABELS, OFFER_TYPE_OPTIONS } from '@/pages/crm/landConstants';
import { smartTitleCase } from '@/lib/location';
import type { LandFormState } from '@/pages/crm/components/LandForm/types';
import { parseCoListingAgents, toCoListingAgentsPayload } from '@/pages/crm/components/coListingAgents';
import LandWizardBasicsStep from '@/pages/crm/components/LandForm/LandWizardBasicsStep';
import LandWizardPriceStep from '@/pages/crm/components/LandForm/LandWizardPriceStep';
import LandWizardDetailsStep from '@/pages/crm/components/LandForm/LandWizardDetailsStep';
import LandWizardFeaturesMarketingStep from '@/pages/crm/components/LandForm/LandWizardFeaturesMarketingStep';
import LandWizardRoadAccessStep from '@/pages/crm/components/LandForm/LandWizardRoadAccessStep';
import LandWizardLocationStep from '@/pages/crm/components/LandForm/LandWizardLocationStep';
import LandWizardMediaStep from '@/pages/crm/components/LandForm/LandWizardMediaStep';
import LandWizardUsePotentialStep from '@/pages/crm/components/LandForm/LandWizardUsePotentialStep';
import LandWizardPublishStep from '@/pages/crm/components/LandForm/LandWizardPublishStep';

const GREEN = '#0d5959';

const WIZARD_STEPS = [
  { label: 'Basic Information' },
  { label: 'Pricing' },
  { label: 'Media' },
  { label: 'Property Details' },
  { label: 'General Features & Marketing' },
  { label: 'Road Access' },
  { label: 'Land Use & JV Potential' },
  { label: 'Location & Full Address' },
  { label: 'Review & Publish' },
];

const initialState: LandFormState = {
  title: '', slug: '', slugTouched: false, offerType: '', landType: '', disposition: '', status: 'draft',
  marketingLabels: [],
  region: '', county: '', subCounty: '', ward: '', area: '', neighbourhood: '', landmark: '', street: '', address: '',
  city: 'Nairobi', country: 'Kenya', latitude: '', longitude: '', mapPrecision: 'approximate', showExact: false,
  landSize: '', landSizeUnit: 'acres', plotLength: '', plotWidth: '', plotDimUnit: 'ft', plotShape: '',
  terrain: [], landEnvironment: [], waterFeatures: [], topography: '',
  landClassification: '', tenure: '', titleDocument: '', titleInfo: '', verificationStatus: '',
  roadAccess: '', roadFrontage: [], accessibility: [], waterSupply: [], electricity: [], sewerage: [], connectivity: [],
  primaryLandUse: '', secondaryPotentialUses: [], suitableFor: [], developmentIndicators: [],
  zoning: '', permittedUse: '', subdivisionPotential: false, developmentPotential: '',
  askingPrice: '', currency: 'KES', priceBasis: '', pricePerAcre: '', pricePerHectare: '', pricePerSqm: '', priceStatus: '',
  paymentTerms: [], depositRequired: '', installmentPeriod: '', installmentFrequency: '', balanceTerms: '',
  interestApplies: false, paymentNotes: '',
  agriculturalPotential: false, commercialPotential: false, residentialPotential: false,
  headline: '', shortDescription: '', description: '', investmentOpportunity: '',
  ownerName: '', ownerPhone: '', ownerEmail: '', sellerType: '', ownershipRelationship: '', source: '', sellerNotes: '', internalContact: '', sourceContactId: '',
  sourceName: '', sourceLink: '', dateSourced: '',
  posterName: '', posterPhone: '', posterEmail: '', posterCompany: '', posterProfile: '', posterAddress: '',
  coListingAgents: [],
  agentIds: [],
  internalNotes: '', commission: '', negotiationFloor: '', internalValuation: '', agentNotes: '', legalConcerns: '', followUpNotes: '',
  seoTitle: '', seoDescription: '', isPublished: false, isFeatured: false, isPending: false,
};

function asArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
}
function asStr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function buildLocationDisplay(area: string, county: string, subCounty: string, neighbourhood: string): string {
  const parts = [area || neighbourhood, subCounty, county].filter(Boolean);
  return parts.join(', ');
}

function offerLabel(value: string) {
  const found = OFFER_TYPE_OPTIONS.find((o) => o.value === value);
  return found ? found.label : value;
}

export default function LandListingEdit() {
  const navigate = useNavigate();
  const portalBase = usePortalBase();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { user, isAdmin } = useAuth();
  const { agentId } = useAgentProfile();
  const isAgent = user?.role === 'agent';
  const [searchParams] = useSearchParams();
  const stepParam = searchParams.get('step');
  const REVIEW_STEP_INDEX = WIZARD_STEPS.length - 1;

  const [state, setState] = useState<LandFormState>(() => initialState);
  const [images, setImages] = useState<JvImageDraft[]>([]);
  const [documents, setDocuments] = useState<LandDocumentDraft[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(() => (stepParam === 'review' || stepParam === 'publish' ? REVIEW_STEP_INDEX : 0));
  const [stepError, setStepError] = useState('');
  const [agents, setAgents] = useState<{ id: string; name: string; title?: string | null }[]>([]);

  const update = (patch: Partial<LandFormState>) => setState((s) => ({ ...s, ...patch }));

  // Load assignable agents for the Agent Assignment panel.
  // Agents never see the cross-agent list — they only own their own land.
  useEffect(() => {
    if (isAgent) {
      setAgents([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('agents').select('id, name, title').order('name');
      if (!cancelled) setAgents((data || []) as { id: string; name: string; title?: string | null }[]);
    })();
    return () => { cancelled = true; };
  }, [isAgent]);

  // Auto-assign the agent to their own land record when creating new.
  useEffect(() => {
    if (!isEdit && isAgent && agentId) {
      setState((s) => (s.agentIds.includes(agentId) ? s : { ...s, agentIds: [agentId] }));
    }
  }, [isEdit, isAgent, agentId]);

  // OWNERSHIP GUARD — an agent may only open their own land record. Another
  // agent's published land is publicly readable, but must never open inside the
  // agent's private CRM form (it exposes owner, title/source & internal notes).
  useEffect(() => {
    if (!isEdit || loading) return;
    if (!isAgent || !agentId) return;
    if (!state.agentIds.includes(agentId)) {
      addToast('This land listing is not assigned to you.', 'error');
      navigate(`${portalBase}/land-listings`, { replace: true });
    }
  }, [isEdit, loading, isAgent, agentId, state.agentIds, navigate, portalBase]);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from('land_listings').select('*').eq('id', id).maybeSingle();
      if (error || !data || cancelled) {
        if (!cancelled) addToast('Failed to load land listing', 'error');
        setLoading(false);
        return;
      }
      const land = data as Record<string, unknown>;
      setState({
        ...initialState,
        title: asStr(land.title),
        slug: asStr(land.slug),
        offerType: asStr(land.sub_type) || asStr(land.offer_type),
        landType: asStr(land.land_type),
        disposition: asStr(land.disposition),
        status: asStr(land.status) || 'draft',
        marketingLabels: asArr(land.marketing_labels),
        region: asStr(land.state_region),
        county: asStr(land.county),
        subCounty: asStr(land.sub_county),
        ward: asStr(land.ward),
        area: asStr(land.area),
        neighbourhood: asStr(land.neighbourhood),
        landmark: asStr(land.landmark),
        street: asStr(land.street),
        address: asStr(land.address),
        city: asStr(land.city) || 'Nairobi',
        country: asStr(land.country) || 'Kenya',
        latitude: land.latitude != null ? String(land.latitude) : '',
        longitude: land.longitude != null ? String(land.longitude) : '',
        mapPrecision: asStr(land.map_pin_precision) || 'approximate',
        showExact: Boolean(land.show_exact_location),
        landSize: land.land_size != null ? String(land.land_size) : (land.plot_size != null ? String(land.plot_size) : ''),
        landSizeUnit: asStr(land.land_size_unit) || asStr(land.plot_size_unit) || 'acres',
        plotLength: land.plot_length != null ? String(land.plot_length) : '',
        plotWidth: land.plot_width != null ? String(land.plot_width) : '',
        plotDimUnit: asStr(land.plot_dim_unit) || 'ft',
        plotShape: asStr(land.plot_shape),
        terrain: asArr(land.terrain),
        landEnvironment: asArr(land.land_environment),
        waterFeatures: asArr(land.water_features),
        topography: asStr(land.topography),
        landClassification: asStr(land.land_classification),
        tenure: asStr(land.tenure),
        titleDocument: asStr(land.title_document),
        titleInfo: asStr(land.title_info),
        verificationStatus: asStr(land.verification_status),
        roadAccess: asStr(land.road_access),
        roadFrontage: asArr(land.road_frontage),
        accessibility: asArr(land.accessibility),
        waterSupply: asArr(land.water_supply),
        electricity: asArr(land.electricity),
        sewerage: asArr(land.sewerage),
        connectivity: asArr(land.connectivity),
        primaryLandUse: asStr(land.primary_land_use),
        secondaryPotentialUses: asArr(land.secondary_potential_uses),
        suitableFor: asArr(land.suitable_for),
        developmentIndicators: asArr(land.development_indicators),
        zoning: asStr(land.zoning),
        permittedUse: asStr(land.permitted_use),
        subdivisionPotential: Boolean(land.subdivision_potential),
        developmentPotential: asStr(land.development_potential),
        askingPrice: land.asking_price != null ? String(land.asking_price) : '',
        currency: asStr(land.currency) || 'KES',
        priceBasis: asStr(land.price_basis),
        pricePerAcre: land.price_per_acre != null ? String(land.price_per_acre) : '',
        pricePerHectare: land.price_per_hectare != null ? String(land.price_per_hectare) : '',
        pricePerSqm: land.price_per_sqm != null ? String(land.price_per_sqm) : '',
        priceStatus: asStr(land.price_status),
        paymentTerms: asArr(land.payment_terms),
        depositRequired: asStr(land.deposit_required),
        installmentPeriod: asStr(land.installment_period),
        installmentFrequency: asStr(land.installment_frequency),
        balanceTerms: asStr(land.balance_terms),
        interestApplies: Boolean(land.interest_applies),
        paymentNotes: asStr(land.payment_notes),
        agriculturalPotential: Boolean(land.agricultural_potential),
        commercialPotential: Boolean(land.commercial_potential),
        residentialPotential: Boolean(land.residential_potential),
        headline: asStr(land.headline),
        shortDescription: asStr(land.short_description),
        description: asStr(land.description),
        investmentOpportunity: asStr(land.investment_opportunity),
        ownerName: asStr(land.owner_name),
        ownerPhone: asStr(land.owner_phone),
        ownerEmail: asStr(land.owner_email),
        sellerType: asStr(land.seller_type),
        ownershipRelationship: asStr(land.ownership_relationship),
        source: asStr(land.source),
        sellerNotes: asStr(land.seller_notes),
        internalContact: asStr(land.internal_contact),
        sourceContactId: land.source_contact_id ? String(land.source_contact_id) : '',
        sourceName: asStr(land.source_name),
        sourceLink: asStr(land.source_link),
        dateSourced: asStr(land.date_sourced),
        posterName: asStr(land.poster_name),
        posterPhone: asStr(land.poster_phone),
        posterEmail: asStr(land.poster_email),
        posterCompany: asStr(land.poster_company),
        posterProfile: asStr(land.poster_profile),
        posterAddress: asStr(land.poster_address),
        coListingAgents: parseCoListingAgents(land.co_listing_agents),
        agentIds: asArr(land.agent_ids),
        internalNotes: asStr(land.internal_notes),
        commission: asStr(land.commission),
        negotiationFloor: asStr(land.negotiation_floor),
        internalValuation: asStr(land.internal_valuation),
        agentNotes: asStr(land.agent_notes),
        legalConcerns: asStr(land.legal_concerns),
        followUpNotes: asStr(land.follow_up_notes),
        seoTitle: asStr(land.seo_title),
        seoDescription: asStr(land.seo_description),
        isPublished: Boolean(land.is_published),
        isFeatured: Boolean(land.is_featured),
        isPending: Boolean(land.is_pending),
      });

      const rows = Array.isArray(land.images) ? land.images : [];
      setImages(rows.map((url: unknown, idx: number) => ({ url: String(url), alt: '', sortOrder: idx + 1, isCover: idx === 0 })));
      if (Array.isArray(land.documents)) {
        setDocuments((land.documents as LandDocumentDraft[]).map((d) => ({
          id: String(d.id || `${String(d.url)}-${Math.random().toString(36).slice(2, 8)}`),
          name: String(d.name || 'Document'),
          url: String(d.url || ''),
          path: String(d.path || ''),
          size: Number(d.size || 0),
          type: String(d.type || 'application/octet-stream'),
        })));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const handleTitleChange = (value: string) => {
    update({ title: value, slug: state.slugTouched ? state.slug : slugifyValue(value) });
  };

  const validateForPublish = () => {
    const missing: string[] = [];
    if (!state.title.trim()) missing.push('a listing title');
    if (!state.landType) missing.push('a land type');
    if (state.priceStatus !== 'on_request' && !state.askingPrice.trim()) missing.push('an asking price');
    if (!state.county) missing.push('a county');
    return missing;
  };

  const validateStep = (s: number): string[] => {
    const missing: string[] = [];
    if (s === 0) {
      if (!state.title.trim()) missing.push('a listing title');
      if (!state.offerType) missing.push('an offer type');
      if (!state.landType) missing.push('a land type');
    } else if (s === 1) {
      if (state.priceStatus !== 'on_request' && !state.askingPrice.trim()) missing.push('an asking price');
    } else if (s === 3) {
      if (!state.landSize.trim()) missing.push('the land size');
    }
    return missing;
  };

  const buildPayload = (targetStatus?: string, publish?: boolean) => {
    const finalSlug = state.slug.trim() || slugifyValue(state.title);
    const cover = images.find((i) => i.isCover) || images[0];
    const sizeNum = parseFloat(state.landSize) || 0;
    const acreage = state.landSize && sizeNum > 0 ? (convertSize(sizeNum, state.landSizeUnit || 'acres', 'acres') || null) : null;
    const location = buildLocationDisplay(state.area, state.county, state.subCounty, state.neighbourhood);
    const priceOnRequest = state.priceStatus === 'on_request';

    return {
      title: state.title.trim() || null,
      slug: finalSlug || null,
      headline: state.headline.trim() || null,
      description: state.description.trim() || null,
      short_description: state.shortDescription.trim() || null,
      investment_opportunity: state.investmentOpportunity.trim() || null,
      land_type: state.landType || null,
      sub_type: state.offerType || state.disposition || null,
      status: targetStatus ?? state.status,
      marketing_labels: state.marketingLabels.length ? state.marketingLabels : null,
      county: state.county || null,
      sub_county: state.subCounty || null,
      ward: state.ward || null,
      area: state.area || null,
      neighbourhood: state.neighbourhood || null,
      landmark: state.landmark || null,
      location,
      street: state.street?.trim() || null,
      address: (state.address || state.landmark || '').trim() || null,
      city: (state.city || state.county || 'Nairobi'),
      state_region: state.region || state.county || state.city || null,
      country: state.country || 'Kenya',
      latitude: state.latitude ? Number(state.latitude) : null,
      longitude: state.longitude ? Number(state.longitude) : null,
      map_pin_precision: state.mapPrecision || null,
      show_exact_location: state.showExact,
      land_size: sizeNum || null,
      land_size_unit: state.landSizeUnit || null,
      plot_size: sizeNum || null,
      plot_size_unit: state.landSizeUnit || null,
      acreage,
      plot_length: state.plotLength ? Number(state.plotLength) : null,
      plot_width: state.plotWidth ? Number(state.plotWidth) : null,
      plot_dim_unit: state.plotDimUnit || null,
      plot_shape: state.plotShape || null,
      terrain: state.terrain.length ? state.terrain : null,
      land_environment: state.landEnvironment.length ? state.landEnvironment : null,
      water_features: state.waterFeatures.length ? state.waterFeatures : null,
      topography: state.topography || null,
      land_classification: state.landClassification || null,
      tenure: state.tenure || null,
      title_document: state.titleDocument || null,
      title_info: state.titleInfo || null,
      verification_status: state.verificationStatus || null,
      road_access: state.roadAccess || null,
      road_frontage: state.roadFrontage.length ? state.roadFrontage : null,
      accessibility: state.accessibility.length ? state.accessibility : null,
      water_supply: state.waterSupply.length ? state.waterSupply : null,
      electricity: state.electricity.length ? state.electricity : null,
      sewerage: state.sewerage.length ? state.sewerage : null,
      connectivity: state.connectivity.length ? state.connectivity : null,
      primary_land_use: state.primaryLandUse || null,
      secondary_potential_uses: state.secondaryPotentialUses.length ? state.secondaryPotentialUses : null,
      suitable_for: state.suitableFor.length ? state.suitableFor : null,
      development_indicators: state.developmentIndicators.length ? state.developmentIndicators : null,
      zoning: state.zoning || null,
      permitted_use: state.permittedUse || null,
      subdivision_potential: state.subdivisionPotential,
      development_potential: state.developmentPotential || null,
      asking_price: !priceOnRequest && state.askingPrice ? Number(state.askingPrice) : null,
      currency: state.currency,
      price_basis: state.priceBasis || null,
      price_per_acre: state.pricePerAcre ? Number(state.pricePerAcre) : null,
      price_per_hectare: state.pricePerHectare ? Number(state.pricePerHectare) : null,
      price_per_sqm: state.pricePerSqm ? Number(state.pricePerSqm) : null,
      price_status: state.priceStatus || null,
      payment_terms: state.paymentTerms.length ? state.paymentTerms : null,
      deposit_required: state.depositRequired || null,
      installment_period: state.installmentPeriod || null,
      installment_frequency: state.installmentFrequency || null,
      balance_terms: state.balanceTerms || null,
      interest_applies: state.interestApplies,
      payment_notes: state.paymentNotes || null,
      agricultural_potential: state.agriculturalPotential,
      commercial_potential: state.commercialPotential,
      residential_potential: state.residentialPotential,
      owner_name: state.ownerName || null,
      owner_phone: state.ownerPhone || null,
      owner_email: state.ownerEmail || null,
      seller_type: state.sellerType || null,
      ownership_relationship: state.ownershipRelationship || null,
      source: state.source || null,
      seller_notes: state.sellerNotes || null,
      internal_contact: state.internalContact || null,
      source_contact_id: state.sourceContactId || null,
      source_name: state.sourceName?.trim() || null,
      source_link: state.sourceLink?.trim() || null,
      date_sourced: state.dateSourced || null,
      poster_name: state.posterName?.trim() || null,
      poster_phone: state.posterPhone?.trim() || null,
      poster_email: state.posterEmail?.trim() || null,
      poster_company: state.posterCompany?.trim() || null,
      poster_profile: state.posterProfile?.trim() || null,
      poster_address: state.posterAddress?.trim() || null,
      co_listing_agents: toCoListingAgentsPayload(state.coListingAgents),
      agent_ids: isAgent ? (agentId ? [agentId] : null) : (state.agentIds.length ? state.agentIds : null),
      internal_notes: state.internalNotes || null,
      commission: state.commission || null,
      negotiation_floor: state.negotiationFloor || null,
      internal_valuation: state.internalValuation || null,
      agent_notes: state.agentNotes || null,
      legal_concerns: state.legalConcerns || null,
      follow_up_notes: state.followUpNotes || null,
      main_image: cover?.url || null,
      images: images.map((i) => i.url),
      documents: documents.map((d) => ({ id: d.id, name: d.name, url: d.url, path: d.path, size: d.size, type: d.type })),
      seo_title: state.seoTitle.trim() || null,
      seo_description: state.seoDescription.trim() || null,
      is_published: publish ?? state.isPublished,
      is_featured: state.isFeatured,
      is_pending: !publish ? state.isPending : false,
      agent_id: isAgent ? (agentId || null) : (state.agentIds[0] || null),
      updated_at: new Date().toISOString(),
    };
  };

  const handleSave = async (mode: 'draft' | 'submit' | 'publish') => {
    if (mode !== 'draft') {
      const missing = validateForPublish();
      if (missing.length) {
        addToast(`Before publishing, add: ${missing.join(', ')}`, 'error');
        return;
      }
    } else if (!state.title.trim()) {
      addToast('Please enter a listing title', 'error');
      return;
    }
    setSaving(true);
    const targetStatus = mode === 'publish' ? 'published' : mode === 'submit' ? 'pending' : state.status;
    const publish = mode === 'publish';
    const payload = buildPayload(targetStatus, publish);

    try {
      if (isEdit) {
        const { error } = await supabase.from('land_listings').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('land_listings').insert(payload);
        if (error) throw error;
      }
      addToast(mode === 'publish' ? 'Land listing published' : mode === 'submit' ? 'Land submitted for approval' : 'Land listing saved', 'success');
      broadcastSync();
      navigate(`${portalBase}/land-listings`, { replace: true });
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to save land listing', 'error');
      setSaving(false);
    }
  };

  const handleContinue = () => {
    // Validate fields on the current step so Continue genuinely gates the flow.
    const missing = validateStep(step);
    if (missing.length) {
      const msg = `Before continuing, add: ${missing.join(', ')}`;
      setStepError(msg);
      addToast(msg, 'error');
      return;
    }
    setStepError('');
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const goToStep = (next: number) => {
    setStepError('');
    setStep(Math.max(0, Math.min(next, WIZARD_STEPS.length - 1)));
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-8 animate-pulse space-y-4">
          <div className="h-6 w-48 bg-[#f7f8fa] rounded" />
          <div className="h-10 bg-[#f7f8fa] rounded" />
          <div className="h-10 bg-[#f7f8fa] rounded" />
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0: return <LandWizardBasicsStep state={state} update={update} />;
      case 1: return <LandWizardPriceStep state={state} update={update} />;
      case 2: return <LandWizardMediaStep state={state} update={update} images={images} setImages={setImages} documents={documents} setDocuments={setDocuments} />;
      case 3: return <LandWizardDetailsStep state={state} update={update} />;
      case 4: return <LandWizardFeaturesMarketingStep state={state} update={update} />;
      case 5: return <LandWizardRoadAccessStep state={state} update={update} />;
      case 6: return <LandWizardUsePotentialStep state={state} update={update} />;
      case 7: return <LandWizardLocationStep state={state} update={update} />;
      default: return <LandWizardPublishStep state={state} update={update} agents={agents} />;
    }
  };

  const priceForReview = state.priceStatus === 'on_request' ? 'Price on Request' : state.askingPrice ? `${state.currency} ${Number(state.askingPrice).toLocaleString()}` : '—';

  const linkedSellerName = state.sourceContactId ? (state.ownerName || state.internalContact || '') : '';
  const sourceForReview = linkedSellerName ? `${linkedSellerName} · Linked Contact` : 'No source linked';

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="font-jost text-xl font-semibold text-[#111827]">
            {isEdit ? 'Edit Land Listing' : 'New Land Listing'}
          </h1>
          <p className="text-sm font-roboto text-[#6b7280] mt-0.5">
            {isEdit
              ? 'Update this land record on the dedicated Land CRM'
              : 'Add land to the dedicated Land CRM — separate from general property'}
          </p>
        </div>
        <button
          onClick={() => navigate(`${portalBase}/land-listings`)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-[#c2c9d2] rounded-lg text-[15px] font-roboto font-semibold text-[#111827] hover:text-[#0d5959] hover:border-[#0d5959]/30 transition-all cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line" />
          Back to Land Listings
        </button>
      </div>

      {/* Progress indicator */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] px-4 md:px-6 py-4">
        <ol className="flex items-center justify-between gap-1 md:gap-2 overflow-x-auto">
          {WIZARD_STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.label} className="flex items-center gap-1 md:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  className={`inline-flex items-center gap-1.5 px-1.5 py-1 rounded-md transition-all cursor-pointer ${
                    active ? 'text-[#0d5959]' : done ? 'text-[#0d5959]' : 'text-[#9ca3af]'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold ${
                    done ? 'bg-[#001731] text-white' : active ? 'bg-[#001731] text-white' : 'bg-[#e9edf1] text-[#4a5568]'
                  }`}>
                    {done ? <i className="ri-check-line" /> : i + 1}
                  </span>
                  <span className="hidden lg:inline text-[16px] font-roboto font-semibold whitespace-nowrap">{s.label}</span>
                </button>
                {i < WIZARD_STEPS.length - 1 && <span className="w-4 md:w-8 h-px bg-[#e5e7eb] shrink-0" />}
              </li>
            );
          })}
        </ol>
      </div>

      <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); handleSave(isAdmin ? 'draft' : 'draft'); }} className="space-y-5">
        {renderStep()}

        {/* Review summary on the final step */}
        {step === WIZARD_STEPS.length - 1 && (
          <div className="bg-[#0d1f2d] rounded-xl border-2 border-[#1d3a4d] overflow-hidden">
            <div className="flex items-center gap-3 px-5 md:px-6 py-4 border-b border-white/10 bg-[#0d1f2d]">
              <div className="w-9 h-9 flex items-center justify-center shrink-0 bg-[#0d5959] rounded-lg">
                <i className="ri-file-list-line text-white text-base" />
              </div>
              <div className="min-w-0">
                <h3 className="font-jost text-lg font-bold text-white uppercase tracking-[0.4px]">Land Listing Summary</h3>
                <p className="text-[14px] font-roboto text-[#9fb4c4] mt-0.5">Confirm the details — then submit or publish.</p>
              </div>
            </div>
            <div className="px-5 md:px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <SummaryRow label="Title" value={smartTitleCase(state.title) || '—'} />
              <SummaryRow label="Offer" value={offerLabel(state.offerType) || '—'} tone="cyan" />
              <SummaryRow label="Type" value={LAND_TYPE_LABELS[state.landType] || '—'} tone="green" />
              <SummaryRow label="Price" value={priceForReview} tone="brown" />
              <SummaryRow label="Size" value={state.landSize ? `${state.landSize} ${state.landSizeUnit || ''}` : '—'} />
              <SummaryRow label="Location" value={[state.area || state.neighbourhood, state.subCounty, state.county].filter(Boolean).join(' → ') || '—'} />
              <div className="sm:col-span-2">
                <SummaryRow
                  label="Marketing"
                  value={state.marketingLabels.length ? state.marketingLabels.join(' · ') : '—'}
                />
              </div>
              <div className="sm:col-span-2">
                <SummaryRow label="Source / Seller" value={sourceForReview} tone="green" />
              </div>
            </div>
          </div>
        )}

        {/* Step navigation */}
        <div className="bg-white rounded-xl border border-[#0d5959]/25 overflow-hidden">
          {stepError && (
            <div className="px-4 md:px-5 pt-4">
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg border border-red-200 bg-red-50">
                <i className="ri-error-warning-line text-red-500 text-base mt-0.5" />
                <p className="text-[14px] font-roboto font-semibold text-red-700 leading-relaxed">{stepError}</p>
              </div>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 md:p-5">
            <button
              type="button"
              onClick={() => navigate(`${portalBase}/land-listings`)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-[17px] font-roboto font-semibold text-[#0d1f2d] border border-[#0d5959]/30 hover:text-[#0d5959] hover:border-[#0d5959]/50 transition-all cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => goToStep(step - 1)}
                disabled={step === 0}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-[17px] font-roboto font-semibold text-[#0d1f2d] border border-[#0d5959]/30 hover:text-[#0d5959] hover:border-[#0d5959]/50 transition-all cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <i className="ri-arrow-left-line" />
                Back
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave('draft')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-[17px] font-roboto font-bold bg-white border-2 border-[#0d5959] text-[#0d5959] hover:bg-[#0d5959]/5 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-save-line" />}
                {saving ? 'Saving...' : 'Save Draft'}
              </button>

              {step < WIZARD_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg text-[17px] font-roboto font-bold text-white hover:opacity-90 transition-all cursor-pointer whitespace-nowrap"
                  style={{ backgroundColor: GREEN }}
                >
                  Continue
                  <i className="ri-arrow-right-line" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(isAdmin ? 'publish' : 'submit')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg text-[17px] font-roboto font-bold text-white hover:opacity-90 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                  style={{ backgroundColor: GREEN }}
                >
                  {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className={isAdmin ? 'ri-rocket-line' : 'ri-send-plane-line'} />}
                  {saving ? 'Saving...' : isAdmin ? 'Publish Now' : 'Submit for Approval'}
                </button>
              )}
            </div>
          </div>
          {step < WIZARD_STEPS.length - 1 && (
            <p className="px-4 md:px-5 pb-3 text-[14px] font-roboto text-[#6b8b93] -mt-1">
              {isAdmin ? 'Save Draft is available at any time. Publish from the final step.' : 'Agents: your listing enters review — Save Draft any time, submit from the final step.'}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

const SUMMARY_TONES: Record<string, string> = {
  green: 'bg-[#0d5959]/40 text-[#bfe8e0] border-[#0d5959]/60',
  cyan: 'bg-[#0e7490]/40 text-[#bdeafe] border-[#0e7490]/60',
  brown: 'bg-[#8a5a2b]/40 text-[#ffe3c2] border-[#8a5a2b]/60',
};

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'cyan' | 'brown' }) {
  return (
    <div className="flex flex-col">
      <span className="text-[13px] font-roboto font-bold uppercase tracking-wide text-[#9fb4c4]">{label}</span>
      {tone ? (
        <span className={`inline-flex w-fit mt-1 px-2.5 py-1 rounded-md border text-[16px] font-roboto font-semibold ${SUMMARY_TONES[tone]}`}>{value}</span>
      ) : (
        <span className="text-[17px] font-roboto font-semibold text-white mt-1">{value}</span>
      )}
    </div>
  );
}