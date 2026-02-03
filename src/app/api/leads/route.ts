import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads, listings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendLeadNotificationEmail } from "@/lib/email";

interface LeadRequest {
  listingId: number;
  leadType: "info_request" | "tour_request";
  name: string;
  email: string;
  phone?: string;
  message?: string;
  preferredTourDate?: string;
  preferredTourTime?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LeadRequest = await request.json();

    // Validate required fields
    if (!body.listingId || !body.leadType || !body.name || !body.email) {
      return NextResponse.json(
        { error: "Missing required fields: listingId, leadType, name, email" },
        { status: 400 }
      );
    }

    // Validate lead type
    if (!["info_request", "tour_request"].includes(body.leadType)) {
      return NextResponse.json(
        { error: "Invalid leadType. Must be 'info_request' or 'tour_request'" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Get listing with agent and office details for notification
    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, body.listingId),
      columns: {
        id: true,
        agentId: true,
        officeId: true,
        streetAddress: true,
        city: true,
        state: true,
        price: true,
        mlsId: true,
      },
      with: {
        agent: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        office: {
          columns: {
            id: true,
            routeToTeamLead: true,
            leadRoutingEmail: true,
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Create the lead
    const [newLead] = await db
      .insert(leads)
      .values({
        listingId: body.listingId,
        agentId: listing.agentId,
        officeId: listing.officeId,
        leadType: body.leadType,
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        message: body.message || null,
        preferredTourDate: body.preferredTourDate || null,
        preferredTourTime: body.preferredTourTime || null,
        status: "new",
      })
      .returning();

    // Send notification email
    // Determine recipient: if routeToTeamLead AND leadRoutingEmail set, use that; otherwise use agent email
    let notificationRecipient: string | null = null;

    if (listing.office?.routeToTeamLead && listing.office?.leadRoutingEmail) {
      notificationRecipient = listing.office.leadRoutingEmail;
    } else if (listing.agent?.email) {
      notificationRecipient = listing.agent.email;
    }

    if (notificationRecipient) {
      // Build listing URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const citySlug = listing.city?.toLowerCase().replace(/\s+/g, "-") || "unknown";
      const stateSlug = listing.state?.toLowerCase() || "fl";
      const addressSlug = listing.streetAddress?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "property";
      const listingUrl = `${baseUrl}/listings/${citySlug}-${stateSlug}/${addressSlug}-${listing.mlsId}`;
      const portalUrl = `${baseUrl}/portal/leads`;

      // Format price
      const formattedPrice = listing.price
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(listing.price))
        : "Price not available";

      try {
        await sendLeadNotificationEmail({
          to: notificationRecipient,
          leadType: body.leadType,
          leadName: body.name,
          leadEmail: body.email,
          leadPhone: body.phone,
          leadMessage: body.message,
          preferredTourDate: body.preferredTourDate,
          preferredTourTime: body.preferredTourTime,
          listingAddress: listing.streetAddress || "Address not available",
          listingCity: listing.city || "",
          listingState: listing.state || "",
          listingPrice: formattedPrice,
          listingUrl,
          portalUrl,
        });
        console.log(`[Leads] Notification email sent to ${notificationRecipient} for lead ${newLead.id}`);
      } catch (emailError) {
        // Log error but don't fail the request - lead was still created
        console.error(`[Leads] Failed to send notification email for lead ${newLead.id}:`, emailError);
      }
    } else {
      console.log(`[Leads] No notification recipient found for lead ${newLead.id} - no agent email or team lead routing configured`);
    }

    return NextResponse.json(
      {
        success: true,
        lead: {
          id: newLead.id,
          leadType: newLead.leadType,
          status: newLead.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
