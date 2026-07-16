import { COLORS, PURPOSE_LABELS, generateSlug } from './types';

interface Props {
  title: string;
  location: string;
  propertyType: string;
  purpose: string;
  isFeatured: boolean;
  price: string;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  size: string;
  amenities: string[];
  images: string[];
  mainImage: string;
  floorPlans: string[];
  documents: { name: string; url: string; size?: number }[];
  agentName: string;
  isPublished: boolean;
  isPending: boolean;
  seoTitle: string;
  slug: string;
  saving: boolean;
  handleSave: (publish: boolean) => void;
  // Extended fields
  priceUgx: string;
  autoExchange: boolean;
  propertyLabel: string;
  availabilityStatus: string;
  sizeUnit: string;
  garages: number;
  yearBuilt: string;
  rooms: number;
  customFeatures: string[];
  // Final fields
  priorityRanking: string;
  interiorFinish: string;
  flooringType: string;
  ceilingHeight: string;
  waterSupply: string;
  constructionType: string;
  completionDate: string;
  openGraphImage: string;
  autoSEO: boolean;
  featuredNewDevelopment: boolean;
  privateListing: boolean;
  stickyListing: boolean;
  includeSearch: boolean;
  includeFeatured: boolean;
  featuredNeighborhood: boolean;
  isHomepage: boolean;
  stateRegion: string;
  city: string;
  country: string;
  address: string;
  zipCode: string;
  videoUrl: string;
  virtualTourUrl: string;
  propertyId: string;
  customFields: { key: string; value: string }[];
  landSize?: string;
  landUnit?: string;
  onPreview?: () => void;
}

