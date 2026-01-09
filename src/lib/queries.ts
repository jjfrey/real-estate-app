import { db } from "@/db";
import { listings, listingPhotos, agents, offices, openHouses } from "@/db/schema";
import { eq, and, gte, lte, inArray, ilike, or, sql, desc, asc } from "drizzle-orm";

export interface ListingFilters {
  city?: string;
  zip?: string;
  status?: string | string[];
  propertyType?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  minYear?: number;
  maxYear?: number;
  // Geo filters
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  lat?: number;
  lng?: number;
  radius?: number; // in miles
}

export interface ListingSort {
  field: "price" | "createdAt" | "bedrooms";
  direction: "asc" | "desc";
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export async function getListings(
  filters: ListingFilters = {},
  sort: ListingSort = { field: "createdAt", direction: "desc" },
  pagination: PaginationParams = { page: 1, limit: 24 }
) {
  const conditions = [];

  // Text filters
  if (filters.city) {
    conditions.push(ilike(listings.city, filters.city));
  }
  if (filters.zip) {
    conditions.push(eq(listings.zip, filters.zip));
  }

  // Status filter
  if (filters.status) {
    const statusList = Array.isArray(filters.status) ? filters.status : [filters.status];
    conditions.push(inArray(listings.status, statusList));
  }

  // Property type filter
  if (filters.propertyType) {
    const typeList = Array.isArray(filters.propertyType) ? filters.propertyType : [filters.propertyType];
    conditions.push(inArray(listings.propertyType, typeList));
  }

  // Price range
  if (filters.minPrice !== undefined) {
    conditions.push(gte(listings.price, filters.minPrice.toString()));
  }
  if (filters.maxPrice !== undefined) {
    conditions.push(lte(listings.price, filters.maxPrice.toString()));
  }

  // Beds filter
  if (filters.minBeds !== undefined) {
    conditions.push(gte(listings.bedrooms, filters.minBeds));
  }
  if (filters.maxBeds !== undefined) {
    conditions.push(lte(listings.bedrooms, filters.maxBeds));
  }

  // Baths filter
  if (filters.minBaths !== undefined) {
    conditions.push(gte(listings.bathrooms, filters.minBaths.toString()));
  }
  if (filters.maxBaths !== undefined) {
    conditions.push(lte(listings.bathrooms, filters.maxBaths.toString()));
  }

  // Sqft filter
  if (filters.minSqft !== undefined) {
    conditions.push(gte(listings.livingArea, filters.minSqft));
  }
  if (filters.maxSqft !== undefined) {
    conditions.push(lte(listings.livingArea, filters.maxSqft));
  }

  // Year built filter
  if (filters.minYear !== undefined) {
    conditions.push(gte(listings.yearBuilt, filters.minYear));
  }
  if (filters.maxYear !== undefined) {
    conditions.push(lte(listings.yearBuilt, filters.maxYear));
  }

  // Bounding box filter (for map search)
  if (filters.bounds) {
    const { north, south, east, west } = filters.bounds;
    conditions.push(
      and(
        gte(listings.latitude, south),
        lte(listings.latitude, north),
        gte(listings.longitude, west),
        lte(listings.longitude, east)
      )
    );
  }

  // Radius search (in miles)
  if (filters.lat !== undefined && filters.lng !== undefined && filters.radius !== undefined) {
    // Approximate: 1 degree latitude ≈ 69 miles
    const latDelta = filters.radius / 69;
    // 1 degree longitude varies by latitude, approximate at given lat
    const lngDelta = filters.radius / (69 * Math.cos(filters.lat * (Math.PI / 180)));

    conditions.push(
      and(
        gte(listings.latitude, filters.lat - latDelta),
        lte(listings.latitude, filters.lat + latDelta),
        gte(listings.longitude, filters.lng - lngDelta),
        lte(listings.longitude, filters.lng + lngDelta)
      )
    );
  }

  // Build sort
  const sortColumn = {
    price: listings.price,
    createdAt: listings.createdAt,
    bedrooms: listings.bedrooms,
  }[sort.field];
  const sortOrder = sort.direction === "asc" ? asc(sortColumn) : desc(sortColumn);

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(listings)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  const total = Number(countResult[0].count);

  // Get listings with first photo
  const offset = (pagination.page - 1) * pagination.limit;

  const results = await db
    .select({
      id: listings.id,
      mlsId: listings.mlsId,
      streetAddress: listings.streetAddress,
      unitNumber: listings.unitNumber,
      city: listings.city,
      state: listings.state,
      zip: listings.zip,
      latitude: listings.latitude,
      longitude: listings.longitude,
      status: listings.status,
      price: listings.price,
      propertyType: listings.propertyType,
      bedrooms: listings.bedrooms,
      bathrooms: listings.bathrooms,
      livingArea: listings.livingArea,
      lotSize: listings.lotSize,
      yearBuilt: listings.yearBuilt,
      createdAt: listings.createdAt,
    })
    .from(listings)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sortOrder)
    .limit(pagination.limit)
    .offset(offset);

