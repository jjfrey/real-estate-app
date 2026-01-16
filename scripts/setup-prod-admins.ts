import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const ADMINS = [
  { email: "jonathanblood@icloud.com", name: "Jonathan Blood" },
  { email: "jjfrey@gmail.com", name: "JJ Frey" },
];

async function setupProdAdmins() {
  console.log("Setting up production super admins...\n");

  for (const admin of ADMINS) {
    // Check if user already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, admin.email),
    });

    if (existing) {
      if (existing.role === "super_admin") {
        console.log(`✓ ${admin.email} - Already exists as super_admin`);
      } else {
        // Upgrade to super_admin
        await db
          .update(users)
          .set({ role: "super_admin" })
          .where(eq(users.id, existing.id));
        console.log(`✓ ${admin.email} - Upgraded to super_admin`);
      }
      continue;
    }

    // Generate a secure temporary password
    const tempPassword = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Create the user
    await db.insert(users).values({
      email: admin.email,
      name: admin.name,
      password: hashedPassword,
      role: "super_admin",
    });

    console.log(`✓ ${admin.email} - Created as super_admin`);
    console.log(`  Temp password: ${tempPassword}`);
    console.log(`  (Use forgot password to set your own)\n`);
  }

  console.log("\nDone! Both admins can now:");
  console.log("1. Go to /portal/forgot-password");
  console.log("2. Enter their email to receive a password reset link");
  console.log("3. Set their own password");

  process.exit(0);
}

setupProdAdmins().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
