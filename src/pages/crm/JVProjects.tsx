import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import { broadcastSync } from '@/lib/syncEngine';
import { normalizeJvProjectImages, type JvImage } from '@/lib/jvImages';

interface JvProjectRow {
  id: string;
  title: string;
  slug: string | null;
  location: string | null;
  type: string | null;
  units: number | null;
  status: string | null;
  price_range: string | null;
  description: string | null;
  featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  images: JvImage[];
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function JVProjects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<JvProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPublished, setFilterPublished] = useState('all');
  const [filterFeatured, setFilterFeatured] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [allStatuses, setAllStatuses] = useState<string[]>([]);
  const [allTypes, setAllTypes] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<JvProjectRow | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');

    let countQuery = supabase.from('jv_projects').select('*', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('jv_projects')
      .select('id, title, slug, location, type, units, status, price_range, description, featured, is_published, created_at, updated_at, jv_project_images(id, image_url, storage_path, alt_text, sort_order, is_cover)')
      .order('created_at', { ascending: sort === 'oldest' })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (filterStatus !== 'all') {
      countQuery = countQuery.eq('status', filterStatus);
      dataQuery = dataQuery.eq('status', filterStatus);
    }
    if (filterType !== 'all') {
      countQuery = countQuery.eq('type', filterType);
      dataQuery = dataQuery.eq('type', filterType);
    }
    if (filterPublished !== 'all') {
      countQuery = countQuery.eq('is_published', filterPublished === 'published');
      dataQuery = dataQuery.eq('is_published', filterPublished === 'published');
    }
    if (filterFeatured !== 'all') {
      countQuery = countQuery.eq('featured', filterFeatured === 'featured');
      dataQuery = dataQuery.eq('featured', filterFeatured === 'featured');
    }
    if (search.trim()) {
      const term = search.trim();
      countQuery = countQuery.or(`title.ilike.%${term}%,location.ilike.%${term}%`);
      dataQuery = dataQuery.or(`title.ilike.%${term}%,location.ilike.%${term}%`);
    }

    const [{ count }, { data, error: dataError }] = await Promise.all([countQuery, dataQuery]);

    if (dataError) {
      setError(dataError.message || 'Failed to load projects');
      setLoading(false);
      return;
    }

    const rows: JvProjectRow[] = (data || []).map((row: any) => ({
      id: String(row.id),
      title: String(row.title || ''),
      slug: row.slug ? String(row.slug) : null,
      location: row.location ? String(row.location) : null,
      type: row.type ? String(row.type) : null,
      units: row.units ? Number(row.units) : null,
      status: row.status ? String(row.status) : null,
      price_range: row.price_range ? String(row.price_range) : null,
      description: row.description ? String(row.description) : null,
      featured: Boolean(row.featured),
      is_published: Boolean(row.is_published),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      images: normalizeJvProjectImages(row.jv_project_images, row.image, String(row.title || '')),
    }));

    setProjects(rows);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, pageSize, sort, filterStatus, filterType, filterPublished, filterFeatured, search]);

  // Fetch distinct status/type values for the filter dropdowns.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('jv_projects').select('status, type');
      if (data) {
        setAllStatuses(Array.from(new Set(data.map((r: any) => r.status).filter(Boolean))).sort());
        setAllTypes(Array.from(new Set(data.map((r: any) => r.type).filter(Boolean))).sort());
      }
    })();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleTogglePublish = async (project: JvProjectRow) => {
    const { error } = await supabase.from('jv_projects').update({ is_published: !project.is_published }).eq('id', project.id);
    if (error) {
      addToast('Failed to update status', 'error');
    } else {
      addToast(project.is_published ? 'Project unpublished' : 'Project published', 'success');
      broadcastSync();
      fetchProjects();
    }
  };

  const handleToggleFeatured = async (project: JvProjectRow) => {
    const { error } = await supabase.from('jv_projects').update({ featured: !project.featured }).eq('id', project.id);
    if (error) {
      addToast('Failed to update featured status', 'error');
    } else {
      addToast(project.featured ? 'Project unfeatured' : 'Project featured', 'success');
      broadcastSync();
      fetchProjects();
    }
  };

  const handleDuplicate = async (project: JvProjectRow) => {
    setDuplicatingId(project.id);
    try {
      const { data, error } = await supabase
        .from('jv_projects')
        .insert({
          title: `${project.title} (Copy)`,
          slug: project.slug ? `${project.slug}-copy` : null,
          location: project.location,
          type: project.type,
          units: project.units,
          status: project.status,
          price_range: project.price_range,
          description: project.description,
          featured: false,
          is_published: false,
          image: project.images[0]?.url || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      if (data?.id && project.images.length > 0) {
        const imageRows = project.images.map((img, idx) => ({
          project_id: data.id,
          image_url: img.url,
          storage_path: null,
          alt_text: img.alt,
          sort_order: idx + 1,
          is_cover: img.isCover,
        }));
        await supabase.from('jv_project_images').insert(imageRows);
      }

      addToast('Project duplicated (draft)', 'success');
      broadcastSync();
      fetchProjects();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to duplicate project', 'error');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      // Best-effort storage cleanup of image files before deleting the record.
      const { data: rawImages } = await supabase
        .from('jv_project_images')
        .select('storage_path')
        .eq('project_id', deleteConfirm.id);

      const paths = (rawImages || [])
        .map((r: any) => r.storage_path)
        .filter((p: any) => typeof p === 'string' && p.startsWith('jv-projects/'));

      if (paths.length > 0) {
        await supabase.storage.from('jv-projects').remove(paths).catch(() => {});
      }

      const { error } = await supabase.from('jv_projects').delete().eq('id', deleteConfirm.id);
      if (error) throw error;

      addToast('Project deleted', 'success');
      broadcastSync();
      setDeleteConfirm(null);
      fetchProjects();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to delete project', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-roboto text-[#636363]">
          {total} project{total === 1 ? '' : 's'} seeking partners
        </p>
        <button
          onClick={() => navigate('/crm/joint-ventures/projects/new')}
          className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-4 py-2.5 rounded-lg text-sm font-roboto transition-all whitespace-nowrap cursor-pointer"
        >
          <i className="ri-add-line" />
          Add Project
        </button>
      </div>

      {/* Search & filters */}
      <div className="bg-white rounded-lg p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="relative flex-1 max-w-md w-full">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#636363] text-sm" />
            <input
              type="text"
              placeholder="Search project name or location..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white"
            />
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none bg-white cursor-pointer text-[#001731]">
              <option value="all">All statuses</option>
              {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none bg-white cursor-pointer text-[#001731]">
              <option value="all">All types</option>
              {allTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterPublished} onChange={(e) => { setFilterPublished(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none bg-white cursor-pointer text-[#001731]">
              <option value="all">Any visibility</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>
            <select value={filterFeatured} onChange={(e) => { setFilterFeatured(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none bg-white cursor-pointer text-[#001731]">
              <option value="all">Any featured</option>
              <option value="featured">Featured</option>
              <option value="not">Not featured</option>
            </select>
            <select value={sort} onChange={(e) => { setSort(e.target.value as 'newest' | 'oldest'); setPage(1); }} className="px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none bg-white cursor-pointer text-[#001731]">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-[#636363] font-roboto">
          <span>{total} projects</span>
          <span>Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-6 space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-14 h-10 bg-[#f7f8fa] rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-[#f7f8fa] rounded" />
                <div className="h-3 w-1/4 bg-[#f7f8fa] rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-white rounded-xl py-14 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-red-50 flex items-center justify-center">
              <i className="ri-error-warning-line text-red-400 text-2xl" />
            </div>
            <p className="text-sm font-roboto text-[#636363]">{error}</p>
            <button onClick={fetchProjects} className="inline-flex items-center gap-2 text-sm font-roboto text-[#0d5959] hover:text-[#001731] cursor-pointer mt-1">
              <i className="ri-refresh-line" /> Try Again
            </button>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && projects.length === 0 && (
        <div className="bg-white rounded-xl py-14 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-[#0d5959]/8 flex items-center justify-center">
              <i className="ri-building-2-line text-[#0d5959] text-2xl" />
            </div>
            <p className="text-sm font-roboto text-[#636363]">
              {total === 0 ? 'No projects yet. Add your first project seeking partners.' : 'No projects match your filters.'}
            </p>
            {total === 0 && (
              <button
                onClick={() => navigate('/crm/joint-ventures/projects/new')}
                className="inline-flex items-center gap-2 text-sm font-roboto text-[#0d5959] hover:text-[#001731] cursor-pointer mt-1"
              >
                <i className="ri-add-line" /> Add a project
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && projects.length > 0 && (
        <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#f0f0f0] text-[11px] text-[#636363] font-roboto uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Image</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Units</th>
                  <th className="px-4 py-3 font-medium">Price range</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Flags</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]/60">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-[#f7f8fa]/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="relative w-16 h-11 rounded overflow-hidden bg-[#f7f8fa] flex items-center justify-center">
                        {project.images[0]?.url ? (
                          <img src={project.images[0].url} alt={project.title} className="w-full h-full object-cover" />
                        ) : (
                          <i className="ri-building-line text-[#c0c8d0]" />
                        )}
                        {project.images.length > 1 && (
                          <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] px-1">
                            {project.images.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-jost text-sm font-medium text-[#001731] leading-snug">{project.title}</p>
                    </td>
                    <td className="px-4 py-3 text-[#636363] font-roboto">{project.location || '—'}</td>
                    <td className="px-4 py-3 text-[#636363] font-roboto">{project.type || '—'}</td>
                    <td className="px-4 py-3 text-[#636363] font-roboto">{project.units ?? '—'}</td>
                    <td className="px-4 py-3 text-[#636363] font-roboto whitespace-nowrap">{project.price_range || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-roboto font-semibold text-[#0e7490] bg-[#e6f7fb] px-2 py-0.5 rounded-full whitespace-nowrap">
                        {project.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleToggleFeatured(project)}
                          title={project.featured ? 'Unfeature' : 'Feature'}
                          className={`text-base cursor-pointer ${project.featured ? 'text-amber-500' : 'text-[#c0c8d0] hover:text-amber-400'}`}
                        >
                          <i className={project.featured ? 'ri-star-fill' : 'ri-star-line'}></i>
                        </button>
                        <button
                          onClick={() => handleTogglePublish(project)}
                          title={project.is_published ? 'Unpublish' : 'Publish'}
                          className={`text-base cursor-pointer ${project.is_published ? 'text-emerald-500' : 'text-[#c0c8d0] hover:text-emerald-400'}`}
                        >
                          <i className={project.is_published ? 'ri-eye-line' : 'ri-eye-off-line'}></i>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#636363] font-roboto whitespace-nowrap">{formatDate(project.updated_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/crm/joint-ventures/projects/edit/${project.id}`)}
                          title="Edit"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#636363] hover:text-[#0d5959] hover:bg-[#0d5959]/8 cursor-pointer transition-colors"
                        >
                          <i className="ri-edit-line text-sm" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(project)}
                          disabled={duplicatingId === project.id}
                          title="Duplicate"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#636363] hover:text-[#0d5959] hover:bg-[#0d5959]/8 cursor-pointer transition-colors disabled:opacity-40"
                        >
                          <i className="ri-file-copy-line text-sm" />
                        </button>
                        <a
                          href="/joint-ventures"
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Preview (public site)"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#636363] hover:text-[#0d5959] hover:bg-[#0d5959]/8 cursor-pointer transition-colors"
                        >
                          <i className="ri-eye-line text-sm" />
                        </a>
                        <button
                          onClick={() => setDeleteConfirm(project)}
                          title="Delete"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#636363] hover:text-[#dc2626] hover:bg-red-50 cursor-pointer transition-colors"
                        >
                          <i className="ri-delete-bin-line text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <CRMPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Project?"
        message={`This will remove "${deleteConfirm?.title || 'this project'}" from the public Projects Seeking Partners section. The project and all associated images will be deleted. This action cannot be undone.`}
        confirmLabel="Delete Project"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}