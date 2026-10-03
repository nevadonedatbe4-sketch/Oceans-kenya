import type { Development } from '@/lib/developmentModel';

/**
 * developmentInfo - derives the PROJECT-LEVEL information blocks shown on the
 * development page (Key information, Ownership, Finance, Costs, Utilities).
 *
 * Everything comes from the real CRM record that backs the project (the
 * representative listing row + its `custom_fields`). Nothing is invented: a
 * field only appears when it actually carries a value, and the handful of core
 * ownership fields the spec calls out fall back to the honest label
 * "Ask agent" instead of a fabricated figure.
 */

export interface InfoRow {
  label: string;
  value: string;
}

export interface OwnershipInfo {
  /** Ownership structures the project genuinely supports. */
  schemes: string[];
  /** Scheme-specific rows (e.g. Rent to Own terms). */
  rows: InfoRow[];
}

export interface DevelopmentInfo {
  keyInformation: InfoRow[];
  ownership: OwnershipInfo;
  finance: InfoRow[];
  costs: InfoRow[];
  utilities: InfoRow[];
}

const ASK_AGENT = 'Ask agent';

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

/** Normalise the CRM custom_fields payload (array of {key,value} OR object). */
export function parseCustomFields(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  if (Array.isArray(raw)) {
    raw.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const k = toStr((entry as Record<string, unknown>).key);
      const v = toStr((entry as Record<string, unknown>).value);
      if (k && v) out[k] = v;
    });
    return out;
  }
  if (typeof raw === 'object') {
    Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => {
      const val = toStr(v);
      if (k && val) out[k] = val;
    });
  }
  return out;
}

const UTILITY_LABELS: Record<string, string> = {
  electricity: 'Electricity',
  water: 'Water',
  internet: 'Broadband',
  broadband: 'Broadband',
  sewer: 'Sewerage',
  sewerage: 'Sewerage',
  drainage: 'Sewerage',
  gas: 'Gas',
  solar: 'Solar',
  heating: 'Heating',
  cableTv: 'Cable TV',
};

function parseUtilityBoxes(raw: unknown): string[] {
  const out: string[] = [];
  let obj: Record<string, unknown> = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    obj = raw as Record<string, unknown>;
  } else if (typeof raw === 'string' && raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') obj = parsed as Record<string, unknown>;
    } catch {
      // ignore malformed payload
    }
  }
  Object.entries(obj).forEach(([k, v]) => {
    const truthy = v === true || v === 'true' || v === 1 || v === '1';
    if (truthy) out.push(UTILITY_LABELS[k] || titleCaseKey(k));
  });
  return out;
}

/** First custom field whose key contains every given fragment. */
function findField(
  cf: Record<string, string>,
  fragments: string[],
  exclude: string[] = [],
): { key: string; value: string } | null {
  const want = fragments.map((f) => f.toLowerCase());
  const avoid = exclude.map((f) => f.toLowerCase());
  for (const [k, v] of Object.entries(cf)) {
    const kl = k.toLowerCase();
    if (want.every((f) => kl.includes(f)) && !avoid.some((f) => kl.includes(f))) {
      return { key: k, value: v };
    }
  }
  return null;
}

/** Keys that already have a dedicated home elsewhere, so we never double them. */
const HANDLED_KEYS = new Set(['title_type', 'tenure', 'furnished', 'furnishing_status', 'furnished_status']);

export interface BuildInfoOptions {
  /** Formatted "From ..." price line for the project. */
  priceLabel: string;
  currency: string;
}

