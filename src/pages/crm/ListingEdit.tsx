import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, uploadImageViaEdgeFunction } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import { STEPS, COLORS, PURPOSES, PURPOSE_LABELS, Agent, DocumentFile, CustomField, generateSlug, getSteps, LAND_TITLE_TYPES } from './components/ListingEdit/types';
import DescriptionStep from './components/ListingEdit/DescriptionStep';
import MediaStep from './components/ListingEdit/MediaStep';
import DetailsStep from './components/ListingEdit/DetailsStep';
import LocationStep from './components/ListingEdit/LocationStep';
import FeaturesStep from './components/ListingEdit/FeaturesStep';
import AttachmentsStep from './components/ListingEdit/AttachmentsStep';
import SettingsStep from './components/ListingEdit/SettingsStep';
import SummaryStep from './components/ListingEdit/SummaryStep';

export default function ListingEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [uploading, setUploading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Core form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [neighbourhood, setNeighbourhood] = useState('');
  const [propertyType, setPropertyType] = useState('house');
  const [subType, setSubType] = useState('');
  const [purpose, setPurpose] = useState<'sale' | 'rent' | 'joint_ventures' | 'new_development' | 'short_stay' | 'sold' | 'rented'>('sale');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [parking, setParking] = useState(0);
  const [size, setSize] = useState('');
  const [landSize, setLandSize] = useState('');
  const [acreage, setAcreage] = useState('');
  const [landTitle, setLandTitle] = useState('');
  const [sqft, setSqft] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [features, setFeatures] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [floorPlans, setFloorPlans] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [virtualTourUrl, setVirtualTourUrl] = useState('');
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [agentId, setAgentId] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isHomepage, setIsHomepage] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  // Extended state
  const [priceUgx, setPriceUgx] = useState('');
  const [autoExchange, setAutoExchange] = useState(false);
  const [pricePrefix, setPricePrefix] = useState('');
  const [pricePostfix, setPricePostfix] = useState('');
  const [secondPrice, setSecondPrice] = useState('');
  const [propertyLabel, setPropertyLabel] = useState('');
  const [serviceCharge, setServiceCharge] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('');
  const [sizeUnit, setSizeUnit] = useState('sqm');
  const [landUnit, setLandUnit] = useState('sqm');
  const [garages, setGarages] = useState(0);
  const [garageSize, setGarageSize] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [rooms, setRooms] = useState(0);
  const [propertyId, setPropertyId] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [stateRegion, setStateRegion] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [customFeatures, setCustomFeatures] = useState<string[]>([]);
  const [ownerContact, setOwnerContact] = useState('');
  const [commissionTracking, setCommissionTracking] = useState('');
  const [leadAssignment, setLeadAssignment] = useState('');
  const [privateListing, setPrivateListing] = useState(false);
  const [stickyListing, setStickyListing] = useState(false);
  const [includeSearch, setIncludeSearch] = useState(true);
  const [includeFeatured, setIncludeFeatured] = useState(false);
  const [featuredNeighborhood, setFeaturedNeighborhood] = useState(false);

  // Final state
  const [featuredNewDevelopment, setFeaturedNewDevelopment] = useState(false);
  const [priorityRanking, setPriorityRanking] = useState('');
  const [autoSEO, setAutoSEO] = useState(false);
  const [openGraphImage, setOpenGraphImage] = useState('');
  const [interiorFinish, setInteriorFinish] = useState('');
  const [flooringType, setFlooringType] = useState('');
  const [ceilingHeight, setCeilingHeight] = useState('');
  const [waterSupply, setWaterSupply] = useState('');
  const [constructionType, setConstructionType] = useState('');
  const [completionDate, setCompletionDate] = useState('');

  const tabParam = searchParams.get('tab');
  useEffect(() => {
    if (tabParam === 'media') setActiveStep(1);
  }, [tabParam]);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    const { data } = await supabase.from('agents').select('id, name, title').order('name');
    setAgents(data || []);
  }, []);

  // Fetch listing
  const fetchListing = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase.from('listings').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      addToast('Failed to load property', 'error');
      setLoading(false);
      return;
    }
    setTitle(data.title || '');
    setSlug(data.slug || '');
    setDescription(data.description || '');
    setLocation(data.location || '');
    setNeighbourhood(data.neighbourhood || '');
    setPropertyType(data.property_type || 'house');
    setSubType(data.sub_type || '');
    // Normalize purpose: all values are now valid standalone purposes
    const rawPurpose = data.purpose || 'sale';
    setPurpose(rawPurpose as typeof purpose);
    setPrice(data.price ? String(data.price) : '');
    setCurrency(data.currency || 'USD');
    setBedrooms(data.bedrooms || 0);
    setBathrooms(data.bathrooms || 0);
    setParking(data.parking || 0);
    setSize(data.size ? String(data.size) : '');
    setLandSize(data.land_size ? String(data.land_size) : '');
    setAcreage(data.acreage ? String(data.acreage) : '');
    setLandTitle(data.land_title || '');
    setSqft(data.sqft ? String(data.sqft) : '');
    setAmenities(data.amenities || []);
    setCustomFeatures(data.custom_features || []);
    setFeatures(data.features ? JSON.stringify(data.features) : '');
    setImages(data.images || []);
    setMainImage(data.main_image || '');
    setCoverImage(data.cover_image || '');
    setFloorPlans(data.floor_plans || []);
    setVideoUrl(data.video_url || '');
    setVirtualTourUrl(data.virtual_tour_url || '');
    setDocuments(data.documents || []);
    setAddress(data.address || '');
    setCity(data.city || '');
    setCountry(data.country || 'Kenya');
    setLatitude(data.latitude ? String(data.latitude) : '');
    setLongitude(data.longitude ? String(data.longitude) : '');
    setAgentId(data.agent_id || '');
    setSeoTitle(data.seo_title || '');
    setSeoDescription(data.seo_description || '');
    setIsPublished(data.is_published || false);
    setIsPending(data.is_pending || false);
    setIsFeatured(data.is_featured || false);
    setIsHomepage(data.is_homepage || false);
    setOwnerName(data.owner_name || '');
    setOwnerPhone(data.owner_phone || '');
    setOwnerEmail(data.owner_email || '');
    // Extended
    setPriceUgx(data.price_ugx ? String(data.price_ugx) : '');
    setAutoExchange(data.auto_exchange || false);
    setPricePrefix(data.price_prefix || '');
    setPricePostfix(data.price_postfix || '');
    setSecondPrice(data.second_price ? String(data.second_price) : '');
    setPropertyLabel(data.property_label || '');
    setServiceCharge(data.service_charge ? String(data.service_charge) : '');
    setAvailabilityStatus(data.availability_status || '');
    setSizeUnit(data.size_unit || 'sqm');
    setLandUnit(data.land_unit || 'sqm');
    setGarages(data.garages || 0);
    setGarageSize(data.garage_size || '');
    setYearBuilt(data.year_built ? String(data.year_built) : '');
    setRooms(data.rooms || 0);
    setPropertyId(data.property_id || '');
    setCustomFields(data.custom_fields || []);
    setStateRegion(data.state_region || '');
    setZipCode(data.zip_code || '');
    setOwnerContact(data.owner_contact || '');
    setCommissionTracking(data.commission_tracking ? String(data.commission_tracking) : '');
    setLeadAssignment(data.lead_assignment || '');
    setPrivateListing(data.private_listing || false);
    setStickyListing(data.sticky_listing || false);
    setIncludeSearch(data.include_search !== false);
    setIncludeFeatured(data.include_featured || false);
    setFeaturedNeighborhood(data.featured_neighborhood || false);
    // Final
    setFeaturedNewDevelopment(data.featured_new_development || false);
    setPriorityRanking(data.priority_ranking ? String(data.priority_ranking) : '');
    setAutoSEO(data.auto_seo || false);
    setOpenGraphImage(data.open_graph_image || '');
    setInteriorFinish(data.interior_finish || '');
    setFlooringType(data.flooring_type || '');
    setCeilingHeight(data.ceiling_height || '');
    setWaterSupply(data.water_supply || '');
    setConstructionType(data.construction_type || '');
    setCompletionDate(data.completion_date || '');
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAgents();
    if (isEdit) fetchListing();
    else setLoading(false);
  }, [fetchAgents, fetchListing, isEdit]);

  const buildPayload = (publish = false) => {
    let parsedFeatures: unknown[] = [];
    if (features && features.trim()) {
      try { parsedFeatures = JSON.parse(features); } catch { /* ignore invalid JSON */ }
    }
    return {
      title,
      slug: slug || generateSlug(title),
      location,
      neighbourhood,
      property_type: propertyType,
      sub_type: subType,
      purpose,
      status: 'available',
      price: Number(price) || 0,
      price_ugx: Number(priceUgx) || null,
      auto_exchange: autoExchange,
      price_prefix: pricePrefix,
      price_postfix: pricePostfix,
      second_price: Number(secondPrice) || null,
      property_label: propertyLabel,
      service_charge: Number(serviceCharge) || null,
      availability_status: availabilityStatus,
      currency,
      bedrooms,
      bathrooms,
      parking,
      garages,
      garage_size: garageSize,
      rooms,
      year_built: yearBuilt ? Number(yearBuilt) : null,
      size: size ? Number(size) : null,
      size_unit: sizeUnit,
      land_size: landSize ? Number(landSize) : null,
      land_unit: landUnit,
      acreage: acreage ? Number(acreage) : null,
      land_title: landTitle || null,
      sqft: sqft ? Number(sqft) : null,
      description,
      amenities,
      custom_features: customFeatures,
      features: parsedFeatures,
      custom_fields: customFields,
      images,
      main_image: mainImage,
      cover_image: coverImage,
      floor_plans: floorPlans,
      video_url: videoUrl,
      virtual_tour_url: virtualTourUrl,
      documents,
      address,
      city,
      country,
      state_region: stateRegion,
      zip_code: zipCode,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      agent_id: agentId || null,
      seo_title: seoTitle,
      seo_description: seoDescription,
      is_published: publish,
      is_pending: !publish && isPending,
      is_featured: isFeatured,
      is_homepage: isHomepage,
      include_search: includeSearch,
      include_featured: includeFeatured,
      private_listing: privateListing,
      sticky_listing: stickyListing,
      featured_neighborhood: featuredNeighborhood,
      owner_name: ownerName,
      owner_phone: ownerPhone,
      owner_email: ownerEmail,
      owner_contact: ownerContact,
      commission_tracking: commissionTracking ? Number(commissionTracking) : null,
      lead_assignment: leadAssignment,
      property_id: propertyId,
      // Final fields
      featured_new_development: featuredNewDevelopment,
      priority_ranking: priorityRanking ? Number(priorityRanking) : null,
      auto_seo: autoSEO,
      open_graph_image: openGraphImage,
      interior_finish: interiorFinish,
      flooring_type: flooringType,
      ceiling_height: ceilingHeight,
      water_supply: waterSupply,
      construction_type: constructionType,
      completion_date: completionDate,
    };
  };

  const handleSave = async (publish = false) => {
    setSaving(true);
    try {
      const payload = buildPayload(publish);
      if (isEdit && id) {
        const { error } = await supabase.from('listings').update(payload).eq('id', id);
        if (error) {
          console.error('Save error:', error);
          addToast(`Failed to save: ${error.message}`, 'error');
        } else {
          addToast(publish ? 'Property published' : 'Property saved', 'success');
          broadcastSync();
          if (publish) { setIsPublished(true); setIsPending(false); }
        }
      } else {
        const { data, error } = await supabase.from('listings').insert(payload).select('id').single();
        if (error) {
          console.error('Create error:', error);
          addToast(`Failed to create: ${error.message}`, 'error');
        } else {
          addToast('Property created', 'success');
          broadcastSync();
          navigate(`/crm/listings/edit/${data.id}`, { replace: true });
        }
      }
    } catch (err: any) {
      console.error('Save exception:', err);
      addToast(`Error: ${err?.message || 'Something went wrong'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Auto-save draft
  useEffect(() => {
    if (!isEdit || isPublished) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus('Saving...');
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const payload = buildPayload(false);
        const { error } = await supabase.from('listings').update(payload).eq('id', id);
        if (!error) {
          setAutoSaveStatus('Saved');
          setTimeout(() => setAutoSaveStatus(''), 2000);
        } else {
          setAutoSaveStatus('');
        }
      } catch {
        setAutoSaveStatus('');
      }
    }, 3000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [title, description, location, price, bedrooms, bathrooms, amenities, images, address, seoTitle, seoDescription, agentId, isFeatured, isHomepage, isPending, priceUgx, autoExchange, customFields, customFeatures, documents, stateRegion, zipCode, ownerContact, leadAssignment, privateListing, stickyListing, includeSearch, includeFeatured, featuredNeighborhood, featuredNewDevelopment, priorityRanking, autoSEO, openGraphImage, interiorFinish, flooringType, ceilingHeight, waterSupply, constructionType, completionDate]);

  const getStatusLabel = () => {
    if (isPublished) return 'Published';
    if (isPending) return 'Pending Review';
    return 'Draft';
  };

  const getStatusBadgeClass = () => {
    if (isPublished) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (isPending) return 'bg-amber-50 text-amber-700 border border-amber-200';
    return 'bg-gray-100 text-gray-600 border border-gray-200';
  };

  const getAgentName = () => {
    const agent = agents.find((a) => a.id === agentId);
    return agent ? agent.name : 'Unassigned';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="ri-loader-4-line text-3xl animate-spin" style={{ color: COLORS.navy }} />
      </div>
    );
  }

  const currentSteps = getSteps(propertyType);

  const getStepStatus = (index: number) => {
    if (index === activeStep) return 'active';
    if (index < activeStep) return 'completed';
    return 'pending';
  };

  return (
    <div className="space-y-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sub-navigation Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/crm/listings')} className="flex items-center gap-1 text-sm font-medium transition-colors cursor-pointer hover:underline" style={{ color: COLORS.gray }}>
            <i className="ri-arrow-left-s-line text-lg" /> LISTINGS
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <div>
            <h1 className="text-sm font-bold" style={{ color: COLORS.navy }}>{isEdit ? 'EDIT LISTING' : 'NEW LISTING'}</h1>
            <p className="text-xs font-medium" style={{ color: COLORS.gray }}>{title || 'Untitled Draft'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleSave(false)} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer hover:bg-gray-50 whitespace-nowrap" style={{ borderColor: COLORS.border, color: COLORS.gray }}>
            {saving && !isPublished ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-save-line" />}
            Save later
          </button>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass()}`}>
            {getStatusLabel()}
          </span>
        </div>
      </div>

      {/* Auto-save hint */}
      <p className="text-xs italic" style={{ color: COLORS.gray }}>
        Draft auto-saves as you type {autoSaveStatus && <span className="text-emerald-600 font-medium">&middot; {autoSaveStatus}</span>}
      </p>

      {/* Quick Set Tags */}
      <div className="flex items-center gap-2 flex-wrap">
        {PURPOSES.map((p) => (
          <button key={p} onClick={() => { setPurpose(p); setSubType(''); }} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap" style={purpose === p ? { backgroundColor: COLORS.navy, color: 'white' } : { backgroundColor: 'white', border: `1px solid ${COLORS.border}`, color: COLORS.gray }}>
            <i className="ri-price-tag-3-line" /> {PURPOSE_LABELS[p]}
          </button>
        ))}
        <button onClick={() => setIsFeatured(!isFeatured)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap" style={isFeatured ? { backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fcd34d' } : { backgroundColor: 'white', border: `1px solid ${COLORS.border}`, color: COLORS.gray }}>
          <i className={isFeatured ? 'ri-star-fill text-amber-500' : 'ri-star-line'} /> Mark Featured
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left Panel — Step Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border p-4 sticky top-4" style={{ borderColor: COLORS.border }}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: COLORS.gray }}>Steps</h3>
            <div className="space-y-1">
              {currentSteps.map((step, index) => {
                const status = getStepStatus(index);
                return (
                  <button key={step.id} onClick={() => setActiveStep(index)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all cursor-pointer" style={status === 'active' ? { backgroundColor: '#f0f9ff', borderLeft: `3px solid ${COLORS.navy}`, color: COLORS.navy } : status === 'completed' ? { color: COLORS.navy } : { color: COLORS.gray }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={status === 'active' ? { backgroundColor: COLORS.navy, color: 'white' } : status === 'completed' ? { backgroundColor: COLORS.green, color: 'white' } : { backgroundColor: '#f3f4f6', color: COLORS.gray }}>
                      {status === 'completed' ? <i className="ri-check-line" /> : index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{step.label}</p>
                      <p className="text-xs truncate" style={{ color: COLORS.gray }}>{step.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: COLORS.border }}>
              <button onClick={() => handleSave(false)} disabled={saving} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer hover:bg-gray-50" style={{ borderColor: COLORS.border, color: COLORS.gray }}>
                {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-save-line" />}
                Save
              </button>
              <button onClick={() => handleSave(true)} disabled={saving} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 hover:opacity-90" style={{ backgroundColor: COLORS.navy }}>
                {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-send-plane-line" />}
                {isPublished ? 'Update & Publish' : 'Save & Publish'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel — Active Step Content */}
        <div className="lg:col-span-3 space-y-5">
          {/* Step Hero Card */}
          <div className="rounded-lg p-5 flex items-center justify-between" style={{ backgroundColor: COLORS.navy }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">{STEPS[activeStep].label.toUpperCase()}</p>
              <h2 className="text-xl font-bold text-white mt-0.5">{currentSteps[activeStep].label}</h2>
              <p className="text-xs text-white/50 mt-0.5">{currentSteps[activeStep].desc}</p>
            </div>
            <div className="text-white/40 text-sm font-medium">{activeStep + 1} / {currentSteps.length}</div>
          </div>

          {/* Step Content */}
          {activeStep === 0 && (
            <DescriptionStep
              title={title} setTitle={setTitle} slug={slug} setSlug={setSlug}
              description={description} setDescription={setDescription}
              propertyType={propertyType} setPropertyType={setPropertyType}
              subType={subType} setSubType={setSubType}
              purpose={purpose} setPurpose={setPurpose}
              isEdit={isEdit}
            />
          )}
          {activeStep === 1 && (
            <MediaStep
              images={images} setImages={setImages} mainImage={mainImage} setMainImage={setMainImage}
              coverImage={coverImage} setCoverImage={setCoverImage} floorPlans={floorPlans} setFloorPlans={setFloorPlans}
              videoUrl={videoUrl} setVideoUrl={setVideoUrl} virtualTourUrl={virtualTourUrl} setVirtualTourUrl={setVirtualTourUrl}
              uploading={uploading} setUploading={setUploading} id={id} uploadImageViaEdgeFunction={uploadImageViaEdgeFunction}
              propertyType={propertyType}
            />
          )}
          {activeStep === 2 && (
            <DetailsStep
              price={price} setPrice={setPrice} currency={currency} setCurrency={setCurrency}
              size={size} setSize={setSize} landSize={landSize} setLandSize={setLandSize}
              acreage={acreage} setAcreage={setAcreage} landTitle={landTitle} setLandTitle={setLandTitle}
              sqft={sqft} setSqft={setSqft} parking={parking} setParking={setParking}
              bedrooms={bedrooms} setBedrooms={setBedrooms} bathrooms={bathrooms} setBathrooms={setBathrooms}
              isPublished={isPublished} setIsPublished={setIsPublished} isPending={isPending} setIsPending={setIsPending}
              priceUgx={priceUgx} setPriceUgx={setPriceUgx} autoExchange={autoExchange} setAutoExchange={setAutoExchange}
              pricePrefix={pricePrefix} setPricePrefix={setPricePrefix} pricePostfix={pricePostfix} setPricePostfix={setPricePostfix}
              secondPrice={secondPrice} setSecondPrice={setSecondPrice} propertyLabel={propertyLabel} setPropertyLabel={setPropertyLabel}
              serviceCharge={serviceCharge} setServiceCharge={setServiceCharge} availabilityStatus={availabilityStatus} setAvailabilityStatus={setAvailabilityStatus}
              sizeUnit={sizeUnit} setSizeUnit={setSizeUnit} landUnit={landUnit} setLandUnit={setLandUnit}
              garages={garages} setGarages={setGarages} garageSize={garageSize} setGarageSize={setGarageSize}
              yearBuilt={yearBuilt} setYearBuilt={setYearBuilt} rooms={rooms} setRooms={setRooms}
              propertyId={propertyId} setPropertyId={setPropertyId} customFields={customFields} setCustomFields={setCustomFields}
              propertyType={propertyType}
            />
          )}
          {activeStep === 3 && (
            <LocationStep
              address={address} setAddress={setAddress} location={location} setLocation={setLocation}
              neighbourhood={neighbourhood} setNeighbourhood={setNeighbourhood} city={city} setCity={setCity}
              country={country} setCountry={setCountry} latitude={latitude} setLatitude={setLatitude}
              longitude={longitude} setLongitude={setLongitude}
              stateRegion={stateRegion} setStateRegion={setStateRegion} zipCode={zipCode} setZipCode={setZipCode}
            />
          )}
          {activeStep === 4 && (
            <FeaturesStep amenities={amenities} setAmenities={setAmenities} customFeatures={customFeatures} setCustomFeatures={setCustomFeatures} propertyType={propertyType} />
          )}
          {activeStep === 5 && (
            <AttachmentsStep
              documents={documents} setDocuments={setDocuments} uploading={uploading} setUploading={setUploading}
              id={id}
            />
          )}
          {activeStep === 6 && (
            <SettingsStep
              agents={agents} agentId={agentId} setAgentId={setAgentId}
              seoTitle={seoTitle} setSeoTitle={setSeoTitle} seoDescription={seoDescription} setSeoDescription={setSeoDescription}
              isPublished={isPublished} setIsPublished={setIsPublished} isPending={isPending} setIsPending={setIsPending}
              isFeatured={isFeatured} setIsFeatured={setIsFeatured} isHomepage={isHomepage} setIsHomepage={setIsHomepage}
              ownerName={ownerName} setOwnerName={setOwnerName} ownerPhone={ownerPhone} setOwnerPhone={setOwnerPhone}
              ownerEmail={ownerEmail} setOwnerEmail={setOwnerEmail}
              ownerContact={ownerContact} setOwnerContact={setOwnerContact}
              commissionTracking={commissionTracking} setCommissionTracking={setCommissionTracking}
              leadAssignment={leadAssignment} setLeadAssignment={setLeadAssignment}
              privateListing={privateListing} setPrivateListing={setPrivateListing}
              stickyListing={stickyListing} setStickyListing={setStickyListing}
              includeSearch={includeSearch} setIncludeSearch={setIncludeSearch}
              includeFeatured={includeFeatured} setIncludeFeatured={setIncludeFeatured}
              featuredNeighborhood={featuredNeighborhood} setFeaturedNeighborhood={setFeaturedNeighborhood}
              featuredNewDevelopment={featuredNewDevelopment} setFeaturedNewDevelopment={setFeaturedNewDevelopment}
              priorityRanking={priorityRanking} setPriorityRanking={setPriorityRanking}
              autoSEO={autoSEO} setAutoSEO={setAutoSEO}
              openGraphImage={openGraphImage} setOpenGraphImage={setOpenGraphImage}
              interiorFinish={interiorFinish} setInteriorFinish={setInteriorFinish}
              flooringType={flooringType} setFlooringType={setFlooringType}
              ceilingHeight={ceilingHeight} setCeilingHeight={setCeilingHeight}
              waterSupply={waterSupply} setWaterSupply={setWaterSupply}
              constructionType={constructionType} setConstructionType={setConstructionType}
              completionDate={completionDate} setCompletionDate={setCompletionDate}
              title={title}
              description={description}
              id={id}
              uploading={uploading}
              setUploading={setUploading}
              propertyType={propertyType}
            />
          )}
          {activeStep === 7 && (
            <SummaryStep
              title={title} location={location} propertyType={propertyType} purpose={purpose}
              isFeatured={isFeatured} price={price} currency={currency} bedrooms={bedrooms}
              bathrooms={bathrooms} size={size} amenities={amenities} images={images}
              mainImage={mainImage} floorPlans={floorPlans} documents={documents}
              agentName={getAgentName()} isPublished={isPublished} isPending={isPending}
              seoTitle={seoTitle} slug={slug} saving={saving} handleSave={handleSave}
              priceUgx={priceUgx} autoExchange={autoExchange}
              propertyLabel={propertyLabel} availabilityStatus={availabilityStatus}
              sizeUnit={sizeUnit} garages={garages} yearBuilt={yearBuilt}
              rooms={rooms} customFeatures={customFeatures}
              priorityRanking={priorityRanking} interiorFinish={interiorFinish}
              flooringType={flooringType} ceilingHeight={ceilingHeight}
              waterSupply={waterSupply} constructionType={constructionType}
              completionDate={completionDate} openGraphImage={openGraphImage}
              autoSEO={autoSEO} featuredNewDevelopment={featuredNewDevelopment}
              privateListing={privateListing} stickyListing={stickyListing}
              includeSearch={includeSearch} includeFeatured={includeFeatured}
              featuredNeighborhood={featuredNeighborhood} isHomepage={isHomepage}
              stateRegion={stateRegion} city={city} country={country}
              address={address} zipCode={zipCode}
              videoUrl={videoUrl} virtualTourUrl={virtualTourUrl}
              propertyId={propertyId} customFields={customFields}
              landSize={landSize} landUnit={landUnit}
            />
          )}

          {/* Bottom Navigation */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 hover:bg-gray-50"
              style={{ borderColor: COLORS.border, color: COLORS.gray }}
            >
              <i className="ri-arrow-left-s-line" /> Previous
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => handleSave(false)} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer hover:bg-gray-50" style={{ borderColor: COLORS.border, color: COLORS.gray }}>
                {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-save-line" />}
                Save
              </button>
              <button onClick={() => handleSave(true)} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 hover:opacity-90" style={{ backgroundColor: COLORS.navy }}>
                {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-send-plane-line" />}
                {isPublished ? 'Update & Publish' : 'Save & Publish'}
              </button>
            </div>
            <button
              onClick={() => setActiveStep(Math.min(currentSteps.length - 1, activeStep + 1))}
              disabled={activeStep === currentSteps.length - 1}
              className="inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 hover:bg-gray-50"
              style={{ borderColor: COLORS.border, color: COLORS.gray }}
            >
              Next <i className="ri-arrow-right-s-line" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}