import { describe, it, expect } from "vitest";
import { detectChanges, checkAnomalies, FieldChange } from "./sync-change-tracker";

describe("detectChanges", () => {
  it("returns empty array when nothing changed", () => {
    const existing = { price: "500000", status: "Active", bedrooms: 3 };
    const incoming = { price: "500000", status: "Active", bedrooms: 3 };
    expect(detectChanges(existing, incoming)).toEqual([]);
  });

  it("detects price change", () => {
    const existing = { price: "500000" };
    const incoming = { price: "525000" };
    const changes = detectChanges(existing, incoming);
    expect(changes).toEqual([
      { field: "price", oldValue: "500000", newValue: "525000" },
    ]);
  });

  it("detects status change", () => {
    const existing = { status: "Active" };
    const incoming = { status: "Pending" };
    const changes = detectChanges(existing, incoming);
    expect(changes).toEqual([
      { field: "status", oldValue: "Active", newValue: "Pending" },
    ]);
  });

  it("detects multiple changes", () => {
    const existing = { price: "500000", status: "Active", bedrooms: 3 };
    const incoming = { price: "475000", status: "Pending", bedrooms: 3 };
    const changes = detectChanges(existing, incoming);
    expect(changes).toHaveLength(2);
    expect(changes.find((c) => c.field === "price")).toBeTruthy();
    expect(changes.find((c) => c.field === "status")).toBeTruthy();
  });

  it("treats null and undefined as equal", () => {
    const existing = { livingArea: null };
    const incoming = { livingArea: undefined };
    expect(detectChanges(existing, incoming)).toEqual([]);
  });

  it("detects change from null to value", () => {
    const existing = { bedrooms: null };
    const incoming = { bedrooms: 3 };
    const changes = detectChanges(existing, incoming);
    expect(changes).toEqual([
      { field: "bedrooms", oldValue: null, newValue: "3" },
    ]);
  });

  it("converts numbers to strings for comparison", () => {
    const existing = { price: 500000 };
    const incoming = { price: "500000" };
    expect(detectChanges(existing, incoming)).toEqual([]);
  });
});