export default function SummaryStep({
  title, location, propertyType, purpose, isFeatured, price, currency,
  bedrooms, bathrooms, size, amenities, images, mainImage, floorPlans,
  documents, agentName, isPublished, isPending, seoTitle, slug, saving, handleSave,
  priceUgx, autoExchange, propertyLabel, availabilityStatus, sizeUnit,
  garages, yearBuilt, rooms, customFeatures,
  priorityRanking, interiorFinish, flooringType, ceilingHeight, waterSupply,
  constructionType, completionDate, openGraphImage, autoSEO, featuredNewDevelopment,
  privateListing, stickyListing, includeSearch, includeFeatured, featuredNeighborhood,
  isHomepage, stateRegion, city, country, address, zipCode,
  videoUrl, virtualTourUrl, propertyId, customFields, landSize, landUnit, onPreview,
}: Props) {
  const isLand = propertyType === 'land';
  const getStatusLabel = () => {
    if (isPublished) return 'Published';
    if (isPending) return 'Pending Review';
    return 'Draft';
  };

  const getStatusColor = () => {
    if (isPublished) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (isPending) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const formatPrice = () => {
    if (!price) return '—';
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'UGX' ? 'UGX ' : currency === 'KES' ? 'KES ' : currency;
    return `${symbol}${Number(price).toLocaleString()}`;
  };

  const formatUgxPrice = () => {
    if (!priceUgx) return '—';
    return `UGX ${Number(priceUgx).toLocaleString()}`;
  };

  return (
    <div className="space-y-5">
      {/* Live Summary Card */}
      <div className="bg-white rounded-lg border shadow-sm p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex items-start gap-4 mb-5">
          {mainImage ? (
            <img src={mainImage} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
          ) : images.length > 0 ? (
            <img src={images[0]} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-24 h-24 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
              <i className="ri-building-line text-2xl" style={{ color: COLORS.navy }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold" style={{ color: COLORS.navy }}>{title || 'Untitled Draft'}</h2>
            <p className="text-sm mt-0.5" style={{ color: COLORS.gray }}>{location || 'No location set'}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
                {getStatusLabel()}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border" style={{ borderColor: COLORS.border, color: COLORS.gray }}>
                <i className="ri-building-line" /> {propertyType.replace(/_/g, ' ') || '—'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border" style={{ borderColor: COLORS.border, color: COLORS.gray }}>
                <i className="ri-price-tag-3-line" /> {PURPOSE_LABELS[purpose] || '—'}
              </span>
              {isFeatured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-amber-200 bg-amber-50 text-amber-700">
                  <i className="ri-star-fill" /> Featured
                </span>
              )}
              {featuredNewDevelopment && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-sky-200 bg-sky-50 text-sky-700">
                  <i className="ri-home-smile-line" /> New Dev
                </span>
              )}
              {propertyLabel && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-red-200 bg-red-50 text-red-700">
                  <i className="ri-fire-line" /> {propertyLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Key Details Grid */}
        {isLand ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t" style={{ borderColor: COLORS.border }}>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Price (USD)</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{formatPrice()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Price (UGX)</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{formatUgxPrice()}</p>
              {autoExchange && <p className="text-[10px] text-emerald-600">Auto exchange rate</p>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Land Size</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{landSize ? `${landSize} ${landUnit || 'sqm'}` : '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Property ID</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{propertyId || '—'}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t" style={{ borderColor: COLORS.border }}>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Price (USD)</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{formatPrice()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Price (UGX)</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{formatUgxPrice()}</p>
              {autoExchange && <p className="text-[10px] text-emerald-600">Auto exchange rate</p>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Bedrooms</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{bedrooms || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Bathrooms</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{bathrooms || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Size</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{size ? `${size} ${sizeUnit}` : '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Rooms</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{rooms || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Garages</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{garages || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Year Built</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{yearBuilt || '—'}</p>
            </div>
          </div>
        )}

        {/* Location & Address */}
        <div className="py-4 border-t grid grid-cols-1 md:grid-cols-3 gap-3" style={{ borderColor: COLORS.border }}>
          <div>
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Address</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{address || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>City / Region</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{city || '—'}{stateRegion ? `, ${stateRegion}` : ''}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Country</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{country || '—'}</p>
          </div>
        </div>

        {/* Amenities & Custom Features */}
        <div className="py-4 border-t" style={{ borderColor: COLORS.border }}>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {amenities.length > 0 ? (
              amenities.map((a) => (
                <span key={a} className="px-2 py-0.5 rounded-full text-xs font-medium border" style={{ borderColor: COLORS.border, color: COLORS.navy }}>{a}</span>
              ))
            ) : (
              <span className="text-xs" style={{ color: COLORS.gray }}>No amenities selected</span>
            )}
          </div>
          {customFeatures.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {customFeatures.map((f) => (
                <span key={f} className="px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 border-amber-200 text-amber-700">{f}</span>
              ))}
            </div>
          )}
        </div>

        {/* Media Summary */}
        <div className="py-4 border-t grid grid-cols-1 md:grid-cols-4 gap-3" style={{ borderColor: COLORS.border }}>
          <div>
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Photos</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{images.length} images</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Floor Plans</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{floorPlans.length} plans</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Documents</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{documents.length} files</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Videos</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{videoUrl || virtualTourUrl ? '1' : '0'}</p>
          </div>
        </div>

        {/* SEO & Specs Summary */}
        {isLand ? (
          <div className="py-4 border-t grid grid-cols-1 md:grid-cols-3 gap-3" style={{ borderColor: COLORS.border }}>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>SEO Title</p>
              <p className="text-sm font-bold mt-0.5 truncate" style={{ color: COLORS.navy }}>{seoTitle || (autoSEO ? title : '—')}</p>
              {autoSEO && <p className="text-[10px] text-emerald-600">Auto-generated</p>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Slug</p>
              <p className="text-sm font-bold mt-0.5 truncate" style={{ color: COLORS.navy }}>{slug || generateSlug(title) || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Priority</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{priorityRanking || '—'}</p>
            </div>
          </div>
        ) : (
          <div className="py-4 border-t grid grid-cols-1 md:grid-cols-3 gap-3" style={{ borderColor: COLORS.border }}>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>SEO Title</p>
              <p className="text-sm font-bold mt-0.5 truncate" style={{ color: COLORS.navy }}>{seoTitle || (autoSEO ? title : '—')}</p>
              {autoSEO && <p className="text-[10px] text-emerald-600">Auto-generated</p>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Slug</p>
              <p className="text-sm font-bold mt-0.5 truncate" style={{ color: COLORS.navy }}>{slug || generateSlug(title) || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Priority</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{priorityRanking || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Interior Finish</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{interiorFinish || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Construction</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{constructionType || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Water Supply</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{waterSupply || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Flooring</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{flooringType || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Ceiling Height</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{ceilingHeight || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Completion</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{completionDate || '—'}</p>
            </div>
          </div>
        )}

        {/* Settings & Visibility Summary */}
        <div className="py-4 border-t grid grid-cols-2 md:grid-cols-4 gap-3" style={{ borderColor: COLORS.border }}>
          <div>
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Agent</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{agentName}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Availability</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{availabilityStatus || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Property ID</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{propertyId || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: COLORS.gray }}>Custom Fields</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: COLORS.navy }}>{customFields.length} fields</p>
          </div>
        </div>

        {/* Toggles Summary */}
        <div className="pt-4 border-t" style={{ borderColor: COLORS.border }}>
          <div className="flex flex-wrap gap-1.5">
            {isFeatured && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 border border-amber-200 text-amber-700">Featured</span>}
            {isHomepage && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">Homepage</span>}
            {featuredNeighborhood && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 border border-sky-200 text-sky-700">Featured Neighborhood</span>}
            {featuredNewDevelopment && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 border border-sky-200 text-sky-700">New Development</span>}
            {privateListing && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 border border-gray-200 text-gray-600">Private</span>}
            {stickyListing && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 border border-purple-200 text-purple-700">Sticky</span>}
            {includeSearch && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">In Search</span>}
            {includeFeatured && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 border border-amber-200 text-amber-700">In Featured</span>}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2.5">
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 border-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer hover:bg-gray-50 whitespace-nowrap"
          style={{ borderColor: COLORS.navy, color: COLORS.navy }}
        >
          {saving && !isPublished ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-save-line" />}
          Save Draft
        </button>
        <button
          onClick={onPreview}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer hover:bg-gray-50 whitespace-nowrap"
          style={{ borderColor: COLORS.border, color: COLORS.gray }}
        >
          <i className="ri-external-link-line" />
          Preview Listing
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 hover:opacity-90 whitespace-nowrap"
          style={{ backgroundColor: COLORS.navy }}
        >
          {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-send-plane-line" />}
          {isPublished ? 'Update & Publish' : 'Publish Property'}
        </button>
      </div>
    </div>
  );
}