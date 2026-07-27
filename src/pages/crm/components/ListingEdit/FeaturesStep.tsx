import { useState } from 'react';

interface AmenityGroup {
  label: string;
  icon: string;
  items: string[];
}

interface Props {
  amenities: string[];
  setAmenities: React.Dispatch<React.SetStateAction<string[]>>;
  customFeatures: string[];
  setCustomFeatures: React.Dispatch<React.SetStateAction<string[]>>;
  propertyType?: string;
}

const PROPERTY_AMENITY_GROUPS: AmenityGroup[] = [
  {
    label: 'Outdoor & Leisure',
    icon: 'ri-sun-line',
    items: [
      'Swimming Pool', 'Mature Gardens', 'Rooftop Terrace', 'Large Balcony',
      'BBQ Area', 'Pet Friendly', "Children's Play Area", 'Tennis Court',
      'Outdoor Kitchen', 'Gym',
    ],
  },
  {
    label: 'Security',
    icon: 'ri-shield-check-line',
    items: [
      '24/7 Security', 'CCTV Surveillance', 'Guard House', 'Electric Fence',
      'Gated Community', 'Smart Home', 'Intercom System', 'Security Lights',
    ],
  },
  {
    label: 'Comfort & Utilities',
    icon: 'ri-settings-3-line',
    items: [
      'Air Conditioning', 'Backup Power / Generator', 'Borehole', 'Water Tank',
      'Solar Power', 'Internet / WiFi', 'Central Heating', 'Water Heater',
      'Laundry Room', 'Electricity', 'Water', 'Sewer', 'Gas', 'Cable TV',
    ],
  },
  {
    label: 'Interior',
    icon: 'ri-home-2-line',
    items: [
      'Furnished', 'Fully Fitted Kitchen', 'Walk-in Closet', 'En-suite Bedrooms',
      'Study / Home Office', "Maid's Room", 'Elevator', 'Fireplace',
      'Wheelchair Accessible', 'Staff Quarters', 'Store Room',
    ],
  },
  {
    label: 'Parking & Access',
    icon: 'ri-car-line',
    items: [
      'Parking', 'Underground Parking', 'Visitor Parking', 'Wheelchair Access',
      'Proximity to Main Road', 'Near Public Transport',
    ],
  },
];

const LAND_AMENITY_GROUPS: AmenityGroup[] = [
  {
    label: 'Utilities & Infrastructure',
    icon: 'ri-plug-line',
    items: [
      'Electricity Connection', 'Water Connection', 'Borehole', 'Water Tank',
      'Solar Power', 'Sewer Connection', 'Rainwater Collection',
    ],
  },
  {
    label: 'Security & Boundaries',
    icon: 'ri-shield-check-line',
    items: ['Fenced / Walled', 'Gated Community', 'Security', 'Security Lights'],
  },
  {
    label: 'Access & Location',
    icon: 'ri-map-pin-2-line',
    items: [
      'Road Access', 'Near Main Road', 'Near School', 'Near Hospital',
      'Near Shopping Centre', 'Near Public Transport',
    ],
  },
  {
    label: 'Land Features',
    icon: 'ri-landscape-line',
    items: [
      'River Frontage', 'Lake View / Access', 'Scenic / Hilltop View',
      'Level / Flat Terrain', 'Gentle Sloping', 'Wooded / Forested',
    ],
  },
  {
    label: 'Title & Zoning',
    icon: 'ri-file-text-line',
    items: [
      'Title Deed Ready', 'Surveyed / Beaconed', 'Ready to Build', 'Agricultural Use',
      'Residential Zoning', 'Commercial Zoning', 'Mixed Use Zoning', 'Industrial Zoning',
    ],
  },
];

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

