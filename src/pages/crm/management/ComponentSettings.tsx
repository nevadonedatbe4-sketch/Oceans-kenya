import { useState } from 'react';
import { Settings } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import { useManagementData } from '@/hooks/useManagementData';

type TabKey = 'property-card' | 'hero' | 'cta' | 'navbar' | 'footer' | 'search-bar' | 'breadcrumbs' | 'property-detail';

interface Tab {
  key: TabKey;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { key: 'property-card', label: 'Property Card', icon: 'ri-layout-grid-2-line' },
  { key: 'hero', label: 'Hero Section', icon: 'ri-image-2-line' },
  { key: 'cta', label: 'CTA Block', icon: 'ri-megaphone-line' },
  { key: 'navbar', label: 'Navbar', icon: 'ri-menu-line' },
  { key: 'footer', label: 'Footer', icon: 'ri-layout-bottom-2-line' },
  { key: 'search-bar', label: 'Search Bar', icon: 'ri-search-2-line' },
  { key: 'breadcrumbs', label: 'Breadcrumbs', icon: 'ri-arrow-right-s-line' },
  { key: 'property-detail', label: 'Property Detail', icon: 'ri-file-list-3-line' },
];

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      className={`relative w-11 h-6 shrink-0 rounded-full transition-colors duration-300 cursor-pointer ${enabled ? 'bg-[#1B4332]' : 'bg-stone-300'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

function SettingRow({ label, description, enabled, onChange }: { label: string; description?: string; enabled: boolean; onChange: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-stone-50 last:border-0">
      <div>
        <p className="text-[13px] text-stone-700 font-medium">{label}</p>
        {description && <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} />
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-stone-200 rounded-md px-3 py-2 text-[13px] font-sans text-stone-700 placeholder:text-stone-300 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/10 transition-colors"
      />
    </div>
  );
}

function SectionHeading({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div className="w-7 h-7 rounded-md bg-[#1B4332]/8 flex items-center justify-center">
        <i className={`${icon} text-[#1B4332] text-sm`}></i>
      </div>
      <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
    </div>
  );
}

function SectionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-3">{label}</h4>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

