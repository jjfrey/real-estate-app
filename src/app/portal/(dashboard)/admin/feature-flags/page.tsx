"use client";

import { useState, useEffect, useCallback } from "react";

interface FeatureFlag {
  id: number;
  key: string;
  description: string | null;
  enabledGlobal: boolean;
  enabledSites: string | null; // JSON array
  rolloutPercentage: number;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/feature-flags");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setFlags(data);
    } catch {
      setError("Failed to load feature flags");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/portal/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey, description: newDescription }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      setNewKey("");
      setNewDescription("");
      setShowCreate(false);
      fetchFlags();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create flag");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleGlobal = async (flag: FeatureFlag) => {
    try {
      const res = await fetch("/api/portal/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: flag.id, enabledGlobal: !flag.enabledGlobal }),
      });
      if (!res.ok) throw new Error("Failed to update");
      fetchFlags();
    } catch {
      setError("Failed to toggle flag");
    }
  };

  const handleToggleSite = async (flag: FeatureFlag, siteId: string) => {
    const currentSites: string[] = flag.enabledSites ? JSON.parse(flag.enabledSites) : [];
    const newSites = currentSites.includes(siteId)
      ? currentSites.filter((s) => s !== siteId)
      : [...currentSites, siteId];

    try {
      const res = await fetch("/api/portal/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: flag.id, enabledSites: newSites }),
      });
      if (!res.ok) throw new Error("Failed to update");
      fetchFlags();
    } catch {
      setError("Failed to toggle site");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this flag?")) return;
    try {
      const res = await fetch(`/api/portal/feature-flags?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchFlags();
    } catch {
      setError("Failed to delete flag");
    }
  };

  const getSitesEnabled = (flag: FeatureFlag): string[] => {
    if (!flag.enabledSites) return [];
    try {
      return JSON.parse(flag.enabledSites);
    } catch {
      return [];
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading feature flags...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage feature toggles across sites
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover transition-colors"
        >
          {showCreate ? "Cancel" : "New Flag"}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError("")} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g., new_search_ui"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What does this flag control?"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Flag"}
          </button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-700">Key</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Description</th>
              <th className="text-center px-4 py-3 font-medium text-gray-700">Global</th>
              <th className="text-center px-4 py-3 font-medium text-gray-700">Distinct</th>
              <th className="text-center px-4 py-3 font-medium text-gray-700">Harmon</th>
              <th className="text-center px-4 py-3 font-medium text-gray-700">Rollout %</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {flags.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No feature flags yet. Create one to get started.
                </td>
              </tr>
            ) : (
              flags.map((flag) => {
                const sitesEnabled = getSitesEnabled(flag);
                return (
                  <tr key={flag.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {flag.key}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{flag.description || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleGlobal(flag)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          flag.enabledGlobal ? "bg-green-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            flag.enabledGlobal ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleSite(flag, "distinct")}
                        disabled={flag.enabledGlobal}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          flag.enabledGlobal || sitesEnabled.includes("distinct")
                            ? "bg-blue-500"
                            : "bg-gray-300"
                        } ${flag.enabledGlobal ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            flag.enabledGlobal || sitesEnabled.includes("distinct")
                              ? "translate-x-5"
                              : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleSite(flag, "harmon")}
                        disabled={flag.enabledGlobal}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          flag.enabledGlobal || sitesEnabled.includes("harmon")
                            ? "bg-green-500"
                            : "bg-gray-300"
                        } ${flag.enabledGlobal ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            flag.enabledGlobal || sitesEnabled.includes("harmon")
                              ? "translate-x-5"
                              : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {flag.rolloutPercentage}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(flag.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
