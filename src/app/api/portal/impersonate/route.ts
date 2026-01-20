import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getImpersonationCookieName } from "@/lib/portal-auth";

// POST - Start impersonating a user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super_admin can impersonate
    if (session.user.role !== "super_admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get the target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Cannot impersonate super_admin
    if (targetUser.role === "super_admin") {
      return Response.json(
        { error: "Cannot impersonate another super admin" },
        { status: 400 }
      );
    }

    // Cannot impersonate yourself
    if (targetUser.id === session.user.id) {
      return Response.json(
        { error: "Cannot impersonate yourself" },
        { status: 400 }
      );
    }

    // Set impersonation cookie
    const cookieStore = await cookies();
    cookieStore.set(getImpersonationCookieName(), userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 4, // 4 hours
    });

    return Response.json({
      success: true,
      impersonating: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
      },
    });
  } catch (error) {
    console.error("Impersonation error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Stop impersonating
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super_admin can have impersonation
    if (session.user.role !== "super_admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Clear impersonation cookie
    const cookieStore = await cookies();
    cookieStore.delete(getImpersonationCookieName());

    return Response.json({ success: true });
  } catch (error) {
    console.error("Stop impersonation error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - Check impersonation status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super_admin can impersonate
    if (session.user.role !== "super_admin") {
      return Response.json({ isImpersonating: false });
    }

    const cookieStore = await cookies();
    const impersonateCookie = cookieStore.get(getImpersonationCookieName());

    if (!impersonateCookie?.value) {
      return Response.json({ isImpersonating: false });
    }

    // Get the impersonated user info
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, impersonateCookie.value),
    });

    if (!targetUser || targetUser.role === "super_admin") {
      // Invalid impersonation, clear it
      cookieStore.delete(getImpersonationCookieName());
      return Response.json({ isImpersonating: false });
    }

    return Response.json({
      isImpersonating: true,
      impersonating: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
      },
      originalUser: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
    });
  } catch (error) {
    console.error("Check impersonation error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
