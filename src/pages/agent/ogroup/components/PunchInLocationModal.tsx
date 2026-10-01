import { useCallback, useEffect, useRef, useState } from 'react';
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
  /** `location` is null when the device could not provide a fix — the punch
   *  still proceeds and the server records the saved office location. */
  onConfirm: (location: PunchLocation | null, note?: string) => Promise<PunchOutcome>;
}

/**
 * Phases mirror the real pipeline, so the UI never claims "location required"
 * while the browser is still resolving:
 *   detecting → "Getting your location…"  (permission prompt happens here)
 *   checking  → "Checking location…"      (reverse-geocoding the coords)
 *   ready     → coords confirmed, user confirms the punch
 *   failed    → no fix, but the punch STILL proceeds using the office stand-in
 *
 * There is no blocking state: a missing location never stops a punch-in.
 */
type Phase = 'detecting' | 'checking' | 'ready' | 'failed';

function failureCopy(failure: GeoFailure | null, permission: GeoPermission): { title: string; hint: string } {
  const code = failure?.code;
  if (code === 'denied' || permission === 'denied') {
    return {
      title: 'Location access is blocked',
      hint: 'No problem — you can still punch in and we’ll use your saved office location. To share your exact position, allow Location for this site in your browser.',
    };
  }
  if (code === 'insecure_context') {
    return {
      title: 'Location needs a secure connection',
      hint: 'You can still punch in — we’ll use your saved office location.',
    };
  }
  if (code === 'unsupported') {
    return {
      title: 'This browser can’t share location',
      hint: 'You can still punch in — we’ll use your saved office location.',
    };
  }
  if (code === 'timeout') {
    return {
      title: 'Getting your location timed out',
      hint: 'You can still punch in — we’ll use your saved office location. Or retry for your exact position.',
    };
  }
  return {
    title: 'We couldn’t detect your location',
    hint: 'You can still punch in — we’ll record your shift using your saved office location. You can also retry or search manually.',
  };
}

