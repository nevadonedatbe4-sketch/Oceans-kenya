import { useEffect, useState } from 'react';
import { getSiteMetaSync, loadSiteMetaSnapshot, type SiteMetaSnapshot } from '@/lib/siteMeta';

/**
 * useSiteMeta - reactively resolves the admin-managed site name + address
 * derived locality/country. Starts from the synchronous cache (so the first
 * paint already uses the last known value) and upgrades once the DB read
 * settles. Used by SEO/structured-data consumers that must follow Site
 * Settings instead of hardcoding the brand name or location.
 */
export function useSiteMeta(): SiteMetaSnapshot {
  const [snapshot, setSnapshot] = useState<SiteMetaSnapshot>(getSiteMetaSync);

  useEffect(() => {
    let active = true;
    loadSiteMetaSnapshot().then((next) => {
      if (active) setSnapshot(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return snapshot;
}