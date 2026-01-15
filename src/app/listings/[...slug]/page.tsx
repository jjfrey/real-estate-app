import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getListingByMlsId, getListingById } from "@/lib/queries";
import { ListingDetail } from "@/components/listing/ListingDetail";

interface ListingPageProps {
  params: Promise<{
    slug: string[];
  }>;
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

export default async function ListingPage({ params }: ListingPageProps) {
  const { slug } = await params;

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

  return <ListingDetail listing={listing} />;
}
