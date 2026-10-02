import { useState } from 'react';
import { usePageContent } from '@/hooks/usePageContent';
import { DEFAULT_CHECKIN_COPY } from '@/lib/ogroupCopy';
import type { BreakType } from '../useAttendance';

interface Props {
  breakTypes: BreakType[];
  busy: boolean;
  onCancel: () => void;
  onSelect: (name: string, id: string) => void;
}

export default function BreakTypePicker({ breakTypes, busy, onCancel, onSelect }: Props) {
  const { content: c } = usePageContent('ogroup_checkin', DEFAULT_CHECKIN_COPY);
  const [selected, setSelected] = useState<string>(breakTypes[0]?.id || '');
  const list = breakTypes.length ? breakTypes : [{ id: 'other', name: 'Other', paid: false }];
  const chosen = list.find((b) => b.id === selected) || list[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl p-5 border border-neutral-200">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-neutral-900">{c.break_title}</h3>
          <button onClick={onCancel} className="text-neutral-400 hover:text-neutral-600 cursor-pointer"><i className="ri-close-line text-xl" /></button>
        </div>
        <p className="text-xs text-neutral-500 mb-4">{c.break_subtitle}</p>

        <div className="space-y-2">
          {list.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelected(b.id)}
              className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors cursor-pointer ${selected === b.id ? 'border-neutral-800 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50'}`}
            >
              <span className="flex items-center gap-2.5">
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected === b.id ? 'border-neutral-800' : 'border-neutral-300'}`}>
                  {selected === b.id && <span className="w-2 h-2 rounded-full bg-neutral-800" />}
                </span>
                <span className="text-sm font-medium text-neutral-800">{b.name}</span>
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${b.paid ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                {b.paid ? c.break_paid : c.break_unpaid}
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-neutral-500 hover:bg-neutral-50 cursor-pointer">{c.break_cancel}</button>
          <button
            onClick={() => onSelect(chosen.name, chosen.id)}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
          >
            {busy ? c.break_starting : c.break_start}
          </button>
        </div>
      </div>
    </div>
  );
}