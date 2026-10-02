import { useEffect, useState, type ReactNode } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

/**
 * CommercialAdvancedFilters - the advanced filter sheet for the commercial
 * property search. Mirrors the shared Buy / Rent AdvancedFilters so every
 * filter sheet in the site reads identically: an inline panel on desktop /
 * tablet and a bottom sheet on mobile, with the same "SHOW SOLD / SHOW LET or
 * AGREED LET" toggle wording.
 */

export interface CommercialFilterState {
  sectors: string[];
  minSize: string;
  maxSize: string;
  added: string;
  keywords: string;
  mustHaves: string[];
  showLetAgreed: boolean;
}

export const defaultCommercialFilters: CommercialFilterState = {
  sectors: [],
  minSize: '',
  maxSize: '',
  added: 'Anytime',
  keywords: '',
  mustHaves: [],
  showLetAgreed: false,
};

/**
 * Must-have amenity filters. Each option maps to the real `listings.amenities`
 * values that satisfy it (OR-combined inside the group); every selected
 * must-have must be present (AND across groups). Values are the exact strings
 * stored on listings, e.g. "Parking", "Air Conditioning",
 * "Backup Power / Generator", "CCTV Surveillance".
 */
export interface MustHaveOption {
  key: string;
  label: string;
  icon: string;
  amenities: string[];
}

export const COMMERCIAL_MUST_HAVES: MustHaveOption[] = [
  { key: 'parking', label: 'Parking', icon: 'ri-parking-box-line', amenities: ['Parking', 'Underground Parking', 'Visitor Parking'] },
  { key: 'air_con', label: 'Air-con', icon: 'ri-snowflake-line', amenities: ['Air Conditioning'] },
  { key: 'backup_power', label: 'Backup power', icon: 'ri-plug-2-line', amenities: ['Backup Power / Generator', 'Solar Power'] },
  { key: 'security', label: 'Security', icon: 'ri-shield-check-line', amenities: ['24/7 Security', 'CCTV Surveillance', 'Security Lights', 'Gated Community', 'Electric Fence', 'Intercom System'] },
];

/** Sector options - values match the DB `property_type` for commercial rows. */
const SECTORS: { value: string; label: string }[] = [
  { value: 'office', label: 'Offices' },
  { value: 'serviced_office', label: 'Serviced Office' },
  { value: 'retail_shop', label: 'Retail / Shop' },
  { value: 'leisure', label: 'Leisure / Hospitality' },
  { value: 'guest_house', label: 'Guest House' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'land', label: 'Land / Development' },
  { value: 'other', label: 'Other' },
];

const ADDED_OPTIONS = ['Anytime', 'Last 24 hours', 'Last 3 days', 'Last 7 days', 'Last 14 days', 'Last 30 days'];

interface CommercialAdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: CommercialFilterState) => void;
  initialFilters: CommercialFilterState;
  isBuy: boolean;
}

const labelClass = 'block text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 leading-none mb-1.5';

const inputClass =
  'w-full h-11 px-3 text-sm font-roboto font-medium text-primary placeholder:text-primary/40 bg-white border border-primary/20 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors';

function CheckRow({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 text-left cursor-pointer group">
      <span
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          checked ? 'bg-primary border-primary' : 'border-primary/30 bg-white group-hover:border-primary/50'
        }`}
      >
        {checked && <i className="ri-check-line text-white text-[10px]"></i>}
      </span>
      <span className="text-sm font-roboto text-primary whitespace-nowrap">{label}</span>
    </button>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} appearance-none pr-9 cursor-pointer`}
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <span className="w-4 h-4 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/50 pointer-events-none">
          <i className="ri-arrow-down-s-line text-base"></i>
        </span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50 mb-3">{title}</h4>
      {children}
    </div>
  );
}

