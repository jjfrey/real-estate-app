"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PortalRole } from "@/db/schema";

interface PortalUser {
  id: string;
  email: string;
  name: string | null;
  role: PortalRole;
}

interface InvitableAgent {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  office: {
    id: number;
    name: string | null;
    brokerageName: string | null;
  } | null;
}

interface Office {
  id: number;
  name: string | null;
  brokerageName: string | null;
}

export default function NewInvitationPage() {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const isSuperAdmin = user?.role === "super_admin";
  const isCompanyAdmin = user?.role === "company_admin";
  const canInviteOfficeAdmin = isSuperAdmin || isCompanyAdmin;

  const [inviteType, setInviteType] = useState<"agent" | "office_admin">("agent");

  // Fetch user info
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/portal/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    }
    fetchUser();
  }, []);
  const [email, setEmail] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);

  const [agents, setAgents] = useState<InvitableAgent[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isLoadingOffices, setIsLoadingOffices] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  // Load invitable agents
  useEffect(() => {
    async function loadAgents() {
      if (inviteType !== "agent") return;

      setIsLoadingAgents(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);

        const res = await fetch(`/api/portal/agents/invitable?${params}`);
        const data = await res.json();
        setAgents(data.agents || []);
      } catch (error) {
        console.error("Error loading agents:", error);
      } finally {
        setIsLoadingAgents(false);
      }
    }

    const debounce = setTimeout(loadAgents, 300);
    return () => clearTimeout(debounce);
  }, [inviteType, searchQuery]);

  // Load offices for office_admin invites (super admin and company admin)
  useEffect(() => {
    async function loadOffices() {
      if (inviteType !== "office_admin" || !canInviteOfficeAdmin) return;

      setIsLoadingOffices(true);
      try {
        const res = await fetch("/api/portal/offices");
        const data = await res.json();
        setOffices(data.offices || []);
      } catch (error) {
        console.error("Error loading offices:", error);
      } finally {
        setIsLoadingOffices(false);
      }
    }

    loadOffices();
  }, [inviteType, canInviteOfficeAdmin]);

  // Auto-fill email when agent is selected
  useEffect(() => {
    if (selectedAgentId) {
      const agent = agents.find((a) => a.id === selectedAgentId);
      if (agent?.email) {
        setEmail(agent.email);
      }
    }
  }, [selectedAgentId, agents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInviteUrl(null);

    if (!email) {
      setError("Email is required");
      return;
    }

    if (inviteType === "agent" && !selectedAgentId) {
      setError("Please select an agent");
      return;
    }

    if (inviteType === "office_admin" && !selectedOfficeId) {
      setError("Please select an office");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/portal/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          type: inviteType,
          agentId: inviteType === "agent" ? selectedAgentId : undefined,
          officeId: selectedOfficeId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // In development, show the invite URL
        if (data.inviteUrl) {
          setInviteUrl(data.inviteUrl);
        } else {
          router.push("/portal/invitations");
        }
      } else {
        setError(data.error || "Failed to create invitation");
      }
    } catch (error) {
      console.error("Error creating invitation:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (inviteUrl) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Invitation Created!
          </h2>
          <p className="text-gray-600 mb-4">
            The invitation has been sent to <strong>{email}</strong>
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">
              Development mode - Share this link:
            </p>
            <div className="bg-white border rounded p-2 text-sm break-all text-left">
              {inviteUrl}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(inviteUrl)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Copy to clipboard
            </button>
          </div>

          <div className="flex justify-center gap-4">
            <Link
              href="/portal/invitations"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              View All Invitations
            </Link>
            <button
              onClick={() => {
                setInviteUrl(null);
                setEmail("");
                setSelectedAgentId(null);
                setSelectedOfficeId(null);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Send Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/portal/invitations"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Invitations
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h1 className="text-xl font-semibold text-gray-900">
            Create New Invitation
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Send an invitation to join the agent portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Invite Type (super admin and company admin) */}
          {canInviteOfficeAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invitation Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="agent"
                    checked={inviteType === "agent"}
                    onChange={(e) => {
                      setInviteType(e.target.value as "agent");
                      setSelectedAgentId(null);
                      setSelectedOfficeId(null);
                      setEmail("");
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Agent</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="office_admin"
                    checked={inviteType === "office_admin"}
                    onChange={(e) => {
                      setInviteType(e.target.value as "office_admin");
                      setSelectedAgentId(null);
                      setSelectedOfficeId(null);
                      setEmail("");
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Office Admin</span>
                </label>
              </div>
            </div>
          )}

          {/* Agent Selection */}
          {inviteType === "agent" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Agent
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="border rounded-md max-h-60 overflow-y-auto">
                {isLoadingAgents ? (
                  <div className="p-4 text-center text-gray-500">
                    Loading agents...
                  </div>
                ) : agents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No invitable agents found
                  </div>
                ) : (
                  <div className="divide-y">
                    {agents.map((agent) => (
                      <label
                        key={agent.id}
                        className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 ${
                          selectedAgentId === agent.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="agent"
                          value={agent.id}
                          checked={selectedAgentId === agent.id}
                          onChange={() => setSelectedAgentId(agent.id)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {agent.firstName} {agent.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {agent.email || "No email"}
                            {agent.office && (
                              <span className="ml-2">
                                - {agent.office.name || agent.office.brokerageName}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Office Selection (for office_admin invites) */}
          {inviteType === "office_admin" && canInviteOfficeAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Office
              </label>
              {isLoadingOffices ? (
                <div className="text-sm text-gray-500">Loading offices...</div>
              ) : (
                <select
                  value={selectedOfficeId || ""}
                  onChange={(e) => setSelectedOfficeId(parseInt(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an office...</option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.name || office.brokerageName || `Office #${office.id}`}
                    </option>
                  ))}
                </select>
              )}
              {isCompanyAdmin && (
                <p className="text-xs text-gray-500 mt-1">
                  Only offices in your company are shown.
                </p>
              )}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={inviteType === "agent" ? "Select an agent above to auto-fill" : "Enter email address"}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {inviteType === "agent" && !selectedAgentId && (
              <p className="text-xs text-gray-500 mt-1">
                Select an agent first - their email will auto-fill here.
              </p>
            )}
            {inviteType === "agent" && selectedAgentId && (
              <p className="text-xs text-gray-500 mt-1">
                Pre-filled from agent record. You can change it if needed.
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link
              href="/portal/invitations"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
