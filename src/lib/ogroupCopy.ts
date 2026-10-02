/**
 * OGroup portal copy — code defaults for the shared `usePageContent` hook.
 *
 * Every key maps 1:1 to a `site_settings` row stored as
 * `page_ogroup_checkin_<field>`, edited from the "Check-In & Breaks" editor in
 * the Page Editors hub. The values below are IDENTICAL to the copy that ships
 * today, so nothing changes visually until an editor saves a change.
 *
 * Fields may contain `{token}` placeholders — resolve them with `fillTemplate`.
 */

/** Replace `{token}` placeholders in an editable string. */
export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (out, [k, v]) => out.split(`{${k}}`).join(String(v)),
    template,
  );
}

export const DEFAULT_CHECKIN_COPY = {
  /* ── Punch Clock page ─────────────────────────────────────────────── */
  page_title: 'Punch Clock',
  page_subtitle: 'Attendance & time tracking',
  greet_morning: 'Good morning',
  greet_afternoon: 'Good afternoon',
  greet_evening: 'Good evening',
  label_punched_in_at: 'Punched in at',
  label_elapsed: 'Elapsed',
  label_today: 'Today',
  punch_in_label: 'PUNCH IN',
  punch_in_hint: 'Tap to punch in, then confirm your detected location.',
  state_active: 'Active',
  btn_end_break: 'End break',
  btn_break: 'Break',
  btn_punch_out: 'Punch out',
  state_on_break: 'On break',
  state_punched_in: 'Punched in',
  state_off_clock: 'Off clock',
  presence_online: 'Online',
  presence_away: 'Away',
  presence_offline: 'Offline',
  request_correction: 'Request correction',

  /* ── Alerts ───────────────────────────────────────────────────────── */
  open_shift_title: 'You have an open shift',
  open_shift_body: 'You punched in on {date} at {time} and never punched out. Punch out below, or request a correction.',
  auto_closed_title: 'You were automatically punched out',
  auto_closed_body: 'Your shift reached the {hours}-hour limit and was closed at {time}. An admin can review it.',
  limit_title: 'Approaching the {hours}-hour limit',
  limit_body: "You'll be automatically punched out in {remaining}. Punch out sooner if you're done.",
  loading: 'Loading attendance…',
  error_sign_in_again: 'Sign in again',

  /* ── Note + location summary ──────────────────────────────────────── */
  location_punch_in: 'Punch-in location',
  location_none: 'No location on record yet',
  note_label: 'Punch note (optional)',
  note_placeholder: 'e.g. Working from Westlands office',
  note_add: 'Add a note',

  /* ── Stats + appointments + sessions ──────────────────────────────── */
  stat_total_today: 'Total today',
  stat_late_today: 'Late today',
  stat_overtime_today: 'Overtime today',
  appts_title: "Today's appointments",
  appts_empty: 'Nothing scheduled today',
  sessions_title: "Today's sessions",
  sessions_timesheet: 'My Timesheet',
  sessions_empty: 'No sessions recorded yet today',
  col_in: 'In',
  col_out: 'Out',
  col_break: 'Break',
  col_worked: 'Worked',
  col_status: 'Status',

  /* ── Toast confirmations ──────────────────────────────────────────── */
  toast_punch_in_title: "You're punched in",
  toast_punch_in_sub: 'Shift started.',
  toast_punch_out_title: "You're punched out",
  toast_punch_out_sub: 'Worked today: {duration}',
  toast_break_start_title: 'Break started',
  toast_break_start_sub: 'Enjoy your break.',
  toast_break_end_title: 'Back on the clock',
  toast_break_end_sub: 'Break lasted {duration}',

  /* ── Correction dialog ────────────────────────────────────────────── */
  correction_title: 'Request attendance correction',
  correction_hint: 'e.g. you forgot to clock out. An Admin will review and approve or reject this.',
  correction_reason_label: 'Reason',
  correction_reason_placeholder: 'Forgot to clock out',
  correction_time_label: 'Requested clock-out time (optional)',
  correction_cancel: 'Cancel',
  correction_submit: 'Submit request',
  correction_submitting: 'Submitting...',

  /* ── Attendance status strip ──────────────────────────────────────── */
  strip_account: 'Account',
  strip_attendance: 'Attendance',
  strip_timesheet: 'Timesheet',
  strip_signed_in: 'Signed in',
  strip_signed_out: 'Signed out',
  strip_not_punched_in: 'Not punched in',
  strip_active: 'Active',
  strip_not_started: 'Not started',

  /* ── Break picker ─────────────────────────────────────────────────── */
  break_title: 'Start a break',
  break_subtitle: "Pick the type of break you're taking.",
  break_paid: 'Paid',
  break_unpaid: 'Unpaid',
  break_cancel: 'Cancel',
  break_start: 'Start break',
  break_starting: 'Starting…',

  /* ── Today card ───────────────────────────────────────────────────── */
  today_title: 'Today',
  today_started: 'Started',
  today_current_session: 'Current session',
  today_break_started: 'Break started',
  today_break_total: 'Break total',
  today_expected: 'Expected',
  today_worked: 'Worked',
  today_remaining: 'Est. remaining',

  /* ── Punch-in location modal ──────────────────────────────────────── */
  pm_title: 'Punch in',
  pm_subtitle: 'Confirm your location to start your shift',
  pm_detecting_title: 'Detecting your location…',
  pm_detecting_hint: 'If your browser asks for location access, choose Allow. This usually takes a few seconds.',
  pm_checking_title: 'Checking location…',
  pm_checking_hint: 'Got your coordinates — matching them to a place.',
  pm_detected_title: 'Location detected',
  pm_low_acc_title: 'Detected, but accuracy is low',
  pm_low_acc_hint: 'Your position is only accurate to about ± {accuracy} m. Move to an open area for a better fix, or confirm anyway.',
  pm_change_location: 'Change location',
  pm_try_again: 'Try again',
  pm_search_manually: 'Search manually',
  pm_search_title: 'Search location',
  pm_search_back: 'Back',
  pm_search_placeholder: 'e.g. Westlands, Nairobi',
  pm_searching: 'Searching…',
  pm_no_suggestions: 'No suggestions for “{query}”.',
  pm_find: 'Find “{query}”',
  pm_typed_error: 'We couldn’t find coordinates for “{query}”. Try a more specific place.',
  pm_cancel: 'Cancel',
  pm_confirm: 'Confirm & Punch In',
  pm_punching: 'Punching in…',
  pm_reason_prefix: 'Reason:',
  pm_blocked_title: 'Location permission is blocked',
  pm_blocked_hint: 'Your browser has remembered “Block” for this site, so it will not ask again by itself. Re-enable location, then try again.',
  pm_blocked_step1: 'Tap the lock / location icon just left of the address bar.',
  pm_blocked_step2: 'Set “Location” to Allow, then reload the page.',
  pm_blocked_step3: 'iPhone / iPad: Settings → Safari (or Chrome) → Location → Allow.',
  pm_required_title: 'Location permission required',
  pm_required_hint: 'Tap “Allow location” when your browser asks, then try again.',
  pm_unsupported_title: 'This browser can’t share location',
  pm_unsupported_hint: 'Try a different browser, or search for your location manually below.',
  pm_insecure_title: 'Location needs a secure connection',
  pm_insecure_hint: 'Open this site over https:// and try again, or search for your location manually.',
  pm_timeout_title: 'We couldn’t detect your location in time',
  pm_timeout_hint: 'Move somewhere with a clearer signal — near a window or outdoors — then try again.',
  pm_unavailable_title: 'Location service is temporarily unavailable',
  pm_unavailable_hint: 'This is usually brief. Try again, or search for your location manually.',
};