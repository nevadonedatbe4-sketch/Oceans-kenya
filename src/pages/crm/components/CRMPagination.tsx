interface CRMPaginationProps {
  page: number;
  totalPages?: number;
  pageSize?: number;
  total?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  /** Visual tone. Use 'light' when the control sits on a dark background. */
  tone?: 'dark' | 'light';
  /**
   * When true (with the default 'dark' tone), renders light text on small screens
   * and dark text at lg+. Use when the control's container is dark on mobile but
   * white on desktop.
   */
  mobileLight?: boolean;
}

export default function CRMPagination({
  page,
  totalPages: totalPagesProp,
  pageSize = 10,
  total = 0,
  onPageChange,
  onPageSizeChange,
  tone = 'dark',
  mobileLight = false,
}: CRMPaginationProps) {
  const totalPages = totalPagesProp ?? Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const isLight = tone === 'light';
  const isMobileLight = !isLight && mobileLight;

  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  const pageBtn = (isActive: boolean) =>
    `w-9 h-9 flex items-center justify-center rounded-lg border text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
      isActive
        ? 'bg-[#001731] text-white border-[#001731] font-bold'
        : isLight
          ? 'border-white/25 text-white hover:bg-white/10 hover:border-white/40'
          : isMobileLight
            ? 'border-white/25 text-white hover:bg-white/10 lg:border-[#001731] lg:text-[#001731] lg:hover:bg-[#001731]/10 lg:hover:border-[#001731]'
            : 'border-[#001731] text-[#001731] hover:bg-[#001731]/10 hover:border-[#001731]'
    }`;

  const navBtn = isLight
    ? 'border-white/25 text-white hover:bg-white/10'
    : isMobileLight
      ? 'border-white/25 text-white hover:bg-white/10 lg:border-[#001731] lg:text-[#001731] lg:hover:bg-[#001731]/10'
      : 'border-[#001731] text-[#001731] hover:bg-[#001731]/10';

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
      <span className={`text-sm font-semibold ${isLight ? 'text-white/70' : isMobileLight ? 'text-white/70 lg:text-[#001731]' : 'text-[#001731]'}`}>
        Showing {total === 0 ? 0 : start}–{end} of {total}
      </span>

      <div className="flex items-center justify-center">
        <ul className="flex items-center justify-center gap-1.5 list-none m-0 p-0">
          <li>
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              aria-label="Previous"
              className={`w-9 h-9 flex items-center justify-center rounded-lg border font-semibold transition-colors disabled:opacity-40 cursor-pointer ${navBtn}`}
            >
              <i className="ri-arrow-left-s-line text-base" />
            </button>
          </li>
          {pages.map((p) => (
            <li key={p}>
              <button
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={pageBtn(p === page)}
              >
                {p}
              </button>
            </li>
          ))}
          <li>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              aria-label="Next"
              className={`w-9 h-9 flex items-center justify-center rounded-lg border font-semibold transition-colors disabled:opacity-40 cursor-pointer ${navBtn}`}
            >
              <i className="ri-arrow-right-s-line text-base" />
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}