/**
 * contactDefaults - single source of truth for the agency's public contact
 * details.
 *
 * These values are only ever used as a FALLBACK when the CMS / site settings
 * hold no value. Keeping them in one place stops phone numbers and emails
 * being hard-coded and drifting apart across reusable components, and gives
 * every surface one canonical display format for the phone number.
 */
export const DEFAULT_CONTACT = {
  /** Canonical number without spaces - used for tel: links. */
  phone: '+254181408186',
  /** Human-readable display format used everywhere the number is shown. */
  phoneDisplay: '+254 181 408 186',
  /** wa.me expects digits only, no "+" and no spaces. */
  whatsapp: '254181408186',
  email: 'ask@oceanske.com',
};

/**
 * Normalise any phone value into the canonical "+254 181 408 186" display
 * form. Values that are not a recognised Kenyan number are returned untouched
 * so we never mangle a legitimate international number.
 */
export function formatPhoneDisplay(value?: string | null): string {
  const raw = (value || '').trim();
  if (!raw) return DEFAULT_CONTACT.phoneDisplay;
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length === 12 && digits.startsWith('254')) {
    return `+254 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return raw;
}

/** Build a valid tel: link target (E.164, no spaces). */
export function toTelHref(value?: string | null): string {
  const raw = (value || '').trim() || DEFAULT_CONTACT.phone;
  return `tel:${raw.replace(/[^\d+]/g, '')}`;
}

/** Build a valid wa.me link target (digits only). */
export function toWhatsappHref(value?: string | null): string {
  const raw = (value || '').trim() || DEFAULT_CONTACT.whatsapp;
  return `https://wa.me/${raw.replace(/[^\d]/g, '')}`;
}