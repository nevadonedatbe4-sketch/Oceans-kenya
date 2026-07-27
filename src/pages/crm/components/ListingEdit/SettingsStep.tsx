import { Agent } from './types';

interface Props {
  agents: Agent[];
  agentId: string;
  setAgentId: (v: string) => void;
  isFeatured: boolean;
  setIsFeatured: (v: boolean) => void;
  onPublish: () => void;
  title: string;
  propertyType: string;
  neighbourhood: string;
  price: string;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  images: string[];
  purpose: string;
  slug?: string;
}

const PURPOSE_LABELS: Record<string, string> = {
  sale: 'For Sale',
  rent: 'For Rent',
  joint_ventures: 'Joint Venture',
  new_development: 'New Development',
  short_stay: 'Short Stay',
  sold: 'Sold',
  rented: 'Rented',
};

const TYPE_LABELS: Record<string, string> = {
  house: 'House',
  apartment: 'Apartment',
  villa: 'Villa',
  townhouse: 'Townhouse',
  penthouse: 'Penthouse',
  studio: 'Studio Flat',
  detached: 'Detached',
  'semi-detached': 'Semi-Detached',
  terraced: 'Terraced',
  flat: 'Flat',
  bungalow: 'Bungalow',
  commercial: 'Commercial',
  office: 'Office',
  land: 'Land',
  'farms_/_land': 'Farms / Land',
  park_home: 'Park Home',
  studio_flat: 'Studio Flat',
};

/* ── Design tokens ── */
const selectClass =
  "w-full text-sm font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] cursor-pointer appearance-none rounded-md bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%237a8a99%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:20px_20px] pr-11";

const labelClass = 'block text-[14px] font-bold tracking-wide text-[#0d1f2d] uppercase mb-2.5 leading-none';
const hintClass = 'text-[15px] text-[#4a5568] mt-2 leading-relaxed';

/* ── Section Header ── */
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

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
    <div className="px-6 py-6">{children}</div>
  </div>
);

/* ── Toggle ── */
const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
  <label className="relative inline-flex items-center cursor-pointer shrink-0">
    <input type="checkbox" className="sr-only" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
    <div className={`w-12 h-7 rounded-full transition-colors px-0.5 flex items-center ${enabled ? 'bg-[#0d5959]' : 'bg-[#d1d5db]'}`}>
      <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </label>
);

export default function SettingsStep({
  agents, agentId, setAgentId, isFeatured, setIsFeatured,
  title, propertyType, neighbourhood, price, currency,
  bedrooms, bathrooms, amenities, images, purpose,
}: Props) {
  const displayTitle = title || 'Untitled Draft';
  const displayType = TYPE_LABELS[propertyType] || propertyType || '—';
  const displayLocation = neighbourhood || 'Not set';
  const formattedPrice = price ? `${currency} ${Number(price).toLocaleString()}` : 'Not set';
  const photoCount = images.length;
  const amenityCount = amenities.length;
  const purposeLabel = PURPOSE_LABELS[purpose] || purpose;

  return (
    <div className="w-full space-y-5">

      {/* Agent Assignment */}
      <SectionHeader
        icon="ri-user-star-line"
        title="Agent Assignment"
        subtitle="Assign an agent to handle inquiries"
      />
      <Card>
        <label className={labelClass}>Assigned Agent</label>
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className={selectClass}
        >
          <option value="">No agent assigned</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>{agent.name}</option>
          ))}
        </select>
        <p className={hintClass}>The assigned agent will be shown on the property detail page</p>
      </Card>

      {/* Featured Property */}
      <SectionHeader
        icon="ri-star-line"
        title="Featured Property"
        subtitle="Mark this listing to appear in featured sections"
      />
      <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
        <div className="flex items-center justify-between gap-4 px-6 py-5 hover:bg-[#fafbfc] transition-colors">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-lg border border-[#e8ecf0] bg-[#f4f6f8]">
              <i className="ri-star-line text-sm text-[#5a6a7a]" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[#1a1e24]">
                {isFeatured ? 'Featured Listing' : 'Standard Listing'}
              </p>
              <p className="text-[13px] text-[#7a8a99] mt-0.5 leading-relaxed">
                {isFeatured
                  ? 'This property will appear in featured sections'
                  : 'Toggle on to feature this property across the site'}
              </p>
            </div>
          </div>
          <Toggle enabled={isFeatured} onChange={setIsFeatured} />
        </div>
      </div>

      {/* Property Summary */}
      <SectionHeader
        icon="ri-file-list-line"
        title="Property Summary"
        subtitle="Review your listing before publishing"
      />
      <div className="bg-[#001731] border-l-2 border-[#d3bb6e] overflow-hidden rounded-xl">
        <div className="px-6 py-6">
          <div className="flex items-center gap-2 mb-6">
            <i className="ri-file-list-line text-[#d3bb6e] text-sm" />
            <p className="text-[13px] font-bold text-[#d3bb6e] uppercase tracking-widest">Summary</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { label: 'Title', value: displayTitle },
              { label: 'Type', value: displayType },
              { label: 'Location', value: displayLocation },
              { label: 'Price', value: formattedPrice },
              { label: 'Bedrooms', value: String(bedrooms) },
              { label: 'Bathrooms', value: String(bathrooms) },
            ].map(({ label, value }) => (
              <div key={label}>
                <span className="text-[11px] font-bold text-[#d3bb6e]/60 uppercase tracking-widest">{label}</span>
                <p className="text-[15px] font-semibold text-white mt-1.5 truncate" title={value}>{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-[#d3bb6e]/20 flex items-center gap-2.5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-md ${
              photoCount === 0 ? 'bg-red-500/10 text-red-300' : 'bg-[#16a34a]/10 text-[#86efac]'
            }`}>
              <i className="ri-image-line" />
              {photoCount === 0 ? 'No photos' : `${photoCount} photo${photoCount !== 1 ? 's' : ''}`}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-md ${
              amenityCount > 0 ? 'bg-[#16a34a]/10 text-[#86efac]' : 'bg-white/10 text-white/40'
            }`}>
              <i className="ri-list-check" />
              {amenityCount} amenit{amenityCount !== 1 ? 'ies' : 'y'}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-md ${
              isFeatured ? 'bg-[#d3bb6e]/10 text-[#d3bb6e]' : 'bg-white/10 text-white/40'
            }`}>
              <i className="ri-star-line" />
              {isFeatured ? 'Featured' : 'Not Featured'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-md bg-white/10 text-white/70">
              <i className="ri-price-tag-3-line" />
              {purposeLabel}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}