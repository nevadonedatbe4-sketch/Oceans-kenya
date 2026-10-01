import { useMemo, useState } from 'react';
import SeoStatusBadge from '@/pages/crm/components/SeoStatusBadge';
import SeoSearchPreview from '@/pages/crm/components/SeoSearchPreview';

/**
 * SeoPanel — admin SEO controls for a single listing.
 *
 * Lets an administrator override the auto-generated metadata that the public
 * property page (PropertyDetail) builds by default:
 *   • SEO title            → listings.seo_title
 *   • Meta description     → listings.seo_description
 *   • Social share image   → listings.seo_image
 *   • SEO slug / URL       → listings.slug
 *
 * Defaults are derived from the listing itself (type, bedrooms, area, price,
 * purpose) so an admin can leave it all blank and still get good metadata.
 * Because everything auto-fills, the whole panel is collapsed by default so
 * the Settings step stays lean — expand it only when you need to override.
 */

const inputClass =
  'w-full text-base font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] rounded-md';

const textareaClass =
  'w-full text-base font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] rounded-md resize-y min-h-[92px]';

const labelClass = 'block text-[13px] font-bold tracking-wide text-[#0d1f2d] uppercase mb-2';

const TITLE_LIMIT = 60;
const DESC_LIMIT = 160;

const PURPOSE_LABEL: Record<string, string> = {
  sale: 'for Sale',
  rent: 'to Rent',
  joint_ventures: 'Joint Venture',
  new_development: 'New Development',
  short_stay: 'Short Stay',
  sold: 'Sold',
  rented: 'Rented',
};

const TYPE_LABEL: Record<string, string> = {
  house: 'House',
  apartment: 'Apartment',
  villa: 'Villa',
  townhouse: 'Townhouse',
  penthouse: 'Penthouse',
  studio_flat: 'Studio',
  bungalow: 'Bungalow',
  maisonette: 'Maisonette',
  commercial: 'Commercial Property',
  office: 'Office Space',
  warehouse: 'Warehouse',
  land: 'Land',
  'farms_/_land': 'Land',
  farms_land: 'Land',
};

