import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import { Save, RefreshCw, Loader2, Plus, X, Eye, EyeOff, ArrowUp, ArrowDown, Upload } from 'lucide-react';
import { uploadImageViaEdgeFunction } from '@/lib/supabase';

interface ContactSection {
  id: string;
  page_slug: string;
  title: string | null;
  subtitle: string | null;
  body_text: string | null;
  phone: string | null;
  email: string | null;
  whatsapp_link: string | null;
  button_text: string | null;
  button_link: string | null;
  profile_image: string | null;
  background_color: string | null;
  background_image: string | null;
  visible: boolean;
  sort_order: number;
}

export default function ContactSectionsAdmin() {
  const [sections, setSections] = useState<ContactSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newSection, setNewSection] = useState({
    page_slug: 'global',
    title: '',
    subtitle: '',
    body_text: '',
    phone: '',
    email: '',
    whatsapp_link: '',
    button_text: '',
    button_link: '',
    background_color: '#f8fafc',
  });

  const fetchSections = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_sections')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      addToast('Failed to load contact sections', 'error');
    } else {
      setSections(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const saveSection = async (section: ContactSection) => {
    setSaving(true);
    const { error } = await supabase
      .from('contact_sections')
      .update({
        page_slug: section.page_slug,
        title: section.title,
        subtitle: section.subtitle,
        body_text: section.body_text,
        phone: section.phone,
        email: section.email,
        whatsapp_link: section.whatsapp_link,
        button_text: section.button_text,
        button_link: section.button_link,
        profile_image: section.profile_image,
        background_color: section.background_color,
        background_image: section.background_image,
        visible: section.visible,
        sort_order: section.sort_order,
      })
      .eq('id', section.id);
    if (error) {
      addToast('Failed to save section', 'error');
    } else {
      addToast('Section saved', 'success');
      broadcastSync();
    }
    setSaving(false);
    fetchSections();
  };

  const handleAdd = async () => {
    if (!newSection.title.trim()) return;
    const { data, error } = await supabase
      .from('contact_sections')
      .insert({
        ...newSection,
        sort_order: sections.length,
        visible: true,
      })
      .select('id')
      .single();
    if (error) {
      addToast('Failed to add section', 'error');
    } else {
      setSections((prev) => [...prev, { id: data.id, ...newSection, profile_image: null, background_image: null, visible: true, sort_order: sections.length }]);
      setNewSection({
        page_slug: 'global',
        title: '',
        subtitle: '',
        body_text: '',
        phone: '',
        email: '',
        whatsapp_link: '',
        button_text: '',
        button_link: '',
        background_color: '#f8fafc',
      });
      setShowAdd(false);
      addToast('Section added', 'success');
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('contact_sections').delete().eq('id', id);
    if (error) {
      addToast('Failed to delete section', 'error');
    } else {
      setSections((prev) => prev.filter((s) => s.id !== id));
      addToast('Section deleted', 'success');
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const newSections = [...sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    setSections(newSections);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, sectionId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const filePath = `contact-sections/${sectionId}-${Date.now()}-${file.name}`;
    try {
      const { url } = await uploadImageViaEdgeFunction(file, filePath);
      const updated = sections.map((s) => (s.id === sectionId ? { ...s, profile_image: url } : s));
      setSections(updated);
      await supabase.from('contact_sections').update({ profile_image: url }).eq('id', sectionId);
      addToast('Profile image uploaded', 'success');
    } catch (err: any) {
      addToast(err.message || 'Upload failed', 'error');
    }
    setUploading(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-jost text-lg text-[#1a1a2e]">Contact Sections</h2>
          <p className="text-xs text-gray-500 font-roboto mt-0.5">Manage CTA/contact sections above the footer</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap">
            <Plus size={14} /> Add Section
          </button>
          <button onClick={fetchSections} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-white rounded-lg border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-roboto font-semibold text-[#1a1a2e]">Add Contact Section</h3>
            <button onClick={() => setShowAdd(false)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Page Slug</label>
              <input type="text" value={newSection.page_slug} onChange={(e) => setNewSection((p) => ({ ...p, page_slug: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" placeholder="global or page slug" /></div>
            <div><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
              <input type="text" value={newSection.title} onChange={(e) => setNewSection((p) => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" /></div>
            <div><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Subtitle</label>
              <input type="text" value={newSection.subtitle} onChange={(e) => setNewSection((p) => ({ ...p, subtitle: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" /></div>
            <div><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
              <input type="text" value={newSection.phone} onChange={(e) => setNewSection((p) => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" /></div>
            <div><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
              <input type="text" value={newSection.email} onChange={(e) => setNewSection((p) => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" /></div>
            <div><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">WhatsApp Link</label>
              <input type="text" value={newSection.whatsapp_link} onChange={(e) => setNewSection((p) => ({ ...p, whatsapp_link: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" /></div>
            <div><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Button Text</label>
              <input type="text" value={newSection.button_text} onChange={(e) => setNewSection((p) => ({ ...p, button_text: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" /></div>
            <div><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Button Link</label>
              <input type="text" value={newSection.button_link} onChange={(e) => setNewSection((p) => ({ ...p, button_link: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" /></div>
            <div className="sm:col-span-2"><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Body Text</label>
              <textarea value={newSection.body_text} onChange={(e) => setNewSection((p) => ({ ...p, body_text: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary resize-none" /></div>
          </div>
          <button onClick={handleAdd} disabled={!newSection.title.trim()} className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50">
            <Plus size={14} /> Add Section
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-roboto">Loading sections...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <div key={section.id} className="bg-white rounded-lg border border-gray-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-roboto font-medium uppercase ${section.visible ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                    {section.visible ? 'Visible' : 'Hidden'}
                  </span>
                  <span className="text-xs font-roboto text-gray-400">Page: {section.page_slug}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 disabled:opacity-30 cursor-pointer">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => handleMove(index, 'down')} disabled={index === sections.length - 1} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 disabled:opacity-30 cursor-pointer">
                    <ArrowDown size={14} />
                  </button>
                  <button onClick={() => { const updated = [...sections]; updated[index] = { ...updated[index], visible: !updated[index].visible }; setSections(updated); }} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer">
                    {section.visible ? <Eye size={14} className="text-gray-400" /> : <EyeOff size={14} className="text-gray-300" />}
                  </button>
                  <button onClick={() => handleDelete(section.id)} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer">
                    <i className="ri-delete-bin-line text-sm"></i>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
                  <input type="text" value={section.title || ''} onChange={(e) => { const updated = [...sections]; updated[index] = { ...updated[index], title: e.target.value }; setSections(updated); }} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" /></div>
                <div><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Subtitle</label>
                  <input type="text" value={section.subtitle || ''} onChange={(e) => { const updated = [...sections]; updated[index] = { ...updated[index], subtitle: e.target.value }; setSections(updated); }} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" /></div>
                <div><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
                  <input type="text" value={section.phone || ''} onChange={(e) => { const updated = [...sections]; updated[index] = { ...updated[index], phone: e.target.value }; setSections(updated); }} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" /></div>
                <div><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input type="text" value={section.email || ''} onChange={(e) => { const updated = [...sections]; updated[index] = { ...updated[index], email: e.target.value }; setSections(updated); }} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" /></div>
                <div><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">WhatsApp</label>
                  <input type="text" value={section.whatsapp_link || ''} onChange={(e) => { const updated = [...sections]; updated[index] = { ...updated[index], whatsapp_link: e.target.value }; setSections(updated); }} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" /></div>
                <div><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Background Color</label>
                  <input type="color" value={section.background_color || '#f8fafc'} onChange={(e) => { const updated = [...sections]; updated[index] = { ...updated[index], background_color: e.target.value }; setSections(updated); }} className="w-full h-10 px-2 border border-gray-200 rounded-md cursor-pointer" /></div>
                <div className="sm:col-span-2"><label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Body Text</label>
                  <textarea value={section.body_text || ''} onChange={(e) => { const updated = [...sections]; updated[index] = { ...updated[index], body_text: e.target.value }; setSections(updated); }} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary resize-none" /></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Profile Image</label>
                  <div className="flex items-center gap-3">
                    {section.profile_image ? (
                      <img src={section.profile_image} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <i className="ri-user-line text-gray-400 text-lg"></i>
                      </div>
                    )}
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-md text-xs font-roboto text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                      <Upload size={12} />
                      {uploading ? 'Uploading...' : 'Upload'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, section.id)} />
                    </label>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Button Text</label>
                  <input type="text" value={section.button_text || ''} onChange={(e) => { const updated = [...sections]; updated[index] = { ...updated[index], button_text: e.target.value }; setSections(updated); }} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Button Link</label>
                  <input type="text" value={section.button_link || ''} onChange={(e) => { const updated = [...sections]; updated[index] = { ...updated[index], button_link: e.target.value }; setSections(updated); }} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => saveSection(sections[index])} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-md text-sm font-roboto transition-all cursor-pointer disabled:opacity-50">
                  <Save size={14} /> {saving ? 'Saving...' : 'Save Section'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}