import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { applyPublicVisibility } from '@/lib/publicListings';
import { refreshAreaCentres } from '@/lib/areaGeo';

export type LocationAccuracy = 'exact' | 'area_approximate' | 'unverified';
export type VerificationStatus = 'verified' | 'pending' | 'needs_review';

export interface AdminArea {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  aliases: string[];
  latitude: number | null;
  longitude: number | null;
  location_accuracy: LocationAccuracy;
  verification_status: VerificationStatus;
  is_active: boolean;
  is_published: boolean;
  nearby_radius_km: number | null;
  updated_at: string | null;
  listings: number;
  landmarkCount: number;
  neighbourCount: number;
  primaryLandmarkName: string | null;
}

export interface AdminLandmark {
  id: string;
  neighbourhood_id: string;
  name: string;
  latitude: number;
  longitude: number;
  is_primary: boolean;
  source: string | null;
  verified: boolean;
}

export interface AdminNeighbourLink {
  id: string;
  neighbourhood_id: string;
  neighbour_neighbourhood_id: string;
  note: string | null;
  neighbourName: string;
}

const ACCURACY_VALUES: LocationAccuracy[] = ['exact', 'area_approximate', 'unverified'];
const VERIFICATION_VALUES: VerificationStatus[] = ['verified', 'pending', 'needs_review'];

function coerceAccuracy(v: unknown): LocationAccuracy {
  return ACCURACY_VALUES.includes(v as LocationAccuracy) ? (v as LocationAccuracy) : 'area_approximate';
}
function coerceVerification(v: unknown): VerificationStatus {
  return VERIFICATION_VALUES.includes(v as VerificationStatus) ? (v as VerificationStatus) : 'needs_review';
}

