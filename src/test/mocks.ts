import { ListingSummary, ListingDetail, AutocompleteResult, ListingPhoto, CityCount } from '@/types/listing'

export const mockListingSummary: ListingSummary = {
  id: 1,
  mlsId: 'A123456',
  streetAddress: '123 Main Street',
  unitNumber: null,
  city: 'SARASOTA',
  state: 'FL',
  zip: '34236',
  price: '450000',
  bedrooms: 3,
  bathrooms: '2',
  livingArea: 1800,
  lotSize: '0.25 acres',
  propertyType: 'Single Family',
  status: 'Active',
  latitude: 27.3364,
  longitude: -82.5307,
  yearBuilt: 2015,
  photoUrl: 'https://example.com/photo1.jpg',
  createdAt: '2024-01-15T00:00:00Z',
}

export const mockListingSummaries: ListingSummary[] = [
  mockListingSummary,
  {
    ...mockListingSummary,
    id: 2,
    mlsId: 'A123457',
    streetAddress: '456 Oak Avenue',
    price: '625000',
    bedrooms: 4,
    bathrooms: '3',
    livingArea: 2400,
  },
  {
    ...mockListingSummary,
    id: 3,
    mlsId: 'A123458',
    streetAddress: '789 Palm Drive',
    city: 'NAPLES',
    price: '875000',
    bedrooms: 5,
    bathrooms: '4',
    livingArea: 3200,
  },
]

export const mockPhotos: ListingPhoto[] = [
  { id: 1, listingId: 1, url: 'https://example.com/photo1.jpg', caption: 'Front', sortOrder: 1 },
  { id: 2, listingId: 1, url: 'https://example.com/photo2.jpg', caption: 'Kitchen', sortOrder: 2 },
  { id: 3, listingId: 1, url: 'https://example.com/photo3.jpg', caption: 'Living Room', sortOrder: 3 },
]

export const mockListingDetail: ListingDetail = {
  id: 1,
  mlsId: 'A123456',
  internalMlsId: 'INT123',
  mlsBoard: 'STELLAR',
  streetAddress: '123 Main Street',
  unitNumber: null,
  city: 'SARASOTA',
  state: 'FL',
  zip: '34236',
  latitude: 27.3364,
  longitude: -82.5307,
  status: 'Active',
  price: '450000',
  listingUrl: 'https://example.com/listing',
  virtualTourUrl: 'https://example.com/tour',
  propertyType: 'Single Family',
  description: 'Beautiful single family home with modern updates.',
  bedrooms: 3,
  bathrooms: '2',
  fullBathrooms: 2,
  halfBathrooms: 0,
  livingArea: 1800,
  lotSize: '0.25 acres',
  yearBuilt: 2015,
  petsAllowed: true,
  agentId: 1,
  officeId: 1,
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  syncedAt: '2024-01-15T00:00:00Z',
  photos: mockPhotos,
  agent: {
    id: 1,
    firstName: 'John',
    lastName: 'Smith',
    email: 'john@example.com',
    licenseNum: 'FL12345',
    phone: '555-123-4567',
    photoUrl: 'https://example.com/agent.jpg',
  },
  office: {
    id: 1,
    name: 'ABC Realty',
    brokerageName: 'ABC Brokerage',
    phone: '555-987-6543',
    email: 'info@abcrealty.com',
    streetAddress: '100 Business Ave',
    city: 'Sarasota',
    state: 'FL',
    zip: '34236',
  },
  openHouses: [
    { id: 1, listingId: 1, date: '2024-01-20', startTime: '10:00', endTime: '14:00' },
  ],
}

export const mockAutocompleteResults: AutocompleteResult[] = [
  {
    id: null,
    type: 'city',
    label: 'Sarasota, FL',
    value: 'SARASOTA',
    city: 'SARASOTA',
    state: 'FL',
  },
  {
    id: null,
    type: 'city',
    label: 'Sarasota Springs, FL',
    value: 'SARASOTA SPRINGS',
    city: 'SARASOTA SPRINGS',
    state: 'FL',
  },
  {
    id: null,
    type: 'zip',
    label: '34236 - Sarasota, FL',
    value: '34236',
    city: 'SARASOTA',
    state: 'FL',
  },
]

