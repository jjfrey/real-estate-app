import { NextResponse } from "next/server";
import { getCitiesWithCounts } from "@/lib/queries";

export async function GET() {
  try {
    const cities = await getCitiesWithCounts();
    return NextResponse.json(cities);
  } catch (error) {
    console.error("Error fetching cities:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}
