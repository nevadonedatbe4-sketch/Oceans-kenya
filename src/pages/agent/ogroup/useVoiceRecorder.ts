import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderStatus = 'idle' | 'recording';

export interface VoiceRecorderApi {
  status: RecorderStatus;
  seconds: number;
  error: string | null;
  supported: boolean;
  start: () => Promise<void>;
  /** Stops and resolves with the recorded Blob (or null when empty/too short). */
  stop: () => Promise<Blob | null>;
  cancel: () => void;
  reset: () => void;
}

const MAX_SECONDS = 300; // 5 minutes hard cap

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find((t) => {
    try { return MediaRecorder.isTypeSupported(t); } catch { return false; }
  });
}

function extForMime(mime: string): string {
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4')) return 'm4a';
  return 'webm';
}

/**
 * Minimal voice-note recorder built on MediaRecorder. Records to memory,
 * exposes a live timer, and hands back a Blob ready for upload. All resources
 * (mic tracks, recorder, timers) are released on cancel/unmount.
 */
export function useVoiceRecorder(): VoiceRecorderApi & { extensionFor: (blob: Blob) => string } {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeRef = useRef<string>('audio/webm');
  const startedAtRef = useRef<number>(0);

  const supported = typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== 'undefined';

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    if (!supported) {
      setError('Your browser does not support voice recording.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      mimeRef.current = mimeType || 'audio/webm';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(250);
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setSeconds(0);
      setStatus('recording');
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(s);
        if (s >= MAX_SECONDS) {
          // Auto-stop at the cap.
          recorderRef.current?.stop();
        }
      }, 250);
    } catch {
      setError('Microphone access was blocked. Please allow it in your browser and try again.');
      cleanup();
      setStatus('idle');
    }
  }, [supported, cleanup]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    if (!recorder) { cleanup(); setStatus('idle'); return null; }
    const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);

    return await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type: mimeRef.current })
          : null;
        cleanup();
        setStatus('idle');
        setSeconds(0);
        // Reject accidental micro-clips (< 1s) so empty notes aren't sent.
        resolve(elapsed < 1 ? null : blob);
      };
      try { recorder.stop(); } catch { cleanup(); setStatus('idle'); resolve(null); }
    });
  }, [cleanup]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => { /* discard */ };
      try { recorder.stop(); } catch { /* noop */ }
    }
    cleanup();
    setStatus('idle');
    setSeconds(0);
  }, [cleanup]);

  const reset = useCallback(() => { setError(null); setSeconds(0); }, []);

  const extensionFor = useCallback((blob: Blob) => extForMime(blob.type || mimeRef.current), []);

  return { status, seconds, error, supported, start, stop, cancel, reset, extensionFor };
}