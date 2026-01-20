"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface AgentDetail {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  licenseNum: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  portalUser: {
    id: string;
    email: string | null;
    name: string | null;
    role: string;
    createdAt: string;
  } | null;
  offices: {
    id: number;
    name: string | null;
    brokerageName: string | null;
    city: string | null;
    state: string | null;
  }[];
  stats: {
    listingCount: number;
    leadCount: number;
    leadsByStatus: {
      new: number;
      contacted: number;
      converted: number;
      closed: number;
    };
  };
  recentListings: {
    id: number;
    mlsId: string;
    streetAddress: string | null;
    city: string | null;
    state: string | null;
    price: string | null;
    status: string | null;
    propertyType: string | null;
    bedrooms: number | null;
    bathrooms: string | null;
  }[];
}

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgent() {
      try {
        const res = await fetch(`/api/portal/agents/${id}`);
        if (res.ok) {
          const data = await res.json();
          setAgent(data.agent);
        } else if (res.status === 404) {
          setError("Agent not found");
        } else {
          setError("Failed to load agent");
        }
      } catch (err) {
        setError("Failed to load agent");
      } finally {
        setIsLoading(false);
      }
    }
    fetchAgent();
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading agent...</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error || "Agent not found"}</p>
        <Link href="/portal/admin/agents" className="text-blue-600 hover:text-blue-700">
          Back to Agents
        </Link>
      </div>
    );
  }

  const agentName = [agent.firstName, agent.lastName].filter(Boolean).join(" ") || `Agent #${agent.id}`;

  const formatPrice = (price: string | null) => {
    if (!price) return "-";
    const num = parseFloat(price);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/portal/admin/agents"
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="flex items-center gap-4">
          {agent.photoUrl ? (
            <img
              src={agent.photoUrl}
              alt={agentName}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-2xl text-gray-500">
                {agent.firstName?.[0] || agent.lastName?.[0] || "?"}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{agentName}</h1>
            {agent.licenseNum && (
              <p className="text-sm text-gray-600">License: {agent.licenseNum}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {agent.email ? (
                    <a href={`mailto:${agent.email}`} className="text-blue-600 hover:text-blue-700">
                      {agent.email}
                    </a>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {agent.phone ? (
                    <a href={`tel:${agent.phone}`} className="text-blue-600 hover:text-blue-700">
                      {agent.phone}
                    </a>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Agent ID</dt>
                <dd className="text-sm font-medium text-gray-900">{agent.id}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">In System Since</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(agent.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Offices */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Associated Offices ({agent.offices.length})
            </h2>
            {agent.offices.length === 0 ? (
              <p className="text-gray-500 text-sm">No offices associated with this agent</p>
            ) : (
              <div className="space-y-3">
                {agent.offices.map((office) => (
                  <Link
                    key={office.id}
                    href={`/portal/admin/offices/${office.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {office.name || office.brokerageName || `Office #${office.id}`}
                    </p>
                    {office.city && office.state && (
                      <p className="text-xs text-gray-500">
                        {office.city}, {office.state}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Listings */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Listings
            </h2>
            {agent.recentListings.length === 0 ? (
              <p className="text-gray-500 text-sm">No listings found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Address
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Price
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {agent.recentListings.map((listing) => (
                      <tr key={listing.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="text-sm font-medium text-gray-900">
                            {listing.streetAddress || "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {listing.city}, {listing.state} | MLS: {listing.mlsId}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {formatPrice(listing.price)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              listing.status === "Active"
                                ? "bg-green-100 text-green-800"
                                : listing.status === "Pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : listing.status === "For Rent"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {listing.status || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-gray-600">
                          {listing.propertyType || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Portal Access */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Portal Access</h2>
            {agent.portalUser ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                  <span className="text-xs text-gray-500">
                    since {new Date(agent.portalUser.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Portal Email</p>
                  <p className="text-sm font-medium text-gray-900">
                    {agent.portalUser.email}
                  </p>
                </div>
                {agent.portalUser.name && (
                  <div>
                    <p className="text-sm text-gray-500">Display Name</p>
                    <p className="text-sm font-medium text-gray-900">
                      {agent.portalUser.name}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {agent.portalUser.role.replace("_", " ")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">No portal access</p>
                {agent.email && (
                  <Link
                    href={`/portal/invitations/new?agentId=${agent.id}&email=${encodeURIComponent(agent.email)}`}
                    className="inline-flex px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Invite to Portal
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Total Listings</dt>
                <dd className="text-sm font-medium text-gray-900">{agent.stats.listingCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Total Leads</dt>
                <dd className="text-sm font-medium text-gray-900">{agent.stats.leadCount}</dd>
              </div>
              <div className="border-t pt-3 mt-3">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Leads by Status</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">New</span>
                    <span className="text-sm font-medium text-blue-600">
                      {agent.stats.leadsByStatus.new}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Contacted</span>
                    <span className="text-sm font-medium text-yellow-600">
                      {agent.stats.leadsByStatus.contacted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Converted</span>
                    <span className="text-sm font-medium text-green-600">
                      {agent.stats.leadsByStatus.converted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Closed</span>
                    <span className="text-sm font-medium text-gray-600">
                      {agent.stats.leadsByStatus.closed}
                    </span>
                  </div>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
