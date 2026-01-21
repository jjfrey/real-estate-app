import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, agents, officeAdmins, offices } from "@/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";
import { sendWelcomeEmail } from "@/lib/email";

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

// POST - Create a new portal user directly (super admin only)
export async function POST(request: NextRequest) {
  try {
    await requirePortalRole(["super_admin"]);

    const body = await request.json();
    const { email, name, password, role, agentId, officeId, sendWelcome } = body;

    // Validate required fields
    if (!email || !name || !password || !role) {
      return Response.json(
        { error: "Email, name, password, and role are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Validate password length
    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate name length
    if (name.trim().length < 2) {
      return Response.json(
        { error: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["agent", "office_admin", "super_admin"];
    if (!validRoles.includes(role)) {
      return Response.json(
        { error: "Role must be agent, office_admin, or super_admin" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return Response.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Role-specific validation
    if (role === "agent" && agentId) {
      // Verify agent exists
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, agentId),
      });
      if (!agent) {
        return Response.json({ error: "Agent not found" }, { status: 404 });
      }
      // Check if agent already has a user
      if (agent.userId) {
        return Response.json(
          { error: "Agent already has a portal account" },
          { status: 400 }
        );
      }
    }

    if (role === "office_admin" && officeId) {
      // Verify office exists
      const office = await db.query.offices.findFirst({
        where: eq(offices.id, officeId),
      });
      if (!office) {
        return Response.json({ error: "Office not found" }, { status: 404 });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        name: name.trim(),
        password: hashedPassword,
        role,
      })
      .returning();

    // Link user to agent if applicable
    if (role === "agent" && agentId) {
      await db
        .update(agents)
        .set({ userId: newUser.id })
        .where(eq(agents.id, agentId));
    }

    // Create office admin record if applicable
    if (role === "office_admin" && officeId) {
      await db.insert(officeAdmins).values({
        userId: newUser.id,
        officeId,
      });
    }

    // Send welcome email if requested
    let emailSent = false;
    if (sendWelcome) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const loginUrl = `${baseUrl}/portal/login`;

      const emailResult = await sendWelcomeEmail({
        to: newUser.email!, // We know email exists since we just created the user with one
        loginUrl,
        userName: newUser.name || "User",
        role: newUser.role || role, // Use provided role as fallback
        tempPassword: password, // Include the password they need to use
      });
      emailSent = emailResult.success;

      if (!emailResult.success) {
        console.error("[Users] Welcome email failed:", emailResult.error);
      }
    }

    console.log(`[Users] User created: ${newUser.email} (${role})`);

    return Response.json(
      {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          createdAt: newUser.createdAt,
        },
        emailSent,
      },
      { status: 201 }
    );
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
