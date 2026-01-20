import { NextRequest } from "next/server";
import { db } from "@/db";
import { agents, users, listings, offices, leads } from "@/db/schema";
import { eq, sql, count, desc } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";

// GET - Get single agent with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePortalRole(["super_admin"]);
    const { id } = await params;
    const agentId = parseInt(id);

    if (isNaN(agentId)) {
      return Response.json({ error: "Invalid agent ID" }, { status: 400 });
    }

    // Get agent details
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
    });

    if (!agent) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get portal user info if linked
    let portalUser = null;
    if (agent.userId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, agent.userId),
        columns: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });
      portalUser = user || null;
    }

    // Get listing count
    const [listingStats] = await db
      .select({ count: count() })
      .from(listings)
      .where(eq(listings.agentId, agentId));

    // Get agent's offices (distinct offices from their listings)
    const agentOffices = await db
      .selectDistinct({
        id: offices.id,
        name: offices.name,
        brokerageName: offices.brokerageName,
        city: offices.city,
        state: offices.state,
      })
      .from(offices)
      .innerJoin(listings, eq(listings.officeId, offices.id))
      .where(eq(listings.agentId, agentId));

    // Get recent listings (last 10)
    const recentListings = await db
      .select({
        id: listings.id,
        mlsId: listings.mlsId,
        streetAddress: listings.streetAddress,
        city: listings.city,
        state: listings.state,
        price: listings.price,
        status: listings.status,
        propertyType: listings.propertyType,
        bedrooms: listings.bedrooms,
        bathrooms: listings.bathrooms,
      })
      .from(listings)
      .where(eq(listings.agentId, agentId))
      .orderBy(desc(listings.createdAt))
      .limit(10);

    // Get lead stats for this agent
    const [leadStats] = await db
      .select({ count: count() })
      .from(leads)
      .where(eq(leads.agentId, agentId));

    // Get lead breakdown by status
    const leadsByStatus = await db
      .select({
        status: leads.status,
        count: count(),
      })
      .from(leads)
      .where(eq(leads.agentId, agentId))
      .groupBy(leads.status);

    const leadStatusCounts = {
      new: 0,
      contacted: 0,
      converted: 0,
      closed: 0,
    };
    leadsByStatus.forEach((row) => {
      if (row.status && row.status in leadStatusCounts) {
        leadStatusCounts[row.status as keyof typeof leadStatusCounts] = row.count;
      }
    });

    return Response.json({
      agent: {
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        phone: agent.phone,
        licenseNum: agent.licenseNum,
        photoUrl: agent.photoUrl,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        portalUser,
        offices: agentOffices,
        stats: {
          listingCount: listingStats?.count || 0,
          leadCount: leadStats?.count || 0,
          leadsByStatus: leadStatusCounts,
        },
        recentListings,
      },
    });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
