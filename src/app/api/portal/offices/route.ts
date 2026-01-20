import { db } from "@/db";
import { offices, listings, officeAdmins, users } from "@/db/schema";
import { asc, eq, sql, count } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";

// GET - List all offices with stats (super admin only)
export async function GET() {
  try {
    await requirePortalRole(["super_admin"]);

    // Get offices with listing counts
    const officesWithStats = await db
      .select({
        id: offices.id,
        name: offices.name,
        brokerageName: offices.brokerageName,
        phone: offices.phone,
        email: offices.email,
        city: offices.city,
        state: offices.state,
        listingCount: sql<number>`(
          SELECT COUNT(*) FROM listings WHERE listings.office_id = ${offices.id}
        )`.as("listing_count"),
        adminCount: sql<number>`(
          SELECT COUNT(*) FROM office_admins WHERE office_admins.office_id = ${offices.id}
        )`.as("admin_count"),
      })
      .from(offices)
      .orderBy(asc(offices.name), asc(offices.brokerageName));

    return Response.json({ offices: officesWithStats });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
