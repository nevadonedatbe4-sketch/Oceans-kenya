import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import ImportPlacesModal from '@/pages/crm/components/ImportPlaces/ImportPlacesModal';
import AmenitiesExportModal from '@/pages/crm/components/AmenitiesExportModal';
import PlacesSidebar from '@/pages/crm/components/PlacesSidebar';
import {
  FolderModal,
  FlagModal,
  RecycleBinModal,
  ReviewsModal,
  ActivityModal,
  fetchFolders,
  softDelete,
  bulkSoftDelete,
} from '@/pages/crm/components/PlacesManagementModals';
import {
  toggleStar,
  bulkStar,
  bulkPublish,
  togglePublish,
  setArchived,
  addToFolder,
  removeFromFolder,
  fetchFolderAmenityIds,
  wipeAllAmenities,
} from '@/lib/directory';
import {
  categoryColorVar,
  subcategoryLabel,
  categoryLabel,
  amenityImage,
  isArchived,
  type Amenity,
  type AmenityAttributes,
  type AmenityCategoryRecord,
} from '@/lib/amenities';
import type { AmenityFolder } from '@/lib/directory';
import { smartTitleCase } from '@/lib/location';
import CategoryColourPanel from '@/pages/crm/components/CategoryColourPanel';
import AmenityRowActions from '@/pages/crm/components/AmenityRowActions';
import NoImagePlaceholder from '@/components/feature/NoImagePlaceholder';

type StatusFilter = 'all' | 'published' | 'archived';
type SortKey = 'name' | 'category' | 'area' | 'status' | 'created' | 'updated' | 'views';
type SortDir = 'asc' | 'desc';
type ActiveView =
  | 'all'
  | 'important'
  | 'starred'
  | 'flagged'
  | 'needs-review'
  | 'published'
  | 'unpublished'
  | 'archived'
  | 'recycle-bin'
  | 'folder';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'area', label: 'Area' },
  { value: 'status', label: 'Status' },
  { value: 'views', label: 'Views' },
  { value: 'created', label: 'Date created' },
  { value: 'updated', label: 'Date updated' },
];

