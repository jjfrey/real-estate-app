import "dotenv/config";
import { config } from "dotenv";

// Load .env.local
config({ path: ".env.local" });

import { db } from "../src/db";
import { sites, siteListingRules, leads, users, savedListings } from "../src/db/schema";
import { eq, isNull, sql } from "drizzle-orm";

async function seedSites() {
  console.log("Seeding sites and listing rules...\n");

  // Upsert sites
  const sitesData = [
    {
      id: "distinct",
      name: "Harmon's Distinctive Homes",
      domain: "distincthomes.com",
      isActive: true,
    },
    {
      id: "harmon",
      name: "HarmonHomes",
      domain: "harmonhomes.com",
      isActive: true,
    },
  ];

  for (const site of sitesData) {
    await db
      .insert(sites)
      .values(site)
      .onConflictDoUpdate({
        target: sites.id,
        set: { name: site.name, domain: site.domain, updatedAt: new Date() },
      });
    console.log(`  ✓ Site "${site.id}" → ${site.name} (${site.domain})`);
  }

  // Insert listing rules for DistinctHomes (price-filtered premier listings)
  // HarmonHomes has NO rules = shows all listings
  const distinctRules = [
    { siteId: "distinct", state: "OH", minPrice: "500000" },
    { siteId: "distinct", state: "FL", minPrice: "750000" },
    { siteId: "distinct", state: null, minPrice: "400000" }, // Default for all other states
  ];

  // Delete existing rules for distinct site before re-inserting
  await db.delete(siteListingRules).where(eq(siteListingRules.siteId, "distinct"));

  for (const rule of distinctRules) {
    await db.insert(siteListingRules).values({
      siteId: rule.siteId,
      state: rule.state,
      minPrice: rule.minPrice,
      isActive: true,
    });
    const stateLabel = rule.state || "*";
    console.log(`  ✓ Rule: distinct/${stateLabel} → minPrice $${Number(rule.minPrice).toLocaleString()}`);
  }

  // Backfill existing data: set siteId = "distinct" on all records with null siteId
  const leadsResult = await db
    .update(leads)
    .set({ siteId: "distinct" })
    .where(isNull(leads.siteId));
  console.log(`\n  ✓ Backfilled leads with siteId="distinct"`);

  const usersResult = await db
    .update(users)
    .set({ siteId: "distinct" })
    .where(eq(users.role, "consumer"));
  console.log(`  ✓ Backfilled consumer users with siteId="distinct"`);

  const savedResult = await db
    .update(savedListings)
    .set({ siteId: "distinct" })
    .where(isNull(savedListings.siteId));
  console.log(`  ✓ Backfilled saved_listings with siteId="distinct"`);

  console.log("\nDone! Sites and rules seeded successfully.");
  process.exit(0);
}

seedSites().catch((error) => {
  console.error("Failed to seed sites:", error);
  process.exit(1);
});
