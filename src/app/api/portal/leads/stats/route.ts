import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq, and, inArray, count, gte, sql } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
  getAccessibleOfficeIds,
} from "@/lib/portal-auth";

export async function GET() {
  try {
    const session = await requirePortalRole(["agent", "office_admin", "super_admin"]);

    // Build where conditions based on role
    const conditions: ReturnType<typeof eq>[] = [];

    if (session.user.role === "agent" && session.agent) {
      conditions.push(eq(leads.agentId, session.agent.id));
    } else if (session.user.role === "office_admin") {
      const officeIds = getAccessibleOfficeIds(session);
      if (officeIds && officeIds.length > 0) {
        conditions.push(inArray(leads.officeId, officeIds));
      } else {
        // No offices assigned
        return Response.json({
          total: 0,
          byStatus: { new: 0, contacted: 0, converted: 0, closed: 0 },
          thisWeek: 0,
          thisMonth: 0,
        });
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(leads)
      .where(whereClause);

    // Get counts by status
    const statusCounts = await db
      .select({
        status: leads.status,
        count: count(),
      })
      .from(leads)
      .where(whereClause)
      .groupBy(leads.status);

    const byStatus = {
      new: 0,
      contacted: 0,
      converted: 0,
      closed: 0,
    };

    statusCounts.forEach((row) => {
      if (row.status && row.status in byStatus) {
        byStatus[row.status as keyof typeof byStatus] = row.count;
      }
    });

    // Get this week's count
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weekConditions = [...conditions];
    weekConditions.push(gte(leads.createdAt, oneWeekAgo));

    const [{ thisWeek }] = await db
      .select({ thisWeek: count() })
      .from(leads)
      .where(weekConditions.length > 0 ? and(...weekConditions) : undefined);

    // Get this month's count
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const monthConditions = [...conditions];
    monthConditions.push(gte(leads.createdAt, oneMonthAgo));

    const [{ thisMonth }] = await db
      .select({ thisMonth: count() })
      .from(leads)
      .where(monthConditions.length > 0 ? and(...monthConditions) : undefined);

    return Response.json({
      total,
      byStatus,
      thisWeek,
      thisMonth,
    });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