describe("checkAnomalies", () => {
  const noChanges: FieldChange[] = [];

  it("returns no quarantine when no anomalies", () => {
    const existing = { price: "500000", status: "Active", latitude: 27.5, longitude: -80.4, streetAddress: "123 Main St" };
    const incoming = { price: "510000", status: "Active", latitude: 27.5, longitude: -80.4, streetAddress: "123 Main St" };
    const changes: FieldChange[] = [
      { field: "price", oldValue: "500000", newValue: "510000" },
    ];
    expect(checkAnomalies(existing, incoming, changes).quarantine).toBe(false);
  });

  it("quarantines sale price change >40%", () => {
    const existing = { price: "500000", status: "Active", streetAddress: "123 Main St" };
    const incoming = { price: "250000", status: "Active", streetAddress: "123 Main St" };
    const changes: FieldChange[] = [
      { field: "price", oldValue: "500000", newValue: "250000" },
    ];
    const result = checkAnomalies(existing, incoming, changes);
    expect(result.quarantine).toBe(true);
    expect(result.reason).toMatch(/price_change_50pct/);
  });

  it("does not quarantine sale price change <=40%", () => {
    const existing = { price: "500000", status: "Active", streetAddress: "123 Main St" };
    const incoming = { price: "350000", status: "Active", streetAddress: "123 Main St" };
    const changes: FieldChange[] = [
      { field: "price", oldValue: "500000", newValue: "350000" },
    ];
    expect(checkAnomalies(existing, incoming, changes).quarantine).toBe(false);
  });

  it("does not quarantine rental price change >40%", () => {
    const existing = { price: "2500", status: "For Rent", streetAddress: "123 Main St" };
    const incoming = { price: "7000", status: "For Rent", streetAddress: "123 Main St" };
    const changes: FieldChange[] = [
      { field: "price", oldValue: "2500", newValue: "7000" },
    ];
    expect(checkAnomalies(existing, incoming, changes).quarantine).toBe(false);
  });

  it("does not quarantine price change when status category changes (sale to rent)", () => {
    const existing = { price: "10000", status: "Active", streetAddress: "123 Main St" };
    const incoming = { price: "3300", status: "For Rent", streetAddress: "123 Main St" };
    const changes: FieldChange[] = [
      { field: "price", oldValue: "10000", newValue: "3300" },
      { field: "status", oldValue: "Active", newValue: "For Rent" },
    ];
    expect(checkAnomalies(existing, incoming, changes).quarantine).toBe(false);
  });

  it("quarantines status regression (Sold → Active)", () => {
    const existing = { status: "Sold", streetAddress: "123 Main St" };
    const incoming = { status: "Active", streetAddress: "123 Main St" };
    const changes: FieldChange[] = [
      { field: "status", oldValue: "Sold", newValue: "Active" },
    ];
    const result = checkAnomalies(existing, incoming, changes);
    expect(result.quarantine).toBe(true);
    expect(result.reason).toContain("status_regression");
  });

  it("quarantines status regression (Closed → Active)", () => {
    const existing = { status: "Closed", streetAddress: "123 Main St" };
    const incoming = { status: "Active", streetAddress: "123 Main St" };
    const changes: FieldChange[] = [
      { field: "status", oldValue: "Closed", newValue: "Active" },
    ];
    expect(checkAnomalies(existing, incoming, changes).quarantine).toBe(true);
  });

  it("does not quarantine Pending → Active (deal fell through)", () => {
    const existing = { status: "Pending", streetAddress: "123 Main St" };
    const incoming = { status: "Active", streetAddress: "123 Main St" };
    const changes: FieldChange[] = [
      { field: "status", oldValue: "Pending", newValue: "Active" },
    ];
    expect(checkAnomalies(existing, incoming, changes).quarantine).toBe(false);
  });

  it("does not quarantine normal status progression (Active → Pending)", () => {
    const existing = { status: "Active", streetAddress: "123 Main St" };
    const incoming = { status: "Pending", streetAddress: "123 Main St" };
    const changes: FieldChange[] = [
      { field: "status", oldValue: "Active", newValue: "Pending" },
    ];
    expect(checkAnomalies(existing, incoming, changes).quarantine).toBe(false);
  });

  it("quarantines coordinate teleportation", () => {
    const existing = { latitude: 27.5, longitude: -80.4, streetAddress: "123 Main St" };
    const incoming = { latitude: 28.5, longitude: -80.4, streetAddress: "123 Main St" };
    const changes: FieldChange[] = [
      { field: "latitude", oldValue: "27.5", newValue: "28.5" },
    ];
    const result = checkAnomalies(existing, incoming, changes);
    expect(result.quarantine).toBe(true);
    expect(result.reason).toBe("coordinates_moved");
  });

  it("does not quarantine small coordinate drift", () => {
    const existing = { latitude: 27.500000, longitude: -80.400000, streetAddress: "123 Main St" };
    const incoming = { latitude: 27.500500, longitude: -80.400500, streetAddress: "123 Main St" };
    const changes: FieldChange[] = [
      { field: "latitude", oldValue: "27.5", newValue: "27.5005" },
    ];
    expect(checkAnomalies(existing, incoming, changes).quarantine).toBe(false);
  });

  it("does not quarantine coords moving from 0,0 to real coordinates (failed geocode fix)", () => {
    const existing = { latitude: 0, longitude: 0, streetAddress: "123 Main St" };
    const incoming = { latitude: 26.211, longitude: -80.092, streetAddress: "123 Main St" };
    const changes: FieldChange[] = [
      { field: "latitude", oldValue: "0", newValue: "26.211" },
      { field: "longitude", oldValue: "0", newValue: "-80.092" },
    ];
    expect(checkAnomalies(existing, incoming, changes).quarantine).toBe(false);
  });

  it("quarantines short addresses on address match", () => {
    const existing = { streetAddress: "3001 SE" };
    const incoming = { streetAddress: "3001" };
    const result = checkAnomalies(existing, incoming, noChanges, "address");
    expect(result.quarantine).toBe(true);
    expect(result.reason).toBe("address_too_short");
  });

  it("does not quarantine short addresses on mlsId match", () => {
    const existing = { streetAddress: "3001 SE" };
    const incoming = { streetAddress: "3001" };
    const result = checkAnomalies(existing, incoming, noChanges, "mlsId");
    expect(result.quarantine).toBe(false);
  });

  it("does not quarantine short addresses when matchType defaults to mlsId", () => {
    const existing = { streetAddress: "3001 SE" };
    const incoming = { streetAddress: "3001" };
    const result = checkAnomalies(existing, incoming, noChanges);
    expect(result.quarantine).toBe(false);
  });

  it("does not quarantine normal addresses", () => {
    const existing = { streetAddress: "123 Main Street" };
    const incoming = { streetAddress: "123 Main Street" };
    expect(checkAnomalies(existing, incoming, noChanges).quarantine).toBe(false);
  });
});
