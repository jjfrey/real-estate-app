import { db } from "@/db";
import { syncLogs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";

// GET - Get sync history (super admin only)
export async function GET(request: Request) {
  try {
    await requirePortalRole(["super_admin"]);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Get sync logs with user info
    const logs = await db
      .select({
        id: syncLogs.id,
        status: syncLogs.status,
        trigger: syncLogs.trigger,
        triggeredBy: syncLogs.triggeredBy,
        startedAt: syncLogs.startedAt,
        completedAt: syncLogs.completedAt,
        listingsCreated: syncLogs.listingsCreated,
        listingsUpdated: syncLogs.listingsUpdated,
        listingsDeleted: syncLogs.listingsDeleted,
        agentsCreated: syncLogs.agentsCreated,
        agentsUpdated: syncLogs.agentsUpdated,
        officesCreated: syncLogs.officesCreated,
        officesUpdated: syncLogs.officesUpdated,
        photosProcessed: syncLogs.photosProcessed,
        openHousesProcessed: syncLogs.openHousesProcessed,
        errorMessage: syncLogs.errorMessage,
        createdAt: syncLogs.createdAt,
        triggeredByName: users.name,
        triggeredByEmail: users.email,
      })
      .from(syncLogs)
      .leftJoin(users, eq(syncLogs.triggeredBy, users.id))
      .orderBy(desc(syncLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return Response.json({
      logs: logs.map((log) => ({
        id: log.id,
        status: log.status,
        trigger: log.trigger,
        triggeredBy: log.triggeredBy
          ? {
              id: log.triggeredBy,
              name: log.triggeredByName,
              email: log.triggeredByEmail,
            }
          : null,
        startedAt: log.startedAt,
        completedAt: log.completedAt,
        stats: {
          listingsCreated: log.listingsCreated,
          listingsUpdated: log.listingsUpdated,
          listingsDeleted: log.listingsDeleted,
          agentsCreated: log.agentsCreated,
          agentsUpdated: log.agentsUpdated,
          officesCreated: log.officesCreated,
          officesUpdated: log.officesUpdated,
          photosProcessed: log.photosProcessed,
          openHousesProcessed: log.openHousesProcessed,
        },
        errorMessage: log.errorMessage,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
