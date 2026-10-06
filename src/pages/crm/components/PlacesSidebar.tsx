import { useMemo, useState, type ReactNode } from 'react';
import { categoryColor, categoryRecordName, type AmenityCategoryRecord } from '@/lib/amenities';
import type { AmenityFolder } from '@/lib/directory';
import CategoryIcon from '@/components/base/CategoryIcon';

export type PlacesView =
  | 'all'
  | 'important'
  | 'starred'
  | 'flagged'
  | 'needs-review'
  | 'published'
  | 'unpublished'
  | 'archived'
  | 'recycle-bin'
  | { folder: string };

export interface PlaceSection {
  key: string;
  label: string;
  icon: string;
  count?: number;
  view: PlacesView;
}

interface PlacesSidebarProps {
  open: boolean;
  categories: AmenityCategoryRecord[];
  folders: AmenityFolder[];
  activeView: PlacesView;
  counts: Record<string, number>;
  categoryCounts: Record<string, number>;
  selectedCategory: string | null;
  onSelectView: (view: PlacesView) => void;
  onSelectCategory: (id: string | null) => void;
  onSelectFolder: (id: string) => void;
  onNewFolder: () => void;
}

function activeKey(view: PlacesView, selectedCategory: string | null): string {
  if (typeof view === 'object' && 'folder' in view) return `folder-${view.folder}`;
  if (selectedCategory) return `cat-${selectedCategory}`;
  return view;
}

function viewMatches(selectedCategory: string | null, catId: string): boolean {
  return !!selectedCategory && selectedCategory === catId;
}

function SectionHeader({
  label,
  collapsed,
  onToggle,
  trailing,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between pr-0.5">
      <button
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-md text-[12px] font-jost font-semibold uppercase tracking-[0.14em] text-[#7a8a99] hover:text-[#0d5959] hover:bg-[#e3ebf0] transition-colors cursor-pointer"
      >
        <i className={`${collapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-down-s-line'} text-base`} />
        <span>{label}</span>
      </button>
      {trailing}
    </div>
  );
}

export default function PlacesSidebar({
  open,
  categories,
  folders,
  activeView,
  counts,
  categoryCounts,
  selectedCategory,
  onSelectView,
  onSelectCategory,
  onSelectFolder,
  onNewFolder,
}: PlacesSidebarProps) {
  const primarySections: { key: string; label: string; icon: string; view: PlacesView; countKey: string }[] = [
    { key: 'all', label: 'All Places & Services', icon: 'ri-mail-open-line', view: 'all', countKey: 'all' },
    { key: 'important', label: 'Important', icon: 'ri-star-fill', view: 'important', countKey: 'important' },
    { key: 'starred', label: 'Starred', icon: 'ri-star-line', view: 'starred', countKey: 'starred' },
    { key: 'flagged', label: 'Flagged', icon: 'ri-flag-fill', view: 'flagged', countKey: 'flagged' },
    { key: 'published', label: 'Published', icon: 'ri-eye-line', view: 'published', countKey: 'published' },
    { key: 'unpublished', label: 'Unpublished', icon: 'ri-eye-off-line', view: 'unpublished', countKey: 'unpublished' },
    { key: 'archived', label: 'Archived', icon: 'ri-inbox-archive-line', view: 'archived', countKey: 'archived' },
    { key: 'recycle-bin', label: 'Recycle Bin', icon: 'ri-delete-bin-line', view: 'recycle-bin', countKey: 'recycle' },
  ];

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [categories],
  );

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setCollapsed((p) => ({ ...p, [key]: !p[key] }));

  const active = activeKey(activeView, selectedCategory);

  const rowClass = (isActive: boolean) =>
    `w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[15px] font-roboto transition-colors cursor-pointer ${
      isActive ? 'bg-[#0d5959] text-white font-semibold' : 'text-[#33414f] font-medium hover:bg-[#e3ebf0]'
    }`;

  return (
    <aside
      className={`${open ? 'flex' : 'hidden'} lg:flex flex-col shrink-0 w-full lg:w-64 bg-[#f2f6f8] border-r border-[#e0e8f0] overflow-hidden rounded-xl lg:rounded-none`}
    >
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
        {/* Places & Services */}
        <nav>
          <SectionHeader
            label="Places & Services"
            collapsed={!!collapsed.views}
            onToggle={() => toggleSection('views')}
          />
          {!collapsed.views && (
            <div className="space-y-0.5 mt-0.5">
              {primarySections.map((s) => {
                const isActive = active === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      onSelectCategory(null);
                      onSelectView(s.view);
                    }}
                    className={rowClass(isActive)}
                  >
                    <i className={`${s.icon} text-[17px] ${isActive ? 'text-white' : 'text-[#0d5959]'}`} />
                    <span className="flex-1 text-left truncate">{s.label}</span>
                    {counts[s.countKey] != null && (
                      <span className={`text-[15px] font-semibold tabular-nums ${isActive ? 'text-white/90' : 'text-[#7a8a99]'}`}>{counts[s.countKey]}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* Categories */}
        <nav>
          <SectionHeader
            label="Categories"
            collapsed={!!collapsed.categories}
            onToggle={() => toggleSection('categories')}
          />
          {!collapsed.categories && (
            <div className="space-y-0.5 mt-0.5">
              {sortedCategories.map((c) => {
                const isActive = viewMatches(selectedCategory, c.id);
                const total = categoryCounts[c.id];
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelectCategory(isActive ? null : c.id)}
                    className={rowClass(isActive)}
                  >
                    <CategoryIcon
                      icon={c.icon || 'ri-store-2-line'}
                      color={c.color || categoryColor(c.slug)}
                      size="sm"
                    />
                    <span className="flex-1 text-left truncate">{categoryRecordName(c)}</span>
                    {total != null && (
                      <span className={`text-[15px] font-semibold tabular-nums ${isActive ? 'text-white/90' : 'text-[#7a8a99]'}`}>{total}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* Folders */}
        <nav>
          <SectionHeader
            label="Folders"
            collapsed={!!collapsed.folders}
            onToggle={() => toggleSection('folders')}
            trailing={
              <button onClick={onNewFolder} className="w-7 h-7 flex items-center justify-center rounded-md text-[#0d5959] hover:bg-[#e3ebf0] cursor-pointer" title="New folder">
                <i className="ri-add-line text-lg" />
              </button>
            }
          />
          {!collapsed.folders && (
            <div className="space-y-0.5 mt-0.5">
              {folders.length === 0 ? (
                <button onClick={onNewFolder} className="w-full text-left px-2.5 py-1.5 rounded-lg text-[15px] font-medium text-[#7a8a99] hover:bg-[#e3ebf0] cursor-pointer">
                  Create your first folder…
                </button>
              ) : (
                folders.map((f) => {
                  const isActive = active === `folder-${f.id}`;
                  const color = f.color || 'var(--color-accent)';
                  return (
                    <button
                      key={f.id}
                      onClick={() => onSelectFolder(f.id)}
                      className={rowClass(isActive)}
                    >
                      <i className={`${f.icon || 'ri-folder-2-line'} text-[17px] ${isActive ? 'text-white' : 'text-[#0d5959]'}`} style={!isActive ? { color } : undefined} />
                      <span className="flex-1 text-left truncate">{f.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
}