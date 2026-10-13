/**
 * clientMatching.spec — standalone automated test for the Client Request →
 * Property Matching engine. Not bundled into the app; run with:
 *
 *    npx tsx src/lib/clientMatching.spec.ts
 *
 * Covers the acceptance matrix: transaction/category gating, hard budget,
 * alternative locations, alternative-not-allowed exclusion, hard bedrooms,
 * unpublished / withdrawn exclusion, cross-currency conversion, and score range.
 */

import { scoreCandidate, type CandidateProperty, type MatchRequestInput } from './clientMatching';

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

const prop = (over: Partial<CandidateProperty>): CandidateProperty => ({
  id: 'p1', source: 'listings', slug: 'p1', title: 'Test', purpose: 'rent', category: 'residential',
  propertyType: 'apartment', subType: null, price: 80000, currency: 'KES', bedrooms: 2, bathrooms: 2,
  sizeSqm: 100, landSize: null, neighbourhood: 'Karen', location: null, address: null, furnished: 'Furnished',
  amenities: ['Parking', 'Swimming Pool'], image: null, status: 'available', isPublished: true, agentId: null,
  ...over,
});

const req = (over: Partial<MatchRequestInput>): MatchRequestInput => ({
  transaction_type: 'rent', property_category: 'residential', property_subtype: null,
  locations: ['Karen'], allow_alternatives: true, budget_min: null, budget_max: 100000, currency: 'KES',
  bedrooms_min: 2, bathrooms_min: null, size_min: null, furnishing: null, preferred_amenities: null,
  hard_criteria: ['transaction', 'category', 'availability'], ...over,
});

// T1 — a 2-bed rental apartment qualifies; a house for sale does NOT.
check('T1 eligible rental apartment', scoreCandidate(req({}), prop({})).eligible, true);
check('T1 house for sale excluded', scoreCandidate(req({}), prop({ purpose: 'sale', propertyType: 'house' })).eligible, false);

// T2 — over a HARD maximum budget is excluded.
const overBudget = scoreCandidate(
  req({ hard_criteria: ['transaction', 'category', 'availability', 'budget'] }),
  prop({ price: 200000 }),
);
check('T2 over hard budget excluded', overBudget.eligible, false);

// T2b — over budget when NOT a hard gate stays eligible but scores lower.
const softBudget = scoreCandidate(req({}), prop({ price: 250000 }));
check('T2b over soft budget still eligible', softBudget.eligible, true);
check('T2b over soft budget unmet mentions budget', softBudget.unmet.some((u) => /budget/i.test(u)), true);

// T3 — an approved alternative neighbourhood matches, labelled as an alternative.
const alt = scoreCandidate(req({}), prop({ neighbourhood: 'Runda' }));
check('T3 alternative location eligible', alt.eligible, true);
check('T3 alternative labelled alternative', alt.label, 'alternative');

// T4 — when location is a HARD requirement, a different area is excluded.
const hardLoc = scoreCandidate(
  req({ hard_criteria: ['transaction', 'category', 'availability', 'location'] }),
  prop({ neighbourhood: 'Lavington' }),
);
check('T4 outside hard location excluded', hardLoc.eligible, false);

// T4b — alternatives not allowed → not a location match (scores, not excluded unless hard).
const noAlt = scoreCandidate(req({ allow_alternatives: false }), prop({ neighbourhood: 'Lavington' }));
check('T4b alternatives off → not exact location', noAlt.label, 'alternative');

// T5 — failing a HARD bedroom requirement cannot rank as a strong match.
const hardBeds = scoreCandidate(
  req({ bedrooms_min: 3, hard_criteria: ['transaction', 'category', 'availability', 'bedrooms'] }),
  prop({ bedrooms: 2 }),
);
check('T5 hard bedrooms fail excluded', hardBeds.eligible, false);

// T6 — unpublished and withdrawn listings are never eligible.
check('T6 unpublished excluded', scoreCandidate(req({}), prop({ isPublished: false })).eligible, false);
check('T6 sold/withdrawn excluded', scoreCandidate(req({}), prop({ status: 'sold' })).eligible, false);

// T7 — a listing in another currency is CONVERTED into the request's currency
// so budgets are always compared on one uniform scale (never skipped).
const fx = scoreCandidate(req({ currency: 'KES' }), prop({ currency: 'USD', price: 5000 }));
check('T7 fx listing eligible', fx.eligible, true);
check('T7 fx budget not left unverified', fx.missingInfo.some((m) => /budget/i.test(m)), false);
check('T7 fx budget evaluated after conversion', fx.unmet.some((u) => /budget|price/i.test(u)), true);
// T7b — a USD listing converted inside a KES budget is SATISFIED, not skipped.
const fxIn = scoreCandidate(req({ currency: 'KES', budget_max: 100000 }), prop({ currency: 'USD', price: 500 }));
check('T7b converted within budget satisfied', fxIn.satisfied.some((s) => /within budget/i.test(s)), true);

// T8 — a fully-satisfying match scores 0..100 and matches the request's criteria.
const perfect = scoreCandidate(
  req({ furnishing: 'furnished', preferred_amenities: ['Parking'], currency: 'KES' }),
  prop({}),
);
check('T8 score in range', perfect.score >= 0 && perfect.score <= 100, true);
check('T8 meets amenities', perfect.satisfied.some((s) => /Parking/i.test(s)), true);

// T9 — the listing's REAL type (propertyType) governs the subtype gate, even
// when the near-empty `subType` column is null (the apartment-as-house bug).
const typeHard = ['transaction', 'category', 'availability', 'subtype'];
check(
  'T9 house request excludes apartment (subType null)',
  scoreCandidate(req({ property_subtype: 'house', hard_criteria: typeHard }), prop({ propertyType: 'apartment', subType: null })).eligible,
  false,
);
check(
  'T9 house request accepts house (subType null)',
  scoreCandidate(req({ property_subtype: 'house', hard_criteria: typeHard }), prop({ propertyType: 'house', subType: null })).eligible,
  true,
);
// T9b — when type is only a preference, a mismatched type still scores lower.
const softType = scoreCandidate(req({ property_subtype: 'house', hard_criteria: ['transaction', 'category', 'availability'] }), prop({ propertyType: 'apartment' }));
check('T9b soft type mismatch still eligible', softType.eligible, true);
check('T9b soft type mismatch unmet mentions type', softType.unmet.some((u) => /type/i.test(u)), true);
check('T9b soft type mismatch scores below a perfect match', softType.score < 100, true);

// T10 — a listing with no recorded type is flagged, never silently passed.
const noType = scoreCandidate(req({ property_subtype: 'house' }), prop({ propertyType: null, subType: null }));
check('T10 missing type flagged as unverified', noType.missingInfo.some((m) => /type/i.test(m)), true);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) console.error('Some matching-engine tests FAILED.');