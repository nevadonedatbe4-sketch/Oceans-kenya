import { useEffect, useRef, useState } from 'react';

export interface RowMenuItem {
  key: string;
  icon: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

interface RowMoreMenuProps {
  /** Shown as a small heading inside the menu (e.g. the row's name). */
  label?: string;
  items: RowMenuItem[];
  /** 'right' anchors the dropdown to the button's right edge. */
  align?: 'left' | 'right';
  /** Accessible label for the trigger button. */
  triggerLabel?: string;
}

const MENU_WIDTH = 208;
const HEADER_HEIGHT = 34;
const ITEM_HEIGHT = 42;

/**
 * Compact "⋮" row-action control used by every data table. All actions live in
 * one dropdown so the Actions column never has to expose several inline
 * buttons. The panel is rendered with fixed positioning so it can never be
 * clipped by a table's horizontal scroll container.
 */
export default function RowMoreMenu({
  label,
  items,
  align = 'right',
  triggerLabel = 'More actions',
}: RowMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const menuHeight = (label ? HEADER_HEIGHT : 8) + items.length * ITEM_HEIGHT + 8;

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const openMenu = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const preferredLeft = align === 'right' ? rect.right - MENU_WIDTH : rect.left;
    const maxLeft = Math.max(8, window.innerWidth - MENU_WIDTH - 8);
    const left = Math.min(Math.max(8, preferredLeft), maxLeft);
    const top =
      rect.bottom + menuHeight > window.innerHeight
        ? Math.max(8, rect.top - menuHeight)
        : rect.bottom + 6;
    setPos({ top, left });
    setOpen(true);
  };

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div className="flex items-center justify-end">
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          if (open) setOpen(false);
          else openMenu();
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
          open
            ? 'bg-[#0d5959] text-white border-[#0d5959]'
            : 'bg-white text-[#33414f] border-[#e0e8f0] hover:bg-[#f2f6f8]'
        }`}
      >
        <i className="ri-more-2-fill text-lg" />
      </button>

      {open && pos && (
        <div
          ref={menuRef}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: MENU_WIDTH }}
          className="z-[95] bg-white rounded-xl border border-[#dbe4ec] py-1 overflow-hidden"
        >
          {label && (
            <p className="px-3.5 pt-1.5 pb-2 text-[12px] font-roboto font-semibold uppercase tracking-wider text-[#7a8a99] truncate">
              {label}
            </p>
          )}
          {items.map((item, index) => (
            <div key={item.key}>
              {item.danger && index > 0 && <div className="h-px bg-[#eef2f6] my-1" />}
              <button
                role="menuitem"
                onClick={() => run(item.onSelect)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[15px] font-roboto font-medium cursor-pointer ${
                  item.danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-[#33414f] hover:bg-[#f2f6f8]'
                }`}
              >
                <i className={`${item.icon} text-base ${item.danger ? '' : 'text-[#0d5959]'}`} />
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}