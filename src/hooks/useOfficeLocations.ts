import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Office locations + geofence radii for attendance.
 *
 * The punch-in pipeline (`og-checkin`) reads these to decide whether a punch
 * falls inside the allowed area:
 *   • per-user policy: og_attendance_policies.office_location_id / allowed_radius_m
 *   • fallback office:  og_office_locations where is_default = true
 *
 * A missing office or a 0 radius never flags a punch, so this hook is what
 * actually makes the geofence flag fire.
 */
export interface OfficeLocation {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_m: number | null;
  enabled: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OfficeLocationInput {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_m: number;
  enabled: boolean;
  is_default: boolean;
}

export interface MutateResult {
  ok: boolean;
  error?: string;
}

export interface OfficeLocationsState {
  offices: OfficeLocation[];
  loading: boolean;
  error: string | null;
  /** Org-wide remote work switch — when true the geofence never flags a punch. */
  remoteWork: boolean;
  /** True until the remote-work setting has been read. */
  remoteLoading: boolean;
  setRemoteWork: (allow: boolean) => Promise<MutateResult>;
  reload: () => Promise<void>;
  save: (input: OfficeLocationInput, id?: string) => Promise<MutateResult>;
  remove: (id: string) => Promise<MutateResult>;
  setDefault: (id: string) => Promise<MutateResult>;
}

function errText(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'object' && e && 'message' in e) return String((e as { message?: unknown }).message || fallback);
  return fallback;
}

export function useOfficeLocations(): OfficeLocationsState {
  const [offices, setOffices] = useState<OfficeLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remoteWork, setRemoteWorkState] = useState(true);
  const [remoteLoading, setRemoteLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('og_office_locations')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });
      if (err) throw err;
      setOffices((data || []) as OfficeLocation[]);
    } catch (e) {
      setError(errText(e, 'Could not load office locations.'));
    } finally {
      setLoading(false);
    }
    // Org-wide remote work switch. A missing row/table means remote is ON, so a
    // fresh project lets everyone punch in from anywhere by default.
    setRemoteLoading(true);
    try {
      const { data } = await supabase.from('og_attendance_settings').select('allow_remote').eq('id', 1).maybeSingle();
      setRemoteWorkState(data?.allow_remote ?? true);
    } catch {
      setRemoteWorkState(true);
    } finally {
      setRemoteLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const setRemoteWork = useCallback(async (allow: boolean): Promise<MutateResult> => {
    try {
      const { error: err } = await supabase
        .from('og_attendance_settings')
        .upsert({ id: 1, allow_remote: allow, updated_at: new Date().toISOString() });
      if (err) throw err;
      setRemoteWorkState(allow);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errText(e, 'Could not save the remote work setting.') };
    }
  }, []);

  const save = useCallback(async (input: OfficeLocationInput, id?: string): Promise<MutateResult> => {
    try {
      // Only ever one default office — clear the old one before promoting.
      if (input.is_default) {
        await supabase.from('og_office_locations').update({ is_default: false }).eq('is_default', true);
      }
      const { error: err } = id
        ? await supabase.from('og_office_locations').update(input).eq('id', id)
        : await supabase.from('og_office_locations').insert(input);
      if (err) throw err;
      await reload();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errText(e, 'Could not save the office location.') };
    }
  }, [reload]);

  const remove = useCallback(async (id: string): Promise<MutateResult> => {
    try {
      const { error: err } = await supabase.from('og_office_locations').delete().eq('id', id);
      if (err) throw err;
      await reload();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errText(e, 'Could not remove the office location.') };
    }
  }, [reload]);

  const setDefault = useCallback(async (id: string): Promise<MutateResult> => {
    try {
      await supabase.from('og_office_locations').update({ is_default: false }).eq('is_default', true);
      const { error: err } = await supabase.from('og_office_locations').update({ is_default: true }).eq('id', id);
      if (err) throw err;
      await reload();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errText(e, 'Could not set the default office.') };
    }
  }, [reload]);

  return { offices, loading, error, remoteWork, remoteLoading, setRemoteWork, reload, save, remove, setDefault };
}