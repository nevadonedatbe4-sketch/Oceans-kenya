import { useState } from 'react';
import { Link } from 'react-router-dom';

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
  furnished: string;
  createdAt?: string;
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

function stripHtmlToParagraphs(raw: string): string[] {
  if (!raw) return [];
  let text = raw
    // turn block-level breaks into newlines so paragraphs are preserved
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*(p|div|li|h[1-6])[^>]*>/gi, '\n');
  // remove every remaining tag
  text = text.replace(/<[^>]+>/g, '');
  // decode the most common HTML entities
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&rsquo;': '’',
    '&lsquo;': '‘',
    '&rdquo;': '”',
    '&ldquo;': '“',
  };
  text = text.replace(/&[a-zA-Z#0-9]+;/g, (m) => entities[m] ?? ' ');
  // normalise whitespace within lines, then split into clean paragraphs
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0);
}

function getFeatureIcon(label: string): string {
  const key = label.toLowerCase();
  for (const [k, v] of Object.entries(featureIcons)) {
    if (key.includes(k)) return v;
  }
  return 'ri-checkbox-circle-line';
}

function timeSince(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const weeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  if (weeks < 1) return 'this week';
  if (weeks === 1) return '1 week ago';
  if (weeks < 4) return `${weeks} weeks ago`;
  const months = Math.floor(weeks / 4.345);
  if (months === 1) return '1 month ago';
  return `${months} months ago`;
}

function getStatusLabel(status: string, purpose?: string): string {
  if (purpose === 'rent') return 'For Rent';
  return 'For Sale';
}

