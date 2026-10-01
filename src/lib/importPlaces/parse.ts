import { detectColumns } from './columns';
import type { ParsedSheet } from './types';

// ─────────────────────────────────────────────────────────────
// Spreadsheet reading adapter.
// CSV/TXT is parsed in-house. Excel (.xlsx/.xls/.xlsm/.xlsb) is read natively
// through the `xlsx` library, which is dynamically imported only when an Excel
// file is actually chosen (keeps it out of the initial bundle). Every worksheet
// is preserved and merged — nothing is converted to CSV and nothing is dropped.
// ─────────────────────────────────────────────────────────────
type XlsxLib = typeof import('xlsx');

let xlsxModule: XlsxLib | null = null;

interface CellLike {
  v?: unknown;
  w?: string;
  t?: string;
  l?: { Target?: string };
}

const EXCEL_EXTENSIONS = ['xlsx', 'xls', 'xlsm', 'xlsb', 'ods', 'fods'];

/** The library ships with a CommonJS/ESM shim, so the API can land on several shapes. */
function resolveXlsxLib(ns: unknown): XlsxLib | null {
  const candidates: unknown[] = [ns];
  if (ns && (typeof ns === 'object' || typeof ns === 'function')) {
    const obj = ns as Record<string, unknown>;
    if (obj.default) candidates.push(obj.default);
    const def = obj.default as Record<string, unknown> | undefined;
    if (def && typeof def === 'object' && def.default) candidates.push(def.default);
    if (obj.xlsx) candidates.push(obj.xlsx);
    if (obj.XLSX) candidates.push(obj.XLSX);
  }
  for (const candidate of candidates) {
    if (!candidate || (typeof candidate !== 'object' && typeof candidate !== 'function')) continue;
    const c = candidate as Record<string, unknown>;
    const utils = c.utils as Record<string, unknown> | undefined;
    if (
      typeof c.read === 'function'
      && utils
      && typeof utils.decode_range === 'function'
      && typeof utils.encode_cell === 'function'
    ) {
      return candidate as XlsxLib;
    }
  }
  return null;
}

async function getXlsx(): Promise<XlsxLib> {
  if (xlsxModule) return xlsxModule;
  let ns: unknown;
  try {
    ns = await import('xlsx');
  } catch (err) {
    const detail = err instanceof Error ? ` (${err.message})` : '';
    throw new Error(`We couldn't load the spreadsheet engine${detail}. Please refresh the page and try again.`);
  }
  const lib = resolveXlsxLib(ns);
  if (!lib) {
    throw new Error('We couldn\'t read this spreadsheet. Make sure it is a valid CSV or Excel file and try again.');
  }
  xlsxModule = lib;
  return lib;
}

/** Turn one cell into text, preserving blanks and hyperlink-only cells. */
function cellToString(cell: CellLike | undefined): string {
  if (!cell) return '';
  let value = '';
  if (cell.t === 'd' && cell.w != null) {
    value = String(cell.w);
  } else if (cell.v != null) {
    value = String(cell.v);
  } else if (cell.w != null) {
    value = String(cell.w);
  }
  const target = cell.l?.Target;
  if (!value.trim() && target) return String(target);
  return value;
}

/** Read every populated row of a worksheet, blank cells included. */
function extractSheetRows(XLSX: XlsxLib, ws: unknown): string[][] {
  const sheet = ws as Record<string, unknown>;
  const ref = sheet['!ref'];
  if (typeof ref !== 'string' || !ref) return [];
  const range = XLSX.utils.decode_range(ref) as { s: { r: number; c: number }; e: { r: number; c: number } };
  const rows: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      row.push(cellToString(sheet[addr] as CellLike | undefined));
    }
    rows.push(row);
  }
  return rows;
}

/** Locate a sheet's header row (skips title/banner rows above the real header). */
function findHeaderRowIndex(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const headerLike = rows[i].filter((c) => c.trim() !== '').length;
    const assignments = detectColumns(rows[i]);
    const detected = assignments.filter((a) => a.field).length;
    if (detected >= 2 || (detected >= 1 && headerLike >= 1 && rows[i].some((c) => /name/i.test(c)))) return i;
  }
  return 0;
}

