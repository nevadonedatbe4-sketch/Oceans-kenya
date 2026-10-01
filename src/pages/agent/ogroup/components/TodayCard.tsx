import type { AttendanceSession, AttendanceState, AttendancePolicy, WorkSchedule } from '../useAttendance';
import { fmtTime, fmtDur, liveBreakSec, type AccentTheme } from '../checkInTheme';

interface Props {
  session: AttendanceSession | null;
  state: AttendanceState;
  policy: AttendancePolicy | null;
  schedule: WorkSchedule | null;
  now: number;
  busy: boolean;
  theme: AccentTheme;
}

function expectedSec(schedule: WorkSchedule | null, policy: AttendancePolicy | null): number {
  if (schedule?.start_time && schedule?.end_time) {
    const [sh, sm] = schedule.start_time.split(':').map(Number);
    const [eh, em] = schedule.end_time.split(':').map(Number);
    return Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) * 60);
  }
  if (policy?.work_start_time && policy?.work_end_time) {
    const [sh, sm] = policy.work_start_time.split(':').map(Number);
    const [eh, em] = policy.work_end_time.split(':').map(Number);
    return Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) * 60);
  }
  return 8 * 3600;
}

export default function TodayCard({ session, state, policy, schedule, now, theme }: Props) {
  const expected = expectedSec(schedule, policy);
  const gross = session ? Math.max(0, Math.floor((now - new Date(session.clock_in_at).getTime()) / 1000)) : 0;
  const breakTotal = session ? liveBreakSec(session, now) : 0;
  const worked = Math.max(0, gross - breakTotal);
  const remaining = Math.max(0, expected - worked);

  const meta = state === 'on_break'
    ? { label: 'On break', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: 'ri-cup-line' }
    : state === 'punched_in'
      ? { label: 'Punched in', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: 'ri-checkbox-circle-line' }
      : { label: 'Off clock', cls: 'bg-neutral-100 text-neutral-500 border-neutral-200', dot: 'bg-neutral-400', icon: 'ri-circle-line' };

  const stats: { label: string; value: string; icon: string }[] = [
    { label: 'Started', value: session ? fmtTime(session.clock_in_at) : '—', icon: 'ri-login-circle-line' },
    { label: state === 'on_break' ? 'Break started' : 'Current session', value: state === 'on_break' ? fmtTime(session?.break_started_at || null) : fmtDur(gross), icon: state === 'on_break' ? 'ri-cup-line' : 'ri-timer-line' },
    { label: 'Break total', value: fmtDur(breakTotal), icon: 'ri-cup-line' },
    { label: 'Expected', value: fmtDur(expected), icon: 'ri-calendar-check-line' },
    { label: 'Worked', value: fmtDur(worked), icon: 'ri-briefcase-line' },
    { label: 'Est. remaining', value: fmtDur(remaining), icon: 'ri-hourglass-line' },
  ];

  return (
    <div className="rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <i className={`ri-dashboard-line ${theme.softText}`} />
          <p className="text-sm font-semibold text-neutral-800">Today</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${meta.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
            <i className={`${s.icon} text-neutral-400`} />
            <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold mt-2">{s.label}</p>
            <p className="text-base font-bold text-neutral-900 tabular-nums mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}