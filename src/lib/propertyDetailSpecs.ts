/**
 * Maps the extended CRM property fields to display rows for the public
 * property detail page. Only fields that actually carry a value are returned,
 * so pages never render empty/placeholder rows.
 *
 * The CRM (admin listing form) is the single source of truth - this helper
 * keeps the frontend in parity with everything the CRM can capture without
 * maintaining a separate, reduced frontend schema.
 */

export interface DetailSpecRow {
  label: string;
  value: string;
}

type Row = Record<string, unknown>;

// Keys that already have a dedicated slot on the page (e.g. the Furnished row
// in the main grid) and must not be repeated via custom fields.
const RESERVED_CUSTOM_KEYS = new Set([
  'furnished',
  'furnishing_status',
  'furnished_status',
  'title_type',
  'land_type',
]);

function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v).trim();
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function titleCaseKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(v: unknown): string {
  const s = toStr(v);
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function buildPropertySpecs(
  row: Row,
  opts: { currency?: string; isLand?: boolean } = {},
): DetailSpecRow[] {
  const currency = (opts.currency || '').toUpperCase();
  const specs: DetailSpecRow[] = [];

  const push = (label: string, value: string) => {
    const v = (value || '').trim();
    if (v) specs.push({ label, value: v });
  };

  // Property condition - the headline parity field.
  push('Property Condition', toStr(row.condition));

  const rooms = toNum(row.rooms);
  if (rooms && rooms > 0) push('Total Rooms', String(rooms));

  const floors = toNum(row.floors);
  if (floors && floors > 0) push('Floors', String(floors));

  push('Floor Number', toStr(row.floor_number));

  const yearBuilt = toNum(row.year_built);
  if (yearBuilt) push('Year Built', String(yearBuilt));

  push('Renovated', toStr(row.renovated_year));

  const garages = toNum(row.garages);
  if (garages && garages > 0) push('Garages', String(garages));
  push('Garage Size', toStr(row.garage_size));

  const serviceCharge = toNum(row.service_charge);
  if (serviceCharge && serviceCharge > 0) {
    push('Service Charge', `${currency ? `${currency} ` : ''}${serviceCharge.toLocaleString()}`);
  }

  push('Availability', toStr(row.availability_status));
  push('Available From', formatDate(row.available_date));

  push('Land Title', toStr(row.land_title));
  push('Land Type', toStr(row.land_type));
  push('Plot Dimensions', toStr(row.plot_dimensions));

  push('Road Access', toStr(row.road_access));
  push('Parking Type', toStr(row.parking_type));
  if (row.wheelchair_accessible === true) push('Wheelchair Accessible', 'Yes');

  push('Interior Finish', toStr(row.interior_finish));
  push('Flooring', toStr(row.flooring_type));
  push('Ceiling Height', toStr(row.ceiling_height));
  push('Water Supply', toStr(row.water_supply));
  push('Construction', toStr(row.construction_type));
  push('Expected Completion', toStr(row.completion_date));

  push('Balcony Size', toStr(row.balcony_size));
  push('Terrace Size', toStr(row.terrace_size));

  const staffRooms = toNum(row.staff_quarters_rooms);
  if (staffRooms && staffRooms > 0) {
    push('Staff Quarters', `${staffRooms} room${staffRooms === 1 ? '' : 's'}`);
  }

  push('Unique Features', toStr(row.unique_features));
  push('Nearby', toStr(row.proximity_amenities));

  // Custom fields added in the CRM (key/value pairs) - surfaced verbatim.
  const cf = row.custom_fields;
  if (Array.isArray(cf)) {
    cf.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const key = toStr((entry as Row).key);
      const value = toStr((entry as Row).value);
      if (key && value && !RESERVED_CUSTOM_KEYS.has(key.toLowerCase())) {
        push(titleCaseKey(key), value);
      }
    });
  } else if (cf && typeof cf === 'object') {
    Object.entries(cf as Row).forEach(([k, v]) => {
      if (!k || RESERVED_CUSTOM_KEYS.has(k.toLowerCase())) return;
      push(titleCaseKey(k), toStr(v));
    });
  }

  return specs;
}