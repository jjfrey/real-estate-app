"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SearchBar } from "@/components/search/SearchBar";
import { FilterPanel, FilterValues } from "@/components/search/FilterPanel";
import { ListingCard } from "@/components/listing/ListingCard";
import { ListingSummary, ListingsResponse } from "@/types/listing";
import { ListingMap, ListingMapHandle } from "@/components/map/ListingMap";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mapRef = useRef<ListingMapHandle>(null);

  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 24,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(false); // Default to list view on mobile
  const [isClient, setIsClient] = useState(false);

  // Set client flag after mount (for SSR-safe map rendering)
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Highlight marker via ref (no re-renders)
  const highlightMarker = useCallback((id: number | null) => {
    setHighlightedId(id); // Still update state for card highlighting
    mapRef.current?.highlightMarker(id); // Direct DOM update for map marker
  }, []);

  const [filters, setFilters] = useState<FilterValues>({
    status: searchParams.getAll("status") || [],
    propertyType: searchParams.getAll("propertyType") || [],
    minPrice: searchParams.get("minPrice")
      ? parseInt(searchParams.get("minPrice")!)
      : undefined,
    maxPrice: searchParams.get("maxPrice")
      ? parseInt(searchParams.get("maxPrice")!)
      : undefined,
    minBeds: searchParams.get("minBeds")
      ? parseInt(searchParams.get("minBeds")!)
      : undefined,
    maxBeds: undefined,
    minBaths: searchParams.get("minBaths")
      ? parseFloat(searchParams.get("minBaths")!)
      : undefined,
    maxBaths: undefined,
  });

  const [bounds, setBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);

  const [sort, setSort] = useState<{ field: string; direction: string }>({
    field: searchParams.get("sort") || "createdAt",
    direction: searchParams.get("sortDir") || "desc",
  });

  const city = searchParams.get("city");
  const zip = searchParams.get("zip");
  const query = searchParams.get("q");

  // Fetch listings
  const fetchListings = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", "24");
        params.set("sort", sort.field);
        params.set("sortDir", sort.direction);

        if (city) params.set("city", city);
        if (zip) params.set("zip", zip);
        if (query && !city && !zip) params.set("city", query);

        filters.status.forEach((s) => params.append("status", s));
        filters.propertyType.forEach((t) => params.append("propertyType", t));
        if (filters.minPrice) params.set("minPrice", filters.minPrice.toString());
        if (filters.maxPrice) params.set("maxPrice", filters.maxPrice.toString());
        if (filters.minBeds) params.set("minBeds", filters.minBeds.toString());
        if (filters.minBaths) params.set("minBaths", filters.minBaths.toString());

        if (bounds) {
          params.set("north", bounds.north.toString());
          params.set("south", bounds.south.toString());
          params.set("east", bounds.east.toString());
          params.set("west", bounds.west.toString());
        }

        const response = await fetch(`/api/listings?${params.toString()}`);
        if (response.ok) {
          const data: ListingsResponse = await response.json();
          setListings(data.listings);
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [city, zip, query, filters, bounds, sort]
  );

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Update URL when filters change
  const updateUrl = useCallback(
    (newFilters: FilterValues) => {
      const params = new URLSearchParams();
      if (city) params.set("city", city);
      if (zip) params.set("zip", zip);
      if (query) params.set("q", query);

      newFilters.status.forEach((s) => params.append("status", s));
      newFilters.propertyType.forEach((t) => params.append("propertyType", t));
      if (newFilters.minPrice)
        params.set("minPrice", newFilters.minPrice.toString());
      if (newFilters.maxPrice)
        params.set("maxPrice", newFilters.maxPrice.toString());
      if (newFilters.minBeds)
        params.set("minBeds", newFilters.minBeds.toString());
      if (newFilters.minBaths)
        params.set("minBaths", newFilters.minBaths.toString());

      params.set("sort", sort.field);
      params.set("sortDir", sort.direction);

      router.push(`/search?${params.toString()}`, { scroll: false });
    },
    [city, zip, query, sort, router]
  );

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
    updateUrl(newFilters);
  };

  const handleBoundsChange = useCallback((newBounds: typeof bounds) => {
    setBounds(newBounds);
  }, []);

  const handleSearch = (value: string, type?: string) => {
    const params = new URLSearchParams();
    if (type === "city") {
      params.set("city", value);
    } else if (type === "zip") {
      params.set("zip", value);
    } else {
      params.set("q", value);
    }
    router.push(`/search?${params.toString()}`);
  };

  const activeFilterCount =
    filters.status.length +
    filters.propertyType.length +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.minBeds ? 1 : 0) +
    (filters.minBaths ? 1 : 0);

  const locationLabel = city || zip || query || "Florida";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-10 h-10 bg-[#0c87f2] rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                Distinct<span className="text-[#0c87f2]">Homes</span>
              </span>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <SearchBar
                defaultValue={city || zip || query || ""}
                onSearch={handleSearch}
                showButton={false}
                className="w-full"
              />
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-4">
              <button className="text-gray-600 hover:text-gray-900 font-medium">
                Sign In
              </button>
              <button className="bg-[#0c87f2] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#0068d0] transition-colors">
                Get Started
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="bg-white border-b sticky top-[73px] z-30">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors shrink-0 ${
                  activeFilterCount > 0
                    ? "border-[#0c87f2] bg-[#0c87f2]/5 text-[#0c87f2]"
                    : "border-gray-200 hover:border-gray-300"
                }`}
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
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                <span className="font-medium">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-[#0c87f2] text-white text-xs px-2 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Quick Filters */}
              <div className="flex gap-2">
                <select
                  value={
                    filters.status.length === 1 ? filters.status[0] : ""
                  }
                  onChange={(e) => {
                    const newFilters = {
                      ...filters,
                      status: e.target.value ? [e.target.value] : [],
                    };
                    handleFilterChange(newFilters);
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-[#0c87f2] outline-none"
                >
                  <option value="">All Status</option>
                  <option value="Active">For Sale</option>
                  <option value="For Rent">For Rent</option>
                  <option value="Pending">Pending</option>
                </select>

                <select
                  value={sort.field + "-" + sort.direction}
                  onChange={(e) => {
                    const [field, direction] = e.target.value.split("-");
                    setSort({ field, direction });
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-[#0c87f2] outline-none"
                >
                  <option value="createdAt-desc">Newest</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="bedrooms-desc">Most Bedrooms</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-gray-600 hidden sm:flex items-center gap-2">
                {isLoading && (
                  <svg className="animate-spin h-4 w-4 text-[#0c87f2]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {pagination.total.toLocaleString()} results
              </span>
              {/* Map Toggle (mobile) */}
              <button
                onClick={() => setShowMap(!showMap)}
                className="md:hidden flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
              >
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
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                {showMap ? "List" : "Map"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto">
        <div className="flex h-[calc(100vh-145px)]">
          {/* Listings Panel */}
          <div
            className={`${
              showMap ? "hidden" : "w-full"
            } md:block md:w-1/2 lg:w-2/5 overflow-y-auto`}
          >
            <div className="p-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Homes in {locationLabel}
              </h1>

              {isLoading && listings.length === 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse"
                    >
                      <div className="aspect-[4/3] bg-gray-200" />
                      <div className="p-5 space-y-3">
                        <div className="h-6 bg-gray-200 rounded w-1/2" />
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !isLoading && listings.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No listings found
                  </h3>
                  <p className="text-gray-500">
                    Try adjusting your filters or search area
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {listings.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        isHighlighted={listing.id === highlightedId}
                        onMouseEnter={() => highlightMarker(listing.id)}
                        onMouseLeave={() => highlightMarker(null)}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-8">
                      <button
                        onClick={() => fetchListings(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="px-4 py-2 text-gray-600">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => fetchListings(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Map Panel */}
          <div
            className={`${
              showMap ? "w-full" : "hidden"
            } md:block md:w-1/2 lg:w-3/5 bg-gray-200`}
          >
            {isClient ? (
              <ListingMap
                ref={mapRef}
                listings={listings}
                onBoundsChange={handleBoundsChange}
                onMarkerHover={highlightMarker}
                skipFitBounds={bounds !== null}
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <div className="text-gray-500">Loading map...</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white">
            <FilterPanel
              filters={filters}
              onChange={handleFilterChange}
              onClose={() => setShowFilters(false)}
              isMobile
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
