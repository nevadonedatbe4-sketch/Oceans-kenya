import { useEffect, useMemo, useState } from 'react';
import { buildCsv, downloadCsv, downloadXlsx } from '@/lib/importPlaces/export';
import { categoryLabel, subcategoryLabel, type Amenity, type AmenityCategoryRecord } from '@/lib/amenities';

const EXPORT_HEADERS = [
  'Place name',
  'Category',
  'Subcategory',
  'Area',
  'Address',
  'Description',
  'Phone',
  'Email',
  'Website',
  'Google Maps URL',
  'Latitude',
  'Longitude',
  'Opening hours',
  'Features',
  'Status',
  'Rating',
  'Review count',
  'Views',
  'Created',
  'Updated',
];

function toExportRow(a: Amenity): (string | number)[] {
  const features = Array.isArray(a.attributes?.features) ? (a.attributes.features as string[]).join('; ') : '';
  return [
    a.name,
    categoryLabel(a.category),
    subcategoryLabel(a.subcategory),
    a.neighbourhood_name || '',
    a.address || '',
    a.description || '',
    a.phone || '',
    a.email || '',
    a.website || '',
    a.maps_url || '',
    a.latitude != null ? a.latitude : '',
    a.longitude != null ? a.longitude : '',
    a.opening_hours || '',
    features,
    a.is_published ? 'Published' : a.deleted_at ? 'In Recycle Bin' : 'Draft',
    a.rating != null ? a.rating : '',
    a.review_count != null ? a.review_count : '',
    a.view_count != null ? a.view_count : '',
    a.created_at ? String(a.created_at).slice(0, 10) : '',
    a.updated_at ? String(a.updated_at).slice(0, 10) : '',
  ];
}

type Scope = 'view' | 'selected' | 'category' | 'date' | 'names';
type Format = 'csv' | 'xlsx' | 'pdf';

interface AmenitiesExportModalProps {
  open: boolean;
  initialScope?: Scope;
  allAmenities: Amenity[];
  viewAmenities: Amenity[];
  selectedIds: string[];
  categories: AmenityCategoryRecord[];
  onClose: () => void;
}

const SCOPE_OPTIONS: { value: Scope; label: string; icon: string; hint: string }[] = [
  { value: 'view', label: 'Current view', icon: 'ri-filter-3-line', hint: 'Exports exactly what you see, honouring the active filters & sort.' },
  { value: 'selected', label: 'Selected rows', icon: 'ri-checkbox-multiple-line', hint: 'Exports only the rows you have ticked.' },
  { value: 'category', label: 'A category', icon: 'ri-price-tag-3-line', hint: 'Exports every place in one selected category.' },
  { value: 'date', label: 'By date range', icon: 'ri-calendar-line', hint: 'Exports places created within a date window.' },
  { value: 'names', label: 'By names', icon: 'ri-text', hint: 'Exports places whose name matches any keyword you enter.' },
];

const FORMAT_OPTIONS: { value: Format; label: string; icon: string; hint: string }[] = [
  { value: 'csv', label: 'CSV', icon: 'ri-file-chart-line', hint: 'Best for spreadsheets & import.' },
  { value: 'xlsx', label: 'Excel (.xlsx)', icon: 'ri-file-excel-2-line', hint: 'Keeps formatting, multiple sheets.' },
  { value: 'pdf', label: 'PDF', icon: 'ri-file-pdf-2-line', hint: 'A shareable directory report.' },
];

