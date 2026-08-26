import { useState, useCallback, useRef } from 'react';

// ---- Tag Categories & Definitions ----

export interface TagDef {
  label: string;
  category: TagCategory;
}

export type TagCategory = 'status' | 'development' | 'lifestyle' | 'community' | 'investment' | 'service';

const ONE_COLOR = '#0d1f2d';

export const TAG_CATEGORY_META: Record<TagCategory, { label: string; icon: string }> = {
  status:      { label: 'Status',       icon: 'ri-flag-line' },
  development: { label: 'Development',  icon: 'ri-building-line' },
  lifestyle:   { label: 'Lifestyle',    icon: 'ri-heart-line' },
  community:   { label: 'Community',    icon: 'ri-group-line' },
  investment:  { label: 'Investment',   icon: 'ri-line-chart-line' },
  service:     { label: 'Service',      icon: 'ri-service-line' },
};

export const PREDEFINED_TAGS: TagDef[] = [
  { label: 'New Listing',          category: 'status' },
  { label: 'Featured',             category: 'status' },
  { label: 'Hot Deal',             category: 'status' },
  { label: 'Price Reduced',        category: 'status' },
  { label: 'Exclusive',            category: 'status' },
  { label: 'New Development',      category: 'development' },
  { label: 'Off-Plan',             category: 'development' },
  { label: 'Ready to Move',        category: 'development' },
  { label: 'Under Construction',   category: 'development' },
  { label: 'Luxury',               category: 'lifestyle' },
  { label: 'Waterfront',           category: 'lifestyle' },
  { label: 'Golf Estate',          category: 'lifestyle' },
  { label: 'Beachfront',           category: 'lifestyle' },
  { label: 'Lake View',            category: 'lifestyle' },
  { label: 'City View',            category: 'lifestyle' },
  { label: 'Penthouse',            category: 'lifestyle' },
  { label: 'Duplex',               category: 'lifestyle' },
  { label: 'Gated Community',      category: 'community' },
  { label: 'Family Friendly',      category: 'community' },
  { label: 'Pet Friendly',         category: 'community' },
  { label: 'Quiet Neighborhood',   category: 'community' },
  { label: 'Investment',           category: 'investment' },
  { label: 'High ROI',             category: 'investment' },
  { label: 'Rental Income',        category: 'investment' },
  { label: 'Airbnb Friendly',      category: 'investment' },
  { label: 'Serviced',             category: 'service' },
  { label: 'Furnished',            category: 'service' },
  { label: 'Semi Furnished',       category: 'service' },
];

interface Props {
  selectedTags: string[];
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  propertyOfTheWeek: boolean;
  setPropertyOfTheWeek: (v: boolean) => void;
  newHome: boolean;
  setNewHome: (v: boolean) => void;
  refurbished: boolean;
  setRefurbished: (v: boolean) => void;
  reducedPrice: boolean;
  setReducedPrice: (v: boolean) => void;
  backOnMarket: boolean;
  setBackOnMarket: (v: boolean) => void;
  commissionApplicable: boolean;
  setCommissionApplicable: (v: boolean) => void;
}

function getCategoryMeta(label: string) {
  const def = PREDEFINED_TAGS.find((t) => t.label === label);
  return def ? TAG_CATEGORY_META[def.category] : TAG_CATEGORY_META.service;
}

/* ── Shared chip style tokens ── */
const chipBase =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold border rounded-lg transition-all cursor-pointer whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed';
const chipStyle = `${chipBase} text-[#0d1f2d] bg-[#0d1f2d]/6 border-[#0d1f2d]/25 hover:bg-[#0d1f2d]/12`;

const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
  <label className="relative inline-flex items-center cursor-pointer shrink-0">
    <input type="checkbox" className="sr-only" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
    <div className={`w-11 h-6 rounded-full transition-colors px-0.5 flex items-center ${enabled ? 'bg-[#0d5959]' : 'bg-[#d1d5db]'}`}>
      <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </label>
);

