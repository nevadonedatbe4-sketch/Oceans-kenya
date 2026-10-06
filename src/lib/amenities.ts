import { haversineDistance } from './distance';
import { smartTitleCase } from './location';

// ─────────────────────────────────────────────────────────────
// Categories (broad, CRM-managed)
// ─────────────────────────────────────────────────────────────
export type AmenityCategory =
  | 'education'
  | 'health'
  | 'fitness'
  | 'transport'
  | 'recreation'
  | 'utilities'
  | 'connectivity'
  | 'financial'
  | 'insurance'
  | 'groceries'
  | 'shopping'
  | 'shopping_centres'
  | 'services'
  | 'business'
  | 'dining'
  | 'night_life'
  | 'pets'
  | 'community'
  | 'art';

export interface CategoryMeta {
  key: AmenityCategory;
  label: string;
  icon: string;
  /** Default badge colour (hex). Can be overridden via site_settings. */
  color: string;
  description: string;
  /** Optional DB override for the category's listing-page heading. */
  view_category_label?: string | null;
}

export const AMENITY_CATEGORIES: CategoryMeta[] = [
  { key: 'connectivity', label: 'Connectivity & Communication', icon: 'ri-wifi-line', color: '#B7791F', description: 'Mobile networks, SIMs, fibre, home & business internet, Wi-Fi and telecom shops' },
  { key: 'financial', label: 'Financial Services', icon: 'ri-bank-line', color: '#2F855A', description: 'Banks, ATMs, mobile money, forex, SACCOs, microfinance and payments' },
  { key: 'insurance', label: 'Insurance', icon: 'ri-shield-line', color: '#8B5E34', description: 'Insurance companies, brokers and agents for motor, health, life, home and business' },
  { key: 'groceries', label: 'Groceries & Supermarkets', icon: 'ri-shopping-basket-line', color: '#6B8E23', description: 'Supermarkets, grocery stores, convenience shops, fresh produce, bakeries and markets' },
  { key: 'shopping', label: 'Shopping', icon: 'ri-shopping-bag-line', color: '#A0522D', description: 'Fashion, beauty, home, electronics and children\u2019s shopping' },
  { key: 'shopping_centres', label: 'Shopping Centres', icon: 'ri-store-3-line', color: '#7B5B3A', description: 'Malls and shopping centres and the businesses inside them' },
  { key: 'services', label: 'Everyday Services', icon: 'ri-tools-line', color: '#708238', description: 'Laundry, repairs, couriers, car wash, printing, hardware and everyday conveniences' },
  { key: 'business', label: 'Business & Coworking', icon: 'ri-briefcase-line', color: '#8A6D3B', description: 'Coworking spaces, business centres, offices, meetings and professional services' },
  { key: 'education', label: 'Education', icon: 'ri-graduation-cap-line', color: '#1F7A6E', description: 'Schools, nurseries, colleges, universities, libraries and training' },
  { key: 'health', label: 'Health & Wellness', icon: 'ri-heart-pulse-line', color: '#B04A3A', description: 'Hospitals, clinics, pharmacies, dental, diagnostics and wellness' },
  { key: 'fitness', label: 'Fitness & Wellness', icon: 'ri-run-line', color: '#2E8B57', description: 'Gyms, fitness studios, yoga, sports clubs, pools and spas' },
  { key: 'pets', label: 'Pets & Animal Care', icon: 'ri-heart-3-line', color: '#C2557A', description: 'Vets, grooming, boarding, sitting, training, shelters and pet shops' },
  { key: 'recreation', label: 'Nature & Outdoors', icon: 'ri-leaf-line', color: '#5F6E2E', description: 'Parks, forests, nature walks, trails, gardens and outdoor spaces' },
  { key: 'community', label: 'Community & Faith', icon: 'ri-hand-heart-line', color: '#B8860B', description: 'Churches, mosques, temples, community centres, charities and cultural spaces' },
  { key: 'art', label: 'Art & Galleries', icon: 'ri-palette-line', color: '#B7743C', description: 'Art galleries, studios, museums, cultural spaces, craft markets and exhibitions' },
  { key: 'utilities', label: 'Public Services', icon: 'ri-shield-check-line', color: '#6B4423', description: 'Police, fire, ambulance, government, courts, libraries and utilities' },
  { key: 'transport', label: 'Transport', icon: 'ri-bus-line', color: '#A9842A', description: 'Matatu routes, bus and train, ride-hailing, parking, petrol and links' },
  { key: 'dining', label: 'Restaurants & Dining', icon: 'ri-restaurant-line', color: '#C05621', description: 'Restaurants, caf\u00e9s, brunch, takeaway and daytime dining across the neighbourhood' },
  { key: 'night_life', label: 'Night Life', icon: 'ri-moon-clear-line', color: '#9B1B30', description: 'Night clubs, bars, lounges, casinos, live music, karaoke, quiz nights and late-night spots' },
];

const CATEGORY_BY_KEY: Record<string, CategoryMeta> = Object.fromEntries(
  AMENITY_CATEGORIES.map((c) => [c.key, c]),
);

/** Categories sorted alphabetically by display label (A→Z) for navigation. */
export const SORTED_CATEGORIES: CategoryMeta[] = [...AMENITY_CATEGORIES].sort((a, b) =>
  a.label.localeCompare(b.label),
);

// ─────────────────────────────────────────────────────────────
// Subcategories (specific amenity types, CRM-managed)
// ─────────────────────────────────────────────────────────────
export interface SubcategoryMeta {
  key: string;
  label: string;
  icon: string;
}

/**
 * A subcategory the CRM user has added to a category in the place edit form.
 * Unlike the built-in SUBCATEGORIES (fixed in code), these are stored on the
 * `amenity_categories.subcategories` jsonb column so they persist and show up
 * for every place - and for future imports - under that category.
 */
export interface CustomSubcategory {
  key: string;
  label: string;
  icon?: string;
  sort_order?: number;
  /**
   * When true this subcategory is hidden from every dropdown, even if its key
   * also exists in the built-in list. Lets a user "delete" a built-in entry
   * that lives in code without touching the code.
   */
  hidden?: boolean;
}

/** Is this subcategory key part of the fixed, built-in list for a category? */
export function isBuiltinSubcategory(
  categorySlug: string | null | undefined,
  key: string,
): boolean {
  const list = (categorySlug && SUBCATEGORIES[categorySlug as AmenityCategory]) || [];
  return list.some((s) => s.key === key);
}

/** Build a stable, URL-safe key from a subcategory label. */
export function subcategoryKeyForLabel(label: string): string {
  const key = label
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return key || 'custom_subcategory';
}

/**
 * Subcategory options for a category = built-in list (for the well-known
 * categories) followed by any custom subcategories the user added.
 *
 * Custom entries can also OVERRIDE a built-in one (same key, new label) or
 * HIDE it (hidden: true), which is how the Category Manager lets a user rename
 * or remove a built-in subcategory that otherwise lives in code.
 */
