import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/db";
import { agents, officeAdmins, offices, users, companies, companyAdmins, PortalRole } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

const IMPERSONATION_COOKIE = "portal_impersonate";

export interface PortalSession {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: PortalRole;
  };
  agent?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
  };
  offices?: Array<{
    id: number;
    name: string | null;
    brokerageName: string | null;
    companyId: number | null;
  }>;
  companies?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  // Impersonation info
  isImpersonating?: boolean;
  originalUser?: {
    id: string;
    email: string;
    name: string | null;
  };
}

/**
 * Get the current portal session.
 * Returns null if:
 * - User is not authenticated
 * - User is a consumer (not a portal user)
 *
 * Supports impersonation: if a super_admin is impersonating another user,
 * returns the impersonated user's session with isImpersonating flag.
 */
export async function getPortalSession(): Promise<PortalSession | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  // Only portal roles can access the portal
  const portalRoles: PortalRole[] = ["agent", "office_admin", "company_admin", "super_admin"];
  if (!portalRoles.includes(session.user.role as PortalRole)) {
    return null;
  }

  // Check for impersonation (only super_admin can impersonate)
  let impersonatedUserId: string | null = null;
  if (session.user.role === "super_admin") {
    const cookieStore = await cookies();
    const impersonateCookie = cookieStore.get(IMPERSONATION_COOKIE);
    if (impersonateCookie?.value) {
      impersonatedUserId = impersonateCookie.value;
    }
  }

  // If impersonating, load the impersonated user
  if (impersonatedUserId) {
    const impersonatedUser = await db.query.users.findFirst({
      where: eq(users.id, impersonatedUserId),
    });

    if (impersonatedUser && impersonatedUser.role !== "super_admin") {
      const portalSession: PortalSession = {
        user: {
          id: impersonatedUser.id,
          email: impersonatedUser.email || "",
          name: impersonatedUser.name,
          role: impersonatedUser.role as PortalRole,
        },
        isImpersonating: true,
        originalUser: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name || null,
        },
      };

      // Load agent info if impersonating an agent
      if (impersonatedUser.role === "agent") {
        const agent = await db.query.agents.findFirst({
          where: eq(agents.userId, impersonatedUser.id),
        });
        if (agent) {
          portalSession.agent = {
            id: agent.id,
            firstName: agent.firstName,
            lastName: agent.lastName,
          };
        }
      }

      // Load offices if impersonating an office_admin
      if (impersonatedUser.role === "office_admin") {
        const adminRecords = await db
          .select({
            officeId: officeAdmins.officeId,
            name: offices.name,
            brokerageName: offices.brokerageName,
            companyId: offices.companyId,
          })
          .from(officeAdmins)
          .innerJoin(offices, eq(officeAdmins.officeId, offices.id))
          .where(eq(officeAdmins.userId, impersonatedUser.id));

        portalSession.offices = adminRecords.map((r) => ({
          id: r.officeId,
          name: r.name,
          brokerageName: r.brokerageName,
          companyId: r.companyId,
        }));
      }

      // Load companies if impersonating a company_admin
      if (impersonatedUser.role === "company_admin") {
        const companyRecords = await db
          .select({
            companyId: companyAdmins.companyId,
            name: companies.name,
            slug: companies.slug,
          })
          .from(companyAdmins)
          .innerJoin(companies, eq(companyAdmins.companyId, companies.id))
          .where(eq(companyAdmins.userId, impersonatedUser.id));

        portalSession.companies = companyRecords.map((r) => ({
          id: r.companyId,
          name: r.name,
          slug: r.slug,
        }));

        // Also load all offices for the company admin's companies
        if (companyRecords.length > 0) {
          const companyIds = companyRecords.map((c) => c.companyId);
          const companyOffices = await db
            .select({
              id: offices.id,
              name: offices.name,
              brokerageName: offices.brokerageName,
              companyId: offices.companyId,
            })
            .from(offices)
            .where(inArray(offices.companyId, companyIds));

          portalSession.offices = companyOffices.map((o) => ({
            id: o.id,
            name: o.name,
            brokerageName: o.brokerageName,
            companyId: o.companyId,
          }));
        }
      }

      return portalSession;
    }
  }

  // Normal session (not impersonating)
  const portalSession: PortalSession = {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || null,
      role: session.user.role as PortalRole,
    },
  };

  // If agent, fetch agent record
  if (session.user.role === "agent") {
    const agent = await db.query.agents.findFirst({
      where: eq(agents.userId, session.user.id),
    });
    if (agent) {
      portalSession.agent = {
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
      };
    }
  }

  // If office_admin, fetch their offices
  if (session.user.role === "office_admin") {
    const adminRecords = await db
      .select({
        officeId: officeAdmins.officeId,
        name: offices.name,
        brokerageName: offices.brokerageName,
        companyId: offices.companyId,
      })
      .from(officeAdmins)
      .innerJoin(offices, eq(officeAdmins.officeId, offices.id))
      .where(eq(officeAdmins.userId, session.user.id));

    portalSession.offices = adminRecords.map((r) => ({
      id: r.officeId,
      name: r.name,
      brokerageName: r.brokerageName,
      companyId: r.companyId,
    }));
  }

  // If company_admin, fetch their companies and all offices in those companies
  if (session.user.role === "company_admin") {
    const companyRecords = await db
      .select({
        companyId: companyAdmins.companyId,
        name: companies.name,
        slug: companies.slug,
      })
      .from(companyAdmins)
      .innerJoin(companies, eq(companyAdmins.companyId, companies.id))
      .where(eq(companyAdmins.userId, session.user.id));

    portalSession.companies = companyRecords.map((r) => ({
      id: r.companyId,
      name: r.name,
      slug: r.slug,
    }));

    // Load all offices for the company admin's companies
    if (companyRecords.length > 0) {
      const companyIds = companyRecords.map((c) => c.companyId);
      const companyOffices = await db
        .select({
          id: offices.id,
          name: offices.name,
          brokerageName: offices.brokerageName,
          companyId: offices.companyId,
        })
        .from(offices)
        .where(inArray(offices.companyId, companyIds));

      portalSession.offices = companyOffices.map((o) => ({
        id: o.id,
        name: o.name,
        brokerageName: o.brokerageName,
        companyId: o.companyId,
      }));
    }
  }

  return portalSession;
}

