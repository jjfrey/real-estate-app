import { NextRequest } from "next/server";
import { db } from "@/db";
import { leads, listings, agents, offices, listingPhotos } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
  canAccessLead,
  PortalAuthError,
} from "@/lib/portal-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePortalRole(["agent", "office_admin", "company_admin", "super_admin"]);
    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return Response.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    // Fetch the lead with all related data
    const leadData = await db
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
        listingZip: listings.zip,
        listingPrice: listings.price,
        listingMlsId: listings.mlsId,
        listingBedrooms: listings.bedrooms,
        listingBathrooms: listings.bathrooms,
        listingPropertyType: listings.propertyType,
        // Agent info
        agentId: agents.id,
        agentFirstName: agents.firstName,
        agentLastName: agents.lastName,
        agentEmail: agents.email,
        agentPhone: agents.phone,
        // Office info
        officeId: offices.id,
        officeName: offices.name,
        officeBrokerageName: offices.brokerageName,
      })
      .from(leads)
      .leftJoin(listings, eq(leads.listingId, listings.id))
      .leftJoin(agents, eq(leads.agentId, agents.id))
      .leftJoin(offices, eq(leads.officeId, offices.id))
      .where(eq(leads.id, leadId))
      .limit(1);

    if (leadData.length === 0) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }

    const row = leadData[0];

    // Check access
    const hasAccess = await canAccessLead(session, row.agentId, row.officeId);
    if (!hasAccess) {
      throw new PortalAuthError("Forbidden", 403);
    }

    // Fetch listing photos if listing exists
    let photos: { id: number; url: string }[] = [];
    if (row.listingId) {
      const photoData = await db
        .select({ id: listingPhotos.id, url: listingPhotos.url })
        .from(listingPhotos)
        .where(eq(listingPhotos.listingId, row.listingId))
        .orderBy(listingPhotos.sortOrder)
        .limit(5);
      photos = photoData;
    }

    // Transform to nested structure
    const lead = {
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
            zip: row.listingZip,
            price: row.listingPrice,
            mlsId: row.listingMlsId,
            bedrooms: row.listingBedrooms,
            bathrooms: row.listingBathrooms,
            propertyType: row.listingPropertyType,
            photos,
          }
        : null,
      agent: row.agentId
        ? {
            id: row.agentId,
            firstName: row.agentFirstName,
            lastName: row.agentLastName,
            email: row.agentEmail,
            phone: row.agentPhone,
          }
        : null,
      office: row.officeId
        ? {
            id: row.officeId,
            name: row.officeName,
            brokerageName: row.officeBrokerageName,
          }
        : null,
    };

    return Response.json({ lead });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePortalRole(["agent", "office_admin", "company_admin", "super_admin"]);
    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return Response.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    // Fetch the lead to check access
    const existingLead = await db.query.leads.findFirst({
      where: eq(leads.id, leadId),
    });

    if (!existingLead) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }

    // Check access
    const hasAccess = await canAccessLead(
      session,
      existingLead.agentId,
      existingLead.officeId
    );
    if (!hasAccess) {
      throw new PortalAuthError("Forbidden", 403);
    }

    // Parse the update data
    const body = await request.json();
    const { status, notes } = body;

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      const validStatuses = ["new", "contacted", "converted", "closed"];
      if (!validStatuses.includes(status)) {
        return Response.json(
          { error: "Invalid status. Must be: new, contacted, converted, or closed" },
          { status: 400 }
        );
      }
      updateData.status = status;

      // Set timestamp based on status change
      const now = new Date();
      if (status === "contacted" && existingLead.status === "new") {
        updateData.contactedAt = now;
      } else if (status === "converted" && existingLead.status !== "converted") {
        updateData.convertedAt = now;
      } else if (status === "closed" && existingLead.status !== "closed") {
        updateData.closedAt = now;
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Perform the update
    const [updatedLead] = await db
      .update(leads)
      .set(updateData)
      .where(eq(leads.id, leadId))
      .returning();

    return Response.json({ lead: updatedLead });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
