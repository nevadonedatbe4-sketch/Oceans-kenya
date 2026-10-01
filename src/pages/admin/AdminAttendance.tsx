import { useState } from 'react';
import AttendanceDashboard from './attendance/AttendanceDashboard';
import TeamTimesheets from './attendance/TeamTimesheets';
import AttendanceReports from './attendance/AttendanceReports';
import CorrectionsQueue from './attendance/CorrectionsQueue';
import AttendanceSettings from './attendance/AttendanceSettings';
import MemberDayModal from './attendance/MemberDayModal';
import type { MemberRow } from './attendance/attendanceUtils';

type Tab = 'dashboard' | 'timesheets' | 'reports' | 'corrections' | 'settings';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
  { key: 'timesheets', label: 'Team Timesheets', icon: 'ri-table-line' },
  { key: 'reports', label: 'Reports', icon: 'ri-bar-chart-box-line' },
  { key: 'corrections', label: 'Corrections', icon: 'ri-error-warning-line' },
  { key: 'settings', label: 'Settings', icon: 'ri-settings-3-line' },
];

export default function AdminAttendance() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Attendance &amp; Time Tracking</h1>
          <p className="text-sm text-[#9fb0c3] mt-0.5">Punches, timesheets, reports and shift settings — attendance is fully separate from online presence</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap bg-[#001731] border border-[#1c3a5e] rounded-full p-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} aria-pressed={tab === t.key}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${tab === t.key ? 'bg-[#0d5959] text-white' : 'text-[#9ca3af] hover:text-white'}`}>
              <i className={t.icon} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'dashboard' && <AttendanceDashboard key={reloadKey} onOpenMember={(m) => setSelected(m)} />}
      {tab === 'timesheets' && <TeamTimesheets />}
      {tab === 'reports' && <AttendanceReports />}
      {tab === 'corrections' && <CorrectionsQueue />}
      {tab === 'settings' && <AttendanceSettings />}

      {selected && (
        <MemberDayModal member={selected} onClose={() => setSelected(null)}
          onDone={() => setReloadKey((k) => k + 1)} />
      )}
    </div>
  );
}