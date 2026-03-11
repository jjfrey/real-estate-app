import { describe, it, expect } from "vitest";
import { normalizeAddress, getStatusCategory } from "./normalize-address";

describe("normalizeAddress", () => {
  it("uppercases and trims", () => {
    expect(normalizeAddress("123 main st")).toBe("123 MAIN STREET");
  });

  it("removes periods", () => {
    expect(normalizeAddress("123 Main St.")).toBe("123 MAIN STREET");
  });

  it("collapses whitespace", () => {
    expect(normalizeAddress("789  Elm   Blvd")).toBe("789 ELM BOULEVARD");
  });

  it("expands ST to STREET", () => {
    expect(normalizeAddress("100 Oak St")).toBe("100 OAK STREET");
  });

  it("expands AVE to AVENUE", () => {
    expect(normalizeAddress("200 Pine Ave")).toBe("200 PINE AVENUE");
  });

  it("expands BLVD to BOULEVARD", () => {
    expect(normalizeAddress("3420 Gulf Shore BLVD N")).toBe(
      "3420 GULF SHORE BOULEVARD N"
    );
  });

  it("expands DR to DRIVE", () => {
    expect(normalizeAddress("609 Spinnaker DR")).toBe("609 SPINNAKER DRIVE");
  });

  it("expands CT to COURT", () => {
    expect(normalizeAddress("1411 Quintara CT")).toBe("1411 QUINTARA COURT");
  });

  it("expands CIR to CIRCLE", () => {
    expect(normalizeAddress("5353 Cove CIR")).toBe("5353 COVE CIRCLE");
  });

  it("expands RD to ROAD", () => {
    expect(normalizeAddress("15051 Punta Rassa RD")).toBe(
      "15051 PUNTA RASSA ROAD"
    );
  });

  it("expands TRL to TRAIL", () => {
    expect(normalizeAddress("88 Forest Trl")).toBe("88 FOREST TRAIL");
  });

  it("expands PKWY to PARKWAY", () => {
    expect(normalizeAddress("500 Central Pkwy")).toBe("500 CENTRAL PARKWAY");
  });

  it("expands HWY to HIGHWAY", () => {
    expect(normalizeAddress("1605 S Us Hwy 1")).toBe("1605 S US HIGHWAY 1");
  });

  it("does not double-expand already-full suffixes", () => {
    expect(normalizeAddress("609 SPINNAKER DRIVE")).toBe(
      "609 SPINNAKER DRIVE"
    );
    expect(normalizeAddress("100 Oak Street")).toBe("100 OAK STREET");
  });

  it("handles mixed case across boards (NABOR vs Marco Island)", () => {
    const nabor = normalizeAddress("609 Spinnaker DR");
    const marco = normalizeAddress("609 SPINNAKER DRIVE");
    expect(nabor).toBe(marco);
  });

  it("handles St in street names like St. Paul (known limitation)", () => {
    // "St" expands to "STREET" — acceptable because city+zip prevents false matches
    expect(normalizeAddress("123 St. Paul Dr.")).toBe(
      "123 STREET PAUL DRIVE"
    );
  });

  it("handles real feed examples", () => {
    expect(normalizeAddress("2494 S Ocean Blvd F")).toBe(
      "2494 S OCEAN BOULEVARD F"
    );
    expect(normalizeAddress("2494 S Ocean Boulevard F")).toBe(
      "2494 S OCEAN BOULEVARD F"
    );
    expect(normalizeAddress("6327 Chasewood Dr E")).toBe(
      "6327 CHASEWOOD DRIVE E"
    );
    expect(normalizeAddress("6327 Chasewood Drive E")).toBe(
      "6327 CHASEWOOD DRIVE E"
    );
  });

  it("returns empty string for empty input", () => {
    expect(normalizeAddress("")).toBe("");
    expect(normalizeAddress("   ")).toBe("");
  });
});

describe("getStatusCategory", () => {
  it("categorizes Active as sale", () => {
    expect(getStatusCategory("Active")).toBe("sale");
  });

  it("categorizes Pending as sale", () => {
    expect(getStatusCategory("Pending")).toBe("sale");
  });

  it("categorizes Contingent as sale", () => {
    expect(getStatusCategory("Contingent")).toBe("sale");
  });

  it("categorizes For Rent as rent", () => {
    expect(getStatusCategory("For Rent")).toBe("rent");
  });

  it("categorizes Lease as rent", () => {
    expect(getStatusCategory("Lease")).toBe("rent");
  });

  it("is case-insensitive", () => {
    expect(getStatusCategory("FOR RENT")).toBe("rent");
    expect(getStatusCategory("active")).toBe("sale");
  });
});