export default function CommercialAdvancedFilters({
  isOpen,
  onClose,
  onApply,
  initialFilters,
  isBuy,
}: CommercialAdvancedFiltersProps) {
  const [filters, setFilters] = useState<CommercialFilterState>({ ...initialFilters });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useBodyScrollLock(isOpen && isMobile);

  // Keep the panel in sync when reopened from outside.
  useEffect(() => {
    if (isOpen) setFilters({ ...initialFilters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSector = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      sectors: prev.sectors.includes(value) ? prev.sectors.filter((v) => v !== value) : [...prev.sectors, value],
    }));
  };

  const toggleMustHave = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      mustHaves: prev.mustHaves.includes(value) ? prev.mustHaves.filter((v) => v !== value) : [...prev.mustHaves, value],
    }));
  };

  const activeCount = [
    filters.sectors.length > 0,
    filters.minSize !== '' || filters.maxSize !== '',
    filters.added !== 'Anytime',
    filters.keywords.trim() !== '',
    filters.mustHaves.length > 0,
  ].filter(Boolean).length;

  const handleApply = () => {
    onApply({ ...filters });
    onClose();
  };

  const handleClear = () => {
    const cleared = { ...defaultCommercialFilters };
    setFilters(cleared);
    onApply(cleared);
    onClose();
  };

  const toggleOn = filters.showLetAgreed;

  const fields = (
    <>
      {/* Sector */}
      <Section title="Sector">
        <div className="flex flex-wrap gap-x-6 gap-y-2.5">
          {SECTORS.map((s) => (
            <CheckRow
              key={s.value}
              checked={filters.sectors.includes(s.value)}
              onClick={() => toggleSector(s.value)}
              label={s.label}
            />
          ))}
        </div>
      </Section>

      <div className="w-full h-px bg-primary/10 mb-5" />

      {/* Size */}
      <Section title="Size (sq m)">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Min size</label>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="e.g. 80"
              value={filters.minSize}
              onChange={(e) => setFilters((p) => ({ ...p, minSize: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Max size</label>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="e.g. 500"
              value={filters.maxSize}
              onChange={(e) => setFilters((p) => ({ ...p, maxSize: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
      </Section>

      <div className="w-full h-px bg-primary/10 mb-5" />

      {/* Must-haves */}
      <Section title="Must-haves">
        <div className="flex flex-wrap gap-2.5">
          {COMMERCIAL_MUST_HAVES.map((opt) => {
            const checked = filters.mustHaves.includes(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleMustHave(opt.key)}
                aria-pressed={checked}
                className={`flex items-center gap-2 px-3.5 h-10 rounded-lg border text-sm font-roboto font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  checked
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-primary/80 border-primary/20 hover:border-primary/50'
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className={`${opt.icon} text-sm`}></i>
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </Section>

      <div className="w-full h-px bg-primary/10 mb-5" />

      {/* Added + keywords */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FilterSelect
          label="Added to site"
          value={filters.added}
          options={ADDED_OPTIONS}
          onChange={(v) => setFilters((p) => ({ ...p, added: v }))}
        />
        <div>
          <label className={labelClass}>Keywords</label>
          <input
            type="text"
            placeholder="e.g. fitted kitchen, parking"
            value={filters.keywords}
            onChange={(e) => setFilters((p) => ({ ...p, keywords: e.target.value }))}
            className={inputClass}
          />
        </div>
      </div>

      <div className="w-full h-px bg-primary/10 mb-5 mt-5" />

      {/* Show sold / let agreed */}
      <div className="mb-1 flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            className="sr-only"
            type="checkbox"
            checked={toggleOn}
            onChange={() => setFilters((p) => ({ ...p, showLetAgreed: !p.showLetAgreed }))}
          />
          <div className={`w-9 h-5 rounded-full transition-colors ${toggleOn ? 'bg-primary' : 'bg-primary/10'}`}>
            <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${toggleOn ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}></div>
          </div>
        </label>
        <span className="text-sm font-roboto font-medium text-primary">{isBuy ? 'SHOW SOLD' : 'SHOW LET or AGREED LET'}</span>
      </div>
    </>
  );

  const actions = (
    <div className="flex flex-wrap items-center gap-2 pt-4 mt-5 border-t border-primary/10">
      <button
        type="button"
        onClick={handleClear}
        className="flex items-center gap-2 h-11 px-4 text-base font-roboto font-medium text-primary border border-primary/20 rounded-lg hover:border-primary/50 transition-colors cursor-pointer whitespace-nowrap"
      >
        <span className="w-4 h-4 flex items-center justify-center">
          <i className="ri-close-circle-line text-sm"></i>
        </span>
        Clear all
      </button>
      <button
        type="button"
        onClick={handleApply}
        className="flex items-center gap-2 h-11 px-6 bg-primary text-white border-2 border-primary text-base font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
      >
        <span className="w-4 h-4 flex items-center justify-center">
          <i className="ri-search-line text-sm"></i>
        </span>
        Apply &amp; Search
      </button>
      <span className="text-xs font-roboto text-primary/50 ml-auto">
        {activeCount > 0 ? `${activeCount} filter(s) applied` : 'No advanced filters applied'}
      </span>
    </div>
  );

  return (
    <>
      {/* ===== DESKTOP / TABLET inline panel ===== */}
      <div className="hidden md:block">
        <div className="mt-4 bg-white border border-primary/20 rounded-lg overflow-hidden">
          <div className="px-5 py-5">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-[12px] font-roboto font-semibold uppercase tracking-widest text-primary/50">Advanced filters</h4>
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 text-xs font-roboto font-semibold text-primary/60 hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
              >
                Close
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-close-line text-sm"></i>
                </span>
              </button>
            </div>
            {fields}
            {actions}
          </div>
        </div>
      </div>

      {/* ===== MOBILE bottom sheet ===== */}
      <div className="md:hidden fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Advanced filters">
        <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
        <div className="absolute inset-x-0 bottom-0 max-h-[90dvh] bg-white rounded-t-2xl flex flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10 shrink-0">
            <span className="text-base font-roboto font-semibold text-primary">Advanced filters</span>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-primary rounded-md cursor-pointer hover:bg-primary/5 transition-colors"
              aria-label="Close filters"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-4 py-4">{fields}</div>
          </div>
          <div className="px-4 py-3 border-t border-primary/10 bg-white shrink-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center justify-center gap-2 h-11 px-4 text-base font-roboto font-medium text-primary border border-primary/20 rounded-lg hover:border-primary/50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center justify-center gap-2 h-11 px-6 bg-primary text-white text-base font-roboto font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap ml-auto flex-1"
              >
                Apply &amp; Search
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}