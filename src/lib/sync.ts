import { XMLParser } from "fast-xml-parser";
import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { normalizeAddress, getStatusCategory } from "./normalize-address";
import { detectChanges, recordChanges, checkAnomalies } from "./sync-change-tracker";
import { COORD_MATCH_DEGREES, coordsMatch, addressPrefix, isAddressPrefix } from "./listing-matcher";

// ==========================================
// Types
// ==========================================

export interface XMLListing {
  Location: {
    StreetAddress: string;
    UnitNumber?: string;
    City: string;
    State: string;
    Zip: string;
    Lat: string;
    Long: string;
  };
  ListingDetails: {
    Status: string;
    Price: string;
    ListingUrl?: string;
    MlsId: string;
    InternalMlsId?: string;
    MlsBoard?: string;
    VirtualTourUrl?: string;
  };
  RentalDetails?: {
    PetsAllowed?: {
      NoPets?: string;
    };
  };
  BasicDetails: {
    PropertyType?: string;
    Description?: string;
    Bedrooms?: string;
    Bathrooms?: string;
    FullBathrooms?: string;
    HalfBathrooms?: string;
    LivingArea?: string;
    LotSize?: string;
    YearBuilt?: string;
  };
  Pictures?: {
    Picture?: Array<{
      PictureUrl: string;
      Caption?: string;
    }> | {
      PictureUrl: string;
      Caption?: string;
    };
  };
  Agent?: {
    FirstName?: string;
    LastName?: string;
    EmailAddress?: string;
    LicenseNum?: string;
    OfficeLineNumber?: string;
    PictureUrl?: string;
  };
  Office?: {
    BrokerPhone?: string;
    BrokerEmail?: string;
    BrokerageName?: string;
    StreetAddress?: string;
    City?: string;
    State?: string;
    Zip?: string;
    OfficeName?: string;
  };
  OpenHouses?: {
    OpenHouse?: Array<{
      Date: string;
      StartTime: string;
      EndTime: string;
    }> | {
      Date: string;
      StartTime: string;
      EndTime: string;
    };
  };
}

export type SyncTrigger = "manual" | "scheduled" | "webhook";
export type SyncStatus = "pending" | "running" | "completed" | "failed";

export interface CompanyConflict {
  officeId: number;
  officeName: string;
  existingCompanyId: number;
  feedCompanyId: number;
}

export interface SyncStats {
  listingsCreated: number;
  listingsUpdated: number;
  listingsDeleted: number;
  listingsSkipped: number;
  listingsQuarantined: number;
  changesRecorded: number;
  agentsCreated: number;
  agentsUpdated: number;
  officesCreated: number;
  officesUpdated: number;
  photosProcessed: number;
  openHousesProcessed: number;
  companyConflicts: number;
  companyConflictDetails: CompanyConflict[];
}

export interface SyncResult {
  success: boolean;
  stats: SyncStats;
  errorMessage?: string;
  errorStack?: string;
  duration: number;
}

export interface SyncOptions {
  trigger: SyncTrigger;
  triggeredBy?: string; // User ID
  feedId?: number; // Sync feed ID
  feedUrl?: string;
  feedContent?: string; // Direct XML content (for testing)
  onProgress?: (current: number, total: number) => void;
}

// ==========================================
// Helper Functions
// ==========================================

function cleanValue(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (str === "" || str.toLowerCase() === "none" || str.toLowerCase() === "null") {
    return null;
  }
  return str;
}

function parseNumber(val: unknown): number | null {
  const cleaned = cleanValue(val);
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseInt2(val: unknown): number | null {
  const cleaned = cleanValue(val);
  if (!cleaned) return null;
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}


// ==========================================
// Core Sync Logic
// ==========================================

async function findOrCreateAgent(
  agentData: XMLListing["Agent"],
  stats: SyncStats
): Promise<number | null> {
  if (!agentData || (!agentData.EmailAddress && !agentData.FirstName)) {
    return null;
  }

  const email = cleanValue(agentData.EmailAddress);

  // Try to find existing agent by email
  if (email) {
    const existing = await db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.email, email))
      .limit(1);

    if (existing.length > 0) {
      stats.agentsUpdated++;
      return existing[0].id;
    }
  }

  // Create new agent
  const [newAgent] = await db
    .insert(schema.agents)
    .values({
      firstName: cleanValue(agentData.FirstName),
      lastName: cleanValue(agentData.LastName),
      email: email,
      licenseNum: cleanValue(agentData.LicenseNum),
      phone: cleanValue(agentData.OfficeLineNumber),
      photoUrl: cleanValue(agentData.PictureUrl),
    })
    .returning({ id: schema.agents.id });

  stats.agentsCreated++;
  return newAgent.id;
}

