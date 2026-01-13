import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads, listings } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    // Get listing to find agent and office IDs
    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, body.listingId),
      columns: {
        id: true,
        agentId: true,
        officeId: true,
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
