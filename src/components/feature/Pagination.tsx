interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Reusable, uniform pagination used across every listing page.
 * Consistent position (bottom center), page numbers, prev/next and active state.
 */
export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
  }

  const prevClass =
    'w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-base border-2 border-[#002349] text-[#002349] hover:bg-[#002349] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#002349] cursor-pointer transition-colors whitespace-nowrap';
  const nextClass = prevClass;

  return (
    <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={prevClass}
        aria-label="Previous page"
      >
        <i className="ri-arrow-left-s-line"></i>
      </button>

      {pages.map((item, idx) =>
        item === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-sm font-roboto font-bold text-primary/50"
          >
            &hellip;
          </span>
        ) : (
          <button
            type="button"
            key={item}
            onClick={() => onPageChange(item)}
            aria-current={currentPage === item ? 'page' : undefined}
            className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-sm font-roboto font-bold cursor-pointer rounded-lg border transition-colors whitespace-nowrap ${
              currentPage === item
                ? 'bg-primary text-white border-primary'
                : 'text-primary border-primary/20 hover:border-primary hover:text-primary'
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={nextClass}
        aria-label="Next page"
      >
        <i className="ri-arrow-right-s-line"></i>
      </button>
    </nav>
  );
}