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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#e8edf2]">
      <div className="flex items-center gap-2">
        <span className="text-xs font-roboto text-[#7a8a99]">
          Showing {total === 0 ? 0 : start}–{end} of {total}
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-xs font-roboto text-[#7a8a99] border border-[#e8edf2] rounded-md px-2 py-1 bg-white cursor-pointer"
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
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e8edf2] text-[#7a8a99] hover:bg-[#f8fafc] hover:text-[#001731] transition-colors disabled:opacity-40 cursor-pointer"
        >
          <i className="ri-arrow-left-s-line" />
        </button>

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-roboto transition-colors cursor-pointer ${
              p === page
                ? 'bg-[#0d5959] text-white'
                : 'text-[#7a8a99] hover:bg-[#f8fafc] hover:text-[#001731]'
            }`}
          >
            {p}
          </button>
        ))}

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e8edf2] text-[#7a8a99] hover:bg-[#f8fafc] hover:text-[#001731] transition-colors disabled:opacity-40 cursor-pointer"
        >
          <i className="ri-arrow-right-s-line" />
        </button>
      </div>
    </div>
  );
}