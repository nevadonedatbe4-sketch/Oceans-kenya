/**
 * Shared, property-type-agnostic detail model.
 *
 * The public property detail page is a live presentation of the CRM record.
 * Each property type (Land, JV, Development, residential, commercial…) builds
 * its own list of sections from its own source table, but they all speak this
 * common shape so a single renderer can present them consistently.
 *
 * Only populated fields are ever added - the mapper is responsible for
 * skipping anything the CRM did not capture.
 */

export interface DetailField {
  label: string;
  value: string;
  /** Highlight this value (e.g. price). */
  emphasis?: boolean;
}

export interface DetailTagGroup {
  label: string;
  items: string[];
}

export interface DetailParagraph {
  label: string;
  text: string;
}

export interface DetailSection {
  id: string;
  title: string;
  /** Remix icon class, e.g. "ri-map-pin-2-line". */
  icon: string;
  fields?: DetailField[];
  tagGroups?: DetailTagGroup[];
  paragraphs?: DetailParagraph[];
}

export interface PropertyDetailModel {
  /** Short lead text shown under the title, if captured. */
  headline: string;
  /** One-line summary, if captured. */
  summary: string;
  /** Investment opportunity blurb, if captured. */
  investmentOpportunity: string;
  /** Compact stat strip for the hero card. */
  heroStats: DetailField[];
  /** Type-aware content sections. */
  sections: DetailSection[];
  /** Key/value rows for the sidebar. */
  quickFacts: DetailField[];
}