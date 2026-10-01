import { useQuickSet } from '../QuickSetProvider';

/**
 * Header entry for the global Quick Set Appointment action.
 * Sits in the portal top bar next to the primary page actions.
 */
export function QuickSetHeaderButton({ label = 'Quick Set' }: { label?: string }) {
  const { openQuickSet } = useQuickSet();
  return (
    <button
      type="button"
      onClick={() => openQuickSet()}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00ddb4] text-[#001731] text-xs font-roboto font-semibold hover:bg-[#00c9a3] transition-all cursor-pointer whitespace-nowrap"
    >
      <i className="ri-calendar-2-line text-sm" />
      <span className="hidden lg:inline">{label} Appointment</span>
      <span className="lg:hidden">{label}</span>
    </button>
  );
}

/**
 * Prominent sidebar entry for the global Quick Set Appointment action.
 * Kept for sidebars that still want the in-nav entry point.
 */
export function QuickSetSidebarButton({ onDone }: { onDone?: () => void }) {
  const { openQuickSet } = useQuickSet();
  return (
    <button
      type="button"
      onClick={() => { openQuickSet(); onDone?.(); }}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-md bg-[#0d5959] hover:bg-[#0a4747] text-white text-sm font-roboto font-semibold transition-all cursor-pointer"
    >
      <span className="w-5 h-5 flex items-center justify-center shrink-0"><i className="ri-calendar-2-line text-base" /></span>
      <span className="flex-1 text-left">Quick Set Appointment</span>
      <i className="ri-add-line text-base" />
    </button>
  );
}

/**
 * Inline variant for page toolbars (e.g. the agent Appointments / CRM pages).
 */
export function QuickSetButton({ label = 'New appointment', className }: { label?: string; className?: string }) {
  const { openQuickSet } = useQuickSet();
  return (
    <button
      type="button"
      onClick={() => openQuickSet()}
      className={className || 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 cursor-pointer whitespace-nowrap'}
    >
      <i className="ri-add-line" />{label}
    </button>
  );
}