export default function PunchInLocationModal({ busy, onCancel, onConfirm }: Props) {
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

  // Submit the punch to the parent. Works with OR without coordinates — when
  // there is no fix the server falls back to the saved office location, so a
  // punch is never blocked.
  const submitPunch = useCallback(async () => {
    setSubmitting(true);
    setInlineError(null);
    const out = await onConfirm(location, undefined);
    setSubmitting(false);
    if (out.ok) return; // parent closes the dialog
    setInlineError(out.message || 'Something went wrong. Please try again.');
  }, [location, onConfirm]);

  const runDetect = useCallback(async () => {
    const runId = ++runIdRef.current;
    setPhase('detecting');
    setFailure(null);
    setLocation(null);
    setTypedError(null);

    // 1. Ask the browser for a fix (this is where the permission prompt happens).
    const { coords, error, permission: perm } = await getDevicePosition();
    if (runId !== runIdRef.current) return; // a newer attempt superseded this one
    setPermission(perm);

    if (!coords) {
      setFailure(error);
      setPhase('failed');
      return;
    }

    // 2. Coords obtained — resolve a readable label (this is the "checking" step).
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
  }, []);

  // Auto-detect as soon as the dialog opens — opening the dialog IS the punch-in action.
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
      setTypedError(`We couldn’t find coordinates for “${typed}”. Try a more specific place.`);
    }
  };

  const openSearch = () => {
    setSearchOpen(true);
    setTypedError(null);
  };

  // Back from search returns to whatever we actually have, never a false failure.
  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
    setResults([]);
    setTypedError(null);
    setPhase(location && isValidCoords(location.lat, location.lng) ? 'ready' : 'failed');
  };

  const hasValidLocation = !!location && isValidCoords(location.lat, location.lng);
  const mapSrc = hasValidLocation && location
    ? `https://maps.google.com/maps?q=${location.lat},${location.lng}&z=16&output=embed`
    : null;
  const copy = failureCopy(failure, permission);
  const showReadyFooter = phase === 'ready' && hasValidLocation && !searchOpen;
  const showFallbackFooter = phase === 'failed' && !searchOpen;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onCancel} />
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-neutral-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <i className="ri-fingerprint-2-line text-lg" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">Punch in</h3>
              <p className="text-xs text-neutral-500">Confirm your location to start your shift</p>
            </div>
          </div>
          <button onClick={onCancel} disabled={busy} className="text-neutral-400 hover:text-neutral-600 cursor-pointer disabled:opacity-40">
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {/* ── Resolving location ── */}
          {phase === 'detecting' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="relative w-16 h-16 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-60" />
                <span className="relative w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <i className="ri-map-pin-line text-xl" />
                </span>
              </span>
              <p className="mt-5 text-sm font-semibold text-neutral-800">Getting your location…</p>
              <p className="mt-1 text-xs text-neutral-500 max-w-[260px]">
                If your browser asks for location access, choose <strong>Allow</strong>. Either way you can punch in next.
              </p>
            </div>
          )}

          {/* ── Location obtained, resolving the label ── */}
          {phase === 'checking' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <i className="ri-loader-4-line animate-spin text-xl" />
              </span>
              <p className="mt-5 text-sm font-semibold text-neutral-800">Checking location…</p>
              <p className="mt-1 text-xs text-neutral-500 max-w-[260px]">Got your coordinates — matching them to a place.</p>
            </div>
          )}

          {/* ── Ready to confirm ── */}
          {phase === 'ready' && location && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5">
                <i className="ri-checkbox-circle-fill text-emerald-600 text-lg mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-900">Location detected</p>
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

              {mapSrc && (
                <div className="w-full h-[180px] rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
                  <iframe title="Punch-in location" src={mapSrc} className="w-full h-full border-0" referrerPolicy="no-referrer-when-downgrade" />
                </div>
              )}

              <button
                onClick={openSearch}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 py-2 transition-colors cursor-pointer disabled:opacity-40"
              >
                <i className="ri-search-line" /> Change location
              </button>
            </div>
          )}

          {/* ── No fix detected — but the punch still proceeds ── */}
          {phase === 'failed' && !searchOpen && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-3.5">
                <i className="ri-map-pin-2-line text-amber-600 text-lg mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">{copy.title}</p>
                  <p className="text-xs text-amber-800 mt-1">{copy.hint}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5">
                <i className="ri-checkbox-circle-fill text-emerald-600 text-lg mt-0.5" />
                <p className="text-xs text-emerald-800">
                  You can still punch in — your shift will be recorded using your saved office location.
                </p>
              </div>

              {failure?.message && (
                <p className="text-[11px] text-neutral-400 break-words">
                  Reason: {failure.message}{failure.code !== 'unknown' ? ` (${failure.code})` : ''}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={runDetect}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-semibold hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-refresh-line" /> Retry location
                </button>
                <button
                  onClick={openSearch}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-semibold hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-search-line" /> Search manually
                </button>
              </div>
            </div>
          )}

          {/* ── Manual search ── */}
          {searchOpen && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-800">Search location</p>
                <button onClick={closeSearch} className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 cursor-pointer whitespace-nowrap">
                  <i className="ri-arrow-left-line" /> Back
                </button>
              </div>
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm" />
                <input
                  value={query}
                  autoFocus
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Westlands, Nairobi"
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              {searching && (
                <div className="flex items-center gap-2 text-xs text-neutral-400 py-1">
                  <i className="ri-loader-4-line animate-spin" /> Searching…
                </div>
              )}

              {!searching && results.length > 0 && (
                <ul className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
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
                  <p className="text-xs text-neutral-500">No suggestions for “{query.trim()}”.</p>
                  <button
                    onClick={useTyped}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-map-pin-2-line" /> Find “{query.trim()}”
                  </button>
                </div>
              )}

              {typedError && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">{typedError}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer: confirm with coordinates ── */}
        {showReadyFooter && (
          <div className="px-5 py-4 border-t border-neutral-100">
            {inlineError && (
              <p className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{inlineError}</p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button onClick={onCancel} disabled={busy || submitting} className="px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-500 hover:bg-neutral-50 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                Cancel
              </button>
              <button
                onClick={() => void submitPunch()}
                disabled={busy || submitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {submitting ? <><i className="ri-loader-4-line animate-spin" /> Punching in…</> : <><i className="ri-fingerprint-2-line" /> Confirm &amp; Punch In</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Footer: punch in without a location (office stand-in) ── */}
        {showFallbackFooter && (
          <div className="px-5 py-4 border-t border-neutral-100">
            {inlineError && (
              <p className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{inlineError}</p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button onClick={onCancel} disabled={busy || submitting} className="px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-500 hover:bg-neutral-50 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                Cancel
              </button>
              <button
                onClick={() => void submitPunch()}
                disabled={busy || submitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {submitting ? <><i className="ri-loader-4-line animate-spin" /> Punching in…</> : <><i className="ri-fingerprint-2-line" /> Punch in anyway</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}