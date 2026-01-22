import { db } from "@/db";
import { syncFeeds, companies } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";

// GET - List all sync feeds
export async function GET() {
  try {
    await requirePortalRole(["super_admin"]);

    const feedsData = await db
      .select()
      .from(syncFeeds)
      .orderBy(desc(syncFeeds.createdAt));

    // Fetch company info for each feed that has a companyId
    const feeds = await Promise.all(
      feedsData.map(async (feed) => {
        let company = null;
        if (feed.companyId) {
          const [companyData] = await db
            .select({ id: companies.id, name: companies.name, slug: companies.slug })
            .from(companies)
            .where(eq(companies.id, feed.companyId))
            .limit(1);
          company = companyData || null;
        }
        return { ...feed, company };
      })
    );

    return Response.json({ feeds });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// POST - Create a new sync feed
export async function POST(request: Request) {
  try {
    await requirePortalRole(["super_admin"]);

    const body = await request.json();
    const {
      name,
      slug,
      description,
      feedUrl,
      feedType = "xml",
      isEnabled = true,
      companyId,
      scheduleEnabled = false,
      scheduleFrequency = "daily",
      scheduleTime = "03:00:00",
      scheduleDayOfWeek,
    } = body;

    // Validate required fields
    if (!name || !slug) {
      return Response.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return Response.json(
        { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    // Validate company exists if provided
    if (companyId) {
      const [company] = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!company) {
        return Response.json(
          { error: "Company not found" },
          { status: 404 }
        );
      }
    }

    // Calculate next scheduled run if schedule is enabled
    let nextScheduledRun: Date | null = null;
    if (scheduleEnabled) {
      nextScheduledRun = calculateNextRun(scheduleFrequency, scheduleTime, scheduleDayOfWeek);
    }

    const [feed] = await db
      .insert(syncFeeds)
      .values({
        name,
        slug,
        description,
        feedUrl,
        feedType,
        isEnabled,
        companyId: companyId || null,
        scheduleEnabled,
        scheduleFrequency,
        scheduleTime,
        scheduleDayOfWeek,
        nextScheduledRun,
      })
      .returning();

    return Response.json({ feed }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique constraint")) {
      return Response.json(
        { error: "A feed with this slug already exists" },
        { status: 409 }
      );
    }
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
      // Next hour
      next = new Date(now);
      next.setUTCMinutes(0, 0, 0);
      next.setUTCHours(next.getUTCHours() + 1);
      break;

    case "every_6_hours":
      // Next 6-hour mark (0, 6, 12, 18)
      next = new Date(now);
      const currentHour6 = next.getUTCHours();
      const next6Hour = Math.ceil((currentHour6 + 1) / 6) * 6;
      next.setUTCHours(next6Hour >= 24 ? 0 : next6Hour, 0, 0, 0);
      if (next6Hour >= 24) next.setUTCDate(next.getUTCDate() + 1);
      break;

    case "every_12_hours":
      // Next 12-hour mark (0, 12)
      next = new Date(now);
      const currentHour12 = next.getUTCHours();
      const next12Hour = currentHour12 < 12 ? 12 : 24;
      next.setUTCHours(next12Hour >= 24 ? 0 : next12Hour, 0, 0, 0);
      if (next12Hour >= 24) next.setUTCDate(next.getUTCDate() + 1);
      break;

    case "daily":
      // If time has passed today, schedule for tomorrow
      if (next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      break;

    case "weekly":
      // Find next occurrence of dayOfWeek
      const targetDay = dayOfWeek ?? 0;
      const currentDay = next.getUTCDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil < 0 || (daysUntil === 0 && next <= now)) {
        daysUntil += 7;
      }
      next.setUTCDate(next.getUTCDate() + daysUntil);
      break;

    default:
      // Default to daily
      if (next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
  }

  return next;
}
