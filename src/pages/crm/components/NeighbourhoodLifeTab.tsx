import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import {
  categoryLabel,
  subcategoryLabel,
  categoryColor,
  type Amenity,
} from '@/lib/amenities';
import { softDelete } from '@/lib/directory';
import { useAreaDirectory } from '@/hooks/useAreaDirectory';
import { useCustomCategories } from '@/hooks/useCustomCategories';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import AmenityGalleryField from '@/pages/crm/components/AmenityGalleryField';
import { smartTitleCase } from '@/lib/location';

interface NeighbourhoodLifeTabProps {
  neighbourhoodId: string;
  neighbourhoodName: string;
}

interface AreaBlog {
  id: string;
  title: string;
  slug: string;
  status: string;
  featured_image: string | null;
  related_neighbourhoods: string[] | null;
}

const emptyAddForm = {
  name: '',
  category: 'education' as string,
  subcategory: 'primary_school' as string,
  website: '',
  phone: '',
  address: '',
  image: '',
  alt_text: '',
  gallery: [] as string[],
};

/** Adjustable nearby radius options (km) for this neighbourhood's directory. */
const RADIUS_OPTIONS = [1, 2, 3, 5, 10, 15, 20];

export default function NeighbourhoodLifeTab({ neighbourhoodId, neighbourhoodName }: NeighbourhoodLifeTabProps) {
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [adding, setAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [blogs, setBlogs] = useState<AreaBlog[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [neighbourhoodCoords, setNeighbourhoodCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Per-neighbourhood nearby radius (km). Defaults to 5 km; adjustable and
  // saved on the neighbourhood so the public guide matches this tab exactly.
  const [radiusKm, setRadiusKm] = useState(5);
  const [radiusSaving, setRadiusSaving] = useState(false);

  // Shared live-directory layer — the SAME source the rest of the site reads
  // from (Area Guides, neighbourhood pages). No local duplicate amenities
  // fetch — one source of truth, one set of counts.
  const directory = useAreaDirectory({
    neighbourhoodId,
    neighbourhoodName,
    latitude: neighbourhoodCoords?.lat ?? null,
    longitude: neighbourhoodCoords?.lng ?? null,
    radiusMeters: radiusKm * 1000,
  });
  const amenities = directory.amenities;
  const nearbyDirectory = directory.nearby;
  const areaDirectory = directory.areaDirectory;
  const loading = directory.loading;

  // Resolve the area's centre once so the shared layer can surface nearby places.
  useEffect(() => {
    if (!neighbourhoodId) return;
    let active = true;
    (async () => {
      const { data: nh } = await supabase
        .from('neighbourhoods')
        .select('latitude,longitude,nearby_radius_km')
        .eq('id', neighbourhoodId)
        .maybeSingle();
      if (!active || !nh) return;
      if (nh.latitude != null && nh.longitude != null) {
        setNeighbourhoodCoords({ lat: Number(nh.latitude), lng: Number(nh.longitude) });
      }
      if (nh.nearby_radius_km != null && Number(nh.nearby_radius_km) > 0) {
        setRadiusKm(Number(nh.nearby_radius_km));
      }
    })();
    return () => {
      active = false;
    };
  }, [neighbourhoodId]);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'local' | 'nearby'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'category' | 'type' | 'recent'>('name-asc');
  const [search, setSearch] = useState('');
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const categoryFilterRef = useRef<HTMLDivElement>(null);
  const addFormRef = useRef<HTMLDivElement>(null);

  const { allCategories, allSubcategories, addCategory, deleteCategory, categories: customCategories } = useCustomCategories();

  // Default the Places & Services list to the first category on initial load,
  // instead of showing everything. Only applied once so user selections stick.
  const hasSetDefaultCategory = useRef(false);
  useEffect(() => {
    if (!hasSetDefaultCategory.current && allCategories.length > 0) {
      hasSetDefaultCategory.current = true;
      setCategoryFilter(allCategories[0].key);
    }
  }, [allCategories]);

  // Create / manage a brand-new category (stored in site settings).
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({ label: '', icon: 'ri-list-settings-line', color: '#6B4423', description: '', subcats: '', image: '', alt_text: '', gallery: [] as string[] });
  const [catSaving, setCatSaving] = useState(false);

  // Close the open category dropdown when clicking outside the filter bar.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(e.target as Node)) {
        setOpenCategory(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchBlogs = useCallback(async () => {
    if (!neighbourhoodId) return;
    setBlogsLoading(true);
    const { data, error } = await supabase.from('blog_posts').select('*').order('published_at', { ascending: false }).limit(100);
    if (error) {
      addToast('Failed to load blogs', 'error');
      setBlogs([]);
    } else {
      const all = (data || []) as AreaBlog[];
      const linked = all.filter((b) =>
        Array.isArray(b.related_neighbourhoods) && b.related_neighbourhoods.includes(neighbourhoodId),
      );
      setBlogs(linked);
    }
    setBlogsLoading(false);
  }, [neighbourhoodId]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const handleCategoryChange = (category: string) => {
    const firstSub = allSubcategories[category]?.[0]?.key || '';
    setAddForm((prev) => ({ ...prev, category, subcategory: firstSub }));
  };

  const handleAdd = async () => {
    if (!neighbourhoodId || !addForm.name.trim()) {
      addToast('Name is required', 'error');
      return;
    }
    setAdding(true);
    const { error } = await supabase.from('amenities').insert({
      name: addForm.name.trim(),
      type: addForm.subcategory || 'school',
      category: addForm.category || null,
      subcategory: addForm.subcategory || null,
      neighbourhood_id: neighbourhoodId,
      neighbourhood_name: neighbourhoodName,
      website: addForm.website.trim() || null,
      phone: addForm.phone.trim() || null,
      address: addForm.address.trim() || null,
      city: 'Nairobi',
      country: 'Kenya',
      image: addForm.image || null,
      gallery: addForm.gallery.filter(Boolean),
      alt_text: addForm.alt_text.trim() || null,
      is_published: true,
      sort_order: 0,
    });
    if (error) {
      addToast('Failed to add place', 'error');
    } else {
      addToast('Place added to this area', 'success');
      setAddForm(emptyAddForm);
      setShowAdd(false);
      directory.refetch();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    // Soft-delete so the place lands in the Recycle Bin and can be restored —
    // a hard delete here would silently bypass the bin entirely.
    const ok = await softDelete(id);
    if (ok) {
      directory.refetch();
      addToast('Place removed from this area', 'success');
    }
    setDeleteConfirm(null);
  };

  const handleLinkBlog = async (blogId: string) => {
    const blog = blogs.find((b) => b.id === blogId);
    if (!blog) return;
    const current = Array.isArray(blog.related_neighbourhoods)
      ? blog.related_neighbourhoods.filter((n) => n !== neighbourhoodId)
      : [];
    const { error } = await supabase
      .from('blog_posts')
      .update({ related_neighbourhoods: [...current] })
      .eq('id', blogId);
    if (error) {
      addToast('Failed to unlink blog', 'error');
    } else {
      setBlogs((prev) => prev.filter((b) => b.id !== blogId));
      addToast('Blog unlinked from this area', 'success');
    }
  };

  // Live counts count ONLY the places actually linked/tagged to this area
  // (the `amenities` set) — nearby-within-radius spots are deliberately left
  // out so these tiles match what is genuinely assigned to the neighbourhood.
  const counts = allCategories.map((c) => ({
    ...c,
    count: amenities.filter((a) => a.category === c.key).length,
  }));

  const SCOPE_OPTIONS: { key: 'all' | 'local' | 'nearby'; label: string }[] = [
    { key: 'all', label: `All (${areaDirectory.length})` },
    { key: 'local', label: `Linked to area (${amenities.length})` },
    { key: 'nearby', label: `Nearby · ${radiusKm} km (${nearbyDirectory.length})` },
  ];

  // Persist the per-neighbourhood nearby radius so the public guide uses it too.
  const saveRadius = async (km: number) => {
    if (km === radiusKm) return;
    const previous = radiusKm;
    setRadiusKm(km);
    if (!neighbourhoodId) return;
    setRadiusSaving(true);
    const { error } = await supabase
      .from('neighbourhoods')
      .update({ nearby_radius_km: km })
      .eq('id', neighbourhoodId);
    setRadiusSaving(false);
    if (error) {
      setRadiusKm(previous);
      addToast('Failed to save nearby radius', 'error');
    } else {
      addToast(`Nearby radius set to ${km} km`, 'success');
    }
  };

  const areaLinkedIds = useMemo(() => new Set(amenities.map((a) => a.id)), [amenities]);

  // Apply strict category + scope + search filters, then the chosen sort.
  const visiblePlaces = useMemo(() => {
    let list: Amenity[] =
      scopeFilter === 'local' ? amenities : scopeFilter === 'nearby' ? nearbyDirectory : areaDirectory;

    if (categoryFilter !== 'all') list = list.filter((a) => a.category === categoryFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((a) =>
        [a.name, a.address, a.subcategory, categoryLabel(a.category)]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q))
      );
    }

    const sorted = [...list];
    switch (sortBy) {
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'category':
        sorted.sort(
          (a, b) =>
            categoryLabel(a.category).localeCompare(categoryLabel(b.category)) || a.name.localeCompare(b.name)
        );
        break;
      case 'type':
        sorted.sort(
          (a, b) =>
            subcategoryLabel(a.subcategory).localeCompare(subcategoryLabel(b.subcategory)) ||
            a.name.localeCompare(b.name)
        );
        break;
      case 'recent':
        sorted.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        break;
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [scopeFilter, categoryFilter, search, sortBy, amenities, nearbyDirectory, areaDirectory]);

  const inputClass =
    'w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20';
  const labelClass = 'block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5';

  const toggleCategory = (key: string) => {
    setOpenCategory((prev) => (prev === key ? null : key));
  };

  // Filter the list below to a whole category (mirrors the front-end "View all").
  const selectAllCategory = (key: string) => {
    setCategoryFilter(key);
    setSearch('');
    setOpenCategory(null);
  };

  // Filter the list below to a specific subcategory type (mirrors front-end pill tap).
  const selectSubcategory = (cat: string, sub: string) => {
    setCategoryFilter(cat);
    setSearch(subcategoryLabel(sub));
    setOpenCategory(null);
  };

  // Open the quick-add form pre-set to a category (used by the Live Count tiles
  // so a category that's at 0 — or under-stocked — can be topped up in one tap).
  const openAddForCategory = (cat: string) => {
    const firstSub = allSubcategories[cat]?.[0]?.key || '';
    setAddForm((prev) => ({ ...prev, category: cat, subcategory: firstSub }));
    setShowAdd(true);
    if (categoryFilter !== 'all') {
      setCategoryFilter('all');
      setSearch('');
    }
    requestAnimationFrame(() => {
      addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const handleAddCategory = async () => {
    if (!catForm.label.trim()) {
      addToast('Category name is required', 'error');
      return;
    }
    setCatSaving(true);
    try {
      const subs = catForm.subcats.split(',').map((s) => s.trim()).filter(Boolean);
      await addCategory({
        label: catForm.label.trim(),
        icon: catForm.icon.trim() || 'ri-list-settings-line',
        color: catForm.color || '#6B4423',
        description: catForm.description.trim(),
        subcategories: subs.map((s) => ({
          key: s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || s,
          label: s,
          icon: '',
        })),
        image: catForm.image || null,
        alt_text: catForm.alt_text.trim() || null,
        gallery: catForm.gallery.filter(Boolean),
      });
      addToast('Category added to the directory', 'success');
      setCatModalOpen(false);
    } catch {
      addToast('Failed to add category', 'error');
    }
    setCatSaving(false);
  };

  const handleDeleteCategory = async (key: string, label: string) => {
    try {
      await deleteCategory(key);
      addToast(`Removed “${label}”`, 'success');
    } catch {
      addToast('Failed to remove category', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-[#f8fafc] rounded-xl border border-[#e8edf2] p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#0d5959]/10 text-[#0d5959] shrink-0">
            <i className="ri-map-pin-user-line text-lg" />
          </div>
          <div>
            <h3 className="font-jost text-sm font-semibold text-[#001731]">Life Around Here</h3>
            <p className="text-sm font-medium font-roboto text-[#7a8a99] leading-relaxed max-w-2xl">
              Grow the everyday-life directory for <span className="text-[#0d5959] font-medium">{smartTitleCase(neighbourhoodName)}</span> — the
              schools, cafés, parks, banks, hospitals, shops, transport and services that make up daily living here. Live counts
              show the places actually linked to this area — the directory spots genuinely assigned to it.
            </p>
          </div>
        </div>
      </div>

      {/* Live count summary */}
      <div className="bg-white rounded-xl border border-[#e8edf2] p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-jost text-sm font-medium text-[#001731]">Live Category Counts</h4>
          <div className="flex items-center gap-3">
            <span className="text-xs font-roboto text-[#7a8a99]">{amenities.length} places linked to this area</span>
            <button
              onClick={() => {
                setCatForm({ label: '', icon: 'ri-list-settings-line', color: '#6B4423', description: '', subcats: '', image: '', alt_text: '', gallery: [] });
                setCatModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-3 py-1.5 rounded-lg text-xs font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line" />
              Add Category
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5">
          {counts.map((c) => (
            <div key={c.key} className="flex items-center gap-3 border border-[#e8edf2] rounded-lg p-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-md text-white shrink-0" style={{ backgroundColor: c.color }}>
                <i className={c.icon} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-roboto font-semibold text-[#001731] text-lg leading-tight truncate">{c.label}</p>
                <p className="font-roboto text-sm text-[#7a8a99] mt-0.5">
                  {c.count} place{c.count === 1 ? '' : 's'}
                </p>
              </div>
              <button
                onClick={() => openAddForCategory(c.key)}
                title={c.count > 0 ? `Add a ${c.label} place` : `${c.label} has no places yet — add one`}
                className={`w-7 h-7 flex items-center justify-center rounded-md cursor-pointer transition-colors flex-shrink-0 ${
                  c.count === 0
                    ? 'bg-[#eef4f4] text-[#0d5959] hover:bg-[#0d5959] hover:text-white'
                    : 'text-[#b7c2cc] hover:bg-[#f0f4f7] hover:text-[#0d5959]'
                }`}
              >
                <i className="ri-add-line" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Places & Services */}
      <div className="bg-white rounded-xl border border-[#e8edf2] p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="font-jost text-sm font-medium text-[#001731]">Places &amp; Services</h4>
            <p className="text-sm font-medium font-roboto text-[#7a8a99]">
              Every school, café, restaurant, bank, hospital, shop and service in or near this area, joined into one list. Filter and sort to narrow it down.
            </p>
          </div>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-4 py-2.5 rounded-lg text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap"
          >
            <i className={`${showAdd ? 'ri-subtract-line' : 'ri-add-line'}`} />
            {showAdd ? 'Close' : 'Add Place'}
          </button>
        </div>

        {/* Quick-add form */}
        {showAdd && (
          <div ref={addFormRef} className="bg-[#f8fafc] rounded-lg border border-[#e8edf2] p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Name *</label>
                <input type="text" value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="e.g. Brookhouse School" />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <select value={addForm.category} onChange={(e) => handleCategoryChange(e.target.value)} className={inputClass}>
                  {allCategories.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select value={addForm.subcategory} onChange={(e) => setAddForm((p) => ({ ...p, subcategory: e.target.value }))} className={inputClass}>
                  {(allSubcategories[addForm.category] || []).map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input type="text" value={addForm.address} onChange={(e) => setAddForm((p) => ({ ...p, address: e.target.value }))} className={inputClass} placeholder="Street address" />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="text" value={addForm.phone} onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Website</label>
                <input type="text" value={addForm.website} onChange={(e) => setAddForm((p) => ({ ...p, website: e.target.value }))} className={inputClass} placeholder="https://..." />
              </div>
            </div>

            {/* Media */}
            <div className="mt-1 space-y-4">
              <ImageUploadField
                label="Primary Image"
                value={addForm.image}
                onChange={(url) => setAddForm((p) => ({ ...p, image: url }))}
                pageKey="neighbourhood-life"
                fieldKey="image"
                previewWidth="w-40"
                previewHeight="h-28"
              />
              <div>
                <label className={labelClass}>Alt Text</label>
                <input
                  type="text"
                  value={addForm.alt_text}
                  onChange={(e) => setAddForm((p) => ({ ...p, alt_text: e.target.value }))}
                  className={inputClass}
                  placeholder="Describe the image for accessibility & SEO"
                />
              </div>
              <AmenityGalleryField
                value={addForm.gallery}
                onChange={(urls) => setAddForm((p) => ({ ...p, gallery: urls }))}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleAdd}
                disabled={adding || !addForm.name.trim()}
                className="inline-flex items-center gap-1.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-4 py-2 rounded-lg text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <i className={`${adding ? 'ri-loader-4-line animate-spin' : 'ri-add-circle-line'}`} />
                {adding ? 'Adding...' : 'Add to Area'}
              </button>
            </div>
          </div>
        )}

        {/* Controls: search + scope + sort */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8a99] text-sm pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, type, or address…"
              className="w-full pl-9 pr-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20"
            />
          </div>
          <div className="inline-flex items-center bg-[#f7f8fa] rounded-full p-1">
            {SCOPE_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => setScopeFilter(o.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-roboto font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                  scopeFilter === o.key ? 'bg-[#0d5959] text-white' : 'text-[#001731] hover:bg-[#e8edf2]'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-2 bg-[#f7f8fa] rounded-full pl-3 pr-1.5 py-1">
            <i className="ri-radar-line text-[#0d5959] text-sm" />
            <span className="text-sm font-roboto font-semibold text-[#001731] whitespace-nowrap">Nearby radius</span>
            <select
              value={radiusKm}
              onChange={(e) => saveRadius(Number(e.target.value))}
              disabled={radiusSaving}
              title="Places within this distance count as nearby for this neighbourhood"
              className="px-2 py-1 rounded-full text-sm font-roboto font-semibold text-[#0d5959] bg-white border border-[#e8edf2] focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {RADIUS_OPTIONS.map((km) => (
                <option key={km} value={km}>{km} km</option>
              ))}
            </select>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 border border-[#e8edf2] rounded-lg text-sm font-roboto font-medium text-[#001731] bg-white focus:outline-none focus:border-[#0d5959] cursor-pointer"
          >
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="category">Category</option>
            <option value="type">Type</option>
            <option value="recent">Recently added</option>
          </select>
        </div>

        {/* Category filter — A→Z chips, each opening a subcategory dropdown (mirrors Directory) */}
        <div ref={categoryFilterRef} className="flex items-start gap-2 flex-wrap">
          {allCategories.map((c) => {
            const isOpen = openCategory === c.key;
            const isActive = categoryFilter === c.key;
            const subs = allSubcategories[c.key] || [];
            return (
              <div key={c.key} className="relative">
                <button
                  onClick={() => toggleCategory(c.key)}
                  aria-expanded={isOpen}
                  title={c.label}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-roboto font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                    isActive || isOpen ? 'bg-[#0d5959] text-white' : 'bg-[#f7f8fa] text-[#001731] hover:bg-[#e8edf2]'
                  }`}
                >
                  {c.label}
                  <i className={`ri-arrow-down-s-line text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="absolute left-0 top-full mt-2 z-30 min-w-[280px] bg-white border border-[#e8edf2] rounded-lg shadow-[0_8px_24px_rgba(0,23,49,0.10)]">
                    <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2.5 border-b border-[#eef2f5]">
                      <p className="flex items-center gap-2 font-roboto text-xs font-semibold text-[#0d5959] truncate">
                        <i className={c.icon} />
                        {c.label}
                      </p>
                      <span className="text-xs font-roboto text-[#7a8a99] shrink-0">
                        {areaDirectory.filter((a) => a.category === c.key).length} places
                      </span>
                    </div>
                    <div className="px-3 py-2 max-h-44 overflow-y-auto">
                      {subs.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {subs.slice(0, 16).map((s) => (
                            <button
                              key={s.key}
                              onClick={() => selectSubcategory(c.key, s.key)}
                              className="px-2.5 py-1 rounded-full text-xs font-roboto font-semibold bg-[#f7f8fa] text-[#001731] hover:bg-[#0d5959] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs font-roboto text-[#7a8a99] py-1">No sub-types yet.</p>
                      )}
                    </div>
                    <button
                      onClick={() => selectAllCategory(c.key)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 border-t border-[#eef2f5] font-roboto text-xs font-semibold text-[#0d5959] hover:bg-[#f7f8fa] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      View all {c.label}
                      <i className="ri-arrow-right-line" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#f7f8fa] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : visiblePlaces.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-[#e8edf2] rounded-lg">
            <i className="ri-store-2-line text-[#e8edf2] text-3xl mb-2" />
            <p className="text-sm font-roboto text-[#7a8a99]">
              No places match your filters yet. Add one or adjust the filters below.
            </p>
            <p className="text-sm font-medium font-roboto text-[#7a8a99] mt-1">
              For full details (gallery, hours, labels, images) use the Amenities section.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visiblePlaces.map((a) => (
              <div key={a.id} className="flex items-center gap-3 border border-[#e8edf2] rounded-lg p-3">
                <div
                  className="w-9 h-9 flex items-center justify-center rounded-md text-white shrink-0"
                  style={{ backgroundColor: categoryColor(a.category) }}
                >
                  <i className="ri-map-pin-2-line" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-roboto text-[#001731] font-medium truncate">{smartTitleCase(a.name)}</p>
                  <p className="text-base font-medium font-roboto text-[#001731]/70 truncate">
                    {categoryLabel(a.category)} · {subcategoryLabel(a.subcategory)}
                    {a.address ? ` · ${a.address}` : ''}
                  </p>
                </div>
                <span
                  className={`hidden md:inline-flex px-2.5 py-1 rounded-full text-base font-roboto font-medium flex-shrink-0 ${
                    areaLinkedIds.has(a.id) ? 'bg-[#eef4f4] text-[#001731]' : 'bg-[#f2f5f8] text-[#001731]/70'
                  }`}
                >
                  {areaLinkedIds.has(a.id) ? 'Linked to area' : 'Nearby'}
                </span>
                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                  {a.website && (
                    <span className="inline-flex items-center gap-1 text-base font-medium font-roboto text-[#001731]"><i className="ri-global-line" />Website</span>
                  )}
                  {a.phone && (
                    <span className="inline-flex items-center gap-1 text-base font-medium font-roboto text-[#001731]"><i className="ri-phone-line" />{a.phone}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/admin/amenities/edit/${a.id}`)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7a8a99] hover:text-[#0d5959] hover:bg-[#e8edf2] cursor-pointer transition-colors"
                    title="Edit full details"
                  >
                    <i className="ri-edit-line text-base" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(a.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7a8a99] hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                    title="Remove"
                  >
                    <i className="ri-delete-bin-line text-base" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Area News & Blog */}
      <div className="bg-white rounded-xl border border-[#e8edf2] p-5 space-y-4">
        <div>
          <h4 className="font-jost text-sm font-medium text-[#001731]">Area News &amp; Blog</h4>
          <p className="text-sm font-medium font-roboto text-[#7a8a99]">Blog posts / guide articles that are tagged to this neighbourhood. Unlink any that no longer apply.</p>
        </div>
        {blogsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#f7f8fa] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-[#e8edf2] rounded-lg">
            <i className="ri-article-line text-[#e8edf2] text-3xl mb-2" />
            <p className="text-sm font-roboto text-[#7a8a99]">No blog posts are linked to this area yet.</p>
            <p className="text-sm font-medium font-roboto text-[#7a8a99] mt-1">
              Tag a post to this neighbourhood from the Blog editor (neighbourhoods field) to see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {blogs.map((b) => (
              <div key={b.id} className="flex items-center gap-3 border border-[#e8edf2] rounded-lg p-3">
                {b.featured_image ? (
                  <img src={b.featured_image} alt="" className="w-12 h-9 object-cover rounded shrink-0" />
                ) : (
                  <div className="w-12 h-9 bg-[#f7f8fa] rounded flex items-center justify-center shrink-0">
                    <i className="ri-article-line text-[#7a8a99] text-sm" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-roboto text-[#001731] font-medium truncate">{smartTitleCase(b.title)}</p>
                  <p className="text-sm font-medium font-roboto text-[#7a8a99]">
                    {b.status === 'published' ? 'Published' : b.status} · /blog/{b.slug}
                  </p>
                </div>
                <button
                  onClick={() => handleLinkBlog(b.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7a8a99] hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors flex-shrink-0"
                  title="Unlink from this area"
                >
                  <i className="ri-link-unlink-m text-sm" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteConfirm}
        title="Move place to Recycle Bin?"
        message="This place will be moved to the Recycle Bin. You can restore it at any time from the Places directory."
        confirmLabel="Move to bin"
        confirmVariant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Add / manage custom category modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#001731]/40"
            onClick={() => setCatModalOpen(false)}
            aria-hidden
          />
          <div className="relative bg-white rounded-xl border border-[#e8edf2] w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f5]">
              <h4 className="font-jost text-sm font-semibold text-[#001731]">Add Category</h4>
              <button
                onClick={() => setCatModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7a8a99] hover:bg-[#f0f4f7] hover:text-[#0d5959] cursor-pointer transition-colors"
                aria-label="Close"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className={labelClass}>Category Name *</label>
                <input
                  type="text"
                  value={catForm.label}
                  onChange={(e) => setCatForm((p) => ({ ...p, label: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. Art & Galleries"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Icon (remix class)</label>
                  <input
                    type="text"
                    value={catForm.icon}
                    onChange={(e) => setCatForm((p) => ({ ...p, icon: e.target.value }))}
                    className={inputClass}
                    placeholder="ri-palette-line"
                  />
                </div>
                <div>
                  <label className={labelClass}>Colour</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={catForm.color}
                      onChange={(e) => setCatForm((p) => ({ ...p, color: e.target.value }))}
                      className="w-10 h-9 rounded border border-[#e8edf2] cursor-pointer bg-white p-1"
                    />
                    <input
                      type="text"
                      value={catForm.color}
                      onChange={(e) => setCatForm((p) => ({ ...p, color: e.target.value }))}
                      className={inputClass}
                      placeholder="#6B4423"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={catForm.description}
                  onChange={(e) => setCatForm((p) => ({ ...p, description: e.target.value }))}
                  className={`${inputClass} min-h-[60px] resize-none`}
                  placeholder="What belongs in this category?"
                  maxLength={500}
                />
              </div>
              <div>
                <label className={labelClass}>Sub-types (comma separated)</label>
                <input
                  type="text"
                  value={catForm.subcats}
                  onChange={(e) => setCatForm((p) => ({ ...p, subcats: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. Gallery, Art Studio, Museum"
                />
              </div>

              {/* Media */}
              <div className="space-y-4 pt-1">
                <ImageUploadField
                  label="Primary Image"
                  value={catForm.image}
                  onChange={(url) => setCatForm((p) => ({ ...p, image: url }))}
                  pageKey="neighbourhood-life"
                  fieldKey="category-image"
                  previewWidth="w-40"
                  previewHeight="h-28"
                />
                <div>
                  <label className={labelClass}>Alt Text</label>
                  <input
                    type="text"
                    value={catForm.alt_text}
                    onChange={(e) => setCatForm((p) => ({ ...p, alt_text: e.target.value }))}
                    className={inputClass}
                    placeholder="Describe the image for accessibility & SEO"
                  />
                </div>
                <AmenityGalleryField
                  value={catForm.gallery}
                  onChange={(urls) => setCatForm((p) => ({ ...p, gallery: urls }))}
                />
              </div>

              <div className="pt-1 border-t border-[#eef2f5]">
                <p className="text-xs font-roboto font-semibold text-[#001731] mb-2">Your custom categories</p>
                {customCategories.length === 0 ? (
                  <p className="text-xs font-roboto text-[#7a8a99]">
                    No custom categories yet. They appear here and across the public directory.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {customCategories.map((c) => (
                      <div key={c.key} className="flex items-center gap-2.5 border border-[#e8edf2] rounded-lg px-3 py-1.5">
                        <div
                          className="w-7 h-7 flex items-center justify-center rounded-md text-white shrink-0"
                          style={{ backgroundColor: c.color }}
                        >
                          <i className={c.icon} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-roboto text-[#001731] font-medium truncate">{c.label}</p>
                          <p className="text-[11px] font-roboto text-[#7a8a99]">
                            {c.subcategories.length} sub-type{c.subcategories.length === 1 ? '' : 's'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteCategory(c.key, c.label)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-[#7a8a99] hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors flex-shrink-0"
                          title="Remove category"
                        >
                          <i className="ri-delete-bin-line text-sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#eef2f5] flex justify-end gap-2">
              <button
                onClick={() => setCatModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#e8edf2] text-sm font-roboto font-semibold text-[#001731] hover:bg-[#f7f8fa] transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                disabled={catSaving || !catForm.label.trim()}
                className="inline-flex items-center gap-1.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-4 py-2 rounded-lg text-sm font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <i className={`${catSaving ? 'ri-loader-4-line animate-spin' : 'ri-add-line'}`} />
                {catSaving ? 'Adding...' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}