import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, agents, officeAdmins, offices, leads } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";

// GET - Get single user with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePortalRole(["super_admin"]);
    const { id } = await params;

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Get agent info if linked
    let agentInfo = null;
    if (user.role === "agent") {
      const agent = await db.query.agents.findFirst({
        where: eq(agents.userId, user.id),
      });
      if (agent) {
        // Get lead count for this agent
        const [leadStats] = await db
          .select({ count: count() })
          .from(leads)
          .where(eq(leads.agentId, agent.id));

        agentInfo = {
          id: agent.id,
          firstName: agent.firstName,
          lastName: agent.lastName,
          email: agent.email,
          phone: agent.phone,
          licenseNum: agent.licenseNum,
          leadCount: leadStats?.count || 0,
        };
      }
    }

    // Get managed offices if office admin
    let managedOffices: {
      id: number;
      name: string | null;
      brokerageName: string | null;
      city: string | null;
      state: string | null;
    }[] = [];
    if (user.role === "office_admin") {
      const adminRecords = await db.query.officeAdmins.findMany({
        where: eq(officeAdmins.userId, user.id),
        with: {
          office: {
            columns: {
              id: true,
              name: true,
              brokerageName: true,
              city: true,
              state: true,
            },
          },
        },
      });
      managedOffices = adminRecords.map((r) => r.office);
    }

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        agentInfo,
        managedOffices,
      },
    });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// PATCH - Update user (role change)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePortalRole(["super_admin"]);
    const { id } = await params;

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { role, name } = body;

    const updates: { role?: string; name?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    // Validate and set role
    if (role !== undefined) {
      // Prevent changing your own role (self-demotion protection)
      if (session.user.id === id) {
        return Response.json(
          { error: "Cannot change your own role" },
          { status: 400 }
        );
      }

      const validRoles = ["agent", "office_admin", "super_admin"];
      if (!validRoles.includes(role)) {
        return Response.json({ error: "Invalid role" }, { status: 400 });
      }
      updates.role = role;

      // If changing from office_admin to another role, remove office admin records
      if (user.role === "office_admin" && role !== "office_admin") {
        await db.delete(officeAdmins).where(eq(officeAdmins.userId, id));
      }

      // If changing from agent to another role, unlink from agent record
      if (user.role === "agent" && role !== "agent") {
        await db
          .update(agents)
          .set({ userId: null })
          .where(eq(agents.userId, id));
      }
    }

    // Update name if provided
    if (name !== undefined) {
      updates.name = name;
    }

    await db.update(users).set(updates).where(eq(users.id, id));

    // Fetch updated user
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    return Response.json({
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        role: updatedUser!.role,
      },
    });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePortalRole(["super_admin"]);
    const { id } = await params;

    // Prevent self-deletion
    if (session.user.id === id) {
      return Response.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Unlink from agent if linked
    if (user.role === "agent") {
      await db
        .update(agents)
        .set({ userId: null })
        .where(eq(agents.userId, id));
    }

    // Remove office admin records
    await db.delete(officeAdmins).where(eq(officeAdmins.userId, id));

    // Delete the user (cascade will handle accounts, sessions)
    await db.delete(users).where(eq(users.id, id));

    return Response.json({ success: true });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
