import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addToast } from '@/pages/crm/components/CRMToast';
import CategoryDeleteDecision, {
  type CategoryDeleteTarget,
} from '@/pages/crm/components/CategoryDeleteDecision';
import {
  categoryColorVar,
  isBuiltinSubcategory,
  mergeSubcategories,
  type AmenityCategoryRecord,
} from '@/lib/amenities';
import {
  addSubcategory,
  countPlacesInCategory,
  countPlacesInSubcategory,
  deleteCategory,
  deleteSubcategory,
  renameCategory,
  renameSubcategory,
} from '@/lib/amenityCategories';

interface CategoryManagerModalProps {
  open: boolean;
  categories: AmenityCategoryRecord[];
  /** Category to expand/select when the modal opens (e.g. from the Place form). */
  focusCategoryId?: string | null;
  initialTab?: 'categories' | 'subcategories';
  /** When false the "open full editor / new category" navigation is hidden (used
   *  inside the Place form so unsaved work is never thrown away). */
  showFullEditor?: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export default function CategoryManagerModal({
  open,
  categories,
  focusCategoryId,
  initialTab = 'categories',
  showFullEditor = true,
  onClose,
  onChanged,
}: CategoryManagerModalProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'categories' | 'subcategories'>(initialTab);
  const [subCategoryId, setSubCategoryId] = useState<string>('');

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [editingSubKey, setEditingSubKey] = useState<string | null>(null);
  const [subName, setSubName] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryDeleteTarget | null>(null);

  // Reset local view state whenever the modal is (re)opened.
  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setSubCategoryId(focusCategoryId || categories[0]?.id || '');
    setEditingCatId(null);
    setEditingSubKey(null);
    setNewSubName('');
    setDeleteTarget(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the subcategory tab's selected category valid as the list changes.
  useEffect(() => {
    if (!open) return;
    if (!subCategoryId || !categories.some((c) => c.id === subCategoryId)) {
      setSubCategoryId(focusCategoryId || categories[0]?.id || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, open]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === subCategoryId) || null,
    [categories, subCategoryId],
  );
  const subOptions = useMemo(
    () => mergeSubcategories(selectedCategory?.slug, selectedCategory?.subcategories),
    [selectedCategory],
  );

  if (!open) return null;

  // ── Category actions ──
  const saveCatName = async (cat: AmenityCategoryRecord) => {
    const next = catName.trim();
    setEditingCatId(null);
    if (!next || next === cat.name) return;
    setBusy(true);
    const ok = await renameCategory(cat, next);
    setBusy(false);
    if (ok) {
      addToast(`Renamed to "${next}"`, 'success');
      onChanged();
    } else {
      addToast('Failed to rename category', 'error');
    }
  };

  const requestDeleteCat = async (cat: AmenityCategoryRecord) => {
    setBusy(true);
    const count = await countPlacesInCategory(cat);
    setBusy(false);
    if (count === 0) {
      const ok = await deleteCategory(cat);
      if (ok) {
        addToast(`Category "${cat.name}" deleted`, 'success');
        onChanged();
      } else {
        addToast('Failed to delete category', 'error');
      }
      return;
    }
    setDeleteTarget({ type: 'category', category: cat, count });
  };

  // ── Subcategory actions ──
  const saveSubName = async (cat: AmenityCategoryRecord, key: string) => {
    const next = subName.trim();
    setEditingSubKey(null);
    if (!next) return;
    setBusy(true);
    const ok = await renameSubcategory(cat, key, next);
    setBusy(false);
    if (ok) {
      addToast(`Sub category renamed to "${next}"`, 'success');
      onChanged();
    } else {
      addToast('Failed to rename sub category', 'error');
    }
  };

  const handleAddSub = async () => {
    if (!selectedCategory) return;
    const name = newSubName.trim();
    if (!name) return;
    setBusy(true);
    const res = await addSubcategory(selectedCategory, name);
    setBusy(false);
    if (res.ok) {
      setNewSubName('');
      addToast(`Sub category "${name}" added`, 'success');
      onChanged();
    } else {
      addToast('Failed to add sub category', 'error');
    }
  };

  const requestDeleteSub = async (key: string, label: string) => {
    if (!selectedCategory) return;
    setBusy(true);
    const count = await countPlacesInSubcategory(selectedCategory, key);
    setBusy(false);
    if (count === 0) {
      const ok = await deleteSubcategory(selectedCategory, key, label);
      if (ok) {
        addToast(`Sub category "${label}" deleted`, 'success');
        onChanged();
      } else {
        addToast('Failed to delete sub category', 'error');
      }
      return;
    }
    setDeleteTarget({
      type: 'subcategory',
      category: selectedCategory,
      subKey: key,
      subLabel: label,
      count,
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
        <div className="relative w-full max-w-2xl bg-white rounded-2xl overflow-hidden flex flex-col max-h-[88vh]">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[#e8edf2]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#eef7f5] flex items-center justify-center shrink-0">
                <i className="ri-folder-settings-line text-[#0d5959] text-lg" />
              </div>
              <div className="min-w-0">
                <h2 className="font-jost text-lg font-semibold text-[#001731]">Manage Categories</h2>
                <p className="text-xs text-[#7a8a99] truncate">Rename or delete categories and their sub categories.</p>
              </div>
            </div>
            <button
              onClick={() => !busy && onClose()}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-[#7a8a99] hover:bg-[#f7f8fa] cursor-pointer shrink-0"
              aria-label="Close"
            >
              <i className="ri-close-line text-xl" />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-4">
            <div className="inline-flex items-center gap-1 p-1 bg-[#f2f6f8] rounded-full">
              <button
                onClick={() => setTab('categories')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${tab === 'categories' ? 'bg-white text-[#0d5959] border border-[#d7e2e6]' : 'text-[#7a8a99] hover:text-[#33414f]'}`}
              >
                <i className="ri-price-tag-3-line" /> Categories
              </button>
              <button
                onClick={() => setTab('subcategories')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${tab === 'subcategories' ? 'bg-white text-[#0d5959] border border-[#d7e2e6]' : 'text-[#7a8a99] hover:text-[#33414f]'}`}
              >
                <i className="ri-list-check-2" /> Sub categories
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {tab === 'categories' ? (
              categories.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-[#001731]">No categories yet</p>
                  <p className="text-xs text-[#7a8a99] mt-1">Create your first category to start filing places.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => {
                    const subCount = mergeSubcategories(cat.slug, cat.subcategories).length;
                    const editing = editingCatId === cat.id;
                    return (
                      <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#e8edf2] hover:border-[#c7d3dc] transition-colors">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: cat.color || `var(${categoryColorVar(cat.slug)})`, color: '#fff' }}
                        >
                          <i className={cat.icon || 'ri-store-2-line'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {editing ? (
                            <input
                              autoFocus
                              value={catName}
                              onChange={(e) => setCatName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); saveCatName(cat); }
                                else if (e.key === 'Escape') setEditingCatId(null);
                              }}
                              onBlur={() => saveCatName(cat)}
                              className="w-full px-2.5 py-1.5 border border-[#0d5959] rounded-lg text-sm text-[#001731] focus:outline-none"
                            />
                          ) : (
                            <p className="text-sm font-roboto font-medium text-[#001731] truncate">{cat.name}</p>
                          )}
                          <p className="text-xs text-[#7a8a99]">{subCount} sub categor{subCount === 1 ? 'y' : 'ies'}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {editing ? (
                            <button onClick={() => saveCatName(cat)} onMouseDown={(e) => e.preventDefault()} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#0d5959] hover:bg-[#eef7f5] cursor-pointer" title="Save name">
                              <i className="ri-check-line" />
                            </button>
                          ) : (
                            <button onClick={() => { setEditingCatId(cat.id); setCatName(cat.name); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7a8a99] hover:text-[#0d5959] hover:bg-[#eef7f5] cursor-pointer" title="Rename">
                              <i className="ri-edit-line" />
                            </button>
                          )}
                          {showFullEditor && (
                            <button onClick={() => navigate(`/admin/amenities/categories/edit/${cat.id}`)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7a8a99] hover:text-[#0d5959] hover:bg-[#eef7f5] cursor-pointer" title="Open full editor">
                              <i className="ri-external-link-line" />
                            </button>
                          )}
                          <button onClick={() => requestDeleteCat(cat)} disabled={busy} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7a8a99] hover:text-[#dc2626] hover:bg-red-50 cursor-pointer disabled:opacity-50" title="Delete category">
                            <i className="ri-delete-bin-line" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-roboto font-semibold text-[#4b5563] uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={subCategoryId}
                    onChange={(e) => setSubCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm text-[#001731] bg-white focus:outline-none focus:border-[#0d5959] cursor-pointer"
                  >
                    <option value="">— Select category —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {!selectedCategory ? (
                  <p className="text-sm text-[#7a8a99] py-6 text-center">Pick a category to manage its sub categories.</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {subOptions.length === 0 && (
                        <p className="text-sm text-[#7a8a99] py-4 text-center">No sub categories yet — add one below.</p>
                      )}
                      {subOptions.map((sub) => {
                        const editing = editingSubKey === sub.key;
                        const builtin = isBuiltinSubcategory(selectedCategory.slug, sub.key);
                        return (
                          <div key={sub.key} className="flex items-center gap-3 p-3 rounded-lg border border-[#e8edf2] hover:border-[#c7d3dc] transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-[#f2f6f8] flex items-center justify-center shrink-0 text-[#0d5959]">
                              <i className={sub.icon || 'ri-price-tag-3-line'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              {editing ? (
                                <input
                                  autoFocus
                                  value={subName}
                                  onChange={(e) => setSubName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); saveSubName(selectedCategory, sub.key); }
                                    else if (e.key === 'Escape') setEditingSubKey(null);
                                  }}
                                  onBlur={() => saveSubName(selectedCategory, sub.key)}
                                  className="w-full px-2.5 py-1.5 border border-[#0d5959] rounded-lg text-sm text-[#001731] focus:outline-none"
                                />
                              ) : (
                                <p className="text-sm font-roboto font-medium text-[#001731] truncate">{sub.label}</p>
                              )}
                              <p className="text-xs text-[#7a8a99]">
                                {builtin ? 'Built-in sub category' : 'Custom sub category'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {editing ? (
                                <button onClick={() => saveSubName(selectedCategory, sub.key)} onMouseDown={(e) => e.preventDefault()} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#0d5959] hover:bg-[#eef7f5] cursor-pointer" title="Save name">
                                  <i className="ri-check-line" />
                                </button>
                              ) : (
                                <button onClick={() => { setEditingSubKey(sub.key); setSubName(sub.label); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7a8a99] hover:text-[#0d5959] hover:bg-[#eef7f5] cursor-pointer" title="Rename">
                                  <i className="ri-edit-line" />
                                </button>
                              )}
                              <button onClick={() => requestDeleteSub(sub.key, sub.label)} disabled={busy} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7a8a99] hover:text-[#dc2626] hover:bg-red-50 cursor-pointer disabled:opacity-50" title="Delete sub category">
                                <i className="ri-delete-bin-line" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSub(); } }}
                        placeholder="New sub category e.g. Church, Social Group"
                        className="flex-1 px-3 py-2.5 border border-[#e8edf2] rounded-lg text-sm text-[#001731] focus:outline-none focus:border-[#0d5959]"
                      />
                      <button
                        onClick={handleAddSub}
                        disabled={busy || !newSubName.trim()}
                        className="shrink-0 inline-flex items-center gap-1.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50"
                      >
                        <i className={busy ? 'ri-loader-4-line animate-spin' : 'ri-add-line'} /> Add
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`flex items-center gap-2 px-6 py-4 border-t border-[#e8edf2] flex-wrap ${showFullEditor ? 'justify-between' : 'justify-end'}`}>
            {showFullEditor && (
              <button
                onClick={() => navigate('/admin/amenities/categories/new')}
                className="inline-flex items-center gap-1.5 text-[#0d5959] hover:bg-[#eef7f5] px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap"
              >
                <i className="ri-add-circle-line" /> New category
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-[#4b5563] hover:bg-[#f7f8fa] rounded-lg cursor-pointer whitespace-nowrap"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      <CategoryDeleteDecision
        target={deleteTarget}
        categories={categories}
        onClose={() => setDeleteTarget(null)}
        onDone={() => onChanged()}
      />
    </>
  );
}