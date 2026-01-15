import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getListingByMlsId } from "@/lib/queries";
import { ListingDetail } from "@/components/listing/ListingDetail";

interface PropertyPageProps {
  params: Promise<{
    mls: string;
  }>;
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

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { mls } = await params;

  const listing = await getListingByMlsId(mls);

  if (!listing) {
    notFound();
  }

  return <ListingDetail listing={listing} />;
}
