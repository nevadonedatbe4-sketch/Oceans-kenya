// Country dial codes for phone inputs. Kenya first (primary market), then the
// East African neighbours, then a short list of the most common international
// origins for Nairobi property enquiries. `code` is the E.164 dial prefix.
export interface DialCode {
  iso: string;   // ISO 3166-1 alpha-2, used as a stable key
  name: string;  // display name
  code: string;  // dial prefix, e.g. "+254"
  flag: string;  // emoji flag for a compact, dependency-free visual
}

export const DIAL_CODES: DialCode[] = [
  { iso: 'KE', name: 'Kenya', code: '+254', flag: '🇰🇪' },
  { iso: 'UG', name: 'Uganda', code: '+256', flag: '🇺🇬' },
  { iso: 'TZ', name: 'Tanzania', code: '+255', flag: '🇹🇿' },
  { iso: 'RW', name: 'Rwanda', code: '+250', flag: '🇷🇼' },
  { iso: 'ET', name: 'Ethiopia', code: '+251', flag: '🇪🇹' },
  { iso: 'SO', name: 'Somalia', code: '+252', flag: '🇸🇴' },
  { iso: 'SS', name: 'South Sudan', code: '+211', flag: '🇸🇸' },
  { iso: 'BI', name: 'Burundi', code: '+257', flag: '🇧🇮' },
  { iso: 'GB', name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { iso: 'US', name: 'United States', code: '+1', flag: '🇺🇸' },
  { iso: 'AE', name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { iso: 'IN', name: 'India', code: '+91', flag: '🇮🇳' },
  { iso: 'CN', name: 'China', code: '+86', flag: '🇨🇳' },
  { iso: 'ZA', name: 'South Africa', code: '+27', flag: '🇿🇦' },
  { iso: 'NG', name: 'Nigeria', code: '+234', flag: '🇳🇬' },
  { iso: 'DE', name: 'Germany', code: '+49', flag: '🇩🇪' },
  { iso: 'FR', name: 'France', code: '+33', flag: '🇫🇷' },
  { iso: 'IT', name: 'Italy', code: '+39', flag: '🇮🇹' },
  { iso: 'CA', name: 'Canada', code: '+1', flag: '🇨🇦' },
  { iso: 'AU', name: 'Australia', code: '+61', flag: '🇦🇺' },
];

export const DEFAULT_DIAL_CODE = '+254'; // Kenya

/**
 * Combine a selected dial code with a typed local number into a single E.164-ish
 * string. If the user already typed a leading '+', their input is treated as a
 * full international number and the dropdown is ignored. A leading '0' trunk
 * prefix is stripped before prepending the dial code.
 */
export function combinePhone(dialCode: string, localNumber: string): string {
  const num = (localNumber || '').trim();
  if (!num) return '';
  if (num.startsWith('+')) return num.replace(/\s+/g, ' ').trim();
  const national = num.replace(/[^\d]/g, '').replace(/^0+/, '');
  if (!national) return '';
  return `${dialCode} ${national}`;
}
