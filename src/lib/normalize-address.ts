/**
 * Address normalization for cross-feed listing deduplication.
 *
 * Produces a canonical form of a street address so that variations like
 * "609 Spinnaker DR" and "609 SPINNAKER DRIVE" resolve to the same key.
 */

const SUFFIX_MAP: [RegExp, string][] = [
  [/\bST\b/g, "STREET"],
  [/\bAVE\b/g, "AVENUE"],
  [/\bBLVD\b/g, "BOULEVARD"],
  [/\bDR\b/g, "DRIVE"],
  [/\bLN\b/g, "LANE"],
  [/\bCT\b/g, "COURT"],
  [/\bRD\b/g, "ROAD"],
  [/\bPL\b/g, "PLACE"],
  [/\bCIR\b/g, "CIRCLE"],
  [/\bTER\b/g, "TERRACE"],
  [/\bPKWY\b/g, "PARKWAY"],
  [/\bTRL\b/g, "TRAIL"],
  [/\bHWY\b/g, "HIGHWAY"],
  [/\bAPT\b/g, "APT"],
  [/\bSTE\b/g, "SUITE"],
];

export function normalizeAddress(streetAddress: string | number | null | undefined): string {
  if (streetAddress == null) return "";
  let addr = String(streetAddress).toUpperCase();
  // Remove periods (St. → ST, Ave. → AVE)
  addr = addr.replace(/\./g, "");
  // Collapse whitespace
  addr = addr.replace(/\s+/g, " ").trim();
  // Expand abbreviated suffixes
  for (const [pattern, replacement] of SUFFIX_MAP) {
    addr = addr.replace(pattern, replacement);
  }
  return addr;
}

export function getStatusCategory(status: string): "sale" | "rent" {
  const s = status.toLowerCase();
  if (s.includes("rent") || s.includes("lease")) return "rent";
  return "sale";
}
