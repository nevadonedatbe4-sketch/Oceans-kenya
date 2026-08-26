import { useState, useEffect, useRef, useCallback } from 'react';
import PageLoader from '@/components/feature/PageLoader';

// ── Types ────────────────────────────────────────────────────────────────
export interface LocationSuggestion {
  id: string;
  name: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  source: 'mapbox' | 'local' | 'recent' | 'geolocation';
}

interface LocationSearchProps {
  value: string;
  onChange: (value: string, suggestion?: LocationSuggestion) => void;
  placeholder?: string;
  placeholderCycle?: string[];
  className?: string;
  inputClassName?: string;
}

// ── Default animated placeholder cycle (buy/general) ─────────────────────
const DEFAULT_PLACEHOLDER_CYCLE = [
  "Looking for a home in a leafy suburb...",
  "Looking for a villa with a garden...",
  "Looking for an apartment with a view...",
  "Looking for a house in a quiet area...",
];

// ── Known neighbourhoods (fallback when Mapbox isn't available) ──────────
const LOCAL_NEIGHBOURHOODS: LocationSuggestion[] = [
  { id: 'loc-karen', name: 'Karen', city: 'Karen', region: 'Nairobi County', country: 'Kenya', lat: -1.3170, lng: 36.6950, source: 'local' },
  { id: 'loc-runda', name: 'Runda', city: 'Runda', region: 'Nairobi County', country: 'Kenya', lat: -1.2080, lng: 36.8150, source: 'local' },
  { id: 'loc-lavington', name: 'Lavington', city: 'Lavington', region: 'Nairobi County', country: 'Kenya', lat: -1.2730, lng: 36.7750, source: 'local' },
  { id: 'loc-kilimani', name: 'Kilimani', city: 'Kilimani', region: 'Nairobi County', country: 'Kenya', lat: -1.2870, lng: 36.7890, source: 'local' },
  { id: 'loc-westlands', name: 'Westlands', city: 'Westlands', region: 'Nairobi County', country: 'Kenya', lat: -1.2675, lng: 36.8042, source: 'local' },
  { id: 'loc-kileleshwa', name: 'Kileleshwa', city: 'Kileleshwa', region: 'Nairobi County', country: 'Kenya', lat: -1.2730, lng: 36.7850, source: 'local' },
  { id: 'loc-muthaiga', name: 'Muthaiga', city: 'Muthaiga', region: 'Nairobi County', country: 'Kenya', lat: -1.2520, lng: 36.8330, source: 'local' },
  { id: 'loc-parklands', name: 'Parklands', city: 'Parklands', region: 'Nairobi County', country: 'Kenya', lat: -1.2590, lng: 36.8190, source: 'local' },
  { id: 'loc-gigiri', name: 'Gigiri', city: 'Gigiri', region: 'Nairobi County', country: 'Kenya', lat: -1.2300, lng: 36.8070, source: 'local' },
  { id: 'loc-spring-valley', name: 'Spring Valley', city: 'Spring Valley', region: 'Nairobi County', country: 'Kenya', lat: -1.2410, lng: 36.7900, source: 'local' },
  { id: 'loc-nyari', name: 'Nyari', city: 'Nyari', region: 'Nairobi County', country: 'Kenya', lat: -1.2180, lng: 36.8020, source: 'local' },
  { id: 'loc-langata', name: 'Langata', city: 'Langata', region: 'Nairobi County', country: 'Kenya', lat: -1.3630, lng: 36.7410, source: 'local' },
  { id: 'loc-ngong', name: 'Ngong', city: 'Ngong', region: 'Kajiado County', country: 'Kenya', lat: -1.3600, lng: 36.6540, source: 'local' },
  { id: 'loc-kitengela', name: 'Kitengela', city: 'Kitengela', region: 'Kajiado County', country: 'Kenya', lat: -1.4760, lng: 36.9620, source: 'local' },
  { id: 'loc-nairobi', name: 'Nairobi', city: 'Nairobi', region: 'Nairobi County', country: 'Kenya', lat: -1.2921, lng: 36.8219, source: 'local' },
  { id: 'loc-riverside', name: 'Riverside', city: 'Riverside', region: 'Nairobi County', country: 'Kenya', lat: -1.2670, lng: 36.8000, source: 'local' },
  { id: 'loc-kiserian', name: 'Kiserian', city: 'Kiserian', region: 'Kajiado County', country: 'Kenya', lat: -1.4300, lng: 36.6740, source: 'local' },
  { id: 'loc-athi-river', name: 'Athi River', city: 'Athi River', region: 'Machakos County', country: 'Kenya', lat: -1.4580, lng: 36.9780, source: 'local' },
  { id: 'loc-rosslyn', name: 'Rosslyn', city: 'Rosslyn', region: 'Nairobi County', country: 'Kenya', lat: -1.2080, lng: 36.8000, source: 'local' },
  { id: 'loc-lower-kabete', name: 'Lower Kabete', city: 'Lower Kabete', region: 'Nairobi County', country: 'Kenya', lat: -1.2380, lng: 36.7750, source: 'local' },
  { id: 'loc-arboretum', name: 'Arboretum', city: 'Arboretum', region: 'Nairobi County', country: 'Kenya', lat: -1.2830, lng: 36.8110, source: 'local' },
  { id: 'loc-old-kitisuru', name: 'Old Kitisuru', city: 'Old Kitisuru', region: 'Nairobi County', country: 'Kenya', lat: -1.2260, lng: 36.7650, source: 'local' },
  { id: 'loc-enaki-town', name: 'Enaki Town', city: 'Enaki Town', region: 'Nairobi County', country: 'Kenya', lat: -1.2320, lng: 36.7960, source: 'local' },
];