export default function AmenitiesExportModal({
  open,
  initialScope = 'view',
  allAmenities,
  viewAmenities,
  selectedIds,
  categories,
  onClose,
}: AmenitiesExportModalProps) {
  const [scope, setScope] = useState<Scope>(initialScope);
  const [format, setFormat] = useState<Format>('csv');
  const [categoryId, setCategoryId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [names, setNames] = useState('');

  useEffect(() => {
    if (open) {
      setScope(initialScope);
      setFormat('csv');
      setCategoryId('');
      setDateFrom('');
      setDateTo('');
      setNames('');
    }
  }, [open, initialScope]);

  const scopeRows = useMemo(() => {
    switch (scope) {
      case 'selected':
        return allAmenities.filter((a) => selectedIds.includes(a.id));
      case 'category':
        return allAmenities.filter((a) => a.category_id === categoryId);
      case 'date': {
        const from = dateFrom ? dateFrom : '0000-00-00';
        const to = dateTo ? dateTo : '9999-99-99';
        return allAmenities.filter(
          (a) => a.created_at && String(a.created_at).slice(0, 10) >= from && String(a.created_at).slice(0, 10) <= to,
        );
      }
      case 'names': {
        const tokens = names
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        if (!tokens.length) return [];
        return allAmenities.filter((a) => tokens.some((t) => a.name.toLowerCase().includes(t)));
      }
      default:
        return viewAmenities;
    }
  }, [scope, allAmenities, viewAmenities, selectedIds, categoryId, dateFrom, dateTo, names]);

  const canExport = scopeRows.length > 0 && scope !== 'names' ? true : scopeRows.length > 0;
  const scopeLabel =
    scope === 'category'
      ? categories.find((c) => c.id === categoryId)?.name || 'category'
      : scope === 'view'
        ? 'current-view'
        : scope;
  const slug = scopeLabel.toLowerCase().replace(/\s+/g, '-');
  const rows = scopeRows.map(toExportRow);

  const doExport = () => {
    if (!canExport) return;
    if (format === 'csv') {
      downloadCsv(`places-${slug}.csv`, buildCsv(EXPORT_HEADERS, rows));
    } else if (format === 'xlsx') {
      void downloadXlsx(`places-${slug}.xlsx`, EXPORT_HEADERS, rows);
    } else {
      // PDF export: render a compact report into a popup and print to PDF.
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(buildPdfHtml(`Places Directory`, scopeRows));
      win.document.close();
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-2xl shadow-lg overflow-hidden">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#e8edf2]">
          <div>
            <h3 className="font-jost text-lg text-[#001731]">Export places</h3>
            <p className="text-sm text-[#7a8a99] mt-0.5">Choose what and how to export. Private/internal fields are excluded.</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg text-[#7a8a99] hover:bg-[#f7f8fa] cursor-pointer">
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Format */}
          <div>
            <label className="block text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider mb-2">Format</label>
            <div className="grid grid-cols-3 gap-2.5">
              {FORMAT_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${format === f.value ? 'border-[#0d5959] bg-[#eef7f5] ring-1 ring-[#0d5959]/30' : 'border-[#e8edf2] hover:border-[#c7d3dc]'}`}
                >
                  <div className="flex items-center gap-2">
                    <i className={`${f.icon} text-[#0d5959] text-base`} />
                    <span className="text-sm font-roboto font-semibold text-[#001731]">{f.label}</span>
                  </div>
                  <p className="text-xs text-[#7a8a99] mt-1">{f.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Scope selector */}
          <div>
            <label className="block text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider mb-2">Export scope</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2.5">
              {SCOPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setScope(opt.value)}
                  className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    scope === opt.value ? 'border-[#0d5959] bg-[#eef7f5] ring-1 ring-[#0d5959]/30' : 'border-[#e8edf2] hover:border-[#c7d3dc]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <i className={`${opt.icon} text-[#0d5959] text-base`} />
                    <span className="text-sm font-roboto font-semibold text-[#001731]">{opt.label}</span>
                    {opt.value === 'selected' && selectedIds.length > 0 && (
                      <span className="ml-auto text-[11px] font-roboto font-semibold bg-[#0d5959] text-white px-1.5 py-0.5 rounded-full">{selectedIds.length}</span>
                    )}
                  </div>
                  <p className="text-xs text-[#7a8a99] mt-1">{opt.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Scope-specific controls */}
          {scope === 'category' && (
            <div>
              <label className="block text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider mb-2">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto text-[#001731] bg-white focus:outline-none focus:border-[#0d5959]"
              >
                <option value="">Pick a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {scope === 'date' && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider mb-2">Created from</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto text-[#001731] bg-white focus:outline-none focus:border-[#0d5959]" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider mb-2">Created to</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto text-[#001731] bg-white focus:outline-none focus:border-[#0d5959]" />
              </div>
            </div>
          )}

          {scope === 'names' && (
            <div>
              <label className="block text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider mb-2">Names / keywords</label>
              <input
                type="text"
                value={names}
                onChange={(e) => setNames(e.target.value)}
                placeholder="e.g. Nairobi Hospital, Karen Clinic… (comma separated)"
                className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto text-[#001731] bg-white focus:outline-none focus:border-[#0d5959] placeholder:text-[#7a8a99]"
              />
              <p className="text-xs text-[#7a8a99] mt-1.5">Separate multiple names with commas. Any place whose name contains one of the keywords is exported.</p>
            </div>
          )}

          {/* Summary */}
          <div className="flex items-center justify-between bg-[#f7f8fa] rounded-lg px-4 py-3">
            <span className="text-sm font-roboto text-[#4b5563]">Rows to export</span>
            <span className={`text-sm font-roboto font-semibold ${scopeRows.length ? 'text-[#0d5959]' : 'text-[#dc2626]'}`}>
              {scopeRows.length} place{scopeRows.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-[#e8edf2] bg-white justify-end">
          <button onClick={onClose} className="px-4 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto font-medium text-[#4b5563] hover:bg-[#f7f8fa] transition-colors cursor-pointer whitespace-nowrap">
            Cancel
          </button>
          <button
            onClick={doExport}
            disabled={!scopeRows.length}
            className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-5 py-2.5 rounded-lg text-sm font-roboto font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            <i className="ri-download-2-line" />
            Export {scopeRows.length} place{scopeRows.length === 1 ? '' : 's'}{format === 'pdf' ? ' (PDF)' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// Builds a clean printable HTML report for PDF export (prints to a chosen PDF).
function buildPdfHtml(title: string, rows: Amenity[]): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = rows
    .map((a) => {
      const features = Array.isArray(a.attributes?.features) ? (a.attributes.features as string[]).join(', ') : '';
      return `
      <div class="item">
        <h3>${esc(a.name)}</h3>
        <p>${esc(categoryLabel(a.category))}${a.subcategory ? ' · ' + esc(subcategoryLabel(a.subcategory)) : ''}${a.neighbourhood_name ? ' · ' + esc(a.neighbourhood_name) : ''}</p>
        ${a.address ? `<p><b>Address:</b> ${esc(a.address)}</p>` : ''}
        ${a.phone ? `<p><b>Phone:</b> ${esc(a.phone)}</p>` : ''}
        ${a.website ? `<p><b>Website:</b> ${esc(a.website)}</p>` : ''}
        ${a.opening_hours ? `<p><b>Hours:</b> ${esc(a.opening_hours)}</p>` : ''}
        ${features ? `<p><b>Features:</b> ${esc(features)}</p>` : ''}
        ${a.description ? `<p>${esc(a.description)}</p>` : ''}
        ${a.rating != null ? `<p><b>Rating:</b> ${a.rating.toFixed(1)} / 5${a.review_count ? ` (${a.review_count} reviews)` : ''}</p>` : ''}
      </div>`;
    })
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;margin:0;padding:32px;}
  h1{font-size:20px;margin:0 0 4px;}p{font-size:12px;margin:2px 0;color:#444;line-height:1.5;}
  .item{border-bottom:1px solid #eee;padding:14px 0;page-break-inside:avoid;}
  .item h3{font-size:14px;margin:0 0 2px;color:#0d5959;}
  .meta{color:#888;font-size:11px;}@media print{.noprint{display:none;}}
  </style></head><body>
  <div class="noprint"><button onclick="window.print()" style="margin-bottom:16px;padding:8px 14px;">Print / Save as PDF</button></div>
  <h1>${esc(title)}</h1>
  <p class="meta">${rows.length} place${rows.length === 1 ? '' : 's'} · generated ${new Date().toLocaleDateString()}</p>
  ${body}
  </body></html>`;
}