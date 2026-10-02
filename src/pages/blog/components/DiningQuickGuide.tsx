interface QuickGuideItem {
  key: string;
  label: string;
  icon: string;
  count: number;
}

interface DiningQuickGuideProps {
  items: QuickGuideItem[];
  className?: string;
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * The "quick guide" - practical answers to the reader's real questions ("where
 * for brunch?", "where with kids?", "where for business?") built from the same
 * venue records. Each tile jumps to the matching section. Occasions with no
 * venues are never shown, so it can't advertise an empty category.
 */
export default function DiningQuickGuide({ items, className = '' }: DiningQuickGuideProps) {
  const visible = items.filter((i) => i.count > 0);
  if (visible.length === 0) return null;

  return (
    <section id="quick-guide" className={`scroll-mt-28 ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 flex items-center justify-center rounded-full bg-accent-100 text-accent-700 shrink-0">
          <i className="ri-flashlight-line text-lg"></i>
        </span>
        <div>
          <h2 className="font-prata font-semibold text-primary text-[22px] md:text-[27px] leading-tight">
            The quick guide
          </h2>
          <p className="font-roboto text-[14px] text-[#636363]">
            Jump straight to what you need - each one is backed by the venues below.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {visible.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => scrollToId(`occasion-${item.key}`)}
            className="group text-left flex items-center gap-3 bg-background-100 border-2 border-primary/12 rounded-lg px-4 py-3.5 hover:border-primary/30 transition-colors cursor-pointer"
          >
            <span className="w-9 h-9 flex items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
              <i className={`${item.icon} text-[17px]`}></i>
            </span>
            <span className="min-w-0">
              <span className="block font-roboto text-[13.5px] font-medium text-primary leading-snug">
                {item.label}
              </span>
              <span className="block font-roboto text-[12px] text-[#7a7a7a]">
                {item.count} {item.count === 1 ? 'place' : 'places'}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}