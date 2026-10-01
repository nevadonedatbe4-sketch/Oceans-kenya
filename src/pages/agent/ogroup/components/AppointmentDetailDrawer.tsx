import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  type CalendarAppointment, type AppointmentStatus, type ContactChannel,
  KIND_LABELS, KIND_COLOR, KIND_ICON, STATUS_LABELS, STATUS_COLOR,
  INTENTION_LABELS, OUTCOME_LABELS, CANCELLATION_REASONS,
  TASK_PRIORITIES, TASK_PRIORITY_COLOR, formatDuration, minutesBetween, fmtDateShort, fmtTime,
  reminderLabel, CHANNEL_LABELS, CHANNEL_ICON, CHANNEL_OPTIONS,
} from '../calendarTypes';
import { useAppointmentActivity, ACTION_ICON } from '../appointmentActivity';
import { useAppointmentTasks } from '../useAppointmentTasks';
import { useAppointmentEmails, sendAppointmentEmail, type AppointmentEmailEvent } from '../appointmentEmails';
import {
  useEntityTimeline, recordContactTouch, fetchContactSnapshot,
  CRM_ACTION_LABELS, CRM_ACTION_ICON,
} from '../crmActivities';

function stamp(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  appointment: CalendarAppointment | null;
  currentUserId?: string | null;
  resolveName?: (userId: string | null) => string;
  canManage?: boolean;
  onClose: () => void;
  onEdit: (a: CalendarAppointment) => void;
  onReschedule?: (a: CalendarAppointment) => void;
  onDuplicate: (a: CalendarAppointment) => void;
  onStatus: (a: CalendarAppointment, status: AppointmentStatus, reason?: string) => Promise<void>;
  onOutcome: (a: CalendarAppointment, outcome: string) => Promise<void>;
  onRespond: (a: CalendarAppointment, r: 'accepted' | 'declined') => Promise<void>;
}

