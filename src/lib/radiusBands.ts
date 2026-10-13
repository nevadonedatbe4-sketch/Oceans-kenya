/**
 * radiusBands - the cumulative (Tinder-style) radius model, in one pure place.
 *
 * The selected area is the PERMANENT anchor. Increasing the radius must only
 * ever ADD eligible nearby listings - it must never remove an original-area
 * listing. This module encodes that contract so the diagnostics tool can prove,
 * band by band, that the count only grows.
 */

import { haversineDistance } from './distance';

/** The radius ladder used by the diagnostics table (miles; 0 = area only). */
export const DIAG_RADII: number[] = [0, 0.25, 1, 2, 3, 4, 5, 10];

const METERS_PER_MILE = 1609.344;

export interface DiagListing {
  id: string;
  /** Resolved area/neighbourhood display text used for anchor matching. */
  area: string;
  lat: number | null;
  lng: number | null;
}

export interface BandRow {
  label: string;
  radiusMiles: number;
  /** Eligible listings in the anchor area (constant across every band). */
  originalArea: number;
  /** Newly eligible listings added by this radius band. */
  nearbyAdded: number;
  /** Cumulative total = originalArea + nearbyAdded. */
  total: number;
}

export interface RadiusBandResult {
  originalArea: number;
  bands: BandRow[];
  /** Every listing that is within the widest radius (with distance + source). */
  resolved: Array<DiagListing & { distanceMeters: number | null; inAnchorArea: boolean }>;
}

/** Does a listing belong to the anchor area (by its area text)? */
export function listingInAnchor(listing: DiagListing, anchorName: string): boolean {
  const a = (anchorName || '').trim().toLowerCase();
  if (!a) return false;
  return (listing.area || '').toLowerCase().includes(a);
}

/**
 * Compute the cumulative radius bands for an anchor area. Anchor-area listings
 * are always counted regardless of their coordinates; only listings OUTSIDE the
 * anchor area are gated by distance.
 */
export function computeRadiusBands(
  listings: DiagListing[],
  anchorName: string,
  anchor: { lat: number; lng: number },
): RadiusBandResult {
  const distances = listings.map((l) => {
    const inAnchorArea = listingInAnchor(l, anchorName);
    const hasCoords = l.lat != null && l.lng != null;
    const distanceMeters = hasCoords
      ? haversineDistance(anchor.lat, anchor.lng, l.lat as number, l.lng as number)
      : null;
    return { ...l, distanceMeters, inAnchorArea };
  });

  const originalArea = distances.filter((d) => d.inAnchorArea).length;

  const bands: BandRow[] = DIAG_RADII.map((miles) => {
    const meters = miles <= 0 ? 0 : miles * METERS_PER_MILE;
    const total = distances.filter((d) => {
      if (d.inAnchorArea) return true;
      if (meters <= 0) return false;
      if (d.distanceMeters == null) return false;
      return d.distanceMeters <= meters;
    }).length;
    return {
      label: miles <= 0 ? 'Area only' : `${miles} mile${miles === 1 ? '' : 's'}`,
      radiusMiles: miles,
      originalArea,
      nearbyAdded: total - originalArea,
      total,
    };
  });

  return { originalArea, bands, resolved: distances };
}