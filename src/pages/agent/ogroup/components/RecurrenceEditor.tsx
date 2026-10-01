import { useState } from 'react';
import type { RecurrenceRule } from '../calendarTypes';
import { WEEKDAY_LABELS, toDateInput } from '../calendarTypes';
import { RECURRENCE_PRESETS, presetForRule, describeRecurrence } from '../recurrence';

interface Props {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

const INPUT = 'w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-white';

type EndMode = 'never' | 'until' | 'count';

/** Recurrence builder — preset + interval + weekly days + end condition. */
export default function RecurrenceEditor({ value, onChange }: Props) {
  const [preset, setPreset] = useState(presetForRule(value));
  const [interval, setInterval] = useState(value?.interval || 1);
  const [byWeekday, setByWeekday] = useState<number[]>(value?.byWeekday || []);
  const [endMode, setEndMode] = useState<EndMode>(value?.count ? 'count' : value?.until ? 'until' : 'never');
  const [until, setUntil] = useState(value?.until ? toDateInput(new Date(value.until)) : '');
  const [count, setCount] = useState(value?.count || 8);

  const apply = (next: {
    preset?: typeof preset; interval?: number; byWeekday?: number[];
    endMode?: EndMode; until?: string; count?: number;
  }) => {
    const p = next.preset ?? preset;
    const iv = next.interval ?? interval;
    const days = next.byWeekday ?? byWeekday;
    const em = next.endMode ?? endMode;
    const un = next.until ?? until;
    const ct = next.count ?? count;

    setPreset(p); setInterval(iv); setByWeekday(days); setEndMode(em); setUntil(un); setCount(ct);

    if (p === 'none') { onChange(null); return; }
    const frequency = p === 'custom' ? 'weekly' : (p as 'daily' | 'weekly' | 'monthly');
    const rule: RecurrenceRule = {
      frequency,
      interval: Math.max(1, iv || 1),
      byWeekday: frequency === 'weekly' && days.length ? days : undefined,
      until: em === 'until' && un ? new Date(`${un}T23:59:59`).toISOString() : null,
      count: em === 'count' ? Math.max(1, ct || 1) : null,
    };
    onChange(rule);
  };

  const toggleDay = (idx: number) => {
    const days = byWeekday.includes(idx) ? byWeekday.filter((d) => d !== idx) : [...byWeekday, idx].sort();
    apply({ byWeekday: days, preset: preset === 'none' ? 'custom' : preset });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select value={preset} onChange={(e) => apply({ preset: e.target.value as typeof preset })} className={INPUT}>
          {RECURRENCE_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {(preset === 'custom' || preset === 'daily' || preset === 'weekly' || preset === 'monthly') && preset !== 'none' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 whitespace-nowrap">Every</span>
            <input type="number" min={1} max={12} value={interval} onChange={(e) => apply({ interval: Number(e.target.value) })} className={`${INPUT} w-16`} />
            <span className="text-xs text-neutral-500">{preset === 'monthly' ? 'month(s)' : preset === 'daily' ? 'day(s)' : 'week(s)'}</span>
          </div>
        )}
      </div>

      {preset === 'custom' && (
        <div>
          <p className="text-[11px] font-medium text-neutral-500 mb-1">Repeat on</p>
          <div className="flex gap-1">
            {WEEKDAY_LABELS.map((label, idx) => {
              const active = byWeekday.includes(idx);
              return (
                <button key={label} type="button" onClick={() => toggleDay(idx)} className={`flex-1 py-1.5 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${active ? 'bg-teal-600 text-white' : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'}`}>{label}</button>
              );
            })}
          </div>
        </div>
      )}

      {preset !== 'none' && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 bg-neutral-50 rounded-full p-1">
            {(['never', 'until', 'count'] as EndMode[]).map((m) => (
              <button key={m} type="button" onClick={() => apply({ endMode: m })} className={`px-3 py-1 rounded-full text-[11px] font-medium cursor-pointer whitespace-nowrap ${endMode === m ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
                {m === 'never' ? 'Never ends' : m === 'until' ? 'Ends on' : 'Ends after'}
              </button>
            ))}
          </div>
          {endMode === 'until' && <input type="date" value={until} onChange={(e) => apply({ until: e.target.value })} className={`${INPUT} w-auto`} />}
          {endMode === 'count' && (
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={60} value={count} onChange={(e) => apply({ count: Number(e.target.value) })} className={`${INPUT} w-16`} />
              <span className="text-xs text-neutral-500 whitespace-nowrap">occurrences</span>
            </div>
          )}
        </div>
      )}

      {value && <p className="text-[11px] text-teal-700 flex items-center gap-1"><i className="ri-loop-right-line" /> {describeRecurrence(value)}</p>}
    </div>
  );
}