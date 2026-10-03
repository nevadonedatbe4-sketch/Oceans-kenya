import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import usePortalBase from '@/hooks/usePortalBase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { supabase, uploadImageViaEdgeFunction } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import { smartTitleCase } from '@/lib/location';
import { resolveSourceContact } from '@/pages/crm/components/sourceContinuity';
import { parseCoListingAgents, toCoListingAgentsPayload } from '@/pages/crm/components/coListingAgents';
import {
  DevelopmentFormState,
  UnitType,
  makeUnitType,
  generateSlug,
} from './components/DevelopmentEdit/types';
import DevelopmentBasicsStep from './components/DevelopmentEdit/DevelopmentBasicsStep';
import UnitTypesStep from './components/DevelopmentEdit/UnitTypesStep';
import DevelopmentAmenitiesStep from './components/DevelopmentEdit/DevelopmentAmenitiesStep';
import DevelopmentPricingStep from './components/DevelopmentEdit/DevelopmentPricingStep';
import DevelopmentKeyInfoStep from './components/DevelopmentEdit/DevelopmentKeyInfoStep';
import DevelopmentInternalStep from './components/DevelopmentEdit/DevelopmentInternalStep';
import DevelopmentMediaStep from './components/DevelopmentEdit/DevelopmentMediaStep';
import DevelopmentPublishStep from './components/DevelopmentEdit/DevelopmentPublishStep';
import { makeDeveloperProject } from './components/DevelopmentEdit/types';

const STEPS = [
  { id: 'basics', label: 'Overview', desc: 'Name, location & developer' },
  { id: 'units', label: 'Unit Types', desc: 'Sizes, prices & availability' },
  { id: 'amenities', label: 'Amenities', desc: 'Facilities for all units' },
  { id: 'pricing', label: 'Pricing & Plan', desc: 'Payment plan & marketing' },
  { id: 'keyinfo', label: 'Key Info', desc: 'Ownership, costs & utilities' },
  { id: 'internal', label: 'Internal', desc: 'Agency-only contact & notes' },
  { id: 'media', label: 'Media', desc: 'Photos, plans & videos' },
  { id: 'publish', label: 'Publish', desc: 'Review, SEO & go live' },
];

const EMPTY: DevelopmentFormState = {
  title: '',
  projectName: '',
  slug: '',
  description: '',
  location: '',
  neighbourhood: '',
  address: '',
  city: '',
  country: 'Kenya',
  latitude: '',
  longitude: '',
  propertyType: 'Apartment',
  developmentStatus: 'off_plan',
  completionStartYear: '',
  completionEndYear: '',
  floors: 0,
  totalUnits: 0,
  developerName: '',
  developerPhone: '',
  developerEmail: '',
  amenities: [],
  mainImage: '',
  coverImage: '',
  gallery: [],
  floorPlans: [],
  videoUrl: '',
  price: '',
  currency: 'KES',
  baths: 0,
  parking: 0,
  marketingType: 'for_sale',
  unitsSold: 0,
  unitsReserved: 0,
  unitsRented: 0,
  unitsOccupied: 0,
  currentPrice: '',
  previousPrice: '',
  showUnitsRemaining: true,
  showPercentSold: true,
  showPercentRented: false,
  showDeveloperName: true,
  showUrgencyMessage: true,
  unitsRemaining: '',
  isPublished: false,
  isFeatured: false,
  seoTitle: '',
  seoDescription: '',
  unitTypes: [makeUnitType()],
  paymentPlan: { depositPercent: '', installments: '' },
  tenure: '',
  serviceCharge: '',
  councilTaxBand: '',
  groundRent: '',
  groundRentReview: '',
  leaseLength: '',
  waterSupply: '',
  electricity: '',
  heating: '',
  sewerage: '',
  broadband: '',
  broadbandSpeed: '',
  mobileCoverage: '',
  parkingNotes: '',
  sourceName: '',
  sourceUrl: '',
  sourcePoster: '',
  dateSourced: '',
  ownerName: '',
  ownerPhone: '',
  ownerEmail: '',
  ownerRole: '',
  sourceContactId: '',
  caretakerName: '',
  caretakerPhone: '',
  caretakerRole: '',
  sourceNotes: '',
  coListingAgents: [],
  agentIds: [],
  developerProjects: [],
  commissionTracking: '',
  negotiationNotes: '',
  availabilityReality: '',
};

