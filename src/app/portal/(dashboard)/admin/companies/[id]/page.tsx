"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CompanyAdmin {
  id: number;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  createdAt: string;
}

interface CompanyOffice {
  id: number;
  name: string | null;
  brokerageName: string | null;
  city: string | null;
  state: string | null;
  listingCount: number;
}

interface Company {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  offices: CompanyOffice[];
  admins: CompanyAdmin[];
}

interface AvailableUser {
  id: string;
  name: string | null;
  email: string;
}

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    website: "",
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Add admin modal state
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [addAdminError, setAddAdminError] = useState<string | null>(null);

  async function fetchCompany() {
    try {
      const res = await fetch(`/api/portal/companies/${id}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to load company");
        return;
      }
      const data = await res.json();
      setCompany(data.company);
      setEditForm({
        name: data.company.name,
        slug: data.company.slug,
        email: data.company.email || "",
        phone: data.company.phone || "",
        website: data.company.website || "",
        description: data.company.description || "",
      });
    } catch (err) {
      console.error("Error fetching company:", err);
      setError("An error occurred loading the company");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchAvailableUsers() {
    try {
      // Get users with company_admin role who are not already admins of this company
      const res = await fetch("/api/portal/users");
      if (res.ok) {
        const data = await res.json();
        const companyAdminUsers = data.users.filter(
          (u: { role: string; id: string }) =>
            u.role === "company_admin" &&
            !company?.admins.some((a) => a.user.id === u.id)
        );
        setAvailableUsers(companyAdminUsers);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }

  useEffect(() => {
    fetchCompany();
  }, [id]);

  useEffect(() => {
    if (showAddAdminModal) {
      fetchAvailableUsers();
    }
  }, [showAddAdminModal, company]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/portal/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error || "Failed to update company");
        return;
      }

      setCompany((prev) => (prev ? { ...prev, ...data.company } : null));
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving company:", err);
      setSaveError("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;

    setIsAddingAdmin(true);
    setAddAdminError(null);

    try {
      const res = await fetch(`/api/portal/companies/${id}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddAdminError(data.error || "Failed to add admin");
        return;
      }

      setShowAddAdminModal(false);
      setSelectedUserId("");
      fetchCompany();
    } catch (err) {
      console.error("Error adding admin:", err);
      setAddAdminError("An error occurred. Please try again.");
    } finally {
      setIsAddingAdmin(false);
    }
  }

  async function handleRemoveAdmin(userId: string) {
    if (!confirm("Are you sure you want to remove this admin?")) return;

    try {
      const res = await fetch(`/api/portal/companies/${id}/admins?userId=${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchCompany();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove admin");
      }
    } catch (err) {
      console.error("Error removing admin:", err);
      alert("An error occurred");
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading company...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{error || "Company not found"}</p>
        <Link href="/portal/admin/companies" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Companies
        </Link>
      </div>
    );
  }

  const totalListings = company.offices.reduce((sum, o) => sum + Number(o.listingCount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Link href="/portal/admin/companies" className="hover:text-blue-600">
              Companies
            </Link>
            <span>/</span>
            <span>{company.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-amber-700 font-bold text-lg">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              <p className="text-sm text-gray-500">{company.slug}</p>
            </div>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium text-sm"
          >
            Edit Company
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Offices</p>
          <p className="text-2xl font-bold text-gray-900">{company.offices.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Listings</p>
          <p className="text-2xl font-bold text-gray-900">{totalListings}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Company Admins</p>
          <p className="text-2xl font-bold text-gray-900">{company.admins.length}</p>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Company</h2>
          <form onSubmit={handleSave} className="space-y-4">
            {saveError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {saveError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  required
                  value={editForm.slug}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={editForm.website}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setSaveError(null);
                  setEditForm({
                    name: company.name,
                    slug: company.slug,
                    email: company.email || "",
                    phone: company.phone || "",
                    website: company.website || "",
                    description: company.description || "",
                  });
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md font-medium"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Company Admins */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Company Admins</h2>
          <button
            onClick={() => setShowAddAdminModal(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Add Admin
          </button>
        </div>
        {company.admins.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            No company admins assigned yet
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {company.admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/portal/admin/users/${admin.user.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      {admin.user.name || admin.user.email}
                    </Link>
                    {admin.user.name && (
                      <div className="text-xs text-gray-500">{admin.user.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {admin.createdAt
                      ? new Date(admin.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleRemoveAdmin(admin.user.id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Company Offices */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Offices</h2>
          <p className="text-sm text-gray-600">
            Offices assigned to this company
          </p>
        </div>
        {company.offices.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            No offices assigned to this company yet
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Office
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Listings
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {company.offices.map((office) => (
                <tr key={office.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {office.name || office.brokerageName || `Office #${office.id}`}
                    </div>
                    {office.name && office.brokerageName && (
                      <div className="text-xs text-gray-500">{office.brokerageName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {office.city && office.state
                      ? `${office.city}, ${office.state}`
                      : office.city || office.state || "-"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {office.listingCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/portal/admin/offices/${office.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Add Company Admin</h2>
              <p className="text-sm text-gray-600 mt-1">
                Select a user with the Company Admin role to add
              </p>
            </div>

            <form onSubmit={handleAddAdmin} className="p-6 space-y-4">
              {addAdminError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {addAdminError}
                </div>
              )}

              {availableUsers.length === 0 ? (
                <div className="text-center py-4 text-gray-600">
                  <p>No available users with Company Admin role.</p>
                  <p className="text-sm mt-2">
                    Create a user with the Company Admin role first.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select User
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a user...</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAdminModal(false);
                    setAddAdminError(null);
                    setSelectedUserId("");
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md font-medium"
                  disabled={isAddingAdmin}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingAdmin || availableUsers.length === 0 || !selectedUserId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {isAddingAdmin ? "Adding..." : "Add Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
