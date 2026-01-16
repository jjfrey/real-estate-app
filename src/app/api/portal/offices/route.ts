import { db } from "@/db";
import { offices } from "@/db/schema";
import { asc } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";

// GET - List all offices (super admin only)
export async function GET() {
  try {
    await requirePortalRole(["super_admin"]);

    const allOffices = await db
      .select({
        id: offices.id,
        name: offices.name,
        brokerageName: offices.brokerageName,
      })
      .from(offices)
      .orderBy(asc(offices.name), asc(offices.brokerageName));

    return Response.json({ offices: allOffices });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
