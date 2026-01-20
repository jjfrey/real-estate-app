import { db } from "@/db";
import { users, agents, officeAdmins, offices } from "@/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";

// GET - List all portal users (super admin only)
export async function GET() {
  try {
    await requirePortalRole(["super_admin"]);

    // Get all users with portal roles
    const portalRoles = ["agent", "office_admin", "super_admin"];
    const portalUsers = await db.query.users.findMany({
      where: inArray(users.role, portalRoles),
      orderBy: [asc(users.name), asc(users.email)],
    });

    // Get additional info for each user
    const usersWithInfo = await Promise.all(
      portalUsers.map(async (user) => {
        let agentInfo = null;
        let managedOffices: { id: number; name: string | null; brokerageName: string | null }[] = [];

        // If user is an agent, get their agent record
        if (user.role === "agent") {
          const agent = await db.query.agents.findFirst({
            where: eq(agents.userId, user.id),
          });
          if (agent) {
            agentInfo = {
              id: agent.id,
              firstName: agent.firstName,
              lastName: agent.lastName,
            };
          }
        }

        // If user is an office admin, get their managed offices
        if (user.role === "office_admin") {
          const adminRecords = await db.query.officeAdmins.findMany({
            where: eq(officeAdmins.userId, user.id),
            with: {
              office: {
                columns: {
                  id: true,
                  name: true,
                  brokerageName: true,
                },
              },
            },
          });
          managedOffices = adminRecords.map((r) => r.office);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          agentInfo,
          managedOffices,
        };
      })
    );

    return Response.json({ users: usersWithInfo });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
