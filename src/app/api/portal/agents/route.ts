import { db } from "@/db";
import { agents, users, listings, offices } from "@/db/schema";
import { asc, eq, sql, isNotNull, inArray } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
  getAccessibleOfficeIds,
} from "@/lib/portal-auth";

// GET - List agents with stats
// Super admin: all agents
// Company admin: agents in their company's offices
export async function GET() {
  try {
    const session = await requirePortalRole(["company_admin", "super_admin"]);

    const accessibleOfficeIds = getAccessibleOfficeIds(session);

    // If company_admin with no offices, return empty
    if (accessibleOfficeIds !== null && accessibleOfficeIds.length === 0) {
      return Response.json({ agents: [] });
    }

    // Build agent query - for company_admin, only get agents with listings in accessible offices
    let agentQuery;
    if (accessibleOfficeIds !== null) {
      // Company admin - filter to agents with listings in accessible offices
      const agentIdsInOffices = await db
        .selectDistinct({ agentId: listings.agentId })
        .from(listings)
        .where(inArray(listings.officeId, accessibleOfficeIds));

      const agentIds = agentIdsInOffices.map((a) => a.agentId).filter((id): id is number => id !== null);

      if (agentIds.length === 0) {
        return Response.json({ agents: [] });
      }

      agentQuery = db
        .select({
          id: agents.id,
          firstName: agents.firstName,
          lastName: agents.lastName,
          email: agents.email,
          phone: agents.phone,
          userId: agents.userId,
          listingCount: sql<number>`(
            SELECT COUNT(*) FROM listings WHERE listings.agent_id = agents.id
          )`.as("listing_count"),
        })
        .from(agents)
        .where(inArray(agents.id, agentIds))
        .orderBy(asc(agents.lastName), asc(agents.firstName));
    } else {
      // Super admin - all agents
      agentQuery = db
        .select({
          id: agents.id,
          firstName: agents.firstName,
          lastName: agents.lastName,
          email: agents.email,
          phone: agents.phone,
          userId: agents.userId,
          listingCount: sql<number>`(
            SELECT COUNT(*) FROM listings WHERE listings.agent_id = agents.id
          )`.as("listing_count"),
        })
        .from(agents)
        .orderBy(asc(agents.lastName), asc(agents.firstName));
    }

    const allAgents = await agentQuery;

    // Get user info for agents with portal accounts
    const agentsWithUserInfo = await Promise.all(
      allAgents.map(async (agent) => {
        let portalUser = null;
        if (agent.userId) {
          const user = await db.query.users.findFirst({
            where: eq(users.id, agent.userId),
            columns: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          });
          portalUser = user || null;
        }

        // Get the agent's primary office from their listings
        const listing = await db.query.listings.findFirst({
          where: eq(listings.agentId, agent.id),
          with: {
            office: {
              columns: {
                id: true,
                name: true,
                brokerageName: true,
              },
            },
          },
        });

        return {
          ...agent,
          portalUser,
          office: listing?.office || null,
        };
      })
    );

    return Response.json({ agents: agentsWithUserInfo });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
