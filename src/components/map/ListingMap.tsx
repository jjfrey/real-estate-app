"use client";

import { useEffect, useRef, useState, useCallback, useMemo, memo, useImperativeHandle, forwardRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ListingSummary } from "@/types/listing";

export interface ListingMapHandle {
  highlightMarker: (listingId: number | null) => void;
}

interface ListingMapProps {
  listings: ListingSummary[];
  onBoundsChange?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  onMarkerClick?: (listing: ListingSummary) => void;
  onMarkerHover?: (listingId: number | null) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  skipFitBounds?: boolean;
}

function formatPrice(price: string | number): string {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  if (numPrice >= 1000000) {
    return `$${(numPrice / 1000000).toFixed(1)}M`;
  }
  return `$${Math.round(numPrice / 1000)}K`;
}

const ListingMapComponent = forwardRef<ListingMapHandle, ListingMapProps>(function ListingMapComponent({
  listings,
  onBoundsChange,
  onMarkerClick,
  onMarkerHover,
  initialCenter = [-81.5, 26.5], // Florida center
  initialZoom = 7,
  skipFitBounds = false,
}, ref) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSearchButton, setShowSearchButton] = useState(false);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMarkerHoverRef = useRef(onMarkerHover);
  const isFittingBounds = useRef(false);
  const hasFitBounds = useRef(false);
  const ignoreNextMoveEnd = useRef(true); // Ignore initial moveend events
  const lastListingIds = useRef<string>("");

  // Create a stable key for listings to avoid unnecessary marker updates
  const listingsKey = useMemo(() => {
    return listings.map(l => l.id).sort().join(",");
  }, [listings]);

  // Keep refs updated
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
    onMarkerClickRef.current = onMarkerClick;
    onMarkerHoverRef.current = onMarkerHover;
  }, [onBoundsChange, onMarkerClick, onMarkerHover]);

  const handleSearchThisArea = useCallback(() => {
    if (!map.current || !onBoundsChangeRef.current) return;

    const bounds = map.current.getBounds();
    if (!bounds) return;

    onBoundsChangeRef.current({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
    setShowSearchButton(false);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Mapbox token not configured");
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: initialCenter,
      zoom: initialZoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setIsLoaded(true);
    });

    // Show "Search This Area" button only after user-initiated moves
    map.current.on("moveend", () => {
      // Skip initial moveend events and those during fitBounds
      if (ignoreNextMoveEnd.current || isFittingBounds.current) {
        return;
      }
      setShowSearchButton(true);
    });

    // Track user interaction to know when to start listening
    map.current.on("dragstart", () => {
      ignoreNextMoveEnd.current = false;
    });
    map.current.on("zoomstart", () => {
      ignoreNextMoveEnd.current = false;
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCenter, initialZoom]);

  // Store listings in a ref so we can access them without adding to dependencies
  const listingsRef = useRef(listings);
  listingsRef.current = listings;

  // Update markers when listings change (using stable key comparison)
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Skip if listings haven't actually changed
    if (lastListingIds.current === listingsKey) {
      return;
    }
    lastListingIds.current = listingsKey;

    // Remove old markers
    markers.current.forEach((marker) => marker.remove());
    markers.current.clear();

    // Add new markers using ref to avoid dependency
    listingsRef.current.forEach((listing) => {
      if (listing.latitude === null || listing.longitude === null) return;

      const el = document.createElement("div");
      el.className = "listing-marker";
      el.innerHTML = `
        <div class="marker-content" data-listing-id="${listing.id}">
          ${formatPrice(listing.price)}
        </div>
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([listing.longitude, listing.latitude])
        .addTo(map.current!);

      // Click handler
      el.addEventListener("click", () => {
        onMarkerClickRef.current?.(listing);
      });

      // Hover handlers
      el.addEventListener("mouseenter", () => {
        onMarkerHoverRef.current?.(listing.id);
      });
      el.addEventListener("mouseleave", () => {
        onMarkerHoverRef.current?.(null);
      });

      markers.current.set(listing.id, marker);
    });
  }, [isLoaded, listingsKey]);

  // Expose highlightMarker method via ref - this allows parent to highlight
  // markers without causing re-renders
  const currentHighlightedId = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    highlightMarker: (listingId: number | null) => {
      // Remove highlight from previous marker
      if (currentHighlightedId.current !== null) {
        const prevMarker = markers.current.get(currentHighlightedId.current);
        if (prevMarker) {
          const content = prevMarker.getElement().querySelector(".marker-content");
          content?.classList.remove("highlighted");
        }
      }

      // Add highlight to new marker
      if (listingId !== null) {
        const newMarker = markers.current.get(listingId);
        if (newMarker) {
          const content = newMarker.getElement().querySelector(".marker-content");
          content?.classList.add("highlighted");
        }
      }

      currentHighlightedId.current = listingId;
    }
  }), []);

  // Fit bounds to listings (only once on initial load, not when searching by area)
  useEffect(() => {
    if (!map.current || !isLoaded || listingsRef.current.length === 0 || skipFitBounds || hasFitBounds.current) return;

    const validListings = listingsRef.current.filter(
      (l) => l.latitude !== null && l.longitude !== null
    );
    if (validListings.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    validListings.forEach((listing) => {
      bounds.extend([listing.longitude!, listing.latitude!]);
    });

    hasFitBounds.current = true;
    isFittingBounds.current = true;
    map.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 14,
      duration: 1000,
    });
    // Reset flag after animation completes
    setTimeout(() => {
      isFittingBounds.current = false;
    }, 1100);
  }, [listingsKey, isLoaded, skipFitBounds]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Search This Area Button */}
      {showSearchButton && (
        <button
          onClick={handleSearchThisArea}
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg font-medium text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 z-10"
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          Search This Area
        </button>
      )}

      {/* Map Loading State */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-500">Loading map...</div>
        </div>
      )}

      <style jsx global>{`
        .listing-marker {
          cursor: pointer;
        }
        .marker-content {
          background: white;
          border: 2px solid #0c87f2;
          border-radius: 8px;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 600;
          color: #0c87f2;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .marker-content:hover,
        .marker-content.highlighted {
          background: #0c87f2;
          color: white;
          transform: scale(1.1);
          z-index: 10;
        }
      `}</style>
    </div>
  );
});

// Memoize the component to prevent re-renders when parent state changes
// Only re-render when listings or skipFitBounds actually change
// Note: highlighting is now done via ref, not props, so no re-renders on hover
export const ListingMap = memo(ListingMapComponent, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these specific props change
  const listingsEqual =
    prevProps.listings.length === nextProps.listings.length &&
    prevProps.listings.every((l, i) => l.id === nextProps.listings[i]?.id);

  return listingsEqual && prevProps.skipFitBounds === nextProps.skipFitBounds;
});