export function mergeSubcategories(
  categorySlug: string | null | undefined,
  custom: CustomSubcategory[] | null | undefined,
): SubcategoryMeta[] {
  const builtin = (categorySlug && SUBCATEGORIES[categorySlug as AmenityCategory]) || [];
  const list = (custom || []).filter((c) => c && c.key);
  const hidden = new Set(list.filter((c) => c.hidden).map((c) => c.key));
  const overrides = new Map(list.filter((c) => !c.hidden).map((c) => [c.key, c]));

  const out: SubcategoryMeta[] = [];
  const seen = new Set<string>();

  builtin.forEach((b) => {
    if (hidden.has(b.key)) return;
    const o = overrides.get(b.key);
    // Only the user-entered override is normalised; the built-in label is
    // already canonical (and may legitimately be an acronym like "ATM").
    const overrideLabel = smartTitleCase(o?.label || '');
    out.push({ key: b.key, label: overrideLabel || b.label, icon: o?.icon || b.icon });
    seen.add(b.key);
  });

  list.forEach((c) => {
    if (c.hidden || seen.has(c.key)) return;
    // Custom labels are user-entered, so they run through the shared normaliser.
    out.push({ key: c.key, label: smartTitleCase(c.label) || c.label, icon: c.icon || 'ri-price-tag-3-line' });
    seen.add(c.key);
  });

  return out;
}

