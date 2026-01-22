import { NextRequest } from "next/server";
import { db } from "@/db";
import { offices, officeAdmins, users, listings, agents, companies } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
  canManageOffice,
} from "@/lib/portal-auth";

// GET - Get single office with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePortalRole(["company_admin", "super_admin"]);
    const { id } = await params;
    const officeId = parseInt(id);

    if (isNaN(officeId)) {
      return Response.json({ error: "Invalid office ID" }, { status: 400 });
    }

    // Check if user can manage this office
    const canManage = await canManageOffice(session, officeId);
    if (!canManage) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get office details
    const office = await db.query.offices.findFirst({
      where: eq(offices.id, officeId),
    });

    if (!office) {
      return Response.json({ error: "Office not found" }, { status: 404 });
    }

    // Get company info if office belongs to a company
    let company = null;
    if (office.companyId) {
      company = await db.query.companies.findFirst({
        where: eq(companies.id, office.companyId),
        columns: {
          id: true,
          name: true,
          slug: true,
        },
      });
    }

    // Get office admins
    const adminRecords = await db.query.officeAdmins.findMany({
      where: eq(officeAdmins.officeId, officeId),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    // Get listing count
    const [listingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(listings)
      .where(eq(listings.officeId, officeId));

    // Get agents associated with this office (through listings)
    const officeAgents = await db
      .selectDistinct({
        id: agents.id,
        firstName: agents.firstName,
        lastName: agents.lastName,
        email: agents.email,
        phone: agents.phone,
        userId: agents.userId,
      })
      .from(agents)
      .innerJoin(listings, eq(listings.agentId, agents.id))
      .where(eq(listings.officeId, officeId));

    // Get user info for agents with portal accounts
    const agentsWithPortalInfo = await Promise.all(
      officeAgents.map(async (agent) => {
        let portalUser = null;
        if (agent.userId) {
          const user = await db.query.users.findFirst({
            where: eq(users.id, agent.userId),
            columns: { id: true, email: true, name: true },
          });
          portalUser = user || null;
        }
        return { ...agent, portalUser };
      })
    );

    return Response.json({
      office: {
        ...office,
        company,
        admins: adminRecords.map((r) => r.user),
        agents: agentsWithPortalInfo,
        listingCount: listingCount?.count || 0,
      },
    });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// PATCH - Update office settings
// company_admin can update lead routing settings for their offices
// super_admin can also assign company
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePortalRole(["company_admin", "super_admin"]);
    const { id } = await params;
    const officeId = parseInt(id);

    if (isNaN(officeId)) {
      return Response.json({ error: "Invalid office ID" }, { status: 400 });
    }

    // Check if user can manage this office
    const canManage = await canManageOffice(session, officeId);
    if (!canManage) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { leadRoutingEmail, routeToTeamLead, companyId } = body;

    // Verify office exists
    const office = await db.query.offices.findFirst({
      where: eq(offices.id, officeId),
    });

    if (!office) {
      return Response.json({ error: "Office not found" }, { status: 404 });
    }

    // Update office
    const updateData: Partial<typeof offices.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (leadRoutingEmail !== undefined) {
      updateData.leadRoutingEmail = leadRoutingEmail || null;
    }

    if (routeToTeamLead !== undefined) {
      updateData.routeToTeamLead = Boolean(routeToTeamLead);
    }

    // Only super_admin can change company assignment
    if (companyId !== undefined && session.user.role === "super_admin") {
      if (companyId === null) {
        updateData.companyId = null;
      } else {
        // Verify company exists
        const company = await db.query.companies.findFirst({
          where: eq(companies.id, companyId),
        });
        if (!company) {
          return Response.json({ error: "Company not found" }, { status: 404 });
        }
        updateData.companyId = companyId;
      }
    }

    const [updatedOffice] = await db
      .update(offices)
      .set(updateData)
      .where(eq(offices.id, officeId))
      .returning();

    return Response.json({ office: updatedOffice });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
