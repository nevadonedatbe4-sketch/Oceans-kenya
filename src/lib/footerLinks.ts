/**
 * footerLinks - single source of truth for the global website footer.
 *
 * Every link here points at a REAL, crawlable route that exists in
 * src/router/config.tsx. Dynamic columns (Popular Locations, Property Types)
 * are merged in at runtime from live database data via `useFooterData`, so the
 * footer never exposes empty or misleading links.
 */

export interface FooterLink {
  label: string;
  href: string;
}

/** Property-type link that maps to a group of raw listings.property_type values. */
export interface PropertyTypeLink extends FooterLink {
  /** Lower-cased property_type values that should surface this link. */
  match: string[];
}

/**
 * SEO intro paragraph shown in the footer. Natural, keyword-rich and readable -
 * it references the real locations and services the platform offers.
 */
export const FOOTER_SEO_INTRO =
  'Discover exceptional properties across Nairobi and beyond. Explore houses, apartments, villas, land, commercial properties and joint venture opportunities in sought-after locations such as Karen, Runda, Lavington, Westlands and Kilimani. Find your next property with detailed listings, trusted estate agents and convenient property search tools.';

/** Column 1 - Property Search. */
export const FOOTER_SEARCH_LINKS: FooterLink[] = [
  { label: 'Properties for Sale', href: '/buy' },
  { label: 'Properties for Rent', href: '/rent' },
  { label: 'Properties to Buy', href: '/all-properties' },
  { label: 'Joint Venture Opportunities', href: '/joint-ventures' },
  { label: 'New Developments', href: '/new-developments' },
  { label: 'Featured Properties', href: '/buy' },
  { label: 'Recently Added Properties', href: '/all-properties' },
];

/**
 * Column 2 - Property Types. Residential entries are only shown when the
 * corresponding property_type actually exists in published listings.
 */
export const PROPERTY_TYPE_LINKS: PropertyTypeLink[] = [
  { label: 'Houses', href: '/houses-for-sale/nairobi', match: ['house', 'detached', 'semi-detached', 'terraced'] },
  { label: 'Villas', href: '/buy?type=Villa', match: ['villa'] },
  { label: 'Apartments', href: '/apartments-for-sale/nairobi', match: ['apartment', 'flat', 'condo', 'condominium_apartment', 'apartment_block'] },
  { label: 'Townhouses', href: '/townhouses-for-sale/nairobi', match: ['townhouse'] },
  { label: 'Penthouses', href: '/penthouses-for-sale/westlands', match: ['penthouse'] },
  { label: 'Bungalows', href: '/buy?type=Bungalow', match: ['bungalow'] },
  { label: 'Maisonettes', href: '/buy?type=Maisonette', match: ['maisonette'] },
  { label: 'Studios', href: '/buy?type=Studio', match: ['studio'] },
  { label: 'Land', href: '/land-for-sale/nairobi', match: ['land', 'farms_/_land', 'farms_land'] },
];

/** Always-available commercial / development links (real routes). */
export const COMMERCIAL_TYPE_LINKS: FooterLink[] = [
  { label: 'Mansions & Luxury Homes', href: '/luxury-homes-nairobi' },
  { label: 'Commercial Properties', href: '/commercial-property-for-sale/nairobi' },
  { label: 'Office Spaces', href: '/commercial-property-to-rent/nairobi' },
  { label: 'Warehouses', href: '/commercial-property-to-rent/nairobi' },
  { label: 'Development Opportunities', href: '/new-developments' },
];

/** Fallback residential types when the live listing query returns nothing. */
export const DEFAULT_TYPE_LINKS: FooterLink[] = [
  ...PROPERTY_TYPE_LINKS.map(({ label, href }) => ({ label, href })),
  ...COMMERCIAL_TYPE_LINKS,
];

/** Column 5 - Company. */
export const FOOTER_COMPANY_LINKS: FooterLink[] = [
  { label: 'About Us', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Our Agents', href: '/about' },
  { label: 'Our Agencies', href: '/directory' },
  { label: 'Careers', href: '/contact' },
  { label: 'Partner With Us', href: '/joint-ventures' },
  { label: 'Joint Venture Opportunities', href: '/joint-ventures' },
  { label: 'Advertise With Us', href: '/c/commercial-advertising' },
];

/** Column 6 - Resources. */
export const FOOTER_RESOURCE_LINKS: FooterLink[] = [
  { label: 'Property Buying Guide', href: '/buy' },
  { label: 'Property Selling Guide', href: '/landlords' },
  { label: 'Property Investment Guide', href: '/investment-property-nairobi' },
  { label: 'Area & Neighbourhood Guides', href: '/neighbourhoods' },
  { label: 'Property Market Insights', href: '/property-prices/karen' },
  { label: 'Living in Nairobi', href: '/living-in-nairobi' },
  { label: 'Blog & Insights', href: '/neighbourhoods#blog' },
  { label: 'Contact Support', href: '/contact' },
];

/** Column 7 - Legal & Support. */
export const FOOTER_LEGAL_LINKS: FooterLink[] = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms-conditions' },
  { label: 'Cookie Policy', href: '/cookie-policy' },
  { label: 'Disclaimer', href: '/disclaimer' },
  { label: 'Report a Listing', href: '/report-a-listing' },
  { label: 'Help Center', href: '/help-center' },
];