  // Get first photo for each listing
  const listingIds = results.map((l) => l.id);
  const photos = listingIds.length > 0
    ? await db
        .select({
          listingId: listingPhotos.listingId,
          url: listingPhotos.url,
        })
        .from(listingPhotos)
        .where(
          and(
            inArray(listingPhotos.listingId, listingIds),
            eq(listingPhotos.sortOrder, 0)
          )
        )
    : [];

  const photoMap = new Map(photos.map((p) => [p.listingId, p.url]));

  const listingsWithPhotos = results.map((listing) => ({
    ...listing,
    photoUrl: photoMap.get(listing.id) || null,
  }));

  return {
    listings: listingsWithPhotos,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
}

export async function getListingById(id: number) {
  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);

  if (!listing) {
    return null;
  }

  // Get related data
  const [photos, agent, office, openHouseList] = await Promise.all([
    db
      .select()
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, id))
      .orderBy(asc(listingPhotos.sortOrder)),
    listing.agentId
      ? db.select().from(agents).where(eq(agents.id, listing.agentId)).limit(1)
      : Promise.resolve([]),
    listing.officeId
      ? db.select().from(offices).where(eq(offices.id, listing.officeId)).limit(1)
      : Promise.resolve([]),
    db
      .select()
      .from(openHouses)
      .where(eq(openHouses.listingId, id))
      .orderBy(asc(openHouses.date)),
  ]);

  return {
    ...listing,
    photos,
    agent: agent[0] || null,
    office: office[0] || null,
    openHouses: openHouseList,
  };
}

export async function getListingByMlsId(mlsId: string) {
  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.mlsId, mlsId))
    .limit(1);

  if (!listing) {
    return null;
  }

  return getListingById(listing.id);
}

export async function searchAutocomplete(query: string, limit = 10) {
  if (!query || query.length < 2) {
    return [];
  }

  const searchPattern = `%${query}%`;

  // Search addresses
  const addressResults = await db
    .select({
      id: listings.id,
      type: sql<string>`'address'`,
      label: sql<string>`${listings.streetAddress} || ', ' || ${listings.city} || ', ' || ${listings.state} || ' ' || ${listings.zip}`,
      value: listings.streetAddress,
      city: listings.city,
      state: listings.state,
    })
    .from(listings)
    .where(
      or(
        ilike(listings.streetAddress, searchPattern),
        ilike(listings.city, searchPattern),
        ilike(listings.zip, searchPattern)
      )
    )
    .limit(limit);

  // Get unique cities
  const cityResults = await db
    .selectDistinct({
      city: listings.city,
      state: listings.state,
    })
    .from(listings)
    .where(ilike(listings.city, searchPattern))
    .limit(5);

  const cities = cityResults.map((c) => ({
    id: null,
    type: "city" as const,
    label: `${c.city}, ${c.state}`,
    value: c.city,
    city: c.city,
    state: c.state,
  }));

  // Get unique zips
  const zipResults = await db
    .selectDistinct({
      zip: listings.zip,
      city: listings.city,
      state: listings.state,
    })
    .from(listings)
    .where(ilike(listings.zip, searchPattern))
    .limit(5);

  const zips = zipResults.map((z) => ({
    id: null,
    type: "zip" as const,
    label: `${z.zip} - ${z.city}, ${z.state}`,
    value: z.zip,
    city: z.city,
    state: z.state,
  }));

  // Combine and limit results
  return [...cities, ...zips, ...addressResults].slice(0, limit);
}

export async function getCitiesWithCounts() {
  const results = await db
    .select({
      city: listings.city,
      state: listings.state,
      count: sql<number>`count(*)`,
    })
    .from(listings)
    .groupBy(listings.city, listings.state)
    .orderBy(desc(sql`count(*)`));

  return results;
}