async function findOrCreateOffice(
  officeData: XMLListing["Office"],
  stats: SyncStats,
  feedCompanyId?: number | null
): Promise<number | null> {
  if (!officeData || !officeData.OfficeName) {
    return null;
  }

  const name = cleanValue(officeData.OfficeName);
  if (!name) return null;

  // Try to find existing office by name
  const existing = await db
    .select()
    .from(schema.offices)
    .where(eq(schema.offices.name, name))
    .limit(1);

  if (existing.length > 0) {
    const office = existing[0];
    stats.officesUpdated++;

    // Check for company conflict
    if (feedCompanyId && office.companyId && office.companyId !== feedCompanyId) {
      stats.companyConflicts++;
      stats.companyConflictDetails.push({
        officeId: office.id,
        officeName: office.name || name,
        existingCompanyId: office.companyId,
        feedCompanyId: feedCompanyId,
      });
    } else if (feedCompanyId && !office.companyId) {
      await db
        .update(schema.offices)
        .set({ companyId: feedCompanyId, updatedAt: new Date() })
        .where(eq(schema.offices.id, office.id));
    }

    return office.id;
  }

  // Create new office with company association
  const [newOffice] = await db
    .insert(schema.offices)
    .values({
      name: name,
      brokerageName: cleanValue(officeData.BrokerageName),
      phone: cleanValue(officeData.BrokerPhone),
      email: cleanValue(officeData.BrokerEmail),
      streetAddress: cleanValue(officeData.StreetAddress),
      city: cleanValue(officeData.City),
      state: cleanValue(officeData.State),
      zip: cleanValue(officeData.Zip),
      companyId: feedCompanyId || null,
    })
    .returning({ id: schema.offices.id });

  stats.officesCreated++;
  return newOffice.id;
}

async function findExistingByAddress(
  normalized: string,
  city: string,
  zip: string,
  unitNumber: string | null,
  statusCat: "sale" | "rent"
): Promise<schema.Listing[]> {
  const conditions = [
    eq(schema.listings.normalizedAddress, normalized),
    eq(schema.listings.city, city),
    eq(schema.listings.zip, zip),
  ];

  // Unit matching: if incoming has a unit, match it; if not, match only listings without units
  if (unitNumber) {
    conditions.push(eq(schema.listings.unitNumber, unitNumber));
  } else {
    conditions.push(isNull(schema.listings.unitNumber));
  }

  // Status category filter
  if (statusCat === "rent") {
    conditions.push(sql`lower(${schema.listings.status}) LIKE '%rent%' OR lower(${schema.listings.status}) LIKE '%lease%'`);
  } else {
    conditions.push(sql`lower(${schema.listings.status}) NOT LIKE '%rent%' AND lower(${schema.listings.status}) NOT LIKE '%lease%'`);
  }

  return db
    .select()
    .from(schema.listings)
    .where(and(...conditions))
    .limit(5);
}


async function findExistingByCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
  unitNumber: string | null,
  statusCat: "sale" | "rent",
  normalizedAddr: string
): Promise<schema.Listing[]> {
  if (!lat || !lng || (lat === 0 && lng === 0)) return [];

  // Use the first two tokens of the normalized address (house number + first street word)
  // as a prefix filter — prevents matching different units in the same building
  // e.g., "3911 SW 27TH STREET 10" vs "3911 SW 27TH STREET 9" → prefix "3911 SW"
  const addrPrefix = addressPrefix(normalizedAddr);

  const conditions = [
    sql`ABS(${schema.listings.latitude} - ${lat}) < ${COORD_MATCH_DEGREES}`,
    sql`ABS(${schema.listings.longitude} - ${lng}) < ${COORD_MATCH_DEGREES}`,
    sql`${schema.listings.latitude} IS NOT NULL`,
    sql`${schema.listings.longitude} IS NOT NULL`,
    sql`NOT (${schema.listings.latitude} = 0 AND ${schema.listings.longitude} = 0)`,
    sql`${schema.listings.normalizedAddress} LIKE ${addrPrefix + "%"}`,
  ];

  if (unitNumber) {
    conditions.push(eq(schema.listings.unitNumber, unitNumber));
  } else {
    conditions.push(sql`COALESCE(${schema.listings.unitNumber}, '') = ''`);
  }

  if (statusCat === "rent") {
    conditions.push(sql`lower(${schema.listings.status}) LIKE '%rent%' OR lower(${schema.listings.status}) LIKE '%lease%'`);
  } else {
    conditions.push(sql`lower(${schema.listings.status}) NOT LIKE '%rent%' AND lower(${schema.listings.status}) NOT LIKE '%lease%'`);
  }

  return db
    .select()
    .from(schema.listings)
    .where(and(...conditions))
    .limit(5);
}

