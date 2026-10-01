import { smartTitleCase } from '@/lib/location';

/**
 * displayTitle — Normal Title Case for property / land / development / JV
 * titles across the CRMs and portals.
 *
 * Shouty ALL-CAPS titles ("WESTLANDS | 4-BEDROOM DUPLEX") are converted to
 * Normal Title Case; titles that are already correctly cased are left
 * untouched so we never mangle good data. Titles are never clipped and never
 * get an ellipsis — callers let them wrap naturally.
 */
export function displayTitle(raw?: string | null): string {
  return smartTitleCase(raw || '');
}

/**
 * displayPersonName — Normal Title Case for a person's name across the CRMs
 * (contacts, leads). Shouty ALL-CAPS / all-lowercase names are tidied while
 * correctly-cased names are left untouched. Empty parts are dropped so a
 * missing last name never leaves a trailing space.
 */
export function displayPersonName(...parts: (string | null | undefined)[]): string {
  return parts
    .map((part) => smartTitleCase(part || ''))
    .filter(Boolean)
    .join(' ');
}

const stripCountry = (value: string) => value.replace(/[,\s]*kenya\s*$/i, '').trim();

const cleanSegment = (value?: string | null) => smartTitleCase((value || '').trim());

/**
 * displayLocation — consistent "[Area], City" location labels across the CRMs.
 *
 * Rules:
 * - Area / neighbourhood comes first, city after it ("Karen, Nairobi").
 * - Country ("Kenya") is dropped.
 * - A redundant city ("Nairobi, Nairobi") is collapsed to one.
 * - Multi-part areas are preserved ("General Mathenge, Westlands, Nairobi").
 * - Pass { upper: true } to render the map-pin location line in ALL CAPS.
 */
export function displayLocation(
  area?: string | null,
  city?: string | null,
  opts?: { upper?: boolean },
): string {
  const areaRaw = stripCountry((area || '').trim());
  const base = areaRaw
    .split(',')
    .map((segment) => cleanSegment(segment))
    .filter(Boolean)
    .join(', ');

  const cityClean = stripCountry(cleanSegment(city));
  if (!base && !cityClean) return '';
  const targetCity = cityClean || 'Nairobi';

  let label = base;
  if (!label) {
    label = targetCity;
  } else if (!label.toLowerCase().includes(targetCity.toLowerCase())) {
    label = `${label}, ${targetCity}`;
  }

  return opts?.upper ? label.toUpperCase() : label;
}

/**
 * bedroomTypeRange — summarise a development's unit types as a bedroom range,
 * e.g. "Studio – 4 Bed" or "Studio – Penthouse". Only the configurations that
 * genuinely exist are used; nothing is invented.
 */
export function bedroomTypeRange(
  units: { bedrooms?: number | null; name?: string | null }[],
): string {
  if (!units || units.length === 0) return '';

  const names = units.map((u) => (u.name || '').trim()).filter(Boolean);
  const beds = Array.from(
    new Set(units.map((u) => Number(u.bedrooms)).filter((n) => Number.isFinite(n))),
  ).sort((a, b) => a - b);

  const hasPenthouse = names.some((n) => /penthouse/i.test(n));
  const hasStudio = units.some((u) => Number(u.bedrooms) <= 0) || names.some((n) => /studio/i.test(n));

  const label = (n: number) => (n <= 0 ? 'Studio' : `${n} Bedroom${n === 1 ? '' : 's'}`);

  if (beds.length === 0) {
    if (hasPenthouse) return 'Penthouse';
    return hasStudio ? 'Studio' : '';
  }

  const lo = hasStudio ? 'Studio' : label(beds[0]);
  const hi = hasPenthouse ? 'Penthouse' : label(beds[beds.length - 1]);
  return lo === hi ? lo : `${lo} – ${hi}`;
}