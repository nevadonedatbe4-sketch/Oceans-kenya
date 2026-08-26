import { useState, useEffect } from 'react';
import { supabase, uploadImageViaEdgeFunction } from '@/lib/supabase';
import { broadcastSync } from '@/lib/syncEngine';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import {
  Save, Loader2, Settings, Palette, Type, Layout, Image, Search, ListChecks,
  Upload, X, ArrowUp, ArrowDown, GripVertical,
  Globe, Share2, DollarSign, MapPin, Phone, Mail, Home, Eye, EyeOff,
  Grid3X3, CreditCard, FileText, ChevronRight, ExternalLink, RefreshCw,
  ChevronDown, ChevronUp, Info, Building2, Map, Layers, Tag, SquareStack,
  Monitor, Smartphone, PanelLeft, PanelRight, PanelTop, ArrowLeftRight,
  SlidersHorizontal, Link, Ruler, ShoppingBag, Calendar, Hash, Aperture,
  Star, Heart, Bookmark, Play, BookOpen, Landmark, School, Calculator,
  MessageSquare, Printer, Copy, Check, Undo2, Plus, Trash2,
} from 'lucide-react';

// ─── Types ───
interface SettingRecord {
  id: string;
  key: string;
  value: string | null;
  category?: string;
  page?: string;
}

interface SocialLink {
  id: string;
  platform: string;
  url: string | null;
  show_in_header: boolean;
  show_in_footer: boolean;
  show_in_contact: boolean;
  sort_order: number;
}

interface SearchFilter {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
  sort_order: number;
}

interface RequiredField {
  id: string;
  key: string;
  label: string;
  category: string;
  required: boolean;
}

interface DetailLayout {
  id: string;
  key: string;
  label: string;
  visible: boolean;
  sort_order: number;
}

interface HomeSection {
  id: string;
  name: string;
  slug: string;
  visible: boolean;
  sort_order: number;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  button_text: string | null;
  button_link: string | null;
}

// ─── Tabs ───
const TABS = [
  { key: 'general', label: 'General', icon: Settings },
  { key: 'search', label: 'Search & Filters', icon: Search },
  { key: 'properties', label: 'Property Settings', icon: Building2 },
  { key: 'required', label: 'Required Fields', icon: ListChecks },
  { key: 'hero', label: 'Hero Section', icon: Home },
  { key: 'homepage', label: 'Homepage', icon: Grid3X3 },
  { key: 'breadcrumbs', label: 'Breadcrumbs', icon: ChevronRight },
  { key: 'contact', label: 'Contact & Company', icon: Phone },
  { key: 'social', label: 'Social Media', icon: Share2 },
  { key: 'maps', label: 'Maps & Location', icon: MapPin },
  { key: 'details', label: 'Details Layout', icon: Layers },
  { key: 'cards', label: 'Cards Style', icon: CreditCard },
  { key: 'detail-style', label: 'Detail Style', icon: Monitor },
  { key: 'branding', label: 'Branding', icon: Palette },
  { key: 'typography', label: 'Typography', icon: Type },
] as const;

