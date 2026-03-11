/**
 * One-time backfill script to compute normalizedAddress for existing listings.
 *
 * Run after schema migration:
 *   npx tsx scripts/backfill-normalized-addresses.ts
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { normalizeAddress } = await import("../src/lib/normalize-address");
  const { db } = await import("../src/db");
  const { listings } = await import("../src/db/schema");
  const { isNull, eq } = await import("drizzle-orm");

  // Find all listings without a normalizedAddress
  const toUpdate = await db
    .select({ id: listings.id, streetAddress: listings.streetAddress })
    .from(listings)
    .where(isNull(listings.normalizedAddress));

  console.log(`Found ${toUpdate.length} listings to backfill`);

  const BATCH_SIZE = 100;
  let updated = 0;

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE);

    for (const listing of batch) {
      const normalized = normalizeAddress(listing.streetAddress);
      await db
        .update(listings)
        .set({ normalizedAddress: normalized })
        .where(eq(listings.id, listing.id));
      updated++;
    }

    console.log(`Updated ${Math.min(updated, toUpdate.length)}/${toUpdate.length}`);
  }

  console.log("Backfill complete");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
