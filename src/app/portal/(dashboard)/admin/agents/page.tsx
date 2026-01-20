"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Agent {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  userId: string | null;
  listingCount: number;
  portalUser: {
    id: string;
    email: string | null;
    name: string | null;
    role: string;
  } | null;
  office: {
    id: number;
    name: string | null;
    brokerageName: string | null;
  } | null;
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPortal, setFilterPortal] = useState<"all" | "with" | "without">("all");

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/portal/agents");
        if (res.ok) {
          const data = await res.json();
          setAgents(data.agents || []);
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAgents();
  }, []);

  const filteredAgents = agents.filter((agent) => {
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      agent.firstName?.toLowerCase().includes(search) ||
      agent.lastName?.toLowerCase().includes(search) ||
      agent.email?.toLowerCase().includes(search) ||
      agent.office?.name?.toLowerCase().includes(search);

    const matchesPortalFilter =
      filterPortal === "all" ||
      (filterPortal === "with" && agent.portalUser) ||
      (filterPortal === "without" && !agent.portalUser);

    return matchesSearch && matchesPortalFilter;
  });

  const totalAgents = agents.length;
  const withPortalAccess = agents.filter((a) => a.portalUser).length;
  const withoutPortalAccess = totalAgents - withPortalAccess;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Agents</h1>
        <p className="text-sm text-gray-600 mt-1">
          View and manage real estate agents
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Agents</p>
          <p className="text-2xl font-bold text-gray-900">{totalAgents}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">With Portal Access</p>
          <p className="text-2xl font-bold text-green-600">{withPortalAccess}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Without Portal Access</p>
          <p className="text-2xl font-bold text-gray-600">{withoutPortalAccess}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or office..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <select
            value={filterPortal}
            onChange={(e) => setFilterPortal(e.target.value as typeof filterPortal)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Agents</option>
            <option value="with">With Portal Access</option>
            <option value="without">Without Portal Access</option>
          </select>
        </div>
      </div>

      {/* Agents List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading agents...</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            {searchQuery || filterPortal !== "all"
              ? "No agents match your filters"
              : "No agents found"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Office
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Listings
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Portal Access
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {agent.firstName} {agent.lastName}
                      </div>
                      <div className="text-xs text-gray-500">ID: {agent.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {agent.office?.name || agent.office?.brokerageName || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {agent.email || "-"}
                      </div>
                      {agent.phone && (
                        <div className="text-xs text-gray-500">{agent.phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {agent.listingCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {agent.portalUser ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {!agent.portalUser && agent.email && (
                        <Link
                          href={`/portal/invitations/new?agentId=${agent.id}&email=${encodeURIComponent(agent.email)}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Invite
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-500 text-right">
        Showing {filteredAgents.length} of {totalAgents} agents
      </div>
    </div>
  );
}
