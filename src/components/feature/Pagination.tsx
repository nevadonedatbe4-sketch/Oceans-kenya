interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const ELLIPSIS = 'ellipsis';
type Cell = number | typeof ELLIPSIS;

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i += 1) out.push(i);
  return out;
}

/**
 * Compact set used on phones - never more than 4 cells so the whole control
 * always fits a 320px viewport without horizontal scrolling.
 */
function buildCompactCells(current: number, total: number): Cell[] {
  if (total <= 4) return range(1, total);
  if (current <= 2) return [1, 2, ELLIPSIS, total];
  if (current >= total - 1) return [1, ELLIPSIS, total - 1, total];
  return [1, ELLIPSIS, current, total];
}

/** Windowed set used from tablet up - never more than 7 cells. */
function buildFullCells(current: number, total: number): Cell[] {
  if (total <= 7) return range(1, total);
  const cells: Cell[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) cells.push(ELLIPSIS);
  for (let i = start; i <= end; i += 1) cells.push(i);
  if (end < total - 1) cells.push(ELLIPSIS);
  cells.push(total);
  return cells;
}

interface PagerProps {
  cells: Cell[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  size: 'compact' | 'full';
}

function Pager({ cells, currentPage, totalPages, onPageChange, size }: PagerProps) {
  const square = size === 'compact' ? 'w-11 h-11' : 'w-10 h-10';
  const navBtnClass =
    `${square} flex items-center justify-center text-base border-2 border-primary text-primary rounded-none ` +
    'hover:bg-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed ' +
    'disabled:hover:bg-transparent disabled:hover:text-primary cursor-pointer transition-colors whitespace-nowrap';

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={navBtnClass}
        aria-label="Previous page"
      >
        <i className="ri-arrow-left-s-line"></i>
      </button>

      {cells.map((cell, idx) =>
        cell === ELLIPSIS ? (
          <span
            key={`ellipsis-${idx}`}
            aria-hidden="true"
            className={`${size === 'compact' ? 'w-5' : 'w-8'} h-11 md:h-10 flex items-center justify-center text-sm font-roboto font-bold text-primary/40`}
          >
            &hellip;
          </span>
        ) : (
          <button
            type="button"
            key={cell}
            onClick={() => onPageChange(cell)}
            aria-current={currentPage === cell ? 'page' : undefined}
            aria-label={`Page ${cell}`}
            className={`${square} flex items-center justify-center text-sm font-roboto font-bold rounded-none border-2 transition-colors cursor-pointer whitespace-nowrap ${
              currentPage === cell
                ? 'bg-primary text-white border-primary'
                : 'text-primary border-primary/20 hover:border-primary hover:text-primary'
            }`}
          >
            {cell}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={navBtnClass}
        aria-label="Next page"
      >
        <i className="ri-arrow-right-s-line"></i>
      </button>
    </div>
  );
}

/**
 * Reusable, uniform pagination used across every listing page.
 * Phones get a compact numbered range (always fits the viewport); tablets and
 * desktop get the wider windowed range. Absolutely positioned nowhere - it
 * simply sits directly beneath the results.
 */
export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const compactCells = buildCompactCells(currentPage, totalPages);
  const fullCells = buildFullCells(currentPage, totalPages);

  return (
    <nav className="mt-6 md:mt-10" aria-label="Pagination">
      <div className="sm:hidden">
        <Pager
          cells={compactCells}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          size="compact"
        />
      </div>
      <div className="hidden sm:block">
        <Pager
          cells={fullCells}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          size="full"
        />
      </div>
    </nav>
  );
}