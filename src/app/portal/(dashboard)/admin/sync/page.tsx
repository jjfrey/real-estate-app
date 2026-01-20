"use client";

import { useState, useEffect, useCallback } from "react";

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

interface SyncLogStats {
  listingsCreated: number;
  listingsUpdated: number;
  listingsDeleted: number;
  agentsCreated: number;
  agentsUpdated: number;
  officesCreated: number;
  officesUpdated: number;
  photosProcessed: number;
  openHousesProcessed: number;
}

interface SyncLog {
  id: number;
  status: "pending" | "running" | "completed" | "failed";
  trigger: "manual" | "scheduled" | "webhook";
  triggeredBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  startedAt: string | null;
  completedAt: string | null;
  stats: SyncLogStats;
  errorMessage: string | null;
  createdAt: string;
}

interface SyncStatus {
  isRunning: boolean;
  currentSync: {
    id: number;
    status: string;
    trigger: string;
    triggeredBy: { id: string; name: string | null; email: string | null } | null;
    startedAt: string | null;
    createdAt: string;
  } | null;
  lastCompleted: SyncLog | null;
}

interface SyncFeed {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  feedUrl: string | null;
  feedType: string;
  isEnabled: boolean;
  scheduleEnabled: boolean;
  scheduleFrequency: string;
  scheduleTime: string | null;
  scheduleDayOfWeek: number | null;
  lastScheduledRun: string | null;
  nextScheduledRun: string | null;
  createdAt: string;
  updatedAt: string;
}

