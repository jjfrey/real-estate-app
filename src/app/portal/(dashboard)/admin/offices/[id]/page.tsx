"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface OfficeAdmin {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

interface OfficeAgent {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  userId: string | null;
  portalUser: {
    id: string;
    email: string | null;
    name: string | null;
  } | null;
}

interface Office {
  id: number;
  name: string | null;
  brokerageName: string | null;
  phone: string | null;
  email: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  leadRoutingEmail: string | null;
  routeToTeamLead: boolean;
  admins: OfficeAdmin[];
  agents: OfficeAgent[];
  listingCount: number;
}

export default function OfficeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [office, setOffice] = useState<Office | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Editable fields
  const [leadRoutingEmail, setLeadRoutingEmail] = useState("");
  const [routeToTeamLead, setRouteToTeamLead] = useState(false);

  useEffect(() => {
    async function fetchOffice() {
      try {
        const res = await fetch(`/api/portal/offices/${id}`);
        if (res.ok) {
          const data = await res.json();
          setOffice(data.office);
          setLeadRoutingEmail(data.office.leadRoutingEmail || "");
          setRouteToTeamLead(data.office.routeToTeamLead || false);
        } else if (res.status === 404) {
          setError("Office not found");
        } else {
          setError("Failed to load office");
        }
      } catch (err) {
        setError("Failed to load office");
      } finally {
        setIsLoading(false);
      }
    }
    fetchOffice();
  }, [id]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/portal/offices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadRoutingEmail, routeToTeamLead }),
      });

      if (res.ok) {
        setSuccessMessage("Settings saved successfully");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save settings");
      }
    } catch (err) {
      setError("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAdmin = async (userId: string, userName: string | null) => {
    if (!confirm(`Remove ${userName || "this admin"} from this office?`)) return;

    try {
      const res = await fetch(`/api/portal/offices/${id}/admins?userId=${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setOffice((prev) =>
          prev ? { ...prev, admins: prev.admins.filter((a) => a.id !== userId) } : null
        );
        setSuccessMessage("Admin removed");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to remove admin");
      }
    } catch (err) {
      setError("Failed to remove admin");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading office...</p>
      </div>
    );
  }

  if (error && !office) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/portal/admin/offices" className="text-blue-600 hover:text-blue-700">
          Back to Offices
        </Link>
      </div>
    );
  }

  if (!office) return null;

  const officeName = office.name || office.brokerageName || `Office #${office.id}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/portal/admin/offices"
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{officeName}</h1>
          {office.name && office.brokerageName && (
            <p className="text-sm text-gray-600">{office.brokerageName}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Office Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Office Information</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="text-sm font-medium text-gray-900">{office.phone || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm font-medium text-gray-900">{office.email || "-"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-gray-500">Address</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {office.streetAddress ? (
                    <>
                      {office.streetAddress}
                      <br />
                      {office.city}, {office.state} {office.zip}
                    </>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Listings</dt>
                <dd className="text-sm font-medium text-gray-900">{office.listingCount}</dd>
              </div>
            </dl>
          </div>

          {/* Lead Settings */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Routing Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Routing Email
                </label>
                <input
                  type="email"
                  value={leadRoutingEmail}
                  onChange={(e) => setLeadRoutingEmail(e.target.value)}
                  placeholder="leads@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leads for this office will be sent to this email address
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="routeToTeamLead"
                  checked={routeToTeamLead}
                  onChange={(e) => setRouteToTeamLead(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="routeToTeamLead" className="text-sm text-gray-700">
                  Route leads to team lead first
                </label>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

          {/* Agents */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Agents ({office.agents.length})
              </h2>
            </div>
            {office.agents.length === 0 ? (
              <p className="text-gray-500 text-sm">No agents associated with this office</p>
            ) : (
              <div className="divide-y">
                {office.agents.map((agent) => (
                  <div key={agent.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {agent.firstName} {agent.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{agent.email || "No email"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {agent.portalUser ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Portal Active
                        </span>
                      ) : agent.email ? (
                        <Link
                          href={`/portal/invitations/new?agentId=${agent.id}&email=${encodeURIComponent(agent.email)}`}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Invite
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">No email</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Office Admins */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Office Admins</h2>
              <Link
                href={`/portal/invitations/new?type=office_admin&officeId=${office.id}`}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Invite
              </Link>
            </div>
            {office.admins.length === 0 ? (
              <p className="text-gray-500 text-sm">No admins assigned</p>
            ) : (
              <div className="space-y-3">
                {office.admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {admin.name || admin.email}
                      </p>
                      {admin.name && (
                        <p className="text-xs text-gray-500">{admin.email}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveAdmin(admin.id, admin.name)}
                      className="text-red-600 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Total Listings</dt>
                <dd className="text-sm font-medium text-gray-900">{office.listingCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Total Agents</dt>
                <dd className="text-sm font-medium text-gray-900">{office.agents.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">With Portal Access</dt>
                <dd className="text-sm font-medium text-green-600">
                  {office.agents.filter((a) => a.portalUser).length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Office Admins</dt>
                <dd className="text-sm font-medium text-gray-900">{office.admins.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