export function buildDevelopmentInfo(dev: Development, opts: BuildInfoOptions): DevelopmentInfo {
  const row = dev.primaryRow;
  const cf = parseCustomFields(row.custom_fields);
  const p =
    dev.projectInfo ||
    ({
      tenure: '', serviceCharge: '', councilTaxBand: '', groundRent: '', groundRentReview: '',
      leaseLength: '', water: '', electricity: '', heating: '', sewerage: '', broadband: '',
      broadbandSpeed: '', mobileCoverage: '', parking: '',
    } as typeof dev.projectInfo);
  const { priceLabel, currency } = opts;
  const used = new Set<string>();

  const money = (n: number): string => `${currency} ${n.toLocaleString()}`;

  // ── Key information ──
  const keyInformation: InfoRow[] = [];
  const pushKey = (label: string, value: string, askFallback = false) => {
    const v = (value || '').trim();
    if (v) keyInformation.push({ label, value: v });
    else if (askFallback) keyInformation.push({ label, value: ASK_AGENT });
  };

  // Prefer the project record's own key-info fields (CRM DB); fall back to the
  // representative unit's columns/custom fields only when the project is blank.
  const tenure = p.tenure || cf.title_type || cf.tenure || toStr(row.land_title);
  pushKey('Tenure', tenure, true);

  const serviceCharge = p.serviceCharge ? toNum(p.serviceCharge) : toNum(row.service_charge);
  pushKey('Service charge', serviceCharge && serviceCharge > 0 ? `${money(serviceCharge)} per year` : '', true);

  const council = findField(cf, ['council']);
  if (council) used.add(council.key);
  const councilValue = p.councilTaxBand || (council ? council.value : '');
  pushKey('Council tax band', councilValue, true);

  const groundRent = findField(cf, ['ground rent'], ['review']);
  if (groundRent) used.add(groundRent.key);
  const groundRentReview = findField(cf, ['rent review']);
  if (groundRentReview) used.add(groundRentReview.key);
  const groundRentValue = p.groundRent || (groundRent ? groundRent.value : '');
  const groundRentReviewValue = p.groundRentReview || (groundRentReview ? groundRentReview.value : '');
  pushKey('Ground rent', groundRentValue, true);
  pushKey('Ground rent review', groundRentReviewValue, true);

  const leaseLength = p.leaseLength || toStr(row.lease_period) || (findField(cf, ['lease length'])?.value ?? '') || (findField(cf, ['lease term'])?.value ?? '');
  const leaseLenField = findField(cf, ['lease length']) || findField(cf, ['lease term']) || findField(cf, ['remaining lease']);
  if (leaseLenField) used.add(leaseLenField.key);
  pushKey('Lease length', leaseLength, true);
  if (row.lease_expiry_date) pushKey('Lease expiry', formatDate(row.lease_expiry_date));

  const reservation = findField(cf, ['reservation']);
  if (reservation) used.add(reservation.key);
  pushKey('Reservation fee', reservation ? reservation.value : '');

  const sharedOwnership = findField(cf, ['shared ownership']);
  if (sharedOwnership) used.add(sharedOwnership.key);
  pushKey('Shared ownership', sharedOwnership ? sharedOwnership.value : '');

  if (dev.paymentPlan.depositPercent != null && dev.paymentPlan.depositPercent > 0) {
    pushKey('Deposit', `${dev.paymentPlan.depositPercent}%`);
  }
  if (dev.completionDate) pushKey('Completion', formatDate(dev.completionDate));

  const warranty = findField(cf, ['warranty']);
  if (warranty) used.add(warranty.key);
  pushKey('Build warranty', warranty ? warranty.value : '');

  const management = findField(cf, ['management company']);
  if (management) used.add(management.key);
  pushKey('Management company', management ? management.value : '');

  const estateCharge = findField(cf, ['estate charge', 'estate management']);
  if (estateCharge) used.add(estateCharge.key);
  pushKey('Estate management charge', estateCharge ? estateCharge.value : '');

  // ── Ownership & purchase options ──
  const schemes: string[] = [];
  const tenureLower = tenure.toLowerCase();
  if (tenureLower.includes('share of freehold')) schemes.push('Share of Freehold');
  else if (tenureLower.includes('freehold')) schemes.push('Freehold');
  if (tenureLower.includes('leasehold')) schemes.push('Leasehold');
  if (tenureLower.includes('shared ownership') || cf.shared_ownership) {
    if (!schemes.includes('Shared Ownership')) schemes.push('Shared Ownership');
  }

  const rto =
    findField(cf, ['rent to own']) ||
    findField(cf, ['rent-to-own']) ||
    findField(cf, ['rent to buy']) ||
    findField(cf, ['rent-to-buy']);
  if (rto && !schemes.includes('Rent to Own')) schemes.push('Rent to Own');

  const ownershipRows: InfoRow[] = [];
  const pushOwnership = (label: string, value: string) => {
    const v = (value || '').trim();
    if (v) ownershipRows.push({ label, value: v });
  };
  const eligible = findField(cf, ['eligib']);
  if (eligible) { pushOwnership('Eligibility', eligible.value); used.add(eligible.key); }
  const initialPayment = findField(cf, ['initial payment']) || findField(cf, ['initial deposit']);
  if (initialPayment) { pushOwnership('Initial payment', initialPayment.value); used.add(initialPayment.key); }
  const monthly = findField(cf, ['monthly']);
  if (monthly) { pushOwnership('Monthly payment', monthly.value); used.add(monthly.key); }
  const rentPeriod = findField(cf, ['rental period']) || findField(cf, ['rent period']);
  if (rentPeriod) { pushOwnership('Rental period', rentPeriod.value); used.add(rentPeriod.key); }
  const purchaseWindow = findField(cf, ['purchase window']) || findField(cf, ['purchase period']);
  if (purchaseWindow) { pushOwnership('Purchase window', purchaseWindow.value); used.add(purchaseWindow.key); }
  const conditions = findField(cf, ['condition', 'restriction']);
  if (conditions) { pushOwnership('Conditions', conditions.value); used.add(conditions.key); }

  // ── Finance & how to buy ──
  const finance: InfoRow[] = [];
  const pushFinance = (label: string, value: string) => {
    const v = (value || '').trim();
    if (v) finance.push({ label, value: v });
  };
  if (dev.paymentPlan.depositPercent != null && dev.paymentPlan.depositPercent > 0) {
    pushFinance('Deposit', `${dev.paymentPlan.depositPercent}%`);
  }
  if (dev.paymentPlan.installments) pushFinance('Payment plan', dev.paymentPlan.installments);
  if (reservation) pushFinance('Reservation fee', reservation.value);
  const mortgage = findField(cf, ['mortgage']);
  if (mortgage) { pushFinance('Mortgage', mortgage.value); used.add(mortgage.key); }
  const firstTime = findField(cf, ['first time', 'first-time']);
  if (firstTime) { pushFinance('First-time buyer', firstTime.value); used.add(firstTime.key); }
  const incentive = findField(cf, ['incentive']);
  if (incentive) { pushFinance('Developer incentive', incentive.value); used.add(incentive.key); }
  const scheme = findField(cf, ['government scheme', 'help to buy']);
  if (scheme) { pushFinance('Government scheme', scheme.value); used.add(scheme.key); }
  const milestones = findField(cf, ['milestone']);
  if (milestones) { pushFinance('Payment milestones', milestones.value); used.add(milestones.key); }

  // ── Costs to consider ──
  const costs: InfoRow[] = [];
  if (priceLabel) costs.push({ label: 'Purchase price', value: priceLabel });
  if (dev.paymentPlan.depositPercent != null && dev.paymentPlan.depositPercent > 0) {
    costs.push({ label: 'Deposit', value: `${dev.paymentPlan.depositPercent}%` });
  } else {
    costs.push({ label: 'Deposit', value: ASK_AGENT });
  }
  if (serviceCharge && serviceCharge > 0) costs.push({ label: 'Service charge', value: `${money(serviceCharge)} / year` });
  else costs.push({ label: 'Service charge', value: ASK_AGENT });
  if (groundRentValue) costs.push({ label: 'Ground rent', value: groundRentValue });
  else costs.push({ label: 'Ground rent', value: ASK_AGENT });
  if (councilValue) costs.push({ label: 'Council tax', value: councilValue });
  else costs.push({ label: 'Council tax', value: ASK_AGENT });
  if (reservation) costs.push({ label: 'Reservation fee', value: reservation.value });

  // ── Utilities & more details ──
  // Collect the real utility values first (keyed by canonical label), then emit
  // the standard utility rows the spec calls for - showing the honest "Ask
  // agent" fallback whenever a value is genuinely unknown - followed by any
  // other live values the project record carries.
  const utilValues = new Map<string, string>();
  const setUtil = (label: string, value: string) => {
    const v = (value || '').trim();
    if (!v || utilValues.has(label)) return;
    utilValues.set(label, v);
  };

  // 0. Project-record utilities (CRM DB) take priority over unit-level hints.
  setUtil('Water', p.water);
  setUtil('Electricity', p.electricity);
  setUtil('Heating', p.heating);
  setUtil('Sewerage', p.sewerage);
  setUtil('Broadband', p.broadband);
  setUtil('Broadband speed', p.broadbandSpeed);
  setUtil('Mobile coverage', p.mobileCoverage);
  setUtil('Parking', p.parking);

  // 1. Utility checkbox payload (e.g. { electricity: true, water: true })
  parseUtilityBoxes(row.utility_checkboxes).forEach((u) => setUtil(u, 'Available'));

  // 2. Dedicated listing columns
  if (row.water_supply) setUtil('Water', toStr(row.water_supply));
  if (row.construction_type) setUtil('Construction', toStr(row.construction_type));
  if (row.interior_finish) setUtil('Interior finish', toStr(row.interior_finish));
  if (row.flooring_type) setUtil('Flooring', toStr(row.flooring_type));
  if (row.condition) setUtil('Condition', toStr(row.condition));
  if (row.gated_community === true) setUtil('Gated community', 'Yes');
  if (row.backup_power === true) setUtil('Back-up power', 'Yes');
  if (row.swimming_pool === true) setUtil('Swimming pool', 'Yes');
  if (row.gym === true) setUtil('Gym', 'Yes');

  // 3. Custom fields (heating, broadband, speed, mobile, sewerage, parking…)
  const heating = findField(cf, ['heating']);
  if (heating) { setUtil('Heating', heating.value); used.add(heating.key); }
  const broadbandSpeed = findField(cf, ['broadband speed', 'download speed', 'internet speed', 'speed']);
  if (broadbandSpeed) { setUtil('Broadband speed', broadbandSpeed.value); used.add(broadbandSpeed.key); }
  const broadband = findField(cf, ['broadband', 'fibre', 'fiber', 'internet'], ['speed']);
  if (broadband) { setUtil('Broadband', broadband.value); used.add(broadband.key); }
  const sewerage = findField(cf, ['sewer', 'drainage']);
  if (sewerage) { setUtil('Sewerage', sewerage.value); used.add(sewerage.key); }
  const water = findField(cf, ['water']);
  if (water) { setUtil('Water', water.value); used.add(water.key); }
  const electricity = findField(cf, ['electric']);
  if (electricity) { setUtil('Electricity', electricity.value); used.add(electricity.key); }
  const gas = findField(cf, ['gas']);
  if (gas) { setUtil('Gas', gas.value); used.add(gas.key); }
  const solar = findField(cf, ['solar']);
  if (solar) { setUtil('Solar', solar.value); used.add(solar.key); }
  const mobile = findField(cf, ['mobile']);
  if (mobile) { setUtil('Mobile coverage', mobile.value); used.add(mobile.key); }
  const parking = findField(cf, ['parking']);
  if (parking) { setUtil('Parking', parking.value); used.add(parking.key); }
  const epc = findField(cf, ['epc', 'energy']);
  if (epc) { setUtil('Energy / EPC', epc.value); used.add(epc.key); }
  const ev = findField(cf, ['ev charg', 'electric vehicle']);
  if (ev) { setUtil('EV charging', ev.value); used.add(ev.key); }

  // 4. Surface every remaining populated custom field so nothing important is
  //    hidden simply because there is no dedicated row for it.
  Object.entries(cf).forEach(([k, v]) => {
    if (used.has(k) || HANDLED_KEYS.has(k.toLowerCase())) return;
    setUtil(titleCaseKey(k), v);
  });

  // Standard utility rows shown on every development (real value or "Ask agent").
  const STANDARD_UTILITY_LABELS = [
    'Water',
    'Electricity',
    'Heating',
    'Sewerage',
    'Broadband',
    'Broadband speed',
    'Mobile coverage',
    'Parking',
  ];
  const utilities: InfoRow[] = STANDARD_UTILITY_LABELS.map((label) => ({
    label,
    value: utilValues.get(label) || ASK_AGENT,
  }));
  utilValues.forEach((value, label) => {
    if (!STANDARD_UTILITY_LABELS.includes(label)) utilities.push({ label, value });
  });

  return { keyInformation, ownership: { schemes, rows: ownershipRows }, finance, costs, utilities };
}