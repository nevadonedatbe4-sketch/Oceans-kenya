import ManagementLayout from '../ManagementLayout';
import ContentSchemaEditor, { type TabSchema } from './ContentSchemaEditor';
import { invalidatePageContent } from '@/hooks/usePageContent';
import { DEFAULT_CHECKIN_COPY } from '@/lib/ogroupCopy';

/**
 * One shot at the copy for the whole OGroup punch-clock area: the Punch Clock
 * page, its status/alerts, the break picker and the punch-in location modal.
 *
 * Every field maps to `page_ogroup_checkin_<field>` in `site_settings` — the
 * same shared `usePageContent('ogroup_checkin', …)` the clock components read.
 */
const TABS: TabSchema[] = [
  {
    key: 'page', label: 'Punch Clock Page', icon: 'ri-fingerprint-2-line',
    fields: [
      { key: 'page_title', label: 'Page title', type: 'text' },
      { key: 'page_subtitle', label: 'Page subtitle', type: 'text' },
      { key: 'greet_morning', label: 'Greeting — morning', type: 'text' },
      { key: 'greet_afternoon', label: 'Greeting — afternoon', type: 'text' },
      { key: 'greet_evening', label: 'Greeting — evening', type: 'text' },
      { key: 'label_punched_in_at', label: 'Hero — "Punched in at"', type: 'text' },
      { key: 'label_elapsed', label: 'Hero — "Elapsed"', type: 'text' },
      { key: 'label_today', label: 'Hero — "Today"', type: 'text' },
      { key: 'punch_in_label', label: 'Punch-in button label', type: 'text' },
      { key: 'punch_in_hint', label: 'Punch-in hint', type: 'textarea' },
      { key: 'state_active', label: 'Active pill label', type: 'text' },
      { key: 'btn_end_break', label: 'End break button', type: 'text' },
      { key: 'btn_break', label: 'Break button', type: 'text' },
      { key: 'btn_punch_out', label: 'Punch out button', type: 'text' },
      { key: 'state_on_break', label: 'State — On break', type: 'text' },
      { key: 'state_punched_in', label: 'State — Punched in', type: 'text' },
      { key: 'state_off_clock', label: 'State — Off clock', type: 'text' },
      { key: 'presence_online', label: 'Presence — Online', type: 'text' },
      { key: 'presence_away', label: 'Presence — Away', type: 'text' },
      { key: 'presence_offline', label: 'Presence — Offline', type: 'text' },
      { key: 'request_correction', label: '"Request correction" link', type: 'text' },
      { key: 'location_punch_in', label: 'Location card — has location', type: 'text' },
      { key: 'location_none', label: 'Location card — no location', type: 'text' },
      { key: 'note_label', label: 'Note — label', type: 'text' },
      { key: 'note_placeholder', label: 'Note — placeholder', type: 'text' },
      { key: 'note_add', label: 'Note — "Add a note"', type: 'text' },
    ],
  },
  {
    key: 'content', label: 'Sections & Alerts', icon: 'ri-alert-line',
    fields: [
      { key: 'open_shift_title', label: 'Open shift — title', type: 'text' },
      { key: 'open_shift_body', label: 'Open shift — text', type: 'textarea', hint: 'Use {date} and {time}.' },
      { key: 'auto_closed_title', label: 'Auto punched out — title', type: 'text' },
      { key: 'auto_closed_body', label: 'Auto punched out — text', type: 'textarea', hint: 'Use {hours} and {time}.' },
      { key: 'limit_title', label: 'Approaching limit — title', type: 'text', hint: 'Use {hours}.' },
      { key: 'limit_body', label: 'Approaching limit — text', type: 'textarea', hint: 'Use {remaining}.' },
      { key: 'stat_total_today', label: 'Stat — Total today', type: 'text' },
      { key: 'stat_late_today', label: 'Stat — Late today', type: 'text' },
      { key: 'stat_overtime_today', label: 'Stat — Overtime today', type: 'text' },
      { key: 'appts_title', label: 'Appointments — heading', type: 'text' },
      { key: 'appts_empty', label: 'Appointments — empty', type: 'text' },
      { key: 'sessions_title', label: 'Sessions — heading', type: 'text' },
      { key: 'sessions_timesheet', label: 'Sessions — timesheet link', type: 'text' },
      { key: 'sessions_empty', label: 'Sessions — empty', type: 'text' },
      { key: 'col_in', label: 'Table column — In', type: 'text' },
      { key: 'col_out', label: 'Table column — Out', type: 'text' },
      { key: 'col_break', label: 'Table column — Break', type: 'text' },
      { key: 'col_worked', label: 'Table column — Worked', type: 'text' },
      { key: 'col_status', label: 'Table column — Status', type: 'text' },
      { key: 'loading', label: 'Loading label', type: 'text' },
      { key: 'error_sign_in_again', label: 'Session expired — button', type: 'text' },
      { key: 'toast_punch_in_title', label: 'Toast — punched in', type: 'text' },
      { key: 'toast_punch_in_sub', label: 'Toast — punched in sub', type: 'text' },
      { key: 'toast_punch_out_title', label: 'Toast — punched out', type: 'text' },
      { key: 'toast_punch_out_sub', label: 'Toast — punched out sub', type: 'text', hint: 'Use {duration}.' },
      { key: 'toast_break_start_title', label: 'Toast — break started', type: 'text' },
      { key: 'toast_break_start_sub', label: 'Toast — break started sub', type: 'text' },
      { key: 'toast_break_end_title', label: 'Toast — back on clock', type: 'text' },
      { key: 'toast_break_end_sub', label: 'Toast — back on clock sub', type: 'text', hint: 'Use {duration}.' },
      { key: 'correction_title', label: 'Correction dialog — title', type: 'text' },
      { key: 'correction_hint', label: 'Correction dialog — hint', type: 'textarea' },
      { key: 'correction_reason_label', label: 'Correction — reason label', type: 'text' },
      { key: 'correction_reason_placeholder', label: 'Correction — reason placeholder', type: 'text' },
      { key: 'correction_time_label', label: 'Correction — time label', type: 'text' },
      { key: 'correction_cancel', label: 'Correction — cancel', type: 'text' },
      { key: 'correction_submit', label: 'Correction — submit', type: 'text' },
      { key: 'correction_submitting', label: 'Correction — submitting', type: 'text' },
    ],
  },
  {
    key: 'breaks', label: 'Breaks & Status', icon: 'ri-cup-line',
    fields: [
      { key: 'break_title', label: 'Break picker — title', type: 'text' },
      { key: 'break_subtitle', label: 'Break picker — subtitle', type: 'text' },
      { key: 'break_paid', label: 'Break — Paid badge', type: 'text' },
      { key: 'break_unpaid', label: 'Break — Unpaid badge', type: 'text' },
      { key: 'break_cancel', label: 'Break — Cancel', type: 'text' },
      { key: 'break_start', label: 'Break — Start button', type: 'text' },
      { key: 'break_starting', label: 'Break — Starting…', type: 'text' },
      { key: 'strip_account', label: 'Status strip — Account', type: 'text' },
      { key: 'strip_attendance', label: 'Status strip — Attendance', type: 'text' },
      { key: 'strip_timesheet', label: 'Status strip — Timesheet', type: 'text' },
      { key: 'strip_signed_in', label: 'Status — Signed in', type: 'text' },
      { key: 'strip_signed_out', label: 'Status — Signed out', type: 'text' },
      { key: 'strip_not_punched_in', label: 'Status — Not punched in', type: 'text' },
      { key: 'strip_active', label: 'Status — Active', type: 'text' },
      { key: 'strip_not_started', label: 'Status — Not started', type: 'text' },
      { key: 'today_title', label: 'Today card — title', type: 'text' },
      { key: 'today_started', label: 'Today card — Started', type: 'text' },
      { key: 'today_current_session', label: 'Today card — Current session', type: 'text' },
      { key: 'today_break_started', label: 'Today card — Break started', type: 'text' },
      { key: 'today_break_total', label: 'Today card — Break total', type: 'text' },
      { key: 'today_expected', label: 'Today card — Expected', type: 'text' },
      { key: 'today_worked', label: 'Today card — Worked', type: 'text' },
      { key: 'today_remaining', label: 'Today card — Est. remaining', type: 'text' },
    ],
  },
  {
    key: 'location', label: 'Location Confirmation', icon: 'ri-map-pin-2-line',
    fields: [
      { key: 'pm_title', label: 'Modal — title', type: 'text' },
      { key: 'pm_subtitle', label: 'Modal — subtitle', type: 'text' },
      { key: 'pm_detecting_title', label: 'Detecting — title', type: 'text' },
      { key: 'pm_detecting_hint', label: 'Detecting — hint', type: 'textarea' },
      { key: 'pm_checking_title', label: 'Checking — title', type: 'text' },
      { key: 'pm_checking_hint', label: 'Checking — hint', type: 'text' },
      { key: 'pm_detected_title', label: 'Detected — title', type: 'text' },
      { key: 'pm_low_acc_title', label: 'Low accuracy — title', type: 'text' },
      { key: 'pm_low_acc_hint', label: 'Low accuracy — hint', type: 'textarea', hint: 'Use {accuracy}.' },
      { key: 'pm_change_location', label: '"Change location" link', type: 'text' },
      { key: 'pm_try_again', label: 'Try again button', type: 'text' },
      { key: 'pm_search_manually', label: 'Search manually button', type: 'text' },
      { key: 'pm_search_title', label: 'Search — title', type: 'text' },
      { key: 'pm_search_back', label: 'Search — Back link', type: 'text' },
      { key: 'pm_search_placeholder', label: 'Search — placeholder', type: 'text' },
      { key: 'pm_searching', label: 'Search — searching…', type: 'text' },
      { key: 'pm_no_suggestions', label: 'Search — no suggestions', type: 'text', hint: 'Use {query}.' },
      { key: 'pm_find', label: 'Search — find button', type: 'text', hint: 'Use {query}.' },
      { key: 'pm_typed_error', label: 'Search — not found error', type: 'text', hint: 'Use {query}.' },
      { key: 'pm_cancel', label: 'Cancel button', type: 'text' },
      { key: 'pm_confirm', label: 'Confirm button', type: 'text' },
      { key: 'pm_punching', label: 'Punching in… button', type: 'text' },
      { key: 'pm_reason_prefix', label: 'Reason prefix', type: 'text' },
      { key: 'pm_blocked_title', label: 'Blocked — title', type: 'text' },
      { key: 'pm_blocked_hint', label: 'Blocked — hint', type: 'textarea' },
      { key: 'pm_blocked_step1', label: 'Blocked — step 1', type: 'text' },
      { key: 'pm_blocked_step2', label: 'Blocked — step 2', type: 'text' },
      { key: 'pm_blocked_step3', label: 'Blocked — step 3', type: 'text' },
      { key: 'pm_required_title', label: 'Permission required — title', type: 'text' },
      { key: 'pm_required_hint', label: 'Permission required — hint', type: 'text' },
      { key: 'pm_unsupported_title', label: 'Unsupported browser — title', type: 'text' },
      { key: 'pm_unsupported_hint', label: 'Unsupported browser — hint', type: 'text' },
      { key: 'pm_insecure_title', label: 'Insecure context — title', type: 'text' },
      { key: 'pm_insecure_hint', label: 'Insecure context — hint', type: 'text' },
      { key: 'pm_timeout_title', label: 'Timeout — title', type: 'text' },
      { key: 'pm_timeout_hint', label: 'Timeout — hint', type: 'text' },
      { key: 'pm_unavailable_title', label: 'Unavailable — title', type: 'text' },
      { key: 'pm_unavailable_hint', label: 'Unavailable — hint', type: 'text' },
    ],
  },
];

export default function CheckInBreaksPage() {
  return (
    <ManagementLayout
      title="Check-In & Breaks"
      description="Copy for the OGroup punch clock, break picker, attendance statuses and the punch-in location confirmation. Edit once — it applies for every user and team."
      icon={<i className="ri-fingerprint-2-line text-[#1B4332] text-lg"></i>}
    >
      <ContentSchemaEditor
        pageKey="ogroup_checkin"
        title="Check-In & Breaks"
        description="punch clock, break picker & location copy"
        icon={<i className="ri-fingerprint-2-line text-[#1B4332] text-sm"></i>}
        tabs={TABS}
        defaults={DEFAULT_CHECKIN_COPY as unknown as Record<string, unknown>}
        onSaved={() => invalidatePageContent('ogroup_checkin')}
      />
    </ManagementLayout>
  );
}