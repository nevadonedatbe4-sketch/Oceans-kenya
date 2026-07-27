import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, uploadImageViaEdgeFunction } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { addToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import { STEPS, COLORS, PURPOSES, PURPOSE_LABELS, Agent, DocumentFile, CustomField, generateSlug, getSteps, LAND_TITLE_TYPES } from './components/ListingEdit/types';
import LabelsTagsStep from './components/ListingEdit/LabelsTagsStep';

// Maps form_layout module IDs to step definitions
const STEP_DEFS: Record<string, { label: string; desc: string }> = {
  'basic-info': { label: 'Description', desc: 'Title, type & write-up' },
  'price': { label: 'Price', desc: 'Main price, currency & options' },
  'details': { label: 'Details', desc: 'Size, rooms & specs' },
  'media': { label: 'Media', desc: 'Photos & floor plans' },
  'features': { label: 'Features', desc: 'Amenities & highlights' },
  'location': { label: 'Location', desc: 'Address & map' },
  'labels-tags': { label: 'Labels & Tags', desc: 'Marketing badges' },
  'attachments': { label: 'Attachments', desc: 'Docs & brochures' },
  'contact-publish': { label: 'Settings', desc: 'Agent, SEO & publish' },
};

interface DynamicStep {
  id: string;
  label: string;
  desc: string;
}

function buildDynamicSteps(moduleOrder: string[]): DynamicStep[] {
  // Ensure the Labels & Tags step is always present even for older saved
  // layout configs created before this step existed. If it's missing, inject it
  // right before 'location' (or before 'contact-publish' as a fallback) so it
  // renders between Features and Location.
  const order = [...moduleOrder];
  if (!order.includes('labels-tags')) {
    const locIdx = order.indexOf('location');
    const anchorIdx = locIdx >= 0 ? locIdx : order.indexOf('contact-publish');
    if (anchorIdx >= 0) {
      order.splice(anchorIdx, 0, 'labels-tags');
    } else {
      order.push('labels-tags');
    }
  }

  const steps: DynamicStep[] = [];

  for (const modId of order) {
    const def = STEP_DEFS[modId];
    if (def) {
      steps.push({ id: modId, ...def });
    }
  }

  steps.push({ id: 'summary', label: 'Summary', desc: 'Review & publish' });

  return steps;
}

import MediaStep from './components/ListingEdit/MediaStep';
import DetailsStep from './components/ListingEdit/DetailsStep';
import LocationStep from './components/ListingEdit/LocationStep';
import FeaturesStep from './components/ListingEdit/FeaturesStep';
import AttachmentsStep from './components/ListingEdit/AttachmentsStep';
import SettingsStep from './components/ListingEdit/SettingsStep';
import SummaryStep from './components/ListingEdit/SummaryStep';
import PriceStep from './components/ListingEdit/PriceStep';
import DescriptionStep from './components/ListingEdit/DescriptionStep';

export default function ListingEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const { agentId: currentAgentId } = useAgentProfile();

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
  const [purpose, setPurpose] = useState<'sale' | 'rent' | 'joint_ventures' | 'new_development' | 'short_stay' | 'sold' | 'rented'>('sale');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('KES');
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
  const [frequency, setFrequency] = useState('once_off');
  const [negotiable, setNegotiable] = useState(false);
  const [pricePlaceholder, setPricePlaceholder] = useState(false);
  const [showSecondPrice, setShowSecondPrice] = useState(false);
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
  const [backupPower, setBackupPower] = useState(false);
  const [gatedCommunity, setGatedCommunity] = useState(false);
  const [staffQuarters, setStaffQuarters] = useState(false);
  const [swimmingPool, setSwimmingPool] = useState(false);
  const [gym, setGym] = useState(false);
  const [proximityAmenities, setProximityAmenities] = useState('');
  const [backupPowerDesc, setBackupPowerDesc] = useState('');
  const [staffQuartersRooms, setStaffQuartersRooms] = useState(0);
  const [uniqueFeatures, setUniqueFeatures] = useState('');
  const [balconySize, setBalconySize] = useState('');
  const [plotDimensions, setPlotDimensions] = useState('');
  const [floors, setFloors] = useState(0);
  const [floorNumber, setFloorNumber] = useState('');
  const [renovatedYear, setRenovatedYear] = useState('');
  const [propertyCondition, setPropertyCondition] = useState('');
  const [availableDate, setAvailableDate] = useState('');
  const [furnishedStatus, setFurnishedStatus] = useState('');
  const [includedItems, setIncludedItems] = useState<string[]>([]);
  const [featureCheckboxes, setFeatureCheckboxes] = useState<Record<string, boolean>>({});
  const [utilityCheckboxes, setUtilityCheckboxes] = useState<Record<string, boolean>>({});
  const [roadAccess, setRoadAccess] = useState('');
  const [parkingType, setParkingType] = useState('');
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [terraceSize, setTerraceSize] = useState('');
  const [plotLength, setPlotLength] = useState('');
  const [plotWidth, setPlotWidth] = useState('');
  const [leasePeriod, setLeasePeriod] = useState('');
  const [leaseExpiryDate, setLeaseExpiryDate] = useState('');
  const [plotShape, setPlotShape] = useState('');
  const [topography, setTopography] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Dynamic form steps loaded from form_layout_config
  const [dynamicSteps, setDynamicSteps] = useState<DynamicStep[]>([]);
  const [stepsLoading, setStepsLoading] = useState(true);

  const tabParam = searchParams.get('tab');
  useEffect(() => {
    if (tabParam === 'media' && dynamicSteps.length > 0) {
      const mediaIdx = dynamicSteps.findIndex((s) => s.id === 'media');
      if (mediaIdx >= 0) setActiveStep(mediaIdx);
    }
  }, [tabParam, dynamicSteps]);

  // Load form layout config from site_settings
  useEffect(() => {
    let cancelled = false;
    const loadLayout = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'form_layout_config')
          .maybeSingle();

        if (cancelled) {
          console.log('[FormLayout] ⊘ run cancelled/superseded, ignoring result');
          return;
        }

        console.log('[FormLayout] ⬇ loaded row from site_settings:', { data, error });

        let order: string[] | null = null;
        const raw = data?.value as unknown;
        if (raw != null) {
          if (Array.isArray(raw)) {
            order = raw as string[];
          } else if (typeof raw === 'string') {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) order = parsed as string[];
            } catch (parseErr) {
              console.warn('[FormLayout] ✗ JSON.parse failed for value:', raw, parseErr);
            }
          }
        }

        console.log('[FormLayout] parsed module order from DB:', order);

        if (order && order.length > 0) {
          const knownOrder = order.filter((modId) => !!STEP_DEFS[modId]);
          const unknownIds = order.filter((modId) => !STEP_DEFS[modId]);
          if (unknownIds.length) {
            console.warn('[FormLayout] ⚠ unknown module ids in config (ignored):', unknownIds);
          }
          const steps = buildDynamicSteps(knownOrder);
          console.log('[FormLayout] ✓ built dynamic steps from DB config:', steps.map((s) => `${s.id} → ${s.label}`));
          if (!cancelled && steps.length > 1) {
            setDynamicSteps(steps);
            setStepsLoading(false);
            return;
          }
          console.warn('[FormLayout] ⚠ built steps had <=1 entry, falling back');
        } else {
          console.warn('[FormLayout] ⚠ no usable order array in DB, falling back');
        }
      } catch (loadErr) {
        console.error('[FormLayout] ✗ load error, using fallback:', loadErr);
      }
      if (cancelled) return;
      setDynamicSteps((prev) => {
        if (prev.length > 1) {
          console.log('[FormLayout] ⚑ fallback skipped — valid config already applied, keeping:', prev.map((s) => `${s.id} → ${s.label}`));
          return prev;
        }
        const fallback = getSteps(propertyType).map((s) => ({ id: s.id, label: s.label, desc: s.desc }));
        console.log('[FormLayout] ⚑ USING FALLBACK steps (config not applied):', fallback.map((s) => `${s.id} → ${s.label}`));
        return fallback;
      });
      setStepsLoading(false);
    };
    loadLayout();
    return () => { cancelled = true; };
  }, []);

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
    const rawPurpose = data.purpose || 'sale';
    setPurpose(rawPurpose as typeof purpose);
    setPrice(data.price ? String(data.price) : '');
    setCurrency(data.currency || 'KES');
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
    setFrequency(data.frequency || 'once_off');
    setNegotiable(data.negotiable || false);
    setPricePlaceholder(data.price_placeholder || false);
    setShowSecondPrice(data.show_second_price || false);
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
    setBackupPower(data.backup_power || false);
    setGatedCommunity(data.gated_community || false);
    setStaffQuarters(data.staff_quarters || false);
    setSwimmingPool(data.swimming_pool || false);
    setGym(data.gym || false);
    setProximityAmenities(data.proximity_amenities || '');
    setBackupPowerDesc(data.backup_power_desc || '');
    setStaffQuartersRooms(data.staff_quarters_rooms || 0);
    setUniqueFeatures(data.unique_features || '');
    setBalconySize(data.balcony_size || '');
    setPlotDimensions(data.plot_dimensions || '');
    setFloors(data.floors || 0);
    setFloorNumber(data.floor_number || '');
    setRenovatedYear(data.renovated_year || '');
    setPropertyCondition(data.condition || '');
    setAvailableDate(data.available_date || '');
    setFurnishedStatus(data.furnished_status || '');
    setIncludedItems(Array.isArray(data.included_items) ? data.included_items : []);
    setFeatureCheckboxes(data.feature_checkboxes && typeof data.feature_checkboxes === 'object' && !Array.isArray(data.feature_checkboxes) ? data.feature_checkboxes : {});
    setUtilityCheckboxes(data.utility_checkboxes && typeof data.utility_checkboxes === 'object' && !Array.isArray(data.utility_checkboxes) ? data.utility_checkboxes : {});
    setRoadAccess(data.road_access || '');
    setParkingType(data.parking_type || '');
    setWheelchairAccessible(data.wheelchair_accessible || false);
    setTerraceSize(data.terrace_size || '');
    setPlotLength(data.plot_length || '');
    setPlotWidth(data.plot_width || '');
    setLeasePeriod(data.lease_period || '');
    setLeaseExpiryDate(data.lease_expiry_date || '');
    setPlotShape(data.plot_shape || '');
    setTopography(data.topography || '');
    setSelectedTags(data.tags || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAgents();
    if (isEdit) fetchListing();
    else setLoading(false);
  }, [fetchAgents, fetchListing, isEdit]);

  // Auto-assign agent to their own listing when creating new
  useEffect(() => {
    if (!isEdit && user?.role === 'agent' && currentAgentId) {
      setAgentId(currentAgentId);
    }
  }, [isEdit, user?.role, currentAgentId]);

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
      frequency,
      negotiable,
      price_placeholder: pricePlaceholder,
      show_second_price: showSecondPrice,
      currency,
      original_currency: currency,
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
      backup_power: backupPower,
      gated_community: gatedCommunity,
      staff_quarters: staffQuarters,
      swimming_pool: swimmingPool,
      gym,
      proximity_amenities: proximityAmenities,
      backup_power_desc: backupPowerDesc,
      staff_quarters_rooms: staffQuartersRooms,
      unique_features: uniqueFeatures,
      balcony_size: balconySize,
      plot_dimensions: plotDimensions,
      floors,
      floor_number: floorNumber,
      renovated_year: renovatedYear,
      condition: propertyCondition,
      available_date: availableDate,
      furnished_status: furnishedStatus,
      included_items: includedItems,
      feature_checkboxes: featureCheckboxes,
      utility_checkboxes: utilityCheckboxes,
      road_access: roadAccess,
      parking_type: parkingType,
      wheelchair_accessible: wheelchairAccessible,
      terrace_size: terraceSize,
      plot_length: plotLength,
      plot_width: plotWidth,
      lease_period: leasePeriod,
      lease_expiry_date: leaseExpiryDate,
      plot_shape: plotShape,
      topography,
      tags: selectedTags,
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
  }, [title, description, location, price, bedrooms, bathrooms, amenities, images, address, seoTitle, seoDescription, agentId, isFeatured, isHomepage, isPending, priceUgx, autoExchange, customFields, customFeatures, documents, stateRegion, zipCode, ownerContact, leadAssignment, privateListing, stickyListing, includeSearch, includeFeatured, featuredNeighborhood, featuredNewDevelopment, priorityRanking, autoSEO, openGraphImage, interiorFinish, flooringType, ceilingHeight, waterSupply, constructionType, completionDate, frequency, negotiable, pricePlaceholder, showSecondPrice, backupPower, gatedCommunity, staffQuarters, swimmingPool, gym, proximityAmenities, backupPowerDesc, staffQuartersRooms, uniqueFeatures, balconySize, plotDimensions, floors, floorNumber, renovatedYear, propertyCondition, availableDate, furnishedStatus, includedItems, featureCheckboxes, utilityCheckboxes, roadAccess, parkingType, wheelchairAccessible, terraceSize, plotLength, plotWidth, leasePeriod, leaseExpiryDate, plotShape, topography, selectedTags]);

  const getStatusLabel = () => {
    if (isPublished) return 'Published';
    if (isPending) return 'Pending Review';
    return 'Draft';
  };

  const getAgentName = () => {
    const agent = agents.find((a) => a.id === agentId);
    return agent ? agent.name : 'Unassigned';
  };

  if (loading || stepsLoading || dynamicSteps.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="ri-loader-4-line text-3xl animate-spin text-[#0d1f2d]" />
      </div>
    );
  }

  const currentSteps = dynamicSteps;
  const currentStep = currentSteps[activeStep];
  const progressPct = Math.round(((activeStep + 1) / currentSteps.length) * 100);

  console.log('[FormLayout] 🖌 rendering step sidebar order:', currentSteps.map((s, i) => `${i + 1}. ${s.id} → ${s.label}`));

  // Per-step completion based on key required fields
  const isStepComplete = (stepId: string): boolean => {
    switch (stepId) {
      case 'basic-info':
        return title.trim().length > 0 && propertyType.trim().length > 0;
      case 'price':
        return price.trim().length > 0;
      case 'details':
        return bedrooms > 0 || bathrooms > 0 || size.trim().length > 0;
      case 'media':
        return images.length > 0;
      case 'features':
        return amenities.length > 0 || customFeatures.length > 0;
      case 'location':
        return address.trim().length > 0 || city.trim().length > 0;
      case 'labels-tags':
        return true; // optional section
      case 'attachments':
        return true; // optional section
      case 'contact-publish':
        return agentId.trim().length > 0;
      case 'summary':
        return false;
      default:
        return false;
    }
  };

  const getStepStatus = (index: number) => {
    if (index === activeStep) return 'active';
    if (index < activeStep) return 'completed';
    return 'pending';
  };

  const purposeLabel = ((): string => {
    const labels: Record<string, string> = {
      sale: 'For Sale',
      rent: 'For Rent',
      joint_ventures: 'Joint Venture',
      new_development: 'New Development',
      short_stay: 'Short Stay',
      sold: 'Sold',
      rented: 'Rented',
    };
    return labels[purpose] || purpose;
  })();

  return (
    <div className="flex flex-1">
      {/* Sidebar */}
      <aside className="hidden sm:flex w-72 shrink-0 bg-white border-r border-[#e2e6ea] sticky top-[105px] self-start h-[calc(100vh-105px)] overflow-y-auto flex-col">
        {/* Sidebar Header */}
        <div className="px-7 pt-7 pb-6 border-b border-[#e2e6ea]">
          <p className="text-[11px] uppercase tracking-[0.15em] text-[#9ba5b1] mb-2 font-medium">Listing Form</p>
          <h2 className="text-[17px] font-semibold text-[#0d1f2d] leading-snug">
            {isEdit ? 'Edit Property' : 'New Property'}
          </h2>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide bg-[#0d1f2d] text-white">
              {purposeLabel}
            </span>
            <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide ${
              isPublished ? 'bg-[#0d5959] text-white' : 'bg-[#f4f6f8] text-[#4a5568]'
            }`}>
              {getStatusLabel()}
            </span>
          </div>
        </div>

        {/* Step Navigation */}
        <nav className="flex-1 py-3">
          {currentSteps.map((step, index) => {
            const status = getStepStatus(index);
            const isActive = status === 'active';
            const isDone = isStepComplete(step.id);
            const isBehind = index < activeStep;
            const isAhead = index > activeStep;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(index)}
                className={`w-full text-left px-7 py-4 flex items-center gap-4 transition-all relative cursor-pointer ${
                  isActive ? 'bg-[#f7fafa]' : 'hover:bg-[#fafbfc]'
                }`}
              >
                {/* Active left accent */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#0d5959] rounded-r-full" />
                )}

                {/* Step indicator circle */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold transition-all ${
                  isActive
                    ? 'bg-[#0d5959] text-white ring-2 ring-[#0d5959]/20'
                    : isDone
                    ? 'bg-[#0d5959] text-white'
                    : isBehind
                    ? 'bg-[#e8f5f5] text-[#0d5959]'
                    : 'bg-[#f0f3f6] text-[#9ba5b1]'
                }`}>
                  {isDone && !isActive ? (
                    <i className="ri-check-line text-sm font-bold" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] font-semibold leading-tight transition-colors ${
                    isActive ? 'text-[#0d1f2d]' : isDone ? 'text-[#0d5959]' : isAhead ? 'text-[#6b7280]' : 'text-[#374151]'
                  }`}>
                    {step.label}
                  </p>
                  <p className={`text-[12px] mt-0.5 leading-tight ${
                    isActive ? 'text-[#0d5959]' : 'text-[#9ba5b1]'
                  }`}>{step.desc}</p>
                </div>

                {/* Done indicator dot */}
                {isDone && !isActive && (
                  <div className="w-2 h-2 rounded-full bg-[#0d5959] shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Progress */}
        <div className="px-7 py-5 border-t border-[#e2e6ea]">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[13px] text-[#4a5568] font-medium">Progress</p>
            <p className="text-[13px] font-bold text-[#0d5959]">{progressPct}%</p>
          </div>
          <div className="h-1.5 bg-[#f0f3f6] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0d5959] rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[12px] text-[#9ba5b1] mt-2">
            Step {activeStep + 1} of {currentSteps.length}
          </p>
          {autoSaveStatus && (
            <p className="text-[12px] text-[#0d5959] mt-1 flex items-center gap-1">
              <i className="ri-save-line text-xs" /> {autoSaveStatus}
            </p>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 pb-24 sm:pb-0">
        {/* Desktop Step Header */}
        <div className="hidden sm:flex bg-[#001731] border-l-2 border-[#d3bb6e] px-10 py-7 items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#d3bb6e] mb-1.5 font-semibold">
              {currentStep?.desc}
            </p>
            <h1 className="text-2xl font-prata text-white tracking-tight">
              {currentStep?.label}
            </h1>
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
              <span className="text-white/60"> / {currentSteps.length}</span>
            </p>
          </div>
        </div>

        {/* Mobile Step Header */}
        <div className="sm:hidden bg-white border-b border-[#e8edf2] px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0d1f2d]/5 text-[#0d1f2d]">
            <i className="ri-file-text-line text-sm" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0d1f2d]">{currentStep?.label}</p>
            <p className="text-[11px] text-[#7a8a99]">{currentStep?.desc}</p>
          </div>
          <div className="ml-auto text-[11px] text-[#7a8a99] font-medium">
            {activeStep + 1}/{currentSteps.length}
          </div>
        </div>

        {/* Step Content */}
        <div className="px-4 sm:px-10 py-4 sm:py-10">
          <div className="bg-white border border-[#d1d5db] p-4 sm:p-8">
            {/* Step Content Rendering */}
            {currentStep?.id === 'basic-info' && (
              <DescriptionStep
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                propertyType={propertyType}
                setPropertyType={setPropertyType}
                purpose={purpose}
                setPurpose={setPurpose}
                isEdit={isEdit}
              />
            )}
            {currentStep?.id === 'price' && (
              <PriceStep
                price={price} setPrice={setPrice}
                currency={currency} setCurrency={setCurrency}
                priceUgx={priceUgx} setPriceUgx={setPriceUgx}
                autoExchange={autoExchange} setAutoExchange={setAutoExchange}
                pricePrefix={pricePrefix} setPricePrefix={setPricePrefix}
                pricePostfix={pricePostfix} setPricePostfix={setPricePostfix}
                secondPrice={secondPrice} setSecondPrice={setSecondPrice}
                propertyLabel={propertyLabel} setPropertyLabel={setPropertyLabel}
                serviceCharge={serviceCharge} setServiceCharge={setServiceCharge}
                availabilityStatus={availabilityStatus} setAvailabilityStatus={setAvailabilityStatus}
                negotiable={negotiable} setNegotiable={setNegotiable}
                pricePlaceholder={pricePlaceholder} setPricePlaceholder={setPricePlaceholder}
                showSecondPrice={showSecondPrice} setShowSecondPrice={setShowSecondPrice}
                frequency={frequency} setFrequency={setFrequency}
                purpose={purpose}
              />
            )}
            {currentStep?.id === 'details' && (
              <DetailsStep
                size={size} setSize={setSize} landSize={landSize} setLandSize={setLandSize}
                acreage={acreage} setAcreage={setAcreage} landTitle={landTitle} setLandTitle={setLandTitle}
                sqft={sqft} setSqft={setSqft} parking={parking} setParking={setParking}
                bedrooms={bedrooms} setBedrooms={setBedrooms} bathrooms={bathrooms} setBathrooms={setBathrooms}
                sizeUnit={sizeUnit} setSizeUnit={setSizeUnit} landUnit={landUnit} setLandUnit={setLandUnit}
                garages={garages} setGarages={setGarages} garageSize={garageSize} setGarageSize={setGarageSize}
                yearBuilt={yearBuilt} setYearBuilt={setYearBuilt} rooms={rooms} setRooms={setRooms}
                propertyId={propertyId} setPropertyId={setPropertyId} customFields={customFields} setCustomFields={setCustomFields}
                propertyType={propertyType}
                backupPower={backupPower} setBackupPower={setBackupPower}
                gatedCommunity={gatedCommunity} setGatedCommunity={setGatedCommunity}
                staffQuarters={staffQuarters} setStaffQuarters={setStaffQuarters}
                swimmingPool={swimmingPool} setSwimmingPool={setSwimmingPool}
                gym={gym} setGym={setGym}
                proximityAmenities={proximityAmenities} setProximityAmenities={setProximityAmenities}
                backupPowerDesc={backupPowerDesc} setBackupPowerDesc={setBackupPowerDesc}
                staffQuartersRooms={staffQuartersRooms} setStaffQuartersRooms={setStaffQuartersRooms}
                uniqueFeatures={uniqueFeatures} setUniqueFeatures={setUniqueFeatures}
                balconySize={balconySize} setBalconySize={setBalconySize}
                plotDimensions={plotDimensions} setPlotDimensions={setPlotDimensions}
                floors={floors} setFloors={setFloors}
                floorNumber={floorNumber} setFloorNumber={setFloorNumber}
                renovatedYear={renovatedYear} setRenovatedYear={setRenovatedYear}
                propertyCondition={propertyCondition} setPropertyCondition={setPropertyCondition}
                availableDate={availableDate} setAvailableDate={setAvailableDate}
                furnishedStatus={furnishedStatus} setFurnishedStatus={setFurnishedStatus}
                includedItems={includedItems} setIncludedItems={setIncludedItems}
                featureCheckboxes={featureCheckboxes} setFeatureCheckboxes={setFeatureCheckboxes}
                utilityCheckboxes={utilityCheckboxes} setUtilityCheckboxes={setUtilityCheckboxes}
                roadAccess={roadAccess} setRoadAccess={setRoadAccess}
                parkingType={parkingType} setParkingType={setParkingType}
                wheelchairAccessible={wheelchairAccessible} setWheelchairAccessible={setWheelchairAccessible}
                terraceSize={terraceSize} setTerraceSize={setTerraceSize}
                plotLength={plotLength} setPlotLength={setPlotLength}
                plotWidth={plotWidth} setPlotWidth={setPlotWidth}
                leasePeriod={leasePeriod} setLeasePeriod={setLeasePeriod}
                leaseExpiryDate={leaseExpiryDate} setLeaseExpiryDate={setLeaseExpiryDate}
                plotShape={plotShape} setPlotShape={setPlotShape}
                topography={topography} setTopography={setTopography}
                availabilityStatus={availabilityStatus} setAvailabilityStatus={setAvailabilityStatus}
              />
            )}
            {currentStep?.id === 'media' && (
              <MediaStep
                images={images} setImages={setImages} mainImage={mainImage} setMainImage={setMainImage}
                coverImage={coverImage} setCoverImage={setCoverImage} floorPlans={floorPlans} setFloorPlans={setFloorPlans}
                videoUrl={videoUrl} setVideoUrl={setVideoUrl} virtualTourUrl={virtualTourUrl} setVirtualTourUrl={setVirtualTourUrl}
                uploading={uploading} setUploading={setUploading} id={id} uploadImageViaEdgeFunction={uploadImageViaEdgeFunction}
                propertyType={propertyType}
              />
            )}
            {currentStep?.id === 'features' && (
              <FeaturesStep amenities={amenities} setAmenities={setAmenities} customFeatures={customFeatures} setCustomFeatures={setCustomFeatures} propertyType={propertyType} />
            )}
            {currentStep?.id === 'labels-tags' && (
              <LabelsTagsStep
                selectedTags={selectedTags}
                setSelectedTags={setSelectedTags}
              />
            )}
            {currentStep?.id === 'location' && (
              <LocationStep
                address={address} setAddress={setAddress} location={location} setLocation={setLocation}
                neighbourhood={neighbourhood} setNeighbourhood={setNeighbourhood} city={city} setCity={setCity}
                country={country} setCountry={setCountry}
              />
            )}
            {currentStep?.id === 'attachments' && (
              <AttachmentsStep
                documents={documents} setDocuments={setDocuments} uploading={uploading} setUploading={setUploading}
                id={id}
                purpose={purpose}
                propertyType={propertyType}
                isAdmin={user?.role === 'admin' || user?.role === 'super_admin'}
              />
            )}
            {currentStep?.id === 'contact-publish' && (
              <SettingsStep
                agents={agents}
                agentId={agentId}
                setAgentId={setAgentId}
                isFeatured={isFeatured}
                setIsFeatured={setIsFeatured}
                onPublish={() => handleSave(true)}
                title={title}
                propertyType={propertyType}
                neighbourhood={neighbourhood}
                price={price}
                currency={currency}
                bedrooms={bedrooms}
                bathrooms={bathrooms}
                amenities={amenities}
                images={images}
                purpose={purpose}
                slug={slug}
              />
            )}
            {currentStep?.id === 'summary' && (
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
                tags={selectedTags}
              />
            )}
          </div>

          {/* Desktop Bottom Navigation */}
          <div className="hidden sm:flex mt-6 items-center justify-between w-full bg-[#0d1f2d] px-6 py-4 rounded-xl">
            <div>
              {activeStep > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                  className="flex items-center gap-2 px-5 py-3 text-[13px] uppercase tracking-widest text-white font-bold cursor-pointer whitespace-nowrap transition-colors border-2 border-white rounded-md hover:bg-white hover:text-[#0d1f2d]"
                >
                  <i className="ri-arrow-left-line" />
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {currentStep?.id === 'contact-publish' || currentStep?.id === 'summary' ? (
                <>
                  {/* Submit Later */}
                  <button
                    type="button"
                    onClick={() => { handleSave(false); navigate('/crm/listings'); }}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-3 text-[13px] uppercase tracking-widest text-white/70 font-semibold border border-white/30 rounded-md hover:border-white hover:text-white transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40"
                  >
                    <i className="ri-time-line" />
                    Submit Later
                  </button>
                  {/* Publish Now */}
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3 text-[13px] uppercase tracking-widest bg-[#0d5959] text-white font-semibold cursor-pointer disabled:opacity-50 whitespace-nowrap transition-colors hover:bg-[#0a4545] rounded-md"
                  >
                    {saving ? (
                      <i className="ri-loader-4-line animate-spin" />
                    ) : (
                      <>
                        Publish Now
                        <i className="ri-rocket-line" />
                      </>
                    )}
                  </button>
                </>
              ) : activeStep < currentSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (isEdit) await handleSave(false);
                    setActiveStep(Math.min(currentSteps.length - 1, activeStep + 1));
                  }}
                  disabled={saving}
                  className="flex items-center gap-2 px-8 py-3 text-[13px] uppercase tracking-widest bg-[#0d5959] text-white font-semibold cursor-pointer whitespace-nowrap transition-colors hover:bg-[#0e6b6b] rounded-md disabled:opacity-60"
                >
                  {saving ? <i className="ri-loader-4-line animate-spin" /> : (
                    <>
                      Next
                      <i className="ri-arrow-right-line" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="flex items-center gap-2 px-8 py-3 text-[13px] uppercase tracking-widest bg-[#0d5959] text-white font-semibold cursor-pointer disabled:opacity-50 whitespace-nowrap transition-colors hover:bg-[#094545] rounded-md"
                >
                  {saving ? (
                    <i className="ri-loader-4-line animate-spin" />
                  ) : (
                    <i className="ri-send-plane-line" />
                  )}
                  {isPublished ? 'Update & Publish' : 'Save & Publish'}
                </button>
              )}
            </div>
          </div>

          {/* Mobile Bottom Nav */}
          <div className="sm:hidden mt-6 flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs uppercase tracking-widest border border-[#0d5959] text-[#0d5959] font-medium cursor-pointer disabled:opacity-40 whitespace-nowrap rounded-md"
            >
              <i className="ri-arrow-left-line text-sm" />
              Back
            </button>
            {currentStep?.id === 'contact-publish' ? (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex items-center gap-1.5 px-6 py-2.5 text-xs uppercase tracking-widest bg-[#0d5959] text-white font-medium cursor-pointer disabled:opacity-50 whitespace-nowrap rounded-md"
              >
                {saving ? <i className="ri-loader-4-line animate-spin text-sm" /> : (
                  <>
                    Publish
                    <i className="ri-rocket-line text-sm" />
                  </>
                )}
              </button>
            ) : activeStep < currentSteps.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep(Math.min(currentSteps.length - 1, activeStep + 1))}
                className="flex items-center gap-1.5 px-6 py-2.5 text-xs uppercase tracking-widest bg-[#0d5959] text-white font-medium cursor-pointer whitespace-nowrap rounded-md"
              >
                Next
                <i className="ri-arrow-right-line text-sm" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex items-center gap-1.5 px-6 py-2.5 text-xs uppercase tracking-widest bg-[#0d5959] text-white font-medium cursor-pointer disabled:opacity-50 whitespace-nowrap rounded-md"
              >
                {saving ? <i className="ri-loader-4-line animate-spin text-sm" /> : 'Publish'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}