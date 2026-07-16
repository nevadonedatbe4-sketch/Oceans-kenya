import { useState, useEffect, useCallback } from 'react';
import { supabase, uploadImageViaEdgeFunction } from '@/lib/supabase';
import { broadcastSync } from '@/lib/syncEngine';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';

export interface SettingRecord {
  id: string;
  key: string;
  value: string | null;
  category?: string;
  page?: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string | null;
  show_in_header: boolean;
  show_in_footer: boolean;
  show_in_contact: boolean;
  sort_order: number;
}

export interface SearchFilter {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
  sort_order: number;
}

export interface RequiredField {
  id: string;
  key: string;
  label: string;
  category: string;
  required: boolean;
}

export interface DetailLayout {
  id: string;
  key: string;
  label: string;
  visible: boolean;
  sort_order: number;
}

export interface HomeSection {
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

export interface ManagementData {
  loading: boolean;
  saving: boolean;
  uploadingLogo: string | null;
  uploadingHero: boolean;
  uploadingPropBg: boolean;
  siteSettings: Record<string, string>;
  brandSettings: SettingRecord[];
  typoSettings: SettingRecord[];
  propPageSettings: SettingRecord[];
  socialLinks: SocialLink[];
  searchFilters: SearchFilter[];
  propertySettings: SettingRecord[];
  requiredFields: RequiredField[];
  heroSettings: SettingRecord[];
  breadcrumbSettings: SettingRecord[];
  mapSettings: SettingRecord[];
  detailLayout: DetailLayout[];
  cardStyle: SettingRecord[];
  detailStyle: SettingRecord[];
  homeSections: HomeSection[];
  getSite: (key: string) => string;
  setSite: (key: string, value: string) => void;
  getBrand: (key: string) => string;
  setBrand: (key: string, value: string) => void;
  getTypo: (key: string) => string;
  setTypo: (key: string, value: string) => void;
  getProp: (key: string) => string;
  setProp: (key: string, value: string) => void;
  getSocial: (platform: string) => SocialLink | undefined;
  setSocial: (platform: string, updates: Partial<SocialLink>) => void;
  getSearch: (key: string) => SearchFilter | undefined;
  setSearch: (key: string, updates: Partial<SearchFilter>) => void;
  getPropSetting: (key: string) => string;
  setPropSetting: (key: string, value: string) => void;
  getRequired: (key: string) => RequiredField | undefined;
  setRequired: (key: string, required: boolean) => void;
  getHero: (key: string) => string;
  setHero: (key: string, value: string) => void;
  getBread: (key: string) => string;
  setBread: (key: string, value: string) => void;
  getMap: (key: string) => string;
  setMap: (key: string, value: string) => void;
  getCard: (key: string) => string;
  setCard: (key: string, value: string) => void;
  getDetailStyle: (key: string) => string;
  setDetailStyleVal: (key: string, value: string) => void;
  toggleSite: (key: string) => void;
  toggleHero: (key: string) => void;
  toggleBread: (key: string) => void;
  toggleMap: (key: string) => void;
  handleSave: () => Promise<void>;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>, key: string) => Promise<void>;
  handleHeroUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handlePropBgUpload: (e: React.ChangeEvent<HTMLInputElement>, pageKey: string) => Promise<void>;
  fetchData: () => Promise<void>;
  moveSearchUp: (index: number) => void;
  moveSearchDown: (index: number) => void;
  moveDetailUp: (index: number) => void;
  moveDetailDown: (index: number) => void;
  moveHomeUp: (index: number) => void;
  moveHomeDown: (index: number) => void;
  toggleHomeVisible: (index: number) => void;
  toggleDetailVisible: (index: number) => void;
}

export function useManagementData(): ManagementData {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingPropBg, setUploadingPropBg] = useState(false);

  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
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

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const handleSave = useCallback(async () => {
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
    const errors = results.filter((r: any) => r.error);
    if (errors.length > 0) {
      showToast('Some settings failed to save', 'error');
    } else {
      showToast('All settings saved successfully', 'success');
      broadcastSync();
    }
    setSaving(false);
    fetchData();
  }, [siteSettings, brandSettings, typoSettings, propPageSettings, socialLinks, searchFilters, propertySettings, requiredFields, heroSettings, breadcrumbSettings, mapSettings, detailLayout, cardStyle, detailStyle, homeSections, fetchData]);

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

  const handlePropBgUpload = async (e: React.ChangeEvent<HTMLInputElement>, pageKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPropBg(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `listing-hero-${pageKey}-${Date.now()}.${fileExt}`;
      const filePath = `listing-heroes/${fileName}`;
      const { url } = await uploadImageViaEdgeFunction(file, filePath);
      setProp(`${pageKey}_hero_bg`, url);
      showToast('Hero background uploaded', 'success');
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    }
    setUploadingPropBg(false);
    if (e.target) e.target.value = '';
  };

  const moveSearchUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...searchFilters];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    const updated = newItems.map((item, i) => ({ ...item, sort_order: i + 1 }));
    setSearchFilters(updated);
  };
  const moveSearchDown = (index: number) => {
    if (index === searchFilters.length - 1) return;
    const newItems = [...searchFilters];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    const updated = newItems.map((item, i) => ({ ...item, sort_order: i + 1 }));
    setSearchFilters(updated);
  };
  const moveDetailUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...detailLayout];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    const updated = newItems.map((item, i) => ({ ...item, sort_order: i + 1 }));
    setDetailLayout(updated);
  };
  const moveDetailDown = (index: number) => {
    if (index === detailLayout.length - 1) return;
    const newItems = [...detailLayout];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    const updated = newItems.map((item, i) => ({ ...item, sort_order: i + 1 }));
    setDetailLayout(updated);
  };
  const moveHomeUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...homeSections];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    const updated = newItems.map((item, i) => ({ ...item, sort_order: i + 1 }));
    setHomeSections(updated);
  };
  const moveHomeDown = (index: number) => {
    if (index === homeSections.length - 1) return;
    const newItems = [...homeSections];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    const updated = newItems.map((item, i) => ({ ...item, sort_order: i + 1 }));
    setHomeSections(updated);
  };
  const toggleHomeVisible = (index: number) => {
    setHomeSections((prev) => prev.map((h, i) => i === index ? { ...h, visible: !h.visible } : h));
  };
  const toggleDetailVisible = (index: number) => {
    setDetailLayout((prev) => prev.map((d, i) => i === index ? { ...d, visible: !d.visible } : d));
  };

  return {
    loading, saving, uploadingLogo, uploadingHero, uploadingPropBg,
    siteSettings, brandSettings, typoSettings, propPageSettings,
    socialLinks, searchFilters, propertySettings, requiredFields,
    heroSettings, breadcrumbSettings, mapSettings, detailLayout,
    cardStyle, detailStyle, homeSections,
    getSite, setSite, getBrand, setBrand, getTypo, setTypo,
    getProp, setProp, getSocial, setSocial, getSearch, setSearch,
    getPropSetting, setPropSetting, getRequired, setRequired,
    getHero, setHero, getBread, setBread, getMap, setMap,
    getCard, setCard, getDetailStyle, setDetailStyleVal,
    toggleSite, toggleHero, toggleBread, toggleMap,
    handleSave, handleLogoUpload, handleHeroUpload, handlePropBgUpload, fetchData,
    moveSearchUp, moveSearchDown, moveDetailUp, moveDetailDown,
    moveHomeUp, moveHomeDown, toggleHomeVisible, toggleDetailVisible,
  };
}