export const SUBCATEGORIES: Record<AmenityCategory, SubcategoryMeta[]> = {
  connectivity: [
    { key: 'mobile_network', label: 'Mobile Network Operator', icon: 'ri-signal-tower-line' },
    { key: 'sim_cards', label: 'SIM Cards', icon: 'ri-sim-card-line' },
    { key: 'esim', label: 'eSIM', icon: 'ri-sim-card-2-line' },
    { key: 'prepaid_sim', label: 'Prepaid SIM', icon: 'ri-sim-card-line' },
    { key: 'postpaid_sim', label: 'Postpaid SIM', icon: 'ri-sim-card-2-line' },
    { key: 'airtime', label: 'Airtime', icon: 'ri-smartphone-line' },
    { key: 'mobile_data', label: 'Mobile Data', icon: 'ri-signal-wifi-line' },
    { key: 'network_4g', label: '4G Network', icon: 'ri-signal-tower-line' },
    { key: 'network_5g', label: '5G Network', icon: 'ri-signal-tower-line' },
    { key: 'network_shop', label: 'Network Shop', icon: 'ri-store-2-line' },
    { key: 'sim_replacement', label: 'SIM Replacement', icon: 'ri-sim-card-line' },
    { key: 'sim_registration', label: 'SIM Registration', icon: 'ri-user-location-line' },
    { key: 'fibre_internet', label: 'Fibre Internet', icon: 'ri-wifi-line' },
    { key: 'home_internet', label: 'Home Internet', icon: 'ri-home-wifi-line' },
    { key: 'business_internet', label: 'Business Internet', icon: 'ri-briefcase-line' },
    { key: 'home_wifi_4g', label: '4G Home Wi-Fi', icon: 'ri-router-line' },
    { key: 'home_wifi_5g', label: '5G Home Wi-Fi', icon: 'ri-router-line' },
    { key: 'fixed_wireless', label: 'Fixed Wireless', icon: 'ri-wifi-line' },
    { key: 'broadband', label: 'Broadband', icon: 'ri-signal-wifi-line' },
    { key: 'isp', label: 'Internet Service Provider', icon: 'ri-globe-line' },
    { key: 'wifi_installation', label: 'Wi-Fi Installation', icon: 'ri-router-line' },
    { key: 'router_supplier', label: 'Router Supplier', icon: 'ri-router-line' },
    { key: 'mesh_wifi', label: 'Mesh Wi-Fi', icon: 'ri-wifi-line' },
    { key: 'network_installation', label: 'Network Installation', icon: 'ri-cpu-line' },
    { key: 'public_wifi', label: 'Public Wi-Fi', icon: 'ri-wifi-line' },
    { key: 'wifi_hotspot', label: 'Wi-Fi Hotspot', icon: 'ri-wifi-line' },
    { key: 'internet_cafe', label: 'Internet Caf\u00e9', icon: 'ri-computer-line' },
    { key: 'cyber_cafe', label: 'Cyber Caf\u00e9', icon: 'ri-computer-line' },
    { key: 'coworking_wifi', label: 'Coworking Wi-Fi', icon: 'ri-macbook-line' },
    { key: 'business_centre_wifi', label: 'Business Centre Wi-Fi', icon: 'ri-building-line' },
    { key: 'telecom_shop', label: 'Telecom Shop', icon: 'ri-store-2-line' },
    { key: 'mobile_phone_shop', label: 'Mobile Phone Shop', icon: 'ri-smartphone-line' },
    { key: 'phone_repair', label: 'Phone Repair', icon: 'ri-tools-line' },
    { key: 'phone_accessories', label: 'Phone Accessories', icon: 'ri-headphone-line' },
    { key: 'chargers', label: 'Chargers', icon: 'ri-battery-charge-line' },
    { key: 'power_banks', label: 'Power Banks', icon: 'ri-battery-2-line' },
    { key: 'sim_services', label: 'SIM Services', icon: 'ri-sim-card-line' },
  ],
  financial: [
    { key: 'bank', label: 'Bank', icon: 'ri-bank-line' },
    { key: 'bank_branch', label: 'Bank Branch', icon: 'ri-bank-line' },
    { key: 'private_banking', label: 'Private Banking', icon: 'ri-vip-crown-line' },
    { key: 'business_banking', label: 'Business Banking', icon: 'ri-briefcase-line' },
    { key: 'forex', label: 'Foreign Exchange', icon: 'ri-exchange-line' },
    { key: 'forex_bureau', label: 'Forex Bureau', icon: 'ri-currency-line' },
    { key: 'money_transfer', label: 'Money Transfer', icon: 'ri-arrow-left-right-line' },
    { key: 'remittance', label: 'Remittance', icon: 'ri-send-plane-line' },
    { key: 'atm', label: 'ATM', icon: 'ri-money-dollar-circle-line' },
    { key: 'atm_24hr', label: '24-Hour ATM', icon: 'ri-time-line' },
    { key: 'cash_deposit_atm', label: 'Cash Deposit ATM', icon: 'ri-money-dollar-circle-line' },
    { key: 'multibank_atm', label: 'Multi-bank ATM', icon: 'ri-bank-line' },
    { key: 'mobile_money_agent', label: 'Mobile Money Agent', icon: 'ri-smartphone-line' },
    { key: 'cash_in', label: 'Cash In', icon: 'ri-arrow-down-circle-line' },
    { key: 'cash_out', label: 'Cash Out', icon: 'ri-arrow-up-circle-line' },
    { key: 'bill_payments', label: 'Bill Payments', icon: 'ri-bill-line' },
    { key: 'sacco', label: 'SACCO', icon: 'ri-group-line' },
    { key: 'microfinance', label: 'Microfinance', icon: 'ri-hand-coin-line' },
    { key: 'credit_union', label: 'Credit Union', icon: 'ri-group-line' },
    { key: 'digital_lending', label: 'Digital Lending', icon: 'ri-smartphone-line' },
    { key: 'savings_institution', label: 'Savings Institution', icon: 'ri-bank-line' },
    { key: 'investment_services', label: 'Investment Services', icon: 'ri-line-chart-line' },
    { key: 'payment_services', label: 'Payment Services', icon: 'ri-money-dollar-circle-line' },
    { key: 'pos_services', label: 'POS Services', icon: 'ri-terminal-box-line' },
    { key: 'merchant_services', label: 'Merchant Services', icon: 'ri-store-line' },
    { key: 'payment_agent', label: 'Payment Agent', icon: 'ri-user-star-line' },
  ],
  insurance: [
    { key: 'insurance_company', label: 'Insurance Company', icon: 'ri-shield-line' },
    { key: 'insurance_broker', label: 'Insurance Broker', icon: 'ri-user-shared-line' },
    { key: 'insurance_agent', label: 'Insurance Agent', icon: 'ri-user-star-line' },
    { key: 'motor_insurance', label: 'Motor Insurance', icon: 'ri-car-line' },
    { key: 'health_insurance', label: 'Health Insurance', icon: 'ri-heart-pulse-line' },
    { key: 'life_insurance', label: 'Life Insurance', icon: 'ri-heart-line' },
    { key: 'home_insurance', label: 'Home Insurance', icon: 'ri-home-line' },
    { key: 'property_insurance', label: 'Property Insurance', icon: 'ri-building-line' },
    { key: 'business_insurance', label: 'Business Insurance', icon: 'ri-briefcase-line' },
    { key: 'travel_insurance', label: 'Travel Insurance', icon: 'ri-plane-line' },
    { key: 'personal_accident', label: 'Personal Accident', icon: 'ri-user-heart-line' },
    { key: 'pet_insurance', label: 'Pet Insurance', icon: 'ri-heart-3-line' },
    { key: 'agricultural_insurance', label: 'Agricultural Insurance', icon: 'ri-plant-line' },
    { key: 'marine_insurance', label: 'Marine Insurance', icon: 'ri-ship-line' },
    { key: 'commercial_insurance', label: 'Commercial Insurance', icon: 'ri-building-2-line' },
  ],
  groceries: [
    { key: 'supermarket', label: 'Supermarket', icon: 'ri-shopping-cart-line' },
    { key: 'hypermarket', label: 'Hypermarket', icon: 'ri-shopping-cart-2-line' },
    { key: 'grocery_store', label: 'Grocery Store', icon: 'ri-shopping-basket-line' },
    { key: 'convenience_store', label: 'Convenience Store', icon: 'ri-store-line' },
    { key: 'mini_market', label: 'Mini Market', icon: 'ri-store-2-line' },
    { key: 'organic_food', label: 'Organic Food', icon: 'ri-leaf-line' },
    { key: 'fresh_produce', label: 'Fresh Produce', icon: 'ri-apple-line' },
    { key: 'butcher', label: 'Butcher', icon: 'ri-restaurant-line' },
    { key: 'fish_market', label: 'Fish Market', icon: 'ri-anchor-line' },
    { key: 'bakery', label: 'Bakery', icon: 'ri-cake-line' },
    { key: 'deli', label: 'Deli', icon: 'ri-restaurant-2-line' },
    { key: 'specialty_food', label: 'Specialty Food', icon: 'ri-store-3-line' },
    { key: 'health_food', label: 'Health Food', icon: 'ri-heart-pulse-line' },
    { key: 'wine_shop', label: 'Wine / Beverage Shop', icon: 'ri-goblet-line' },
    { key: 'farmers_market', label: 'Farmers Market', icon: 'ri-plant-line' },
    { key: 'local_market', label: 'Local Market', icon: 'ri-store-line' },
    { key: 'market', label: 'Market', icon: 'ri-store-line' },
    { key: 'online_grocery', label: 'Online Grocery Delivery', icon: 'ri-shopping-cart-line' },
  ],
  shopping: [
    { key: 'clothing_shop', label: 'Clothing Shop', icon: 'ri-shirt-line' },
    { key: 'womens_clothing', label: 'Women\u2019s Clothing', icon: 'ri-shirt-line' },
    { key: 'mens_clothing', label: 'Men\u2019s Clothing', icon: 'ri-shirt-line' },
    { key: 'childrens_clothing', label: 'Children\u2019s Clothing', icon: 'ri-shirt-line' },
    { key: 'baby_clothing', label: 'Baby Clothing', icon: 'ri-shirt-line' },
    { key: 'shoes', label: 'Shoes', icon: 'ri-footprint-line' },
    { key: 'sportswear', label: 'Sportswear', icon: 'ri-run-line' },
    { key: 'formalwear', label: 'Formalwear', icon: 'ri-shirt-line' },
    { key: 'designer', label: 'Designer / Luxury', icon: 'ri-vip-crown-line' },
    { key: 'boutique', label: 'Fashion Boutique', icon: 'ri-store-2-line' },
    { key: 'thrift', label: 'Second Hand / Thrift', icon: 'ri-recycle-line' },
    { key: 'tailor', label: 'Tailor', icon: 'ri-scissors-line' },
    { key: 'alterations', label: 'Alterations', icon: 'ri-scissors-2-line' },
    { key: 'cosmetics', label: 'Cosmetics', icon: 'ri-magic-line' },
    { key: 'beauty_supply', label: 'Beauty Supply', icon: 'ri-sparkling-line' },
    { key: 'perfume', label: 'Perfume', icon: 'ri-drop-line' },
    { key: 'skincare', label: 'Skincare', icon: 'ri-heart-3-line' },
    { key: 'hair_products', label: 'Hair Products', icon: 'ri-scissors-line' },
    { key: 'salon', label: 'Salon', icon: 'ri-scissors-line' },
    { key: 'barber', label: 'Barber', icon: 'ri-scissors-2-line' },
    { key: 'furniture', label: 'Furniture', icon: 'ri-armchair-line' },
    { key: 'home_decor', label: 'Home D\u00e9cor', icon: 'ri-home-gear-line' },
    { key: 'curtains', label: 'Curtains', icon: 'ri-home-gear-line' },
    { key: 'lighting', label: 'Lighting', icon: 'ri-lightbulb-line' },
    { key: 'appliances', label: 'Appliances', icon: 'ri-fridge-line' },
    { key: 'kitchenware', label: 'Kitchenware', icon: 'ri-restaurant-line' },
    { key: 'bedding', label: 'Bedding', icon: 'ri-moon-line' },
    { key: 'mattresses', label: 'Mattresses', icon: 'ri-moon-line' },
    { key: 'home_improvement', label: 'Home Improvement', icon: 'ri-hammer-line' },
    { key: 'hardware', label: 'Hardware', icon: 'ri-tools-line' },
    { key: 'garden_supplies', label: 'Garden Supplies', icon: 'ri-plant-line' },
    { key: 'phones', label: 'Phones', icon: 'ri-smartphone-line' },
    { key: 'computers', label: 'Computers', icon: 'ri-computer-line' },
    { key: 'tvs', label: 'TVs', icon: 'ri-tv-line' },
    { key: 'cameras', label: 'Cameras', icon: 'ri-camera-line' },
    { key: 'electronics', label: 'Electronics', icon: 'ri-cpu-line' },
    { key: 'electronics_accessories', label: 'Electronics Accessories', icon: 'ri-headphone-line' },
    { key: 'electronics_repairs', label: 'Electronics Repairs', icon: 'ri-tools-line' },
    { key: 'appliance_shop', label: 'Appliance Shop', icon: 'ri-fridge-line' },
    { key: 'baby_shop', label: 'Baby Shop', icon: 'ri-emotion-happy-line' },
    { key: 'toys', label: 'Toys', icon: 'ri-gamepad-line' },
    { key: 'childrens_furniture', label: 'Children\u2019s Furniture', icon: 'ri-armchair-line' },
    { key: 'school_supplies', label: 'School Supplies', icon: 'ri-book-2-line' },
  ],
  shopping_centres: [
    { key: 'shopping_centre', label: 'Shopping Centre', icon: 'ri-store-3-line' },
    { key: 'mall', label: 'Mall', icon: 'ri-store-2-line' },
    { key: 'plaza', label: 'Plaza', icon: 'ri-building-2-line' },
    { key: 'shopping_complex', label: 'Shopping Complex', icon: 'ri-building-line' },
    { key: 'outlet_mall', label: 'Outlet Mall', icon: 'ri-store-3-line' },
  ],
  services: [
    { key: 'laundry', label: 'Laundry', icon: 'ri-shirt-line' },
    { key: 'dry_cleaning', label: 'Dry Cleaning', icon: 'ri-shirt-line' },
    { key: 'tailor', label: 'Tailor', icon: 'ri-scissors-line' },
    { key: 'shoe_repair', label: 'Shoe Repair', icon: 'ri-footprint-line' },
    { key: 'key_cutting', label: 'Key Cutting', icon: 'ri-key-line' },
    { key: 'printing', label: 'Printing', icon: 'ri-printer-line' },
    { key: 'photocopying', label: 'Photocopying', icon: 'ri-printer-line' },
    { key: 'courier', label: 'Courier Services', icon: 'ri-truck-line' },
    { key: 'postal', label: 'Postal Services', icon: 'ri-mail-send-line' },
    { key: 'post_office', label: 'Post Office', icon: 'ri-mail-line' },
    { key: 'parcel_collection', label: 'Parcel Collection', icon: 'ri-archive-line' },
    { key: 'car_wash', label: 'Car Wash', icon: 'ri-car-washing-line' },
    { key: 'car_repair', label: 'Car Repair', icon: 'ri-car-line' },
    { key: 'tyres', label: 'Tyres', icon: 'ri-car-line' },
    { key: 'mechanic', label: 'Mechanic', icon: 'ri-tools-line' },
    { key: 'car_accessories', label: 'Car Accessories', icon: 'ri-car-line' },
    { key: 'petrol_station', label: 'Petrol Station', icon: 'ri-gas-station-line' },
    { key: 'ev_charging', label: 'EV Charging', icon: 'ri-plug-line' },
    { key: 'gas_lpg', label: 'Gas / LPG', icon: 'ri-fire-line' },
    { key: 'hardware', label: 'Hardware', icon: 'ri-hammer-line' },
    { key: 'locksmith', label: 'Locksmith', icon: 'ri-key-2-line' },
    { key: 'cleaning_services', label: 'Cleaning Services', icon: 'ri-brush-line' },
    { key: 'pest_control', label: 'Pest Control', icon: 'ri-bug-line' },
    { key: 'security_services', label: 'Security Services', icon: 'ri-shield-star-line' },
    { key: 'moving_company', label: 'Moving Company', icon: 'ri-truck-line' },
    { key: 'storage', label: 'Storage', icon: 'ri-archive-line' },
    { key: 'home_maintenance', label: 'Home Maintenance', icon: 'ri-home-gear-line' },
  ],
  business: [
    { key: 'coworking', label: 'Coworking', icon: 'ri-macbook-line' },
    { key: 'serviced_office', label: 'Serviced Office', icon: 'ri-building-line' },
    { key: 'business_centre', label: 'Business Centre', icon: 'ri-briefcase-line' },
    { key: 'office_park', label: 'Office Park', icon: 'ri-building-line' },
    { key: 'meeting_room', label: 'Meeting Room', icon: 'ri-presentation-line' },
    { key: 'conference_centre', label: 'Conference Centre', icon: 'ri-presentation-line' },
    { key: 'conference_facility', label: 'Conference Facility', icon: 'ri-presentation-line' },
    { key: 'virtual_office', label: 'Virtual Office', icon: 'ri-globe-line' },
    { key: 'legal_services', label: 'Legal Services', icon: 'ri-scales-line' },
    { key: 'accounting', label: 'Accounting', icon: 'ri-calculator-line' },
    { key: 'tax_services', label: 'Tax Services', icon: 'ri-file-list-3-line' },
    { key: 'recruitment', label: 'Recruitment', icon: 'ri-user-search-line' },
    { key: 'hr_services', label: 'HR Services', icon: 'ri-group-line' },
    { key: 'consulting', label: 'Consulting', icon: 'ri-lightbulb-line' },
    { key: 'marketing_agency', label: 'Marketing Agency', icon: 'ri-megaphone-line' },
    { key: 'it_services', label: 'IT Services', icon: 'ri-code-line' },
    { key: 'graphic_design', label: 'Graphic Design', icon: 'ri-palette-line' },
    { key: 'photographer', label: 'Photographer', icon: 'ri-camera-line' },
    { key: 'printing', label: 'Printing', icon: 'ri-printer-line' },
    { key: 'business_support', label: 'Business Support', icon: 'ri-hand-heart-line' },
  ],
  education: [
    { key: 'nursery', label: 'Nursery', icon: 'ri-emotion-happy-line' },
    { key: 'daycare', label: 'Daycare', icon: 'ri-user-heart-line' },
    { key: 'kindergarten', label: 'Kindergarten / Early Years', icon: 'ri-empathize-line' },
    { key: 'primary_school', label: 'Primary School', icon: 'ri-school-line' },
    { key: 'secondary_school', label: 'Secondary School', icon: 'ri-school-line' },
    { key: 'international_school', label: 'International School', icon: 'ri-graduation-cap-line' },
    { key: 'british_curriculum', label: 'British Curriculum', icon: 'ri-flag-line' },
    { key: 'american_curriculum', label: 'American Curriculum', icon: 'ri-flag-2-line' },
    { key: 'cbc', label: 'CBC Curriculum', icon: 'ri-book-open-line' },
    { key: 'montessori', label: 'Montessori', icon: 'ri-empathize-line' },
    { key: 'boarding', label: 'Boarding School', icon: 'ri-home-smile-line' },
    { key: 'college', label: 'College', icon: 'ri-book-2-line' },
    { key: 'university', label: 'University', icon: 'ri-building-2-line' },
    { key: 'vocational', label: 'Vocational / Technical', icon: 'ri-tools-line' },
    { key: 'tuition', label: 'Tuition / Tutoring', icon: 'ri-book-read-line' },
    { key: 'music_school', label: 'Music School', icon: 'ri-music-2-line' },
    { key: 'art_school', label: 'Art School', icon: 'ri-palette-line' },
    { key: 'language_school', label: 'Language School', icon: 'ri-global-line' },
    { key: 'driving_school', label: 'Driving School', icon: 'ri-steering-line' },
    { key: 'professional_training', label: 'Professional Training', icon: 'ri-award-line' },
    { key: 'training_centre', label: 'Training Centre', icon: 'ri-presentation-line' },
    { key: 'library', label: 'Library', icon: 'ri-book-read-line' },
  ],
  health: [
    { key: 'hospital', label: 'Hospital', icon: 'ri-hospital-line' },
    { key: 'clinic', label: 'Clinic', icon: 'ri-stethoscope-line' },
    { key: 'medical_centre', label: 'Medical Centre', icon: 'ri-first-aid-kit-line' },
    { key: 'dental_clinic', label: 'Dental Clinic', icon: 'ri-brush-line' },
    { key: 'specialist_centre', label: 'Specialist Centre', icon: 'ri-microscope-line' },
    { key: 'pharmacy', label: 'Pharmacy', icon: 'ri-medicine-bottle-line' },
    { key: 'pharmacy_24hr', label: '24-Hour Pharmacy', icon: 'ri-time-line' },
    { key: 'diagnostic_centre', label: 'Diagnostic Centre', icon: 'ri-test-tube-line' },
    { key: 'laboratory', label: 'Laboratory', icon: 'ri-flask-line' },
    { key: 'optician', label: 'Optician', icon: 'ri-eye-line' },
    { key: 'physiotherapy', label: 'Physiotherapy', icon: 'ri-heart-pulse-line' },
    { key: 'maternity', label: 'Maternity', icon: 'ri-user-heart-line' },
    { key: 'imaging', label: 'Imaging / Radiology', icon: 'ri-scan-line' },
    { key: 'mental_wellness', label: 'Mental Wellness', icon: 'ri-mental-health-line' },
    { key: 'nutrition', label: 'Nutrition', icon: 'ri-restaurant-2-line' },
    { key: 'wellness_centre', label: 'Wellness Centre', icon: 'ri-plant-line' },
    { key: 'medical_equipment', label: 'Medical Equipment', icon: 'ri-stethoscope-line' },
    { key: 'emergency', label: 'Emergency Services', icon: 'ri-alarm-warning-line' },
  ],
  fitness: [
    { key: 'gym', label: 'Gym', icon: 'ri-run-line' },
    { key: 'fitness_studio', label: 'Fitness Studio', icon: 'ri-heart-pulse-line' },
    { key: 'yoga_pilates', label: 'Yoga & Pilates', icon: 'ri-mental-health-line' },
    { key: 'swimming_pool', label: 'Swimming Pool', icon: 'ri-water-flash-line' },
    { key: 'sports_club', label: 'Sports Club', icon: 'ri-football-line' },
    { key: 'personal_training', label: 'Personal Training', icon: 'ri-user-star-line' },
    { key: 'spa', label: 'Spa & Wellness', icon: 'ri-hearts-line' },
    { key: 'massage', label: 'Massage', icon: 'ri-heart-pulse-line' },
    { key: 'day_spa', label: 'Day Spa', icon: 'ri-hearts-line' },
    { key: 'massage_therapy', label: 'Massage Therapy', icon: 'ri-heart-pulse-line' },
    { key: 'wellness_centre', label: 'Wellness Centre', icon: 'ri-plant-line' },
  ],
  pets: [
    { key: 'veterinary', label: 'Veterinary', icon: 'ri-stethoscope-line' },
    { key: 'veterinary_hospital', label: 'Veterinary Hospital', icon: 'ri-hospital-line' },
    { key: 'emergency_vet', label: 'Emergency Vet', icon: 'ri-alarm-warning-line' },
    { key: 'pet_pharmacy', label: 'Pet Pharmacy', icon: 'ri-medicine-bottle-line' },
    { key: 'grooming', label: 'Grooming', icon: 'ri-scissors-line' },
    { key: 'dog_grooming', label: 'Dog Grooming', icon: 'ri-scissors-line' },
    { key: 'cat_grooming', label: 'Cat Grooming', icon: 'ri-scissors-line' },
    { key: 'pet_grooming', label: 'Pet Grooming', icon: 'ri-scissors-line' },
    { key: 'boarding', label: 'Boarding', icon: 'ri-home-smile-line' },
    { key: 'dog_boarding', label: 'Dog Boarding', icon: 'ri-home-smile-line' },
    { key: 'cat_boarding', label: 'Cat Boarding', icon: 'ri-home-smile-line' },
    { key: 'kennel', label: 'Kennel', icon: 'ri-home-smile-line' },
    { key: 'pet_daycare', label: 'Pet Daycare', icon: 'ri-user-heart-line' },
    { key: 'pet_sitting', label: 'Pet Sitting', icon: 'ri-user-heart-line' },
    { key: 'dog_walking', label: 'Dog Walking', icon: 'ri-walk-line' },
    { key: 'training', label: 'Training', icon: 'ri-medal-line' },
    { key: 'dog_training', label: 'Dog Training', icon: 'ri-medal-line' },
    { key: 'adoption_rescue', label: 'Adoption & Rescue', icon: 'ri-hand-heart-line' },
    { key: 'pet_retail', label: 'Pet Retail', icon: 'ri-store-2-line' },
    { key: 'pet_food', label: 'Pet Food', icon: 'ri-store-line' },
    { key: 'dog_park', label: 'Dog Parks & Exercise', icon: 'ri-tree-line' },
    { key: 'animal_shelter', label: 'Animal Shelter', icon: 'ri-hand-heart-line' },
    { key: 'rescue_centre', label: 'Rescue Centre', icon: 'ri-hand-heart-line' },
    { key: 'adoption_centre', label: 'Adoption Centre', icon: 'ri-hand-heart-line' },
  ],
  recreation: [
    { key: 'park', label: 'Public Park', icon: 'ri-tree-line' },
    { key: 'playground', label: 'Playground', icon: 'ri-gamepad-line' },
    { key: 'community_centre', label: 'Community Centre', icon: 'ri-home-smile-line' },
    { key: 'community_hall', label: 'Community Hall', icon: 'ri-building-4-line' },
    { key: 'sports_complex', label: 'Sports Complex', icon: 'ri-basketball-line' },
    { key: 'sports_field', label: 'Sports Field', icon: 'ri-football-line' },
    { key: 'court', label: 'Sports Court', icon: 'ri-basketball-line' },
    { key: 'swimming_pool', label: 'Swimming Pool', icon: 'ri-water-flash-line' },
    { key: 'leisure', label: 'Leisure Facility', icon: 'ri-cup-line' },
    { key: 'garden', label: 'Garden', icon: 'ri-plant-line' },
    { key: 'museum', label: 'Museum', icon: 'ri-bank-line' },
    { key: 'cultural_centre', label: 'Cultural Centre', icon: 'ri-music-2-line' },
    { key: 'recreation_centre', label: 'Recreation Centre', icon: 'ri-layout-masonry-line' },
    { key: 'nature_walk', label: 'Nature Walk', icon: 'ri-walk-line' },
    { key: 'forest', label: 'Forest', icon: 'ri-tree-line' },
    { key: 'arboretum', label: 'Arboretum', icon: 'ri-leaf-line' },
    { key: 'botanical_garden', label: 'Botanical Garden', icon: 'ri-seedling-line' },
    { key: 'walking_trail', label: 'Walking Trail', icon: 'ri-walk-line' },
    { key: 'hiking_trail', label: 'Hiking Trail', icon: 'ri-riding-line' },
    { key: 'picnic_area', label: 'Picnic Area', icon: 'ri-restaurant-2-line' },
    { key: 'wildlife_area', label: 'Wildlife Area', icon: 'ri-leaf-line' },
    { key: 'bird_watching', label: 'Bird Watching', icon: 'ri-eye-line' },
    { key: 'green_space', label: 'Green Space', icon: 'ri-plant-line' },
    { key: 'running_trail', label: 'Running Trail', icon: 'ri-run-line' },
    { key: 'cycling_trail', label: 'Cycling Trail', icon: 'ri-riding-line' },
    { key: 'dog_walking_area', label: 'Dog Walking Area', icon: 'ri-walk-line' },
    { key: 'scenic_area', label: 'Scenic Area', icon: 'ri-landscape-line' },
    { key: 'waterfall', label: 'Waterfall', icon: 'ri-water-flash-line' },
    { key: 'viewpoint', label: 'Viewpoint', icon: 'ri-eye-2-line' },
    { key: 'outdoor_adventure', label: 'Outdoor Adventure', icon: 'ri-compass-3-line' },
    { key: 'conservation_area', label: 'Conservation Area', icon: 'ri-shield-star-line' },
    { key: 'community_green_space', label: 'Community Green Space', icon: 'ri-plant-line' },
  ],
  community: [
    { key: 'church', label: 'Church', icon: 'ri-building-2-line' },
    { key: 'mosque', label: 'Mosque', icon: 'ri-building-2-line' },
    { key: 'temple', label: 'Temple', icon: 'ri-building-2-line' },
    { key: 'synagogue', label: 'Synagogue', icon: 'ri-building-2-line' },
    { key: 'place_of_worship', label: 'Place of Worship', icon: 'ri-building-line' },
    { key: 'community_centre', label: 'Community Centre', icon: 'ri-home-smile-line' },
    { key: 'youth_centre', label: 'Youth Centre', icon: 'ri-user-heart-line' },
    { key: 'charity', label: 'Charity', icon: 'ri-hand-heart-line' },
    { key: 'ngo', label: 'NGO', icon: 'ri-global-line' },
    { key: 'community_organisation', label: 'Community Organisation', icon: 'ri-group-line' },
    { key: 'cultural_centre', label: 'Cultural Centre', icon: 'ri-music-2-line' },
  ],
  utilities: [
    { key: 'water_supply', label: 'Water Supply', icon: 'ri-drop-line' },
    { key: 'sanitation', label: 'Sanitation', icon: 'ri-recycle-line' },
    { key: 'waste_collection', label: 'Waste Collection', icon: 'ri-delete-bin-line' },
    { key: 'electricity', label: 'Electricity Supply', icon: 'ri-flashlight-line' },
    { key: 'police_station', label: 'Police Station', icon: 'ri-police-car-line' },
    { key: 'fire_station', label: 'Fire Station', icon: 'ri-fire-line' },
    { key: 'ambulance', label: 'Ambulance', icon: 'ri-taxi-line' },
    { key: 'government_office', label: 'Government Office', icon: 'ri-government-line' },
    { key: 'county_office', label: 'County Office', icon: 'ri-government-line' },
    { key: 'law_court', label: 'Court', icon: 'ri-scales-line' },
    { key: 'immigration', label: 'Immigration', icon: 'ri-passport-line' },
    { key: 'licensing', label: 'Licensing', icon: 'ri-file-list-3-line' },
    { key: 'public_library', label: 'Public Library', icon: 'ri-book-read-line' },
    { key: 'security', label: 'Security Services', icon: 'ri-shield-star-line' },
    { key: 'emergency', label: 'Emergency Services', icon: 'ri-alarm-warning-line' },
  ],
  transport: [
    { key: 'public_transport', label: 'Public Transport', icon: 'ri-bus-2-line' },
    { key: 'matatu_route', label: 'Matatu Route', icon: 'ri-route-line' },
    { key: 'matatu_stage', label: 'Matatu Stage', icon: 'ri-bus-wifi-line' },
    { key: 'bus_stop', label: 'Bus Stop', icon: 'ri-bus-line' },
    { key: 'bus_station', label: 'Bus Station', icon: 'ri-bus-2-line' },
    { key: 'train_station', label: 'Train Station', icon: 'ri-train-line' },
    { key: 'railway', label: 'Railway', icon: 'ri-train-line' },
    { key: 'brt', label: 'BRT', icon: 'ri-bus-line' },
    { key: 'taxi', label: 'Taxi', icon: 'ri-taxi-line' },
    { key: 'taxi_stand', label: 'Taxi Stand', icon: 'ri-taxi-line' },
    { key: 'ride_hailing', label: 'Ride-Hailing', icon: 'ri-smartphone-line' },
    { key: 'uber', label: 'Uber', icon: 'ri-smartphone-line' },
    { key: 'bolt', label: 'Bolt', icon: 'ri-smartphone-line' },
    { key: 'boda_boda', label: 'Boda Boda', icon: 'ri-motorbike-line' },
    { key: 'car_hire', label: 'Car Hire', icon: 'ri-car-line' },
    { key: 'drivers', label: 'Drivers', icon: 'ri-user-star-line' },
    { key: 'parking', label: 'Parking', icon: 'ri-parking-box-line' },
    { key: 'petrol_station', label: 'Petrol Station', icon: 'ri-gas-station-line' },
    { key: 'ev_charging', label: 'EV Charging', icon: 'ri-plug-line' },
    { key: 'expressway', label: 'Expressway', icon: 'ri-roadster-line' },
    { key: 'road', label: 'Major Road', icon: 'ri-road-map-line' },
    { key: 'walkway', label: 'Walkway', icon: 'ri-walk-line' },
    { key: 'cycling_path', label: 'Cycling Path', icon: 'ri-riding-line' },
    { key: 'transport_link', label: 'Transport Link', icon: 'ri-route-line' },
    { key: 'transport_hub', label: 'Transport Hub', icon: 'ri-map-pin-line' },
    { key: 'airport', label: 'Airport', icon: 'ri-plane-line' },
  ],
  dining: [
    { key: 'restaurant', label: 'Restaurant', icon: 'ri-restaurant-line' },
    { key: 'cafe', label: 'Caf\u00e9', icon: 'ri-cup-line' },
    { key: 'coffee_shop', label: 'Coffee Shop', icon: 'ri-cup-line' },
    { key: 'brunch', label: 'Brunch', icon: 'ri-bread-line' },
    { key: 'fast_food', label: 'Fast Food', icon: 'ri-restaurant-2-line' },
    { key: 'grill', label: 'Grill & Barbecue', icon: 'ri-fire-line' },
    { key: 'fine_dining', label: 'Fine Dining', icon: 'ri-vip-crown-line' },
    { key: 'steakhouse', label: 'Steakhouse', icon: 'ri-restaurant-2-line' },
    { key: 'family_dining', label: 'Family Dining', icon: 'ri-group-line' },
    { key: 'takeaway', label: 'Takeaway', icon: 'ri-shopping-bag-line' },
    { key: 'food_court', label: 'Food Court', icon: 'ri-restaurant-line' },
    { key: 'delivery', label: 'Food Delivery', icon: 'ri-motorbike-line' },
    { key: 'bakery', label: 'Bakery', icon: 'ri-cake-line' },
    { key: 'vegetarian', label: 'Vegetarian', icon: 'ri-leaf-line' },
    { key: 'vegan', label: 'Vegan', icon: 'ri-plant-line' },
    { key: 'halal', label: 'Halal', icon: 'ri-restaurant-line' },
    { key: 'local_cuisine', label: 'Local Cuisine', icon: 'ri-restaurant-line' },
    { key: 'international_cuisine', label: 'International Cuisine', icon: 'ri-globe-line' },
  ],
  art: [
    { key: 'art_gallery', label: 'Art Gallery', icon: 'ri-palette-line' },
    { key: 'gallery', label: 'Gallery', icon: 'ri-image-2-line' },
    { key: 'art_centre', label: 'Art Centre', icon: 'ri-building-2-line' },
    { key: 'art_studio', label: 'Art Studio', icon: 'ri-brush-line' },
    { key: 'artist_studio', label: 'Artist Studio', icon: 'ri-brush-2-line' },
    { key: 'ceramics_studio', label: 'Ceramics Studio', icon: 'ri-brush-line' },
    { key: 'exhibition_space', label: 'Exhibition Space', icon: 'ri-layout-masonry-line' },
    { key: 'museum', label: 'Museum', icon: 'ri-bank-line' },
    { key: 'photo_gallery', label: 'Photography Gallery', icon: 'ri-camera-line' },
    { key: 'sculpture_garden', label: 'Sculpture Garden', icon: 'ri-plant-line' },
    { key: 'cultural_space', label: 'Cultural Space', icon: 'ri-music-2-line' },
    { key: 'craft_market', label: 'Craft Market', icon: 'ri-store-2-line' },
    { key: 'art_supplies', label: 'Art Supplies', icon: 'ri-shopping-bag-line' },
    { key: 'framing', label: 'Framing', icon: 'ri-image-line' },
    { key: 'art_gallery_cafe', label: 'Gallery Caf\u00e9', icon: 'ri-cup-line' },
    { key: 'auction_house', label: 'Auction House', icon: 'ri-vip-crown-line' },
  ],
  night_life: [
    { key: 'night_club', label: 'Night Club', icon: 'ri-disc-line' },
    { key: 'bar', label: 'Bar', icon: 'ri-goblet-line' },
    { key: 'bar_lounge', label: 'Bar & Lounge', icon: 'ri-goblet-line' },
    { key: 'lounge', label: 'Lounge', icon: 'ri-sofa-line' },
    { key: 'pub', label: 'Pub', icon: 'ri-goblet-line' },
    { key: 'cocktail_bar', label: 'Cocktail Bar', icon: 'ri-goblet-line' },
    { key: 'rooftop_bar', label: 'Rooftop Bar', icon: 'ri-building-2-line' },
    { key: 'wine_bar', label: 'Wine Bar', icon: 'ri-goblet-line' },
    { key: 'sports_bar', label: 'Sports Bar', icon: 'ri-tv-line' },
    { key: 'shisha_lounge', label: 'Shisha Lounge', icon: 'ri-fire-line' },
    { key: 'casino', label: 'Casino', icon: 'ri-copper-coin-line' },
    { key: 'quiz_night', label: 'Quiz Night', icon: 'ri-questionnaire-line' },
    { key: 'karaoke', label: 'Karaoke', icon: 'ri-mic-line' },
    { key: 'live_music', label: 'Live Music / Live Band', icon: 'ri-music-2-line' },
    { key: 'dj_night', label: 'DJ Night', icon: 'ri-headphone-line' },
    { key: 'comedy_club', label: 'Comedy Club', icon: 'ri-emotion-laugh-line' },
    { key: 'late_night_eats', label: 'Late Night Eats', icon: 'ri-restaurant-2-line' },
  ],
};

