import { NextRequest } from "next/server";
import { db } from "@/db";
import { companies, companyAdmins, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";

// POST - Add a company admin (super admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePortalRole(["super_admin"]);
    const { id } = await params;
    const companyId = parseInt(id);

    if (isNaN(companyId)) {
      return Response.json({ error: "Invalid company ID" }, { status: 400 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    // Check if company exists
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!company) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    // Check if user exists and has company_admin role
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "company_admin") {
      return Response.json(
        { error: "User must have company_admin role to be assigned to a company" },
        { status: 400 }
      );
    }

    // Check if already an admin
    const existingAdmin = await db.query.companyAdmins.findFirst({
      where: and(
        eq(companyAdmins.companyId, companyId),
        eq(companyAdmins.userId, userId)
      ),
    });

    if (existingAdmin) {
      return Response.json(
        { error: "User is already an admin of this company" },
        { status: 400 }
      );
    }

    // Add admin
    const [newAdmin] = await db
      .insert(companyAdmins)
      .values({
        companyId,
        userId,
      })
      .returning();

    return Response.json(
      {
        admin: {
          id: newAdmin.id,
          companyId: newAdmin.companyId,
          userId: newAdmin.userId,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// DELETE - Remove a company admin (super admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePortalRole(["super_admin"]);
    const { id } = await params;
    const companyId = parseInt(id);

    if (isNaN(companyId)) {
      return Response.json({ error: "Invalid company ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "userId query parameter is required" }, { status: 400 });
    }

    // Check if the admin assignment exists
    const adminRecord = await db.query.companyAdmins.findFirst({
      where: and(
        eq(companyAdmins.companyId, companyId),
        eq(companyAdmins.userId, userId)
      ),
    });

    if (!adminRecord) {
      return Response.json(
        { error: "User is not an admin of this company" },
        { status: 404 }
      );
    }

    // Remove admin
    await db
      .delete(companyAdmins)
      .where(
        and(
          eq(companyAdmins.companyId, companyId),
          eq(companyAdmins.userId, userId)
        )
      );

    return Response.json({ success: true });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
