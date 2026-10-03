import type { Development } from '@/hooks/useNewDevelopments';
import { useCurrency } from '@/hooks/useCurrency';
import { titleCase } from '@/pages/NewDevelopments/components/typography';
import { groupUnitTypes, unitTypeBadge } from '@/lib/developmentUnits';

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

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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

  /* ── Grouped unit-type mix (studio / 1 / 2 / 3 bed…), from real units ── */
  const units = development.units;
  const typeGroups = groupUnitTypes(units);

  /* ── Project scale ── */
  const stats: StatItem[] = [
    totalUnits > 0 ? { key: 'total', icon: 'ri-building-2-line', label: 'Total Units', value: String(totalUnits) } : null,
    totalUnits > 0 ? { key: 'available', icon: 'ri-check-double-line', label: 'Available', value: String(availableUnits), emphasis: true } : null,
    unitsReserved > 0 ? { key: 'reserved', icon: 'ri-bookmark-line', label: 'Reserved', value: String(unitsReserved) } : null,
    unitsSold > 0 ? { key: 'sold', icon: 'ri-hand-coin-line', label: 'Sold', value: String(unitsSold) } : null,
    development.floors > 0 ? { key: 'floors', icon: 'ri-building-line', label: 'Floors', value: String(development.floors) } : null,
    development.units.length > 0 ? { key: 'types', icon: 'ri-layout-grid-line', label: 'Unit Types', value: String(typeGroups.length) } : null,
  ].filter(Boolean) as StatItem[];

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
  const hasPaymentPlan =
    development.paymentPlan.depositPercent != null || Boolean(development.paymentPlan.installments);
  const hasAnything = stats.length > 0 || units.length > 0 || hasDeveloper || timeline.length > 0 || hasPaymentPlan;
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

      {/* ── Unit-type mix ── (the project's bedroom mix, shown only when the
          project genuinely offers more than one unit type) */}
      {typeGroups.length > 1 && (
        <section>
          <h4 className="text-base font-bold text-primary mb-2.5">Unit Types</h4>
          <div className="border border-[#eef0f2] rounded-sm overflow-hidden">
            <div className="hidden sm:flex items-center gap-x-4 px-4 py-2.5 bg-[#f7f8f9] border-b border-[#eef0f2]">
              <span className="flex-1 min-w-[150px] text-[13px] font-bold uppercase tracking-widest text-primary/50">Unit type</span>
              <span className="w-[100px] text-[13px] font-bold uppercase tracking-widest text-primary/50">Size</span>
              <span className="flex-1 min-w-[210px] text-[13px] font-bold uppercase tracking-widest text-primary/50">Price</span>
              <span className="w-[190px] text-[13px] font-bold uppercase tracking-widest text-primary/50">Availability</span>
            </div>
            <div className="divide-y divide-[#eef0f2]">
              {typeGroups.map((g) => {
                const badge = unitTypeBadge(g);
                const sizeLabel = g.maxSize > 0
                  ? `${g.minSize.toLocaleString()}${g.maxSize > g.minSize ? `\u2013${g.maxSize.toLocaleString()}` : ''} ${g.sizeUnit}`
                  : '\u2014';
                const priceLabel = g.minPrice > 0
                  ? (g.maxPrice > g.minPrice
                      ? `${format(g.minPrice, (g.currency as CurrencyCode) || 'KES')} \u2013 ${format(g.maxPrice, (g.currency as CurrencyCode) || 'KES')}`
                      : format(g.minPrice, (g.currency as CurrencyCode) || 'KES'))
                  : 'P.O.R';
                return (
                  <div key={g.beds} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                      <i className="ri-home-5-line text-golden text-base"></i>
                      <span className="text-base font-semibold text-primary">{g.longLabel}</span>
                      <span className="text-sm text-primary/50">&middot; {typeLabel(development.propertyType)}</span>
                    </div>
                    <span className="w-[100px] text-base text-primary/70">{sizeLabel}</span>
                    <span className="flex-1 min-w-[210px] text-base font-semibold text-primary">{priceLabel}</span>
                    <span className={`w-[190px] text-[13px] font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Payment plan ── */}
      {hasPaymentPlan && (
        <section>
          <h4 className="text-base font-bold text-primary mb-2.5">Payment Plan</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {development.paymentPlan.depositPercent != null && (
              <div className="p-3.5 bg-[#f7f8f9] rounded-sm border border-[#eef0f2]">
                <i className="ri-percent-line text-golden text-base"></i>
                <p className="text-sm text-primary/60 mt-1">Deposit</p>
                <p className="text-lg font-bold text-primary">{development.paymentPlan.depositPercent}%</p>
              </div>
            )}
            {development.paymentPlan.installments && (
              <div className="p-3.5 bg-[#f7f8f9] rounded-sm border border-[#eef0f2]">
                <i className="ri-calendar-schedule-line text-golden text-base"></i>
                <p className="text-sm text-primary/60 mt-1">Instalments</p>
                <p className="text-lg font-bold text-primary">{development.paymentPlan.installments}</p>
              </div>
            )}
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
              <p className="text-sm text-primary/60">Marketing Consultant</p>
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