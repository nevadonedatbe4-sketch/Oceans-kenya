import { useEffect, useState } from 'react';
import { addToast } from '@/pages/crm/components/CRMToast';
import { mergeSubcategories, type AmenityCategoryRecord } from '@/lib/amenities';
import {
  deleteCategory,
  deleteSubcategory,
  moveCategoryPlaces,
  moveSubcategoryPlaces,
} from '@/lib/amenityCategories';

export interface CategoryDeleteTarget {
  type: 'category' | 'subcategory';
  category: AmenityCategoryRecord;
  subKey?: string;
  subLabel?: string;
  count: number;
}

interface CategoryDeleteDecisionProps {
  target: CategoryDeleteTarget | null;
  categories: AmenityCategoryRecord[];
  onClose: () => void;
  onDone: () => void;
}

/**
 * Shown whenever a category or subcategory that still has places is deleted.
 * Nothing is removed until the user decides what happens to those places —
 * move them somewhere else, or leave them uncategorised.
 */
export default function CategoryDeleteDecision({
  target,
  categories,
  onClose,
  onDone,
}: CategoryDeleteDecisionProps) {
  const [choice, setChoice] = useState<'move' | 'unassign'>('move');
  const [moveTo, setMoveTo] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset the form each time a new target is opened. When there's nowhere else
  // to move the places to, we default straight to "leave them unassigned".
  useEffect(() => {
    if (!target) return;
    const hasMove = target.type === 'category'
      ? categories.some((c) => c.id !== target.category.id)
      : mergeSubcategories(target.category.slug, target.category.subcategories)
        .some((s) => s.key !== target.subKey);
    setChoice(hasMove ? 'move' : 'unassign');
    setMoveTo('');
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (!target) return null;

  const { type, category, subKey, subLabel, count } = target;

  const siblingSubs = type === 'subcategory' && subKey
    ? mergeSubcategories(category.slug, category.subcategories).filter((s) => s.key !== subKey)
    : [];
  const otherCategories = categories.filter((c) => c.id !== category.id);
  const moveOptions =
    type === 'category'
      ? otherCategories.map((c) => ({ value: c.id, label: c.name }))
      : siblingSubs.map((s) => ({ value: s.key, label: s.label }));

  const moveDisabled = choice === 'move' && !moveTo;
  const nothingToMoveTo = moveOptions.length === 0;

  const handleConfirm = async () => {
    if (type === 'category') {
      if (choice === 'move') {
        const dest = otherCategories.find((c) => c.id === moveTo);
        if (!dest) return;
        await moveCategoryPlaces(category, dest);
        await deleteCategory(category);
        addToast(`${count} place(s) moved to "${dest.name}" and category deleted`, 'success');
      } else {
        await moveCategoryPlaces(category, null);
        await deleteCategory(category);
        addToast(`Category deleted · ${count} place(s) left uncategorised`, 'success');
      }
    } else {
      if (!subKey) return;
      if (choice === 'move') {
        const dest = siblingSubs.find((s) => s.key === moveTo);
        if (!dest) return;
        await moveSubcategoryPlaces(category, subKey, dest.key);
        await deleteSubcategory(category, subKey, subLabel || subKey);
        addToast(`${count} place(s) moved to "${dest.label}" and sub category deleted`, 'success');
      } else {
        await moveSubcategoryPlaces(category, subKey, null);
        await deleteSubcategory(category, subKey, subLabel || subKey);
        addToast(`Sub category deleted · ${count} place(s) left without a sub category`, 'success');
      }
    }
    setBusy(false);
    onDone();
    onClose();
  };

  const title = type === 'category'
    ? `Delete "${category.name}"?`
    : `Delete "${subLabel || subKey}"?`;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#e8edf2]">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <i className="ri-delete-bin-line text-[#dc2626] text-lg" />
          </div>
          <div className="min-w-0">
            <h2 className="font-jost text-base font-semibold text-[#001731] truncate">{title}</h2>
            <p className="text-xs text-[#7a8a99] mt-0.5">
              {count} place{count === 1 ? '' : 's'} filed here need a new home.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <p className="text-sm text-[#4b5563]">
            What should happen to {count === 1 ? 'this place' : `these ${count} places`}?
          </p>

          {/* Move to another */}
          <button
            type="button"
            onClick={() => !nothingToMoveTo && setChoice('move')}
            disabled={nothingToMoveTo}
            className={`w-full text-left rounded-lg border p-3 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              choice === 'move' ? 'border-[#0d5959] bg-[#eef7f5]' : 'border-[#e8edf2] hover:border-[#c7d3dc]'
            }`}
          >
            <div className="flex items-center gap-2">
              <i className={`${choice === 'move' ? 'ri-radio-button-line' : 'ri-checkbox-blank-circle-line'} text-[#0d5959]`} />
              <span className="text-sm font-roboto font-medium text-[#001731]">
                {type === 'category' ? 'Move them to another category' : 'Move them to another sub category'}
              </span>
            </div>
            {nothingToMoveTo ? (
              <p className="text-xs text-[#7a8a99] mt-1.5 pl-6">
                No other {type === 'category' ? 'categories' : 'sub categories'} to move to yet.
              </p>
            ) : (
              <select
                value={moveTo}
                onChange={(e) => { setMoveTo(e.target.value); setChoice('move'); }}
                onClick={(e) => e.stopPropagation()}
                className="mt-2.5 ml-6 w-[calc(100%-1.5rem)] px-3 py-2 border border-[#e8edf2] rounded-lg text-sm text-[#001731] bg-white focus:outline-none focus:border-[#0d5959] cursor-pointer"
              >
                <option value="">— Select {type === 'category' ? 'a category' : 'a sub category'} —</option>
                {moveOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
          </button>

          {/* Unassign */}
          <button
            type="button"
            onClick={() => setChoice('unassign')}
            className={`w-full text-left rounded-lg border p-3 transition-colors cursor-pointer ${
              choice === 'unassign' ? 'border-[#0d5959] bg-[#eef7f5]' : 'border-[#e8edf2] hover:border-[#c7d3dc]'
            }`}
          >
            <div className="flex items-center gap-2">
              <i className={`${choice === 'unassign' ? 'ri-radio-button-line' : 'ri-checkbox-blank-circle-line'} text-[#0d5959]`} />
              <span className="text-sm font-roboto font-medium text-[#001731]">
                {type === 'category' ? 'Leave them uncategorised' : 'Leave them without a sub category'}
              </span>
            </div>
            <p className="text-xs text-[#7a8a99] mt-1.5 pl-6">
              The places are kept — they just won&rsquo;t belong to a {type === 'category' ? 'category' : 'sub category'}.
            </p>
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#e8edf2] flex-wrap">
          <button
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="px-4 py-2.5 text-sm font-medium text-[#4b5563] hover:bg-[#f7f8fa] rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy || moveDisabled}
            className="inline-flex items-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <i className={busy ? 'ri-loader-4-line animate-spin' : 'ri-delete-bin-line'} />
            Delete {type === 'category' ? 'category' : 'sub category'}
          </button>
        </div>
      </div>
    </div>
  );
}