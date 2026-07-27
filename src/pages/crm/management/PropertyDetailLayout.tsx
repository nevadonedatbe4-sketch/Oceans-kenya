import { useState } from 'react';
import ManagementLayout from '../ManagementLayout';

interface DetailSection {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  sort_order: number;
}

const INITIAL_SECTIONS: DetailSection[] = [
  { id: 'overview', label: 'Overview', icon: 'ri-grid-line', enabled: true, sort_order: 1 },
  { id: 'description', label: 'Description', icon: 'ri-file-text-line', enabled: true, sort_order: 2 },
  { id: 'address', label: 'Address', icon: 'ri-map-pin-2-line', enabled: true, sort_order: 3 },
  { id: 'details', label: 'Details', icon: 'ri-list-check-2', enabled: true, sort_order: 4 },
  { id: 'features', label: 'Features', icon: 'ri-checkbox-multiple-line', enabled: true, sort_order: 5 },
  { id: 'adsense1', label: 'Adsense Space 1', icon: 'ri-advertisement-line', enabled: true, sort_order: 6 },
  { id: 'schedule-tour-v2', label: 'Schedule Tour v2', icon: 'ri-calendar-check-line', enabled: true, sort_order: 7 },
  { id: 'similar', label: 'Similar Listings', icon: 'ri-building-4-line', enabled: true, sort_order: 8 },
  { id: 'overview-v2', label: 'Overview v2', icon: 'ri-dashboard-line', enabled: false, sort_order: 9 },
  { id: 'nearby', label: 'Nearby Places', icon: 'ri-map-2-line', enabled: false, sort_order: 10 },
  { id: 'section-gallery', label: 'Section Gallery', icon: 'ri-image-2-line', enabled: false, sort_order: 11 },
  { id: 'schedule-tour', label: 'Schedule Tour', icon: 'ri-calendar-line', enabled: false, sort_order: 12 },
  { id: 'energy', label: 'Energy Class', icon: 'ri-leaf-line', enabled: false, sort_order: 13 },
  { id: 'floorplan', label: 'Floor Plans', icon: 'ri-layout-2-line', enabled: false, sort_order: 14 },
  { id: 'video', label: 'Video', icon: 'ri-video-line', enabled: false, sort_order: 15 },
  { id: 'multi-unit', label: 'Multi Unit / Sub Listings', icon: 'ri-building-2-line', enabled: false, sort_order: 16 },
  { id: 'adsense2', label: 'Adsense Space 2', icon: 'ri-advertisement-line', enabled: false, sort_order: 17 },
  { id: 'agent', label: 'Agent Contact', icon: 'ri-user-star-line', enabled: false, sort_order: 18 },
  { id: 'inquiry', label: 'Inquiry Form', icon: 'ri-chat-1-line', enabled: false, sort_order: 19 },
  { id: 'documents', label: 'Documents', icon: 'ri-file-pdf-2-line', enabled: false, sort_order: 20 },
  { id: 'virtual-tour', label: 'Virtual Tour', icon: 'ri-global-line', enabled: false, sort_order: 21 },
  { id: 'mortgage', label: 'Mortgage Calculator', icon: 'ri-calculator-line', enabled: false, sort_order: 22 },
  { id: 'walk-score', label: 'Walk Score', icon: 'ri-walk-line', enabled: false, sort_order: 23 },
  { id: 'price-history', label: 'Price History', icon: 'ri-history-line', enabled: false, sort_order: 24 },
];

type SubTab = 'section-layout' | 'overview' | 'media-tabs' | 'layout-controls';