function isBlankRow(row: string[]): boolean {
  return !row.some((c) => c.trim() !== '');
}

/**
 * Parse a file into a single merged table.
 * Throws human-readable Errors when the file genuinely cannot be read.
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedSheet> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (EXCEL_EXTENSIONS.includes(ext)) {
    return parseExcel(file);
  }
  let text = '';
  try {
    text = await file.text();
  } catch {
    throw new Error('We couldn\'t read this file. Please try selecting it again.');
  }
  const rows = parseCsv(text);
  if (!rows.length) throw new Error('The uploaded file contains no place records.');
  return { headers: rows[0], rows: rows.slice(1), sheetNames: [] };
}

// ─────────────────────────────────────────────────────────────
// CSV / TXT (UTF-8, quoted values, commas & newlines inside quotes)
// ─────────────────────────────────────────────────────────────
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      if (!isBlankRow(row)) rows.push(row);
      row = [];
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (!isBlankRow(row)) rows.push(row);
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────
// Excel — read EVERY worksheet, merge by shared columns
// ─────────────────────────────────────────────────────────────
async function parseExcel(file: File): Promise<ParsedSheet> {
  const XLSX = await getXlsx();
  let buf: ArrayBuffer;
  try {
    buf = await file.arrayBuffer();
  } catch {
    throw new Error('We couldn\'t read this file. Please try selecting it again.');
  }

  let wb: { SheetNames?: string[]; Sheets?: Record<string, unknown> };
  try {
    wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  } catch {
    throw new Error('This Excel file could not be read. Please open it in Excel or Google Sheets and save it again as .xlsx, then retry.');
  }

  const names = Array.isArray(wb.SheetNames) ? wb.SheetNames : [];
  const sheets: { name: string; rows: string[][]; headerIdx: number; assignments: ReturnType<typeof detectColumns> }[] = [];

  for (const name of names) {
    const ws = wb.Sheets?.[name];
    if (!ws) continue;
    const rows = extractSheetRows(XLSX, ws);
    if (!rows.length || rows.every(isBlankRow)) continue;
    const headerIdx = findHeaderRowIndex(rows);
    sheets.push({ name, rows, headerIdx, assignments: detectColumns(rows[headerIdx] || []) });
  }

  if (!sheets.length) {
    throw new Error('The uploaded file contains no place records.');
  }

  // Collect a shared column order across every sheet's own header.
  const orderedHeaders: string[] = [];
  const headerField: Record<string, string> = {}; // header text -> canonical field (first wins)
  sheets.forEach((sheet) => {
    sheet.assignments.forEach((a) => {
      const label = a.header.trim();
      if (!label) return;
      if (!orderedHeaders.includes(label)) orderedHeaders.push(label);
      if (a.field && !headerField[label]) headerField[label] = a.field;
    });
  });

  if (!orderedHeaders.length) {
    throw new Error('No usable column headers were detected.');
  }

  const merged: string[][] = [];
  sheets.forEach((sheet) => {
    const headerRow = sheet.rows[sheet.headerIdx] || [];
    // Map canonical field -> source column index in THIS sheet.
    const fieldIndex: Record<string, number> = {};
    sheet.assignments.forEach((a) => {
      if (a.field) fieldIndex[a.field] = a.index;
    });
    for (let i = sheet.headerIdx + 1; i < sheet.rows.length; i++) {
      const raw = sheet.rows[i];
      if (isBlankRow(raw)) continue;
      const out = orderedHeaders.map((label) => {
        const field = headerField[label];
        if (field && fieldIndex[field] != null) {
          const v = raw[fieldIndex[field]];
          return v == null ? '' : v;
        }
        // Fallback: same-position column from this sheet.
        const pos = headerRow.findIndex((h) => h.trim() === label);
        return pos >= 0 && raw[pos] != null ? raw[pos] : '';
      });
      merged.push(out);
    }
  });

  if (!merged.length) {
    throw new Error('The workbook has headers but no data rows.');
  }

  return { headers: orderedHeaders, rows: merged, sheetNames: sheets.map((s) => s.name) };
}

/** True when the headers contain a column mappable to Name. */
export function hasUsableNameColumn(headers: string[]): boolean {
  return detectColumns(headers).some((a) => a.field === 'name');
}