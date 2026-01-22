import cron from "node-cron";
import { db } from "@/db";
import { syncFeeds } from "@/db/schema";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { runSync } from "./sync";

let cronStarted = false;

export function startCronJobs() {
  // Prevent multiple cron instances (e.g., in dev with hot reload)
  if (cronStarted) {
    console.log("[Cron] Already started, skipping...");
    return;
  }
  cronStarted = true;

  console.log("[Cron] Starting scheduled job runner...");

  // Run every 15 minutes to check for due feeds
  // Cron format: minute hour day month weekday
  cron.schedule("*/15 * * * *", async () => {
    console.log("[Cron] Checking for scheduled feeds to run...");
    await runScheduledFeeds();
  });

  // Also run immediately on startup to catch any missed schedules
  setTimeout(() => {
    console.log("[Cron] Initial check for scheduled feeds...");
    runScheduledFeeds();
  }, 5000); // Wait 5 seconds for app to fully initialize
}

async function runScheduledFeeds() {
  try {
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
      console.log("[Cron] No feeds due to run");
      return;
    }

    console.log(`[Cron] Found ${dueFeeds.length} feed(s) due to run`);

    // Process each due feed
    for (const feed of dueFeeds) {
      try {
        console.log(`[Cron] Running scheduled sync for feed: ${feed.name} (ID: ${feed.id})`);

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

        if (result.success) {
          console.log(`[Cron] Feed ${feed.name} completed successfully:`, {
            created: result.stats.listingsCreated,
            updated: result.stats.listingsUpdated,
            duration: `${result.duration}ms`,
          });
        } else {
          console.error(`[Cron] Feed ${feed.name} failed:`, result.errorMessage);
        }
      } catch (error) {
        console.error(`[Cron] Error running sync for feed ${feed.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[Cron] Error checking scheduled feeds:", error);
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
      next = new Date(now);
      next.setUTCMinutes(0, 0, 0);
      next.setUTCHours(next.getUTCHours() + 1);
      break;

    case "every_6_hours": {
      next = new Date(now);
      const currentHour6 = next.getUTCHours();
      const next6Hour = Math.ceil((currentHour6 + 1) / 6) * 6;
      next.setUTCHours(next6Hour >= 24 ? 0 : next6Hour, 0, 0, 0);
      if (next6Hour >= 24) next.setUTCDate(next.getUTCDate() + 1);
      break;
    }

    case "every_12_hours": {
      next = new Date(now);
      const currentHour12 = next.getUTCHours();
      const next12Hour = currentHour12 < 12 ? 12 : 24;
      next.setUTCHours(next12Hour >= 24 ? 0 : next12Hour, 0, 0, 0);
      if (next12Hour >= 24) next.setUTCDate(next.getUTCDate() + 1);
      break;
    }

    case "daily":
      if (next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      break;

    case "weekly": {
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
      if (next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
  }

  return next;
}
