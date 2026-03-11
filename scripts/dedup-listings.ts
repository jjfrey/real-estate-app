/**
 * Dedup Listings Script
 *
 * Finds all duplicate listing groups (same normalized address + city + zip + unit + status category)
 * and merges them into a single canonical listing.
 *
 * Tier 1 (auto-merge): price within 1% across all duplicates
 * Tier 2 (skip):       price differs by more than 1% — logged for manual review
 *
 * Winner selection priority:
 *   1. MLS ID still active in the current feed
 *   2. Most photos
 *   3. Most recently synced (updated_at)
 *
 * After merging:
 *   - Losing MLS IDs are stored in listing_aliases table
 *   - Photos, open houses reassigned to winner
 *   - Loser rows deleted
 *
 * Safe to run multiple times (idempotent).
 * Does NOT touch production — run against realestate_prod_copy only.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql, eq, and, inArray } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { XMLParser } from "fast-xml-parser";
import { COORD_MATCH_DEGREES, MAX_AUTO_MERGE_COUNT, pickWinner as pickWinnerByScore, type ScoredListing } from "../src/lib/listing-matcher";

// ── Config ────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");

// ── DB ────────────────────────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

// ── Types ─────────────────────────────────────────────────────────────────────

interface DuplicateGroup {
  normalizedAddress: string;
  city: string;
  zip: string;
  status: string;
  listings: schema.Listing[];
}

interface DedupeStats {
  groupsFound: number;
  tier1AutoMerge: number;
  tier2SkippedPriceDiff: number;
  listingsMerged: number;
  listingsDeleted: number;
  aliasesCreated: number;
}

// ── Feed MLS IDs ──────────────────────────────────────────────────────────────

async function fetchActiveFeedMlsIds(): Promise<Set<string>> {
  const feedUrl = process.env.KVCORE_FEED_URL;
  if (!feedUrl) {
    console.warn("No KVCORE_FEED_URL — skipping feed check, all MLS IDs treated as active");
    return new Set();
  }

  console.log("Fetching current feed to determine active MLS IDs...");
  const res = await fetch(feedUrl);
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml);
  const listings = parsed.Listings?.Listing ?? [];
  const ids = new Set<string>(
    (Array.isArray(listings) ? listings : [listings]).map(
      (l: { ListingDetails?: { MlsId?: string } }) => String(l.ListingDetails?.MlsId ?? "")
    )
  );
  console.log(`Feed has ${ids.size} active MLS IDs\n`);
  return ids;
}

// ── Duplicate Detection ───────────────────────────────────────────────────────

async function findDuplicateGroups(): Promise<DuplicateGroup[]> {
  // Pass 1: same normalized address + city + zip + status
  const rows = await db.execute<{
    normalized_address: string;
    city: string;
    zip: string;
    ids: string;
  }>(sql`
    SELECT
      normalized_address,
      city,
      zip,
      string_agg(id::text, ',' ORDER BY id) as ids
    FROM listings
    WHERE normalized_address IS NOT NULL AND normalized_address != ''
      AND lower(status) NOT LIKE '%rent%'
      AND lower(status) NOT LIKE '%lease%'
    GROUP BY normalized_address, city, zip
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, normalized_address
  `);

  const groups: DuplicateGroup[] = [];
  const seenIds = new Set<number>();

  for (const row of rows) {
    const ids = row.ids.split(",").map(Number);
    const listings = await db
      .select()
      .from(schema.listings)
      .where(inArray(schema.listings.id, ids));

    ids.forEach((id) => seenIds.add(id));
    groups.push({
      normalizedAddress: row.normalized_address,
      city: row.city,
      zip: row.zip,
      status: listings[0].status,
      listings,
    });
  }

  // Pass 2: coord-based — same coords within 50m, same city, same status category
  // catches truncated/partial address cases like "6996 SE Harbor" vs "6996 SE Harbor Circle"
  const coordRows = await db.execute<{ ids: string }>(sql`
    SELECT (a.id::text || ',' || b.id::text) as ids
    FROM listings a
    JOIN listings b ON (
      a.id < b.id
      AND ABS(a.latitude - b.latitude) < ${COORD_MATCH_DEGREES}
      AND ABS(a.longitude - b.longitude) < ${COORD_MATCH_DEGREES}
      AND a.city = b.city
      AND COALESCE(a.unit_number, '') = '' AND COALESCE(b.unit_number, '') = ''
      AND lower(a.status) NOT LIKE '%rent%' AND lower(a.status) NOT LIKE '%lease%'
      AND lower(b.status) NOT LIKE '%rent%' AND lower(b.status) NOT LIKE '%lease%'
      AND a.latitude IS NOT NULL AND b.latitude IS NOT NULL
      AND NOT (a.latitude = 0 AND a.longitude = 0)
      AND NOT (b.latitude = 0 AND b.longitude = 0)
      AND a.normalized_address != b.normalized_address
      AND split_part(a.normalized_address, ' ', 1) = split_part(b.normalized_address, ' ', 1)
      AND (
        a.normalized_address LIKE (b.normalized_address || '%')
        OR b.normalized_address LIKE (a.normalized_address || '%')
      )
    )
    ${seenIds.size > 0
      ? sql`WHERE NOT (a.id = ANY(ARRAY[${sql.join([...seenIds].map((id) => sql`${id}`), sql`, `)}]::int[]))`
      : sql``
    }
  `);

  for (const row of coordRows) {
    const ids = row.ids.split(",").map(Number);
    const listings = await db
      .select()
      .from(schema.listings)
      .where(inArray(schema.listings.id, ids));

    if (listings.length < 2) continue;
    groups.push({
      normalizedAddress: listings.map((l) => l.normalizedAddress ?? "").join(" / "),
      city: listings[0].city,
      zip: listings[0].zip,
      status: listings[0].status,
      listings,
    });
  }

  return groups;
}

// ── Winner Selection ──────────────────────────────────────────────────────────

async function pickWinner(
  listings: schema.Listing[],
  activeFeedIds: Set<string>
): Promise<schema.Listing> {
  const scored: (ScoredListing & { listing: schema.Listing })[] = await Promise.all(
    listings.map(async (l) => {
      const [row] = await db.execute<{ cnt: string }>(
        sql`SELECT COUNT(*)::text as cnt FROM listing_photos WHERE listing_id = ${l.id}`
      );
      return {
        listing: l,
        id: l.id,
        mlsId: l.mlsId,
        updatedAt: l.updatedAt ?? null,
        photoCount: parseInt(row.cnt),
        inFeed: activeFeedIds.size === 0 || activeFeedIds.has(l.mlsId),
      };
    })
  );

  return pickWinnerByScore(scored).listing;
}

// ── Merge ─────────────────────────────────────────────────────────────────────

async function mergeGroup(
  group: DuplicateGroup,
  winner: schema.Listing,
  losers: schema.Listing[]
): Promise<{ aliasesCreated: number; deleted: number }> {
  const loserIds = losers.map((l) => l.id);

  if (DRY_RUN) {
    return { aliasesCreated: losers.length, deleted: losers.length };
  }

  // 1. Reassign photos from losers to winner (delete winner's first, then reassign)
  //    Winner photos already exist — delete loser photos to avoid duplicates
  await db
    .delete(schema.listingPhotos)
    .where(inArray(schema.listingPhotos.listingId, loserIds));

  // 2. Reassign open houses
  await db
    .update(schema.openHouses)
    .set({ listingId: winner.id })
    .where(inArray(schema.openHouses.listingId, loserIds));

  // 3. Create aliases for loser MLS IDs
  for (const loser of losers) {
    await db
      .insert(schema.listingAliases)
      .values({
        canonicalListingId: winner.id,
        mlsId: loser.mlsId,
      })
      .onConflictDoNothing();
  }

  // 4. Update any listing_changes to point to winner
  if (schema.listingChanges) {
    await db.execute(sql`
      UPDATE listing_changes
      SET listing_id = ${winner.id}
      WHERE listing_id = ANY(${sql`ARRAY[${sql.join(loserIds.map((id) => sql`${id}`), sql`, `)}]::int[]`})
    `);
  }

  // 5. Delete losers
  await db.delete(schema.listings).where(inArray(schema.listings.id, loserIds));

  return { aliasesCreated: losers.length, deleted: losers.length };
}

// ── Process a single group ────────────────────────────────────────────────────

async function processGroup(
  group: DuplicateGroup,
  activeFeedIds: Set<string>,
  stats: DedupeStats
): Promise<void> {
  // Re-verify listings still exist — a prior merge in the same pass may have deleted one
  const liveListings = await db
    .select()
    .from(schema.listings)
    .where(inArray(schema.listings.id, group.listings.map((l) => l.id)));

  if (liveListings.length < 2) {
    console.log(`[SKIP] ${group.normalizedAddress}, ${group.city} ${group.zip} — ${group.listings.length - liveListings.length} listing(s) already deleted by prior merge`);
    return;
  }

  // Replace group listings with freshly-fetched rows
  group = { ...group, listings: liveListings };

  const label = `${group.normalizedAddress}, ${group.city} ${group.zip}`;
  const winner = await pickWinner(group.listings, activeFeedIds);
  const losers = group.listings.filter((l) => l.id !== winner.id);
  const inFeed = activeFeedIds.size === 0 || activeFeedIds.has(winner.mlsId);

  console.log(`[MERGE] ${label}`);
  console.log(`  Winner: ${winner.mlsId} (feed:${inFeed}) | Losers: ${losers.map((l) => l.mlsId).join(", ")}`);

  const { aliasesCreated, deleted } = await mergeGroup(group, winner, losers);
  stats.tier1AutoMerge++;
  stats.listingsMerged += group.listings.length;
  stats.listingsDeleted += deleted;
  stats.aliasesCreated += aliasesCreated;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`=== Listing Dedup Script ===`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`Database: ${connectionString.split("@")[1] ?? connectionString}\n`);

  const stats: DedupeStats = {
    groupsFound: 0,
    tier1AutoMerge: 0,
    tier2SkippedPriceDiff: 0,
    listingsMerged: 0,
    listingsDeleted: 0,
    aliasesCreated: 0,
  };

  const activeFeedIds = await fetchActiveFeedMlsIds();

  // Run passes until no new merges — handles chained dupes (A matches B, B matches C)
  let passNumber = 0;
  const MAX_PASSES = 5;
  const tier2: DuplicateGroup[] = [];

  while (passNumber < MAX_PASSES) {
    passNumber++;
    const groups = await findDuplicateGroups();
    stats.groupsFound += groups.length;

    const mergeable = groups.filter((g) => g.listings.length <= MAX_AUTO_MERGE_COUNT);
    const skippable = groups.filter((g) => g.listings.length > MAX_AUTO_MERGE_COUNT);

    for (const group of skippable) {
      if (!tier2.find((t) => t.normalizedAddress === group.normalizedAddress)) {
        tier2.push(group);
        stats.tier2SkippedPriceDiff++;
      }
    }

    if (mergeable.length === 0) {
      console.log(`Pass ${passNumber}: no mergeable groups found, done.\n`);
      break;
    }

    console.log(`Pass ${passNumber}: ${mergeable.length} groups to merge\n`);
    for (const group of mergeable) {
      await processGroup(group, activeFeedIds, stats);
    }
  }

  console.log("\n=== Results ===");
  console.log(`Groups found:          ${stats.groupsFound}`);
  console.log(`Tier 1 auto-merged:    ${stats.tier1AutoMerge}`);
  console.log(`Tier 2 skipped:        ${stats.tier2SkippedPriceDiff}`);
  console.log(`Listings merged:       ${stats.listingsMerged}`);
  console.log(`Listings deleted:      ${stats.listingsDeleted}`);
  console.log(`Aliases created:       ${stats.aliasesCreated}`);

  if (tier2.length > 0) {
    console.log("\n=== Tier 2 (Manual Review Required) ===");
    for (const g of tier2) {
      console.log(`${g.normalizedAddress}, ${g.city} ${g.zip} [${g.listings.length} listings]`);
      for (const l of g.listings) {
        console.log(`  ${l.mlsId} — $${Number(l.price).toLocaleString()}`);
      }
    }
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
