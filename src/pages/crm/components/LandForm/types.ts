/* Shared type for the Land CRM form state + a LandRow type for the list page. */

import type { CoListingAgent } from '@/pages/crm/components/coListingAgents';

export interface LandFormState {
  title: string;
  slug: string;
  slugTouched: boolean;
  offerType: string;
  landType: string;
  disposition: string;
  status: string;
  marketingLabels: string[];

  /* Location */
  region: string;
  county: string;
  subCounty: string;
  ward: string;
  area: string;
  neighbourhood: string;
  landmark: string;
  street: string;
  address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  mapPrecision: string;
  showExact: boolean;

  /* Land details */
  landSize: string;
  landSizeUnit: string;
  plotLength: string;
  plotWidth: string;
  plotDimUnit: string;
  plotShape: string;
  terrain: string[];
  landEnvironment: string[];
  waterFeatures: string[];
  topography: string;

  /* Tenure & docs */
  landClassification: string;
  tenure: string;
  titleDocument: string;
  titleInfo: string;
  verificationStatus: string;

  /* Access & infrastructure */
  roadAccess: string;
  roadFrontage: string[];
  accessibility: string[];
  waterSupply: string[];
  electricity: string[];
  sewerage: string[];
  connectivity: string[];

  /* Use & potential */
  primaryLandUse: string;
  secondaryPotentialUses: string[];
  suitableFor: string[];
  developmentIndicators: string[];
  zoning: string;
  permittedUse: string;
  subdivisionPotential: boolean;
  developmentPotential: string;

  /* Pricing */
  askingPrice: string;
  currency: string;
  priceBasis: string;
  pricePerAcre: string;
  pricePerHectare: string;
  pricePerSqm: string;
  priceStatus: string;

  /* Payment */
  paymentTerms: string[];
  depositRequired: string;
  installmentPeriod: string;
  installmentFrequency: string;
  balanceTerms: string;
  interestApplies: boolean;
  paymentNotes: string;

  /* Property-specific booleans from original model */
  agriculturalPotential: boolean;
  commercialPotential: boolean;
  residentialPotential: boolean;

  /* Description */
  headline: string;
  shortDescription: string;
  description: string;
  investmentOpportunity: string;

  /* Owner / seller */
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  sellerType: string;
  ownershipRelationship: string;
  source: string;
  sellerNotes: string;
  internalContact: string;
  sourceContactId: string;

  /* Source details */
  sourceName: string;
  sourceLink: string;
  dateSourced: string;

  /* Original poster / poster details */
  posterName: string;
  posterPhone: string;
  posterEmail: string;
  posterCompany: string;
  posterProfile: string;
  posterAddress: string;

  /* Other agents who also posted this land */
  coListingAgents: CoListingAgent[];

  /* Assigned agents who handle inquiries for this listing */
  agentIds: string[];

  /* Internal CRM */
  internalNotes: string;
  commission: string;
  negotiationFloor: string;
  internalValuation: string;
  agentNotes: string;
  legalConcerns: string;
  followUpNotes: string;

  /* SEO / publish */
  seoTitle: string;
  seoDescription: string;
  isPublished: boolean;
  isFeatured: boolean;
  isPending: boolean;
}

export interface LandRow {
  id: string;
  title: string;
  slug: string;
  location: string;
  county: string | null;
  state_region: string | null;
  land_type: string;
  land_size: number | null;
  land_size_unit: string | null;
  acreage: number | null;
  tenure: string | null;
  asking_price: number | null;
  currency: string;
  sub_type: string | null;
  status: string;
  is_published: boolean;
  is_pending: boolean;
  is_featured: boolean;
  main_image: string | null;
  images: string[] | null;
  description: string | null;
  created_at: string;
}