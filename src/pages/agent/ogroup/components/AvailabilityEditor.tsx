import { useEffect, useState } from 'react';
import type { AvailabilityRow, TimeOffRow } from '../calendarTypes';
import { WEEKDAYS, WEEKDAY_LABELS } from '../calendarTypes';

interface Props {
  availability: AvailabilityRow[];
  timeOff: TimeOffRow[];
  onSaveAvailability: (rows: Omit<AvailabilityRow, 'id'>[]) => Promise<void>;
  onAddTimeOff: (row: Omit<TimeOffRow, 'id' | 'user_id'>) => Promise<void>;
  onRemoveTimeOff: (id: string) => Promise<void>;
}

interface SlotEdit { start: string; end: string; is_working: boolean; }

export default function AvailabilityEditor({ availability, timeOff, onSaveAvailability, onAddTimeOff, onRemoveTimeOff }: Props) {
  const [slots, setSlots] = useState<Record<number, SlotEdit>>({
    0: { start: '09:00', end: '17:00', is_working: true },
    1: { start: '09:00', end: '17:00', is_working: true },
    2: { start: '09:00', end: '17:00', is_working: true },
    3: { start: '09:00', end: '17:00', is_working: true },
    4: { start: '09:00', end: '17:00', is_working: true },
    5: { start: '09:00', end: '17:00', is_working: false },
    6: { start: '09:00', end: '17:00', is_working: false },
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // Hydrate from existing rows once.
  useEffect(() => {
    if (!availability.length) return;
    const next: Record<number, SlotEdit> = {};
    WEEKDAYS.forEach((_name, i) => {
      const row = availability.find((a) => a.weekday === i);
      next[i] = {
        start: row ? row.start_time.slice(0, 5) : '09:00',
        end: row ? row.end_time.slice(0, 5) : '17:00',
        is_working: row ? row.is_working : false,
      };
    });
    setSlots(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSlot = (i: number, patch: Partial<SlotEdit>) => {
    setSlots((prev) => ({ ...prev, [i]: { ...prev[i], ...patch } }));
  };

  const save = async () => {
    setBusy(true);
    try {
      const rows = WEEKDAYS.map((_name, i) => ({
        user_id: '',
        weekday: i,
        start_time: `${slots[i].start}:00`,
        end_time: `${slots[i].end}:00`,
        is_working: slots[i].is_working,
      }));
      await onSaveAvailability(rows);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-neutral-100 overflow-hidden">
        <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-neutral-800">Weekly working hours</h3>
            <p className="text-xs text-neutral-400">Set when you're available for bookings. Slots default to weekdays 9–5.</p>
          </div>
          <button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 cursor-pointer disabled:opacity-50 whitespace-nowrap">
            {saved ? 'Saved ✓' : busy ? 'Saving...' : 'Save hours'}
          </button>
        </div>
        <div className="divide-y divide-neutral-50">
          {WEEKDAYS.map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-2.5">
              <span className={`w-12 text-sm font-medium ${slots[i].is_working ? 'text-neutral-700' : 'text-neutral-400'}`}>{WEEKDAY_LABELS[i]}</span>
              <button
                type="button"
                onClick={() => updateSlot(i, { is_working: !slots[i].is_working })}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${slots[i].is_working ? 'bg-teal-500' : 'bg-neutral-200'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${slots[i].is_working ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
              {slots[i].is_working ? (
                <div className="flex items-center gap-1.5 text-sm">
                  <input type="time" value={slots[i].start} onChange={(e) => updateSlot(i, { start: e.target.value })} className="px-2 py-1 border border-neutral-100 rounded-md bg-neutral-50 text-neutral-700 focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  <span className="text-neutral-300">→</span>
                  <input type="time" value={slots[i].end} onChange={(e) => updateSlot(i, { end: e.target.value })} className="px-2 py-1 border border-neutral-100 rounded-md bg-neutral-50 text-neutral-700 focus:outline-none focus:ring-1 focus:ring-teal-500" />
                </div>
              ) : (
                <span className="text-xs text-neutral-400">Day off</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Time off */}
      <div className="rounded-2xl border border-neutral-100 p-5">
        <h3 className="text-base font-medium text-neutral-800 mb-3">Time off & blocked slots</h3>
        {timeOff.length > 0 && (
          <div className="space-y-2 mb-3">
            {timeOff.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2">
                <i className={`${t.kind === 'holiday' ? 'ri-earth-line' : 'ri-time-line'} text-neutral-400`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-700 capitalize">{t.kind} <span className="font-normal text-neutral-400">· {t.notes || ''}</span></p>
                  <p className="text-xs text-neutral-400">{new Date(t.starts_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} → {new Date(t.ends_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <button onClick={() => onRemoveTimeOff(t.id)} className="text-neutral-400 hover:text-red-500 cursor-pointer"><i className="ri-delete-bin-line" /></button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-neutral-400 mb-2">When you're on time off, booking slots during that window are blocked so no one can double-book you.</p>
        <AddTimeOffRow onAdd={onAddTimeOff} />
      </div>
    </div>
  );
}

function AddTimeOffRow({ onAdd }: { onAdd: (row: Omit<TimeOffRow, 'id' | 'user_id'>) => Promise<void> }) {
  const [kind, setKind] = useState('vacation');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!start || !end) return;
    setBusy(true);
    try {
      await onAdd({
        kind,
        starts_at: new Date(start).toISOString(),
        ends_at: new Date(end).toISOString(),
        notes: notes.trim() || null,
      });
      setStart(''); setEnd(''); setNotes('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div>
        <label className="text-[11px] font-semibold text-neutral-400">Type</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="mt-0.5 px-2 py-1.5 border border-neutral-100 rounded-md bg-neutral-50 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500">
          <option value="vacation">Vacation</option><option value="personal">Personal</option><option value="holiday">Holiday</option><option value="blocked">Blocked</option>
        </select>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-neutral-400">Starts</label>
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="mt-0.5 px-2 py-1.5 border border-neutral-100 rounded-md bg-neutral-50 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-neutral-400">Ends</label>
        <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-0.5 px-2 py-1.5 border border-neutral-100 rounded-md bg-neutral-50 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div className="flex-1 min-w-[120px]">
        <label className="text-[11px] font-semibold text-neutral-400">Note</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="mt-0.5 px-2 py-1.5 border border-neutral-100 rounded-md bg-neutral-50 text-sm w-full focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <button onClick={add} disabled={busy || !start || !end} className="px-3 py-1.5 rounded-md bg-neutral-800 text-white text-xs font-medium hover:bg-neutral-900 cursor-pointer disabled:opacity-40 whitespace-nowrap">Add</button>
    </div>
  );
}