function defaultForm(): DevelopmentFormState {
  return JSON.parse(JSON.stringify(EMPTY));
}

export default function DevelopmentEdit() {
  const { id } = useParams<{ id: string }>();
  const portalBase = usePortalBase();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { agentId } = useAgentProfile();
  const isAgent = user?.role === 'agent';
  const isEdit = Boolean(id);

  const [form, setForm] = useState<DevelopmentFormState>(defaultForm);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<{ title: string; slug: string; id?: string } | null>(null);
  const stepRefs = useRef<Record<string, boolean>>({});
  const [missingUnits, setMissingUnits] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string; title?: string | null }[]>([]);

  // Load assignable agents for the Agent Assignment panel.
  // Agents never see the cross-agent assignment list — they can only own their
  // own developments, so the panel is hidden for them.
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

  const stepParam = searchParams.get('step');
  useEffect(() => {
    if (!stepParam) return;
    const idx = STEPS.findIndex((s) => s.id === stepParam);
    if (idx >= 0) setActiveStep(idx);
  }, [stepParam]);

  const update = useCallback((patch: Partial<DevelopmentFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateUnit = useCallback((index: number, patch: Partial<UnitType>) => {
    setForm((prev) => {
      const unitTypes = [...prev.unitTypes];
      unitTypes[index] = { ...unitTypes[index], ...patch };
      return { ...prev, unitTypes };
    });
  }, []);

  const addUnit = useCallback(() => {
    setForm((prev) => ({ ...prev, unitTypes: [...prev.unitTypes, makeUnitType()] }));
  }, []);

  const removeUnit = useCallback((index: number) => {
    setForm((prev) => {
      const unitTypes = prev.unitTypes.filter((_, i) => i !== index);
      return { ...prev, unitTypes: unitTypes.length ? unitTypes : [makeUnitType()] };
    });
  }, []);

  const fetchDevelopment = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('developments')
      .select('*, unit_types(*)')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) {
      addToast('Failed to load development', 'error');
      setLoading(false);
      return;
    }
    // OWNERSHIP GUARD — an agent may only open a development they own. Even
    // though another agent's PUBLISHED project is publicly readable, it must
    // never open inside the agent's private CRM form.
    if (isAgent && agentId && data.agent_id !== agentId) {
      addToast('This development is not assigned to you.', 'error');
      navigate(`${portalBase}/developments`, { replace: true });
      setLoading(false);
      return;
    }
    const rawUnits = Array.isArray(data.unit_types) ? data.unit_types : [];
    setForm({
      title: data.title || '',
      projectName: data.project_name || '',
      slug: data.slug || '',
      description: data.description || '',
      location: data.location || '',
      neighbourhood: data.neighbourhood || '',
      address: data.address || '',
      city: data.city || '',
      country: data.country || 'Kenya',
      latitude: data.latitude ? String(data.latitude) : '',
      longitude: data.longitude ? String(data.longitude) : '',
      propertyType: data.property_type || 'Apartment',
      developmentStatus: data.development_status || 'off_plan',
      completionStartYear: data.completion_start_year ? String(data.completion_start_year) : '',
      completionEndYear: data.completion_end_year ? String(data.completion_end_year) : '',
      floors: data.floors || 0,
      totalUnits: data.total_units || 0,
      developerName: data.developer_name || '',
      developerPhone: data.developer_phone || '',
      developerEmail: data.developer_email || '',
      amenities: Array.isArray(data.amenities) ? data.amenities : [],
      mainImage: data.main_image || '',
      coverImage: data.cover_image || '',
      gallery: Array.isArray(data.gallery) ? data.gallery : [],
      floorPlans: Array.isArray(data.floor_plans) ? data.floor_plans : [],
      videoUrl: data.video_url || '',
      price: data.price ? String(data.price) : '',
      currency: data.currency || 'KES',
      baths: data.baths || 0,
      parking: data.parking || 0,
      marketingType: data.marketing_type || 'for_sale',
      unitsSold: data.units_sold || 0,
      unitsReserved: data.units_reserved || 0,
      unitsRented: data.units_rented || 0,
      unitsOccupied: data.units_occupied || 0,
      currentPrice: data.current_price ? String(data.current_price) : '',
      previousPrice: data.previous_price ? String(data.previous_price) : '',
      showUnitsRemaining: data.show_units_remaining !== false,
      showPercentSold: data.show_percent_sold !== false,
      showPercentRented: data.show_percent_rented || false,
      showDeveloperName: data.show_developer_name !== false,
      showUrgencyMessage: data.show_urgency_message !== false,
      unitsRemaining: data.units_remaining_override != null ? String(data.units_remaining_override) : '',
      isPublished: data.is_published || false,
      isFeatured: data.is_featured || false,
      seoTitle: data.seo_title || '',
      seoDescription: data.seo_description || '',
      unitTypes: rawUnits.length
        ? rawUnits.map((u: Record<string, unknown>) => ({
            id: String(u.id),
            name: String(u.name || ''),
            variant: String(u.variant || ''),
            bedrooms: Number(u.bedrooms) || 0,
            bathrooms: Number(u.bathrooms) || 0,
            sizeMin: u.size_min != null ? String(u.size_min) : '',
            sizeMax: u.size_max != null ? String(u.size_max) : '',
            sizeUnit: String(u.size_unit || 'sqm'),
            priceMin: u.price_min != null ? String(u.price_min) : '',
            priceMax: u.price_max != null ? String(u.price_max) : '',
            currency: String(u.currency || 'KES'),
            hasDsq: Boolean(u.has_dsq),
            availableUnits: u.available_units != null ? String(u.available_units) : '',
          }))
        : [makeUnitType()],
      paymentPlan: {
        depositPercent: String((data.payment_plan as { deposit_percent?: number })?.deposit_percent ?? ''),
        installments: String((data.payment_plan as { installments?: string })?.installments ?? ''),
      },
      tenure: data.tenure || '',
      serviceCharge: data.service_charge != null ? String(data.service_charge) : '',
      councilTaxBand: data.council_tax_band || '',
      groundRent: data.ground_rent || '',
      groundRentReview: data.ground_rent_review || '',
      leaseLength: data.lease_length || '',
      waterSupply: data.water_supply || '',
      electricity: data.electricity || '',
      heating: data.heating || '',
      sewerage: data.sewerage || '',
      broadband: data.broadband || '',
      broadbandSpeed: data.broadband_speed || '',
      mobileCoverage: data.mobile_coverage || '',
      parkingNotes: data.parking_notes || '',
      sourceName: data.source_name || '',
      sourceUrl: data.source_url || '',
      sourcePoster: data.source_poster || '',
      dateSourced: data.date_sourced || '',
      ownerName: data.owner_name || '',
      ownerPhone: data.owner_phone || '',
      ownerEmail: data.owner_email || '',
      ownerRole: data.owner_role || '',
      sourceContactId: data.source_contact_id ? String(data.source_contact_id) : '',
      caretakerName: data.caretaker_name || '',
      caretakerPhone: data.caretaker_phone || '',
      caretakerRole: data.caretaker_role || '',
      sourceNotes: data.source_notes || '',
      coListingAgents: parseCoListingAgents(data.co_listing_agents),
      agentIds: Array.isArray(data.agent_ids) ? data.agent_ids : [],
      developerProjects: Array.isArray(data.developer_projects)
        ? data.developer_projects.map((p: Record<string, unknown>) => ({
            id: String(p.id || makeDeveloperProject().id),
            project_name: String(p.project_name || ''),
            property_address: String(p.property_address || ''),
            area_location: String(p.area_location || ''),
            contact_name: String(p.contact_name || ''),
            contact_phone: String(p.contact_phone || ''),
            contact_email: String(p.contact_email || ''),
            contact_address: String(p.contact_address || ''),
          }))
        : [],
      commissionTracking: data.commission_tracking || '',
      negotiationNotes: data.negotiation_notes || '',
      availabilityReality: data.availability_reality || '',
    });
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (isEdit) fetchDevelopment();
    else setLoading(false);
  }, [isEdit, fetchDevelopment]);

  const buildDevPayload = (publish: boolean) => {
    return {
      title: form.title,
      project_name: form.projectName,
      slug: form.slug || generateSlug(form.title),
      description: form.description,
      location: form.location,
      neighbourhood: form.neighbourhood,
      address: form.address,
      city: form.city,
      country: form.country,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      property_type: form.propertyType.toLowerCase().replace(/\s+/g, '_'),
      property_category: 'new_development',
      development_status: form.developmentStatus,
      completion_start_year: form.completionStartYear ? Number(form.completionStartYear) : null,
      completion_end_year: form.completionEndYear ? Number(form.completionEndYear) : null,
      completion_date:
        form.completionStartYear || form.completionEndYear
          ? `${form.completionStartYear || '—'}-${form.completionEndYear || '—'}`
          : '',
      floors: form.floors,
      total_units: form.totalUnits,
      developer_name: form.developerName,
      developer_phone: form.developerPhone,
      developer_email: form.developerEmail,
      amenities: form.amenities,
      main_image: form.mainImage,
      cover_image: form.coverImage,
      gallery: form.gallery,
      floor_plans: form.floorPlans,
      video_url: form.videoUrl,
      payment_plan: {
        deposit_percent: form.paymentPlan.depositPercent ? Number(form.paymentPlan.depositPercent) : null,
        installments: form.paymentPlan.installments,
      },
      tenure: form.tenure,
      service_charge: form.serviceCharge ? Number(form.serviceCharge) : null,
      council_tax_band: form.councilTaxBand,
      ground_rent: form.groundRent,
      ground_rent_review: form.groundRentReview,
      lease_length: form.leaseLength,
      water_supply: form.waterSupply,
      electricity: form.electricity,
      heating: form.heating,
      sewerage: form.sewerage,
      broadband: form.broadband,
      broadband_speed: form.broadbandSpeed,
      mobile_coverage: form.mobileCoverage,
      parking_notes: form.parkingNotes,
      price: Number(form.price) || 0,
      currency: form.currency,
      baths: form.baths,
      parking: form.parking,
      marketing_type: form.marketingType,
      units_sold: form.unitsSold,
      units_reserved: form.unitsReserved,
      units_rented: form.unitsRented,
      units_occupied: form.unitsOccupied,
      current_price: form.currentPrice ? Number(form.currentPrice) : 0,
      previous_price: form.previousPrice ? Number(form.previousPrice) : 0,
      show_units_remaining: form.showUnitsRemaining,
      show_percent_sold: form.showPercentSold,
      show_percent_rented: form.showPercentRented,
      show_developer_name: form.showDeveloperName,
      show_urgency_message: form.showUrgencyMessage,
      units_remaining_override: form.unitsRemaining ? Number(form.unitsRemaining) : null,
      is_published: publish,
      is_featured: form.isFeatured,
      seo_title: form.seoTitle,
      seo_description: form.seoDescription,
      source_name: form.sourceName,
      source_url: form.sourceUrl,
      source_poster: form.sourcePoster,
      date_sourced: form.dateSourced,
      owner_name: form.ownerName,
      owner_phone: form.ownerPhone,
      owner_email: form.ownerEmail,
      owner_role: form.ownerRole,
      source_contact_id: form.sourceContactId || null,
      caretaker_name: form.caretakerName,
      caretaker_phone: form.caretakerPhone,
      caretaker_role: form.caretakerRole,
      source_notes: form.sourceNotes,
      co_listing_agents: toCoListingAgentsPayload(form.coListingAgents),
      // An agent's development is ALWAYS owned by that agent — ownership is
      // derived from the authenticated profile, never chosen in the form.
      agent_ids: isAgent ? (agentId ? [agentId] : null) : (form.agentIds.length ? form.agentIds : null),
      agent_id: isAgent ? (agentId || null) : (form.agentIds[0] || null),
      developer_projects: form.developerProjects,
      commission_tracking: form.commissionTracking,
      negotiation_notes: form.negotiationNotes,
      availability_reality: form.availabilityReality,
      updated_at: new Date().toISOString(),
    };
  };

  const buildUnitPayload = (devId: string, u: UnitType) => ({
    development_id: devId,
    name: u.name,
    variant: u.variant,
    bedrooms: u.bedrooms,
    bathrooms: u.bathrooms,
    size_min: u.sizeMin ? Number(u.sizeMin) : null,
    size_max: u.sizeMax ? Number(u.sizeMax) : null,
    size_unit: u.sizeUnit,
    price_min: u.priceMin ? Number(u.priceMin) : null,
    price_max: u.priceMax ? Number(u.priceMax) : null,
    currency: u.currency,
    has_dsq: u.hasDsq,
    available_units: u.availableUnits ? Number(u.availableUnits) : null,
    sort_order: 0,
  });

  const validate = (publish: boolean): string[] => {
    const errors: string[] = [];
    if (!form.title.trim()) errors.push('Development name is required');
    if (!form.location.trim() && !form.address.trim()) errors.push('Location / Address is required');
    if (form.unitTypes.length === 0 || form.unitTypes.every((u) => !u.name.trim())) errors.push('Add at least one unit type');
    if (publish && form.gallery.length === 0) errors.push('Add at least one photo');
    return errors;
  };

  const handleSave = async (publish: boolean) => {
    const errors = validate(publish);
    if (errors.length > 0) {
      addToast(errors.join(' · '), 'error');
      if (errors.some((e) => e.includes('unit type'))) setMissingUnits(true);
      return;
    }
    setSaving(true);
    try {
      // Unified Source & Continuity: resolve/link the source contact first so the
      // Source/Owner → CRM Contact → Listing link survives draft/save/edit/reload.
      const resolvedContactId = await resolveSourceContact({
        contactId: form.sourceContactId || null,
        name: form.ownerName,
        email: form.ownerEmail,
        phone: form.ownerPhone,
        type: 'seller',
        source: form.sourceName,
      });
      if (resolvedContactId) setForm((prev) => ({ ...prev, sourceContactId: resolvedContactId }));

      const payload = buildDevPayload(publish);
      if (resolvedContactId) payload.source_contact_id = resolvedContactId;
      let devId = id || '';
      if (isEdit && id) {
        const { error } = await supabase.from('developments').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('developments').insert(payload).select('id').single();
        if (error) throw error;
        devId = data.id;
      }

      // Replace unit types for this development
      const validUnits = form.unitTypes.filter((u) => u.name.trim());
      await supabase.from('unit_types').delete().eq('development_id', devId);
      if (validUnits.length > 0) {
        const rows = validUnits.map((u) => buildUnitPayload(devId, u));
        const { error: unitErr } = await supabase.from('unit_types').insert(rows);
        if (unitErr) throw unitErr;
      }

      addToast(publish ? 'Development published' : 'Development saved', 'success');
      broadcastSync();
      if (publish) {
        setIsPublishedState(true);
        setPublishSuccess({ title: form.title, slug: form.slug || generateSlug(form.title), id: devId });
      } else if (!isEdit) {
        navigate(`${portalBase}/developments/edit/${devId}`, { replace: true });
      }
    } catch (err: any) {
      console.error('Development save error:', err);
      addToast(`Failed to save: ${err?.message || 'Something went wrong'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // local helper for publish flag state mirror
  const setFormFlag = (flag: 'isPublished' | 'isFeatured', val: boolean) => update({ [flag]: val } as Partial<DevelopmentFormState>);
  const setIsPublishedState = (val: boolean) => setFormFlag('isPublished', val);
  const setIsFeaturedState = (val: boolean) => setFormFlag('isFeatured', val);

  const currentStep = STEPS[activeStep];
  const progressPct = Math.round(((activeStep + 1) / STEPS.length) * 100);

  useEffect(() => {
    // reset missingUnits highlight when user adds valid unit
    if (form.unitTypes.some((u) => u.name.trim())) setMissingUnits(false);
  }, [form.unitTypes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="ri-loader-4-line text-3xl animate-spin text-[#0d1f2d]" />
      </div>
    );
  }

  const stepDone = (id: string): boolean => {
    switch (id) {
      case 'basics':
        return !!form.title.trim() && (!!form.location.trim() || !!form.address.trim());
      case 'units':
        return form.unitTypes.some((u) => u.name.trim());
      case 'amenities':
        return form.amenities.length > 0;
      case 'pricing':
        return !!form.price.trim() || !!form.paymentPlan.depositPercent;
      case 'media':
        return form.gallery.length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="flex flex-1">
      {/* Sidebar */}
      <aside className="hidden sm:flex w-72 shrink-0 bg-white border-r border-[#e2e6ea] sticky top-[105px] self-start h-[calc(100vh-105px)] overflow-y-auto flex-col">
        <div className="px-7 pt-7 pb-6 border-b border-[#e2e6ea]">
          <p className="text-[11px] uppercase tracking-[0.15em] text-[#9ba5b1] mb-2 font-medium">Development Form</p>
          <h2 className="text-[17px] font-semibold text-[#0d1f2d] leading-snug">
            {isEdit ? 'Edit Development' : 'New Development'}
          </h2>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide bg-[#0d1f2d] text-white">New Development</span>
            <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide ${form.isPublished ? 'bg-[#0d5959] text-white' : 'bg-[#f4f6f8] text-[#4a5568]'}`}>
              {form.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>
        <nav className="flex-1 py-3">
          {STEPS.map((step, index) => {
            const isActive = index === activeStep;
            const isDone = stepDone(step.id);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(index)}
                className={`w-full text-left px-7 py-4 flex items-center gap-4 transition-all relative cursor-pointer ${isActive ? 'bg-[#f7fafa]' : 'hover:bg-[#fafbfc]'}`}
              >
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#001731] rounded-r-full" />}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold transition-all ${
                  isActive ? 'bg-[#001731] text-white ring-2 ring-[#001731]/20' : isDone ? 'bg-[#001731] text-white' : index < activeStep ? 'bg-[#e7edf4] text-[#001731]' : 'bg-[#f0f3f6] text-[#9ba5b1]'
                }`}>
                  {isDone && !isActive ? <i className="ri-check-line text-sm font-bold" /> : <span>{index + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[16px] font-semibold leading-tight transition-colors ${isActive ? 'text-[#0d1f2d]' : isDone ? 'text-[#0d5959]' : 'text-[#374151]'}`}>{step.label}</p>
                  <p className={`text-[12px] mt-0.5 leading-tight ${isActive ? 'text-[#0d5959]' : 'text-[#9ba5b1]'}`}>{step.desc}</p>
                </div>
              </button>
            );
          })}
        </nav>
        <div className="px-7 py-5 border-t border-[#e2e6ea]">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[16px] text-[#4a5568] font-medium">Progress</p>
            <p className="text-[13px] font-bold text-[#0d5959]">{progressPct}%</p>
          </div>
          <div className="h-1.5 bg-[#f0f3f6] rounded-full overflow-hidden">
            <div className="h-full bg-[#0d5959] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-[12px] text-[#9ba5b1] mt-2">Step {activeStep + 1} of {STEPS.length}</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pb-24 sm:pb-0">
        <div className="hidden sm:flex bg-[#001731] border-l-2 border-[#d3bb6e] px-10 py-7 items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#d3bb6e] mb-1.5 font-semibold">{currentStep.desc}</p>
            <h1 className="text-2xl font-prata text-white tracking-tight">{currentStep.label}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-[12px] uppercase tracking-widest text-white font-bold border-2 border-white rounded-md hover:bg-white hover:text-[#0d1f2d] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40"
            >
              {saving ? <i className="ri-loader-4-line animate-spin text-sm" /> : <i className="ri-save-line text-sm" />}
              Save Draft
            </button>
            <p className="text-[13px] font-medium">
              <span className="text-[#d3bb6e] font-bold">{activeStep + 1}</span>
              <span className="text-white/60"> / {STEPS.length}</span>
            </p>
          </div>
        </div>

        <div className="sm:hidden bg-white border-b border-[#e8edf2] px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0d1f2d]/5 text-[#0d1f2d]">
            <i className="ri-building-2-line text-sm" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0d1f2d]">{currentStep.label}</p>
            <p className="text-[11px] text-[#7a8a99]">{currentStep.desc}</p>
          </div>
          <div className="ml-auto text-[11px] text-[#7a8a99] font-medium">{activeStep + 1}/{STEPS.length}</div>
        </div>

        <div className="px-4 sm:px-10 py-4 sm:py-10">
          <div className="bg-white border border-[#d1d5db] p-4 sm:p-8">
            {currentStep.id === 'basics' && (
              <DevelopmentBasicsStep form={form} update={update} />
            )}
            {currentStep.id === 'units' && (
              <UnitTypesStep form={form} update={update} updateUnit={updateUnit} addUnit={addUnit} removeUnit={removeUnit} missingUnits={missingUnits} />
            )}
            {currentStep.id === 'amenities' && (
              <DevelopmentAmenitiesStep form={form} update={update} />
            )}
            {currentStep.id === 'pricing' && (
              <DevelopmentPricingStep form={form} update={update} />
            )}
            {currentStep.id === 'keyinfo' && (
              <DevelopmentKeyInfoStep form={form} update={update} />
            )}
            {currentStep.id === 'internal' && (
              <DevelopmentInternalStep form={form} update={update} />
            )}
            {currentStep.id === 'media' && (
              <DevelopmentMediaStep form={form} update={update} uploading={uploading} setUploading={setUploading} id={id} />
            )}
            {currentStep.id === 'publish' && (
              <DevelopmentPublishStep form={form} update={update} isEdit={isEdit} saving={saving} onSave={handleSave} agents={agents} />
            )}
          </div>

          {/* Bottom nav */}
          <div className="hidden sm:flex mt-6 items-center justify-between w-full bg-[#0d1f2d] px-6 py-4 rounded-xl">
            <div>
              {activeStep > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                  className="flex items-center gap-2 px-5 py-3 text-[13px] uppercase tracking-widest text-white font-bold cursor-pointer whitespace-nowrap transition-colors border-2 border-white rounded-md hover:bg-white hover:text-[#0d1f2d]"
                >
                  <i className="ri-arrow-left-line" /> Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeStep < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep(activeStep + 1)}
                  disabled={saving}
                  className="flex items-center gap-2 px-8 py-3 text-[13px] uppercase tracking-widest bg-[#0d5959] text-white font-semibold cursor-pointer whitespace-nowrap transition-colors hover:bg-[#0e6b6b] rounded-md disabled:opacity-60"
                >
                  Next <i className="ri-arrow-right-line" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="flex items-center gap-2 px-8 py-3 text-[13px] uppercase tracking-widest bg-[#0d5959] text-white font-semibold cursor-pointer disabled:opacity-50 whitespace-nowrap transition-colors hover:bg-[#094545] rounded-md"
                >
                  {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-send-plane-line" />}
                  {form.isPublished ? 'Update & Publish' : 'Save & Publish'}
                </button>
              )}
            </div>
          </div>

          <div className="sm:hidden mt-6 flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs uppercase tracking-widest border border-[#0d5959] text-[#0d5959] font-medium cursor-pointer disabled:opacity-40 whitespace-nowrap rounded-md"
            >
              <i className="ri-arrow-left-line text-sm" /> Back
            </button>
            <button
              type="button"
              onClick={() => activeStep < STEPS.length - 1 ? setActiveStep(activeStep + 1) : handleSave(true)}
              disabled={saving}
              className="flex items-center gap-1.5 px-6 py-2.5 text-xs uppercase tracking-widest bg-[#0d5959] text-white font-medium cursor-pointer disabled:opacity-50 whitespace-nowrap rounded-md"
            >
              {saving ? <i className="ri-loader-4-line animate-spin text-sm" /> : activeStep < STEPS.length - 1 ? <>Next <i className="ri-arrow-right-line text-sm" /></> : 'Publish'}
            </button>
          </div>
        </div>
      </main>

      {publishSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0d1f2d]/60 backdrop-blur-sm" onClick={() => setPublishSuccess(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-5 flex items-center justify-center rounded-full bg-[#0d5959]/10">
              <i className="ri-checkbox-circle-fill text-4xl text-[#0d5959]" />
            </div>
            <h2 className="text-2xl font-prata text-[#0d1f2d] mb-2">Development Published!</h2>
            <p className="text-base text-[#4a5568] mb-6">
              <span className="font-semibold text-[#0d1f2d]">{smartTitleCase(publishSuccess.title)}</span> is now live.
            </p>
            <div className="space-y-3">
              <Link
                to={`/new-developments`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-5 py-3 text-sm font-semibold text-white bg-[#0d5959] rounded-lg hover:bg-[#0a4545] transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-eye-line" /> View New Developments
              </Link>
              <Link
                to={`${portalBase}/developments`}
                className="flex items-center justify-center gap-2 w-full px-5 py-3 text-sm font-semibold text-[#0d1f2d] border-2 border-[#0d1f2d] rounded-lg hover:bg-[#0d1f2d] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-list-check-2" /> Back to Developments
              </Link>
              <button
                type="button"
                onClick={() => setPublishSuccess(null)}
                className="flex items-center justify-center gap-2 w-full px-5 py-3 text-sm font-medium text-[#4a5568] hover:text-[#0d5959] transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-edit-line" /> Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* For build safety, keep refs referenced */}
      <span className="hidden">{String(stepRefs.current)}</span>
    </div>
  );
}