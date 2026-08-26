export type PropertyKind = 'residential' | 'commercial' | 'land';

const RESIDENTIAL_TYPES = new Set([
  'house', 'apartment', 'bungalow', 'studio', 'studio_flat', 'maisonette',
  'villa', 'townhouse', 'penthouse', 'detached', 'semi-detached', 'semi_detached',
  'terraced', 'terraced_house', 'park_home', 'flat', 'flat_apartment', 'flat_/_apartment', 'condo',
]);

const COMMERCIAL_TYPES = new Set([
  'office', 'serviced_office', 'retail', 'retail_shop', 'retail_/_shop', 'shop',
  'warehouse', 'distribution_warehouse', 'industrial', 'industrial_park',
  'light_industrial', 'heavy_industrial', 'factory', 'storage', 'hotel', 'pub',
  'restaurant', 'cafe', 'guest_house', 'leisure', 'other', 'commercial',
]);

const LAND_TYPES = new Set(['land', 'farms_land', 'farms_/_land']);

export function getPropertyKind(propertyType?: string | null): PropertyKind {
  const t = (propertyType || '').toLowerCase().trim().replace(/\s+/g, '_');
  if (LAND_TYPES.has(t)) return 'land';
  if (COMMERCIAL_TYPES.has(t)) return 'commercial';
  return 'residential';
}

export interface PropertySpec {
  key: string;
  icon: string;
  label: string;
}

export interface PropertySpecValues {
  beds?: number;
  baths?: number;
  parking?: number;
  sqft?: number;
  acreage?: number;
  landSize?: number;
  landUnit?: string;
}

function formatArea(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function getPropertySpecs(
  propertyType: string | undefined | null,
  values: PropertySpecValues = {},
): PropertySpec[] {
  const kind = getPropertyKind(propertyType);
  const beds = values.beds ?? 0;
  const baths = values.baths ?? 0;
  const parking = values.parking ?? 0;
  const specs: PropertySpec[] = [];

  if (kind === 'land') {
    const area = values.acreage ?? values.landSize ?? 0;
    if (area > 0) {
      specs.push({
        key: 'land',
        icon: 'ri-landscape-line',
        label: `${formatArea(area)} ${values.landUnit || 'Acres'}`,
      });
    }
    return specs;
  }

  if (kind === 'commercial') {
    const area = values.sqft ?? 0;
    if (area > 0) {
      specs.push({ key: 'size', icon: 'ri-ruler-line', label: `${formatArea(area)} sqft` });
    }
    if (parking > 0) {
      specs.push({ key: 'parking', icon: 'ri-car-line', label: `${parking} Parking` });
    }
    return specs;
  }

  if (beds > 0) specs.push({ key: 'beds', icon: 'ri-hotel-bed-line', label: `${beds} ${beds === 1 ? 'Bed' : 'Beds'}` });
  if (baths > 0) specs.push({ key: 'baths', icon: 'fa-solid fa-bath', label: `${baths} ${baths === 1 ? 'Bath' : 'Baths'}` });
  if (parking > 0) specs.push({ key: 'parking', icon: 'ri-car-line', label: `${parking} Parking` });
  return specs;
}