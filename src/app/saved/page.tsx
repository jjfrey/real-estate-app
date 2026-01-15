"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@/components/auth/UserButton";

interface SavedListingData {
  id: number;
  listingId: number;
  savedAt: string;
  listing: {
    id: number;
    mlsId: string;
    streetAddress: string;
    city: string;
    state: string;
    zip: string;
    price: string;
    status: string;
    bedrooms: number | null;
    bathrooms: string | null;
    livingArea: number | null;
    propertyType: string | null;
    photos: string[];
  };
}

function formatPrice(price: string | number): string {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numPrice);
}

function getSlug(listing: SavedListingData["listing"]): string {
  const addressSlug = listing.streetAddress
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const citySlug = listing.city.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `/listings/${citySlug}-${listing.state.toLowerCase()}/${addressSlug}-${listing.mlsId}`;
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-green-500";
    case "pending":
      return "bg-amber-500";
    case "for rent":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

export default function SavedHomesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [savedListings, setSavedListings] = useState<SavedListingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/saved");
      return;
    }

    if (status === "authenticated") {
      fetchSavedListings();
    }
  }, [status, router]);

  const fetchSavedListings = async () => {
    try {
      const response = await fetch("/api/saved-listings");
      if (response.ok) {
        const data = await response.json();
        setSavedListings(data.savedListings);
      }
    } catch (error) {
      console.error("Error fetching saved listings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsave = async (listingId: number) => {
    // Optimistic update
    setSavedListings((prev) =>
      prev.filter((item) => item.listingId !== listingId)
    );

    try {
      const response = await fetch(`/api/saved-listings?listingId=${listingId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        // Revert on error
        fetchSavedListings();
      }
    } catch (error) {
      console.error("Error unsaving listing:", error);
      fetchSavedListings();
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#0c87f2] rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900">
                  Distinctive<span className="text-[#0c87f2]">Homes</span>
                </span>
              </Link>
              <UserButton />
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                  <div className="aspect-[4/3] bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Image
                src="/logo.png"
                alt="Harmon's Distinctive Homes"
                width={150}
                height={42}
                priority
              />
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Saved Homes</h1>
            <p className="text-gray-600 mt-1">
              {savedListings.length} {savedListings.length === 1 ? "home" : "homes"} saved
            </p>
          </div>
          <Link
            href="/search"
            className="text-[#0c87f2] hover:text-[#0068d0] font-medium flex items-center gap-1"
          >
            Browse more homes
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {savedListings.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="w-24 h-24 text-gray-300 mx-auto mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No saved homes yet
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start exploring listings and click the heart icon to save homes you love.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 bg-[#0c87f2] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#0068d0] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Start Searching
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedListings.map((item) => (
              <article
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
              >
                <Link href={getSlug(item.listing)}>
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    {item.listing.photos[0] ? (
                      <Image
                        src={item.listing.photos[0]}
                        alt={item.listing.streetAddress}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-4 left-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(
                          item.listing.status
                        )}`}
                      >
                        {item.listing.status}
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Content */}
                <div className="p-5">
                  <Link href={getSlug(item.listing)}>
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {formatPrice(item.listing.price)}
                      {item.listing.status === "For Rent" && (
                        <span className="text-base font-normal text-gray-500">/mo</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-gray-600 text-sm mb-3">
                      {item.listing.bedrooms !== null && (
                        <span><strong>{item.listing.bedrooms}</strong> bd</span>
                      )}
                      {item.listing.bathrooms !== null && (
                        <span><strong>{item.listing.bathrooms}</strong> ba</span>
                      )}
                      {item.listing.livingArea !== null && (
                        <span><strong>{item.listing.livingArea.toLocaleString()}</strong> sqft</span>
                      )}
                    </div>

                    <div className="text-gray-800 font-medium truncate">
                      {item.listing.streetAddress}
                    </div>
                    <div className="text-gray-500 text-sm">
                      {item.listing.city}, {item.listing.state} {item.listing.zip}
                    </div>
                  </Link>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      Saved {new Date(item.savedAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleUnsave(item.listingId)}
                      className="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 text-sm"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
