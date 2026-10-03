import { useState, useEffect, useRef, useCallback } from 'react';
import type { Development } from '@/hooks/useNewDevelopments';
import { useCurrency } from '@/hooks/useCurrency';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import DevelopmentGallery from '@/pages/NewDevelopments/components/DevelopmentGallery';
import DevelopmentProjectModel from '@/pages/NewDevelopments/components/DevelopmentProjectModel';
import ContactAgentModal from '@/components/feature/ContactAgentModal';
import { titleCase } from '@/pages/NewDevelopments/components/typography';
import RichTextContent from '@/components/feature/RichTextContent';

type CurrencyCode = 'KES' | 'USD' | 'GBP' | 'EUR' | 'UGX' | 'AED' | 'ZAR';

function stageBadge(stage: string): { label: string; color: string } | null {
  const s = (stage || '').trim().toLowerCase();
  if (s === 'off_plan') return { label: 'Off-Plan', color: 'bg-[#fd7e14]' };
  if (s === 'under_construction') return { label: 'Under Construction', color: 'bg-amber-500' };
  if (s === 'completed' || s === '' || s === 'ready') return { label: 'Completed', color: 'bg-[#28a745]' };
  return null;
}

function typeLabel(pt: string): string {
  const s = (pt || '').toLowerCase();
  if (s === 'apartment') return 'Apartments';
  if (s === 'villa') return 'Villas';
  if (s === 'townhouse') return 'Townhouses';
  if (s === 'maisonette') return 'Maisonettes';
  if (s === 'house') return 'Houses';
  if (s === 'office') return 'Offices';
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Properties';
}

interface DevelopmentModalProps {
  development: Development | null;
  onClose: () => void;
  /** When true, immediately resolve the brochure request for this project. */
  requestBrochure?: boolean;
}

const BROCHURE_REQUEST_MESSAGE =
  'Hello, I am interested in this property and would like to request a brochure. Please share it with me if available.';

