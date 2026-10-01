/**
 * propertySearch.spec — standalone automated test for the natural-language
 * search parser. Not bundled into the app; run with:
 *
 *    npx tsx src/lib/propertySearch.spec.ts
 *
 * Covers the OCEANS KENYA acceptance matrix (tests 1-10): transaction,
 * property type, exactly-one-location, multiple locations, compound clauses,
 * and zero-result protection (the parser never broadens a query).
 */

import {
  parseSearchClauses,
  buildClausesOr,
  type SearchClause,
} from './propertySearch';

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    console.error(`FAIL  ${name}\n      expected ${e}\n      got      ${a}`);
  }
}

// Pull the first clause and normalise it for comparison.
function first(raw: string): SearchClause | null {
  const clauses = parseSearchClauses(raw);
  return clauses.length ? clauses[0] : null;
}

// Test 1 — house for sale in Karen
const t1 = first('House for sale in Karen');
check('T1 simple: SALE + HOUSE + KAREN', {
  transaction: t1?.transaction,
  propertyTypes: t1?.propertyTypes,
  locations: t1?.locations,
}, { transaction: 'sale', propertyTypes: ['house'], locations: ['Karen'] });

// Test 2 — apartment to rent in Kilimani
const t2 = first('Apartment to rent in Kilimani');
check('T2 simple: RENT + APARTMENT + KILIMANI', {
  transaction: t2?.transaction,
  propertyTypes: t2?.propertyTypes,
  locations: t2?.locations,
}, { transaction: 'rent', propertyTypes: ['apartment'], locations: ['Kilimani'] });

// Test 3 — villa for sale in Runda
const t3 = first('Villa for sale in Runda');
check('T3 simple: SALE + VILLA + RUNDA', {
  transaction: t3?.transaction,
  propertyTypes: t3?.propertyTypes,
  locations: t3?.locations,
}, { transaction: 'sale', propertyTypes: ['villa'], locations: ['Runda'] });

// Test 4 — 4 bedroom house for sale in Karen
const t4 = first('4 bedroom house for sale in Karen');
check('T4 bedrooms: SALE + HOUSE + KAREN + BEDS>=4', {
  transaction: t4?.transaction,
  propertyTypes: t4?.propertyTypes,
  locations: t4?.locations,
  bedroomsMin: t4?.bedroomsMin,
}, { transaction: 'sale', propertyTypes: ['house'], locations: ['Karen'], bedroomsMin: 4 });

// Test 5 — office space to rent in Uphill (Uphill → Upper Hill via alias)
const t5 = first('Office space to rent in Uphill');
check('T5 office: RENT + OFFICE + UPPER HILL', {
  transaction: t5?.transaction,
  propertyTypes: t5?.propertyTypes,
  locations: t5?.locations,
}, { transaction: 'rent', propertyTypes: ['office'], locations: ['Upper Hill'] });

// Test 6 — house to buy in Karen, Runda or Lavington (multiple locations)
const t6 = first('House to buy in Karen, Runda or Lavington');
check('T6 multi-location: SALE + HOUSE + [KAREN,RUNDA,LAVINGTON]', {
  transaction: t6?.transaction,
  propertyTypes: t6?.propertyTypes,
  locations: t6?.locations,
}, { transaction: 'sale', propertyTypes: ['house'], locations: ['Karen', 'Runda', 'Lavington'] });

// Test 7 — villa for sale in Gigiri
const t7 = first('Villa for sale in Gigiri');
check('T7 villa: SALE + VILLA + GIGIRI', {
  transaction: t7?.transaction,
  propertyTypes: t7?.propertyTypes,
  locations: t7?.locations,
}, { transaction: 'sale', propertyTypes: ['villa'], locations: ['Gigiri'] });

// Test 8 — townhouse for sale in Muthaiga (town house not downgraded to house)
const t8 = first('Townhouse for sale in Muthaiga');
check('T8 townhouse: SALE + TOWNHOUSE + MUTHAIGA', {
  transaction: t8?.transaction,
  propertyTypes: t8?.propertyTypes,
  locations: t8?.locations,
}, { transaction: 'sale', propertyTypes: ['townhouse'], locations: ['Muthaiga'] });

// Test 9 — compound query → four clauses
const t9 = parseSearchClauses(
  'Looking for a house to buy in Karen, Runda, Lavington or a villa in Gigiri or a town house in Muthaiga or office space to rent in Uphill'
);
check('T9 compound: 4 clauses', t9.length, 4);
check('T9 clause 1', {
  transaction: t9[0]?.transaction,
  propertyTypes: t9[0]?.propertyTypes,
  locations: t9[0]?.locations,
}, { transaction: 'sale', propertyTypes: ['house'], locations: ['Karen', 'Runda', 'Lavington'] });
check('T9 clause 2', {
  transaction: t9[1]?.transaction,
  propertyTypes: t9[1]?.propertyTypes,
  locations: t9[1]?.locations,
}, { transaction: 'sale', propertyTypes: ['villa'], locations: ['Gigiri'] });
check('T9 clause 3', {
  transaction: t9[2]?.transaction,
  propertyTypes: t9[2]?.propertyTypes,
  locations: t9[2]?.locations,
}, { transaction: 'sale', propertyTypes: ['townhouse'], locations: ['Muthaiga'] });
check('T9 clause 4', {
  transaction: t9[3]?.transaction,
  propertyTypes: t9[3]?.propertyTypes,
  locations: t9[3]?.locations,
}, { transaction: 'rent', propertyTypes: ['office'], locations: ['Upper Hill'] });

// Test 9b — compound builder never collapses to "return everything"
const t9Or = buildClausesOr(t9);
check('T9 or() has 4 and-groups', (t9Or ?? '').split('and(').length - 1, 4);
check('T9 or() encodes mixed purpose', t9Or?.includes('purpose.eq.rent'), true);

// Test 10 — zero-result protection: deliberately impossible combination still
// narrows (the parser NEVER drops a clause), so the engine can only return 0.
const t10 = parseSearchClauses('4 bedroom boat for sale in Karen');
check('T10 impossible combo still narrows to a real clause', t10.length > 0, true);
check('T10 transaction preserved', t10[0]?.transaction, 'sale');

// Bonus — Nairobi city-level = whole city, not a literal area
const city = first('Houses for sale in Nairobi');
check('Nairobi city-level: SALE + city Nairobi', {
  transaction: city?.transaction,
  locationLevel: city?.locationLevel,
  city: city?.city,
}, { transaction: 'sale', locationLevel: 'city', city: 'Nairobi' });

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('Some search-parser tests FAILED.');
}