export default function PropertyDetailLayoutPage() {
  const [sections, setSections] = useState<DetailSection[]>(INITIAL_SECTIONS);
  const [activeTab, setActiveTab] = useState<SubTab>('section-layout');
  const [saving, setSaving] = useState(false);

  const enabledSections = sections.filter((s) => s.enabled);
  const disabledSections = sections.filter((s) => !s.enabled);

  const toggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const moveUp = (id: string) => {
    setSections((prev) => {
      const enabledList = prev.filter((s) => s.enabled);
      const disabledList = prev.filter((s) => !s.enabled);
      const idx = enabledList.findIndex((s) => s.id === id);
      if (idx <= 0) return prev;
      [enabledList[idx - 1], enabledList[idx]] = [enabledList[idx], enabledList[idx - 1]];
      return [...enabledList, ...disabledList];
    });
  };

  const moveDown = (id: string) => {
    setSections((prev) => {
      const enabledList = prev.filter((s) => s.enabled);
      const disabledList = prev.filter((s) => !s.enabled);
      const idx = enabledList.findIndex((s) => s.id === id);
      if (idx < 0 || idx >= enabledList.length - 1) return prev;
      [enabledList[idx], enabledList[idx + 1]] = [enabledList[idx + 1], enabledList[idx]];
      return [...enabledList, ...disabledList];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
  };

  return (
    <ManagementLayout
      title="Property Detail Layout Manager"
      description="Control section order, visibility, overview fields, media tabs, and layout settings for all property detail pages."
      icon={<i className="ri-layout-masonry-line text-[#1B4332] text-lg"></i>}
    >
      <div className="space-y-5 pb-24">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1" />
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg hover:bg-[#163828] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {saving ? (
                <><i className="ri-loader-4-line animate-spin"></i> Saving...</>
              ) : (
                <><i className="ri-save-line"></i> Save Layout</>
              )}
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#1B4332]/5 border border-[#1B4332]/10 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
          <p className="text-sm text-stone-700">
            <span className="font-medium">{enabledSections.length} sections enabled</span> · 5 overview fields · 1 media tab · Content layout: <span className="font-medium capitalize">boxed</span>
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex bg-white border border-stone-200 rounded-xl p-1 gap-1 overflow-x-auto">
          {([
            { key: 'section-layout' as SubTab, icon: 'ri-layout-masonry-line', label: 'Section Layout' },
            { key: 'overview' as SubTab, icon: 'ri-grid-line', label: 'Overview' },
            { key: 'media-tabs' as SubTab, icon: 'ri-image-2-line', label: 'Media Tabs' },
            { key: 'layout-controls' as SubTab, icon: 'ri-settings-3-line', label: 'Layout & Controls' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap flex-1 justify-center ${
                activeTab === tab.key
                  ? 'bg-[#1B4332] text-white'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-[#f5f5f5]'
              }`}
            >
              <i className={`${tab.icon} text-sm`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Section Layout Tab */}
        {activeTab === 'section-layout' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Enabled Sections */}
              <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">Enabled Sections</p>
                    <p className="text-xs text-stone-400 mt-0.5">{enabledSections.length} active · drag to reorder</p>
                  </div>
                  <i className="ri-drag-move-2-line text-stone-300 text-lg"></i>
                </div>
                <div className="divide-y divide-stone-100 min-h-[60px]">
                  {enabledSections.map((section, index) => (
                    <div
                      key={section.id}
                      draggable
                      className="flex items-center gap-3 px-4 py-3.5 transition-all select-none cursor-grab active:cursor-grabbing hover:bg-[#f5f5f5]/60"
                    >
                      <i className="ri-drag-move-2-line text-stone-300 text-sm shrink-0"></i>
                      <div className="w-5 h-5 flex items-center justify-center bg-[#1B4332]/10 text-[#1B4332] rounded-full text-[10px] font-bold shrink-0">
                        {index + 1}
                      </div>
                      <div className="w-7 h-7 flex items-center justify-center bg-[#1B4332]/8 rounded-lg shrink-0">
                        <i className={`${section.icon} text-[#1B4332] text-sm`}></i>
                      </div>
                      <span className="flex-1 text-sm font-medium text-stone-800 truncate">{section.label}</span>
                      <div className="flex flex-col gap-0 shrink-0">
                        <button
                          onClick={() => moveUp(section.id)}
                          disabled={index === 0}
                          className="w-4 h-4 flex items-center justify-center text-stone-300 hover:text-stone-600 disabled:opacity-20 cursor-pointer"
                        >
                          <i className="ri-arrow-up-s-line text-xs"></i>
                        </button>
                        <button
                          onClick={() => moveDown(section.id)}
                          disabled={index === enabledSections.length - 1}
                          className="w-4 h-4 flex items-center justify-center text-stone-300 hover:text-stone-600 disabled:opacity-20 cursor-pointer"
                        >
                          <i className="ri-arrow-down-s-line text-xs"></i>
                        </button>
                      </div>
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="relative w-9 h-5 rounded-full bg-[#1B4332] transition-colors cursor-pointer shrink-0"
                      >
                        <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow"></span>
                      </button>
                    </div>
                  ))}
                  {enabledSections.length === 0 && (
                    <div className="flex items-center justify-center py-10 text-sm text-stone-400">
                      No enabled sections.
                    </div>
                  )}
                </div>
              </div>

              {/* Disabled Sections */}
              <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-100">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">Disabled Sections</p>
                    <p className="text-xs text-stone-400 mt-0.5">{disabledSections.length} hidden · toggle to enable</p>
                  </div>
                </div>
                <div className="divide-y divide-stone-100 min-h-[60px]">
                  {disabledSections.map((section) => (
                    <div
                      key={section.id}
                      className="flex items-center gap-3 px-4 py-3.5 bg-[#f5f5f5]/40 hover:bg-[#f5f5f5] transition-colors"
                    >
                      <div className="w-5 h-5 shrink-0"></div>
                      <div className="w-5 h-5 flex items-center justify-center bg-stone-100 rounded-full shrink-0">
                        <i className="ri-eye-off-line text-stone-400 text-[9px]"></i>
                      </div>
                      <div className="w-7 h-7 flex items-center justify-center bg-stone-100 rounded-lg shrink-0">
                        <i className={`${section.icon} text-stone-400 text-sm`}></i>
                      </div>
                      <span className="flex-1 text-sm font-medium text-stone-400 truncate">{section.label}</span>
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="relative w-9 h-5 rounded-full bg-stone-200 transition-colors cursor-pointer shrink-0"
                      >
                        <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow"></span>
                      </button>
                    </div>
                  ))}
                  {disabledSections.length === 0 && (
                    <div className="flex items-center justify-center py-10 text-sm text-stone-400">
                      All sections are enabled.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-start gap-4 pb-4 border-b border-stone-100">
              <div className="w-9 h-9 flex items-center justify-center bg-[#1B4332]/10 rounded-lg shrink-0">
                <i className="ri-grid-line text-[#1B4332] text-base"></i>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-800">Overview Field Configuration</h3>
                <p className="text-xs text-stone-400 mt-0.5">Choose which property fields appear in the Overview section at the top of each detail page.</p>
              </div>
            </div>
            <div className="pt-4 space-y-2">
              {[
                { label: 'Price', desc: 'Display the main price with currency symbol', icon: 'ri-price-tag-3-line' },
                { label: 'Property Type', desc: 'Show type badge (Villa, Apartment, etc.)', icon: 'ri-home-4-line' },
                { label: 'Bedrooms', desc: 'Number of bedrooms with icon', icon: 'ri-hotel-bed-line' },
                { label: 'Bathrooms', desc: 'Number of bathrooms with icon', icon: 'fa-solid fa-bath' },
                { label: 'Area / Land Size', desc: 'Square meters or hectares', icon: 'ri-ruler-2-line' },
              ].map((field) => (
                <div key={field.label} className="flex items-start justify-between gap-4 py-3 border-b border-stone-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 flex items-center justify-center bg-[#1B4332]/8 rounded-lg shrink-0">
                      <i className={`${field.icon} text-[#1B4332] text-sm`}></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-700">{field.label}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{field.desc}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer bg-[#1B4332]"
                  >
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform translate-x-6"></span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Media Tabs Tab */}
        {activeTab === 'media-tabs' && (
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-start gap-4 pb-4 border-b border-stone-100">
              <div className="w-9 h-9 flex items-center justify-center bg-[#1B4332]/10 rounded-lg shrink-0">
                <i className="ri-image-2-line text-[#1B4332] text-base"></i>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-800">Media Tabs Configuration</h3>
                <p className="text-xs text-stone-400 mt-0.5">Configure which media tabs appear in the gallery section of each property detail page.</p>
              </div>
            </div>
            <div className="pt-4 space-y-2">
              {[
                { label: 'Photos', desc: 'Main property photo gallery with lightbox', icon: 'ri-camera-line' },
                { label: 'Video', desc: 'Embedded video from YouTube or Vimeo', icon: 'ri-vidicon-line' },
                { label: 'Floor Plan', desc: 'Uploadable floor plan images', icon: 'ri-layout-2-line' },
                { label: 'Virtual Tour', desc: '360° virtual tour embed link', icon: 'ri-global-line' },
              ].map((tab, i) => (
                <div key={tab.label} className="flex items-start justify-between gap-4 py-3 border-b border-stone-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 flex items-center justify-center bg-[#1B4332]/8 rounded-lg shrink-0">
                      <i className={`${tab.icon} text-[#1B4332] text-sm`}></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-700">{tab.label}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{tab.desc}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${i === 0 ? 'bg-[#1B4332]' : 'bg-stone-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${i === 0 ? 'translate-x-6' : 'translate-x-1'}`}></span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Layout & Controls Tab */}
        {activeTab === 'layout-controls' && (
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-start gap-4 pb-4 border-b border-stone-100">
              <div className="w-9 h-9 flex items-center justify-center bg-[#1B4332]/10 rounded-lg shrink-0">
                <i className="ri-settings-3-line text-[#1B4332] text-base"></i>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-800">Layout & Display Controls</h3>
                <p className="text-xs text-stone-400 mt-0.5">Adjust the overall layout and behavior of the property detail page.</p>
              </div>
            </div>
            <div className="pt-4 space-y-2">
              <div className="flex items-start justify-between gap-4 py-3 border-b border-stone-100">
                <div>
                  <p className="text-sm font-medium text-stone-700">Content Layout Style</p>
                  <p className="text-xs text-stone-400 mt-0.5">How content sections are arranged on the detail page</p>
                </div>
                <select className="border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-[#1B4332] bg-white">
                  <option value="boxed">Boxed</option>
                  <option value="full-width">Full Width</option>
                  <option value="split">Split Panel</option>
                </select>
              </div>
              <div className="flex items-start justify-between gap-4 py-3 border-b border-stone-100">
                <div>
                  <p className="text-sm font-medium text-stone-700">Sticky Sidebar</p>
                  <p className="text-xs text-stone-400 mt-0.5">Sidebar scrolls with the page content</p>
                </div>
                <button type="button" className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer bg-[#1B4332]">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform translate-x-6"></span>
                </button>
              </div>
              <div className="flex items-start justify-between gap-4 py-3 border-b border-stone-100">
                <div>
                  <p className="text-sm font-medium text-stone-700">Show Share Buttons</p>
                  <p className="text-xs text-stone-400 mt-0.5">Social sharing links on property pages</p>
                </div>
                <button type="button" className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer bg-[#1B4332]">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform translate-x-6"></span>
                </button>
              </div>
              <div className="flex items-start justify-between gap-4 py-3 border-b border-stone-100">
                <div>
                  <p className="text-sm font-medium text-stone-700">Show Print Button</p>
                  <p className="text-xs text-stone-400 mt-0.5">Printable property sheet option</p>
                </div>
                <button type="button" className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer bg-stone-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform translate-x-1"></span>
                </button>
              </div>
              <div className="flex items-start justify-between gap-4 py-3 border-b border-stone-100">
                <div>
                  <p className="text-sm font-medium text-stone-700">Show Breadcrumbs</p>
                  <p className="text-xs text-stone-400 mt-0.5">Navigation trail at top of page</p>
                </div>
                <button type="button" className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer bg-[#1B4332]">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform translate-x-6"></span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ManagementLayout>
  );
}