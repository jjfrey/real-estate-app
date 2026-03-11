/**
 * Shared matching rules and constants used by both sync.ts and dedup-listings.ts.
 * Keeps thresholds, scoring, and status logic in one place.
 */

// ── Thresholds ────────────────────────────────────────────────────────────────

/** Coordinate proximity threshold (~50 metres) */
export const COORD_MATCH_DEGREES = 0.0005;

/** Maximum listings at the same address before requiring manual review */
export const MAX_AUTO_MERGE_COUNT = 5;

// ── Status category ───────────────────────────────────────────────────────────

/** Returns "rent" for rental/lease statuses, "sale" for everything else */
export function statusCategory(status: string): "sale" | "rent" {
  const s = status.toLowerCase();
  return s.includes("rent") || s.includes("lease") ? "rent" : "sale";
}

/** SQL fragment condition for sale listings */
export const SALE_STATUS_CONDITION = `lower(status) NOT LIKE '%rent%' AND lower(status) NOT LIKE '%lease%'`;

/** SQL fragment condition for rental listings */
export const RENT_STATUS_CONDITION = `lower(status) LIKE '%rent%' OR lower(status) LIKE '%lease%'`;

// ── Address helpers ───────────────────────────────────────────────────────────

/**
 * Returns the house-number prefix (first two tokens) of a normalized address.
 * Used to scope coord searches and avoid matching different buildings.
 * e.g. "6996 SE HARBOR CIRCLE" → "6996 SE"
 */
export function addressPrefix(normalizedAddress: string): string {
  return normalizedAddress.split(" ").slice(0, 2).join(" ");
}

/**
 * Returns true if one address is a prefix of the other.
 * Catches truncated addresses like "6996 SE HARBOR" vs "6996 SE HARBOR CIRCLE"
 * while rejecting different units like "14220 ROYAL HARBOUR COURT 608" vs "14220 ROYAL HARBOUR COURT 1008"
 */
export function isAddressPrefix(a: string, b: string): boolean {
  return b.startsWith(a) || a.startsWith(b);
}

// ── Coordinate matching ───────────────────────────────────────────────────────

/** Returns true if two coordinate pairs are within COORD_MATCH_DEGREES of each other */
export function coordsMatch(
  lat1: number | null | undefined,
  lng1: number | null | undefined,
  lat2: number | null | undefined,
  lng2: number | null | undefined
): boolean {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return false;
  if (lat1 === 0 && lng1 === 0) return false;
  if (lat2 === 0 && lng2 === 0) return false;
  return (
    Math.abs(lat1 - lat2) < COORD_MATCH_DEGREES &&
    Math.abs(lng1 - lng2) < COORD_MATCH_DEGREES
  );
}

// ── Winner scoring ────────────────────────────────────────────────────────────

export interface ScoredListing {
  id: number;
  mlsId: string;
  updatedAt: Date | null;
  photoCount: number;
  inFeed: boolean;
}

/**
 * Picks the best canonical listing from a group of duplicates.
 * Priority: active in feed → most photos → most recently updated
 */
export function pickWinner<T extends ScoredListing>(candidates: T[]): T {
  const sorted = [...candidates].sort((a, b) => {
    if (a.inFeed !== b.inFeed) return a.inFeed ? -1 : 1;
    if (b.photoCount !== a.photoCount) return b.photoCount - a.photoCount;
    const aDate = a.updatedAt?.getTime() ?? 0;
    const bDate = b.updatedAt?.getTime() ?? 0;
    return bDate - aDate;
  });
  return sorted[0];
}
