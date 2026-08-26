/**
 * toTitleCase — converts ALL-CAPS or lowercase property titles into clean
 * title case while leaving already-mixed case titles untouched.
 */
export function toTitleCase(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // If the title is already mixed-case (contains both lower and upper),
  // assume it was intentionally formatted and leave it alone.
  const hasLower = /[a-z]/.test(trimmed);
  const hasUpper = /[A-Z]/.test(trimmed);
  if (hasLower && hasUpper) return trimmed;

  const small = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor',
    'of', 'on', 'or', 'per', 'the', 'to', 'vs', 'with',
  ]);

  const words = trimmed.toLowerCase().split(/\s+/);
  return words
    .map((word, i) => {
      if (!word) return '';
      if (i > 0 && small.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}