const FREQUENCY_OPTIONS = [
  { value: "hourly", label: "Hourly" },
  { value: "every_6_hours", label: "Every 6 hours" },
  { value: "every_12_hours", label: "Every 12 hours" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function AdminSyncPage() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncLog[]>([]);
  const [feeds, setFeeds] = useState<SyncFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingFeed, setEditingFeed] = useState<SyncFeed | null>(null);
  const [isSavingFeed, setIsSavingFeed] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, statusRes, historyRes, feedsRes] = await Promise.all([
        fetch("/api/portal/sync/stats"),
        fetch("/api/portal/sync/status"),
        fetch("/api/portal/sync/history?limit=10"),
        fetch("/api/portal/sync/feeds"),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        setSyncStatus(data);
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        setSyncHistory(data.logs || []);
      }

      if (feedsRes.ok) {
        const data = await feedsRes.json();
        setFeeds(data.feeds || []);
      }
    } catch (error) {
      console.error("Error fetching sync data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for status updates when a sync is running
  useEffect(() => {
    if (!syncStatus?.isRunning) return;

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [syncStatus?.isRunning, fetchData]);

  const handleTriggerSync = async (feedId?: number) => {
    setIsTriggering(true);
    setTriggerMessage(null);

    try {
      const res = await fetch("/api/portal/sync/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: feedId ? JSON.stringify({ feedId }) : undefined,
      });
      const data = await res.json();

      if (res.ok) {
        setTriggerMessage({ type: "success", text: data.message || "Sync started" });
        setTimeout(fetchData, 1000);
      } else {
        setTriggerMessage({ type: "error", text: data.error || "Failed to trigger sync" });
      }
    } catch {
      setTriggerMessage({ type: "error", text: "Failed to trigger sync" });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleSaveFeed = async () => {
    if (!editingFeed) return;

    setIsSavingFeed(true);
    try {
      const res = await fetch(`/api/portal/sync/feeds/${editingFeed.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingFeed.name,
          description: editingFeed.description,
          feedUrl: editingFeed.feedUrl,
          isEnabled: editingFeed.isEnabled,
          scheduleEnabled: editingFeed.scheduleEnabled,
          scheduleFrequency: editingFeed.scheduleFrequency,
          scheduleTime: editingFeed.scheduleTime,
          scheduleDayOfWeek: editingFeed.scheduleDayOfWeek,
        }),
      });

      if (res.ok) {
        setEditingFeed(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save feed");
      }
    } catch {
      alert("Failed to save feed");
    } finally {
      setIsSavingFeed(false);
    }
  };

  const handleCreateDefaultFeed = async () => {
    try {
      const res = await fetch("/api/portal/sync/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "kvCORE MLS Feed",
          slug: "kvcore-mls",
          description: "Primary MLS listing feed from kvCORE/BoldTrail",
          feedType: "xml",
          isEnabled: true,
          scheduleEnabled: false,
          scheduleFrequency: "daily",
          scheduleTime: "03:00:00",
        }),
      });

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create feed");
      }
    } catch {
      alert("Failed to create feed");
    }
  };

  const formatDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt || !completedAt) return "-";
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    const seconds = Math.round((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      running: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading sync stats...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sync Status</h1>
          <p className="text-sm text-gray-600 mt-1">
            MLS feed synchronization statistics and controls
          </p>
        </div>
        <button
          onClick={() => handleTriggerSync()}
          disabled={isTriggering || syncStatus?.isRunning}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isTriggering || syncStatus?.isRunning ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {syncStatus?.isRunning ? "Sync Running..." : "Starting..."}
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Trigger Sync
            </>
          )}
        </button>
      </div>

      {/* Trigger Message */}
      {triggerMessage && (
        <div className={`p-4 rounded-lg ${triggerMessage.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {triggerMessage.text}
        </div>
      )}

      {/* Current Sync Status */}
      {syncStatus?.isRunning && syncStatus.currentSync && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-800">Sync in progress</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Started {syncStatus.currentSync.startedAt ? new Date(syncStatus.currentSync.startedAt).toLocaleString() : "just now"}
            {syncStatus.currentSync.triggeredBy && ` by ${syncStatus.currentSync.triggeredBy.name || syncStatus.currentSync.triggeredBy.email}`}
          </p>
        </div>
      )}

      {/* Last Sync Info */}
      {!syncStatus?.isRunning && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${syncStatus?.lastCompleted ? "bg-green-500" : "bg-gray-400"}`}></div>
            <span className="text-sm text-gray-600">Last sync:</span>
            <span className="text-sm font-medium text-gray-900">
              {syncStatus?.lastCompleted?.completedAt
                ? new Date(syncStatus.lastCompleted.completedAt).toLocaleString()
                : stats?.lastUpdated
                  ? new Date(stats.lastUpdated).toLocaleString()
                  : "Never"}
            </span>
            {syncStatus?.lastCompleted && (
              <span className="text-sm text-gray-500">
                ({formatDuration(syncStatus.lastCompleted.startedAt, syncStatus.lastCompleted.completedAt)})
              </span>
            )}
          </div>
          {syncStatus?.lastCompleted && (
            <p className="text-sm text-gray-500 mt-1">
              {syncStatus.lastCompleted.stats.listingsCreated} created,{" "}
              {syncStatus.lastCompleted.stats.listingsUpdated} updated
            </p>
          )}
        </div>
      )}

      {/* Feed Configuration */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Data Feeds</h2>
          {feeds.length === 0 && (
            <button
              onClick={handleCreateDefaultFeed}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Default Feed
            </button>
          )}
        </div>
        <div className="p-4">
          {feeds.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No feeds configured. Click &quot;Create Default Feed&quot; to set up the kvCORE MLS feed.
            </p>
          ) : (
            <div className="space-y-4">
              {feeds.map((feed) => (
                <div key={feed.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{feed.name}</h3>
                        {feed.isEnabled ? (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">Enabled</span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">Disabled</span>
                        )}
                      </div>
                      {feed.description && (
                        <p className="text-sm text-gray-500 mt-1">{feed.description}</p>
                      )}
                      <div className="mt-2 text-sm text-gray-600">
                        <p>Type: {feed.feedType.toUpperCase()}</p>
                        {feed.scheduleEnabled ? (
                          <p>
                            Schedule: {FREQUENCY_OPTIONS.find(f => f.value === feed.scheduleFrequency)?.label || feed.scheduleFrequency}
                            {feed.scheduleFrequency === "weekly" && feed.scheduleDayOfWeek !== null && (
                              <> on {DAY_OPTIONS.find(d => d.value === feed.scheduleDayOfWeek)?.label}</>
                            )}
                            {feed.scheduleTime && <> at {feed.scheduleTime} UTC</>}
                          </p>
                        ) : (
                          <p>Schedule: Manual only</p>
                        )}
                        {feed.nextScheduledRun && (
                          <p>Next run: {new Date(feed.nextScheduledRun).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTriggerSync(feed.id)}
                        disabled={isTriggering || syncStatus?.isRunning || !feed.isEnabled}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sync Now
                      </button>
                      <button
                        onClick={() => setEditingFeed(feed)}
                        className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Feed Modal */}
      {editingFeed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Configure Feed</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingFeed.name}
                  onChange={(e) => setEditingFeed({ ...editingFeed, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingFeed.description || ""}
                  onChange={(e) => setEditingFeed({ ...editingFeed, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feed URL</label>
                <input
                  type="text"
                  value={editingFeed.feedUrl || ""}
                  onChange={(e) => setEditingFeed({ ...editingFeed, feedUrl: e.target.value })}
                  placeholder="Leave empty to use KVCORE_FEED_URL environment variable"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isEnabled"
                  checked={editingFeed.isEnabled}
                  onChange={(e) => setEditingFeed({ ...editingFeed, isEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isEnabled" className="text-sm font-medium text-gray-700">
                  Feed Enabled
                </label>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="scheduleEnabled"
                    checked={editingFeed.scheduleEnabled}
                    onChange={(e) => setEditingFeed({ ...editingFeed, scheduleEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="scheduleEnabled" className="text-sm font-medium text-gray-700">
                    Enable Scheduled Sync
                  </label>
                </div>

                {editingFeed.scheduleEnabled && (
                  <div className="space-y-4 pl-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                      <select
                        value={editingFeed.scheduleFrequency}
                        onChange={(e) => setEditingFeed({ ...editingFeed, scheduleFrequency: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {FREQUENCY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {editingFeed.scheduleFrequency === "weekly" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                        <select
                          value={editingFeed.scheduleDayOfWeek ?? 0}
                          onChange={(e) => setEditingFeed({ ...editingFeed, scheduleDayOfWeek: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {DAY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(editingFeed.scheduleFrequency === "daily" || editingFeed.scheduleFrequency === "weekly") && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time (UTC)</label>
                        <input
                          type="time"
                          value={editingFeed.scheduleTime?.substring(0, 5) || "03:00"}
                          onChange={(e) => setEditingFeed({ ...editingFeed, scheduleTime: e.target.value + ":00" })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setEditingFeed(null)}
                className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFeed}
                disabled={isSavingFeed}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingFeed ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Totals */}
      {stats && (
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
      )}

      {/* Sync History */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Sync History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trigger</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Triggered By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {syncHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No sync history yet
                  </td>
                </tr>
              ) : (
                syncHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{log.trigger}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.startedAt ? new Date(log.startedAt).toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDuration(log.startedAt, log.completedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {log.stats.listingsCreated}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {log.stats.listingsUpdated}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.triggeredBy?.name || log.triggeredBy?.email || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {stats && (
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
      )}

      {/* Top Cities */}
      {stats && (
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
      )}

      {/* Sync Info */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          About Data Sync
        </h3>
        <p className="text-sm text-blue-700">
          Configure your data feeds above to set up automatic sync schedules. You can also trigger manual syncs
          at any time. For scheduled syncs in production, you&apos;ll need to set up a cron job or scheduled task
          to call the sync endpoint at the configured intervals.
        </p>
      </div>
    </div>
  );
}
