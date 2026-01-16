import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, invitations, agents, officeAdmins } from "@/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, name, password } = await request.json();

    // Validate required fields
    if (!token || !name || !password) {
      return Response.json(
        { error: "Token, name, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (name.trim().length < 2) {
      return Response.json(
        { error: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.token, token),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, new Date())
      ),
    });

    if (!invitation) {
      return Response.json(
        { error: "Invalid or expired invitation. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if email already has an account
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, invitation.email),
    });

    if (existingUser) {
      // Mark invitation as accepted since user exists
      await db
        .update(invitations)
        .set({ acceptedAt: new Date() })
        .where(eq(invitations.id, invitation.id));

      return Response.json(
        { error: "An account already exists with this email. Please log in instead." },
        { status: 400 }
      );
    }

    // Determine role based on invitation type
    const role = invitation.type === "agent" ? "agent" : "office_admin";

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user account
    const [newUser] = await db
      .insert(users)
      .values({
        email: invitation.email,
        name: name.trim(),
        password: hashedPassword,
        role,
      })
      .returning();

    // Link user to agent or office based on invitation type
    if (invitation.type === "agent" && invitation.agentId) {
      // Link user to agent record
      await db
        .update(agents)
        .set({ userId: newUser.id })
        .where(eq(agents.id, invitation.agentId));
    } else if (invitation.type === "office_admin" && invitation.officeId) {
      // Create office admin record
      await db.insert(officeAdmins).values({
        userId: newUser.id,
        officeId: invitation.officeId,
      });
    }

    // Mark invitation as accepted
    await db
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.id, invitation.id));

    console.log(`[Register] User created: ${newUser.email} (${role})`);

    return Response.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("[Register] Error:", error);
    return Response.json(
      { error: "An error occurred creating your account. Please try again." },
      { status: 500 }
    );
  }
}
