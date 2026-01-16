import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPortalSession,
  requirePortalRole,
  canAccessLead,
  canManageOffice,
  getAccessibleOfficeIds,
  PortalAuthError,
  portalAuthErrorResponse,
  PortalSession,
} from "./portal-auth";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock auth config
vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

// Mock the database
vi.mock("@/db", () => ({
  db: {
    query: {
      agents: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(),
        })),
      })),
    })),
  },
}));

import { getServerSession } from "next-auth";
import { db } from "@/db";

// Helper to create mock sessions
function createMockSession(overrides: {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: string;
} = {}) {
  return {
    user: {
      id: overrides.id ?? "user-123",
      email: overrides.email ?? "test@example.com",
      name: overrides.name ?? "Test User",
      role: overrides.role ?? "consumer",
    },
  };
}

// Helper to create portal sessions for testing
function createPortalSession(
  role: "agent" | "office_admin" | "super_admin",
  options: {
    agentId?: number;
    officeIds?: number[];
  } = {}
): PortalSession {
  const session: PortalSession = {
    user: {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      role,
    },
  };

  if (role === "agent" && options.agentId) {
    session.agent = {
      id: options.agentId,
      firstName: "Test",
      lastName: "Agent",
    };
  }

  if (role === "office_admin" && options.officeIds) {
    session.offices = options.officeIds.map((id) => ({
      id,
      name: `Office ${id}`,
      brokerageName: `Brokerage ${id}`,
    }));
  }

  return session;
}

