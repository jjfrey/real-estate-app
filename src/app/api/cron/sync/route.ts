import { NextRequest } from "next/server";
import { db } from "@/db";
import { syncFeeds } from "@/db/schema";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { runSync } from "@/lib/sync";

// Cron endpoint for running scheduled feed syncs
//
// This endpoint should be called by an external scheduler (e.g., Vercel Cron,
// Railway Cron, or a cron job service) at regular intervals (e.g., every 15 minutes).
//
// Security: Requires CRON_SECRET to be set and passed via Authorization header or query param
//
// Usage with Vercel Cron - see vercel.json in project root
//
// Or call manually:
// curl -X GET "https://your-domain/api/cron/sync?secret=YOUR_CRON_SECRET"

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for Vercel

export async function GET(request: NextRequest) {
  try {
    // Validate cron secret
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("CRON_SECRET not configured");
      return Response.json(
        { error: "Cron not configured" },
        { status: 500 }
      );
    }

    // Check for secret in Authorization header or query param
    const authHeader = request.headers.get("authorization");
    const querySecret = request.nextUrl.searchParams.get("secret");
    const providedSecret = authHeader?.replace("Bearer ", "") || querySecret;

    if (providedSecret !== cronSecret) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();

    // Find feeds that are due to run
    const dueFeeds = await db
      .select()
      .from(syncFeeds)
      .where(
        and(
          eq(syncFeeds.isEnabled, true),
          eq(syncFeeds.scheduleEnabled, true),
          isNotNull(syncFeeds.nextScheduledRun),
          lte(syncFeeds.nextScheduledRun, now)
        )
      );

    if (dueFeeds.length === 0) {
      return Response.json({
        success: true,
        message: "No feeds due to run",
        checkedAt: now.toISOString(),
      });
    }

    const results: Array<{
      feedId: number;
      feedName: string;
      success: boolean;
      error?: string;
      stats?: object;
    }> = [];

    // Process each due feed
    for (const feed of dueFeeds) {
      try {
        console.log(`Running scheduled sync for feed: ${feed.name} (ID: ${feed.id})`);

        const result = await runSync({
          trigger: "scheduled",
          feedId: feed.id,
        });

        // Calculate next scheduled run
        const nextRun = calculateNextRun(
          feed.scheduleFrequency || "daily",
          feed.scheduleTime || "03:00:00",
          feed.scheduleDayOfWeek
        );

        // Update feed with last run time and next scheduled run
        await db
          .update(syncFeeds)
          .set({
            lastScheduledRun: now,
            nextScheduledRun: nextRun,
            updatedAt: now,
          })
          .where(eq(syncFeeds.id, feed.id));

        results.push({
          feedId: feed.id,
          feedName: feed.name,
          success: result.success,
          stats: result.stats,
          error: result.errorMessage,
        });
      } catch (error) {
        console.error(`Error running sync for feed ${feed.id}:`, error);
        results.push({
          feedId: feed.id,
          feedName: feed.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return Response.json({
      success: failCount === 0,
      message: `Processed ${dueFeeds.length} feed(s): ${successCount} succeeded, ${failCount} failed`,
      checkedAt: now.toISOString(),
      results,
    });
  } catch (error) {
    console.error("Cron sync error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper to calculate next scheduled run
function calculateNextRun(
  frequency: string,
  timeStr: string,
  dayOfWeek?: number | null
): Date {
  const now = new Date();
  const [hours, minutes] = timeStr.split(":").map(Number);

  let next = new Date(now);
  next.setUTCHours(hours, minutes, 0, 0);

  switch (frequency) {
    case "hourly":
      // Next hour
      next = new Date(now);
      next.setUTCMinutes(0, 0, 0);
      next.setUTCHours(next.getUTCHours() + 1);
      break;

    case "every_6_hours": {
      // Next 6-hour mark (0, 6, 12, 18)
      next = new Date(now);
      const currentHour6 = next.getUTCHours();
      const next6Hour = Math.ceil((currentHour6 + 1) / 6) * 6;
      next.setUTCHours(next6Hour >= 24 ? 0 : next6Hour, 0, 0, 0);
      if (next6Hour >= 24) next.setUTCDate(next.getUTCDate() + 1);
      break;
    }

    case "every_12_hours": {
      // Next 12-hour mark (0, 12)
      next = new Date(now);
      const currentHour12 = next.getUTCHours();
      const next12Hour = currentHour12 < 12 ? 12 : 24;
      next.setUTCHours(next12Hour >= 24 ? 0 : next12Hour, 0, 0, 0);
      if (next12Hour >= 24) next.setUTCDate(next.getUTCDate() + 1);
      break;
    }

    case "daily":
      // If time has passed today, schedule for tomorrow
      if (next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      break;

    case "weekly": {
      // Find next occurrence of dayOfWeek
      const targetDay = dayOfWeek ?? 0;
      const currentDay = next.getUTCDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil < 0 || (daysUntil === 0 && next <= now)) {
        daysUntil += 7;
      }
      next.setUTCDate(next.getUTCDate() + daysUntil);
      break;
    }

    default:
      // Default to daily
      if (next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
  }

  return next;
}
