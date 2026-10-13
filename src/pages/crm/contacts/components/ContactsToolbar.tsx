import CrmSearchBar from '@/components/base/CrmSearchBar';
import LocationMultiSelect from '@/components/base/LocationMultiSelect';

interface ContactsToolbarProps {
  activeTab: 'overview' | 'list';
  onTabChange: (tab: 'overview' | 'list') => void;
  search: string;
  onSearch: (value: string) => void;
  onSearchSubmit?: () => void;
  onAddLead: () => void;
  onAddBusiness: () => void;
  onImport: () => void;
  onDownload: () => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  /** Multi-location grouping: match ANY of the selected areas. */
  locationOptions?: string[];
  selectedLocations?: string[];
  onLocationsChange?: (next: string[]) => void;
}

const TABS: { id: 'overview' | 'list'; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'ri-layout-grid-line' },
  { id: 'list', label: 'Contact List', icon: 'ri-list-check-2' },
];

/**
 * The contact-directory toolbar: Overview / Contact List tabs on the left,
 * two add buttons on the right (Add Lead / Add Business Contact), then a
 * search bar with Download CSV + Filters actions on the second band.
 */
export default function ContactsToolbar({
  activeTab,
  onTabChange,
  search,
  onSearch,
  onSearchSubmit,
  onAddLead,
  onAddBusiness,
  onImport,
  onDownload,
  filtersOpen,
  onToggleFilters,
  activeFilterCount,
  locationOptions = [],
  selectedLocations = [],
  onLocationsChange,
}: ContactsToolbarProps) {
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

        <div className="flex flex-wrap items-center gap-2 py-2">
          <button
            type="button"
            onClick={onAddLead}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md admin-label font-semibold text-[#001731] border border-[#001731]/20 hover:bg-[#001731] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-user-add-line text-lg" />
            Add Lead
          </button>
          <button
            type="button"
            onClick={onAddBusiness}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md admin-label font-semibold text-white bg-[#001731] hover:bg-[#0d5959] transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-building-2-line text-lg" />
            Add Business Contact
          </button>
          <button
            type="button"
            onClick={onImport}
            aria-label="Import from CSV"
            title="Import from CSV"
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-md admin-label font-semibold text-[#001731] border border-[#001731]/20 hover:bg-[#001731] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-upload-2-line text-lg" />
            <span className="hidden xl:inline">Import</span>
          </button>
        </div>
      </div>

      {/* Search + actions */}
      <div className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <CrmSearchBar
            value={search}
            onChange={onSearch}
            onSubmit={() => onSearchSubmit?.()}
            placeholder="Search by name, email, phone or company…"
            inputClassName="w-full pl-10 pr-9 py-2.5 border-2 border-[#94a3b8] rounded-md font-roboto font-semibold bg-white text-[#001731] placeholder:text-[#5b6b7a] placeholder:font-medium focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/25"
            iconClassName="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-[#001731]/60 text-lg"
            buttonClassName="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md admin-label font-semibold text-white bg-[#001731] hover:bg-[#0d5959] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
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

      {/* Multi-location grouping: group clients by area (any of the selected). */}
      {onLocationsChange && locationOptions.length > 0 && (
        <div className="px-3 md:px-4 pb-3 md:pb-4">
          <LocationMultiSelect
            options={locationOptions}
            selected={selectedLocations}
            onChange={onLocationsChange}
            placeholder="Group clients by area, e.g. Karen, Runda, Muthaiga…"
            className="w-full"
            controlClassName="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border-2 border-[#94a3b8] rounded-md bg-white min-h-[44px]"
            chipClassName="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-semibold bg-secondary-100 text-secondary-900"
            inputClassName="flex-1 min-w-[160px] px-2 py-1 text-sm font-semibold focus:outline-none bg-transparent text-[#001731] placeholder:text-[#5b6b7a] placeholder:font-medium"
          />
        </div>
      )}
    </div>
  );
}