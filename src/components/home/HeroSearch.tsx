"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AutocompleteResult } from "@/types/listing";

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"buy" | "rent">("buy");
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch autocomplete results
  useEffect(() => {
    const fetchResults = async () => {
      if (query.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/search/autocomplete?q=${encodeURIComponent(query)}`
        );
        if (response.ok) {
          const data = await response.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Autocomplete error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: AutocompleteResult) => {
    setQuery(result.label);
    setIsOpen(false);

    const params = new URLSearchParams();
    if (result.type === "city") {
      params.set("city", result.city);
    } else if (result.type === "zip") {
      params.set("zip", result.value);
    } else if (result.type === "address" && result.id) {
      // Go directly to listing
      router.push(`/listings/${result.id}`);
      return;
    }
    if (activeTab === "rent") {
      params.set("status", "For Rent");
    } else {
      params.set("status", "Active");
    }
    router.push(`/search?${params.toString()}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    const params = new URLSearchParams();
    if (query) {
      params.set("q", query);
    }
    if (activeTab === "rent") {
      params.set("status", "For Rent");
    } else {
      params.set("status", "Active");
    }
    router.push(`/search?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        if (selectedIndex >= 0) {
          e.preventDefault();
          handleSelect(results[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "city":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case "zip":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
    }
  };

  return (
    <div className="animate-slide-up max-w-3xl mx-auto" ref={containerRef}>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-2 sm:p-3">
        {/* Search Tabs */}
        <div className="flex gap-1 mb-3 px-2">
          <button
            type="button"
            onClick={() => setActiveTab("buy")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === "buy"
                ? "bg-[#0c87f2] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rent")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === "rent"
                ? "bg-[#0c87f2] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Rent
          </button>
        </div>

        {/* Search Input */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10"
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
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(-1);
              }}
              onFocus={() => results.length > 0 && setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search by address, city, or ZIP code..."
              className="w-full pl-12 pr-10 py-4 rounded-xl border border-gray-200 focus:border-[#0c87f2] focus:ring-2 focus:ring-[#0c87f2]/20 outline-none text-gray-800 placeholder-gray-400 text-lg"
            />
            {isLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-[#0c87f2] rounded-full animate-spin" />
              </div>
            )}

            {/* Autocomplete Dropdown */}
            {isOpen && results.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                <ul className="py-2 max-h-80 overflow-y-auto">
                  {results.map((result, index) => (
                    <li key={`${result.type}-${result.value}-${index}`}>
                      <button
                        type="button"
                        onClick={() => handleSelect(result)}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                          index === selectedIndex
                            ? "bg-[#0c87f2]/10 text-[#0c87f2]"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-gray-400">{getIcon(result.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.label}</div>
                          <div className="text-sm text-gray-500 capitalize">
                            {result.type}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button
            type="submit"
            className="bg-[#0c87f2] hover:bg-[#0068d0] text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#0c87f2]/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Search
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 mt-3 px-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 text-sm hover:border-[#0c87f2] hover:text-[#0c87f2] transition-colors"
          >
            Any Price
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 text-sm hover:border-[#0c87f2] hover:text-[#0c87f2] transition-colors"
          >
            Beds
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 text-sm hover:border-[#0c87f2] hover:text-[#0c87f2] transition-colors"
          >
            Home Type
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 text-sm hover:border-[#0c87f2] hover:text-[#0c87f2] transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            More Filters
          </button>
        </div>
      </form>

      {/* Map Search CTA */}
      <a
        href="/search"
        className="mt-6 inline-flex items-center gap-2 text-white/90 hover:text-white font-medium transition-colors group"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        Or explore with Map Search
        <svg
          className="w-4 h-4 group-hover:translate-x-1 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  );
}
