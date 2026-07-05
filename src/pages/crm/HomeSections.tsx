import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import ConfirmModal from '@/pages/crm/components/ConfirmModal';
import { Link } from 'react-router-dom';
import {
  LayoutGrid,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Pencil,
  Save,
  X,
  Image,
  Link as LinkIcon,
  GripVertical,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface HomeSection {
  id: string;
  name: string;
  slug: string;
  title: string | null;
  subtitle: string | null;
  body_text: string | null;
  image_url: string | null;
  background_image: string | null;
  background_color: string | null;
  button_text: string | null;
  button_link: string | null;
  secondary_button_text: string | null;
  secondary_button_link: string | null;
  layout: string | null;
  sort_order: number;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

export default function HomeSections() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState<HomeSection | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchSections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('homepage_sections')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      showToast('Failed to load sections', 'error');
    } else {
      setSections(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const saveOrder = async () => {
    setSaving(true);
    const updates = sections.map((s, i) =>
      supabase.from('homepage_sections').update({ sort_order: i + 1 }).eq('id', s.id)
    );
    const results = await Promise.all(updates);
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      showToast('Failed to save order', 'error');
    } else {
      showToast('Order saved successfully', 'success');
    }
    setSaving(false);
    fetchSections();
  };

  const toggleVisibility = async (id: string, visible: boolean) => {
    const { error } = await supabase
      .from('homepage_sections')
      .update({ visible: !visible })
      .eq('id', id);
    if (error) {
      showToast('Failed to update visibility', 'error');
    } else {
      showToast(visible ? 'Section hidden' : 'Section visible', 'success');
      fetchSections();
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    setSections(newSections);
  };

  const moveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    setSections(newSections);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newSections = [...sections];
    const [dragged] = newSections.splice(dragIndex, 1);
    newSections.splice(index, 0, dragged);
    setDragIndex(index);
    setSections(newSections);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    const { error } = await supabase
      .from('homepage_sections')
      .update({
        title: editModal.title,
        subtitle: editModal.subtitle,
        body_text: editModal.body_text,
        image_url: editModal.image_url,
        background_image: editModal.background_image,
        background_color: editModal.background_color,
        button_text: editModal.button_text,
        button_link: editModal.button_link,
        secondary_button_text: editModal.secondary_button_text,
        secondary_button_link: editModal.secondary_button_link,
        layout: editModal.layout,
      })
      .eq('id', editModal.id);
    if (error) {
      showToast('Failed to save section', 'error');
    } else {
      showToast('Section saved', 'success');
      setEditModal(null);
      fetchSections();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('homepage_sections').delete().eq('id', id);
    if (error) {
      showToast('Failed to delete section', 'error');
    } else {
      showToast('Section deleted', 'success');
      setDeleteId(null);
      fetchSections();
    }
  };

  const getSectionIcon = (slug: string) => {
    switch (slug) {
      case 'hero': return 'ri-home-5-line';
      case 'featured_listings': return 'ri-building-line';
      case 'featured_neighbourhoods': return 'ri-map-pin-line';
      case 'about': return 'ri-information-line';
      case 'track_record': return 'ri-bar-chart-line';
      case 'testimonials': return 'ri-chat-quote-line';
      case 'cta_banner': return 'ri-megaphone-line';
      case 'latest_insights': return 'ri-article-line';
      default: return 'ri-layout-3-line';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-jost text-lg text-[#1a1a2e]">Homepage Sections</h2>
          <p className="text-xs text-gray-500 font-roboto mt-0.5">
            Drag to reorder, toggle visibility, or edit each section
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={saveOrder}
            disabled={saving}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Order
              </>
            )}
          </button>
          <Link
            to="/"
            target="_blank"
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap"
          >
            <ExternalLink size={16} />
            Preview Site
          </Link>
        </div>
      </div>

      {/* Sections List */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-roboto">Loading sections...</p>
        </div>
      ) : sections.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-100 py-16 text-center">
          <LayoutGrid size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400 font-roboto">No sections found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map((section, index) => (
            <div
              key={section.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`bg-white rounded-lg border transition-all hover:shadow-sm cursor-move ${
                dragIndex === index ? 'border-primary ring-1 ring-primary' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Drag handle */}
                <div className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-gray-500">
                  <GripVertical size={16} />
                </div>

                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-[#0d5959]/8 flex items-center justify-center flex-shrink-0">
                  <i className={`${getSectionIcon(section.slug)} text-[#0d5959] text-lg`}></i>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-roboto font-semibold text-[#1a1a2e] truncate">
                    {section.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-roboto">
                    <span className="truncate">{section.title || 'No title'}</span>
                    <span>&middot;</span>
                    <span className="uppercase">{section.layout}</span>
                    <span>&middot;</span>
                    <span>Order: {section.sort_order}</span>
                  </div>
                </div>

                {/* Status badge */}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-roboto font-medium uppercase ${
                    section.visible
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  {section.visible ? 'Visible' : 'Hidden'}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleVisibility(section.id, section.visible)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
                    title={section.visible ? 'Hide' : 'Show'}
                  >
                    {section.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === sections.length - 1}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    onClick={() => setEditModal(section)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-primary transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setPreviewSlug(section.slug)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-primary transition-colors"
                    title="Preview"
                  >
                    <ExternalLink size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteId(section.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 cursor-pointer text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <i className="ri-delete-bin-line text-sm"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditModal(null)} />
          <div className="relative bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-lg">
              <h2 className="font-jost text-lg text-[#1a1a2e]">Edit {editModal.name}</h2>
              <button onClick={() => setEditModal(null)} className="p-1 hover:bg-gray-100 rounded-md cursor-pointer">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
                  <input
                    type="text"
                    value={editModal.title || ''}
                    onChange={(e) => setEditModal({ ...editModal, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Subtitle</label>
                  <input
                    type="text"
                    value={editModal.subtitle || ''}
                    onChange={(e) => setEditModal({ ...editModal, subtitle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Body Text</label>
                <textarea
                  value={editModal.body_text || ''}
                  onChange={(e) => setEditModal({ ...editModal, body_text: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary resize-none"
                  maxLength={1000}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">
                    <Image size={12} className="inline mr-1" />
                    Image URL
                  </label>
                  <input
                    type="text"
                    value={editModal.image_url || ''}
                    onChange={(e) => setEditModal({ ...editModal, image_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">
                    <Image size={12} className="inline mr-1" />
                    Background Image URL
                  </label>
                  <input
                    type="text"
                    value={editModal.background_image || ''}
                    onChange={(e) => setEditModal({ ...editModal, background_image: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Background Color</label>
                  <input
                    type="color"
                    value={editModal.background_color || '#ffffff'}
                    onChange={(e) => setEditModal({ ...editModal, background_color: e.target.value })}
                    className="w-full h-10 px-2 border border-gray-200 rounded-md cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Layout</label>
                  <select
                    value={editModal.layout || 'default'}
                    onChange={(e) => setEditModal({ ...editModal, layout: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary bg-white"
                  >
                    <option value="default">Default</option>
                    <option value="hero">Hero</option>
                    <option value="carousel">Carousel</option>
                    <option value="grid">Grid</option>
                    <option value="stats">Stats</option>
                    <option value="banner">Banner</option>
                    <option value="two-column">Two Column</option>
                    <option value="full-width">Full Width</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Sort Order</label>
                  <input
                    type="number"
                    value={editModal.sort_order}
                    onChange={(e) => setEditModal({ ...editModal, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">
                    <LinkIcon size={12} className="inline mr-1" />
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={editModal.button_text || ''}
                    onChange={(e) => setEditModal({ ...editModal, button_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">
                    <LinkIcon size={12} className="inline mr-1" />
                    Button Link
                  </label>
                  <input
                    type="text"
                    value={editModal.button_link || ''}
                    onChange={(e) => setEditModal({ ...editModal, button_link: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                    placeholder="/buy or https://..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Secondary Button Text</label>
                  <input
                    type="text"
                    value={editModal.secondary_button_text || ''}
                    onChange={(e) => setEditModal({ ...editModal, secondary_button_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Secondary Button Link</label>
                  <input
                    type="text"
                    value={editModal.secondary_button_link || ''}
                    onChange={(e) => setEditModal({ ...editModal, secondary_button_link: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-md text-sm font-roboto text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-roboto cursor-pointer"
                >
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPreviewSlug(null)} />
          <div className="relative bg-white rounded-lg w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-jost text-lg text-[#1a1a2e]">Preview Section</h2>
              <button onClick={() => setPreviewSlug(null)} className="p-1 hover:bg-gray-100 rounded-md cursor-pointer">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg border border-gray-100 p-8 text-center">
                <i className={`${getSectionIcon(previewSlug)} text-4xl text-[#0d5959]/30 mb-3`}></i>
                <p className="text-sm text-gray-400 font-roboto">
                  This preview shows how the section will appear on the homepage.
                </p>
                <p className="text-xs text-gray-300 font-roboto mt-1">
                  Open the homepage to see the live section.
                </p>
                <Link
                  to="/"
                  target="_blank"
                  className="inline-flex items-center gap-2 mt-4 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap"
                >
                  <ExternalLink size={14} />
                  View Live Page
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Section"
        message="This will permanently remove the section from the homepage. Are you sure?"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}