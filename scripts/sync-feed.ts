/**
 * Manual feed sync script.
 *
 * Usage:
 *   npx tsx scripts/sync-feed.ts [path-to-xml-file]
 *
 * If no file path is provided, fetches from KVCORE_FEED_URL env var.
 */
import { readFileSync } from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  // Dynamic import so dotenv runs first and DATABASE_URL is available
  const { runSync } = await import("../src/lib/sync");

  const filePath = process.argv[2];

  let feedContent: string | undefined;
  if (filePath) {
    console.log(`Reading feed from: ${filePath}`);
    feedContent = readFileSync(filePath, "utf-8");
  } else {
    console.log("No file path provided, will fetch from KVCORE_FEED_URL");
  }

  console.log("Starting sync...");
  const result = await runSync({
    trigger: "manual",
    feedContent,
    onProgress: (current, total) => {
      if (current % 100 === 0) {
        console.log(`Processed ${current}/${total} listings...`);
      }
    },
  });

  console.log("\n=== Sync Complete ===");
  console.log(`Success: ${result.success}`);
  console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
  console.log(`Created: ${result.stats.listingsCreated}`);
  console.log(`Updated: ${result.stats.listingsUpdated}`);
  console.log(`Skipped: ${result.stats.listingsSkipped}`);
  console.log(`Quarantined: ${result.stats.listingsQuarantined}`);
  console.log(`Changes recorded: ${result.stats.changesRecorded}`);
  console.log(`Agents: ${result.stats.agentsCreated} created, ${result.stats.agentsUpdated} updated`);
  console.log(`Offices: ${result.stats.officesCreated} created, ${result.stats.officesUpdated} updated`);
  console.log(`Photos: ${result.stats.photosProcessed}`);
  console.log(`Open houses: ${result.stats.openHousesProcessed}`);

  if (result.stats.listingsQuarantined > 0) {
    console.log(`\n⚠ ${result.stats.listingsQuarantined} listings were quarantined for review`);
  }
  if (result.stats.companyConflicts > 0) {
    console.log(`\n⚠ ${result.stats.companyConflicts} company conflicts detected`);
  }
  if (result.errorMessage) {
    console.error(`\nError: ${result.errorMessage}`);
  }

  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