export function useAreaGeoAdmin() {
  const [areas, setAreas] = useState<AdminArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoaded, setLastLoaded] = useState<number>(0);
  const abortRef = useRef(false);

  const fetchAreas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [areasRes, landmarksRes, neighboursRes] = await Promise.all([
        supabase
          .from('neighbourhoods')
          .select('id, name, slug, city, country, aliases, latitude, longitude, location_accuracy, verification_status, is_active, is_published, nearby_radius_km, updated_at')
          .order('name', { ascending: true }),
        supabase.from('area_landmarks').select('neighbourhood_id, name, latitude, longitude, is_primary'),
        supabase.from('area_neighbours').select('neighbourhood_id'),
      ]);

      if (areasRes.error) throw areasRes.error;

      // Listing counts - same public visibility used by the search engine, so a
      // count here equals what a visitor would actually see for that area.
      const listingQuery = applyPublicVisibility(
        supabase.from('all_listings').select('neighbourhood, location'),
        'active',
      );
      const { data: listingRows } = await listingQuery;
      const counts = new Map<string, number>();
      ((listingRows || []) as Array<{ neighbourhood: string | null; location: string | null }>).forEach((r) => {
        const key = (r.neighbourhood || r.location || '').trim().toLowerCase();
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      // Aggregate landmark/neighbour counts per area + primary landmark name.
      const landmarkCounts = new Map<string, number>();
      const primaryLandmark = new Map<string, string>();
      ((landmarksRes.data || []) as Array<{ neighbourhood_id: string | null; name: string | null; is_primary: boolean | null }>).forEach((l) => {
        if (!l.neighbourhood_id) return;
        landmarkCounts.set(l.neighbourhood_id, (landmarkCounts.get(l.neighbourhood_id) || 0) + 1);
        if (l.is_primary && l.name && !primaryLandmark.has(l.neighbourhood_id)) {
          primaryLandmark.set(l.neighbourhood_id, l.name);
        }
      });
      const neighbourCounts = new Map<string, number>();
      ((neighboursRes.data || []) as Array<{ neighbourhood_id: string | null }>).forEach((n) => {
        if (!n.neighbourhood_id) return;
        neighbourCounts.set(n.neighbourhood_id, (neighbourCounts.get(n.neighbourhood_id) || 0) + 1);
      });

      const mapped: AdminArea[] = ((areasRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        name: String(row.name || ''),
        slug: String(row.slug || ''),
        city: String(row.city || ''),
        country: String(row.country || ''),
        aliases: Array.isArray(row.aliases) ? (row.aliases as string[]) : [],
        latitude: row.latitude != null ? Number(row.latitude) : null,
        longitude: row.longitude != null ? Number(row.longitude) : null,
        location_accuracy: coerceAccuracy(row.location_accuracy),
        verification_status: coerceVerification(row.verification_status),
        is_active: row.is_active !== false,
        is_published: row.is_published !== false,
        nearby_radius_km: row.nearby_radius_km != null ? Number(row.nearby_radius_km) : null,
        updated_at: row.updated_at ? String(row.updated_at) : null,
        listings: counts.get(String(row.name || '').trim().toLowerCase()) || 0,
        landmarkCount: landmarkCounts.get(String(row.id)) || 0,
        neighbourCount: neighbourCounts.get(String(row.id)) || 0,
        primaryLandmarkName: primaryLandmark.get(String(row.id)) || null,
      }));

      if (!abortRef.current) {
        setAreas(mapped);
        setLastLoaded(Date.now());
      }
    } catch (err: unknown) {
      if (!abortRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load areas');
        setAreas([]);
      }
    } finally {
      if (!abortRef.current) setLoading(false);
    }
  }, []);

  const updateArea = useCallback(async (id: string, patch: Record<string, unknown>) => {
    const { error: updateError } = await supabase
      .from('neighbourhoods')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) throw updateError;
    // Re-prime the site-wide coordinate source so edits apply immediately.
    await refreshAreaCentres();
    setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, ...(patch as Partial<AdminArea>) } : a)));
  }, []);

  const setActive = useCallback(async (id: string, active: boolean) => {
    await updateArea(id, { is_active: active });
  }, [updateArea]);

  // ── Landmarks ─────────────────────────────────────────────
  const fetchLandmarks = useCallback(async (areaId: string): Promise<AdminLandmark[]> => {
    const { data, error: lErr } = await supabase
      .from('area_landmarks')
      .select('id, neighbourhood_id, name, latitude, longitude, is_primary, source, verified')
      .eq('neighbourhood_id', areaId)
      .order('is_primary', { ascending: false });
    if (lErr) throw lErr;
    return ((data || []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      neighbourhood_id: String(r.neighbourhood_id),
      name: String(r.name || ''),
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      is_primary: Boolean(r.is_primary),
      source: r.source ? String(r.source) : null,
      verified: Boolean(r.verified),
    }));
  }, []);

  const addLandmark = useCallback(async (areaId: string, lm: { name: string; latitude: number; longitude: number; is_primary: boolean; source?: string; verified?: boolean }) => {
    if (lm.is_primary) {
      await supabase.from('area_landmarks').update({ is_primary: false }).eq('neighbourhood_id', areaId);
    }
    const { error: insErr } = await supabase.from('area_landmarks').insert({
      neighbourhood_id: areaId,
      name: lm.name,
      latitude: lm.latitude,
      longitude: lm.longitude,
      is_primary: lm.is_primary,
      source: lm.source || null,
      verified: lm.verified ?? false,
    });
    if (insErr) throw insErr;
    await refreshAreaCentres();
  }, []);

  const updateLandmark = useCallback(async (areaId: string, landmarkId: string, patch: Record<string, unknown>) => {
    if (patch.is_primary === true) {
      await supabase.from('area_landmarks').update({ is_primary: false }).eq('neighbourhood_id', areaId);
    }
    const { error: updErr } = await supabase
      .from('area_landmarks')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', landmarkId);
    if (updErr) throw updErr;
    await refreshAreaCentres();
  }, []);

  const deleteLandmark = useCallback(async (landmarkId: string) => {
    const { error: delErr } = await supabase.from('area_landmarks').delete().eq('id', landmarkId);
    if (delErr) throw delErr;
    await refreshAreaCentres();
  }, []);

  // ── Neighbour relationships ───────────────────────────────
  const fetchNeighbours = useCallback(async (areaId: string): Promise<AdminNeighbourLink[]> => {
    const { data, error: nErr } = await supabase
      .from('area_neighbours')
      .select('id, neighbourhood_id, neighbour_neighbourhood_id, note')
      .eq('neighbourhood_id', areaId);
    if (nErr) throw nErr;
    const rows = (data || []) as Array<Record<string, unknown>>;
    const ids = rows.map((r) => String(r.neighbour_neighbourhood_id));
    let nameById = new Map<string, string>();
    if (ids.length > 0) {
      const { data: nameRows } = await supabase.from('neighbourhoods').select('id, name').in('id', ids);
      nameById = new Map(((nameRows || []) as Array<{ id: string; name: string }>).map((n) => [String(n.id), n.name]));
    }
    return rows.map((r) => ({
      id: String(r.id),
      neighbourhood_id: String(r.neighbourhood_id),
      neighbour_neighbourhood_id: String(r.neighbour_neighbourhood_id),
      note: r.note ? String(r.note) : null,
      neighbourName: nameById.get(String(r.neighbour_neighbourhood_id)) || 'Unknown area',
    }));
  }, []);

  const addNeighbour = useCallback(async (areaId: string, neighbourId: string) => {
    const { error: insErr } = await supabase.from('area_neighbours').insert({
      neighbourhood_id: areaId,
      neighbour_neighbourhood_id: neighbourId,
    });
    if (insErr) throw insErr;
  }, []);

  const deleteNeighbour = useCallback(async (linkId: string) => {
    const { error: delErr } = await supabase.from('area_neighbours').delete().eq('id', linkId);
    if (delErr) throw delErr;
  }, []);

  /**
   * Delete an area - blocked while it still has active listings, so a live
   * neighbourhood can never be removed by accident.
   */
  const deleteArea = useCallback(async (area: AdminArea) => {
    if (area.listings > 0) {
      throw new Error(`"${area.name}" still has ${area.listings} listing(s). Reassign them before deleting.`);
    }
    const { error: delErr } = await supabase.from('neighbourhoods').delete().eq('id', area.id);
    if (delErr) throw delErr;
    await refreshAreaCentres();
    setAreas((prev) => prev.filter((a) => a.id !== area.id));
  }, []);

  return {
    areas,
    loading,
    error,
    lastLoaded,
    fetchAreas,
    updateArea,
    setActive,
    deleteArea,
    fetchLandmarks,
    addLandmark,
    updateLandmark,
    deleteLandmark,
    fetchNeighbours,
    addNeighbour,
    deleteNeighbour,
  };
}