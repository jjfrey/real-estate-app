import { NextRequest } from "next/server";
import { db } from "@/db";
import { agents, listings, offices } from "@/db/schema";
import { eq, isNull, and, inArray, sql, like, or } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
  getAccessibleOfficeIds,
} from "@/lib/portal-auth";

// GET - Get agents that can be invited (no userId yet)
export async function GET(request: NextRequest) {
  try {
    const session = await requirePortalRole(["office_admin", "company_admin", "super_admin"]);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const officeIdParam = searchParams.get("officeId");

    // Build conditions
    const conditions: ReturnType<typeof eq>[] = [
      isNull(agents.userId), // Only agents without portal accounts
    ];

    // For office admins, filter by their offices
    if (session.user.role === "office_admin") {
      const officeIds = getAccessibleOfficeIds(session);
      if (!officeIds || officeIds.length === 0) {
        return Response.json({ agents: [] });
      }

      // We need to find agents associated with these offices through listings
      // This requires a subquery
    }

    // If specific office requested
    if (officeIdParam) {
      const officeId = parseInt(officeIdParam);
      if (session.user.role === "office_admin") {
        // Verify office admin can access this office
        const officeIds = getAccessibleOfficeIds(session);
        if (!officeIds?.includes(officeId)) {
          return Response.json({ agents: [] });
        }
      }
    }

    // Find agents through listings for the accessible offices
    const accessibleOfficeIds =
      session.user.role === "office_admin"
        ? getAccessibleOfficeIds(session)
        : officeIdParam
          ? [parseInt(officeIdParam)]
          : null;

    // Build the query
    let agentQuery;

    if (accessibleOfficeIds && accessibleOfficeIds.length > 0) {
      // Get agents that have listings in the accessible offices
      const agentIdsInOffices = db
        .selectDistinct({ agentId: listings.agentId })
        .from(listings)
        .where(
          and(
            inArray(listings.officeId, accessibleOfficeIds),
            sql`${listings.agentId} IS NOT NULL`
          )
        );

      agentQuery = db.query.agents.findMany({
        where: and(
          isNull(agents.userId),
          inArray(agents.id, agentIdsInOffices),
          search
            ? or(
                like(agents.firstName, `%${search}%`),
                like(agents.lastName, `%${search}%`),
                like(agents.email, `%${search}%`)
              )
            : undefined
        ),
        limit: 50,
        orderBy: [agents.lastName, agents.firstName],
      });
    } else {
      // Super admin without office filter - get all invitable agents
      agentQuery = db.query.agents.findMany({
        where: and(
          isNull(agents.userId),
          search
            ? or(
                like(agents.firstName, `%${search}%`),
                like(agents.lastName, `%${search}%`),
                like(agents.email, `%${search}%`)
              )
            : undefined
        ),
        limit: 50,
        orderBy: [agents.lastName, agents.firstName],
      });
    }

    const invitableAgents = await agentQuery;

    // Get office info for each agent through their listings
    const agentsWithOffice = await Promise.all(
      invitableAgents.map(async (agent) => {
        const listing = await db.query.listings.findFirst({
          where: eq(listings.agentId, agent.id),
          with: {
            office: true,
          },
        });

        return {
          id: agent.id,
          firstName: agent.firstName,
          lastName: agent.lastName,
          email: agent.email,
          phone: agent.phone,
          office: listing?.office
            ? {
                id: listing.office.id,
                name: listing.office.name,
                brokerageName: listing.office.brokerageName,
              }
            : null,
        };
      })
    );

    return Response.json({ agents: agentsWithOffice });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