export default function ComponentSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('navbar');
  const data = useManagementData();
  const {
    getCard, setCard, getHero, setHero, getSite, setSite,
    getBread, setBread, getSearch, setSearch, getCard: _getSearch,
    searchFilters, breadcrumbSettings, detailLayout,
    moveSearchUp, moveSearchDown, toggleDetailVisible,
    moveDetailUp, moveDetailDown, saving, handleSave,
  } = data;

  const [local, setLocal] = useState({
    // Navbar
    stickyNavbar: getSite('sticky_navbar') === 'true',
    transparentHero: getSite('transparent_navbar') === 'true',
    showPhone: getSite('nav_show_phone') === 'true',
    showCTA: getSite('nav_show_cta') === 'true',
    ctaLabel: getSite('nav_cta_label') || 'Get Valuation',
    ctaLink: getSite('nav_cta_link') || '/landlords',

    // Property Card
    cardShadow: getCard('card_shadow') === 'true',
    cardHoverLift: getCard('card_hover_lift') === 'true',
    showBadge: getCard('card_show_badge') === 'true',
    showAgent: getCard('card_show_agent') === 'true',
    imageRatio: getCard('card_image_ratio') || '4/3',
    badgeColor: getCard('card_badge_color') || '#1B4332',

    // Hero
    heroAutoplay: getHero('hero_autoplay') === 'true',
    heroOverlay: getHero('hero_show_overlay') === 'true',
    heroSearch: getHero('hero_show_search') === 'true',
    heroDots: getHero('hero_show_dots') === 'true',
    heroHeight: getHero('hero_height') || '600',
    heroOverlayOpacity: getHero('hero_overlay_opacity') || '30',

    // CTA
    ctaShowBg: getSite('cta_show_background') === 'true',
    ctaFullWidth: getSite('cta_full_width') === 'true',
    ctaShowIcon: getSite('cta_show_icon') === 'true',
    ctaAlignment: getSite('cta_alignment') || 'center',
    ctaBlockLabel: getSite('cta_default_label') || 'Book a Consultation',
    ctaBlockLink: getSite('cta_default_link') || '/contact',

    // Footer
    footerShowLogo: getSite('footer_show_logo') === 'true',
    footerShowSocial: getSite('footer_show_social') === 'true',
    footerShowNewsletter: getSite('footer_show_newsletter') === 'true',
    footerColumns: getSite('footer_columns') || '4',
    footerBg: getSite('footer_background') || '#1B4332',
    footerTextColor: getSite('footer_text_color') || '#FFFFFF',

    // Breadcrumbs
    breadcrumbsEnabled: getBread('enable_breadcrumbs') === 'true',
    breadcrumbsShowHome: getBread('show_home_link') !== 'false',
    breadcrumbBg: getBread('background_color') || '#F5F5F4',
    breadcrumbSeparator: getBread('separator_style') || 'slash',
  });

  const update = (key: string, value: any) => setLocal((prev) => ({ ...prev, [key]: value }));
  const toggle = (key: string) => setLocal((prev) => ({ ...prev, [key]: !(prev as any)[key] }));

  const syncToHook = () => {
    setCard('card_shadow', local.cardShadow ? 'true' : 'false');
    setCard('card_hover_lift', local.cardHoverLift ? 'true' : 'false');
    setCard('card_show_badge', local.showBadge ? 'true' : 'false');
    setCard('card_show_agent', local.showAgent ? 'true' : 'false');
    setCard('card_image_ratio', local.imageRatio);
    setCard('card_badge_color', local.badgeColor);

    setHero('hero_autoplay', local.heroAutoplay ? 'true' : 'false');
    setHero('hero_show_overlay', local.heroOverlay ? 'true' : 'false');
    setHero('hero_show_search', local.heroSearch ? 'true' : 'false');
    setHero('hero_show_dots', local.heroDots ? 'true' : 'false');
    setHero('hero_height', local.heroHeight);
    setHero('hero_overlay_opacity', local.heroOverlayOpacity);

    setSite('sticky_navbar', local.stickyNavbar ? 'true' : 'false');
    setSite('transparent_navbar', local.transparentHero ? 'true' : 'false');
    setSite('nav_show_phone', local.showPhone ? 'true' : 'false');
    setSite('nav_show_cta', local.showCTA ? 'true' : 'false');
    setSite('nav_cta_label', local.ctaLabel);
    setSite('nav_cta_link', local.ctaLink);

    setSite('cta_show_background', local.ctaShowBg ? 'true' : 'false');
    setSite('cta_full_width', local.ctaFullWidth ? 'true' : 'false');
    setSite('cta_show_icon', local.ctaShowIcon ? 'true' : 'false');
    setSite('cta_alignment', local.ctaAlignment);
    setSite('cta_default_label', local.ctaBlockLabel);
    setSite('cta_default_link', local.ctaBlockLink);

    setSite('footer_show_logo', local.footerShowLogo ? 'true' : 'false');
    setSite('footer_show_social', local.footerShowSocial ? 'true' : 'false');
    setSite('footer_show_newsletter', local.footerShowNewsletter ? 'true' : 'false');
    setSite('footer_columns', local.footerColumns);
    setSite('footer_background', local.footerBg);
    setSite('footer_text_color', local.footerTextColor);

    setBread('enable_breadcrumbs', local.breadcrumbsEnabled ? 'true' : 'false');
    setBread('show_home_link', local.breadcrumbsShowHome ? 'true' : 'false');
    setBread('background_color', local.breadcrumbBg);
    setBread('separator_style', local.breadcrumbSeparator);
  };

  const onSave = async () => {
    syncToHook();
    await handleSave();
  };

  const renderSaveBar = () => (
    <div className="sticky bottom-0 z-10 -mx-6 px-6 py-3 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent">
      <div className="bg-white border border-stone-200 rounded-xl px-5 py-3 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-stone-400">Changes are saved to the database immediately.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 text-[13px] font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#1B4332]/90 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            <i className="ri-save-3-line text-sm"></i>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ManagementLayout title="Component Settings" description="Configure reusable components used across the site — property cards, hero sections, CTAs, navbar and footer." icon={<Settings size={20} className="text-[#1B4332]" />}>
      <div className="max-w-[820px] space-y-6 pb-24">
        {/* Tab Switcher */}
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex border-b border-stone-100 overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 -mb-px ${
                    isActive
                      ? 'border-[#1B4332] text-[#1B4332] bg-[#1B4332]/3'
                      : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className={`${tab.icon} text-sm`}></i>
                  </span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'property-card' && (
              <div className="space-y-6">
                <SectionHeading icon="ri-layout-grid-2-line" title="Property Card Settings" />
                <SectionGroup label="Behaviour">
                  <SettingRow label="Card Shadow" description="Show a subtle shadow beneath each property card." enabled={local.cardShadow} onChange={() => toggle('cardShadow')} />
                  <SettingRow label="Hover Lift" description="Cards gently lift on hover for interactive feedback." enabled={local.cardHoverLift} onChange={() => toggle('cardHoverLift')} />
                </SectionGroup>
                <SectionGroup label="Content">
                  <SettingRow label="Show Status Badge" description="Display For Sale / For Rent badge on the card." enabled={local.showBadge} onChange={() => toggle('showBadge')} />
                  <SettingRow label="Show Agent Info" description="Include agent name and photo on each card." enabled={local.showAgent} onChange={() => toggle('showAgent')} />
                </SectionGroup>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest">Image Ratio</label>
                    <select
                      value={local.imageRatio}
                      onChange={(e) => update('imageRatio', e.target.value)}
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-[13px] font-sans text-stone-700 bg-white focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/10 transition-colors cursor-pointer"
                    >
                      <option value="4/3">4:3 — Standard</option>
                      <option value="16/9">16:9 — Widescreen</option>
                      <option value="3/2">3:2 — Classic</option>
                      <option value="1/1">1:1 — Square</option>
                    </select>
                  </div>
                  <TextInput label="Badge Colour" value={local.badgeColor} onChange={(v) => update('badgeColor', v)} />
                </div>
              </div>
            )}

            {activeTab === 'hero' && (
              <div className="space-y-6">
                <SectionHeading icon="ri-image-2-line" title="Hero Section Settings" />
                <SectionGroup label="Slideshow">
                  <SettingRow label="Autoplay" description="Automatically cycle through hero slides." enabled={local.heroAutoplay} onChange={() => toggle('heroAutoplay')} />
                  <SettingRow label="Show Dots" description="Display navigation dots at the bottom of the hero." enabled={local.heroDots} onChange={() => toggle('heroDots')} />
                </SectionGroup>
                <SectionGroup label="Overlay">
                  <SettingRow label="Dark Overlay" description="Apply a dark gradient overlay for text readability." enabled={local.heroOverlay} onChange={() => toggle('heroOverlay')} />
                  <SettingRow label="Show Search Bar" description="Display the property search bar inside the hero." enabled={local.heroSearch} onChange={() => toggle('heroSearch')} />
                </SectionGroup>
                <div className="grid grid-cols-2 gap-4">
                  <TextInput label="Hero Height (px)" value={local.heroHeight} onChange={(v) => update('heroHeight', v)} />
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest">Overlay Opacity</label>
                    <select
                      value={local.heroOverlayOpacity}
                      onChange={(e) => update('heroOverlayOpacity', e.target.value)}
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-[13px] font-sans text-stone-700 bg-white focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/10 transition-colors cursor-pointer"
                    >
                      <option value="10">10% — Very Light</option>
                      <option value="20">20% — Light</option>
                      <option value="30">30% — Medium</option>
                      <option value="40">40% — Strong</option>
                      <option value="50">50% — Heavy</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'cta' && (
              <div className="space-y-6">
                <SectionHeading icon="ri-megaphone-line" title="CTA Block Settings" />
                <SectionGroup label="Layout">
                  <SettingRow label="Full Width" description="Stretch CTA block to fill the entire viewport width." enabled={local.ctaFullWidth} onChange={() => toggle('ctaFullWidth')} />
                  <SettingRow label="Show Background" description="Display a branded background behind the CTA block." enabled={local.ctaShowBg} onChange={() => toggle('ctaShowBg')} />
                  <SettingRow label="Show Icon" description="Include a decorative icon next to the CTA text." enabled={local.ctaShowIcon} onChange={() => toggle('ctaShowIcon')} />
                </SectionGroup>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest">Text Alignment</label>
                  <div className="flex gap-1 bg-stone-50 rounded-lg p-1 w-fit">
                    {['left', 'center', 'right'].map((align) => (
                      <button
                        key={align}
                        onClick={() => update('ctaAlignment', align)}
                        className={`px-4 py-1.5 text-[12px] font-medium rounded-md transition-colors cursor-pointer capitalize ${
                          local.ctaAlignment === align ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <TextInput label="Default CTA Label" value={local.ctaBlockLabel} onChange={(v) => update('ctaBlockLabel', v)} />
                  <TextInput label="Default CTA Link" value={local.ctaBlockLink} onChange={(v) => update('ctaBlockLink', v)} />
                </div>
              </div>
            )}

            {activeTab === 'navbar' && (
              <div className="space-y-6">
                <SectionHeading icon="ri-menu-line" title="Navbar Settings" />
                <SectionGroup label="Behaviour">
                  <SettingRow label="Sticky Navbar" description="Keep navbar fixed at the top when scrolling." enabled={local.stickyNavbar} onChange={() => toggle('stickyNavbar')} />
                  <SettingRow label="Transparent on Hero" description="Start transparent, become solid on scroll." enabled={local.transparentHero} onChange={() => toggle('transparentHero')} />
                </SectionGroup>
                <SectionGroup label="Elements">
                  <SettingRow label="Show Phone Number" enabled={local.showPhone} onChange={() => toggle('showPhone')} />
                  <SettingRow label="Show CTA Button" enabled={local.showCTA} onChange={() => toggle('showCTA')} />
                </SectionGroup>
                <div className="grid grid-cols-2 gap-4">
                  <TextInput label="CTA Button Label" value={local.ctaLabel} onChange={(v) => update('ctaLabel', v)} />
                  <TextInput label="CTA Button Link" value={local.ctaLink} onChange={(v) => update('ctaLink', v)} />
                </div>
              </div>
            )}

            {activeTab === 'footer' && (
              <div className="space-y-6">
                <SectionHeading icon="ri-layout-bottom-2-line" title="Footer Settings" />
                <SectionGroup label="Content">
                  <SettingRow label="Show Logo" description="Display the brand logo in the footer." enabled={local.footerShowLogo} onChange={() => toggle('footerShowLogo')} />
                  <SettingRow label="Show Social Icons" description="Show social media links with icons." enabled={local.footerShowSocial} onChange={() => toggle('footerShowSocial')} />
                  <SettingRow label="Show Newsletter" description="Include a newsletter subscription form." enabled={local.footerShowNewsletter} onChange={() => toggle('footerShowNewsletter')} />
                </SectionGroup>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest">Column Layout</label>
                  <div className="flex gap-1 bg-stone-50 rounded-lg p-1 w-fit">
                    {['2', '3', '4', '5'].map((col) => (
                      <button
                        key={col}
                        onClick={() => update('footerColumns', col)}
                        className={`px-4 py-1.5 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                          local.footerColumns === col ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        {col} Col
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <TextInput label="Footer Background" value={local.footerBg} onChange={(v) => update('footerBg', v)} />
                  <TextInput label="Text Colour" value={local.footerTextColor} onChange={(v) => update('footerTextColor', v)} />
                </div>
              </div>
            )}

            {activeTab === 'search-bar' && (
              <div className="space-y-6">
                <SectionHeading icon="ri-search-2-line" title="Search Bar Filters" />
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Toggle which filter fields appear in the property search bar. Drag to reorder — top fields appear first.
                </p>
                <SectionGroup label="Active Filters">
                  {searchFilters.map((filter, idx) => (
                    <div key={filter.id} className="flex items-center justify-between gap-3 py-3 border-b border-stone-50 last:border-0 group">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-stone-300 w-5">{String(idx + 1).padStart(2, '0')}</span>
                        <p className="text-[13px] text-stone-700 font-medium">{filter.label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSearch(filter.key, { enabled: !filter.enabled })}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-widest transition-colors cursor-pointer ${
                            filter.enabled ? 'bg-[#1B4332]/8 text-[#1B4332]' : 'bg-stone-100 text-stone-400'
                          }`}
                        >
                          {filter.enabled ? 'Enabled' : 'Hidden'}
                        </button>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveSearchUp(idx)} disabled={idx === 0} className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                            <i className="ri-arrow-up-s-line text-sm"></i>
                          </button>
                          <button onClick={() => moveSearchDown(idx)} disabled={idx === searchFilters.length - 1} className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                            <i className="ri-arrow-down-s-line text-sm"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </SectionGroup>
              </div>
            )}

            {activeTab === 'breadcrumbs' && (
              <div className="space-y-6">
                <SectionHeading icon="ri-arrow-right-s-line" title="Breadcrumb Settings" />
                <SectionGroup label="Visibility">
                  <SettingRow label="Enable Breadcrumbs" description="Show breadcrumb navigation on interior pages." enabled={local.breadcrumbsEnabled} onChange={() => toggle('breadcrumbsEnabled')} />
                  <SettingRow label="Show Home Link" description="Always include a link back to the homepage." enabled={local.breadcrumbsShowHome} onChange={() => toggle('breadcrumbsShowHome')} />
                </SectionGroup>
                <div className="grid grid-cols-2 gap-4">
                  <TextInput label="Background Colour" value={local.breadcrumbBg} onChange={(v) => update('breadcrumbBg', v)} />
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest">Separator Style</label>
                    <select
                      value={local.breadcrumbSeparator}
                      onChange={(e) => update('breadcrumbSeparator', e.target.value)}
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-[13px] font-sans text-stone-700 bg-white focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/10 transition-colors cursor-pointer"
                    >
                      <option value="slash">/ — Slash</option>
                      <option value="chevron">› — Chevron</option>
                      <option value="arrow">→ — Arrow</option>
                      <option value="pipe">| — Pipe</option>
                      <option value="dot">• — Dot</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'property-detail' && (
              <div className="space-y-6">
                <SectionHeading icon="ri-file-list-3-line" title="Property Detail Layout" />
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Toggle which sections appear on the property detail page. Reorder to change their position on the page.
                </p>
                <SectionGroup label="Sections">
                  {detailLayout.map((section, idx) => (
                    <div key={section.id} className="flex items-center justify-between gap-3 py-3 border-b border-stone-50 last:border-0 group">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-stone-300 w-5">{String(idx + 1).padStart(2, '0')}</span>
                        <p className="text-[13px] text-stone-700 font-medium">{section.label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleDetailVisible(idx)}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-widest transition-colors cursor-pointer ${
                            section.visible ? 'bg-[#1B4332]/8 text-[#1B4332]' : 'bg-stone-100 text-stone-400'
                          }`}
                        >
                          {section.visible ? 'Visible' : 'Hidden'}
                        </button>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveDetailUp(idx)} disabled={idx === 0} className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                            <i className="ri-arrow-up-s-line text-sm"></i>
                          </button>
                          <button onClick={() => moveDetailDown(idx)} disabled={idx === detailLayout.length - 1} className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                            <i className="ri-arrow-down-s-line text-sm"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </SectionGroup>
              </div>
            )}
          </div>
        </div>

        {renderSaveBar()}
      </div>
    </ManagementLayout>
  );
}