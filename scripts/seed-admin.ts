import "dotenv/config";
import { config } from "dotenv";

// Load .env.local
config({ path: ".env.local" });

import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.error("Error: Missing required environment variables");
    console.error("Please set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD");
    console.error("");
    console.error("Example:");
    console.error('  SUPER_ADMIN_EMAIL="admin@example.com" SUPER_ADMIN_PASSWORD="your-secure-password" npm run db:seed-admin');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Error: Password must be at least 8 characters");
    process.exit(1);
  }

  try {
    // Check if user already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existing) {
      if (existing.role === "super_admin") {
        console.log(`Super admin already exists: ${email}`);
        process.exit(0);
      }

      // Update existing user to super_admin
      console.log(`Updating existing user to super_admin: ${email}`);
      await db
        .update(users)
        .set({ role: "super_admin" })
        .where(eq(users.email, email));
      console.log("Done!");
      process.exit(0);
    }

    // Create new super admin account
    console.log(`Creating super admin account: ${email}`);
    const hashedPassword = await bcrypt.hash(password, 12);

    await db.insert(users).values({
      email,
      name,
      password: hashedPassword,
      role: "super_admin",
    });

    console.log("Super admin account created successfully!");
    console.log(`  Email: ${email}`);
    console.log(`  Name: ${name}`);
    console.log("");
    console.log("You can now log in at /portal/login");
  } catch (error) {
    console.error("Error creating super admin:", error);
    process.exit(1);
  }

  process.exit(0);
}

seedSuperAdmin();
