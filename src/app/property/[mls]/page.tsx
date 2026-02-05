import { notFound } from "next/navigation";
import { Metadata } from "next";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { getListingByMlsId } from "@/lib/queries";
import { ListingDetail } from "@/components/listing/ListingDetail";
import { ClickIdRegistrar } from "@/components/analytics/ClickIdRegistrar";
import { db } from "@/db";
import { linkClicks } from "@/db/schema";

// Disable caching to ensure click tracking runs on every request
export const dynamic = "force-dynamic";

interface PropertyPageProps {
  params: Promise<{
    mls: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: PropertyPageProps): Promise<Metadata> {
  const { mls } = await params;

  const listing = await getListingByMlsId(mls);

  if (!listing) {
    return { title: "Property Not Found | Harmon's Distinctive Homes" };
  }

  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(parseFloat(listing.price));

  const title = `${listing.streetAddress}, ${listing.city}, ${listing.state} ${listing.zip} | ${price}`;
  const description = listing.description?.slice(0, 160) || `${listing.bedrooms} bed, ${listing.bathrooms} bath home for sale in ${listing.city}, ${listing.state}`;

  return {
    title: `${title} | Harmon's Distinctive Homes`,
    description,
    openGraph: {
      title,
      description,
      images: listing.photos[0]?.url ? [listing.photos[0].url] : [],
    },
  };
}

export default async function PropertyPage({ params, searchParams }: PropertyPageProps) {
  const { mls } = await params;
  const resolvedSearchParams = await searchParams;

  const listing = await getListingByMlsId(mls);

  if (!listing) {
    notFound();
  }

  // Track all detail page views
  const campaign = typeof resolvedSearchParams.c === "string" ? resolvedSearchParams.c : undefined;
  const clickId = nanoid(12);

  try {
    const headersList = await headers();
    await db.insert(linkClicks).values({
      mlsId: mls,
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
