import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import useIdleSignOut from '@/hooks/useIdleSignOut';

/** Idle guard tuned for shared agent machines: 30 min idle → 60s countdown. */
const IDLE_MS = 30 * 60 * 1000;
const WARN_MS = 60 * 1000;
const INACTIVITY_NOTICE =
  'You were signed out automatically after a period of inactivity. Please sign in again.';

/**
 * Wraps the agent portal and signs the agent out after a long idle period,
 * with a visible countdown so nobody loses work to a silent logout. Only
 * mounted inside the agent shell, so admins are unaffected.
 */
export default function IdleSignOutGuard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleIdle = useCallback(() => {
    signOut(INACTIVITY_NOTICE).finally(() => navigate('/agent/login', { replace: true }));
  }, [signOut, navigate]);

  const { warning, secondsLeft, stayActive } = useIdleSignOut({
    enabled: true,
    idleMs: IDLE_MS,
    warnMs: WARN_MS,
    onIdle: handleIdle,
  });

  if (!warning) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-lg bg-[#001731] border border-[#1c3a5e] p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#5eead4]/10 flex items-center justify-center mx-auto mb-4">
          <i className="ri-timer-flash-line text-[#5eead4] text-2xl" />
        </div>
        <h2 className="text-lg font-roboto font-bold text-white mb-1">Are you still there?</h2>
        <p className="text-sm font-roboto text-white/70 leading-relaxed mb-4">
          For your security, you&apos;ll be signed out in
        </p>
        <p className="text-3xl font-roboto font-black text-[#5eead4] mb-6 tabular-nums">
          {secondsLeft}s
        </p>
        <button
          type="button"
          onClick={stayActive}
          className="w-full bg-[#5eead4] hover:bg-[#4dd8c3] text-[#001731] py-3 rounded-md text-sm font-roboto font-bold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap"
        >
          Stay signed in
        </button>
        <button
          type="button"
          onClick={handleIdle}
          className="mt-2 w-full py-2.5 text-xs font-roboto text-white/60 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          Sign out now
        </button>
      </div>
    </div>
  );
}