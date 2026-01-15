import Image from "next/image";
import Link from "next/link";
import { MobilePhotoGallery } from "@/components/listing/MobilePhotoGallery";
import { ContactAgentCard } from "@/components/listing/ContactAgentCard";
import { SaveButton } from "@/components/listing/SaveButton";
import { PhotoGalleryButton } from "@/components/listing/PhotoGallery";
import { BackToSearch } from "@/components/listing/BackToSearch";

interface ListingPhoto {
  id: number;
  url: string;
}

interface OpenHouse {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
}

interface Agent {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
}

interface Office {
  id: number;
  name: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  logoUrl: string | null;
}

export interface ListingDetailData {
  id: number;
  mlsId: string;
  status: string;
  price: string;
  streetAddress: string;
  unitNumber: string | null;
  city: string;
  state: string;
  zip: string;
  bedrooms: number | null;
  bathrooms: number | null;
  fullBathrooms: number | null;
  halfBathrooms: number | null;
  livingArea: number | null;
  yearBuilt: number | null;
  propertyType: string;
  description: string | null;
  virtualTourUrl: string | null;
  mlsBoard: string | null;
  photos: ListingPhoto[];
  openHouses: OpenHouse[];
  agent: Agent | null;
  office: Office | null;
}

interface ListingDetailProps {
  listing: ListingDetailData;
}

function formatPrice(price: string | number): string {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numPrice);
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function ListingDetail({ listing }: ListingDetailProps) {
  const mainPhoto = listing.photos[0]?.url;
  const additionalPhotos = listing.photos.slice(1, 5);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/">
                <Image
                  src="/logo.png"
                  alt="Harmon's Distinctive Homes"
                  width={150}
                  height={42}
                  priority
                />
              </Link>
              <BackToSearch />
            </div>

            <div className="flex items-center gap-4">
              <SaveButton listingId={listing.id} />
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Photo Gallery - Mobile */}
      <section className="md:hidden">
        <MobilePhotoGallery
          photos={listing.photos}
          address={listing.streetAddress}
          status={listing.status}
          statusColor={getStatusColor(listing.status)}
        />
      </section>

      {/* Photo Gallery - Desktop */}
      <section className="hidden md:block bg-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="relative grid grid-cols-2 gap-1">
            {/* Main Photo */}
            <div className="relative aspect-auto row-span-2">
              {mainPhoto ? (
                <Image
                  src={mainPhoto}
                  alt={listing.streetAddress}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                  <svg
                    className="w-24 h-24 text-gray-400"
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
                  className={`px-4 py-2 rounded-full text-sm font-semibold text-white ${getStatusColor(
                    listing.status
                  )}`}
                >
                  {listing.status}
                </span>
              </div>
            </div>

            {/* Additional Photos */}
            <div className="grid grid-cols-2 gap-1">
              {additionalPhotos.map((photo, index) => (
                <div key={photo.id} className="relative aspect-[4/3]">
                  <Image
                    src={photo.url}
                    alt={`${listing.streetAddress} - Photo ${index + 2}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
              {additionalPhotos.length < 4 &&
                [...Array(4 - additionalPhotos.length)].map((_, i) => (
                  <div
                    key={`placeholder-${i}`}
                    className="bg-gray-200 aspect-[4/3]"
                  />
                ))}
            </div>

            {/* View All Photos Button */}
            <div className="absolute bottom-4 right-4">
              <PhotoGalleryButton photos={listing.photos} address={listing.streetAddress} />
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Price & Address */}
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {formatPrice(listing.price)}
                {listing.status === "For Rent" && (
                  <span className="text-xl font-normal text-gray-500">
                    /month
                  </span>
                )}
              </div>
              <h1 className="text-xl text-gray-800">
                {listing.streetAddress}
                {listing.unitNumber && ` #${listing.unitNumber}`}
              </h1>
              <p className="text-gray-600">
                {listing.city}, {listing.state} {listing.zip}
              </p>
            </div>

            {/* Key Details */}
            <div className="flex flex-wrap gap-6 py-6 border-y border-gray-200">
              {listing.bedrooms !== null && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {listing.bedrooms}
                  </div>
                  <div className="text-sm text-gray-500">Beds</div>
                </div>
              )}
              {listing.bathrooms !== null && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {listing.bathrooms}
                  </div>
                  <div className="text-sm text-gray-500">Baths</div>
                </div>
              )}
              {listing.livingArea !== null && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {listing.livingArea.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Sq Ft</div>
                </div>
              )}
              {listing.yearBuilt !== null && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {listing.yearBuilt}
                  </div>
                  <div className="text-sm text-gray-500">Year Built</div>
                </div>
              )}
            </div>

            {/* Description */}
            {listing.description && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  About This Home
                </h2>
                <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Property Details */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Property Details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Property Type</span>
                  <span className="font-medium">{listing.propertyType}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">MLS #</span>
                  <span className="font-medium">{listing.mlsId}</span>
                </div>
                {listing.fullBathrooms !== null && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Full Bathrooms</span>
                    <span className="font-medium">{listing.fullBathrooms}</span>
                  </div>
                )}
                {listing.halfBathrooms !== null && listing.halfBathrooms > 0 && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Half Bathrooms</span>
                    <span className="font-medium">{listing.halfBathrooms}</span>
                  </div>
                )}
                {listing.mlsBoard && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">MLS Board</span>
                    <span className="font-medium">{listing.mlsBoard}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Virtual Tour */}
            {listing.virtualTourUrl && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Virtual Tour
                </h2>
                <a
                  href={listing.virtualTourUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#0c87f2] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#0068d0] transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  View Virtual Tour
                </a>
              </div>
            )}

            {/* Open Houses */}
            {listing.openHouses.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Open Houses
                </h2>
                <div className="space-y-3">
                  {listing.openHouses.map((oh) => (
                    <div
                      key={oh.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="w-12 h-12 bg-[#0c87f2]/10 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-[#0c87f2]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatDate(oh.date)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatTime(oh.startTime)} - {formatTime(oh.endTime)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Agent Card */}
            <ContactAgentCard
              listingId={listing.id}
              listingAddress={`${listing.streetAddress}, ${listing.city}, ${listing.state} ${listing.zip}`}
              agent={listing.agent}
              office={listing.office}
            />

            {/* Office Info */}
            {listing.office && (
              <div className="bg-gray-50 rounded-2xl p-6">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Listed By
                </h4>
                {listing.office.logoUrl && (
                  <div className="mb-4">
                    <Image
                      src={listing.office.logoUrl}
                      alt={listing.office.name || "Office logo"}
                      width={160}
                      height={60}
                      className="object-contain max-h-[60px] w-auto"
                    />
                  </div>
                )}
                <div className="text-gray-900 font-medium">
                  {listing.office.name}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {listing.office.streetAddress}
                </div>
                <div className="text-sm text-gray-600">
                  {listing.office.city}, {listing.office.state}{" "}
                  {listing.office.zip}
                </div>
                {listing.office.phone && (
                  <div className="text-sm text-gray-600 mt-2">
                    {listing.office.phone}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p>&copy; 2026 Harmon's Distinctive Homes. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
