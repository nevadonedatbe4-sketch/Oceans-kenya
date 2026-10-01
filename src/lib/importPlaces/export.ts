// CSV / Excel writing helpers, kept separate from parsing so the UI does not
// depend on parser internals.
type XlsxLib = typeof import('xlsx');

let xlsxModule: XlsxLib | null = null;

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
    if (typeof c.write === 'function' && utils && typeof utils.aoa_to_sheet === 'function') {
      return candidate as XlsxLib;
    }
  }
  return null;
}

async function getXlsx(): Promise<XlsxLib> {
  if (xlsxModule) return xlsxModule;
  const ns: unknown = await import('xlsx');
  const lib = resolveXlsxLib(ns);
  if (!lib) throw new Error('The spreadsheet engine is unavailable.');
  xlsxModule = lib;
  return lib;
}

function toCsvCell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(toCsvCell).join(',')];
  rows.forEach((r) => lines.push(r.map(toCsvCell).join(',')));
  return `\uFEFF${lines.join('\n')}`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download a file that lives in the app's public folder, forcing the browser to
 * save it (rather than open it) no matter what content-type the server sends.
 * Resolves the path against the app base path so it also works in preview.
 */
export async function downloadPublicFile(fileName: string, downloadName?: string): Promise<void> {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const clean = fileName.replace(/^\//, '');
  const url = `${base}/${clean}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('That file could not be found.');
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = downloadName || clean.split('/').pop() || 'download';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

export async function downloadXlsx(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): Promise<void> {
  const XLSX = await getXlsx();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Places');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}