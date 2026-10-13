/**
 * Name helpers for friendly, human greetings.
 *
 * People should be addressed by their first name — "Hi Sara," — never by their
 * full name ("Hi Sara Vela,"). Everything that greets a client, applicant or
 * lead routes through here so the tone stays consistent everywhere.
 */

/** The first name from a full name: "Sara Vela" → "Sara". */
export function firstName(value: string | null | undefined): string {
  const clean = (value || '').trim();
  if (!clean) return '';
  return clean.split(/\s+/)[0];
}

/** A friendly greeting line, e.g. "Hi Sara," — falls back to "Hi there,". */
export function friendlyGreeting(value: string | null | undefined, fallback = 'there'): string {
  return `Hi ${firstName(value) || fallback},`;
}