import { useState, useRef } from 'react';
import { COLORS, Agent, INTERIOR_FINISHES, WATER_SUPPLIES, CONSTRUCTION_TYPES } from './types';
import { uploadImageViaEdgeFunction } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  agents: Agent[];
  agentId: string;
  setAgentId: (v: string) => void;
  seoTitle: string;
  setSeoTitle: (v: string) => void;
  seoDescription: string;
  setSeoDescription: (v: string) => void;
  isPublished: boolean;
  setIsPublished: (v: boolean) => void;
  isPending: boolean;
  setIsPending: (v: boolean) => void;
  isFeatured: boolean;
  setIsFeatured: (v: boolean) => void;
  isHomepage: boolean;
  setIsHomepage: (v: boolean) => void;
  ownerName: string;
  setOwnerName: (v: string) => void;
  ownerPhone: string;
  setOwnerPhone: (v: string) => void;
  ownerEmail: string;
  setOwnerEmail: (v: string) => void;
  ownerContact: string;
  setOwnerContact: (v: string) => void;
  commissionTracking: string;
  setCommissionTracking: (v: string) => void;
  leadAssignment: string;
  setLeadAssignment: (v: string) => void;
  privateListing: boolean;
  setPrivateListing: (v: boolean) => void;
  stickyListing: boolean;
  setStickyListing: (v: boolean) => void;
  includeSearch: boolean;
  setIncludeSearch: (v: boolean) => void;
  includeFeatured: boolean;
  setIncludeFeatured: (v: boolean) => void;
  featuredNeighborhood: boolean;
  setFeaturedNeighborhood: (v: boolean) => void;
  // Final fields
  featuredNewDevelopment: boolean;
  setFeaturedNewDevelopment: (v: boolean) => void;
  priorityRanking: string;
  setPriorityRanking: (v: string) => void;
  autoSEO: boolean;
  setAutoSEO: (v: boolean) => void;
  openGraphImage: string;
  setOpenGraphImage: (v: string) => void;
  interiorFinish: string;
  setInteriorFinish: (v: string) => void;
  flooringType: string;
  setFlooringType: (v: string) => void;
  ceilingHeight: string;
  setCeilingHeight: (v: string) => void;
  waterSupply: string;
  setWaterSupply: (v: string) => void;
  constructionType: string;
  setConstructionType: (v: string) => void;
  completionDate: string;
  setCompletionDate: (v: string) => void;
  // For auto-SEO
  title: string;
  description: string;
  id?: string;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  propertyType?: string;
}

