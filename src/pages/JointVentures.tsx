import { useState, useEffect, useMemo, useRef, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/feature/Header';
import PageBreadcrumbs from '@/components/feature/PageBreadcrumbs';
import Footer from '@/components/feature/Footer';
import BackToTop from '@/components/feature/BackToTop';
import MobileCollapsible from '@/components/feature/MobileCollapsible';
import PageContactSection from '@/components/feature/PageContactSection';
import { supabase } from '@/lib/supabase';
import { NON_PUBLIC_STATUS_LIST } from '@/lib/publicListings';
import { useLeadSubmit } from '@/hooks/useFormSubmit';
import { useCurrency } from '@/hooks/useCurrency';
import { useJointVenturesPageContent } from '@/hooks/useJointVenturesPageContent';
import { FIELD_CLASS } from '@/lib/formFieldStyles';
import PropertySearchBar from '@/components/feature/PropertySearchBar';
import LandAdvancedFilters, { defaultLandFilters, type LandFilterState } from '@/pages/joint-ventures/components/LandAdvancedFilters';
import ProjectCard from '@/pages/joint-ventures/components/ProjectCard';
import JvOpportunityCard from '@/pages/joint-ventures/components/JvOpportunityCard';
import { normalizeJvProjectImages, type JvImage } from '@/lib/jvImages';
import { smartTitleCase } from '@/lib/location';
import {
  DEAL_TYPE_LABELS,
  CONTRIBUTION_LABELS,
  PROJECT_TYPE_LABELS,
  TIMELINE_LABELS,
  LAND_SIZE_UNIT_LABELS,
  formatMoney,
} from '@/pages/crm/jvOpportunityConstants';

// Land search filters. Prices are compared against the listing's raw numeric
// price (KES), so bands are only applied to listings that actually carry a price.
const LAND_PRICE_OPTIONS = ['Any price', 'Under 5M', '5M \u2013 20M', '20M \u2013 50M', '50M \u2013 100M', 'Over 100M'];

const LAND_PRICE_BANDS: Record<string, [number, number]> = {
  'Under 5M': [0, 5_000_000],
  '5M \u2013 20M': [5_000_000, 20_000_000],
  '20M \u2013 50M': [20_000_000, 50_000_000],
  '50M \u2013 100M': [50_000_000, 100_000_000],
  'Over 100M': [100_000_000, Number.POSITIVE_INFINITY],
};

const LAND_TITLE_OPTIONS = ['Any title', 'Freehold', 'Leasehold', 'Mailo', 'Kibanja / customary', 'In process'];

// Land-size filter for the main search row. Bands are compared against the
// listing's numeric acreage (sizeAcres), so plots recorded in sq ft / sq m are
// converted before matching.
const LAND_SIZE_OPTIONS = [
  'Any size',
  'Under ½ acre',
  '½ – 1 acre',
  '1 – 2 acres',
  '2 – 5 acres',
  '5 – 10 acres',
  '10 – 20 acres',
  '20+ acres',
];

const LAND_SIZE_BANDS: Record<string, [number, number]> = {
  'Under ½ acre': [0, 0.5],
  '½ – 1 acre': [0.5, 1],
  '1 – 2 acres': [1, 2],
  '2 – 5 acres': [2, 5],
  '5 – 10 acres': [5, 10],
  '10 – 20 acres': [10, 20],
  '20+ acres': [20, Number.POSITIVE_INFINITY],
};

// Deal-type filter for the land feed. "Capital venture" surfaces plots whose
// linked, published JV deal is a capital-only (cash-only) contribution.
const LAND_DEAL_TYPE_OPTIONS = ['Any deal type', 'Joint venture', 'Outright sale', 'Capital venture'];

type FormState = 'idle' | 'submitting' | 'success' | 'error';

function useJVForm(submissionType: 'landowner' | 'investor') {
  const [status, setStatus] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const { submitToLeads } = useLeadSubmit();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const hp = (formData.get('website_alt') as string || '').trim();
    if (hp) {
      setStatus('success');
      form.reset();
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    const fullName = (formData.get('full_name') as string || '').trim();
    const phone = (formData.get('phone') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const message = (formData.get('message') as string || '').trim();

    const baseData = {
      full_name: fullName,
      phone: phone || undefined,
      email,
      submission_type: submissionType,
      message: message || undefined,
    };

    let extraData: Record<string, string | undefined> = {};
    if (submissionType === 'landowner') {
      extraData = {
        land_location: (formData.get('land_location') as string || '').trim() || undefined,
        land_size: (formData.get('land_size') as string || '').trim() || undefined,
        title_status: (formData.get('title_status') as string || '').trim() || undefined,
        preferred_structure: (formData.get('preferred_structure') as string || '').trim() || undefined,
      };
    } else {
      extraData = {
        budget_range: (formData.get('budget_range') as string || '').trim() || undefined,
        preferred_location: (formData.get('preferred_location') as string || '').trim() || undefined,
        preferred_use: (formData.get('preferred_use') as string || '').trim() || undefined,
        timeline: (formData.get('timeline') as string || '').trim() || undefined,
      };
    }

    const success = await submitToLeads({ ...baseData, ...extraData } as any);

    if (success) {
      setStatus('success');
      form.reset();
    } else {
      setErrorMsg('Submission failed. Please try again.');
      setStatus('error');
    }
  };

  return { status, errorMsg, handleSubmit };
}

interface LandListing {
  id: string;
  slug: string;
  ref: string;
  title: string;
  district: string;
  area: string;
  size: string;
  sizeAcres: number;
  titleType: string;
  price: string;
  priceRaw: number;
  currency: string;
  category: 'outright' | 'joint_venture';
  description: string;
  image: string;
  videoUrl: string;
  landType: string;
  /** True when a linked, published JV deal is a capital-only contribution. */
  capitalOnly: boolean;
}

interface JvProject {
  id: string;
  slug: string;
  title: string;
  location: string;
  type: string;
  units: number;
  status: string;
  priceRange: string;
  description: string;
  image: string;
  images: JvImage[];
}

interface JvOpportunity {
  id: string;
  slug: string;
  title: string;
  location: string;
  landSize: string;
  landListingId: string;
  dealTypeLabel: string;
  contributionLabel: string;
  projectTypeLabel: string;
  capitalText: string;
  stageLabel: string;
  summary: string;
}

export default function JointVentures() {
  const { format } = useCurrency();
  const { content: LC } = useJointVenturesPageContent();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [jvFaqs, setJvFaqs] = useState<{ question: string; answer: string }[]>([]);
  const [landTab, setLandTab] = useState<'all' | 'outright' | 'joint_venture'>('all');
  const [landSearch, setLandSearch] = useState('');
  const [landPrice, setLandPrice] = useState('');
  const [landTitleType, setLandTitleType] = useState('');
  const [landSize, setLandSize] = useState('');
  const [landUseType, setLandUseType] = useState('');
  const [landDealType, setLandDealType] = useState('');
  const [showLandFilters, setShowLandFilters] = useState(false);
  const [landFilters, setLandFilters] = useState<LandFilterState>({ ...defaultLandFilters });
  const [requestTab, setRequestTab] = useState<'landowner' | 'investor'>('landowner');
  const [landData, setLandData] = useState<LandListing[]>([]);
  const [landLoading, setLandLoading] = useState(true);
  const [landError, setLandError] = useState('');
  const [expandedLand, setExpandedLand] = useState<Set<string>>(new Set());
  const [visibleLandCount, setVisibleLandCount] = useState(6);
  const [landActiveSlide, setLandActiveSlide] = useState(0);
  const landTrackRef = useRef<HTMLDivElement>(null);
  const [jvProjects, setJvProjects] = useState<JvProject[]>([]);
  const [jvProjectsLoading, setJvProjectsLoading] = useState(true);
  const [jvProjectsError, setJvProjectsError] = useState('');
  const [jvOpportunities, setJvOpportunities] = useState<JvOpportunity[]>([]);
  const [jvOppLoading, setJvOppLoading] = useState(true);
  const [jvOppError, setJvOppError] = useState('');
  const [jvSearch, setJvSearch] = useState('');
  const [jvDealType, setJvDealType] = useState('');
  const [jvContribution, setJvContribution] = useState('');
  const [jvCapital, setJvCapital] = useState('');
  const [jvStage, setJvStage] = useState('');
  const landownerForm = useJVForm('landowner');
  const investorForm = useJVForm('investor');

  useEffect(() => {
    fetchLandListings();
    fetchJvProjects();
    fetchJvOpportunities();
    fetchFaqs();
  }, []);

  // Whenever the land feed is re-filtered, collapse back to the first page so
  // "Load more" always starts from a predictable, consistent state.
  useEffect(() => {
    setVisibleLandCount(6);
    setLandActiveSlide(0);
  }, [landTab, landSearch, landPrice, landTitleType, landDealType, landUseType, landSize, landFilters]);

  async function fetchFaqs() {
    try {
      const { data } = await supabase
        .from('jv_faqs')
        .select('question, answer')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });
      if (data) setJvFaqs(data);
    } catch {
      // non-critical
    }
  }

  async function fetchLandListings() {
    setLandLoading(true);
    setLandError('');
    try {
      // Published JV opportunities authored in the CRM must surface publicly as
      // Joint Ventures - even when the linked land listing itself carries no
      // `sub_type`. Build a lookup of JV-linked listings (by id + slug) first.
      const jvLinkedIds = new Set<string>();
      const jvSlugs = new Set<string>();
      // Land plots whose linked, published JV deal is a capital-only ask.
      const capitalOnlyIds = new Set<string>();
      try {
        const { data: jvRows } = await supabase
          .from('jv_opportunities')
          .select('land_listing_id, slug, contribution')
          .eq('is_published', true);
        (jvRows || []).forEach((r: Record<string, unknown>) => {
          if (r.land_listing_id) jvLinkedIds.add(String(r.land_listing_id));
          if (r.slug) jvSlugs.add(String(r.slug).trim().toLowerCase());
          if (r.land_listing_id && String(r.contribution || '') === 'cash_only') {
            capitalOnlyIds.add(String(r.land_listing_id));
          }
        });
      } catch {
        // Non-critical: fall back to sub_type-only classification.
      }

      const { data, error } = await supabase
        .from('all_listings')
        .select('*')
        .eq('property_category', 'land')
        .not('status', 'in', NON_PUBLIC_STATUS_LIST)
        .neq('title', '')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped: LandListing[] = data.map((row: Record<string, unknown>) => {
          const title = smartTitleCase(String(row.title || ''));
          const rawNeighbourhood = String(row.neighbourhood || '').trim();
          const rawLocation = String(row.location || '').trim();
          let district = String(row.state_region || '').trim();
          // Land records very often carry the area in `neighbourhood` with an
          // empty `location` (and vice-versa). Use whichever is populated so
          // both the public card AND area search show the real place.
          let area = rawLocation || rawNeighbourhood;
          if (!area && rawNeighbourhood) area = rawNeighbourhood;
          if (!district && !area) {
            const locMatch = title.match(/\bin\s+([^()]+)/i);
            if (locMatch) area = locMatch[1].trim();
          }

          const currencyLabel = String(row.currency || '').toUpperCase() === 'USD' ? 'USD' : 'KES';
          const priceVal = row.price ? Number(row.price) : 0;

          let size = row.land_size
            ? `${row.land_size} ${row.land_unit || 'acres'}`
            : (row.size ? `${row.size} ${row.size_unit || 'sqm'}` : '');
          // Numeric acreage for the advanced size filter. Land listings are stored
          // in acres; anything recorded in square feet / metres gets converted.
          let sizeAcres = 0;
          const sizeNum = Number(row.land_size ?? row.size ?? 0);
          const sizeUnit = String(row.land_size ? (row.land_unit || 'acres') : (row.size_unit || 'sqm')).toLowerCase();
          if (sizeNum > 0) {
            if (sizeUnit.includes('ft') || sizeUnit.includes('sq ft')) sizeAcres = sizeNum / 43560;
            else if (sizeUnit.includes('sq') || sizeUnit.includes('m2')) sizeAcres = sizeNum / 4046.86;
            else sizeAcres = sizeNum;
          }
          if (!size) {
            const acreMatch = title.match(/(\d+(?:\.\d+)?)\s*acre/i);
            if (acreMatch) {
              size = `${acreMatch[1]} acres`;
              if (sizeAcres <= 0) sizeAcres = Number(acreMatch[1]);
            }
          }

          const rawDescription = String(row.description || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
          // Fall back to the full description so land entered via the wizard (which has no
          // separate short summary) always shows something clean on the public card.
          const description = rawDescription || `${title} - ${size}${area ? `, ${area}` : ''}`;

          return {
            id: String(row.id),
            slug: String(row.slug || ''),
            ref: String(row.property_id || `LAND/${String(row.sub_type || (row.purpose === 'joint_ventures' ? 'JV' : 'OP')).toUpperCase()}-${String(row.id).slice(0, 3)}`),
            title,
            district,
            area,
            size,
            sizeAcres,
            titleType: String((row.custom_fields as Record<string, unknown> | null)?.title_type || row.land_title || 'Freehold'),
            price: priceVal > 0 ? `${currencyLabel} ${priceVal.toLocaleString()}` : 'On request',
            priceRaw: priceVal,
            currency: currencyLabel,
            category: (String(row.sub_type || '').toLowerCase() === 'joint_venture'
              || jvLinkedIds.has(String(row.id))
              || jvSlugs.has(String(row.slug || '').trim().toLowerCase())
              ? 'joint_venture' : 'outright') as 'outright' | 'joint_venture',
            description,
            image: String(row.main_image || ''),
            videoUrl: String(row.video_url || ''),
            landType: String(row.land_type || ''),
            capitalOnly: capitalOnlyIds.has(String(row.id)),
          };
        });
        setLandData(mapped);
      }
    } catch (err: unknown) {
      setLandError(err instanceof Error ? err.message : 'Failed to load land listings');
    } finally {
      setLandLoading(false);
    }
  }

  async function fetchJvProjects() {
    setJvProjectsLoading(true);
    setJvProjectsError('');
    try {
      const { data, error } = await supabase
        .from('jv_projects')
        .select('id, title, slug, location, type, units, status, price_range, description, image, jv_project_images(id, image_url, storage_path, alt_text, sort_order, is_cover)')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: JvProject[] = (data || []).map((row: Record<string, unknown>) => {
        const title = String(row.title || '');
        const legacyImage = String(row.image || '') || null;
        const rawImages = row.jv_project_images;
        return {
          id: String(row.id),
          slug: String(row.slug || ''),
          title,
          location: String(row.location || ''),
          type: String(row.type || ''),
          units: Number(row.units) || 0,
          status: String(row.status || ''),
          priceRange: String(row.price_range || ''),
          description: String(row.description || ''),
          image: legacyImage || '',
          images: normalizeJvProjectImages(rawImages, legacyImage, title),
        };
      });
      setJvProjects(mapped);
    } catch (err: unknown) {
      setJvProjectsError(err instanceof Error ? err.message : 'Failed to load JV projects');
    } finally {
      setJvProjectsLoading(false);
    }
  }

  // Live JV opportunities - the actual deal records authored on the JV desk.
  // Everything surfaced here comes straight from `jv_opportunities`; nothing is
  // invented and no internal-only columns are ever read on the public page.
  async function fetchJvOpportunities() {
    setJvOppLoading(true);
    setJvOppError('');
    try {
      const { data, error } = await supabase
        .from('jv_opportunities')
        .select('id, title, slug, land_listing_id, land_location, land_area, land_county, land_size, land_size_value, land_size_unit, deal_type, contribution, capital_required, capital_amount, deal_currency, project_type, timeline, public_summary, manual_land_description')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: JvOpportunity[] = (data || []).map((row: Record<string, unknown>) => {
        const area = String(row.land_area || row.land_location || '').trim();
        const county = String(row.land_county || '').trim();
        const location = [area, county].filter(Boolean).join(', ');

        const sizeValue = Number(row.land_size_value);
        const sizeUnitRaw = String(row.land_size_unit || 'acres');
        const sizeUnit = LAND_SIZE_UNIT_LABELS[sizeUnitRaw] || sizeUnitRaw;
        const landSize = String(row.land_size || '').trim()
          || (sizeValue > 0 ? `${sizeValue.toLocaleString()} ${sizeUnit}` : '');

        const dealRaw = String(row.deal_type || '').trim();
        const contributionRaw = String(row.contribution || '').trim();
        const projectRaw = String(row.project_type || '').trim();
        const timelineRaw = String(row.timeline || '').trim();

        const capitalRequired = String(row.capital_required || '').trim();
        const capitalAmount = Number(row.capital_amount);
        const capitalText = capitalRequired
          || (capitalAmount > 0 ? formatMoney(capitalAmount, String(row.deal_currency || 'USD')) : '');

        const summary = String(row.public_summary || row.manual_land_description || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();

        return {
          id: String(row.id),
          slug: String(row.slug || ''),
          title: String(row.title || ''),
          location,
          landSize,
          landListingId: String(row.land_listing_id || ''),
          dealTypeLabel: DEAL_TYPE_LABELS[dealRaw] || smartTitleCase(dealRaw.replace(/_/g, ' ')),
          contributionLabel: CONTRIBUTION_LABELS[contributionRaw] || '',
          projectTypeLabel: PROJECT_TYPE_LABELS[projectRaw] || '',
          capitalText,
          stageLabel: TIMELINE_LABELS[timelineRaw] || '',
          summary,
        };
      });
      setJvOpportunities(mapped);
    } catch (err: unknown) {
      setJvOppError(err instanceof Error ? err.message : 'Failed to load JV opportunities');
    } finally {
      setJvOppLoading(false);
    }
  }

  const searchActive = landSearch.trim() !== ''
    || (landPrice !== '' && landPrice !== LAND_PRICE_OPTIONS[0])
    || (landTitleType !== '' && landTitleType !== LAND_TITLE_OPTIONS[0])
    || (landSize !== '' && landSize !== LAND_SIZE_OPTIONS[0])
    || (landDealType !== '' && landDealType !== LAND_DEAL_TYPE_OPTIONS[0]);

  const advancedActive = landFilters.categories.length > 0
    || landFilters.minPrice !== '' || landFilters.maxPrice !== ''
    || landFilters.minAcres !== '' || landFilters.maxAcres !== ''
    || landFilters.titleTypes.length > 0
    || landFilters.district.trim() !== ''
    || landFilters.keywords.trim() !== '';

  const landDistricts = useMemo(() => {
    const set = new Set<string>();
    landData.forEach((l) => {
      const d = l.district.trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [landData]);

  // Land-native filter options - only values that actually exist are offered.
  const landTypeOptions = useMemo(() => {
    const set = new Set<string>();
    landData.forEach((l) => {
      const v = l.landType.trim();
      if (v) set.add(v);
    });
    return ['All land types', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [landData]);

  const filteredLand = landData.filter((l) => {
    if (landTab !== 'all' && l.category !== landTab) return false;

    if (searchActive) {
      const q = landSearch.trim().toLowerCase();
      if (q) {
        const haystack = `${l.title} ${l.area} ${l.district} ${l.size} ${l.ref} ${l.titleType}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (landPrice && landPrice !== LAND_PRICE_OPTIONS[0]) {
        const band = LAND_PRICE_BANDS[landPrice];
        if (band) {
          if (l.priceRaw <= 0) return false;
          if (l.priceRaw < band[0] || l.priceRaw >= band[1]) return false;
        }
      }

      if (landTitleType && landTitleType !== LAND_TITLE_OPTIONS[0]) {
        if (!l.titleType.toLowerCase().includes(landTitleType.toLowerCase())) return false;
      }

      if (landSize && landSize !== LAND_SIZE_OPTIONS[0]) {
        const band = LAND_SIZE_BANDS[landSize];
        if (band) {
          if (l.sizeAcres <= 0) return false;
          if (l.sizeAcres < band[0] || l.sizeAcres >= band[1]) return false;
        }
      }
    }

    // ── Advanced filters ──
    if (landFilters.categories.length > 0 && !landFilters.categories.includes(l.category)) return false;

    if (landFilters.minPrice !== '' || landFilters.maxPrice !== '') {
      if (l.priceRaw <= 0) return false;
      const minP = Number(landFilters.minPrice);
      const maxP = Number(landFilters.maxPrice);
      if (landFilters.minPrice !== '' && Number.isFinite(minP) && l.priceRaw < minP) return false;
      if (landFilters.maxPrice !== '' && Number.isFinite(maxP) && l.priceRaw > maxP) return false;
    }

    if (landFilters.minAcres !== '' || landFilters.maxAcres !== '') {
      if (l.sizeAcres <= 0) return false;
      const minA = Number(landFilters.minAcres);
      const maxA = Number(landFilters.maxAcres);
      if (landFilters.minAcres !== '' && Number.isFinite(minA) && l.sizeAcres < minA) return false;
      if (landFilters.maxAcres !== '' && Number.isFinite(maxA) && l.sizeAcres > maxA) return false;
    }

    if (landFilters.titleTypes.length > 0) {
      const tt = l.titleType.toLowerCase();
      if (!landFilters.titleTypes.some((t) => tt.includes(t.toLowerCase()))) return false;
    }

    if (landFilters.district.trim() !== '') {
      const dq = landFilters.district.trim().toLowerCase();
      if (!`${l.district} ${l.area}`.toLowerCase().includes(dq)) return false;
    }

    if (landFilters.keywords.trim() !== '') {
      const kq = landFilters.keywords.trim().toLowerCase();
      const hay = `${l.title} ${l.area} ${l.district} ${l.size} ${l.ref} ${l.titleType} ${l.description}`.toLowerCase();
      if (!hay.includes(kq)) return false;
    }

    if (landUseType && landUseType !== landTypeOptions[0]) {
      if (l.landType.toLowerCase() !== landUseType.toLowerCase()) return false;
    }

    if (landDealType && landDealType !== LAND_DEAL_TYPE_OPTIONS[0]) {
      if (landDealType === 'Joint venture' && l.category !== 'joint_venture') return false;
      if (landDealType === 'Outright sale' && l.category !== 'outright') return false;
      if (landDealType === 'Capital venture' && !l.capitalOnly) return false;
    }

    return true;
  });

  // Map linked land listing id -> its public slug + hero image, so a JV
  // opportunity card can point at the correct property detail page.
  const landByIdMap = useMemo(() => {
    const m = new Map<string, { slug: string; image: string }>();
    landData.forEach((l) => m.set(l.id, { slug: l.slug, image: l.image }));
    return m;
  }, [landData]);

  // JV search schema - every option is built from values that actually exist in
  // the live feed, so no filter can ever return a guaranteed-empty result.
  const jvDealTypeOptions = useMemo(() => {
    const set = new Set<string>();
    jvOpportunities.forEach((o) => { if (o.dealTypeLabel) set.add(o.dealTypeLabel); });
    return ['Any deal type', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [jvOpportunities]);

  const jvContributionOptions = useMemo(() => {
    const set = new Set<string>();
    jvOpportunities.forEach((o) => { if (o.contributionLabel) set.add(o.contributionLabel); });
    return ['Any contribution', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [jvOpportunities]);

  const jvCapitalOptions = useMemo(() => {
    const set = new Set<string>();
    jvOpportunities.forEach((o) => { if (o.capitalText) set.add(o.capitalText); });
    return ['Any capital requirement', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [jvOpportunities]);

  const jvStageOptions = useMemo(() => {
    const set = new Set<string>();
    jvOpportunities.forEach((o) => { if (o.stageLabel) set.add(o.stageLabel); });
    return ['Any stage', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [jvOpportunities]);

  const filteredJvOpportunities = jvOpportunities.filter((o) => {
    if (jvSearch.trim()) {
      const q = jvSearch.trim().toLowerCase();
      const hay = `${o.title} ${o.location} ${o.summary} ${o.dealTypeLabel} ${o.projectTypeLabel}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (jvDealType && jvDealType !== 'Any deal type' && o.dealTypeLabel !== jvDealType) return false;
    if (jvContribution && jvContribution !== 'Any contribution' && o.contributionLabel !== jvContribution) return false;
    if (jvCapital && jvCapital !== 'Any capital requirement' && o.capitalText !== jvCapital) return false;
    if (jvStage && jvStage !== 'Any stage' && o.stageLabel !== jvStage) return false;
    return true;
  });

  const visibleLand = filteredLand.slice(0, visibleLandCount);

  // Mobile carousel helpers: track which card is centred and let the dots
  // jump between plots. The 24px matches the container's px-6 inset.
  const handleLandScroll = () => {
    const el = landTrackRef.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    let closest = 0;
    let min = Number.POSITIVE_INFINITY;
    kids.forEach((child, i) => {
      const d = Math.abs(child.offsetLeft - 24 - el.scrollLeft);
      if (d < min) {
        min = d;
        closest = i;
      }
    });
    setLandActiveSlide(closest);
  };

  const scrollLandTo = (index: number) => {
    const el = landTrackRef.current;
    if (!el) return;
    const target = el.children[index] as HTMLElement | undefined;
    if (!target) return;
    el.scrollTo({ left: target.offsetLeft - 24, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white pt-[62px] md:pt-[122px] lg:pt-[130px]">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#152238]">
        {/* Subtle grid lines */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.05) 2px, transparent 2px), linear-gradient(to bottom, rgba(255,255,255,0.05) 2px, transparent 2px)',
            backgroundSize: '80px 80px',
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-24 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-10 items-center">
            {/* Left - headline + CTAs */}
            <div className="lg:col-span-3">
              <p className="text-golden text-xs tracking-[0.25em] uppercase mb-5 font-roboto font-bold">
                {LC.hero_eyebrow}
              </p>
              <h1 className="font-roboto font-bold text-white text-3xl md:text-4xl lg:text-[3.2rem] leading-[1.15] mt-4 mb-8">
                {LC.hero_line1}
                <br />
                {LC.hero_line2}
                <br />
                {LC.hero_line3}
              </h1>
              <p className="text-white/55 font-roboto font-medium text-sm md:text-base leading-relaxed mb-8 max-w-lg">
                {LC.hero_paragraph}
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <a
                  href="#request-desk"
                  onClick={(e) => { e.preventDefault(); setRequestTab('landowner'); document.getElementById('request-desk')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-golden text-white text-xs tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity font-bold"
                >
                  {LC.hero_button1}
                </a>
                <a
                  href="#request-desk"
                  onClick={(e) => { e.preventDefault(); setRequestTab('investor'); document.getElementById('request-desk')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 border border-white/30 text-white text-xs tracking-widest uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors"
                >
                  {LC.hero_button2}
                </a>
              </div>
            </div>

            {/* Right - live figures card */}
            <div className="lg:col-span-2">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 md:p-7">
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
                  <p className="text-white/50 font-roboto font-medium text-[18px] uppercase tracking-[0.2em]">
                    {LC.figures_label}
                  </p>
                  <span className="text-white/40 font-roboto font-medium text-[18px] uppercase tracking-wider">
                    {LC.figures_currency}
                  </span>
                </div>
                <div className="space-y-5">
                  {LC.figures.map((f, i) => (
                    <div key={i} className="space-y-5">
                      {i > 0 && <div className="h-[2px] bg-white/10" />}
                      <div className="flex items-baseline gap-4">
                        <span className="font-roboto font-bold text-white text-3xl md:text-4xl">
                          {f.value}
                        </span>
                        <p className="text-white/50 font-roboto text-xs leading-snug">
                          {f.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Breadcrumb below the banner - keeps the blue flow intact */}
      <PageBreadcrumbs />

      {/* Project types strip + land search */}
      <section className="border-b-2 border-primary/12">
        <div className="max-w-6xl mx-auto px-6 py-6 md:py-7">
          {/* Page identity - makes the Land / JV context unmistakable */}
          <div className="mb-4">
            <p className="text-golden text-xs md:text-sm tracking-[0.2em] uppercase font-roboto font-bold mb-1">{LC.search_eyebrow}</p>
            <h2 className="font-roboto font-bold text-primary text-xl md:text-2xl">{LC.search_heading}</h2>
          </div>
          {/* Land search - refines the live land feed further down the page */}
          <PropertySearchBar
            searchQuery={landSearch}
            onLocationChange={(v) => {
              // Land page search MUST land on the LAND results section, never on
              // a generic property result set. Selecting/entering an area applies
              // the filter automatically and scrolls straight to the feed.
              setLandSearch(v);
              setVisibleLandCount(6);
              requestAnimationFrame(() => {
                document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              });
            }}
            placeholderCycle={[
              'Search land by area, e.g. Karen...',
              'Search land by town, e.g. Nanyuki...',
              'Search land by district...',
            ]}
            priceValue={landPrice}
            onPriceChange={setLandPrice}
            priceOptions={LAND_PRICE_OPTIONS}
            priceLabel="Guide price"
            typeValue={landTitleType}
            onTypeChange={setLandTitleType}
            typeOptions={LAND_TITLE_OPTIONS}
            typeLabel="Title type"
            landSizeValue={landSize}
            onLandSizeChange={setLandSize}
            landSizeOptions={LAND_SIZE_OPTIONS}
            landSizeLabel="Land size"
            extraFields={[
              { key: 'land-use', label: 'Land use', value: landUseType, options: landTypeOptions, onChange: setLandUseType },
              { key: 'deal-type', label: 'Deal type', value: landDealType, options: LAND_DEAL_TYPE_OPTIONS, onChange: setLandDealType },
            ]}
            onFilters={() => setShowLandFilters(true)}
            filtersActive={showLandFilters || advancedActive}
            onSearch={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />

          {/* Advanced filters - refine the live land feed further down the page */}
          <LandAdvancedFilters
            isOpen={showLandFilters}
            onClose={() => setShowLandFilters(false)}
            onApply={(f) => setLandFilters(f)}
            initialFilters={landFilters}
            districts={landDistricts}
          />
        </div>
      </section>

      {/* Lands Available */}
      <section id="projects" className="px-6 py-14 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-bold">{LC.land_eyebrow}</p>
            <h2 className="font-roboto font-bold text-primary text-2xl md:text-3xl mb-3">{LC.land_heading}</h2>
            <p className="text-primary/70 font-roboto text-sm max-w-xl mx-auto leading-relaxed">
              {LC.land_subtitle}
            </p>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 md:mb-10">
            {[
              { key: 'all' as const, label: LC.land_tab_all },
              { key: 'outright' as const, label: LC.land_tab_outright },
              { key: 'joint_venture' as const, label: LC.land_tab_jv },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setLandTab(f.key)}
                className={`px-5 py-2.5 text-sm font-roboto whitespace-nowrap cursor-pointer transition-colors border ${
                  landTab === f.key
                    ? 'bg-primary text-white border-primary font-semibold'
                    : 'text-primary/70 border-stone-300 hover:text-primary hover:border-primary bg-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Loading state */}
          {landLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="border-2 border-primary/12 bg-white p-5 md:p-6 animate-pulse">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-3 bg-stone-200 rounded w-24" />
                    <div className="h-5 bg-stone-200 rounded w-20" />
                  </div>
                  <div className="h-4 bg-stone-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-stone-200 rounded w-1/2 mb-3" />
                  <div className="h-px bg-stone-100 mb-3" />
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="h-8 bg-stone-200 rounded" />
                    <div className="h-8 bg-stone-200 rounded" />
                    <div className="h-8 bg-stone-200 rounded" />
                  </div>
                  <div className="h-3 bg-stone-200 rounded w-full mb-1" />
                  <div className="h-3 bg-stone-200 rounded w-4/5 mb-4" />
                  <div className="h-9 bg-stone-200 rounded w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!landLoading && landError && (
            <div className="text-center py-16">
              <div className="w-16 h-16 flex items-center justify-center bg-red-50 rounded-full mx-auto mb-4">
                <i className="ri-error-warning-line text-2xl text-red-400"></i>
              </div>
              <p className="text-primary/70 font-roboto text-sm mb-4">{landError}</p>
              <button
                onClick={fetchLandListings}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-xs tracking-widest uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors"
              >
                <i className="ri-refresh-line"></i>Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!landLoading && !landError && filteredLand.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-4">
                <i className="ri-landscape-line text-2xl text-primary/50"></i>
              </div>
              <p className="text-primary/70 font-roboto text-sm mb-2">
                {searchActive || advancedActive
                  ? 'No plots match your search right now.'
                  : `No ${landTab !== 'all' ? (landTab === 'outright' ? 'outright purchase' : 'joint venture') : ''} plots available right now.`}
              </p>
              <p className="text-primary/50 font-roboto text-xs">Check back soon or submit a brief to be notified when new opportunities arrive.</p>
            </div>
          )}

          {/* Deed-style listing cards — swipe carousel on mobile, grid on desktop */}
          {!landLoading && !landError && filteredLand.length > 0 && (
            <>
              <div
                ref={landTrackRef}
                onScroll={handleLandScroll}
                className="relative flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 snap-x snap-mandatory scroll-pl-6 gap-6 md:gap-7 -mx-6 px-6 pt-2 pb-4 md:mx-0 md:px-0 md:py-0 no-scrollbar"
              >
                {visibleLand.map((land) => (
                  <Link to={land.slug ? `/property/${land.slug}` : '#'} key={land.id} data-type={land.category === 'joint_venture' ? 'jv' : 'sale'} className="group relative block cursor-pointer h-full w-[82%] flex-shrink-0 snap-start md:w-auto">
                    {/* Top zigzag serration */}
                    <svg className="absolute -top-[5px] left-0 w-full h-[5px] block" preserveAspectRatio="none" viewBox="0 0 100 5">
                      <path d="M0 5 L2.5 0 L5 5 L7.5 0 L10 5 L12.5 0 L15 5 L17.5 0 L20 5 L22.5 0 L25 5 L27.5 0 L30 5 L32.5 0 L35 5 L37.5 0 L40 5 L42.5 0 L45 5 L47.5 0 L50 5 L52.5 0 L55 5 L57.5 0 L60 5 L62.5 0 L65 5 L67.5 0 L70 5 L72.5 0 L75 5 L77.5 0 L80 5 L82.5 0 L85 5 L87.5 0 L90 5 L92.5 0 L95 5 L97.5 0 L100 5 Z" fill="#ffffff" />
                    </svg>

                    {/* Card body - receipt paper */}
                    <div className="bg-white border-2 border-primary-500 p-4 md:p-7 relative h-full flex flex-col">
                      {/* Centered badge */}
                      <div className="flex items-center justify-center gap-2 flex-wrap mb-3">
                        <span className="inline-block px-3 py-1 text-[10px] uppercase tracking-[0.14em] font-medium font-roboto bg-accent/15 text-accent">
                          {land.category === 'joint_venture' ? 'JV Opportunity' : 'For Sale'}
                        </span>
                        {land.videoUrl && (
                          <button
                            type="button"
                            aria-label={`Play video tour for ${land.title}`}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(land.videoUrl, '_blank', 'noopener,noreferrer'); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold font-roboto bg-black/70 text-white cursor-pointer hover:bg-black/85 transition-colors"
                          >
                            <i className="ri-play-circle-line"></i>Video Tour
                          </button>
                        )}
                      </div>

                      {/* Title - centered, receipt style */}
                      <h4 className="font-roboto font-bold text-primary text-[19px] text-center mb-1.5 leading-snug tracking-tight">{land.title}</h4>

                      {/* Location - centered */}
                      <p className="font-roboto text-xs text-[#2D303D] text-center mb-5">
                        <i className="ri-map-pin-2-line mr-1 text-[#2D303D]/50"></i>{[land.district, land.area].filter(Boolean).join(', ')}
                      </p>

                      {/* Dashed separator */}
                      <div className="border-t border-dashed border-stone-300 mb-4" />

                      {/* Metrics - two-column receipt rows */}
                      <div className="space-y-2.5 mb-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-roboto text-[11px] text-[#2D303D]/55 uppercase tracking-[0.14em] font-medium">{land.category === 'joint_venture' ? 'Acreage' : 'Size'}</span>
                          <span className="font-mono text-[15px] text-[#16181f] font-bold text-right">{land.size}</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-roboto text-[11px] text-[#2D303D]/55 uppercase tracking-[0.14em] font-medium">Title</span>
                          <span className="font-mono text-[15px] text-[#16181f] font-bold text-right">{land.titleType}</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3 pt-1">
                          <span className="font-roboto text-[11px] text-[#2D303D]/55 uppercase tracking-[0.14em] font-medium">{land.category === 'joint_venture' ? 'Ask' : 'Price'}</span>
                          <span className="font-mono text-[21px] text-accent font-bold text-right leading-none">{format(land.priceRaw, land.currency as 'KES' | 'USD' | 'GBP' | 'EUR')}</span>
                        </div>
                        {land.priceRaw > 0 && (<p className="text-[18px] font-roboto text-[#2D303D]/55 text-right -mt-1.5">Guide Price</p>)}
                      </div>

                      {/* Dashed separator */}
                      <div className="border-t border-dashed border-stone-300 mb-4" />

                      {/* Description - centered, receipt style */}
                      <p className={`font-roboto text-xs text-[#2D303D]/80 leading-relaxed text-center ${expandedLand.has(land.id) ? 'mb-3' : 'line-clamp-3 mb-2'}`}>
                        {land.description}
                      </p>

                      {/* Read more / less - expands in place, never navigates */}
                      {land.description.length > 180 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setExpandedLand((prev) => {
                              const next = new Set(prev);
                              if (next.has(land.id)) next.delete(land.id);
                              else next.add(land.id);
                              return next;
                            });
                          }}
                          className="inline-flex items-center gap-1.5 mx-auto mb-5 text-accent font-roboto text-[11px] uppercase tracking-[0.14em] font-bold cursor-pointer hover:opacity-70 transition-opacity"
                        >
                          {expandedLand.has(land.id) ? 'Read less' : 'Read more'}
                          <i className={expandedLand.has(land.id) ? 'ri-arrow-up-wide-fill' : 'ri-arrow-down-wide-fill'}></i>
                        </button>
                      )}

                      {/* CTA - full width, outlined */}
                      <div
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRequestTab('investor'); document.getElementById('request-desk')?.scrollIntoView({ behavior: 'smooth' }); }}
                        className="jv-cta mt-auto inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#002349] text-white border-2 border-[#002349] font-roboto text-[11px] tracking-wider uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-[#003A6C] hover:text-white transition-colors"
                      >
                        Enquire about this plot <i className="ri-arrow-right-line"></i>
                      </div>
                    </div>

                    {/* Bottom zigzag serration */}
                    <svg className="absolute -bottom-[5px] left-0 w-full h-[5px] block" preserveAspectRatio="none" viewBox="0 0 100 5">
                      <path d="M0 0 L2.5 5 L5 0 L7.5 5 L10 0 L12.5 5 L15 0 L17.5 5 L20 0 L22.5 5 L25 0 L27.5 5 L30 0 L32.5 5 L35 0 L37.5 5 L40 0 L42.5 5 L45 0 L47.5 5 L50 0 L52.5 5 L55 0 L57.5 5 L60 0 L62.5 5 L65 0 L67.5 5 L70 0 L72.5 5 L75 0 L77.5 5 L80 0 L82.5 5 L85 0 L87.5 5 L90 0 L92.5 5 L95 0 L97.5 5 L100 0 Z" fill="#ffffff" />
                    </svg>
                  </Link>
                ))}
              </div>

              {/* Mobile carousel controls - tap arrows flanking the dots, for
                  people who prefer tapping over swiping. Desktop stays a grid. */}
              {visibleLand.length > 1 && (
                <div className="flex md:hidden items-center justify-center gap-3 mt-4">
                  <button
                    type="button"
                    aria-label="Previous plot"
                    onClick={() => scrollLandTo(Math.max(landActiveSlide - 1, 0))}
                    disabled={landActiveSlide <= 0}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-primary/25 text-primary cursor-pointer hover:bg-primary/5 transition-colors disabled:opacity-30 disabled:cursor-default"
                  >
                    <i className="ri-arrow-left-s-line"></i>
                  </button>
                  <div className="flex items-center justify-center gap-1.5">
                    {visibleLand.map((land, i) => (
                      <button
                        key={land.id}
                        type="button"
                        aria-label={`Go to plot ${i + 1}`}
                        onClick={() => scrollLandTo(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${landActiveSlide === i ? 'w-6 bg-primary' : 'w-1.5 bg-primary/25'}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    aria-label="Next plot"
                    onClick={() => scrollLandTo(Math.min(landActiveSlide + 1, visibleLand.length - 1))}
                    disabled={landActiveSlide >= visibleLand.length - 1}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-primary/25 text-primary cursor-pointer hover:bg-primary/5 transition-colors disabled:opacity-30 disabled:cursor-default"
                  >
                    <i className="ri-arrow-right-s-line"></i>
                  </button>
                </div>
              )}

              {/* Load more - reveals the next page of plots in place */}
              {filteredLand.length > visibleLandCount && (
                <div className="flex flex-col items-center gap-4 mt-8 md:mt-10">
                  <p className="text-primary/60 font-roboto text-xs md:text-sm">
                    Showing {Math.min(visibleLandCount, filteredLand.length)} of {filteredLand.length} plots
                  </p>
                  <button
                    type="button"
                    onClick={() => setVisibleLandCount((c) => c + 6)}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-[#002349] text-white border-2 border-[#002349] font-roboto text-xs tracking-wider uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-[#003A6C] transition-colors"
                  >
                    Load more plots <i className="ri-arrow-down-line"></i>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-bold">{LC.how_eyebrow}</p>
            <h2 className="font-roboto font-bold text-primary text-2xl md:text-3xl mb-3">{LC.how_heading}</h2>
            <p className="text-primary/70 font-roboto text-sm max-w-xl mx-auto leading-relaxed">
              {LC.how_intro}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0 items-stretch">
            {/* Landowner card */}
            <div className="border-2 border-primary/12 bg-white p-6 md:p-8 flex flex-col">
              <span className="inline-block self-start px-3 py-1 bg-[#6F4E37] text-white font-roboto text-[14px] uppercase tracking-widest font-medium mb-5">
                {LC.landowner_badge}
              </span>
              <h3 className="font-roboto font-bold text-primary text-lg md:text-xl mb-5 leading-snug">
                {LC.landowner_heading}
              </h3>
              <ol className="space-y-3 mb-6 flex-1">
                {LC.landowner_steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-primary/70 font-roboto text-sm leading-relaxed">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-primary font-roboto text-sm font-extrabold">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <a
                href="#request-desk"
                onClick={(e) => { e.preventDefault(); setRequestTab('landowner'); document.getElementById('request-desk')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 bg-[#002349] text-white border-2 border-[#002349] font-roboto text-xs tracking-wider uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-[#003A6C] hover:text-white transition-colors"
              >
                {LC.landowner_button} <i className="ri-arrow-right-line"></i>
              </a>
            </div>

            {/* Center connector */}
            <div className="relative flex items-center justify-center px-4 py-6 lg:py-0">
              {/* Glow ring */}
              <div className="absolute w-28 h-28 md:w-36 md:h-36 rounded-full bg-primary/15 blur-2xl" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-roboto text-[10px] md:text-[11px] leading-tight text-center font-extrabold tracking-wider">
                  JV<br />DEAL<br />ROOM
                </span>
              </div>
            </div>

            {/* Investor card */}
            <div className="border-2 border-primary/12 bg-white p-6 md:p-8 flex flex-col">
              <span className="inline-block self-start px-3 py-1 bg-[#228B22] text-white font-roboto text-[14px] uppercase tracking-widest font-medium mb-5">
                {LC.investor_badge}
              </span>
              <h3 className="font-roboto font-bold text-primary text-lg md:text-xl mb-5 leading-snug">
                {LC.investor_heading}
              </h3>
              <ol className="space-y-3 mb-6 flex-1">
                {LC.investor_steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-primary/70 font-roboto text-sm leading-relaxed">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-accent font-roboto text-sm font-extrabold">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <a
                href="#request-desk"
                onClick={(e) => { e.preventDefault(); setRequestTab('investor'); document.getElementById('request-desk')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 bg-[#002349] text-white border-2 border-[#002349] font-roboto text-xs tracking-wider uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-[#003A6C] hover:text-white transition-colors"
              >
                {LC.investor_button} <i className="ri-arrow-right-line"></i>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services section */}
      <section className="relative overflow-hidden bg-primary px-6 py-14 md:py-20">
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-bold">{LC.services_eyebrow}</p>
            <h2 className="font-roboto font-bold text-white text-2xl md:text-3xl mb-3">{LC.services_heading}</h2>
            <p className="text-white/55 font-roboto text-sm max-w-lg mx-auto">
              {LC.services_subtitle}
            </p>
          </div>
          <MobileCollapsible
            variant="dark"
            icon="ri-briefcase-4-line"
            label="See the full service list"
            openLabel="Hide services"
            summary="Sourcing · Structuring · Management · Finance · Legal"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10">
              {LC.services.map((svc) => (
                <div key={svc.code} className="bg-primary p-6 md:p-7 hover:bg-primary/80 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-golden font-roboto text-xs tracking-widest uppercase font-extrabold">{svc.code}</span>
                    <div className="flex-1 h-[2px] bg-white/10"></div>
                  </div>
                  <h3 className="font-roboto font-bold text-white text-base md:text-lg mb-2">{svc.title}</h3>
                  <p className="text-white/50 font-roboto text-sm leading-relaxed">{svc.desc}</p>
                </div>
              ))}
            </div>
          </MobileCollapsible>
        </div>
      </section>

      {/* Live JV Projects */}
      <section className="px-6 py-14 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-bold">{LC.projects_eyebrow}</p>
            <h2 className="font-roboto font-bold text-primary text-2xl md:text-3xl mb-3">{LC.projects_heading}</h2>
            <p className="text-primary/70 font-roboto text-sm max-w-xl mx-auto leading-relaxed">
              {LC.projects_subtitle}
            </p>
          </div>

          {jvProjectsLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="border-2 border-primary/12 bg-white animate-pulse">
                  <div className="h-48 bg-stone-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-stone-200 rounded w-2/3" />
                    <div className="h-3 bg-stone-200 rounded w-1/2" />
                    <div className="h-3 bg-stone-200 rounded w-full" />
                    <div className="h-3 bg-stone-200 rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!jvProjectsLoading && jvProjectsError && (
            <div className="text-center py-10">
              <p className="text-primary/70 font-roboto text-sm mb-3">{jvProjectsError}</p>
              <button onClick={fetchJvProjects} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white border-2 border-primary text-xs tracking-widest uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors">
                <i className="ri-refresh-line"></i>Retry
              </button>
            </div>
          )}

          {!jvProjectsLoading && !jvProjectsError && jvProjects.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 flex items-center justify-center bg-stone-100 rounded-full mx-auto mb-4">
                <i className="ri-building-2-line text-2xl text-primary/50"></i>
              </div>
              <p className="text-primary/70 font-roboto text-sm">No live projects right now. Submit a brief to be notified when new opportunities open.</p>
            </div>
          )}

          {!jvProjectsLoading && !jvProjectsError && jvProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7">
              {jvProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  title={project.title}
                  slug={project.slug}
                  location={project.location}
                  type={project.type}
                  units={project.units}
                  priceRange={project.priceRange}
                  description={project.description}
                  status={project.status}
                  images={project.images}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Request desk / Forms */}
      <section id="request-desk" className="bg-[#152238] px-6 py-14 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-bold">{LC.request_eyebrow}</p>
            <h2 className="font-roboto font-bold text-white text-2xl md:text-3xl mb-3">{LC.request_heading}</h2>
            <p className="text-white/55 font-roboto text-sm max-w-lg mx-auto leading-relaxed">
              {LC.request_paragraph}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center justify-center mb-8 md:mb-10">
            <div className="inline-flex items-center bg-white/10 px-1 py-1 w-full max-w-sm sm:w-auto sm:max-w-none">
              <button
                onClick={() => setRequestTab('landowner')}
                className={`flex-1 sm:flex-none px-3 sm:px-6 py-2.5 text-xs sm:text-sm whitespace-normal sm:whitespace-nowrap leading-tight sm:leading-normal cursor-pointer transition-all font-bold ${
                  requestTab === 'landowner'
                    ? 'bg-golden text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {LC.request_tab_landowner}
              </button>
              <button
                onClick={() => setRequestTab('investor')}
                className={`flex-1 sm:flex-none px-3 sm:px-6 py-2.5 text-xs sm:text-sm whitespace-normal sm:whitespace-nowrap leading-tight sm:leading-normal cursor-pointer transition-all font-bold ${
                  requestTab === 'investor'
                    ? 'bg-accent text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {LC.request_tab_investor}
              </button>
            </div>
          </div>

          {/* Landowner form */}
          {requestTab === 'landowner' && (
            <form id="landowner-form" onSubmit={landownerForm.handleSubmit} className="bg-white border border-white/10 p-6 md:p-8 shadow-[0_4px_12px_rgba(0,0,0,0.12),0_12px_32px_rgba(0,0,0,0.18)]">
              <div className="hp-wrap" aria-hidden="true">
                <input type="text" name="website_alt" tabIndex={-1} autoComplete="off" readOnly />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 mb-6">
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Full name</label>
                  <input required name="full_name" placeholder="e.g. Sarah Namutebi" className={FIELD_CLASS} />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Phone / WhatsApp</label>
                  <input required type="tel" name="phone" placeholder="+256 7XX XXX XXX" className={FIELD_CLASS} />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Email</label>
                  <input required type="email" name="email" placeholder="you@email.com" className={FIELD_CLASS} />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">District / location</label>
                  <input required name="land_location" placeholder="e.g. Wakiso, Kira" className={FIELD_CLASS} />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Acreage</label>
                  <input required name="land_size" placeholder="e.g. 12 acres" className={FIELD_CLASS} />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Title status</label>
                  <select required name="title_status" className={`${FIELD_CLASS} cursor-pointer bg-white`}>
                    <option value="">Select one</option>
                    <option value="freehold">Freehold</option>
                    <option value="leasehold">Leasehold</option>
                    <option value="mailo">Mailo</option>
                    <option value="kibanja">Kibanja / customary</option>
                    <option value="in_process">In process</option>
                  </select>
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Preferred structure</label>
                  <select required name="preferred_structure" className={`${FIELD_CLASS} cursor-pointer bg-white`}>
                    <option value="">Select one</option>
                    <option value="revenue_share">Joint venture - revenue share</option>
                    <option value="equity_split">Joint venture - equity split</option>
                    <option value="lease_to_jv">Lease-to-JV</option>
                    <option value="outright_sale">Open to outright sale instead</option>
                    <option value="advise">Not sure - advise me</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Tell us about the land</label>
                  <textarea name="message" rows={3} maxLength={500} placeholder="Access road, current use, nearby landmarks, any existing survey or valuation, ideal type of investor..." className={`${FIELD_CLASS} resize-none`}></textarea>
                  <p className="text-right text-xs text-primary/50 font-roboto mt-1">Max 500 characters</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t-2 border-primary/12">
                <p className="text-primary/50 font-roboto text-xs leading-relaxed max-w-md">
                  Have a survey map or photos? Mention it here - our team will follow up to collect them by WhatsApp or email.
                </p>
                <button
                  type="submit"
                  disabled={landownerForm.status === 'submitting'}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-golden text-white text-base tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity font-semibold flex-shrink-0"
                >
                  {landownerForm.status === 'submitting' ? 'Submitting...' : 'Submit land brief'}
                </button>
              </div>
              {landownerForm.status === 'success' && (
                <div className="mt-5 p-4 bg-green-50 border border-green-100">
                  <p className="text-green-700 font-roboto text-sm flex items-center gap-2">
                    <i className="ri-check-line"></i>Brief received. The JV desk will call or WhatsApp you within 48 hours.
                  </p>
                </div>
              )}
              {landownerForm.status === 'error' && (
                <div className="mt-5 p-4 bg-red-50 border border-red-100">
                  <p className="text-red-600 font-roboto text-sm">{landownerForm.errorMsg}</p>
                </div>
              )}
            </form>
          )}

          {/* Investor form */}
          {requestTab === 'investor' && (
            <form id="investor-form" onSubmit={investorForm.handleSubmit} className="bg-white border border-white/10 p-6 md:p-8 shadow-[0_4px_12px_rgba(0,0,0,0.12),0_12px_32px_rgba(0,0,0,0.18)]">
              <div className="hp-wrap" aria-hidden="true">
                <input type="text" name="website_alt" tabIndex={-1} autoComplete="off" readOnly />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 mb-6">
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Full name</label>
                  <input required name="full_name" placeholder="e.g. David Okello" className={FIELD_CLASS} />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Phone / WhatsApp</label>
                  <input required type="tel" name="phone" placeholder="+256 7XX XXX XXX" className={FIELD_CLASS} />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Email</label>
                  <input required type="email" name="email" placeholder="you@email.com" className={FIELD_CLASS} />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Investment range (KES)</label>
                  <select required name="budget_range" className={`${FIELD_CLASS} cursor-pointer bg-white`}>
                    <option value="">Select one</option>
                    <option value="below_100m">Below 100M</option>
                    <option value="100m_500m">100M - 500M</option>
                    <option value="500m_1b">500M - 1B</option>
                    <option value="1b_5b">1B - 5B</option>
                    <option value="above_5b">Above 5B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Preferred district(s)</label>
                  <input name="preferred_location" placeholder="e.g. Karen, Westlands, Kileleshwa" className={FIELD_CLASS} />
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Preferred use</label>
                  <select required name="preferred_use" className={`${FIELD_CLASS} cursor-pointer bg-white`}>
                    <option value="">Select one</option>
                    <option value="agriculture">Agriculture / agri-processing</option>
                    <option value="residential">Residential estate development</option>
                    <option value="commercial">Commercial development</option>
                    <option value="mixed_use">Mixed-use</option>
                    <option value="outright_purchase">Outright land purchase only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">Timeline</label>
                  <select name="timeline" className={`${FIELD_CLASS} cursor-pointer bg-white`}>
                    <option value="">Select one</option>
                    <option value="within_30_days">Ready to move within 30 days</option>
                    <option value="1_3_months">1-3 months</option>
                    <option value="3_6_months">3-6 months</option>
                    <option value="exploring">Exploring options</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">What are you looking for?</label>
                  <textarea name="message" rows={3} maxLength={500} placeholder="Minimum acreage, access requirements, JV structure preference, or any land you've already seen..." className={`${FIELD_CLASS} resize-none`}></textarea>
                  <p className="text-right text-xs text-primary/50 font-roboto mt-1">Max 500 characters</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t-2 border-primary/12">
                <p className="text-primary/50 font-roboto text-xs leading-relaxed max-w-md">
                  We only share your brief with landowners once you approve a shortlist - your details stay private until then.
                </p>
                <button
                  type="submit"
                  disabled={investorForm.status === 'submitting'}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-golden text-white text-base tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity font-semibold flex-shrink-0"
                >
                  {investorForm.status === 'submitting' ? 'Submitting...' : 'Submit investment brief'}
                </button>
              </div>
              {investorForm.status === 'success' && (
                <div className="mt-5 p-4 bg-green-50 border border-green-100">
                  <p className="text-green-700 font-roboto text-sm flex items-center gap-2">
                    <i className="ri-check-line"></i>Brief received. Expect a shortlist of matching land within 48 hours.
                  </p>
                </div>
              )}
              {investorForm.status === 'error' && (
                <div className="mt-5 p-4 bg-red-50 border border-red-100">
                  <p className="text-red-600 font-roboto text-sm">{investorForm.errorMsg}</p>
                </div>
              )}
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-14 md:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-2 font-roboto font-bold">{LC.faq_eyebrow}</p>
            <h2 className="font-roboto font-bold text-primary text-2xl md:text-3xl">{LC.faq_heading}</h2>
          </div>
          <div className="space-y-2.5 md:space-y-3">
            {jvFaqs.map((faq, idx) => (
              <div key={idx} className="border-2 border-primary/12 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-start gap-2.5 md:gap-3 px-3.5 py-3 md:p-5 text-left hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  <span className="text-golden font-roboto text-xs font-bold mt-0.5 flex-shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="flex-1 min-w-0 font-roboto font-bold text-primary text-sm md:text-base leading-snug break-words">{faq.question}</span>
                  <i className={`${openFaq === idx ? 'ri-subtract-line' : 'ri-add-line'} text-primary/50 mt-0.5 flex-shrink-0`}></i>
                </button>
                {openFaq === idx && (
                  <div className="px-3.5 md:px-5 pb-3.5 md:pb-5 pl-9 md:pl-12">
                    <p className="text-primary/70 font-roboto text-sm leading-relaxed break-words">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary px-6 py-12 md:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-golden text-sm md:text-base tracking-[0.2em] uppercase mb-3 font-roboto font-bold">{LC.cta_eyebrow}</p>
          <h2 className="text-white font-roboto font-bold mb-3 leading-snug text-2xl md:text-3xl">{LC.cta_heading}</h2>
          <p className="text-white/65 font-roboto text-sm leading-relaxed mb-7 max-w-lg mx-auto">
            {LC.cta_paragraph}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#request-desk" className="inline-flex items-center gap-2 px-6 py-2.5 bg-golden text-white text-xs tracking-widest uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity w-full sm:w-auto justify-center">
              <i className="ri-file-list-3-line"></i>{LC.cta_button1}
            </a>
            <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-2.5 border border-white/30 text-white text-xs tracking-widest uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors w-full sm:w-auto justify-center">
              <i className="ri-mail-send-line"></i>{LC.cta_button2}
            </Link>
          </div>
        </div>
      </section>

      <PageContactSection />
      <Footer />
      <BackToTop />
    </div>
  );
}