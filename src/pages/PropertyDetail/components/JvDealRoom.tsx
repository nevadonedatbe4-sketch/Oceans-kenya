/**
 * JvDealRoom - the "Request this Joint Venture" deal-room block.
 *
 * A Joint Venture is not a normal listing: you don't buy it, you join it. This
 * block sits on a JV property page and lets a visitor send a structured offer /
 * contribution straight to the JV desk - with the listing's own deal details
 * pre-matched (deal type, structure, land size, capital ask, land value, …) so
 * the desk receives a properly referenced request instead of a blank message.
 *
 * It only ever renders public deal facts (never internal CRM notes).
 */

import { FormEvent, useState } from 'react';
import { useLeadSubmit } from '@/hooks/useFormSubmit';
import { FIELD_CLASS } from '@/lib/formFieldStyles';
import {
  DEAL_TYPE_LABELS,
  DEAL_STRUCTURE_LABELS,
  PROJECT_TYPE_LABELS,
  CONTRIBUTION_TYPE_OPTIONS,
  TIMELINE_OPTIONS,
  CURRENCY_OPTIONS,
  formatMoney,
} from '@/pages/crm/jvOpportunityConstants';

interface JvDealRoomProps {
  listingId?: string;
  listingRef?: string;
  listingTitle?: string;
  landSize?: string;
  location?: string;
  jv?: Record<string, unknown> | null;
}

type Row = Record<string, unknown>;

