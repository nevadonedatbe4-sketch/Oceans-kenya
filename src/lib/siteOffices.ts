export interface SiteOffice {
  /** Branch name, e.g. "Head Office" / "Karen Office". Optional. */
  label: string;
  /** Street address used for display and map links. */
  address: string;
}

/**
 * Builds the ordered list of office locations from site settings.
 *
 * Supports the original single `address` plus an optional second office
 * (`address_2`) - each with an optional label so branches can be named.
 * Empty addresses are filtered out so the UI never renders a blank office.
 */
export function getSiteOffices(
  getSite: (key: string) => string,
  primaryAddressOverride?: string,
): SiteOffice[] {
  const primaryAddress = (primaryAddressOverride || getSite('address') || '').trim();

  const candidates: SiteOffice[] = [
    { label: (getSite('address_label') || '').trim(), address: primaryAddress },
    { label: (getSite('address_2_label') || '').trim(), address: (getSite('address_2') || '').trim() },
  ];

  return candidates.filter((office) => office.address.length > 0);
}