export default function ManagementOptions() {
  const [activeTab, setActiveTab] = useState<string>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [tabCollapsed, setTabCollapsed] = useState(false);

  // Data stores
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>();
  const [brandSettings, setBrandSettings] = useState<SettingRecord[]>([]);
  const [typoSettings, setTypoSettings] = useState<SettingRecord[]>([]);
  const [propPageSettings, setPropPageSettings] = useState<SettingRecord[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilter[]>([]);
  const [propertySettings, setPropertySettings] = useState<SettingRecord[]>([]);
  const [requiredFields, setRequiredFields] = useState<RequiredField[]>([]);
  const [heroSettings, setHeroSettings] = useState<SettingRecord[]>([]);
  const [breadcrumbSettings, setBreadcrumbSettings] = useState<SettingRecord[]>([]);
  const [mapSettings, setMapSettings] = useState<SettingRecord[]>([]);
  const [detailLayout, setDetailLayout] = useState<DetailLayout[]>([]);
  const [cardStyle, setCardStyle] = useState<SettingRecord[]>([]);
  const [detailStyle, setDetailStyle] = useState<SettingRecord[]>([]);
  const [homeSections, setHomeSections] = useState<HomeSection[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [detailDragIndex, setDetailDragIndex] = useState<number | null>(null);
  const [searchDragIndex, setSearchDragIndex] = useState<number | null>(null);

  // ─── Fetch ───
  const fetchData = async () => {
    setLoading(true);
    const [
      siteRes, brandRes, typoRes, propRes, socialRes,
      searchRes, propSetRes, reqRes, heroRes, breadRes,
      mapRes, layoutRes, cardRes, detailRes, homeRes,
    ] = await Promise.all([
      supabase.from('site_settings').select('*'),
      supabase.from('brand_settings').select('*'),
      supabase.from('typography_settings').select('*'),
      supabase.from('property_page_settings').select('*'),
      supabase.from('social_links').select('*').order('sort_order', { ascending: true }),
      supabase.from('search_filters').select('*').order('sort_order', { ascending: true }),
      supabase.from('property_settings').select('*'),
      supabase.from('required_fields').select('*').order('category', { ascending: true }),
      supabase.from('hero_settings').select('*'),
      supabase.from('breadcrumb_settings').select('*'),
      supabase.from('map_settings').select('*'),
      supabase.from('property_details_layout').select('*').order('sort_order', { ascending: true }),
      supabase.from('property_cards_style').select('*'),
      supabase.from('property_detail_style').select('*'),
      supabase.from('homepage_sections').select('id, name, slug, visible, sort_order, title, subtitle, image_url, button_text, button_link').order('sort_order', { ascending: true }),
    ]);

    if (siteRes.data) {
      const map: Record<string, string> = {};
      siteRes.data.forEach((s: any) => { map[s.key] = s.value || ''; });
      setSiteSettings(map);
    }
    if (brandRes.data) setBrandSettings(brandRes.data);
    if (typoRes.data) setTypoSettings(typoRes.data);
    if (propRes.data) setPropPageSettings(propRes.data);
    if (socialRes.data) setSocialLinks(socialRes.data);
    if (searchRes.data) setSearchFilters(searchRes.data);
    if (propSetRes.data) setPropertySettings(propSetRes.data);
    if (reqRes.data) setRequiredFields(reqRes.data);
    if (heroRes.data) setHeroSettings(heroRes.data);
    if (breadRes.data) setBreadcrumbSettings(breadRes.data);
    if (mapRes.data) setMapSettings(mapRes.data);
    if (layoutRes.data) setDetailLayout(layoutRes.data);
    if (cardRes.data) setCardStyle(cardRes.data);
    if (detailRes.data) setDetailStyle(detailRes.data);
    if (homeRes.data) setHomeSections(homeRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ─── Helpers ───
  const getSite = (key: string) => siteSettings[key] || '';
  const setSite = (key: string, value: string) =>
    setSiteSettings((prev) => ({ ...prev, [key]: value }));
  const getBrand = (key: string) => brandSettings.find((b) => b.key === key)?.value || '';
  const setBrand = (key: string, value: string) =>
    setBrandSettings((prev) => prev.map((b) => (b.key === key ? { ...b, value } : b)));
  const getTypo = (key: string) => typoSettings.find((t) => t.key === key)?.value || '';
  const setTypo = (key: string, value: string) =>
    setTypoSettings((prev) => prev.map((t) => (t.key === key ? { ...t, value } : t)));
  const getProp = (key: string) => propPageSettings.find((p) => p.key === key)?.value || '';
  const setProp = (key: string, value: string) =>
    setPropPageSettings((prev) => prev.map((p) => (p.key === key ? { ...p, value } : p)));
  const getSocial = (platform: string) => socialLinks.find((s) => s.platform === platform);
  const setSocial = (platform: string, updates: Partial<SocialLink>) =>
    setSocialLinks((prev) => prev.map((s) => (s.platform === platform ? { ...s, ...updates } : s)));
  const getSearch = (key: string) => searchFilters.find((s) => s.key === key);
  const setSearch = (key: string, updates: Partial<SearchFilter>) =>
    setSearchFilters((prev) => prev.map((s) => (s.key === key ? { ...s, ...updates } : s)));
  const getPropSetting = (key: string) => propertySettings.find((p) => p.key === key)?.value || '';
  const setPropSetting = (key: string, value: string) =>
    setPropertySettings((prev) => prev.map((p) => (p.key === key ? { ...p, value } : p)));
  const getRequired = (key: string) => requiredFields.find((r) => r.key === key);
  const setRequired = (key: string, required: boolean) =>
    setRequiredFields((prev) => prev.map((r) => (r.key === key ? { ...r, required } : r)));
  const getHero = (key: string) => heroSettings.find((h) => h.key === key)?.value || '';
  const setHero = (key: string, value: string) =>
    setHeroSettings((prev) => prev.map((h) => (h.key === key ? { ...h, value } : h)));
  const getBread = (key: string) => breadcrumbSettings.find((b) => b.key === key)?.value || '';
  const setBread = (key: string, value: string) =>
    setBreadcrumbSettings((prev) => prev.map((b) => (b.key === key ? { ...b, value } : b)));
  const getMap = (key: string) => mapSettings.find((m) => m.key === key)?.value || '';
  const setMap = (key: string, value: string) =>
    setMapSettings((prev) => prev.map((m) => (m.key === key ? { ...m, value } : m)));
  const getCard = (key: string) => cardStyle.find((c) => c.key === key)?.value || '';
  const setCard = (key: string, value: string) =>
    setCardStyle((prev) => prev.map((c) => (c.key === key ? { ...c, value } : c)));
  const getDetailStyle = (key: string) => detailStyle.find((d) => d.key === key)?.value || '';
  const setDetailStyleVal = (key: string, value: string) =>
    setDetailStyle((prev) => prev.map((d) => (d.key === key ? { ...d, value } : d)));
  const toggleSite = (key: string) => setSite(key, getSite(key) === 'true' ? 'false' : 'true');
  const toggleHero = (key: string) => setHero(key, getHero(key) === 'true' ? 'false' : 'true');
  const toggleBread = (key: string) => setBread(key, getBread(key) === 'true' ? 'false' : 'true');
  const toggleMap = (key: string) => setMap(key, getMap(key) === 'true' ? 'false' : 'true');

  // ─── Save ───
  const handleSave = async () => {
    setSaving(true);
    const updates = [
      ...Object.entries(siteSettings).map(([key, value]) =>
        supabase.from('site_settings').upsert({ key, value, category: 'general' }, { onConflict: 'key' })
      ),
      ...brandSettings.map((b) =>
        supabase.from('brand_settings').upsert({ key: b.key, value: b.value }, { onConflict: 'key' })
      ),
      ...typoSettings.map((t) =>
        supabase.from('typography_settings').upsert({ key: t.key, value: t.value }, { onConflict: 'key' })
      ),
      ...propPageSettings.map((p) =>
        supabase.from('property_page_settings').upsert({ key: p.key, value: p.value, page: p.page || 'all' }, { onConflict: 'key' })
      ),
      ...socialLinks.map((s) =>
        supabase.from('social_links').update({
          url: s.url, show_in_header: s.show_in_header, show_in_footer: s.show_in_footer,
          show_in_contact: s.show_in_contact, sort_order: s.sort_order,
        }).eq('id', s.id)
      ),
      ...searchFilters.map((s) =>
        supabase.from('search_filters').update({ enabled: s.enabled, sort_order: s.sort_order }).eq('id', s.id)
      ),
      ...propertySettings.map((p) =>
        supabase.from('property_settings').upsert({ key: p.key, value: p.value }, { onConflict: 'key' })
      ),
      ...requiredFields.map((r) =>
        supabase.from('required_fields').update({ required: r.required }).eq('id', r.id)
      ),
      ...heroSettings.map((h) =>
        supabase.from('hero_settings').upsert({ key: h.key, value: h.value }, { onConflict: 'key' })
      ),
      ...breadcrumbSettings.map((b) =>
        supabase.from('breadcrumb_settings').upsert({ key: b.key, value: b.value }, { onConflict: 'key' })
      ),
      ...mapSettings.map((m) =>
        supabase.from('map_settings').upsert({ key: m.key, value: m.value }, { onConflict: 'key' })
      ),
      ...detailLayout.map((d) =>
        supabase.from('property_details_layout').update({ visible: d.visible, sort_order: d.sort_order }).eq('id', d.id)
      ),
      ...cardStyle.map((c) =>
        supabase.from('property_cards_style').upsert({ key: c.key, value: c.value }, { onConflict: 'key' })
      ),
      ...detailStyle.map((d) =>
        supabase.from('property_detail_style').upsert({ key: d.key, value: d.value }, { onConflict: 'key' })
      ),
      ...homeSections.map((h) =>
        supabase.from('homepage_sections').update({ visible: h.visible, sort_order: h.sort_order }).eq('id', h.id)
      ),
    ];
    const results = await Promise.all(updates);
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      showToast('Some settings failed to save', 'error');
    } else {
      showToast('All settings saved successfully', 'success');
      broadcastSync();
    }
    setSaving(false);
    fetchData();
  };

  // ─── Uploads ───
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(key);
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${key}-${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;
      const { url } = await uploadImageViaEdgeFunction(file, filePath);
      setBrand(key, url);
      showToast('Logo uploaded', 'success');
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    }
    setUploadingLogo(null);
    if (e.target) e.target.value = '';
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `hero-${Date.now()}.${fileExt}`;
      const filePath = `hero/${fileName}`;
      const { url } = await uploadImageViaEdgeFunction(file, filePath);
      setHero('hero_background_image', url);
      showToast('Hero image uploaded', 'success');
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    }
    setUploadingHero(false);
    if (e.target) e.target.value = '';
  };

  // ─── Reorder ───
  const moveSearchUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...searchFilters];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    newItems.forEach((item, i) => { item.sort_order = i + 1; });
    setSearchFilters(newItems);
  };
  const moveSearchDown = (index: number) => {
    if (index === searchFilters.length - 1) return;
    const newItems = [...searchFilters];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    newItems.forEach((item, i) => { item.sort_order = i + 1; });
    setSearchFilters(newItems);
  };
  const moveDetailUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...detailLayout];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    newItems.forEach((item, i) => { item.sort_order = i + 1; });
    setDetailLayout(newItems);
  };
  const moveDetailDown = (index: number) => {
    if (index === detailLayout.length - 1) return;
    const newItems = [...detailLayout];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    newItems.forEach((item, i) => { item.sort_order = i + 1; });
    setDetailLayout(newItems);
  };
  const moveHomeUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...homeSections];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    newItems.forEach((item, i) => { item.sort_order = i + 1; });
    setHomeSections(newItems);
  };
  const moveHomeDown = (index: number) => {
    if (index === homeSections.length - 1) return;
    const newItems = [...homeSections];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    newItems.forEach((item, i) => { item.sort_order = i + 1; });
    setHomeSections(newItems);
  };
  const toggleHomeVisible = (index: number) => {
    const newItems = [...homeSections];
    newItems[index] = { ...newItems[index], visible: !newItems[index].visible };
    setHomeSections(newItems);
  };
  const toggleDetailVisible = (index: number) => {
    const newItems = [...detailLayout];
    newItems[index] = { ...newItems[index], visible: !newItems[index].visible };
    setDetailLayout(newItems);
  };

  // ─── Drag ───
  const handleSearchDragStart = (index: number) => setSearchDragIndex(index);
  const handleSearchDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (searchDragIndex === null || searchDragIndex === index) return;
    const newItems = [...searchFilters];
    const [dragged] = newItems.splice(searchDragIndex, 1);
    newItems.splice(index, 0, dragged);
    newItems.forEach((item, i) => { item.sort_order = i + 1; });
    setSearchDragIndex(index);
    setSearchFilters(newItems);
  };
  const handleSearchDragEnd = () => setSearchDragIndex(null);
  const handleDetailDragStart = (index: number) => setDetailDragIndex(index);
  const handleDetailDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (detailDragIndex === null || detailDragIndex === index) return;
    const newItems = [...detailLayout];
    const [dragged] = newItems.splice(detailDragIndex, 1);
    newItems.splice(index, 0, dragged);
    newItems.forEach((item, i) => { item.sort_order = i + 1; });
    setDetailDragIndex(index);
    setDetailLayout(newItems);
  };
  const handleDetailDragEnd = () => setDetailDragIndex(null);

  // ─── Field Builders ───
  const field = (label: string, children: React.ReactNode, className = '') => (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );

  const textInput = (value: string, onChange: (v: string) => void, placeholder = '') => (
    <input
      type="text" value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
      placeholder={placeholder}
    />
  );

  const numberInput = (value: string, onChange: (v: string) => void, placeholder = '') => (
    <input
      type="number" value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
      placeholder={placeholder}
    />
  );

  const selectInput = (value: string, options: { value: string; label: string }[], onChange: (v: string) => void) => (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary bg-white"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const toggleRow = (label: string, desc: string, value: boolean, onToggle: () => void) => (
    <div className="flex items-center justify-between p-4 border border-stone-200/70 rounded-lg bg-stone-50/50 hover:bg-stone-50 transition-colors group">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-roboto font-medium text-stone-800 tracking-tight">{label}</p>
        {desc && <p className="text-[11px] text-stone-400 font-roboto mt-0.5 leading-relaxed">{desc}</p>}
      </div>
      <button
        onClick={onToggle}
        className={`relative flex-shrink-0 ml-5 w-11 h-6 rounded-full transition-all duration-300 ease-out cursor-pointer ${value ? 'bg-[#1B4332] shadow-[0_0_0_1px_rgba(27,67,50,0.2)]' : 'bg-stone-300'}`}
        role="switch"
        aria-checked={value}
      >
        <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all duration-300 ease-out shadow-sm ${value ? 'left-[calc(100%-21px)] shadow-[0_1px_3px_rgba(27,67,50,0.3)]' : 'left-[3px]'}`} />
      </button>
    </div>
  );

  const colorField = (label: string, key: string, getFn: (k: string) => string, setFn: (k: string, v: string) => void) => (
    <div>
      <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color" value={getFn(key) || '#000000'}
          onChange={(e) => setFn(key, e.target.value)}
          className="w-10 h-10 border border-gray-200 rounded-md cursor-pointer flex-shrink-0"
        />
        <input
          type="text" value={getFn(key) || ''}
          onChange={(e) => setFn(key, e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
        />
      </div>
    </div>
  );

  // ─── Icons ───
  const socialIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return 'ri-facebook-fill';
      case 'instagram': return 'ri-instagram-line';
      case 'tiktok': return 'ri-linkedin-fill';
      case 'linkedin': return 'ri-linkedin-fill';
      case 'youtube': return 'ri-youtube-fill';
      case 'twitter': return 'ri-twitter-x-fill';
      case 'whatsapp': return 'ri-whatsapp-line';
      default: return 'ri-global-line';
    }
  };

  // ─── Render ───
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-jost text-lg text-[#1a1a2e]">Management Options</h2>
          <p className="text-xs text-gray-500 font-roboto mt-0.5">Global controls that affect the frontend</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
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
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save All</>}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTabCollapsed(!tabCollapsed)}
            className="lg:hidden flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-md text-xs text-gray-500 cursor-pointer"
          >
            {tabCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            {tabCollapsed ? 'Show tabs' : 'Hide tabs'}
          </button>
        </div>
        <div className={`flex items-center gap-1 bg-white border border-gray-200 rounded-md p-1 w-fit flex-wrap mt-2 ${tabCollapsed ? 'hidden lg:flex' : ''}`}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.key ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-roboto">Loading...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 p-6 space-y-5">

          {/* ═══════════════════ GENERAL ═══════════════════ */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              <h3 className="font-jost text-sm text-[#1a1a2e] mb-4">General Controls</h3>
              {toggleRow('Allow Public Inquiries', 'When off, all public contact forms are hidden', getSite('public_inquiries') === 'true', () => toggleSite('public_inquiries'))}
              {toggleRow('Email Notification on New Inquiry', 'Admin receives email when a new inquiry is submitted', getSite('email_notification') === 'true', () => toggleSite('email_notification'))}
              {toggleRow('Maintenance Mode', 'Show Coming Soon page to public. Admin remains accessible.', getSite('maintenance_mode') === 'true', () => toggleSite('maintenance_mode'))}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('Contact Form Redirect After Submit', textInput(getSite('contact_redirect'), (v) => setSite('contact_redirect', v), '/thank-you'))}
                {field('Landlord Enquiry Redirect After Submit', textInput(getSite('landlord_redirect'), (v) => setSite('landlord_redirect', v), '/landlords'))}
              </div>
            </div>
          )}

          {/* ═══════════════════ SEARCH & FILTERS ═══════════════════ */}
          {activeTab === 'search' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-jost text-sm text-[#1a1a2e]">Search & Filter Fields</h3>
                <p className="text-xs text-gray-400 font-roboto">Drag to reorder, toggle to enable/disable</p>
              </div>
              <div className="space-y-2">
                {searchFilters.map((filter, index) => (
                  <div
                    key={filter.id}
                    draggable
                    onDragStart={() => handleSearchDragStart(index)}
                    onDragOver={(e) => handleSearchDragOver(e, index)}
                    onDragEnd={handleSearchDragEnd}
                    className={`flex items-center gap-3 px-4 py-3 border rounded-md transition-all ${
                      searchDragIndex === index ? 'border-primary ring-1 ring-primary' : 'border-gray-100'
                    }`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-move">
                      <GripVertical size={16} />
                    </div>
                    <span className="text-sm font-roboto text-[#1a1a2e] flex-1">{filter.label}</span>
                    <span className="text-xs text-gray-400 font-roboto">Order: {filter.sort_order}</span>
                    <button
                      onClick={() => moveSearchUp(index)} disabled={index === 0}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => moveSearchDown(index)} disabled={index === searchFilters.length - 1}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => setSearch(filter.key, { enabled: !filter.enabled })}
                      className="cursor-pointer"
                    >
                      {filter.enabled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-roboto">Enabled</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-500 rounded text-xs font-roboto">Disabled</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════ PROPERTY SETTINGS ═══════════════════ */}
          {activeTab === 'properties' && (
            <div className="space-y-5">
              <h3 className="font-jost text-sm text-[#1a1a2e] mb-4">Property Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('Property Title Character Limit', numberInput(getPropSetting('title_char_limit'), (v) => setPropSetting('title_char_limit', v), '80'))}
                {field('Property ID Prefix', textInput(getPropSetting('property_id_prefix'), (v) => setPropSetting('property_id_prefix', v), 'OCE'))}
              </div>
              {field('Property ID Behavior', selectInput(getPropSetting('property_id_behavior'), [
                { value: 'auto', label: 'Auto-generate Sequential' },
                { value: 'manual', label: 'Manual Entry' },
                { value: 'prefix_country', label: 'Prefix by Country/City' },
                { value: 'prefix_type', label: 'Prefix by Property Type' },
              ], (v) => setPropSetting('property_id_behavior', v)))}
              {field('Slug Generation Rule', selectInput(getPropSetting('slug_generation_rule'), [
                { value: 'title_only', label: 'Title Only' },
                { value: 'title_location', label: 'Title + Location' },
                { value: 'id_title', label: 'Property ID + Title' },
                { value: 'purpose_type_location', label: 'Purpose + Type + Location' },
              ], (v) => setPropSetting('slug_generation_rule', v)))}
              {field('Default Listing Status', selectInput(getPropSetting('default_listing_status'), [
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
              ], (v) => setPropSetting('default_listing_status', v)))}
              {field('Minimum Gallery Images Required', numberInput(getPropSetting('min_gallery_images'), (v) => setPropSetting('min_gallery_images', v), '3'))}
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-md">
                <Info size={14} className="text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700 font-roboto">
                  When minimum gallery images is set, publishing will be blocked if the listing has fewer images.
                </p>
              </div>
            </div>
          )}

          {/* ═══════════════════ REQUIRED FIELDS ═══════════════════ */}
          {activeTab === 'required' && (
            <div className="space-y-5">
              <h3 className="font-jost text-sm text-[#1a1a2e] mb-4">Required Fields</h3>
              {['listing', 'inquiry'].map((cat) => (
                <div key={cat} className="space-y-3">
                  <h4 className="text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider">
                    {cat === 'listing' ? 'Listing Form' : 'Public Inquiry Form'}
                  </h4>
                  <div className="space-y-2">
                    {requiredFields
                      .filter((r) => r.category === cat)
                      .map((r) => (
                        <div key={r.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-md">
                          <span className="text-sm font-roboto text-[#1a1a2e]">{r.label}</span>
                          <button
                            onClick={() => setRequired(r.key, !r.required)}
                            className="cursor-pointer"
                          >
                            {r.required ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-roboto">
                                <ListChecks size={10} /> Required
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-500 rounded text-xs font-roboto">
                                <X size={10} /> Optional
                              </span>
                            )}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══════════════════ HERO SECTION ═══════════════════ */}
          {activeTab === 'hero' && (
            <div className="space-y-5">
              <h3 className="font-jost text-sm text-[#1a1a2e] mb-4">Hero Section Controls</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {toggleRow('Show Hero Section', 'Display the hero section on the homepage', getHero('show_hero') === 'true', () => toggleHero('show_hero'))}
                {toggleRow('Show Search Bar', 'Display the search bar within the hero', getHero('show_search_bar') === 'true', () => toggleHero('show_search_bar'))}
                {toggleRow('Show Logo', 'Display logo in the hero area', getHero('show_logo') === 'true', () => toggleHero('show_logo'))}
                {toggleRow('Show Social Icons', 'Display social icons in the hero', getHero('show_social_icons') === 'true', () => toggleHero('show_social_icons'))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('Hero Background Image', (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 border border-gray-200 rounded-md flex items-center justify-center bg-gray-50 overflow-hidden">
                        {getHero('hero_background_image') ? (
                          <img src={getHero('hero_background_image')} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Image size={18} className="text-gray-300" />
                        )}
                      </div>
                      <div>
                        <input type="file" accept="image/*" id="hero-bg-upload" className="hidden" onChange={handleHeroUpload} />
                        <label htmlFor="hero-bg-upload" className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-roboto cursor-pointer transition-colors">
                          {uploadingHero ? <><Loader2 size={12} className="animate-spin" /> Uploading...</> : <><Upload size={12} /> Upload</>}
                        </label>
                        {getHero('hero_background_image') && (
                          <button onClick={() => setHero('hero_background_image', '')} className="inline-flex items-center gap-1 ml-2 text-xs text-red-500 hover:text-red-700 cursor-pointer">
                            <X size={12} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                    <input type="text" value={getHero('hero_background_image')} onChange={(e) => setHero('hero_background_image', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" placeholder="https://..." />
                  </div>
                ))}
                {field('Hero Background Video URL', textInput(getHero('hero_background_video'), (v) => setHero('hero_background_video', v)))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {field('Overlay Opacity (%)', numberInput(getHero('hero_overlay_opacity'), (v) => setHero('hero_overlay_opacity', v), '0-100'))}
                {field('Focal Point X (%)', numberInput(getHero('hero_focal_x'), (v) => setHero('hero_focal_x', v), '0-100'))}
                {field('Focal Point Y (%)', numberInput(getHero('hero_focal_y'), (v) => setHero('hero_focal_y', v), '0-100'))}
              </div>
              {field('Mobile Background Override', textInput(getHero('hero_mobile_background'), (v) => setHero('hero_mobile_background', v), 'https://...'))}
              <h4 className="text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mt-6">Button Controls</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('Button Style', selectInput(getHero('button_style'), [
                  { value: 'solid', label: 'Solid' },
                  { value: 'outline', label: 'Outline' },
                  { value: 'ghost', label: 'Ghost' },
                ], (v) => setHero('button_style', v)))}
                {field('Border Radius (px)', numberInput(getHero('button_border_radius'), (v) => setHero('button_border_radius', v)))}
                {field('Font Family', selectInput(getHero('button_font_family'), [
                  { value: 'Jost', label: 'Jost' },
                  { value: 'Roboto', label: 'Roboto' },
                  { value: 'Prata', label: 'Prata' },
                  { value: 'Inter', label: 'Inter' },
                ], (v) => setHero('button_font_family', v)))}
                {field('Font Weight', selectInput(getHero('button_font_weight'), [
                  { value: '400', label: '400' },
                  { value: '500', label: '500' },
                  { value: '600', label: '600' },
                  { value: '700', label: '700' },
                ], (v) => setHero('button_font_weight', v)))}
                {field('Font Size (px)', numberInput(getHero('button_font_size'), (v) => setHero('button_font_size', v)))}
                {field('Letter Spacing (px)', numberInput(getHero('button_letter_spacing'), (v) => setHero('button_letter_spacing', v)))}
                {field('Text Transform', selectInput(getHero('button_text_transform'), [
                  { value: 'none', label: 'None' },
                  { value: 'uppercase', label: 'Uppercase' },
                  { value: 'capitalize', label: 'Capitalize' },
                  { value: 'lowercase', label: 'Lowercase' },
                ], (v) => setHero('button_text_transform', v)))}
                {colorField('Button Text Color', 'button_text_color', getHero, setHero)}
                {colorField('Button Hover Text Color', 'button_hover_text_color', getHero, setHero)}
              </div>
            </div>
          )}

          {/* ═══════════════════ HOMEPAGE ═══════════════════ */}
          {activeTab === 'homepage' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-jost text-sm text-[#1a1a2e]">Homepage Sections</h3>
                <p className="text-xs text-gray-400 font-roboto">Drag to reorder, toggle visibility</p>
              </div>
              <div className="space-y-2">
                {homeSections.map((section, index) => (
                  <div key={section.id} className="flex items-center gap-3 px-4 py-3 border border-gray-100 rounded-md hover:shadow-sm transition-all">
                    <div className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-move">
                      <GripVertical size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-roboto font-semibold text-[#1a1a2e]">{section.name}</h4>
                      <p className="text-xs text-gray-400 font-roboto truncate">{section.title || section.subtitle || 'No title set'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-roboto font-medium uppercase ${section.visible ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                      {section.visible ? 'Visible' : 'Hidden'}
                    </span>
                    <button onClick={() => moveHomeUp(index)} disabled={index === 0} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 disabled:opacity-30 cursor-pointer">
                      <ArrowUp size={14} />
                    </button>
                    <button onClick={() => moveHomeDown(index)} disabled={index === homeSections.length - 1} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 disabled:opacity-30 cursor-pointer">
                      <ArrowDown size={14} />
                    </button>
                    <button onClick={() => toggleHomeVisible(index)} className="cursor-pointer">
                      {section.visible ? <Eye size={14} className="text-gray-400 hover:text-gray-600" /> : <EyeOff size={14} className="text-gray-300 hover:text-gray-500" />}
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-md">
                <Info size={14} className="text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-700 font-roboto">
                  For full section editing (headings, images, CTA buttons), use the Home Sections page.
                </p>
              </div>
            </div>
          )}

          {/* ═══════════════════ BREADCRUMBS ═══════════════════ */}
          {activeTab === 'breadcrumbs' && (
            <div className="space-y-5">
              <h3 className="font-jost text-sm text-[#1a1a2e] mb-4">Breadcrumb Controls</h3>
              {toggleRow('Enable Breadcrumbs', 'Show breadcrumb navigation on frontend pages', getBread('enable_breadcrumbs') === 'true', () => toggleBread('enable_breadcrumbs'))}
              {toggleRow('Show Home Link', 'Include a home link as the first breadcrumb item', getBread('show_home_link') === 'true', () => toggleBread('show_home_link'))}
              {field('Separator Character', selectInput(getBread('separator_character'), [
                { value: 'chevron', label: 'Chevron (>)' },
                { value: 'slash', label: 'Slash (/)' },
                { value: 'arrow', label: 'Arrow (→)' },
                { value: 'pipe', label: 'Pipe (|)' },
                { value: 'dot', label: 'Dot (•)' },
              ], (v) => setBread('separator_character', v)))}
              <h4 className="text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mt-4">Show on Pages</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {toggleRow('Listing / Property Pages', 'Show breadcrumbs on property detail pages', getBread('show_on_property_pages') === 'true', () => toggleBread('show_on_property_pages'))}
                {toggleRow('Blog / Insight Pages', 'Show breadcrumbs on blog posts', getBread('show_on_blog_pages') === 'true', () => toggleBread('show_on_blog_pages'))}
                {toggleRow('Neighbourhood Pages', 'Show breadcrumbs on neighbourhood pages', getBread('show_on_neighbourhood_pages') === 'true', () => toggleBread('show_on_neighbourhood_pages'))}
                {toggleRow('Listing List Pages', 'Show breadcrumbs on search results', getBread('show_on_listing_pages') === 'true', () => toggleBread('show_on_listing_pages'))}
              </div>
            </div>
          )}

          {/* ═══════════════════ CONTACT & COMPANY ═══════════════════ */}
          {activeTab === 'contact' && (
            <div className="space-y-5">
              <h3 className="font-jost text-sm text-[#1a1a2e] mb-4">Contact & Company Information</h3>
              <div className="p-4 border border-gray-100 rounded-md bg-gray-50/50">
                <h4 className="text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-3">Live Preview</h4>
                <div className="space-y-1 text-sm font-roboto text-[#1a1a2e]">
                  <p className="font-semibold">{getSite('site_name') || 'Oceans Kenya'}</p>
                  <p className="text-gray-500 text-xs">{getSite('address') || 'Riverside Drive, Westlands, Nairobi'}</p>
                  <p className="text-gray-500 text-xs">{getSite('contact_phone') || '+254 703712984'}</p>
                  <p className="text-gray-500 text-xs">{getSite('contact_email') || 'ask@oceanske.com'}</p>
                  <p className="text-gray-500 text-xs">WhatsApp: {getSite('whatsapp_number') || '+254 703712984'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('Contact Page Title', textInput(getSite('contact_title'), (v) => setSite('contact_title', v), 'Contact Us'))}
                {field('Contact Page Subtitle', textInput(getSite('contact_subtitle'), (v) => setSite('contact_subtitle', v), 'Get in touch'))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('Phone Number', textInput(getSite('contact_phone'), (v) => setSite('contact_phone', v)))}
                {field('WhatsApp Number', textInput(getSite('whatsapp_number'), (v) => setSite('whatsapp_number', v)))}
                {field('Email Address', textInput(getSite('contact_email'), (v) => setSite('contact_email', v)))}
                {field('Address', textInput(getSite('address'), (v) => setSite('address', v)))}
              </div>
              {field('Opening Hours', textInput(getSite('opening_hours'), (v) => setSite('opening_hours', v), 'Mon-Fri 9:00 - 18:00'))}
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-md">
                <Info size={14} className="text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-700 font-roboto">
                  These fields update the contact page, footer, property sidebar contact cards, valuation page, and enquiry forms.
                </p>
              </div>
            </div>
          )}

          {/* ═══════════════════ SOCIAL MEDIA ═══════════════════ */}
          {activeTab === 'social' && (
            <div className="space-y-5">
              <h3 className="font-jost text-sm text-[#1a1a2e] mb-4">Social Media</h3>
              <div className="space-y-3">
                {socialLinks.map((social) => (
                  <div key={social.id} className="border border-gray-100 rounded-md p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-md bg-[#0d5959]/8 flex items-center justify-center">
                        <i className={`${socialIcon(social.platform)} text-[#0d5959] text-sm`}></i>
                      </div>
                      <span className="text-sm font-roboto font-medium text-[#1a1a2e] capitalize">{social.platform}</span>
                      {social.url && (
                        <a href={social.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-primary hover:underline font-roboto">
                          <ExternalLink size={12} className="inline mr-1" /> Visit
                        </a>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {field('URL', (
                        <input
                          type="text" value={social.url || ''}
                          onChange={(e) => setSocial(social.platform, { url: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                          placeholder="https://..."
                        />
                      ))}
                      <div className="flex items-end gap-4 pb-1">
                        <label className="flex items-center gap-1.5 text-xs font-roboto text-gray-500 cursor-pointer">
                          <input type="checkbox" checked={social.show_in_header} onChange={(e) => setSocial(social.platform, { show_in_header: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                          Header
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-roboto text-gray-500 cursor-pointer">
                          <input type="checkbox" checked={social.show_in_footer} onChange={(e) => setSocial(social.platform, { show_in_footer: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                          Footer
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-roboto text-gray-500 cursor-pointer">
                          <input type="checkbox" checked={social.show_in_contact} onChange={(e) => setSocial(social.platform, { show_in_contact: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                          Contact
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border border-gray-100 rounded-md bg-gray-50/50">
                <h4 className="text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-3">Icon Preview</h4>
                <div className="flex items-center gap-3">
                  {socialLinks.filter((s) => s.url).map((s) => (
                    <div key={s.platform} className="w-9 h-9 rounded-md bg-[#1a1a2e] flex items-center justify-center" title={s.platform}>
                      <i className={`${socialIcon(s.platform)} text-white text-sm`}></i>
                    </div>
                  ))}
                  {socialLinks.filter((s) => s.url).length === 0 && (
                    <p className="text-xs text-gray-400 font-roboto">No social links configured yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════ MAPS & LOCATION ═══════════════════ */}
          {activeTab === 'maps' && (
            <div className="space-y-5">
              <h3 className="font-jost text-sm text-[#1a1a2e] mb-4">Maps & Location Settings</h3>
              {field('Google Maps API Key', (
                <div className="relative">
                  <input
                    type="password" value={getMap('google_maps_api_key')}
                    onChange={(e) => setMap('google_maps_api_key', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                    placeholder="AIza..."
                  />
                </div>
              ))}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('Default Country', textInput(getMap('default_country'), (v) => setMap('default_country', v), 'Kenya'))}
                {field('Default City', textInput(getMap('default_city'), (v) => setMap('default_city', v), 'Nairobi'))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('Default Map Center (lat,lng)', textInput(getMap('default_map_center'), (v) => setMap('default_map_center', v), '-1.2921,36.8219'))}
                {field('Default Zoom Level', numberInput(getMap('default_zoom'), (v) => setMap('default_zoom', v), '12'))}
              </div>
              {colorField('Property Pin Color', 'property_pin_color', getMap, setMap)}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {toggleRow('Show Map on Property Pages', 'Display map on individual property detail pages', getMap('show_map_on_property_pages') === 'true', () => toggleMap('show_map_on_property_pages'))}
                {toggleRow('Show Neighbourhood Map', 'Display map on neighbourhood pages', getMap('show_neighbourhood_map') === 'true', () => toggleMap('show_neighbourhood_map'))}
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-md">
                <Info size={14} className="text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-700 font-roboto">
                  Google Maps API key is required for embedded maps. The key is stored securely and never exposed to the public.
                </p>
              </div>
            </div>
          )}

          {/* ═══════════════════ DETAILS LAYOUT ═══════════════════ */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-jost text-sm text-[#1a1a2e]">Property Details Layout</h3>
                <p className="text-xs text-gray-400 font-roboto">Drag to reorder, toggle to show/hide</p>
              </div>
              <div className="space-y-2">
                {detailLayout.map((section, index) => (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={() => handleDetailDragStart(index)}
                    onDragOver={(e) => handleDetailDragOver(e, index)}
                    onDragEnd={handleDetailDragEnd}
                    className={`flex items-center gap-3 px-4 py-3 border rounded-md transition-all ${
                      detailDragIndex === index ? 'border-primary ring-1 ring-primary' : 'border-gray-100'
                    }`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-move">
                      <GripVertical size={16} />
                    </div>
                    <span className="text-sm font-roboto text-[#1a1a2e] flex-1">{section.label}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-roboto font-medium uppercase ${section.visible ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                      {section.visible ? 'Visible' : 'Hidden'}
                    </span>
                    <button onClick={() => moveDetailUp(index)} disabled={index === 0} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 disabled:opacity-30 cursor-pointer">
                      <ArrowUp size={14} />
                    </button>
                    <button onClick={() => moveDetailDown(index)} disabled={index === detailLayout.length - 1} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 disabled:opacity-30 cursor-pointer">
                      <ArrowDown size={14} />
                    </button>
                    <button onClick={() => toggleDetailVisible(index)} className="cursor-pointer">
                      {section.visible ? <Eye size={14} className="text-gray-400 hover:text-gray-600" /> : <EyeOff size={14} className="text-gray-300 hover:text-gray-500" />}
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-md">
                <Info size={14} className="text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700 font-roboto">
                  Changes apply to all property detail pages. Save to update the frontend immediately.
                </p>
              </div>
            </div>
          )}

          {/* ═══════════════════ CARDS STYLE ═══════════════════ */}
          {activeTab === 'cards' && (
            <div className="space-y-5">
              <h3 className="font-jost text-sm text-[#1a1a2e] mb-4">Property Cards Style</h3>
              <h4 className="text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider">Badge Colors</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {colorField('For Rent Badge Color', 'rent_badge_color', getCard, setCard)}
                {colorField('For Rent Badge Text Color', 'rent_badge_text_color', getCard, setCard)}
                {colorField('For Sale Badge Color', 'sale_badge_color', getCard, setCard)}
                {colorField('For Sale Badge Text Color', 'sale_badge_text_color', getCard, setCard)}
                {colorField('Featured Badge Color', 'featured_badge_color', getCard, setCard)}
                {colorField('New Development Badge Color', 'new_dev_badge_color', getCard, setCard)}
              </div>
              <h4 className="text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mt-4">Badge Style</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('Badge Border Radius (px)', numberInput(getCard('badge_border_radius'), (v) => setCard('badge_border_radius', v)))}
                {field('Badge Position', selectInput(getCard('badge_position'), [
                  { value: 'top-left', label: 'Top Left' },
                  { value: 'top-right', label: 'Top Right' },
                  { value: 'bottom-left', label: 'Bottom Left' },
                  { value: 'bottom-right', label: 'Bottom Right' },
                ], (v) => setCard('badge_border_radius', v)))}
              </div>
              <h4 className="text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mt-4">Button Style</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {colorField('Button Background Color', 'button_bg_color', getCard, setCard)}
                {colorField('Button Text Color', 'button_text_color', getCard, setCard)}
                {colorField('Button Hover Color', 'button_hover_color', getCard, setCard)}
                {field('Button Border Radius (px)', numberInput(getCard('button_border_radius'), (v) => setCard('button_border_radius', v)))}
              </div>
              {toggleRow('Show Details Button', 'Display a details button on property cards', getCard('show_details_button') === 'true', () => setCard('show_details_button', getCard('show_details_button') === 'true' ? 'false' : 'true'))}
              <h4 className="text-xs font-roboto font-semibold text-gray-500 uppercase tracking-wider mt-4">Card Style</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('Card Shadow', selectInput(getCard('card_shadow'), [
                  { value: 'none', label: 'None' },
                  { value: 'small', label: 'Small' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Large' },
                ], (v) => setCard('card_shadow', v)))}
                {field('Image Height (px)', numberInput(getCard('image_height'), (v) => setCard('image_height', v)))}
                {field('Border Radius (px)', numberInput(getCard('card_border_radius'), (v) => setCard('card_border_radius', v)))}
                {field('Title Size (px)', numberInput(getCard('title_size'), (v) => setCard('title_size', v)))}
                {field('Price Size (px)', numberInput(getCard('price_size'), (v) => setCard('price_size', v)))}
                {field('Icon Style', selectInput(getCard('icon_style'), [
                  { value: 'outline', label: 'Outline' },
                  { value: 'filled', label: 'Filled' },
                ], (v) => setCard('icon_style', v)))}
                {field('Card Spacing (px)', numberInput(getCard('card_spacing'), (v) => setCard('card_spacing', v)))}
                {field('Hover Effect', selectInput(getCard('hover_effect'), [
                  { value: 'none', label: 'None' },
                  { value: 'lift', label: 'Lift Up' },
                  { value: 'scale', label: 'Scale' },
                  { value: 'border', label: 'Border Highlight' },
                ], (v) => setCard('hover_effect', v)))}
                {colorField('Card Background', 'card_background', getCard, setCard)}
              </div>
            </div>
          )}

          {/* ═══════════════════ DETAIL STYLE ═══════════════════ */}
          {activeTab === 'detail-style' && (
            <div className="space-y-5">
              <h3 className="font-jost text-sm text-[#1a1a2e] mb-4">Property Detail Page Style</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('Banner Version', selectInput(getDetailStyle('banner_version'), [
                  { value: 'v1', label: 'Version 1 - Classic' },
                  { value: 'v2', label: 'Version 2 - Modern' },
                  { value: 'v3', label: 'Version 3 - Minimal' },
                ], (v) => setDetailStyleVal('banner_version', v)))}
                {field('Gallery Layout', selectInput(getDetailStyle('gallery_layout'), [
                  { value: 'grid', label: 'Grid' },
                  { value: 'carousel', label: 'Carousel' },
                  { value: 'masonry', label: 'Masonry' },
                  { value: 'full', label: 'Full Width' },
                ], (v) => setDetailStyleVal('gallery_layout', v)))}
                {field('Sidebar Position', selectInput(getDetailStyle('sidebar_position'), [
                  { value: 'right', label: 'Right' },
                  { value: 'left', label: 'Left' },
                  { value: 'none', label: 'No Sidebar' },
                ], (v) => setDetailStyleVal('sidebar_position', v)))}
                {field('Contact Form Style', selectInput(getDetailStyle('contact_form_style'), [
                  { value: 'modern', label: 'Modern' },
                  { value: 'classic', label: 'Classic' },
                  { value: 'minimal', label: 'Minimal' },
                ], (v) => setDetailStyleVal('contact_form_style', v)))}
                {field('Agent Card Style', selectInput(getDetailStyle('agent_card_style'), [
                  { value: 'compact', label: 'Compact' },
                  { value: 'expanded', label: 'Expanded' },
                  { value: 'minimal', label: 'Minimal' },
                ], (v) => setDetailStyleVal('agent_card_style', v)))}
                {field('Mobile Layout', selectInput(getDetailStyle('mobile_layout'), [
                  { value: 'stacked', label: 'Stacked' },
                  { value: 'tabs', label: 'Tabs' },
                  { value: 'accordion', label: 'Accordion' },
                ], (v) => setDetailStyleVal('mobile_layout', v)))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('Image Height (px)', numberInput(getDetailStyle('image_height'), (v) => setDetailStyleVal('image_height', v)))}
                {field('Section Spacing (px)', numberInput(getDetailStyle('section_spacing'), (v) => setDetailStyleVal('section_spacing', v)))}
              </div>
              {colorField('Module Background Color', 'module_bg_color', getDetailStyle, setDetailStyleVal)}
              {colorField('Module Border Color', 'module_border_color', getDetailStyle, setDetailStyleVal)}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {toggleRow('Sticky Sidebar', 'Keep sidebar visible while scrolling', getDetailStyle('sticky_sidebar') === 'true', () => setDetailStyleVal('sticky_sidebar', getDetailStyle('sticky_sidebar') === 'true' ? 'false' : 'true'))}
                {toggleRow('Show Action Buttons', 'Show share, print, save buttons', getDetailStyle('show_action_buttons') === 'true', () => setDetailStyleVal('show_action_buttons', getDetailStyle('show_action_buttons') === 'true' ? 'false' : 'true'))}
                {toggleRow('Show Breadcrumb', 'Display breadcrumb on detail page', getDetailStyle('show_breadcrumb') === 'true', () => setDetailStyleVal('show_breadcrumb', getDetailStyle('show_breadcrumb') === 'true' ? 'false' : 'true'))}
                {toggleRow('Show Share Buttons', 'Display social share buttons', getDetailStyle('show_share_buttons') === 'true', () => setDetailStyleVal('show_share_buttons', getDetailStyle('show_share_buttons') === 'true' ? 'false' : 'true'))}
                {toggleRow('Show Print Button', 'Display print property button', getDetailStyle('show_print_button') === 'true', () => setDetailStyleVal('show_print_button', getDetailStyle('show_print_button') === 'true' ? 'false' : 'true'))}
              </div>
            </div>
          )}

          {/* ═══════════════════ BRANDING (existing) ═══════════════════ */}
          {activeTab === 'branding' && (
            <div className="space-y-5">
              <h3 className="font-jost text-sm text-[#1a1a2e] mb-4">Colour Palette</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { key: 'primary_color', label: 'Primary' },
                  { key: 'secondary_color', label: 'Secondary' },
                  { key: 'accent_color', label: 'Accent' },
                  { key: 'text_color', label: 'Text' },
                  { key: 'golden_color', label: 'Golden Hover' },
                  { key: 'topbar_color', label: 'Topbar' },
                  { key: 'white_color', label: 'White' },
                  { key: 'off_white_color', label: 'Off-White' },
                ].map((c) => (
                  <div key={c.key}>
                    <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">{c.label}</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={getBrand(c.key) || '#000000'} onChange={(e) => setBrand(c.key, e.target.value)} className="w-10 h-10 border border-gray-200 rounded-md cursor-pointer" />
                      <input type="text" value={getBrand(c.key) || ''} onChange={(e) => setBrand(c.key, e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                ))}
              </div>
              <h3 className="font-jost text-sm text-[#1a1a2e] mb-4 mt-6">Logo Uploads</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'main_logo', label: 'Main Logo' },
                  { key: 'light_logo', label: 'Light Logo' },
                  { key: 'dashboard_logo', label: 'Dashboard Logo' },
                  { key: 'favicon', label: 'Favicon' },
                  { key: 'mobile_logo', label: 'Mobile Logo' },
                  { key: 'footer_logo', label: 'Footer Logo' },
                  { key: 'lightbox_logo', label: 'Lightbox Logo' },
                ].map((logo) => (
                  <div key={logo.key} className="border border-gray-100 rounded-md p-4">
                    <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-2">{logo.label}</label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 border border-gray-200 rounded-md flex items-center justify-center bg-gray-50 overflow-hidden">
                        {getBrand(logo.key) ? (
                          <img src={getBrand(logo.key)} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <Image size={20} className="text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input type="file" accept="image/*" id={`logo-${logo.key}`} className="hidden" onChange={(e) => handleLogoUpload(e, logo.key)} />
                        <label htmlFor={`logo-${logo.key}`} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-roboto cursor-pointer transition-colors">
                          {uploadingLogo === logo.key ? <><Loader2 size={12} className="animate-spin" /> Uploading...</> : <><Upload size={12} /> Upload</>}
                        </label>
                        {getBrand(logo.key) && (
                          <button onClick={() => setBrand(logo.key, '')} className="inline-flex items-center gap-1 ml-2 text-xs text-red-500 hover:text-red-700 cursor-pointer">
                            <X size={12} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════ TYPOGRAPHY (existing) ═══════════════════ */}
          {activeTab === 'typography' && (
            <div className="space-y-5">
              <h3 className="font-jost text-sm text-[#1a1a2e] mb-4">Typography Controls</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'heading_font', label: 'Heading Font', type: 'font' },
                  { key: 'body_font', label: 'Body Font', type: 'font' },
                  { key: 'display_font', label: 'Display Font', type: 'font' },
                  { key: 'nav_font_size', label: 'Nav Font Size', type: 'text' },
                  { key: 'nav_font_weight', label: 'Nav Font Weight', type: 'text' },
                  { key: 'nav_letter_spacing', label: 'Nav Letter Spacing', type: 'text' },
                  { key: 'nav_text_transform', label: 'Nav Text Transform', type: 'select' },
                  { key: 'hero_font_size', label: 'Hero Font Size', type: 'text' },
                  { key: 'hero_font_weight', label: 'Hero Font Weight', type: 'text' },
                  { key: 'hero_line_height', label: 'Hero Line Height', type: 'text' },
                  { key: 'hero_letter_spacing', label: 'Hero Letter Spacing', type: 'text' },
                  { key: 'body_font_size', label: 'Body Font Size', type: 'text' },
                  { key: 'body_font_weight', label: 'Body Font Weight', type: 'text' },
                  { key: 'body_line_height', label: 'Body Line Height', type: 'text' },
                  { key: 'button_font_size', label: 'Button Font Size', type: 'text' },
                  { key: 'button_font_weight', label: 'Button Font Weight', type: 'text' },
                  { key: 'button_letter_spacing', label: 'Button Letter Spacing', type: 'text' },
                  { key: 'button_text_transform', label: 'Button Text Transform', type: 'select' },
                  { key: 'footer_font_size', label: 'Footer Font Size', type: 'text' },
                  { key: 'breadcrumb_font_size', label: 'Breadcrumb Font Size', type: 'text' },
                ].map((typo) => (
                  <div key={typo.key}>
                    <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">{typo.label}</label>
                    {typo.type === 'font' ? (
                      <select value={getTypo(typo.key) || 'Roboto'} onChange={(e) => setTypo(typo.key, e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary bg-white">
                        <option value="Jost">Jost</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Prata">Prata</option>
                        <option value="Inter">Inter</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Lato">Lato</option>
                        <option value="Playfair Display">Playfair Display</option>
                      </select>
                    ) : typo.type === 'select' ? (
                      <select value={getTypo(typo.key) || 'none'} onChange={(e) => setTypo(typo.key, e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary bg-white">
                        <option value="none">None</option>
                        <option value="uppercase">Uppercase</option>
                        <option value="capitalize">Capitalize</option>
                        <option value="lowercase">Lowercase</option>
                      </select>
                    ) : (
                      <input type="text" value={getTypo(typo.key) || ''} onChange={(e) => setTypo(typo.key, e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════ PROPERTIES (existing CTA + hero) ═══════════════════ */}
          {activeTab === 'properties' && (
            <div className="space-y-5">
              <h3 className="font-jost text-sm text-[#1a1a2e] mb-4">CTA Banner Controls</h3>
              {toggleRow('Show CTA Banner', 'Display the call-to-action banner on property pages', getProp('show_cta_banner') === 'true', () => setProp('show_cta_banner', getProp('show_cta_banner') === 'true' ? 'false' : 'true'))}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('CTA Eyebrow', textInput(getProp('cta_eyebrow'), (v) => setProp('cta_eyebrow', v)))}
                {field('CTA Title', textInput(getProp('cta_title'), (v) => setProp('cta_title', v)))}
                {field('CTA Subtitle', textInput(getProp('cta_subtitle'), (v) => setProp('cta_subtitle', v)))}
                {field('CTA Button Text', textInput(getProp('cta_button_text'), (v) => setProp('cta_button_text', v)))}
                {field('CTA Button Link', textInput(getProp('cta_button_link'), (v) => setProp('cta_button_link', v)))}
                {field('CTA Layout', selectInput(getProp('cta_layout'), [
                  { value: 'centered', label: 'Centered' },
                  { value: 'left', label: 'Left Aligned' },
                  { value: 'right', label: 'Right Aligned' },
                  { value: 'split', label: 'Split' },
                  { value: 'full', label: 'Full Width' },
                ], (v) => setProp('cta_layout', v)))}
                {field('CTA Background Image', textInput(getProp('cta_image'), (v) => setProp('cta_image', v), 'https://...'))}
              </div>
              <h3 className="font-jost text-sm text-[#1a1a2e] mb-4 mt-6">Hero Section Controls</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('Buy Hero Title', textInput(getProp('buy_hero_title'), (v) => setProp('buy_hero_title', v)))}
                {field('Buy Hero Subtitle', textInput(getProp('buy_hero_subtitle'), (v) => setProp('buy_hero_subtitle', v)))}
                {field('Buy Hero Background', textInput(getProp('buy_hero_bg'), (v) => setProp('buy_hero_bg', v), 'https://...'))}
                {field('Rent Hero Title', textInput(getProp('rent_hero_title'), (v) => setProp('rent_hero_title', v)))}
                {field('Rent Hero Subtitle', textInput(getProp('rent_hero_subtitle'), (v) => setProp('rent_hero_subtitle', v)))}
                {field('Rent Hero Background', textInput(getProp('rent_hero_bg'), (v) => setProp('rent_hero_bg', v), 'https://...'))}
                {field('New Dev Hero Title', textInput(getProp('new_dev_hero_title'), (v) => setProp('new_dev_hero_title', v)))}
                {field('New Dev Hero Subtitle', textInput(getProp('new_dev_hero_subtitle'), (v) => setProp('new_dev_hero_subtitle', v)))}
                {field('New Dev Hero Background', textInput(getProp('new_dev_hero_bg'), (v) => setProp('new_dev_hero_bg', v), 'https://...'))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}