export default function AppointmentDetailDrawer({
  appointment, currentUserId, resolveName, canManage = true,
  onClose, onEdit, onReschedule, onDuplicate, onStatus, onOutcome, onRespond,
}: Props) {
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cancelMode, setCancelMode] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);

  const apptId = appointment?.id || null;
  const primaryContactId = appointment?.contact_ids?.[0] || null;
  const { items: activity, addNote } = useAppointmentActivity(apptId);
  const { tasks, addTask, toggleTask, removeTask } = useAppointmentTasks(apptId);
  const { items: emails, reload: reloadEmails } = useAppointmentEmails(apptId);
  const [retrying, setRetrying] = useState<string | null>(null);
  const { items: contactTimeline, reload: reloadContactTimeline } = useEntityTimeline(primaryContactId ? 'contact' : null, primaryContactId);
  const [snapshot, setSnapshot] = useState<{ last_contact_at: string | null; last_contact_channel: string | null } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [taskText, setTaskText] = useState('');
  const [taskPriority, setTaskPriority] = useState('normal');

  useEffect(() => {
    if (appointment) { const t = window.setTimeout(() => setShown(true), 10); return () => window.clearTimeout(t); }
    setShown(false);
  }, [apptId]);

  useEffect(() => {
    setCancelMode(false);
    setSlug(null);
    setNoteText('');
    setTaskText('');
    if (!appointment?.property_id) return;
    let active = true;
    void (async () => {
      const { data } = await supabase.from('listings').select('slug').eq('id', appointment.property_id).maybeSingle();
      if (active) setSlug((data as { slug?: string } | null)?.slug || null);
    })();
    return () => { active = false; };
  }, [apptId, appointment?.property_id]);

  useEffect(() => {
    if (!primaryContactId) { setSnapshot(null); return; }
    let active = true;
    void fetchContactSnapshot(primaryContactId).then((s) => { if (active) setSnapshot(s); });
    return () => { active = false; };
  }, [primaryContactId]);

  if (!appointment) return null;
  const a = appointment;
  const cancelled = a.status === 'cancelled' || a.status === 'no_show';
  const duration = a.ends_at ? minutesBetween(a.starts_at, a.ends_at) : 0;
  const myAttendee = (a.attendees || []).find((at) => at.user_id === currentUserId);
  const name = (id: string | null) => (resolveName ? resolveName(id) : 'Team member');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const logTouch = async (channel: ContactChannel) => {
    if (!primaryContactId) return;
    await recordContactTouch({ contactId: primaryContactId, channel, appointmentId: appointment.id, actorId: currentUserId });
    const snap = await fetchContactSnapshot(primaryContactId);
    setSnapshot(snap);
    await reloadContactTimeline();
  };

  const submitNote = async () => {
    if (!noteText.trim()) return;
    await addNote(noteText, currentUserId);
    setNoteText('');
  };
  const submitTask = async () => {
    if (!taskText.trim()) return;
    await addTask({ title: taskText, priority: taskPriority as 'low' | 'normal' | 'high' | 'urgent' }, currentUserId);
    setTaskText('');
  };

  const retryEmail = async (rowId: string, evt: string) => {
    if (!apptId) return;
    setRetrying(rowId);
    try {
      await sendAppointmentEmail(apptId, (evt || 'confirmation') as AppointmentEmailEvent);
      await reloadEmails();
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`relative w-full max-w-md bg-white h-full overflow-y-auto transition-transform duration-300 ${shown ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-neutral-100">
          <div className="flex items-center justify-between px-5 py-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
              <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-white ${KIND_COLOR[a.kind] || 'bg-neutral-400'}`}><i className={`${KIND_ICON[a.kind] || 'ri-calendar-event-line'} text-[13px]`} /></span>
              {KIND_LABELS[a.kind] || a.kind}
            </span>
            <div className="flex items-center gap-1">
              {canManage && <button onClick={() => onEdit(a)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-500 cursor-pointer" title="Edit"><i className="ri-pencil-line" /></button>}
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-500 cursor-pointer" title="Close"><i className="ri-close-line text-lg" /></button>
            </div>
          </div>
          <div className="px-5 pb-4">
            <h2 className="text-lg font-semibold text-neutral-900 leading-snug">{a.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[a.status] || 'bg-neutral-100 text-neutral-500'}`}>{STATUS_LABELS[a.status] || a.status}</span>
              {a.recurrence_rule && <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-900 font-medium inline-flex items-center gap-1"><i className="ri-loop-right-line" />Repeats</span>}
              {a.is_private && <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-medium inline-flex items-center gap-1"><i className="ri-lock-line" />Private</span>}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {a.masked && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-500 flex items-start gap-2">
              <i className="ri-lock-line mt-0.5" />
              <span>This is a private appointment. Its details are hidden — you can only see that this time is busy.</span>
            </div>
          )}
          {/* When */}
          <section className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-neutral-700"><i className="ri-calendar-line text-neutral-400" /><span className="font-medium">{fmtDateShort(a.starts_at)}</span><span className="text-neutral-400">·</span><span>{fmtTime(a.starts_at)} – {a.ends_at ? fmtTime(a.ends_at) : '—'}</span></div>
            {duration > 0 && <div className="flex items-center gap-2 text-neutral-500 pl-6 text-xs">{formatDuration(duration)}</div>}
            {a.location_text && <div className="flex items-center gap-2 text-neutral-600"><i className="ri-map-pin-line text-neutral-400" /><span>{a.location_text}</span></div>}
            {a.meeting_point && <div className="flex items-center gap-2 text-neutral-600"><i className="ri-crosshair-line text-neutral-400" /><span>{a.meeting_point}</span></div>}
          </section>

          {/* Property */}
          {a.property_title && (
            <section className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">Property</p>
              <p className="text-sm font-medium text-neutral-800">{a.property_title}</p>
              {slug && <Link to={`/property/${slug}`} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 cursor-pointer"><i className="ri-external-link-line" />Open property</Link>}
            </section>
          )}

          {/* Applicant */}
          {(a.client_name || a.client_phone || a.client_email || primaryContactId) && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">Applicant</p>
              <p className="text-sm font-medium text-neutral-800">{a.client_name || 'Applicant'}</p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {a.client_phone && <a href={`tel:${a.client_phone}`} onClick={() => primaryContactId && void logTouch('phone')} className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-800 cursor-pointer"><i className="ri-phone-line" />{a.client_phone}</a>}
                {a.client_email && <a href={`mailto:${a.client_email}`} onClick={() => primaryContactId && void logTouch('email')} className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-800 cursor-pointer"><i className="ri-mail-line" />{a.client_email}</a>}
              </div>
            </section>
          )}

          {/* Last contacted */}
          {primaryContactId && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">Last contacted</p>
              <p className="text-xs text-neutral-600 flex flex-wrap items-center gap-1.5">
                {snapshot?.last_contact_at ? (
                  <>
                    <i className="ri-history-line text-neutral-400" />
                    <span>{stamp(snapshot.last_contact_at)}</span>
                    {snapshot.last_contact_channel && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-medium">
                        <i className={CHANNEL_ICON[snapshot.last_contact_channel as ContactChannel] || 'ri-chat-1-line'} />
                        {CHANNEL_LABELS[snapshot.last_contact_channel as ContactChannel] || snapshot.last_contact_channel}
                      </span>
                    )}
                  </>
                ) : 'Not contacted yet.'}
              </p>
              {canManage && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {CHANNEL_OPTIONS.map((ch) => (
                    <button key={ch} onClick={() => run(() => logTouch(ch))} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-neutral-200 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 cursor-pointer whitespace-nowrap disabled:opacity-40">
                      <i className={CHANNEL_ICON[ch]} /> Log {CHANNEL_LABELS[ch]}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Assigned + attendees */}
          <section className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-neutral-600"><i className="ri-user-star-line text-neutral-400" /><span>Assigned: <span className="font-medium text-neutral-800">{a.assigned_user_id === currentUserId ? 'You' : name(a.assigned_user_id)}</span></span></div>
            {a.created_by && (
              <div className="flex items-center gap-2 text-neutral-600"><i className="ri-user-add-line text-neutral-400" /><span>Created by: <span className="font-medium text-neutral-800">{a.created_by === currentUserId ? 'You' : name(a.created_by)}</span>{a.created_by !== a.assigned_user_id && <span className="text-neutral-400"> (appointment setter)</span>}</span></div>
            )}
            {a.attendees && a.attendees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {a.attendees.map((at) => (
                  <span key={at.user_id} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${at.response === 'accepted' ? 'bg-emerald-50 text-emerald-600' : at.response === 'declined' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>
                    {at.name || name(at.user_id)} · {at.response}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Viewing info */}
          {(a.viewing_instructions || a.intention) && (
            <section className="space-y-1.5 text-sm">
              {a.intention && <div className="flex items-center gap-2 text-neutral-600"><i className="ri-focus-3-line text-neutral-400" /><span>Intention: {INTENTION_LABELS[a.intention as keyof typeof INTENTION_LABELS] || a.intention}</span></div>}
              {a.viewing_instructions && <div className="flex items-start gap-2 text-neutral-500 text-xs"><i className="ri-information-line text-neutral-400 mt-0.5" /><span>{a.viewing_instructions}</span></div>}
            </section>
          )}

          {a.notes && <section className="text-xs text-neutral-500 flex items-start gap-2"><i className="ri-file-text-line text-neutral-400 mt-0.5" /><span>{a.notes}</span></section>}

          {/* Invite response */}
          {myAttendee && myAttendee.response === 'pending' && !cancelled && (
            <div className="flex gap-2">
              <button disabled={busy} onClick={() => run(() => onRespond(a, 'accepted'))} className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer disabled:opacity-40 whitespace-nowrap">Accept invite</button>
              <button disabled={busy} onClick={() => run(() => onRespond(a, 'declined'))} className="flex-1 px-3 py-2 rounded-lg bg-neutral-100 text-neutral-600 text-xs font-semibold hover:bg-neutral-200 cursor-pointer disabled:opacity-40 whitespace-nowrap">Decline</button>
            </div>
          )}

          {/* Quick actions */}
          {canManage && !cancelled && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-2">Quick actions</p>
              <div className="grid grid-cols-3 gap-2">
                <ActionBtn icon="ri-edit-line" label="Edit" onClick={() => onEdit(a)} disabled={busy} />
                <ActionBtn icon="ri-calendar-schedule-line" label="Reschedule" onClick={() => (onReschedule ? onReschedule(a) : onEdit(a))} disabled={busy} />
                <ActionBtn icon="ri-check-double-line" label="Confirm" onClick={() => run(() => onStatus(a, 'confirmed'))} disabled={busy || a.status === 'confirmed'} />
                <ActionBtn icon="ri-checkbox-circle-line" label="Complete" onClick={() => run(() => onStatus(a, 'completed'))} disabled={busy || a.status === 'completed'} />
                <ActionBtn icon="ri-user-unfollow-line" label="No-show" onClick={() => run(() => onStatus(a, 'no_show'))} disabled={busy} />
                <ActionBtn icon="ri-file-copy-line" label="Duplicate" onClick={() => onDuplicate(a)} disabled={busy} />
                <ActionBtn icon="ri-close-circle-line" label="Cancel" onClick={() => setCancelMode(true)} disabled={busy} danger />
              </div>
              {cancelMode && (
                <div className="mt-2 rounded-xl border border-red-100 bg-red-50/60 p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1.5">Reason for cancellation</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CANCELLATION_REASONS.map((r) => (
                      <button key={r.value} onClick={() => run(() => onStatus(a, 'cancelled', r.label))} disabled={busy} className="px-2.5 py-1 rounded-full bg-white border border-red-200 text-[11px] font-medium text-red-600 hover:bg-red-100 cursor-pointer whitespace-nowrap disabled:opacity-40">{r.label}</button>
                    ))}
                  </div>
                  <button onClick={() => setCancelMode(false)} className="mt-2 text-[11px] text-neutral-500 hover:text-neutral-700 cursor-pointer">Never mind</button>
                </div>
              )}
              {a.kind === 'viewing' && (
                <div className="mt-2">
                  <label className="text-[11px] font-medium text-neutral-500">Outcome</label>
                  <select value={a.outcome || ''} onChange={(e) => e.target.value && run(() => onOutcome(a, e.target.value))} className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white cursor-pointer">
                    <option value="">Record outcome…</option>
                    {Object.entries(OUTCOME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}
            </section>
          )}

          {cancelled && (
            <section className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-600">
              <p className="font-semibold flex items-center gap-1.5"><i className="ri-close-circle-line" />{STATUS_LABELS[a.status]}</p>
              {a.cancellation_reason && <p className="mt-1">Reason: {a.cancellation_reason}</p>}
              {canManage && <button onClick={() => run(() => onStatus(a, 'scheduled'))} disabled={busy} className="mt-2 px-2.5 py-1 rounded-lg bg-white border border-red-200 font-medium text-red-600 hover:bg-red-100 cursor-pointer whitespace-nowrap disabled:opacity-40"><i className="ri-restart-line mr-1" />Restore</button>}
            </section>
          )}

          {/* Tasks */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-2 flex items-center gap-1.5"><i className="ri-list-check" />Tasks {tasks.filter((t) => !t.is_done).length > 0 && <span className="text-teal-700">{tasks.filter((t) => !t.is_done).length} pending</span>}</p>
            <div className="space-y-1.5">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-start gap-2 rounded-lg border border-neutral-100 p-2 group">
                  <button onClick={() => run(() => toggleTask(t, currentUserId))} disabled={busy} className={`mt-0.5 w-4 h-4 flex items-center justify-center rounded border cursor-pointer ${t.is_done ? 'bg-teal-600 border-teal-600 text-white' : 'border-neutral-300 hover:border-teal-500'}`}>{t.is_done && <i className="ri-check-line text-[10px]" />}</button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${t.is_done ? 'text-neutral-400 line-through' : 'text-neutral-700'}`}>{t.title}</p>
                    <span className={`text-[10px] px-1.5 rounded-full ${TASK_PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                  </div>
                  <button onClick={() => removeTask(t.id)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-100 text-neutral-300 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100"><i className="ri-delete-bin-line text-xs" /></button>
                </div>
              ))}
              {tasks.length === 0 && <p className="text-xs text-neutral-400">No tasks yet.</p>}
            </div>
            {canManage && (
              <div className="flex gap-1.5 mt-2">
                <input value={taskText} onChange={(e) => setTaskText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitTask()} placeholder="e.g. Confirm viewing with owner" className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} className="px-2 py-2 rounded-lg border border-neutral-200 text-xs bg-white cursor-pointer">
                  {TASK_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <button onClick={submitTask} className="px-3 py-2 rounded-lg bg-neutral-800 text-white text-xs font-medium hover:bg-neutral-900 cursor-pointer whitespace-nowrap"><i className="ri-add-line" /></button>
              </div>
            )}
          </section>

          {/* Confirmation emails (communication history) */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-2 flex items-center gap-1.5"><i className="ri-mail-send-line" />Confirmation emails</p>
            {emails.length === 0 ? (
              <p className="text-xs text-neutral-400">No confirmation emails sent yet.</p>
            ) : (
              <div className="space-y-1.5">
                {emails.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 rounded-lg border border-neutral-100 p-2">
                    <i className={`${e.recipient_type === 'agent' ? 'ri-user-star-line' : 'ri-user-3-line'} text-neutral-400`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-700 capitalize truncate">{e.recipient_type}{e.recipient_email ? ` · ${e.recipient_email}` : ''}</p>
                      <p className="text-[10px] text-neutral-400">{e.sent_at ? stamp(e.sent_at) : e.created_at ? stamp(e.created_at) : ''}</p>
                    </div>
                    {e.status === 'sent' ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium inline-flex items-center gap-1"><i className="ri-check-line" />Sent</span>
                    ) : e.status === 'failed' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium inline-flex items-center gap-1"><i className="ri-error-warning-line" />Failed</span>
                        <button onClick={() => retryEmail(e.id, e.event)} disabled={retrying === e.id} className="text-[10px] text-teal-700 hover:text-teal-800 cursor-pointer font-medium disabled:opacity-40">{retrying === e.id ? 'Retrying…' : 'Retry'}</button>
                      </div>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500 font-medium">Skipped</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Diary / activity stream */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-2 flex items-center gap-1.5"><i className="ri-sticky-note-line" />Diary & activity</p>
            {canManage && (
              <div className="flex gap-1.5 mb-3">
                <input value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitNote()} placeholder="Add a diary note…" maxLength={500} className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                <button onClick={submitNote} className="px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 cursor-pointer whitespace-nowrap"><i className="ri-send-plane-line" /></button>
              </div>
            )}
            <div className="space-y-2.5">
              {activity.length === 0 && <p className="text-xs text-neutral-400">No activity yet.</p>}
              {activity.map((row) => (
                <div key={row.id} className="flex gap-2.5">
                  <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-500"><i className={`${ACTION_ICON[row.action] || 'ri-history-line'} text-[12px]`} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-700">{row.summary || row.action}</p>
                    <p className="text-[10px] text-neutral-400">{name(row.actor_id)} · {stamp(row.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Applicant timeline (connected CRM activity) */}
          {primaryContactId && contactTimeline.length > 0 && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-2 flex items-center gap-1.5"><i className="ri-user-3-line" />Applicant timeline</p>
              <div className="space-y-2.5">
                {contactTimeline.slice(0, 8).map((row) => (
                  <div key={row.id} className="flex gap-2.5">
                    <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-500"><i className={`${CRM_ACTION_ICON[row.action] || 'ri-history-line'} text-[12px]`} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-700">
                        {CRM_ACTION_LABELS[row.action] || row.summary || row.action}
                        {row.channel && <span className="text-neutral-400"> · {CHANNEL_LABELS[row.channel as ContactChannel] || row.channel}</span>}
                      </p>
                      <p className="text-[10px] text-neutral-400">{stamp(row.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {a.reminder_minutes > 0 && (
            <p className="text-[11px] text-neutral-400 flex items-center gap-1"><i className="ri-alarm-line" />Reminder {reminderLabel(a.reminder_minutes)} before</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, disabled, danger }: { icon: string; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${danger ? 'border-red-100 text-red-600 hover:bg-red-50' : 'border-neutral-100 text-neutral-600 hover:bg-neutral-50'}`}>
      <i className={`${icon} text-base`} />
      {label}
    </button>
  );
}