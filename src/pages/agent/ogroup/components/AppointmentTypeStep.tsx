import { useEffect, useRef, useState } from 'react';
import { KIND_LABELS, type AppointmentKind } from '../calendarTypes';
import { FORM_LABEL, FORM_HINT, KIND_ROUTING } from '../appointmentFormStyles';
import { readApptPrefs, writeApptPrefs } from '../appointmentPrefs';
import { selectClass } from '@/pages/crm/components/DevelopmentEdit/ui';

const KIND_ICON: Record<AppointmentKind, string> = {
  viewing: 'ri-home-4-line',
  appraisal: 'ri-line-chart-line',
  general: 'ri-calendar-event-line',
};

export interface RouteAgent {
  user_id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** When provided (company calendar / admin), the appointment can be routed to an agent. */
  agents?: RouteAgent[];
  /** Pre-select this agent (e.g. booking into a slot from the Schedule grid). */
  defaultAssigneeId?: string;
  /** Logged-in user — used to remember their last-used type + assignee. */
  currentUserId?: string | null;
  onContinue: (kind: AppointmentKind, assigneeId?: string) => void;
}

/**
 * Small decision step shown BEFORE the appointment form opens.
 * The chosen type decides which fields the form asks for AND who the
 * appointment is routed to (the assignee).
 *
 * The user's last-used type + assignee are remembered per user, so a repeat
 * booking is effectively a single click (the step opens pre-filled).
 */
export default function AppointmentTypeStep({
  open, onClose, agents, defaultAssigneeId, currentUserId, onContinue,
}: Props) {
  const [kind, setKind] = useState<AppointmentKind>('viewing');
  const [assignee, setAssignee] = useState('');
  const [remembered, setRemembered] = useState(false);
  const wasOpen = useRef(false);

  // Initialise only on the closed→open transition. (We intentionally avoid a
  // dep array on `agents`, whose array identity changes every render, so the
  // user's in-progress choice is never reset mid-interaction.)
  useEffect(() => {
    if (open && !wasOpen.current) {
      const prefs = readApptPrefs(currentUserId);
      setKind(prefs.kind || 'viewing');
      setAssignee(defaultAssigneeId || prefs.assigneeId || agents?.[0]?.user_id || '');
      setRemembered(!!(prefs.kind || prefs.assigneeId));
      wasOpen.current = true;
    } else if (!open && wasOpen.current) {
      wasOpen.current = false;
    }
  });

  if (!open) return null;

  const routing = KIND_ROUTING[kind];
  const showRouting = !!agents && agents.length > 0;

  const handleContinue = () => {
    writeApptPrefs(currentUserId, { kind, assigneeId: assignee || undefined });
    onContinue(kind, assignee || undefined);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-start md:items-center justify-center p-0 md:p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-none md:rounded-2xl shadow-2xl my-0 md:my-6">
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-5 border-b border-[#eef1f4]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-[#0d1f2d] rounded-lg">
              <i className="ri-calendar-event-line text-white text-base" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0d1f2d] tracking-normal">New appointment</h3>
              <p className="text-[13px] text-[#7a8a99] mt-0.5 leading-relaxed">First, tell us what you’re scheduling — it decides the fields and who it goes to.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f4f6f8] text-[#7a8a99] cursor-pointer shrink-0"><i className="ri-close-line text-lg" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {remembered && (
            <div className="flex items-center gap-2.5 rounded-lg bg-[#0d5959]/5 border border-[#bfe0e0] px-3.5 py-2.5">
              <i className="ri-history-line text-[#0d5959] text-sm" />
              <p className="text-[13px] font-medium text-[#0d5959]">Prefilled from your last booking — just hit Continue.</p>
            </div>
          )}

          <div>
            <label className={FORM_LABEL}>Which type of appointment?</label>
            <div className="space-y-2.5">
              {(Object.keys(KIND_LABELS) as AppointmentKind[]).map((k) => {
                const active = kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`group w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      active
                        ? 'border-[#0d5959] bg-[#0d5959] text-white'
                        : 'border-[#e8edf2] bg-white text-[#0d1f2d] hover:border-[#0d5959]/40 hover:bg-[#0d5959]/5'
                    }`}
                  >
                    <span className={`w-10 h-10 flex items-center justify-center shrink-0 rounded-lg ${active ? 'bg-white/15 text-white' : 'bg-[#f4f6f8] text-[#0d5959]'}`}>
                      <i className={`${KIND_ICON[k]} text-lg`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold tracking-normal">{KIND_LABELS[k]}</span>
                      <span className={`block text-[12.5px] mt-0.5 leading-relaxed ${active ? 'text-white/75' : 'text-[#7a8a99]'}`}>{KIND_ROUTING[k].needs}</span>
                    </span>
                    <span className={`w-5 h-5 flex items-center justify-center shrink-0 rounded-full border-2 ${active ? 'border-white bg-white text-[#0d5959]' : 'border-[#cfd8e0] text-transparent'}`}>
                      <i className="ri-check-line text-[11px]" />
                    </span>
                  </button>
                );
              })}
            </div>
            <p className={FORM_HINT}>{routing.hint}</p>
          </div>

          {/* Where it goes */}
          <div className="rounded-xl border border-[#e8edf2] bg-[#f7f9fa] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg bg-white border border-[#e8edf2]"><i className="ri-route-line text-[#0d5959] text-sm" /></span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold uppercase tracking-wide text-[#0d1f2d] leading-none">Needs</p>
                <p className="text-sm text-[#2d3748] mt-1.5">{routing.needs}</p>
              </div>
            </div>
            <div className="h-px bg-[#e8edf2]" />
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg bg-white border border-[#e8edf2]"><i className="ri-send-plane-line text-[#0d5959] text-sm" /></span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold uppercase tracking-wide text-[#0d1f2d] leading-none">Goes to</p>
                <p className="text-sm text-[#2d3748] mt-1.5">{routing.route}</p>
              </div>
            </div>
          </div>

          {showRouting && (
            <div>
              <label className={FORM_LABEL}>Assign to</label>
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={selectClass}>
                {(agents || []).map((a) => <option key={a.user_id} value={a.user_id}>{a.name}</option>)}
              </select>
              <p className={FORM_HINT}>This sets the owner of the appointment — it lands straight on their My Calendar.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#eef1f4]">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-[#5a6a7a] hover:bg-[#f4f6f8] cursor-pointer whitespace-nowrap">Cancel</button>
          <button onClick={handleContinue} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#0d5959] text-white text-sm font-semibold hover:bg-[#0a4747] cursor-pointer whitespace-nowrap">
            Continue <i className="ri-arrow-right-line text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
}