export default function SettingsStep({
  agents, agentId, setAgentId, seoTitle, setSeoTitle, seoDescription, setSeoDescription,
  isPublished, setIsPublished, isPending, setIsPending, isFeatured, setIsFeatured,
  isHomepage, setIsHomepage, ownerName, setOwnerName, ownerPhone, setOwnerPhone,
  ownerEmail, setOwnerEmail, ownerContact, setOwnerContact, commissionTracking,
  setCommissionTracking, leadAssignment, setLeadAssignment, privateListing, setPrivateListing,
  stickyListing, setStickyListing, includeSearch, setIncludeSearch, includeFeatured,
  setIncludeFeatured, featuredNeighborhood, setFeaturedNeighborhood,
  featuredNewDevelopment, setFeaturedNewDevelopment, priorityRanking, setPriorityRanking,
  autoSEO, setAutoSEO, openGraphImage, setOpenGraphImage,
  interiorFinish, setInteriorFinish, flooringType, setFlooringType,
  ceilingHeight, setCeilingHeight, waterSupply, setWaterSupply,
  constructionType, setConstructionType, completionDate, setCompletionDate,
  title, description, id, uploading, setUploading, propertyType,
}: Props) {
  const { user } = useAuth();
  const isLand = propertyType === 'land';
  const isAdminOrTeam = user?.role === 'admin' || user?.role === 'team';
  const [ogUploading, setOgUploading] = useState(false);
  const ogInputRef = useRef<HTMLInputElement>(null);

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className="flex items-center gap-3 cursor-pointer py-1">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[#0d1b2a]' : 'bg-gray-200'}`}
        />
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
      <span className="text-sm font-medium" style={{ color: COLORS.navy }}>{label}</span>
    </label>
  );

  const handleAutoSEO = (enabled: boolean) => {
    setAutoSEO(enabled);
    if (enabled) {
      setSeoTitle(title || '');
      setSeoDescription(description.substring(0, 160));
    }
  };

  const handleOGUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOgUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `og-${id || 'new'}-${Date.now()}.${ext}`;
      const filePath = `og-images/${fileName}`;
      const { url } = await uploadImageViaEdgeFunction(file, filePath, 'property-images');
      setOpenGraphImage(url);
    } catch (err) {
      console.error('OG upload error:', err);
    }
    setOgUploading(false);
    if (e.target) e.target.value = '';
  };

  const charCounter = (val: string, max: number) => (
    <span className={`text-xs font-medium ${val.length > max ? 'text-red-500' : 'text-gray-400'}`}>
      {val.length}/{max}
    </span>
  );

  return (
    <div className="space-y-5">
      {/* Agent CRM */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
            <i className="ri-user-star-line text-lg" style={{ color: COLORS.navy }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Agent CRM</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>Assign agents and track commissions</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Listing Agent</label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name} {a.title ? `(${a.title})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Listing Owner</label>
            <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="Property owner name" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Owner Contact</label>
            <input type="text" value={ownerContact} onChange={(e) => setOwnerContact(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="+256..." />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Commission Tracking</label>
              <input type="number" value={commissionTracking} onChange={(e) => setCommissionTracking(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="e.g. 5" />
            </div>
            <span className="text-sm font-bold pb-2.5" style={{ color: COLORS.navy }}>%</span>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Lead Assignment</label>
            <select
              value={leadAssignment}
              onChange={(e) => setLeadAssignment(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              <option value="">Select</option>
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
              <option value="round_robin">Round Robin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Priority Ranking</label>
            <input type="number" value={priorityRanking} onChange={(e) => setPriorityRanking(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="Lower number = higher priority" />
            <p className="text-[10px] mt-1" style={{ color: COLORS.gray }}>Lower number = higher priority in listings</p>
          </div>
        </div>
      </div>

      {/* SEO & Meta */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
            <i className="ri-search-line text-lg" style={{ color: COLORS.navy }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>SEO & Meta</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>Optimize for search engines</p>
          </div>
        </div>

        <div className="mb-4">
          <Toggle checked={autoSEO} onChange={handleAutoSEO} label="Auto-generate SEO from property details" />
          {autoSEO && (
            <p className="text-xs ml-14 mt-1" style={{ color: COLORS.gray }}>
              Meta title auto-filled from property title. Meta description auto-filled from first 160 characters of description.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.navy }}>Meta Title</label>
              {charCounter(seoTitle, 60)}
            </div>
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              disabled={autoSEO}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white disabled:bg-gray-50 disabled:opacity-60"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
              placeholder="Page title for search engines"
            />
            <p className="text-[10px] mt-1" style={{ color: COLORS.gray }}>Recommended: 50-60 characters</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.navy }}>Meta Description</label>
              {charCounter(seoDescription, 160)}
            </div>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              disabled={autoSEO}
              rows={3}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white resize-none disabled:bg-gray-50 disabled:opacity-60"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
              placeholder="Meta description for search engines"
            />
            <p className="text-[10px] mt-1" style={{ color: COLORS.gray }}>Recommended: 150-160 characters</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Open Graph Image</label>
          <div className="flex items-center gap-3">
            {openGraphImage ? (
              <div className="relative">
                <img src={openGraphImage} alt="OG" className="w-20 h-20 rounded-lg object-cover border" style={{ borderColor: COLORS.border }} />
                <button
                  onClick={() => setOpenGraphImage('')}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border flex items-center justify-center text-xs cursor-pointer hover:bg-gray-50"
                  style={{ borderColor: COLORS.border, color: COLORS.gray }}
                >
                  <i className="ri-close-line" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => ogInputRef.current?.click()}
                disabled={ogUploading || uploading}
                className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                style={{ borderColor: COLORS.border }}
              >
                {ogUploading ? (
                  <i className="ri-loader-4-line animate-spin text-sm" style={{ color: COLORS.gray }} />
                ) : (
                  <i className="ri-image-add-line text-lg" style={{ color: COLORS.gray }} />
                )}
              </button>
            )}
            <div>
              <p className="text-xs" style={{ color: COLORS.gray }}>Recommended: 1200 x 630px</p>
              <p className="text-[10px]" style={{ color: COLORS.gray }}>Used for social sharing previews</p>
            </div>
            <input
              ref={ogInputRef}
              type="file"
              accept="image/*"
              onChange={handleOGUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Property Specifications */}
      {!isLand && (
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
            <i className="ri-hammer-line text-lg" style={{ color: COLORS.navy }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Property Specifications</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>Technical details about the property</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Interior Finish</label>
            <select
              value={interiorFinish}
              onChange={(e) => setInteriorFinish(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              <option value="">Select finish</option>
              {INTERIOR_FINISHES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Flooring Type</label>
            <input
              type="text"
              value={flooringType}
              onChange={(e) => setFlooringType(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
              placeholder="e.g. Marble, Hardwood, Tiles"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Ceiling Height</label>
            <input
              type="text"
              value={ceilingHeight}
              onChange={(e) => setCeilingHeight(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
              placeholder="e.g. 3.5 meters"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Water Supply</label>
            <select
              value={waterSupply}
              onChange={(e) => setWaterSupply(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              <option value="">Select supply</option>
              {WATER_SUPPLIES.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Construction Type</label>
            <select
              value={constructionType}
              onChange={(e) => setConstructionType(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white cursor-pointer"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            >
              <option value="">Select type</option>
              {CONSTRUCTION_TYPES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Completion Date</label>
            <input
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white"
              style={{ borderColor: COLORS.border, color: COLORS.navy }}
            />
          </div>
        </div>
      </div>
      )}

      {/* Listing Controls */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
            <i className="ri-equalizer-line text-lg" style={{ color: COLORS.navy }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Listing Controls</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>Toggle visibility and behavior settings</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
          <Toggle checked={isFeatured} onChange={setIsFeatured} label="Featured Property" />
          <Toggle checked={privateListing} onChange={setPrivateListing} label="Private Listing" />
          <Toggle checked={stickyListing} onChange={setStickyListing} label="Sticky Listing" />
          <Toggle checked={includeSearch} onChange={setIncludeSearch} label="Include in Search" />
          <Toggle checked={includeFeatured} onChange={setIncludeFeatured} label="Include in Featured" />
          <Toggle checked={isHomepage} onChange={setIsHomepage} label="Show on Homepage" />
          <Toggle checked={featuredNeighborhood} onChange={setFeaturedNeighborhood} label="Featured in Neighborhood" />
          <Toggle checked={featuredNewDevelopment} onChange={setFeaturedNewDevelopment} label="Featured in New Developments" />
        </div>
      </div>

      {/* Visibility */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
            <i className="ri-eye-line text-lg" style={{ color: COLORS.navy }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Visibility</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>Publication status and visibility</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          {[
            { value: 'published', label: 'Publish' },
            { value: 'draft', label: 'Draft' },
            { value: 'pending', label: 'Pending Review' },
          ].map((opt) => {
            const active = (isPublished && opt.value === 'published') || (!isPublished && !isPending && opt.value === 'draft') || (isPending && opt.value === 'pending');
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setIsPublished(opt.value === 'published');
                  setIsPending(opt.value === 'pending');
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap"
                style={active
                  ? { backgroundColor: COLORS.navy, color: 'white' }
                  : { backgroundColor: COLORS.bg, color: COLORS.gray, border: `1px solid ${COLORS.border}` }
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Owner Information — admin & team only */}
      {isAdminOrTeam && (
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
            <i className="ri-shield-user-line text-lg" style={{ color: COLORS.navy }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>Owner Information</h3>
            <p className="text-xs" style={{ color: COLORS.gray }}>Confidential — visible to admin & team only</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Owner Name</label>
            <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="Property owner name" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Owner Phone</label>
            <input type="text" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="+256..." />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: COLORS.navy }}>Owner Email</label>
            <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none bg-white" style={{ borderColor: COLORS.border, color: COLORS.navy }} placeholder="owner@email.com" />
          </div>
        </div>
      </div>
      )}
    </div>
  );
}