export const mockListingsResponse = {
  listings: mockListingSummaries,
  pagination: {
    page: 1,
    limit: 24,
    total: 150,
    totalPages: 7,
  },
}

export const mockCitiesResponse: CityCount[] = [
  { city: 'SARASOTA', state: 'FL', count: 450 },
  { city: 'NAPLES', state: 'FL', count: 320 },
  { city: 'FORT MYERS', state: 'FL', count: 280 },
  { city: 'TAMPA', state: 'FL', count: 520 },
]

// Lead mocks
export const mockLeadRequest = {
  listingId: 1,
  leadType: 'info_request' as const,
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '555-555-5555',
  message: 'I would like more information about this property.',
}

export const mockTourRequest = {
  listingId: 1,
  leadType: 'tour_request' as const,
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '555-555-5555',
  message: 'I would like to schedule a tour.',
  preferredTourDate: '2026-01-20',
  preferredTourTime: 'morning',
}

export const mockLead = {
  id: 1,
  listingId: 1,
  agentId: 1,
  officeId: 1,
  leadType: 'info_request',
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '555-555-5555',
  message: 'I would like more information about this property.',
  preferredTourDate: null,
  preferredTourTime: null,
  status: 'new',
  createdAt: '2026-01-13T00:00:00Z',
}

// Helper to create fetch mock response
export function createFetchResponse<T>(data: T, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response
}

// Portal mocks
export const mockPortalUser = {
  id: 'user-123',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'super_admin',
  createdAt: new Date('2024-01-01'),
}

export const mockOfficeAdmin = {
  id: 'user-456',
  email: 'officeadmin@example.com',
  name: 'Office Admin',
  role: 'office_admin',
  createdAt: new Date('2024-01-01'),
}

export const mockAgent = {
  id: 1,
  firstName: 'John',
  lastName: 'Smith',
  email: 'john@example.com',
  phone: '555-123-4567',
  licenseNum: 'FL12345',
  photoUrl: null,
  userId: 'user-789',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockOffice = {
  id: 1,
  name: 'ABC Realty',
  brokerageName: 'ABC Brokerage',
  phone: '555-987-6543',
  email: 'info@abcrealty.com',
  streetAddress: '100 Business Ave',
  city: 'Sarasota',
  state: 'FL',
  zip: '34236',
  leadRoutingEmail: 'leads@abcrealty.com',
  routeToTeamLead: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockOfficeWithStats = {
  ...mockOffice,
  listingCount: 25,
  adminCount: 2,
}

export const mockInvitation = {
  id: 'inv-123',
  email: 'newinvite@example.com',
  role: 'agent' as const,
  token: 'abc123token',
  agentId: 1,
  officeId: null,
  createdById: 'user-123',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  acceptedAt: null,
  createdAt: new Date('2024-01-01'),
}

export const mockPortalLead = {
  id: 1,
  listingId: 1,
  agentId: 1,
  officeId: 1,
  leadType: 'info_request',
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '555-555-5555',
  message: 'I would like more information.',
  preferredTourDate: null,
  preferredTourTime: null,
  status: 'new',
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockSyncStats = {
  totals: {
    listings: 2170,
    agents: 450,
    offices: 85,
    photos: 78000,
  },
  byStatus: {
    Active: 1320,
    'For Rent': 585,
    Pending: 265,
  },
  byPropertyType: {
    'Single Family': 1127,
    Condo: 651,
    'Vacant Land': 238,
    Townhouse: 154,
  },
  topCities: [
    { city: 'Naples', count: 420 },
    { city: 'Sarasota', count: 380 },
    { city: 'Fort Myers', count: 290 },
  ],
  lastUpdated: new Date('2024-01-15T10:30:00Z'),
}
