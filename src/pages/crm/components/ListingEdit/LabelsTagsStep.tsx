import { useState, useCallback, useRef } from 'react';

// ---- Tag Categories & Definitions ----

export interface TagDef {
  label: string;
  category: TagCategory;
}

export type TagCategory = 'status' | 'development' | 'lifestyle' | 'community' | 'investment' | 'service';

export const TAG_CATEGORY_META: Record<TagCategory, { label: string; icon: string; color: string; bg: string; border: string }> = {
  status:      { label: 'Status',       icon: 'ri-flag-line',        color: '#0d9488', bg: 'bg-[#0d9488]/8',  border: 'border-[#0d9488]/30' },
  development: { label: 'Development',  icon: 'ri-building-line',    color: '#d97706', bg: 'bg-[#d97706]/8',  border: 'border-[#d97706]/30' },
  lifestyle:   { label: 'Lifestyle',    icon: 'ri-heart-line',       color: '#e11d48', bg: 'bg-[#e11d48]/8',  border: 'border-[#e11d48]/30' },
  community:   { label: 'Community',    icon: 'ri-group-line',       color: '#0d5959', bg: 'bg-[#0d5959]/8',  border: 'border-[#0d5959]/30' },
  investment:  { label: 'Investment',   icon: 'ri-line-chart-line',  color: '#ea580c', bg: 'bg-[#ea580c]/8',  border: 'border-[#ea580c]/30' },
  service:     { label: 'Service',      icon: 'ri-service-line',     color: '#52525b', bg: 'bg-[#52525b]/8',  border: 'border-[#52525b]/30' },
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
}

function getCategoryMeta(label: string) {
  const def = PREDEFINED_TAGS.find((t) => t.label === label);
  return def ? TAG_CATEGORY_META[def.category] : TAG_CATEGORY_META.service;
}

/* ── Design tokens ── */
const inputBase =
  'w-full text-sm font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] placeholder:font-normal rounded-md';

