import { NextRequest, NextResponse } from "next/server";
import { getListingById, getListingByMlsId } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if it's a numeric ID or MLS ID
    const numericId = parseInt(id, 10);
    const listing = isNaN(numericId)
      ? await getListingByMlsId(id)
      : await getListingById(numericId);

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(listing);
  } catch (error) {
    console.error("Error fetching listing:", error);
    return NextResponse.json(
      { error: "Failed to fetch listing" },
      { status: 500 }
    );
  }
}