const QUICK_LABELS = [
  { key: 'propertyOfTheWeek', label: 'Property of the Week', desc: 'Showcase one standout property each week', icon: 'ri-trophy-line', color: '#C9A84C' },
  { key: 'newHome', label: 'New Home', desc: 'A newly built or recently completed home', icon: 'ri-home-heart-line', color: '#088135' },
  { key: 'refurbished', label: 'Refurbished', desc: 'Recently renovated or upgraded', icon: 'ri-paint-brush-line', color: '#B45309' },
  { key: 'reducedPrice', label: 'Reduced Price', desc: 'Asking price has been lowered', icon: 'ri-arrow-down-circle-line', color: '#E63946' },
  { key: 'backOnMarket', label: 'Back on Market', desc: 'Returned to market after being off', icon: 'ri-refresh-line', color: '#0F766E' },
];

const SectionHeader = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="mb-5">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 flex items-center justify-center shrink-0 bg-[#0d1f2d] rounded-lg">
        <i className={`${icon} text-white text-sm`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-[#0d1f2d] tracking-wide">{title}</h4>
        <p className="text-[12px] text-[#7a8a99] mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  </div>
);

export default function LabelsTagsStep({
  selectedTags,
  setSelectedTags,
  propertyOfTheWeek,
  setPropertyOfTheWeek,
  newHome,
  setNewHome,
  refurbished,
  setRefurbished,
  reducedPrice,
  setReducedPrice,
  backOnMarket,
  setBackOnMarket,
  commissionApplicable,
  setCommissionApplicable,
}: Props) {
  const quickLabelState: Record<string, { value: boolean; set: (v: boolean) => void }> = {
    propertyOfTheWeek: { value: propertyOfTheWeek, set: setPropertyOfTheWeek },
    newHome: { value: newHome, set: setNewHome },
    refurbished: { value: refurbished, set: setRefurbished },
    reducedPrice: { value: reducedPrice, set: setReducedPrice },
    backOnMarket: { value: backOnMarket, set: setBackOnMarket },
  };
  const [search, setSearch] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  const MAX_TAGS = 6;
  const atMax = selectedTags.length >= MAX_TAGS;

  const QUICK_PICKS = ['New Development', 'Luxury', 'Waterfront', 'Investment'];
  const quickPicks = QUICK_PICKS.filter((label) => !selectedTags.includes(label));

  const filteredSuggestions = PREDEFINED_TAGS.filter(
    (t) =>
      t.label.toLowerCase().includes(search.toLowerCase()) &&
      !selectedTags.includes(t.label),
  );

  const searchHasNoMatch =
    search.trim().length > 0 &&
    !PREDEFINED_TAGS.some((t) => t.label.toLowerCase() === search.trim().toLowerCase()) &&
    !selectedTags.includes(search.trim());

  const addTag = useCallback(
    (label: string) => {
      if (atMax) return;
      const trimmed = label.trim();
      if (!trimmed || selectedTags.includes(trimmed)) return;
      setSelectedTags((prev) => [...prev, trimmed]);
      setSearch('');
    },
    [atMax, selectedTags, setSelectedTags],
  );

  const removeTag = useCallback(
    (label: string) => {
      setSelectedTags((prev) => prev.filter((t) => t !== label));
    },
    [setSelectedTags],
  );

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    dragOverIdx.current = idx;
  };
  const handleDrop = () => {
    if (dragIdx === null || dragOverIdx.current === null || dragIdx === dragOverIdx.current) {
      setDragIdx(null);
      dragOverIdx.current = null;
      return;
    }
    setSelectedTags((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(dragOverIdx.current!, 0, moved);
      return next;
    });
    setDragIdx(null);
    dragOverIdx.current = null;
  };
  const handleDragEnd = () => {
    setDragIdx(null);
    dragOverIdx.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchHasNoMatch && !atMax) addTag(search.trim());
    }
  };

  // Group filtered suggestions by category
  const grouped: Record<TagCategory, TagDef[]> = {} as Record<TagCategory, TagDef[]>;
  for (const cat of Object.keys(TAG_CATEGORY_META) as TagCategory[]) {
    grouped[cat] = [];
  }
  for (const t of filteredSuggestions) {
    grouped[t.category].push(t);
  }

  return (
    <div className="w-full space-y-4">
      <SectionHeader
        icon="ri-price-tag-3-line"
        title="Labels & Tags"
        subtitle="Help buyers quickly identify key selling points"
      />

      {/* Quick Labels */}
      <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-4">
            <i className="ri-sparkling-line text-[#0d1f2d] text-sm" />
            <h5 className="text-[13px] font-semibold text-[#0d1f2d] tracking-wide">Quick Labels</h5>
            <span className="text-[11px] text-[#9ba5b1]">Up to 3 show on the property card</span>
          </div>
          <div className="space-y-1">
            {QUICK_LABELS.map((l) => {
              const st = quickLabelState[l.key];
              return (
                <div key={l.key} className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg hover:bg-[#f7f8fa] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `${l.color}14`, color: l.color }}>
                      <i className={`${l.icon} text-sm`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#0d1f2d]">{l.label}</p>
                      <p className="text-[12px] text-[#7a8a99]">{l.desc}</p>
                    </div>
                  </div>
                  <Toggle enabled={st.value} onChange={st.set} />
                </div>
              );
            })}
          </div>

          {/* Commission */}
          <div className="mt-3 pt-3 border-t border-[#e8ecf0]">
            <div className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 bg-[#0d1f2d]/10 text-[#0d1f2d]">
                  <i className="ri-hand-coin-line text-sm" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#0d1f2d]">Commission applies</p>
                  <p className="text-[12px] text-[#7a8a99]">Shown on the property detail page</p>
                </div>
              </div>
              <Toggle enabled={commissionApplicable} onChange={setCommissionApplicable} />
            </div>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
        <div className="px-5 py-4 space-y-4">

          {/* Search / create input */}
          <div className="flex items-center border-2 border-[#e8edf2] bg-white rounded-md px-3 py-0 focus-within:border-[#0d1f2d] focus-within:ring-4 focus-within:ring-[#0d1f2d]/10 transition-all gap-2.5">
            <i className="ri-search-line text-[#9ba5b1] text-sm shrink-0" />
            <input
              type="text"
              placeholder="Search or create a tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-[13px] font-medium text-[#0d1f2d] outline-none bg-transparent py-2 placeholder:text-[#b0bec5]"
            />
            {search.trim() && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="w-5 h-5 flex items-center justify-center text-[#9ba5b1] hover:text-[#1a1e24] cursor-pointer rounded transition-colors"
              >
                <i className="ri-close-line text-xs" />
              </button>
            )}
          </div>

          {/* Quick-pick chips (shown when not searching) */}
          {search.trim().length === 0 && quickPicks.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold tracking-wide text-[#6b7280] uppercase mb-2 leading-none">Quick Add</p>
              <div className="flex flex-wrap gap-2">
                {quickPicks.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => addTag(label)}
                    disabled={atMax}
                    className={`${chipStyle} gap-1.5`}
                  >
                    {label}
                    <span className="w-4 h-4 flex items-center justify-center rounded-full border border-[#0d1f2d]/40">
                      <i className="ri-add-line text-[10px]" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected tags (drag-to-reorder) */}
          {selectedTags.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-semibold tracking-wide text-[#6b7280] uppercase leading-none">
                  Selected Tags
                </p>
                <span className="text-[12px] text-[#9ba5b1] font-medium">
                  {selectedTags.length} / {MAX_TAGS} max
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag, idx) => {
                  const isPrimary = idx === 0;
                  return (
                    <span
                      key={tag}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold border rounded-lg transition-all cursor-grab active:cursor-grabbing select-none whitespace-nowrap ${
                        isPrimary
                          ? 'bg-[#0d1f2d] text-white border-[#0d1f2d]'
                          : 'text-[#0d1f2d] bg-[#0d1f2d]/6 border-[#0d1f2d]/25'
                      }`}
                    >
                      {isPrimary && (
                        <i className="ri-star-fill text-[10px] opacity-60" />
                      )}
                      <i className="ri-draggable text-xs opacity-40" />
                      {tag}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(tag);
                        }}
                        className={`w-4 h-4 flex items-center justify-center rounded-full cursor-pointer transition-colors ${
                          isPrimary
                            ? 'text-white/60 hover:text-white hover:bg-white/20'
                            : 'text-[#0d1f2d]/50 hover:text-[#0d1f2d] hover:bg-[#0d1f2d]/10'
                        }`}
                      >
                        <i className="ri-close-line text-[10px]" />
                      </button>
                    </span>
                  );
                })}
              </div>
              {selectedTags.length < 3 && (
                <p className="text-[12px] text-amber-600 font-semibold mt-2 flex items-center gap-1 leading-relaxed">
                  <i className="ri-information-line text-xs" />
                  Add at least 3 tags for best visibility in search results
                </p>
              )}
            </div>
          )}

          {/* Divider */}
          {search.trim().length === 0 && selectedTags.length > 0 && (
            <div className="h-px bg-[#e8ecf0]" />
          )}

          {/* Search results or default library */}
          {search.trim().length > 0 ? (
            <div>
              <p className="text-[12px] font-semibold tracking-wide text-[#6b7280] uppercase mb-3 leading-none">
                {filteredSuggestions.length > 0 ? 'Matching Tags' : 'No matching tags'}
              </p>
              {filteredSuggestions.length > 0 && (
                <div className="space-y-3">
                  {(Object.keys(TAG_CATEGORY_META) as TagCategory[]).map((cat) => {
                    const items = grouped[cat];
                    if (items.length === 0) return null;
                    const meta = TAG_CATEGORY_META[cat];
                    return (
                      <div key={cat}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <i className={`${meta.icon} text-[12px] text-[#0d1f2d]/70`} />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0d1f2d]">
                            {meta.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {items.map((tag) => (
                            <button
                              key={tag.label}
                              type="button"
                              onClick={() => addTag(tag.label)}
                              disabled={atMax}
                              className={chipStyle}
                            >
                              {tag.label}
                              <i className="ri-add-line text-xs" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {searchHasNoMatch && (
                <button
                  type="button"
                  onClick={() => addTag(search.trim())}
                  disabled={atMax}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold border border-dashed border-[#0d1f2d]/30 text-[#0d1f2d] rounded-lg hover:border-[#0d1f2d] hover:bg-[#0d1f2d]/6 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <i className="ri-add-circle-line text-sm" />
                  Create &quot;{search.trim()}&quot;
                </button>
              )}
            </div>
          ) : (
            /* Full tag library - compact grid */
            <div>
              <p className="text-[12px] font-semibold tracking-wide text-[#6b7280] uppercase mb-3 leading-none">
                Tag Library
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(TAG_CATEGORY_META) as TagCategory[]).map((cat) => {
                  const items = PREDEFINED_TAGS.filter(
                    (t) => t.category === cat && !selectedTags.includes(t.label),
                  );
                  if (items.length === 0) return null;
                  const meta = TAG_CATEGORY_META[cat];
                  return (
                    <div key={cat} className="border border-[#e8ecf0] rounded-lg overflow-hidden">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f9fb] border-b border-[#e8ecf0]">
                        <i className={`${meta.icon} text-[11px] text-[#0d1f2d]/70`} />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0d1f2d]">
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 p-2.5">
                        {items.map((tag) => (
                          <button
                            key={tag.label}
                            type="button"
                            onClick={() => addTag(tag.label)}
                            disabled={atMax}
                            className={chipStyle}
                          >
                            {tag.label}
                            <i className="ri-add-line text-[10px]" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}