import { notFound } from "next/navigation";
import { Metadata } from "next";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { getListingByMlsId, getListingById } from "@/lib/queries";
import { ListingDetail } from "@/components/listing/ListingDetail";
import { ClickIdRegistrar } from "@/components/analytics/ClickIdRegistrar";
import { db } from "@/db";
import { linkClicks } from "@/db/schema";

interface ListingPageProps {
  params: Promise<{
    slug: string[];
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: ListingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const mlsId = slug[slug.length - 1]?.split("-").pop();

  if (!mlsId) {
    return { title: "Listing Not Found | Harmon's Distinctive Homes" };
  }

  const listing = await getListingByMlsId(mlsId);

  if (!listing) {
    return { title: "Listing Not Found | Harmon's Distinctive Homes" };
  }

  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(parseFloat(listing.price));

  const title = `${listing.streetAddress}, ${listing.city}, ${listing.state} ${listing.zip} | ${price}`;
  const description = listing.description?.slice(0, 160) || `${listing.bedrooms} bed, ${listing.bathrooms} bath home for sale in ${listing.city}, ${listing.state}`;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const citySlug = listing.city.toLowerCase().replace(/\s+/g, "-");
  const addressSlug = listing.streetAddress.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const canonicalUrl = `${baseUrl}/listings/${citySlug}-${listing.state.toLowerCase()}/${addressSlug}-${listing.mlsId}`;

  const ogImages = listing.photos[0]?.url
    ? [{ url: listing.photos[0].url, width: 1200, height: 630 }]
    : [];

  return {
    title: `${title} | Harmon's Distinctive Homes`,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: "Harmon's Distinctive Homes",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: listing.photos[0]?.url ? [listing.photos[0].url] : [],
    },
  };
}

export default async function ListingPage({ params, searchParams }: ListingPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  // Extract MLS ID from the last segment
  // URL format: /listings/city-state/address-mlsid
  const lastSegment = slug[slug.length - 1];
  const mlsId = lastSegment?.split("-").pop();

  if (!mlsId) {
    notFound();
  }

  // Try to get by MLS ID first, then by numeric ID
  let listing = await getListingByMlsId(mlsId);
  if (!listing) {
    const numericId = parseInt(mlsId, 10);
    if (!isNaN(numericId)) {
      listing = await getListingById(numericId);
    }
  }

  if (!listing) {
    notFound();
  }

  // Track all detail page views
  const campaign = typeof resolvedSearchParams.c === "string" ? resolvedSearchParams.c : undefined;
  const clickId = nanoid(12);

  try {
    const headersList = await headers();
    await db.insert(linkClicks).values({
      mlsId: listing.mlsId,
      campaign: campaign || null,
      source: campaign ? "magazine" : "website",
      clickId,
      userAgent: headersList.get("user-agent") || undefined,
      ipAddress: headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      referer: headersList.get("referer") || undefined,
    });
  } catch (error) {
    console.error("Failed to record link click:", error);
  }

  return (
    <>
      <ClickIdRegistrar clickId={clickId} />
      <ListingDetail listing={listing} />
    </>
  );
}
