import type { CalendarAppointment } from '../calendarTypes';
import { KIND_COLOR, startOfDay } from '../calendarTypes';

// ─────────────────────────────────────────────────────────────
// COMPANY SCHEDULE GRID — a staff-oriented availability view.
// Rows = team members, columns = hours of one day. Busy slots show
// the appointment (or "Busy" for a masked private one); empty slots
// are clickable to book straight into that agent's calendar.
// ─────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 07:00 → 19:00

interface Props {
  events: CalendarAppointment[];
  day: Date;
  agents: { user_id: string; name: string }[];
  onSelect: (a: CalendarAppointment) => void;
  onSlotClick: (agentId: string, day: Date, hour: number) => void;
  getAgentColor: (id: string | null) => string | null;
}

function slotFor(events: CalendarAppointment[], agentId: string, day: Date, hour: number): CalendarAppointment | undefined {
  const dayStart = startOfDay(day);
  const hStart = new Date(dayStart); hStart.setHours(hour, 0, 0, 0);
  const hEnd = new Date(hStart); hEnd.setHours(hour + 1, 0, 0, 0);
  return events.find((a) => {
    if (a.assigned_user_id !== agentId) return false;
    if (a.status === 'cancelled') return false;
    const s = new Date(a.starts_at);
    const e = new Date(a.ends_at);
    return s < hEnd && e > hStart;
  });
}

export default function CompanyScheduleGrid({ events, day, agents, onSelect, onSlotClick, getAgentColor }: Props) {
  const isToday = startOfDay(day).toDateString() === new Date().toDateString();

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[900px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white text-left px-3 py-2 border-b border-neutral-100 min-w-[160px]">
              <span className="text-xs font-semibold text-neutral-500">
                {day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                {isToday && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700">Today</span>}
              </span>
            </th>
            {HOURS.map((h) => (
              <th key={h} className="px-1 py-2 border-b border-l border-neutral-50 text-center">
                <span className="text-[11px] font-medium text-neutral-400">{String(h).padStart(2, '0')}:00</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => {
            const color = getAgentColor(agent.user_id) || '#0d9488';
            return (
              <tr key={agent.user_id}>
                <td className="sticky left-0 z-10 bg-white px-3 py-2 border-b border-neutral-50">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
                      {agent.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-xs font-medium text-neutral-700 truncate max-w-[110px]">{agent.name}</span>
                  </div>
                </td>
                {HOURS.map((h) => {
                  const appt = slotFor(events, agent.user_id, day, h);
                  if (appt) {
                    const masked = appt.masked;
                    return (
                      <td key={h} className="border-b border-l border-neutral-50 p-0.5 align-top">
                        <button
                          type="button"
                          onClick={() => onSelect(appt)}
                          title={appt.title}
                          className={`w-full h-12 rounded-md px-1.5 py-1 text-left cursor-pointer ${masked ? 'bg-neutral-100 text-neutral-400' : `${KIND_COLOR[appt.kind] || 'bg-teal-500'} text-white`}`}
                        >
                          <span className="block text-[10px] font-semibold truncate">
                            {masked ? 'Busy' : new Date(appt.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="block text-[10px] truncate">{masked ? 'Private' : appt.title}</span>
                        </button>
                      </td>
                    );
                  }
                  return (
                    <td key={h} className="border-b border-l border-neutral-50 p-0.5 align-top">
                      <button
                        type="button"
                        onClick={() => onSlotClick(agent.user_id, day, h)}
                        title={`Book ${agent.name} at ${String(h).padStart(2, '0')}:00`}
                        className="group w-full h-12 rounded-md hover:bg-teal-50/70 cursor-pointer flex items-center justify-center transition-colors"
                      >
                        <i className="ri-add-line text-neutral-200 group-hover:text-teal-500 text-sm" />
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex items-center gap-4 px-3 py-3 text-[11px] text-neutral-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-teal-500" /> Booked</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-neutral-200" /> Private (busy)</span>
        <span className="flex items-center gap-1.5"><i className="ri-add-line text-teal-500" /> Free — click to book</span>
      </div>
    </div>
  );
}