import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface SiteSettingsMap {
  site_name: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  address: string;
  default_meta_title: string;
  default_meta_description: string;
  default_og_image: string;
  ga_id: string;
  currency_default: string;
  currency_symbol: string;
  exchange_rate: string;
  public_inquiries: string;
  email_notification: string;
  maintenance_mode: string;
  contact_redirect: string;
  landlord_redirect: string;
  [key: string]: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string | null;
  show_in_header: boolean;
  show_in_footer: boolean;
  show_in_contact: boolean;
}

export interface BrandSetting {
  id: string;
  key: string;
  value: string | null;
}

export interface SearchFilter {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
  sort_order: number;
}

export interface PropertySetting {
  id: string;
  key: string;
  value: string | null;
}

export interface RequiredField {
  id: string;
  key: string;
  label: string;
  category: string;
  required: boolean;
}

export interface HeroSetting {
  id: string;
  key: string;
  value: string | null;
}

export interface BreadcrumbSetting {
  id: string;
  key: string;
  value: string | null;
}

export interface MapSetting {
  id: string;
  key: string;
  value: string | null;
}

export interface DetailLayoutSection {
  id: string;
  key: string;
  label: string;
  visible: boolean;
  sort_order: number;
}

export interface CardStyle {
  id: string;
  key: string;
  value: string | null;
}

export interface DetailStyle {
  id: string;
  key: string;
  value: string | null;
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

export interface AllSettings {
  site: SiteSettingsMap;
  social: SocialLink[];
  brand: BrandSetting[];
  searchFilters: SearchFilter[];
  propertySettings: PropertySetting[];
  requiredFields: RequiredField[];
  heroSettings: HeroSetting[];
  breadcrumbSettings: BreadcrumbSetting[];
  mapSettings: MapSetting[];
  detailLayout: DetailLayoutSection[];
  cardStyle: CardStyle[];
  detailStyle: DetailStyle[];
  homeSections: HomeSection[];
  loading: boolean;
  error: string | null;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<AllSettings>({
    site: {} as SiteSettingsMap,
    social: [],
    brand: [],
    searchFilters: [],
    propertySettings: [],
    requiredFields: [],
    heroSettings: [],
    breadcrumbSettings: [],
    mapSettings: [],
    detailLayout: [],
    cardStyle: [],
    detailStyle: [],
    homeSections: [],
    loading: true,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    const [
      siteRes,
      socialRes,
      brandRes,
      searchRes,
      propRes,
      reqRes,
      heroRes,
      breadRes,
      mapRes,
      layoutRes,
      cardRes,
      detailRes,
      homeRes,
    ] = await Promise.all([
      supabase.from('site_settings').select('*'),
      supabase.from('social_links').select('*').order('sort_order', { ascending: true }),
      supabase.from('brand_settings').select('*'),
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

    const siteMap: Record<string, string> = {};
    if (siteRes.data) {
      siteRes.data.forEach((s: any) => {
        siteMap[s.key] = s.value || '';
      });
    }

    setSettings({
      site: siteMap as SiteSettingsMap,
      social: socialRes.data || [],
      brand: brandRes.data || [],
      searchFilters: searchRes.data || [],
      propertySettings: propRes.data || [],
      requiredFields: reqRes.data || [],
      heroSettings: heroRes.data || [],
      breadcrumbSettings: breadRes.data || [],
      mapSettings: mapRes.data || [],
      detailLayout: layoutRes.data || [],
      cardStyle: cardRes.data || [],
      detailStyle: detailRes.data || [],
      homeSections: homeRes.data || [],
      loading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getSite = (key: string) => settings.site[key] || '';
  const getBrand = (key: string) => settings.brand.find((b) => b.key === key)?.value || '';
  const getSearch = (key: string) => settings.searchFilters.find((s) => s.key === key);
  const getPropSetting = (key: string) => settings.propertySettings.find((p) => p.key === key)?.value || '';
  const getRequired = (key: string) => settings.requiredFields.find((r) => r.key === key)?.required || false;
  const getHero = (key: string) => settings.heroSettings.find((h) => h.key === key)?.value || '';
  const getBreadcrumb = (key: string) => settings.breadcrumbSettings.find((b) => b.key === key)?.value || '';
  const getMap = (key: string) => settings.mapSettings.find((m) => m.key === key)?.value || '';
  const getCardStyle = (key: string) => settings.cardStyle.find((c) => c.key === key)?.value || '';
  const getDetailStyle = (key: string) => settings.detailStyle.find((d) => d.key === key)?.value || '';
  const getSocial = (platform: string) => settings.social.find((s) => s.platform === platform);
  const getSocialUrl = (platform: string) => getSocial(platform)?.url || '';
  const getSocialVisible = (platform: string, location: 'header' | 'footer' | 'contact') => {
    const s = getSocial(platform);
    if (!s) return false;
    if (location === 'header') return s.show_in_header;
    if (location === 'footer') return s.show_in_footer;
    return s.show_in_contact;
  };

  const isMaintenanceMode = () => getSite('maintenance_mode') === 'true';
  const allowInquiries = () => getSite('public_inquiries') !== 'false';
  const enableBreadcrumbs = () => getBreadcrumb('enable_breadcrumbs') === 'true';

  return {
    ...settings,
    refresh: fetchAll,
    getSite,
    getBrand,
    getSearch,
    getPropSetting,
    getRequired,
    getHero,
    getBreadcrumb,
    getMap,
    getCardStyle,
    getDetailStyle,
    getSocial,
    getSocialUrl,
    getSocialVisible,
    isMaintenanceMode,
    allowInquiries,
    enableBreadcrumbs,
  };
}