export default function FeaturesStep({
  amenities,
  setAmenities,
  customFeatures,
  setCustomFeatures,
  propertyType,
}: Props) {
  const [customInput, setCustomInput] = useState('');
  const isLand = propertyType === 'land';
  const groups = isLand ? LAND_AMENITY_GROUPS : PROPERTY_AMENITY_GROUPS;

  const allGroupItems = groups.flatMap((g) => g.items);
  const existingOrphaned = amenities.filter((a) => !allGroupItems.includes(a));

  const toggleAmenity = (name: string) => {
    setAmenities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name],
    );
  };

  const handleOrphanRemove = (name: string) => {
    setAmenities((prev) => prev.filter((a) => a !== name));
    setCustomFeatures((prev) => prev.filter((f) => f !== name));
  };

  const addCustomFeature = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!customFeatures.includes(trimmed)) {
      setCustomFeatures((prev) => [...prev, trimmed]);
    }
    if (!amenities.includes(trimmed)) {
      setAmenities((prev) => [...prev, trimmed]);
    }
    setCustomInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomFeature();
    }
  };

  return (
    <div className="w-full space-y-5">
      <SectionHeader
        icon="ri-star-smile-line"
        title="Amenities & Features"
        subtitle="Add what makes this property special"
      />

      {/* Custom amenity input */}
      <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
        <div className="px-6 py-5 flex gap-3">
          <input
            placeholder="Type a custom amenity and press Enter..."
            className={inputBase}
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            onClick={addCustomFeature}
            disabled={!customInput.trim()}
            className="px-6 py-3.5 bg-[#0d1f2d] text-white text-[13px] font-semibold uppercase tracking-wide hover:bg-[#0d5959] rounded-md transition-colors cursor-pointer whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>

      {/* Category groups */}
      {groups.map((group) => (
        <div key={group.label} className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
          {/* Group header */}
          <div className="px-6 py-4 border-b border-[#f0f3f5] flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center shrink-0 bg-[#f4f6f8] rounded-lg">
              <i className={`${group.icon} text-[#0d5959] text-sm`} />
            </div>
            <span className="text-[13px] font-semibold text-[#0d1f2d] uppercase tracking-wide">{group.label}</span>
            <span className="ml-auto text-[13px] text-[#9ba5b1]">
              {group.items.filter((i) => amenities.includes(i)).length} selected
            </span>
          </div>
          {/* Items grid */}
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.items.map((item) => {
              const checked = amenities.includes(item);
              return (
                <label
                  key={item}
                  className={`flex items-center gap-3 py-3 px-4 border rounded-lg transition-all cursor-pointer select-none ${
                    checked
                      ? 'bg-[#0d5959]/5 border-[#0d5959]'
                      : 'bg-white border-[#e8ecf0] hover:border-[#0d5959]/40'
                  }`}
                >
                  <div className="relative w-5 h-5 shrink-0">
                    <input
                      className="peer sr-only"
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAmenity(item)}
                    />
                    <div
                      className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                        checked ? 'border-[#0d5959] bg-[#0d5959]' : 'border-[#c8cdd5] bg-transparent'
                      }`}
                    >
                      <i className={`ri-check-line text-[11px] text-white transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                  </div>
                  <span className={`text-[14px] leading-snug transition-colors ${checked ? 'text-[#0d5959] font-medium' : 'text-[#4a5568]'}`}>
                    {item}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {/* Orphaned / custom-typed amenities */}
      {existingOrphaned.length > 0 && (
        <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
          <div className="px-6 py-4 border-b border-[#f0f3f5] flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center shrink-0 bg-[#f4f6f8] rounded-lg">
              <i className="ri-sparkling-line text-[#0d5959] text-sm" />
            </div>
            <span className="text-[13px] font-semibold text-[#0d1f2d] uppercase tracking-wide">Custom</span>
          </div>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {existingOrphaned.map((item) => (
              <label
                key={item}
                className="flex items-center gap-3 py-3 px-4 border rounded-lg bg-[#0d5959]/5 border-[#0d5959] cursor-pointer select-none"
              >
                <div className="w-5 h-5 border-2 rounded flex items-center justify-center border-[#0d5959] bg-[#0d5959] shrink-0">
                  <i className="ri-check-line text-[11px] text-white" />
                </div>
                <span className="text-[14px] text-[#0d5959] font-medium flex-1">{item}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleOrphanRemove(item);
                  }}
                  className="w-6 h-6 flex items-center justify-center text-[#7a8a99] hover:text-red-500 transition-colors cursor-pointer shrink-0 rounded"
                >
                  <i className="ri-close-line text-sm" />
                </button>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Added custom features summary */}
      {customFeatures.length > 0 && (
        <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
          <div className="px-6 py-4 border-b border-[#f0f3f5] flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center shrink-0 bg-[#f4f6f8] rounded-lg">
              <i className="ri-list-check text-[#0d5959] text-sm" />
            </div>
            <span className="text-[13px] font-semibold text-[#0d1f2d] uppercase tracking-wide">Added Features</span>
            <span className="ml-auto text-[13px] text-[#9ba5b1]">{customFeatures.length} custom</span>
          </div>
          <div className="px-6 py-5 flex flex-wrap gap-2">
            {customFeatures.map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium border rounded-lg transition-all cursor-pointer whitespace-nowrap bg-[#0d5959]/5 border-[#0d5959]/20 text-[#0d5959] hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                onClick={() => handleOrphanRemove(feature)}
              >
                {feature}
                <i className="ri-close-line text-xs" />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}