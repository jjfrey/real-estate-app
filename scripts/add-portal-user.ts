import "dotenv/config";
import { config } from "dotenv";

// Load .env.local
config({ path: ".env.local" });

import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function addPortalUser() {
  const email = process.env.USER_EMAIL;
  const name = process.env.USER_NAME || email?.split("@")[0] || "User";
  const role = process.env.USER_ROLE || "super_admin";

  // Validate inputs
  if (!email) {
    console.error("Error: Missing USER_EMAIL environment variable");
    console.error("");
    console.error("Usage:");
    console.error('  USER_EMAIL="user@example.com" USER_NAME="John Doe" USER_ROLE="super_admin" npm run db:add-user');
    console.error("");
    console.error("Roles: super_admin, office_admin, agent");
    process.exit(1);
  }

  const validRoles = ["super_admin", "office_admin", "agent"];
  if (!validRoles.includes(role)) {
    console.error(`Error: Invalid role "${role}". Must be one of: ${validRoles.join(", ")}`);
    process.exit(1);
  }

  try {
    // Check if user already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existing) {
      console.log(`User already exists: ${email}`);

      if (existing.role !== role) {
        console.log(`Updating role from "${existing.role}" to "${role}"...`);
        await db
          .update(users)
          .set({ role })
          .where(eq(users.email, email));
        console.log("Role updated!");
      }

      process.exit(0);
    }

    // Generate a temporary random password
    // User will need to use "forgot password" to set their own
    const tempPassword = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Create the user
    console.log(`Creating ${role} account: ${email}`);
    await db.insert(users).values({
      email,
      name,
      password: hashedPassword,
      role,
    });

    console.log("");
    console.log("Portal user created successfully!");
    console.log(`  Email: ${email}`);
    console.log(`  Name: ${name}`);
    console.log(`  Role: ${role}`);
    console.log("");
    console.log("IMPORTANT: The user should use 'Forgot Password' to set their password.");
    console.log("Direct them to: /portal/login → 'Forgot your password?'");
    console.log("");
    console.log("(A random temporary password was generated but not displayed for security)");
  } catch (error) {
    console.error("Error creating user:", error);
    process.exit(1);
  }

  process.exit(0);
}

addPortalUser();
