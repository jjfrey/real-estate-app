import { db } from "@/db";
import { syncFeeds } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get a single sync feed
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requirePortalRole(["super_admin"]);

    const { id } = await params;
    const feedId = parseInt(id, 10);

    if (isNaN(feedId)) {
      return Response.json({ error: "Invalid feed ID" }, { status: 400 });
    }

    const [feed] = await db
      .select()
      .from(syncFeeds)
      .where(eq(syncFeeds.id, feedId))
      .limit(1);

    if (!feed) {
      return Response.json({ error: "Feed not found" }, { status: 404 });
    }

    return Response.json({ feed });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// PATCH - Update a sync feed
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    await requirePortalRole(["super_admin"]);

    const { id } = await params;
    const feedId = parseInt(id, 10);

    if (isNaN(feedId)) {
      return Response.json({ error: "Invalid feed ID" }, { status: 400 });
    }

    // Check feed exists
    const [existingFeed] = await db
      .select()
      .from(syncFeeds)
      .where(eq(syncFeeds.id, feedId))
      .limit(1);

    if (!existingFeed) {
      return Response.json({ error: "Feed not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Partial<typeof syncFeeds.$inferInsert> = {};

    // Only update fields that are provided
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.feedUrl !== undefined) updateData.feedUrl = body.feedUrl;
    if (body.feedType !== undefined) updateData.feedType = body.feedType;
    if (body.isEnabled !== undefined) updateData.isEnabled = body.isEnabled;
    if (body.scheduleEnabled !== undefined) updateData.scheduleEnabled = body.scheduleEnabled;
    if (body.scheduleFrequency !== undefined) updateData.scheduleFrequency = body.scheduleFrequency;
    if (body.scheduleTime !== undefined) updateData.scheduleTime = body.scheduleTime;
    if (body.scheduleDayOfWeek !== undefined) updateData.scheduleDayOfWeek = body.scheduleDayOfWeek;

    // Recalculate next scheduled run if schedule settings changed
    const scheduleEnabled = body.scheduleEnabled ?? existingFeed.scheduleEnabled;
    const scheduleFrequency = body.scheduleFrequency ?? existingFeed.scheduleFrequency;
    const scheduleTime = body.scheduleTime ?? existingFeed.scheduleTime;
    const scheduleDayOfWeek = body.scheduleDayOfWeek ?? existingFeed.scheduleDayOfWeek;

    if (scheduleEnabled) {
      updateData.nextScheduledRun = calculateNextRun(
        scheduleFrequency || "daily",
        scheduleTime || "03:00:00",
        scheduleDayOfWeek
      );
    } else {
      updateData.nextScheduledRun = null;
    }

    updateData.updatedAt = new Date();

    const [feed] = await db
      .update(syncFeeds)
      .set(updateData)
      .where(eq(syncFeeds.id, feedId))
      .returning();

    return Response.json({ feed });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// DELETE - Delete a sync feed
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    await requirePortalRole(["super_admin"]);

    const { id } = await params;
    const feedId = parseInt(id, 10);

    if (isNaN(feedId)) {
      return Response.json({ error: "Invalid feed ID" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(syncFeeds)
      .where(eq(syncFeeds.id, feedId))
      .returning({ id: syncFeeds.id });

    if (!deleted) {
      return Response.json({ error: "Feed not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return portalAuthErrorResponse(error);
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

    case "every_6_hours":
      next = new Date(now);
      const currentHour6 = next.getUTCHours();
      const next6Hour = Math.ceil((currentHour6 + 1) / 6) * 6;
      next.setUTCHours(next6Hour >= 24 ? 0 : next6Hour, 0, 0, 0);
      if (next6Hour >= 24) next.setUTCDate(next.getUTCDate() + 1);
      break;

    case "every_12_hours":
      next = new Date(now);
      const currentHour12 = next.getUTCHours();
      const next12Hour = currentHour12 < 12 ? 12 : 24;
      next.setUTCHours(next12Hour >= 24 ? 0 : next12Hour, 0, 0, 0);
      if (next12Hour >= 24) next.setUTCDate(next.getUTCDate() + 1);
      break;

    case "daily":
      if (next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      break;

    case "weekly":
      const targetDay = dayOfWeek ?? 0;
      const currentDay = next.getUTCDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil < 0 || (daysUntil === 0 && next <= now)) {
        daysUntil += 7;
      }
      next.setUTCDate(next.getUTCDate() + daysUntil);
      break;

    default:
      if (next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
  }

  return next;
}
