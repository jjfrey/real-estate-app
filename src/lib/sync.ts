import { XMLParser } from "fast-xml-parser";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

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

export interface SyncStats {
  listingsCreated: number;
  listingsUpdated: number;
  listingsDeleted: number;
  agentsCreated: number;
  agentsUpdated: number;
  officesCreated: number;
  officesUpdated: number;
  photosProcessed: number;
  openHousesProcessed: number;
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
  stats: SyncStats
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
    stats.officesUpdated++;
    return existing[0].id;
  }

  // Create new office
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
    })
    .returning({ id: schema.offices.id });

  stats.officesCreated++;
  return newOffice.id;
}

async function syncListing(
  xmlListing: XMLListing,
  stats: SyncStats
): Promise<{ action: "created" | "updated"; mlsId: string }> {
  const mlsId = xmlListing.ListingDetails.MlsId;

  // Find or create agent and office
  const agentId = await findOrCreateAgent(xmlListing.Agent, stats);
  const officeId = await findOrCreateOffice(xmlListing.Office, stats);

  // Prepare listing data
  const listingData: schema.NewListing = {
    mlsId,
    internalMlsId: cleanValue(xmlListing.ListingDetails.InternalMlsId),
    mlsBoard: cleanValue(xmlListing.ListingDetails.MlsBoard),
    streetAddress: xmlListing.Location.StreetAddress,
    unitNumber: cleanValue(xmlListing.Location.UnitNumber),
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
    syncedAt: new Date(),
  };

  // Check if listing exists
  const existing = await db
    .select({ id: schema.listings.id })
    .from(schema.listings)
    .where(eq(schema.listings.mlsId, mlsId))
    .limit(1);

  let listingId: number;
  let action: "created" | "updated";

  if (existing.length > 0) {
    // Update existing listing
    listingId = existing[0].id;
    await db
      .update(schema.listings)
      .set({ ...listingData, updatedAt: new Date() })
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
    agentsCreated: 0,
    agentsUpdated: 0,
    officesCreated: 0,
    officesUpdated: 0,
    photosProcessed: 0,
    openHousesProcessed: 0,
  };

  try {
    // Create sync log entry
    syncLogId = await startSync(options);

    // Update status to running
    await db
      .update(schema.syncLogs)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(schema.syncLogs.id, syncLogId));

    // Get feed content
    let xmlContent: string;
    if (options.feedContent) {
      xmlContent = options.feedContent;
    } else {
      // Resolve feed URL - check feed record first, then options, then env var
      let feedUrl = options.feedUrl;

      if (!feedUrl && options.feedId) {
        const [feed] = await db
          .select({ feedUrl: schema.syncFeeds.feedUrl })
          .from(schema.syncFeeds)
          .where(eq(schema.syncFeeds.id, options.feedId))
          .limit(1);
        feedUrl = feed?.feedUrl || undefined;
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
        const { action } = await syncListing(listing, stats);
        if (action === "created") {
          stats.listingsCreated++;
        } else {
          stats.listingsUpdated++;
        }

        // Report progress
        if (options.onProgress) {
          options.onProgress(i + 1, totalListings);
        }
      } catch (error) {
        console.error(`Error syncing listing ${listing.ListingDetails?.MlsId}:`, error);
        // Continue processing other listings
      }
    }

    const duration = Date.now() - startTime;

    // Update sync log with success
    await db
      .update(schema.syncLogs)
      .set({
        status: "completed",
        completedAt: new Date(),
        ...stats,
      })
      .where(eq(schema.syncLogs.id, syncLogId));

    return {
      success: true,
      stats,
      duration,
    };
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
          ...stats,
        })
        .where(eq(schema.syncLogs.id, syncLogId));
    }

    return {
      success: false,
      stats,
      errorMessage,
      errorStack,
      duration,
    };
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
