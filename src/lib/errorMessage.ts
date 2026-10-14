// ─────────────────────────────────────────────────────────────
// Central, user-facing error translator.
//
// Turns the technical errors that bubble up from Supabase/Postgres, the hosting
// layer (Vercel / edge functions / network) and the browser into short, calm,
// actionable messages — and NEVER leaks internal detail (column/table names,
// SQL, stack traces, raw provider text) to a visitor.
//
// Use `humanizeError(err, fallback?)` wherever an error is shown to a user.
// Raw detail should still be logged for diagnosis; this only governs what the
// user sees.
// ─────────────────────────────────────────────────────────────

const GENERIC = 'Something went wrong. Please try again.';

// Postgres SQLSTATE → friendly message. These arrive as `code` on a Supabase
// PostgrestError (or inside the message text for edge-function responses).
const PG_CODE_MESSAGES: Record<string, string> = {
  '23505': 'That already exists. Please use a different value.',            // unique_violation
  '23503': 'This can’t be done because the item is linked to other records.', // foreign_key_violation
  '23502': 'Some required information is missing. Please complete all required fields.', // not_null_violation
  '23514': 'Some of the details provided aren’t valid. Please check and try again.',      // check_violation
  '22P02': 'Some of the details provided aren’t in the expected format.',   // invalid_text_representation
  '22001': 'One of the values is too long. Please shorten it and try again.', // string_data_right_truncation
  '42501': 'You don’t have permission to do that.',                         // insufficient_privilege (RLS)
  '40001': 'The system was busy. Please try again.',                        // serialization_failure
  '53300': 'The service is busy right now. Please try again in a moment.',  // too_many_connections
  // Internal/shape problems the user can do nothing about — keep them vague.
  '42703': 'Something went wrong on our side. Please try again later.',     // undefined_column
  '42P01': 'Something went wrong on our side. Please try again later.',     // undefined_table
  '42703_internal': 'Something went wrong on our side. Please try again later.',
};

// PostgREST / Supabase logical codes.
const PGRST_MESSAGES: Record<string, string> = {
  PGRST301: 'Your session has expired. Please sign in again.',
  PGRST302: 'Your session has expired. Please sign in again.',
  PGRST116: 'We couldn’t find what you were looking for.',
};

interface Extracted {
  message: string;
  code?: string;
  status?: number;
}

/** Pull a message / code / status out of the many shapes an error can take. */
function extract(error: unknown): Extracted {
  if (error == null) return { message: '' };
  if (typeof error === 'string') return { message: error };

  const e = error as {
    message?: unknown;
    error?: unknown;
    error_description?: unknown;
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
    details?: unknown;
    hint?: unknown;
  };

  const message =
    (typeof e.message === 'string' && e.message) ||
    (typeof e.error_description === 'string' && e.error_description) ||
    (typeof e.error === 'string' && e.error) ||
    '';

  const code = typeof e.code === 'string' ? e.code : undefined;
  const status =
    typeof e.status === 'number'
      ? e.status
      : typeof e.statusCode === 'number'
        ? e.statusCode
        : undefined;

  return { message: String(message || ''), code, status };
}

// Technical markers that must never be shown to a user verbatim. If a message
// contains any of these it is treated as internal and replaced with a safe one.
const TECHNICAL_MARKER =
  /(column|relation|constraint|violates|duplicate key|syntax error|sqlstate|pgrst|null value|schema cache|edge function|non-2xx|<!doctype|<html|stack|undefined is not|cannot read propert|typeerror|referenceerror|\bsql\b|function .* does not exist)/i;

/** A message is safe to surface only if it is short and free of technical markers. */
function isPresentable(message: string): boolean {
  if (!message) return false;
  if (message.length > 160) return false;
  return !TECHNICAL_MARKER.test(message);
}

/**
 * Translate any thrown/returned error into a short, user-facing sentence.
 * @param error    the caught error (Error, Supabase error, string, Response-like…)
 * @param fallback context-specific default, e.g. "We couldn’t load properties right now."
 */
export function humanizeError(error: unknown, fallback: string = GENERIC): string {
  const { message, code, status } = extract(error);
  const text = message.toLowerCase();

  // 1. Known database codes (exact, never leaks identifiers).
  if (code && PG_CODE_MESSAGES[code]) return PG_CODE_MESSAGES[code];
  if (code && PGRST_MESSAGES[code]) return PGRST_MESSAGES[code];

  // 2. Hosting / network / connectivity (Vercel, edge functions, offline).
  if (
    status === 0 ||
    text.includes('failed to fetch') ||
    text.includes('networkerror') ||
    text.includes('network error') ||
    text.includes('load failed') ||
    text.includes('err_internet_disconnected') ||
    text.includes('err_network')
  ) {
    return 'We can’t reach the server right now. Check your internet connection and try again.';
  }
  if (text.includes('timeout') || text.includes('timed out') || text.includes('aborted') || code === 'ETIMEDOUT') {
    return 'The request took too long. Please try again.';
  }

  // 3. Rate limiting.
  if (status === 429 || text.includes('rate limit') || text.includes('too many')) {
    return 'Too many requests. Please wait a moment and then try again.';
  }

  // 4. Auth / permission / session.
  if (status === 401 || text.includes('jwt') || text.includes('not authenticated') || text.includes('invalid token') || text.includes('session')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (status === 403 || text.includes('permission') || text.includes('not authorized') || text.includes('row-level security') || text.includes('rls')) {
    return 'You don’t have permission to do that.';
  }

  // 5. Server / service unavailable (5xx, bad gateway, edge-function failures).
  if (
    (typeof status === 'number' && status >= 500) ||
    text.includes('non-2xx') ||
    text.includes('edge function') ||
    text.includes('bad gateway') ||
    text.includes('service unavailable') ||
    text.includes('internal server error')
  ) {
    return 'The service is temporarily unavailable. Please try again shortly.';
  }

  // 6. Storage (uploads).
  if (text.includes('payload too large') || text.includes('exceeded the maximum') || text.includes('file size')) {
    return 'That file is too large. Please choose a smaller file.';
  }

  // 7. A message that is already clean and user-friendly passes through…
  if (isPresentable(message)) return message;

  // 8. …otherwise fall back to the context-specific default.
  return fallback;
}
