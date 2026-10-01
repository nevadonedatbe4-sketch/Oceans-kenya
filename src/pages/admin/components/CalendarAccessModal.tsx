import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// ─────────────────────────────────────────────────────────────
// CALENDAR ACCESS — lets an admin grant specific staff members the
// "can manage company calendar" flag (appointment-setter capability).
// Stored in `og_calendar_access`, which is admin-write / self-read only,
// so this can never be self-granted from the client.
// ─────────────────────────────────────────────────────────────

interface Agent { user_id: string; name: string }

interface Props {
  open: boolean;
  onClose: () => void;
  agents: Agent[];
}

export default function CalendarAccessModal({ open, onClose, agents }: Props) {
  const { user } = useAuth();
  const [granted, setGranted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const { data, error: e } = await supabase
          .from('og_calendar_access')
          .select('user_id, can_manage_company_calendar');
        if (e) throw e;
        const map: Record<string, boolean> = {};
        (data || []).forEach((r) => {
          map[(r as { user_id: string }).user_id] = (r as { can_manage_company_calendar: boolean }).can_manage_company_calendar;
        });
        setGranted(map);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const toggle = async (userId: string) => {
    const next = !granted[userId];
    setSavingId(userId);
    setError(null);
    setGranted((g) => ({ ...g, [userId]: next }));
    const { error: e } = await supabase
      .from('og_calendar_access')
      .upsert({
        user_id: userId,
        can_manage_company_calendar: next,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    if (e) {
      setError(e.message);
      setGranted((g) => ({ ...g, [userId]: !next }));
    }
    setSavingId(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-white">
          <div>
            <h3 className="text-base font-semibold text-neutral-800">Appointment setters</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Designate staff who schedule for the whole agency. They can manage the Company Calendar and create, assign, reschedule or cancel anyone&apos;s appointments.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-400 cursor-pointer"><i className="ri-close-line text-lg" /></button>
        </div>

        <div className="p-5 space-y-2">
          {error && <div className="rounded-lg bg-red-50 text-red-600 text-xs px-3 py-2">{error}</div>}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-neutral-400"><i className="ri-loader-4-line animate-spin text-xl" /></div>
          ) : agents.length === 0 ? (
            <p className="text-xs text-neutral-400">No staff to configure.</p>
          ) : (
            agents.map((a) => {
              const on = !!granted[a.user_id];
              return (
                <div key={a.user_id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 shrink-0 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-semibold text-neutral-500">{a.name.charAt(0).toUpperCase()}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-700 truncate">{a.name}</p>
                      <p className="text-[11px] text-neutral-400">{on ? 'Appointment Setter — full scheduling' : 'Own appointments only'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(a.user_id)}
                    disabled={savingId === a.user_id}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 disabled:opacity-50 ${on ? 'bg-teal-600' : 'bg-neutral-200'}`}
                    aria-pressed={on}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end px-5 py-4 border-t border-neutral-100 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-neutral-800 text-white text-sm font-medium hover:bg-neutral-900 cursor-pointer whitespace-nowrap">Done</button>
        </div>
      </div>
    </div>
  );
}