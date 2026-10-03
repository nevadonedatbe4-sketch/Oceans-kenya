export interface DevelopmentTab {
  id: string;
  label: string;
  icon: string;
}

interface DevelopmentTabsProps {
  tabs: DevelopmentTab[];
  /** The id of the currently active tab. */
  active: string;
  onChange: (id: string) => void;
}

/**
 * DevelopmentTabs - top-level segmented navigation for a development page
 * (e.g. Floor Plans). The active pill fills with the brand colour; the rest
 * stay quiet. Renders nothing when there are no tabs.
 */
export default function DevelopmentTabs({ tabs, active, onChange }: DevelopmentTabsProps) {
  if (tabs.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label="Development sections"
      className="inline-flex flex-wrap items-center gap-1 p-1 bg-white border border-[#e5e5e5] rounded-full max-w-full"
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              isActive ? 'bg-primary text-white' : 'text-primary/70 hover:bg-primary/5'
            }`}
          >
            <i className={`${t.icon} text-base`}></i>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}