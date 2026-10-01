import { useLocation } from "react-router-dom";

/**
 * Returns the base path of the portal the user is currently inside:
 *   - "/agent" when inside the Agent Portal (/agent/*)
 *   - "/admin" when inside the Admin Portal (/admin/*)
 *   - "" when outside either portal (fallback to admin)
 *
 * Shared admin/CRM components (Listings, ListingEdit, etc.) are mounted under
 * BOTH portals, so they must navigate relative to the active portal instead of
 * hardcoding /crm or /admin. Never hardcode old /crm/* paths.
 */
export default function usePortalBase(): string {
  const location = useLocation();
  const path = location.pathname;

  if (path.startsWith("/agent")) return "/agent";
  if (path.startsWith("/admin")) return "/admin";

  // Default to the admin portal when not inside a recognized portal.
  return "/admin";
}