// Compact view counts so narrow screens never have to wrap long numbers.
function compactCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1000000) {
    const v = n / 1000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}k`;
  }
  return `${(n / 1000000).toFixed(1)}m`;
}

// How many rows to pull per request. The whole directory is never fetched up
// front — additional windows load on demand as the user browses.
const AMENITY_WINDOW = 250;

export default function Amenities() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<AmenityCategoryRecord[]>([]);
  const [folders, setFolders] = useState<AmenityFolder[]>([]);
  const [hoodAreas, setHoodAreas] = useState<string[]>([]);
  const [allAreaNames, setAllAreaNames] = useState<string[]>([]);
  const [allAreasLoaded, setAllAreasLoaded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('all');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [folderIds, setFolderIds] = useState<Set<string>>(new Set());
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [serverCategoryCounts, setServerCategoryCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  // Debounced mirror of `search` — only this hits the database, so the box
  // stays snappy while the whole directory is still searched across.
  const [serverSearch, setServerSearch] = useState('');
  const [deletePlace, setDeletePlace] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const defaultsApplied = useRef(false);
  const amenitiesRef = useRef<Amenity[]>([]);
  const [hoodLoaded, setHoodLoaded] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [tableScrollable, setTableScrollable] = useState(false);
  const [tableAtEnd, setTableAtEnd] = useState(false);
  // Bumps on every load so a stale background fetch can't overwrite fresh data.
  const requestIdRef = useRef(0);

  // Apply each category's accent colour to its design-token CSS variable so
  // every card / icon / badge / dot that consumes the variable updates live.
  useEffect(() => {
    const root = document.documentElement;
    categories.forEach((c) => {
      if (c.color) root.style.setProperty(categoryColorVar(c.slug), c.color);
    });
  }, [categories]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [areaFilter, setAreaFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkFolder, setBulkFolder] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'view' | 'selected'>('view');

  // Sidebar / management modals
  const [folderModal, setFolderModal] = useState<{ open: boolean; mode: 'create' | 'manage'; id: string | null; name: string; moveAfter?: boolean }>({ open: false, mode: 'create', id: null, name: '' });
  const [flagIds, setFlagIds] = useState<string[]>([]);
  const [flagOpen, setFlagOpen] = useState(false);
  const [recycleOpen, setRecycleOpen] = useState(false);
  const [reviewsId, setReviewsId] = useState<string | null>(null);
  const [reviewsName, setReviewsName] = useState('');
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const [page, setPage] = useState(1);
  // Bounded display window: at most 50 rows render per page while the full
  // dataset stays intact in the database ("1–50 of 1,284").
  const [pageSize, setPageSize] = useState(50);
  const [selectMenuOpen, setSelectMenuOpen] = useState(false);
  const [bulkMoreOpen, setBulkMoreOpen] = useState(false);
  // Right-click context menu for a single row's quick actions.
  const [rowMenu, setRowMenu] = useState<{ open: boolean; x: number; y: number; amenity: Amenity | null }>({ open: false, x: 0, y: 0, amenity: null });

  const allAmenities = amenities;

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase.from('amenity_categories').select('*');
    if (error) {
      addToast('Failed to load categories', 'error');
      return [] as AmenityCategoryRecord[];
    }
    const list = ((data || []) as AmenityCategoryRecord[])
      .map((c) => ({ ...c, name: smartTitleCase(c.name) || c.name }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    setCategories(list);
    return list;
  }, []);

  const fetchFoldersList = useCallback(async () => {
    const list = await fetchFolders();
    setFolders(list);
  }, []);

  // Areas featured on the Neighbourhoods page, in the same order the
  // Neighbourhoods admin shows them (sort_order). These are pinned to the top
  // of the "All areas" filter so they lead the dropdown.
  const fetchHoodAreas = useCallback(async () => {
    const { data } = await supabase
      .from('neighbourhoods')
      .select('name, sort_order')
      .order('sort_order', { ascending: true });
    const names = ((data || []) as { name: string }[])
      .map((n) => n.name)
      .filter(Boolean);
    setHoodAreas(names);
    setHoodLoaded(true);
  }, []);

  // A stable, unfiltered list of every area that actually appears in the
  // directory. It is kept independent of the (filtered) list held in memory so
  // the Area dropdown never loses options once a filter is applied.
  const fetchAllAreas = useCallback(async () => {
    const { data } = await supabase
      .from('amenities')
      .select('neighbourhood_name')
      .is('deleted_at', null);
    const names = new Set(
      ((data || []) as { neighbourhood_name: string | null }[])
        .map((r) => r.neighbourhood_name)
        .filter((n): n is string => !!n),
    );
    setAllAreaNames(Array.from(names));
    setAllAreasLoaded(true);
  }, []);

  const fetchFolderIds = useCallback(async (folderId: string) => {
    const ids = await fetchFolderAmenityIds(folderId);
    setFolderIds(new Set(ids));
  }, []);

  // Base query shared by the first load and every "load more". Recycled rows
  // are excluded server-side so each window is a full page of real records, and
  // the search term is applied HERE (server-side, over the whole directory) so
  // matches are found well beyond whatever window happens to be in memory.
  // Every filter the management toolbar exposes (search, area, category, status,
  // date range and the sidebar views) is applied HERE on the server. Selecting
  // an area therefore pulls its real records from the database instead of only
  // narrowing whatever window of rows happens to already be in memory — which is
  // why areas used to look empty even though the directory was fully loaded.
  const applyAmenityFilters = useCallback((query: any) => {
    let q = query.is('deleted_at', null);
    // Strip characters that would break PostgREST's `or` filter grammar.
    const term = serverSearch.trim().replace(/[%,()]/g, ' ').trim();
    if (term) {
      const like = `%${term}%`;
      q = q.or(
        [
          `name.ilike.${like}`,
          `neighbourhood_name.ilike.${like}`,
          `subcategory.ilike.${like}`,
          `category.ilike.${like}`,
        ].join(','),
      );
    }
    if (areaFilter) q = q.eq('neighbourhood_name', areaFilter);
    if (categoryFilter) {
      const cat = categories.find((c) => c.id === categoryFilter);
      if (cat?.slug) q = q.or(`category_id.eq.${categoryFilter},category.eq.${cat.slug}`);
      else q = q.eq('category_id', categoryFilter);
    } else if (selectedCategory) {
      q = q.eq('category_id', selectedCategory);
    }
    if (dateFrom) q = q.gte('created_at', dateFrom);
    if (dateTo) q = q.lte('created_at', `${dateTo}T23:59:59.999Z`);
    // Status segmented control
    if (statusFilter === 'published') q = q.eq('is_published', true).is('attributes->>is_archived', null);
    if (statusFilter === 'archived') q = q.eq('attributes->>is_archived', 'true');
    // Sidebar views (folder stays client-side — it needs the folder membership set)
    switch (activeView) {
      case 'important':
      case 'starred':
        q = q.eq('is_starred', true);
        break;
      case 'flagged':
      case 'needs-review':
        q = q.eq('is_flagged', true);
        break;
      case 'published':
        q = q.eq('is_published', true).is('attributes->>is_archived', null);
        break;
      case 'unpublished':
        q = q.eq('is_published', false).is('attributes->>is_archived', null);
        break;
      case 'archived':
        q = q.eq('attributes->>is_archived', 'true');
        break;
      default:
        break;
    }
    return q;
  }, [serverSearch, areaFilter, categoryFilter, selectedCategory, dateFrom, dateTo, statusFilter, activeView, categories]);

  const buildAmenitiesQuery = useCallback(() => applyAmenityFilters(supabase.from('amenities').select('*'))
    .order('name', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true }), [applyAmenityFilters]);

  // Authoritative total for the current filter set, straight from the database,
  // so "1–50 of 1,284" is always truthful no matter how many rows are loaded.
  const fetchFilteredTotal = useCallback(async () => {
    try {
      const { count, error } = await applyAmenityFilters(
        supabase.from('amenities').select('id', { count: 'exact', head: true }),
      );
      if (error) return;
      setFilteredTotal(count ?? 0);
    } catch (e) {
      console.error('amenity filtered count failed:', e);
    }
  }, [applyAmenityFilters]);

  // Load the directory progressively: the first window of rows paints immediately
  // so the page is never an empty shell, then the remainder streams in on demand.
  const fetchAmenities = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setLoadingMore(false);

    // Load ONLY the first window — never the whole directory up front. More rows
    // are pulled on demand as the user browses (see loadMoreAmenities below).
    const { data, error } = await buildAmenitiesQuery().range(0, AMENITY_WINDOW - 1);

    // A newer load started (or the component unmounted) — abandon this one.
    if (reqId !== requestIdRef.current) return;

    if (error) {
      addToast('Failed to load places', 'error');
      setLoading(false);
      return;
    }

    const rows = (data || []) as Amenity[];
    setAmenities(rows);
    setHasMore(rows.length === AMENITY_WINDOW);
    setLoading(false);
  }, [buildAmenitiesQuery]);

  // Pull the next window on demand and append it, so filtering/sorting stay
  // instant over what is loaded without ever holding the entire directory.
  const loadMoreAmenities = useCallback(async () => {
    if (loadingMore) return;
    const reqId = requestIdRef.current;
    setLoadingMore(true);
    const from = amenitiesRef.current.length;
    const { data, error } = await buildAmenitiesQuery().range(from, from + AMENITY_WINDOW - 1);

    if (reqId !== requestIdRef.current) { setLoadingMore(false); return; }

    if (error) {
      addToast('Failed to load more places', 'error');
      setLoadingMore(false);
      return;
    }

    const rows = (data || []) as Amenity[];
    setAmenities((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...rows.filter((r) => !seen.has(r.id))];
    });
    setHasMore(rows.length === AMENITY_WINDOW);
    setLoadingMore(false);
  }, [loadingMore, buildAmenitiesQuery]);

  // Authoritative per-category totals straight from the database, so the sidebar
  // stays correct even though the list only holds a window of rows in memory.
  const fetchCategoryCounts = useCallback(async () => {
    if (categories.length === 0) return;
    try {
      const results = await Promise.all(
        categories.map(async (c) => {
          const filter = `category_id.eq.${c.id}${c.slug ? `,category.eq.${c.slug}` : ''}`;
          const { count } = await supabase
            .from('amenities')
            .select('id', { count: 'exact', head: true })
            .is('deleted_at', null)
            .or(filter);
          return [c.id, count ?? 0] as const;
        }),
      );
      const map: Record<string, number> = {};
      results.forEach(([id, n]) => { map[id] = n; });
      setServerCategoryCounts(map);
    } catch (e) {
      console.error('amenity category counts failed:', e);
    }
  }, [categories]);

  // Sidebar counters are fetched with lightweight COUNT queries straight from
  // the database rather than being derived from the (potentially huge)
  // in-browser list. This keeps them instant and authoritative — they no longer
  // sit at zero while thousands of rows download, and they can't drift if a
  // list load is slow or partial.
  const fetchCounts = useCallback(async () => {
    try {
      const live = () =>
        supabase.from('amenities').select('id', { count: 'exact', head: true }).is('deleted_at', null);
      const [allRes, pubRes, archRes, starRes, flagRes, recycleRes] = await Promise.all([
        live(),
        live().eq('is_published', true),
        live().eq('attributes->>is_archived', 'true'),
        live().eq('is_starred', true),
        live().eq('is_flagged', true),
        supabase.from('amenities').select('id', { count: 'exact', head: true }).not('deleted_at', 'is', null),
      ]);
      const all = allRes.count ?? 0;
      const published = pubRes.count ?? 0;
      const archived = archRes.count ?? 0;
      const starred = starRes.count ?? 0;
      setCounts({
        all,
        important: starred,
        starred,
        flagged: flagRes.count ?? 0,
        published,
        unpublished: Math.max(0, all - published - archived),
        archived,
        recycle: recycleRes.count ?? 0,
      });
    } catch (e) {
      // Keep the last good counts on a transient failure rather than blanking out.
      console.error('amenity counts failed:', e);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchFoldersList();
    fetchHoodAreas();
    fetchAllAreas();
    fetchCounts();
  }, [fetchCategories, fetchFoldersList, fetchHoodAreas, fetchAllAreas, fetchCounts]);

  useEffect(() => {
    fetchAmenities();
  }, [fetchAmenities]);

  useEffect(() => {
    amenitiesRef.current = amenities;
  }, [amenities]);

  // Dismiss the right-click menu on scroll, resize, Escape, or any outside click
  // so it can never linger detached from the row it belongs to.
  useEffect(() => {
    if (!rowMenu.open) return undefined;
    const close = () => setRowMenu((m) => ({ ...m, open: false }));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [rowMenu.open]);

  // Only hit the database once the user pauses typing; until then the previous
  // results stay on screen instead of flashing empty.
  useEffect(() => {
    const t = setTimeout(() => setServerSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchCategoryCounts();
  }, [fetchCategoryCounts]);

  // The table opens on the FIRST category (e.g. "Art & Galleries") rather than
  // "All categories", applied exactly once as soon as the category list is
  // available. Remembering it in `defaultCategoryId` keeps it out of the
  // "filters are active" state, so "Clear filters" still works correctly.
  useEffect(() => {
    if (defaultsApplied.current || categories.length === 0) return;
    const first = categories[0];
    if (!first) return;
    defaultsApplied.current = true;
    setDefaultCategoryId(first.id);
    setCategoryFilter(first.id);
    setSelectedCategory(first.id);
  }, [categories]);

  // Keep the on-screen total in sync with whatever filters are active.
  useEffect(() => {
    fetchFilteredTotal();
  }, [fetchFilteredTotal]);

  useEffect(() => {
    setSelectedIds([]);
    setPage(1);
  }, [selectedCategory, activeView, activeFolder, search, statusFilter, areaFilter, categoryFilter, dateFrom, dateTo]);

  // When a folder view is active, narrow the list to that folder's members.
  useEffect(() => {
    if (activeView === 'folder' && activeFolder) {
      fetchFolderIds(activeFolder);
    } else {
      setFolderIds(new Set());
    }
  }, [activeView, activeFolder, fetchFolderIds]);

  // The COMPLETE set of areas, built from a stable unfiltered source and listed
  // alphabetically A→Z, so the full option set is always available and never
  // shrinks to just the currently-filtered area.
  const areas = useMemo(() => {
    const featured = hoodAreas.filter(Boolean);
    const featuredSet = new Set(featured);
    const extras = allAreaNames.filter((n) => !featuredSet.has(n));
    return Array.from(new Set([...featured, ...extras])).sort((a, b) => a.localeCompare(b));
  }, [hoodAreas, allAreaNames]);

  // Per-category totals for the sidebar (deleted rows are already excluded from
  // the live list that feeds this).
  const categoryCounts = useMemo(() => {
    // Prefer authoritative per-category totals from the database so the sidebar
    // stays correct even though the list only holds a window of rows in memory.
    if (Object.keys(serverCategoryCounts).length > 0) return serverCategoryCounts;
    const slugToId = new Map(categories.map((c) => [c.slug, c.id]));
    const byId: Record<string, number> = {};
    amenities.forEach((a) => {
      const id = a.category_id || (a.category ? slugToId.get(a.category) : undefined);
      if (id) byId[id] = (byId[id] || 0) + 1;
    });
    return byId;
  }, [serverCategoryCounts, amenities, categories]);

  // The page always opens on "All areas" so every place in the directory is
  // visible on the first paint. Selecting a specific area is an explicit choice
  // the user makes from the dropdown, never something we force on load.

  const filteredAmenities = useMemo(() => {
    let list = amenities;
    // View filter
    switch (activeView) {
      case 'important':
      case 'starred':
        list = list.filter((a) => a.is_starred);
        break;
      case 'flagged':
      case 'needs-review':
        list = list.filter((a) => a.is_flagged);
        break;
      case 'published':
        list = list.filter((a) => a.is_published && !isArchived(a));
        break;
      case 'unpublished':
        list = list.filter((a) => !a.is_published && !isArchived(a));
        break;
      case 'archived':
        list = list.filter((a) => isArchived(a));
        break;
      case 'folder':
        if (activeFolder) list = list.filter((a) => folderIds.has(a.id));
        break;
      default:
        break;
    }
    // Status filter (segmented control)
    if (statusFilter === 'published') list = list.filter((a) => a.is_published && !isArchived(a));
    if (statusFilter === 'archived') list = list.filter((a) => isArchived(a));
    // Category filter (when set via sidebar but view is a list view we still apply)
    if (selectedCategory) list = list.filter((a) => a.category_id === selectedCategory);
    if (serverSearch.trim()) {
      const t = serverSearch.trim().toLowerCase();
      list = list.filter((a) =>
        a.name.toLowerCase().includes(t) ||
        (a.neighbourhood_name || '').toLowerCase().includes(t) ||
        (a.subcategory || '').toLowerCase().includes(t) ||
        categoryLabel(a.category).toLowerCase().includes(t),
      );
    }
    if (areaFilter) list = list.filter((a) => a.neighbourhood_name === areaFilter);
    if (categoryFilter) {
      const cat = categories.find((c) => c.id === categoryFilter);
      list = list.filter((a) => a.category_id === categoryFilter || (!!cat?.slug && a.category === cat.slug));
    }
    if (dateFrom) list = list.filter((a) => a.created_at && String(a.created_at).slice(0, 10) >= dateFrom);
    if (dateTo) list = list.filter((a) => a.created_at && String(a.created_at).slice(0, 10) <= dateTo);
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((x, y) => {
      let cmp = 0;
      switch (sortBy) {
        case 'category':
          cmp = categoryLabel(x.category).localeCompare(categoryLabel(y.category));
          break;
        case 'area':
          cmp = (x.neighbourhood_name || '').localeCompare(y.neighbourhood_name || '');
          break;
        case 'status':
          cmp = Number(x.is_published) - Number(y.is_published);
          break;
        case 'views':
          cmp = (x.view_count || 0) - (y.view_count || 0);
          break;
        case 'created':
          cmp = String(x.created_at || '').localeCompare(String(y.created_at || ''));
          break;
        case 'updated':
          cmp = String(x.updated_at || '').localeCompare(String(y.updated_at || ''));
          break;
        default:
          cmp = (x.name || '').localeCompare(y.name || '');
      }
      return cmp * dir;
    });
  }, [amenities, activeView, activeFolder, folderIds, statusFilter, serverSearch, areaFilter, categoryFilter, categories, dateFrom, dateTo, sortBy, sortDir, selectedCategory]);

  const hasActiveFilters = !!search.trim() || statusFilter !== 'all' || !!dateFrom || !!dateTo || activeView !== 'all'
    || (!!selectedCategory && selectedCategory !== defaultCategoryId)
    || !!areaFilter
    || (!!categoryFilter && categoryFilter !== defaultCategoryId);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setAreaFilter('');
    setCategoryFilter('');
    setSelectedCategory(null);
    setDateFrom('');
    setDateTo('');
    setActiveView('all');
    setActiveFolder(null);
  };

  // Reset the management VIEW to its default state. This restores filters, sort,
  // page and selection only — it never deletes or changes a single record.
  const resetView = () => {
    setSearch('');
    setServerSearch('');
    setStatusFilter('all');
    setAreaFilter('');
    setCategoryFilter(defaultCategoryId);
    setSelectedCategory(defaultCategoryId || null);
    setDateFrom('');
    setDateTo('');
    setActiveView('all');
    setActiveFolder(null);
    setSortBy('name');
    setSortDir('asc');
    setSelectedIds([]);
    setSelectMenuOpen(false);
    setBulkMoreOpen(false);
    setPage(1);
    addToast('View reset to defaults', 'info');
  };

  const selectedMeta = categories.find((c) => c.id === selectedCategory) || null;

  // ── Handlers ──
  const handleTogglePublish = async (id: string, current: boolean) => {
    setTogglingId(id);
    const ok = await togglePublish(id, current);
    if (ok) {
      setAmenities((prev) => prev.map((a) => (a.id === id ? { ...a, is_published: !current } : a)));
      fetchCounts();
      addToast(current ? 'Place unpublished' : 'Place published', 'success');
    }
    setTogglingId(null);
  };

  const handleStar = async (id: string, current: boolean) => {
    const ok = await toggleStar(id, current);
    if (ok) {
      setAmenities((prev) => prev.map((a) => (a.id === id ? { ...a, is_starred: !current } : a)));
      fetchCounts();
    }
  };

  const handleWipeAll = async () => {
    setWiping(true);
    const ok = await wipeAllAmenities();
    if (ok) {
      setAmenities([]);
      setSelectedIds([]);
      setFolderIds(new Set());
      fetchCounts();
      fetchCategoryCounts();
      fetchFilteredTotal();
      addToast('Directory cleared — ready for a fresh import', 'success');
    }
    setWiping(false);
    setWipeOpen(false);
  };

  const handleDeletePlace = async (id: string) => {
    const ok = await softDelete(id);
    if (ok) {
      setAmenities((prev) => prev.filter((a) => a.id !== id));
      setSelectedIds((prev) => prev.filter((s) => s !== id));
      fetchCounts();
      addToast('Moved to Recycle Bin (restorable)', 'success');
    }
    setDeletePlace(null);
  };

  const handleAddPlace = () => navigate(selectedCategory ? `/admin/amenities/new?category=${selectedCategory}` : '/admin/amenities/new');

  const openExport = (scope: 'view' | 'selected') => { setExportScope(scope); setExportOpen(true); };

  const runBulkPublish = async (val: boolean) => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    const res = await bulkPublish(selectedIds, val);
    if (res.ok) {
      setAmenities((prev) => prev.map((a) => (selectedIds.includes(a.id) ? { ...a, is_published: val } : a)));
      fetchCounts();
      addToast(`${res.ok} place(s) ${val ? 'published' : 'unpublished'}`, 'success');
    }
    setBulkBusy(false);
  };

  const runBulkStar = async (val: boolean) => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    const ok = await bulkStar(selectedIds, val);
    if (ok) {
      setAmenities((prev) => prev.map((a) => (selectedIds.includes(a.id) ? { ...a, is_starred: val } : a)));
      fetchCounts();
      addToast(`${selectedIds.length} place(s) ${val ? 'marked important' : 'removed important'}`, 'success');
    }
    setBulkBusy(false);
  };

  const runBulkArchive = async (value: boolean) => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    const affected = await setArchived(selectedIds, value);
    if (affected > 0) {
      const done = new Set(selectedIds);
      setAmenities((prev) => prev.map((a) => {
        if (!done.has(a.id)) return a;
        const attrs: AmenityAttributes = { ...(a.attributes || {}) };
        if (value) { attrs.is_archived = true; attrs.archived_at = new Date().toISOString(); }
        else { delete attrs.is_archived; delete attrs.archived_at; }
        return { ...a, attributes: attrs, is_published: value ? false : a.is_published };
      }));
      fetchCounts();
      addToast(`${affected} place(s) ${value ? 'archived' : 'removed from archive'}`, 'success');
    }
    setBulkBusy(false);
  };

  const handleArchiveToggle = async (id: string, current: boolean) => {
    const affected = await setArchived([id], !current);
    if (affected > 0) {
      setAmenities((prev) => prev.map((a) => {
        if (a.id !== id) return a;
        const attrs: AmenityAttributes = { ...(a.attributes || {}) };
        if (!current) { attrs.is_archived = true; attrs.archived_at = new Date().toISOString(); }
        else { delete attrs.is_archived; delete attrs.archived_at; }
        return { ...a, attributes: attrs, is_published: !current ? false : a.is_published };
      }));
      fetchCounts();
      addToast(!current ? 'Place archived' : 'Place removed from archive', 'success');
    }
  };

  const handleBulkCategory = async () => {
    if (!selectedIds.length || !bulkCategory) return;
    setBulkBusy(true);
    const { error } = await supabase.from('amenities').update({ category_id: bulkCategory }).in('id', selectedIds);
    if (error) {
      addToast('Failed to move places', 'error');
    } else {
      setAmenities((prev) => prev.map((a) => (selectedIds.includes(a.id) ? { ...a, category_id: bulkCategory } : a)));
      addToast(`Moved ${selectedIds.length} place(s) to category`, 'success');
      setBulkCategory('');
    }
    setBulkBusy(false);
  };

  const handleBulkFolder = async (targetFolder?: string) => {
    const folderId = targetFolder || bulkFolder;
    if (!selectedIds.length || !folderId) return;
    setBulkBusy(true);
    const added = await addToFolder(folderId, selectedIds);
    if (added) {
      addToast(`Moved ${added} place(s) to folder`, 'success');
      setBulkFolder('');
      fetchFoldersList();
      if (activeView === 'folder') fetchFolderIds(activeFolder!);
    }
    setBulkBusy(false);
  };

  const handleBulkFlag = () => {
    if (!selectedIds.length) return;
    setFlagIds(selectedIds);
    setFlagOpen(true);
  };

  const handleBulkEdit = () => {
    if (selectedIds.length !== 1) {
      addToast('Select a single place to edit', 'info');
      return;
    }
    navigate(`/admin/amenities/edit/${selectedIds[0]}`);
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    const count = ids.length;
    if (!count) return;
    const affected = await bulkSoftDelete(ids);
    // Only drop them from the live list when the database actually confirmed the
    // change, so a failed/silent delete can't masquerade as a successful one.
    if (affected > 0) {
      const done = new Set(ids);
      setAmenities((prev) => prev.filter((a) => !done.has(a.id)));
    }
    setSelectedIds([]);
    if (affected === 0) {
      addToast('Nothing was moved to the Recycle Bin — the change was not saved', 'error');
    } else if (affected < count) {
      addToast(`${affected} of ${count} place(s) moved to Recycle Bin`, 'info');
    } else {
      addToast(`${count} place(s) moved to Recycle Bin`, 'success');
    }
    fetchCounts();
  };

  const allChecked = filteredAmenities.length > 0 && selectedIds.length === filteredAmenities.length;
  const toggleAll = () => setSelectedIds(allChecked ? [] : filteredAmenities.map((a) => a.id));
  const toggleOne = (id: string) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  // Folder membership is resolved in memory, so that view keeps a client-side
  // total; every other filter's total comes straight from the database.
  const displayTotal = activeView === 'folder' ? filteredAmenities.length : (filteredTotal || filteredAmenities.length);
  const totalPages = Math.max(1, Math.ceil(displayTotal / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedAmenities = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAmenities.slice(start, start + pageSize);
  }, [filteredAmenities, safePage, pageSize]);

  // Gmail-style scoped selection. "All visible" = just this page; "All loaded" =
  // every row matching the current filters that is currently in memory. We never
  // silently select thousands of rows the user cannot see.
  const selectScope = (scope: 'none' | 'visible' | 'loaded' | 'published' | 'draft' | 'category' | 'area') => {
    setSelectMenuOpen(false);
    switch (scope) {
      case 'none':
        setSelectedIds([]);
        break;
      case 'visible':
        setSelectedIds(pagedAmenities.map((a) => a.id));
        break;
      case 'loaded':
        setSelectedIds(filteredAmenities.map((a) => a.id));
        break;
      case 'published':
        setSelectedIds(filteredAmenities.filter((a) => a.is_published && !isArchived(a)).map((a) => a.id));
        break;
      case 'draft':
        setSelectedIds(filteredAmenities.filter((a) => !a.is_published && !isArchived(a)).map((a) => a.id));
        break;
      case 'category': {
        const cat = categories.find((c) => c.id === categoryFilter);
        setSelectedIds(filteredAmenities.filter((a) => a.category_id === categoryFilter || (!!cat?.slug && a.category === cat.slug)).map((a) => a.id));
        break;
      }
      case 'area':
        setSelectedIds(filteredAmenities.filter((a) => a.neighbourhood_name === areaFilter).map((a) => a.id));
        break;
      default:
        break;
    }
  };

  // Auto-pull the next window when the user pages past what is currently loaded.
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;
    if (safePage * pageSize >= amenities.length) loadMoreAmenities();
  }, [safePage, pageSize, amenities.length, hasMore, loading, loadingMore, loadMoreAmenities]);

  // Horizontal-scroll cue for narrow screens: it only shows when the table is
  // genuinely wider than its container and there is still more to reveal.
  const updateTableScroll = useCallback(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    setTableScrollable(el.scrollWidth - el.clientWidth > 4);
    setTableAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateTableScroll();
    const el = tableScrollRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', updateTableScroll, { passive: true });
    window.addEventListener('resize', updateTableScroll);
    return () => {
      el.removeEventListener('scroll', updateTableScroll);
      window.removeEventListener('resize', updateTableScroll);
    };
  }, [updateTableScroll, pagedAmenities, safePage, pageSize, loading]);

  const renderEmptyState = () => {
    return (
      <div className="bg-white rounded-xl border border-[#e8edf2] py-14 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#0d5959]/10 flex items-center justify-center">
            <i className="ri-store-2-line text-[#0d5959] text-2xl" />
          </div>
          <p className="text-[15px] font-semibold text-[#001731]">No places here</p>
          <p className="text-[15px] text-[#7a8a99] max-w-sm">
            {activeView !== 'all' || selectedCategory ? 'Try another filter, view, or folder.' : 'Add places individually or upload a CSV to populate the directory.'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={handleAddPlace} className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-4 py-2.5 rounded-lg text-[15px] font-medium transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-add-line" /> Add place
            </button>
            <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 bg-white border border-[#e8edf2] text-[#0d5959] px-4 py-2.5 rounded-lg text-[15px] font-medium hover:bg-[#eef7f5] transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-upload-cloud-line" /> Upload places
            </button>
            {hasActiveFilters && <button onClick={clearFilters} className="inline-flex items-center gap-2 text-[#7a8a99] px-3 py-2.5 rounded-lg text-[15px] hover:bg-[#f7f8fa] cursor-pointer whitespace-nowrap"><i className="ri-filter-off-line" /> Clear</button>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden">
        <button onClick={() => setSidebarOpen((s) => !s)} className="inline-flex items-center gap-2 bg-[#0d5959] text-white px-4 py-2.5 rounded-lg text-[15px] font-medium cursor-pointer whitespace-nowrap">
          <i className="ri-menu-line" /> Browse
        </button>
      </div>

      <PlacesSidebar
        open={sidebarOpen}
        categories={categories}
        folders={folders}
        counts={{ ...counts }}
        activeView={activeView as never}
        selectedCategory={selectedCategory}
        categoryCounts={categoryCounts}
        onSelectView={(v) => {
          if (typeof v === 'object' && 'folder' in v) {
            setActiveView('folder');
            setActiveFolder(v.folder);
            setSelectedCategory(null);
            setCategoryFilter('');
          } else if (v === 'recycle-bin') {
            // The bin is a modal, not a table view — open it directly.
            setRecycleOpen(true);
          } else {
            setActiveView(v as ActiveView);
            if (v === 'all') setActiveFolder(null);
            setSelectedCategory(null);
            setCategoryFilter('');
          }
          setSidebarOpen(false);
        }}
        onSelectCategory={(id) => {
          setSelectedCategory(id);
          setCategoryFilter(id || '');
          setActiveView('all');
          setActiveFolder(null);
          setSidebarOpen(false);
        }}
        onSelectFolder={(id) => {
          setActiveView('folder');
          setActiveFolder(id);
          setSelectedCategory(null);
          setCategoryFilter('');
          setSidebarOpen(false);
        }}
        onNewFolder={() => setFolderModal({ open: true, mode: 'create', id: null, name: '' })}
      />

      <div className="flex-1 min-w-0 space-y-5">
        {/* Header: full-width minimal search on top, actions below */}
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <i className="ri-search-line absolute left-0 top-1/2 -translate-y-1/2 text-white/60 text-base pointer-events-none" />
            <input type="text" placeholder="Search places & services..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-7 pr-4 py-2.5 border-0 border-b border-white/25 rounded-none bg-transparent text-[15px] font-roboto font-medium focus:outline-none focus:border-white text-white caret-white placeholder:text-white/55 transition-colors" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => navigate('/admin/amenities/categories/new')} className="inline-flex items-center gap-2 bg-white hover:bg-[#eef7f5] text-[#0d5959] px-3 py-2 rounded-lg text-[15px] font-roboto font-medium transition-all cursor-pointer whitespace-nowrap">
              <i className="ri-add-circle-line" /> Add New Category
            </button>
            <button onClick={handleAddPlace} className="inline-flex items-center gap-2 bg-white hover:bg-[#eef7f5] text-[#0d5959] px-3 py-2 rounded-lg text-[15px] font-roboto font-medium transition-all cursor-pointer whitespace-nowrap">
              <i className="ri-add-line" /> Add Place / Service
            </button>
            <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 bg-white hover:bg-[#eef7f5] text-[#0d5959] px-3 py-2 rounded-lg text-[15px] font-roboto font-medium transition-all cursor-pointer whitespace-nowrap">
              <i className="ri-upload-cloud-line" /> Import places
            </button>
            <button onClick={() => openExport('view')} className="inline-flex items-center gap-2 bg-white hover:bg-[#eef7f5] text-[#0d5959] px-3 py-2 rounded-lg text-[15px] font-roboto font-medium transition-all cursor-pointer whitespace-nowrap">
              <i className="ri-download-2-line" /> Export
            </button>
            <button onClick={() => setPaletteOpen((o) => !o)} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[15px] font-roboto font-medium transition-all cursor-pointer whitespace-nowrap ${paletteOpen ? 'bg-[#0d5959] text-white' : 'bg-white hover:bg-[#eef7f5] text-[#0d5959]'}`}>
              <i className="ri-palette-line" /> Category Colours
            </button>
          </div>
        </div>

        {/* Category Colours palette */}
        {paletteOpen && (
          <CategoryColourPanel
            categories={categories}
            onChanged={() => fetchCategories()}
            onClose={() => setPaletteOpen(false)}
          />
        )}

        {/* Sort & filter bar */}
        <div className="bg-accent rounded-xl border border-accent px-3 py-2.5 flex flex-col gap-2.5">
          {/* Filters row */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 sm:items-center">
            <select value={categoryFilter} onChange={(e) => { const v = e.target.value; setCategoryFilter(v); setSelectedCategory(v || null); }} className="w-full sm:w-auto max-w-full min-w-0 px-3 py-2.5 border border-white bg-white rounded-lg text-base font-roboto font-semibold text-primary focus:outline-none focus:border-accent">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="w-full sm:w-auto max-w-full px-3 py-2.5 border border-white bg-white rounded-lg text-base font-roboto font-semibold text-primary focus:outline-none focus:border-accent">
              <option value="">All areas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="flex-1 sm:flex-none min-w-0 px-2.5 py-2 border border-white bg-white rounded-lg text-[15px] font-roboto font-medium text-primary focus:outline-none focus:border-accent" title="Created from" />
              <span className="text-white/80">→</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1 sm:flex-none min-w-0 px-2.5 py-2 border border-white bg-white rounded-lg text-[15px] font-roboto font-medium text-primary focus:outline-none focus:border-accent" title="Created to" />
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[15px] font-roboto font-medium text-white hover:bg-white/15 transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-filter-off-line" /> Clear filters
              </button>
            )}
          </div>
          {/* Sort row */}
          <div className="flex flex-wrap items-center gap-2.5 border-t border-white/25 pt-2.5">
            <span className="text-[15px] font-roboto font-semibold uppercase tracking-wider text-white/80 whitespace-nowrap">Sort by</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="flex-1 sm:flex-none min-w-0 px-3 py-2.5 border border-white bg-white rounded-lg text-base font-roboto font-semibold text-primary focus:outline-none focus:border-golden">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="relative group">
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                aria-label={sortDir === 'asc' ? 'Sorted ascending — click to sort descending' : 'Sorted descending — click to sort ascending'}
                className="w-9 h-9 inline-flex items-center justify-center rounded-md bg-white text-primary transition-colors cursor-pointer hover:bg-white/90"
              >
                <i className={`${sortDir === 'asc' ? 'ri-arrow-up-double-fill' : 'ri-arrow-down-double-fill'} text-lg`} />
              </button>
              <span
                role="tooltip"
                className="pointer-events-none absolute right-0 top-full mt-2 z-20 whitespace-nowrap rounded-md bg-[#001731] px-2.5 py-1.5 text-[12px] font-roboto font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                {sortDir === 'asc' ? 'Ascending — click for descending' : 'Descending — click for ascending'}
              </span>
            </div>
          </div>
        </div>

        {/* Bulk action bar — compact, Gmail-style, and STICKY so the quick
            Delete stays reachable no matter how far down a long list the user
            has scrolled. Destructive actions reuse the existing confirm flow. */}
        {selectedIds.length > 0 && (
          <div className="sticky top-2 z-40 flex items-center gap-2 flex-wrap bg-[#0d5959] text-white px-3 py-2 rounded-xl">
            <span className="inline-flex items-center gap-1.5 text-[15px] font-roboto font-semibold whitespace-nowrap tabular-nums">
              <i className="ri-check-double-line text-white/90" /> {selectedIds.length} selected
            </span>
            <button
              onClick={() => setBulkConfirm(true)}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-red-500/50 text-white text-[15px] font-roboto font-semibold disabled:opacity-40 cursor-pointer whitespace-nowrap"
              title={selectedIds.length === 1 ? 'Delete the selected place' : 'Delete all selected places'}
            >
              <i className="ri-delete-bin-line" /> {selectedIds.length === 1 ? 'Delete' : 'Delete selected'}
            </button>
            <span className="hidden sm:block w-px h-5 bg-white/25" />
            <div className="flex items-center gap-1.5">
              <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} className="bg-white text-[#001731] text-[15px] px-3 py-1.5 rounded-lg border border-transparent focus:outline-none cursor-pointer">
                <option value="">Move to category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={handleBulkCategory} disabled={bulkBusy || !bulkCategory} className="px-2 py-1.5 text-[15px] font-medium hover:bg-white/10 rounded-lg disabled:opacity-40 cursor-pointer whitespace-nowrap">Move</button>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={bulkFolder}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setFolderModal({ open: true, mode: 'create', id: null, name: '', moveAfter: true });
                    return;
                  }
                  setBulkFolder(e.target.value);
                }}
                className="bg-white text-[#001731] text-[15px] px-3 py-1.5 rounded-lg border border-transparent focus:outline-none cursor-pointer"
              >
                <option value="">Move to folder…</option>
                {folders.length === 0 && <option value="__none__" disabled>No folders yet — create one</option>}
                {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                <option value="__new__">＋ New folder…</option>
              </select>
              <button onClick={() => handleBulkFolder()} disabled={bulkBusy || !bulkFolder} className="px-2 py-1.5 text-[15px] font-medium hover:bg-white/10 rounded-lg disabled:opacity-40 cursor-pointer whitespace-nowrap">
                <i className="ri-folder-transfer-line" /> Move
              </button>
              <button onClick={() => setFolderModal({ open: true, mode: 'create', id: null, name: '', moveAfter: true })} className="w-8 h-8 flex items-center justify-center text-[15px] font-medium hover:bg-white/10 rounded-lg cursor-pointer whitespace-nowrap" title="Create a new folder and move the selected places into it">
                <i className="ri-folder-add-line" />
              </button>
            </div>
            <button onClick={() => runBulkPublish(true)} disabled={bulkBusy} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[15px] font-medium hover:bg-white/10 rounded-lg disabled:opacity-40 cursor-pointer whitespace-nowrap"><i className="ri-eye-line" /> Publish</button>
            <button onClick={() => runBulkPublish(false)} disabled={bulkBusy} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[15px] font-medium hover:bg-white/10 rounded-lg disabled:opacity-40 cursor-pointer whitespace-nowrap"><i className="ri-eye-off-line" /> Unpublish</button>
            <button onClick={() => runBulkStar(true)} disabled={bulkBusy} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[15px] font-medium hover:bg-white/10 rounded-lg disabled:opacity-40 cursor-pointer whitespace-nowrap"><i className="ri-star-fill" /> Star</button>
            <button onClick={() => runBulkArchive(true)} disabled={bulkBusy} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[15px] font-medium hover:bg-white/10 rounded-lg disabled:opacity-40 cursor-pointer whitespace-nowrap"><i className="ri-inbox-archive-line" /> Archive</button>
            <div className="relative">
              <button onClick={() => setBulkMoreOpen((o) => !o)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[15px] font-medium hover:bg-white/10 rounded-lg cursor-pointer whitespace-nowrap">
                More <i className={`ri-arrow-down-s-line transition-transform ${bulkMoreOpen ? 'rotate-180' : ''}`} />
              </button>
              {bulkMoreOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setBulkMoreOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 z-40 w-56 bg-white text-[#001731] rounded-lg border border-[#e8edf2] py-1 text-left">
                    <button onClick={() => { setBulkMoreOpen(false); handleBulkEdit(); }} disabled={selectedIds.length !== 1} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] hover:bg-[#f7f8fa] disabled:opacity-40 cursor-pointer whitespace-nowrap text-left"><i className="ri-edit-line" /> Edit selected</button>
                    <button onClick={() => { setBulkMoreOpen(false); handleBulkFlag(); }} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] hover:bg-[#f7f8fa] cursor-pointer whitespace-nowrap text-left"><i className="ri-flag-fill" /> Flag</button>
                    <button onClick={() => { setBulkMoreOpen(false); openExport('selected'); }} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] hover:bg-[#f7f8fa] cursor-pointer whitespace-nowrap text-left"><i className="ri-download-2-line" /> Export</button>
                    <button onClick={() => { setBulkMoreOpen(false); runBulkStar(false); }} disabled={bulkBusy} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] hover:bg-[#f7f8fa] disabled:opacity-40 cursor-pointer whitespace-nowrap text-left"><i className="ri-star-line" /> Remove star</button>
                    <button onClick={() => { setBulkMoreOpen(false); runBulkArchive(false); }} disabled={bulkBusy} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] hover:bg-[#f7f8fa] disabled:opacity-40 cursor-pointer whitespace-nowrap text-left"><i className="ri-inbox-unarchive-line" /> Unarchive</button>
                    <div className="my-1 border-t border-[#e8edf2]" />
                    <button onClick={() => { setBulkMoreOpen(false); setBulkConfirm(true); }} disabled={bulkBusy} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] text-red-600 hover:bg-red-50 disabled:opacity-40 cursor-pointer whitespace-nowrap text-left"><i className="ri-delete-bin-line" /> Move to Recycle Bin</button>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => { setSelectedIds([]); setBulkMoreOpen(false); }} className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 text-[15px] hover:bg-white/10 rounded-lg cursor-pointer whitespace-nowrap"><i className="ri-close-line" /> Clear</button>
          </div>
        )}

        {/* Table heading — Gmail-style Select dropdown + Reset */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <div className="relative">
              <button onClick={() => setSelectMenuOpen((o) => !o)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[15px] font-roboto font-medium cursor-pointer whitespace-nowrap">
                <i className="ri-checkbox-multiple-line" /> Select <i className={`ri-arrow-down-s-line transition-transform ${selectMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {selectMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setSelectMenuOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 z-40 w-64 bg-white border border-[#e8edf2] rounded-lg py-1 text-left">
                    <div className="px-3 py-1.5 text-[12px] font-roboto font-semibold uppercase tracking-wider text-[#7a8a99]">Select records</div>
                    <button onClick={() => selectScope('loaded')} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[15px] font-roboto text-[#33414f] hover:bg-[#f7f8fa] cursor-pointer whitespace-nowrap">
                      <span className="flex items-center gap-2"><i className="ri-stack-line text-[#0d5959]" /> All loaded</span>
                      <span className="text-[13px] text-[#7a8a99] tabular-nums">{filteredAmenities.length}</span>
                    </button>
                    <button onClick={() => selectScope('visible')} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[15px] font-roboto text-[#33414f] hover:bg-[#f7f8fa] cursor-pointer whitespace-nowrap">
                      <span className="flex items-center gap-2"><i className="ri-eye-line text-[#0d5959]" /> All visible (this page)</span>
                      <span className="text-[13px] text-[#7a8a99] tabular-nums">{pagedAmenities.length}</span>
                    </button>
                    <div className="my-1 border-t border-[#e8edf2]" />
                    <button onClick={() => selectScope('published')} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] font-roboto text-[#33414f] hover:bg-[#f7f8fa] cursor-pointer whitespace-nowrap">
                      <i className="ri-checkbox-blank-circle-line text-[#0d5959] text-[13px]" /> Published only
                    </button>
                    <button onClick={() => selectScope('draft')} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] font-roboto text-[#33414f] hover:bg-[#f7f8fa] cursor-pointer whitespace-nowrap">
                      <i className="ri-checkbox-blank-circle-line text-[#0d5959] text-[13px]" /> Draft only
                    </button>
                    {categoryFilter && (
                      <button onClick={() => selectScope('category')} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] font-roboto text-[#33414f] hover:bg-[#f7f8fa] cursor-pointer whitespace-nowrap">
                        <i className="ri-price-tag-3-line text-[#0d5959] text-[13px]" /> Selected category
                      </button>
                    )}
                    {areaFilter && (
                      <button onClick={() => selectScope('area')} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] font-roboto text-[#33414f] hover:bg-[#f7f8fa] cursor-pointer whitespace-nowrap">
                        <i className="ri-map-pin-line text-[#0d5959] text-[13px]" /> Selected area
                      </button>
                    )}
                    <div className="my-1 border-t border-[#e8edf2]" />
                    <button onClick={() => selectScope('none')} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] font-roboto text-[#7a8a99] hover:bg-[#f7f8fa] cursor-pointer whitespace-nowrap">
                      <i className="ri-close-line" /> None
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={resetView} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[15px] font-medium cursor-pointer whitespace-nowrap" title="Reset filters, sort, page and selection — deletes nothing">
                <i className="ri-refresh-line" /> Reset
              </button>
              <button onClick={() => setWipeOpen(true)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-red-500/40 text-white text-[15px] font-medium cursor-pointer whitespace-nowrap" title="Permanently delete every place and service, including the Recycle Bin — use before a fresh re-import">
                <i className="ri-delete-bin-6-line" /> Clear all data
              </button>
              <button onClick={() => setRecycleOpen(true)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer whitespace-nowrap">
                <i className="ri-delete-bin-line" /> Recycle Bin
              </button>
              <button onClick={() => setActivityOpen(true)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer whitespace-nowrap">
                <i className="ri-history-line" /> Activity
              </button>
            </div>
          )}
        </div>

        {loading ? (
          /* Skeleton reuses the exact same table scaffold as the finished list so the
             responsive layout is established on the very first paint — no late shift. */
          <div className="bg-white rounded-xl border border-[#e8edf2] overflow-hidden">
            <table className="w-full table-fixed md:table-auto md:min-w-[640px] text-left">
              <thead className="bg-[#f7f8fa] border-b border-[#e8edf2]">
                <tr>
                  <th className="pl-3 pr-1.5 sm:pl-4 sm:pr-2 py-3 w-9 md:w-10" />
                  <th className="px-2 sm:px-3 py-3" />
                  <th className="hidden md:table-cell" />
                  <th className="hidden lg:table-cell" />
                  <th className="hidden md:table-cell" />
                  <th className="px-2 sm:px-3 py-3 w-[100px] md:w-auto" />
                  <th className="hidden sm:table-cell" />
                  <th className="px-2 sm:px-3 py-3 w-[56px] md:w-auto" />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#e8edf2]/60">
                    <td className="pl-3 pr-1.5 sm:pl-4 sm:pr-2 py-3"><div className="w-4 h-4 rounded bg-[#eef2f6] animate-pulse" /></td>
                    <td className="px-2 sm:px-3 py-3">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-10 h-10 rounded-md bg-[#eef2f6] animate-pulse flex-shrink-0" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="h-3.5 w-2/3 rounded bg-[#eef2f6] animate-pulse" />
                          <div className="h-3 w-1/3 rounded bg-[#eef2f6] animate-pulse" />
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3"><div className="h-3.5 w-24 rounded bg-[#eef2f6] animate-pulse" /></td>
                    <td className="hidden lg:table-cell px-4 py-3"><div className="h-3.5 w-20 rounded bg-[#eef2f6] animate-pulse" /></td>
                    <td className="hidden md:table-cell px-4 py-3"><div className="h-3.5 w-20 rounded bg-[#eef2f6] animate-pulse" /></td>
                    <td className="px-2 sm:px-3 py-3"><div className="h-7 w-[74px] sm:w-[104px] rounded-md bg-[#eef2f6] animate-pulse" /></td>
                    <td className="hidden sm:table-cell px-4 py-3"><div className="h-3.5 w-14 rounded bg-[#eef2f6] animate-pulse" /></td>
                    <td className="px-2 sm:px-3 py-3"><div className="h-9 w-9 ml-auto rounded-lg bg-[#eef2f6] animate-pulse" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredAmenities.length === 0 ? (
          renderEmptyState()
        ) : (
        <div>
          <div className="relative">
            <div ref={tableScrollRef} className="bg-white rounded-xl border border-[#e8edf2] overflow-x-auto">
              <table className="w-full table-fixed md:table-auto md:min-w-[640px] text-left">
                <thead className="bg-[#f7f8fa] border-b border-[#e8edf2]">
                  <tr>
                    <th className="pl-3 pr-1.5 sm:pl-4 sm:pr-2 py-2.5 sm:py-3 w-9 sm:w-10">
                      <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 text-[#0d5959] border-[#e8edf2] rounded focus:ring-[#0d5959] cursor-pointer" />
                    </th>
                    <th className="px-2 sm:px-3 py-2.5 sm:py-3 text-[12px] sm:text-[15px] font-roboto font-semibold text-[#4b5563] uppercase tracking-wider">Place<span className="hidden sm:inline"> / Service</span></th>
                    <th className="px-4 py-3 text-[15px] font-roboto font-semibold text-[#4b5563] uppercase tracking-wider hidden md:table-cell">Category</th>
                    <th className="px-4 py-3 text-[15px] font-roboto font-semibold text-[#4b5563] uppercase tracking-wider hidden lg:table-cell">Type</th>
                    <th className="px-4 py-3 text-[15px] font-roboto font-semibold text-[#4b5563] uppercase tracking-wider hidden md:table-cell">Area</th>
                    <th className="px-2 sm:px-3 py-2.5 sm:py-3 text-[12px] sm:text-[15px] font-roboto font-semibold text-[#4b5563] uppercase tracking-wider whitespace-nowrap w-[100px] md:w-auto">Status</th>
                    <th className="px-4 py-3 text-[15px] font-roboto font-semibold text-[#4b5563] uppercase tracking-wider hidden sm:table-cell">Flags</th>
                    <th className="px-2 sm:px-3 py-2.5 sm:py-3 text-[12px] sm:text-[15px] font-roboto font-semibold text-[#4b5563] uppercase tracking-wider text-right whitespace-nowrap w-[56px] md:w-auto">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedAmenities.map((a) => {
                    const catMeta = categories.find((c) => c.id === a.category_id);
                    const checked = selectedIds.includes(a.id);
                    return (
                      <tr
                        key={a.id}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setRowMenu({ open: true, x: e.clientX, y: e.clientY, amenity: a });
                        }}
                        className={`border-b border-[#e8edf2]/60 hover:bg-[#f7f8fa]/60 transition-colors ${checked ? 'bg-[#eef7f5]/60' : ''}`}
                      >
                        <td className="pl-3 pr-1.5 sm:pl-4 sm:pr-2 py-2.5">
                          <input type="checkbox" checked={checked} onChange={() => toggleOne(a.id)} className="w-4 h-4 text-[#0d5959] border-[#e8edf2] rounded focus:ring-[#0d5959] cursor-pointer" />
                        </td>
                        <td className="px-2 sm:px-3 py-2.5">
                          <div className="flex items-center gap-2.5 sm:gap-3">
                            <div className="w-10 h-10 sm:w-11 sm:h-9 rounded-md overflow-hidden flex-shrink-0 bg-stone-100">
                              {amenityImage(a) ? (
                                <img src={amenityImage(a)} alt={smartTitleCase(a.name)} className="w-full h-full object-cover" />
                              ) : (
                                <NoImagePlaceholder compact />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <button onClick={() => navigate(`/admin/amenities/edit/${a.id}`)} className="text-left text-[14px] sm:text-base font-roboto font-medium text-[#001731] hover:text-[#0d5959] cursor-pointer block w-full truncate sm:max-w-[230px] lg:max-w-[340px]">
                                {smartTitleCase(a.name)}
                              </button>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button onClick={() => handleStar(a.id, !!a.is_starred)} className={`${a.is_starred ? 'text-amber-500 hover:text-amber-600' : 'text-[#cbd2d9] hover:text-amber-500'} cursor-pointer`} title={a.is_starred ? 'Unstar' : 'Mark important'}>
                                  <i className={`${a.is_starred ? 'ri-star-fill' : 'ri-star-line'} text-[13px] sm:text-[15px]`} />
                                </button>
                                <span className="text-[12px] sm:text-[15px] text-[#7a8a99] whitespace-nowrap">
                                  <span className="md:hidden">{compactCount(a.view_count || 0)} views</span>
                                  <span className="hidden md:inline">{(a.view_count || 0).toLocaleString()} views</span>
                                </span>
                                {a.is_flagged && <span className="inline-flex items-center gap-0.5 text-[12px] sm:text-[15px] font-semibold text-[#c2410c] whitespace-nowrap"><i className="ri-flag-fill" /> {a.flag_reason || 'Flagged'}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          <span className="inline-flex items-center gap-1.5 text-base font-roboto text-[#4b5563]">
                            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: `var(${categoryColorVar(catMeta?.slug || a.category)})` }} />
                            {categoryLabel(catMeta?.slug || a.category)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 hidden lg:table-cell text-base font-roboto text-[#4b5563]">{subcategoryLabel(a.subcategory) || categoryLabel(catMeta?.slug || a.category)}</td>
                        <td className="px-4 py-2.5 hidden md:table-cell text-base font-roboto text-[#4b5563] whitespace-nowrap">{a.neighbourhood_name || '—'}</td>
                        <td className="px-2 sm:px-3 py-2.5 whitespace-nowrap">
                          {isArchived(a) ? (
                            <span className="inline-flex items-center justify-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 min-w-[74px] sm:min-w-[104px] rounded-md text-[12px] sm:text-[15px] font-roboto font-semibold bg-amber-50 text-amber-700 whitespace-nowrap shrink-0">
                              <i className="ri-inbox-archive-line" /> Archived
                            </span>
                          ) : (
                            <button onClick={() => handleTogglePublish(a.id, a.is_published)} disabled={togglingId === a.id} className={`inline-flex items-center justify-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 min-w-[74px] sm:min-w-[104px] rounded-md text-[12px] sm:text-[15px] font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 ${a.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f7f8fa] text-[#7a8a99]'}`}>
                              {a.is_published ? <i className="ri-eye-line" /> : <i className="ri-eye-off-line" />}
                              {a.is_published ? 'Published' : 'Draft'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          {a.is_flagged ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#fff7ed] text-[#c2410c] text-[15px] font-semibold whitespace-nowrap"><i className="ri-flag-fill" /> {a.flag_reason || 'Flagged'}</span>
                          ) : (
                            <span className="text-[#cbd2d9]">—</span>
                          )}
                        </td>
                        <td className="px-2 sm:px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            {/* Quick delete appears only when THIS row is selected, right
                                beside it, so a single selection can be deleted without
                                scrolling back to the toolbar. Reuses the same confirm +
                                soft-delete flow as the row menu. Never fires on a plain
                                click — the row must be selected first. */}
                            {checked && (
                              <button
                                onClick={() => setDeletePlace(a.id)}
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#eef7f5] text-[#0d5959] hover:bg-red-50 hover:text-red-600 text-[13px] font-roboto font-semibold transition-colors cursor-pointer whitespace-nowrap"
                                title="Delete this place"
                              >
                                <i className="ri-delete-bin-line" /> <span className="hidden sm:inline">Delete</span>
                              </button>
                            )}
                            <AmenityRowActions
                              amenity={a}
                              onEdit={() => navigate(`/admin/amenities/edit/${a.id}`)}
                              onReviews={() => { setReviewsId(a.id); setReviewsName(a.name); setReviewsOpen(true); }}
                              onArchiveToggle={() => handleArchiveToggle(a.id, isArchived(a))}
                              onDelete={() => setDeletePlace(a.id)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {tableScrollable && !tableAtEnd && (
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-xl bg-gradient-to-l from-white to-transparent lg:hidden" />
            )}
          </div>
          {tableScrollable && !tableAtEnd && (
            <div className="lg:hidden mt-2 flex items-center justify-center gap-1.5 text-[15px] font-medium text-[#0d5959]">
              <i className="ri-drag-move-2-line" /> Swipe sideways to see more <i className="ri-arrow-right-line" />
            </div>
          )}
        </div>
        )}

        {/* Pagination footer */}
        {!loading && displayTotal > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
            <p className="text-[15px] text-white/70">Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, displayTotal)} of {displayTotal} place{displayTotal === 1 ? '' : 's'}</p>
            <div className="flex items-center gap-1.5">
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="px-2 py-1.5 border border-white/30 bg-white text-primary rounded-lg text-[15px] font-roboto focus:outline-none">
                {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n} per page</option>)}
              </select>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/20 text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><i className="ri-arrow-left-s-line text-base" /></button>
              <span className="px-2 text-[15px] font-medium text-white">{safePage} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/20 text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><i className="ri-arrow-right-s-line text-base" /></button>
            </div>
          </div>
        )}

        {/* On-demand loading — the full directory is never held in memory; more
            rows are pulled only when the user browses past what is loaded. */}
        {!loading && hasMore && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <button onClick={loadMoreAmenities} disabled={loadingMore} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[15px] font-roboto font-semibold transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap">
              {loadingMore ? <><i className="ri-loader-4-line animate-spin text-base" /> Loading…</> : <><i className="ri-add-circle-line text-base" /> Load more places</>}
            </button>
            <span className="text-[13px] text-white/60 font-roboto">{amenities.length} loaded</span>
          </div>
        )}

        {/* Right-click quick actions for a single row, anchored to the cursor.
            Every action reuses the list's existing handler + confirmation flow. */}
        {rowMenu.open && rowMenu.amenity && (
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => setRowMenu((m) => ({ ...m, open: false }))}
              onContextMenu={(e) => { e.preventDefault(); setRowMenu((m) => ({ ...m, open: false })); }}
            />
            <div
              className="fixed z-[70] w-56 bg-white text-[#001731] rounded-lg border border-[#e8edf2] py-1 text-left"
              style={{
                left: Math.min(rowMenu.x, Math.max(8, window.innerWidth - 232)),
                top: Math.min(rowMenu.y, Math.max(8, window.innerHeight - 300)),
              }}
            >
              <div className="px-3 py-1.5 text-[12px] font-roboto font-semibold uppercase tracking-wider text-[#7a8a99] truncate">{smartTitleCase(rowMenu.amenity.name)}</div>
              <button onClick={() => { const id = rowMenu.amenity!.id; setRowMenu((m) => ({ ...m, open: false })); navigate(`/admin/amenities/edit/${id}`); }} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] hover:bg-[#f7f8fa] cursor-pointer whitespace-nowrap text-left"><i className="ri-edit-line" /> Edit place</button>
              <button onClick={() => { const a = rowMenu.amenity!; setRowMenu((m) => ({ ...m, open: false })); handleStar(a.id, !!a.is_starred); }} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] hover:bg-[#f7f8fa] cursor-pointer whitespace-nowrap text-left"><i className={rowMenu.amenity.is_starred ? 'ri-star-fill text-amber-500' : 'ri-star-line'} /> {rowMenu.amenity.is_starred ? 'Remove from important' : 'Mark important'}</button>
              <button onClick={() => { const a = rowMenu.amenity!; setRowMenu((m) => ({ ...m, open: false })); handleArchiveToggle(a.id, isArchived(a)); }} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] hover:bg-[#f7f8fa] cursor-pointer whitespace-nowrap text-left"><i className={isArchived(rowMenu.amenity) ? 'ri-inbox-unarchive-line' : 'ri-inbox-archive-line'} /> {isArchived(rowMenu.amenity) ? 'Remove from archive' : 'Archive'}</button>
              <button onClick={() => { const id = rowMenu.amenity!.id; setRowMenu((m) => ({ ...m, open: false })); setFlagIds([id]); setFlagOpen(true); }} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] hover:bg-[#f7f8fa] cursor-pointer whitespace-nowrap text-left"><i className="ri-flag-fill" /> Flag</button>
              <button onClick={() => { const am = rowMenu.amenity!; setRowMenu((m) => ({ ...m, open: false })); setReviewsId(am.id); setReviewsName(am.name); setReviewsOpen(true); }} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] hover:bg-[#f7f8fa] cursor-pointer whitespace-nowrap text-left"><i className="ri-chat-3-line" /> Reviews</button>
              <div className="my-1 border-t border-[#e8edf2]" />
              <button onClick={() => { const id = rowMenu.amenity!.id; setRowMenu((m) => ({ ...m, open: false })); setDeletePlace(id); }} className="w-full flex items-center gap-2 px-3 py-2 text-[15px] text-red-600 hover:bg-red-50 cursor-pointer whitespace-nowrap text-left"><i className="ri-delete-bin-line" /> Move to Recycle Bin</button>
            </div>
          </>
        )}

        <ConfirmModal open={wipeOpen} title="Wipe the entire directory?" message="This permanently deletes every place and service in the directory, including anything already in the Recycle Bin, and cannot be undone. Use this to start fresh before re-importing your own data." confirmLabel={wiping ? 'Deleting…' : 'Delete everything'} confirmVariant="danger" onConfirm={handleWipeAll} onCancel={() => !wiping && setWipeOpen(false)} />
        <ConfirmModal open={!!deletePlace} title="Move to Recycle Bin?" message="This place will be moved to the Recycle Bin. You can restore it at any time — nothing is permanently lost yet." confirmLabel="Move to bin" confirmVariant="danger" onConfirm={() => deletePlace && handleDeletePlace(deletePlace)} onCancel={() => setDeletePlace(null)} />
        <ConfirmModal open={bulkConfirm} title={`Move ${selectedIds.length} place(s) to Recycle Bin?`} message="These places will be moved to the Recycle Bin and can be restored later." confirmLabel="Move to bin" confirmVariant="danger" onConfirm={() => { handleBulkDelete(); setBulkConfirm(false); }} onCancel={() => setBulkConfirm(false)} />

        <ImportPlacesModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => { fetchAmenities(); fetchCategories(); fetchCounts(); fetchFoldersList(); fetchCategoryCounts(); }} />
        <AmenitiesExportModal open={exportOpen} initialScope={exportScope} allAmenities={allAmenities} viewAmenities={filteredAmenities} selectedIds={selectedIds} categories={categories} onClose={() => setExportOpen(false)} />

        <FolderModal
          open={folderModal.open}
          mode={folderModal.mode}
          folderId={folderModal.id}
          initialName={folderModal.name}
          onClose={() => setFolderModal({ open: false, mode: 'create', id: null, name: '' })}
          onChanged={(newId) => {
            fetchFoldersList();
            if (newId && folderModal.moveAfter && selectedIds.length) {
              setBulkFolder(newId);
              handleBulkFolder(newId);
            }
          }}
        />
        <FlagModal open={flagOpen} ids={flagIds} count={flagIds.length} onClose={() => setFlagOpen(false)} onDone={() => { fetchAmenities(); fetchCounts(); }} />
        <RecycleBinModal open={recycleOpen} onClose={() => setRecycleOpen(false)} onChanged={() => { fetchAmenities(); fetchFoldersList(); fetchCounts(); }} />
        <ReviewsModal open={reviewsOpen} amenityId={reviewsId} amenityName={reviewsName} onClose={() => setReviewsOpen(false)} onChanged={() => fetchAmenities()} />
        <ActivityModal open={activityOpen} onClose={() => setActivityOpen(false)} />
      </div>
    </div>
  );
}