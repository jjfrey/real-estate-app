"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  role: "agent" | "office_admin" | "super_admin";
  createdAt: string;
  updatedAt: string;
  agentInfo: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    licenseNum: string | null;
    leadCount: number;
  } | null;
  managedOffices: {
    id: number;
    name: string | null;
    brokerageName: string | null;
    city: string | null;
    state: string | null;
  }[];
}

const roleLabels: Record<string, string> = {
  agent: "Agent",
  office_admin: "Office Admin",
  company_admin: "Company Admin",
  super_admin: "Super Admin",
};

const roleBadgeColors: Record<string, string> = {
  agent: "bg-green-100 text-green-800",
  office_admin: "bg-blue-100 text-blue-800",
  company_admin: "bg-amber-100 text-amber-800",
  super_admin: "bg-purple-100 text-purple-800",
};

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Editable fields
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");

  const isOwnProfile = currentUserId === id;

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch current user and target user in parallel
        const [meRes, userRes] = await Promise.all([
          fetch("/api/portal/auth/me"),
          fetch(`/api/portal/users/${id}`),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUserId(meData.user?.id || null);
        }

        if (userRes.ok) {
          const data = await userRes.json();
          setUser(data.user);
          setEditName(data.user.name || "");
          setEditRole(data.user.role);
        } else if (userRes.status === 404) {
          setError("User not found");
        } else {
          setError("Failed to load user");
        }
      } catch (err) {
        setError("Failed to load user");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/portal/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName || null,
          role: editRole,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser((prev) =>
          prev
            ? {
                ...prev,
                name: data.user.name,
                role: data.user.role,
                // Clear associations if role changed
                agentInfo: data.user.role === "agent" ? prev.agentInfo : null,
                managedOffices:
                  data.user.role === "office_admin" ? prev.managedOffices : [],
              }
            : null
        );
        setSuccessMessage("User updated successfully");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update user");
      }
    } catch (err) {
      setError("Failed to update user");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    const confirmMessage = `Are you sure you want to delete ${user.name || user.email}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/portal/users/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/portal/admin/users");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete user");
        setIsDeleting(false);
      }
    } catch (err) {
      setError("Failed to delete user");
      setIsDeleting(false);
    }
  };

  const handleImpersonate = async () => {
    if (!user) return;

    setIsImpersonating(true);
    setError(null);

    try {
      const res = await fetch("/api/portal/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      if (res.ok) {
        // Redirect to portal dashboard as the impersonated user
        window.location.href = "/portal";
      } else {
        const data = await res.json();
        setError(data.error || "Failed to impersonate user");
        setIsImpersonating(false);
      }
    } catch (err) {
      setError("Failed to impersonate user");
      setIsImpersonating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading user...</p>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link
          href="/portal/admin/users"
          className="text-blue-600 hover:text-blue-700"
        >
          Back to Users
        </Link>
      </div>
    );
  }

  if (!user) return null;

  const hasChanges = editName !== (user.name || "") || editRole !== user.role;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/portal/admin/users"
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-5 h-5"
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
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.name || user.email}
            </h1>
            {user.name && (
              <p className="text-sm text-gray-600">{user.email}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
              roleBadgeColors[user.role] || "bg-gray-100 text-gray-800"
            }`}
          >
            {roleLabels[user.role] || user.role}
          </span>
          {!isOwnProfile && user.role !== "super_admin" && (
            <button
              onClick={handleImpersonate}
              disabled={isImpersonating}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-amber-700 bg-amber-100 rounded-full hover:bg-amber-200 disabled:opacity-50"
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              {isImpersonating ? "Starting..." : "Impersonate"}
            </button>
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
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Settings */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              User Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter display name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  disabled={isOwnProfile}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="agent">Agent</option>
                  <option value="office_admin">Office Admin</option>
                  <option value="company_admin">Company Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                {isOwnProfile && (
                  <p className="text-xs text-gray-500 mt-1">
                    You cannot change your own role.
                  </p>
                )}
                {!isOwnProfile && editRole !== user.role && (
                  <p className="text-xs text-amber-600 mt-1">
                    {user.role === "agent" &&
                      "Changing role will unlink this user from their agent record."}
                    {user.role === "office_admin" &&
                      "Changing role will remove office admin assignments."}
                  </p>
                )}
              </div>
              <div className="pt-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

          {/* Agent Info */}
          {user.role === "agent" && user.agentInfo && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Linked Agent
              </h2>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Link
                      href={`/portal/admin/agents/${user.agentInfo.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {user.agentInfo.firstName} {user.agentInfo.lastName}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {user.agentInfo.email}
                    </p>
                    {user.agentInfo.licenseNum && (
                      <p className="text-xs text-gray-400">
                        License: {user.agentInfo.licenseNum}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {user.agentInfo.leadCount}
                    </p>
                    <p className="text-xs text-gray-500">Leads</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Managed Offices */}
          {user.role === "office_admin" && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Managed Offices ({user.managedOffices.length})
              </h2>
              {user.managedOffices.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No offices assigned. Assign offices from the{" "}
                  <Link
                    href="/portal/admin/offices"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Offices page
                  </Link>
                  .
                </p>
              ) : (
                <div className="space-y-3">
                  {user.managedOffices.map((office) => (
                    <Link
                      key={office.id}
                      href={`/portal/admin/offices/${office.id}`}
                      className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-medium text-gray-900">
                        {office.name || office.brokerageName || `Office #${office.id}`}
                      </p>
                      {office.city && office.state && (
                        <p className="text-sm text-gray-500">
                          {office.city}, {office.state}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Info */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Account Info
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {user.email}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">User ID</dt>
                <dd className="text-xs font-mono text-gray-600 break-all">
                  {user.id}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Last Updated</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(user.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Danger Zone */}
          {!isOwnProfile && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
              <h2 className="text-lg font-semibold text-red-600 mb-4">
                Danger Zone
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Deleting this user will remove their portal access permanently.
                {user.role === "agent" &&
                  " The linked agent record will remain but will no longer have portal access."}
                {user.role === "office_admin" &&
                  " Office admin assignments will be removed."}
              </p>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete User"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
