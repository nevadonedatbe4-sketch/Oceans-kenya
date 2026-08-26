import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ManagementData } from '@/hooks/useManagementData';
import CurrencyManager from '@/pages/crm/components/CurrencyManager';
import {
  Save, Loader2, Settings, Palette, Type, Layout, Image, Search,
  Upload, X, ArrowUp, ArrowDown, GripVertical,
  Globe, Share2, DollarSign, MapPin, Phone, Mail, Home, Eye, EyeOff,
  Grid3X3, CreditCard, FileText, ChevronRight, ExternalLink, RefreshCw,
  Info, Building2, Bell,
} from 'lucide-react';

interface Props {
  activeTab: string;
  data: ManagementData;
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-[11px] font-roboto text-stone-400 uppercase tracking-[0.12em]">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder = '' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text" value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary bg-white"
      placeholder={placeholder}
    />
  );
}

function NumberInput({ value, onChange, placeholder = '' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="number" value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary bg-white"
      placeholder={placeholder}
    />
  );
}

function SelectInput({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary bg-white"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function ToggleRow({ label, desc, value, onToggle }: { label: string; desc: string; value: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 border border-stone-200/70 rounded-lg bg-stone-50/50 hover:bg-stone-50 transition-colors group">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-roboto font-medium text-stone-800 tracking-tight">{label}</p>
        {desc && <p className="text-[13px] text-stone-400 font-roboto mt-0.5 leading-relaxed">{desc}</p>}
      </div>
      <button
        onClick={onToggle}
        className={`relative flex-shrink-0 ml-5 w-11 h-6 rounded-full transition-all duration-300 ease-out cursor-pointer ${
          value ? 'bg-[#1B4332] shadow-[0_0_0_1px_rgba(27,67,50,0.2)]' : 'bg-stone-300'
        }`}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all duration-300 ease-out shadow-sm ${
            value ? 'left-[calc(100%-21px)] shadow-[0_1px_3px_rgba(27,67,50,0.3)]' : 'left-[3px]'
          }`}
        />
      </button>
    </div>
  );
}

function ColorField({ label, keyName, value, onChange }: { label: string; keyName: string; value: string; onChange: (k: string, v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color" value={value || '#000000'}
          onChange={(e) => onChange(keyName, e.target.value)}
          className="w-10 h-10 border border-gray-200 rounded-md cursor-pointer flex-shrink-0"
        />
        <input
          type="text" value={value || ''}
          onChange={(e) => onChange(keyName, e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary bg-white"
        />
      </div>
    </div>
  );
}

function SectionCard({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-stone-200/70 p-5 ${className}`}>
      {title && (
        <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-stone-100">
          <div className="w-8 h-8 rounded-lg bg-[#1B4332]/8 flex items-center justify-center flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1B4332]"></div>
          </div>
          <h3 className="font-jost text-[13px] font-semibold text-stone-800 uppercase tracking-[0.12em]">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function ManagementTabContent({ activeTab, data }: Props) {
  const searchDragIndex: number | null = null;
  const detailDragIndex: number | null = null;

  const {
    loading, saving, uploadingLogo, uploadingHero, uploadingPropBg,
    getSite, setSite, getBrand, setBrand, getTypo, setTypo,
    getProp, setProp, getSocial, setSocial, getSearch, setSearch,
    getPropSetting, setPropSetting, getRequired, setRequired,
    getHero, setHero, getBread, setBread, getMap, setMap,
    getCard, setCard, getDetailStyle, setDetailStyleVal,
    toggleSite, toggleHero, toggleBread, toggleMap,
    handleSave, handleLogoUpload, handleHeroUpload, handlePropBgUpload, fetchData,
    moveSearchUp, moveSearchDown, moveDetailUp, moveDetailDown,
    moveHomeUp, moveHomeDown, toggleHomeVisible, toggleDetailVisible,
    socialLinks, searchFilters, requiredFields, detailLayout,
    homeSections, cardStyle, detailStyle, heroSettings,
    siteSettings, brandSettings,
  } = data;

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

  // Drag reorder uses up/down buttons instead of drag events for simplicity

  // Property Settings sub-tab
  const [propSubtab, setPropSubtab] = useState<'general' | 'required' | 'card'>('general');

  // Search & Filters sub-tab
  const [searchSubtab, setSearchSubtab] = useState<'appearance' | 'fields' | 'layout' | 'visibility'>('appearance');

  // Listings Pages sub-tab
  const [listingsSubtab, setListingsSubtab] = useState<'buy' | 'rent' | 'search' | 'layout'>('buy');

  // Listings hero page key helper
  const listingsPageKey = listingsSubtab === 'search' ? 'search' : listingsSubtab;
  const listingsHeroLabel = listingsSubtab === 'buy' ? 'Buy Page' : listingsSubtab === 'rent' ? 'Rent Page' : listingsSubtab === 'search' ? 'Search Page' : 'Layout & Defaults';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      {/* Save Bar */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <button
          onClick={fetchData}
          className="flex items-center gap-2 bg-white border border-stone-200/70 hover:bg-stone-50 text-stone-600 px-3 py-2 rounded-lg text-[13px] font-roboto transition-all cursor-pointer whitespace-nowrap"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#15382A] text-white px-4 py-2 rounded-lg text-[13px] font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>

      {/* ═══════ GENERAL ═══════ */}
      {activeTab === 'general' && (
        <SectionCard>
          <div className="space-y-4">
            <ToggleRow label="Allow Public Inquiries" desc="When off, all public contact forms are hidden" value={getSite('public_inquiries') === 'true'} onToggle={() => toggleSite('public_inquiries')} />
            <ToggleRow label="Email Notification on New Inquiry" desc="Admin receives email when a new inquiry is submitted" value={getSite('email_notification') === 'true'} onToggle={() => toggleSite('email_notification')} />
            <ToggleRow label="Maintenance Mode" desc="Show Coming Soon page to public. Admin remains accessible." value={getSite('maintenance_mode') === 'true'} onToggle={() => toggleSite('maintenance_mode')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Field label="Contact Form Redirect After Submit">
                <TextInput value={getSite('contact_redirect')} onChange={(v) => setSite('contact_redirect', v)} placeholder="/thank-you" />
              </Field>
              <Field label="Landlord Enquiry Redirect After Submit">
                <TextInput value={getSite('landlord_redirect')} onChange={(v) => setSite('landlord_redirect', v)} placeholder="/landlords" />
              </Field>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ═══════ SEARCH & FILTERS ═══════ */}
      {activeTab === 'search' && (
        <>
          {/* Sub-tab Switcher */}
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-5">
            {(['appearance', 'fields', 'layout', 'visibility'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSearchSubtab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  searchSubtab === tab ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <i className={`${
                  tab === 'appearance' ? 'ri-palette-line' : tab === 'fields' ? 'ri-list-settings-line' : tab === 'layout' ? 'ri-layout-4-line' : 'ri-eye-line'
                } text-sm`}></i>
                {tab === 'appearance' ? 'Appearance' : tab === 'fields' ? 'Fields & Order' : tab === 'layout' ? 'Layout & View' : 'Page Visibility'}
              </button>
            ))}
          </div>

          {/* ─────── APPEARANCE ─────── */}
          {searchSubtab === 'appearance' && (
            <div className="space-y-5">
              {/* Background Colors */}
              <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-4">
                <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em]">Background Colors</h3>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Advanced Search Background</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={getProp('search_adv_bg_color') || '#FFFFFF'}
                      onChange={(e) => setProp('search_adv_bg_color', e.target.value)}
                      className="w-9 h-9 rounded border border-stone-200 p-0.5 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={getProp('search_adv_bg_color') || '#FFFFFF'}
                      onChange={(e) => setProp('search_adv_bg_color', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] transition-colors"
                    />
                  </div>
                  <p className="text-xs text-stone-400">Background of the expanded advanced search panel.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Half-Map Search Background</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={getProp('search_halfmap_bg_color') || '#F5F5F5'}
                      onChange={(e) => setProp('search_halfmap_bg_color', e.target.value)}
                      className="w-9 h-9 rounded border border-stone-200 p-0.5 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={getProp('search_halfmap_bg_color') || '#F5F5F5'}
                      onChange={(e) => setProp('search_halfmap_bg_color', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] transition-colors"
                    />
                  </div>
                  <p className="text-xs text-stone-400">Background of the filter panel in half-map layout.</p>
                </div>
              </div>

              {/* Input Field Styling */}
              <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-4">
                <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em]">Input Field Styling</h3>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Field Border Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={getProp('search_field_border_color') || '#E5E7EB'}
                      onChange={(e) => setProp('search_field_border_color', e.target.value)}
                      className="w-9 h-9 rounded border border-stone-200 p-0.5 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={getProp('search_field_border_color') || '#E5E7EB'}
                      onChange={(e) => setProp('search_field_border_color', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Placeholder Text Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={getProp('search_placeholder_color') || '#9CA3AF'}
                      onChange={(e) => setProp('search_placeholder_color', e.target.value)}
                      className="w-9 h-9 rounded border border-stone-200 p-0.5 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={getProp('search_placeholder_color') || '#9CA3AF'}
                      onChange={(e) => setProp('search_placeholder_color', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Input Text Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={getProp('search_input_text_color') || '#1C1C1C'}
                      onChange={(e) => setProp('search_input_text_color', e.target.value)}
                      className="w-9 h-9 rounded border border-stone-200 p-0.5 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={getProp('search_input_text_color') || '#1C1C1C'}
                      onChange={(e) => setProp('search_input_text_color', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Field Padding</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="4" max="32"
                      value={getProp('search_field_padding') || '12'}
                      onChange={(e) => setProp('search_field_padding', e.target.value)}
                      className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                    />
                    <span className="text-sm text-stone-500 shrink-0">px</span>
                  </div>
                </div>
              </div>

              {/* Search Button */}
              <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-4">
                <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em]">Search Button</h3>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Button Background</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={getProp('search_btn_bg') || '#0d5959'}
                      onChange={(e) => setProp('search_btn_bg', e.target.value)}
                      className="w-9 h-9 rounded border border-stone-200 p-0.5 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={getProp('search_btn_bg') || '#0d5959'}
                      onChange={(e) => setProp('search_btn_bg', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Button Hover Background</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={getProp('search_btn_hover_bg') || '#0d5959'}
                      onChange={(e) => setProp('search_btn_hover_bg', e.target.value)}
                      className="w-9 h-9 rounded border border-stone-200 p-0.5 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={getProp('search_btn_hover_bg') || '#0d5959'}
                      onChange={(e) => setProp('search_btn_hover_bg', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Button Text Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={getProp('search_btn_text_color') || '#FFFFFF'}
                      onChange={(e) => setProp('search_btn_text_color', e.target.value)}
                      className="w-9 h-9 rounded border border-stone-200 p-0.5 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={getProp('search_btn_text_color') || '#FFFFFF'}
                      onChange={(e) => setProp('search_btn_text_color', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Button Border Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={getProp('search_btn_border_color') || '#0d5959'}
                      onChange={(e) => setProp('search_btn_border_color', e.target.value)}
                      className="w-9 h-9 rounded border border-stone-200 p-0.5 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={getProp('search_btn_border_color') || '#0d5959'}
                      onChange={(e) => setProp('search_btn_border_color', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Utility Buttons */}
              <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-4">
                <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em]">Utility Buttons</h3>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Clear Button Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={getProp('search_clear_btn_color') || '#01153c'}
                      onChange={(e) => setProp('search_clear_btn_color', e.target.value)}
                      className="w-9 h-9 rounded border border-stone-200 p-0.5 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={getProp('search_clear_btn_color') || '#01153c'}
                      onChange={(e) => setProp('search_clear_btn_color', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Open/Close Toggle Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={getProp('search_toggle_color') || '#0d5959'}
                      onChange={(e) => setProp('search_toggle_color', e.target.value)}
                      className="w-9 h-9 rounded border border-stone-200 p-0.5 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={getProp('search_toggle_color') || '#0d5959'}
                      onChange={(e) => setProp('search_toggle_color', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Advanced Search Button Style</label>
                  <select
                    value={getProp('search_adv_btn_style') || 'solid'}
                    onChange={(e) => setProp('search_adv_btn_style', e.target.value)}
                    className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                  >
                    <option value="solid">Solid fill</option>
                    <option value="outline">Outline / Border</option>
                    <option value="text">Text only</option>
                  </select>
                </div>
              </div>

              {/* Search Bar Preview */}
              <div className="rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-4 py-2 bg-[#f5f5f5] border-b border-stone-200">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Search Bar Preview</p>
                </div>
                <div
                  className="p-5"
                  style={{ background: getProp('search_adv_bg_color') || '#FFFFFF' }}
                >
                  <div className="flex gap-2">
                    <div
                      className="flex-1 rounded-md px-3 py-2.5 text-sm"
                      style={{
                        border: `1px solid ${getProp('search_field_border_color') || '#E5E7EB'}`,
                        color: getProp('search_placeholder_color') || '#9CA3AF',
                        background: getProp('search_adv_bg_color') || '#FFFFFF',
                        paddingTop: `${getProp('search_field_padding') || '12'}px`,
                        paddingBottom: `${getProp('search_field_padding') || '12'}px`,
                      }}
                    >
                      Search by location, keyword…
                    </div>
                    <button
                      className="px-5 py-2 rounded-md text-sm font-medium whitespace-nowrap"
                      style={{
                        backgroundColor: getProp('search_btn_bg') || '#0d5959',
                        color: getProp('search_btn_text_color') || '#FFFFFF',
                        border: `1px solid ${getProp('search_btn_border_color') || '#0d5959'}`,
                      }}
                    >
                      Search
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────── FIELDS & ORDER ─────── */}
          {searchSubtab === 'fields' && (
            <div className="bg-white rounded-xl border border-stone-200/70 p-5">
              <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em] mb-4">Search & Filter Fields</h3>
              <p className="text-[11px] text-stone-400 font-roboto mb-4">Drag to reorder, toggle to enable/disable</p>
              <div className="space-y-2">
                {searchFilters.map((filter, index) => (
                  <div
                    key={filter.id}
                    className={`flex items-center gap-3 px-4 py-3 border rounded-lg transition-all bg-white ${
                      searchDragIndex === index ? 'border-[#1B4332] ring-1 ring-[#1B4332]/20' : 'border-stone-200/70'
                    }`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center text-stone-300">
                      <GripVertical size={16} />
                    </div>
                    <span className="text-[13px] font-roboto text-stone-800 flex-1">{filter.label}</span>
                    <span className="text-[11px] text-stone-400 font-roboto">Order: {filter.sort_order}</span>
                    <button onClick={() => moveSearchUp(index)} disabled={index === 0} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-300 hover:text-stone-500 disabled:opacity-30 cursor-pointer transition-colors">
                      <ArrowUp size={14} />
                    </button>
                    <button onClick={() => moveSearchDown(index)} disabled={index === searchFilters.length - 1} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-300 hover:text-stone-500 disabled:opacity-30 cursor-pointer transition-colors">
                      <ArrowDown size={14} />
                    </button>
                    <button onClick={() => setSearch(filter.key, { enabled: !filter.enabled })} className="cursor-pointer">
                      {filter.enabled ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1B4332]/8 text-[#1B4332] rounded-full text-[10px] font-roboto font-semibold tracking-wide uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1B4332]"></span> Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 text-stone-400 rounded-full text-[10px] font-roboto font-semibold tracking-wide uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span> Disabled
                        </span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─────── LAYOUT & VIEW ─────── */}
          {searchSubtab === 'layout' && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-4">
                <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em]">Default Sort &amp; View</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-700 block">Default Sort Order</label>
                    <select
                      value={getProp('search_default_sort') || 'newest'}
                      onChange={(e) => setProp('search_default_sort', e.target.value)}
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="price_low">Price — Low to High</option>
                      <option value="price_high">Price — High to Low</option>
                      <option value="name">Name — A to Z</option>
                      <option value="featured">Featured First</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-700 block">Default View</label>
                    <select
                      value={getProp('search_default_view') || 'grid'}
                      onChange={(e) => setProp('search_default_view', e.target.value)}
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                    >
                      <option value="grid">Grid</option>
                      <option value="list">List</option>
                      <option value="map">Map View</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-700 block">Properties Per Page</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="4" max="48"
                        value={getProp('search_per_page') || '12'}
                        onChange={(e) => setProp('search_per_page', e.target.value)}
                        className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                      />
                      <span className="text-sm text-stone-500 shrink-0">props</span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1">Number of properties shown per page (4–48).</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-700 block">Grid Columns (Desktop)</label>
                    <select
                      value={getProp('search_grid_columns') || '3'}
                      onChange={(e) => setProp('search_grid_columns', e.target.value)}
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                    >
                      <option value="2">2 columns</option>
                      <option value="3">3 columns</option>
                      <option value="4">4 columns</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────── PAGE VISIBILITY ─────── */}
          {searchSubtab === 'visibility' && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-1">
                <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em] mb-3">Show Search On</h3>
                <p className="text-xs text-stone-400 mb-4">Toggle which pages show the search bar and filter panel.</p>
                {[
                  { key: 'search_show_on_buy', label: 'Buy Page', desc: 'Properties for sale listing page' },
                  { key: 'search_show_on_rent', label: 'Rent Page', desc: 'Properties for rent listing page' },
                  { key: 'search_show_on_home', label: 'Home Page', desc: 'Hero search bar on homepage' },
                  { key: 'search_show_on_neighbourhoods', label: 'Neighbourhood Pages', desc: 'Neighbourhood listing & detail pages' },
                  { key: 'search_show_on_new_developments', label: 'New Developments', desc: 'New developments listing page' },
                ].map((f) => (
                  <div key={f.key} className="flex items-start justify-between gap-4 py-3 border-b border-stone-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-700">{f.label}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{f.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProp(f.key, getProp(f.key) === 'true' ? 'false' : 'true')}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        getProp(f.key) !== 'false' ? 'bg-[#1B4332]' : 'bg-stone-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        getProp(f.key) !== 'false' ? 'translate-x-6' : 'translate-x-1'
                      }`}></span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════ PROPERTY SETTINGS ═══════ */}
      {activeTab === 'property' && (
        <>
          {/* Sub-tab Switcher */}
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-5">
            <button
              onClick={() => setPropSubtab('general')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                propSubtab === 'general' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <i className="ri-settings-3-line text-sm"></i>General
            </button>
            <button
              onClick={() => setPropSubtab('required')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                propSubtab === 'required' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <i className="ri-checkbox-circle-line text-sm"></i>Required Fields
            </button>
            <button
              onClick={() => setPropSubtab('card')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                propSubtab === 'card' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <i className="ri-layout-2-line text-sm"></i>Card Display
            </button>
          </div>

          {/* ─────── GENERAL SUB-TAB ─────── */}
          {propSubtab === 'general' && (
            <div className="space-y-5">
              {/* Title & ID Controls */}
              <SectionCard title="Title &amp; ID Controls">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-700 block">Property Title Character Limit</label>
                    <div className="flex items-center gap-3">
                      <input
                        min="40" max="200" type="range"
                        value={parseInt(getPropSetting('title_char_limit') || '103')}
                        onChange={(e) => setPropSetting('title_char_limit', e.target.value)}
                        className="flex-1 accent-[#1B4332]"
                      />
                      <span className="w-12 text-center text-sm font-semibold text-[#1B4332] tabular-nums">{parseInt(getPropSetting('title_char_limit') || '103')}</span>
                    </div>
                    <p className="text-xs text-stone-400">Admin warning shown when title exceeds this limit. Recommended: 60–80 characters.</p>
                  </div>
                  <Field label="Property ID Behavior">
                    <SelectInput value={getPropSetting('property_id_behavior')} options={[
                      { value: 'auto', label: 'Auto-generate (sequential)' },
                      { value: 'manual', label: 'Manual entry by admin' },
                      { value: 'slug', label: 'Use slug as ID' },
                    ]} onChange={(v) => setPropSetting('property_id_behavior', v)} />
                  </Field>
                  <Field label="Slug Generation Rule">
                    <SelectInput value={getPropSetting('slug_generation_rule')} options={[
                      { value: 'title', label: 'From title only (e.g. 4br-villa-kololo)' },
                      { value: 'id', label: 'From ID only' },
                      { value: 'title-id', label: 'Title + ID (e.g. 4br-villa-kololo-1024)' },
                    ]} onChange={(v) => setPropSetting('slug_generation_rule', v)} />
                  </Field>
                </div>
              </SectionCard>

              {/* Status & Gallery Defaults */}
              <SectionCard title="Status &amp; Gallery Defaults">
                <div className="space-y-4">
                  <Field label="Default Listing Status">
                    <SelectInput value={getPropSetting('default_listing_status')} options={[
                      { value: 'for-sale', label: 'For Sale' },
                      { value: 'for-rent', label: 'For Rent' },
                      { value: 'draft', label: 'Draft (unpublished)' },
                    ]} onChange={(v) => setPropSetting('default_listing_status', v)} />
                  </Field>
                  <Field label="Minimum Gallery Images Required">
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="0" max="20"
                        value={getPropSetting('min_gallery_images') || '1'}
                        onChange={(e) => setPropSetting('min_gallery_images', e.target.value)}
                        className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                      />
                      <span className="text-sm text-stone-500 shrink-0">images</span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1">Warn admin if they try to publish with fewer than this many photos.</p>
                  </Field>
                </div>
              </SectionCard>

              {/* Watermarking */}
              <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-4">
                <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-[#1B4332]/8 flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1B4332]"></div>
                  </div>
                  <h3 className="font-jost text-[13px] font-semibold text-stone-800 uppercase tracking-[0.12em]">Watermarking</h3>
                </div>
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <i className="ri-information-line text-amber-600 mt-0.5 shrink-0"></i>
                  <p className="text-sm text-amber-700/80">Watermarks are applied to all property images shown on the detail page only. Listing previews (search results, homepage, cards) will not be watermarked.</p>
                </div>
                <div className="flex items-start justify-between gap-4 py-3 border-b border-stone-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700">Enable Watermarks</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPropSetting('enable_watermarks', getPropSetting('enable_watermarks') === 'true' ? 'false' : 'true')}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      getPropSetting('enable_watermarks') === 'true' ? 'bg-[#1B4332]' : 'bg-stone-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      getPropSetting('enable_watermarks') === 'true' ? 'translate-x-6' : 'translate-x-1'
                    }`}></span>
                  </button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Watermark Text</label>
                  <input
                    type="text" placeholder="e.g. oceans.co.ke"
                    value={getPropSetting('watermark_text') || ''}
                    onChange={(e) => setPropSetting('watermark_text', e.target.value)}
                    className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                  />
                  <p className="text-xs text-stone-400">Text shown on every property detail image.</p>
                </div>
                <Field label="Watermark Position">
                  <SelectInput value={getPropSetting('watermark_position')} options={[
                    { value: 'bottom-right', label: 'Bottom Right — small corner badge' },
                    { value: 'bottom-left', label: 'Bottom Left — small corner badge' },
                    { value: 'center', label: 'Center — large centered text' },
                    { value: 'diagonal', label: 'Diagonal — tiled across entire image' },
                  ]} onChange={(v) => setPropSetting('watermark_position', v)} />
                </Field>
              </div>

              {/* Price Labels */}
              <SectionCard title="Price Labels">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-700 block">Price Label</label>
                    <input
                      type="text" placeholder="Price"
                      value={getPropSetting('price_label') || 'Price'}
                      onChange={(e) => setPropSetting('price_label', e.target.value)}
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                    />
                    <p className="text-xs text-stone-400">Shown before the price on listing cards. E.g. "Price", "Starting From", "Asking Price".</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-700 block">After Price Label</label>
                    <input
                      type="text" placeholder="/month"
                      value={getPropSetting('after_price_label') || ''}
                      onChange={(e) => setPropSetting('after_price_label', e.target.value)}
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                    />
                    <p className="text-xs text-stone-400">Shown after the price. Leave blank for sale listings. Use "/month" for rentals.</p>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ─────── REQUIRED FIELDS SUB-TAB ─────── */}
          {propSubtab === 'required' && (
            <SectionCard title="Required Fields">
              <div className="space-y-5">
                {['listing', 'inquiry'].map((cat) => (
                  <div key={cat} className="space-y-3">
                    <h4 className="text-[11px] font-roboto font-semibold text-stone-400 uppercase tracking-[0.15em]">
                      {cat === 'listing' ? 'Listing Form' : 'Public Inquiry Form'}
                    </h4>
                    <div className="space-y-2">
                      {requiredFields
                        .filter((r) => r.category === cat)
                        .map((r) => (
                          <div key={r.id} className="flex items-center justify-between p-3 border border-stone-200/70 rounded-lg bg-stone-50/50">
                            <span className="text-[13px] font-roboto text-stone-800">{r.label}</span>
                            <button onClick={() => setRequired(r.key, !r.required)} className="cursor-pointer">
                              {r.required ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50/80 text-red-600 rounded-full text-[10px] font-roboto font-semibold tracking-wide uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Required
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 text-stone-400 rounded-full text-[10px] font-roboto font-semibold tracking-wide uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span> Optional
                                </span>
                              )}
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ─────── CARD DISPLAY SUB-TAB ─────── */}
          {propSubtab === 'card' && (
            <div className="space-y-5">
              <SectionCard title="Badge Colors">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ColorField label="For Rent Badge Color" keyName="rent_badge_color" value={getCard('rent_badge_color')} onChange={setCard} />
                  <ColorField label="For Rent Badge Text Color" keyName="rent_badge_text_color" value={getCard('rent_badge_text_color')} onChange={setCard} />
                  <ColorField label="For Sale Badge Color" keyName="sale_badge_color" value={getCard('sale_badge_color')} onChange={setCard} />
                  <ColorField label="For Sale Badge Text Color" keyName="sale_badge_text_color" value={getCard('sale_badge_text_color')} onChange={setCard} />
                  <ColorField label="Featured Badge Color" keyName="featured_badge_color" value={getCard('featured_badge_color')} onChange={setCard} />
                  <ColorField label="New Development Badge Color" keyName="new_dev_badge_color" value={getCard('new_dev_badge_color')} onChange={setCard} />
                </div>
              </SectionCard>

              <SectionCard title="Badge Style">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Badge Border Radius (px)">
                    <NumberInput value={getCard('badge_border_radius')} onChange={(v) => setCard('badge_border_radius', v)} />
                  </Field>
                  <Field label="Badge Position">
                    <SelectInput value={getCard('badge_position')} options={[
                      { value: 'top-left', label: 'Top Left' },
                      { value: 'top-right', label: 'Top Right' },
                      { value: 'bottom-left', label: 'Bottom Left' },
                      { value: 'bottom-right', label: 'Bottom Right' },
                    ]} onChange={(v) => setCard('badge_position', v)} />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard title="Button Style">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ColorField label="Button Background Color" keyName="button_bg_color" value={getCard('button_bg_color')} onChange={setCard} />
                  <ColorField label="Button Text Color" keyName="button_text_color" value={getCard('button_text_color')} onChange={setCard} />
                  <ColorField label="Button Hover Color" keyName="button_hover_color" value={getCard('button_hover_color')} onChange={setCard} />
                  <Field label="Button Border Radius (px)">
                    <NumberInput value={getCard('button_border_radius')} onChange={(v) => setCard('button_border_radius', v)} />
                  </Field>
                </div>
                <div className="mt-4">
                  <ToggleRow label="Show Details Button" desc="Display a details button on property cards" value={getCard('show_details_button') === 'true'} onToggle={() => setCard('show_details_button', getCard('show_details_button') === 'true' ? 'false' : 'true')} />
                </div>
              </SectionCard>

              <SectionCard title="Card Style">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Card Shadow">
                    <SelectInput value={getCard('card_shadow')} options={[
                      { value: 'none', label: 'None' },
                      { value: 'small', label: 'Small' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'large', label: 'Large' },
                    ]} onChange={(v) => setCard('card_shadow', v)} />
                  </Field>
                  <Field label="Image Height (px)">
                    <NumberInput value={getCard('image_height')} onChange={(v) => setCard('image_height', v)} />
                  </Field>
                  <Field label="Border Radius (px)">
                    <NumberInput value={getCard('card_border_radius')} onChange={(v) => setCard('card_border_radius', v)} />
                  </Field>
                  <Field label="Title Size (px)">
                    <NumberInput value={getCard('title_size')} onChange={(v) => setCard('title_size', v)} />
                  </Field>
                  <Field label="Price Size (px)">
                    <NumberInput value={getCard('price_size')} onChange={(v) => setCard('price_size', v)} />
                  </Field>
                  <Field label="Icon Style">
                    <SelectInput value={getCard('icon_style')} options={[
                      { value: 'outline', label: 'Outline' },
                      { value: 'filled', label: 'Filled' },
                    ]} onChange={(v) => setCard('icon_style', v)} />
                  </Field>
                  <Field label="Card Spacing (px)">
                    <NumberInput value={getCard('card_spacing')} onChange={(v) => setCard('card_spacing', v)} />
                  </Field>
                  <Field label="Hover Effect">
                    <SelectInput value={getCard('hover_effect')} options={[
                      { value: 'none', label: 'None' },
                      { value: 'lift', label: 'Lift Up' },
                      { value: 'scale', label: 'Scale' },
                      { value: 'border', label: 'Border Highlight' },
                    ]} onChange={(v) => setCard('hover_effect', v)} />
                  </Field>
                  <ColorField label="Card Background" keyName="card_background" value={getCard('card_background')} onChange={setCard} />
                </div>
              </SectionCard>
            </div>
          )}
        </>
      )}

      {/* ═══════ REQUIRED FIELDS ═══════ */}
      {activeTab === 'required' && (
        <div className="space-y-6">
          {/* Listing / Property Form */}
          <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-1">
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Listing / Property Form</h3>
            <p className="text-xs text-stone-400 mb-4">These fields are enforced when a staff member creates or edits a property listing in the admin panel.</p>
            {requiredFields
              .filter((r) => r.category === 'listing')
              .map((r) => {
                const desc: Record<string, string> = {
                  title: 'Listing cannot be published without a title.',
                  price: 'Listing cannot be published without a KES price.',
                  photos: 'Block publishing if no photos are attached.',
                  agent: 'Require an agent to be assigned before publishing.',
                };
                return (
                  <div key={r.id} className="flex items-start justify-between gap-4 py-3 border-b border-stone-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-700">{r.label} is Required</p>
                      {desc[r.key] && <p className="text-xs text-stone-400 mt-0.5">{desc[r.key]}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRequired(r.key, !r.required)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${r.required ? 'bg-[#1B4332]' : 'bg-stone-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${r.required ? 'translate-x-6' : 'translate-x-1'}`}></span>
                    </button>
                  </div>
                );
              })}
          </div>

          {/* Public Inquiry / Contact Form */}
          <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-1">
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Public Inquiry / Contact Form</h3>
            <p className="text-xs text-stone-400 mb-4">These fields are enforced on the public property inquiry and contact forms.</p>
            {requiredFields
              .filter((r) => r.category === 'inquiry')
              .map((r) => {
                const desc: Record<string, string> = {
                  inquiry_phone: 'Making phone required increases friction but improves lead quality.',
                };
                return (
                  <div key={r.id} className="flex items-start justify-between gap-4 py-3 border-b border-stone-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-700">{r.label} Required</p>
                      {desc[r.key] && <p className="text-xs text-stone-400 mt-0.5">{desc[r.key]}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRequired(r.key, !r.required)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${r.required ? 'bg-[#1B4332]' : 'bg-stone-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${r.required ? 'translate-x-6' : 'translate-x-1'}`}></span>
                    </button>
                  </div>
                );
              })}
          </div>

          {/* Sticky Save Bar */}
          <div className="sticky bottom-0 z-10 bg-white border border-stone-200 rounded-xl shadow-sm px-5 py-3 flex items-center justify-end gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#1B4332]/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><i className="ri-save-3-line text-sm"></i>Save Changes</>}
            </button>
          </div>
        </div>
      )}

      {/* ═══════ HERO SECTION ═══════ */}
      {activeTab === 'hero' && (
        <div className="space-y-5">
          <SectionCard>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ToggleRow label="Show Hero Section" desc="Display the hero section on the homepage" value={getHero('show_hero') === 'true'} onToggle={() => toggleHero('show_hero')} />
              <ToggleRow label="Show Search Bar" desc="Display the search bar within the hero" value={getHero('show_search_bar') === 'true'} onToggle={() => toggleHero('show_search_bar')} />
              <ToggleRow label="Show Logo" desc="Display logo in the hero area" value={getHero('show_logo') === 'true'} onToggle={() => toggleHero('show_logo')} />
              <ToggleRow label="Show Social Icons" desc="Display social icons in the hero" value={getHero('show_social_icons') === 'true'} onToggle={() => toggleHero('show_social_icons')} />
            </div>
          </SectionCard>

          <SectionCard title="Background">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Hero Background Image">
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
                  <TextInput value={getHero('hero_background_image')} onChange={(v) => setHero('hero_background_image', v)} placeholder="https://..." />
                </div>
              </Field>
              <Field label="Hero Background Video URL">
                <TextInput value={getHero('hero_background_video')} onChange={(v) => setHero('hero_background_video', v)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <Field label="Overlay Opacity (%)">
                <NumberInput value={getHero('hero_overlay_opacity')} onChange={(v) => setHero('hero_overlay_opacity', v)} placeholder="0-100" />
              </Field>
              <Field label="Focal Point X (%)">
                <NumberInput value={getHero('hero_focal_x')} onChange={(v) => setHero('hero_focal_x', v)} placeholder="0-100" />
              </Field>
              <Field label="Focal Point Y (%)">
                <NumberInput value={getHero('hero_focal_y')} onChange={(v) => setHero('hero_focal_y', v)} placeholder="0-100" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Mobile Background Override">
                <TextInput value={getHero('hero_mobile_background')} onChange={(v) => setHero('hero_mobile_background', v)} placeholder="https://..." />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Button Controls">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Button Style">
                <SelectInput value={getHero('button_style')} options={[
                  { value: 'solid', label: 'Solid' },
                  { value: 'outline', label: 'Outline' },
                  { value: 'ghost', label: 'Ghost' },
                ]} onChange={(v) => setHero('button_style', v)} />
              </Field>
              <Field label="Border Radius (px)">
                <NumberInput value={getHero('button_border_radius')} onChange={(v) => setHero('button_border_radius', v)} />
              </Field>
              <Field label="Font Family">
                <SelectInput value={getHero('button_font_family')} options={[
                  { value: 'Jost', label: 'Jost' },
                  { value: 'Roboto', label: 'Roboto' },
                  { value: 'Prata', label: 'Prata' },
                  { value: 'Inter', label: 'Inter' },
                ]} onChange={(v) => setHero('button_font_family', v)} />
              </Field>
              <Field label="Font Weight">
                <SelectInput value={getHero('button_font_weight')} options={[
                  { value: '400', label: '400' },
                  { value: '500', label: '500' },
                  { value: '600', label: '600' },
                  { value: '700', label: '700' },
                ]} onChange={(v) => setHero('button_font_weight', v)} />
              </Field>
              <Field label="Font Size (px)">
                <NumberInput value={getHero('button_font_size')} onChange={(v) => setHero('button_font_size', v)} />
              </Field>
              <Field label="Letter Spacing (px)">
                <NumberInput value={getHero('button_letter_spacing')} onChange={(v) => setHero('button_letter_spacing', v)} />
              </Field>
              <Field label="Text Transform">
                <SelectInput value={getHero('button_text_transform')} options={[
                  { value: 'none', label: 'None' },
                  { value: 'uppercase', label: 'Uppercase' },
                  { value: 'capitalize', label: 'Capitalize' },
                  { value: 'lowercase', label: 'Lowercase' },
                ]} onChange={(v) => setHero('button_text_transform', v)} />
              </Field>
              <ColorField label="Button Text Color" keyName="button_text_color" value={getHero('button_text_color')} onChange={setHero} />
              <ColorField label="Button Hover Text Color" keyName="button_hover_text_color" value={getHero('button_hover_text_color')} onChange={setHero} />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════ HOMEPAGE ═══════ */}
      {activeTab === 'homepage' && (
        <SectionCard title="Homepage Sections">
          <p className="text-[11px] text-stone-400 font-roboto mb-4">Drag to reorder, toggle visibility</p>
          <div className="space-y-2">
            {homeSections.map((section, index) => (
              <div key={section.id} className="flex items-center gap-3 px-4 py-3 border border-stone-200/70 rounded-lg bg-white group">
                <div className="w-8 h-8 flex items-center justify-center text-stone-300">
                  <GripVertical size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-roboto font-semibold text-stone-800">{section.name}</h4>
                  <p className="text-[11px] text-stone-400 font-roboto truncate">{section.title || section.subtitle || 'No title set'}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-roboto font-semibold tracking-wide uppercase ${section.visible ? 'bg-[#1B4332]/8 text-[#1B4332]' : 'bg-stone-100 text-stone-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${section.visible ? 'bg-[#1B4332]' : 'bg-stone-300'}`}></span>
                  {section.visible ? 'Visible' : 'Hidden'}
                </span>
                <button onClick={() => moveHomeUp(index)} disabled={index === 0} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-300 hover:text-stone-500 disabled:opacity-30 cursor-pointer transition-colors">
                  <ArrowUp size={14} />
                </button>
                <button onClick={() => moveHomeDown(index)} disabled={index === homeSections.length - 1} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-300 hover:text-stone-500 disabled:opacity-30 cursor-pointer transition-colors">
                  <ArrowDown size={14} />
                </button>
                <button onClick={() => toggleHomeVisible(index)} className="cursor-pointer">
                  {section.visible ? <Eye size={14} className="text-stone-400 hover:text-stone-600 transition-colors" /> : <EyeOff size={14} className="text-stone-300 hover:text-stone-500 transition-colors" />}
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 p-3 bg-stone-100/80 border border-stone-200/70 rounded-lg mt-4">
            <Info size={14} className="text-stone-500 flex-shrink-0" />
            <p className="text-[11px] text-stone-600 font-roboto">For full section editing (headings, images, CTA buttons), use the Home Sections page.</p>
          </div>
        </SectionCard>
      )}

      {/* ═══════ BREADCRUMBS ═══════ */}
      {activeTab === 'breadcrumbs' && (
        <SectionCard title="Breadcrumb Controls">
          <div className="space-y-4">
            <ToggleRow label="Enable Breadcrumbs" desc="Show breadcrumb navigation on frontend pages" value={getBread('enable_breadcrumbs') === 'true'} onToggle={() => toggleBread('enable_breadcrumbs')} />
            <ToggleRow label="Show Home Link" desc="Include a home link as the first breadcrumb item" value={getBread('show_home_link') === 'true'} onToggle={() => toggleBread('show_home_link')} />
            <Field label="Separator Character">
              <SelectInput value={getBread('separator_character')} options={[
                { value: 'chevron', label: 'Chevron (>)' },
                { value: 'slash', label: 'Slash (/)' },
                { value: 'arrow', label: 'Arrow (→)' },
                { value: 'pipe', label: 'Pipe (|)' },
                { value: 'dot', label: 'Dot (•)' },
              ]} onChange={(v) => setBread('separator_character', v)} />
            </Field>
            <h4 className="text-[11px] font-roboto font-semibold text-stone-400 uppercase tracking-[0.15em] mt-4">Show on Pages</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ToggleRow label="Listing / Property Pages" desc="Show breadcrumbs on property detail pages" value={getBread('show_on_property_pages') === 'true'} onToggle={() => toggleBread('show_on_property_pages')} />
              <ToggleRow label="Blog / Insight Pages" desc="Show breadcrumbs on blog posts" value={getBread('show_on_blog_pages') === 'true'} onToggle={() => toggleBread('show_on_blog_pages')} />
              <ToggleRow label="Neighbourhood Pages" desc="Show breadcrumbs on neighbourhood pages" value={getBread('show_on_neighbourhood_pages') === 'true'} onToggle={() => toggleBread('show_on_neighbourhood_pages')} />
              <ToggleRow label="Listing List Pages" desc="Show breadcrumbs on search results" value={getBread('show_on_listing_pages') === 'true'} onToggle={() => toggleBread('show_on_listing_pages')} />
            </div>
          </div>
        </SectionCard>
      )}

      {/* ═══════ CONTACT & COMPANY ═══════ */}
      {activeTab === 'contact' && (
        <div className="space-y-5">
          <SectionCard title="Live Preview">
            <div className="space-y-1 text-sm font-roboto text-[#1a1a2e]">
              <p className="font-semibold">{getSite('site_name') || 'Oceans Kenya'}</p>
              <p className="text-gray-500 text-xs">{getSite('address') || 'Riverside Drive, Westlands, Nairobi'}</p>
              <p className="text-gray-500 text-xs">{getSite('contact_phone') || '+254 703712984'}</p>
              <p className="text-gray-500 text-xs">{getSite('contact_email') || 'ask@oceanske.com'}</p>
              <p className="text-gray-500 text-xs">WhatsApp: {getSite('whatsapp_number') || '+254 703712984'}</p>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Contact Page Title">
                <TextInput value={getSite('contact_title')} onChange={(v) => setSite('contact_title', v)} placeholder="Contact Us" />
              </Field>
              <Field label="Contact Page Subtitle">
                <TextInput value={getSite('contact_subtitle')} onChange={(v) => setSite('contact_subtitle', v)} placeholder="Get in touch" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Field label="Phone Number">
                <TextInput value={getSite('contact_phone')} onChange={(v) => setSite('contact_phone', v)} />
              </Field>
              <Field label="WhatsApp Number">
                <TextInput value={getSite('whatsapp_number')} onChange={(v) => setSite('whatsapp_number', v)} />
              </Field>
              <Field label="Email Address">
                <TextInput value={getSite('contact_email')} onChange={(v) => setSite('contact_email', v)} />
              </Field>
              <Field label="Address">
                <TextInput value={getSite('address')} onChange={(v) => setSite('address', v)} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Opening Hours">
                <TextInput value={getSite('opening_hours')} onChange={(v) => setSite('opening_hours', v)} placeholder="Mon-Fri 9:00 - 18:00" />
              </Field>
            </div>
            <div className="flex items-center gap-2 p-3 bg-stone-100/80 border border-stone-200/70 rounded-lg mt-4">
              <Info size={14} className="text-stone-500 flex-shrink-0" />
              <p className="text-[11px] text-stone-600 font-roboto">These fields update the contact page, footer, property sidebar contact cards, valuation page, and enquiry forms.</p>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════ SOCIAL MEDIA ═══════ */}
      {activeTab === 'social' && (
        <div className="space-y-5">
          <SectionCard title="Social Media Links">
            <div className="space-y-3">
              {socialLinks.map((social) => (
                <div key={social.id} className="border border-gray-100 rounded-md p-4 bg-white">
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
                    <Field label="URL">
                      <TextInput value={social.url || ''} onChange={(v) => setSocial(social.platform, { url: v })} placeholder="https://..." />
                    </Field>
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
          </SectionCard>

          <SectionCard title="Icon Preview">
            <div className="flex items-center gap-3 flex-wrap">
              {socialLinks.filter((s) => s.url).map((s) => (
                <div key={s.platform} className="w-9 h-9 rounded-md bg-[#1a1a2e] flex items-center justify-center" title={s.platform}>
                  <i className={`${socialIcon(s.platform)} text-white text-sm`}></i>
                </div>
              ))}
              {socialLinks.filter((s) => s.url).length === 0 && (
                <p className="text-xs text-gray-400 font-roboto">No social links configured yet</p>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════ MAPS & LOCATION ═══════ */}
      {activeTab === 'maps' && (
        <SectionCard title="Maps & Location Settings">
          <div className="space-y-4">
            <Field label="Google Maps API Key">
              <input
                type="password" value={getMap('google_maps_api_key')}
                onChange={(e) => setMap('google_maps_api_key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-roboto focus:outline-none focus:border-primary bg-white"
                placeholder="AIza..."
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Default Country">
                <TextInput value={getMap('default_country')} onChange={(v) => setMap('default_country', v)} placeholder="Kenya" />
              </Field>
              <Field label="Default City">
                <TextInput value={getMap('default_city')} onChange={(v) => setMap('default_city', v)} placeholder="Nairobi" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Default Map Center (lat,lng)">
                <TextInput value={getMap('default_map_center')} onChange={(v) => setMap('default_map_center', v)} placeholder="-1.2921,36.8219" />
              </Field>
              <Field label="Default Zoom Level">
                <NumberInput value={getMap('default_zoom')} onChange={(v) => setMap('default_zoom', v)} placeholder="12" />
              </Field>
            </div>
            <ColorField label="Property Pin Color" keyName="property_pin_color" value={getMap('property_pin_color')} onChange={setMap} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ToggleRow label="Show Map on Property Pages" desc="Display map on individual property detail pages" value={getMap('show_map_on_property_pages') === 'true'} onToggle={() => toggleMap('show_map_on_property_pages')} />
              <ToggleRow label="Show Neighbourhood Map" desc="Display map on neighbourhood pages" value={getMap('show_neighbourhood_map') === 'true'} onToggle={() => toggleMap('show_neighbourhood_map')} />
            </div>
            <div className="flex items-center gap-2 p-3 bg-stone-100/80 border border-stone-200/70 rounded-lg">
              <Info size={14} className="text-stone-500 flex-shrink-0" />
              <p className="text-[11px] text-stone-600 font-roboto">Google Maps API key is required for embedded maps. The key is stored securely and never exposed to the public.</p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ═══════ PROPERTY DETAILS & BREADCRUMBS ═══════ */}
      {activeTab === 'property-details' && (
        <div className="space-y-5">
          {/* Module Appearance */}
          <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-4">
            <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em]">Module Appearance</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 block">Module Background Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={getDetailStyle('module_bg_color') || '#F5F5F5'}
                    onChange={(e) => setDetailStyleVal('module_bg_color', e.target.value)}
                    className="w-9 h-9 rounded border border-stone-200 p-0.5 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={getDetailStyle('module_bg_color') || '#F5F5F5'}
                    onChange={(e) => setDetailStyleVal('module_bg_color', e.target.value)}
                    placeholder="#FFFFFF"
                    className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] transition-colors"
                  />
                </div>
                <p className="text-xs text-stone-400">Background of each content block on the property detail page.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 block">Module Border Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={getDetailStyle('module_border_color') || '#F5F5F5'}
                    onChange={(e) => setDetailStyleVal('module_border_color', e.target.value)}
                    className="w-9 h-9 rounded border border-stone-200 p-0.5 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={getDetailStyle('module_border_color') || '#F5F5F5'}
                    onChange={(e) => setDetailStyleVal('module_border_color', e.target.value)}
                    placeholder="#FFFFFF"
                    className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332] transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section Order & Visibility */}
          <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em]">Section Order &amp; Visibility</h3>
              <span className="text-xs text-stone-400">
                {detailLayout.filter((s) => s.visible).length} of {detailLayout.length} visible
              </span>
            </div>
            <p className="text-xs text-stone-400">Reorder sections using the arrows. Toggle the switch to show or hide each section.</p>
            <div className="space-y-1.5">
              {detailLayout.map((section, index) => (
                <div
                  key={section.id}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg border transition-colors ${
                    section.visible
                      ? 'border-[#1B4332]/15 bg-[#1B4332]/3'
                      : 'border-stone-100 bg-[#f5f5f5]'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveDetailUp(index)}
                      disabled={index === 0}
                      className="w-5 h-4 flex items-center justify-center text-stone-300 hover:text-stone-600 disabled:opacity-20 cursor-pointer"
                    >
                      <i className="ri-arrow-up-s-line text-xs"></i>
                    </button>
                    <button
                      onClick={() => moveDetailDown(index)}
                      disabled={index === detailLayout.length - 1}
                      className="w-5 h-4 flex items-center justify-center text-stone-300 hover:text-stone-600 disabled:opacity-20 cursor-pointer"
                    >
                      <i className="ri-arrow-down-s-line text-xs"></i>
                    </button>
                  </div>
                  <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-stone-400 shrink-0">{index + 1}</span>
                  <i className="ri-drag-move-2-line text-stone-300 text-sm shrink-0"></i>
                  <span className={`flex-1 text-sm font-medium ${section.visible ? 'text-stone-800' : 'text-stone-400'}`}>
                    {section.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleDetailVisible(index)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      section.visible ? 'bg-[#1B4332]' : 'bg-stone-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        section.visible ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    ></span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Breadcrumb Settings */}
          <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-4">
            <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em]">Breadcrumb Settings</h3>
            <div className="flex items-start justify-between gap-4 py-3 border-b border-stone-100">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-700">Enable Breadcrumbs</p>
                <p className="text-xs text-stone-400 mt-0.5">Master toggle for all breadcrumbs.</p>
              </div>
              <button
                type="button"
                onClick={() => toggleBread('enable_breadcrumbs')}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  getBread('enable_breadcrumbs') !== 'false' ? 'bg-[#1B4332]' : 'bg-stone-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  getBread('enable_breadcrumbs') !== 'false' ? 'translate-x-6' : 'translate-x-1'
                }`}></span>
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700 block">Breadcrumb Style</label>
              <select
                value={getBread('breadcrumb_style') || 'status-type'}
                onChange={(e) => setBread('breadcrumb_style', e.target.value)}
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
              >
                <option value="type">Property Type (e.g. Villa)</option>
                <option value="status">Property Status (e.g. For Sale)</option>
                <option value="status-type">Status + Type (e.g. For Sale › Villa)</option>
                <option value="city">City only (e.g. Nairobi)</option>
                <option value="area">Area only (e.g. Kilimani)</option>
                <option value="city-area">City + Area (e.g. Nairobi › Kilimani)</option>
              </select>
              <p className="text-xs text-stone-400">Controls the middle segment of the breadcrumb trail on property pages.</p>
            </div>
            <div className="bg-[#f5f5f5] rounded-lg px-4 py-3">
              <p className="text-xs text-stone-400 mb-2">Preview</p>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-[#1B4332]">{getBread('home_label') || 'Home'}</span>
                <span className="text-stone-300">{getBread('separator_character') === 'chevron' ? '›' : getBread('separator_character') === 'arrow' ? '→' : getBread('separator_character') === 'pipe' ? '|' : getBread('separator_character') === 'dot' ? '·' : getBread('separator_character') || '/'}</span>
                <span className="text-[#1B4332]">{getBread('listings_label') || 'Properties'}</span>
                <span className="text-stone-300">{getBread('separator_character') === 'chevron' ? '›' : getBread('separator_character') === 'arrow' ? '→' : getBread('separator_character') === 'pipe' ? '|' : getBread('separator_character') === 'dot' ? '·' : getBread('separator_character') || '/'}</span>
                <span className="text-[#1B4332]">Villa</span>
                <span className="text-stone-300">{getBread('separator_character') === 'chevron' ? '›' : getBread('separator_character') === 'arrow' ? '→' : getBread('separator_character') === 'pipe' ? '|' : getBread('separator_character') === 'dot' ? '·' : getBread('separator_character') || '/'}</span>
                <span className="text-[#1B4332]">For Sale</span>
                <span className="text-stone-300">{getBread('separator_character') === 'chevron' ? '›' : getBread('separator_character') === 'arrow' ? '→' : getBread('separator_character') === 'pipe' ? '|' : getBread('separator_character') === 'dot' ? '·' : getBread('separator_character') || '/'}</span>
                <span className="text-stone-600 font-medium">4BR Villa — Kilimani</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 block">Home Label</label>
                <input
                  type="text"
                  placeholder="Home"
                  value={getBread('home_label') || 'Home'}
                  onChange={(e) => setBread('home_label', e.target.value)}
                  className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 block">Listings Label</label>
                <input
                  type="text"
                  placeholder="Properties"
                  value={getBread('listings_label') || 'Properties'}
                  onChange={(e) => setBread('listings_label', e.target.value)}
                  className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700 block">Separator Character</label>
              <select
                value={getBread('separator_character') || '/'}
                onChange={(e) => setBread('separator_character', e.target.value)}
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
              >
                <option value="/">/ Slash</option>
                <option value="›">› Angle</option>
                <option value="»">» Double Angle</option>
                <option value="·">· Dot</option>
                <option value="|">| Pipe</option>
              </select>
            </div>
          </div>

          {/* Similar Properties Section */}
          <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <i className="ri-layout-grid-line text-[#1B4332] text-base"></i>
              <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em]">Similar Properties Section</h3>
            </div>
            <p className="text-xs text-stone-400 -mt-2">Control the "You Might Also Like" section shown at the bottom of every property detail page.</p>
            <div className="flex items-start justify-between gap-4 py-3 border-b border-stone-100">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-700">Show Similar Properties</p>
                <p className="text-xs text-stone-400 mt-0.5">Toggle the entire similar properties section on or off.</p>
              </div>
              <button
                type="button"
                onClick={() => setPropSetting('show_similar_properties', getPropSetting('show_similar_properties') === 'true' ? 'false' : 'true')}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  getPropSetting('show_similar_properties') !== 'false' ? 'bg-[#1B4332]' : 'bg-stone-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  getPropSetting('show_similar_properties') !== 'false' ? 'translate-x-6' : 'translate-x-1'
                }`}></span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 block">Section Eyebrow</label>
                <input
                  type="text"
                  placeholder="You Might Also Like"
                  value={getPropSetting('similar_eyebrow') || 'You Might Also Like'}
                  onChange={(e) => setPropSetting('similar_eyebrow', e.target.value)}
                  className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                />
                <p className="text-xs text-stone-400">Small label above the heading.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 block">Section Heading</label>
                <input
                  type="text"
                  placeholder="Similar Properties"
                  value={getPropSetting('similar_heading') || 'Similar Properties'}
                  onChange={(e) => setPropSetting('similar_heading', e.target.value)}
                  className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700 block">Number of Properties to Show</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={getPropSetting('similar_count') || '4'}
                  onChange={(e) => setPropSetting('similar_count', e.target.value)}
                  className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                />
                <span className="text-sm text-stone-500 shrink-0">properties</span>
              </div>
              <p className="text-xs text-stone-400">How many similar listings to display (1–12).</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 block">Display Layout</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => setPropSetting('similar_layout', 'grid')}
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                      (getPropSetting('similar_layout') || 'grid') === 'grid' ? 'border-[#1B4332] bg-[#1B4332]' : 'border-stone-300 bg-white'
                    }`}
                  >
                    {(getPropSetting('similar_layout') || 'grid') === 'grid' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                  </div>
                  <span className="text-sm text-stone-700">Grid — cards side by side</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => setPropSetting('similar_layout', 'list')}
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                      getPropSetting('similar_layout') === 'list' ? 'border-[#1B4332] bg-[#1B4332]' : 'border-stone-300 bg-white'
                    }`}
                  >
                    {getPropSetting('similar_layout') === 'list' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                  </div>
                  <span className="text-sm text-stone-700">List — full-width horizontal rows</span>
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700 block">Grid Columns (desktop)</label>
              <select
                value={getPropSetting('similar_columns') || '4'}
                onChange={(e) => setPropSetting('similar_columns', e.target.value)}
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
              >
                <option value="2">2 columns</option>
                <option value="3">3 columns</option>
                <option value="4">4 columns</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ PROPERTY CARDS STYLE ═══════ */}
      {activeTab === 'styling-cards' && (
        <div className="space-y-5">
          <SectionCard title="Badge Colors">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorField label="For Rent Badge Color" keyName="rent_badge_color" value={getCard('rent_badge_color')} onChange={setCard} />
              <ColorField label="For Rent Badge Text Color" keyName="rent_badge_text_color" value={getCard('rent_badge_text_color')} onChange={setCard} />
              <ColorField label="For Sale Badge Color" keyName="sale_badge_color" value={getCard('sale_badge_color')} onChange={setCard} />
              <ColorField label="For Sale Badge Text Color" keyName="sale_badge_text_color" value={getCard('sale_badge_text_color')} onChange={setCard} />
              <ColorField label="Featured Badge Color" keyName="featured_badge_color" value={getCard('featured_badge_color')} onChange={setCard} />
              <ColorField label="New Development Badge Color" keyName="new_dev_badge_color" value={getCard('new_dev_badge_color')} onChange={setCard} />
            </div>
          </SectionCard>

          <SectionCard title="Badge Style">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Badge Border Radius (px)">
                <NumberInput value={getCard('badge_border_radius')} onChange={(v) => setCard('badge_border_radius', v)} />
              </Field>
              <Field label="Badge Position">
                <SelectInput value={getCard('badge_position')} options={[
                  { value: 'top-left', label: 'Top Left' },
                  { value: 'top-right', label: 'Top Right' },
                  { value: 'bottom-left', label: 'Bottom Left' },
                  { value: 'bottom-right', label: 'Bottom Right' },
                ]} onChange={(v) => setCard('badge_border_radius', v)} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Button Style">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorField label="Button Background Color" keyName="button_bg_color" value={getCard('button_bg_color')} onChange={setCard} />
              <ColorField label="Button Text Color" keyName="button_text_color" value={getCard('button_text_color')} onChange={setCard} />
              <ColorField label="Button Hover Color" keyName="button_hover_color" value={getCard('button_hover_color')} onChange={setCard} />
              <Field label="Button Border Radius (px)">
                <NumberInput value={getCard('button_border_radius')} onChange={(v) => setCard('button_border_radius', v)} />
              </Field>
            </div>
            <div className="mt-4">
              <ToggleRow label="Show Details Button" desc="Display a details button on property cards" value={getCard('show_details_button') === 'true'} onToggle={() => setCard('show_details_button', getCard('show_details_button') === 'true' ? 'false' : 'true')} />
            </div>
          </SectionCard>

          <SectionCard title="Card Style">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Card Shadow">
                <SelectInput value={getCard('card_shadow')} options={[
                  { value: 'none', label: 'None' },
                  { value: 'small', label: 'Small' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Large' },
                ]} onChange={(v) => setCard('card_shadow', v)} />
              </Field>
              <Field label="Image Height (px)">
                <NumberInput value={getCard('image_height')} onChange={(v) => setCard('image_height', v)} />
              </Field>
              <Field label="Border Radius (px)">
                <NumberInput value={getCard('card_border_radius')} onChange={(v) => setCard('card_border_radius', v)} />
              </Field>
              <Field label="Title Size (px)">
                <NumberInput value={getCard('title_size')} onChange={(v) => setCard('title_size', v)} />
              </Field>
              <Field label="Price Size (px)">
                <NumberInput value={getCard('price_size')} onChange={(v) => setCard('price_size', v)} />
              </Field>
              <Field label="Icon Style">
                <SelectInput value={getCard('icon_style')} options={[
                  { value: 'outline', label: 'Outline' },
                  { value: 'filled', label: 'Filled' },
                ]} onChange={(v) => setCard('icon_style', v)} />
              </Field>
              <Field label="Card Spacing (px)">
                <NumberInput value={getCard('card_spacing')} onChange={(v) => setCard('card_spacing', v)} />
              </Field>
              <Field label="Hover Effect">
                <SelectInput value={getCard('hover_effect')} options={[
                  { value: 'none', label: 'None' },
                  { value: 'lift', label: 'Lift Up' },
                  { value: 'scale', label: 'Scale' },
                  { value: 'border', label: 'Border Highlight' },
                ]} onChange={(v) => setCard('hover_effect', v)} />
              </Field>
              <ColorField label="Card Background" keyName="card_background" value={getCard('card_background')} onChange={setCard} />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════ PROPERTY DETAIL STYLE ═══════ */}
      {activeTab === 'styling-details' && (
        <div className="space-y-5">
          <SectionCard>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Banner Version">
                <SelectInput value={getDetailStyle('banner_version')} options={[
                  { value: 'v1', label: 'Version 1 - Classic' },
                  { value: 'v2', label: 'Version 2 - Modern' },
                  { value: 'v3', label: 'Version 3 - Minimal' },
                ]} onChange={(v) => setDetailStyleVal('banner_version', v)} />
              </Field>
              <Field label="Gallery Layout">
                <SelectInput value={getDetailStyle('gallery_layout')} options={[
                  { value: 'grid', label: 'Grid' },
                  { value: 'carousel', label: 'Carousel' },
                  { value: 'masonry', label: 'Masonry' },
                  { value: 'full', label: 'Full Width' },
                ]} onChange={(v) => setDetailStyleVal('gallery_layout', v)} />
              </Field>
              <Field label="Sidebar Position">
                <SelectInput value={getDetailStyle('sidebar_position')} options={[
                  { value: 'right', label: 'Right' },
                  { value: 'left', label: 'Left' },
                  { value: 'none', label: 'No Sidebar' },
                ]} onChange={(v) => setDetailStyleVal('sidebar_position', v)} />
              </Field>
              <Field label="Contact Form Style">
                <SelectInput value={getDetailStyle('contact_form_style')} options={[
                  { value: 'modern', label: 'Modern' },
                  { value: 'classic', label: 'Classic' },
                  { value: 'minimal', label: 'Minimal' },
                ]} onChange={(v) => setDetailStyleVal('contact_form_style', v)} />
              </Field>
              <Field label="Agent Card Style">
                <SelectInput value={getDetailStyle('agent_card_style')} options={[
                  { value: 'compact', label: 'Compact' },
                  { value: 'expanded', label: 'Expanded' },
                  { value: 'minimal', label: 'Minimal' },
                ]} onChange={(v) => setDetailStyleVal('agent_card_style', v)} />
              </Field>
              <Field label="Mobile Layout">
                <SelectInput value={getDetailStyle('mobile_layout')} options={[
                  { value: 'stacked', label: 'Stacked' },
                  { value: 'tabs', label: 'Tabs' },
                  { value: 'accordion', label: 'Accordion' },
                ]} onChange={(v) => setDetailStyleVal('mobile_layout', v)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Field label="Image Height (px)">
                <NumberInput value={getDetailStyle('image_height')} onChange={(v) => setDetailStyleVal('image_height', v)} />
              </Field>
              <Field label="Section Spacing (px)">
                <NumberInput value={getDetailStyle('section_spacing')} onChange={(v) => setDetailStyleVal('section_spacing', v)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <ColorField label="Module Background Color" keyName="module_bg_color" value={getDetailStyle('module_bg_color')} onChange={setDetailStyleVal} />
              <ColorField label="Module Border Color" keyName="module_border_color" value={getDetailStyle('module_border_color')} onChange={setDetailStyleVal} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <ToggleRow label="Sticky Sidebar" desc="Keep sidebar visible while scrolling" value={getDetailStyle('sticky_sidebar') === 'true'} onToggle={() => setDetailStyleVal('sticky_sidebar', getDetailStyle('sticky_sidebar') === 'true' ? 'false' : 'true')} />
              <ToggleRow label="Show Action Buttons" desc="Show share, print, save buttons" value={getDetailStyle('show_action_buttons') === 'true'} onToggle={() => setDetailStyleVal('show_action_buttons', getDetailStyle('show_action_buttons') === 'true' ? 'false' : 'true')} />
              <ToggleRow label="Show Breadcrumb" desc="Display breadcrumb on detail page" value={getDetailStyle('show_breadcrumb') === 'true'} onToggle={() => setDetailStyleVal('show_breadcrumb', getDetailStyle('show_breadcrumb') === 'true' ? 'false' : 'true')} />
              <ToggleRow label="Show Share Buttons" desc="Display social share buttons" value={getDetailStyle('show_share_buttons') === 'true'} onToggle={() => setDetailStyleVal('show_share_buttons', getDetailStyle('show_share_buttons') === 'true' ? 'false' : 'true')} />
              <ToggleRow label="Show Print Button" desc="Display print property button" value={getDetailStyle('show_print_button') === 'true'} onToggle={() => setDetailStyleVal('show_print_button', getDetailStyle('show_print_button') === 'true' ? 'false' : 'true')} />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════ BRANDING ═══════ */}
      {activeTab === 'branding' && (
        <div className="space-y-5">
          <SectionCard title="Colour Palette">
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
                <ColorField key={c.key} label={c.label} keyName={c.key} value={getBrand(c.key)} onChange={setBrand} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Logo Uploads">
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
                <div key={logo.key} className="border border-gray-100 rounded-md p-4 bg-white">
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
          </SectionCard>
        </div>
      )}

      {/* ═══════ TYPOGRAPHY ═══════ */}
      {activeTab === 'typography' && (
        <SectionCard title="Typography Controls">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'heading_font', label: 'Heading Font', type: 'font' },
              { key: 'body_font', label: 'Body Font', type: 'font' },
              { key: 'display_font', label: 'Display Font', type: 'font' },
              { key: 'nav_font_size', label: 'Nav Font Size', type: 'fontsize' },
              { key: 'nav_font_weight', label: 'Nav Font Weight', type: 'text' },
              { key: 'nav_letter_spacing', label: 'Nav Letter Spacing', type: 'text' },
              { key: 'nav_text_transform', label: 'Nav Text Transform', type: 'select' },
              { key: 'hero_font_size', label: 'Hero Font Size', type: 'fontsize' },
              { key: 'hero_font_weight', label: 'Hero Font Weight', type: 'text' },
              { key: 'hero_line_height', label: 'Hero Line Height', type: 'text' },
              { key: 'hero_letter_spacing', label: 'Hero Letter Spacing', type: 'text' },
              { key: 'body_font_size', label: 'Body Font Size', type: 'fontsize' },
              { key: 'body_font_weight', label: 'Body Font Weight', type: 'text' },
              { key: 'body_line_height', label: 'Body Line Height', type: 'text' },
              { key: 'button_font_size', label: 'Button Font Size', type: 'fontsize' },
              { key: 'button_font_weight', label: 'Button Font Weight', type: 'text' },
              { key: 'button_letter_spacing', label: 'Button Letter Spacing', type: 'text' },
              { key: 'button_text_transform', label: 'Button Text Transform', type: 'select' },
              { key: 'footer_font_size', label: 'Footer Font Size', type: 'fontsize' },
              { key: 'breadcrumb_font_size', label: 'Breadcrumb Font Size', type: 'fontsize' },
            ].map((typo) => (
              <div key={typo.key}>
                <label className="block text-xs font-roboto text-gray-500 uppercase tracking-wider mb-1.5">{typo.label}</label>
                {typo.type === 'font' ? (
                  <SelectInput value={getTypo(typo.key) || 'Roboto'} options={[
                    { value: 'Jost', label: 'Jost' },
                    { value: 'Roboto', label: 'Roboto' },
                    { value: 'Prata', label: 'Prata' },
                    { value: 'Inter', label: 'Inter' },
                    { value: 'Montserrat', label: 'Montserrat' },
                    { value: 'Lato', label: 'Lato' },
                    { value: 'Playfair Display', label: 'Playfair Display' },
                  ]} onChange={(v) => setTypo(typo.key, v)} />
                ) : typo.type === 'fontsize' ? (
                  <SelectInput value={getTypo(typo.key) || '14'} options={[
                    { value: '10', label: '10px' },
                    { value: '12', label: '12px' },
                    { value: '14', label: '14px' },
                    { value: '18', label: '18px' },
                    { value: '24', label: '24px' },
                    { value: '26', label: '26px' },
                  ]} onChange={(v) => setTypo(typo.key, v)} />
                ) : typo.type === 'select' ? (
                  <SelectInput value={getTypo(typo.key) || 'none'} options={[
                    { value: 'none', label: 'None' },
                    { value: 'uppercase', label: 'Uppercase' },
                    { value: 'capitalize', label: 'Capitalize' },
                    { value: 'lowercase', label: 'Lowercase' },
                  ]} onChange={(v) => setTypo(typo.key, v)} />
                ) : (
                  <TextInput value={getTypo(typo.key)} onChange={(v) => setTypo(typo.key, v)} />
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ═══════ CURRENCY ═══════ */}
      {activeTab === 'currency' && <CurrencyManager />}

      {/* ═══════ LISTINGS PAGES ═══════ */}
      {activeTab === 'listings-pages' && (
        <>
          {/* Sub-tab Switcher */}
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-5">
            {(['buy', 'rent', 'search', 'layout'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setListingsSubtab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  listingsSubtab === tab ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <i className={`${tab === 'buy' ? 'ri-home-4-line' : tab === 'rent' ? 'ri-key-2-line' : tab === 'search' ? 'ri-search-2-line' : 'ri-layout-4-line'} text-sm`}></i>
                {tab === 'buy' ? 'Buy Page' : tab === 'rent' ? 'Rent Page' : tab === 'search' ? 'Search Page' : 'Layout & Defaults'}
              </button>
            ))}
          </div>

          {/* ─────── BUY / RENT / SEARCH PAGE HERO ─────── */}
          {listingsSubtab !== 'layout' && (
            <div className="space-y-5">
              {/* Hero Section */}
              <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-4">
                <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em]">Hero Section</h3>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Eyebrow Text</label>
                  <input
                    type="text"
                    placeholder="Premium Properties"
                    value={getProp(`${listingsPageKey}_hero_eyebrow`) || ''}
                    onChange={(e) => setProp(`${listingsPageKey}_hero_eyebrow`, e.target.value)}
                    className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                  />
                  <p className="text-xs text-stone-400">Small label above the main title.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Hero Title</label>
                  <input
                    type="text"
                    placeholder="Properties For Sale"
                    value={getProp(`${listingsPageKey}_hero_title`) || ''}
                    onChange={(e) => setProp(`${listingsPageKey}_hero_title`, e.target.value)}
                    className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">Hero Subtitle</label>
                  <textarea
                    rows={3}
                    placeholder="Subtitle text..."
                    value={getProp(`${listingsPageKey}_hero_subtitle`) || ''}
                    onChange={(e) => setProp(`${listingsPageKey}_hero_subtitle`, e.target.value)}
                    className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white resize-y"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700 block">Hero Background Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      id={`prop-hero-upload-${listingsPageKey}`}
                      className="hidden"
                      onChange={(e) => handlePropBgUpload(e, listingsPageKey)}
                    />
                    <label
                      htmlFor={`prop-hero-upload-${listingsPageKey}`}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1B4332] text-white text-sm rounded-md hover:bg-[#163828] disabled:opacity-60 cursor-pointer whitespace-nowrap transition-colors"
                    >
                      {uploadingPropBg ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : <><i className="ri-upload-cloud-2-line text-base"></i>Upload from Device</>}
                    </label>
                    {getProp(`${listingsPageKey}_hero_bg`) && (
                      <button
                        onClick={() => setProp(`${listingsPageKey}_hero_bg`, '')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 hover:text-red-700 cursor-pointer border border-red-200 rounded-md hover:border-red-300 transition-colors whitespace-nowrap"
                      >
                        <i className="ri-delete-bin-line"></i> Remove
                      </button>
                    )}
                  </div>
                  {getProp(`${listingsPageKey}_hero_bg`) && (
                    <div className="w-full h-24 rounded-md border border-stone-200 overflow-hidden mt-2 bg-stone-100">
                      <img src={getProp(`${listingsPageKey}_hero_bg`)} alt="Hero background preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    type="url"
                    value={getProp(`${listingsPageKey}_hero_bg`) || ''}
                    onChange={(e) => setProp(`${listingsPageKey}_hero_bg`, e.target.value)}
                    placeholder="or paste a URL directly…"
                    className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                  />
                  <p className="text-xs text-stone-400">Leave blank to use the default image.</p>
                </div>
              </div>

              {/* Hero Typography */}
              <div className="bg-white rounded-xl border border-stone-200/70 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <i className="ri-font-size text-[#1B4332] text-base"></i>
                  <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em]">Hero Typography</h3>
                </div>

                {/* Eyebrow */}
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Eyebrow / Label</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Font Family</label>
                      <select
                        value={getProp(`${listingsPageKey}_hero_eyebrow_font`) || ''}
                        onChange={(e) => setProp(`${listingsPageKey}_hero_eyebrow_font`, e.target.value)}
                        className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                      >
                        <option value="">Site Default</option>
                        {['Prata', 'Playfair Display', 'Cormorant Garamond', 'Montserrat', 'Roboto', 'Lato', 'Raleway', 'Inter'].map((f) => (
                          <option key={f} value={f}>{f} {['Prata','Playfair Display','Cormorant Garamond'].includes(f) ? '(Serif)' : '(Sans-serif)'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Font Weight</label>
                      <select
                        value={getProp(`${listingsPageKey}_hero_eyebrow_weight`) || '400'}
                        onChange={(e) => setProp(`${listingsPageKey}_hero_eyebrow_weight`, e.target.value)}
                        className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                      >
                        {['300','400','500','600','700','800'].map((w) => (
                          <option key={w} value={w}>{w} — {w === '300' ? 'Light' : w === '400' ? 'Regular' : w === '500' ? 'Medium' : w === '600' ? 'SemiBold' : w === '700' ? 'Bold' : 'ExtraBold'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Font Size</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="10" max="32"
                          value={getProp(`${listingsPageKey}_hero_eyebrow_size`) || '12'}
                          onChange={(e) => setProp(`${listingsPageKey}_hero_eyebrow_size`, e.target.value)}
                          className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                        />
                        <span className="text-sm text-stone-500 shrink-0">px</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Letter Spacing</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" step="0.01"
                          value={getProp(`${listingsPageKey}_hero_eyebrow_spacing`) || '0.3'}
                          onChange={(e) => setProp(`${listingsPageKey}_hero_eyebrow_spacing`, e.target.value)}
                          className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                        />
                        <span className="text-sm text-stone-500 shrink-0">em</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Text Transform</label>
                      <select
                        value={getProp(`${listingsPageKey}_hero_eyebrow_transform`) || 'uppercase'}
                        onChange={(e) => setProp(`${listingsPageKey}_hero_eyebrow_transform`, e.target.value)}
                        className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                      >
                        <option value="none">Normal</option>
                        <option value="uppercase">UPPERCASE</option>
                        <option value="capitalize">Capitalize</option>
                        <option value="lowercase">lowercase</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t border-stone-100 my-5"></div>

                {/* Title */}
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Hero Title</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Font Family</label>
                      <select
                        value={getProp(`${listingsPageKey}_hero_title_font`) || ''}
                        onChange={(e) => setProp(`${listingsPageKey}_hero_title_font`, e.target.value)}
                        className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                      >
                        <option value="">Site Default</option>
                        {['Prata', 'Playfair Display', 'Cormorant Garamond', 'Montserrat', 'Roboto', 'Lato', 'Raleway', 'Inter'].map((f) => (
                          <option key={f} value={f}>{f} {['Prata','Playfair Display','Cormorant Garamond'].includes(f) ? '(Serif)' : '(Sans-serif)'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Font Weight</label>
                      <select
                        value={getProp(`${listingsPageKey}_hero_title_weight`) || '400'}
                        onChange={(e) => setProp(`${listingsPageKey}_hero_title_weight`, e.target.value)}
                        className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                      >
                        {['300','400','500','600','700','800'].map((w) => (
                          <option key={w} value={w}>{w} — {w === '300' ? 'Light' : w === '400' ? 'Regular' : w === '500' ? 'Medium' : w === '600' ? 'SemiBold' : w === '700' ? 'Bold' : 'ExtraBold'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Font Size</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="20" max="96"
                          value={getProp(`${listingsPageKey}_hero_title_size`) || '48'}
                          onChange={(e) => setProp(`${listingsPageKey}_hero_title_size`, e.target.value)}
                          className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                        />
                        <span className="text-sm text-stone-500 shrink-0">px</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Letter Spacing</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" step="0.01"
                          value={getProp(`${listingsPageKey}_hero_title_spacing`) || '0'}
                          onChange={(e) => setProp(`${listingsPageKey}_hero_title_spacing`, e.target.value)}
                          className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                        />
                        <span className="text-sm text-stone-500 shrink-0">em</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Line Height</label>
                      <input
                        type="number" step="0.1"
                        value={getProp(`${listingsPageKey}_hero_title_lineheight`) || '1.1'}
                        onChange={(e) => setProp(`${listingsPageKey}_hero_title_lineheight`, e.target.value)}
                        placeholder="1.1"
                        className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Text Transform</label>
                      <select
                        value={getProp(`${listingsPageKey}_hero_title_transform`) || 'none'}
                        onChange={(e) => setProp(`${listingsPageKey}_hero_title_transform`, e.target.value)}
                        className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                      >
                        <option value="none">Normal</option>
                        <option value="uppercase">UPPERCASE</option>
                        <option value="capitalize">Capitalize</option>
                        <option value="lowercase">lowercase</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t border-stone-100 my-5"></div>

                {/* Subtitle */}
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Hero Subtitle</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Font Family</label>
                      <select
                        value={getProp(`${listingsPageKey}_hero_subtitle_font`) || ''}
                        onChange={(e) => setProp(`${listingsPageKey}_hero_subtitle_font`, e.target.value)}
                        className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                      >
                        <option value="">Site Default</option>
                        {['Prata', 'Playfair Display', 'Cormorant Garamond', 'Montserrat', 'Roboto', 'Lato', 'Raleway', 'Inter'].map((f) => (
                          <option key={f} value={f}>{f} {['Prata','Playfair Display','Cormorant Garamond'].includes(f) ? '(Serif)' : '(Sans-serif)'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Font Weight</label>
                      <select
                        value={getProp(`${listingsPageKey}_hero_subtitle_weight`) || '400'}
                        onChange={(e) => setProp(`${listingsPageKey}_hero_subtitle_weight`, e.target.value)}
                        className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                      >
                        {['300','400','500','600','700','800'].map((w) => (
                          <option key={w} value={w}>{w} — {w === '300' ? 'Light' : w === '400' ? 'Regular' : w === '500' ? 'Medium' : w === '600' ? 'SemiBold' : w === '700' ? 'Bold' : 'ExtraBold'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Font Size</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="10" max="32"
                          value={getProp(`${listingsPageKey}_hero_subtitle_size`) || '14'}
                          onChange={(e) => setProp(`${listingsPageKey}_hero_subtitle_size`, e.target.value)}
                          className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                        />
                        <span className="text-sm text-stone-500 shrink-0">px</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Letter Spacing</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" step="0.01"
                          value={getProp(`${listingsPageKey}_hero_subtitle_spacing`) || '0'}
                          onChange={(e) => setProp(`${listingsPageKey}_hero_subtitle_spacing`, e.target.value)}
                          className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                        />
                        <span className="text-sm text-stone-500 shrink-0">em</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700 block">Line Height</label>
                      <input
                        type="number" step="0.1"
                        value={getProp(`${listingsPageKey}_hero_subtitle_lineheight`) || '1.5'}
                        onChange={(e) => setProp(`${listingsPageKey}_hero_subtitle_lineheight`, e.target.value)}
                        placeholder="1.5"
                        className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Preview */}
                <div
                  className="rounded-lg overflow-hidden relative mt-5"
                  style={{
                    background: 'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.6))',
                    minHeight: 120,
                    padding: 24,
                  }}
                >
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">Hero Preview (dark bg)</p>
                  {(() => {
                    const ebFont = getProp(`${listingsPageKey}_hero_eyebrow_font`) || '';
                    const ebWeight = getProp(`${listingsPageKey}_hero_eyebrow_weight`) || '400';
                    const ebSize = getProp(`${listingsPageKey}_hero_eyebrow_size`) || '12';
                    const ebSpacing = getProp(`${listingsPageKey}_hero_eyebrow_spacing`) || '0.3';
                    const ebTransform = getProp(`${listingsPageKey}_hero_eyebrow_transform`) || 'uppercase';
                    const ebText = getProp(`${listingsPageKey}_hero_eyebrow`) || 'Eyebrow Text';

                    const tFont = getProp(`${listingsPageKey}_hero_title_font`) || '';
                    const tWeight = getProp(`${listingsPageKey}_hero_title_weight`) || '400';
                    const tSize = getProp(`${listingsPageKey}_hero_title_size`) || '48';
                    const tSpacing = getProp(`${listingsPageKey}_hero_title_spacing`) || '0';
                    const tLineH = getProp(`${listingsPageKey}_hero_title_lineheight`) || '1.1';
                    const tTransform = getProp(`${listingsPageKey}_hero_title_transform`) || 'none';
                    const tText = getProp(`${listingsPageKey}_hero_title`) || 'Hero Title';

                    const sFont = getProp(`${listingsPageKey}_hero_subtitle_font`) || '';
                    const sWeight = getProp(`${listingsPageKey}_hero_subtitle_weight`) || '400';
                    const sSize = getProp(`${listingsPageKey}_hero_subtitle_size`) || '14';
                    const sSpacing = getProp(`${listingsPageKey}_hero_subtitle_spacing`) || '0';
                    const sLineH = getProp(`${listingsPageKey}_hero_subtitle_lineheight`) || '1.5';
                    const sText = getProp(`${listingsPageKey}_hero_subtitle`) || 'Subtitle text goes here.';

                    return (
                      <>
                        <p style={{
                          fontWeight: ebWeight, fontSize: `${ebSize}px`,
                          letterSpacing: `${ebSpacing}em`, textTransform: ebTransform as any,
                          color: '#C9A84C', marginBottom: 6,
                          fontFamily: ebFont || undefined,
                        }}>{ebText}</p>
                        <p style={{
                          fontFamily: tFont || undefined, fontWeight: tWeight,
                          fontSize: `${tSize}px`, letterSpacing: `${tSpacing}em`,
                          lineHeight: tLineH, textTransform: tTransform as any,
                          color: '#FFFFFF', marginBottom: 8,
                        }}>{tText}</p>
                        <p style={{
                          fontFamily: sFont || undefined, fontWeight: sWeight,
                          fontSize: `${sSize}px`, letterSpacing: `${sSpacing}em`,
                          lineHeight: sLineH, color: 'rgba(255,255,255,0.7)',
                        }}>{sText}</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ─────── LAYOUT & DEFAULTS ─────── */}
          {listingsSubtab === 'layout' && (
            <div className="space-y-5">
              {/* CTA Banner */}
              <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-4">
                <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em]">CTA Banner</h3>
                <div className="flex items-start justify-between gap-4 py-3 border-b border-stone-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700">Show CTA Banner</p>
                    <p className="text-xs text-stone-400 mt-0.5">The 'Thinking of Selling?' banner at the bottom of the page.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProp('show_cta_banner', getProp('show_cta_banner') === 'true' ? 'false' : 'true')}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      getProp('show_cta_banner') !== 'false' ? 'bg-[#1B4332]' : 'bg-stone-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      getProp('show_cta_banner') !== 'false' ? 'translate-x-6' : 'translate-x-1'
                    }`}></span>
                  </button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">CTA Eyebrow</label>
                  <input
                    type="text"
                    value={getProp('cta_eyebrow') || 'Thinking of Selling?'}
                    onChange={(e) => setProp('cta_eyebrow', e.target.value)}
                    className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">CTA Title</label>
                  <input
                    type="text"
                    value={getProp('cta_title') || 'Get a Free Property Valuation'}
                    onChange={(e) => setProp('cta_title', e.target.value)}
                    className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">CTA Subtitle</label>
                  <textarea
                    rows={3}
                    value={getProp('cta_subtitle') || 'Our expert agents will assess your property and provide a no-obligation market valuation.'}
                    onChange={(e) => setProp('cta_subtitle', e.target.value)}
                    className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white resize-y"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">CTA Button Label</label>
                  <input
                    type="text"
                    value={getProp('cta_button_text') || 'Request Valuation'}
                    onChange={(e) => setProp('cta_button_text', e.target.value)}
                    className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700 block">CTA Button Link</label>
                  <input
                    type="url"
                    value={getProp('cta_button_link') || '/landlords'}
                    onChange={(e) => setProp('cta_button_link', e.target.value)}
                    className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                  />
                </div>
              </div>

              {/* Filter Options */}
              <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-1">
                <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em] mb-3">Filter Options</h3>
                {[
                  { key: 'show_filter_property_type', label: 'Show Property Type Filter' },
                  { key: 'show_filter_area', label: 'Show Area / Neighbourhood Filter' },
                  { key: 'show_filter_price', label: 'Show Price Range Filter' },
                  { key: 'show_filter_bedrooms', label: 'Show Bedrooms Filter' },
                ].map((f) => (
                  <div key={f.key} className="flex items-start justify-between gap-4 py-3 border-b border-stone-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-700">{f.label}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProp(f.key, getProp(f.key) === 'true' ? 'false' : 'true')}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        getProp(f.key) !== 'false' ? 'bg-[#1B4332]' : 'bg-stone-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        getProp(f.key) !== 'false' ? 'translate-x-6' : 'translate-x-1'
                      }`}></span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Default Sort & View */}
              <div className="bg-white rounded-xl border border-stone-200/70 p-5 space-y-4">
                <h3 className="text-[13px] font-jost font-semibold text-stone-800 uppercase tracking-[0.12em]">Default Sort &amp; View</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-700 block">Default Sort Order</label>
                    <select
                      value={getProp('listings_default_sort') || 'newest'}
                      onChange={(e) => setProp('listings_default_sort', e.target.value)}
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="price_low">Price — Low to High</option>
                      <option value="price_high">Price — High to Low</option>
                      <option value="name">Name — A to Z</option>
                      <option value="featured">Featured First</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-700 block">Default View</label>
                    <select
                      value={getProp('listings_default_view') || 'grid'}
                      onChange={(e) => setProp('listings_default_view', e.target.value)}
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                    >
                      <option value="grid">Grid</option>
                      <option value="list">List</option>
                      <option value="map">Map View</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-700 block">Properties Per Page</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="4" max="48"
                        value={getProp('listings_per_page') || '12'}
                        onChange={(e) => setProp('listings_per_page', e.target.value)}
                        className="flex-1 border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                      />
                      <span className="text-sm text-stone-500 shrink-0">props</span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1">Number of properties shown per page (4–48).</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-700 block">Grid Columns (Desktop)</label>
                    <select
                      value={getProp('listings_grid_columns') || '3'}
                      onChange={(e) => setProp('listings_grid_columns', e.target.value)}
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 transition-colors bg-white"
                    >
                      <option value="2">2 columns</option>
                      <option value="3">3 columns</option>
                      <option value="4">4 columns</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════ DASHBOARD MENU (NEW) ═══════ */}
      {activeTab === 'dashboard-menu' && (
        <SectionCard title="Dashboard Menu">
          <div className="space-y-4">
            <p className="text-[13px] text-stone-500 font-roboto">
              Manage admin navigation items from the Menu Manager page. Changes to menu order, visibility and permissions are controlled there.
            </p>
            <Link to="/crm/menu" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B4332] text-white rounded-lg text-[13px] font-roboto transition-all hover:bg-[#15382A]">
              <Settings size={14} />
              Open Menu Manager
            </Link>
            <div className="flex items-center gap-2 p-3 bg-stone-100/80 border border-stone-200/70 rounded-lg mt-2">
              <Info size={14} className="text-stone-500 flex-shrink-0" />
              <p className="text-[11px] text-stone-600 font-roboto">The Menu Manager controls sidebar visibility, sort order, icons and role-based access for all admin pages.</p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ═══════ CACHE / SYNC (NEW) ═══════ */}
      {activeTab === 'cache' && (
        <div className="space-y-5">
          <SectionCard title="Cache Controls">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-stone-200/70 rounded-lg bg-stone-50/50">
                <div>
                  <p className="text-[13px] font-roboto font-medium text-stone-800">Clear Site Cache</p>
                  <p className="text-[11px] text-stone-400 font-roboto mt-0.5">Last cleared: {getSite('cache_last_cleared') || 'Never'}</p>
                </div>
                <button
                  onClick={() => {
                    setSite('cache_last_cleared', new Date().toLocaleString());
                    handleSave();
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200/80 rounded-lg text-[11px] font-roboto cursor-pointer transition-colors text-stone-600"
                >
                  <RefreshCw size={12} /> Clear Cache
                </button>
              </div>
              <ToggleRow label="Enable Listing Cache" desc="Cache listing data for faster page loads" value={getSite('enable_listing_cache') === 'true'} onToggle={() => toggleSite('enable_listing_cache')} />
              <ToggleRow label="Enable Settings Cache" desc="Cache site settings for faster page loads" value={getSite('enable_settings_cache') === 'true'} onToggle={() => toggleSite('enable_settings_cache')} />
              <Field label="Listings Cache TTL (seconds)">
                <NumberInput value={getSite('cache_ttl') || '3600'} onChange={(v) => setSite('cache_ttl', v)} />
              </Field>
              <p className="text-[11px] text-stone-400 font-roboto">3600 seconds = 60 minutes. Lower values refresh more often but increase database load.</p>
            </div>
          </SectionCard>

          <SectionCard title="Auto-Publish & Sync">
            <div className="space-y-4">
              <ToggleRow label="Auto-publish Approved Listings" desc="Approved listings go live immediately without manual publish" value={getSite('auto_publish') === 'true'} onToggle={() => toggleSite('auto_publish')} />
              <ToggleRow label="Auto-delete Draft Listings" desc="Remove draft listings after a set number of days" value={getSite('auto_delete_drafts') === 'true'} onToggle={() => toggleSite('auto_delete_drafts')} />
              <Field label="Draft Deletion After (days)">
                <NumberInput value={getSite('draft_delete_days') || '30'} onChange={(v) => setSite('draft_delete_days', v)} />
              </Field>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}