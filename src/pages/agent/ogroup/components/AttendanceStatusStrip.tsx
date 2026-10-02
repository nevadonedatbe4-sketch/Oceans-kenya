import { usePageContent } from '@/hooks/usePageContent';
import { DEFAULT_CHECKIN_COPY } from '@/lib/ogroupCopy';
import type { AttendanceState } from '../useAttendance';

interface Props {
  signedIn: boolean;
  state: AttendanceState;
  timesheetActive: boolean;
}

/**
 * Three INDEPENDENT states shown side by side so being signed in can never be
 * mistaken for being punched in:
 *   • Account    — Signed in / Signed out
 *   • Attendance — Not punched in / Punched in / On break
 *   • Timesheet  — Not started / Active
 */
export default function AttendanceStatusStrip({ signedIn, state, timesheetActive }: Props) {
  const { content: c } = usePageContent('ogroup_checkin', DEFAULT_CHECKIN_COPY);

  const attendance = state === 'on_break'
    ? { text: c.state_on_break, dot: 'bg-amber-500', cls: 'text-amber-700 border-amber-200 bg-amber-50' }
    : state === 'punched_in'
      ? { text: c.state_punched_in, dot: 'bg-emerald-500', cls: 'text-emerald-700 border-emerald-200 bg-emerald-50' }
      : { text: c.strip_not_punched_in, dot: 'bg-neutral-400', cls: 'text-neutral-600 border-neutral-200 bg-neutral-50' };

  const items = [
    {
      key: 'account',
      label: c.strip_account,
      value: signedIn ? c.strip_signed_in : c.strip_signed_out,
      dot: signedIn ? 'bg-emerald-500' : 'bg-neutral-400',
      cls: signedIn ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-neutral-600 border-neutral-200 bg-neutral-50',
      icon: signedIn ? 'ri-shield-user-line' : 'ri-logout-box-r-line',
    },
    {
      key: 'attendance',
      label: c.strip_attendance,
      value: attendance.text,
      dot: attendance.dot,
      cls: attendance.cls,
      icon: 'ri-fingerprint-2-line',
    },
    {
      key: 'timesheet',
      label: c.strip_timesheet,
      value: timesheetActive ? c.strip_active : c.strip_not_started,
      dot: timesheetActive ? 'bg-sky-500' : 'bg-neutral-400',
      cls: timesheetActive ? 'text-sky-700 border-sky-200 bg-sky-50' : 'text-neutral-600 border-neutral-200 bg-neutral-50',
      icon: 'ri-file-list-3-line',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((it) => (
        <div key={it.key} className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3.5 py-3">
          <span className="w-9 h-9 rounded-xl bg-neutral-50 text-neutral-500 flex items-center justify-center flex-shrink-0">
            <i className={`${it.icon} text-lg`} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">{it.label}</p>
            <span className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${it.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${it.dot}`} />
              {it.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}