async function syncListing(
  xmlListing: XMLListing,
  stats: SyncStats,
  feedCompanyId?: number | null,
  feedId?: number | null,
  feedPriority?: number
): Promise<{ action: "created" | "updated" | "skipped" | "quarantined"; mlsId: string }> {
  const mlsId = xmlListing.ListingDetails.MlsId;

  // Find or create agent and office
  const agentId = await findOrCreateAgent(xmlListing.Agent, stats);
  const officeId = await findOrCreateOffice(xmlListing.Office, stats, feedCompanyId);

  // Compute normalized address
  const normalized = normalizeAddress(xmlListing.Location.StreetAddress);
  const unitNumber = cleanValue(xmlListing.Location.UnitNumber);

  // Prepare listing data
  const listingData: schema.NewListing = {
    mlsId,
    internalMlsId: cleanValue(xmlListing.ListingDetails.InternalMlsId),
    mlsBoard: cleanValue(xmlListing.ListingDetails.MlsBoard),
    streetAddress: xmlListing.Location.StreetAddress,
    unitNumber,
    city: xmlListing.Location.City,
    state: xmlListing.Location.State,
    zip: xmlListing.Location.Zip,
    latitude: parseNumber(xmlListing.Location.Lat),
    longitude: parseNumber(xmlListing.Location.Long),
    status: xmlListing.ListingDetails.Status,
    price: xmlListing.ListingDetails.Price,
    listingUrl: cleanValue(xmlListing.ListingDetails.ListingUrl),
    virtualTourUrl: cleanValue(xmlListing.ListingDetails.VirtualTourUrl),
    propertyType: cleanValue(xmlListing.BasicDetails.PropertyType),
    description: cleanValue(xmlListing.BasicDetails.Description),
    bedrooms: parseInt2(xmlListing.BasicDetails.Bedrooms),
    bathrooms: parseNumber(xmlListing.BasicDetails.Bathrooms)?.toString(),
    fullBathrooms: parseInt2(xmlListing.BasicDetails.FullBathrooms),
    halfBathrooms: parseInt2(xmlListing.BasicDetails.HalfBathrooms),
    livingArea: parseInt2(xmlListing.BasicDetails.LivingArea),
    lotSize: parseNumber(xmlListing.BasicDetails.LotSize)?.toString(),
    yearBuilt: parseInt2(xmlListing.BasicDetails.YearBuilt),
    petsAllowed: xmlListing.RentalDetails?.PetsAllowed?.NoPets?.toLowerCase() === "no" ? true : null,
    agentId,
    officeId,
    feedId: feedId ?? null,
    normalizedAddress: normalized,
    syncedAt: new Date(),
  };

  // ---- STEP A: Match by mlsId or known alias ----
  const byMlsId = await db
    .select()
    .from(schema.listings)
    .where(eq(schema.listings.mlsId, mlsId))
    .limit(1);

  let existingListing: schema.Listing | null = byMlsId.length > 0 ? byMlsId[0] : null;

  // Also check aliases table — a previously deduped MLS ID should route to its canonical listing
  let fromAlias = false;
  if (!existingListing) {
    const alias = await db
      .select()
      .from(schema.listingAliases)
      .where(eq(schema.listingAliases.mlsId, mlsId))
      .limit(1);

    if (alias.length > 0) {
      const canonical = await db
        .select()
        .from(schema.listings)
        .where(eq(schema.listings.id, alias[0].canonicalListingId))
        .limit(1);
      if (canonical.length > 0) {
        existingListing = canonical[0];
        fromAlias = true;
      }
    }
  }

  let matchType: "mlsId" | "address" | "none" = existingListing ? "mlsId" : "none";

  // ---- STEP B: If no mlsId match, try normalized address ----
  if (!existingListing) {
    const statusCat = getStatusCategory(xmlListing.ListingDetails.Status);
    const candidates = await findExistingByAddress(
      normalized,
      xmlListing.Location.City,
      xmlListing.Location.Zip,
      unitNumber,
      statusCat
    );

    if (candidates.length > 0) {
      // Confirm with lat/lng proximity
      const incomingLat = parseNumber(xmlListing.Location.Lat);
      const incomingLng = parseNumber(xmlListing.Location.Long);

      const confirmed = candidates.find((c) =>
        coordsMatch(c.latitude, c.longitude, incomingLat, incomingLng)
      );

      if (confirmed) {
        existingListing = confirmed;
        matchType = "address";
      } else {
        // Address matched but coordinates didn't confirm — quarantine
        await db.insert(schema.listingConflicts).values({
          existingListingId: candidates[0].id,
          incomingMlsId: mlsId,
          incomingFeedId: feedId ?? null,
          incomingData: JSON.stringify(xmlListing),
          reason: "address_match_coords_mismatch",
        });
        stats.listingsQuarantined++;
        return { action: "quarantined", mlsId };
      }
    }
  }

  // ---- STEP C: If no address match, try coordinate proximity ----
  if (!existingListing) {
    const statusCat = getStatusCategory(xmlListing.ListingDetails.Status);
    const incomingLat = parseNumber(xmlListing.Location.Lat);
    const incomingLng = parseNumber(xmlListing.Location.Long);

    const coordCandidatesRaw = await findExistingByCoords(
      incomingLat,
      incomingLng,
      unitNumber,
      statusCat,
      normalized
    );

    // Filter to only listings where one address is a prefix of the other —
    // prevents matching different units at the same building (e.g. "3911 SW 27TH ST 9" vs "3911 SW 27TH ST 10")
    const coordCandidates = coordCandidatesRaw.filter(
      (c) => c.normalizedAddress && isAddressPrefix(normalized, c.normalizedAddress)
    );

    if (coordCandidates.length === 1) {
      // Single coord match — confident enough to merge
      existingListing = coordCandidates[0];
      matchType = "address"; // treat same as address match for downstream logic
    } else if (coordCandidates.length > 1) {
      // Multiple listings at same coords — ambiguous, quarantine
      await db.insert(schema.listingConflicts).values({
        existingListingId: coordCandidates[0].id,
        incomingMlsId: mlsId,
        incomingFeedId: feedId ?? null,
        incomingData: JSON.stringify(xmlListing),
        reason: "coords_match_ambiguous",
      });
      stats.listingsQuarantined++;
      return { action: "quarantined", mlsId };
    }
  }

  // ---- STEP D: Update existing or create new ----
  let listingId: number;
  let action: "created" | "updated" | "skipped" | "quarantined";

  if (existingListing) {
    // For cross-feed address matches, check feed priority
    if (matchType === "address" && feedPriority !== undefined) {
      const existingFeedPriority = existingListing.feedId
        ? (await db.select({ priority: schema.syncFeeds.priority }).from(schema.syncFeeds).where(eq(schema.syncFeeds.id, existingListing.feedId)).limit(1))?.[0]?.priority ?? 0
        : 0;

      if (feedPriority < (existingFeedPriority ?? 0)) {
        // Incoming feed has lower priority — skip
        stats.listingsSkipped++;
        return { action: "skipped", mlsId };
      }
    }

    // Detect changes before overwriting
    const changes = detectChanges(existingListing as Record<string, unknown>, listingData as unknown as Record<string, unknown>);

    if (changes.length > 0) {
      // Check for anomalies — alias matches skip price check since price differences
      // between boards are expected for previously deduped listings
      const anomaly = fromAlias
        ? checkAnomalies(
            existingListing as Record<string, unknown>,
            listingData as unknown as Record<string, unknown>,
            changes.filter((c) => c.field !== "price"),
            matchType as "mlsId" | "address"
          )
        : checkAnomalies(
            existingListing as Record<string, unknown>,
            listingData as unknown as Record<string, unknown>,
            changes,
            matchType as "mlsId" | "address"
          );

      if (anomaly.quarantine) {
        await db.insert(schema.listingConflicts).values({
          existingListingId: existingListing.id,
          incomingMlsId: mlsId,
          incomingFeedId: feedId ?? null,
          incomingData: JSON.stringify(xmlListing),
          reason: anomaly.reason,
        });
        stats.listingsQuarantined++;
        return { action: "quarantined", mlsId };
      }

      // Record changes
      await recordChanges(changes, existingListing.id, feedId);
      stats.changesRecorded += changes.length;

      // Update price/status timestamps
      const priceChanged = changes.some((c) => c.field === "price");
      const statusChanged = changes.some((c) => c.field === "status");
      if (priceChanged) (listingData as Record<string, unknown>).priceChangedAt = new Date();
      if (statusChanged) (listingData as Record<string, unknown>).statusChangedAt = new Date();
    }

    // Update existing listing
    listingId = existingListing.id;

    // For cross-feed or alias match, keep the existing mlsId (don't overwrite with the new feed's mlsId)
    const updateData = { ...listingData, updatedAt: new Date() };
    if (matchType === "address" || fromAlias) {
      delete (updateData as Record<string, unknown>).mlsId;
    }

    await db
      .update(schema.listings)
      .set(updateData)
      .where(eq(schema.listings.id, listingId));
    action = "updated";

    // Delete existing photos and open houses (will re-add)
    await db.delete(schema.listingPhotos).where(eq(schema.listingPhotos.listingId, listingId));
    await db.delete(schema.openHouses).where(eq(schema.openHouses.listingId, listingId));
  } else {
    // Create new listing
    const [newListing] = await db
      .insert(schema.listings)
      .values(listingData)
      .returning({ id: schema.listings.id });
    listingId = newListing.id;
    action = "created";
  }

  // Add photos
  if (xmlListing.Pictures?.Picture) {
    const pictures = Array.isArray(xmlListing.Pictures.Picture)
      ? xmlListing.Pictures.Picture
      : [xmlListing.Pictures.Picture];

    const photoValues = pictures
      .map((pic, index) => ({
        listingId,
        url: pic.PictureUrl,
        caption: cleanValue(pic.Caption),
        sortOrder: index,
      }))
      .filter((p) => p.url);

    if (photoValues.length > 0) {
      await db.insert(schema.listingPhotos).values(photoValues);
      stats.photosProcessed += photoValues.length;
    }
  }

  // Add open houses
  if (xmlListing.OpenHouses?.OpenHouse) {
    const openHouseData = Array.isArray(xmlListing.OpenHouses.OpenHouse)
      ? xmlListing.OpenHouses.OpenHouse
      : [xmlListing.OpenHouses.OpenHouse];

    const openHouseValues = openHouseData
      .map((oh) => ({
        listingId,
        date: oh.Date,
        startTime: oh.StartTime,
        endTime: oh.EndTime,
      }))
      .filter((oh) => oh.date && oh.startTime && oh.endTime);

    if (openHouseValues.length > 0) {
      await db.insert(schema.openHouses).values(openHouseValues);
      stats.openHousesProcessed += openHouseValues.length;
    }
  }

  return { action, mlsId };
}

