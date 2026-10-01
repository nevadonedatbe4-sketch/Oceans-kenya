import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import { persistImageColumns } from '@/lib/imagePersistence';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import ImageEditor from '@/pages/crm/components/ImageEditor';
import CategoryManagerModal from '@/pages/crm/components/CategoryManagerModal';
import { AMENITY_CATEGORIES, contrastTextOn, isGeneratedImage, type AmenityCategoryRecord } from '@/lib/amenities';
import { smartTitleCase } from '@/lib/location';
import NoImagePlaceholder from '@/components/feature/NoImagePlaceholder';

interface CatForm {
  name: string;
  slug: string;
  color: string;
  icon: string;
  description: string;
  image: string;
  sort_order: number;
  is_published: boolean;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const emptyForm: CatForm = {
  name: '',
  slug: '',
  color: '#0d5959',
  icon: 'ri-store-2-line',
  description: '',
  image: '',
  sort_order: 0,
  is_published: true,
};

export default function AmenityCategoryEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<CatForm>(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [editingImage, setEditingImage] = useState(false);
  const [categories, setCategories] = useState<AmenityCategoryRecord[]>([]);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerFocus, setManagerFocus] = useState<string | null>(null);
  const [managerTab, setManagerTab] = useState<'categories' | 'subcategories'>('categories');

  const handleChange = <K extends keyof CatForm>(field: K, value: CatForm[K]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  const fetchCategory = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('amenity_categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      addToast('Failed to load category', 'error');
    } else if (data) {
      const c = data as AmenityCategoryRecord;
      setForm({
        name: smartTitleCase(c.name) || c.name || '',
        slug: c.slug || '',
        color: c.color || '#0d5959',
        icon: c.icon || 'ri-store-2-line',
        description: c.description || '',
        image: c.image || '',
        sort_order: c.sort_order || 0,
        is_published: c.is_published,
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (isEdit) fetchCategory();
    else setLoading(false);
  }, [fetchCategory, isEdit]);

  // Load the full category list so the Manage Categories modal can rename/delete
  // categories and manage their sub categories without leaving this form.
  const loadCategories = useCallback(async () => {
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
    return list;
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // After the manager renames or deletes things, refresh the list and keep the
  // form in sync (reflect a rename, or bail out if this category was deleted).
  const handleCategoriesChanged = async () => {
    const list = await loadCategories();
    if (isEdit && id) {
      const still = list.find((c) => c.id === id);
      if (!still) {
        addToast('This category was deleted', 'info');
        navigate('/admin/amenities', { replace: true });
      } else {
        setForm((prev) => ({ ...prev, name: still.name || prev.name }));
      }
    }
  };

  /**
   * Write an image change straight to the record and verify it stuck, so an
   * image that reports as "saved" is genuinely retrievable after a refresh.
   * New (unsaved) categories have no id yet, so the value simply stays local
   * until the category is created.
   */
  const persistCategoryImage = async (url: string, successMessage: string) => {
    if (!isEdit || !id) return;
    const result = await persistImageColumns('amenity_categories', id, { image: url || null });
    if (result.ok) {
      addToast(successMessage, 'success');
      broadcastSync();
    } else {
      addToast(result.error || 'Failed to save category image', 'error');
    }
  };

  const handleImageEditorSave = async (url: string) => {
    handleChange('image', url);
    setEditingImage(false);
    await persistCategoryImage(url, 'Category image updated');
  };

  const handleImageUploadChange = (url: string) => {
    handleChange('image', url);
    persistCategoryImage(url, url ? 'Category image saved' : 'Category image removed');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) {
      addToast('Category name is required', 'error');
      return;
    }
    const slug = slugify(form.slug) || slugify(form.name);
    if (!slug) {
      addToast('Please provide a valid slug', 'error');
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      slug,
      color: form.color || null,
      icon: form.icon || null,
      description: form.description || null,
      image: form.image || null,
      sort_order: Number(form.sort_order) || 0,
      is_published: form.is_published,
    };

    if (isEdit && id) {
      const { error } = await supabase.from('amenity_categories').update(payload).eq('id', id);
      if (error) {
        addToast('Failed to save category', 'error');
      } else {
        addToast('Category updated successfully', 'success');
        broadcastSync();
        navigate('/admin/amenities', { replace: true });
      }
    } else {
      const { error } = await supabase.from('amenity_categories').insert(payload).select('id').single();
      if (error) {
        addToast('Failed to create category', 'error');
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
    'w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white text-[#001731]';
  const labelClass = 'block text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider mb-1.5';

  const previewImage = form.image && !isGeneratedImage(form.image) ? form.image : '';
  const previewLabel = form.name || 'Category name';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/amenities')}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-line text-lg" />
          </button>
          <h1 className="font-jost text-lg font-semibold text-white">
            {isEdit ? 'Edit Amenity' : 'New Amenity'}
          </h1>
          <span className="text-xs font-roboto font-semibold text-[#5eead4] bg-[#5eead4]/10 px-2 py-1 rounded-full uppercase tracking-wider">
            Category
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setManagerFocus(id || null);
              setManagerTab('categories');
              setManagerOpen(true);
            }}
            className="flex items-center gap-2 border border-white/30 text-white px-4 py-2.5 rounded-lg text-sm font-roboto font-medium hover:bg-white/10 transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-folder-settings-line" />
            Manage Categories
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={saving}
            className="flex items-center gap-2 bg-white text-[#0d5959] px-5 py-2.5 rounded-lg text-sm font-roboto font-medium hover:bg-[#eef7f5] transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <i className={`${saving ? 'ri-loader-4-line animate-spin' : 'ri-save-line'}`} />
            {saving ? 'Saving...' : 'Save Category'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* Form */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <h2 className="font-jost text-sm font-semibold text-[#001731] uppercase tracking-wider">Category Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Name *</label>
                <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} className={inputClass} placeholder="e.g. Education" />
              </div>
              <div>
                <label className={labelClass}>Slug (key)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    handleChange('slug', e.target.value);
                  }}
                  className={inputClass}
                  placeholder="e.g. education"
                />
                <p className="text-[11px] text-[#7a8a99] mt-1 font-roboto">Unique key used to link place/service records.</p>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} className={`${inputClass} min-h-[80px] resize-none`} maxLength={500} placeholder="Short description shown on the plan / category pages..." />
              </div>
              <div>
                <label className={labelClass}>Accent Colour</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color} onChange={(e) => handleChange('color', e.target.value)} className="w-10 h-10 rounded border border-[#e8edf2] cursor-pointer bg-white p-1" />
                  <input type="text" value={form.color} onChange={(e) => handleChange('color', e.target.value)} className={inputClass} placeholder="#0d5959" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Icon (remix class)</label>
                <input type="text" value={form.icon} onChange={(e) => handleChange('icon', e.target.value)} className={inputClass} placeholder="ri-store-2-line" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <h2 className="font-jost text-sm font-semibold text-[#001731] uppercase tracking-wider">Media</h2>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 flex items-center justify-center rounded-xl shrink-0" style={{ backgroundColor: form.color, color: contrastTextOn(form.color) }}>
                <i className={`${form.icon || 'ri-store-2-line'} text-2xl`} />
              </div>
              <div className="text-sm font-roboto text-[#001731]">
                <p className="font-semibold">{previewLabel}</p>
                <p className="text-xs text-[#7a8a99]">Used on category cards across the site.</p>
              </div>
            </div>