/** Build the slug base from a title the same way the editor does. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 70);
}

interface Props {
  title: string;
  propertyType: string;
  neighbourhood: string;
  price: string;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  purpose: string;
  mainImage?: string;
  slug: string;
  setSlug: (v: string) => void;
  seoTitle: string;
  setSeoTitle: (v: string) => void;
  seoDescription: string;
  setSeoDescription: (v: string) => void;
  seoImage: string;
  setSeoImage: (v: string) => void;
}

export default function SeoPanel({
  title,
  propertyType,
  neighbourhood,
  price,
  currency,
  bedrooms,
  bathrooms,
  purpose,
  mainImage,
  slug,
  setSlug,
  seoTitle,
  setSeoTitle,
  seoDescription,
  setSeoDescription,
  seoImage,
  setSeoImage,
}: Props) {
  const [open, setOpen] = useState(false);

  const typeLabel = TYPE_LABEL[propertyType] || (propertyType ? propertyType.replace(/_/g, ' ') : 'Property');
  const purposeLabel = PURPOSE_LABEL[purpose] || 'for Sale';
  const area = neighbourhood || 'Nairobi';

  // ── Auto-generated defaults (shown as placeholders + used by the preview) ──
  const defaultTitle = useMemo(() => {
    const bedsPart = bedrooms > 0 ? `${bedrooms} Bedroom ` : '';
    return `${bedsPart}${typeLabel} ${purposeLabel} in ${area}, Nairobi | Oceans Kenya`.slice(0, TITLE_LIMIT);
  }, [bedrooms, typeLabel, purposeLabel, area]);

  const defaultDescription = useMemo(() => {
    const pricePart = price ? ` priced at ${currency} ${Number(price).toLocaleString()}` : '';
    const bedPart = bedrooms > 0 ? ` with ${bedrooms} bedroom${bedrooms > 1 ? 's' : ''}` : '';
    const bathPart = bathrooms > 0 ? ` and ${bathrooms} bathroom${bathrooms > 1 ? 's' : ''}` : '';
    return `Explore this ${typeLabel.toLowerCase()} ${purposeLabel} in ${area}, Nairobi${pricePart}${bedPart}${bathPart}. View details and contact the listing agent.`.slice(0, DESC_LIMIT);
  }, [typeLabel, purposeLabel, area, price, currency, bedrooms, bathrooms]);

  const defaultSlug = useMemo(() => slugify(title || 'property'), [title]);

  const effectiveTitle = seoTitle || defaultTitle;
  const effectiveDescription = seoDescription || defaultDescription;
  const effectiveSlug = slug || defaultSlug;
  const effectiveImage = seoImage || mainImage || '';

  const titleLen = effectiveTitle.length;
  const descLen = effectiveDescription.length;

  const autoFill = () => {
    setSeoTitle(defaultTitle);
    setSeoDescription(defaultDescription);
    setSlug(defaultSlug);
  };

  const counterColor = (len: number, limit: number) =>
    len > limit ? 'text-[#dc2626]' : len > limit - 10 ? 'text-[#b45309]' : 'text-[#9ba5b1]';

  const hasOverrides = Boolean(seoTitle || seoDescription || seoImage || slug);

  return (
    <div className="border border-[#e8ecf0] bg-white rounded-xl overflow-hidden">
      {/* Collapsible header */}
      <div className="flex items-center gap-2 pr-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex-1 min-w-0 flex items-center gap-4 px-5 py-4 text-left hover:bg-[#f6f8f9] transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-[#0d1f2d] rounded-lg">
            <i className="ri-search-eye-line text-white text-base" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold text-[#0d1f2d] tracking-wide">SEO &amp; Social</h4>
              <SeoStatusBadge customised={hasOverrides} />
            </div>
            <p className="text-[13px] text-[#7a8a99] mt-0.5 leading-relaxed truncate">
              Generated from this listing — expand to override search &amp; social metadata.
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={autoFill}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold text-[#0d5959] bg-[#e8f5f5] border border-[#0d5959]/20 rounded-md hover:bg-[#d9eeee] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <i className="ri-magic-line text-sm" />
          Auto-fill
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Collapse SEO' : 'Expand SEO'}
          className="w-8 h-8 flex items-center justify-center rounded-md text-[#7a8a99] hover:bg-[#f1f4f6] hover:text-[#0d1f2d] transition-colors cursor-pointer shrink-0"
        >
          <i className={`ri-arrow-down-s-line text-xl transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="border-t border-[#eef1f4] px-6 py-6 space-y-6">
          {/* SEO title */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>SEO Title</label>
              <span className={`text-[12px] font-semibold ${counterColor(titleLen, TITLE_LIMIT)}`}>
                {titleLen}/{TITLE_LIMIT}
              </span>
            </div>
            <input
              type="text"
              value={seoTitle}
              maxLength={80}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder={defaultTitle}
              className={inputClass}
            />
            <p className="text-[12px] text-[#9ba5b1] mt-1.5 leading-relaxed">
              Shown as the blue headline in Google results. Aim for under {TITLE_LIMIT} characters.
            </p>
          </div>

          {/* Meta description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Meta Description</label>
              <span className={`text-[12px] font-semibold ${counterColor(descLen, DESC_LIMIT)}`}>
                {descLen}/{DESC_LIMIT}
              </span>
            </div>
            <textarea
              value={seoDescription}
              maxLength={500}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder={defaultDescription}
              className={textareaClass}
            />
            <p className="text-[12px] text-[#9ba5b1] mt-1.5 leading-relaxed">
              The snippet under the headline. Around {DESC_LIMIT} characters reads best.
            </p>
          </div>

          {/* Slug */}
          <div>
            <label className={labelClass}>URL Slug</label>
            <div className="flex items-stretch">
              <span className="hidden sm:flex items-center px-3 text-[13px] font-semibold text-[#7a8a99] bg-[#f4f6f8] border-2 border-r-0 border-[#e8edf2] rounded-l-md whitespace-nowrap">
                /property/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder={defaultSlug}
                className={`${inputClass} rounded-l-none`}
              />
            </div>
            <div className="flex items-center justify-between gap-3 mt-1.5">
              <p className="text-[12px] text-[#9ba5b1] leading-relaxed">
                Clean, readable and unique. Changing it updates the public link.
              </p>
              {!slug && (
                <button
                  type="button"
                  onClick={() => setSlug(defaultSlug)}
                  className="text-[12px] font-semibold text-[#0d5959] hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  Use “{defaultSlug}”
                </button>
              )}
            </div>
          </div>

          {/* Social share image */}
          <div>
            <label className={labelClass}>Social Share Image</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-44 h-28 shrink-0 rounded-md border border-[#e8ecf0] bg-[#f7fafa] overflow-hidden flex items-center justify-center">
                {effectiveImage ? (
                  <img alt="Social share preview" src={effectiveImage} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center px-3">
                    <i className="ri-image-line text-2xl text-[#b0bec5]" />
                    <p className="text-[11px] text-[#9ba5b1] mt-1">No image</p>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="url"
                  value={seoImage}
                  onChange={(e) => setSeoImage(e.target.value)}
                  placeholder="https://…"
                  className={inputClass}
                />
                <div className="flex items-center gap-2 mt-2">
                  {mainImage && (
                    <button
                      type="button"
                      onClick={() => setSeoImage(mainImage)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#0d5959] bg-[#e8f5f5] border border-[#0d5959]/20 rounded-md hover:bg-[#d9eeee] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-image-add-line text-sm" />
                      Use main photo
                    </button>
                  )}
                  {seoImage && (
                    <button
                      type="button"
                      onClick={() => setSeoImage('')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#7a8a99] hover:text-[#0d1f2d] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-close-line text-sm" />
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[12px] text-[#9ba5b1] mt-2 leading-relaxed">
                  Falls back to the listing's main photo. Ideal size 1200 × 630.
                </p>
              </div>
            </div>
          </div>

          {/* Preview */}
          <SeoSearchPreview
            slug={effectiveSlug}
            title={effectiveTitle}
            description={effectiveDescription}
            breadcrumb="property"
          />

          {/* Mobile auto-fill button */}
          <button
            type="button"
            onClick={autoFill}
            className="sm:hidden w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-[12px] font-semibold text-[#0d5959] bg-[#e8f5f5] border border-[#0d5959]/20 rounded-md cursor-pointer whitespace-nowrap"
          >
            <i className="ri-magic-line text-sm" />
            Auto-fill from listing
          </button>
        </div>
      )}
    </div>
  );
}