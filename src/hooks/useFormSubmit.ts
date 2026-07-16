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

export function useFormSubmit() {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [error, setError] = useState('');

  const submitToContacts = useCallback(async (data: SubmitToContactsOptions): Promise<boolean> => {
    setStatus('submitting');
    setError('');

    try {
      const { error: dbError } = await supabase.from('contacts').insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        type: data.type,
        notes: data.notes || null,
        tags: data.tags || [],
      });

      if (dbError) {
        setError(dbError.message || 'Submission failed. Please try again.');
        setStatus('error');
        return false;
      }

      setStatus('success');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
      setStatus('error');
      return false;
    }
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

export function useLeadSubmit() {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [error, setError] = useState('');

  const submitToLeads = useCallback(async (data: SubmitToLeadsOptions): Promise<boolean> => {
    setStatus('submitting');
    setError('');

    try {
      const { error: dbError } = await supabase.from('leads').insert({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        submission_type: data.submission_type,
        message: data.message || null,
        land_location: data.land_location || null,
        land_size: data.land_size || null,
        title_status: data.title_status || null,
        preferred_structure: data.preferred_structure || null,
        budget_range: data.budget_range || null,
        preferred_location: data.preferred_location || null,
        preferred_use: data.preferred_use || null,
        timeline: data.timeline || null,
        status: 'new',
      });

      if (dbError) {
        setError(dbError.message || 'Submission failed. Please try again.');
        setStatus('error');
        return false;
      }

      setStatus('success');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
      setStatus('error');
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError('');
  }, []);

  return { status, error, submitToLeads, reset };
}