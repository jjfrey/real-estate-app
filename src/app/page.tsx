import Image from "next/image";
import { HeroSearch } from "@/components/home/HeroSearch";
import { UserButton } from "@/components/auth/UserButton";
import { ListingCard } from "@/components/listing/ListingCard";
import { siteConfig, getSiteId } from "@/lib/site-config";
import { getCitiesWithCounts, getFeaturedListings } from "@/lib/queries";

export const revalidate = 3600; // ISR: revalidate every hour

export default async function Home() {
  const siteId = getSiteId();
  const [topCities, featuredListings] = await Promise.all([
    getCitiesWithCounts(siteId).then((cities) => cities.slice(0, 5)),
    getFeaturedListings(6, siteId),
  ]);
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center">
              <Image
                src={siteConfig.logoPath}
                alt={siteConfig.logoAlt}
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
            alt="Beautiful luxury home"
            fill
            className="object-cover"
            priority
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/80 via-brand-dark/60 to-brand-dark/80" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight animate-fade-in font-[family-name:var(--font-playfair)]">
            {siteConfig.hero.title}
            <br />
            <span className="text-brand-light">{siteConfig.hero.titleAccent}</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto animate-fade-in">
            {siteConfig.hero.subtitle}
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

      {/* Featured Listings */}
      {featuredListings.length > 0 && (
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
              <a href="/search" className="text-brand hover:text-brand-hover font-semibold flex items-center gap-1 transition-colors">
                View all listings
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Cities */}
      {topCities.length > 0 && (
        <section className="py-16 sm:py-20 bg-brand">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white font-[family-name:var(--font-playfair)]">
                Explore Popular Cities
              </h2>
              <p className="text-white/80 mt-2 max-w-2xl mx-auto">
                {siteConfig.citiesSection.subtitle}
              </p>
            </div>

            {/* Cities List */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {topCities.map((city) => (
                <a
                  key={`${city.city}-${city.state}`}
                  href={`/search?city=${encodeURIComponent(city.city)}`}
                  className="px-6 py-3 bg-white/10 border border-white/30 rounded-full text-white font-medium hover:bg-white hover:text-brand hover:shadow-md transition-all duration-200"
                >
                  {city.city}, {city.state}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <Image
                  src={siteConfig.logoPath}
                  alt={siteConfig.logoAlt}
                  width={160}
                  height={44}
                  className="brightness-0 invert"
                />
              </div>
              <p className="text-gray-400 text-sm">
                Your trusted partner in finding the perfect property.
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

          </div>

          {/* Bottom */}
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} {siteConfig.legal.copyrightName}. All rights reserved.
            </p>
            <div className="flex gap-6 text-gray-500 text-sm">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Accessibility</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