// ─────────────────────────────────────────────────────────────
// Business purpose & price tier (CRM enrichment fields)
// ─────────────────────────────────────────────────────────────
/**
 * Common business purposes offered as quick-pick options in the CRM edit
 * form. Users can also type a fully custom value, so this list is only a
 * convenience - the stored `purpose` is free text.
 */
export const PURPOSE_OPTIONS: string[] = [
  'Church',
  'Mosque',
  'Temple',
  'Synagogue',
  'Social Group',
  'Community Group',
  'Charity / NGO',
  '5-Star',
  'Local Favourite',
  'Family-Friendly',
  'Premium',
  'Budget-Friendly',
];

/** Fixed price-tier classifications for a place/service. */
export const PRICE_TIERS: string[] = ['Budget', 'Mid-Range', 'Premium', '5-Star'];

const SUBCATEGORY_INDEX: Record<string, SubcategoryMeta> = {};
(Object.keys(SUBCATEGORIES) as AmenityCategory[]).forEach((cat) => {
  SUBCATEGORIES[cat].forEach((s) => {
    SUBCATEGORY_INDEX[s.key] = s;
  });
});

// ─────────────────────────────────────────────────────────────
// Label styling (CRM-editable per amenity)
// ─────────────────────────────────────────────────────────────
export interface AmenityLabelStyle {
  bg?: string;
  text?: string;
  border?: string;
  icon?: string;
}