// ==========================================
// Main Sync Function
// ==========================================

/**
 * Start a new sync operation
 * Creates a sync log entry and returns its ID
 */
export async function startSync(options: SyncOptions): Promise<number> {
  const [syncLog] = await db
    .insert(schema.syncLogs)
    .values({
      feedId: options.feedId,
      status: "pending",
      trigger: options.trigger,
      triggeredBy: options.triggeredBy,
      createdAt: new Date(),
    })
    .returning({ id: schema.syncLogs.id });

  return syncLog.id;
}

/**
 * Get the current status of a sync operation
 */
export async function getSyncStatus(syncId: number): Promise<schema.SyncLog | null> {
  const [log] = await db
    .select()
    .from(schema.syncLogs)
    .where(eq(schema.syncLogs.id, syncId))
    .limit(1);

  return log || null;
}

/**
 * Get recent sync logs
 */
export async function getRecentSyncLogs(limit = 10): Promise<schema.SyncLog[]> {
  return db
    .select()
    .from(schema.syncLogs)
    .orderBy(schema.syncLogs.createdAt)
    .limit(limit);
}

function buildSyncLogData(stats: SyncStats) {
  return {
    listingsCreated: stats.listingsCreated,
    listingsUpdated: stats.listingsUpdated,
    listingsDeleted: stats.listingsDeleted,
    listingsQuarantined: stats.listingsQuarantined,
    changesRecorded: stats.changesRecorded,
    agentsCreated: stats.agentsCreated,
    agentsUpdated: stats.agentsUpdated,
    officesCreated: stats.officesCreated,
    officesUpdated: stats.officesUpdated,
    photosProcessed: stats.photosProcessed,
    openHousesProcessed: stats.openHousesProcessed,
    companyConflicts: stats.companyConflicts,
    companyConflictDetails: stats.companyConflictDetails.length > 0
      ? JSON.stringify(stats.companyConflictDetails)
      : null,
  };
}

