"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";

export function useSavedListings(listingIds: number[] = []) {
  const { data: session, status } = useSession();
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Fetch saved status for listing IDs
  useEffect(() => {
    if (status !== "authenticated" || listingIds.length === 0) {
      setSavedIds(new Set());
      return;
    }

    const fetchSavedStatus = async () => {
      try {
        const response = await fetch(
          `/api/saved-listings?listingIds=${listingIds.join(",")}`
        );
        if (response.ok) {
          const data = await response.json();
          setSavedIds(new Set(data.savedListingIds));
        }
      } catch (error) {
        console.error("Error fetching saved status:", error);
      }
    };

    fetchSavedStatus();
  }, [status, listingIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSave = useCallback(
    async (listingId: number, shouldSave: boolean) => {
      if (!session?.user) {
        // Redirect to sign in
        window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }

      // Optimistic update
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (shouldSave) {
          next.add(listingId);
        } else {
          next.delete(listingId);
        }
        return next;
      });

      setIsLoading(true);
      try {
        if (shouldSave) {
          const response = await fetch("/api/saved-listings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listingId }),
          });
          if (!response.ok && response.status !== 409) {
            throw new Error("Failed to save");
          }
        } else {
          const response = await fetch(
            `/api/saved-listings?listingId=${listingId}`,
            { method: "DELETE" }
          );
          if (!response.ok) {
            throw new Error("Failed to unsave");
          }
        }
      } catch (error) {
        console.error("Error toggling save:", error);
        // Revert on error
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (shouldSave) {
            next.delete(listingId);
          } else {
            next.add(listingId);
          }
          return next;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  const isSaved = useCallback(
    (listingId: number) => savedIds.has(listingId),
    [savedIds]
  );

  return {
    savedIds,
    isSaved,
    toggleSave,
    isLoading,
    isAuthenticated: status === "authenticated",
  };
}
