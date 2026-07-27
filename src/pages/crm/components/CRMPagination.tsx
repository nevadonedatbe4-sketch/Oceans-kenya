interface CRMPaginationProps {
  page: number;
  totalPages?: number;
  pageSize?: number;
  total?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export default function CRMPagination({
  page,
  totalPages: totalPagesProp,
  pageSize = 10,
  total = 0,
  onPageChange,
  onPageSizeChange,
}: CRMPaginationProps) {
  const totalPages = totalPagesProp ?? Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-stone-100">
      <div className="flex items-center gap-2.5">
        <span className="text-sm text-stone-600">
          Showing {total === 0 ? 0 : start}–{end} of {total}
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-sm text-stone-600 border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors disabled:opacity-40 cursor-pointer"
        >
          <i className="ri-arrow-left-s-line" />
        </button>

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors cursor-pointer ${
              p === page
                ? 'bg-accent text-white'
                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-800'
            }`}
          >
            {p}
          </button>
        ))}

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors disabled:opacity-40 cursor-pointer"
        >
          <i className="ri-arrow-right-s-line" />
        </button>
      </div>
    </div>
  );
}