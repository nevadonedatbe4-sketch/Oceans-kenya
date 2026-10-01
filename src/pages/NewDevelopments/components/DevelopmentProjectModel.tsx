import type { Development } from '@/hooks/useNewDevelopments';
import { useCurrency } from '@/hooks/useCurrency';
import { titleCase, pluralCount } from '@/pages/NewDevelopments/components/typography';

/**
 * DevelopmentProjectModel - the dedicated information model for a New
 * Development / Project.
 *
 * A development is NOT a resale home: it is a project with a scale, a set of
 * unit types (each with size, price and availability), a developer, and a
 * construction timeline. Every block below renders ONLY from real CRM data -
 * nothing is fabricated, and any empty block is dropped entirely.
 */

type CurrencyCode = 'KES' | 'USD' | 'GBP' | 'EUR' | 'UGX' | 'AED' | 'ZAR';

const STAGE_LABELS: Record<string, string> = {
  off_plan: 'Off-Plan',
  under_construction: 'Under Construction',
  completed: 'Completed',
  ready: 'Ready',
  launch: 'Launch',
  now_selling: 'Now Selling',
};

function stageLabel(value: string): string {
  const key = (value || '').trim().toLowerCase();
  if (!key) return '';
  return STAGE_LABELS[key] || titleCase(value);
}

function typeLabel(pt: string): string {
  const s = (pt || '').toLowerCase();
  if (s === 'apartment') return 'Apartment';
  if (s === 'villa') return 'Villa';
  if (s === 'townhouse') return 'Townhouse';
  if (s === 'maisonette') return 'Maisonette';
  if (s === 'house') return 'House';
  if (s === 'office') return 'Office';
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unit';
}