export default function PropertyLeftColumn({
  description, features, amenities, beds, baths, parking, garages, sqft,
  propertyType, status, ref, price, location, title, latitude, longitude, district, area, city, furnished, createdAt,
}: LeftColumnProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);

  const descParagraphs = stripHtmlToParagraphs(description);
  const plainDescription = descParagraphs.join(' ');
  const isLongDescription = plainDescription.length > 300;

  const allFeatures = [...features, ...amenities];
  const visibleFeatures = featuresExpanded ? allFeatures : allFeatures.slice(0, 8);
  const hasMoreFeatures = allFeatures.length > 8;

  const mapQuery = latitude && longitude
    ? `${latitude},${longitude}`
    : encodeURIComponent(`${district}, ${area}`);
  const mapSrc = `https://maps.google.com/maps?q=${mapQuery}&z=14&ie=UTF8&iwloc=&output=embed`;

  const garageTotal = (parking || 0) + (garages || 0);
  const displayCity = city || district || area || '';
  const displayPropertyType = propertyType ? propertyType.charAt(0).toUpperCase() + propertyType.slice(1) : 'N/A';
  const displayBeds = beds != null && beds > 0 ? String(beds) : '—';
  const displayBaths = baths != null && baths > 0 ? String(baths) : '—';
  const displayGarage = garageTotal > 0 ? String(garageTotal) : '—';
  const displaySqft = sqft != null && sqft > 0 ? `${sqft.toLocaleString()} sqft` : '—';

  const formattedDate = createdAt
    ? `${new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} (${timeSince(createdAt)})`
    : 'N/A';

  const detailsLeft = [
    { label: 'Property ID', value: ref || 'N/A' },
    { label: 'Price', value: price, isPrice: true },
    { label: 'Bedrooms', value: displayBeds },
    { label: 'Bathrooms', value: displayBaths },
    { label: 'Garage / Parking', value: displayGarage },
    { label: 'Property Size', value: displaySqft },
  ];

  const detailsRight = [
    { label: 'Property Type', value: displayPropertyType },
    { label: 'Furnished', value: furnished || 'Unfurnished' },
    { label: 'Property Status', value: getStatusLabel(status) },
    { label: 'Date Listed', value: formattedDate },
    { label: 'City', value: displayCity || 'N/A' },
  ];

  return (
    <div className="min-w-0 p-4 md:p-6 lg:p-7 border border-[#e5e5e5] bg-white rounded-[2px]">
      {/* Description */}
      <section className="mb-6 md:mb-8 pb-6 md:pb-8 border-b border-[#e5e5e5]">
        <div id="section-description" className="mb-3 md:mb-5 scroll-mt-24">
          <h2
            className="font-roboto font-bold text-sm md:text-base uppercase tracking-[0.12em] md:tracking-[0.15em] pb-2 md:pb-3 border-b-2 text-[#001731] border-[#CCCCCC]"
          >
            Description
          </h2>
        </div>
        <div
          className={`relative font-roboto text-sm text-[#555555] leading-[1.8] ${descExpanded ? '' : 'max-h-[200px] overflow-hidden'}`}
        >
          {descParagraphs.length > 0 ? (
            <div className="space-y-3">
              {descParagraphs.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>
          ) : (
            <p>No description available for this property.</p>
          )}
          {!descExpanded && isLongDescription && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
          )}
        </div>
        {isLongDescription && (
          <button
            onClick={() => setDescExpanded(!descExpanded)}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-roboto font-semibold uppercase tracking-wider transition-opacity hover:opacity-70 cursor-pointer text-[#555555]"
          >
            {descExpanded ? 'Show less' : 'Read more'}
            <span className="w-4 h-4 flex items-center justify-center">
              <i className={`text-sm ${descExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
            </span>
          </button>
        )}
      </section>

      {/* Property Details */}
      <section className="mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 id="section-details" className="font-roboto font-semibold text-sm md:text-base text-[#001731] scroll-mt-24">
            Property Details
          </h2>
          <span className="flex items-center gap-1.5 text-[11px] font-roboto text-stone-400">
            <i className="ri-refresh-line text-xs"></i>
            Updated {timeSince(createdAt)}
          </span>
        </div>
        <div className="bg-white border-2 border-stone-300 p-5 md:p-7 rounded-[2px]">
          {/* Mobile: stacked */}
          <div className="md:hidden flex flex-col">
            {[...detailsLeft, ...detailsRight].map((d, idx, arr) => (
              <div key={idx} className={`flex items-center justify-between py-3 px-1 ${idx < arr.length - 1 ? 'border-b border-stone-100' : ''}`}>
                <span className="text-sm font-roboto font-semibold text-stone-800">{d.label}</span>
                <span
                  className={`text-sm font-roboto font-bold text-right ml-4 ${d.isPrice ? 'text-[#002349]' : 'text-black'}`}
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
                <div key={idx} className={`flex items-center justify-between py-3 px-1 ${idx < detailsLeft.length - 1 ? 'border-b border-stone-100' : ''}`}>
                  <span className="text-sm font-roboto font-semibold text-stone-800">{d.label}</span>
                  <span
                    className={`text-sm font-roboto font-bold text-right ml-4 ${d.isPrice ? 'text-[#002349]' : 'text-black'}`}
                  >
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mx-5 lg:mx-6 border-r border-stone-200 self-stretch"></div>
            <div className="flex-1 flex flex-col">
              {detailsRight.map((d, idx) => (
                <div key={idx} className={`flex items-center justify-between py-3 px-1 ${idx < detailsRight.length - 1 ? 'border-b border-stone-100' : ''}`}>
                  <span className="text-sm font-roboto font-semibold text-stone-800">{d.label}</span>
                  <span className="text-sm font-roboto font-bold text-right ml-4 text-black">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features & Amenities */}
      {allFeatures.length > 0 && (
        <section className="mb-6 md:mb-8 pb-6 md:pb-8 border-b border-[#e5e5e5]">
          <div id="section-features" className="mb-3 md:mb-5 scroll-mt-24">
            <h2
              className="font-roboto font-bold text-sm md:text-base uppercase tracking-[0.12em] md:tracking-[0.15em] pb-2 md:pb-3 border-b-2 text-[#001731] border-[#CCCCCC]"
            >
              Features &amp; Amenities
            </h2>
          </div>
          <div className="bg-white border-2 border-stone-300 p-4 md:p-6 rounded-[2px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-3">
              {visibleFeatures.map((feat: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-3.5 py-3 border border-stone-200 rounded-sm bg-white hover:border-stone-400 transition-colors cursor-default"
                >
                  <div className="w-7 h-7 flex items-center justify-center shrink-0 border border-stone-200 rounded-sm bg-stone-50">
                    <i className={`${getFeatureIcon(feat)} text-xs text-[#888888]`}></i>
                  </div>
                  <span className="text-sm md:text-base font-roboto font-semibold text-stone-800 capitalize leading-snug">{feat}</span>
                </div>
              ))}
            </div>
          </div>
          {hasMoreFeatures && (
            <button
              onClick={() => setFeaturesExpanded(!featuresExpanded)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-roboto font-semibold uppercase tracking-wider transition-opacity hover:opacity-70 cursor-pointer text-[#555555]"
            >
              {featuresExpanded ? 'View less' : `View all ${allFeatures.length} features`}
              <span className="w-4 h-4 flex items-center justify-center">
                <i className={`text-sm ${featuresExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
              </span>
            </button>
          )}
        </section>
      )}

      {/* Location Map */}
      <section>
        <div id="section-location" className="mb-3 md:mb-5 scroll-mt-24">
          <h2
            className="font-roboto font-bold text-sm md:text-base uppercase tracking-[0.12em] md:tracking-[0.15em] pb-2 md:pb-3 border-b-2 text-[#001731] border-[#CCCCCC]"
          >
            Location
          </h2>
        </div>
        <div className="aspect-[16/9] overflow-hidden rounded-[2px] border border-stone-200">
          <iframe
            src={mapSrc}
            className="w-full h-full"
            loading="lazy"
            title={`Map of ${title}`}
            allowFullScreen
          ></iframe>
        </div>
        <p className="text-stone-400 font-roboto text-xs mt-3 flex items-center gap-1.5">
          <i className="ri-map-pin-2-line text-golden"></i>
          {location}
        </p>
      </section>
    </div>
  );
}