describe("portal-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPortalSession", () => {
    it("returns null when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const result = await getPortalSession();

      expect(result).toBeNull();
    });

    it("returns null when user has no email", async () => {
      vi.mocked(getServerSession).mockResolvedValue(
        createMockSession({ email: null })
      );

      const result = await getPortalSession();

      expect(result).toBeNull();
    });

    it("returns null for consumer role", async () => {
      vi.mocked(getServerSession).mockResolvedValue(
        createMockSession({ role: "consumer" })
      );

      const result = await getPortalSession();

      expect(result).toBeNull();
    });

    it("returns session for super_admin role", async () => {
      vi.mocked(getServerSession).mockResolvedValue(
        createMockSession({ role: "super_admin" })
      );

      const result = await getPortalSession();

      expect(result).not.toBeNull();
      expect(result?.user.role).toBe("super_admin");
      expect(result?.user.email).toBe("test@example.com");
    });

    it("returns session with agent data for agent role", async () => {
      vi.mocked(getServerSession).mockResolvedValue(
        createMockSession({ role: "agent" })
      );

      vi.mocked(db.query.agents.findFirst).mockResolvedValue({
        id: 42,
        firstName: "John",
        lastName: "Agent",
        email: "agent@example.com",
        licenseNum: "FL123",
        phone: "555-1234",
        photoUrl: null,
        userId: "user-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getPortalSession();

      expect(result).not.toBeNull();
      expect(result?.user.role).toBe("agent");
      expect(result?.agent).toEqual({
        id: 42,
        firstName: "John",
        lastName: "Agent",
      });
    });

    it("returns session without agent data when agent record not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(
        createMockSession({ role: "agent" })
      );

      vi.mocked(db.query.agents.findFirst).mockResolvedValue(null);

      const result = await getPortalSession();

      expect(result).not.toBeNull();
      expect(result?.user.role).toBe("agent");
      expect(result?.agent).toBeUndefined();
    });

    it("returns session with offices for office_admin role", async () => {
      vi.mocked(getServerSession).mockResolvedValue(
        createMockSession({ role: "office_admin" })
      );

      // Mock the chained select query
      const mockWhere = vi.fn().mockResolvedValue([
        { officeId: 1, name: "Office One", brokerageName: "Brokerage One" },
        { officeId: 2, name: "Office Two", brokerageName: "Brokerage Two" },
      ]);
      const mockInnerJoin = vi.fn(() => ({ where: mockWhere }));
      const mockFrom = vi.fn(() => ({ innerJoin: mockInnerJoin }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const result = await getPortalSession();

      expect(result).not.toBeNull();
      expect(result?.user.role).toBe("office_admin");
      expect(result?.offices).toHaveLength(2);
      expect(result?.offices?.[0]).toEqual({
        id: 1,
        name: "Office One",
        brokerageName: "Brokerage One",
      });
    });
  });

  describe("requirePortalRole", () => {
    it("throws 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(requirePortalRole(["agent"])).rejects.toThrow(PortalAuthError);
      await expect(requirePortalRole(["agent"])).rejects.toMatchObject({
        message: "Unauthorized",
        status: 401,
      });
    });

    it("throws 401 for consumer role", async () => {
      vi.mocked(getServerSession).mockResolvedValue(
        createMockSession({ role: "consumer" })
      );

      await expect(requirePortalRole(["agent"])).rejects.toMatchObject({
        message: "Unauthorized",
        status: 401,
      });
    });

    it("throws 403 when role not in allowed list", async () => {
      vi.mocked(getServerSession).mockResolvedValue(
        createMockSession({ role: "agent" })
      );
      vi.mocked(db.query.agents.findFirst).mockResolvedValue(null);

      await expect(requirePortalRole(["super_admin"])).rejects.toMatchObject({
        message: "Forbidden",
        status: 403,
      });
    });

    it("returns session when role is allowed", async () => {
      vi.mocked(getServerSession).mockResolvedValue(
        createMockSession({ role: "super_admin" })
      );

      const result = await requirePortalRole(["super_admin", "office_admin"]);

      expect(result.user.role).toBe("super_admin");
    });

    it("allows multiple roles", async () => {
      vi.mocked(getServerSession).mockResolvedValue(
        createMockSession({ role: "agent" })
      );
      vi.mocked(db.query.agents.findFirst).mockResolvedValue(null);

      const result = await requirePortalRole(["agent", "office_admin", "super_admin"]);

      expect(result.user.role).toBe("agent");
    });
  });

  describe("canAccessLead", () => {
    it("returns true for super_admin regardless of lead ownership", async () => {
      const session = createPortalSession("super_admin");

      expect(await canAccessLead(session, null, null)).toBe(true);
      expect(await canAccessLead(session, 1, 1)).toBe(true);
      expect(await canAccessLead(session, 999, 999)).toBe(true);
    });

    it("returns true for office_admin when lead belongs to their office", async () => {
      const session = createPortalSession("office_admin", { officeIds: [1, 2] });

      expect(await canAccessLead(session, null, 1)).toBe(true);
      expect(await canAccessLead(session, null, 2)).toBe(true);
    });

    it("returns false for office_admin when lead belongs to different office", async () => {
      const session = createPortalSession("office_admin", { officeIds: [1, 2] });

      expect(await canAccessLead(session, null, 3)).toBe(false);
      expect(await canAccessLead(session, null, 999)).toBe(false);
    });

    it("returns false for office_admin when lead has no office", async () => {
      const session = createPortalSession("office_admin", { officeIds: [1, 2] });

      expect(await canAccessLead(session, 1, null)).toBe(false);
    });

    it("returns true for agent when lead belongs to them", async () => {
      const session = createPortalSession("agent", { agentId: 42 });

      expect(await canAccessLead(session, 42, 1)).toBe(true);
    });

    it("returns false for agent when lead belongs to different agent", async () => {
      const session = createPortalSession("agent", { agentId: 42 });

      expect(await canAccessLead(session, 43, 1)).toBe(false);
      expect(await canAccessLead(session, null, 1)).toBe(false);
    });

    it("returns false for agent without agent record", async () => {
      const session = createPortalSession("agent"); // No agentId

      expect(await canAccessLead(session, 42, 1)).toBe(false);
    });

    it("returns false for office_admin without offices", async () => {
      const session = createPortalSession("office_admin"); // No offices

      expect(await canAccessLead(session, null, 1)).toBe(false);
    });
  });

  describe("canManageOffice", () => {
    it("returns true for super_admin for any office", async () => {
      const session = createPortalSession("super_admin");

      expect(await canManageOffice(session, 1)).toBe(true);
      expect(await canManageOffice(session, 999)).toBe(true);
    });

    it("returns true for office_admin managing their own office", async () => {
      const session = createPortalSession("office_admin", { officeIds: [1, 2] });

      expect(await canManageOffice(session, 1)).toBe(true);
      expect(await canManageOffice(session, 2)).toBe(true);
    });

    it("returns false for office_admin managing different office", async () => {
      const session = createPortalSession("office_admin", { officeIds: [1, 2] });

      expect(await canManageOffice(session, 3)).toBe(false);
    });

    it("returns false for agent", async () => {
      const session = createPortalSession("agent", { agentId: 42 });

      expect(await canManageOffice(session, 1)).toBe(false);
    });

    it("returns false for office_admin without offices", async () => {
      const session = createPortalSession("office_admin"); // No offices

      expect(await canManageOffice(session, 1)).toBe(false);
    });
  });

  describe("getAccessibleOfficeIds", () => {
    it("returns null for super_admin (meaning all offices)", () => {
      const session = createPortalSession("super_admin");

      expect(getAccessibleOfficeIds(session)).toBeNull();
    });

    it("returns office IDs for office_admin", () => {
      const session = createPortalSession("office_admin", { officeIds: [1, 2, 3] });

      expect(getAccessibleOfficeIds(session)).toEqual([1, 2, 3]);
    });

    it("returns empty array for office_admin without offices", () => {
      const session = createPortalSession("office_admin"); // No offices

      expect(getAccessibleOfficeIds(session)).toEqual([]);
    });

    it("returns empty array for agent", () => {
      const session = createPortalSession("agent", { agentId: 42 });

      expect(getAccessibleOfficeIds(session)).toEqual([]);
    });
  });

  describe("PortalAuthError", () => {
    it("creates error with message and status", () => {
      const error = new PortalAuthError("Unauthorized", 401);

      expect(error.message).toBe("Unauthorized");
      expect(error.status).toBe(401);
      expect(error.name).toBe("PortalAuthError");
      expect(error instanceof Error).toBe(true);
    });

    it("creates forbidden error", () => {
      const error = new PortalAuthError("Forbidden", 403);

      expect(error.message).toBe("Forbidden");
      expect(error.status).toBe(403);
    });
  });

  describe("portalAuthErrorResponse", () => {
    it("returns proper response for PortalAuthError", async () => {
      const error = new PortalAuthError("Unauthorized", 401);
      const response = portalAuthErrorResponse(error);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 403 response for forbidden error", async () => {
      const error = new PortalAuthError("Forbidden", 403);
      const response = portalAuthErrorResponse(error);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Forbidden");
    });

    it("returns 500 response for unexpected errors", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("Something went wrong");
      const response = portalAuthErrorResponse(error);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("returns 500 response for non-Error objects", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const response = portalAuthErrorResponse("string error");

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");

      consoleSpy.mockRestore();
    });

    it("includes correct content-type header", () => {
      const error = new PortalAuthError("Test", 400);
      const response = portalAuthErrorResponse(error);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });
  });
});
