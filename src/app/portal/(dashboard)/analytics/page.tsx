"use client";

import { useEffect, useState, useCallback } from "react";

interface ClickRow {
  mlsId: string;
  clickCount: number;
  lastClick: string;
  listing: {
    streetAddress: string;
    city: string;
    state: string;
    price: string;
  } | null;
}

interface Summary {
  totalClicks: number;
  uniqueListings: number;
  uniqueCampaigns: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AnalyticsPage() {
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalClicks: 0,
    uniqueListings: 0,
    uniqueCampaigns: 0,
  });
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [campaignFilter, setCampaignFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      if (campaignFilter) params.set("campaign", campaignFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/portal/analytics?${params}`);
      if (res.ok) {
        const data = await res.json();
        setClicks(data.clicks);
        setSummary(data.summary);
        setCampaigns(data.campaigns || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, campaignFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleFilterReset = () => {
    setCampaignFilter("");
    setDateFrom("");
    setDateTo("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Link Analytics</h1>
        <p className="text-gray-600 mt-1">
          Track magazine and campaign link clicks
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Total Clicks</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {isLoading ? "—" : summary.totalClicks.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Unique Listings</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {isLoading ? "—" : summary.uniqueListings.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Active Campaigns</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {isLoading ? "—" : summary.uniqueCampaigns.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign
            </label>
            <select
              value={campaignFilter}
              onChange={(e) => {
                setCampaignFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {(campaignFilter || dateFrom || dateTo) && (
            <button
              onClick={handleFilterReset}
              className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          )}
          <div className="ml-auto text-sm text-gray-500">
            {pagination.total} listing{pagination.total !== 1 ? "s" : ""} with clicks
          </div>
        </div>
      </div>

      {/* Clicks Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading analytics...</p>
          </div>
        ) : clicks.length === 0 ? (
          <div className="p-8 text-center">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-gray-500">No click data found</p>
            {(campaignFilter || dateFrom || dateTo) && (
              <button
                onClick={handleFilterReset}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MLS ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      City
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clicks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Click
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clicks.map((row) => (
                    <tr key={row.mlsId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {row.mlsId}
                      </td>
                      <td className="px-6 py-4">
                        {row.listing ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {row.listing.streetAddress}
                            </div>
                            <div className="text-sm text-blue-600 font-medium">
                              {formatPrice(row.listing.price)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not in database</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.listing
                          ? `${row.listing.city}, ${row.listing.state}`
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                          {row.clickCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(row.lastClick)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {clicks.map((row) => (
                <div key={row.mlsId} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-mono text-sm text-gray-900">
                        {row.mlsId}
                      </div>
                      {row.listing && (
                        <div className="text-sm text-gray-600 mt-1">
                          {row.listing.streetAddress}
                        </div>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                      {row.clickCount} click{row.clickCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {row.listing
                        ? `${row.listing.city}, ${row.listing.state}`
                        : "Not in database"}
                    </span>
                    <span>{formatDate(row.lastClick)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
