import { useState } from 'react';
import { Link } from 'react-router-dom';
import RichTextContent from '@/components/feature/RichTextContent';
import { descriptionToNormalizedPlainText } from '@/lib/richText';
import type { DetailSpecRow } from '@/lib/propertyDetailSpecs';
import { usePropertyDetailContent } from '@/hooks/useDynamicPageTemplates';
import PropertyDocuments, { type DocItem } from './PropertyDocuments';

interface LeftColumnProps {
  description: string;
  features: string[];
  amenities: string[];
  beds: number | null;
  baths: number | null;
  parking: number | null;
  garages: number | null;
  sqft: number | null;
  propertyType: string;
  status: string;
  ref: string;
  price: string;
  priceRaw: number;
  currency: string;
  location: string;
  title: string;
  latitude: number | null;
  longitude: number | null;
  district: string;
  area: string;
  city: string;
  country: string;
  furnished: string;
  createdAt?: string;
  commissionApplicable?: boolean;
  commissionDetails?: string;
  specs?: DetailSpecRow[];
  documents?: DocItem[] | null;
}

const featureIcons: Record<string, string> = {
  'open-plan kitchen': 'ri-restaurant-line',
  'open plan kitchen': 'ri-restaurant-line',
  'en-suite bedrooms': 'ri-checkbox-circle-line',
  'en suite bedrooms': 'ri-checkbox-circle-line',
  'walk-in wardrobe': 'ri-checkbox-circle-line',
  'home office': 'ri-checkbox-circle-line',
  'storage room': 'ri-archive-line',
  'home cinema': 'ri-checkbox-circle-line',
  'utility room': 'ri-checkbox-circle-line',
  'laundry room': 'ri-t-shirt-line',
  'guest suite': 'ri-user-received-line',
  'staff quarters': 'ri-team-line',
  'high-speed internet': 'ri-wifi-line',
  'borehole': 'ri-water-flash-line',
  'water tank': 'ri-drop-line',
  'cctv': 'ri-vidicon-line',
  'gated community': 'ri-door-lock-line',
  'swimming pool': 'ri-water-flash-line',
  'mature gardens': 'ri-plant-line',
  'parking': 'ri-car-line',
  'garage': 'ri-car-line',
  'garden': 'ri-plant-line',
  'balcony': 'ri-building-line',
  'terrace': 'ri-home-5-line',
  'furnished': 'ri-sofa-line',
  'air conditioning': 'ri-temp-hot-line',
  'generator': 'ri-flashlight-line',
  'solar power': 'ri-sun-line',
  'elevator': 'ri-arrow-up-down-line',
  'gym': 'ri-heart-pulse-line',
  'security': 'ri-shield-check-line',
  'alarm': 'ri-alarm-warning-line',
  'fireplace': 'ri-fire-line',
  'study': 'ri-book-line',
  'storage': 'ri-archive-line',
  'pantry': 'ri-restaurant-line',
  'jacuzzi': 'ri-water-flash-line',
  'sauna': 'ri-temp-hot-line',
  'cinema': 'ri-movie-line',
  'wine cellar': 'ri-goblet-line',
  'playground': 'ri-football-line',
  'tennis': 'ri-basketball-line',
  'conference': 'ri-presentation-line',
  'reception': 'ri-customer-service-line',
  'intercom': 'ri-phone-line',
  'pet friendly': 'ri-bear-smile-line',
  'wheelchair': 'ri-wheelchair-line',
};

function getFeatureIcon(label: string): string {
  const key = label.toLowerCase();
  for (const [k, v] of Object.entries(featureIcons)) {
    if (key.includes(k)) return v;
  }
  return 'ri-checkbox-circle-line';
}

function getStatusLabel(status: string, purpose?: string): string {
  if (purpose === 'rent') return 'For Rent';
  return 'For Sale';
}
void getStatusLabel;

