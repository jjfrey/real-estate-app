import { NextRequest, NextResponse } from "next/server";
import { searchAutocomplete } from "@/lib/queries";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 20);

    if (query.length < 2) {
      return NextResponse.json([]);
    }

    const results = await searchAutocomplete(query, limit);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error in autocomplete:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
