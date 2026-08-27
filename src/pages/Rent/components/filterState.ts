// Filter shape and defaults shared by the Rent, Buy and PropertyDetail pages.
// Kept out of AdvancedFilters.tsx so that file only exports its component,
// which is what react-refresh needs for fast refresh to work.

export interface FilterState {
  minPrice: string;
  maxPrice: string;
  minBeds: string;
  maxBeds: string;
  minBaths: string;
  propertyTypes: string[];
  furnished: string[];
  lettingType: string[];
  minSize: string;
  maxSize: string;
  keywords: string;
  added: string;
  mustHaves: string[];
  keywordsExclude: string;
  pets: boolean;
  students: boolean;
  billsIncluded: boolean;
  parking: boolean;
  garden: boolean;
  balcony: boolean;
  wheelchair: boolean;
  chainFree: boolean;
  sharedAccommodation: boolean;
}

export const defaultFilters: FilterState = {
  minPrice: '',
  maxPrice: '',
  minBeds: '',
  maxBeds: '',
  minBaths: '',
  propertyTypes: [],
  furnished: [],
  lettingType: [],
  minSize: '',
  maxSize: '',
  keywords: '',
  added: '',
  mustHaves: [],
  keywordsExclude: '',
  pets: false,
  students: false,
  billsIncluded: false,
  parking: false,
  garden: false,
  balcony: false,
  wheelchair: false,
  chainFree: false,
  sharedAccommodation: false,
};