function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function optLabel(map: Record<string, string>, value: string): string {
  if (!value) return '';
  return map[value] || value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function optLabelFromList(options: { value: string; label: string }[], value: string): string {
  if (!value) return '';
  const found = options.find((o) => o.value === value && o.value !== '');
  return found ? found.label : value;
}

export default function JvDealRoom({
  listingId = '',
  listingRef = '',
  listingTitle = '',
  landSize = '',
  location = '',
  jv = null,
}: JvDealRoomProps) {
  const { status, error, submitToLeads } = useLeadSubmit();
  const [honeypotHit, setHoneypotHit] = useState(false);

  const row: Row = jv || {};

  const dealType = optLabel(DEAL_TYPE_LABELS, str(row.deal_type));
  const dealStructure = optLabel(DEAL_STRUCTURE_LABELS, str(row.deal_structure));
  const projectType = optLabel(PROJECT_TYPE_LABELS, str(row.project_type));
  const capitalText =
    str(row.capital_required)
    || formatMoney(num(row.capital_amount), str(row.deal_currency) || 'KES');
  const landValueText = formatMoney(num(row.land_value), str(row.land_value_currency) || 'KES');
  const expectedRoi = num(row.expected_roi);
  const revenueShare = num(row.revenue_share);
  const sizeText = str(row.land_size) || landSize;
  const locationText = [str(row.land_area) || str(row.land_location), str(row.land_county)]
    .filter(Boolean)
    .join(', ') || location;

  const snapshot: { label: string; value: string }[] = [
    { label: 'Reference', value: listingRef },
    { label: 'Land Size', value: sizeText },
    { label: 'Deal Type', value: dealType },
    { label: 'Structure', value: dealStructure },
    { label: 'Capital Required', value: capitalText },
    { label: 'Land Value', value: landValueText },
    { label: 'Expected ROI', value: expectedRoi ? `${expectedRoi}%` : '' },
    { label: 'Revenue Share', value: revenueShare ? `${revenueShare}%` : '' },
    { label: 'Project Type', value: projectType },
    { label: 'Location', value: locationText },
  ].filter((r) => r.value);

  const defaultCurrency = str(row.deal_currency) || 'KES';
  const success = status === 'success';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const hp = (formData.get('website_alt') as string || '').trim();
    if (hp) {
      setHoneypotHit(true);
      form.reset();
      return;
    }

    const fullName = (formData.get('full_name') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const phone = (formData.get('phone') as string || '').trim();
    const message = (formData.get('message') as string || '').trim();
    const offerAmount = (formData.get('offer_amount') as string || '').trim();
    const offerCurrency = (formData.get('offer_currency') as string || defaultCurrency).trim();
    const contributionRaw = (formData.get('contribution_type') as string || '').trim();
    const timelineRaw = (formData.get('timeline') as string || '').trim();

    const contributionLabel = optLabelFromList(CONTRIBUTION_TYPE_OPTIONS, contributionRaw);
    const timelineLabel = optLabelFromList(TIMELINE_OPTIONS, timelineRaw);
    const offerText = offerAmount ? `${offerCurrency} ${Number(offerAmount).toLocaleString()}` : '';

    const ok = await submitToLeads({
      full_name: fullName,
      email,
      phone: phone || undefined,
      submission_type: 'investor',
      message: message || undefined,
      land_location: locationText || undefined,
      land_size: sizeText || undefined,
      budget_range: offerText || undefined,
      preferred_location: locationText || undefined,
      preferred_use: projectType || undefined,
      timeline: timelineRaw || undefined,
      deal_ref: listingRef || undefined,
      offer_amount: offerText || undefined,
      offer_currency: offerCurrency || undefined,
      contribution_type: contributionLabel || undefined,
      project_type: projectType || undefined,
      listing_id: listingId || undefined,
      property_title: listingTitle || undefined,
    });

    if (ok) form.reset();
  };

  const showSuccess = success || honeypotHit;

  return (
    <div id="jv-deal-room" className="border-2 border-primary overflow-hidden">
      {/* Deal-room header */}
      <div className="bg-primary px-6 md:px-8 py-5 md:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-golden text-[11px] tracking-[0.25em] uppercase font-roboto font-bold mb-1">
              JV Deal Room
            </p>
            <h2 className="font-roboto font-bold text-white text-xl md:text-2xl leading-tight">
              Request this Joint Venture
            </h2>
            <p className="text-white/60 font-roboto text-xs md:text-sm mt-1.5 max-w-xl leading-relaxed">
              Send a structured offer to the desk. Add your terms and a partner manager responds within 48 hours.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Pre-matched deal snapshot */}
        <div className="lg:col-span-2 bg-stone-50 border-b-2 lg:border-b-0 lg:border-r-2 border-primary/10 p-6 md:p-7">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-4 h-4 flex items-center justify-center text-teal">
              <i className="ri-list-check-2"></i>
            </span>
            <h3 className="font-roboto font-bold text-primary text-sm uppercase tracking-widest">
              Matched Deal Facts
            </h3>
          </div>
          {snapshot.length > 0 ? (
            <div className="space-y-2.5">
              {snapshot.map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-3 border-b border-primary/10 pb-2.5 last:border-0">
                  <span className="font-roboto text-xs text-primary/60 uppercase tracking-wider">{item.label}</span>
                  <span className="font-roboto text-sm font-bold text-primary text-right">{item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-roboto text-sm text-primary/60 leading-relaxed">
              This opportunity is being structured. Submit your interest and the desk will share
              the full deal pack.
            </p>
          )}
        </div>

        {/* Offer form */}
        <div className="lg:col-span-3 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="website_alt"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              readOnly
              className="hp-wrap"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">
                  Your offer / contribution amount
                </label>
                <input
                  type="number"
                  name="offer_amount"
                  min="0"
                  inputMode="numeric"
                  placeholder="e.g. 45000000"
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">
                  Currency
                </label>
                <select
                  name="offer_currency"
                  defaultValue={defaultCurrency}
                  className={`${FIELD_CLASS} cursor-pointer bg-white`}
                >
                  {CURRENCY_OPTIONS.filter((c) => c.value).map((c) => (
                    <option key={c.value} value={c.value}>{c.value}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">
                  Contribution type
                </label>
                <select
                  name="contribution_type"
                  defaultValue=""
                  className={`${FIELD_CLASS} cursor-pointer bg-white`}
                >
                  {CONTRIBUTION_TYPE_OPTIONS.map((o) => (
                    <option key={o.value || 'none'} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">
                  Target timeline
                </label>
                <select
                  name="timeline"
                  defaultValue=""
                  className={`${FIELD_CLASS} cursor-pointer bg-white`}
                >
                  {TIMELINE_OPTIONS.map((o) => (
                    <option key={o.value || 'none'} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">
                  Full name
                </label>
                <input
                  required
                  name="full_name"
                  placeholder="e.g. David Okello"
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">
                  Phone / WhatsApp
                </label>
                <input
                  required
                  type="tel"
                  name="phone"
                  placeholder="+254 7XX XXX XXX"
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">
                  Email
                </label>
                <input
                  required
                  type="email"
                  name="email"
                  placeholder="you@email.com"
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            <div>
              <label className="block text-primary font-roboto text-sm font-semibold mb-1.5">
                Terms, structure preference &amp; any conditions
              </label>
              <textarea
                name="message"
                rows={3}
                maxLength={500}
                placeholder="Preferred JV structure, exit expectation, conditions, or anything the desk should know..."
                className={`${FIELD_CLASS} resize-none`}
              ></textarea>
              <p className="text-right text-xs text-primary/50 font-roboto mt-1">Max 500 characters</p>
            </div>

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-golden text-white text-sm tracking-widest uppercase font-bold cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity disabled:opacity-60"
            >
              <i className="ri-send-plane-line"></i>
              {status === 'submitting' ? 'Sending request...' : 'Submit JV request'}
            </button>

            {showSuccess && (
              <div className="p-4 bg-green-50 border border-green-100">
                <p className="text-green-700 font-roboto text-sm flex items-center gap-2">
                  <i className="ri-check-line"></i>
                  Request logged in the JV deal room. A partner manager will contact you within 48 hours.
                </p>
              </div>
            )}
            {status === 'error' && (
              <div className="p-4 bg-red-50 border border-red-100">
                <p className="text-red-600 font-roboto text-sm">
                  {error || 'Submission failed. Please try again.'}
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}