            {editingImage ? (
              <ImageEditor
                src={form.image}
                uploadPath={`amenity-categories/${id || 'new'}-image-edited-${Date.now()}.jpg`}
                aspect={16 / 9}
                title={`Edit Image — ${previewLabel}`}
                onCancel={() => setEditingImage(false)}
                onSave={handleImageEditorSave}
              />
            ) : (
              <>
                <ImageUploadField label="Category Image" value={form.image} onChange={(url) => handleImageUploadChange(url)} pageKey="amenity-categories" fieldKey="image" previewWidth="w-40" previewHeight="h-28" />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingImage(true)}
                    disabled={!form.image}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#0d5959]/30 text-[#0d5959] text-sm font-roboto font-medium hover:bg-[#0d5959]/5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <i className="ri-crop-2-line" /> Edit &amp; Position
                  </button>
                  <p className="text-xs text-[#7a8a99] font-roboto">
                    {form.image ? 'Crop, zoom, drag to position, rotate, flip and adjust.' : 'Upload an image first, then you can crop and position it.'}
                  </p>
                </div>
              </>
            )}
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
                <span className="text-sm font-roboto text-[#001731]">Visible on site</span>
              </label>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-xl border border-[#e8edf2] overflow-hidden sticky top-20">
            <div className="px-4 py-3 border-b border-[#e8edf2]">
              <h3 className="font-jost text-sm font-semibold text-[#001731]">Preview</h3>
              <p className="text-xs text-[#7a8a99]">How this category card appears.</p>
            </div>
            <div className="relative h-40 overflow-hidden">
              {previewImage ? (
                <img src={previewImage} alt={previewLabel} className="w-full h-full object-cover object-center" />
              ) : (
                <NoImagePlaceholder />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-3">
                <div className="w-11 h-11 flex items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: form.color, color: contrastTextOn(form.color) }}>
                  <i className={`${form.icon || 'ri-store-2-line'} text-xl`} />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{previewLabel}</p>
                  <p className="text-white/70 text-xs line-clamp-1 font-roboto">{form.description || 'Category preview'}</p>
                </div>
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
        onClose={() => setManagerOpen(false)}
        onChanged={handleCategoriesChanged}
      />
    </div>
  );
}