import { db } from "@/db";
import { agents, users, listings } from "@/db/schema";
import { asc, eq, sql, isNotNull } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";

// GET - List all agents with stats (super admin only)
export async function GET() {
  try {
    await requirePortalRole(["super_admin"]);

    const allAgents = await db
      .select({
        id: agents.id,
        firstName: agents.firstName,
        lastName: agents.lastName,
        email: agents.email,
        phone: agents.phone,
        userId: agents.userId,
        listingCount: sql<number>`(
          SELECT COUNT(*) FROM listings WHERE listings.agent_id = ${agents.id}
        )`.as("listing_count"),
      })
      .from(agents)
      .orderBy(asc(agents.lastName), asc(agents.firstName));

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
