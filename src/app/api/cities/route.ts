import { NextResponse } from "next/server";
import { getCitiesWithCounts } from "@/lib/queries";
import { getSiteId } from "@/lib/site-config";

export async function GET() {
  try {
    const cities = await getCitiesWithCounts(getSiteId());
    return NextResponse.json(cities);
  } catch (error) {
    console.error("Error fetching cities:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}