/** Fallback Nairobi areas (used before live data loads or if it fails). */
export const FALLBACK_FOOTER_AREAS: FooterLink[] = [
  { label: 'Karen', href: '/neighbourhood/karen' },
  { label: 'Runda', href: '/neighbourhood/runda' },
  { label: 'Lavington', href: '/neighbourhood/lavington' },
  { label: 'Kitisuru', href: '/neighbourhood/kitisuru' },
  { label: 'Kileleshwa', href: '/neighbourhood/kileleshwa' },
  { label: 'Muthaiga', href: '/neighbourhood/muthaiga' },
  { label: 'Spring Valley', href: '/neighbourhood/spring-valley' },
  { label: 'Riverside', href: '/neighbourhood/riverside' },
  { label: 'Westlands', href: '/neighbourhood/westlands' },
  { label: 'Kilimani', href: '/neighbourhood/kilimani' },
  { label: 'Nyari', href: '/neighbourhood/nyari' },
  { label: 'Ridgeways', href: '/neighbourhood/ridgeways' },
  { label: 'Upper Hill', href: '/neighbourhood/upper-hill' },
  { label: 'Gigiri', href: '/neighbourhood/gigiri' },
];

/**
 * Column 4 - Popular Searches. Curated, keyword-driven entries that all resolve
 * to real, live-listing SEO landing pages (never empty or thin pages).
 */
export const FOOTER_POPULAR_SEARCHES: FooterLink[] = [
  { label: 'Luxury Homes in Nairobi', href: '/luxury-homes-nairobi' },
  { label: 'Apartments for Sale in Nairobi', href: '/apartments-for-sale/nairobi' },
  { label: 'Apartments to Rent in Nairobi', href: '/apartments-to-rent/nairobi' },
  { label: 'Houses for Sale in Nairobi', href: '/houses-for-sale/nairobi' },
  { label: 'Houses to Rent in Nairobi', href: '/houses-to-rent/nairobi' },
  { label: 'Townhouses for Sale in Nairobi', href: '/townhouses-for-sale/nairobi' },
  { label: 'Land for Sale in Nairobi', href: '/land-for-sale/nairobi' },
  { label: 'Commercial Property for Sale', href: '/commercial-property-for-sale/nairobi' },
  { label: 'Commercial Property to Rent', href: '/commercial-property-to-rent/nairobi' },
  { label: 'Modern Homes & Apartments', href: '/modern-apartments/nairobi' },
  { label: 'Gated Community Properties', href: '/gated-community-homes/nairobi' },
  { label: 'Properties with Swimming Pools', href: '/properties-with-pool/nairobi' },
  { label: 'Investment Properties', href: '/investment-property-nairobi' },
  { label: 'Serviced Apartments', href: '/serviced-apartments/nairobi' },
  { label: 'Furnished Apartments in Westlands', href: '/furnished-apartments/westlands' },
  { label: 'Penthouses for Sale in Westlands', href: '/penthouses-for-sale/westlands' },
  { label: 'Duplex Apartments', href: '/duplex-apartments/nairobi' },
  { label: 'Houses for Sale in Karen', href: '/houses-for-sale/karen' },
  { label: 'Villas for Sale in Runda', href: '/villas-for-sale/runda' },
  { label: 'Townhouses for Sale in Lavington', href: '/townhouses-for-sale/lavington' },
];

/** Structured, admin-editable footer column model (stored as JSON). */
export interface FooterColumnConfig {
  title: string;
  links: FooterLink[];
}

/**
 * Default editable column structure. Mirrors the shipped footer exactly so the
 * editor always opens with the real, current content ready to tweak.
 */
export const DEFAULT_FOOTER_COLUMNS: FooterColumnConfig[] = [
  { title: 'Property Search', links: FOOTER_SEARCH_LINKS },
  { title: 'Property Types', links: DEFAULT_TYPE_LINKS },
  { title: 'Popular Locations', links: FALLBACK_FOOTER_AREAS },
  { title: 'Popular Searches', links: FOOTER_POPULAR_SEARCHES },
  { title: 'Company', links: FOOTER_COMPANY_LINKS },
  { title: 'Resources', links: FOOTER_RESOURCE_LINKS },
  { title: 'Legal & Support', links: FOOTER_LEGAL_LINKS },
];

/** Bottom-bar quick links (editable from the Footer settings tab). */
export const DEFAULT_FOOTER_BOTTOM_LINKS: FooterLink[] = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms-conditions' },
  { label: 'Cookie Policy', href: '/cookie-policy' },
  { label: 'Sitemap', href: '/sitemap.xml' },
  { label: 'Agents', href: '/agent/login' },
];

/** Safely parse stored columns JSON; returns null when absent, invalid or empty. */
export function parseFooterColumns(raw: string | null | undefined): FooterColumnConfig[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const columns: FooterColumnConfig[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const col = entry as { title?: unknown; links?: unknown };
      const title = typeof col.title === 'string' ? col.title : '';
      const rawLinks = Array.isArray(col.links) ? col.links : [];
      const links: FooterLink[] = [];
      for (const item of rawLinks) {
        if (!item || typeof item !== 'object') continue;
        const link = item as { label?: unknown; href?: unknown };
        if (typeof link.label === 'string' && typeof link.href === 'string') {
          links.push({ label: link.label, href: link.href });
        }
      }
      if (title.trim() && links.length > 0) columns.push({ title, links });
    }
    return columns.length > 0 ? columns : null;
  } catch {
    return null;
  }
}

/** Safely parse stored bottom-links JSON; returns null when absent, invalid or empty. */
export function parseFooterLinks(raw: string | null | undefined): FooterLink[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const links: FooterLink[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const link = item as { label?: unknown; href?: unknown };
      if (typeof link.label === 'string' && typeof link.href === 'string' && link.label.trim()) {
        links.push({ label: link.label, href: link.href });
      }
    }
    return links.length > 0 ? links : null;
  } catch {
    return null;
  }
}