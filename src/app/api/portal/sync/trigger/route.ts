import { NextRequest } from "next/server";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";
import { runSync, isSyncRunning } from "@/lib/sync";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePortalRole(["super_admin"]);

    // Parse optional feedId from request body
    let feedId: number | undefined;
    try {
      const body = await request.json();
      feedId = body.feedId;
    } catch {
      // No body or invalid JSON - that's fine, feedId is optional
    }

    // Check if a sync is already running
    const isRunning = await isSyncRunning();
    if (isRunning) {
      return Response.json(
        { error: "A sync is already running" },
        { status: 409 }
      );
    }

    // Run sync in background (don't await full completion)
    // Start the sync and immediately return the response
    const syncPromise = runSync({
      trigger: "manual",
      triggeredBy: session.user.id,
      feedId,
    });

    // Use a detached promise pattern - don't await the full sync
    // but do await a brief moment to get the sync log created
    const result = await Promise.race([
      syncPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 100)),
    ]);

    if (result) {
      // Sync completed quickly (unlikely for real data)
      return Response.json({
        success: true,
        message: "Sync completed",
        stats: result.stats,
        duration: result.duration,
      });
    }

    // Sync is still running - let it continue in background
    // Note: In a production app, you'd want to use a proper job queue
    // like BullMQ, but for this use case we'll let the promise continue
    syncPromise.catch((error) => {
      console.error("Background sync error:", error);
    });

    return Response.json({
      success: true,
      message: "Sync started",
      status: "running",
    });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
