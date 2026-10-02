import { useCallback, useEffect, useRef, useState } from 'react';
import { usePageContent } from '@/hooks/usePageContent';
import { DEFAULT_CHECKIN_COPY, fillTemplate } from '@/lib/ogroupCopy';
import {
  getDevicePosition,
  reverseGeocode,
  searchLocations,
  resolveTypedLocation,
  isValidCoords,
  sourceLabel,
  type GeoFailure,
  type GeoPermission,
  type PunchLocation,
} from '../attendanceLocation';
import type { PunchOutcome } from '../useAttendance';

interface Props {
  busy: boolean;
  onCancel: () => void;
  /** A punch is only ever submitted with a REAL location (device fix or a
   *  manually chosen place). There is no coordinate-less fallback. */
  onConfirm: (location: PunchLocation) => Promise<PunchOutcome>;
}

/**
 * ONE authoritative punch-in location flow, shared by every role and team.
 *
 * Phases mirror the real pipeline so the UI never lies about what is happening:
 *   detecting → "Detecting your location…"  (the browser permission prompt fires here)
 *   checking  → "Checking location…"        (reverse-geocoding the coordinates)
 *   ready     → a real fix + accuracy + map → user explicitly confirms the punch
 *   failed    → a SPECIFIC, recoverable state (no generic "something went wrong")
 *
 * There is NO "punch in anyway" escape hatch: without valid coordinates a punch
 * is not offered. Every failure path is recoverable (retry / search / cancel).
 *
 * Every visible string is editable from the "Check-In & Breaks" editor.
 */
type Phase = 'detecting' | 'checking' | 'ready' | 'failed';

type Copy = typeof DEFAULT_CHECKIN_COPY;

interface FailureView {
  title: string;
  hint: string;
  icon: string;
  tone: 'amber' | 'red' | 'neutral';
  /** Extra, ordered recovery instructions (e.g. how to un-block location). */
  steps?: string[];
  /** Whether "Try again" makes sense for this state. */
  canRetry: boolean;
}

/** Map the REAL failure (never a generic one) onto a specific, recoverable state. */
function failureView(failure: GeoFailure | null, permission: GeoPermission, c: Copy): FailureView {
  const code = failure?.code;

  // PERMANENTLY blocked — the browser remembered "Block" at the site level.
  // (We only reach here when the live permission query really says `denied`.)
  if (permission === 'denied') {
    return {
      title: c.pm_blocked_title,
      hint: c.pm_blocked_hint,
      icon: 'ri-lock-2-line',
      tone: 'red',
      steps: [c.pm_blocked_step1, c.pm_blocked_step2, c.pm_blocked_step3],
      canRetry: true,
    };
  }
  // Reported as denied but NOT permanently blocked — the user simply hasn't
  // allowed yet (prompt dismissed / not yet decided). Re-request, never a scary
  // "blocked" screen.
  if (code === 'denied') {
    return {
      title: c.pm_required_title,
      hint: c.pm_required_hint,
      icon: 'ri-map-pin-user-line',
      tone: 'amber',
      canRetry: true,
    };
  }
  if (code === 'unsupported' || permission === 'unsupported') {
    return {
      title: c.pm_unsupported_title,
      hint: c.pm_unsupported_hint,
      icon: 'ri-window-line',
      tone: 'neutral',
      canRetry: false,
    };
  }
  if (code === 'insecure_context') {
    return {
      title: c.pm_insecure_title,
      hint: c.pm_insecure_hint,
      icon: 'ri-lock-line',
      tone: 'neutral',
      canRetry: false,
    };
  }
  if (code === 'timeout') {
    if (permission === 'prompt') {
      return {
        title: c.pm_required_title,
        hint: c.pm_required_hint,
        icon: 'ri-map-pin-user-line',
        tone: 'amber',
        canRetry: true,
      };
    }
    return {
      title: c.pm_timeout_title,
      hint: c.pm_timeout_hint,
      icon: 'ri-timer-line',
      tone: 'amber',
      canRetry: true,
    };
  }
  return {
    title: c.pm_unavailable_title,
    hint: c.pm_unavailable_hint,
    icon: 'ri-map-pin-2-line',
    tone: 'amber',
    canRetry: true,
  };
}