export default function PropertyLeftColumn({
  description, features, amenities, beds, baths, parking, garages, sqft,
  propertyType, ref, price, location, title, latitude, longitude, district, area, city, country, furnished, createdAt,
  commissionApplicable, commissionDetails, specs, documents,
}: LeftColumnProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const { content: c } = usePropertyDetailContent();

  const plainDescription = descriptionToNormalizedPlainText(description);
  const descriptionLimit = 200;
  const isLongDescription = plainDescription.length > descriptionLimit;
  const descriptionPreview = isLongDescription
    ? `${plainDescription.slice(0, descriptionLimit).trimEnd()}\u2026`
    : plainDescription;

  const allFeatures = [...features, ...amenities];
  const visibleFeatures = featuresExpanded ? allFeatures : allFeatures.slice(0, 8);
  const hasMoreFeatures = allFeatures.length > 8;

  const mapQuery = latitude && longitude
    ? `${latitude},${longitude}`
    : encodeURIComponent(`${district}, ${area}`);
  const mapSrc = `https://maps.google.com/maps?q=${mapQuery}&z=14&ie=UTF8&iwloc=&output=embed`;

  const garageTotal = (parking || 0) + (garages || 0);
  const displayCity = city || district || area || '';
  const locationLine = [area, city, country]
    .map((v) => (v || '').trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(', ');
  const displayPropertyType = propertyType ? propertyType.charAt(0).toUpperCase() + propertyType.slice(1) : c.na_value;
  const displayBeds = beds != null && beds > 0 ? String(beds) : '-';
  const displayBaths = baths != null && baths > 0 ? String(baths) : '-';
  const displayGarage = garageTotal > 0 ? String(garageTotal) : '-';
  const displaySqft = sqft != null && sqft > 0 ? `${sqft.toLocaleString()} sqft` : '-';

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : c.na_value;

  type DetailRow = { label: string; value: string; isPrice?: boolean };

  const detailsLeft: DetailRow[] = [
    { label: c.label_property_id, value: ref || c.na_value },
    { label: c.label_price, value: price, isPrice: true },
    { label: c.label_bedrooms, value: displayBeds },
    { label: c.label_bathrooms, value: displayBaths },
    { label: c.label_garage_parking, value: displayGarage },
    { label: c.label_property_size, value: displaySqft },
  ];

  const detailsRight: DetailRow[] = [
    { label: c.label_property_type, value: displayPropertyType },
    { label: c.label_furnished, value: furnished || c.unfurnished },
    { label: c.label_status, value: c.status_sale },
    { label: c.label_location, value: locationLine || location || displayCity || c.na_value },
    { label: c.label_commission, value: commissionApplicable ? c.commission_yes : c.commission_no },
    ...(commissionApplicable
      ? [{ label: c.label_commission_amount, value: (commissionDetails || '').trim() || c.commission_on_request }]
      : []),
    { label: c.label_date_listed, value: formattedDate },
  ];

  return (
    <div className="min-w-0 p-4 md:p-6 lg:p-7 border border-[#e5e5e5] bg-white rounded-[2px]">
      {/* Description */}
      <section className="mb-6 md:mb-8 pb-6 md:pb-8 border-b border-[#e5e5e5]">
        <div id="section-description" className="mb-3 md:mb-5 scroll-mt-24">
          <h2
            className="font-title text-[17px] md:text-[18px] font-semibold tracking-normal text-primary pb-2 md:pb-3 border-b border-[#e5e7eb]"
          >
            {c.section_description}
          </h2>
        </div>
        <div className="font-copy text-[16px] text-[#0d1f2d] leading-[1.65]">
          {!plainDescription.trim() ? (
            <p>{c.no_description}</p>
          ) : descExpanded ? (
            <RichTextContent html={description} normalizeCase />
          ) : (
            <p className="whitespace-pre-line">{descriptionPreview}</p>
          )}
        </div>
        {isLongDescription && (
          <button
            onClick={() => setDescExpanded(!descExpanded)}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-title font-semibold uppercase tracking-wider transition-opacity hover:opacity-70 cursor-pointer text-[#555555]"
          >
            {descExpanded ? c.show_less : c.read_full}
            <span className="w-4 h-4 flex items-center justify-center">
              <i className={`text-sm ${descExpanded ? 'ri-arrow-up-wide-fill' : 'ri-arrow-down-wide-fill'}`}></i>
            </span>
          </button>
        )}
      </section>

      {/* Property Details */}
      <section className="mb-6 md:mb-8">
        <div className="mb-3 md:mb-4">
          <h2 id="section-details" className="font-title text-[17px] md:text-[18px] font-semibold tracking-normal text-primary pb-2 md:pb-3 border-b border-[#e5e7eb] scroll-mt-24">
            {c.section_details}
          </h2>
        </div>
        <div className="bg-white border-2 border-stone-300 p-3 md:p-5 rounded-[2px]">
          {/* Mobile: stacked */}
          <div className="md:hidden flex flex-col">
            {[...detailsLeft, ...detailsRight].map((d, idx, arr) => (
              <div key={idx} className={`flex items-center justify-between py-2 px-1 ${idx < arr.length - 1 ? 'border-b border-stone-100' : ''}`}>
                <span className="text-xs font-roboto font-semibold text-primary">{d.label}</span>
                <span
                  className={`text-xs font-roboto font-bold text-right ml-3 break-words max-w-[55%] ${d.isPrice ? 'text-primary' : 'text-black'}`}
                >
                  {d.value}
                </span>
              </div>
            ))}
          </div>

          {/* Desktop: two columns with divider */}
          <div className="hidden md:flex md:flex-row">
            <div className="flex-1 flex flex-col">
              {detailsLeft.map((d, idx) => (
                <div key={idx} className={`flex items-center justify-between py-2 px-1 ${idx < detailsLeft.length - 1 ? 'border-b border-stone-100' : ''}`}>
                  <span className="text-sm font-roboto font-semibold text-primary">{d.label}</span>
                  <span
                    className={`text-sm font-roboto font-bold text-right ml-4 ${d.isPrice ? 'text-primary' : 'text-black'}`}
                  >
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mx-5 lg:mx-6 border-r border-primary/12 self-stretch"></div>
            <div className="flex-1 flex flex-col">
              {detailsRight.map((d, idx) => (
                <div key={idx} className={`flex items-center justify-between py-2 px-1 ${idx < detailsRight.length - 1 ? 'border-b border-stone-100' : ''}`}>
                  <span className="text-sm font-roboto font-semibold text-primary">{d.label}</span>
                  <span className="text-sm font-roboto font-bold text-right ml-4 text-black">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Additional Details - every populated CRM field that isn't already in the grid */}
      {specs && specs.length > 0 && (
        <section className="mb-6 md:mb-8">
          <div id="section-additional-details" className="mb-3 md:mb-5 scroll-mt-24">
            <h2
              className="font-title text-[17px] md:text-[18px] font-semibold tracking-normal text-primary pb-2 md:pb-3 border-b border-[#e5e7eb]"
            >
              {c.section_additional}
            </h2>
          </div>
          <div className="bg-white border-2 border-stone-300 p-3 md:p-5 rounded-[2px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              {specs.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4 py-2 px-1 border-b border-stone-100">
                  <span className="text-xs md:text-sm font-roboto font-semibold text-primary">{s.label}</span>
                  <span className="text-xs md:text-sm font-roboto font-bold text-right text-black break-words max-w-[55%]">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Floor Plans & Documents (only when the agent attached real files) */}
      <PropertyDocuments documents={documents} title={title} />

      {/* Features & Amenities */}
      {allFeatures.length > 0 && (
        <section className="mb-6 md:mb-8 pb-6 md:pb-8 border-b border-[#e5e5e5]">
          <div id="section-features" className="mb-3 md:mb-5 scroll-mt-24">
            <h2
              className="font-title text-[17px] md:text-[18px] font-semibold tracking-normal text-primary pb-2 md:pb-3 border-b border-[#e5e7eb]"
            >
              {c.section_features}
            </h2>
          </div>
          <div className="bg-white border-2 border-stone-300 p-4 md:p-6 rounded-[2px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-3">
              {visibleFeatures.map((feat: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3.5 py-2 sm:py-3 border border-primary/12 rounded-sm bg-white hover:border-stone-400 transition-colors cursor-default min-w-0"
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center shrink-0 border border-primary/12 rounded-sm bg-stone-50">
                    <i className={`${getFeatureIcon(feat)} text-xs text-[#888888]`}></i>
                  </div>
                  <span className="text-xs sm:text-sm md:text-base font-roboto font-semibold text-primary capitalize leading-snug break-words min-w-0">{feat}</span>
                </div>
              ))}
            </div>
          </div>
          {hasMoreFeatures && (
            <button
              onClick={() => setFeaturesExpanded(!featuresExpanded)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-title font-semibold uppercase tracking-wider transition-opacity hover:opacity-70 cursor-pointer text-[#555555]"
            >
              {featuresExpanded ? c.view_less : `${c.view_all_features_prefix} ${allFeatures.length} ${c.view_all_features_suffix}`}
              <span className="w-4 h-4 flex items-center justify-center">
                <i className={`text-sm ${featuresExpanded ? 'ri-arrow-up-wide-fill' : 'ri-arrow-down-wide-fill'}`}></i>
              </span>
            </button>
          )}
        </section>
      )}

      {/* Location Map */}
      <section>
        <div id="section-location" className="mb-3 md:mb-5 scroll-mt-24">
          <h2
            className="font-title text-[17px] md:text-[18px] font-semibold tracking-normal text-primary pb-2 md:pb-3 border-b border-[#e5e7eb]"
          >
            {c.section_location}
          </h2>
        </div>
        <div className="aspect-[16/9] overflow-hidden rounded-[2px] border border-primary/12">
          <iframe
            src={mapSrc}
            className="w-full h-full"
            loading="lazy"
            title={`Map of ${title}`}
            allowFullScreen
          ></iframe>
        </div>
        <p className="text-primary/50 font-roboto text-xs mt-3 flex items-center gap-1.5">
          <i className="ri-map-pin-2-line text-accent"></i>
          {location}
        </p>
      </section>
    </div>
  );
}