import { db } from "@/db";
import { offices, listings, officeAdmins, users } from "@/db/schema";
import { asc, eq, sql, count, inArray } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
  getAccessibleOfficeIds,
} from "@/lib/portal-auth";

// GET - List offices with stats
// Super admin: all offices
// Company admin: offices in their companies
export async function GET() {
  try {
    const session = await requirePortalRole(["company_admin", "super_admin"]);

    // Get accessible office IDs for company_admin
    const accessibleOfficeIds = getAccessibleOfficeIds(session);

    // Build the query
    const query = db
      .select({
        id: offices.id,
        name: offices.name,
        brokerageName: offices.brokerageName,
        phone: offices.phone,
        email: offices.email,
        city: offices.city,
        state: offices.state,
        companyId: offices.companyId,
        listingCount: sql<number>`(
          SELECT COUNT(*) FROM listings WHERE listings.office_id = offices.id
        )`.as("listing_count"),
        adminCount: sql<number>`(
          SELECT COUNT(*) FROM office_admins WHERE office_admins.office_id = offices.id
        )`.as("admin_count"),
      })
      .from(offices)
      .orderBy(asc(offices.name), asc(offices.brokerageName));

    // Filter by accessible offices for company_admin
    let officesWithStats;
    if (accessibleOfficeIds !== null && accessibleOfficeIds.length > 0) {
      officesWithStats = await query.where(inArray(offices.id, accessibleOfficeIds));
    } else if (accessibleOfficeIds !== null && accessibleOfficeIds.length === 0) {
      // No accessible offices
      return Response.json({ offices: [] });
    } else {
      // Super admin - all offices
      officesWithStats = await query;
    }

    return Response.json({ offices: officesWithStats });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
