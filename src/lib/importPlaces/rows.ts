import { AMENITY_CATEGORIES, subcategoryKeyForLabel } from '@/lib/amenities';
import type {
  ExistingRecord,
  FieldKey,
  ImportRow,
  Mapping,
  ParsedSheet,
  RowContext,
  RowStatus,
} from './types';

// ─────────────────────────────────────────────────────────────
// Normalisation
// ─────────────────────────────────────────────────────────────
/** Normalise a value for tolerant matching: trim, lower-case, collapse spaces. */
export function normalizeValue(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,'"()&]/g, '')
    .trim();
}

/** Normalise a page-name style value for duplicate comparison. */
export function normalizeName(value: string | null | undefined): string {
  return normalizeValue(value).replace(/[^a-z0-9 ]+/g, '').trim();
}

function normalizeUrl(value: string): string {
  const v = (value || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

function isValidUrl(value: string): boolean {
  if (!value) return true;
  try {
    const u = new URL(normalizeUrl(value));
    return !!u.hostname && u.hostname.includes('.');
  } catch {
    return false;
  }
}

function isValidPhone(value: string): boolean {
  if (!value) return true;
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 7;
}

// ─────────────────────────────────────────────────────────────
// Duplicate detection (existing directory + within the file)
// ─────────────────────────────────────────────────────────────
export interface DuplicateIndex {
  byNameArea: Map<string, ExistingRecord>;
  byName: Map<string, ExistingRecord[]>;
}

export function buildDuplicateIndex(existing: ExistingRecord[]): DuplicateIndex {
  const byNameArea = new Map<string, ExistingRecord>();
  const byName = new Map<string, ExistingRecord[]>();
  existing.forEach((e) => {
    const n = normalizeName(e.name);
    if (!n) return;
    byNameArea.set(`${n}|${normalizeValue(e.area)}`, e);
    const list = byName.get(n) || [];
    list.push(e);
    byName.set(n, list);
  });
  return { byNameArea, byName };
}

function findExistingDuplicate(
  index: DuplicateIndex,
  name: string,
  area: string,
  categoryLabel: string,
): ExistingRecord | null {
  const n = normalizeName(name);
  if (!n) return null;
  const byKey = index.byNameArea.get(`${n}|${normalizeValue(area)}`);
  if (byKey) return byKey;
  const sameName = index.byName.get(n);
  if (sameName && sameName.length) {
    // Same name with a matching area or category counts as a likely duplicate.
    const cat = normalizeValue(categoryLabel);
    const strong = sameName.find(
      (e) => normalizeValue(e.area) === normalizeValue(area) || (cat && normalizeValue(e.category) === cat),
    );
    if (strong) return strong;
    return sameName[0];
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Category matching
// ─────────────────────────────────────────────────────────────
function resolveCategory(
  value: string,
  ctx: RowContext,
): { slug: string | null; id: string | null; matched: boolean } {
  const v = normalizeValue(value);
  if (!v) return { slug: null, id: null, matched: true };

  const record = ctx.categories.find(
    (c) => normalizeValue(c.name) === v || normalizeValue(c.slug || '') === v,
  );
  if (record) return { slug: record.slug || v.replace(/\s+/g, '_'), id: record.id, matched: true };

  const builtin = AMENITY_CATEGORIES.find((c) => normalizeValue(c.label) === v || c.key === v);
  if (builtin) return { slug: builtin.key, id: null, matched: true };

  const fuzzyRecord = ctx.categories.find((c) => {
    const n = normalizeValue(c.name);
    return n.includes(v) || v.includes(n);
  });
  if (fuzzyRecord) return { slug: fuzzyRecord.slug || v.replace(/\s+/g, '_'), id: fuzzyRecord.id, matched: true };

  const fuzzyBuiltin = AMENITY_CATEGORIES.find((c) => {
    const n = normalizeValue(c.label);
    return n.includes(v) || v.includes(n);
  });
  if (fuzzyBuiltin) return { slug: fuzzyBuiltin.key, id: null, matched: true };

  // Cannot confidently match - keep the raw value but flag for review.
  return { slug: v.replace(/\s+/g, '_'), id: null, matched: false };
}

// ─────────────────────────────────────────────────────────────
// Row building + validation
// ─────────────────────────────────────────────────────────────
function cellAt(row: string[], mapping: Mapping, field: FieldKey): string {
  const idx = mapping[field];
  if (idx == null || idx < 0) return '';
  const value = row[idx];
  return value == null ? '' : String(value).trim();
}

function splitImages(value: string): string[] {
  return value
    .split(/[;,|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Turn a parsed sheet + column mapping into validated ImportRows.
 * Blank rows are dropped entirely. Name is required; everything else produces
 * warnings rather than hard failures wherever reasonable.
 */
export function buildImportRows(sheet: ParsedSheet, mapping: Mapping, ctx: RowContext): ImportRow[] {
  const dupIndex = buildDuplicateIndex(ctx.existing);
  const seenInFile = new Map<string, string>();
  const rows: ImportRow[] = [];

  sheet.rows.forEach((raw, i) => {
    if (!raw.some((c) => (c || '').trim() !== '')) return; // ignore entirely blank rows
    const rowNumber = i + 2; // header is row 1 in the source file

    const name = cellAt(raw, mapping, 'name');
    const rawArea = cellAt(raw, mapping, 'area');
    const rawCategory = cellAt(raw, mapping, 'category');
    const rawSubcategory = cellAt(raw, mapping, 'subcategory');
    const website = cellAt(raw, mapping, 'website');
    const phone = cellAt(raw, mapping, 'phone');

    const reasons: string[] = [];

    // Name (required)
    if (!name) reasons.push('Missing place name');

    // Category matching
    const cat = resolveCategory(rawCategory, ctx);
    if (rawCategory && !cat.matched) reasons.push(`Unknown category "${rawCategory}" - will be created`);

    // Area matching against controlled areas
    let area = rawArea;
    if (rawArea) {
      const hit = ctx.areaNames.find((a) => normalizeValue(a) === normalizeValue(rawArea));
      if (hit) area = hit;
      else reasons.push(`Unknown area "${rawArea}"`);
    }

    // Website / phone soft validation
    if (website && !isValidUrl(website)) reasons.push('Invalid website');
    if (phone && !isValidPhone(phone)) reasons.push('Invalid phone');

    // Duplicate vs existing directory
    const existingMatch = name ? findExistingDuplicate(dupIndex, name, area, rawCategory) : null;
    if (existingMatch) reasons.push(`Possible duplicate of "${existingMatch.name}"`);

    // Duplicate within the uploaded file
    let withinFile = false;
    if (name) {
      const key = `${normalizeName(name)}|${normalizeValue(area)}`;
      if (seenInFile.has(key)) {
        withinFile = true;
        reasons.push(`Duplicate within file (also row ${seenInFile.get(key)})`);
      } else {
        seenInFile.set(key, String(rowNumber));
      }
    }

    let status: RowStatus = 'ready';
    if (!name) status = 'error';
    else if (reasons.length) status = 'warning';

    // Default to importing everything. Only genuinely un-importable rows
    // (no name at all) stay skipped - they cannot become a place. Duplicates,
    // unknown areas and warnings are all INCLUDED by default so nothing is
    // silently dropped; the admin can still skip any row manually.
    const decision: 'include' | 'skip' = status === 'error' ? 'skip' : 'include';

    rows.push({
      rowNumber,
      name,
      categoryLabel: rawCategory,
      categorySlug: cat.slug,
      categoryId: cat.id,
      subcategory: rawSubcategory ? subcategoryKeyForLabel(rawSubcategory) : '',
      area,
      subarea: cellAt(raw, mapping, 'subarea'),
      address: cellAt(raw, mapping, 'address'),
      phone,
      email: cellAt(raw, mapping, 'email'),
      website: website ? normalizeUrl(website) : '',
      description: cellAt(raw, mapping, 'description'),
      curriculum: cellAt(raw, mapping, 'curriculum'),
      levels: cellAt(raw, mapping, 'levels'),
      latitude: cellAt(raw, mapping, 'latitude'),
      longitude: cellAt(raw, mapping, 'longitude'),
      openingHours: cellAt(raw, mapping, 'opening_hours'),
      priceRange: cellAt(raw, mapping, 'price_range'),
      rating: cellAt(raw, mapping, 'rating'),
      source: cellAt(raw, mapping, 'source'),
      notes: cellAt(raw, mapping, 'notes'),
      image: cellAt(raw, mapping, 'image'),
      images: splitImages(cellAt(raw, mapping, 'images')),
      status,
      reasons,
      duplicateOf: existingMatch ? existingMatch.name : withinFile ? 'Earlier row in this file' : null,
      decision,
    });
  });

  return rows;
}

export interface RowSummary {
  total: number;
  ready: number;
  warnings: number;
  errors: number;
  duplicates: number;
  willImport: number;
  willSkip: number;
}

export function summarizeRows(rows: ImportRow[]): RowSummary {
  let ready = 0;
  let warnings = 0;
  let errors = 0;
  let duplicates = 0;
  let willImport = 0;
  let willSkip = 0;
  rows.forEach((r) => {
    if (r.status === 'ready') ready++;
    else if (r.status === 'warning') warnings++;
    else errors++;
    if (r.duplicateOf) duplicates++;
    if (r.decision === 'include') willImport++;
    else willSkip++;
  });
  return { total: rows.length, ready, warnings, errors, duplicates, willImport, willSkip };
}