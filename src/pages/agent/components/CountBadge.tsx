/**
 * Agent Portal notification badge — compact, responsive, hidden at zero.
 * Used for Inbox & Leads counts in the sidebar and top header.
 */
export default function CountBadge({ count, label }: { count: number; label?: string }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#e11d48] text-white text-[10px] font-bold leading-none flex-shrink-0"
      aria-label={`${count} ${label || 'new'}`}
      title={`${count} ${label || 'new'}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}