/**
 * Execute the sync operation
 * This is the main entry point for running a sync
 */
export async function runSync(options: SyncOptions): Promise<SyncResult> {
  const startTime = Date.now();
  let syncLogId: number | null = null;

  const stats: SyncStats = {
    listingsCreated: 0,
    listingsUpdated: 0,
    listingsDeleted: 0,
    listingsSkipped: 0,
    listingsQuarantined: 0,
    changesRecorded: 0,
    agentsCreated: 0,
    agentsUpdated: 0,
    officesCreated: 0,
    officesUpdated: 0,
    photosProcessed: 0,
    openHousesProcessed: 0,
    companyConflicts: 0,
    companyConflictDetails: [],
  };

  try {
    // Create sync log entry
    syncLogId = await startSync(options);

    // Update status to running
    await db
      .update(schema.syncLogs)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(schema.syncLogs.id, syncLogId));

    // Get feed content, company ID, and priority
    let xmlContent: string;
    let feedCompanyId: number | null = null;
    let feedPriority: number | undefined;

    if (options.feedContent) {
      xmlContent = options.feedContent;
    } else {
      // Resolve feed URL, company, and priority
      let feedUrl = options.feedUrl;

      if (options.feedId) {
        const [feed] = await db
          .select({
            feedUrl: schema.syncFeeds.feedUrl,
            companyId: schema.syncFeeds.companyId,
            priority: schema.syncFeeds.priority,
          })
          .from(schema.syncFeeds)
          .where(eq(schema.syncFeeds.id, options.feedId))
          .limit(1);
        feedUrl = feed?.feedUrl || feedUrl;
        feedCompanyId = feed?.companyId || null;
        feedPriority = feed?.priority ?? undefined;
      }

      feedUrl = feedUrl || process.env.KVCORE_FEED_URL;

      if (!feedUrl) {
        throw new Error("No feed URL configured. Set KVCORE_FEED_URL environment variable or configure the feed URL.");
      }

      const response = await fetch(feedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
      }
      xmlContent = await response.text();
    }

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const result = parser.parse(xmlContent);

    const listings: XMLListing[] = result.Listings?.Listing || [];
    const totalListings = listings.length;

    // Process each listing
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      try {
        const { action } = await syncListing(listing, stats, feedCompanyId, options.feedId, feedPriority);
        if (action === "created") {
          stats.listingsCreated++;
        } else if (action === "updated") {
          stats.listingsUpdated++;
        }
        // skipped and quarantined are already counted in syncListing

        // Report progress
        if (options.onProgress) {
          options.onProgress(i + 1, totalListings);
        }
      } catch (error) {
        console.error(`Error syncing listing ${listing.ListingDetails?.MlsId}:`, error);
      }
    }

    const duration = Date.now() - startTime;

    // Update sync log with success
    await db
      .update(schema.syncLogs)
      .set({
        status: "completed",
        completedAt: new Date(),
        ...buildSyncLogData(stats),
      })
      .where(eq(schema.syncLogs.id, syncLogId));

    return { success: true, stats, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Update sync log with failure
    if (syncLogId) {
      await db
        .update(schema.syncLogs)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorMessage,
          errorStack,
          ...buildSyncLogData(stats),
        })
        .where(eq(schema.syncLogs.id, syncLogId));
    }

    return { success: false, stats, errorMessage, errorStack, duration };
  }
}

/**
 * Check if a sync is currently running
 */
export async function isSyncRunning(): Promise<boolean> {
  const [running] = await db
    .select({ id: schema.syncLogs.id })
    .from(schema.syncLogs)
    .where(eq(schema.syncLogs.status, "running"))
    .limit(1);

  return !!running;
}

/**
 * Get the last completed sync
 */
export async function getLastSync(): Promise<schema.SyncLog | null> {
  const [log] = await db
    .select()
    .from(schema.syncLogs)
    .where(eq(schema.syncLogs.status, "completed"))
    .orderBy(schema.syncLogs.completedAt)
    .limit(1);

  return log || null;
}
