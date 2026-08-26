import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import JVImageManager, { type JvImageDraft } from '@/pages/crm/components/JVImageManager';

const inputCls =
  'w-full border border-[#e5e9ee] px-3.5 py-2.5 text-sm font-roboto text-[#001731] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 rounded-lg bg-white';

const labelCls = 'block text-[#001731] font-roboto text-sm font-medium mb-1.5';

const PROJECT_TYPE_SUGGESTIONS = [
  'Residential',
  'Commercial',
  'Mixed Use',
  'Hospitality',
  'Land Development',
  'Industrial',
  'Apartment Block',
  'Gated Community',
  'Hotel & Resort',
  'Commercial Complex',
  'Agri-Processing',
  'Other',
];

const STATUS_SUGGESTIONS = [
  'Live Pipeline',
  'Seeking Partner',
  'In Discussion',
  'Partner Secured',
  'On Hold',
  'Closed',
  'Seeking Land Partner',
  'Seeking Equity Investor',
  'Seeking Development Partner',
  'Seeking Land & Capital',
  'Seeking Strategic Investor',
  'Seeking Joint Venture Partner',
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function JVProjectEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [location, setLocation] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Live Pipeline');
  const [units, setUnits] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [featured, setFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [images, setImages] = useState<JvImageDraft[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('jv_projects')
        .select('*, jv_project_images(id, image_url, storage_path, alt_text, sort_order, is_cover)')
        .eq('id', id)
        .maybeSingle();

      if (error || !data || cancelled) {
        if (!cancelled) addToast('Failed to load project', 'error');
        setLoading(false);
        return;
      }

      setTitle(String(data.title || ''));
      setSlug(String(data.slug || ''));
      setLocation(String(data.location || ''));
      setType(String(data.type || ''));
      setDescription(String(data.description || ''));
      setStatus(String(data.status || 'Live Pipeline'));
      setUnits(data.units ? String(data.units) : '');
      setPriceRange(String(data.price_range || ''));
      setFeatured(Boolean(data.featured));
      setIsPublished(Boolean(data.is_published));

      const rows = Array.isArray(data.jv_project_images) ? data.jv_project_images : [];
      const sorted = [...rows].sort((a: any, b: any) => {
        if (Boolean(a.is_cover) !== Boolean(b.is_cover)) return a.is_cover ? -1 : 1;
        return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
      });
      const drafts: JvImageDraft[] = sorted.map((r: any) => ({
        id: String(r.id),
        url: String(r.image_url || ''),
        alt: String(r.alt_text || ''),
        sortOrder: Number(r.sort_order ?? 0),
        isCover: Boolean(r.is_cover),
        storagePath: r.storage_path ? String(r.storage_path) : undefined,
      }));
      setImages(drafts);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const finalSlug = slug.trim() || slugify(title);
    const projectPayload = {
      title: title.trim(),
      slug: finalSlug || null,
      location: location.trim() || null,
      type: type.trim() || null,
      description: description.trim() || null,
      status: status.trim() || 'Live Pipeline',
      units: units ? Number(units) : null,
      price_range: priceRange.trim() || null,
      featured,
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    };

    try {
      let projectId = id;

      if (isEdit) {
        const { error } = await supabase.from('jv_projects').update(projectPayload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('jv_projects')
          .insert({ ...projectPayload, image: images[0]?.url || null })
          .select('id')
          .single();
        if (error) throw error;
        projectId = data.id;
      }

      // Rebuild the complete image set: clear then insert the ordered drafts.
      if (projectId) {
        const { error: delErr } = await supabase.from('jv_project_images').delete().eq('project_id', projectId);
        if (delErr) throw delErr;

        if (images.length > 0) {
          const rows = images.map((img, idx) => ({
            project_id: projectId,
            image_url: img.url,
            storage_path: img.storagePath || null,
            alt_text: img.alt || null,
            sort_order: idx + 1,
            is_cover: img.isCover,
          }));
          const { error: insErr } = await supabase.from('jv_project_images').insert(rows);
          if (insErr) throw insErr;
        }
      }

      addToast(isEdit ? 'Project updated' : 'Project created', 'success');
      broadcastSync();
      navigate('/crm/joint-ventures?tab=projects');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to save project', 'error');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-8 animate-pulse space-y-4">
          <div className="h-6 w-48 bg-[#f7f8fa] rounded" />
          <div className="h-10 bg-[#f7f8fa] rounded" />
          <div className="h-10 bg-[#f7f8fa] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="font-jost text-xl font-semibold text-[#001731]">
            {isEdit ? 'Edit Project' : 'Add Project'}
          </h1>
          <p className="text-sm font-roboto text-[#636363] mt-0.5">
            {isEdit ? 'Update this project seeking partners' : 'Add a new project to the Projects Seeking Partners section'}
          </p>
        </div>
        <button
          onClick={() => navigate('/crm/joint-ventures?tab=projects')}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto text-[#636363] hover:text-[#0d5959] hover:border-[#0d5959]/20 transition-all cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line" />
          Back to projects
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#f0f0f0] p-5 md:p-6 space-y-6">
        {/* Basic info */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-[#001731] text-white text-[11px] font-bold flex items-center justify-center">1</span>
            <h2 className="font-jost text-sm font-semibold text-[#001731]">Basic Information</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Project title *</label>
              <input
                required
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Riverside Heights — 48-Unit Apartment Block"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Slug</label>
              <input
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                placeholder="auto-generated from title"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Riverside Drive, Westlands"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Project type</label>
              <input
                list="jv-project-types"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="e.g. Residential"
                className={inputCls}
              />
              <datalist id="jv-project-types">
                {PROJECT_TYPE_SUGGESTIONS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <input
                list="jv-statuses"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="e.g. Live Pipeline"
                className={inputCls}
              />
              <datalist id="jv-statuses">
                {STATUS_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>Number of units</label>
              <input
                type="number"
                min={0}
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g. 48"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Price range</label>
              <input
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                placeholder="e.g. KSh 180M – 220M"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Project summary, approvals, capital ask..."
                className={`${inputCls} resize-none`}
              />
              <p className="text-right text-xs text-[#9ca3af] font-roboto mt-1">{description.length}/1000</p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#f0f0f0]" />

        {/* Images */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-[#001731] text-white text-[11px] font-bold flex items-center justify-center">2</span>
            <h2 className="font-jost text-sm font-semibold text-[#001731]">Project Images</h2>
          </div>
          <JVImageManager images={images} onChange={setImages} />
        </div>

        <div className="border-t border-[#f0f0f0]" />

        {/* Visibility */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-[#001731] text-white text-[11px] font-bold flex items-center justify-center">3</span>
            <h2 className="font-jost text-sm font-semibold text-[#001731]">Visibility</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 rounded border-[#c0c8d0] text-[#0d5959] focus:ring-[#0d5959]"
              />
              <span className="text-sm font-roboto text-[#001731]">Featured</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded border-[#c0c8d0] text-[#0d5959] focus:ring-[#0d5959]"
              />
              <span className="text-sm font-roboto text-[#001731]">Published (visible on public site)</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-[#f0f0f0]">
          <button
            type="button"
            onClick={() => navigate('/crm/joint-ventures?tab=projects')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-roboto text-[#636363] border border-[#f0f0f0] hover:text-[#001731] hover:border-[#c0c8d0] transition-all cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-7 py-2.5 rounded-lg text-sm font-roboto bg-[#0d5959] hover:bg-[#0d5959]/90 text-white transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-save-line" />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}