function bedLabel(beds: number): string {
  if (beds <= 0) return 'Studio';
  return pluralCount(beds, 'Bedroom', 'Bedrooms');
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Map a raw unit status to a compact, honest availability badge. */
function availability(status: string): { label: string; className: string } {
  const s = (status || '').trim().toLowerCase();
  if (s === 'sold') return { label: 'Sold', className: 'bg-red-50 text-red-600 border-red-100' };
  if (s === 'under_contract' || s === 'reserved') {
    return { label: 'Reserved', className: 'bg-amber-50 text-amber-700 border-amber-100' };
  }
  if (s === 'available' || s === '') {
    return { label: 'Available', className: 'bg-green-50 text-green-700 border-green-100' };
  }
  return { label: titleCase(status), className: 'bg-stone-50 text-stone-600 border-stone-200' };
}

interface StatItem {
  key: string;
  icon: string;
  label: string;
  value: string;
  emphasis?: boolean;
}

export default function DevelopmentProjectModel({ development }: { development: Development }) {
  const { format } = useCurrency();
  const currency = (development.currency as CurrencyCode) || 'KES';

  const totalUnits = development.totalUnits || 0;
  const unitsSold = development.unitsSold || 0;
  const unitsReserved = development.unitsReserved || 0;
  const availableUnits = totalUnits > 0 ? Math.max(0, totalUnits - unitsSold - unitsReserved) : 0;

  /* ── Project scale ── */
  const stats: StatItem[] = [
    totalUnits > 0 ? { key: 'total', icon: 'ri-building-2-line', label: 'Total Units', value: String(totalUnits) } : null,
    totalUnits > 0 ? { key: 'available', icon: 'ri-check-double-line', label: 'Available', value: String(availableUnits), emphasis: true } : null,
    unitsReserved > 0 ? { key: 'reserved', icon: 'ri-bookmark-line', label: 'Reserved', value: String(unitsReserved) } : null,
    unitsSold > 0 ? { key: 'sold', icon: 'ri-hand-coin-line', label: 'Sold', value: String(unitsSold) } : null,
    development.floors > 0 ? { key: 'floors', icon: 'ri-building-line', label: 'Floors', value: String(development.floors) } : null,
    development.units.length > 0 ? { key: 'types', icon: 'ri-layout-grid-line', label: 'Unit Types', value: String(development.units.length) } : null,
  ].filter(Boolean) as StatItem[];

  /* ── Unit types table ── */
  const units = development.units;

  /* ── Construction timeline ── */
  const timedStages = development.status ? stageLabel(development.status) : '';
  const timeline: { key: string; icon: string; label: string; value: string }[] = [];
  if (development.createdAt) {
    timeline.push({ key: 'listed', icon: 'ri-calendar-line', label: 'Listed on', value: formatDate(development.createdAt) });
  }
  if (timedStages) {
    timeline.push({ key: 'stage', icon: 'ri-hammer-line', label: 'Current stage', value: timedStages });
  }
  if (development.completionDate) {
    const completion = formatDate(development.completionDate);
    const isPast = new Date(development.completionDate).getTime() < Date.now();
    timeline.push({
      key: 'completion',
      icon: 'ri-calendar-check-line',
      label: isPast ? 'Completed' : 'Expected completion',
      value: completion,
    });
  }

  const hasDeveloper = Boolean(development.developer);
  const hasAnything = stats.length > 0 || units.length > 0 || hasDeveloper || timeline.length > 0;
  if (!hasAnything) return null;

  return (
    <div className="space-y-6">
      {/* ── Project scale ── */}
      {stats.length > 0 && (
        <section>
          <h4 className="text-base font-bold text-primary mb-2.5">Project Scale</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {stats.map((s) => (
              <div key={s.key} className="p-3 bg-[#f7f8f9] rounded-sm border border-[#eef0f2]">
                <i className={`${s.icon} text-golden text-base`}></i>
                <p className="text-sm text-primary/60 mt-1">{s.label}</p>
                <p className={`text-lg font-bold ${s.emphasis ? 'text-golden' : 'text-primary'}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Unit types ── */}
      {units.length > 0 && (
        <section>
          <h4 className="text-base font-bold text-primary mb-2.5">Unit Types</h4>
          <div className="border border-[#eef0f2] rounded-sm overflow-hidden">
            <div className="hidden sm:flex items-center gap-x-4 px-4 py-2.5 bg-[#f7f8f9] border-b border-[#eef0f2]">
              <span className="flex-1 min-w-[140px] text-[11px] font-bold uppercase tracking-widest text-primary/50">Unit type</span>
              <span className="w-[120px] text-[11px] font-bold uppercase tracking-widest text-primary/50">Size</span>
              <span className="w-[150px] text-[11px] font-bold uppercase tracking-widest text-primary/50">Price</span>
              <span className="w-[100px] text-[11px] font-bold uppercase tracking-widest text-primary/50">Status</span>
            </div>
            <div className="divide-y divide-[#eef0f2]">
              {units.map((u) => {
                const avail = availability(u.status);
                return (
                  <div key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                      <i className="ri-home-5-line text-golden text-base"></i>
                      <span className="text-base font-semibold text-primary">{bedLabel(u.bedrooms)}</span>
                      <span className="text-sm text-primary/50">&middot; {typeLabel(development.propertyType)}</span>
                    </div>
                    <span className="w-[120px] text-base text-primary/70">
                      {u.size > 0 ? `${u.size.toLocaleString()} ${u.sizeUnit}` : '\u2014'}
                    </span>
                    <span className="w-[150px] text-base font-semibold text-primary">
                      {u.price > 0 ? format(u.price, (u.currency as CurrencyCode) || 'KES') : 'P.O.R'}
                    </span>
                    <span className={`w-[100px] inline-flex items-center justify-center px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wide ${avail.className}`}>
                      {avail.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Developer profile ── */}
      {hasDeveloper && (
        <section>
          <h4 className="text-base font-bold text-primary mb-2.5">Developer</h4>
          <div className="flex flex-wrap items-center gap-3 p-4 bg-[#f7f8f9] border border-[#eef0f2] rounded-sm">
            <div className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-white text-base font-bold shrink-0">
              {titleCase(development.developer).charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-primary truncate">{titleCase(development.developer)}</p>
              <p className="text-sm text-primary/60">Project Developer</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {development.developerPhone && (
                <a
                  href={`tel:${development.developerPhone}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-primary/20 text-primary text-sm font-semibold whitespace-nowrap cursor-pointer hover:bg-white transition-colors"
                >
                  <i className="ri-phone-line text-base"></i>Call
                </a>
              )}
              {development.developerEmail && (
                <a
                  href={`mailto:${development.developerEmail}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-primary/20 text-primary text-sm font-semibold whitespace-nowrap cursor-pointer hover:bg-white transition-colors"
                >
                  <i className="ri-mail-line text-base"></i>Email
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Construction timeline ── */}
      {timeline.length > 0 && (
        <section>
          <h4 className="text-base font-bold text-primary mb-2.5">Construction Timeline</h4>
          <ol className="relative ml-2 border-l border-primary/15">
            {timeline.map((t) => (
              <li key={t.key} className="relative pl-6 pb-4 last:pb-0">
                <span className="absolute -left-[9px] top-0 w-4 h-4 flex items-center justify-center rounded-full bg-golden text-white">
                  <i className={`${t.icon} text-[10px]`}></i>
                </span>
                <p className="text-sm text-primary/60">{t.label}</p>
                <p className="text-base font-semibold text-primary">{t.value}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}