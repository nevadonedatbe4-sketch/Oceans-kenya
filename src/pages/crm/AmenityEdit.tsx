import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import AmenityGalleryField from '@/pages/crm/components/AmenityGalleryField';
import InlineAddSelect from '@/pages/crm/components/InlineAddSelect';
import CategoryManagerModal from '@/pages/crm/components/CategoryManagerModal';
import TagListField from '@/pages/crm/components/TagListField';
import AmenityReviewsField from '@/pages/crm/components/AmenityReviewsField';
import { fetchAmenityFolders, toggleStar } from '@/lib/directory';
import type { AmenityFolder } from '@/lib/directory';
import {
  AMENITY_CATEGORIES,
  PURPOSE_OPTIONS,
  categoryLabel,
  subcategoryLabel,
  isGeneratedImage,
  normalizeUrl,
  categoryRecordColor,
  mergeSubcategories,
  subcategoryKeyForLabel,
  type AmenityCategoryRecord,
} from '@/lib/amenities';
import NoImagePlaceholder from '@/components/feature/NoImagePlaceholder';
import { smartTitleCase } from '@/lib/location';

interface NeighbourhoodOption {
  id: string;
  name: string;
}

interface AmenityForm {
  name: string;
  category: string;
  category_id: string;
  subcategory: string;
  neighbourhood_id: string;
  neighbourhood_name: string;
  latitude: string;
  longitude: string;
  address: string;
  city: string;
  country: string;
  description: string;
  website: string;
  maps_url: string;
  phone: string;
  email: string;
  opening_hours: string;
  rating: string;
  purpose: string;
  purpose_custom: string;
  price_tier: string;
  services: string[];
  price_range: string;
  google_review_text: string;
  image: string;
  gallery: string[];
  alt_text: string;
  label: string;
  label_bg: string;
  label_text: string;
  label_border: string;
  icon: string;
  curriculum: string;
  fee_range: string;
  established: string;
  student_count: string;
  features: string;
  emergency_rating: string;
  store_count: string;
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
}

// Map subcategory → legacy `type` (keeps the Schools page + compare engine working).
const SUBCATEGORY_TO_TYPE: Record<string, string> = {
  primary_school: 'school',
  secondary_school: 'school',
  international_school: 'school',
  kindergarten: 'school',
  college: 'school',
  university: 'school',
  library: 'school',
  vocational: 'school',
  training_centre: 'school',
  hospital: 'hospital',
  clinic: 'hospital',
  medical_centre: 'hospital',
  dental_clinic: 'hospital',
  specialist_centre: 'hospital',
  pharmacy: 'pharmacy',
  gym: 'gym',
  fitness_centre: 'gym',
  wellness_centre: 'gym',
  physiotherapy: 'gym',
  mall: 'mall',
  supermarket: 'supermarket',
  grocery_store: 'supermarket',
  restaurant: 'restaurant',
  coworking: 'coworking',
  park: 'park',
};

const emptyForm: AmenityForm = {
  name: '',
  category: 'education',
  category_id: '',
  subcategory: 'primary_school',
  neighbourhood_id: '',
  neighbourhood_name: '',
  latitude: '',
  longitude: '',
  address: '',
  city: 'Nairobi',
  country: 'Kenya',
  description: '',
  website: '',
  maps_url: '',
  phone: '',
  email: '',
  opening_hours: '',
  rating: '',
  purpose: '',
  purpose_custom: '',
  price_tier: '',
  services: [],
  price_range: '',
  google_review_text: '',
  image: '',
  gallery: [],
  alt_text: '',
  label: '',
  label_bg: '',
  label_text: '#ffffff',
  label_border: '',
  icon: '',
  curriculum: '',
  fee_range: '',
  established: '',
  student_count: '',
  features: '',
  emergency_rating: '',
  store_count: '',
  is_published: false,
  is_featured: false,
  sort_order: 0,
};

// Sentinel value for the "+ Add custom" option in the Purpose dropdown.
const CUSTOM_PURPOSE = '__custom__';

