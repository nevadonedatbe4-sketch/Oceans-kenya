import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import { logNeighbourhoodDeleted } from '@/lib/activityLogger';

interface Neighbourhood {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  hero_image: string | null;
  summary: string | null;
  tags: string[] | null;
  created_at: string;
}

export default function Neighbourhoods() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [neighbourhoods, setNeighbourhoods] = useState<Neighbourhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchNeighbourhoods = useCallback(async () => {
    setLoading(true);
    let countQuery = supabase.from('neighbourhoods').select('*', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('neighbourhoods')
      .select('id, name, slug, city, country, is_featured, is_published, sort_order, hero_image, summary, tags, created_at')
      .order('sort_order', { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search.trim()) {
      const term = search.trim();
      countQuery = countQuery.or(`name.ilike.%${term}%,city.ilike.%${term}%,slug.ilike.%${term}%`);
      dataQuery = dataQuery.or(`name.ilike.%${term}%,city.ilike.%${term}%,slug.ilike.%${term}%`);
    }

    const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery]);

    if (error) {
      console.error('Error fetching neighbourhoods:', error);
      addToast('Failed to load neighbourhoods', 'error');
    } else {
      setNeighbourhoods(data || []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, pageSize, search]);

  useEffect(() => {
    fetchNeighbourhoods();
  }, [fetchNeighbourhoods]);

  const handleTogglePublish = async (id: string, current: boolean) => {
    setTogglingId(id);
    const { error } = await supabase.from('neighbourhoods').update({ is_published: !current }).eq('id', id);
    if (error) {
      addToast('Failed to update status', 'error');
    } else {
      setNeighbourhoods((prev) => prev.map((n) => (n.id === id ? { ...n, is_published: !current } : n)));
      addToast(current ? 'Neighbourhood unpublished' : 'Neighbourhood published', 'success');
    }
    setTogglingId(null);
  };

  const handleToggleFeatured = async (id: string, current: boolean) => {
    setTogglingId(id);
    const { error } = await supabase.from('neighbourhoods').update({ is_featured: !current }).eq('id', id);
    if (error) {
      addToast('Failed to update feature status', 'error');
    } else {
      setNeighbourhoods((prev) => prev.map((n) => (n.id === id ? { ...n, is_featured: !current } : n)));
      addToast(current ? 'Neighbourhood unfeatured' : 'Neighbourhood featured', 'success');
    }
    setTogglingId(null);
  };

  const handleDelete = async (id: string) => {
    const hood = neighbourhoods.find((n) => n.id === id);
    const { error } = await supabase.from('neighbourhoods').delete().eq('id', id);
    if (error) {
      addToast('Failed to delete neighbourhood', 'error');
    } else {
      setNeighbourhoods((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (user && hood) {
        logNeighbourhoodDeleted(user.id, user.name || user.email, id, hood.name);
      }
      addToast('Neighbourhood deleted', 'success');
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex items-center gap-3 flex-1 w-full lg:w-auto">
          <div className="relative flex-1 max-w-md">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8a99] text-sm" />
            <input
              type="text"
              placeholder="Search neighbourhoods..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/crm/neighbourhoods/new')}
            className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-4 py-2.5 rounded-lg text-sm font-roboto transition-all whitespace-nowrap cursor-pointer"
          >
            <i className="ri-add-line" />
            Add Neighbourhood
          </button>
          <span className="text-xs font-roboto text-[#7a8a99]">{total} total</span>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#e8edf2] p-5 space-y-3">
              <div className="h-32 bg-[#f8fafc] rounded-lg animate-pulse" />
              <div className="h-4 w-32 bg-[#f8fafc] rounded animate-pulse" />
              <div className="h-3 w-20 bg-[#f8fafc] rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : neighbourhoods.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e8edf2] py-12 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-[#0d5959]/8 flex items-center justify-center">
              <i className="ri-map-pin-line text-[#0d5959] text-xl" />
            </div>
            <p className="text-sm font-roboto text-[#7a8a99]">
              {total === 0 ? 'No neighbourhoods yet. Add your first one.' : 'No neighbourhoods match your search.'}
            </p>
            {total === 0 && (
              <button
                onClick={() => navigate('/crm/neighbourhoods/new')}
                className="text-sm font-roboto text-[#0d5959] hover:text-[#001731] cursor-pointer"
              >
                Create a neighbourhood
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {neighbourhoods.map((hood) => (
            <div key={hood.id} onClick={() => navigate(`/crm/neighbourhoods/edit/${hood.id}`)} className="bg-white rounded-xl border border-[#e8edf2] overflow-hidden hover:border-[#0d5959]/20 transition-all group cursor-pointer">
              <div className="relative h-40">
                {hood.hero_image ? (
                  <img src={hood.hero_image} alt={hood.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#f8fafc] flex items-center justify-center">
                    <i className="ri-map-pin-line text-[#7a8a99] text-3xl" />
                  </div>
                )}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  {hood.is_featured && (
                    <span className="text-[10px] font-roboto text-white bg-amber-500 px-2 py-0.5 rounded-full">
                      <i className="ri-star-fill mr-1" /> Featured
                    </span>
                  )}
                  {hood.is_published ? (
                    <span className="text-[10px] font-roboto text-white bg-emerald-500 px-2 py-0.5 rounded-full">
                      Published
                    </span>
                  ) : (
                    <span className="text-[10px] font-roboto text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                      Draft
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/crm/neighbourhoods/edit/${hood.id}`); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 text-[#7a8a99] hover:text-[#0d5959] cursor-pointer transition-colors"
                    >
                      <i className="ri-edit-line text-sm" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(hood.id); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 text-[#7a8a99] hover:text-red-600 cursor-pointer transition-colors"
                    >
                      <i className="ri-delete-bin-line text-sm" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-jost text-sm font-medium text-[#001731]">{hood.name}</h3>
                    <p className="text-xs font-roboto text-[#7a8a99]">{hood.city}, {hood.country}</p>
                  </div>
                  <span className="text-xs font-roboto text-[#7a8a99] bg-[#f8fafc] px-2 py-0.5 rounded-full">
                    #{hood.sort_order}
                  </span>
                </div>
                {hood.summary && (
                  <p className="text-xs font-roboto text-[#7a8a99] mt-2 line-clamp-2">{hood.summary}</p>
                )}
                {hood.tags && hood.tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {hood.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-roboto text-[#7a8a99] bg-[#f8fafc] px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#e8edf2]/60">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleTogglePublish(hood.id, hood.is_published); }}
                    disabled={togglingId === hood.id}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-roboto transition-all cursor-pointer whitespace-nowrap ${
                      hood.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {hood.is_published ? <i className="ri-eye-line" /> : <i className="ri-eye-off-line" />}
                    {hood.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleFeatured(hood.id, hood.is_featured); }}
                    disabled={togglingId === hood.id}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-roboto transition-all cursor-pointer whitespace-nowrap ${
                      hood.is_featured ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <i className="ri-star-line" />
                    {hood.is_featured ? 'Unfeature' : 'Feature'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/crm/neighbourhoods/edit/${hood.id}`); }}
                    className="ml-auto text-[10px] font-roboto text-[#0d5959] hover:text-[#001731] cursor-pointer"
                  >
                    Edit <i className="ri-arrow-right-line" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && neighbourhoods.length > 0 && (
        <CRMPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Neighbourhood?"
        message="This will permanently remove this neighbourhood and all its associated data. This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}