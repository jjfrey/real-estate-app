import { db } from "@/db";
import { listings, agents, offices, listingPhotos } from "@/db/schema";
import { sql, count, max } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";

// GET - Get sync stats (super admin only)
export async function GET() {
  try {
    await requirePortalRole(["super_admin"]);

    // Get listing counts by status
    const listingStats = await db
      .select({
        status: listings.status,
        count: count(),
      })
      .from(listings)
      .groupBy(listings.status);

    // Get total counts
    const [totalListings] = await db.select({ count: count() }).from(listings);
    const [totalAgents] = await db.select({ count: count() }).from(agents);
    const [totalOffices] = await db.select({ count: count() }).from(offices);
    const [totalPhotos] = await db.select({ count: count() }).from(listingPhotos);

    // Get latest listing update
    const [latestListing] = await db
      .select({
        updatedAt: max(listings.updatedAt),
      })
      .from(listings);

    // Get property type breakdown
    const propertyTypes = await db
      .select({
        type: listings.propertyType,
        count: count(),
      })
      .from(listings)
      .groupBy(listings.propertyType);

    // Get city breakdown (top 10)
    const cities = await db
      .select({
        city: listings.city,
        count: count(),
      })
      .from(listings)
      .groupBy(listings.city)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    return Response.json({
      totals: {
        listings: totalListings?.count || 0,
        agents: totalAgents?.count || 0,
        offices: totalOffices?.count || 0,
        photos: totalPhotos?.count || 0,
      },
      byStatus: listingStats.reduce(
        (acc, item) => {
          acc[item.status || "unknown"] = item.count;
          return acc;
        },
        {} as Record<string, number>
      ),
      byPropertyType: propertyTypes.reduce(
        (acc, item) => {
          acc[item.type || "unknown"] = item.count;
          return acc;
        },
        {} as Record<string, number>
      ),
      topCities: cities.map((c) => ({
        city: c.city,
        count: c.count,
      })),
      lastUpdated: latestListing?.updatedAt || null,
    });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
