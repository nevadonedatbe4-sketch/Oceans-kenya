import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { inputBase, selectClass, CollapsibleCard } from '@/pages/crm/components/DevelopmentEdit/ui';
import { FORM_LABEL, FORM_HINT, KIND_ROUTING } from '../appointmentFormStyles';
import { writeApptPrefs } from '../appointmentPrefs';
import { fetchStaffDirectory } from '../staffDirectory';
import type { CalendarDraft, ConflictHit } from '../useCalendar';
import type { CalendarAppointment, AppointmentKind, AppointmentIntention, RecurrenceRule } from '../calendarTypes';
import {
  KIND_LABELS, INTENTION_LABELS, DURATION_SHORTCUTS, REMINDER_OPTIONS,
  toTimeInput, toDateInput, formatDuration, minutesBetween, fmtTime, reminderLabel,
} from '../calendarTypes';
import { EDIT_SCOPE_OPTIONS, describeRecurrence, type RecurringEditScope } from '../recurrence';
import { fetchContactsByIds, fetchPropertySummary, propertyImage, propertyMeta, type ContactOption } from '../appointmentLookups';
import PropertyPicker, { type PropertyValue } from './PropertyPicker';
import ContactPicker from './ContactPicker';
import RecurrenceEditor from './RecurrenceEditor';

export interface AgentPick {
  user_id: string;
  name: string;
  avatar?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: CalendarAppointment | null;
  defaults?: {
    start?: Date;
    kind?: AppointmentKind;
    /** Pre-select a listing (Quick Set launched from a property record). */
    propertyId?: string | null;
    /** Pre-select applicants/contacts (Quick Set launched from an applicant record). */
    contactIds?: string[];
    /** Optional pre-filled title. */
    title?: string;
  } | null;
  currentUserId?: string | null;
  /** When provided (admin), the appointment can be assigned to another agent. */
  agents?: AgentPick[];
  /** Pre-select this assignee (e.g. booking into an agent's slot from the Schedule). */
  defaultAssigneeId?: string;
  /** Authoritative, server-side conflict check (async). */
  conflictChecker?: (draft: CalendarDraft) => Promise<ConflictHit[]>;
  workingHoursChecker?: (draft: CalendarDraft) => boolean;
  onSave: (draft: CalendarDraft, scope?: RecurringEditScope) => Promise<void>;
}

const LOCATION_TYPES = ['office', 'property', 'virtual', 'remote', 'site', 'other'];
const INTENTIONS = Object.keys(INTENTION_LABELS) as AppointmentIntention[];
const LABEL = FORM_LABEL;
const HINT = FORM_HINT;
const CHIP = 'px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer whitespace-nowrap border transition-colors';
const CHIP_ON = 'border-[#0d5959] bg-[#0d5959]/10 text-[#0d5959]';
const CHIP_OFF = 'border-[#e0e6ec] text-[#5a6a7a] hover:bg-[#f4f6f8]';

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor((total % 1440) / 60).toString().padStart(2, '0');
  const nm = (total % 60).toString().padStart(2, '0');
  return `${nh}:${nm}`;
}

