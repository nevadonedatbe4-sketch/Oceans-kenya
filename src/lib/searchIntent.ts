import type { AmenityCategory } from './amenities';

/**
 * Natural-language search intent detection for the Social Directory.
 *
 * Maps everyday questions ("Where can I get a SIM card?", "Where can I
 * withdraw cash?", "Where can I get my dog groomed?") to a directory
 * category (and optionally a tighter keyword) so results surface the
 * correct place types without the user knowing the internal taxonomy.
 */

export interface SearchIntent {
  /** The directory category the query maps to. */
  category: AmenityCategory;
  /**
   * Optional keyword used to further narrow results by name/description.
   * When null, filtering falls back to the category only.
   */
  term: string | null;
}

interface IntentEntry {
  /** Substring looked for (lower-cased) inside the query. */
  trigger: string;
  category: AmenityCategory;
  term: string | null;
}

// Order matters: more specific triggers come first so they win over broader ones.
const INTENT_ENTRIES: IntentEntry[] = [
  // Pets & animal care
  { trigger: 'dog groom', category: 'pets', term: 'groom' },
  { trigger: 'cat groom', category: 'pets', term: 'groom' },
  { trigger: 'dog walk', category: 'pets', term: 'walk' },
  { trigger: 'dog park', category: 'pets', term: 'park' },
  { trigger: 'vet', category: 'pets', term: 'vet' },
  { trigger: 'groom', category: 'pets', term: 'groom' },
  { trigger: 'board', category: 'pets', term: 'board' },
  { trigger: 'kennel', category: 'pets', term: 'kennel' },
  { trigger: 'pet', category: 'pets', term: 'pet' },

  // Connectivity & communication
  { trigger: 'sim card', category: 'connectivity', term: 'sim' },
  { trigger: 'sim', category: 'connectivity', term: 'sim' },
  { trigger: 'esim', category: 'connectivity', term: 'esim' },
  { trigger: 'airtime', category: 'connectivity', term: 'airtime' },
  { trigger: 'fibre', category: 'connectivity', term: 'fibre' },
  { trigger: 'fiber', category: 'connectivity', term: 'fibre' },
  { trigger: 'broadband', category: 'connectivity', term: 'broadband' },
  { trigger: 'internet', category: 'connectivity', term: 'internet' },
  { trigger: 'wi-fi', category: 'connectivity', term: 'wifi' },
  { trigger: 'wifi', category: 'connectivity', term: 'wifi' },
  { trigger: 'router', category: 'connectivity', term: 'router' },
  { trigger: 'phone repair', category: 'connectivity', term: 'repair' },
  { trigger: 'charger', category: 'connectivity', term: 'charger' },
  { trigger: 'power bank', category: 'connectivity', term: 'power bank' },
  { trigger: '5g', category: 'connectivity', term: '5g' },
  { trigger: '4g', category: 'connectivity', term: '4g' },
  { trigger: 'mobile data', category: 'connectivity', term: 'data' },
  { trigger: 'network', category: 'connectivity', term: 'network' },

  // Financial services
  { trigger: 'withdraw cash', category: 'financial', term: 'cash' },
  { trigger: 'withdraw', category: 'financial', term: 'cash' },
  { trigger: 'atm', category: 'financial', term: 'atm' },
  { trigger: 'cash', category: 'financial', term: 'cash' },
  { trigger: 'mobile money', category: 'financial', term: 'mobile money' },
  { trigger: 'mpesa', category: 'financial', term: 'mpesa' },
  { trigger: 'm-pesa', category: 'financial', term: 'mpesa' },
  { trigger: 'forex', category: 'financial', term: 'forex' },
  { trigger: 'bureau', category: 'financial', term: 'bureau' },
  { trigger: 'sacco', category: 'financial', term: 'sacco' },
  { trigger: 'microfinance', category: 'financial', term: 'microfinance' },
  { trigger: 'bank', category: 'financial', term: 'bank' },
  { trigger: 'money', category: 'financial', term: 'money' },

  // Insurance
  { trigger: 'insure', category: 'insurance', term: 'insurance' },
  { trigger: 'insurance', category: 'insurance', term: 'insurance' },

  // Groceries & supermarkets
  { trigger: 'grocery', category: 'groceries', term: 'grocery' },
  { trigger: 'supermarket', category: 'groceries', term: 'supermarket' },
  { trigger: 'hypermarket', category: 'groceries', term: 'hypermarket' },
  { trigger: 'fresh produce', category: 'groceries', term: 'fresh' },
  { trigger: 'butcher', category: 'groceries', term: 'butcher' },
  { trigger: 'bakery', category: 'groceries', term: 'bakery' },
  { trigger: 'market', category: 'groceries', term: 'market' },

  // Shopping centres
  { trigger: 'shopping centre', category: 'shopping_centres', term: null },
  { trigger: 'shopping center', category: 'shopping_centres', term: null },
  { trigger: 'mall', category: 'shopping_centres', term: 'mall' },

  // Shopping
  { trigger: 'clothes', category: 'shopping', term: 'clothing' },
  { trigger: 'clothing', category: 'shopping', term: 'clothing' },
  { trigger: 'shoes', category: 'shopping', term: 'shoes' },
  { trigger: 'fashion', category: 'shopping', term: 'fashion' },
  { trigger: 'furniture', category: 'shopping', term: 'furniture' },
  { trigger: 'electronics', category: 'shopping', term: 'electronics' },
  { trigger: 'appliance', category: 'shopping', term: 'appliance' },
  { trigger: 'toy', category: 'shopping', term: 'toy' },
  { trigger: 'cosmetic', category: 'shopping', term: 'cosmetic' },
  { trigger: 'beauty', category: 'shopping', term: 'beauty' },
  { trigger: 'buy', category: 'shopping', term: null },

  // Everyday services
  { trigger: 'car wash', category: 'services', term: 'car wash' },
  { trigger: 'wash', category: 'services', term: 'laundry' },
  { trigger: 'laundry', category: 'services', term: 'laundry' },
  { trigger: 'dry clean', category: 'services', term: 'dry cleaning' },
  { trigger: 'courier', category: 'services', term: 'courier' },
  { trigger: 'parcel', category: 'services', term: 'parcel' },
  { trigger: 'print', category: 'services', term: 'print' },
  { trigger: 'photocopy', category: 'services', term: 'print' },
  { trigger: 'locksmith', category: 'services', term: 'locksmith' },
  { trigger: 'key cut', category: 'services', term: 'key' },
  { trigger: 'shoe repair', category: 'services', term: 'shoe' },
  { trigger: 'tailor', category: 'services', term: 'tailor' },
  { trigger: 'alter', category: 'services', term: 'alter' },
  { trigger: 'mechanic', category: 'services', term: 'mechanic' },
  { trigger: 'tyre', category: 'services', term: 'tyre' },
  { trigger: 'petrol', category: 'services', term: 'petrol' },
  { trigger: 'gas', category: 'services', term: 'gas' },
  { trigger: 'hardware', category: 'services', term: 'hardware' },
  { trigger: 'cleaning', category: 'services', term: 'cleaning' },
  { trigger: 'pest', category: 'services', term: 'pest' },
  { trigger: 'moving', category: 'services', term: 'moving' },
  { trigger: 'storage', category: 'services', term: 'storage' },
  { trigger: 'repair', category: 'services', term: 'repair' },

  // Business & coworking
  { trigger: 'cowork', category: 'business', term: 'coworking' },
  { trigger: 'meeting room', category: 'business', term: 'meeting' },
  { trigger: 'serviced office', category: 'business', term: 'office' },
  { trigger: 'virtual office', category: 'business', term: 'office' },
  { trigger: 'conference', category: 'business', term: 'conference' },
  { trigger: 'lawyer', category: 'business', term: 'legal' },
  { trigger: 'legal', category: 'business', term: 'legal' },
  { trigger: 'accountant', category: 'business', term: 'accounting' },
  { trigger: 'accounting', category: 'business', term: 'accounting' },
  { trigger: 'consulting', category: 'business', term: 'consulting' },

  // Education
  { trigger: 'daycare', category: 'education', term: 'daycare' },
  { trigger: 'nursery', category: 'education', term: 'nursery' },
  { trigger: 'kindergarten', category: 'education', term: 'kindergarten' },
  { trigger: 'montessori', category: 'education', term: 'montessori' },
  { trigger: 'university', category: 'education', term: 'university' },
  { trigger: 'college', category: 'education', term: 'college' },
  { trigger: 'school', category: 'education', term: 'school' },
  { trigger: 'driving school', category: 'education', term: 'driving' },
  { trigger: 'library', category: 'education', term: 'library' },

  // Health & wellness
  { trigger: 'dentist', category: 'health', term: 'dental' },
  { trigger: 'dental', category: 'health', term: 'dental' },
  { trigger: 'pharmacy', category: 'health', term: 'pharmacy' },
  { trigger: 'chemist', category: 'health', term: 'pharmacy' },
  { trigger: 'hospital', category: 'health', term: 'hospital' },
  { trigger: 'clinic', category: 'health', term: 'clinic' },
  { trigger: 'optician', category: 'health', term: 'optician' },
  { trigger: 'optometrist', category: 'health', term: 'optician' },
  { trigger: 'physiotherapy', category: 'health', term: 'physiotherapy' },
  { trigger: 'laboratory', category: 'health', term: 'laboratory' },
  { trigger: 'maternity', category: 'health', term: 'maternity' },
  { trigger: 'doctor', category: 'health', term: 'clinic' },

  // Fitness & wellness
  { trigger: 'yoga', category: 'fitness', term: 'yoga' },
  { trigger: 'gym', category: 'fitness', term: 'gym' },
  { trigger: 'fitness', category: 'fitness', term: 'fitness' },
  { trigger: 'swimming', category: 'fitness', term: 'swimming' },
  { trigger: 'spa', category: 'fitness', term: 'spa' },

  // Nature & outdoors
  { trigger: 'nature walk', category: 'recreation', term: 'nature walk' },
  { trigger: 'walking trail', category: 'recreation', term: 'trail' },
  { trigger: 'hiking', category: 'recreation', term: 'hiking' },
  { trigger: 'arboretum', category: 'recreation', term: 'arboretum' },
  { trigger: 'botanical', category: 'recreation', term: 'botanical' },
  { trigger: 'forest', category: 'recreation', term: 'forest' },
  { trigger: 'trail', category: 'recreation', term: 'trail' },
  { trigger: 'picnic', category: 'recreation', term: 'picnic' },
  { trigger: 'garden', category: 'recreation', term: 'garden' },
  { trigger: 'park', category: 'recreation', term: 'park' },

  // Community & faith
  { trigger: 'church', category: 'community', term: 'church' },
  { trigger: 'mosque', category: 'community', term: 'mosque' },
  { trigger: 'temple', category: 'community', term: 'temple' },
  { trigger: 'synagogue', category: 'community', term: 'synagogue' },
  { trigger: 'worship', category: 'community', term: 'worship' },
  { trigger: 'charity', category: 'community', term: 'charity' },
  { trigger: 'community centre', category: 'community', term: 'community' },
  { trigger: 'community', category: 'community', term: 'community' },

  // Public services
  { trigger: 'police', category: 'utilities', term: 'police' },
  { trigger: 'fire station', category: 'utilities', term: 'fire' },
  { trigger: 'ambulance', category: 'utilities', term: 'ambulance' },
  { trigger: 'post office', category: 'utilities', term: 'post' },
  { trigger: 'postal', category: 'utilities', term: 'post' },
  { trigger: 'immigration', category: 'utilities', term: 'immigration' },
  { trigger: 'government', category: 'utilities', term: 'government' },
  { trigger: 'passport', category: 'utilities', term: 'passport' },
  { trigger: 'licence', category: 'utilities', term: 'licensing' },
  { trigger: 'license', category: 'utilities', term: 'licensing' },

  // Transport
  { trigger: 'uber', category: 'transport', term: 'uber' },
  { trigger: 'bolt', category: 'transport', term: 'bolt' },
  { trigger: 'matatu', category: 'transport', term: 'matatu' },
  { trigger: 'boda', category: 'transport', term: 'boda' },
  { trigger: 'bus', category: 'transport', term: 'bus' },
  { trigger: 'train', category: 'transport', term: 'train' },
  { trigger: 'taxi', category: 'transport', term: 'taxi' },
  { trigger: 'car hire', category: 'transport', term: 'car hire' },
  { trigger: 'parking', category: 'transport', term: 'parking' },
  { trigger: 'airport', category: 'transport', term: 'airport' },
  { trigger: 'petrol', category: 'transport', term: 'petrol' },

  // Dining
  { trigger: 'coffee', category: 'dining', term: 'coffee' },
  { trigger: 'cafe', category: 'dining', term: 'cafe' },
  { trigger: 'café', category: 'dining', term: 'cafe' },
  { trigger: 'restaurant', category: 'dining', term: 'restaurant' },
  { trigger: 'eat', category: 'dining', term: 'restaurant' },
  { trigger: 'food', category: 'dining', term: 'restaurant' },
  { trigger: 'lunch', category: 'dining', term: 'restaurant' },
  { trigger: 'dinner', category: 'dining', term: 'restaurant' },
  { trigger: 'takeaway', category: 'dining', term: 'takeaway' },
  { trigger: 'delivery', category: 'dining', term: 'delivery' },

  // Night life
  { trigger: 'night club', category: 'night_life', term: 'club' },
  { trigger: 'nightclub', category: 'night_life', term: 'club' },
  { trigger: 'dance club', category: 'night_life', term: 'club' },
  { trigger: 'casino', category: 'night_life', term: 'casino' },
  { trigger: 'karaoke', category: 'night_life', term: 'karaoke' },
  { trigger: 'quiz night', category: 'night_life', term: 'quiz' },
  { trigger: 'quiz', category: 'night_life', term: 'quiz' },
  { trigger: 'live music', category: 'night_life', term: 'live music' },
  { trigger: 'shisha', category: 'night_life', term: 'shisha' },
  { trigger: 'cocktail', category: 'night_life', term: 'cocktail' },
  { trigger: 'rooftop', category: 'night_life', term: 'rooftop' },
  { trigger: 'lounge', category: 'night_life', term: 'lounge' },
  { trigger: 'bar', category: 'night_life', term: 'bar' },
  { trigger: 'pub', category: 'night_life', term: 'pub' },
];

/**
 * Detect the directory intent behind a free-form search query.
 * Returns null when no known intent matches (the raw query is then used as-is).
 */
export function detectSearchIntent(raw: string): SearchIntent | null {
  const q = raw.toLowerCase().trim();
  if (!q) return null;
  for (const entry of INTENT_ENTRIES) {
    if (q.includes(entry.trigger)) {
      return { category: entry.category, term: entry.term };
    }
  }
  return null;
}