import { XMLParser } from "fast-xml-parser";
import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

interface XMLListing {
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

async function findOrCreateAgent(agentData: XMLListing["Agent"]): Promise<number | null> {
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

  return newAgent.id;
}

async function findOrCreateOffice(officeData: XMLListing["Office"]): Promise<number | null> {
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

  return newOffice.id;
}

async function syncListing(xmlListing: XMLListing): Promise<{ action: "created" | "updated"; mlsId: string }> {
  const mlsId = xmlListing.ListingDetails.MlsId;

  // Find or create agent and office
  const agentId = await findOrCreateAgent(xmlListing.Agent);
  const officeId = await findOrCreateOffice(xmlListing.Office);

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
    }
  }

  return { action, mlsId };
}

async function main() {
  const feedPath = process.argv[2] || "/Users/jfrey/work/kvcore_listings.xml";

  console.log(`Reading feed from: ${feedPath}`);
  const xmlContent = readFileSync(feedPath, "utf-8");

  console.log("Parsing XML...");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const result = parser.parse(xmlContent);

  const listings: XMLListing[] = result.Listings?.Listing || [];
  console.log(`Found ${listings.length} listings in feed`);

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    try {
      const { action, mlsId } = await syncListing(listing);
      if (action === "created") {
        created++;
      } else {
        updated++;
      }

      if ((i + 1) % 100 === 0) {
        console.log(`Processed ${i + 1}/${listings.length} listings...`);
      }
    } catch (error) {
      errors++;
      console.error(`Error syncing listing ${listing.ListingDetails?.MlsId}:`, error);
    }
  }

  console.log("\n=== Sync Complete ===");
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${listings.length}`);

  await client.end();
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
