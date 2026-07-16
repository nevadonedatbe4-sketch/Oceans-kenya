import { useState, useRef, useEffect } from 'react';
import ManagementLayout from '../ManagementLayout';
import { useManagementData, type HomeSection } from '@/hooks/useManagementData';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';

interface SectionTypeInfo {
  label: string;
  icon: string;
  colorClass: string;
}

const SECTION_TYPE_MAP: Record<string, SectionTypeInfo> = {
  hero: { label: 'Hero', icon: 'ri-image-2-line', colorClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  featured_properties: { label: 'Featured Properties', icon: 'ri-layout-grid-2-line', colorClass: 'bg-green-50 text-green-700 border-green-200' },
  neighbourhood_grid: { label: 'Neighbourhood Grid', icon: 'ri-map-pin-2-line', colorClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  cta_banner: { label: 'CTA Banner', icon: 'ri-megaphone-line', colorClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  testimonials: { label: 'Testimonials', icon: 'ri-chat-quote-line', colorClass: 'bg-violet-50 text-violet-700 border-violet-200' },
  contact: { label: 'Contact Section', icon: 'ri-contacts-book-2-line', colorClass: 'bg-stone-100 text-stone-600 border-stone-200' },
  rich_text: { label: 'Rich Text', icon: 'ri-article-line', colorClass: 'bg-stone-100 text-stone-600 border-stone-200' },
  faq: { label: 'FAQ', icon: 'ri-question-answer-line', colorClass: 'bg-orange-50 text-orange-700 border-orange-200' },
  area_snapshot: { label: 'Area Snapshot', icon: 'ri-map-2-line', colorClass: 'bg-teal-50 text-teal-700 border-teal-200' },
  related_articles: { label: 'Related Articles', icon: 'ri-newspaper-line', colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  stats: { label: 'Stats', icon: 'ri-bar-chart-line', colorClass: 'bg-orange-50 text-orange-700 border-orange-200' },
  search_filters: { label: 'Search Filters', icon: 'ri-search-line', colorClass: 'bg-stone-100 text-stone-600 border-stone-200' },
  property_grid: { label: 'Property Grid', icon: 'ri-layout-grid-line', colorClass: 'bg-green-50 text-green-700 border-green-200' },
  pagination: { label: 'Pagination', icon: 'ri-more-line', colorClass: 'bg-stone-100 text-stone-600 border-stone-200' },
  contact_form: { label: 'Contact Form', icon: 'ri-mail-line', colorClass: 'bg-stone-100 text-stone-600 border-stone-200' },
  map: { label: 'Map', icon: 'ri-map-2-line', colorClass: 'bg-teal-50 text-teal-700 border-teal-200' },
  featured_developments: { label: 'Featured Developments', icon: 'ri-building-line', colorClass: 'bg-green-50 text-green-700 border-green-200' },
};

function classifySection(section: HomeSection | MockSection): string {
  const s = (section.slug || '').toLowerCase();
  const l = ((section as any).layout || '').toLowerCase();
  if (s === 'hero' || l === 'hero') return 'hero';
  if (s.includes('featured') && (s.includes('listing') || s.includes('property'))) return 'featured_properties';
  if (s.includes('neighbourhood') || s.includes('neighborhood')) return 'neighbourhood_grid';
  if (s.includes('cta') || l === 'banner') return 'cta_banner';
  if (s.includes('testimonial')) return 'testimonials';
  if (s.includes('contact')) return 'contact';
  if (s.includes('about') || l === 'default') return 'rich_text';
  if (s.includes('track') || l === 'stats') return 'stats';
  if (s.includes('insight') || s.includes('blog')) return 'related_articles';
  if (s.includes('search') || s.includes('filter')) return 'search_filters';
  if (s.includes('develop')) return 'featured_developments';
  if (s.includes('faq')) return 'faq';
  if (s.includes('form')) return 'contact_form';
  if (s.includes('map')) return 'map';
  if (s.includes('area_snapshot')) return 'area_snapshot';
  return 'rich_text';
}

interface MockSection {
  id: string;
  name: string;
  slug: string;
  visible: boolean;
  sort_order: number;
  layout?: string;
}

const MOCK_PAGE_SECTIONS: Record<string, MockSection[]> = {
  'all-properties': [
    { id: 'ap-hero', name: 'hero_main', slug: 'hero', visible: true, sort_order: 1, layout: 'hero' },
    { id: 'ap-search', name: 'search_filters', slug: 'search_filters', visible: true, sort_order: 2 },
    { id: 'ap-grid', name: 'property_grid', slug: 'property_grid', visible: true, sort_order: 3 },
    { id: 'ap-pag', name: 'pagination_block', slug: 'pagination', visible: true, sort_order: 4 },
    { id: 'ap-cta', name: 'valuation_cta', slug: 'cta_banner', visible: true, sort_order: 5, layout: 'banner' },
  ],
  buy: [
    { id: 'buy-hero', name: 'hero_buy', slug: 'hero', visible: true, sort_order: 1, layout: 'hero' },
    { id: 'buy-feat', name: 'featured_listings', slug: 'featured_listings', visible: true, sort_order: 2 },
    { id: 'buy-nbhd', name: 'neighbourhood_showcase', slug: 'neighbourhood_grid', visible: true, sort_order: 3 },
    { id: 'buy-faq', name: 'buying_faq', slug: 'faq', visible: true, sort_order: 4 },
    { id: 'buy-cta', name: 'landlord_cta', slug: 'cta_banner', visible: true, sort_order: 5, layout: 'banner' },
  ],
  contact: [
    { id: 'con-hero', name: 'hero_contact', slug: 'hero', visible: true, sort_order: 1, layout: 'hero' },
    { id: 'con-form', name: 'contact_form', slug: 'contact_form', visible: true, sort_order: 2 },
    { id: 'con-map', name: 'office_map', slug: 'map', visible: true, sort_order: 3 },
    { id: 'con-faq', name: 'contact_faq', slug: 'faq', visible: true, sort_order: 4 },
  ],
  landlords: [
    { id: 'll-hero', name: 'hero_landlords', slug: 'hero', visible: true, sort_order: 1, layout: 'hero' },
    { id: 'll-cta1', name: 'valuation_cta', slug: 'cta_banner', visible: true, sort_order: 2, layout: 'banner' },
    { id: 'll-faq', name: 'landlord_faq', slug: 'faq', visible: true, sort_order: 3 },
    { id: 'll-contact', name: 'contact_section', slug: 'contact', visible: true, sort_order: 4 },
  ],
  neighbourhoods: [
    { id: 'nb-hero', name: 'hero_neighbourhoods', slug: 'hero', visible: true, sort_order: 1, layout: 'hero' },
    { id: 'nb-grid', name: 'neighbourhood_grid', slug: 'neighbourhood_grid', visible: true, sort_order: 2 },
    { id: 'nb-area', name: 'area_snapshot', slug: 'area_snapshot', visible: true, sort_order: 3 },
    { id: 'nb-faq', name: 'neighbourhood_faq', slug: 'faq', visible: true, sort_order: 4 },
  ],
  'new-developments': [
    { id: 'nd-hero', name: 'hero_developments', slug: 'hero', visible: true, sort_order: 1, layout: 'hero' },
    { id: 'nd-feat', name: 'featured_developments', slug: 'featured_developments', visible: true, sort_order: 2 },
    { id: 'nd-cta', name: 'development_cta', slug: 'cta_banner', visible: true, sort_order: 3, layout: 'banner' },
    { id: 'nd-contact', name: 'contact_section', slug: 'contact', visible: true, sort_order: 4 },
  ],
  rent: [
    { id: 'rt-hero', name: 'hero_rent', slug: 'hero', visible: true, sort_order: 1, layout: 'hero' },
    { id: 'rt-search', name: 'search_filters', slug: 'search_filters', visible: true, sort_order: 2 },
    { id: 'rt-grid', name: 'rental_grid', slug: 'property_grid', visible: true, sort_order: 3 },
    { id: 'rt-pag', name: 'pagination_block', slug: 'pagination', visible: true, sort_order: 4 },
    { id: 'rt-contact', name: 'contact_section', slug: 'contact', visible: true, sort_order: 5 },
  ],
};

interface PageEntry {
  key: string;
  label: string;
  icon: string;
  path: string;
}

const PAGE_LIST: PageEntry[] = [
  { key: 'all-properties', label: 'All Properties', icon: 'ri-layout-grid-line', path: '/properties' },
  { key: 'buy', label: 'Buy', icon: 'ri-layout-grid-line', path: '/buy' },
  { key: 'contact', label: 'Contact', icon: 'ri-contacts-book-2-line', path: '/contact' },
  { key: 'home', label: 'Home', icon: 'ri-home-4-line', path: '/home' },
  { key: 'landlords', label: 'Landlords', icon: 'ri-file-text-line', path: '/landlords' },
  { key: 'neighbourhoods', label: 'Neighbourhoods', icon: 'ri-map-pin-2-line', path: '/neighbourhoods' },
  { key: 'new-developments', label: 'New Developments', icon: 'ri-file-text-line', path: '/new-developments' },
  { key: 'rent', label: 'Rent', icon: 'ri-layout-grid-line', path: '/rent' },
];

const ALL_SECTION_TYPE_KEYS = ['hero', 'featured_properties', 'neighbourhood_grid', 'cta_banner', 'testimonials', 'contact', 'rich_text', 'faq', 'area_snapshot', 'related_articles'];

function snapshotKey(sections: (HomeSection | MockSection)[]): string {
  return sections.map((s) => `${s.id}:${s.sort_order}:${s.visible}`).join('|');
}

export default function PageBuilderPage() {
  const data = useManagementData();
  const { loading, homeSections, moveHomeUp, moveHomeDown, toggleHomeVisible, fetchData } = data;

  const [selectedPage, setSelectedPage] = useState('home');
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropOverId, setDropOverId] = useState<string | null>(null);
  const draggedNode = useRef<HTMLElement | null>(null);

  const [mockStates, setMockStates] = useState<Record<string, MockSection[]>>(() => {
    const initial: Record<string, MockSection[]> = {};
    Object.entries(MOCK_PAGE_SECTIONS).forEach(([key, sections]) => {
      initial[key] = sections.map((s) => ({ ...s }));
    });
    return initial;
  });

  // Snapshot tracking for dirty detection
  const [homeSnapshot, setHomeSnapshot] = useState<string>('');
  const [mockSnapshots, setMockSnapshots] = useState<Record<string, string>>({});

  // Capture initial snapshots once loading is done
  useEffect(() => {
    if (!loading && homeSections.length > 0 && !homeSnapshot) {
      setHomeSnapshot(snapshotKey(homeSections));
    }
  }, [loading, homeSections, homeSnapshot]);

  useEffect(() => {
    const snapshots: Record<string, string> = {};
    Object.entries(mockStates).forEach(([key, sections]) => {
      snapshots[key] = snapshotKey(sections);
    });
    setMockSnapshots((prev) => {
      const merged = { ...prev };
      Object.entries(snapshots).forEach(([key, val]) => {
        if (!merged[key]) merged[key] = val;
      });
      return merged;
    });
  }, []);

  const currentPage = PAGE_LIST.find((p) => p.key === selectedPage);
  const isHomePage = selectedPage === 'home';
  const sections: (HomeSection | MockSection)[] = isHomePage ? homeSections : (mockStates[selectedPage] || []);

  const isDirty = isHomePage
    ? homeSnapshot !== snapshotKey(homeSections)
    : (mockSnapshots[selectedPage] || snapshotKey(mockStates[selectedPage] || [])) !== snapshotKey(mockStates[selectedPage] || []);

  const handleMoveUp = (index: number) => {
    if (isHomePage) {
      moveHomeUp(index);
      return;
    }
    if (index === 0) return;
    setMockStates((prev) => {
      const items = [...(prev[selectedPage] || [])];
      [items[index - 1], items[index]] = [items[index], items[index - 1]];
      const updated = items.map((item, i) => ({ ...item, sort_order: i + 1 }));
      return { ...prev, [selectedPage]: updated };
    });
  };

  const handleMoveDown = (index: number) => {
    const len = sections.length;
    if (isHomePage) {
      moveHomeDown(index);
      return;
    }
    if (index === len - 1) return;
    setMockStates((prev) => {
      const items = [...(prev[selectedPage] || [])];
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
      const updated = items.map((item, i) => ({ ...item, sort_order: i + 1 }));
      return { ...prev, [selectedPage]: updated };
    });
  };

  const handleToggleVisible = (index: number) => {
    if (isHomePage) {
      toggleHomeVisible(index);
      return;
    }
    setMockStates((prev) => {
      const items = [...(prev[selectedPage] || [])];
      items[index] = { ...items[index], visible: !items[index].visible };
      return { ...prev, [selectedPage]: items };
    });
  };

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, sectionId: string, index: number) => {
    setDragId(sectionId);
    draggedNode.current = e.currentTarget as HTMLElement;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    // Set a ghost image
    if (e.currentTarget instanceof HTMLElement) {
      const rect = e.currentTarget.getBoundingClientRect();
      e.dataTransfer.setDragImage(e.currentTarget, rect.width / 2, 20);
    }
    requestAnimationFrame(() => {
      if (draggedNode.current) {
        draggedNode.current.style.opacity = '0.4';
        draggedNode.current.style.transform = 'scale(0.98)';
      }
    });
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropOverId(sectionId);
  };

  const handleDragLeave = () => {
    setDropOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDropOverId(null);
    setDragId(null);
    if (draggedNode.current) {
      draggedNode.current.style.opacity = '';
      draggedNode.current.style.transform = '';
      draggedNode.current = null;
    }

    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(fromIndex)) return;

    const toIndex = sections.findIndex((s) => s.id === targetId);
    if (toIndex === -1 || fromIndex === toIndex) return;

    if (isHomePage) {
      const newItems = [...homeSections];
      const [moved] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, moved);
      const updated = newItems.map((item, i) => ({ ...item, sort_order: i + 1 }));
      // Directly update homeSections via move functions — we need a bulk swap
      // Use moveHomeUp/moveHomeDown repeatedly to achieve the target
      let current = fromIndex;
      while (current < toIndex) {
        moveHomeDown(current);
        current++;
      }
      while (current > toIndex) {
        moveHomeUp(current);
        current--;
      }
      return;
    }

    setMockStates((prev) => {
      const items = [...(prev[selectedPage] || [])];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      const updated = items.map((item, i) => ({ ...item, sort_order: i + 1 }));
      return { ...prev, [selectedPage]: updated };
    });
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDropOverId(null);
    if (draggedNode.current) {
      draggedNode.current.style.opacity = '';
      draggedNode.current.style.transform = '';
      draggedNode.current = null;
    }
  };

  // --- Save ---
  const handleSaveOrder = async () => {
    if (!isDirty) return;

    if (isHomePage) {
      setSaving(true);
      try {
        const updates = homeSections.map((s) =>
          supabase
            .from('homepage_sections')
            .update({ visible: s.visible, sort_order: s.sort_order })
            .eq('id', s.id),
        );
        const results = await Promise.all(updates);
        const errors = results.filter((r: any) => r.error);
        if (errors.length > 0) {
          addToast('Some sections failed to save', 'error');
        } else {
          addToast('Section order saved', 'success');
          setHomeSnapshot(snapshotKey(homeSections));
        }
      } catch {
        addToast('Failed to save section order', 'error');
      }
      setSaving(false);
    } else {
      // Mock pages — save to local state snapshot
      setMockSnapshots((prev) => ({
        ...prev,
        [selectedPage]: snapshotKey(mockStates[selectedPage] || []),
      }));
      addToast('Section order saved', 'success');
    }
  };

  // --- Restore Defaults ---
  const handleRestoreDefaults = () => {
    if (isHomePage) {
      setSaving(true);
      fetchData().then(() => {
        setSaving(false);
        addToast('Restored to saved defaults', 'success');
      });
      return;
    }

    const defaults = MOCK_PAGE_SECTIONS[selectedPage];
    if (!defaults) return;
    setMockStates((prev) => ({
      ...prev,
      [selectedPage]: defaults.map((s) => ({ ...s })),
    }));
    addToast('Restored to defaults', 'success');
  };

  if (loading) {
    return (
      <ManagementLayout
        title="Page Builder"
        description="Control which sections appear on each page, their order, and visibility. Drag sections to reorder."
        icon={<i className="ri-layout-masonry-line text-[#1B4332] text-lg"></i>}
      >
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
        </div>
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout
      title="Page Builder"
      description="Control which sections appear on each page, their order, and visibility. Drag sections to reorder."
      icon={<i className="ri-layout-masonry-line text-[#1B4332] text-lg"></i>}
    >
      <div className="space-y-6 pb-24">
        <div className="flex gap-5">
          {/* Sidebar */}
          <div className="w-52 shrink-0 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 px-2 mb-2">Pages</p>
            {PAGE_LIST.map((page) => {
              const isActive = selectedPage === page.key;
              return (
                <button
                  key={page.key}
                  onClick={() => setSelectedPage(page.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors cursor-pointer rounded-lg ${
                    isActive
                      ? 'bg-[#1B4332]/8 text-[#1B4332] font-medium'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <i className={`${page.icon} text-sm`}></i>
                  </span>
                  <span className="truncate">{page.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1 h-4 rounded-full bg-[#1B4332] shrink-0"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
              {/* Page Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 flex items-center justify-center bg-[#1B4332]/8 rounded">
                    <i className={`${currentPage?.icon || 'ri-file-text-line'} text-[#1B4332] text-sm`}></i>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{currentPage?.label || 'Home'}</p>
                    <p className="text-[11px] text-stone-400 font-mono">{currentPage?.path || '/home'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isHomePage && (
                    <span className="text-[10px] text-stone-400 italic mr-1">mock data</span>
                  )}
                  <button
                    onClick={handleRestoreDefaults}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="ri-refresh-line text-sm mr-1.5"></i>
                    Restore
                  </button>
                  <button
                    onClick={handleSaveOrder}
                    disabled={!isDirty || saving}
                    className={`px-5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap rounded-lg flex items-center gap-1.5 ${
                      isDirty && !saving
                        ? 'bg-[#1B4332] text-white hover:bg-[#1B4332]/90'
                        : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    {saving ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Saving
                      </>
                    ) : (
                      <>
                        <i className="ri-save-3-line text-sm"></i>
                        Save Order
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sections List */}
              <div className="p-5">
                <div className="space-y-2">
                  {sections.map((section, index) => {
                    const typeKey = classifySection(section);
                    const typeInfo = SECTION_TYPE_MAP[typeKey] || SECTION_TYPE_MAP.rich_text;
                    const isLast = index === sections.length - 1;
                    const isFirst = index === 0;
                    const isDragging = dragId === section.id;
                    const isDropTarget = dropOverId === section.id && dragId !== section.id;

                    return (
                      <div
                        key={section.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, section.id, index)}
                        onDragOver={(e) => handleDragOver(e, section.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, section.id)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-4 p-4 bg-white border rounded-lg transition-all cursor-grab active:cursor-grabbing ${
                          section.visible ? 'border-stone-200' : 'border-stone-100 opacity-60'
                        } ${isDragging ? 'opacity-40 scale-[0.98]' : ''} ${
                          isDropTarget ? 'border-[#1B4332] bg-[#1B4332]/3 ring-1 ring-[#1B4332]/20' : ''
                        }`}
                      >
                        {/* Drag Handle */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <i className="ri-draggable text-stone-300 text-sm cursor-grab"></i>
                        </div>

                        {/* Up/Down Controls */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={isFirst}
                            className={`w-6 h-6 flex items-center justify-center transition-colors cursor-pointer rounded ${
                              isFirst ? 'text-stone-200 cursor-not-allowed' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'
                            }`}
                          >
                            <i className="ri-arrow-up-s-line text-sm"></i>
                          </button>
                          <span className="text-[11px] font-mono text-stone-300 font-bold">{index + 1}</span>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={isLast}
                            className={`w-6 h-6 flex items-center justify-center transition-colors cursor-pointer rounded ${
                              isLast ? 'text-stone-200 cursor-not-allowed' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'
                            }`}
                          >
                            <i className="ri-arrow-down-s-line text-sm"></i>
                          </button>
                        </div>

                        {/* Type Badge */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 border rounded text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${typeInfo.colorClass}`}>
                          <i className={`${typeInfo.icon} text-sm`}></i>
                          {typeInfo.label}
                        </div>

                        {/* Section Name + Slug */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-700 truncate">{section.name}</p>
                          <p className="text-[11px] text-stone-400 font-mono">{section.slug}</p>
                        </div>

                        {/* Visibility Toggle */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-stone-400">{section.visible ? 'Visible' : 'Hidden'}</span>
                          <button
                            onClick={() => handleToggleVisible(index)}
                            role="switch"
                            aria-checked={section.visible}
                            className={`relative w-10 h-5 transition-colors duration-200 cursor-pointer shrink-0 ${
                              section.visible ? 'bg-[#1B4332]' : 'bg-stone-200'
                            }`}
                            style={{ borderRadius: '10px' }}
                          >
                            <span
                              className="absolute top-0.5 w-4 h-4 bg-white transition-transform duration-200 shadow-sm"
                              style={{
                                borderRadius: '8px',
                                transform: section.visible ? 'translateX(22px)' : 'translateX(2px)',
                              }}
                            ></span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section Types Legend */}
              <div className="px-5 pb-5">
                <div className="pt-4 border-t border-stone-100">
                  <p className="text-[11px] text-stone-400 mb-2 uppercase tracking-widest font-medium">Section Types</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_SECTION_TYPE_KEYS.map((typeKey) => {
                      const info = SECTION_TYPE_MAP[typeKey];
                      if (!info) return null;
                      return (
                        <span
                          key={typeKey}
                          className={`flex items-center gap-1 px-2 py-0.5 border rounded text-[10px] font-semibold uppercase tracking-wider ${info.colorClass}`}
                        >
                          <i className={`${info.icon} text-xs`}></i>
                          {info.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ManagementLayout>
  );
}