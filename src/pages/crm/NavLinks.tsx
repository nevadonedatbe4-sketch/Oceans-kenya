import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import { Save, RefreshCw, Loader2, ArrowUp, ArrowDown, GripVertical, Eye, EyeOff, Plus, X } from 'lucide-react';

interface NavLink {
  id: string;
  label: string;
  href: string;
  visible: boolean;
  sort_order: number;
}

export default function NavLinksAdmin() {
  const [links, setLinks] = useState<NavLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [newLink, setNewLink] = useState({ label: '', href: '' });
  const [showAdd, setShowAdd] = useState(false);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('nav_links')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      addToast('Failed to load nav links', 'error');
    } else {
      setLinks(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const saveOrder = async () => {
    setSaving(true);
    const updates = links.map((link, i) =>
      supabase.from('nav_links').update({ sort_order: i + 1, label: link.label, href: link.href, visible: link.visible }).eq('id', link.id)
    );
    const results = await Promise.all(updates);
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      addToast('Failed to save some links', 'error');
    } else {
      addToast('Navigation saved successfully', 'success');
      broadcastSync();
    }
    setSaving(false);
    fetchLinks();
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newLinks = [...links];
    [newLinks[index - 1], newLinks[index]] = [newLinks[index], newLinks[index - 1]];
    setLinks(newLinks);
  };

  const moveDown = (index: number) => {
    if (index === links.length - 1) return;
    const newLinks = [...links];
    [newLinks[index], newLinks[index + 1]] = [newLinks[index + 1], newLinks[index]];
    setLinks(newLinks);
  };

  const toggleVisible = (index: number) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], visible: !newLinks[index].visible };
    setLinks(newLinks);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('nav_links').delete().eq('id', id);
    if (error) {
      addToast('Failed to delete link', 'error');
    } else {
      setLinks((prev) => prev.filter((l) => l.id !== id));
      addToast('Link deleted', 'success');
    }
  };

  const handleAdd = async () => {
    if (!newLink.label.trim() || !newLink.href.trim()) return;
    const { data, error } = await supabase
      .from('nav_links')
      .insert({ label: newLink.label.trim(), href: newLink.href.trim(), sort_order: links.length, visible: true })
      .select('id')
      .single();
    if (error) {
      addToast('Failed to add link', 'error');
    } else {
      setLinks((prev) => [...prev, { id: data.id, label: newLink.label.trim(), href: newLink.href.trim(), visible: true, sort_order: links.length }]);
      setNewLink({ label: '', href: '' });
      setShowAdd(false);
      addToast('Link added', 'success');
    }
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newLinks = [...links];
    const [dragged] = newLinks.splice(dragIndex, 1);
    newLinks.splice(index, 0, dragged);
    setDragIndex(index);
    setLinks(newLinks);
  };
  const handleDragEnd = () => setDragIndex(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-jost text-lg text-[#1a1a2e]">Navigation Links</h2>
          <p className="text-xs text-gray-500 font-roboto mt-0.5">Reorder, show/hide, and edit header navigation items</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus size={14} />
            Add Link
          </button>
          <button
            onClick={fetchLinks}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={saveOrder}
            disabled={saving}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Order</>}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-white rounded-lg border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-roboto font-semibold text-[#1a1a2e]">Add New Link</h3>
            <button onClick={() => setShowAdd(false)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">Label</label>
              <input
                type="text"
                value={newLink.label}
                onChange={(e) => setNewLink((p) => ({ ...p, label: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                placeholder="e.g. Services"
              />
            </div>
            <div>
              <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">URL</label>
              <input
                type="text"
                value={newLink.href}
                onChange={(e) => setNewLink((p) => ({ ...p, href: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                placeholder="e.g. /services"
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!newLink.label.trim() || !newLink.href.trim()}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <Plus size={14} /> Add Link
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-roboto">Loading nav links...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <div className="space-y-2">
            {links.map((link, index) => (
              <div
                key={link.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 px-4 py-3 border rounded-md transition-all ${
                  dragIndex === index ? 'border-primary ring-1 ring-primary' : 'border-gray-100'
                }`}
              >
                <div className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-move">
                  <GripVertical size={16} />
                </div>
                <div className="w-8 h-8 flex items-center justify-center text-gray-500">
                  <i className="ri-link text-lg"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => {
                        const newLinks = [...links];
                        newLinks[index] = { ...newLinks[index], label: e.target.value };
                        setLinks(newLinks);
                      }}
                      className="px-2 py-1 border border-gray-200 rounded text-sm font-roboto focus:outline-none focus:border-primary w-40"
                    />
                    <input
                      type="text"
                      value={link.href}
                      onChange={(e) => {
                        const newLinks = [...links];
                        newLinks[index] = { ...newLinks[index], href: e.target.value };
                        setLinks(newLinks);
                      }}
                      className="px-2 py-1 border border-gray-200 rounded text-sm font-roboto focus:outline-none focus:border-primary w-48"
                    />
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-roboto font-medium uppercase ${
                    link.visible ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  {link.visible ? 'Visible' : 'Hidden'}
                </span>
                <button onClick={() => moveUp(index)} disabled={index === 0} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 disabled:opacity-30 cursor-pointer">
                  <ArrowUp size={14} />
                </button>
                <button onClick={() => moveDown(index)} disabled={index === links.length - 1} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 disabled:opacity-30 cursor-pointer">
                  <ArrowDown size={14} />
                </button>
                <button onClick={() => toggleVisible(index)} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer" title={link.visible ? 'Hide' : 'Show'}>
                  {link.visible ? <Eye size={14} className="text-gray-400" /> : <EyeOff size={14} className="text-gray-300" />}
                </button>
                <button onClick={() => handleDelete(link.id)} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer" title="Delete">
                  <i className="ri-delete-bin-line text-sm"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}