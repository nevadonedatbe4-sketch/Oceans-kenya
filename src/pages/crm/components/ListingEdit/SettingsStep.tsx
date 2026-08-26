import { useState } from 'react';
import { Agent, isLandType } from './types';

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
  isAgentRequired?: boolean;
  // Private source & contact continuity
  ownerName: string;
  setOwnerName: (v: string) => void;
  ownerPhone: string;
  setOwnerPhone: (v: string) => void;
  ownerEmail: string;
  setOwnerEmail: (v: string) => void;
  ownerRole: string;
  setOwnerRole: (v: string) => void;
  sourceName: string;
  setSourceName: (v: string) => void;
  sourceUrl: string;
  setSourceUrl: (v: string) => void;
  sourcePoster: string;
  setSourcePoster: (v: string) => void;
  caretakerName: string;
  setCaretakerName: (v: string) => void;
  caretakerPhone: string;
  setCaretakerPhone: (v: string) => void;
  caretakerRole: string;
  setCaretakerRole: (v: string) => void;
  dateSourced: string;
  setDateSourced: (v: string) => void;
  sourceNotes: string;
  setSourceNotes: (v: string) => void;
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
  studio: 'Studio',
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
};

const CONTACT_ROLES = [
  { value: 'landlord', label: 'Landlord / Owner' },
  { value: 'caretaker', label: 'Caretaker / On-site Contact' },
  { value: 'poster', label: 'Original Poster' },
  { value: 'agent', label: 'Agent' },
  { value: 'other', label: 'Other' },
];

/* ── Design tokens ── */
const selectClass =
  "w-full text-sm font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] cursor-pointer appearance-none rounded-md bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%237a8a99%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:20px_20px] pr-11";

const inputClass = "w-full text-sm font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] rounded-md";

const textareaClass = "w-full text-sm font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] rounded-md resize-y min-h-[96px]";

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
  isAgentRequired,
  ownerName, setOwnerName, ownerPhone, setOwnerPhone, ownerEmail, setOwnerEmail,
  ownerRole, setOwnerRole, caretakerRole, setCaretakerRole,
  sourceName, setSourceName, sourceUrl, setSourceUrl, sourcePoster, setSourcePoster,
  caretakerName, setCaretakerName, caretakerPhone, setCaretakerPhone,
  dateSourced, setDateSourced, sourceNotes, setSourceNotes,
}: Props) {
  const displayTitle = title || 'Untitled Draft';
  const displayType = TYPE_LABELS[propertyType] || propertyType || '—';
  const displayLocation = neighbourhood || 'Not set';
  const formattedPrice = price ? `${currency} ${Number(price).toLocaleString()}` : 'Not set';
  const photoCount = images.length;
  const amenityCount = amenities.length;
  const purposeLabel = PURPOSE_LABELS[purpose] || purpose;
  const isLand = isLandType(propertyType);
  const isNewDevelopment = purpose === 'new_development';
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="w-full space-y-5">

      {/* Agent Assignment */}
      <SectionHeader
        icon="ri-user-star-line"
        title="Agent Assignment"
        subtitle="Assign an agent to handle inquiries"
      />
      <Card>
        <label className={labelClass}>Assigned Agent{isAgentRequired !== false ? ' *' : ''}</label>
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

      {/* Source & Contact (Private) */}
      <SectionHeader
        icon="ri-lock-line"
        title="Source & Contact"
        subtitle="Landlord, caretaker & original source — visible to your team only, never on the public site"
      />
      <div className="border border-[#088135]/40 bg-[#e6f4ea] overflow-hidden rounded-xl">
        <button
          type="button"
          onClick={() => setContactOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-6 py-5 hover:bg-[#dff1e5] transition-colors cursor-pointer text-left"
        >
          <div className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg bg-[#088135]/15">
            <i className="ri-shield-keyhole-line text-sm text-[#088135]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#088135] uppercase tracking-widest">Internal continuity</p>
            <p className="text-[12px] text-[#7a8a99] mt-0.5 leading-relaxed">
              Agents leave, numbers change — this keeps every listing contactable. Only logged-in team members ever see this.
            </p>
          </div>
          <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-lg bg-white text-[#065a27]">
            <i className={`${contactOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-lg`} />
          </div>
        </button>

        {contactOpen && (
        <div className="px-6 py-6">

          {/* Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-[13px] font-bold tracking-wide text-[#0d1f2d] mb-2">Source Name</label>
              <input type="text" value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="e.g. Facebook group, website, referral" className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] font-bold tracking-wide text-[#0d1f2d] mb-2">Source Link</label>
              <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://facebook.com/groups/…" className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] font-bold tracking-wide text-[#0d1f2d] mb-2">Original Poster</label>
              <input type="text" value={sourcePoster} onChange={(e) => setSourcePoster(e.target.value)} placeholder="Name of the person who listed it" className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] font-bold tracking-wide text-[#0d1f2d] mb-2">Date Sourced</label>
              <input type="date" value={dateSourced} onChange={(e) => setDateSourced(e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Landlord */}
          <div className="mb-6">
            <p className="text-[13px] font-bold text-[#0d1f2d] mb-3">Landlord / Owner</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Role</label>
                <select value={ownerRole} onChange={(e) => setOwnerRole(e.target.value)} className={selectClass}>
                  {CONTACT_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Name</label>
                <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Landlord name" className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Phone</label>
                <input type="tel" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="+254 7xx xxx xxx" className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Email</label>
                <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="landlord@email.com" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Caretaker */}
          <div className="mb-6">
            <p className="text-[13px] font-bold text-[#0d1f2d] mb-3">Caretaker / On-site Contact</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Role</label>
                <select value={caretakerRole} onChange={(e) => setCaretakerRole(e.target.value)} className={selectClass}>
                  {CONTACT_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Name</label>
                <input type="text" value={caretakerName} onChange={(e) => setCaretakerName(e.target.value)} placeholder="Caretaker / on-site contact" className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4a5568] mb-1.5">Phone</label>
                <input type="tel" value={caretakerPhone} onChange={(e) => setCaretakerPhone(e.target.value)} placeholder="+254 7xx xxx xxx" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[13px] font-bold tracking-wide text-[#0d1f2d] mb-2">Notes</label>
            <textarea
              value={sourceNotes}
              onChange={(e) => setSourceNotes(e.target.value)}
              maxLength={500}
              placeholder="Access instructions, viewing arrangements, commission structure, red flags…"
              className={textareaClass}
            />
            <p className="text-[12px] text-[#9ba5b1] mt-1.5 text-right">{sourceNotes.length}/500</p>
          </div>
        </div>
        )}
      </div>

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
            {(isLand
              ? [
                  { label: 'Title', value: displayTitle },
                  { label: 'Type', value: displayType },
                  { label: 'Location', value: displayLocation },
                  { label: 'Price', value: formattedPrice },
                  { label: 'Purpose', value: purposeLabel },
                ]
              : [
                  { label: 'Title', value: displayTitle },
                  { label: 'Type', value: displayType },
                  { label: 'Location', value: displayLocation },
                  { label: 'Price', value: formattedPrice },
                  { label: 'Bedrooms', value: String(bedrooms) },
                  { label: 'Bathrooms', value: String(bathrooms) },
                ]
            ).map(({ label, value }) => (
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
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-md ${
              isNewDevelopment ? 'bg-[#d3bb6e]/10 text-[#d3bb6e]' : 'bg-white/10 text-white/40'
            }`}>
              <i className="ri-building-line" />
              {isNewDevelopment ? 'New Dev' : 'Not New Dev'}
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