const SectionHeader = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="mb-7">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-[#0d1f2d] rounded-lg">
        <i className={`${icon} text-white text-base`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-semibold text-[#0d1f2d] tracking-wide">{title}</h4>
        <p className="text-[13px] text-[#7a8a99] mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
    </div>
    <div className="h-px bg-[#e5e7eb] mt-4" />
  </div>
);

export default function LabelsTagsStep({ selectedTags, setSelectedTags }: Props) {
  const [search, setSearch] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  const MAX_TAGS = 6;
  const atMax = selectedTags.length >= MAX_TAGS;

  // Featured quick-picks shown directly below the search bar
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
    <div className="w-full space-y-5">
      <SectionHeader
        icon="ri-price-tag-3-line"
        title="Labels & Tags"
        subtitle="Help buyers quickly identify key selling points"
      />

      {/* Main card */}
      <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
        <div className="px-6 py-6 space-y-6">

          {/* Search / create input */}
          <div className="flex items-center border-2 border-[#e8edf2] bg-white rounded-md px-3 py-0.5 focus-within:border-[#0d5959] focus-within:ring-4 focus-within:ring-[#0d5959]/10 transition-all gap-3">
            <i className="ri-search-line text-[#9ba5b1] text-base shrink-0" />
            <input
              type="text"
              placeholder="Search or create a tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-sm font-medium text-[#0d1f2d] outline-none bg-transparent py-2.5 placeholder:text-[#b0bec5]"
            />
            {search.trim() && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="w-6 h-6 flex items-center justify-center text-[#9ba5b1] hover:text-[#1a1e24] cursor-pointer rounded transition-colors"
              >
                <i className="ri-close-line text-sm" />
              </button>
            )}
          </div>

          {/* Quick-pick chips (shown when not searching) */}
          {search.trim().length === 0 && quickPicks.length > 0 && (
            <div>
              <p className="text-[13px] font-semibold tracking-wide text-[#4a5568] uppercase mb-3 leading-none">Quick Add</p>
              <div className="flex flex-wrap gap-2.5">
                {quickPicks.map((label) => {
                  const meta = getCategoryMeta(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => addTag(label)}
                      disabled={atMax}
                      className={`inline-flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-semibold border rounded-lg transition-all cursor-pointer whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed ${meta.bg} ${meta.border} hover:opacity-80`}
                      style={{ color: meta.color }}
                    >
                      {label}
                      <span className="w-5 h-5 flex items-center justify-center rounded-full border" style={{ borderColor: meta.color }}>
                        <i className="ri-add-line text-xs" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected tags (drag-to-reorder) */}
          {selectedTags.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold tracking-wide text-[#4a5568] uppercase leading-none">
                  Selected Tags
                </p>
                <span className="text-[13px] text-[#9ba5b1] font-medium">
                  {selectedTags.length} / {MAX_TAGS} max
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {selectedTags.map((tag, idx) => {
                  const meta = getCategoryMeta(tag);
                  const isPrimary = idx === 0;
                  return (
                    <span
                      key={tag}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      className={`inline-flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-semibold border rounded-lg transition-all cursor-grab active:cursor-grabbing select-none whitespace-nowrap ${
                        isPrimary
                          ? 'bg-[#0d1f2d] text-white border-[#0d1f2d]'
                          : `${meta.bg} ${meta.border}`
                      }`}
                      style={!isPrimary ? { color: meta.color } : undefined}
                    >
                      {isPrimary && (
                        <i className="ri-star-fill text-[10px] opacity-60" />
                      )}
                      <i className="ri-draggable text-sm opacity-40" />
                      {tag}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(tag);
                        }}
                        className={`w-5 h-5 flex items-center justify-center rounded-full cursor-pointer transition-colors ${
                          isPrimary
                            ? 'text-white/60 hover:text-white hover:bg-white/20'
                            : 'opacity-50 hover:opacity-100'
                        }`}
                        style={!isPrimary ? { color: meta.color } : undefined}
                      >
                        <i className="ri-close-line text-xs" />
                      </button>
                    </span>
                  );
                })}
              </div>
              {selectedTags.length < 3 && (
                <p className="text-[13px] text-amber-600 font-semibold mt-3 flex items-center gap-1.5 leading-relaxed">
                  <i className="ri-information-line text-sm" />
                  Add at least 3 tags for best visibility in search results
                </p>
              )}
            </div>
          )}

          {/* Divider */}
          {search.trim().length === 0 && selectedTags.length > 0 && (
            <div className="h-px bg-[#f0f3f5]" />
          )}

          {/* Search results or default library */}
          {search.trim().length > 0 ? (
            <div>
              <p className="text-[13px] font-semibold tracking-wide text-[#4a5568] uppercase mb-4 leading-none">
                {filteredSuggestions.length > 0 ? 'Matching Tags' : 'No matching tags'}
              </p>
              {filteredSuggestions.length > 0 && (
                <div className="space-y-4">
                  {(Object.keys(TAG_CATEGORY_META) as TagCategory[]).map((cat) => {
                    const items = grouped[cat];
                    if (items.length === 0) return null;
                    const meta = TAG_CATEGORY_META[cat];
                    return (
                      <div key={cat}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <i className={`${meta.icon} text-[13px]`} style={{ color: meta.color }} />
                          <span className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {items.map((tag) => (
                            <button
                              key={tag.label}
                              type="button"
                              onClick={() => addTag(tag.label)}
                              disabled={atMax}
                              className={`inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold border rounded-lg transition-all cursor-pointer whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed ${meta.bg} ${meta.border} hover:opacity-80`}
                              style={{ color: meta.color }}
                            >
                              {tag.label}
                              <i className="ri-add-line text-sm" />
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
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold border border-dashed border-[#d4d8df] text-[#7a8a99] rounded-lg hover:border-[#0d5959] hover:text-[#0d5959] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <i className="ri-add-circle-line text-base" />
                  Create &quot;{search.trim()}&quot;
                </button>
              )}
            </div>
          ) : (
            /* Full tag library grouped by category */
            <div>
              <p className="text-[13px] font-semibold tracking-wide text-[#4a5568] uppercase mb-4 leading-none">
                Tag Library
              </p>
              <div className="space-y-5">
                {(Object.keys(TAG_CATEGORY_META) as TagCategory[]).map((cat) => {
                  const items = PREDEFINED_TAGS.filter(
                    (t) => t.category === cat && !selectedTags.includes(t.label),
                  );
                  if (items.length === 0) return null;
                  const meta = TAG_CATEGORY_META[cat];
                  return (
                    <div key={cat} className="border border-[#f0f3f5] rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2.5 px-4 py-3 bg-[#fafbfc] border-b border-[#f0f3f5]">
                        <i className={`${meta.icon} text-[13px]`} style={{ color: meta.color }} />
                        <span className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 p-4">
                        {items.map((tag) => (
                          <button
                            key={tag.label}
                            type="button"
                            onClick={() => addTag(tag.label)}
                            disabled={atMax}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold border rounded-lg transition-all cursor-pointer whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed ${meta.bg} ${meta.border} hover:opacity-80`}
                            style={{ color: meta.color }}
                          >
                            {tag.label}
                            <i className="ri-add-line text-sm" />
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