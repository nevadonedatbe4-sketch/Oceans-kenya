import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import RowMoreMenu, { type RowMenuItem } from '@/pages/crm/components/RowMoreMenu';
import { smartTitleCase } from '@/lib/location';
import EcoBlocksEditor from '@/pages/crm/components/EcoBlocksEditor';
import type { EcoBlock } from '@/lib/ecosystemBlocks';
import {
  FileText,
  Plus,
  Search,
  Tag,
  X,
  Save,
  Loader2,
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  author: string | null;
  featured_image: string | null;
  excerpt: string | null;
  body: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  article_type: string | null;
  guide_area: string | null;
  guide_categories: string[] | null;
  guide_match: string[] | null;
  eco_blocks: EcoBlock[] | null;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const TABS = [
  { key: 'all', label: 'All Posts' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
] as const;

const perPage = 10;

/** Split a comma-separated field into a clean token list. */
const toList = (v: string): string[] =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export default function BlogAdmin() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [tabCounts, setTabCounts] = useState<{ all: number; published: number; draft: number }>({ all: 0, published: 0, draft: 0 });
  const [categories, setCategories] = useState<string[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);
  const [editPost, setEditPost] = useState<BlogPost | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchOptions = useCallback(async () => {
    const { data } = await supabase.from('blog_posts').select('category, author');
    const catSet = new Set<string>();
    const authorSet = new Set<string>();
    (data || []).forEach((row: { category: string | null; author: string | null }) => {
      if (row.category) catSet.add(row.category);
      if (row.author) authorSet.add(row.author);
    });
    setCategories(Array.from(catSet).sort((a, b) => a.localeCompare(b)));
    setAuthors(Array.from(authorSet).sort((a, b) => a.localeCompare(b)));
  }, []);

  const fetchCounts = useCallback(async () => {
    const { data } = await supabase.from('blog_posts').select('status');
    let all = 0;
    let published = 0;
    let draft = 0;
    (data || []).forEach((row: { status: string }) => {
      all += 1;
      if (row.status === 'published') published += 1;
      else if (row.status === 'draft') draft += 1;
    });
    setTabCounts({ all, published, draft });
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('blog_posts').select('*', { count: 'exact' });
    if (activeTab !== 'all') {
      query = query.eq('status', activeTab);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }
    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }
    if (authorFilter) {
      query = query.eq('author', authorFilter);
    }
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);
    if (error) {
      showToast('Failed to load posts', 'error');
    } else {
      setPosts(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [activeTab, page, search, categoryFilter, authorFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    fetchOptions();
    fetchCounts();
  }, [fetchOptions, fetchCounts]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPost) return;
    setSaving(true);
    const isMicro = editPost.article_type === 'micro_guide';
    const payload = {
      title: editPost.title,
      slug: editPost.slug,
      category: editPost.category,
      author: editPost.author,
      featured_image: editPost.featured_image,
      excerpt: editPost.excerpt,
      body: editPost.body,
      seo_title: editPost.seo_title,
      seo_description: editPost.seo_description,
      og_image: editPost.og_image,
      article_type: editPost.article_type || 'editorial',
      guide_area: isMicro ? (editPost.guide_area || null) : null,
      guide_categories: isMicro ? (editPost.guide_categories || []) : null,
      guide_match: isMicro ? (editPost.guide_match || []) : null,
      eco_blocks: editPost.eco_blocks || [],
      status: editPost.status,
      published_at: editPost.status === 'published' ? (editPost.published_at || new Date().toISOString()) : null,
    };

    let error;
    if (isNew) {
      const { error: insertError } = await supabase.from('blog_posts').insert(payload);
      error = insertError;
    } else {
      const { error: updateError } = await supabase.from('blog_posts').update(payload).eq('id', editPost.id);
      error = updateError;
    }

    if (error) {
      showToast('Failed to save post', 'error');
    } else {
      showToast(isNew ? 'Post created' : 'Post saved', 'success');
      setEditPost(null);
      setIsNew(false);
      fetchPosts();
      fetchOptions();
      fetchCounts();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) {
      showToast('Failed to delete post', 'error');
    } else {
      showToast('Post deleted', 'success');
      setDeleteId(null);
      fetchPosts();
      fetchOptions();
      fetchCounts();
    }
  };

  const handleNew = () => {
    setEditPost({
      id: '',
      title: '',
      slug: '',
      category: '',
      author: '',
      featured_image: '',
      excerpt: '',
      body: '',
      seo_title: '',
      seo_description: '',
      og_image: '',
      article_type: 'editorial',
      guide_area: null,
      guide_categories: [],
      guide_match: [],
      eco_blocks: [],
      status: 'draft',
      published_at: null,
      created_at: '',
      updated_at: '',
    });
    setIsNew(true);
  };

  const hasActiveFilters = !!search || !!categoryFilter || !!authorFilter || activeTab !== 'all';
  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setAuthorFilter('');
  };

  const setTab = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-jost text-lg text-white">Blog / Insights</h2>
          <p className="text-[15px] text-white/70 font-roboto mt-0.5">Manage articles and published content.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search posts..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary bg-white text-[#1a1a2e]"
            />
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-md text-[15px] font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus size={16} />
            New Post
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`px-4 py-2 rounded-md text-[15px] font-roboto font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-[15px] font-medium ${activeTab === tab.key ? 'text-white/70' : 'text-gray-400'}`}>
              {tabCounts[tab.key as keyof typeof tabCounts]}
            </span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-md px-3 py-2.5 flex flex-col lg:flex-row gap-2.5 lg:items-center">
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 bg-white rounded-md text-[15px] font-roboto font-medium text-[#1a1a2e] focus:outline-none focus:border-primary"
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{smartTitleCase(c)}</option>)}
        </select>
        <select
          value={authorFilter}
          onChange={(e) => { setAuthorFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 bg-white rounded-md text-[15px] font-roboto font-medium text-[#1a1a2e] focus:outline-none focus:border-primary"
        >
          <option value="">All authors</option>
          {authors.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="flex-1" />
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[15px] font-roboto font-semibold text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-filter-off-line" /> Clear filters
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 size={32} className="mx-auto text-white/50 animate-spin mb-3" />
          <p className="text-[15px] text-white/70 font-roboto">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-100 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <FileText size={24} className="text-gray-300" />
          </div>
          <p className="text-[15px] font-semibold text-gray-500 font-roboto mb-1">
            {hasActiveFilters ? 'No posts match your filters' : 'No posts yet'}
          </p>
          {!hasActiveFilters && (
            <button onClick={handleNew} className="text-primary text-[15px] font-roboto font-semibold hover:underline cursor-pointer mt-2">
              Create your first post
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider">Post</th>
                  <th className="px-4 py-3 text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Category</th>
                  <th className="px-4 py-3 text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Author</th>
                  <th className="px-4 py-3 text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {posts.map((post) => (
                  <tr key={post.id} onClick={() => { setEditPost(post); setIsNew(false); }} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {post.featured_image ? (
                            <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
                          ) : (
                            <FileText size={16} className="text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-roboto font-medium text-[#1a1a2e] truncate">{smartTitleCase(post.title)}</p>
                          <p className="text-[15px] text-gray-400 font-roboto truncate">/{post.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                      <span className="inline-flex items-center gap-1 text-[15px] font-medium text-gray-500 font-roboto">
                        <Tag size={12} className="text-gray-300" />
                        {post.category ? smartTitleCase(post.category) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[15px] font-medium text-gray-500 font-roboto">{post.author || '—'}</span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[15px] font-roboto font-semibold uppercase ${
                        post.status === 'published'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[15px] text-gray-400 font-roboto">
                        {post.published_at ? new Date(post.published_at).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RowMoreMenu
                        label={post.title}
                        items={[
                          {
                            key: 'edit',
                            icon: 'ri-edit-line',
                            label: 'Edit post',
                            onSelect: () => { setEditPost(post); setIsNew(false); },
                          },
                          {
                            key: 'delete',
                            icon: 'ri-delete-bin-line',
                            label: 'Delete post',
                            danger: true,
                            onSelect: () => setDeleteId(post.id),
                          },
                        ] satisfies RowMenuItem[]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
            <CRMPagination
              page={page}
              totalPages={Math.ceil(totalCount / perPage)}
              total={totalCount}
              pageSize={perPage}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {editPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setEditPost(null); setIsNew(false); }} />
          <div className="relative bg-white rounded-lg w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-lg z-10">
              <h2 className="font-jost text-lg text-[#1a1a2e]">{isNew ? 'New Post' : 'Edit Post'}</h2>
              <button onClick={() => { setEditPost(null); setIsNew(false); }} className="p-1 hover:bg-gray-100 rounded-md cursor-pointer">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
                  <input
                    required
                    type="text"
                    value={editPost.title}
                    onChange={(e) => setEditPost({ ...editPost, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Slug</label>
                  <input
                    required
                    type="text"
                    value={editPost.slug}
                    onChange={(e) => setEditPost({ ...editPost, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary"
                    placeholder="my-blog-post"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    <Tag size={12} className="inline mr-1" />
                    Category
                  </label>
                  <input
                    type="text"
                    value={editPost.category || ''}
                    onChange={(e) => setEditPost({ ...editPost, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Author</label>
                  <input
                    type="text"
                    value={editPost.author || ''}
                    onChange={(e) => setEditPost({ ...editPost, author: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={editPost.status}
                    onChange={(e) => setEditPost({ ...editPost, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary bg-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Article Type</label>
                <select
                  value={editPost.article_type || 'editorial'}
                  onChange={(e) => setEditPost({ ...editPost, article_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary bg-white"
                >
                  <option value="editorial">Editorial article</option>
                  <option value="micro_guide">Micro-guide (Best of [Area] - live picks)</option>
                  <option value="dining_guide">Dining guide (live venues &amp; occasions)</option>
                  <option value="things_to_do">Things to do (live places by theme &amp; area)</option>
                  <option value="attraction">Attraction guide (live places &amp; area)</option>
                  <option value="area_guide">Area guide</option>
                  <option value="lifestyle">Lifestyle</option>
                </select>
                <p className="text-[13px] text-gray-400 font-roboto mt-1">
                  A <strong>Micro-guide</strong> renders the verified places matching the config below (e.g. “Best Cafés in Kilimani”); a <strong>Dining guide</strong> renders verified restaurants by area and occasion; a <strong>Things to do</strong> or <strong>Attraction</strong> article renders curated places by theme and area.
                </p>
              </div>
              {editPost.article_type === 'micro_guide' && (
                <div className="rounded-md border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                  <p className="text-[12px] font-roboto font-semibold text-amber-800 uppercase tracking-wider">
                    Micro-guide configuration
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Area (blank = Nairobi-wide)
                      </label>
                      <input
                        type="text"
                        value={editPost.guide_area || ''}
                        onChange={(e) => setEditPost({ ...editPost, guide_area: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary bg-white"
                        placeholder="e.g. Kilimani"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Categories (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={(editPost.guide_categories || []).join(', ')}
                        onChange={(e) => setEditPost({ ...editPost, guide_categories: toList(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary bg-white"
                        placeholder="dining"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Match - subcategory keys or tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={(editPost.guide_match || []).join(', ')}
                      onChange={(e) => setEditPost({ ...editPost, guide_match: toList(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary bg-white"
                      placeholder="cafe, coffee"
                    />
                    <p className="text-[12px] text-amber-700/80 font-roboto mt-1">
                      A place appears when its category is listed, it sits in the area (if set), and its subcategory key or one of its “best for” tags matches a term here.
                    </p>
                  </div>
                </div>
              )}
              <EcoBlocksEditor
                value={editPost.eco_blocks || []}
                onChange={(blocks) => setEditPost({ ...editPost, eco_blocks: blocks })}
              />
              <div>
                <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Featured Image
                </label>
                <ImageUploadField
                  label="Featured Image"
                  value={editPost.featured_image || ''}
                  onChange={(url) => setEditPost({ ...editPost, featured_image: url })}
                  pageKey="blog"
                  fieldKey="featured_image"
                  previewWidth="w-40"
                  previewHeight="h-28"
                />
                <input
                  type="text"
                  value={editPost.featured_image || ''}
                  onChange={(e) => setEditPost({ ...editPost, featured_image: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary mt-2"
                  placeholder="...or paste an image URL directly"
                />
              </div>
              <div>
                <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Excerpt</label>
                <textarea
                  value={editPost.excerpt || ''}
                  onChange={(e) => setEditPost({ ...editPost, excerpt: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary resize-none"
                  maxLength={500}
                  placeholder="Short summary for previews..."
                />
              </div>
              <div>
                <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Body</label>
                <textarea
                  value={editPost.body || ''}
                  onChange={(e) => setEditPost({ ...editPost, body: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary resize-none font-mono"
                  placeholder="Write your post content here..."
                />
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-jost text-[15px] text-[#1a1a2e] mb-3">SEO</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">SEO Title</label>
                    <input
                      type="text"
                      value={editPost.seo_title || ''}
                      onChange={(e) => setEditPost({ ...editPost, seo_title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">SEO Description</label>
                    <input
                      type="text"
                      value={editPost.seo_description || ''}
                      onChange={(e) => setEditPost({ ...editPost, seo_description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">OG Image URL</label>
                  <input
                    type="text"
                    value={editPost.og_image || ''}
                    onChange={(e) => setEditPost({ ...editPost, og_image: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto font-medium focus:outline-none focus:border-primary"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditPost(null); setIsNew(false); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-md text-[15px] font-roboto font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-md text-[15px] font-roboto font-semibold cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center gap-2 justify-center">
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 justify-center">
                      <Save size={14} />
                      {isNew ? 'Create Post' : 'Save Changes'}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Post"
        message="This will permanently delete the blog post. Are you sure?"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}