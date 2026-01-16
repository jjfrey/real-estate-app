import { NextRequest } from "next/server";
import { db } from "@/db";
import { invitations, agents, offices, officeAdmins } from "@/db/schema";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";
import crypto from "crypto";
import {
  requirePortalRole,
  portalAuthErrorResponse,
  PortalAuthError,
  canManageOffice,
} from "@/lib/portal-auth";
import { sendInvitationEmail } from "@/lib/email";

// GET - List invitations
export async function GET(request: NextRequest) {
  try {
    const session = await requirePortalRole(["office_admin", "super_admin"]);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // 'pending' | 'accepted' | 'all'
    const type = searchParams.get("type"); // 'agent' | 'office_admin'

    // Build query conditions
    const conditions: ReturnType<typeof eq>[] = [];

    // Filter by status
    if (status === "pending") {
      conditions.push(isNull(invitations.acceptedAt));
    } else if (status === "accepted") {
      // For accepted, we'd need to check acceptedAt is not null
      // This requires a different approach with SQL
    }

    // Filter by type
    if (type) {
      conditions.push(eq(invitations.type, type));
    }

    // Role-based filtering
    if (session.user.role === "office_admin") {
      // Office admins can only see invitations for their offices (agent invites)
      // and invitations they sent
      const officeIds = session.offices?.map((o) => o.id) || [];
      if (officeIds.length === 0) {
        return Response.json({ invitations: [] });
      }
      // Only show agent invites for their offices
      conditions.push(eq(invitations.type, "agent"));
      conditions.push(inArray(invitations.officeId, officeIds));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch invitations with related data
    const invitationData = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        type: invitations.type,
        agentId: invitations.agentId,
        officeId: invitations.officeId,
        expiresAt: invitations.expiresAt,
        acceptedAt: invitations.acceptedAt,
        createdAt: invitations.createdAt,
        // Agent info (for agent invites)
        agentFirstName: agents.firstName,
        agentLastName: agents.lastName,
        // Office info
        officeName: offices.name,
        officeBrokerageName: offices.brokerageName,
      })
      .from(invitations)
      .leftJoin(agents, eq(invitations.agentId, agents.id))
      .leftJoin(offices, eq(invitations.officeId, offices.id))
      .where(whereClause)
      .orderBy(desc(invitations.createdAt));

    // Filter out expired pending invitations and transform
    const now = new Date();
    const transformedInvitations = invitationData
      .filter((inv) => {
        // Keep accepted invitations
        if (inv.acceptedAt) return true;
        // Filter out expired pending invitations
        return new Date(inv.expiresAt) > now;
      })
      .map((inv) => ({
        id: inv.id,
        email: inv.email,
        type: inv.type,
        status: inv.acceptedAt ? "accepted" : "pending",
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
        createdAt: inv.createdAt,
        agent: inv.agentId
          ? {
              id: inv.agentId,
              firstName: inv.agentFirstName,
              lastName: inv.agentLastName,
            }
          : null,
        office: inv.officeId
          ? {
              id: inv.officeId,
              name: inv.officeName,
              brokerageName: inv.officeBrokerageName,
            }
          : null,
      }));

    return Response.json({ invitations: transformedInvitations });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// POST - Create invitation
export async function POST(request: NextRequest) {
  try {
    const session = await requirePortalRole(["office_admin", "super_admin"]);

    const body = await request.json();
    const { email, type, agentId, officeId } = body;

    // Validate required fields
    if (!email || !type) {
      return Response.json(
        { error: "Email and type are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Validate type
    if (!["agent", "office_admin"].includes(type)) {
      return Response.json(
        { error: "Type must be 'agent' or 'office_admin'" },
        { status: 400 }
      );
    }

    // Type-specific validation
    if (type === "agent") {
      if (!agentId) {
        return Response.json(
          { error: "agentId is required for agent invitations" },
          { status: 400 }
        );
      }

      // Verify agent exists
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, agentId),
      });
      if (!agent) {
        return Response.json({ error: "Agent not found" }, { status: 404 });
      }

      // Check if agent already has an account
      if (agent.userId) {
        return Response.json(
          { error: "Agent already has a portal account" },
          { status: 400 }
        );
      }

      // For office admins, verify they can manage this agent's office
      if (session.user.role === "office_admin") {
        // Find the agent's office through their listings
        const agentListing = await db.query.listings.findFirst({
          where: eq(agents.id, agentId),
          columns: { officeId: true },
        });

        if (agentListing?.officeId) {
          const canManage = await canManageOffice(session, agentListing.officeId);
          if (!canManage) {
            throw new PortalAuthError("Forbidden", 403);
          }
        }
      }
    }

    if (type === "office_admin") {
      // Only super admins can invite office admins
      if (session.user.role !== "super_admin") {
        throw new PortalAuthError("Forbidden", 403);
      }

      if (!officeId) {
        return Response.json(
          { error: "officeId is required for office_admin invitations" },
          { status: 400 }
        );
      }

      // Verify office exists
      const office = await db.query.offices.findFirst({
        where: eq(offices.id, officeId),
      });
      if (!office) {
        return Response.json({ error: "Office not found" }, { status: 404 });
      }
    }

    // Check for existing pending invitation
    const existingInvite = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.email, email.toLowerCase()),
        eq(invitations.type, type),
        isNull(invitations.acceptedAt)
      ),
    });

    if (existingInvite && new Date(existingInvite.expiresAt) > new Date()) {
      return Response.json(
        { error: "An active invitation already exists for this email" },
        { status: 400 }
      );
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");

    // Set expiration (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const [newInvitation] = await db
      .insert(invitations)
      .values({
        email: email.toLowerCase(),
        token,
        type,
        agentId: type === "agent" ? agentId : null,
        officeId: officeId || null,
        invitedBy: session.user.id,
        expiresAt,
      })
      .returning();

    // Build the invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/portal/register?token=${token}`;

    // Get agent/office names for the email
    let agentName: string | undefined;
    let officeName: string | undefined;

    if (type === "agent" && agentId) {
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, agentId),
      });
      if (agent?.firstName || agent?.lastName) {
        agentName = [agent.firstName, agent.lastName].filter(Boolean).join(" ");
      }
    }

    if (officeId) {
      const office = await db.query.offices.findFirst({
        where: eq(offices.id, officeId),
      });
      officeName = office?.name || office?.brokerageName || undefined;
    }

    // Send invitation email
    const emailResult = await sendInvitationEmail({
      to: email,
      inviteUrl,
      type,
      agentName,
      officeName,
    });

    if (!emailResult.success) {
      console.error("[Invitation] Email failed but invitation created:", emailResult.error);
    }

    // Also log for development
    console.log("");
    console.log("=".repeat(60));
    console.log(`[Invitation] ${type} invitation created:`);
    console.log(`  Email: ${email}`);
    console.log(`  URL: ${inviteUrl}`);
    console.log(`  Expires: ${expiresAt.toISOString()}`);
    console.log(`  Email sent: ${emailResult.success ? "Yes" : "No"}`);
    console.log("=".repeat(60));
    console.log("");

    return Response.json(
      {
        invitation: {
          id: newInvitation.id,
          email: newInvitation.email,
          type: newInvitation.type,
          expiresAt: newInvitation.expiresAt,
        },
        // Include URL in response for development
        inviteUrl: process.env.NODE_ENV === "development" ? inviteUrl : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