function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function AmenityEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<AmenityForm>(emptyForm);
  const [neighbourhoods, setNeighbourhoods] = useState<NeighbourhoodOption[]>([]);
  const [categories, setCategories] = useState<AmenityCategoryRecord[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [urlErrors, setUrlErrors] = useState<{ website?: string; maps_url?: string }>({});
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerFocus, setManagerFocus] = useState<string | null>(null);
  const [managerTab, setManagerTab] = useState<'categories' | 'subcategories'>('categories');

  // Directory management state
  const [isStarred, setIsStarred] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [flagReason, setFlagReason] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [placeFolders, setPlaceFolders] = useState<AmenityFolder[]>([]);

  const handleChange = <K extends keyof AmenityForm>(field: K, value: AmenityForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleParentChange = (categoryId: string) => {
    const rec = categories.find((c) => c.id === categoryId);
    const slug = rec?.slug || '';
    const firstSub = mergeSubcategories(slug, rec?.subcategories)[0]?.key || '';
    setForm((prev) => ({ ...prev, category_id: categoryId, category: slug || prev.category, subcategory: firstSub }));
  };

  // Subcategory options for the selected category: built-in list + anything the
  // user has added, so a category's own list can be extended in place.
  const selectedCategoryRecord = categories.find((c) => c.id === form.category_id) || null;
  const subOptions = useMemo(
    () => mergeSubcategories(selectedCategoryRecord?.slug || form.category, selectedCategoryRecord?.subcategories),
    [selectedCategoryRecord?.slug, selectedCategoryRecord?.subcategories, form.category],
  );

  // Keep the subcategory valid whenever the option set changes (e.g. after a
  // category switch or after adding a new entry).
  useEffect(() => {
    if (!form.category_id || subOptions.length === 0) return;
    if (!subOptions.some((s) => s.key === form.subcategory)) {
      setForm((prev) => ({ ...prev, subcategory: subOptions[0].key }));
    }
  }, [subOptions, form.category_id, form.subcategory]);

  /** Create a new category in place and select it. */
  const handleAddCategory = async (name: string): Promise<boolean> => {
    const slug =
      name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'category';
    const { data, error } = await supabase
      .from('amenity_categories')
      .insert({ name, slug, color: '#0d5959', icon: 'ri-store-2-line', is_published: true, sort_order: 0 })
      .select('*')
      .single();
    if (error) {
      addToast(error.code === '23505' ? 'A category with that name already exists' : 'Failed to add category', 'error');
      return false;
    }
    const created = data as AmenityCategoryRecord;
    setCategories((prev) => [...prev, created].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    setForm((prev) => ({ ...prev, category_id: created.id, category: created.slug || prev.category, subcategory: '' }));
    addToast(`Category "${name}" added`, 'success');
    broadcastSync();
    return true;
  };

  /** Append a new subcategory to the selected category and select it. */
  const handleAddSubcategory = async (name: string): Promise<boolean> => {
    const rec = categories.find((c) => c.id === form.category_id);
    if (!rec) {
      addToast('Select a category first', 'error');
      return false;
    }
    const key = subcategoryKeyForLabel(name);
    if (mergeSubcategories(rec.slug, rec.subcategories).some((s) => s.key === key)) {
      setForm((prev) => ({ ...prev, subcategory: key }));
      addToast('That sub category already exists — selected it', 'info');
      return true;
    }
    const current = Array.isArray(rec.subcategories) ? rec.subcategories : [];
    const next = [...current, { key, label: name, sort_order: current.length }];
    const { error } = await supabase.from('amenity_categories').update({ subcategories: next }).eq('id', rec.id);
    if (error) {
      addToast('Failed to add sub category', 'error');
      return false;
    }
    setCategories((prev) => prev.map((c) => (c.id === rec.id ? { ...c, subcategories: next } : c)));
    setForm((prev) => ({ ...prev, subcategory: key }));
    addToast(`Sub category "${name}" added`, 'success');
    broadcastSync();
    return true;
  };

  const fetchAmenity = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase.from('amenities').select('*').eq('id', id).maybeSingle();
    if (error) {
      addToast('Failed to load amenity', 'error');
    } else if (data) {
      const attrs = (data.attributes as Record<string, unknown>) || {};
      const style = (data.label_style as Record<string, string>) || {};
      setForm({
        name: data.name || '',
        category: data.category || 'education',
        category_id: data.category_id || '',
        subcategory: data.subcategory || '',
        neighbourhood_id: data.neighbourhood_id || '',
        neighbourhood_name: data.neighbourhood_name || '',
        latitude: data.latitude != null ? String(data.latitude) : '',
        longitude: data.longitude != null ? String(data.longitude) : '',
        address: data.address || '',
        city: data.city || 'Nairobi',
        country: data.country || 'Kenya',
        description: data.description || '',
        website: data.website || '',
        maps_url: data.maps_url || '',
        phone: data.phone || '',
        email: data.email || '',
        opening_hours: data.opening_hours || '',
        rating: data.rating != null ? String(data.rating) : '',
        purpose: PURPOSE_OPTIONS.includes(data.purpose || '')
          ? (data.purpose as string)
          : data.purpose
            ? CUSTOM_PURPOSE
            : '',
        purpose_custom:
          data.purpose && !PURPOSE_OPTIONS.includes(data.purpose) ? data.purpose : '',
        price_tier: data.price_tier || '',
        services: Array.isArray(data.services) ? (data.services as string[]) : [],
        price_range: data.price_range || '',
        google_review_text: data.google_review_text || '',
        image: data.image || '',
        gallery: Array.isArray(data.gallery) ? (data.gallery as string[]) : [],
        alt_text: data.alt_text || '',
        label: data.label || '',
        label_bg: style.bg || '',
        label_text: style.text || '#ffffff',
        label_border: style.border || '',
        icon: data.icon || '',
        curriculum: (attrs.curriculum as string) || '',
        fee_range: (attrs.fee_range as string) || '',
        established: attrs.established != null ? String(attrs.established) : '',
        student_count: attrs.student_count != null ? String(attrs.student_count) : '',
        features: Array.isArray(attrs.features) ? (attrs.features as string[]).join(', ') : '',
        emergency_rating: attrs.emergency_rating != null ? String(attrs.emergency_rating) : '',
        store_count: attrs.store_count != null ? String(attrs.store_count) : '',
        is_published: data.is_published || false,
        is_featured: data.is_featured || false,
        sort_order: data.sort_order || 0,
      });
      setIsStarred(!!data.is_starred);
      setIsFlagged(!!data.is_flagged);
      setFlagReason(data.flag_reason || null);
      setViewCount(data.view_count || 0);
      setReviewCount(data.review_count || 0);
      const folderList = await fetchAmenityFolders(id);
      setPlaceFolders(folderList);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (isEdit) fetchAmenity();
    else setLoading(false);
  }, [fetchAmenity, isEdit]);

  useEffect(() => {
    supabase
      .from('neighbourhoods')
      .select('id, name')
      .eq('is_published', true)
      .order('name', { ascending: true })
      .then(({ data }) => setNeighbourhoods(data || []));
  }, []);

  // Load the Amenity (category-level) list so places can be filed under a parent.
  const loadCategories = useCallback(async (applyInitial: boolean) => {
    const { data } = await supabase
      .from('amenity_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    const list = ((data || []) as AmenityCategoryRecord[]).map((c) => ({
      ...c,
      name: smartTitleCase(c.name) || c.name,
    }));
    setCategories(list);
    // Preselect the category arriving via ?category=<id> from the list page.
    if (applyInitial && !isEdit && list.length) {
      const wanted = searchParams.get('category');
      const target = wanted ? list.find((c) => c.id === wanted) : null;
      if (target) {
        const slug = target.slug || '';
        const firstSub = mergeSubcategories(slug, target.subcategories)[0]?.key || '';
        setForm((prev) => ({
          ...prev,
          category_id: target.id,
          category: slug || prev.category,
          subcategory: firstSub || prev.subcategory,
        }));
      }
    }
    return list;
  }, [isEdit, searchParams]);

  useEffect(() => {
    loadCategories(true);
  }, [loadCategories]);

  // After the manager renames/deletes things, refresh the list and make sure the
  // form isn't still pointing at a category or sub category that no longer exists.
  const handleCategoriesChanged = async () => {
    const list = await loadCategories(false);
    setForm((prev) => {
      if (!prev.category_id) return prev;
      const rec = list.find((c) => c.id === prev.category_id);
      if (!rec) return { ...prev, category_id: '', subcategory: '' };
      const subs = mergeSubcategories(rec.slug, rec.subcategories);
      if (subs.some((s) => s.key === prev.subcategory)) return prev;
      return { ...prev, subcategory: subs[0]?.key || '' };
    });
  };

  const buildAttributes = (): Record<string, unknown> => {
    const attrs: Record<string, unknown> = {};
    const type = SUBCATEGORY_TO_TYPE[form.subcategory] || form.subcategory;
    if (type === 'school') {
      if (form.curriculum) attrs.curriculum = form.curriculum;
      if (form.fee_range) attrs.fee_range = form.fee_range;
      if (form.established) attrs.established = Number(form.established);
      if (form.student_count) attrs.student_count = Number(form.student_count);
      if (form.features) attrs.features = form.features.split(',').map((f) => f.trim()).filter(Boolean);
    }
    if (type === 'hospital' && form.emergency_rating) attrs.emergency_rating = Number(form.emergency_rating);
    if (type === 'mall' && form.store_count) attrs.store_count = Number(form.store_count);
    return attrs;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const errs: { website?: string; maps_url?: string } = {};
    if (!form.name.trim()) {
      addToast('Name is required', 'error');
      return;
    }
    if (!form.category_id) {
      addToast('Please select a category (Amenity) for this place/service', 'error');
      return;
    }
    if (!isValidHttpUrl(form.website)) errs.website = 'Enter a valid URL (e.g. https://example.com)';
    if (!isValidHttpUrl(form.maps_url)) errs.maps_url = 'Enter a valid URL (e.g. https://maps.google.com/...)';
    if (errs.website || errs.maps_url) {
      setUrlErrors(errs);
      addToast('Please fix the invalid URLs', 'error');
      return;
    }
    setUrlErrors({});
    setSaving(true);

    const labelStyle = {
      bg: form.label_bg || null,
      text: form.label_text || null,
      border: form.label_border || null,
      icon: form.icon || null,
    };

    const payload = {
      name: form.name.trim(),
      type: SUBCATEGORY_TO_TYPE[form.subcategory] || form.subcategory || 'school',
      category: form.category || null,
      category_id: form.category_id || null,
      subcategory: form.subcategory || null,
      neighbourhood_id: form.neighbourhood_id || null,
      neighbourhood_name: form.neighbourhood_name || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      address: form.address || null,
      city: form.city || 'Nairobi',
      country: form.country || 'Kenya',
      description: form.description || null,
      website: form.website.trim() ? normalizeUrl(form.website) : null,
      maps_url: form.maps_url.trim() ? normalizeUrl(form.maps_url) : null,
      phone: form.phone || null,
      email: form.email || null,
      opening_hours: form.opening_hours || null,
      rating: form.rating ? Number(form.rating) : null,
      purpose: (form.purpose === CUSTOM_PURPOSE ? form.purpose_custom.trim() : form.purpose) || null,
      price_tier: form.price_tier || null,
      services: form.services.filter(Boolean),
      price_range: form.price_range.trim() || null,
      google_review_text: form.google_review_text.trim() || null,
      image: form.image || null,
      gallery: form.gallery.filter(Boolean),
      alt_text: form.alt_text || null,
      label: form.label || null,
      label_style: labelStyle,
      icon: form.icon || null,
      attributes: buildAttributes(),
      is_published: form.is_published,
      is_featured: form.is_featured,
      sort_order: Number(form.sort_order) || 0,
    };

    if (isEdit && id) {
      const { error } = await supabase.from('amenities').update(payload).eq('id', id);
      if (error) {
        addToast('Failed to save amenity', 'error');
      } else {
        addToast('Amenity updated successfully', 'success');
        broadcastSync();
      }
    } else {
      const { error } = await supabase.from('amenities').insert(payload).select('id').single();
      if (error) {
        addToast('Failed to create amenity', 'error');
      } else {
        addToast('Amenity created successfully', 'success');
        broadcastSync();
        navigate('/admin/amenities', { replace: true });
      }
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="ri-loader-4-line text-[#0d5959] text-3xl animate-spin" />
      </div>
    );
  }

  const inputClass =
    'w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20';
  const labelClass = 'block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5';

  const previewImage = form.image && !isGeneratedImage(form.image) ? form.image : '';
  const previewLabel = form.label || subcategoryLabel(form.subcategory) || categoryLabel(form.category);
  const previewColor = form.label_bg || categoryRecordColor(categories.find((c) => c.id === form.category_id) || null, form.category);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/amenities')} className="p-2 hover:bg-white/5 rounded-lg cursor-pointer text-[#9ca3af] transition-colors">
            <i className="ri-arrow-left-line text-lg" />
          </button>
          <h1 className="font-jost text-lg font-medium text-white">
            {isEdit ? 'Edit Amenity' : 'New Amenity'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setManagerFocus(form.category_id || null); setManagerTab('categories'); setManagerOpen(true); }}
            className="flex items-center gap-2 border border-white/30 text-white px-4 py-2.5 rounded-lg text-sm font-roboto font-medium hover:bg-white/10 transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-folder-settings-line" />
            Manage Categories
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={saving}
            className="flex items-center gap-2 bg-white hover:bg-[#eef7f5] text-[#0d5959] px-5 py-2.5 rounded-lg text-sm font-roboto font-medium transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <i className={`${saving ? 'ri-loader-4-line animate-spin' : 'ri-save-line'}`} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* Form */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <h2 className="font-jost text-sm font-semibold text-[#001731] uppercase tracking-wider">Basics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Name *</label>
                <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} className={inputClass} placeholder="e.g. Brookhouse School" />
              </div>
              <div>
                <label className={labelClass}>Neighbourhood</label>
                <select
                  value={form.neighbourhood_id}
                  onChange={(e) => {
                    const opt = neighbourhoods.find((n) => n.id === e.target.value);
                    handleChange('neighbourhood_id', e.target.value);
                    handleChange('neighbourhood_name', opt ? opt.name : '');
                  }}
                  className={inputClass}
                >
                  <option value="">— Select —</option>
                  {neighbourhoods.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <InlineAddSelect
                  label="Category (Amenity) *"
                  value={form.category_id}
                  onChange={handleParentChange}
                  options={(categories.length ? categories : AMENITY_CATEGORIES.map((c) => ({ id: c.key as string, slug: c.key, name: c.label }))).map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="— Select category —"
                  newPlaceholder="New category name e.g. Faith & Connectivity"
                  newNoun="category"
                  onAdd={handleAddCategory}
                />
              </div>
              <div>
                <InlineAddSelect
                  label="Subcategory / Type"
                  value={subOptions.some((s) => s.key === form.subcategory) ? form.subcategory : ''}
                  onChange={(v) => handleChange('subcategory', v)}
                  options={subOptions.map((s) => ({ value: s.key, label: s.label }))}
                  placeholder="— Select sub category —"
                  newPlaceholder="New sub category e.g. Church, Social Group, 5-Star"
                  newNoun="sub category"
                  onAdd={handleAddSubcategory}
                  addDisabled={!form.category_id}
                  addDisabledHint="Select a category first"
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} className={`${inputClass} min-h-[80px] resize-none`} placeholder="Short description shown on the neighbourhood page..." maxLength={500} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <h2 className="font-jost text-sm font-semibold text-[#001731] uppercase tracking-wider">Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Address</label>
                <input type="text" value={form.address} onChange={(e) => handleChange('address', e.target.value)} className={inputClass} placeholder="Street address" />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input type="text" value={form.city} onChange={(e) => handleChange('city', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input type="text" value={form.country} onChange={(e) => handleChange('country', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Latitude</label>
                <input type="number" step="any" value={form.latitude} onChange={(e) => handleChange('latitude', e.target.value)} className={inputClass} placeholder="-1.2921" />
              </div>
              <div>
                <label className={labelClass}>Longitude</label>
                <input type="number" step="any" value={form.longitude} onChange={(e) => handleChange('longitude', e.target.value)} className={inputClass} placeholder="36.7869" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <h2 className="font-jost text-sm font-semibold text-[#001731] uppercase tracking-wider">Contact & Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Phone</label>
                <input type="text" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Website</label>
                <input type="text" value={form.website} onChange={(e) => handleChange('website', e.target.value)} className={inputClass} placeholder="https://..." />
                {urlErrors.website && <p className="text-xs text-red-500 mt-1">{urlErrors.website}</p>}
              </div>
              <div>
                <label className={labelClass}>Google Maps Link</label>
                <input type="text" value={form.maps_url} onChange={(e) => handleChange('maps_url', e.target.value)} className={inputClass} placeholder="https://maps.google.com/..." />
                {urlErrors.maps_url && <p className="text-xs text-red-500 mt-1">{urlErrors.maps_url}</p>}
              </div>
              <div>
                <label className={labelClass}>Opening Hours</label>
                <input type="text" value={form.opening_hours} onChange={(e) => handleChange('opening_hours', e.target.value)} className={inputClass} placeholder="Mon–Fri 8am–5pm" />
              </div>
              <div>
                <label className={labelClass}>Rating (0-5)</label>
                <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => handleChange('rating', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <div>
              <h2 className="font-jost text-sm font-semibold text-[#001731] uppercase tracking-wider">Services & Pricing</h2>
              <p className="text-xs text-[#7a8a99] mt-1">What this place offers and its typical price range — great for enriching the listing.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Price Range</label>
                <input
                  type="text"
                  value={form.price_range}
                  onChange={(e) => handleChange('price_range', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. KSh 500 - 2,000 per person"
                />
              </div>
              <TagListField
                label="Services Offered"
                value={form.services}
                onChange={(next) => handleChange('services', next)}
                placeholder="e.g. Dine-in, Delivery, Catering"
                suggestions={['Dine-in', 'Takeaway', 'Delivery', 'Catering', 'Parking', 'Wi-Fi', 'Card payments', 'Booking required']}
                hint="Add as many as you like — type one and press Enter."
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <h2 className="font-jost text-sm font-semibold text-[#001731] uppercase tracking-wider">Label & Appearance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Badge Label (override)</label>
                <input type="text" value={form.label} onChange={(e) => handleChange('label', e.target.value)} className={inputClass} placeholder="e.g. Primary School" />
              </div>
              <div>
                <label className={labelClass}>Icon (remix class, optional)</label>
                <input type="text" value={form.icon} onChange={(e) => handleChange('icon', e.target.value)} className={inputClass} placeholder="ri-graduation-cap-line" />
              </div>
              <div>
                <label className={labelClass}>Label Background</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.label_bg || '#1F7A6E'} onChange={(e) => handleChange('label_bg', e.target.value)} className="w-10 h-9 rounded border border-[#e8edf2] cursor-pointer bg-white p-1" />
                  <input type="text" value={form.label_bg} onChange={(e) => handleChange('label_bg', e.target.value)} className={inputClass} placeholder="#1F7A6E" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Label Text Colour</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.label_text || '#ffffff'} onChange={(e) => handleChange('label_text', e.target.value)} className="w-10 h-9 rounded border border-[#e8edf2] cursor-pointer bg-white p-1" />
                  <input type="text" value={form.label_text} onChange={(e) => handleChange('label_text', e.target.value)} className={inputClass} placeholder="#ffffff" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Label Border Colour</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.label_border || '#000000'} onChange={(e) => handleChange('label_border', e.target.value)} className="w-10 h-9 rounded border border-[#e8edf2] cursor-pointer bg-white p-1" />
                  <input type="text" value={form.label_border} onChange={(e) => handleChange('label_border', e.target.value)} className={inputClass} placeholder="transparent" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <h2 className="font-jost text-sm font-semibold text-[#001731] uppercase tracking-wider">Media</h2>
            <ImageUploadField
              label="Primary Image"
              value={form.image}
              onChange={(url) => handleChange('image', url)}
              pageKey="amenities"
              fieldKey="image"
              previewWidth="w-40"
              previewHeight="h-28"
            />
            <div>
              <label className={labelClass}>Alt Text</label>
              <input type="text" value={form.alt_text} onChange={(e) => handleChange('alt_text', e.target.value)} className={inputClass} placeholder="Describe the image for accessibility & SEO" />
            </div>
            <AmenityGalleryField value={form.gallery} onChange={(urls) => handleChange('gallery', urls)} />
          </div>

          {(SUBCATEGORY_TO_TYPE[form.subcategory] || form.subcategory) === 'school' && (
            <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
              <h2 className="font-jost text-sm font-semibold text-[#001731] uppercase tracking-wider">School Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Curriculum</label>
                  <input type="text" value={form.curriculum} onChange={(e) => handleChange('curriculum', e.target.value)} className={inputClass} placeholder="British (IGCSE / A-Levels)" />
                </div>
                <div>
                  <label className={labelClass}>Fee Range</label>
                  <input type="text" value={form.fee_range} onChange={(e) => handleChange('fee_range', e.target.value)} className={inputClass} placeholder="KSh 1.2M - 2.5M per year" />
                </div>
                <div>
                  <label className={labelClass}>Established</label>
                  <input type="number" value={form.established} onChange={(e) => handleChange('established', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Student Count</label>
                  <input type="number" value={form.student_count} onChange={(e) => handleChange('student_count', e.target.value)} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Features (comma separated)</label>
                  <input type="text" value={form.features} onChange={(e) => handleChange('features', e.target.value)} className={inputClass} placeholder="Boarding, Swimming pool, STEM lab" />
                </div>
              </div>
            </div>
          )}
          {(SUBCATEGORY_TO_TYPE[form.subcategory] || form.subcategory) === 'hospital' && (
            <div className="bg-white rounded-xl border border-[#e8edf2] p-6">
              <label className={labelClass}>Emergency Rating (1-5)</label>
              <input type="number" min="1" max="5" value={form.emergency_rating} onChange={(e) => handleChange('emergency_rating', e.target.value)} className={inputClass} />
            </div>
          )}
          {(SUBCATEGORY_TO_TYPE[form.subcategory] || form.subcategory) === 'mall' && (
            <div className="bg-white rounded-xl border border-[#e8edf2] p-6">
              <label className={labelClass}>Store Count</label>
              <input type="number" value={form.store_count} onChange={(e) => handleChange('store_count', e.target.value)} className={inputClass} />
            </div>
          )}

          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <div>
              <h2 className="font-jost text-sm font-semibold text-[#001731] uppercase tracking-wider">Reviews (from Google)</h2>
              <p className="text-xs text-[#7a8a99] mt-1">Paste the review text you collected, then add individual reviews below.</p>
            </div>
            <div>
              <label className={labelClass}>Google review text</label>
              <textarea
                value={form.google_review_text}
                onChange={(e) => handleChange('google_review_text', e.target.value)}
                maxLength={500}
                className={`${inputClass} min-h-[90px] resize-none`}
                placeholder="Paste one or more review snippets from Google here…"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-[11px] ${form.google_review_text.length > 450 ? 'text-red-600' : 'text-[#9ca3af]'}`}>
                  {form.google_review_text.length}/500
                </span>
              </div>
            </div>
            <div className="border-t border-[#e8edf2] pt-4">
              <p className="text-xs font-semibold text-[#7a8a99] uppercase tracking-wider mb-3">Structured reviews</p>
              <AmenityReviewsField amenityId={isEdit ? id || null : null} onCountChange={setReviewCount} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <h2 className="font-jost text-sm font-semibold text-[#001731] uppercase tracking-wider">Visibility</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Display Order</label>
                <input type="number" value={form.sort_order} onChange={(e) => handleChange('sort_order', Number(e.target.value))} className={inputClass} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer self-end pb-1">
                <input type="checkbox" checked={form.is_published} onChange={(e) => handleChange('is_published', e.target.checked)} className="w-4 h-4 text-[#0d5959] border-[#e8edf2] rounded focus:ring-[#0d5959]" />
                <span className="text-sm font-roboto text-[#001731]">Published</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer self-end pb-1">
                <input type="checkbox" checked={form.is_featured} onChange={(e) => handleChange('is_featured', e.target.checked)} className="w-4 h-4 text-[#0d5959] border-[#e8edf2] rounded focus:ring-[#0d5959]" />
                <span className="text-sm font-roboto text-[#001731]">Featured</span>
              </label>
            </div>
          </div>
        </div>

        {/* Preview column */}
        <div className="xl:col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-[#e8edf2] p-4">
            <h3 className="font-jost text-sm font-semibold text-[#001731] mb-3">Management</h3>
            <div className="space-y-2.5 text-sm">
              <button
                type="button"
                onClick={async () => {
                  if (!id) return;
                  const ok = await toggleStar(id, isStarred);
                  if (ok) {
                    setIsStarred(!isStarred);
                    addToast(!isStarred ? 'Marked important' : 'Removed important', 'success');
                  }
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${isStarred ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-[#e8edf2] text-[#33414f] hover:bg-[#f7f8fa]'}`}
              >
                <i className={`${isStarred ? 'ri-star-fill' : 'ri-star-line'} text-base`} />
                {isStarred ? 'Important' : 'Mark as important'}
              </button>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isFlagged ? 'border-[#c2410c]/40 bg-[#fff7ed] text-[#9a3412]' : 'border-[#e8edf2] text-[#7a8a99]'}`}>
                <i className={`${isFlagged ? 'ri-flag-fill' : 'ri-flag-line'} text-base`} />
                {isFlagged ? `Flagged · ${flagReason || 'Needs verification'}` : 'Not flagged'}
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#e8edf2] text-[#33414f]">
                <i className="ri-eye-line text-base text-[#0d5959]" /> {viewCount.toLocaleString()} public views
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#e8edf2] text-[#33414f]">
                <i className="ri-chat-3-line text-base text-[#0d5959]" /> {reviewCount} approved review{reviewCount === 1 ? '' : 's'}
              </div>
              <div className="px-3 py-2 rounded-lg border border-[#e8edf2]">
                <p className="text-xs text-[#7a8a99] uppercase tracking-wider mb-1.5">Folders</p>
                {placeFolders.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {placeFolders.map((f) => (
                      <span key={f.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#eef7f5] text-[#0d5959] text-xs font-semibold">
                        <i className={`${f.icon || 'ri-folder-2-line'} text-xs`} /> {f.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-[#7a8a99]">None — move from the directory list.</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e8edf2] overflow-hidden sticky top-20">
            <div className="px-4 py-3 border-b border-[#e8edf2]">
              <h3 className="font-jost text-sm font-semibold text-[#001731]">Preview</h3>
              <p className="text-xs text-[#7a8a99]">How this amenity appears on the neighbourhood page.</p>
            </div>
            <div className="relative h-44 overflow-hidden">
              {previewImage ? (
                <img src={previewImage} alt={form.alt_text || form.name || 'Preview'} className="w-full h-full object-cover object-center" />
              ) : (
                <NoImagePlaceholder />
              )}
              <div
                className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
                style={{ backgroundColor: previewColor, color: form.label_text || '#ffffff', border: `1px solid ${form.label_border || 'transparent'}` }}
              >
                {previewLabel}
              </div>
            </div>
            <div className="p-4 space-y-1.5">
              <p className="text-xs text-golden font-semibold uppercase tracking-wider">{categoryLabel(form.category)}</p>
              <h4 className="font-semibold text-[#001731] text-sm">{form.name || 'Amenity name'}</h4>
              <p className="text-xs text-[#7a8a99] line-clamp-2">{form.description || 'No description yet.'}</p>
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0d5959] text-white rounded-md text-[11px] font-semibold">
                  View Details
                </span>
                {form.website && <span className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#0d5959]/25 text-[#0d5959] rounded-md text-[11px] font-semibold">Website <i className="ri-external-link-line text-xs"></i></span>}
                {form.maps_url && <span className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#0d5959]/25 text-[#0d5959] rounded-md text-[11px] font-semibold"><i className="ri-map-pin-line text-xs"></i> Directions</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CategoryManagerModal
        open={managerOpen}
        categories={categories}
        focusCategoryId={managerFocus}
        initialTab={managerTab}
        showFullEditor={false}
        onClose={() => setManagerOpen(false)}
        onChanged={handleCategoriesChanged}
      />
    </div>
  );
}