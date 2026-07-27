import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import {
  Save, Loader2, RefreshCw, Plus, X, Star, Trash2, Settings,
  ArrowUp, ArrowDown, GripVertical, Eye, EyeOff,
  Upload, Image,
} from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar_url: string | null;
  content: string;
  rating: number;
  visible: boolean;
  sort_order: number;
  created_at: string;
}

export default function Testimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: '',
    role: '',
    company: '',
    avatar_url: '',
    content: '',
    rating: 5,
    visible: true,
  });

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      showToast('Failed to load testimonials', 'error');
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const resetForm = () => {
    setForm({
      name: '',
      role: '',
      company: '',
      avatar_url: '',
      content: '',
      rating: 5,
      visible: true,
    });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.content.trim()) {
      showToast('Name and content are required', 'error');
      return;
    }
    setSaving(true);

    if (editingId) {
      const { error } = await supabase.from('testimonials').update({
        name: form.name,
        role: form.role,
        company: form.company,
        avatar_url: form.avatar_url || null,
        content: form.content,
        rating: form.rating,
        visible: form.visible,
      }).eq('id', editingId);
      if (error) {
        showToast('Failed to update testimonial', 'error');
      } else {
        showToast('Testimonial updated', 'success');
        broadcastSync();
      }
    } else {
      const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) : 0;
      const { error } = await supabase.from('testimonials').insert({
        name: form.name,
        role: form.role,
        company: form.company,
        avatar_url: form.avatar_url || null,
        content: form.content,
        rating: form.rating,
        visible: form.visible,
        sort_order: maxOrder + 1,
      });
      if (error) {
        showToast('Failed to create testimonial', 'error');
      } else {
        showToast('Testimonial created', 'success');
        broadcastSync();
      }
    }

    setSaving(false);
    setShowForm(false);
    resetForm();
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return;
    const { error } = await supabase.from('testimonials').delete().eq('id', id);
    if (error) {
      showToast('Failed to delete', 'error');
    } else {
      showToast('Testimonial deleted', 'success');
      broadcastSync();
      fetchItems();
    }
  };

  const startEdit = (item: Testimonial) => {
    setForm({
      name: item.name,
      role: item.role || '',
      company: item.company || '',
      avatar_url: item.avatar_url || '',
      content: item.content,
      rating: item.rating,
      visible: item.visible,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    newItems.forEach((item, i) => { item.sort_order = i + 1; });
    setItems(newItems);
  };

  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    newItems.forEach((item, i) => { item.sort_order = i + 1; });
    setItems(newItems);
  };

  const toggleVisible = (index: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], visible: !newItems[index].visible };
    setItems(newItems);
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newItems = [...items];
    const [dragged] = newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, dragged);
    newItems.forEach((item, i) => { item.sort_order = i + 1; });
    setDragIndex(index);
    setItems(newItems);
  };
  const handleDragEnd = () => setDragIndex(null);

  const saveOrder = async () => {
    setSaving(true);
    const updates = items.map((item) =>
      supabase.from('testimonials').update({
        sort_order: item.sort_order,
        visible: item.visible,
      }).eq('id', item.id)
    );
    await Promise.all(updates);
    showToast('Order saved', 'success');
    broadcastSync();
    setSaving(false);
    fetchItems();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-jost text-lg text-[#1a1a2e]">Testimonials</h2>
          <p className="text-xs text-gray-500 font-roboto mt-0.5">Manage client testimonials and reviews</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchItems}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={saveOrder}
            disabled={saving}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <Save size={14} />
            Save Order
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus size={16} />
            Add Testimonial
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-[#012144] lg:bg-white rounded-lg border border-[#1c3a5e] lg:border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-jost text-sm text-[#1a1a2e]">
              {editingId ? 'Edit Testimonial' : 'New Testimonial'}
            </h3>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Name</label>
              <input
                type="text" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
              <input
                type="text" value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                placeholder="CEO"
              />
            </div>
            <div>
              <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Company</label>
              <input
                type="text" value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                placeholder="Acme Inc"
              />
            </div>
            <div>
              <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Rating (1-5)</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setForm({ ...form, rating: star })}
                    className="cursor-pointer"
                  >
                    <Star
                      size={20}
                      className={star <= form.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Avatar URL</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 border border-gray-200 rounded-md flex items-center justify-center bg-gray-50 overflow-hidden">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Image size={18} className="text-gray-300" />
                  )}
                </div>
                <input
                  type="text" value={form.avatar_url}
                  onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Content</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary resize-none"
                maxLength={500}
                placeholder="What did they say?"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm font-roboto text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.visible}
                  onChange={(e) => setForm({ ...form, visible: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                Visible on frontend
              </label>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="px-4 py-2 border border-gray-200 rounded-md text-sm font-roboto text-gray-600 hover:bg-gray-50 cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-roboto">Loading...</p>
        </div>
      ) : (
        <div className="bg-[#012144] lg:bg-white rounded-lg border border-[#1c3a5e] lg:border-gray-100 p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400 font-roboto">No testimonials yet. Add your first one.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 px-4 py-3 border rounded-md transition-all ${
                    dragIndex === index ? 'border-primary ring-1 ring-primary' : 'border-[#1c3a5e] lg:border-gray-100'
                  }`}
                >
                  <div className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-move">
                    <GripVertical size={16} />
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.avatar_url ? (
                      <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-roboto font-semibold text-[#1a1a2e]">{item.name}</h4>
                      <span className="text-xs text-gray-400 font-roboto">{item.role} {item.company && `· ${item.company}`}</span>
                    </div>
                    <p className="text-xs text-gray-500 font-roboto truncate">{item.content}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={10}
                          className={i < item.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-roboto font-medium uppercase ${item.visible ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                    {item.visible ? 'Visible' : 'Hidden'}
                  </span>
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === items.length - 1}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    onClick={() => toggleVisible(index)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer"
                  >
                    {item.visible ? <Eye size={14} className="text-gray-400" /> : <EyeOff size={14} className="text-gray-300" />}
                  </button>
                  <button
                    onClick={() => startEdit(item)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
