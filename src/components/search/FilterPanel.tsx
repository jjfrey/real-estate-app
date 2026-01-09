"use client";

import { useState } from "react";

export interface FilterValues {
  status: string[];
  propertyType: string[];
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
}

interface FilterPanelProps {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

const STATUS_OPTIONS = [
  { value: "Active", label: "For Sale" },
  { value: "For Rent", label: "For Rent" },
  { value: "Pending", label: "Pending" },
  { value: "Contingent", label: "Contingent" },
  { value: "Coming Soon", label: "Coming Soon" },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: "SingleFamily", label: "Single Family" },
  { value: "Condo", label: "Condo" },
  { value: "Townhouse", label: "Townhouse" },
  { value: "VacantLand", label: "Land" },
  { value: "MultiFamily", label: "Multi-Family" },
  { value: "Manufactured", label: "Manufactured" },
];

const PRICE_OPTIONS = [
  { value: 0, label: "No Min" },
  { value: 100000, label: "$100K" },
  { value: 200000, label: "$200K" },
  { value: 300000, label: "$300K" },
  { value: 400000, label: "$400K" },
  { value: 500000, label: "$500K" },
  { value: 750000, label: "$750K" },
  { value: 1000000, label: "$1M" },
  { value: 1500000, label: "$1.5M" },
  { value: 2000000, label: "$2M" },
  { value: 3000000, label: "$3M" },
  { value: 5000000, label: "$5M" },
];

const BED_OPTIONS = [
  { value: undefined, label: "Any" },
  { value: 1, label: "1+" },
  { value: 2, label: "2+" },
  { value: 3, label: "3+" },
  { value: 4, label: "4+" },
  { value: 5, label: "5+" },
];

const BATH_OPTIONS = [
  { value: undefined, label: "Any" },
  { value: 1, label: "1+" },
  { value: 1.5, label: "1.5+" },
  { value: 2, label: "2+" },
  { value: 3, label: "3+" },
  { value: 4, label: "4+" },
];

export function FilterPanel({
  filters,
  onChange,
  onClose,
  isMobile = false,
}: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<FilterValues>(filters);

  const handleStatusChange = (status: string) => {
    const newStatus = localFilters.status.includes(status)
      ? localFilters.status.filter((s) => s !== status)
      : [...localFilters.status, status];
    const updated = { ...localFilters, status: newStatus };
    setLocalFilters(updated);
    if (!isMobile) onChange(updated);
  };

  const handlePropertyTypeChange = (type: string) => {
    const newTypes = localFilters.propertyType.includes(type)
      ? localFilters.propertyType.filter((t) => t !== type)
      : [...localFilters.propertyType, type];
    const updated = { ...localFilters, propertyType: newTypes };
    setLocalFilters(updated);
    if (!isMobile) onChange(updated);
  };

  const handleChange = (key: keyof FilterValues, value: number | undefined) => {
    const updated = { ...localFilters, [key]: value };
    setLocalFilters(updated);
    if (!isMobile) onChange(updated);
  };

  const handleApply = () => {
    onChange(localFilters);
    onClose?.();
  };

  const handleReset = () => {
    const reset: FilterValues = {
      status: [],
      propertyType: [],
      minPrice: undefined,
      maxPrice: undefined,
      minBeds: undefined,
      maxBeds: undefined,
      minBaths: undefined,
      maxBaths: undefined,
    };
    setLocalFilters(reset);
    if (!isMobile) onChange(reset);
  };

  const activeCount =
    localFilters.status.length +
    localFilters.propertyType.length +
    (localFilters.minPrice ? 1 : 0) +
    (localFilters.maxPrice ? 1 : 0) +
    (localFilters.minBeds ? 1 : 0) +
    (localFilters.minBaths ? 1 : 0);

  return (
    <div
      className={`bg-white ${isMobile ? "h-full flex flex-col" : "rounded-xl shadow-xl border border-gray-100 p-6"}`}
    >
      {/* Header */}
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      <div className={`${isMobile ? "flex-1 overflow-y-auto p-4" : ""} space-y-6`}>
        {/* Status */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Listing Status
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  localFilters.status.includes(option.value)
                    ? "bg-[#0c87f2] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Property Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Property Type
          </label>
          <div className="flex flex-wrap gap-2">
            {PROPERTY_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePropertyTypeChange(option.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  localFilters.propertyType.includes(option.value)
                    ? "bg-[#0c87f2] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Price Range
          </label>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={localFilters.minPrice || ""}
              onChange={(e) =>
                handleChange(
                  "minPrice",
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#0c87f2] focus:ring-1 focus:ring-[#0c87f2] outline-none"
            >
              <option value="">No Min</option>
              {PRICE_OPTIONS.slice(1).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={localFilters.maxPrice || ""}
              onChange={(e) =>
                handleChange(
                  "maxPrice",
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#0c87f2] focus:ring-1 focus:ring-[#0c87f2] outline-none"
            >
              <option value="">No Max</option>
              {PRICE_OPTIONS.slice(1).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bedrooms */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Bedrooms
          </label>
          <div className="flex gap-2">
            {BED_OPTIONS.map((option) => (
              <button
                key={option.label}
                onClick={() => handleChange("minBeds", option.value)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  localFilters.minBeds === option.value
                    ? "bg-[#0c87f2] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bathrooms */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Bathrooms
          </label>
          <div className="flex gap-2">
            {BATH_OPTIONS.map((option) => (
              <button
                key={option.label}
                onClick={() => handleChange("minBaths", option.value)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  localFilters.minBaths === option.value
                    ? "bg-[#0c87f2] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div
        className={`${isMobile ? "p-4 border-t" : "mt-6 pt-6 border-t"} flex gap-3`}
      >
        <button
          onClick={handleReset}
          className="flex-1 px-4 py-3 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
        >
          Reset
          {activeCount > 0 && (
            <span className="ml-1 text-gray-400">({activeCount})</span>
          )}
        </button>
        {isMobile && (
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-3 rounded-lg bg-[#0c87f2] text-white font-medium hover:bg-[#0068d0] transition-colors"
          >
            Apply Filters
          </button>
        )}
      </div>
    </div>
  );
}
