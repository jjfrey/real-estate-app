export interface ListingPhoto {
  id: number;
  listingId: number;
  url: string;
  caption: string | null;
  sortOrder: number | null;
}

export interface Agent {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  licenseNum: string | null;
  phone: string | null;
  photoUrl: string | null;
}

export interface Office {
  id: number;
  name: string | null;
  brokerageName: string | null;
  phone: string | null;
  email: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

export interface OpenHouse {
  id: number;
  listingId: number;
  date: string;
  startTime: string;
  endTime: string;
}

export interface ListingSummary {
  id: number;
  mlsId: string;
  streetAddress: string;
  unitNumber: string | null;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  price: string;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: string | null;
  livingArea: number | null;
  lotSize: string | null;
  yearBuilt: number | null;
  createdAt: string;
  photoUrl: string | null;
}

export interface ListingDetail {
  id: number;
  mlsId: string;
  internalMlsId: string | null;
  mlsBoard: string | null;
  streetAddress: string;
  unitNumber: string | null;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  price: string;
  listingUrl: string | null;
  virtualTourUrl: string | null;
  propertyType: string | null;
  description: string | null;
  bedrooms: number | null;
  bathrooms: string | null;
  fullBathrooms: number | null;
  halfBathrooms: number | null;
  livingArea: number | null;
  lotSize: string | null;
  yearBuilt: number | null;
  petsAllowed: boolean | null;
  agentId: number | null;
  officeId: number | null;
  createdAt: string;
  updatedAt: string;
  syncedAt: string;
  photos: ListingPhoto[];
  agent: Agent | null;
  office: Office | null;
  openHouses: OpenHouse[];
}

export interface ListingsResponse {
  listings: ListingSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AutocompleteResult {
  id: number | null;
  type: "address" | "city" | "zip";
  label: string;
  value: string;
  city: string;
  state: string;
}

export interface CityCount {
  city: string;
  state: string;
  count: number;
}
