"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PortalUser {
  id: string;
  email: string;
  name: string | null;
  role: "agent" | "office_admin" | "super_admin";
  createdAt: string;
  agentInfo: {
    id: number;
    firstName: string | null;
    lastName: string | null;
  } | null;
  managedOffices: {
    id: number;
    name: string | null;
    brokerageName: string | null;
  }[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/portal/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      user.name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search);

    const matchesRole = filterRole === "all" || user.role === filterRole;

    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return (
          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
            Super Admin
          </span>
        );
      case "office_admin":
        return (
          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            Office Admin
          </span>
        );
      case "agent":
        return (
          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            Agent
          </span>
        );
      default:
        return (
          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            {role}
          </span>
        );
    }
  };

  const superAdmins = users.filter((u) => u.role === "super_admin").length;
  const officeAdmins = users.filter((u) => u.role === "office_admin").length;
  const agentUsers = users.filter((u) => u.role === "agent").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portal Users</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage users with portal access
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Super Admins</p>
          <p className="text-2xl font-bold text-purple-600">{superAdmins}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Office Admins</p>
          <p className="text-2xl font-bold text-blue-600">{officeAdmins}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Agents</p>
          <p className="text-2xl font-bold text-green-600">{agentUsers}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="office_admin">Office Admin</option>
            <option value="agent">Agent</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            {searchQuery || filterRole !== "all"
              ? "No users match your filters"
              : "No portal users found"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Associated With
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/portal/admin/users/${user.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        {user.name || user.email}
                      </Link>
                      {user.name && (
                        <div className="text-xs text-gray-500">{user.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4">
                      {user.role === "agent" && user.agentInfo && (
                        <Link
                          href={`/portal/admin/agents/${user.agentInfo.id}`}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {user.agentInfo.firstName} {user.agentInfo.lastName}
                        </Link>
                      )}
                      {user.role === "office_admin" && user.managedOffices.length > 0 && (
                        <div className="text-sm text-gray-900">
                          {user.managedOffices.map((office, i) => (
                            <span key={office.id}>
                              <Link
                                href={`/portal/admin/offices/${office.id}`}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                {office.name || office.brokerageName}
                              </Link>
                              {i < user.managedOffices.length - 1 && ", "}
                            </span>
                          ))}
                        </div>
                      )}
                      {user.role === "super_admin" && (
                        <div className="text-sm text-gray-500">All access</div>
                      )}
                      {!user.agentInfo && user.managedOffices.length === 0 && user.role !== "super_admin" && (
                        <div className="text-sm text-gray-400">-</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/portal/admin/users/${user.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
