"use client";

import Image from "next/image";
import Link from "next/link";
import { ListingSummary } from "@/types/listing";

interface ListingCardProps {
  listing: ListingSummary;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isHighlighted?: boolean;
}

function formatPrice(price: string | number): string {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numPrice);
}

function formatAddress(listing: ListingSummary): string {
  const parts = [listing.streetAddress];
  if (listing.unitNumber) {
    parts.push(`#${listing.unitNumber}`);
  }
  return parts.join(" ");
}

function getSlug(listing: ListingSummary): string {
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
    case "contingent":
      return "bg-orange-500";
    case "coming soon":
      return "bg-purple-500";
    default:
      return "bg-gray-500";
  }
}

export function ListingCard({
  listing,
  onMouseEnter,
  onMouseLeave,
  isHighlighted,
}: ListingCardProps) {
  return (
    <Link href={getSlug(listing)}>
      <article
        className={`group bg-white rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 ${
          isHighlighted
            ? "border-[#0c87f2] shadow-xl ring-2 ring-[#0c87f2]/20"
            : "border-gray-100 shadow-sm hover:shadow-xl"
        }`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          {listing.photoUrl ? (
            <Image
              src={listing.photoUrl}
              alt={formatAddress(listing)}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <svg
                className="w-16 h-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
                listing.status
              )}`}
            >
              {listing.status}
            </span>
          </div>
          {/* Favorite Button */}
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors group/fav"
            onClick={(e) => {
              e.preventDefault();
              // TODO: Implement favorites in Phase 3
            }}
          >
            <svg
              className="w-5 h-5 text-gray-400 group-hover/fav:text-red-500 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Price */}
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {formatPrice(listing.price)}
            {listing.status === "For Rent" && (
              <span className="text-base font-normal text-gray-500">/mo</span>
            )}
          </div>

          {/* Details */}
          <div className="flex items-center gap-4 text-gray-600 text-sm mb-3">
            {listing.bedrooms !== null && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                <strong>{listing.bedrooms}</strong> bd
              </span>
            )}
            {listing.bathrooms !== null && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                  />
                </svg>
                <strong>{listing.bathrooms}</strong> ba
              </span>
            )}
            {listing.livingArea !== null && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
                <strong>{listing.livingArea.toLocaleString()}</strong> sqft
              </span>
            )}
          </div>

          {/* Address */}
          <div className="text-gray-800 font-medium truncate">
            {formatAddress(listing)}
          </div>
          <div className="text-gray-500 text-sm">
            {listing.city}, {listing.state} {listing.zip}
          </div>
        </div>
      </article>
    </Link>
  );
}
