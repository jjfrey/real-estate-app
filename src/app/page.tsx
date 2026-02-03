import Image from "next/image";
import { HeroSearch } from "@/components/home/HeroSearch";
import { UserButton } from "@/components/auth/UserButton";

// Mock data for design mockup - will be replaced with real data
const featuredListings = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    price: 849000,
    beds: 4,
    baths: 3,
    sqft: 2850,
    address: "1423 Palm Beach Drive",
    city: "Naples",
    state: "FL",
    status: "Active",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    price: 1250000,
    beds: 5,
    baths: 4,
    sqft: 4200,
    address: "892 Ocean Boulevard",
    city: "Vero Beach",
    state: "FL",
    status: "Active",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    price: 525000,
    beds: 3,
    baths: 2,
    sqft: 1920,
    address: "2156 Sunset Lane",
    city: "Fort Myers",
    state: "FL",
    status: "Active",
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
    price: 675000,
    beds: 3,
    baths: 2.5,
    sqft: 2100,
    address: "445 Marina Way",
    city: "Stuart",
    state: "FL",
    status: "Pending",
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&q=80",
    price: 2100000,
    beds: 6,
    baths: 5,
    sqft: 5500,
    address: "18 Coastal Drive",
    city: "Marco Island",
    state: "FL",
    status: "Active",
  },
  {
    id: 6,
    image: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80",
    price: 389000,
    beds: 2,
    baths: 2,
    sqft: 1450,
    address: "3201 Golf View Circle",
    city: "Sarasota",
    state: "FL",
    status: "Active",
  },
];

const popularCities = [
  { name: "Naples", count: 284, image: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=600&q=80" },
  { name: "Vero Beach", count: 207, image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=600&q=80" },
  { name: "Fort Myers", count: 172, image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80" },
  { name: "Sarasota", count: 101, image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80" },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="Harmon's Distinctive Homes"
                width={180}
                height={50}
                className="brightness-0 invert"
                priority
              />
            </div>

            {/* Nav Links - Desktop */}
            <div className="hidden md:flex items-center gap-8">
              <a href="/search?status=Active" className="text-white/90 hover:text-white font-medium transition-colors">
                Buy
              </a>
              <a href="/search?status=For+Rent" className="text-white/90 hover:text-white font-medium transition-colors">
                Rent
              </a>
              <a href="#" className="text-white/90 hover:text-white font-medium transition-colors">
                Sell
              </a>
              <a href="/search" className="text-white/90 hover:text-white font-medium transition-colors">
                Map Search
              </a>
            </div>

            {/* Auth Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-4">
              <UserButton variant="light" />
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden text-white p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80"
            alt="Beautiful Florida home"
            fill
            className="object-cover"
            priority
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a3c72]/80 via-[#0a3c72]/60 to-[#0a3c72]/80" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight animate-fade-in font-[family-name:var(--font-playfair)]">
            Find Your Perfect Home
            <br />
            <span className="text-[#7cc4ff]">in the Sunshine State</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto animate-fade-in">
            Discover over 2,000 beautiful properties across Florida.
            From beachfront condos to family homes, your dream starts here.
          </p>

          {/* Search Box */}
          <HeroSearch />
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-[#f9fafb] border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-[#0c87f2]">2,170+</div>
              <div className="text-gray-600 mt-1">Active Listings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-[#0c87f2]">15+</div>
              <div className="text-gray-600 mt-1">Florida Cities</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-[#0c87f2]">67%</div>
              <div className="text-gray-600 mt-1">Virtual Tours</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-[#0c87f2]">Daily</div>
              <div className="text-gray-600 mt-1">Updated Listings</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 font-[family-name:var(--font-playfair)]">
                Featured Properties
              </h2>
              <p className="text-gray-600 mt-2">Hand-picked homes you&apos;ll love</p>
            </div>
            <a href="#" className="text-[#0c87f2] hover:text-[#0068d0] font-semibold flex items-center gap-1 transition-colors">
              View all listings
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* Listings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {featuredListings.map((listing) => (
              <article
                key={listing.id}
                className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={listing.image}
                    alt={listing.address}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Status Badge */}
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      listing.status === "Active"
                        ? "bg-green-500 text-white"
                        : "bg-amber-500 text-white"
                    }`}>
                      {listing.status}
                    </span>
                  </div>
                  {/* Favorite Button */}
                  <button className="absolute top-4 right-4 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors group/fav">
                    <svg className="w-5 h-5 text-gray-400 group-hover/fav:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                  {/* Photo Count */}
                  <div className="absolute bottom-4 right-4 bg-black/60 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    24
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Price */}
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {formatPrice(listing.price)}
                  </div>

                  {/* Details */}
                  <div className="flex items-center gap-4 text-gray-600 text-sm mb-3">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <strong>{listing.beds}</strong> bd
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                      </svg>
                      <strong>{listing.baths}</strong> ba
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <strong>{listing.sqft.toLocaleString()}</strong> sqft
                    </span>
                  </div>

                  {/* Address */}
                  <div className="text-gray-800 font-medium">{listing.address}</div>
                  <div className="text-gray-500 text-sm">{listing.city}, {listing.state}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Cities */}
      <section className="py-16 sm:py-20 bg-[#f9fafb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 font-[family-name:var(--font-playfair)]">
              Explore Popular Cities
            </h2>
            <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
              From the Gulf Coast to the Atlantic, find your perfect Florida destination
            </p>
          </div>

          {/* Cities Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {popularCities.map((city) => (
              <a
                key={city.name}
                href="#"
                className="group relative aspect-[4/5] rounded-2xl overflow-hidden"
              >
                <Image
                  src={city.image}
                  alt={city.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-white text-xl sm:text-2xl font-bold">{city.name}</h3>
                  <p className="text-white/80 text-sm">{city.count} properties</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-[#0c87f2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 font-[family-name:var(--font-playfair)]">
            Ready to Find Your Dream Home?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            Start your search today and discover the perfect property in Florida&apos;s most desirable neighborhoods.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-[#0c87f2] px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg">
              Start Searching
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition-colors">
              Contact an Agent
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <Image
                  src="/logo.png"
                  alt="Harmon's Distinctive Homes"
                  width={160}
                  height={44}
                  className="brightness-0 invert"
                />
              </div>
              <p className="text-gray-400 text-sm">
                Your trusted partner in finding the perfect Florida property.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Buy</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Homes for Sale</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Condos for Sale</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Land for Sale</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Open Houses</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Rent</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Homes for Rent</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Apartments</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Condos for Rent</a></li>
                <li><a href="#" className="hover:text-white transition-colors">All Rentals</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Find an Agent</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mortgage Calculator</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Market Trends</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              &copy; 2026 Harmon&apos;s Distinctive Homes. All rights reserved.
            </p>
            <div className="flex gap-6 text-gray-500 text-sm">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Accessibility</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
