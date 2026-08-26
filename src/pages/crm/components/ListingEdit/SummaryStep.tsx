import { PURPOSE_LABELS, generateSlug, isLandType } from './types';

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
  priceUgx: string;
  autoExchange: boolean;
  propertyLabel: string;
  availabilityStatus: string;
  sizeUnit: string;
  garages: number;
  yearBuilt: string;
  rooms: number;
  customFeatures: string[];
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
  tags?: string[];
  onPreview?: () => void;
  requiredFieldMap?: Record<string, boolean>;
  validationErrors?: string[];
  description?: string;
  agentId?: string;
}

const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) => (
  <div className="mb-5">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 flex items-center justify-center shrink-0 bg-[#0d1f2d] rounded-lg">
        <i className={`${icon} text-white text-sm`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-jost text-sm font-bold text-[#0d1f2d] uppercase tracking-[0.5px]">
          {title}
        </h4>
        <p className="text-xs text-[#7a8a99] mt-0.5 leading-snug">{subtitle}</p>
      </div>
    </div>
    <div className="h-px bg-[#d1d5db] mt-3" />
  </div>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-bold uppercase tracking-wider text-[#7a8a99]">{children}</p>
);

const Value = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm font-bold text-[#1a1e24] mt-0.5">{children}</p>
);

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
  videoUrl, virtualTourUrl, propertyId, customFields, landSize, landUnit, tags, onPreview,
  requiredFieldMap = {}, validationErrors = [], description = '', agentId = '',
}: Props) {
  const isLand = isLandType(propertyType);

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
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'KES' ? 'KES ' : currency;
    return `${symbol}${Number(price).toLocaleString()}`;
  };

  return (
    <div className="w-full space-y-10 md:space-y-12">
      {/* Summary Card */}
      <section className="pb-2">
        <SectionHeader
          icon="ri-file-list-line"
          title="Property Summary"
          subtitle="Review your listing before publishing"
        />

        <div className="border border-[#d1d5db] bg-white p-5 md:p-6">
          {/* Header with image */}
          <div className="flex items-start gap-4 mb-5">
            {mainImage ? (
              <img src={mainImage} alt="" className="w-24 h-24 object-cover flex-shrink-0" />
            ) : images.length > 0 ? (
              <img src={images[0]} alt="" className="w-24 h-24 object-cover flex-shrink-0" />
            ) : (
              <div className="w-24 h-24 flex items-center justify-center flex-shrink-0 border border-[#d1d5db] bg-[#f4f6f8]">
                <i className="ri-building-line text-2xl text-[#5a6a7a]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-[#1a1e24]">{title || 'Untitled Draft'}</h2>
              <p className="text-sm text-[#7a8a99] mt-0.5">{location || 'No location set'}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold border ${getStatusColor()}`}>
                  {getStatusLabel()}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border border-[#d1d5db] text-[#7a8a99]">
                  <i className="ri-building-line" /> {propertyType.replace(/_/g, ' ') || '—'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border border-[#d1d5db] text-[#7a8a99]">
                  <i className="ri-price-tag-3-line" /> {PURPOSE_LABELS[purpose] || '—'}
                </span>
                {isFeatured && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border border-amber-200 bg-amber-50 text-amber-700">
                    <i className="ri-star-fill" /> Featured
                  </span>
                )}
                {featuredNewDevelopment && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border border-sky-200 bg-sky-50 text-sky-700">
                    <i className="ri-home-smile-line" /> New Dev
                  </span>
                )}
                {propertyLabel && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border border-red-200 bg-red-50 text-red-700">
                    <i className="ri-fire-line" /> {propertyLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Key Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-[#d1d5db]">
            <div>
              <Label>Price ({currency})</Label>
              <Value>{formatPrice()}</Value>
            </div>
            {isLand ? (
              <>
                <div>
                  <Label>Land Size</Label>
                  <Value>{landSize ? `${landSize} ${landUnit || 'sqm'}` : '—'}</Value>
                </div>
                <div>
                  <Label>Property ID</Label>
                  <Value>{propertyId || '—'}</Value>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Bedrooms</Label>
                  <Value>{bedrooms || '—'}</Value>
                </div>
                <div>
                  <Label>Bathrooms</Label>
                  <Value>{bathrooms || '—'}</Value>
                </div>
                <div>
                  <Label>Size</Label>
                  <Value>{size ? `${size} ${sizeUnit}` : '—'}</Value>
                </div>
                <div>
                  <Label>Rooms</Label>
                  <Value>{rooms || '—'}</Value>
                </div>
                <div>
                  <Label>Garages</Label>
                  <Value>{garages || '—'}</Value>
                </div>
                <div>
                  <Label>Year Built</Label>
                  <Value>{yearBuilt || '—'}</Value>
                </div>
              </>
            )}
            <div>
              <Label>Availability</Label>
              <Value>{availabilityStatus || '—'}</Value>
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-4 border-t border-[#d1d5db]">
            <div>
              <Label>Address</Label>
              <Value>{address || '—'}</Value>
            </div>
            <div>
              <Label>City / Region</Label>
              <Value>{city || '—'}{stateRegion ? `, ${stateRegion}` : ''}</Value>
            </div>
            <div>
              <Label>Country</Label>
              <Value>{country || '—'}</Value>
            </div>
          </div>

          {/* Amenities & Features */}
          <div className="py-4 border-t border-[#d1d5db]">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {amenities.length > 0 ? (
                amenities.map((a) => (
                  <span key={a} className="px-2 py-0.5 text-xs font-bold border border-[#d1d5db] text-[#1a1e24]">{a}</span>
                ))
              ) : (
                <span className="text-xs text-[#7a8a99]">No amenities selected</span>
              )}
            </div>
            {customFeatures.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customFeatures.map((f) => (
                  <span key={f} className="px-2 py-0.5 text-xs font-bold border border-amber-200 bg-amber-50 text-amber-700">{f}</span>
                ))}
              </div>
            )}
          </div>

          {/* Tags / Labels */}
          {tags && tags.length > 0 && (
            <div className="py-4 border-t border-[#d1d5db]">
              <Label>Marketing Tags</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tags.map((tag, idx) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border rounded-md ${
                      idx === 0
                        ? 'bg-[#0d1f2d] text-white border-[#0d1f2d]'
                        : 'bg-[#f4f6f8] text-[#4a5568] border-[#d1d5db]'
                    }`}
                  >
                    {idx === 0 && <i className="ri-star-fill text-[9px]" />}
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Media */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4 border-t border-[#d1d5db]">
            <div>
              <Label>Photos</Label>
              <Value>{images.length} images</Value>
            </div>
            <div>
              <Label>Floor Plans</Label>
              <Value>{floorPlans.length} plans</Value>
            </div>
            <div>
              <Label>Documents</Label>
              <Value>{documents.length} files</Value>
            </div>
            <div>
              <Label>Videos</Label>
              <Value>{videoUrl || virtualTourUrl ? '1' : '0'}</Value>
            </div>
          </div>

          {/* SEO & Specs */}
          {isLand ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-4 border-t border-[#d1d5db]">
              <div>
                <Label>SEO Title</Label>
                <Value>{seoTitle || (autoSEO ? title : '—')}</Value>
                {autoSEO && <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Auto-generated</p>}
              </div>
              <div>
                <Label>Slug</Label>
                <Value>{slug || generateSlug(title) || '—'}</Value>
              </div>
              <div>
                <Label>Priority</Label>
                <Value>{priorityRanking || '—'}</Value>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-4 border-t border-[#d1d5db]">
              <div>
                <Label>SEO Title</Label>
                <Value>{seoTitle || (autoSEO ? title : '—')}</Value>
                {autoSEO && <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Auto-generated</p>}
              </div>
              <div>
                <Label>Slug</Label>
                <Value>{slug || generateSlug(title) || '—'}</Value>
              </div>
              <div>
                <Label>Priority</Label>
                <Value>{priorityRanking || '—'}</Value>
              </div>
              <div>
                <Label>Interior Finish</Label>
                <Value>{interiorFinish || '—'}</Value>
              </div>
              <div>
                <Label>Construction</Label>
                <Value>{constructionType || '—'}</Value>
              </div>
              <div>
                <Label>Water Supply</Label>
                <Value>{waterSupply || '—'}</Value>
              </div>
              <div>
                <Label>Flooring</Label>
                <Value>{flooringType || '—'}</Value>
              </div>
              <div>
                <Label>Ceiling Height</Label>
                <Value>{ceilingHeight || '—'}</Value>
              </div>
              <div>
                <Label>Completion</Label>
                <Value>{completionDate || '—'}</Value>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4 border-t border-[#d1d5db]">
            <div>
              <Label>Agent</Label>
              <Value>{agentName}</Value>
            </div>
            <div>
              <Label>Availability</Label>
              <Value>{availabilityStatus || '—'}</Value>
            </div>
            <div>
              <Label>Property ID</Label>
              <Value>{propertyId || '—'}</Value>
            </div>
            <div>
              <Label>Custom Fields</Label>
              <Value>{customFields.length} fields</Value>
            </div>
          </div>

          {/* Toggles */}
          <div className="pt-4 border-t border-[#d1d5db]">
            <div className="flex flex-wrap gap-1.5">
              {isFeatured && <span className="px-2 py-0.5 text-xs font-bold border border-amber-200 bg-amber-50 text-amber-700">Featured</span>}
              {isHomepage && <span className="px-2 py-0.5 text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-700">Homepage</span>}
              {featuredNeighborhood && <span className="px-2 py-0.5 text-xs font-bold border border-sky-200 bg-sky-50 text-sky-700">Featured Neighborhood</span>}
              {featuredNewDevelopment && <span className="px-2 py-0.5 text-xs font-bold border border-sky-200 bg-sky-50 text-sky-700">New Development</span>}
              {privateListing && <span className="px-2 py-0.5 text-xs font-bold border border-gray-200 bg-gray-100 text-gray-600">Private</span>}
              {stickyListing && <span className="px-2 py-0.5 text-xs font-bold border border-purple-200 bg-purple-50 text-purple-700">Sticky</span>}
              {includeSearch && <span className="px-2 py-0.5 text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-700">In Search</span>}
              {includeFeatured && <span className="px-2 py-0.5 text-xs font-bold border border-amber-200 bg-amber-50 text-amber-700">In Featured</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <section className="pb-2">
          <div className="border-2 border-red-300 bg-red-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 flex items-center justify-center shrink-0 bg-red-500 rounded-full">
                <i className="ri-error-warning-line text-white text-sm"></i>
              </div>
              <p className="font-jost text-sm font-bold text-red-700 uppercase tracking-[0.5px]">
                Cannot Publish — {validationErrors.length} Required Field{validationErrors.length > 1 ? 's' : ''} Missing
              </p>
            </div>
            <ul className="space-y-2">
              {validationErrors.map((err, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-red-700 font-roboto">
                  <i className="ri-close-circle-fill text-red-500 text-sm shrink-0"></i>
                  {err}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Action Buttons */}
      <section className="pb-2">
        <SectionHeader
          icon="ri-send-plane-line"
          title="Actions"
          subtitle="Save, preview or publish your listing"
        />

        <div className="border border-[#d1d5db] bg-white p-5 md:p-6 space-y-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 border-2 border-[#0d1f2d] text-sm font-bold text-[#0d1f2d] hover:bg-[#f6f7f9] transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {saving && !isPublished ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-save-line" />}
            Save Draft
          </button>
          <button
            onClick={onPreview}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 border border-[#d1d5db] text-sm font-bold text-[#7a8a99] hover:border-[#0d1f2d] hover:text-[#0d1f2d] transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-external-link-line" />
            Preview Listing
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 text-white text-sm font-bold bg-[#0d1f2d] hover:bg-[#1a2f45] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-send-plane-line" />}
            {isPublished ? 'Update & Publish' : 'Publish Property'}
          </button>
        </div>
      </section>
    </div>
  );
}