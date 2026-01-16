import { NextRequest } from "next/server";
import { db } from "@/db";
import { invitations, agents, offices } from "@/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";

// GET - Validate invitation token (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return Response.json({
        valid: false,
        error: "Token is required",
      });
    }

    // Find the invitation
    const invitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.token, token),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, new Date())
      ),
      with: {
        agent: true,
        office: true,
      },
    });

    if (!invitation) {
      // Check if it exists but is expired or used
      const expiredOrUsed = await db.query.invitations.findFirst({
        where: eq(invitations.token, token),
      });

      if (expiredOrUsed) {
        if (expiredOrUsed.acceptedAt) {
          return Response.json({
            valid: false,
            error: "This invitation has already been used",
          });
        }
        return Response.json({
          valid: false,
          error: "This invitation has expired",
        });
      }

      return Response.json({
        valid: false,
        error: "Invalid invitation link",
      });
    }

    // Return invitation details for the registration form
    return Response.json({
      valid: true,
      invitation: {
        email: invitation.email,
        type: invitation.type,
        agent: invitation.agent
          ? {
              firstName: invitation.agent.firstName,
              lastName: invitation.agent.lastName,
            }
          : null,
        office: invitation.office
          ? {
              name: invitation.office.name,
              brokerageName: invitation.office.brokerageName,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[Invitation Validate] Error:", error);
    return Response.json({
      valid: false,
      error: "An error occurred validating the invitation",
    });
  }
}
