"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Office {
  id: number;
  name: string | null;
  brokerageName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  listingCount: number;
  adminCount: number;
}

export default function AdminOfficesPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchOffices() {
      try {
        const res = await fetch("/api/portal/offices");
        if (res.ok) {
          const data = await res.json();
          setOffices(data.offices || []);
        }
      } catch (error) {
        console.error("Error fetching offices:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOffices();
  }, []);

  const filteredOffices = offices.filter((office) => {
    const search = searchQuery.toLowerCase();
    return (
      office.name?.toLowerCase().includes(search) ||
      office.brokerageName?.toLowerCase().includes(search) ||
      office.city?.toLowerCase().includes(search)
    );
  });

  const totalListings = offices.reduce((sum, o) => sum + Number(o.listingCount), 0);
  const totalAdmins = offices.reduce((sum, o) => sum + Number(o.adminCount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Offices</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage brokerage offices and their admins
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Offices</p>
          <p className="text-2xl font-bold text-gray-900">{offices.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Listings</p>
          <p className="text-2xl font-bold text-gray-900">{totalListings}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Office Admins</p>
          <p className="text-2xl font-bold text-gray-900">{totalAdmins}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search offices by name, brokerage, or city..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Offices List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading offices...</p>
          </div>
        ) : filteredOffices.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            {searchQuery ? "No offices match your search" : "No offices found"}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Listings
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admins
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOffices.map((office) => (
                <tr key={office.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {office.name || office.brokerageName || `Office #${office.id}`}
                    </div>
                    {office.name && office.brokerageName && (
                      <div className="text-xs text-gray-500">
                        {office.brokerageName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {office.city && office.state
                        ? `${office.city}, ${office.state}`
                        : office.city || office.state || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {office.email || "-"}
                    </div>
                    {office.phone && (
                      <div className="text-xs text-gray-500">{office.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {office.listingCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      Number(office.adminCount) > 0
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {office.adminCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/portal/admin/offices/${office.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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
    </div>
  );
}
