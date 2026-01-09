import { NextRequest, NextResponse } from "next/server";
import { getListings, ListingFilters, ListingSort } from "@/lib/queries";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const filters: ListingFilters = {};

    if (searchParams.get("city")) {
      filters.city = searchParams.get("city")!;
    }
    if (searchParams.get("zip")) {
      filters.zip = searchParams.get("zip")!;
    }
    if (searchParams.get("status")) {
      filters.status = searchParams.getAll("status");
    }
    if (searchParams.get("propertyType")) {
      filters.propertyType = searchParams.getAll("propertyType");
    }
    if (searchParams.get("minPrice")) {
      filters.minPrice = parseInt(searchParams.get("minPrice")!, 10);
    }
    if (searchParams.get("maxPrice")) {
      filters.maxPrice = parseInt(searchParams.get("maxPrice")!, 10);
    }
    if (searchParams.get("minBeds")) {
      filters.minBeds = parseInt(searchParams.get("minBeds")!, 10);
    }
    if (searchParams.get("maxBeds")) {
      filters.maxBeds = parseInt(searchParams.get("maxBeds")!, 10);
    }
    if (searchParams.get("minBaths")) {
      filters.minBaths = parseFloat(searchParams.get("minBaths")!);
    }
    if (searchParams.get("maxBaths")) {
      filters.maxBaths = parseFloat(searchParams.get("maxBaths")!);
    }
    if (searchParams.get("minSqft")) {
      filters.minSqft = parseInt(searchParams.get("minSqft")!, 10);
    }
    if (searchParams.get("maxSqft")) {
      filters.maxSqft = parseInt(searchParams.get("maxSqft")!, 10);
    }
    if (searchParams.get("minYear")) {
      filters.minYear = parseInt(searchParams.get("minYear")!, 10);
    }
    if (searchParams.get("maxYear")) {
      filters.maxYear = parseInt(searchParams.get("maxYear")!, 10);
    }

    // Bounds (map viewport)
    const north = searchParams.get("north");
    const south = searchParams.get("south");
    const east = searchParams.get("east");
    const west = searchParams.get("west");
    if (north && south && east && west) {
      filters.bounds = {
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west),
      };
    }

    // Radius search
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius");
    if (lat && lng && radius) {
      filters.lat = parseFloat(lat);
      filters.lng = parseFloat(lng);
      filters.radius = parseFloat(radius);
    }

    // Parse sort
    const sortField = searchParams.get("sort") as "price" | "createdAt" | "bedrooms" | null;
    const sortDir = searchParams.get("sortDir") as "asc" | "desc" | null;
    const sort: ListingSort = {
      field: sortField || "createdAt",
      direction: sortDir || "desc",
    };

    // Parse pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "24", 10), 100);

    const result = await getListings(filters, sort, { page, limit });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}
