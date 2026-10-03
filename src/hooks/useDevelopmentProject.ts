import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatAreaName, smartTitleCase } from '@/lib/location';
import {
  buildDevelopment,
  applyProjectRecord,
  DEVELOPMENT_COLUMNS,
  type Development,
  type ListingRow,
} from '@/lib/developmentModel';

/**
 * Loads the FULL development project that a given listing slug belongs to.
 *
 * This backs the dedicated project/development page. Given any unit slug, it
 * resolves the parent project (by the real `development_id` project link, or by
 * the shared project title as a fallback) and returns every published unit -
 * so the page can present the development as the primary entity with all of its
 * live inventory underneath it.
 *
 * All values derive from real `listings` rows; nothing is fabricated.
 */
export function useDevelopmentProject(slug: string | null) {
  const [project, setProject] = useState<Development | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!slug) {
      setProject(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Resolve the seed listing (the unit the visitor navigated from).
      const { data: seed, error: seedError } = await supabase
        .from('listings')
        .select(`${DEVELOPMENT_COLUMNS}, development_id`)
        .eq('slug', slug)
        .maybeSingle();

      if (seedError) {
        console.error('[DevelopmentProject] seed query failed:', seedError);
        setError(seedError.message || 'Failed to load this development.');
        setProject(null);
        return;
      }
      if (!seed) {
        setProject(null);
        return;
      }

      const seedRow = seed as unknown as ListingRow;
      const title = String(seedRow.title || '');
      const developmentId = seedRow.development_id ? String(seedRow.development_id) : '';

      // 2. Load every sibling unit under the same project.
      let query = supabase
        .from('listings')
        .select(DEVELOPMENT_COLUMNS)
        .eq('is_published', true);

      if (developmentId) {
        query = query.eq('development_id', developmentId);
      } else if (title) {
        query = query.eq('title', title);
      } else {
        setProject(buildDevelopment([seedRow], { smartTitleCase, formatAreaName }));
        return;
      }

      const { data, error: siblingsError } = await query;
      if (siblingsError) {
        console.error('[DevelopmentProject] units query failed:', siblingsError);
        setError(siblingsError.message || 'Failed to load this development.');
        setProject(null);
        return;
      }

      let rows = (data || []) as unknown as ListingRow[];
      // Guarantee the seed unit is present even if it was filtered upstream.
      if (!rows.some((r) => String(r.id) === String(seedRow.id))) {
        rows = [seedRow, ...rows];
      }

      const built = buildDevelopment(rows, { smartTitleCase, formatAreaName });

      // Overlay the canonical project entity (the `developments` record) so a
      // real multi-unit project shows its own name, description, gallery,
      // developer and inventory - not whichever unit sorted first.
      let projectRecord: ListingRow | null = null;
      if (developmentId) {
        try {
          const { data: devRow } = await supabase
            .from('developments')
            .select('*')
            .eq('id', developmentId)
            .maybeSingle();
          projectRecord = (devRow as unknown as ListingRow) || null;
        } catch {
          projectRecord = null;
        }
      }

      setProject(projectRecord ? applyProjectRecord(built, projectRecord) : built);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load this development.';
      console.error('[DevelopmentProject] unexpected error:', err);
      setError(message);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return { project, loading, error, refetch: fetchProject };
}

/**
 * Resolves the canonical PROJECT page link (route slug + real project name) for a
 * single unit listing, so every unit in a development links "See more of this
 * development" / "Back to …" to the SAME project route (the project's cheapest
 * unit slug) using the project's name from the `developments` record.
 *
 * The unit and the project are separate entities (UNIT → project), but they must
 * resolve to two different page components, never one merged page.
 */
export function useUnitProjectLink(listingSlug: string | null, enabled: boolean) {
  const [link, setLink] = useState<{ slug: string; name: string }>({ slug: '', name: '' });

  const resolve = useCallback(async () => {
    if (!enabled || !listingSlug) {
      setLink({ slug: '', name: '' });
      return;
    }
    try {
      const { data: seed } = await supabase
        .from('listings')
        .select('id, slug, title, development_id')
        .eq('slug', listingSlug)
        .maybeSingle();

      if (!seed) {
        setLink({ slug: '', name: '' });
        return;
      }
      const seedSlug = String((seed as Record<string, unknown>).slug || '');
      const devId = (seed as Record<string, unknown>).development_id
        ? String((seed as Record<string, unknown>).development_id)
        : '';
      const title = String((seed as Record<string, unknown>).title || '');

      // Prefer the project's real name from the `developments` entity.
      let projectName = '';
      if (devId) {
        try {
          const { data: dev } = await supabase
            .from('developments')
            .select('title')
            .eq('id', devId)
            .maybeSingle();
          projectName = String((dev as Record<string, unknown>)?.title || '');
        } catch {
          projectName = '';
        }
      }

      let query = supabase
        .from('listings')
        .select('id, slug, price')
        .eq('is_published', true);

      if (devId) query = query.eq('development_id', devId);
      else if (title) query = query.eq('title', title);
      else {
        setLink({ slug: seedSlug, name: projectName || title });
        return;
      }

      const { data: siblings } = await query;
      const rows = (siblings || []) as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        setLink({ slug: seedSlug, name: projectName || title });
        return;
      }

      // The project's canonical route is its primary (cheapest) unit - the same
      // rule buildDevelopment uses, so unit ↔ project links stay consistent.
      const sorted = [...rows].sort((a, b) => {
        const pa = Number(a.price) || 0;
        const pb = Number(b.price) || 0;
        if (pa <= 0) return 1;
        if (pb <= 0) return -1;
        return pa - pb;
      });
      setLink({ slug: String(sorted[0]?.slug || seedSlug), name: projectName || title });
    } catch {
      setLink({ slug: '', name: '' });
    }
  }, [listingSlug, enabled]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  return link;
}