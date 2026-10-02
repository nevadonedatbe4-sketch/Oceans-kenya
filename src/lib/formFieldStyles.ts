/**
 * Single source of truth for every PUBLIC form field.
 *
 * Change the border colour (or any part of the treatment) ONCE here and every
 * public form follows at the same time - contact, valuation, landlords,
 * joint-ventures request desk, project-plans request and the JV deal room.
 *
 * Note: Tailwind scans source files for literal class names, so the field
 * tokens are kept spelled out below rather than assembled from pieces.
 */

// The one border colour every public form field uses. Tweak this single token
// to nudge the field borders up or down across the whole site at once.
export const FIELD_BORDER_COLOR = 'border-stone-300';

// Full field treatment: a soft-but-clearly-visible border, muted placeholder,
// a gentle two-layer lift so fields read as raised, and a calm focus ring.
export const FIELD_CLASS =
  `w-full px-4 py-3 border ${FIELD_BORDER_COLOR} text-base font-roboto font-normal text-primary ` +
  'placeholder:text-stone-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 ' +
  'transition-colors shadow-[0_1px_2px_rgba(0,23,49,0.04),0_2px_8px_rgba(0,23,49,0.05)]';