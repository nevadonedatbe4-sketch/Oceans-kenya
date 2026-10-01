// Shared types for the Import Places pipeline.
// Select File -> Parse -> Detect Columns -> Map -> Validate -> Duplicates -> Preview -> Confirm -> Import -> Results

/** A spreadsheet that has already been parsed into a plain header + rows table. */
export interface ParsedSheet {
  /** Column headers of the merged table. */
  headers: string[];
  /** Data rows only (the header row has been removed). */
  rows: string[][];
  /** Names of the worksheets that were read (Excel only; empty for CSV). */
  sheetNames: string[];
}

/** Canonical fields a spreadsheet column can be mapped to. */
export type FieldKey =
  | 'name'
  | 'category'
  | 'subcategory'
  | 'area'
  | 'subarea'
  | 'address'
  | 'phone'
  | 'email'
  | 'website'
  | 'description'
  | 'curriculum'
  | 'levels'
  | 'latitude'
  | 'longitude'
  | 'opening_hours'
  | 'price_range'
  | 'rating'
  | 'source'
  | 'notes'
  | 'image'
  | 'images';

export interface FieldDef {
  key: FieldKey;
  label: string;
  required?: boolean;
  aliases: string[];
}

/** Maps a canonical field to a column index. A field that is missing is "ignored". */
export type Mapping = Partial<Record<FieldKey, number>>;

/** A spreadsheet column and what (if anything) it maps to. */
export interface ColumnAssignment {
  header: string;
  index: number;
  field: FieldKey | null;
  auto: boolean;
}

/** A category row from the `amenity_categories` table. */
export interface CategoryLookup {
  id: string;
  name: string;
  slug: string | null;
}

/** A trimmed existing directory record used for duplicate detection. */
export interface ExistingRecord {
  id: string;
  name: string;
  area: string;
  category: string;
}

export type RowStatus = 'ready' | 'warning' | 'error';

/** A single validated row ready for the preview / import screen. */
export interface ImportRow {
  /** 1-based row number in the source file (header = row 1). */
  rowNumber: number;
  name: string;
  categoryLabel: string;
  categorySlug: string | null;
  categoryId: string | null;
  /** Specific type within the category (e.g. international_school, casino). */
  subcategory: string;
  area: string;
  subarea: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  /** School/education curriculum(s), e.g. "British, IB". */
  curriculum: string;
  /** Education levels, e.g. "Primary, Secondary". */
  levels: string;
  latitude: string;
  longitude: string;
  openingHours: string;
  priceRange: string;
  rating: string;
  source: string;
  notes: string;
  image: string;
  images: string[];
  status: RowStatus;
  reasons: string[];
  /** Name of an existing place this row looks like, if any. */
  duplicateOf: string | null;
  /** Initial import decision the admin can override. */
  decision: 'include' | 'skip';
}

export interface RowContext {
  existing: ExistingRecord[];
  categories: CategoryLookup[];
  areaNames: string[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  failures: { rowNumber: number; name: string; reason: string }[];
}