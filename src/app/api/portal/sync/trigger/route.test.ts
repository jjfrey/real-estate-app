import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

// Mock portal-auth
vi.mock("@/lib/portal-auth", () => ({
  requirePortalRole: vi.fn(),
  portalAuthErrorResponse: vi.fn((error) => {
    if (error.status === 401) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.status === 403) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }),
  PortalAuthError: class extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

// Mock sync library
vi.mock("@/lib/sync", () => ({
  runSync: vi.fn(),
  isSyncRunning: vi.fn(),
}));

import { requirePortalRole, PortalAuthError } from "@/lib/portal-auth";
import { runSync, isSyncRunning } from "@/lib/sync";

function createRequest(body?: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/portal/sync/trigger", {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("POST /api/portal/sync/trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requirePortalRole).mockRejectedValue(
      new PortalAuthError("Unauthorized", 401)
    );

    const response = await POST(createRequest());

    expect(response.status).toBe(401);
  });

  it("returns 403 when not super_admin", async () => {
    vi.mocked(requirePortalRole).mockRejectedValue(
      new PortalAuthError("Forbidden", 403)
    );

    const response = await POST(createRequest());

    expect(response.status).toBe(403);
  });

  it("returns 409 when sync is already running", async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: "user-123", email: "admin@example.com", name: "Admin", role: "super_admin" as const },
    });
    vi.mocked(isSyncRunning).mockResolvedValue(true);

    const response = await POST(createRequest());

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe("A sync is already running");
  });

  it("returns success when sync completes quickly", async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: "user-123", email: "admin@example.com", name: "Admin", role: "super_admin" as const },
    });
    vi.mocked(isSyncRunning).mockResolvedValue(false);
    vi.mocked(runSync).mockResolvedValue({
      success: true,
      stats: {
        listingsCreated: 10,
        listingsUpdated: 5,
        listingsDeleted: 0,
        agentsCreated: 2,
        agentsUpdated: 1,
        officesCreated: 1,
        officesUpdated: 0,
        photosProcessed: 100,
        openHousesProcessed: 5,
      },
      duration: 50,
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe("Sync completed");
    expect(data.stats.listingsCreated).toBe(10);
  });

  it("returns error when sync fails quickly", async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: "user-123", email: "admin@example.com", name: "Admin", role: "super_admin" as const },
    });
    vi.mocked(isSyncRunning).mockResolvedValue(false);
    vi.mocked(runSync).mockResolvedValue({
      success: false,
      stats: {
        listingsCreated: 0,
        listingsUpdated: 0,
        listingsDeleted: 0,
        agentsCreated: 0,
        agentsUpdated: 0,
        officesCreated: 0,
        officesUpdated: 0,
        photosProcessed: 0,
        openHousesProcessed: 0,
      },
      errorMessage: "No feed URL configured",
      duration: 10,
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.message).toBe("Sync failed");
    expect(data.error).toBe("No feed URL configured");
  });

  it("returns sync started when sync takes longer than 100ms", async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: "user-123", email: "admin@example.com", name: "Admin", role: "super_admin" as const },
    });
    vi.mocked(isSyncRunning).mockResolvedValue(false);
    // Simulate slow sync - returns after timeout
    vi.mocked(runSync).mockImplementation(() =>
      new Promise((resolve) => setTimeout(() => resolve({
        success: true,
        stats: {
          listingsCreated: 10,
          listingsUpdated: 5,
          listingsDeleted: 0,
          agentsCreated: 2,
          agentsUpdated: 1,
          officesCreated: 1,
          officesUpdated: 0,
          photosProcessed: 100,
          openHousesProcessed: 5,
        },
        duration: 5000,
      }), 200))
    );

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe("Sync started");
    expect(data.status).toBe("running");
  });

  it("passes feedId to runSync when provided", async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: "user-123", email: "admin@example.com", name: "Admin", role: "super_admin" as const },
    });
    vi.mocked(isSyncRunning).mockResolvedValue(false);
    vi.mocked(runSync).mockResolvedValue({
      success: true,
      stats: {
        listingsCreated: 0,
        listingsUpdated: 0,
        listingsDeleted: 0,
        agentsCreated: 0,
        agentsUpdated: 0,
        officesCreated: 0,
        officesUpdated: 0,
        photosProcessed: 0,
        openHousesProcessed: 0,
      },
      duration: 10,
    });

    await POST(createRequest({ feedId: 5 }));

    expect(runSync).toHaveBeenCalledWith({
      trigger: "manual",
      triggeredBy: "user-123",
      feedId: 5,
    });
  });

  it("works without feedId in request body", async () => {
    vi.mocked(requirePortalRole).mockResolvedValue({
      user: { id: "user-123", email: "admin@example.com", name: "Admin", role: "super_admin" as const },
    });
    vi.mocked(isSyncRunning).mockResolvedValue(false);
    vi.mocked(runSync).mockResolvedValue({
      success: true,
      stats: {
        listingsCreated: 0,
        listingsUpdated: 0,
        listingsDeleted: 0,
        agentsCreated: 0,
        agentsUpdated: 0,
        officesCreated: 0,
        officesUpdated: 0,
        photosProcessed: 0,
        openHousesProcessed: 0,
      },
      duration: 10,
    });

    await POST(createRequest());

    expect(runSync).toHaveBeenCalledWith({
      trigger: "manual",
      triggeredBy: "user-123",
      feedId: undefined,
    });
  });
});
