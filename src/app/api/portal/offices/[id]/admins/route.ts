import { NextRequest } from "next/server";
import { db } from "@/db";
import { offices, officeAdmins, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";

// POST - Add an admin to an office
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePortalRole(["super_admin"]);
    const { id } = await params;
    const officeId = parseInt(id);

    if (isNaN(officeId)) {
      return Response.json({ error: "Invalid office ID" }, { status: 400 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    // Verify office exists
    const office = await db.query.offices.findFirst({
      where: eq(offices.id, officeId),
    });

    if (!office) {
      return Response.json({ error: "Office not found" }, { status: 404 });
    }

    // Verify user exists and is an office_admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "office_admin" && user.role !== "super_admin") {
      return Response.json(
        { error: "User must be an office_admin or super_admin" },
        { status: 400 }
      );
    }

    // Check if already an admin of this office
    const existing = await db.query.officeAdmins.findFirst({
      where: and(
        eq(officeAdmins.officeId, officeId),
        eq(officeAdmins.userId, userId)
      ),
    });

    if (existing) {
      return Response.json(
        { error: "User is already an admin of this office" },
        { status: 400 }
      );
    }

    // Add admin
    const [newAdmin] = await db
      .insert(officeAdmins)
      .values({
        officeId,
        userId,
      })
      .returning();

    return Response.json({ admin: newAdmin }, { status: 201 });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// DELETE - Remove an admin from an office
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePortalRole(["super_admin"]);
    const { id } = await params;
    const officeId = parseInt(id);

    if (isNaN(officeId)) {
      return Response.json({ error: "Invalid office ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    // Find and delete the admin record
    const deleted = await db
      .delete(officeAdmins)
      .where(
        and(
          eq(officeAdmins.officeId, officeId),
          eq(officeAdmins.userId, userId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return Response.json(
        { error: "Admin record not found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
