import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import CRMPagination from '@/pages/crm/components/CRMPagination';
import { Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  User,
  Tag,
  ArrowUpRight,
  X,
  Image,
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
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const TABS = ['all', 'published', 'draft'] as const;

export default function BlogAdmin() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editPost, setEditPost] = useState<BlogPost | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const perPage = 10;

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase.from('blog_posts').select('*', { count: 'exact' });
    if (activeTab !== 'all') {
      query = query.eq('status', activeTab);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%,excerpt.ilike.%${search}%`);
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
  };

  useEffect(() => {
    fetchPosts();
  }, [activeTab, page, search]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPost) return;
    setSaving(true);
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
      status: 'draft',
      published_at: null,
      created_at: '',
      updated_at: '',
    });
    setIsNew(true);
  };

  const getCounts = () => {
    const counts = { all: totalCount, published: 0, draft: 0 };
    // We don't have full counts per tab from the API, so we estimate
    return counts;
  };

  const counts = getCounts();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-jost text-lg text-[#1a1a2e]">Blog / Insights</h2>
          <p className="text-xs text-gray-500 font-roboto mt-0.5">Manage articles and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search posts..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap"
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
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(1); }}
            className={`px-4 py-2 rounded-md text-sm font-roboto capitalize transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {tab}
            <span className={`ml-1.5 text-xs ${activeTab === tab ? 'text-white/70' : 'text-gray-400'}`}>
              {tab === 'all' ? counts.all : ' '}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 size={32} className="mx-auto text-gray-300 animate-spin mb-3" />
          <p className="text-sm text-gray-400 font-roboto">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-100 py-16 text-center">
          <FileText size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400 font-roboto mb-1">
            {search ? 'No posts match your search' : 'No posts yet'}
          </p>
          {!search && (
            <button onClick={handleNew} className="text-primary text-sm font-roboto hover:underline cursor-pointer mt-2">
              Create your first post
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-gray-500 uppercase tracking-wider">Post</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-gray-500 uppercase tracking-wider hidden sm:table-cell">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-gray-500 uppercase tracking-wider hidden md:table-cell">Author</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-gray-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {post.featured_image ? (
                            <img src={post.featured_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FileText size={16} className="text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-roboto font-medium text-[#1a1a2e] truncate">{post.title}</p>
                          <p className="text-xs text-gray-400 font-roboto truncate">/{post.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-500 font-roboto">{post.category || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-500 font-roboto">{post.author || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-roboto font-medium uppercase ${
                        post.status === 'published'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-400 font-roboto">
                        {post.published_at ? new Date(post.published_at).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditPost(post); setIsNew(false); }}
                          className="p-1.5 hover:bg-gray-100 rounded-md cursor-pointer text-gray-400 hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(post.id)}
                          className="p-1.5 hover:bg-red-50 rounded-md cursor-pointer text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CRMPagination
            page={page}
            totalPages={Math.ceil(totalCount / perPage)}
            total={totalCount}
            pageSize={perPage}
            onPageChange={setPage}
          />
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
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
                  <input
                    required
                    type="text"
                    value={editPost.title}
                    onChange={(e) => setEditPost({ ...editPost, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Slug</label>
                  <input
                    required
                    type="text"
                    value={editPost.slug}
                    onChange={(e) => setEditPost({ ...editPost, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                    placeholder="my-blog-post"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">
                    <Tag size={12} className="inline mr-1" />
                    Category
                  </label>
                  <input
                    type="text"
                    value={editPost.category || ''}
                    onChange={(e) => setEditPost({ ...editPost, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">
                    <User size={12} className="inline mr-1" />
                    Author
                  </label>
                  <input
                    type="text"
                    value={editPost.author || ''}
                    onChange={(e) => setEditPost({ ...editPost, author: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={editPost.status}
                    onChange={(e) => setEditPost({ ...editPost, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary bg-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">
                  <Image size={12} className="inline mr-1" />
                  Featured Image URL
                </label>
                <input
                  type="text"
                  value={editPost.featured_image || ''}
                  onChange={(e) => setEditPost({ ...editPost, featured_image: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Excerpt</label>
                <textarea
                  value={editPost.excerpt || ''}
                  onChange={(e) => setEditPost({ ...editPost, excerpt: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary resize-none"
                  maxLength={500}
                  placeholder="Short summary for previews..."
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Body</label>
                <textarea
                  value={editPost.body || ''}
                  onChange={(e) => setEditPost({ ...editPost, body: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary resize-none font-mono"
                  placeholder="Write your post content here..."
                />
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-jost text-sm text-[#1a1a2e] mb-3">SEO</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">SEO Title</label>
                    <input
                      type="text"
                      value={editPost.seo_title || ''}
                      onChange={(e) => setEditPost({ ...editPost, seo_title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">SEO Description</label>
                    <input
                      type="text"
                      value={editPost.seo_description || ''}
                      onChange={(e) => setEditPost({ ...editPost, seo_description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">
                    <Image size={12} className="inline mr-1" />
                    OG Image URL
                  </label>
                  <input
                    type="text"
                    value={editPost.og_image || ''}
                    onChange={(e) => setEditPost({ ...editPost, og_image: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditPost(null); setIsNew(false); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-md text-sm font-roboto text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-roboto cursor-pointer disabled:opacity-50"
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