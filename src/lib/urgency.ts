/**
 * Urgency / availability messaging shared by every property & unit card.
 *
 * Priority (highest first):
 *   1. A MANUAL message the agent configured on the listing/project record.
 *      It is shown verbatim - the agent is always in control.
 *   2. An AUTOMATIC message derived from reliable inventory data.
 *   3. Nothing.
 *
 * Scarcity is never invented: the automatic path only fires when a real,
 * trustworthy count exists (or a genuine project inventory is available).
 */

/** Trim + collapse a candidate message into a single clean line. '' when empty. */
export function cleanUrgency(message: unknown): string {
  return (message == null ? '' : String(message)).replace(/\s+/g, ' ').trim();
}

/** Preset messages an agent can pick from in the CRM (custom text is also allowed). */
export const URGENCY_PRESETS = [
  'Only 1 left',
  'Only 2 remaining',
  'Only a few left',
  'Last unit at this price',
  'Price available for a limited time',
  'Limited availability',
] as const;

/**
 * Resolve the message to show on a card.
 *
 * @param manual    Agent-configured message (takes priority, shown verbatim).
 * @param automatic Message derived from reliable inventory data.
 * @param enabled   The CRM "show urgency message" display toggle. When false
 *                  the AUTOMATIC message is suppressed - but an explicit manual
 *                  message still shows, because the agent set it deliberately.
 */
export function resolveUrgency(opts: {
  manual?: unknown;
  automatic?: string | null;
  enabled?: boolean;
}): string | null {
  const manual = cleanUrgency(opts.manual);
  if (manual) return manual;
  if (opts.enabled === false) return null;
  const auto = cleanUrgency(opts.automatic);
  return auto || null;
}

/**
 * Honest automatic message from a real available count. Returns null when
 * there is nothing trustworthy to say so the card stays silent.
 *   autoUrgency(1)          -> "Only 1 left"
 *   autoUrgency(2, 'home')  -> "Only 2 remaining"
 *   autoUrgency(6, 'home')  -> "6 homes available"
 */
export function autoUrgency(available: number, noun: 'unit' | 'home' = 'unit'): string | null {
  if (!Number.isFinite(available) || available <= 0) return null;
  if (available === 1) return noun === 'home' ? 'Last home remaining' : 'Only 1 left';
  if (available === 2) return 'Only 2 remaining';
  if (available <= 4) return `Only ${available} remaining`;
  if (available <= 8) return `${available} ${noun === 'home' ? 'homes' : 'units'} available`;
  return null;
}

/**
 * Automatic message for a single unit, based on how many of its bedroom type
 * remain inside the development. Empty unless the type is genuinely scarce.
 */
export function unitTypeUrgency(available: number): string | null {
  if (!Number.isFinite(available) || available <= 0) return null;
  if (available === 1) return 'Only 1 left';
  if (available <= 3) return `Only ${available} remaining`;
  return null;
}