"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  leadType: string;
  message: string | null;
  status: string;
  notes: string | null;
  preferredTourDate: string | null;
  preferredTourTime: string | null;
  createdAt: string;
  contactedAt: string | null;
  convertedAt: string | null;
  closedAt: string | null;
  listing: {
    id: number;
    streetAddress: string;
    city: string;
    state: string;
    zip: string;
    price: string;
    mlsId: string;
    bedrooms: number | null;
    bathrooms: string | null;
    propertyType: string | null;
    photos: { id: number; url: string }[];
  } | null;
  agent: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  office: {
    id: number;
    name: string | null;
    brokerageName: string | null;
  } | null;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  contacted: "bg-yellow-100 text-yellow-800 border-yellow-200",
  converted: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "closed", label: "Closed" },
];

const leadTypeLabels: Record<string, string> = {
  info_request: "Information Request",
  tour_request: "Tour Request",
};

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLead() {
      try {
        const res = await fetch(`/api/portal/leads/${id}`);
        if (res.ok) {
          const data = await res.json();
          setLead(data.lead);
          setNotes(data.lead.notes || "");
        } else if (res.status === 404) {
          setError("Lead not found");
        } else if (res.status === 403) {
          setError("You don't have access to this lead");
        } else {
          setError("Failed to load lead");
        }
      } catch {
        setError("Failed to load lead");
      } finally {
        setIsLoading(false);
      }
    }

    fetchLead();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!lead || lead.status === newStatus) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/portal/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setLead((prev) => (prev ? { ...prev, ...data.lead } : null));
      }
    } catch {
      console.error("Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!lead) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/portal/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (res.ok) {
        const data = await res.json();
        setLead((prev) => (prev ? { ...prev, ...data.lead } : null));
      }
    } catch {
      console.error("Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => router.push("/portal/leads")}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to Leads
        </button>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/portal/leads"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Leads
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
            <p className="text-gray-600">
              {leadTypeLabels[lead.leadType] || lead.leadType}
            </p>
          </div>
          <span
            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full capitalize border ${
              statusColors[lead.status] || "bg-gray-100 text-gray-800"
            }`}
          >
            {lead.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Contact Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <a
                  href={`mailto:${lead.email}`}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {lead.email}
                </a>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.preferredTourDate && (
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-gray-600">
                    Preferred: {lead.preferredTourDate}
                    {lead.preferredTourTime && ` at ${lead.preferredTourTime}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Message */}
          {lead.message && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Message
              </h2>
              <p className="text-gray-600 whitespace-pre-wrap">{lead.message}</p>
            </div>
          )}

          {/* Property */}
          {lead.listing && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Property
              </h2>
              <div className="flex gap-4">
                {lead.listing.photos.length > 0 && (
                  <div className="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={lead.listing.photos[0].url}
                      alt={lead.listing.streetAddress}
                      width={128}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {lead.listing.streetAddress}
                  </div>
                  <div className="text-sm text-gray-500">
                    {lead.listing.city}, {lead.listing.state} {lead.listing.zip}
                  </div>
                  <div className="text-lg font-semibold text-blue-600 mt-1">
                    {formatPrice(lead.listing.price)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {lead.listing.bedrooms && `${lead.listing.bedrooms} bed`}
                    {lead.listing.bathrooms && ` • ${lead.listing.bathrooms} bath`}
                    {lead.listing.propertyType && ` • ${lead.listing.propertyType}`}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    MLS# {lead.listing.mlsId}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this lead..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleSaveNotes}
                disabled={isSaving || notes === (lead.notes || "")}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  disabled={isSaving}
                  className={`w-full px-4 py-2 rounded-md text-left text-sm font-medium transition-colors ${
                    lead.status === option.value
                      ? statusColors[option.value]
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  } disabled:opacity-50`}
                >
                  {option.label}
                  {lead.status === option.value && (
                    <svg
                      className="w-4 h-4 inline-block ml-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Timeline
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Lead Created
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(lead.createdAt)}
                  </div>
                </div>
              </div>
              {lead.contactedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-yellow-500"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Contacted
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(lead.contactedAt)}
                    </div>
                  </div>
                </div>
              )}
              {lead.convertedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-green-500"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Converted
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(lead.convertedAt)}
                    </div>
                  </div>
                </div>
              )}
              {lead.closedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-gray-500"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Closed
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(lead.closedAt)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Agent/Office info */}
          {(lead.agent || lead.office) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Assignment
              </h2>
              {lead.agent && (
                <div className="mb-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Agent
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {lead.agent.firstName} {lead.agent.lastName}
                  </div>
                </div>
              )}
              {lead.office && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Office
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {lead.office.name || lead.office.brokerageName}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
