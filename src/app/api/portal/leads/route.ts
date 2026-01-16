import { NextRequest } from "next/server";
import { db } from "@/db";
import { leads, listings, agents, offices } from "@/db/schema";
import { eq, and, inArray, desc, asc, sql, count } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
  getAccessibleOfficeIds,
} from "@/lib/portal-auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requirePortalRole(["agent", "office_admin", "super_admin"]);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const agentId = searchParams.get("agentId");
    const officeId = searchParams.get("officeId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sort = searchParams.get("sort") || "createdAt";
    const sortDir = searchParams.get("sortDir") || "desc";

    const offset = (page - 1) * limit;

    // Build where conditions based on role
    const conditions: ReturnType<typeof eq>[] = [];

    // Role-based filtering
    if (session.user.role === "agent" && session.agent) {
      // Agents can only see their own leads
      conditions.push(eq(leads.agentId, session.agent.id));
    } else if (session.user.role === "office_admin") {
      // Office admins can see leads for their offices
      const officeIds = getAccessibleOfficeIds(session);
      if (officeIds && officeIds.length > 0) {
        conditions.push(inArray(leads.officeId, officeIds));
      } else {
        // No offices assigned, return empty
        return Response.json({
          leads: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
    }
    // Super admin sees all - no additional conditions

    // Optional filters (only super_admin can filter by agent/office)
    if (status) {
      conditions.push(eq(leads.status, status));
    }

    if (agentId && session.user.role === "super_admin") {
      conditions.push(eq(leads.agentId, parseInt(agentId)));
    }

    if (officeId && session.user.role === "super_admin") {
      conditions.push(eq(leads.officeId, parseInt(officeId)));
    }

    // Build the where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(leads)
      .where(whereClause);

    // Determine sort column and direction
    const sortColumn = sort === "status" ? leads.status : leads.createdAt;
    const orderBy = sortDir === "asc" ? asc(sortColumn) : desc(sortColumn);

    // Fetch leads with related data
    const leadsData = await db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        leadType: leads.leadType,
        message: leads.message,
        status: leads.status,
        notes: leads.notes,
        preferredTourDate: leads.preferredTourDate,
        preferredTourTime: leads.preferredTourTime,
        createdAt: leads.createdAt,
        contactedAt: leads.contactedAt,
        convertedAt: leads.convertedAt,
        closedAt: leads.closedAt,
        // Listing info
        listingId: listings.id,
        listingAddress: listings.streetAddress,
        listingCity: listings.city,
        listingState: listings.state,
        listingPrice: listings.price,
        listingMlsId: listings.mlsId,
        // Agent info
        agentId: agents.id,
        agentFirstName: agents.firstName,
        agentLastName: agents.lastName,
        // Office info
        officeId: offices.id,
        officeName: offices.name,
      })
      .from(leads)
      .leftJoin(listings, eq(leads.listingId, listings.id))
      .leftJoin(agents, eq(leads.agentId, agents.id))
      .leftJoin(offices, eq(leads.officeId, offices.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Transform the flat result into nested structure
    const transformedLeads = leadsData.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      leadType: row.leadType,
      message: row.message,
      status: row.status,
      notes: row.notes,
      preferredTourDate: row.preferredTourDate,
      preferredTourTime: row.preferredTourTime,
      createdAt: row.createdAt,
      contactedAt: row.contactedAt,
      convertedAt: row.convertedAt,
      closedAt: row.closedAt,
      listing: row.listingId
        ? {
            id: row.listingId,
            streetAddress: row.listingAddress,
            city: row.listingCity,
            state: row.listingState,
            price: row.listingPrice,
            mlsId: row.listingMlsId,
          }
        : null,
      agent: row.agentId
        ? {
            id: row.agentId,
            firstName: row.agentFirstName,
            lastName: row.agentLastName,
          }
        : null,
      office: row.officeId
        ? {
            id: row.officeId,
            name: row.officeName,
          }
        : null,
    }));

    return Response.json({
      leads: transformedLeads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