const RECENT_STORAGE_KEY = 'location_search_recent';
const MAX_RECENT = 5;

function loadRecent(): LocationSuggestion[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LocationSuggestion[];
  } catch { /* ignore */ }
  return [];
}

function saveRecent(items: LocationSuggestion[]) {
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

function addToRecent(suggestion: LocationSuggestion) {
  const recent = loadRecent().filter((r) => r.id !== suggestion.id);
  recent.unshift(suggestion);
  saveRecent(recent);
}

// ── Component ────────────────────────────────────────────────────────────
export default function LocationSearch({
  value,
  onChange,
  placeholder = "Looking for",
  placeholderCycle,
  className = '',
  inputClassName = '',
}: LocationSearchProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<LocationSuggestion[]>(loadRecent);

  // ── Animated placeholder cycling (typewriter effect) ──────────────────
  const animPhrases = placeholderCycle && placeholderCycle.length > 0
    ? placeholderCycle
    : DEFAULT_PLACEHOLDER_CYCLE;
  const [animText, setAnimText] = useState('');
  const [animPhase, setAnimPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing');
  const [animIdx, setAnimIdx] = useState(0);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldAnimate = query.trim() === '';

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapboxToken = (import.meta as any).env?.VITE_PUBLIC_MAPBOX_TOKEN as string | undefined;

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // ── Animated placeholder typewriter effect ──────────────────────────
  useEffect(() => {
    if (!shouldAnimate) {
      setAnimText('');
      return;
    }

    const phrase = animPhrases[animIdx];

    const cleanup = () => {
      if (animTimerRef.current) {
        clearTimeout(animTimerRef.current);
        animTimerRef.current = null;
      }
    };

    if (animPhase === 'typing') {
      if (animText.length < phrase.length) {
        animTimerRef.current = setTimeout(() => {
          setAnimText(phrase.slice(0, animText.length + 1));
        }, 70 + Math.random() * 50);
      } else {
        animTimerRef.current = setTimeout(() => {
          setAnimPhase('pausing');
        }, 2500);
      }
    } else if (animPhase === 'pausing') {
      animTimerRef.current = setTimeout(() => {
        setAnimPhase('deleting');
      }, 500);
    } else if (animPhase === 'deleting') {
      if (animText.length > 0) {
        animTimerRef.current = setTimeout(() => {
          setAnimText(animText.slice(0, -1));
        }, 35 + Math.random() * 25);
      } else {
        animTimerRef.current = setTimeout(() => {
          setAnimIdx((prev) => (prev + 1) % animPhrases.length);
          setAnimPhase('typing');
        }, 350);
      }
    }

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animText, animPhase, animIdx, shouldAnimate]);

  // ── Fetch suggestions ────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setSuggestions([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    // Try Mapbox first
    if (mapboxToken) {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?access_token=${mapboxToken}&types=place,region,locality,neighborhood&country=KE&limit=5`,
          { signal: controller.signal }
        );
        if (!controller.signal.aborted && res.ok) {
          const data = await res.json();
          const mapped: LocationSuggestion[] = (data.features || []).map((f: any) => {
            const ctx = f.context || [];
            const city = ctx.find((c: any) => c.id?.startsWith('place'))?.text || f.text || '';
            const region = ctx.find((c: any) => c.id?.startsWith('region'))?.text || '';
            const country = ctx.find((c: any) => c.id?.startsWith('country'))?.text || 'Kenya';
            return {
              id: f.id,
              name: f.place_name || f.text,
              city,
              region,
              country,
              lat: f.center[1],
              lng: f.center[0],
              source: 'mapbox' as const,
            };
          });
          if (!controller.signal.aborted) {
            setSuggestions(mapped);
            setIsOpen(mapped.length > 0);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fall through to local
      }
    }

    // Local fallback
    if (!controller.signal.aborted) {
      const lower = trimmed.toLowerCase();
      const matched = LOCAL_NEIGHBOURHOODS.filter(
        (l) =>
          l.name.toLowerCase().includes(lower) ||
          l.city.toLowerCase().includes(lower) ||
          l.region.toLowerCase().includes(lower)
      ).slice(0, 6);
      setSuggestions(matched);
      setIsOpen(matched.length > 0);
      setLoading(false);
    }
  }, [mapboxToken]);

  // ── Debounced search ─────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setQuery(newVal);
    setActiveIdx(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newVal);
    }, 300);
  };

  // ── Select suggestion ────────────────────────────────────────────────
  const selectSuggestion = (suggestion: LocationSuggestion) => {
    setQuery(suggestion.name);
    setIsOpen(false);
    setActiveIdx(-1);
    setGeoError(null);
    addToRecent(suggestion);
    setRecentSearches(loadRecent());
    onChange(suggestion.name, suggestion);
    inputRef.current?.blur();
  };

  // ── Keyboard navigation ──────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        fetchSuggestions(query);
        return;
      }
      return;
    }

    const items = getDisplayItems();
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx((prev) => (prev + 1 >= items.length ? 0 : prev + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIdx >= 0 && activeIdx < items.length) {
          selectSuggestion(items[activeIdx]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIdx(-1);
        break;
    }
  };

  // ── Scroll active item into view ─────────────────────────────────────
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      if (items[activeIdx]) {
        items[activeIdx].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIdx]);

  // ── Close on outside click ────────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── "Near Me" geolocation ────────────────────────────────────────────
  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported by your browser');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);
    setIsOpen(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setGeoLoading(false);

        // Try reverse geocode with Mapbox
        if (mapboxToken) {
          try {
            const res = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}&types=place,locality,neighborhood&limit=1`
            );
            if (res.ok) {
              const data = await res.json();
              if (data.features?.length > 0) {
                const f = data.features[0];
                const ctx = f.context || [];
                const suggestion: LocationSuggestion = {
                  id: f.id,
                  name: f.place_name || f.text,
                  city: ctx.find((c: any) => c.id?.startsWith('place'))?.text || f.text || '',
                  region: ctx.find((c: any) => c.id?.startsWith('region'))?.text || '',
                  country: ctx.find((c: any) => c.id?.startsWith('country'))?.text || 'Kenya',
                  lat: latitude,
                  lng: longitude,
                  source: 'geolocation',
                };
                selectSuggestion(suggestion);
                return;
              }
            }
          } catch { /* fall through */ }
        }

        // Local fallback: find nearest known neighbourhood
        let nearest: LocationSuggestion | null = null;
        let minDist = Infinity;
        for (const loc of LOCAL_NEIGHBOURHOODS) {
          const d = Math.sqrt(
            (loc.lat - latitude) ** 2 + (loc.lng - longitude) ** 2
          );
          if (d < minDist) {
            minDist = d;
            nearest = loc;
          }
        }

        if (nearest) {
          const suggestion: LocationSuggestion = {
            ...nearest,
            lat: latitude,
            lng: longitude,
            source: 'geolocation',
          };
          selectSuggestion(suggestion);
        } else {
          const fallback: LocationSuggestion = {
            id: 'geo-fallback',
            name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            city: 'Nearby',
            region: '',
            country: 'Kenya',
            lat: latitude,
            lng: longitude,
            source: 'geolocation',
          };
          selectSuggestion(fallback);
        }
      },
      (error) => {
        setGeoLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Location access denied. Enable location permissions to use this feature.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Location unavailable. Please try again later.');
            break;
          case error.TIMEOUT:
            setGeoError('Location request timed out. Please try again.');
            break;
          default:
            setGeoError('Could not detect your location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // ── Clear input ──────────────────────────────────────────────────────
  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    setSuggestions([]);
    setGeoError(null);
    onChange('', undefined);
    inputRef.current?.focus();
  };

  // ── Get display items (recent + suggestions) ─────────────────────────
  const getDisplayItems = (): LocationSuggestion[] => {
    if (query.trim()) return suggestions;
    return recentSearches;
  };

  const displayItems = getDisplayItems();
  const showRecentLabel = !query.trim() && recentSearches.length > 0;
  const comboId = 'location-search-listbox';

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative flex-1 min-w-0 flex items-center gap-2.5 px-4 h-11 bg-white border border-primary/20 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
        <span className="w-5 h-5 flex items-center justify-center shrink-0">
          <i className="ri-search-line text-stone-400 text-base"></i>
        </span>

        {/* Animated placeholder overlay (typewriter + cursor blink) */}
        {shouldAnimate && animText && (
          <div className="absolute inset-0 flex items-center px-4 pointer-events-none z-[1]">
            <span className="w-5 h-5 flex items-center justify-center shrink-0" />
            <span className="flex-1 min-w-0 text-base font-roboto font-medium text-stone-400 truncate ml-2.5">
              {animText}
              <span className="inline-block w-[2px] h-[1.1em] bg-stone-400/60 ml-0.5 align-middle animate-[cursor-blink_1s_step-end_infinite]" />
            </span>
          </div>
        )}

        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={comboId}
          aria-autocomplete="list"
          aria-activedescendant={activeIdx >= 0 ? `ls-option-${activeIdx}` : undefined}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (!query.trim() && recentSearches.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={shouldAnimate ? '' : placeholder}
          className={`flex-1 min-w-0 text-base font-roboto font-medium text-primary placeholder:text-stone-400 focus:outline-none bg-transparent ${inputClassName}`}
        />
        {loading && (
          <PageLoader size={20} />
        )}
        {query && !loading && (
          <button onClick={handleClear} className="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-stone-600 cursor-pointer">
            <i className="ri-close-line text-sm"></i>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <ul
          id={comboId}
          ref={listRef}
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-primary/20 rounded-lg shadow-lg z-50 max-h-[380px] overflow-y-auto"
        >
          {/* Near Me button */}
          <li role="none" className="border-b border-primary/10">
            <button
              onClick={handleNearMe}
              disabled={geoLoading}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                {geoLoading ? (
                  <PageLoader size={18} />
                ) : (
                  <i className="ri-navigation-line text-sm"></i>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-roboto font-medium text-primary whitespace-nowrap">
                  {geoLoading ? 'Detecting your location...' : 'Search near me'}
                </span>
                {!geoLoading && (
                  <span className="block text-xs font-roboto text-primary/50">Use my current location</span>
                )}
              </div>
            </button>
          </li>

          {geoError && (
            <li className="px-4 py-2.5 border-b border-primary/10">
              <p className="text-xs font-roboto text-red-500 flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                  <i className="ri-error-warning-line text-xs"></i>
                </span>
                {geoError}
              </p>
            </li>
          )}

          {/* Recent searches label */}
          {showRecentLabel && (
            <li role="none" className="px-4 py-2">
              <span className="text-[10px] font-roboto font-semibold text-primary/40 uppercase tracking-wider">
                Recent searches
              </span>
            </li>
          )}

          {/* Empty state */}
          {query.trim() && !loading && displayItems.length === 0 && (
            <li className="px-4 py-6 text-center">
              <span className="w-10 h-10 mx-auto mb-2 flex items-center justify-center rounded-full bg-gray-100">
                <i className="ri-search-line text-primary/40 text-lg"></i>
              </span>
              <p className="text-sm font-roboto text-primary/50">No results found</p>
              <p className="text-xs font-roboto text-primary/40 mt-0.5">Try a different location or check spelling</p>
            </li>
          )}

          {/* Suggestions */}
          {displayItems.map((item, idx) => (
            <li
              key={item.id}
              id={`ls-option-${idx}`}
              role="option"
              aria-selected={activeIdx === idx}
              onClick={() => selectSuggestion(item)}
              onMouseEnter={() => setActiveIdx(idx)}
              className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                activeIdx === idx ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
            >
              <span className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 ${
                item.source === 'recent' || (showRecentLabel)
                  ? 'bg-gray-100 text-primary/60'
                  : 'bg-primary/10 text-primary'
              }`}>
                {item.source === 'recent' || showRecentLabel ? (
                  <i className="ri-time-line text-sm"></i>
                ) : (
                  <i className="ri-map-pin-line text-sm"></i>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-roboto font-medium text-primary block truncate whitespace-nowrap">
                  {item.name}
                </span>
                {(item.region || item.country) && (
                  <span className="text-xs font-roboto text-primary/50 block truncate whitespace-nowrap">
                    {[item.region, item.country].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
              {item.source === 'geolocation' && (
                <span className="text-[10px] font-roboto font-semibold text-primary/40 uppercase tracking-wider whitespace-nowrap">
                  <span className="w-3 h-3 inline-flex items-center justify-center mr-0.5 align-middle">
                    <i className="ri-navigation-line text-[10px]"></i>
                  </span>
                  Near you
                </span>
              )}
            </li>
          ))}

          {/* Powered by Mapbox */}
          {mapboxToken && query.trim() && suggestions.length > 0 && (
            <li className="px-4 py-2 border-t border-primary/10 flex items-center gap-1.5">
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-map-pin-2-line text-primary/30 text-[10px]"></i>
              </span>
              <span className="text-[9px] font-roboto text-primary/30">Powered by Mapbox</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}