export default function DevelopmentModal({ development, onClose, requestBrochure = false }: DevelopmentModalProps) {
  const { format } = useCurrency();
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [highlightBrochure, setHighlightBrochure] = useState(false);
  const brochureRef = useRef<HTMLDivElement | null>(null);
  useBodyScrollLock(Boolean(development));

  const brochure = development?.brochure || null;

  const scrollToBrochure = useCallback(() => {
    const el = brochureRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHighlightBrochure(true);
    window.setTimeout(() => setHighlightBrochure(false), 2200);
  }, []);

  // Single decision point: a real attached brochure is revealed in place;
  // otherwise we open the Message Listing Agent form pre-filled with the request.
  const handleBrochureRequest = useCallback(() => {
    if (brochure) scrollToBrochure();
    else setEnquiryOpen(true);
  }, [brochure, scrollToBrochure]);

  // Reset transient state whenever the modal is closed.
  useEffect(() => {
    if (!development) {
      setEnquiryOpen(false);
      setHighlightBrochure(false);
    }
  }, [development]);

  // Honour an explicit "Request Brochure" intent coming from a card.
  useEffect(() => {
    if (!development || !requestBrochure) return undefined;
    if (development.brochure) {
      const t = window.setTimeout(scrollToBrochure, 150);
      return () => window.clearTimeout(t);
    }
    setEnquiryOpen(true);
    return undefined;
  }, [development, requestBrochure, scrollToBrochure]);

  if (!development) return null;

  const badge = stageBadge(development.status);
  const spec = development.units[0];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm"></div>
      <div
        className="relative z-10 w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 md:px-6 py-3 bg-white border-b border-[#f0f0f0]">
          <div className="min-w-0">
            <h3 className="text-lg md:text-xl font-bold text-primary truncate">{titleCase(development.name)}</h3>
            <p className="text-base font-medium text-primary/60 flex items-center gap-1 truncate">
              <i className="ri-map-pin-2-line text-golden text-base"></i>
              {titleCase(development.location) || titleCase(development.city) || 'Location on request'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-[#f0f0f0] text-primary hover:bg-stone-200 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Gallery */}
        <div className="relative h-64 md:h-80 bg-stone-100">
          <DevelopmentGallery images={development.gallery} name={development.name} />
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
            <span className="text-white text-xs font-semibold uppercase tracking-wide px-2 py-1 bg-[#001731]">
              New Development
            </span>
            {badge && (
              <span className={`text-white text-xs font-semibold uppercase tracking-wide px-2 py-1 ${badge.color}`}>
                {badge.label}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-5">
          {/* Price + unit types */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div>
              {development.lowestPrice > 0 && (
                <p className={`font-bold text-primary ${development.hasPriceRange ? 'text-2xl md:text-[24px]' : 'text-2xl md:text-3xl'}`}>
                  {development.hasPriceRange && <span className="text-base font-semibold tracking-wide text-golden mr-1">From</span>}
                  {format(development.lowestPrice, (development.currency as CurrencyCode) || 'KES')}
                </p>
              )}
              <p className="text-base font-medium text-primary/60 mt-1">
                {titleCase(typeLabel(development.propertyType))} · {titleCase(development.location) || titleCase(development.city)}
              </p>
            </div>
            {development.unitTypes.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {development.unitTypes.map((ut) => (
                  <span key={ut.label} className="inline-flex items-center gap-1 px-2.5 py-1 bg-golden/10 border border-golden/30 text-golden text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                    <i className="ri-building-4-line text-xs"></i>
                    {ut.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {spec && spec.bedrooms > 0 && (
              <div className="p-3 bg-[#f7f8f9] rounded-sm">
                <i className="ri-hotel-bed-line text-primary text-base"></i>
                <p className="text-base font-medium text-primary/60 mt-1">Bedrooms</p>
                <p className="text-base font-semibold text-primary">{spec.bedrooms}</p>
              </div>
            )}
            {spec && spec.bathrooms > 0 && (
              <div className="p-3 bg-[#f7f8f9] rounded-sm">
                <i className="fa-solid fa-bath text-primary text-base"></i>
                <p className="text-base font-medium text-primary/60 mt-1">Bathrooms</p>
                <p className="text-base font-semibold text-primary">{spec.bathrooms}</p>
              </div>
            )}
            {spec && spec.size > 0 && (
              <div className="p-3 bg-[#f7f8f9] rounded-sm">
                <i className="ri-aspect-ratio-line text-primary text-base"></i>
                <p className="text-base font-medium text-primary/60 mt-1">Size</p>
                <p className="text-base font-semibold text-primary">{spec.size.toLocaleString()} {spec.sizeUnit}</p>
              </div>
            )}
            {spec && spec.parking > 0 && (
              <div className="p-3 bg-[#f7f8f9] rounded-sm">
                <i className="ri-car-line text-primary text-base"></i>
                <p className="text-base font-medium text-primary/60 mt-1">Parking</p>
                <p className="text-base font-semibold text-primary">{spec.parking}</p>
              </div>
            )}
          </div>

          {/* Dedicated development project model - scale, unit types, developer, timeline */}
          <DevelopmentProjectModel development={development} />

          {/* Description - real project/listing description only, rich styling preserved */}
          {development.description && (
            <div>
              <h4 className="text-base font-bold text-primary mb-2">About this development</h4>
              <RichTextContent
                html={development.description}
                normalizeCase
                className="text-base font-normal text-primary/70 leading-relaxed"
              />
            </div>
          )}

          {/* Features - real amenities array */}
          {development.features.length > 0 && (
            <div>
              <h4 className="text-base font-bold text-primary mb-2">Key Features</h4>
              <div className="flex flex-wrap gap-2">
                {development.features.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f7f8f9] border border-[#eef0f2] text-primary/70 text-base rounded-full whitespace-nowrap">
                    <i className="ri-check-line text-golden text-base"></i>
                    {titleCase(f)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Brochure - only shown when a real, valid brochure is attached */}
          {brochure && (
            <div
              ref={brochureRef}
              id="development-brochure"
              className={`scroll-mt-20 rounded-sm border p-4 transition-all duration-300 ${
                highlightBrochure
                  ? 'border-golden bg-golden/5 ring-2 ring-golden/40'
                  : 'border-[#eef0f2] bg-[#f7f8f9]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 flex items-center justify-center shrink-0 bg-primary text-white rounded-sm">
                  <i className="ri-file-pdf-2-line text-xl"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-bold text-primary">Property Brochure</h4>
                  <p className="text-sm text-primary/60 truncate">{brochure.name}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <a
                  href={brochure.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-sm cursor-pointer whitespace-nowrap hover:bg-[#002349] transition-colors"
                >
                  <i className="ri-eye-line"></i>View Brochure
                </a>
                <a
                  href={brochure.url}
                  download={brochure.name}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-primary text-primary text-sm font-semibold rounded-sm cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white transition-colors"
                >
                  <i className="ri-download-line"></i>Download
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="sticky bottom-0 z-30 flex flex-col sm:flex-row gap-3 px-4 md:px-6 py-4 bg-white border-t border-[#f0f0f0]">
          <a
            href={`/property/${development.slug}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#001731] text-white text-base font-bold rounded-sm cursor-pointer whitespace-nowrap hover:bg-[#002349] transition-colors"
          >
            <i className="ri-eye-line text-base"></i>View property
          </a>
          <button
            type="button"
            onClick={handleBrochureRequest}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#001731] text-[#001731] text-base font-bold rounded-sm cursor-pointer whitespace-nowrap hover:bg-[#001731] hover:text-white transition-colors"
          >
            <i className="ri-file-paper-2-line text-base"></i>Request Brochure
          </button>
        </div>
      </div>

      <ContactAgentModal
        isOpen={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        propertyTitle={development.name}
        propertyId={development.slug}
        propertySlug={development.slug}
        propertyPrice={
          development.lowestPrice > 0
            ? format(development.lowestPrice, (development.currency as CurrencyCode) || 'KES')
            : 'Price on request'
        }
        propertyLocation={development.location || development.city || ''}
        reason="Request Brochure"
        initialMessage={BROCHURE_REQUEST_MESSAGE}
        listingRef={development.slug}
        details={`${titleCase(typeLabel(development.propertyType))} development${development.developer ? ` by ${titleCase(development.developer)}` : ''}`}
      />
    </div>
  );
}