import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast as showToast } from '@/pages/crm/components/CRMToast';
import { useAuth } from '@/hooks/useAuth';
import { broadcastSync } from '@/lib/syncEngine';
import ImageUploadField from '@/pages/crm/components/ImageUploadField';
import CurrencyManager from '@/pages/crm/components/CurrencyManager';
import FooterSettingsTab from '@/pages/crm/components/FooterSettingsTab';
import {
  Save,
  RefreshCw,
  Loader2,
  Globe,
  Share2,
  Search,
  DollarSign,
  Settings,
  Columns,
  AlignLeft,
} from 'lucide-react';

interface SiteSetting {
  id: string;
  key: string;
  value: string | null;
  category: string;
}

interface SocialLink {
  id: string;
  platform: string;
  url: string | null;
  show_in_header: boolean;
  show_in_footer: boolean;
  show_in_contact: boolean;
}

const CATEGORIES = ['general', 'social', 'seo', 'currency', 'footer'] as const;

export default function SiteSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('general');

  const fetchData = async () => {
    setLoading(true);
    const [settingsRes, socialRes] = await Promise.all([
      supabase.from('site_settings').select('*'),
      supabase.from('social_links').select('*').order('sort_order', { ascending: true }),
    ]);
    if (settingsRes.error) {
      showToast('Failed to load settings', 'error');
    } else {
      setSettings(settingsRes.data || []);
    }
    if (socialRes.error) {
      showToast('Failed to load social links', 'error');
    } else {
      setSocialLinks(socialRes.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getSetting = (key: string) => settings.find((s) => s.key === key)?.value || '';
  const setSetting = (key: string, value: string) => {
    setSettings((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (existing) {
        return prev.map((s) => (s.key === key ? { ...s, value } : s));
      }
      return [...prev, { id: '', key, value, category: activeTab }];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    // Save settings
    const settingUpdates = settings.map((s) =>
      supabase.from('site_settings').upsert({ key: s.key, value: s.value, category: s.category }, { onConflict: 'key' })
    );
    // Save social links
    const socialUpdates = socialLinks.map((s) =>
      supabase.from('social_links').update({
        url: s.url,
        show_in_header: s.show_in_header,
        show_in_footer: s.show_in_footer,
        show_in_contact: s.show_in_contact,
      }).eq('id', s.id)
    );

    const results = await Promise.all([...settingUpdates, ...socialUpdates]);
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      showToast('Some settings failed to save', 'error');
    } else {
      showToast('Settings saved successfully', 'success');
      broadcastSync();
    }
    setSaving(false);
    fetchData();
  };

  const getSocial = (platform: string) => socialLinks.find((s) => s.platform === platform);
  const setSocial = (platform: string, updates: Partial<SocialLink>) => {
    setSocialLinks((prev) =>
      prev.map((s) => (s.platform === platform ? { ...s, ...updates } : s))
    );
  };

  const tabIcon = (tab: string) => {
    switch (tab) {
      case 'general': return <Settings size={14} />;
      case 'social': return <Share2 size={14} />;
      case 'seo': return <Search size={14} />;
      case 'currency': return <DollarSign size={14} />;
      case 'footer': return <AlignLeft size={14} />;
      default: return <Globe size={14} />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-jost text-lg text-white">Site Settings</h2>
          <p className="text-[15px] text-white/70 font-roboto mt-0.5">Configure global site settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-md text-[15px] font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save All
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md p-1 w-fit">
        {CATEGORIES.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-[15px] font-roboto capitalize transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {tabIcon(tab)}
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[15px] text-white/70 font-roboto">Loading settings...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              <h3 className="font-jost text-[15px] text-[#1a1a2e] mb-4">General Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={getSetting('site_name')}
                    onChange={(e) => setSetting('site_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto focus:outline-none focus:border-primary"
                    placeholder="Oceans Kenya"
                  />
                </div>
                <div>
                  <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={getSetting('contact_email')}
                    onChange={(e) => setSetting('contact_email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto focus:outline-none focus:border-primary"
                    placeholder="ask@oceanske.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={getSetting('contact_phone')}
                    onChange={(e) => setSetting('contact_phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto focus:outline-none focus:border-primary"
                    placeholder="+254 712 345 678"
                  />
                </div>
                <div>
                  <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={getSetting('whatsapp_number')}
                    onChange={(e) => setSetting('whatsapp_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto focus:outline-none focus:border-primary"
                    placeholder="+254 712 345 678"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  value={getSetting('address')}
                  onChange={(e) => setSetting('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto focus:outline-none focus:border-primary"
                  placeholder="Riverside Drive, Westlands, Nairobi"
                />
              </div>

              <div>
                <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Site Logo
                </label>
                <ImageUploadField
                  label="Main site logo (used in the header)"
                  value={getSetting('logo_url')}
                  onChange={(url) => setSetting('logo_url', url)}
                  pageKey="site-settings"
                  fieldKey="logo_url"
                  previewWidth="w-24"
                  previewHeight="h-16"
                />
                <p className="text-[15px] text-gray-500 font-roboto mt-2">
                  Leave empty to fall back to the logo uploaded in Brand settings.
                </p>
              </div>

              <div>
                <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Chat Image
                </label>
                <ImageUploadField
                  label="Shown beside OCEANS CHAT in the messenger top bar"
                  value={getSetting('chat_logo_url')}
                  onChange={(url) => setSetting('chat_logo_url', url)}
                  pageKey="site-settings"
                  fieldKey="chat_logo_url"
                  previewWidth="w-16"
                  previewHeight="h-16"
                />
                <p className="text-[15px] text-gray-500 font-roboto mt-2">
                  Leave empty to use the default chat mark.
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <h4 className="font-jost text-[15px] text-[#1a1a2e] mb-3 mt-1">Department Emails</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      General Inquiries
                    </label>
                    <input
                      type="email"
                      value={getSetting('email_general')}
                      onChange={(e) => setSetting('email_general', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto focus:outline-none focus:border-primary"
                      placeholder="ask@oceanske.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Sales
                    </label>
                    <input
                      type="email"
                      value={getSetting('email_sales')}
                      onChange={(e) => setSetting('email_sales', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto focus:outline-none focus:border-primary"
                      placeholder="sales@oceanske.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Rentals
                    </label>
                    <input
                      type="email"
                      value={getSetting('email_rentals')}
                      onChange={(e) => setSetting('email_rentals', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto focus:outline-none focus:border-primary"
                      placeholder="rent@oceanske.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Ventures
                    </label>
                    <input
                      type="email"
                      value={getSetting('email_ventures')}
                      onChange={(e) => setSetting('email_ventures', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto focus:outline-none focus:border-primary"
                      placeholder="ventures@oceanske.com"
                    />
                  </div>
                </div>
                <p className="text-[15px] text-gray-500 font-roboto mt-2">
                  These power the department email list shown on the Contact page and in the footer.
                </p>
              </div>
            </div>
          )}

          {/* Social Tab */}
          {activeTab === 'social' && (
            <div className="space-y-5">
              <h3 className="font-jost text-[15px] text-[#1a1a2e] mb-4">Social Media Links</h3>
              <div className="space-y-3">
                {socialLinks.map((social) => (
                  <div key={social.platform} className="border border-gray-100 rounded-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[15px] font-roboto font-medium text-[#1a1a2e] capitalize">{social.platform}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">URL</label>
                        <input
                          type="text"
                          value={social.url || ''}
                          onChange={(e) => setSocial(social.platform, { url: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto focus:outline-none focus:border-primary"
                          placeholder="https://..."
                        />
                      </div>
                      <div className="flex items-center gap-4 pt-6">
                        <label className="flex items-center gap-1.5 text-[15px] font-roboto text-gray-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={social.show_in_header}
                            onChange={(e) => setSocial(social.platform, { show_in_header: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          Header
                        </label>
                        <label className="flex items-center gap-1.5 text-[15px] font-roboto text-gray-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={social.show_in_footer}
                            onChange={(e) => setSocial(social.platform, { show_in_footer: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          Footer
                        </label>
                        <label className="flex items-center gap-1.5 text-[15px] font-roboto text-gray-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={social.show_in_contact}
                            onChange={(e) => setSocial(social.platform, { show_in_contact: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          Contact
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div className="space-y-5">
              <h3 className="font-jost text-[15px] text-[#1a1a2e] mb-4">SEO & Meta</h3>
              <div>
                <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Default Meta Title
                </label>
                <input
                  type="text"
                  value={getSetting('default_meta_title')}
                  onChange={(e) => setSetting('default_meta_title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto focus:outline-none focus:border-primary"
                  placeholder="Oceans Kenya - Estate & Letting Agents"
                />
              </div>
              <div>
                <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Default Meta Description
                </label>
                <textarea
                  value={getSetting('default_meta_description')}
                  onChange={(e) => setSetting('default_meta_description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto focus:outline-none focus:border-primary resize-none"
                  maxLength={500}
                  placeholder="Nairobi's leading estate and letting agents..."
                />
              </div>
              <div>
                <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Default OG Image
                </label>
                <ImageUploadField
                  label="Default Open Graph image"
                  value={getSetting('default_og_image')}
                  onChange={(url) => setSetting('default_og_image', url)}
                  pageKey="site-settings"
                  fieldKey="default_og_image"
                  previewWidth="w-24"
                  previewHeight="h-16"
                />
              </div>
              <div>
                <label className="block text-[15px] font-roboto font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Google Analytics ID
                </label>
                <input
                  type="text"
                  value={getSetting('ga_id')}
                  onChange={(e) => setSetting('ga_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-[15px] font-roboto focus:outline-none focus:border-primary"
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
            </div>
          )}

          {/* Currency Tab */}
          {activeTab === 'currency' && (
            <div className="space-y-5">
              <h3 className="font-jost text-[15px] text-[#1a1a2e] mb-1">Currency Settings</h3>
              <p className="text-[15px] text-gray-500 font-roboto">
                Manage every currency shown across the site. KES is always the base - set each currency as 1 unit = X KES, toggle which ones appear in the frontend switcher, and add more whenever you need them.
              </p>
              <CurrencyManager />
            </div>
          )}

          {/* Footer Tab */}
          {activeTab === 'footer' && (
            <div className="space-y-5">
              <h3 className="font-jost text-[15px] text-[#1a1a2e] mb-4">Footer Settings</h3>
              <p className="text-[15px] text-gray-500 font-roboto">
                These settings control the footer content. Changes save globally and appear on all pages immediately.
              </p>
              <FooterSettingsTab />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

