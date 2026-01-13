import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, inArray } from "drizzle-orm";
import { authOptions } from "@/lib/auth/config";
import { getDb } from "@/db";
import { savedListings, listings, listingPhotos } from "@/db/schema";

// GET - Get user's saved listings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const listingIds = searchParams.get("listingIds");

    const db = getDb();

    // If listingIds provided, return which ones are saved (for checking save status)
    if (listingIds) {
      const ids = listingIds.split(",").map(Number).filter(Boolean);
      const saved = await db
        .select({ listingId: savedListings.listingId })
        .from(savedListings)
        .where(
          and(
            eq(savedListings.userId, session.user.id),
            inArray(savedListings.listingId, ids)
          )
        );

      return NextResponse.json({
        savedListingIds: saved.map((s) => s.listingId),
      });
    }

    // Otherwise return all saved listings with details
    const saved = await db
      .select({
        id: savedListings.id,
        listingId: savedListings.listingId,
        savedAt: savedListings.createdAt,
        listing: {
          id: listings.id,
          mlsId: listings.mlsId,
          streetAddress: listings.streetAddress,
          city: listings.city,
          state: listings.state,
          zip: listings.zip,
          price: listings.price,
          status: listings.status,
          bedrooms: listings.bedrooms,
          bathrooms: listings.bathrooms,
          livingArea: listings.livingArea,
          propertyType: listings.propertyType,
        },
      })
      .from(savedListings)
      .innerJoin(listings, eq(savedListings.listingId, listings.id))
      .where(eq(savedListings.userId, session.user.id))
      .orderBy(savedListings.createdAt);

    // Get photos for these listings
    const listingIdsForPhotos = saved.map((s) => s.listingId);
    const photos = listingIdsForPhotos.length > 0
      ? await db
          .select({
            listingId: listingPhotos.listingId,
            url: listingPhotos.url,
            sortOrder: listingPhotos.sortOrder,
          })
          .from(listingPhotos)
          .where(inArray(listingPhotos.listingId, listingIdsForPhotos))
          .orderBy(listingPhotos.sortOrder)
      : [];

    // Group photos by listing
    const photosByListing = photos.reduce((acc, photo) => {
      if (!acc[photo.listingId]) {
        acc[photo.listingId] = [];
      }
      acc[photo.listingId].push(photo.url);
      return acc;
    }, {} as Record<number, string[]>);

    // Combine with photos
    const savedWithPhotos = saved.map((s) => ({
      ...s,
      listing: {
        ...s.listing,
        photos: photosByListing[s.listingId] || [],
      },
    }));

    return NextResponse.json({ savedListings: savedWithPhotos });
  } catch (error) {
    console.error("Error getting saved listings:", error);
    return NextResponse.json(
      { error: "Failed to get saved listings" },
      { status: 500 }
    );
  }
}

// POST - Save a listing
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { listingId } = body;

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if listing exists
    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, listingId),
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Check if already saved
    const existing = await db.query.savedListings.findFirst({
      where: and(
        eq(savedListings.userId, session.user.id),
        eq(savedListings.listingId, listingId)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Listing already saved", saved: true },
        { status: 409 }
      );
    }

    // Save the listing
    await db.insert(savedListings).values({
      userId: session.user.id,
      listingId,
    });

    return NextResponse.json({ message: "Listing saved", saved: true }, { status: 201 });
  } catch (error) {
    console.error("Error saving listing:", error);
    return NextResponse.json(
      { error: "Failed to save listing" },
      { status: 500 }
    );
  }
}

// DELETE - Unsave a listing
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const listingId = searchParams.get("listingId");

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    await db
      .delete(savedListings)
      .where(
        and(
          eq(savedListings.userId, session.user.id),
          eq(savedListings.listingId, parseInt(listingId))
        )
      );

    return NextResponse.json({ message: "Listing unsaved", saved: false });
  } catch (error) {
    console.error("Error unsaving listing:", error);
    return NextResponse.json(
      { error: "Failed to unsave listing" },
      { status: 500 }
    );
  }
}
