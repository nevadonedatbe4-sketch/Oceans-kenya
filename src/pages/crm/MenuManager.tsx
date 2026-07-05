import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import { broadcastSync } from '@/lib/syncEngine';
import {
  Save, Loader2, RefreshCw, ArrowUp, ArrowDown,
  GripVertical, Eye, EyeOff, Check, X, Settings,
  LayoutDashboard, Building2, Users, Handshake, Mail,
  UserRound, Image, BarChart3, History, MapPin, FileText,
  Grid3X3, Shield, Sliders, Search, Globe, Share2,
  DollarSign, Phone, Home, Star, MessageSquare,
  Calendar, Tag, Bookmark, Bell, ChevronRight,
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  label: string;
  icon: string;
  module: string;
  path: string;
  visible: boolean;
  sort_order: number;
  allowed_roles: string[];
}

const ICONS: Record<string, any> = {
  LayoutDashboard, Building2, Users, Handshake, Mail,
  UserRound, Image, BarChart3, History, MapPin, FileText,
  Grid3X3, Settings, Shield, Sliders, Search, Globe,
  Share2, DollarSign, Phone, Home, Star, MessageSquare,
  Calendar, Tag, Bookmark, Bell, ChevronRight,
};

const ROLES = ['super_admin', 'admin', 'editor', 'agent'];

export default function MenuManager() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editIcon, setEditIcon] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('menu_settings')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      showToast('Failed to load menu', 'error');
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const updates = items.map((item) =>
      supabase.from('menu_settings').upsert({
        id: item.id,
        name: item.name,
        label: item.label,
        icon: item.icon,
        module: item.module,
        path: item.path,
        visible: item.visible,
        sort_order: item.sort_order,
        allowed_roles: item.allowed_roles,
      }, { onConflict: 'name' })
    );
    const results = await Promise.all(updates);
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      showToast('Some menu items failed to save', 'error');
    } else {
      showToast('Menu saved successfully', 'success');
      broadcastSync();
    }
    setSaving(false);
    fetchItems();
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

  const toggleRole = (index: number, role: string) => {
    const newItems = [...items];
    const item = newItems[index];
    const hasRole = item.allowed_roles.includes(role);
    if (hasRole) {
      item.allowed_roles = item.allowed_roles.filter((r) => r !== role);
    } else {
      item.allowed_roles = [...item.allowed_roles, role];
    }
    setItems(newItems);
  };

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setEditLabel(item.label);
    setEditIcon(item.icon);
  };

  const saveEdit = (index: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], label: editLabel, icon: editIcon };
    setItems(newItems);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
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

  const renderIcon = (iconName: string) => {
    const Icon = ICONS[iconName] || LayoutDashboard;
    return <Icon size={18} />;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-jost text-lg text-[#1a1a2e]">Dashboard Menu</h2>
          <p className="text-xs text-gray-500 font-roboto mt-0.5">Reorder, show/hide, and configure sidebar modules</p>
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
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Menu</>}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-roboto">Loading menu...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.id}
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
                  {renderIcon(item.icon)}
                </div>

                <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary w-40"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(index);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                      />
                      <select
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                      >
                        {Object.keys(ICONS).map((k) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                      <button onClick={() => saveEdit(index)} className="w-6 h-6 flex items-center justify-center text-green-600 hover:bg-green-50 rounded cursor-pointer">
                        <Check size={14} />
                      </button>
                      <button onClick={cancelEdit} className="w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-50 rounded cursor-pointer">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-sm font-roboto font-semibold text-[#1a1a2e]">{item.label}</h4>
                      <p className="text-xs text-gray-400 font-roboto">{item.module}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {ROLES.map((role) => (
                    <button
                      key={role}
                      onClick={() => toggleRole(index, role)}
                      className={`px-2 py-1 rounded text-[10px] font-roboto font-medium uppercase cursor-pointer transition-all ${
                        item.allowed_roles.includes(role)
                          ? 'bg-primary/10 text-primary'
                          : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                      }`}
                      title={role}
                    >
                      {role.replace('_', ' ')}
                    </button>
                  ))}
                </div>

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
                  title={item.visible ? 'Hide' : 'Show'}
                >
                  {item.visible ? (
                    <Eye size={14} className="text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeOff size={14} className="text-gray-300 hover:text-gray-500" />
                  )}
                </button>

                <button
                  onClick={() => startEdit(item)}
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="Edit label & icon"
                >
                  <Settings size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}