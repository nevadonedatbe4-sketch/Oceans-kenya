// One-time cleanup of stale persisted search values.
//
// Older versions of the site seeded the property search boxes with hardcoded
// Kenyan locations (e.g. "Nairobi") and saved that value into localStorage.
// Because the search fields hydrate their initial state from localStorage,
// that stale value keeps reappearing in the input on every visit even after
// the code defaults were changed. This module purges those saved values once,
// so the visible search input starts empty as intended.

// localStorage keys that persist a free-text search / location value.
const SEARCH_VALUE_KEYS = [
  'comm_search',
  'buy_search',
  'rent_search',
  'search_location',
  'all_properties_search',
];

// Location / phrase fragments that must never survive as a saved search value.
const BLOCKED_FRAGMENTS = [
  'nairobi',
  'westlands',
  'kilimani',
  'karen',
  'runda',
  'lavington',
  'muthaiga',
  'mombasa road',
  'gigiri',
  'parklands',
  'kileleshwa',
  'ngong',
  'thika',
  'upper hill',
  'upperhill',
  'riverside',
  'kenya',
];

const CLEANUP_FLAG = 'search_location_cleanup_v2';

export function cleanStaleSearchValues(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    for (const key of SEARCH_VALUE_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const lower = raw.toLowerCase();
      const hasBlocked = BLOCKED_FRAGMENTS.some((frag) => lower.includes(frag));
      if (hasBlocked) {
        // Reset to an empty search so the input shows the animated placeholder.
        localStorage.setItem(key, '');
      }
    }

    localStorage.setItem(CLEANUP_FLAG, '1');
  } catch {
    /* ignore storage errors (private mode, quota, etc.) */
  }
}