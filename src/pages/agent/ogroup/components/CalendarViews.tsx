import { useState } from 'react';
import type { CalendarAppointment } from '../calendarTypes';
import {
  fmtTime, KIND_COLOR, KIND_LABELS, STATUS_LABELS, STATUS_COLOR,
  startOfDay,
} from '../calendarTypes';

// ─────────────────────────────────────────────────────────────
// SHARED CALENDAR VIEWS — Month / Week / 3-day / Day / Agenda.
// Both the agent and admin calendars render through these so the
// grid, drag & drop targets and empty states stay identical.
// ─────────────────────────────────────────────────────────────

export interface ViewCommonProps {
  events: CalendarAppointment[];
  current: Date;
  onSelect: (a: CalendarAppointment) => void;
  onDayClick: (d: Date) => void;
  dragId: string | null;
  onDragStart: (a: CalendarAppointment) => void;
  onDragEnd: () => void;
  onDropDay: (day: Date) => void;
  onDropHour?: (day: Date, hour: number) => void;
  getAgentColor?: (id: string | null) => string | null;
  getAgentName?: (id: string | null) => string;
}

function sameDay(iso: string, d: Date): boolean {
  const s = new Date(iso);
  return s.getFullYear() === d.getFullYear() && s.getMonth() === d.getMonth() && s.getDate() === d.getDate();
}

function eventsOn(events: CalendarAppointment[], d: Date): CalendarAppointment[] {
  return events
    .filter((a) => sameDay(a.starts_at, d))
    .sort((x, y) => new Date(x.starts_at).getTime() - new Date(y.starts_at).getTime());
}

