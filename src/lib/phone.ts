// ─────────────────────────────────────────────────────────────
// PHONE UTILITIES — one normaliser + one set of link builders used by
// every clickable Call / SMS / WhatsApp action across the CRM.
//
// Kenya (+254) is the default origin when a stored number has no explicit
// international prefix, matching the rest of the platform.
// ─────────────────────────────────────────────────────────────

import { DIAL_CODES } from './dialCodes';

export interface PhoneLinks {
  raw: string;
  /** Full international form, e.g. "+254712345678" (empty when unusable). */
  e164: string;
  /** Digits only, no "+", for wa.me — e.g. "254712345678". */
  digits: string;
  /** True when the number looks like a real, dialable number. */
  valid: boolean;
  tel: string | null;
  sms: string | null;
  whatsapp: string | null;
}

const EMPTY = (raw: string): PhoneLinks => ({
  raw,
  e164: '',
  digits: '',
  valid: false,
  tel: null,
  sms: null,
  whatsapp: null,
});

/**
 * Normalise any stored phone string into an E.164-ish number and produce
 * ready-to-use `tel:`, `sms:` and WhatsApp click-to-chat links.
 *
 * - A leading "+" is trusted as an already-international number.
 * - A known country dial code with no "+" is also treated as international.
 * - Anything else is treated as a local number: a leading trunk "0" is dropped
 *   and the default country code (Kenya) is prepended.
 * - Numbers that are too short/long to be real return `valid: false` and no
 *   links, so we never build a broken `tel:`/wa.me URL.
 */
export function normalizePhone(raw: string | null | undefined, defaultDial = '+254'): PhoneLinks {
  const value = (raw || '').trim();
  if (!value) return EMPTY(value);

  const hadPlus = value.startsWith('+');
  const allDigits = value.replace(/\D/g, '');
  if (!allDigits) return EMPTY(value);

  // Known dial codes without the "+" (longest first, so +1 never wins over +254).
  const knownCodes = DIAL_CODES
    .map((c) => c.code.replace('+', ''))
    .sort((a, b) => b.length - a.length);

  let national: string;
  if (hadPlus) {
    national = allDigits;
  } else {
    const matched = knownCodes.find(
      (code) => allDigits.startsWith(code) && allDigits.length > code.length + 5,
    );
    if (matched) {
      national = allDigits;
    } else {
      const dial = defaultDial.replace(/\D/g, '');
      national = dial + allDigits.replace(/^0+/, '');
    }
  }

  if (national.length < 9 || national.length > 15) {
    return { ...EMPTY(value), e164: `+${national}`, digits: national };
  }

  const e164 = `+${national}`;
  return {
    raw: value,
    e164,
    digits: national,
    valid: true,
    tel: `tel:${e164}`,
    sms: `sms:${e164}`,
    whatsapp: `https://wa.me/${national}`,
  };
}

/** Convenience predicate used to gate the action icons. */
export function isValidPhone(raw: string | null | undefined, defaultDial = '+254'): boolean {
  return normalizePhone(raw, defaultDial).valid;
}