import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import { categoryColorVar, type AmenityCategoryRecord } from '@/lib/amenities';

interface CategoryColourPanelProps {
  categories: AmenityCategoryRecord[];
  onChanged: () => Promise<void> | void;
  onClose: () => void;
}

/**
 * Category Colours panel.
 *
 * Persisted config → CSS variable → component. These colours are stored in the
 * `amenity_categories.color` column (the persisted seed/configuration layer),
 * applied to root CSS variables (`--amenity-cat-color-<slug>`), and consumed by
 * every card / icon / badge / table dot that references that category. This
 * panel's own chrome consumes the same design-system tokens (primary / accent /
 * golden) it edits — no literal hex values in this UI.
 */
export default function CategoryColourPanel({ categories, onChanged, onClose }: CategoryColourPanelProps) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>();

  // Apply each persisted category colour to its CSS variable on mount.
  useEffect(() => {
    const root = document.documentElement;
    categories.forEach((c) => {
      if (c.color) root.style.setProperty(categoryColorVar(c.slug), c.color);
    });
  }, [categories]);

  // Seed the draft from the persisted config when the panel opens.
  useEffect(() => {
    setDraft(Object.fromEntries(categories.map((c) => [c.id, c.color || '#6B4423'])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyVar = (c: AmenityCategoryRecord, hex: string) => {
    document.documentElement.style.setProperty(categoryColorVar(c.slug), hex);
  };

  const persist = (c: AmenityCategoryRecord, hex: string) => {
    return supabase.from('amenity_categories').update({ color: hex }).eq('id', c.id).then(({ error }) => {
      if (error) {
        addToast('Failed to save category colour', 'error');
      } else {
        addToast(`Saved colour for ${c.name}`, 'success');
        onChanged();
      }
    });
  };

  // Debounce per-category persistence so typing never spams the DB.
  const schedulePersist = (c: AmenityCategoryRecord, hex: string) => {
    const key = c.id;
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => {
      persist(c, hex);
      delete timers.current[key];
    }, 600);
  };

  const handleColor = (c: AmenityCategoryRecord, hex: string) => {
    setDraft((prev) => ({ ...prev, [c.id]: hex }));
    applyVar(c, hex); // immediate preview
    schedulePersist(c, hex);
  };

  const handleReset = (c: AmenityCategoryRecord) => {
    const hex = c.color || '#6B4423';
    setDraft((prev) => ({ ...prev, [c.id]: hex }));
    applyVar(c, hex);
  };

  const resetAll = () => {
    categories.forEach((c) => {
      const hex = c.color || '#6B4423';
      setDraft((prev) => ({ ...prev, [c.id]: hex }));
      applyVar(c, hex);
    });
  };

  return (
    <div className="bg-white rounded-xl border border-accent/20 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-accent/10 flex items-center justify-center">
            <i className="ri-palette-line text-accent text-base" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary">Category Colours</h3>
            <p className="text-xs text-primary/60">
              Customise the accent colour for each amenity category. Changes apply instantly across the website.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-md text-primary/60 hover:text-primary hover:bg-accent/10 cursor-pointer flex-shrink-0"
          aria-label="Close colour palette"
        >
          <i className="ri-close-line text-lg" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((c) => {
          const hex = draft[c.id] || c.color || '#6B4423';
          return (
            <div key={c.id} className="flex items-center gap-3 border border-accent/20 rounded-lg p-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-md text-white shrink-0" style={{ backgroundColor: hex }}>
                <i className={c.icon || 'ri-store-2-line'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-primary">{c.name}</p>
                <p className="text-xs text-primary/60">{hex}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => handleColor(c, e.target.value)}
                  className="w-8 h-8 rounded border border-accent/20 cursor-pointer bg-white p-0.5"
                  aria-label={`Set colour for ${c.name}`}
                />
                <button
                  onClick={() => handleReset(c)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-primary/60 hover:text-accent hover:bg-accent/10 cursor-pointer"
                  title="Reset to current saved colour"
                  aria-label={`Reset colour for ${c.name}`}
                >
                  <i className="ri-refresh-line text-sm" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={resetAll}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-primary/60 hover:bg-accent/10 cursor-pointer whitespace-nowrap"
        >
          <i className="ri-refresh-line" /> Reset previews
        </button>
        <button
          onClick={() => {
            setBusy(true);
            Promise.all(
              categories.map((c) => {
                const hex = draft[c.id];
                if (hex && hex !== c.color) return persist(c, hex);
                return Promise.resolve();
              }),
            ).finally(() => {
              setBusy(false);
              onClose();
            });
          }}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent/90 cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          <i className="ri-save-line" /> {busy ? 'Saving…' : 'Save all'}
        </button>
      </div>
    </div>
  );
}