// ── Month ────────────────────────────────────────────────────
export function MonthView({
  cells, events, current, onSelect, onDayClick, dragId, onDragStart, onDragEnd, onDropDay,
}: ViewCommonProps & { cells: Date[] }) {
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-neutral-100 text-center">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="py-2 text-xs font-semibold text-neutral-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const dateEvents = eventsOn(events, d);
          const inMonth = d.getMonth() === current.getMonth();
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div
              key={i}
              onClick={() => onDayClick(d)}
              onDragOver={(e) => { if (dragId) e.preventDefault(); }}
              onDrop={() => dragId && onDropDay(d)}
              className={`min-h-[92px] border-b border-r border-neutral-50 p-1.5 cursor-pointer hover:bg-neutral-50/60 transition-colors ${inMonth ? '' : 'bg-neutral-50/40'}`}
            >
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${isToday ? 'bg-teal-600 text-white' : 'text-neutral-500'}`}>{d.getDate()}</span>
              <div className="space-y-0.5 mt-1">
                {dateEvents.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    draggable
                    onDragStart={() => onDragStart(a)}
                    onDragEnd={onDragEnd}
                    onClick={(e) => { e.stopPropagation(); onSelect(a); }}
                    className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate text-white flex items-center gap-1 cursor-pointer ${KIND_COLOR[a.kind] || 'bg-neutral-400'} ${dragId === a.id ? 'opacity-40' : ''}`}
                  >
                    <span className="w-1 h-1 rounded-full bg-white/80 flex-shrink-0" />
                    <span className="truncate">{a.title}</span>
                  </button>
                ))}
                {dateEvents.length > 3 && <span className="text-[10px] text-neutral-400 px-1">+{dateEvents.length - 3} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week & 3-day (shared multi-day column grid) ──────────────
export function MultiDayView({
  days, events, current, onSelect, onDayClick, dragId, onDragStart, onDragEnd, onDropDay, getAgentColor, getAgentName,
}: ViewCommonProps & { days: Date[] }) {
  return (
    <div className={`grid min-h-[440px] ${days.length === 3 ? 'grid-cols-3' : 'grid-cols-7'}`}>
      {days.map((d, i) => {
        const evs = eventsOn(events, d);
        const isToday = d.toDateString() === new Date().toDateString();
        return (
          <div key={i} className="border-r border-neutral-50 last:border-r-0 flex flex-col">
            <div
              onClick={() => onDayClick(d)}
              onDragOver={(e) => { if (dragId) e.preventDefault(); }}
              onDrop={() => dragId && onDropDay(d)}
              className={`py-2 text-center cursor-pointer hover:bg-neutral-50/60 ${isToday ? 'bg-teal-50/50' : ''}`}
            >
              <p className="text-[10px] uppercase font-semibold text-neutral-400">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</p>
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold ${isToday ? 'bg-teal-600 text-white' : 'text-neutral-700'}`}>{d.getDate()}</span>
            </div>
            <div
              className="flex-1 p-1.5 space-y-1"
              onDragOver={(e) => { if (dragId) e.preventDefault(); }}
              onDrop={() => dragId && onDropDay(d)}
            >
              {evs.map((a) => {
                const color = getAgentColor?.(a.assigned_user_id);
                return (
                  <button
                    key={a.id}
                    draggable
                    onDragStart={() => onDragStart(a)}
                    onDragEnd={onDragEnd}
                    onClick={() => onSelect(a)}
                    className={`w-full text-left rounded-md px-2 py-1 border bg-white hover:bg-neutral-50 cursor-pointer ${dragId === a.id ? 'opacity-40' : ''} ${color ? 'border-l-4' : 'border-neutral-100'}`}
                    style={color ? { borderLeftColor: color } : undefined}
                  >
                    <span className={`block text-[10px] font-semibold ${KIND_COLOR[a.kind] || 'text-neutral-500'}`}>{fmtTime(a.starts_at)}</span>
                    <span className="block text-xs text-neutral-700 truncate font-medium">{a.title}</span>
                    <span className="block text-[10px] text-neutral-400 truncate">
                      {getAgentName ? getAgentName(a.assigned_user_id) : (a.client_name || a.property_title || KIND_LABELS[a.kind] || a.kind)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Day (hourly drop targets) ────────────────────────────────
const DAY_HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00 → 21:00

export function DayView({ events, current, onSelect, dragId, onDragStart, onDragEnd, onDropHour, onDropDay }: ViewCommonProps) {
  const dayEvents = eventsOn(events, current);
  if (dayEvents.length === 0) {
    return (
      <div
        className="p-3 min-h-[420px]"
        onDragOver={(e) => { if (dragId) e.preventDefault(); }}
        onDrop={() => dragId && onDropDay(startOfDay(current))}
      >
        <div className="flex flex-col items-center justify-center py-24 text-neutral-300">
          <i className="ri-calendar-line text-4xl" />
          <p className="text-sm text-neutral-400 mt-2">Your calendar is clear</p>
          <p className="text-xs text-neutral-400 mt-1">No appointments are scheduled for this day.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="p-2 min-h-[420px]">
      {DAY_HOURS.map((hour) => {
        const slot = dayEvents.filter((a) => new Date(a.starts_at).getHours() === hour);
        return (
          <div
            key={hour}
            onDragOver={(e) => { if (dragId) e.preventDefault(); }}
            onDrop={() => { if (dragId && onDropHour) onDropHour(current, hour); }}
            className="flex gap-3 border-b border-neutral-50 last:border-b-0 min-h-[46px] hover:bg-neutral-50/40 transition-colors"
          >
            <span className="w-12 flex-shrink-0 pt-1.5 text-[11px] font-medium text-neutral-400">{String(hour).padStart(2, '0')}:00</span>
            <div className="flex-1 py-1 space-y-1">
              {slot.map((a) => (
                <button
                  key={a.id}
                  draggable
                  onDragStart={() => onDragStart(a)}
                  onDragEnd={onDragEnd}
                  onClick={() => onSelect(a)}
                  className={`w-full flex items-center gap-3 rounded-lg border border-neutral-100 p-2 hover:bg-white cursor-pointer text-left ${dragId === a.id ? 'opacity-40' : 'bg-white'}`}
                >
                  <span className={`w-1.5 self-stretch rounded-full ${KIND_COLOR[a.kind] || 'bg-neutral-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{a.title}</p>
                    <p className="text-[11px] text-neutral-400 truncate">{a.client_name || a.property_title || KIND_LABELS[a.kind] || a.kind}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-medium text-neutral-600">{fmtTime(a.starts_at)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLOR[a.status] || 'bg-neutral-100 text-neutral-500'}`}>{STATUS_LABELS[a.status] || a.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Agenda (list grouped by day) ─────────────────────────────
export function AgendaView({ events, onSelect, getAgentName, onEdit, onReschedule, onCancel }: {
  events: CalendarAppointment[];
  onSelect: (a: CalendarAppointment) => void;
  getAgentName?: (id: string | null) => string;
  onEdit?: (a: CalendarAppointment) => void;
  onReschedule?: (a: CalendarAppointment) => void;
  onCancel?: (a: CalendarAppointment) => void;
}) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const groups = new Map<string, CalendarAppointment[]>();
  events
    .slice()
    .sort((x, y) => new Date(x.starts_at).getTime() - new Date(y.starts_at).getTime())
    .forEach((a) => {
      const key = startOfDay(new Date(a.starts_at)).toISOString();
      groups.set(key, [...(groups.get(key) || []), a]);
    });

  if (!groups.size) {
    return (
      <EmptyState icon="ri-calendar-line" title="Nothing scheduled" body="No appointments match the current view and filters." />
    );
  }

  return (
    <div className="divide-y divide-neutral-100">
      {[...groups.entries()].map(([key, items]) => (
        <div key={key} className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
            {new Date(key).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <div className="space-y-2">
            {items.map((a) => (
              <div key={a.id} className="relative flex items-center gap-3 rounded-xl border border-neutral-100 p-3 hover:bg-neutral-50">
                <button onClick={() => onSelect(a)} className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer">
                  <div className="w-12 flex-shrink-0 text-right">
                    <p className="text-sm font-semibold text-neutral-700">{fmtTime(a.starts_at)}</p>
                    <p className="text-[10px] text-neutral-400">{fmtTime(a.ends_at)}</p>
                  </div>
                  <span className={`w-1.5 self-stretch rounded-full ${KIND_COLOR[a.kind] || 'bg-neutral-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{a.title}</p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {[a.client_name, getAgentName?.(a.assigned_user_id)].filter(Boolean).join(' · ') || KIND_LABELS[a.kind]}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLOR[a.status] || 'bg-neutral-100 text-neutral-500'}`}>{STATUS_LABELS[a.status] || a.status}</span>
                </button>
                {(onEdit || onReschedule || onCancel) && (
                  <div className="relative flex-shrink-0">
                    <button onClick={() => setMenuId(menuId === a.id ? null : a.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-400 cursor-pointer"><i className="ri-more-2-fill" /></button>
                    {menuId === a.id && (
                      <div className="absolute right-0 top-8 z-30 w-40 bg-white border border-neutral-100 rounded-xl shadow-xl py-1" onMouseLeave={() => setMenuId(null)}>
                        <button onClick={() => { setMenuId(null); onSelect(a); }} className="w-full text-left px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50 cursor-pointer flex items-center gap-2"><i className="ri-eye-line" />View</button>
                        {onEdit && <button onClick={() => { setMenuId(null); onEdit(a); }} className="w-full text-left px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50 cursor-pointer flex items-center gap-2"><i className="ri-edit-line" />Edit</button>}
                        {onReschedule && <button onClick={() => { setMenuId(null); onReschedule(a); }} className="w-full text-left px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50 cursor-pointer flex items-center gap-2"><i className="ri-calendar-schedule-line" />Reschedule</button>}
                        {onCancel && <button onClick={() => { setMenuId(null); onCancel(a); }} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer flex items-center gap-2"><i className="ri-close-circle-line" />Cancel</button>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <span className="w-14 h-14 flex items-center justify-center rounded-full bg-neutral-50 text-neutral-300"><i className={`${icon} text-2xl`} /></span>
      <p className="text-sm font-medium text-neutral-600 mt-3">{title}</p>
      <p className="text-xs text-neutral-400 mt-1 max-w-xs">{body}</p>
    </div>
  );
}

// small helper for pages that need it
export function useLocalDrag() {
  const [dragId, setDragId] = useState<string | null>(null);
  return { dragId, setDragId };
}