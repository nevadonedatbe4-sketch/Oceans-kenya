import { useMemo, useState } from 'react';
import type { DevelopmentUnit } from '@/lib/developmentModel';
import { groupUnitTypes } from '@/lib/developmentUnits';
import { unitTypeUrgency } from '@/lib/urgency';
import UnitCard from '@/pages/DevelopmentDetail/components/UnitCard';

interface InventorySectionProps {
  units: DevelopmentUnit[];
  propertyType: string;
  /** Reliable remaining-unit count from the CRM project record (0 = unknown). */
  availableUnits: number;
  /** The unit slug the visitor arrived from, highlighted if present. */
  highlightUnitId: string;
  /** Whether the CRM display toggle permits showing urgency messages. */
  showUrgency?: boolean;
  /** Render as an in-column card (used inside the tabbed two-column layout). */
  contained?: boolean;
}

function isAvailable(status: string): boolean {
  const s = (status || '').trim().toLowerCase();
  return s === '' || s === 'available' || s === 'active' || s === 'published';
}

function bedOptionLabel(beds: number): string {
  if (beds <= 0) return 'Studio';
  if (beds >= 4) return '4+';
  return String(beds);
}

/**
 * "Available homes in this development" - the live inventory of the project.
 *
 * Compact inventory summary + bedroom-based filters above the individual unit
 * cards. Every count derives from the actual linked unit records; scarcity is
 * never invented.
 */
export default function InventorySection({ units, propertyType, availableUnits, highlightUnitId, showUrgency = true, contained = false }: InventorySectionProps) {
  const [bedFilter, setBedFilter] = useState('Any');
  const [availFilter, setAvailFilter] = useState<'All' | 'Available'>('All');
  const [sortBy, setSortBy] = useState('price_asc');

  const groups = useMemo(() => groupUnitTypes(units), [units]);

  // Honest automatic urgency for a unit: how many of ITS bedroom type remain in
  // the development. Empty unless that type is genuinely scarce.
  const autoMessageForUnit = useMemo(() => {
    const byBeds = new Map(groups.map((g) => [g.beds, g.available]));
    return (unit: DevelopmentUnit) => unitTypeUrgency(byBeds.get(unit.bedrooms) ?? 0);
  }, [groups]);

  const bedOptions = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) => set.add(bedOptionLabel(u.bedrooms)));
    const order = ['Studio', '1', '2', '3', '4+'];
    const sorted = Array.from(set).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return ['Any', ...sorted];
  }, [units]);

  const availableFromUnits = units.filter((u) => isAvailable(u.status)).length;
  const totalAvailable = availableUnits > 0 ? availableUnits : availableFromUnits;

  const breakdown = groups
    .filter((g) => g.available > 0)
    .map((g) => `${g.beds <= 0 ? 'Studio' : `${g.beds} bed`} ${g.available}`);

  const visible = useMemo(() => {
    let list = units;
    if (bedFilter !== 'Any') {
      list = list.filter((u) => {
        if (bedFilter === 'Studio') return u.bedrooms <= 0;
        if (bedFilter === '4+') return u.bedrooms >= 4;
        return u.bedrooms === Number(bedFilter);
      });
    }
    if (availFilter === 'Available') list = list.filter((u) => isAvailable(u.status));

    const sorted = [...list];
    if (sortBy === 'price_desc') sorted.sort((a, b) => b.price - a.price);
    else if (sortBy === 'newest') sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    else sorted.sort((a, b) => (a.price || Number.POSITIVE_INFINITY) - (b.price || Number.POSITIVE_INFINITY));
    return sorted;
  }, [units, bedFilter, availFilter, sortBy]);

  if (units.length === 0) return null;

  const wrapperClass = contained
    ? 'rounded-lg border border-[#e5e5e5] bg-white p-5 md:p-7'
    : 'py-10 md:py-14 px-4 md:px-6 bg-[#f5f7f7]';

  return (
    <section id="available-homes" className={wrapperClass}>
      <div className={contained ? '' : 'max-w-7xl mx-auto'}>
        <div className="mb-6">
          <h2 className="text-2xl md:text-[28px] font-bold text-primary">See Available homes in this development</h2>

          {/* Inventory summary */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-lg font-bold text-primary">
              {totalAvailable > 0 ? `${totalAvailable} ${totalAvailable === 1 ? 'home' : 'homes'} available` : 'Available homes'}
            </p>
            {breakdown.length > 0 && (
              <p className="text-base font-medium text-primary/60">{breakdown.join(' \u00b7 ')}</p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Bedrooms */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-primary/60 whitespace-nowrap mr-1">Bedrooms</span>
            <div className="inline-flex items-center gap-1 p-1 bg-white border border-[#e5e5e5] rounded-full">
              {bedOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setBedFilter(opt)}
                  className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    bedFilter === opt ? 'bg-primary text-white' : 'text-primary/70 hover:bg-primary/5'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm font-semibold text-primary/60 whitespace-nowrap">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 px-3 text-sm font-roboto text-primary bg-white border border-[#e5e5e5] rounded-md focus:outline-none cursor-pointer"
            >
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {visible.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {visible.map((u) => (
              <UnitCard
                key={u.id}
                unit={u}
                propertyType={propertyType}
                highlight={Boolean(highlightUnitId) && u.id === highlightUnitId}
                automaticMessage={autoMessageForUnit(u)}
                showUrgency={showUrgency}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-14 bg-white rounded-lg border border-[#e5e5e5]">
            <div className="w-14 h-14 flex items-center justify-center bg-stone-50 rounded-full mx-auto mb-3">
              <i className="ri-search-line text-xl text-primary/30"></i>
            </div>
            <p className="text-primary font-semibold mb-1">No units match these filters</p>
            <p className="text-sm text-primary/50">Try a different bedroom count or show all availability.</p>
            <button
              type="button"
              onClick={() => { setBedFilter('Any'); setAvailFilter('All'); }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-primary/20 text-primary text-sm font-semibold rounded-md cursor-pointer whitespace-nowrap hover:bg-primary hover:text-white transition-colors"
            >
              <i className="ri-refresh-line"></i>Reset filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}