import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import {
  buildImportRows,
  buildCsv,
  detectColumns,
  assignmentsToMapping,
  parseSpreadsheetFile,
  downloadCsv,
  summarizeRows,
  type CategoryLookup,
  type ColumnAssignment,
  type ExistingRecord,
  type ImportResult,
  type ImportRow,
  type Mapping,
  type ParsedSheet,
} from '@/lib/importPlaces';
import UploadStep from './UploadStep';
import MappingStep from './MappingStep';
import PreviewStep from './PreviewStep';
import ConfirmStep from './ConfirmStep';
import ResultsStep from './ResultsStep';

interface ImportPlacesModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Phase = 'select' | 'map' | 'preview' | 'confirm' | 'importing' | 'results';

const INSERT_CHUNK = 150;

async function fetchAllRows<T>(table: string, columns: string, extra?: (q: any) => any): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    let query = supabase.from(table).select(columns).range(from, from + size - 1);
    if (extra) query = extra(query);
    const { data, error } = await query;
    if (error || !data) break;
    out.push(...(data as T[]));
    if (data.length < size) break;
  }
  return out;
}

function parseCoord(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Map an ImportRow to the canonical Places/Amenities record. */
function toPayload(row: ImportRow, fileName: string) {
  const attributes: Record<string, unknown> = {
    import_source: 'bulk_import',
    import_file: fileName,
    imported_at: new Date().toISOString(),
  };
  if (row.subarea) attributes.subarea = row.subarea;
  if (row.priceRange) attributes.price_range = row.priceRange;
  if (row.source) attributes.source = row.source;
  if (row.notes) attributes.notes = row.notes;
  if (row.curriculum) attributes.curriculum = row.curriculum;
  if (row.levels) attributes.levels = row.levels;

  return {
    name: row.name,
    type: row.categorySlug || 'other',
    category: row.categorySlug || null,
    category_id: row.categoryId || null,
    subcategory: row.subcategory || null,
    neighbourhood_name: row.area || null,
    address: row.address || null,
    phone: row.phone || null,
    email: row.email || null,
    website: row.website || null,
    description: row.description || null,
    latitude: parseCoord(row.latitude),
    longitude: parseCoord(row.longitude),
    opening_hours: row.openingHours || null,
    rating: parseCoord(row.rating),
    image: row.image || null,
    gallery: row.images.length ? row.images : null,
    is_published: true,
    city: 'Nairobi',
    country: 'Kenya',
    sort_order: 0,
    attributes,
  };
}

export default function ImportPlacesModal({ open, onClose, onImported }: ImportPlacesModalProps) {
  const [phase, setPhase] = useState<Phase>('select');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [assignments, setAssignments] = useState<ColumnAssignment[]>([]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const [categories, setCategories] = useState<CategoryLookup[]>([]);
  const [existing, setExisting] = useState<ExistingRecord[]>([]);
  const [areaNames, setAreaNames] = useState<string[]>([]);

  const reset = useCallback(() => {
    setPhase('select');
    setBusy(false);
    setError(null);
    setFileName('');
    setSheet(null);
    setAssignments([]);
    setRows([]);
    setResult(null);
    setProgress({ done: 0, total: 0 });
  }, []);

  // Load the reference data used for category / area matching + duplicates.
  useEffect(() => {
    if (!open) return;
    reset();
    (async () => {
      const [cats, existingRows, hoods] = await Promise.all([
        fetchAllRows<CategoryLookup>('amenity_categories', 'id, name, slug'),
        fetchAllRows<{ id: string; name: string; neighbourhood_name: string | null; category: string | null }>(
          'amenities',
          'id, name, neighbourhood_name, category',
          (q) => q.is('deleted_at', null),
        ),
        fetchAllRows<{ name: string }>('neighbourhoods', 'name'),
      ]);
      setCategories(cats);
      setExisting(
        existingRows.map((e) => ({
          id: e.id,
          name: e.name,
          area: e.neighbourhood_name || '',
          category: e.category || '',
        })),
      );
      setAreaNames(hoods.map((h) => h.name).filter(Boolean));
    })();
  }, [open, reset]);

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const parsed = await parseSpreadsheetFile(file);
        const detected = detectColumns(parsed.headers);
        if (!detected.some((a) => a.field === 'name')) {
          setError(
            'No usable column headers were detected. Make sure your file has a header row that includes a Name column.',
          );
          setBusy(false);
          return;
        }
        setSheet(parsed);
        setAssignments(detected);
        setFileName(file.name);
        setPhase('map');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'We couldn\u2019t read this spreadsheet. Make sure it is a valid CSV or Excel file and try again.');
      }
      setBusy(false);
    },
    [],
  );

  const rebuildRows = useCallback(
    (nextAssignments: ColumnAssignment[]) => {
      if (!sheet) return;
      const mapping: Mapping = assignmentsToMapping(nextAssignments);
      const built = buildImportRows(sheet, mapping, { existing, categories, areaNames });
      setRows(built);
    },
    [sheet, existing, categories, areaNames],
  );

  const changeDecision = useCallback((rowNumber: number, decision: 'include' | 'skip') => {
    setRows((prev) => prev.map((r) => (r.rowNumber === rowNumber ? { ...r, decision } : r)));
  }, []);

  const changeDecisions = useCallback((decision: 'include' | 'skip', rowNumbers: number[]) => {
    const targets = new Set(rowNumbers);
    if (!targets.size) return;
    setRows((prev) => prev.map((r) => (targets.has(r.rowNumber) ? { ...r, decision } : r)));
  }, []);

  const summary = useMemo(() => summarizeRows(rows), [rows]);

  const runImport = useCallback(async () => {
    const include = rows.filter((r) => r.decision === 'include');
    if (!include.length) {
      addToast('Nothing to import — all rows are duplicates or need attention', 'error');
      return;
    }
    setPhase('importing');
    setProgress({ done: 0, total: include.length });

    let imported = 0;
    const failures: ImportResult['failures'] = [];
    const skipped = summary.willSkip;

    for (let i = 0; i < include.length; i += INSERT_CHUNK) {
      const batch = include.slice(i, i + INSERT_CHUNK);
      const { error: chunkError } = await supabase
        .from('amenities')
        .insert(batch.map((r) => toPayload(r, fileName)));

      if (!chunkError) {
        imported += batch.length;
      } else {
        // Isolate the bad rows so one failure can't sink the whole batch.
        for (const row of batch) {
          const { error: rowError } = await supabase.from('amenities').insert(toPayload(row, fileName));
          if (rowError) {
            failures.push({
              rowNumber: row.rowNumber,
              name: row.name,
              reason: rowError.message || 'Could not be saved',
            });
          } else {
            imported += 1;
          }
        }
      }
      setProgress((p) => ({ ...p, done: Math.min(p.done + batch.length, include.length) }));
    }

    setResult({ imported, skipped, failed: failures.length, failures });
    setPhase('results');
    if (imported > 0) onImported();
  }, [rows, summary.willSkip, fileName, onImported]);

  const downloadFailures = useCallback(() => {
    if (!result) return;
    const csv = buildCsv(
      ['Row', 'Name', 'Reason'],
      result.failures.map((f) => [f.rowNumber, f.name, f.reason]),
    );
    downloadCsv('places-import-failed-rows.csv', csv);
  }, [result]);

  if (!open) return null;

  const titles: Record<Phase, { title: string; subtitle: string }> = {
    select: { title: 'Import Places', subtitle: 'Upload a CSV or Excel file to add places in bulk.' },
    map: { title: 'Import Places', subtitle: `Map the columns detected in ${fileName}.` },
    preview: { title: 'Import Places', subtitle: 'Review every row before anything is saved.' },
    confirm: { title: 'Import Places', subtitle: 'Confirm the import.' },
    importing: { title: 'Import Places', subtitle: 'Writing places into the directory…' },
    results: { title: 'Import Places', subtitle: 'Summary of the import.' },
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={phase === 'importing' ? undefined : onClose} />
      <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8edf2]">
          <div>
            <h2 className="font-jost text-lg font-semibold text-[#001731]">{titles[phase].title}</h2>
            <p className="text-sm text-[#7a8a99]">{titles[phase].subtitle}</p>
          </div>
          <button
            onClick={onClose}
            disabled={phase === 'importing'}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#7a8a99] hover:bg-[#f7f8fa] hover:text-[#001731] transition-colors cursor-pointer disabled:opacity-40"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {phase === 'select' && <UploadStep onFile={handleFile} busy={busy} error={error} />}

          {phase === 'map' && sheet && (
            <MappingStep
              headers={sheet.headers}
              assignments={assignments}
              rowCount={sheet.rows.length}
              onChange={setAssignments}
              onBack={reset}
              onContinue={() => {
                rebuildRows(assignments);
                setPhase('preview');
              }}
            />
          )}

          {phase === 'preview' && (
            <PreviewStep
              rows={rows}
              summary={summary}
              onChangeDecision={changeDecision}
              onBulkDecision={changeDecisions}
              onBack={() => setPhase('map')}
              onContinue={() => setPhase('confirm')}
            />
          )}

          {phase === 'confirm' && (
            <ConfirmStep summary={summary} onBack={() => setPhase('preview')} onConfirm={runImport} />
          )}

          {phase === 'importing' && (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-xl bg-[#0d5959]/10 flex items-center justify-center mb-4">
                <i className="ri-loader-4-line animate-spin text-[#0d5959] text-3xl" />
              </div>
              <h3 className="font-jost text-lg font-semibold text-[#001731]">Importing places…</h3>
              <p className="text-base text-[#7a8a99] mt-1">
                {progress.done} / {progress.total}
              </p>
              <div className="w-full max-w-md h-2.5 rounded-full bg-[#eef2f5] mt-4 overflow-hidden">
                <div
                  className="h-full bg-[#0d5959] transition-all"
                  style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}

          {phase === 'results' && result && (
            <ResultsStep
              result={result}
              onImportAnother={reset}
              onViewPlaces={onClose}
              onDownloadFailures={downloadFailures}
            />
          )}
        </div>
      </div>
    </div>
  );
}