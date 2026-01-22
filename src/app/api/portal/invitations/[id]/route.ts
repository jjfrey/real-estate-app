import { NextRequest } from "next/server";
import { db } from "@/db";
import { invitations } from "@/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
  PortalAuthError,
} from "@/lib/portal-auth";

// DELETE - Revoke invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePortalRole(["office_admin", "company_admin", "super_admin"]);
    const { id } = await params;
    const invitationId = parseInt(id);

    if (isNaN(invitationId)) {
      return Response.json({ error: "Invalid invitation ID" }, { status: 400 });
    }

    // Fetch the invitation
    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.id, invitationId),
    });

    if (!invitation) {
      return Response.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Check if already accepted
    if (invitation.acceptedAt) {
      return Response.json(
        { error: "Cannot revoke an accepted invitation" },
        { status: 400 }
      );
    }

    // Role-based access check
    if (session.user.role === "office_admin") {
      // Office admins can only revoke agent invitations for their offices
      if (invitation.type !== "agent") {
        throw new PortalAuthError("Forbidden", 403);
      }

      const officeIds = session.offices?.map((o) => o.id) || [];
      if (!invitation.officeId || !officeIds.includes(invitation.officeId)) {
        throw new PortalAuthError("Forbidden", 403);
      }
    }

    // Delete the invitation
    await db.delete(invitations).where(eq(invitations.id, invitationId));

    return Response.json({ success: true });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// GET - Get single invitation details (for admins)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePortalRole(["office_admin", "company_admin", "super_admin"]);
    const { id } = await params;
    const invitationId = parseInt(id);

    if (isNaN(invitationId)) {
      return Response.json({ error: "Invalid invitation ID" }, { status: 400 });
    }

    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.id, invitationId),
      with: {
        agent: true,
        office: true,
      },
    });

    if (!invitation) {
      return Response.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Role-based access check
    if (session.user.role === "office_admin") {
      if (invitation.type !== "agent") {
        throw new PortalAuthError("Forbidden", 403);
      }

      const officeIds = session.offices?.map((o) => o.id) || [];
      if (!invitation.officeId || !officeIds.includes(invitation.officeId)) {
        throw new PortalAuthError("Forbidden", 403);
      }
    }

    return Response.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        type: invitation.type,
        status: invitation.acceptedAt ? "accepted" : "pending",
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
        createdAt: invitation.createdAt,
        agent: invitation.agent
          ? {
              id: invitation.agent.id,
              firstName: invitation.agent.firstName,
              lastName: invitation.agent.lastName,
            }
          : null,
        office: invitation.office
          ? {
              id: invitation.office.id,
              name: invitation.office.name,
              brokerageName: invitation.office.brokerageName,
            }
          : null,
      },
    });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
