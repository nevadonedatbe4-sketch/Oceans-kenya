import { useEffect } from 'react';
import { getSiteName, getSiteNameSync } from '@/lib/siteMeta';
import { hasValidPrice } from '@/lib/listingMeta';

/**
 * useSeoMeta - client-side head manager for crawl-ready SPA pages.
 *
 * Sets / updates the document title, meta description, canonical URL, Open
 * Graph tags and injects one or more JSON-LD structured-data blocks. Because
 * this runs on the browser (SPA), it keeps the page fully consistent for any
 * prerenderer and for social previews. All of it is idempotent: repeated
 * updates overwrite previous values instead of stacking them.
 */

interface SeoMetaOptions {
  /** Browser tab title - must typically be ≤ 60 chars. */
  title: string;
  /** Meta description - ideal 120-160 chars. */
  description: string;
  /** Page path (relative, e.g. "/houses-for-sale/karen"). */
  path?: string;
  /** Optional OG image URL. */
  ogImage?: string;
  /** Optional JSON-LD schema objects to inject (BreadcrumbList, FAQPage, ItemList...). */
  schemas?: Record<string, unknown>[];
  /** When true, ask search engines not to index this page (thin/missing content). */
  noindex?: boolean;
}

/** Compute an absolute URL for the canonical tag + OG url, honouring base path. */
export function absoluteUrl(path: string): string {
  const base = typeof __BASE_PATH__ === 'string' ? __BASE_PATH__ : '';
  const prefix = base === '/' ? '' : base;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${prefix}${cleanPath}`;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useSeoMeta({ title, description, path, ogImage, schemas, noindex }: SeoMetaOptions): void {
  useEffect(() => {
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow');

    if (path) {
      const url = absoluteUrl(path);
      upsertCanonical(url);
      upsertMeta('property', 'og:url', url);
    }
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', getSiteNameSync());
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    if (ogImage) {
      upsertMeta('property', 'og:image', ogImage);
      upsertMeta('name', 'twitter:image', ogImage);
    }

    // Replace previously injected JSON-LD blocks (marked with data-seo-jsonld).
    document.head
      .querySelectorAll('script[data-seo-jsonld]')
      .forEach((node) => node.remove());
    if (schemas && schemas.length > 0) {
      schemas.forEach((schema) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-jsonld', 'true');
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
      });
    }
  }, [title, description, path, ogImage, schemas]);

  // The site name is admin-managed; resolve it once so og:site_name reflects
  // the saved value instead of a hard-coded default.
  useEffect(() => {
    let active = true;
    getSiteName().then((name) => {
      if (active && name) upsertMeta('property', 'og:site_name', name);
    });
    return () => {
      active = false;
    };
  }, []);
}

/** Build a BreadcrumbList schema from a trail of {name, path} steps. */
export function buildBreadcrumbSchema(trail: Array<{ name: string; path: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: absoluteUrl(step.path),
    })),
  };
}

/** Build an FAQPage schema from a list of questions. */
export function buildFaqSchema(faqs: Array<{ q: string; a: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/** Build an ItemList of RealEstateListing schemas from mapped listings. */
export function buildListingSchema(
  items: Array<{
    title: string;
    url: string;
    price: number;
    priceCurrency: string;
    address: string;
    image?: string;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
  }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'RealEstateListing',
        name: it.title,
        url: it.url,
        image: it.image ? [it.image] : undefined,
        numberOfRooms: it.bedrooms,
        numberOfBathroomsTotal: it.bathrooms,
        address: {
          '@type': 'PostalAddress',
          streetAddress: it.address,
          addressLocality: 'Nairobi',
          addressCountry: 'KE',
        },
        // A listing without a real price must NOT emit an `offers` block with a
        // fabricated 0 - search engines and social previews would show it.
        ...(hasValidPrice(it.price)
          ? {
              offers: {
                '@type': 'Offer',
                priceCurrency: it.priceCurrency,
                price: it.price,
                priceValidUntil: new Date(Date.now() + 180 * 86400000).toISOString(),
              },
            }
          : {}),
      },
    })),
  };
}

/** Build a WebPage schema for a price / rental guide page. */
export function buildPriceOfferSchema(
  area: string,
  avgSale: number | null,
  rentalRange: string | null,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${area} price guide`,
    about: {
      '@type': 'Place',
      name: `${area}, Nairobi, Kenya`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Nairobi',
        addressRegion: 'Nairobi',
        addressCountry: 'KE',
      },
    },
    ...(hasValidPrice(avgSale)
      ? {
          mainEntity: {
            '@type': 'AggregateOffer',
            priceCurrency: 'KES',
            lowPrice: avgSale,
            lowPriceValue: avgSale,
          },
        }
      : {}),
    ...(rentalRange ? { description: `Typical monthly rent range in ${area}: ${rentalRange}` } : {}),
  };
}