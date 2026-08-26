import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

interface SubmitToContactsOptions {
  name: string;
  email: string;
  phone?: string;
  type: string;
  notes?: string;
  tags?: string[];
}

export interface EnquiryPayload {
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  message?: string;
  subject?: string;
  type?: string;
  tags?: string[];
  source?: string;
  form_name?: string;
  source_url?: string;
  listing_id?: string;
  property_title?: string;
  notes?: string;
}

/**
 * Central CRM ingestion entry point.
 * Routes every website form through the crm-ingest Edge Function, which creates
 * the contact + lead + enquiry + conversation + notification atomically.
 */
async function invokeIngest(body: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('crm-ingest', { body });
    if (error) {
      // supabase-js wraps non-2xx responses in a FunctionsHttpError whose
      // .message is a generic "Edge Function returned a non-2xx status code".
      // Try to read the actual JSON body so the user sees the real reason.
      let message = error.message;
      try {
        const ctx = (error as unknown as { context?: { json?: () => Promise<unknown>; text?: () => Promise<string> } }).context;
        if (ctx && typeof ctx.json === 'function') {
          const parsed = (await ctx.json()) as { error?: string; message?: string };
          if (parsed?.error) message = parsed.error;
          else if (parsed?.message) message = parsed.message;
        }
      } catch {
        // ignore extraction failures and fall back to the generic message
      }
      return { success: false, error: message };
    }
    if (!data || data.success !== true) {
      return { success: false, error: data?.error || 'Submission failed. Please try again.' };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error. Please try again.' };
  }
}

export function useFormSubmit() {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [error, setError] = useState('');

  const submitToContacts = useCallback(async (data: SubmitToContactsOptions): Promise<boolean> => {
    setStatus('submitting');
    setError('');
    const result = await invokeIngest({
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
      type: data.type,
      notes: data.notes || undefined,
      tags: data.tags,
      source: 'Contact Form',
      form_name: 'contact-form',
    });
    if (result.success) setStatus('success');
    else {
      setError(result.error || 'Submission failed. Please try again.');
      setStatus('error');
    }
    return result.success;
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError('');
  }, []);

  return { status, error, submitToContacts, reset };
}

interface SubmitToLeadsOptions {
  full_name: string;
  email: string;
  phone?: string;
  submission_type: string;
  message?: string;
  land_location?: string;
  land_size?: string;
  title_status?: string;
  preferred_structure?: string;
  budget_range?: string;
  preferred_location?: string;
  preferred_use?: string;
  timeline?: string;
}

function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

const FIELD_LABELS: Record<string, string> = {
  submission_type: 'Submission type',
  land_location: 'Land location',
  land_size: 'Land size',
  title_status: 'Title status',
  preferred_structure: 'Preferred structure',
  budget_range: 'Budget range',
  preferred_location: 'Preferred location',
  preferred_use: 'Preferred use',
  timeline: 'Timeline',
};

function composeMessage(data: SubmitToLeadsOptions): string {
  const lines: string[] = [];
  if (data.message && data.message.trim()) lines.push(data.message.trim());
  (Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>).forEach((k) => {
    const v = data[k as keyof SubmitToLeadsOptions];
    if (v && String(v).trim()) lines.push(`${FIELD_LABELS[k]}: ${String(v).trim()}`);
  });
  return lines.join('\n');
}

export function useLeadSubmit() {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [error, setError] = useState('');

  const submitToLeads = useCallback(async (data: SubmitToLeadsOptions): Promise<boolean> => {
    setStatus('submitting');
    setError('');
    const { first, last } = splitName(data.full_name || '');
    const message = composeMessage(data);
    const isInvestor = data.submission_type === 'investor';
    const result = await invokeIngest({
      first_name: first,
      last_name: last,
      email: data.email,
      phone: data.phone || undefined,
      message,
      type: isInvestor ? 'investor' : 'landlord',
      source: 'Joint Ventures',
      form_name: isInvestor ? 'jv-investor' : 'jv-landowner',
    });
    if (result.success) setStatus('success');
    else {
      setError(result.error || 'Submission failed. Please try again.');
      setStatus('error');
    }
    return result.success;
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError('');
  }, []);

  return { status, error, submitToLeads, reset };
}

export function useEnquirySubmit() {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [error, setError] = useState('');

  const submitEnquiry = useCallback(async (data: EnquiryPayload): Promise<boolean> => {
    setStatus('submitting');
    setError('');
    const result = await invokeIngest(data);
    if (result.success) setStatus('success');
    else {
      setError(result.error || 'Submission failed. Please try again.');
      setStatus('error');
    }
    return result.success;
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError('');
  }, []);

  return { status, error, submitEnquiry, reset };
}