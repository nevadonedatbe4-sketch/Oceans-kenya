import type { ColumnAssignment, FieldDef, FieldKey, Mapping } from './types';

/**
 * Canonical fields and the many header spellings they accept.
 * Matching is tolerant of capitalization, spaces, underscores and hyphens.
 */
export const FIELDS: FieldDef[] = [
  {
    key: 'name',
    label: 'Name',
    required: true,
    aliases: ['name', 'place name', 'place', 'title', 'business name', 'venue name', 'school name', 'establishment', 'company', 'company name', 'listing name'],
  },
  {
    key: 'category',
    label: 'Category',
    aliases: ['category', 'categories', 'type', 'place type', 'place category', 'amenity type', 'amenity category', 'classification', 'sector'],
  },
  {
    key: 'subcategory',
    label: 'Subcategory',
    aliases: ['subcategory', 'sub category', 'sub-category', 'subtype', 'sub type', 'sub-category name', 'school type', 'place subtype'],
  },
  {
    key: 'area',
    label: 'Area',
    aliases: ['area', 'area name', 'location', 'neighbourhood', 'neighborhood', 'neighbourhood name', 'neighborhood name', 'suburb', 'estate', 'zone', 'town'],
  },
  {
    key: 'subarea',
    label: 'Sub-area',
    aliases: ['sub area', 'subarea', 'sub-area', 'sub location', 'sublocation', 'sub neighbourhood', 'sub neighborhood'],
  },
  {
    key: 'address',
    label: 'Address',
    aliases: ['address', 'street', 'street address', 'physical address', 'address line', 'address line 1', 'location address', 'postal address'],
  },
  {
    key: 'phone',
    label: 'Phone',
    aliases: ['phone', 'telephone', 'tel', 'contact', 'contact number', 'phone number', 'mobile', 'mobile number', 'phone no', 'phone number 1', 'cell'],
  },
  {
    key: 'email',
    label: 'Email',
    aliases: ['email', 'e-mail', 'email address', 'mail', 'contact email'],
  },
  {
    key: 'website',
    label: 'Website',
    aliases: ['website', 'web', 'url', 'website url', 'web address', 'website link', 'site', 'link', 'web url'],
  },
  {
    key: 'description',
    label: 'Description',
    aliases: ['description', 'desc', 'about', 'details', 'summary', 'overview', 'profile'],
  },
  {
    key: 'curriculum',
    label: 'Curriculum',
    aliases: ['curriculum', 'curricula', 'syllabus', 'education system', 'curriculum framework'],
  },
  {
    key: 'levels',
    label: 'Levels',
    aliases: ['levels', 'level', 'grades', 'grade levels', 'education levels', 'year levels', 'stages', 'age range'],
  },
  {
    key: 'latitude',
    label: 'Latitude',
    aliases: ['latitude', 'lat', 'gps lat', 'y coordinate'],
  },
  {
    key: 'longitude',
    label: 'Longitude',
    aliases: ['longitude', 'lng', 'lon', 'long', 'gps lng', 'y coordinate', 'x coordinate'],
  },
  {
    key: 'opening_hours',
    label: 'Opening Hours',
    aliases: ['opening hours', 'hours', 'open hours', 'working hours', 'operation hours', 'opening', 'business hours'],
  },
  {
    key: 'price_range',
    label: 'Price Range',
    aliases: ['price range', 'price', 'price level', 'cost', 'pricing', 'rates'],
  },
  {
    key: 'rating',
    label: 'Rating',
    aliases: ['rating', 'stars', 'score', 'ratings', 'review score'],
  },
  {
    key: 'source',
    label: 'Source',
    aliases: ['source', 'origin', 'reference', 'source url', 'data source', 'provider'],
  },
  {
    key: 'notes',
    label: 'Notes',
    aliases: ['notes', 'note', 'comments', 'remarks', 'additional info', 'internal notes'],
  },
  {
    key: 'image',
    label: 'Image',
    aliases: ['image', 'photo', 'image url', 'picture', 'thumbnail', 'main image', 'cover image'],
  },
  {
    key: 'images',
    label: 'Images',
    aliases: ['images', 'photos', 'gallery', 'image urls', 'photo urls', 'gallery images'],
  },
];

const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(FIELDS.map((f) => [f.key, f]));

export function fieldLabel(key: FieldKey): string {
  return FIELD_BY_KEY[key]?.label || key;
}

/** Lower-case, collapse separators so "Place_Name", "place-name", "Place Name" all match. */
export function normalizeHeader(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Guess the canonical field for a single header, or null when nothing fits. */
export function guessFieldForHeader(header: string): FieldKey | null {
  const h = normalizeHeader(header);
  if (!h) return null;
  // Exact alias match wins first.
  for (const field of FIELDS) {
    if (field.aliases.some((a) => normalizeHeader(a) === h)) return field.key;
  }
  // Then a loose contains match.
  for (const field of FIELDS) {
    if (field.aliases.some((a) => h.includes(normalizeHeader(a)) || normalizeHeader(a).includes(h))) {
      return field.key;
    }
  }
  return null;
}

/**
 * Build an assignment for every spreadsheet column. Each canonical field is
 * assigned at most once; every other column is left unassigned (Ignored) so
 * nothing is silently discarded.
 */
export function detectColumns(headers: string[]): ColumnAssignment[] {
  const assignments: ColumnAssignment[] = headers.map((header, index) => ({
    header,
    index,
    field: null,
    auto: false,
  }));

  const used = new Set<FieldKey>();
  // First pass: exact matches.
  assignments.forEach((col) => {
    const h = normalizeHeader(col.header);
    const exact = FIELDS.find((f) => !used.has(f.key) && f.aliases.some((a) => normalizeHeader(a) === h));
    if (exact) {
      col.field = exact.key;
      col.auto = true;
      used.add(exact.key);
    }
  });
  // Second pass: loose matches for anything still free.
  assignments.forEach((col) => {
    if (col.field) return;
    const guess = guessFieldForHeader(col.header);
    if (guess && !used.has(guess)) {
      col.field = guess;
      col.auto = true;
      used.add(guess);
    }
  });

  return assignments;
}

export function assignmentsToMapping(assignments: ColumnAssignment[]): Mapping {
  const mapping: Mapping = {};
  assignments.forEach((a) => {
    if (a.field) mapping[a.field] = a.index;
  });
  return mapping;
}