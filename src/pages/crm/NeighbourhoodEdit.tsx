import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, ensureStorageBucket, uploadImageViaEdgeFunction } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { addToast } from '@/pages/crm/components/CRMToast';
import { logNeighbourhoodCreated, logNeighbourhoodEdited } from '@/lib/activityLogger';
import { broadcastSync } from '@/lib/syncEngine';

interface NeighbourhoodForm {
  name: string;
  slug: string;
  city: string;
  country: string;
  target_market: string;
  vibe: string;
  average_sale_price: string;
  rental_range_usd: string;
  rental_range_kes: string;
  sort_order: number;
  hero_image: string;
  summary: string;
  description: string;
  content_html: string;
  expat_guide: string;
  practical_info: string;
  tags: string;
  is_featured: boolean;
  is_published: boolean;
  seo_title: string;
  seo_description: string;
  og_image: string;
}

interface NeighbourhoodImage {
  id: string;
  neighbourhood_id: string;
  url: string;
  alt_text: string;
  sort_order: number;
}

interface NeighbourhoodFAQ {
  id: string;
  neighbourhood_id: string;
  question: string;
  answer: string;
  sort_order: number;
}

const emptyForm: NeighbourhoodForm = {
  name: '',
  slug: '',
  city: 'Nairobi',
  country: 'Kenya',
  target_market: '',
  vibe: '',
  average_sale_price: '',
  rental_range_usd: '',
  rental_range_kes: '',
  sort_order: 0,
  hero_image: '',
  summary: '',
  description: '',
  content_html: '',
  expat_guide: '',
  practical_info: '',
  tags: '',
  is_featured: false,
  is_published: false,
  seo_title: '',
  seo_description: '',
  og_image: '',
};

const tabs = [
  { key: 'details', label: 'Details', icon: 'ri-file-info-line' },
  { key: 'content', label: 'Content', icon: 'ri-article-line' },
  { key: 'expat', label: 'Expat Guide', icon: 'ri-globe-line' },
  { key: 'practical', label: 'Practical Info', icon: 'ri-information-line' },
  { key: 'gallery', label: 'Gallery', icon: 'ri-image-line' },
  { key: 'faqs', label: 'FAQs', icon: 'ri-question-answer-line' },
  { key: 'seo', label: 'SEO', icon: 'ri-search-line' },
];

