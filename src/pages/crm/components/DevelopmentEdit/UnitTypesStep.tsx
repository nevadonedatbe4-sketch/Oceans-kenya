import { useState } from 'react';
import { DevelopmentFormState, UnitType, CURRENCIES, SIZE_UNITS } from './types';
import { inputBase, selectClass, labelClass, hintClass, SectionHeader } from './ui';

interface Props {
  form: DevelopmentFormState;
  update: (patch: Partial<DevelopmentFormState>) => void;
  updateUnit: (index: number, patch: Partial<UnitType>) => void;
  addUnit: () => void;
  removeUnit: (index: number) => void;
  missingUnits?: boolean;
}

function UnitTypeCard({
  unit,
  index,
  onChange,
  onRemove,
  showError,
}: {
  unit: UnitType;
  index: number;
  onChange: (patch: Partial<UnitType>) => void;
  onRemove: () => void;
  showError: boolean;
}) {
  const [open, setOpen] = useState(index === 0);
  const minEmpty = unit.priceMin.trim() === '' && unit.priceMax.trim() === '';
  return (
    <div className={`border rounded-xl overflow-hidden bg-white transition-colors ${showError && !unit.name.trim() ? 'border-red-400 ring-1 ring-red-300' : 'border-[#e8ecf0]'}`}>
      <div className="flex items-center justify-between px-5 py-4 hover:bg-[#fafbfc] transition-colors">
        <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-3 cursor-pointer flex-1 text-left">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0d1f2d] text-white text-[13px] font-bold shrink-0">{index + 1}</span>
          <span className="text-[16px] font-semibold text-[#0d1f2d]">
            {unit.name.trim() ? unit.name + (unit.variant ? ` ${unit.variant}` : '') : `Unit Type ${index + 1}`}
          </span>
          <i className={`ri-arrow-down-wide-fill text-[#7a8a99] text-lg transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e8ecf0] text-[#7a8a99] hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
          title="Remove unit type"
        >
          <i className="ri-delete-bin-line text-sm" />
        </button>
      </div>

      {open && (
        <div className="px-6 pb-6 pt-2 border-t border-[#f0f3f5]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="sm:col-span-2">
              <label className={labelClass}>Name *</label>
              <input
                type="text"
                value={unit.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className={inputBase}
                placeholder="e.g. 2 Bedroom"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Variant (optional)</label>
              <input
                type="text"
                value={unit.variant}
                onChange={(e) => onChange({ variant: e.target.value })}
                className={inputBase}
                placeholder="e.g. + DSQ"
              />
            </div>

            <div>
              <label className={labelClass}>Bedrooms</label>
              <input
                type="number"
                min={0}
                value={unit.bedrooms || ''}
                onChange={(e) => onChange({ bedrooms: Number(e.target.value) || 0 })}
                className={inputBase}
                placeholder="2"
              />
            </div>
            <div>
              <label className={labelClass}>Bathrooms</label>
              <input
                type="number"
                min={0}
                value={unit.bathrooms || ''}
                onChange={(e) => onChange({ bathrooms: Number(e.target.value) || 0 })}
                className={inputBase}
                placeholder="2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={`${labelClass} flex items-center gap-2 cursor-pointer select-none`}>
                <input
                  type="checkbox"
                  checked={unit.hasDsq}
                  onChange={(e) => onChange({ hasDsq: e.target.checked })}
                  className="w-4 h-4 rounded border-[#c8cdd5] text-[#0d5959] accent-[#0d5959] cursor-pointer"
                />
                Includes Staff Quarters (DSQ)
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Size Range</label>
              <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                <input
                  type="number"
                  value={unit.sizeMin}
                  onChange={(e) => onChange({ sizeMin: e.target.value })}
                  className={inputBase}
                  placeholder="Min"
                />
                <span className="text-[#7a8a99]">–</span>
                <input
                  type="number"
                  value={unit.sizeMax}
                  onChange={(e) => onChange({ sizeMax: e.target.value })}
                  className={inputBase}
                  placeholder="Max"
                />
                <select
                  value={unit.sizeUnit}
                  onChange={(e) => onChange({ sizeUnit: e.target.value })}
                  className={`${inputBase} w-24 shrink-0 cursor-pointer`}
                >
                  {SIZE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className={labelClass}>Price Range</label>
              <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] items-center gap-2">
                <input
                  type="number"
                  value={unit.priceMin}
                  onChange={(e) => onChange({ priceMin: e.target.value })}
                  className={inputBase}
                  placeholder={minEmpty ? 'e.g. 10,000,000' : 'Min price'}
                />
                <span className="text-[#7a8a99]">–</span>
                <input
                  type="number"
                  value={unit.priceMax}
                  onChange={(e) => onChange({ priceMax: e.target.value })}
                  className={inputBase}
                  placeholder="Max price (optional)"
                />
                <select
                  value={unit.currency}
                  onChange={(e) => onChange({ currency: e.target.value })}
                  className={`${inputBase} w-24 shrink-0 cursor-pointer`}
                >
                  {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.value}</option>)}
                </select>
              </div>
              <p className={hintClass}>Leave the max price blank to display “From [min price]”.</p>
            </div>

            <div>
              <label className={labelClass}>Available Units</label>
              <input
                type="number"
                min={0}
                value={unit.availableUnits}
                onChange={(e) => onChange({ availableUnits: e.target.value })}
                className={inputBase}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UnitTypesStep({ form, update, updateUnit, addUnit, removeUnit, missingUnits }: Props) {
  return (
    <div className="w-full space-y-5">
      <SectionHeader icon="ri-layout-masonry-line" title="Unit Types" subtitle="Define the different unit configurations available in this development" />

      <div className="border-l-2 border-[#0d5959] pl-5 py-1 mb-4">
        <p className="text-xs font-bold text-[#1a1e24] mb-2 uppercase tracking-widest">Why structure units?</p>
        <ul className="text-xs text-[#7a8a99] space-y-1 font-light">
          <li>Each unit type becomes its own searchable option on the public page</li>
          <li>Buyers can filter by bedrooms and price range across developments</li>
          <li>Enables “2 Bedroom under 15M” searching — a real competitive edge</li>
        </ul>
      </div>

      {missingUnits && (
        <div className="border-2 border-amber-300 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 flex items-center justify-center shrink-0 bg-amber-500 rounded-full">
              <i className="ri-error-warning-line text-white text-sm" />
            </div>
            <p className="font-jost text-sm font-bold text-amber-700 uppercase tracking-[0.5px]">Add at least one unit type</p>
          </div>
          <p className="text-xs text-amber-700">Give each unit type a name (e.g. “2 Bedroom”) so it can be saved and displayed.</p>
        </div>
      )}

      <div className="space-y-4">
        {form.unitTypes.map((unit, index) => (
          <UnitTypeCard
            key={unit.id}
            unit={unit}
            index={index}
            showError={missingUnits}
            onChange={(patch) => updateUnit(index, patch)}
            onRemove={() => removeUnit(index)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addUnit}
        className="w-full flex items-center justify-center gap-2 px-5 py-4 border-2 border-dashed border-[#0d5959]/50 text-[#0d5959] font-semibold text-[14px] uppercase tracking-wide rounded-xl hover:bg-[#0d5959]/5 hover:border-[#0d5959] transition-colors cursor-pointer"
      >
        <i className="ri-add-line text-lg" /> Add Unit Type
      </button>
    </div>
  );
}