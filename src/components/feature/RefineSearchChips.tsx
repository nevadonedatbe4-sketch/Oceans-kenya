import { useAuth } from '@/hooks/useAuth';
import { useFilterChips, type FilterChip } from '@/hooks/useFilterChips';

export interface RefineFilterOptions {
  beds?: string;
  type?: string;
  search?: string;
}

interface RefineSearchChipsProps {
  page: 'buy' | 'rent';
  onFilterChange: (opts: RefineFilterOptions) => void;
  onNavigate: (link: string) => void;
}

/**
 * Backend-driven "Refine your search" chips for the listing sidebar.
 *
 * Which chips appear is decided entirely by the Filter Chips config in the
 * backend: per page, per role, ordering and active state. A chip either applies
 * an internal filter (e.g. beds=Studio) or follows its own destination link.
 */
export default function RefineSearchChips({ page, onFilterChange, onNavigate }: RefineSearchChipsProps) {
  const { chips } = useFilterChips();
  const { user } = useAuth();
  const currentRole = user?.role || 'public';

  const visible = chips
    .filter((c) => c.active)
    .filter((c) => c.pages.length === 0 || c.pages.includes(page))
    .filter((c) => c.roles.length === 0 || c.roles.includes(currentRole))
    .sort((a, b) => a.order - b.order);

  if (visible.length === 0) return null;

  const handleClick = (chip: FilterChip) => {
    if (chip.link) {
      onNavigate(chip.link);
      return;
    }
    const [rawKey, ...rest] = chip.filterKey.split('=');
    const key = (rawKey || '').trim().toLowerCase();
    const value = rest.join('=').trim();
    if (!key || !value) return;
    if (key === 'beds') onFilterChange({ beds: value });
    else if (key === 'type') onFilterChange({ type: value });
    else onFilterChange({ search: value });
  };

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {visible.map((chip) => (
        <button
          key={chip.id}
          type="button"
          title={chip.tooltip || undefined}
          onClick={() => handleClick(chip)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-base font-roboto font-medium text-primary/85 bg-background-100 border border-primary/12 rounded-md hover:bg-primary hover:text-white hover:border-primary transition-colors cursor-pointer whitespace-nowrap"
        >
          {chip.icon && (
            <span className="w-4 h-4 flex items-center justify-center">
              <i className={`${chip.icon} text-base`}></i>
            </span>
          )}
          {chip.label}
        </button>
      ))}
    </div>
  );
}