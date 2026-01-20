import { db } from "@/db";
import { syncLogs, users } from "@/db/schema";
import { eq, desc, or } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";

// GET - Get current sync status (super admin only)
export async function GET() {
  try {
    await requirePortalRole(["super_admin"]);

    // Check for running or pending syncs
    const [runningSync] = await db
      .select({
        id: syncLogs.id,
        status: syncLogs.status,
        trigger: syncLogs.trigger,
        triggeredBy: syncLogs.triggeredBy,
        startedAt: syncLogs.startedAt,
        createdAt: syncLogs.createdAt,
        triggeredByName: users.name,
        triggeredByEmail: users.email,
      })
      .from(syncLogs)
      .leftJoin(users, eq(syncLogs.triggeredBy, users.id))
      .where(or(eq(syncLogs.status, "running"), eq(syncLogs.status, "pending")))
      .orderBy(desc(syncLogs.createdAt))
      .limit(1);

    // Get last completed sync
    const [lastCompleted] = await db
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
      .where(eq(syncLogs.status, "completed"))
      .orderBy(desc(syncLogs.completedAt))
      .limit(1);

    return Response.json({
      isRunning: !!runningSync,
      currentSync: runningSync
        ? {
            id: runningSync.id,
            status: runningSync.status,
            trigger: runningSync.trigger,
            triggeredBy: runningSync.triggeredBy
              ? {
                  id: runningSync.triggeredBy,
                  name: runningSync.triggeredByName,
                  email: runningSync.triggeredByEmail,
                }
              : null,
            startedAt: runningSync.startedAt,
            createdAt: runningSync.createdAt,
          }
        : null,
      lastCompleted: lastCompleted
        ? {
            id: lastCompleted.id,
            status: lastCompleted.status,
            trigger: lastCompleted.trigger,
            triggeredBy: lastCompleted.triggeredBy
              ? {
                  id: lastCompleted.triggeredBy,
                  name: lastCompleted.triggeredByName,
                  email: lastCompleted.triggeredByEmail,
                }
              : null,
            startedAt: lastCompleted.startedAt,
            completedAt: lastCompleted.completedAt,
            stats: {
              listingsCreated: lastCompleted.listingsCreated,
              listingsUpdated: lastCompleted.listingsUpdated,
              listingsDeleted: lastCompleted.listingsDeleted,
              agentsCreated: lastCompleted.agentsCreated,
              agentsUpdated: lastCompleted.agentsUpdated,
              officesCreated: lastCompleted.officesCreated,
              officesUpdated: lastCompleted.officesUpdated,
              photosProcessed: lastCompleted.photosProcessed,
              openHousesProcessed: lastCompleted.openHousesProcessed,
            },
            errorMessage: lastCompleted.errorMessage,
            createdAt: lastCompleted.createdAt,
          }
        : null,
    });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