const TONE: Record<FailureView['tone'], { card: string; icon: string; title: string; hint: string }> = {
  amber: { card: 'bg-amber-50 border-amber-200', icon: 'text-amber-600', title: 'text-amber-900', hint: 'text-amber-800' },
  red: { card: 'bg-red-50 border-red-200', icon: 'text-red-600', title: 'text-red-900', hint: 'text-red-800' },
  neutral: { card: 'bg-neutral-50 border-neutral-200', icon: 'text-neutral-500', title: 'text-neutral-900', hint: 'text-neutral-600' },
};

/** Accuracy beyond this (metres) is shown as a low-accuracy warning. */
const LOW_ACCURACY_M = 500;

export default function PunchInLocationModal({ busy, onCancel, onConfirm }: Props) {
  const { content: c } = usePageContent('ogroup_checkin', DEFAULT_CHECKIN_COPY);
  const [phase, setPhase] = useState<Phase>('detecting');
  const [location, setLocation] = useState<PunchLocation | null>(null);
  const [failure, setFailure] = useState<GeoFailure | null>(null);
  const [permission, setPermission] = useState<GeoPermission>('prompt');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PunchLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [typedError, setTypedError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const hasValidLocation = !!location && isValidCoords(location.lat, location.lng);

  const submitPunch = useCallback(async () => {
    if (!location || !isValidCoords(location.lat, location.lng)) return;
    setSubmitting(true);
    setInlineError(null);
    const out = await onConfirm(location);
    setSubmitting(false);
    if (out.ok) return; // parent closes the dialog
    setInlineError(out.message || 'Something went wrong. Please try again.');
  }, [location, onConfirm]);

  // Re-run detection. Always safe to call — this is the ONE detection path used
  // by open, "Try again", and "Change location" → back.
  const runDetect = useCallback(async () => {
    const runId = ++runIdRef.current;
    setPhase('detecting');
    setFailure(null);
    setLocation(null);
    setTypedError(null);
    setSearchOpen(false);
    setInlineError(null);

    // Give the flow a second, silent pass when the browser still reports the
    // permission as merely "not decided" (prompt). This re-raises the browser's
    // own "Allow location" prompt for anyone who dismissed it — no scary error
    // card, and never for a genuinely blocked permission (retrying can't help).
    for (let attempt = 0; attempt < 2; attempt += 1) {
      // 1. Ask the browser for a fix (this is where the permission prompt fires).
      const { coords, error, permission: perm } = await getDevicePosition();
      if (runId !== runIdRef.current) return; // a newer attempt superseded this one
      setPermission(perm);

      if (coords) {
        // 2. Coords obtained — resolve a readable label. A label failure NEVER
        //    blocks the punch: reverseGeocode always returns something (coords at
        //    worst) and coordinates are the authoritative evidence.
        setPhase('checking');
        const label = await reverseGeocode(coords.lat, coords.lng);
        if (runId !== runIdRef.current) return;
        setLocation({
          lat: coords.lat,
          lng: coords.lng,
          accuracy: coords.accuracy,
          label,
          source: 'browser_geolocation',
        });
        setPhase('ready');
        return;
      }

      // Only a not-yet-decided permission is worth an automatic re-ask.
      const reaskable = perm === 'prompt';
      if (attempt === 0 && reaskable) {
        await new Promise((r) => setTimeout(r, 700));
        if (runId !== runIdRef.current) return;
        continue;
      }

      setFailure(error);
      setPhase('failed');
      return;
    }
  }, []);

  // Opening the dialog IS the punch-in intent — kick off detection immediately.
  useEffect(() => {
    void runDetect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced manual search (only while the search panel is open).
  useEffect(() => {
    if (!searchOpen) return;
    const q = query.trim();
    setTypedError(null);
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const found = await searchLocations(q);
      setResults(found);
      setSearching(false);
      setSearched(true);
    }, 350);
    return () => clearTimeout(t);
  }, [query, searchOpen]);

  const chooseResult = (loc: PunchLocation) => {
    if (!isValidCoords(loc.lat, loc.lng)) return;
    setLocation(loc);
    setSearchOpen(false);
    setQuery('');
    setResults([]);
    setTypedError(null);
    setFailure(null);
    setPhase('ready');
  };

  const useTyped = async () => {
    const typed = query.trim();
    if (!typed) return;
    setSearching(true);
    const resolved = await resolveTypedLocation(typed);
    setSearching(false);
    if (resolved) {
      chooseResult(resolved);
    } else {
      setTypedError(fillTemplate(c.pm_typed_error, { query: typed }));
    }
  };

  const openSearch = () => {
    setSearchOpen(true);
    setTypedError(null);
  };

  // Back from search returns to whatever we actually have — never a false failure.
  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
    setResults([]);
    setTypedError(null);
    setPhase(hasValidLocation ? 'ready' : 'failed');
  };

  const mapSrc = hasValidLocation && location
    ? `https://maps.google.com/maps?q=${location.lat},${location.lng}&z=16&output=embed`
    : null;

  const view = failureView(failure, permission, c);
  const tone = TONE[view.tone];
  const lowAccuracy = phase === 'ready' && location?.accuracy != null && location.accuracy > LOW_ACCURACY_M;

  const secondaryBtn = 'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-semibold hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={busy || submitting ? undefined : onCancel} />
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-neutral-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <i className="ri-fingerprint-2-line text-lg" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">{c.pm_title}</h3>
              <p className="text-xs text-neutral-500">{c.pm_subtitle}</p>
            </div>
          </div>
          <button onClick={onCancel} disabled={busy || submitting} className="text-neutral-400 hover:text-neutral-600 cursor-pointer disabled:opacity-40">
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {/* ── Detecting ── */}
          {phase === 'detecting' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="relative w-16 h-16 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-60" />
                <span className="relative w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <i className="ri-map-pin-line text-xl" />
                </span>
              </span>
              <p className="mt-5 text-sm font-semibold text-neutral-800">{c.pm_detecting_title}</p>
              <p className="mt-1 text-xs text-neutral-500 max-w-[280px]">{c.pm_detecting_hint}</p>
            </div>
          )}

          {/* ── Checking (coordinates in hand, resolving the label) ── */}
          {phase === 'checking' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <i className="ri-loader-4-line animate-spin text-xl" />
              </span>
              <p className="mt-5 text-sm font-semibold text-neutral-800">{c.pm_checking_title}</p>
              <p className="mt-1 text-xs text-neutral-500 max-w-[260px]">{c.pm_checking_hint}</p>
            </div>
          )}

          {/* ── Ready to confirm ── */}
          {phase === 'ready' && location && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5">
                <i className="ri-checkbox-circle-fill text-emerald-600 text-lg mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-900">{c.pm_detected_title}</p>
                  <p className="text-sm text-emerald-800 mt-0.5 break-words">{location.label}</p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-emerald-700 border border-emerald-200">
                      <i className="ri-radar-line" /> {sourceLabel(location.source)}
                    </span>
                    {location.accuracy != null && (
                      <span className="text-[11px] font-medium text-emerald-700/80">± {Math.round(location.accuracy)} m</span>
                    )}
                  </div>
                </div>
              </div>

              {lowAccuracy && (
                <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-3.5">
                  <i className="ri-error-warning-line text-amber-600 text-lg mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900">{c.pm_low_acc_title}</p>
                    <p className="text-xs text-amber-800 mt-1">
                      {fillTemplate(c.pm_low_acc_hint, { accuracy: Math.round(location.accuracy || 0) })}
                    </p>
                  </div>
                </div>
              )}

              {mapSrc && (
                <div className="w-full h-[180px] rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
                  <iframe title="Punch-in location" src={mapSrc} className="w-full h-full border-0" referrerPolicy="no-referrer-when-downgrade" />
                </div>
              )}

              <button
                onClick={openSearch}
                disabled={busy || submitting}
                className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 py-2 transition-colors cursor-pointer disabled:opacity-40"
              >
                <i className="ri-search-line" /> {c.pm_change_location}
              </button>
            </div>
          )}

          {/* ── A specific, recoverable failure (NO punch shortcut) ── */}
          {phase === 'failed' && !searchOpen && (
            <div className="space-y-4">
              <div className={`flex items-start gap-3 rounded-2xl border p-3.5 ${tone.card}`}>
                <i className={`${view.icon} text-lg mt-0.5 ${tone.icon}`} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${tone.title}`}>{view.title}</p>
                  <p className={`text-xs mt-1 ${tone.hint}`}>{view.hint}</p>
                </div>
              </div>

              {view.steps && (
                <ol className="space-y-1.5 rounded-2xl bg-neutral-50 border border-neutral-200 p-3.5">
                  {view.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-neutral-600">
                      <span className="w-4 h-4 rounded-full bg-neutral-200 text-neutral-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              )}

              {failure?.message && (
                <p className="text-[11px] text-neutral-400 break-words">
                  {c.pm_reason_prefix} {failure.message}{failure.code !== 'unknown' ? ` (${failure.code})` : ''}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                {view.canRetry && (
                  <button onClick={() => void runDetect()} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap">
                    <i className="ri-refresh-line" /> {c.pm_try_again}
                  </button>
                )}
                <button onClick={openSearch} className={secondaryBtn}>
                  <i className="ri-search-line" /> {c.pm_search_manually}
                </button>
              </div>
            </div>
          )}

          {/* ── Manual search (real coordinates only) ── */}
          {searchOpen && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-800">{c.pm_search_title}</p>
                <button onClick={closeSearch} className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 cursor-pointer whitespace-nowrap">
                  <i className="ri-arrow-left-line" /> {c.pm_search_back}
                </button>
              </div>
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm" />
                <input
                  value={query}
                  autoFocus
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={c.pm_search_placeholder}
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              {searching && (
                <div className="flex items-center gap-2 text-xs text-neutral-400 py-1">
                  <i className="ri-loader-4-line animate-spin" /> {c.pm_searching}
                </div>
              )}

              {!searching && results.length > 0 && (
                <ul className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden max-h-[240px] overflow-y-auto">
                  {results.map((r, i) => (
                    <li key={`${r.label}-${i}`}>
                      <button
                        onClick={() => chooseResult(r)}
                        className="w-full text-left px-3.5 py-3 hover:bg-neutral-50 transition-colors cursor-pointer flex items-start gap-2.5"
                      >
                        <i className="ri-map-pin-line text-neutral-400 mt-0.5" />
                        <span className="flex-1 min-w-0 text-sm text-neutral-700 break-words">{r.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!searching && query.trim() && results.length === 0 && searched && !typedError && (
                <div className="rounded-xl border border-neutral-200 p-3.5 text-center">
                  <p className="text-xs text-neutral-500">{fillTemplate(c.pm_no_suggestions, { query: query.trim() })}</p>
                  <button
                    onClick={useTyped}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-map-pin-2-line" /> {fillTemplate(c.pm_find, { query: query.trim() })}
                  </button>
                </div>
              )}

              {typedError && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">{typedError}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer: confirm with real coordinates ── */}
        {phase === 'ready' && hasValidLocation && !searchOpen && (
          <div className="px-5 py-4 border-t border-neutral-100">
            {inlineError && (
              <p className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{inlineError}</p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button onClick={onCancel} disabled={busy || submitting} className="px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-500 hover:bg-neutral-50 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                {c.pm_cancel}
              </button>
              <button
                onClick={() => void submitPunch()}
                disabled={busy || submitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {submitting ? <><i className="ri-loader-4-line animate-spin" /> {c.pm_punching}</> : <><i className="ri-fingerprint-2-line" /> {c.pm_confirm}</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Footer: failure — no shortcut, just a clean way out ── */}
        {phase === 'failed' && !searchOpen && (
          <div className="px-5 py-4 border-t border-neutral-100 flex justify-end">
            <button onClick={onCancel} disabled={busy || submitting} className="px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-500 hover:bg-neutral-50 cursor-pointer disabled:opacity-40 whitespace-nowrap">
              {c.pm_cancel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}