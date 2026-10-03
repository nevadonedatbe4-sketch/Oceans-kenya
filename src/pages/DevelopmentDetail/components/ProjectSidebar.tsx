interface ProjectSidebarProps {
  /** Google Maps embed URL (empty when the project has no usable location). */
  mapSrc: string;
  /** Project name, for the map title + fallback address label. */
  name: string;
  /** Human address / area line for the project. */
  address: string;
  /** Formatted "From …" price label. */
  priceLabel: string;
  /** Opens the enquiry flow with a reason + message. */
  onEnquire: (reason: string, message: string) => void;
}

/**
 * ProjectSidebar - the sticky rail on the development page.
 *
 * Holds the interactive map (moved out of the main content so the page carries
 * less vertical data) plus the primary enquiry actions, so the location and the
 * "contact" step stay in view while the visitor reads any tab.
 */
export default function ProjectSidebar({ mapSrc, name, address, priceLabel, onEnquire }: ProjectSidebarProps) {
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || name)}`;

  return (
    <div className="space-y-5">
      {mapSrc && (
        <div className="rounded-lg border border-[#e5e5e5] bg-white p-3">
          <div className="aspect-[4/3] rounded-md overflow-hidden border border-[#eef0f2] bg-stone-100">
            <iframe
              src={mapSrc}
              className="w-full h-full"
              loading="lazy"
              title={`Map of ${name}`}
              allowFullScreen
            ></iframe>
          </div>
          <div className="pt-3">
            <p className="text-sm font-roboto font-semibold text-primary flex items-start gap-1.5">
              <i className="ri-map-pin-2-line text-base mt-0.5 shrink-0 text-[#0d5959]"></i>
              <span className="min-w-0">{address || name}</span>
            </p>
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0d5959] hover:underline cursor-pointer"
            >
              <i className="ri-external-link-line text-base"></i>Open in Google Maps
            </a>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[#e5e5e5] bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/50">From</p>
        <p className="text-2xl font-bold text-primary mt-1 whitespace-nowrap">{priceLabel}</p>
        <button
          type="button"
          onClick={() => onEnquire('Enquire', `Hello, I would like more information about ${name}.`)}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white text-base font-bold rounded-md whitespace-nowrap cursor-pointer hover:bg-primary/90 transition-colors"
        >
          <i className="ri-mail-send-line text-base"></i>Contact agent
        </button>
        <button
          type="button"
          onClick={() => onEnquire('Request Price List', `Hello, I would like the full price list and unit availability for ${name}.`)}
          className="mt-2.5 w-full inline-flex items-center justify-center gap-2 px-5 py-3 border border-primary text-primary text-base font-bold rounded-md whitespace-nowrap cursor-pointer hover:bg-primary hover:text-white transition-colors"
        >
          <i className="ri-price-tag-3-line text-base"></i>Request price list
        </button>
      </div>
    </div>
  );
}