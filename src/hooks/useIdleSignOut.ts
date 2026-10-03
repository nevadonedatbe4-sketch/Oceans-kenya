import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIdleSignOutOptions {
  /** When false the timer never runs (e.g. signed-out). */
  enabled: boolean;
  /** Milliseconds of inactivity before the countdown warning appears. */
  idleMs: number;
  /** Milliseconds of warning/countdown before onIdle fires. */
  warnMs: number;
  /** Called once when the countdown reaches zero. */
  onIdle: () => void;
}

interface UseIdleSignOutResult {
  /** True while the countdown warning is on screen. */
  warning: boolean;
  /** Seconds remaining in the countdown. */
  secondsLeft: number;
  /** Reset the timer and dismiss the warning (e.g. "Stay signed in"). */
  stayActive: () => void;
}

/**
 * Shared-computer idle guard.
 *
 * Watches for user activity, and once the machine has been idle for `idleMs`
 * it shows a warning with a live countdown. If the user does nothing for
 * `warnMs` more, `onIdle` fires (the caller signs them out). Any activity
 * resets the clock, so an active agent is never interrupted.
 */
export default function useIdleSignOut({
  enabled,
  idleMs,
  warnMs,
  onIdle,
}: UseIdleSignOutOptions): UseIdleSignOutResult {
  const lastActivityRef = useRef(Date.now());
  const onIdleRef = useRef(onIdle);
  const firedRef = useRef(false);
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(warnMs / 1000));

  // Keep the latest callback without re-registering every listener.
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const stayActive = useCallback(() => {
    lastActivityRef.current = Date.now();
    firedRef.current = false;
    setWarning(false);
    setSecondsLeft(Math.ceil(warnMs / 1000));
  }, [warnMs]);

  // Activity listeners — throttled so mousemove never becomes a perf problem.
  useEffect(() => {
    if (!enabled) return;

    let lastMark = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastMark < 1000) return;
      lastMark = now;
      lastActivityRef.current = now;
      firedRef.current = false;
      setWarning((prev) => (prev ? false : prev));
      setSecondsLeft(Math.ceil(warnMs / 1000));
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        lastMark = 0;
        onActivity();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, warnMs]);

  // Single ticker drives both the idle detection and the countdown.
  useEffect(() => {
    if (!enabled) return;

    const tick = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (!warning) {
        if (elapsed >= idleMs) {
          setWarning(true);
          setSecondsLeft(Math.ceil(warnMs / 1000));
        }
        return;
      }

      setSecondsLeft((s) => {
        if (s <= 1) {
          if (!firedRef.current) {
            firedRef.current = true;
            onIdleRef.current();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [enabled, idleMs, warnMs, warning]);

  // Reset cleanly whenever the guard is disabled/remounted.
  useEffect(() => {
    if (enabled) {
      lastActivityRef.current = Date.now();
      firedRef.current = false;
      setWarning(false);
      setSecondsLeft(Math.ceil(warnMs / 1000));
    }
  }, [enabled, warnMs]);

  return { warning, secondsLeft, stayActive };
}