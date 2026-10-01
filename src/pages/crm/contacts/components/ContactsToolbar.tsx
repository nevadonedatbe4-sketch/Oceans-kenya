import { useEffect, useRef, useState } from 'react';

interface ContactsToolbarProps {
  activeTab: 'overview' | 'list';
  onTabChange: (tab: 'overview' | 'list') => void;
  search: string;
  onSearch: (value: string) => void;
  onAddManual: () => void;
  onImport: () => void;
  onDownload: () => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
}

const TABS: { id: 'overview' | 'list'; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'ri-layout-grid-line' },
  { id: 'list', label: 'Contact List', icon: 'ri-list-check-2' },
];

/**
 * The contact-directory toolbar: Overview / Contact List tabs on the left,
 * an Add Contacts dropdown on the right, then a search bar with
 * Download CSV + Filters actions on the second band.
 */
export default function ContactsToolbar({
  activeTab,
  onTabChange,
  search,
  onSearch,
  onAddManual,
  onImport,
  onDownload,
  filtersOpen,
  onToggleFilters,
  activeFilterCount,
}: ContactsToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-visible">
      {/* Tabs + Add button */}
      <div className="flex flex-wrap items-center gap-2 px-3 md:px-4 border-b border-[#eef1f4]">
        <div className="flex items-center gap-1 mr-auto" role="tablist" aria-label="Contact views">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(tab.id)}
                className={`inline-flex items-center gap-2 px-3 py-3.5 admin-label font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'border-[#001731] text-[#001731]'
                    : 'border-transparent text-[#001731]/55 hover:text-[#001731]'
                }`}
              >
                <i className={`${tab.icon} text-lg`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative py-2" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md admin-label font-semibold text-white bg-[#001731] hover:bg-[#0d5959] transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-user-add-line text-lg" />
            Add Contact
            <i className={`${menuOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-lg`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-40 w-60 bg-white border border-[#e5e7eb] rounded-lg overflow-hidden animate-dropdown-enter">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAddManual();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-[#001731] hover:bg-[#001731] hover:text-white transition-colors cursor-pointer"
              >
                <i className="ri-user-add-line text-lg" />
                <span className="admin-label font-medium">Add manually</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onImport();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-[#001731] hover:bg-[#001731] hover:text-white transition-colors cursor-pointer border-t border-[#eef1f4]"
              >
                <i className="ri-upload-2-line text-lg" />
                <span className="admin-label font-medium">Import from CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search + actions */}
      <div className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#001731]/45 text-lg" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by name, email, phone or company…"
            className="w-full pl-10 pr-4 py-2.5 border border-[#e5e7eb] rounded-md font-roboto bg-white focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/25"
          />
        </div>

        <div className="flex items-center gap-2 sm:flex-shrink-0">
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-md admin-label font-semibold text-[#001731] border border-[#001731]/20 hover:bg-[#001731] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-download-2-line text-lg" />
            Download CSV
          </button>

          <button
            type="button"
            onClick={onToggleFilters}
            aria-expanded={filtersOpen}
            className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-md admin-label font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
              filtersOpen || activeFilterCount > 0
                ? 'bg-[#001731] text-white border-[#001731]'
                : 'text-[#001731] border-[#001731]/20 hover:bg-[#001731] hover:text-white'
            }`}
          >
            <i className="ri-equalizer-2-line text-lg" />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-6 px-1.5 rounded-full admin-meta font-bold bg-white text-[#001731]">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}