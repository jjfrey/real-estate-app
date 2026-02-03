import { NextRequest } from "next/server";
import { db } from "@/db";
import { linkClicks, listings, offices } from "@/db/schema";
import { eq, and, sql, count, gte, lte, inArray, desc, isNotNull } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
  getAccessibleOfficeIds,
} from "@/lib/portal-auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requirePortalRole(["company_admin", "super_admin"]);

    const { searchParams } = new URL(request.url);
    const campaign = searchParams.get("campaign");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions: ReturnType<typeof eq>[] = [];

    // Role-based scoping: company_admin sees only clicks for their company's listings
    if (session.user.role === "company_admin") {
      const officeIds = getAccessibleOfficeIds(session);
      if (officeIds && officeIds.length > 0) {
        // Subquery: get mls_ids for listings belonging to the company's offices
        const companyMlsIds = db
          .select({ mlsId: listings.mlsId })
          .from(listings)
          .where(inArray(listings.officeId, officeIds));

        conditions.push(inArray(linkClicks.mlsId, companyMlsIds));
      } else {
        return Response.json({
          summary: { totalClicks: 0, uniqueListings: 0, uniqueCampaigns: 0 },
          clicks: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
    }
    // super_admin sees all — no additional conditions

    if (campaign) {
      conditions.push(eq(linkClicks.campaign, campaign));
    }

    if (dateFrom) {
      conditions.push(gte(linkClicks.createdAt, new Date(dateFrom)));
    }

    if (dateTo) {
      // Include the entire "dateTo" day
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(lte(linkClicks.createdAt, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Summary stats
    const [summary] = await db
      .select({
        totalClicks: count(),
        uniqueListings: sql<number>`count(distinct ${linkClicks.mlsId})`,
        uniqueCampaigns: sql<number>`count(distinct ${linkClicks.campaign})`,
      })
      .from(linkClicks)
      .where(whereClause);

    // Get distinct campaigns for the filter dropdown
    const campaignsResult = await db
      .selectDistinct({ campaign: linkClicks.campaign })
      .from(linkClicks)
      .where(isNotNull(linkClicks.campaign));

    const campaigns = campaignsResult
      .map((r) => r.campaign)
      .filter((c): c is string => c !== null);

    // Grouped click data by mlsId with pagination
    const clicksQuery = db
      .select({
        mlsId: linkClicks.mlsId,
        clickCount: count(),
        lastClick: sql<string>`max(${linkClicks.createdAt})`,
        // Listing details via LEFT JOIN
        streetAddress: listings.streetAddress,
        city: listings.city,
        state: listings.state,
        price: listings.price,
      })
      .from(linkClicks)
      .leftJoin(listings, eq(linkClicks.mlsId, listings.mlsId))
      .where(whereClause)
      .groupBy(
        linkClicks.mlsId,
        listings.streetAddress,
        listings.city,
        listings.state,
        listings.price
      )
      .orderBy(desc(count()))
      .limit(limit)
      .offset(offset);

    const clicksData = await clicksQuery;

    // Get total grouped count for pagination
    const [{ totalGroups }] = await db
      .select({
        totalGroups: sql<number>`count(distinct ${linkClicks.mlsId})`,
      })
      .from(linkClicks)
      .where(whereClause);

    const clicks = clicksData.map((row) => ({
      mlsId: row.mlsId,
      clickCount: row.clickCount,
      lastClick: row.lastClick,
      listing: row.streetAddress
        ? {
            streetAddress: row.streetAddress,
            city: row.city,
            state: row.state,
            price: row.price,
          }
        : null,
    }));

    return Response.json({
      summary: {
        totalClicks: summary.totalClicks,
        uniqueListings: summary.uniqueListings,
        uniqueCampaigns: summary.uniqueCampaigns,
      },
      campaigns,
      clicks,
      pagination: {
        page,
        limit,
        total: totalGroups,
        totalPages: Math.ceil(totalGroups / limit),
      },
    });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