/**
 * Get impersonation cookie name (for use in API routes)
 */
export function getImpersonationCookieName(): string {
  return IMPERSONATION_COOKIE;
}

/**
 * Check if the current user has one of the allowed roles.
 * Throws an error with appropriate status if not authorized.
 */
export async function requirePortalRole(
  allowedRoles: PortalRole[]
): Promise<PortalSession> {
  const session = await getPortalSession();

  if (!session) {
    throw new PortalAuthError("Unauthorized", 401);
  }

  if (!allowedRoles.includes(session.user.role)) {
    throw new PortalAuthError("Forbidden", 403);
  }

  return session;
}

/**
 * Check if user can access a specific lead.
 * - Super admin: can access all leads
 * - Company admin: can access leads for offices in their companies
 * - Office admin: can access leads for their offices
 * - Agent: can access only their own leads
 */
export async function canAccessLead(
  session: PortalSession,
  leadAgentId: number | null,
  leadOfficeId: number | null
): Promise<boolean> {
  if (session.user.role === "super_admin") {
    return true;
  }

  if (session.user.role === "company_admin" && session.offices) {
    const officeIds = session.offices.map((o) => o.id);
    return leadOfficeId !== null && officeIds.includes(leadOfficeId);
  }

  if (session.user.role === "office_admin" && session.offices) {
    const officeIds = session.offices.map((o) => o.id);
    return leadOfficeId !== null && officeIds.includes(leadOfficeId);
  }

  if (session.user.role === "agent" && session.agent) {
    return leadAgentId === session.agent.id;
  }

  return false;
}

/**
 * Check if user can manage a specific office.
 * - Super admin: can manage all offices
 * - Company admin: can manage offices in their companies
 * - Office admin: can manage only their offices
 * - Agent: cannot manage offices
 */
export async function canManageOffice(
  session: PortalSession,
  officeId: number
): Promise<boolean> {
  if (session.user.role === "super_admin") {
    return true;
  }

  if (session.user.role === "company_admin" && session.offices) {
    const officeIds = session.offices.map((o) => o.id);
    return officeIds.includes(officeId);
  }

  if (session.user.role === "office_admin" && session.offices) {
    const officeIds = session.offices.map((o) => o.id);
    return officeIds.includes(officeId);
  }

  return false;
}

/**
 * Get the office IDs that the user can access.
 * - Super admin: returns null (meaning all offices)
 * - Company admin: returns office IDs for their companies
 * - Office admin: returns their office IDs
 * - Agent: returns empty array
 */
export function getAccessibleOfficeIds(
  session: PortalSession
): number[] | null {
  if (session.user.role === "super_admin") {
    return null; // null means all offices
  }

  if (session.user.role === "company_admin" && session.offices) {
    return session.offices.map((o) => o.id);
  }

  if (session.user.role === "office_admin" && session.offices) {
    return session.offices.map((o) => o.id);
  }

  return [];
}

/**
 * Get the company IDs that the user can access.
 * - Super admin: returns null (meaning all companies)
 * - Company admin: returns their company IDs
 * - Others: returns empty array
 */
export function getAccessibleCompanyIds(
  session: PortalSession
): number[] | null {
  if (session.user.role === "super_admin") {
    return null; // null means all companies
  }

  if (session.user.role === "company_admin" && session.companies) {
    return session.companies.map((c) => c.id);
  }

  return [];
}

/**
 * Check if user can manage a specific company.
 * - Super admin: can manage all companies
 * - Company admin: can manage only their companies
 * - Others: cannot manage companies
 */
export async function canManageCompany(
  session: PortalSession,
  companyId: number
): Promise<boolean> {
  if (session.user.role === "super_admin") {
    return true;
  }

  if (session.user.role === "company_admin" && session.companies) {
    const companyIds = session.companies.map((c) => c.id);
    return companyIds.includes(companyId);
  }

  return false;
}

/**
 * Custom error class for portal authentication errors.
 */
export class PortalAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PortalAuthError";
    this.status = status;
  }
}

/**
 * Helper to create an error response for API routes.
 */
export function portalAuthErrorResponse(error: unknown): Response {
  if (error instanceof PortalAuthError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.error("Unexpected error in portal auth:", error);
  return new Response(JSON.stringify({ error: "Internal server error" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}
