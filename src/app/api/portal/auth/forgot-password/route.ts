import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    // Find the user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    // Always return success to prevent email enumeration
    if (!user) {
      console.log(`[Password Reset] No user found for email: ${email}`);
      return Response.json({
        message: "If an account exists with that email, a reset link has been sent.",
      });
    }

    // Check if user has portal access
    const portalRoles = ["agent", "office_admin", "super_admin"];
    if (!portalRoles.includes(user.role || "")) {
      console.log(`[Password Reset] User ${email} does not have portal access`);
      return Response.json({
        message: "If an account exists with that email, a reset link has been sent.",
      });
    }

    // Invalidate any existing unused tokens for this user
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.usedAt)
        )
      );

    // Generate a new token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token valid for 1 hour

    // Save the token
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // Build the reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/portal/reset-password?token=${token}`;

    // Send password reset email
    const emailResult = await sendPasswordResetEmail({
      to: email,
      resetUrl,
      userName: user.name || undefined,
    });

    if (!emailResult.success) {
      console.error("[Password Reset] Email failed:", emailResult.error);
    }

    // Also log for development
    console.log("");
    console.log("=".repeat(60));
    console.log("[Password Reset] Reset link generated:");
    console.log(`  Email: ${email}`);
    console.log(`  URL: ${resetUrl}`);
    console.log(`  Expires: ${expiresAt.toISOString()}`);
    console.log(`  Email sent: ${emailResult.success ? "Yes" : "No"}`);
    console.log("=".repeat(60));
    console.log("");

    return Response.json({
      message: "If an account exists with that email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("[Password Reset] Error:", error);
    return Response.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