export default function AppointmentForm({
  open, onClose, existing, defaults, currentUserId, agents,
  defaultAssigneeId, conflictChecker, workingHoursChecker, onSave,
}: Props) {
  const { user } = useAuth();
  const [kind, setKind] = useState<AppointmentKind>('viewing');
  const [title, setTitle] = useState('');
  const [property, setProperty] = useState<PropertyValue>({ id: null, title: '', slug: null });
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [staff, setStaff] = useState<AgentPick[]>([]);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [locationType, setLocationType] = useState('office');
  const [locationText, setLocationText] = useState('');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [notes, setNotes] = useState('');
  const [viewingInstructions, setViewingInstructions] = useState('');
  const [intention, setIntention] = useState<AppointmentIntention | ''>('');
  const [reminders, setReminders] = useState<number[]>([15]);
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const [assignedUserId, setAssignedUserId] = useState('');
  const [scope, setScope] = useState<RecurringEditScope>('this');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [conflictAck, setConflictAck] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  const isRecurring = !!existing && (!!existing.recurrence_rule || !!existing.recurrence_parent_id);

  // Reset / hydrate whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    const now = new Date();
    const base = existing?.starts_at ? new Date(existing.starts_at) : (defaults?.start ? new Date(defaults.start) : now);
    base.setSeconds(0, 0);
    if (!existing) base.setMinutes(0, 0, 0);
    const end = existing?.ends_at ? new Date(existing.ends_at) : new Date(base.getTime() + 60 * 60000);

    setKind((existing?.kind as AppointmentKind) || defaults?.kind || 'viewing');
    setTitle(existing?.title || (!existing ? (defaults?.title || '') : ''));
    const initialPropertyId = existing?.property_id || (!existing ? (defaults?.propertyId ?? null) : null);
    setProperty({ id: initialPropertyId, title: existing?.property_title || '', slug: null });
    if (initialPropertyId) {
      void fetchPropertySummary(initialPropertyId).then((p) => {
        if (p) setProperty({ id: p.id, title: p.title || existing?.property_title || '', slug: p.slug, image: propertyImage(p), meta: propertyMeta(p) });
      }).catch(() => {});
    }
    setContacts([]);
    setAttendees(existing?.attendees?.map((a) => a.user_id) || []);
    setDate(toDateInput(base));
    setStartTime(toTimeInput(base));
    setEndTime(toTimeInput(end));
    setLocationType(existing?.location_type || 'office');
    setLocationText(existing?.location_text || '');
    setMeetingPoint(existing?.meeting_point || '');
    setNotes(existing?.notes || '');
    setViewingInstructions(existing?.viewing_instructions || '');
    setIntention((existing?.intention as AppointmentIntention) || '');
    setReminders(existing?.reminder_minutes ? [existing.reminder_minutes] : [15]);
    setRecurrence(existing?.recurrence_rule || null);
    setAssignedUserId(existing?.assigned_user_id || defaultAssigneeId || currentUserId || agents?.[0]?.user_id || '');
    setScope('this');
    setBusy(false);
    setMessage(null);
    setConflictAck(false);
    setIsPrivate(!!existing?.is_private);
  }, [open, existing, defaults, currentUserId, agents, defaultAssigneeId]);

  // Hydrate saved applicants + internal staff directory.
  useEffect(() => {
    if (!open) return;
    const initialContactIds = existing?.contact_ids?.length
      ? existing.contact_ids
      : (!existing && defaults?.contactIds?.length ? defaults.contactIds : []);
    if (initialContactIds.length) {
      void fetchContactsByIds(initialContactIds).then(setContacts).catch(() => setContacts([]));
    }
    let cancelled = false;
    void (async () => {
      try {
        const dir = await fetchStaffDirectory();
        if (cancelled) return;
        setStaff(dir.filter((t) => t.user_id !== user?.id && t.status === 'active').map((t) => ({ user_id: t.user_id, name: t.name || 'Agent', avatar: t.avatar_url })));
      } catch {
        if (!cancelled) setStaff([]);
      }
    })();
    return () => { cancelled = true; };
  }, [open, existing, user?.id]);

  const startsAt = useMemo(() => (date && startTime ? new Date(`${date}T${startTime}:00`) : null), [date, startTime]);
  const endsAt = useMemo(() => (date && endTime ? new Date(`${date}T${endTime}:00`) : null), [date, endTime]);
  const duration = startsAt && endsAt ? minutesBetween(startsAt.toISOString(), endsAt.toISOString()) : 0;

  const draftForCheck = useMemo<CalendarDraft | null>(() => {
    if (!startsAt || !endsAt || !conflictChecker) return null;
    return {
      id: existing?.id,
      title, kind,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      location_type: locationType,
      reminder_minutes: reminders[0] ?? 15,
      assigned_user_id: assignedUserId || currentUserId || null,
    };
  }, [startsAt, endsAt, conflictChecker, existing, title, kind, locationType, reminders, assignedUserId, currentUserId]);

  const [conflicts, setConflicts] = useState<ConflictHit[]>([]);

  // Live, server-side conflict check (debounced) so a saved appointment can
  // never silently overlap one that an active filter hid from the grid.
  useEffect(() => {
    if (!draftForCheck || !conflictChecker) { setConflicts([]); return; }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const hits = await conflictChecker(draftForCheck);
        if (active) setConflicts(hits);
      } catch {
        if (active) setConflicts([]);
      }
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [draftForCheck, conflictChecker]);

  const withinHours = useMemo(() => (draftForCheck && workingHoursChecker ? workingHoursChecker(draftForCheck) : true), [draftForCheck, workingHoursChecker]);

  const toggleAttendee = (id: string) => setAttendees((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  const toggleReminder = (m: number) => setReminders((prev) => (m === 0 ? [] : prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)));

  const submit = async () => {
    if (!title.trim()) { setMessage({ type: 'err', text: 'Add a title for the appointment.' }); return; }
    if (!startsAt || !endsAt) { setMessage({ type: 'err', text: 'Pick a date and start/end times.' }); return; }
    if (endsAt <= startsAt) { setMessage({ type: 'err', text: 'End time must be after the start time.' }); return; }
    if (conflicts.length && !conflictAck) { setMessage({ type: 'err', text: 'There is a scheduling conflict. Resolve it or choose "Keep anyway".' }); return; }

    const draft: CalendarDraft = {
      id: existing?.id,
      title: title.trim(),
      kind,
      property_id: property.id,
      property_title: property.title.trim() || null,
      contact_ids: contacts.map((c) => c.id),
      client_name: contacts.length ? (contacts[0].name || [contacts[0].first_name, contacts[0].last_name].filter(Boolean).join(' ')) : null,
      client_phone: contacts[0]?.phone || null,
      client_email: contacts[0]?.email || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      location_type: locationType,
      location_text: locationText.trim() || null,
      meeting_point: meetingPoint.trim() || null,
      notes: notes.trim() || null,
      viewing_instructions: viewingInstructions.trim() || null,
      intention: intention || null,
      reminder_minutes: reminders[0] ?? 0,
      reminders,
      recurrence_rule: recurrence,
      assigned_user_id: assignedUserId || currentUserId || null,
      attendeeIds: attendees,
      is_private: isPrivate,
      allowConflict: conflictAck,
    };
    setBusy(true);
    setMessage(null);
    try {
      await onSave(draft, isRecurring ? scope : undefined);
      if (!existing) writeApptPrefs(user?.id, { kind, assigneeId: assignedUserId || undefined });
      setMessage({ type: 'ok', text: existing ? 'Appointment updated.' : 'Appointment created.' });
      window.setTimeout(onClose, 800);
    } catch (e) {
      setMessage({ type: 'err', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-0 md:p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-none md:rounded-2xl shadow-2xl my-0 md:my-6 max-h-[100vh] md:max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[#eef1f4] bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-[#0d1f2d] rounded-lg">
              <i className={`${kind === 'viewing' ? 'ri-home-4-line' : kind === 'appraisal' ? 'ri-line-chart-line' : 'ri-calendar-event-line'} text-white text-base`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0d1f2d]">{existing ? 'Edit appointment' : 'New appointment'}</h3>
              <p className="text-[13px] text-[#7a8a99] mt-0.5">Fill in the details to set New appointment.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f4f6f8] text-[#7a8a99] cursor-pointer"><i className="ri-close-line text-lg" /></button>
        </div>

        <div className="p-5">
          {/* ── Appointment ── */}
          <CollapsibleCard icon="ri-calendar-event-line" title="Appointment" defaultOpen={false}>
            <div className="space-y-5">
              <div>
                <label className={LABEL}>Appointment type</label>
                <select value={kind} onChange={(e) => setKind(e.target.value as AppointmentKind)} className={selectClass}>
                  {(Object.keys(KIND_LABELS) as AppointmentKind[]).map((k) => (
                    <option key={k} value={k}>{KIND_LABELS[k]}</option>
                  ))}
                </select>
                <p className={HINT}>{KIND_ROUTING[kind].hint}</p>
              </div>
              <div>
                <label className={LABEL}>Title *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 4 Bed House — Lavington viewing" className={inputBase} />
              </div>
            </div>
          </CollapsibleCard>

          {/* ── Property & client ── */}
          <CollapsibleCard icon="ri-home-4-line" title="Property & client" defaultOpen={false}>
            <div className="space-y-5">
              {kind !== 'general' && (
                <div>
                  <label className={LABEL}>{kind === 'appraisal' ? 'Property (to appraise)' : 'Property'}</label>
                  <PropertyPicker value={property} onChange={setProperty} ownerUserId={currentUserId} />
                </div>
              )}
              <ContactPicker selected={contacts} onChange={setContacts} agentId={currentUserId} label={kind === 'appraisal' ? 'Property owner / contact' : 'Applicants / attendees'} />
              {agents && agents.length > 0 && (
                <div>
                  <label className={LABEL}>Assigned agent</label>
                  <select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)} className={selectClass}>
                    {agents.map((a) => <option key={a.user_id} value={a.user_id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </CollapsibleCard>

          {/* ── Schedule ── */}
          <CollapsibleCard icon="ri-time-line" title="Schedule" defaultOpen={false}>
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={LABEL}>Date *</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputBase} />
                </div>
                <div>
                  <label className={LABEL}>Start *</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputBase} />
                </div>
                <div>
                  <label className={LABEL}>End *</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputBase} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-bold uppercase tracking-wide text-[#0d1f2d] leading-none">Duration</span>
                  {duration > 0 && <span className="text-[13px] font-semibold text-[#0d5959]">{formatDuration(duration)}</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DURATION_SHORTCUTS.map((d) => (
                    <button key={d.value} type="button" onClick={() => setEndTime(addMinutesToTime(startTime, d.value))} className={`${CHIP} ${duration === d.value ? CHIP_ON : CHIP_OFF}`}>{d.label}</button>
                  ))}
                </div>
              </div>

              {draftForCheck && (conflicts.length > 0 || !withinHours) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                  <p className="text-[13px] font-bold text-amber-800 flex items-center gap-1.5"><i className="ri-error-warning-line" /> Scheduling conflict</p>
                  {!withinHours && <p className="text-xs text-amber-700 mt-1.5">This slot is outside working hours or overlaps scheduled time off.</p>}
                  {conflicts.map((c) => (
                    <p key={c.id} className="text-xs text-amber-700 mt-1.5">Clashes with <strong>{c.title}</strong> · {fmtTime(c.starts_at)}–{fmtTime(c.ends_at)}</p>
                  ))}
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    <button type="button" onClick={() => setConflictAck(true)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer whitespace-nowrap ${conflictAck ? 'bg-amber-600 text-white' : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-100'}`}>Keep anyway</button>
                    <button type="button" onClick={() => setStartTime(addMinutesToTime(startTime, 30))} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 cursor-pointer whitespace-nowrap">Change time</button>
                    {agents && agents.length > 0 && (
                      <select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)} className="px-2.5 py-1.5 rounded-lg text-[11px] border border-amber-300 bg-white text-amber-700 cursor-pointer">
                        <option value="">Assign another agent…</option>
                        {agents.map((a) => <option key={a.user_id} value={a.user_id}>{a.name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleCard>

          {/* ── Location & logistics ── */}
          <CollapsibleCard icon="ri-map-pin-2-line" title="Location & logistics" defaultOpen={false}>
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Location type</label>
                  <select value={locationType} onChange={(e) => setLocationType(e.target.value)} className={selectClass}>
                    {LOCATION_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Location / address</label>
                  <input value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="Address or meeting point" className={inputBase} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Meeting point</label>
                <input value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} placeholder="e.g. Main gate, keys with caretaker" className={inputBase} />
              </div>

              {kind === 'viewing' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Viewing instructions</label>
                    <input value={viewingInstructions} onChange={(e) => setViewingInstructions(e.target.value)} placeholder="e.g. Meet at gate, call owner before arrival" className={inputBase} />
                  </div>
                  <div>
                    <label className={LABEL}>Applicant intention</label>
                    <select value={intention} onChange={(e) => setIntention(e.target.value as AppointmentIntention)} className={selectClass}>
                      <option value="">Not specified</option>
                      {INTENTIONS.map((i) => <option key={i} value={i}>{INTENTION_LABELS[i]}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleCard>

          {/* ── Reminders & notes ── */}
          <CollapsibleCard icon="ri-notification-3-line" title="Reminders & notes" defaultOpen={false}>
            <div className="space-y-5">
              <div>
                <label className={LABEL}>Reminders</label>
                <div className="flex flex-wrap gap-1.5">
                  {REMINDER_OPTIONS.filter((r) => r.value > 0).map((r) => {
                    const active = reminders.includes(r.value);
                    return (
                      <button key={r.value} type="button" onClick={() => toggleReminder(r.value)} className={`${CHIP} ${active ? CHIP_ON : CHIP_OFF}`}>{r.label}</button>
                    );
                  })}
                </div>
                {reminders.length > 0 && <p className={HINT}>Reminders: {reminders.map((m) => reminderLabel(m)).join(', ')}</p>}
              </div>

              <div>
                <label className={LABEL}>Repeat</label>
                <RecurrenceEditor value={recurrence} onChange={setRecurrence} />
              </div>

              {staff.length > 0 && (
                <div>
                  <label className={LABEL}>Invite team members</label>
                  <div className="flex flex-wrap gap-2">
                    {staff.map((t) => (
                      <button key={t.user_id} type="button" onClick={() => toggleAttendee(t.user_id)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${attendees.includes(t.user_id) ? CHIP_ON : CHIP_OFF}`}>
                        {t.avatar ? <img src={t.avatar} alt={t.name} className="w-4 h-4 rounded-full object-cover" /> : <span className="w-4 h-4 rounded-full bg-[#e0e6ec] flex items-center justify-center text-[8px] font-bold text-[#5a6a7a]">{t.name.charAt(0).toUpperCase()}</span>}
                        {t.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className={LABEL}>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder="Optional notes" className={`${inputBase} resize-none`} />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e8edf2] bg-[#f7f9fa] p-4">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg bg-white border border-[#e8edf2]"><i className="ri-lock-line text-[#0d5959] text-sm" /></span>
                  <div>
                    <p className="text-sm font-bold text-[#0d1f2d]">Private appointment</p>
                    <p className="text-[13px] text-[#7a8a99] mt-0.5 leading-relaxed">Still blocks your availability, but other staff viewing the company calendar see only “Busy”.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrivate((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${isPrivate ? 'bg-[#0d5959]' : 'bg-[#cfd8e0]'}`}
                  aria-pressed={isPrivate}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isPrivate ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {isRecurring && (
                <div className="rounded-xl border border-[#bfe0e0] bg-[#0d5959]/5 p-4">
                  <p className="text-[13px] font-bold text-[#0d5959] flex items-center gap-1.5"><i className="ri-loop-right-line" /> This appointment is part of a recurring series</p>
                  <p className="text-xs text-[#0d5959] mt-1">{describeRecurrence(existing?.recurrence_rule || null)}</p>
                  <div className="mt-2.5 space-y-2">
                    {EDIT_SCOPE_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
                        <input type="radio" name="recur-scope" checked={scope === opt.value} onChange={() => setScope(opt.value)} className="mt-0.5 accent-[#0d5959] cursor-pointer" />
                        <span>
                          <span className="block text-[13px] font-semibold text-[#2d3748]">{opt.label}</span>
                          <span className="block text-xs text-[#7a8a99] mt-0.5">{opt.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleCard>

          {message && (
            <div className={`mt-5 rounded-lg px-4 py-2.5 text-sm font-semibold ${message.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{message.text}</div>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 px-6 py-4 border-t border-[#eef1f4] bg-white">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-[#5a6a7a] hover:bg-[#f4f6f8] cursor-pointer whitespace-nowrap">Cancel</button>
          <button onClick={submit} disabled={busy} className="px-5 py-2.5 rounded-lg bg-[#0d5959] text-white text-sm font-semibold hover:bg-[#0a4747] cursor-pointer disabled:opacity-50 whitespace-nowrap">
            {busy ? 'Saving…' : existing ? 'Save changes' : 'Create appointment'}
          </button>
        </div>
      </div>
    </div>
  );
}