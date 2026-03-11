import { db } from "@/db";
import * as schema from "@/db/schema";

const TRACKED_FIELDS = [
  "price",
  "status",
  "streetAddress",
  "bedrooms",
  "bathrooms",
  "livingArea",
  "propertyType",
  "latitude",
  "longitude",
] as const;

type TrackedField = (typeof TRACKED_FIELDS)[number];

export interface FieldChange {
  field: TrackedField;
  oldValue: string | null;
  newValue: string | null;
}

export interface AnomalyResult {
  quarantine: boolean;
  reason: string;
}

function toComparableString(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  return String(val);
}

export function detectChanges(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const field of TRACKED_FIELDS) {
    const oldVal = toComparableString(existing[field]);
    const newVal = toComparableString(incoming[field]);

    if (oldVal !== newVal) {
      changes.push({ field, oldValue: oldVal, newValue: newVal });
    }
  }

  return changes;
}

export async function recordChanges(
  changes: FieldChange[],
  listingId: number,
  feedId: number | null | undefined
): Promise<number> {
  if (changes.length === 0) return 0;

  const values = changes.map((c) => ({
    listingId,
    feedId: feedId ?? null,
    field: c.field,
    oldValue: c.oldValue,
    newValue: c.newValue,
    detectedAt: new Date(),
  }));

  await db.insert(schema.listingChanges).values(values);
  return changes.length;
}

const STATUS_ORDER: Record<string, number> = {
  active: 1,
  pending: 2,
  contingent: 2,
  sold: 3,
  closed: 3,
  expired: 3,
  withdrawn: 3,
  cancelled: 3,
};

function isRentalStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes("rent") || s.includes("lease");
}

export function checkAnomalies(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  changes: FieldChange[],
  matchType: "mlsId" | "address" = "mlsId"
): AnomalyResult {
  const existingStatus = String(existing.status ?? "");
  const incomingStatus = String(incoming.status ?? "");
  const existingIsRental = isRentalStatus(existingStatus);
  const incomingIsRental = isRentalStatus(incomingStatus);
  const categoryChanged = existingIsRental !== incomingIsRental;

  // Status regression — only quarantine Sold/Closed → Active (not Pending → Active)
  const statusChange = changes.find((c) => c.field === "status");
  if (statusChange && statusChange.oldValue && statusChange.newValue) {
    const oldOrder = STATUS_ORDER[statusChange.oldValue.toLowerCase()] ?? 0;
    const newOrder = STATUS_ORDER[statusChange.newValue.toLowerCase()] ?? 0;
    // Only quarantine when going from terminal states (3: sold/closed/expired) back to active
    if (oldOrder === 3 && newOrder < oldOrder) {
      return {
        quarantine: true,
        reason: `status_regression_${statusChange.oldValue}_to_${statusChange.newValue}`,
      };
    }
  }

  // Coordinate teleportation (>0.01 degrees ≈ 1km) — skip when existing is 0,0 (failed geocode)
  const latChange = changes.find((c) => c.field === "latitude");
  const lngChange = changes.find((c) => c.field === "longitude");
  if (latChange || lngChange) {
    const oldLat = parseFloat(String(existing.latitude ?? ""));
    const newLat = parseFloat(String(incoming.latitude ?? ""));
    const oldLng = parseFloat(String(existing.longitude ?? ""));
    const newLng = parseFloat(String(incoming.longitude ?? ""));

    const existingIsZero = oldLat === 0 && oldLng === 0;

    if (!existingIsZero && !isNaN(oldLat) && !isNaN(newLat) && !isNaN(oldLng) && !isNaN(newLng)) {
      if (Math.abs(newLat - oldLat) > 0.01 || Math.abs(newLng - oldLng) > 0.01) {
        return {
          quarantine: true,
          reason: "coordinates_moved",
        };
      }
    }
  }

  // Address too short to trust — only for cross-feed matches, not same-MLS re-syncs
  if (matchType === "address") {
    const addr = String(incoming.streetAddress ?? "");
    if (addr.length < 5) {
      return { quarantine: true, reason: "address_too_short" };
    }
  }

  return { quarantine: false, reason: "" };
}
