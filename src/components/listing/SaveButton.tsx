"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface SaveButtonProps {
  listingId: number;
  showLabel?: boolean;
}

export function SaveButton({ listingId, showLabel = true }: SaveButtonProps) {
  const { data: session, status } = useSession();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if listing is saved on mount
  useEffect(() => {
    if (status !== "authenticated") return;

    const checkSaved = async () => {
      try {
        const response = await fetch(`/api/saved-listings?listingIds=${listingId}`);
        if (response.ok) {
          const data = await response.json();
          setIsSaved(data.savedListingIds.includes(listingId));
        }
      } catch (error) {
        console.error("Error checking saved status:", error);
      }
    };

    checkSaved();
  }, [listingId, status]);

  const handleClick = async () => {
    if (status !== "authenticated") {
      // Redirect to sign in
      window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setIsLoading(true);
    const newSavedState = !isSaved;

    // Optimistic update
    setIsSaved(newSavedState);

    try {
      if (newSavedState) {
        const response = await fetch("/api/saved-listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId }),
        });
        if (!response.ok && response.status !== 409) {
          throw new Error("Failed to save");
        }
      } else {
        const response = await fetch(`/api/saved-listings?listingId=${listingId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Failed to unsave");
        }
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      // Revert on error
      setIsSaved(!newSavedState);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`flex items-center gap-2 transition-colors ${
        isSaved
          ? "text-red-500 hover:text-red-600"
          : "text-gray-600 hover:text-gray-900"
      } ${isLoading ? "opacity-50" : ""}`}
    >
      <svg
        className="w-5 h-5"
        fill={isSaved ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {showLabel && (
        <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
      )}
    </button>
  );
}
