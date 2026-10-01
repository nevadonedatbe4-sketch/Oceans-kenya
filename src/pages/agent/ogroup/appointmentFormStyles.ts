// Shared styling tokens for the appointment form + the pre-step type chooser.
// These mirror the global CRM form look (benchmark: New Developments / ListingEdit).
// Inputs + selects reuse `inputBase` / `selectClass` from the CRM ui module so
// the two stay visually identical.

export const FORM_LABEL = 'block text-[13px] font-bold tracking-wide text-[#0d1f2d] uppercase mb-2 leading-none';
export const FORM_CARD = 'rounded-xl border border-[#e8edf2] bg-white p-5';
export const FORM_HINT = 'text-[13px] text-[#7a8a99] mt-1.5 leading-relaxed';

/** Routing metadata for each appointment kind — shapes fields AND where it goes. */
export interface KindRouting {
  needs: string;
  route: string;
  hint: string;
}

export const KIND_ROUTING: Record<'viewing' | 'appraisal' | 'general', KindRouting> = {
  viewing: {
    needs: 'Property + applicant',
    route: 'Assigned agent’s calendar · company viewings',
    hint: 'Viewing — links a property and applicant, then routes to the assigned agent.',
  },
  appraisal: {
    needs: 'Property + owner / contact',
    route: 'Valuation desk · company calendar',
    hint: 'Market appraisal — links the property and its owner, then routes to the valuation desk.',
  },
  general: {
    needs: 'No property required',
    route: 'Your personal calendar',
    hint: 'General appointment — no property required; it stays on your personal calendar.',
  },
};