export default function NeighbourhoodEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const [activeTab, setActiveTab] = useState('details');
  const [form, setForm] = useState<NeighbourhoodForm>(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [gallery, setGallery] = useState<NeighbourhoodImage[]>([]);
  const [faqs, setFaqs] = useState<NeighbourhoodFAQ[]>([]);
  const [uploading, setUploading] = useState(false);
  const [storageReady, setStorageReady] = useState<boolean | null>(null);
  const [newFAQ, setNewFAQ] = useState({ question: '', answer: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const ogInputRef = useRef<HTMLInputElement>(null);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60);
  };

  const handleChange = (field: keyof NeighbourhoodForm, value: string | boolean | number) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && !isEdit) {
        next.slug = generateSlug(String(value));
      }
      return next;
    });
  };

  const fetchNeighbourhood = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('neighbourhoods')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching neighbourhood:', error);
      addToast('Failed to load neighbourhood', 'error');
    } else if (data) {
      setForm({
        name: data.name || '',
        slug: data.slug || '',
        city: data.city || 'Nairobi',
        country: data.country || 'Kenya',
        target_market: data.target_market || '',
        vibe: data.vibe || '',
        average_sale_price: data.average_sale_price ? String(data.average_sale_price) : '',
        rental_range_usd: data.rental_range_usd || '',
        rental_range_kes: data.rental_range_kes || '',
        sort_order: data.sort_order || 0,
        hero_image: data.hero_image || '',
        summary: data.summary || '',
        description: data.description || '',
        content_html: data.content_html || '',
        expat_guide: data.expat_guide || '',
        practical_info: data.practical_info || '',
        tags: data.tags ? data.tags.join(', ') : '',
        is_featured: data.is_featured || false,
        is_published: data.is_published || false,
        seo_title: data.seo_title || '',
        seo_description: data.seo_description || '',
        og_image: data.og_image || '',
      });

      const { data: images } = await supabase
        .from('neighbourhood_images')
        .select('*')
        .eq('neighbourhood_id', id)
        .order('sort_order', { ascending: true });
      setGallery(images || []);

      const { data: faqData } = await supabase
        .from('neighbourhood_faqs')
        .select('*')
        .eq('neighbourhood_id', id)
        .order('sort_order', { ascending: true });
      setFaqs(faqData || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (isEdit) {
      fetchNeighbourhood();
    } else {
      setLoading(false);
    }
  }, [fetchNeighbourhood, isEdit]);

  useEffect(() => {
    let cancelled = false;
    ensureStorageBucket().then((ok) => {
      if (!cancelled) setStorageReady(ok);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      sort_order: Number(form.sort_order) || 0,
      average_sale_price: form.average_sale_price ? Number(form.average_sale_price) : null,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };

    if (isEdit && id) {
      const { data: beforeData } = await supabase.from('neighbourhoods').select('*').eq('id', id).maybeSingle();
      const { error } = await supabase.from('neighbourhoods').update(payload).eq('id', id);
      if (error) {
        console.error('Update error:', error);
        addToast('Failed to save neighbourhood', 'error');
      } else {
        addToast('Neighbourhood updated successfully', 'success');
        broadcastSync();
        if (user && beforeData) {
          logNeighbourhoodEdited(user.id, user.name || user.email, id, form.name, beforeData, payload);
        }
      }
    } else {
      const { data: insertData, error } = await supabase.from('neighbourhoods').insert(payload).select('id').single();
      if (error) {
        console.error('Insert error:', error);
        addToast('Failed to create neighbourhood', 'error');
      } else {
        addToast('Neighbourhood created successfully', 'success');
        broadcastSync();
        if (user && insertData) {
          logNeighbourhoodCreated(user.id, user.name || user.email, insertData.id, form.name);
        }
        navigate(`/crm/neighbourhoods/edit/${insertData.id}`, { replace: true });
      }
    }

    setSaving(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'gallery' | 'hero' | 'og') => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;

    if (type === 'gallery') {
      setUploading(true);
      const uploadedUrls: { url: string; alt: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${id}-gallery-${Date.now()}-${i}.${ext}`;
        const filePath = `neighbourhoods/${fileName}`;
        try {
          const { url } = await uploadImageViaEdgeFunction(file, filePath);
          uploadedUrls.push({ url, alt: file.name.split('.')[0].replace(/[-_]/g, ' ') });
        } catch (err: any) {
          console.error('Upload error for file:', file.name, err);
          addToast(`Failed to upload ${file.name}`, 'error');
        }
      }
      if (uploadedUrls.length > 0) {
        const inserts = uploadedUrls.map((u, idx) => ({
          neighbourhood_id: id,
          url: u.url,
          sort_order: gallery.length + idx,
          alt_text: u.alt,
        }));
        const { error: dbError } = await supabase.from('neighbourhood_images').insert(inserts);
        if (!dbError) {
          addToast(`${uploadedUrls.length} image(s) uploaded to gallery`, 'success');
        } else {
          addToast('Failed to save some gallery images', 'error');
        }
        const { data: refreshed } = await supabase
          .from('neighbourhood_images')
          .select('*')
          .eq('neighbourhood_id', id)
          .order('sort_order', { ascending: true });
        setGallery(refreshed || []);
      }
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    const file = files[0];
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${id}-${type}-${Date.now()}.${ext}`;
    const filePath = `neighbourhoods/${fileName}`;

    try {
      const { url } = await uploadImageViaEdgeFunction(file, filePath);

      if (type === 'hero') {
        setForm((prev) => ({ ...prev, hero_image: url }));
        await supabase.from('neighbourhoods').update({ hero_image: url }).eq('id', id);
        addToast('Hero image updated', 'success');
      } else if (type === 'og') {
        setForm((prev) => ({ ...prev, og_image: url }));
        await supabase.from('neighbourhoods').update({ og_image: url }).eq('id', id);
        addToast('OG image updated', 'success');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      addToast(err.message || 'Upload failed', 'error');
    }

    setUploading(false);
    if (heroInputRef.current) heroInputRef.current.value = '';
    if (ogInputRef.current) ogInputRef.current.value = '';
  };

  const handleSetAsHero = async (imageUrl: string) => {
    if (!id) return;
    setForm((prev) => ({ ...prev, hero_image: imageUrl }));
    await supabase.from('neighbourhoods').update({ hero_image: imageUrl }).eq('id', id);
    addToast('Hero image updated', 'success');
  };

  const handleMoveGalleryImage = async (index: number, direction: 'up' | 'down') => {
    if (gallery.length < 2) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= gallery.length) return;

    const newGallery = [...gallery];
    const temp = newGallery[index];
    newGallery[index] = newGallery[newIndex];
    newGallery[newIndex] = temp;

    const updates = newGallery.map((img, i) => ({
      id: img.id,
      sort_order: i,
    }));

    for (const u of updates) {
      await supabase.from('neighbourhood_images').update({ sort_order: u.sort_order }).eq('id', u.id);
    }
    setGallery(newGallery);
  };

  const handleMoveFAQ = async (index: number, direction: 'up' | 'down') => {
    if (faqs.length < 2) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= faqs.length) return;

    const newFaqs = [...faqs];
    const temp = newFaqs[index];
    newFaqs[index] = newFaqs[newIndex];
    newFaqs[newIndex] = temp;

    const updates = newFaqs.map((f, i) => ({
      id: f.id,
      sort_order: i,
    }));

    for (const u of updates) {
      await supabase.from('neighbourhood_faqs').update({ sort_order: u.sort_order }).eq('id', u.id);
    }
    setFaqs(newFaqs);
  };

  const handleDeleteGalleryImage = async (imageId: string) => {
    const { error } = await supabase.from('neighbourhood_images').delete().eq('id', imageId);
    if (error) {
      addToast('Failed to delete image', 'error');
    } else {
      setGallery((prev) => prev.filter((i) => i.id !== imageId));
      addToast('Image deleted', 'success');
    }
  };

  const handleAddFAQ = async () => {
    if (!id || !newFAQ.question.trim() || !newFAQ.answer.trim()) return;
    const { error } = await supabase.from('neighbourhood_faqs').insert({
      neighbourhood_id: id,
      question: newFAQ.question.trim(),
      answer: newFAQ.answer.trim(),
      sort_order: faqs.length,
    });
    if (error) {
      addToast('Failed to add FAQ', 'error');
    } else {
      setNewFAQ({ question: '', answer: '' });
      addToast('FAQ added', 'success');
      const { data: refreshed } = await supabase
        .from('neighbourhood_faqs')
        .select('*')
        .eq('neighbourhood_id', id)
        .order('sort_order', { ascending: true });
      setFaqs(refreshed || []);
    }
  };

  const handleDeleteFAQ = async (faqId: string) => {
    const { error } = await supabase.from('neighbourhood_faqs').delete().eq('id', faqId);
    if (error) {
      addToast('Failed to delete FAQ', 'error');
    } else {
      setFaqs((prev) => prev.filter((f) => f.id !== faqId));
      addToast('FAQ deleted', 'success');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="ri-loader-4-line text-[#0d5959] text-3xl animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/crm/neighbourhoods')}
            className="p-2 hover:bg-[#f8fafc] rounded-lg cursor-pointer text-[#7a8a99] transition-colors"
          >
            <i className="ri-arrow-left-line text-lg" />
          </button>
          <h1 className="font-jost text-lg font-medium text-[#001731]">
            {isEdit ? 'Edit Neighbourhood' : 'New Neighbourhood'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubmit()}
            disabled={saving || uploading}
            className="flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-5 py-2.5 rounded-lg text-sm font-roboto transition-all cursor-pointer disabled:opacity-50"
          >
            <i className={`${saving ? 'ri-loader-4-line animate-spin' : 'ri-save-line'}`} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#e8edf2] overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-roboto transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              activeTab === tab.key
                ? 'border-[#0d5959] text-[#0d5959]'
                : 'border-transparent text-[#7a8a99] hover:text-[#001731]'
            }`}
          >
            <i className={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <h3 className="font-jost text-sm font-medium text-[#001731] mb-4">Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Neighbourhood Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20"
                  placeholder="e.g. Lavington"
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">URL Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                  placeholder="url-friendly-name"
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                  placeholder="Nairobi"
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                  placeholder="Kenya"
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Target Market</label>
                <input
                  type="text"
                  value={form.target_market}
                  onChange={(e) => handleChange('target_market', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                  placeholder="e.g. Families, Expats"
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Vibe / Character</label>
                <input
                  type="text"
                  value={form.vibe}
                  onChange={(e) => handleChange('vibe', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                  placeholder="e.g. Quiet, Green, Upscale"
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Average Sale Price</label>
                <input
                  type="number"
                  value={form.average_sale_price}
                  onChange={(e) => handleChange('average_sale_price', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                  placeholder="e.g. 45000000"
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Sort Order</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => handleChange('sort_order', Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Rental Range (USD/month)</label>
                <input
                  type="text"
                  value={form.rental_range_usd}
                  onChange={(e) => handleChange('rental_range_usd', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                  placeholder="e.g. $1,500 - $3,000"
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Rental Range (KES/month)</label>
                <input
                  type="text"
                  value={form.rental_range_kes}
                  onChange={(e) => handleChange('rental_range_kes', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                  placeholder="e.g. KSh 150,000 - 300,000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Tags (comma separated)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => handleChange('tags', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                  placeholder="e.g. Family-friendly, Quiet, Green"
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => handleChange('is_featured', e.target.checked)}
                    className="w-4 h-4 text-[#0d5959] border-[#e8edf2] rounded focus:ring-[#0d5959]"
                  />
                  <span className="text-sm font-roboto text-[#001731]">Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => handleChange('is_published', e.target.checked)}
                    className="w-4 h-4 text-[#0d5959] border-[#e8edf2] rounded focus:ring-[#0d5959]"
                  />
                  <span className="text-sm font-roboto text-[#001731]">Published</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <h3 className="font-jost text-sm font-medium text-[#001731] mb-4">Content</h3>
            <div>
              <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Summary</label>
              <textarea
                value={form.summary}
                onChange={(e) => handleChange('summary', e.target.value)}
                className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] min-h-[80px] resize-none"
                placeholder="Short summary for cards..."
                maxLength={500}
              />
              <p className="text-[10px] text-[#7a8a99] font-roboto mt-1 text-right">{form.summary.length}/500</p>
            </div>
            <div>
              <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] min-h-[120px] resize-none"
                placeholder="Full description..."
                maxLength={5000}
              />
              <p className="text-[10px] text-[#7a8a99] font-roboto mt-1 text-right">{form.description.length}/5000</p>
            </div>
            <div>
              <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Content HTML</label>
              <textarea
                value={form.content_html}
                onChange={(e) => handleChange('content_html', e.target.value)}
                className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] min-h-[200px] resize-none font-mono"
                placeholder="HTML content for the neighbourhood page..."
                maxLength={50000}
              />
            </div>
          </div>
        )}

        {/* Expat Guide Tab */}
        {activeTab === 'expat' && (
          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <h3 className="font-jost text-sm font-medium text-[#001731] mb-4">Expat Guide</h3>
            <textarea
              value={form.expat_guide}
              onChange={(e) => handleChange('expat_guide', e.target.value)}
              className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] min-h-[300px] resize-none"
              placeholder="Information for expats about this neighbourhood..."
              maxLength={50000}
            />
          </div>
        )}

        {/* Practical Info Tab */}
        {activeTab === 'practical' && (
          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <h3 className="font-jost text-sm font-medium text-[#001731] mb-4">Practical Info</h3>
            <textarea
              value={form.practical_info}
              onChange={(e) => handleChange('practical_info', e.target.value)}
              className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] min-h-[300px] resize-none"
              placeholder="Practical information about this neighbourhood..."
              maxLength={50000}
            />
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <h3 className="font-jost text-sm font-medium text-[#001731] mb-4">Gallery</h3>
            <div className="bg-[#f8fafc] rounded-lg p-4 border border-[#e8edf2]">
              <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Hero Image (Front-end Display)</label>
              <p className="text-[10px] font-roboto text-[#7a8a99] mb-3">This is the single image shown on the neighbourhood card and detail page on the website.</p>
              <div className="flex items-center gap-3">
                {form.hero_image ? (
                  <img src={form.hero_image} alt="" className="w-24 h-16 object-cover rounded-lg" />
                ) : (
                  <div className="w-24 h-16 bg-[#e8edf2] rounded-lg flex items-center justify-center">
                    <i className="ri-image-line text-[#7a8a99] text-lg" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="text"
                    value={form.hero_image}
                    onChange={(e) => handleChange('hero_image', e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                    placeholder="https://..."
                  />
                </div>
                {isEdit && (
                  <>
                    <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'hero')} />
                    <button
                      onClick={() => heroInputRef.current?.click()}
                      disabled={uploading || storageReady === false}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-[#e8edf2] rounded-lg text-xs font-roboto text-[#7a8a99] hover:text-[#001731] hover:bg-[#f8fafc] transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      <i className="ri-upload-line" />
                      {uploading ? '...' : 'Upload'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#e8edf2]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-roboto text-[#001731] font-medium">Gallery Images</h4>
                  <p className="text-[10px] font-roboto text-[#7a8a99]">Click the star icon on any image below to set it as the front-end hero image.</p>
                </div>
                {isEdit && (
                  <>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e, 'gallery')} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || storageReady === false}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0d5959] text-white rounded-lg text-xs font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      <i className="ri-add-line" />
                      {uploading ? 'Uploading...' : 'Add Images'}
                    </button>
                  </>
                )}
              </div>
              {isEdit && gallery.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {gallery.map((img, idx) => (
                    <div key={img.id} className={`relative group rounded-lg border overflow-hidden ${form.hero_image === img.url ? 'border-[#0d5959] ring-2 ring-[#0d5959]/20' : 'border-[#e8edf2]'}`}>
                      <img src={img.url} alt={img.alt_text || ''} className="w-full aspect-[4/3] object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                      {form.hero_image === img.url && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-[#0d5959] text-white text-[10px] font-roboto font-medium rounded-md">
                          Current Hero
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleSetAsHero(img.url)}
                          disabled={form.hero_image === img.url}
                          className="w-7 h-7 flex items-center justify-center bg-white/90 rounded-md hover:bg-white cursor-pointer text-[#0d5959] transition-colors disabled:opacity-50"
                          title="Set as hero"
                        >
                          <i className="ri-star-line text-xs" />
                        </button>
                        <button
                          onClick={() => handleMoveGalleryImage(idx, 'up')}
                          disabled={idx === 0}
                          className="w-7 h-7 flex items-center justify-center bg-white/90 rounded-md hover:bg-white cursor-pointer text-gray-600 transition-colors disabled:opacity-30"
                          title="Move up"
                        >
                          <i className="ri-arrow-up-line text-xs" />
                        </button>
                        <button
                          onClick={() => handleMoveGalleryImage(idx, 'down')}
                          disabled={idx === gallery.length - 1}
                          className="w-7 h-7 flex items-center justify-center bg-white/90 rounded-md hover:bg-white cursor-pointer text-gray-600 transition-colors disabled:opacity-30"
                          title="Move down"
                        >
                          <i className="ri-arrow-down-line text-xs" />
                        </button>
                        <button
                          onClick={() => handleDeleteGalleryImage(img.id)}
                          className="w-7 h-7 flex items-center justify-center bg-white/90 rounded-md hover:bg-red-50 cursor-pointer text-gray-600 hover:text-red-600 transition-colors"
                        >
                          <i className="ri-delete-bin-line text-xs" />
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <input
                          type="text"
                          value={img.alt_text || ''}
                          onChange={async (e) => {
                            await supabase.from('neighbourhood_images').update({ alt_text: e.target.value }).eq('id', img.id);
                            setGallery((prev) => prev.map((g) => (g.id === img.id ? { ...g, alt_text: e.target.value } : g)));
                          }}
                          className="w-full text-[10px] font-roboto text-white bg-black/50 px-2 py-1 rounded border-0 placeholder-white/60"
                          placeholder="Alt text"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : isEdit ? (
                <div className="text-center py-8 border-2 border-dashed border-[#e8edf2] rounded-lg">
                  <i className="ri-image-line text-[#e8edf2] text-3xl mb-2" />
                  <p className="text-sm font-roboto text-[#7a8a99]">No gallery images yet. Upload images to add them.</p>
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-[#e8edf2] rounded-lg">
                  <p className="text-sm font-roboto text-[#7a8a99]">Save the neighbourhood first to upload images.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FAQs Tab */}
        {activeTab === 'faqs' && (
          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <h3 className="font-jost text-sm font-medium text-[#001731] mb-4">FAQs</h3>
            {isEdit && (
              <div className="bg-[#f8fafc] rounded-lg p-4 space-y-3">
                <div>
                  <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Question</label>
                  <input
                    type="text"
                    value={newFAQ.question}
                    onChange={(e) => setNewFAQ((prev) => ({ ...prev, question: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                    placeholder="Enter question..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Answer</label>
                  <textarea
                    value={newFAQ.answer}
                    onChange={(e) => setNewFAQ((prev) => ({ ...prev, answer: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] min-h-[80px] resize-none"
                    placeholder="Enter answer..."
                    maxLength={500}
                  />
                </div>
                <button
                  onClick={handleAddFAQ}
                  disabled={!newFAQ.question.trim() || !newFAQ.answer.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0d5959] text-white rounded-lg text-sm font-roboto transition-all cursor-pointer disabled:opacity-50"
                >
                  <i className="ri-add-line" /> Add FAQ
                </button>
              </div>
            )}
            <div className="space-y-3">
              {faqs.length === 0 ? (
                <p className="text-sm font-roboto text-[#7a8a99] text-center py-4">No FAQs yet. {isEdit ? 'Add your first question above.' : 'Save the neighbourhood first to add FAQs.'}</p>
              ) : (
                faqs.map((faq, index) => (
                  <div key={faq.id} className="border border-[#e8edf2] rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-roboto text-[#7a8a99] font-medium">Q{index + 1}</span>
                          <p className="text-sm font-roboto text-[#001731] font-medium">{faq.question}</p>
                        </div>
                        <p className="text-sm font-roboto text-[#7a8a99] mt-2 leading-relaxed">{faq.answer}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <button
                          onClick={() => handleMoveFAQ(index, 'up')}
                          disabled={index === 0}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f8fafc] text-[#7a8a99] hover:text-[#001731] transition-colors cursor-pointer disabled:opacity-30"
                          title="Move up"
                        >
                          <i className="ri-arrow-up-line text-xs" />
                        </button>
                        <button
                          onClick={() => handleMoveFAQ(index, 'down')}
                          disabled={index === faqs.length - 1}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f8fafc] text-[#7a8a99] hover:text-[#001731] transition-colors cursor-pointer disabled:opacity-30"
                          title="Move down"
                        >
                          <i className="ri-arrow-down-line text-xs" />
                        </button>
                        <button
                          onClick={() => handleDeleteFAQ(faq.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#7a8a99] hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <i className="ri-delete-bin-line text-sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SEO Tab */}
        {activeTab === 'seo' && (
          <div className="bg-white rounded-xl border border-[#e8edf2] p-6 space-y-4">
            <h3 className="font-jost text-sm font-medium text-[#001731] mb-4">SEO</h3>
            <div>
              <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Meta Title</label>
              <input
                type="text"
                value={form.seo_title}
                onChange={(e) => handleChange('seo_title', e.target.value)}
                className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                placeholder="Page title for search engines"
              />
              <p className="text-[10px] text-[#7a8a99] font-roboto mt-1 text-right">{form.seo_title.length}/60</p>
            </div>
            <div>
              <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Meta Description</label>
              <textarea
                value={form.seo_description}
                onChange={(e) => handleChange('seo_description', e.target.value)}
                className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] min-h-[80px] resize-none"
                placeholder="Meta description for search engines"
                maxLength={160}
              />
              <p className="text-[10px] text-[#7a8a99] font-roboto mt-1 text-right">{form.seo_description.length}/160</p>
            </div>
            <div>
              <label className="block text-xs font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">OG Image</label>
              <div className="flex items-center gap-3">
                {form.og_image && (
                  <img src={form.og_image} alt="" className="w-24 h-16 object-cover rounded-lg" />
                )}
                <div className="flex-1">
                  <input
                    type="text"
                    value={form.og_image}
                    onChange={(e) => handleChange('og_image', e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959]"
                    placeholder="https://..."
                  />
                </div>
                {isEdit && (
                  <>
                    <input ref={ogInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'og')} />
                    <button
                      onClick={() => ogInputRef.current?.click()}
                      disabled={uploading || storageReady === false}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-[#e8edf2] rounded-lg text-xs font-roboto text-[#7a8a99] hover:text-[#001731] hover:bg-[#f8fafc] transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      <i className="ri-upload-line" />
                      {uploading ? '...' : 'Upload'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}