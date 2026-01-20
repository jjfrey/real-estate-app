"use client";

import { useState, useEffect } from "react";

interface SyncStats {
  totals: {
    listings: number;
    agents: number;
    offices: number;
    photos: number;
  };
  byStatus: Record<string, number>;
  byPropertyType: Record<string, number>;
  topCities: { city: string; count: number }[];
  lastUpdated: string | null;
}

export default function AdminSyncPage() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/portal/sync/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error fetching sync stats:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading sync stats...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-gray-600">
        Failed to load sync stats
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sync Status</h1>
        <p className="text-sm text-gray-600 mt-1">
          MLS feed synchronization statistics
        </p>
      </div>

      {/* Last Updated */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Last sync:</span>
          <span className="text-sm font-medium text-gray-900">
            {stats.lastUpdated
              ? new Date(stats.lastUpdated).toLocaleString()
              : "Never"}
          </span>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Listings</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.totals.listings.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Agents</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.totals.agents.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Offices</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.totals.offices.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Photos</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.totals.photos.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Listings by Status
          </h2>
          <div className="space-y-3">
            {Object.entries(stats.byStatus)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {status.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(count / stats.totals.listings) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-16 text-right">
                      {count.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* By Property Type */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Listings by Property Type
          </h2>
          <div className="space-y-3">
            {Object.entries(stats.byPropertyType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{type || "Unknown"}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${(count / stats.totals.listings) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-16 text-right">
                      {count.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Top Cities */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Top 10 Cities by Listings
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stats.topCities.map((city, index) => (
            <div
              key={city.city}
              className="bg-gray-50 p-3 rounded-lg text-center"
            >
              <div className="text-xs text-gray-500 mb-1">#{index + 1}</div>
              <div className="text-sm font-medium text-gray-900 truncate">
                {city.city}
              </div>
              <div className="text-lg font-bold text-blue-600">
                {city.count.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sync Info */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          About Data Sync
        </h3>
        <p className="text-sm text-blue-700">
          Listing data is synchronized from the kvCORE MLS feed. The sync script can be run
          manually using <code className="bg-blue-100 px-1 rounded">npm run db:sync</code>.
          Consider setting up a cron job for automatic daily syncs.
        </p>
      </div>
    </div>
  );
}