/**
 * Resolve the design-token CSS variable that carries a category's accent
 * colour (e.g. "--amenity-cat-color-connectivity"). Components must consume
 * this variable rather than a literal hex, so that editing a category's
 * colour in the admin updates every card/icon/badge that uses it.
 */
export function categoryColorVar(slug?: string | null): string {
  const s = (slug || '').trim().replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  return `--amenity-cat-color-${s || 'default'}`;
}

/**
 * Pick a readable foreground colour for text / icons sitting on top of a
 * given background colour. Returns white on dark backgrounds and a deep
 * near-black on light backgrounds, so an icon can never end up as invisible
 * white-on-white. Falls back to the dark tone for empty values, CSS variables
 * or any colour it can't parse.
 */
export function contrastTextOn(color?: string | null): string {
  const hex = (color || '').trim();
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!match) return '#0d1f2d';
  let h = match[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const r = toLinear(parseInt(h.slice(0, 2), 16) / 255);
  const g = toLinear(parseInt(h.slice(2, 4), 16) / 255);
  const b = toLinear(parseInt(h.slice(4, 6), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? '#0d1f2d' : '#ffffff';
}

// ─────────────────────────────────────────────────────────────
// Amenity record
// ─────────────────────────────────────────────────────────────
export interface AmenityAttributes {
  curriculum?: string;
  levels?: string;
  fee_range?: string;
  established?: number;
  student_count?: number;
  features?: string[];
  emergency_rating?: number;
  store_count?: number;
  review_count?: number;
  /** Archived is a status of its own, kept apart from Draft/Unpublished. */
  is_archived?: boolean;
  archived_at?: string | null;
  [key: string]: unknown;
}

export interface Amenity {
  id: string;
  name: string;
  slug: string | null;
  type: string;
  category: string | null;
  subcategory: string | null;
  neighbourhood_id: string | null;
  neighbourhood_name: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  website: string | null;
  maps_url: string | null;
  phone: string | null;
  email: string | null;
  opening_hours: string | null;
  rating: number | null;
  purpose: string | null;
  price_tier: string | null;
  /** Services offered, e.g. Dine-in, Delivery, Catering. */
  services: string[] | null;
  /** Human-entered price range, e.g. "KSh 500 - 2,000". */
  price_range: string | null;
  /** Verified cuisine / concept, e.g. "Japanese / Asian". */
  cuisine?: string | null;
  /** Occasion / use-case tags, e.g. ["date night", "family"]. */
  best_for?: string[] | null;
  /** Where the record was verified from (editorial review, official site, etc.). */
  source?: string | null;
  source_url?: string | null;
  /** ISO date the record was last verified. */
  last_verified?: string | null;
  /** True when the record has been curated for the editorial guides. */
  is_guide_curated?: boolean | null;
  /** Quick-pasted Google review text for this place. */
  google_review_text: string | null;
  attributes: AmenityAttributes | null;
  image: string | null;
  gallery: string[] | null;
  alt_text: string | null;
  label: string | null;
  label_style: AmenityLabelStyle | null;
  icon: string | null;
  is_published: boolean;
  is_featured: boolean;
  is_starred?: boolean | null;
  is_flagged?: boolean | null;
  flag_reason?: string | null;
  flag_note?: string | null;
  flagged_at?: string | null;
  view_count?: number | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  review_count?: number | null;
  avg_rating?: number | null;
  sort_order: number;
  /** FK to amenity_categories; present on rows read from the DB. */
  category_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
export function categoryMeta(category: string | null | undefined): CategoryMeta | null {
  if (!category) return null;
  return CATEGORY_BY_KEY[category] || null;
}

export function categoryLabel(category: string | null | undefined): string {
  return categoryMeta(category)?.label || smartTitleCase(category || '');
}

/**
 * categoryRecordName — display name for a DB category record, normalised to
 * the site-wide Title Case so CRM dropdowns and pills read consistently.
 */
export function categoryRecordName(rec?: { name?: string | null } | null): string {
  return smartTitleCase(rec?.name || '');
}

export function categoryIcon(category: string | null | undefined): string {
  return categoryMeta(category)?.icon || 'ri-map-pin-2-line';
}

export function categoryColor(category: string | null | undefined, overrides?: Record<string, string>): string {
  const meta = categoryMeta(category);
  const base = meta?.color || '#6B4423';
  if (overrides && category && overrides[category]) return overrides[category];
  return base;
}

export function subcategoryMeta(key: string | null | undefined): SubcategoryMeta | null {
  if (!key) return null;
  return SUBCATEGORY_INDEX[key] || null;
}

export function subcategoryLabel(key: string | null | undefined): string {
  return subcategoryMeta(key)?.label || smartTitleCase((key || '').replace(/_/g, ' '));
}

export function subcategoryIcon(key: string | null | undefined): string {
  return subcategoryMeta(key)?.icon || 'ri-map-pin-line';
}

/** Resolve the icon to use for an amenity: explicit override > subcategory > category. */
export function amenityIcon(a: Amenity): string {
  if (a.icon) return a.icon;
  return subcategoryIcon(a.subcategory) || categoryIcon(a.category);
}

/** The display label/badge text for an amenity. */
export function amenityLabel(a: Amenity): string {
  if (a.label) return a.label;
  return subcategoryLabel(a.subcategory) || categoryLabel(a.category);
}

export function amenityLabelStyle(a: Amenity, categoryColorHex: string): AmenityLabelStyle {
  const style = a.label_style || {};
  return {
    bg: style.bg || categoryColorHex,
    text: style.text || '#ffffff',
    border: style.border || 'transparent',
    icon: style.icon || subcategoryIcon(a.subcategory),
  };
}

/** Normalise an external URL, prepending https:// when a bare domain is given. */
export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// ─────────────────────────────────────────────────────────────
// Legacy compatibility helpers (kept so existing pages keep building)
// ─────────────────────────────────────────────────────────────
export const AMENITY_TYPE_LABELS: Record<string, string> = {
  school: 'School',
  hospital: 'Hospital',
  mall: 'Mall',
  coworking: 'Coworking',
  supermarket: 'Supermarket',
  restaurant: 'Restaurant',
  gym: 'Gym',
  park: 'Park',
};

export function amenityTypeLabel(type: string): string {
  return AMENITY_TYPE_LABELS[type] || type;
}

export const SCHOOL_CATEGORY_LABELS: Record<string, string> = {
  international_school: 'International',
  kindergarten: 'Montessori / Early Years',
  university: 'University',
  primary_school: 'Primary',
  secondary_school: 'Secondary',
  college: 'College',
  library: 'Library',
  vocational: 'Vocational',
  training_centre: 'Training Centre',
  // legacy keys kept for safety
  international: 'International',
  montessori: 'Montessori / Early Years',
  local: 'Local',
  primary: 'Primary',
  secondary: 'Secondary',
};

export function schoolCategoryLabel(category: string | null): string {
  if (!category) return '';
  return SCHOOL_CATEGORY_LABELS[category] || category;
}

export function getFeatures(a: Amenity): string[] {
  const f = a.attributes?.features;
  return Array.isArray(f) ? (f as string[]) : [];
}

export function getCurriculum(a: Amenity): string {
  return a.attributes?.curriculum || '';
}

export function getLevels(a: Amenity): string {
  const l = a.attributes?.levels;
  return typeof l === 'string' ? l : '';
}

export function getFeeRange(a: Amenity): string {
  return a.attributes?.fee_range || '';
}

// ─────────────────────────────────────────────────────────────
// Nearby counting (used by neighbourhood comparison engine)
// ─────────────────────────────────────────────────────────────
export interface AmenityCounts {
  total: number;
  schools: number;
  malls: number;
  hospitals: number;
  coworking: number;
  restaurants: number;
  supermarkets: number;
  gyms: number;
  parks: number;
}

const TYPE_TO_FIELD: Record<string, keyof Omit<AmenityCounts, 'total'>> = {
  school: 'schools',
  mall: 'malls',
  hospital: 'hospitals',
  coworking: 'coworking',
  restaurant: 'restaurants',
  supermarket: 'supermarkets',
  gym: 'gyms',
  park: 'parks',
};

export function countAmenitiesNearby(
  amenities: Amenity[],
  lat: number,
  lng: number,
  radiusMeters: number,
): AmenityCounts {
  const counts: AmenityCounts = {
    total: 0,
    schools: 0,
    malls: 0,
    hospitals: 0,
    coworking: 0,
    restaurants: 0,
    supermarkets: 0,
    gyms: 0,
    parks: 0,
  };
  amenities.forEach((a) => {
    if (a.latitude == null || a.longitude == null) return;
    if (haversineDistance(lat, lng, a.latitude, a.longitude) <= radiusMeters) {
      counts.total += 1;
      const field = TYPE_TO_FIELD[a.type];
      if (field) counts[field] += 1;
    }
  });
  return counts;
}

// ─────────────────────────────────────────────────────────────
// Category fallback images (shown only when an amenity has no image)
// ─────────────────────────────────────────────────────────────
// Generated category fallback images were removed. Directory entities (schools,
// businesses, amenities) must use real, human-approved photographs only - an
// entity without a verified photo shows a neutral placeholder, never auto-art.

/**
 * Directory entities must use real photographs - uploaded by a human or
 * imported from the entity's own official website. There is deliberately NO
 * generated or category-based fallback: a place without a verified photo shows
 * a neutral placeholder instead of a fictional picture.
 */

/** True for legacy auto-generated artwork that must never be shown as a real photo. */
export function isGeneratedImage(url?: string | null): boolean {
  return !!url && url.includes('readdy.ai');
}

/** Intentionally returns nothing: directory images are never auto-generated. */
export function amenityFallbackImage(_category?: string | null): string {
  return '';
}

/** The entity's real image, or '' when it has none (a placeholder is shown). */
export function amenityImage(a: Amenity): string {
  const img = a.image;
  if (!img || isGeneratedImage(img)) return '';
  return img;
}

/**
 * A place is "Archived" when its attributes carry the archived flag.
 * This is deliberately separate from `is_published`, so Archived stays a
 * distinct status rather than being mixed in with Draft / Unpublished.
 */
export function isArchived(a: Amenity): boolean {
  return a.attributes?.is_archived === true;
}

/**
 * Resolve the maps / directions link for an amenity.
 * Prefers the explicit `maps_url`; otherwise falls back to a Google Maps pin
 * at the amenity's area coordinates (no exact address required).
 */
export function amenityMapsUrl(a: Amenity): string | null {
  const explicit = normalizeUrl(a.maps_url);
  if (explicit) return explicit;
  if (a.latitude != null && a.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Category-level record (DB `amenity_categories`), the "Amenity"
// level of the category -> place/service hierarchy.
// ─────────────────────────────────────────────────────────────
export interface AmenityCategoryRecord {
  id: string;
  name: string;
  slug: string | null;
  color: string | null;
  icon: string | null;
  description: string | null;
  image: string | null;
  is_published: boolean;
  sort_order: number;
  /** Custom subcategories added by the user in the place edit form. */
  subcategories?: CustomSubcategory[] | null;
}

/** Resolve a category's accent colour: stored override > built-in. */
export function categoryRecordColor(r: AmenityCategoryRecord | null, slug?: string | null): string {
  if (r?.color) return r.color;
  return categoryColor(slug);
}

/** Resolve a category's image: its stored real image, else '' (no generated art). */
export function categoryRecordImage(r: AmenityCategoryRecord | null, _slug?: string | null): string {
  if (r?.image && !isGeneratedImage(r.image)) return r.image;
  return '';
}