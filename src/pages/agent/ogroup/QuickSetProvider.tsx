import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { fetchStaffDirectory } from './staffDirectory';
import { createAppointmentQuick, findQuickConflicts } from './appointmentCreate';
import type { CalendarDraft } from './useCalendar';
import type { AppointmentKind } from './calendarTypes';
import AppointmentForm, { type AgentPick } from './components/AppointmentForm';
import AppointmentTypeStep from './components/AppointmentTypeStep';

// ─────────────────────────────────────────────────────────────
// GLOBAL QUICK SET APPOINTMENT
//
// ONE reusable create flow, mounted above every route, launchable from
// anywhere (sidebar, dashboard, any CRM record) without first navigating
// into the Calendar. Contextual callers can pre-populate the relevant
// record via `openQuickSet({ propertyId } | { contactIds } | { assigneeId })`.
// ─────────────────────────────────────────────────────────────

export interface QuickSetOptions {
  /** Pre-select the appointment type (skips the type step's default). */
  kind?: AppointmentKind;
  /** Pre-assign the appointment (launched from an agent record, or a schedule slot). */
  assigneeId?: string;
  /** Pre-set the date/time (launched from a schedule slot). */
  start?: Date;
  /** Pre-select a listing (launched from a property record). */
  propertyId?: string | null;
  /** Pre-select applicants/contacts (launched from an applicant record). */
  contactIds?: string[];
  /** Optional pre-filled title. */
  title?: string;
}

interface QuickSetApi {
  openQuickSet: (opts?: QuickSetOptions) => void;
}

const QuickSetContext = createContext<QuickSetApi | null>(null);

export function useQuickSet(): QuickSetApi {
  const ctx = useContext(QuickSetContext);
  if (!ctx) throw new Error('useQuickSet must be used inside <QuickSetProvider>');
  return ctx;
}

export function QuickSetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stepOpen, setStepOpen] = useState(false);
  const [opts, setOpts] = useState<QuickSetOptions | undefined>(undefined);
  const [modal, setModal] = useState<{ open: boolean; kind?: AppointmentKind; assignee?: string }>({ open: false });
  const [roster, setRoster] = useState<AgentPick[]>([]);
  const [canAssign, setCanAssign] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchStaffDirectory()
      .then((rows) => {
        if (!active) return;
        setRoster(
          rows
            .filter((r) => r.status === 'active')
            .map((r) => ({ user_id: r.user_id, name: r.name || 'Agent', avatar: r.avatar_url })),
        );
      })
      .catch(() => { /* roster is optional */ });
    return () => { active = false; };
  }, []);

  // Only users with company-calendar permission may assign to another agent.
  useEffect(() => {
    if (!user?.id) { setCanAssign(false); return; }
    let active = true;
    void (async () => {
      try {
        const { data } = await supabase.rpc('og_can_manage_company_calendar');
        if (active) setCanAssign(!!data);
      } catch {
        if (active) setCanAssign(false);
      }
    })();
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const openQuickSet = useCallback((o?: QuickSetOptions) => {
    setOpts(o);
    setStepOpen(true);
  }, []);

  const continueNew = useCallback((kind: AppointmentKind, assigneeId?: string) => {
    setModal({ open: true, kind, assignee: assigneeId || opts?.assigneeId });
    setStepOpen(false);
  }, [opts]);

  const api = useMemo<QuickSetApi>(() => ({ openQuickSet }), [openQuickSet]);

  // Agents without company-calendar permission simply book for themselves.
  const agents = canAssign && roster.length ? roster : undefined;

  return (
    <QuickSetContext.Provider value={api}>
      {children}

      <AppointmentTypeStep
        open={stepOpen}
        onClose={() => setStepOpen(false)}
        agents={agents}
        defaultAssigneeId={opts?.assigneeId}
        currentUserId={user?.id}
        onContinue={continueNew}
      />

      <AppointmentForm
        open={modal.open}
        onClose={() => setModal({ open: false })}
        existing={null}
        defaults={{
          start: opts?.start ?? new Date(),
          kind: modal.kind,
          propertyId: opts?.propertyId ?? null,
          contactIds: opts?.contactIds,
          title: opts?.title,
        }}
        currentUserId={user?.id}
        agents={agents}
        defaultAssigneeId={modal.assignee}
        conflictChecker={findQuickConflicts}
        onSave={async (draft: CalendarDraft) => {
          if (!user?.id) throw new Error('You must be signed in to create an appointment.');
          const res = await createAppointmentQuick(user.id, draft);
          setToast(res.notice || 'Appointment scheduled.');
        }}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-neutral-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg max-w-[90vw] text-center">
          {toast}
        </div>
      )}
    </QuickSetContext.Provider>
  );
}