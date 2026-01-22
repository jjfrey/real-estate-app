import { NextRequest } from "next/server";
import { db } from "@/db";
import { companies, companyAdmins, offices, users } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
} from "@/lib/portal-auth";

// GET - List all companies with stats (super admin only)
export async function GET() {
  try {
    await requirePortalRole(["super_admin"]);

    const companiesWithStats = await db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        logoUrl: companies.logoUrl,
        website: companies.website,
        phone: companies.phone,
        email: companies.email,
        createdAt: companies.createdAt,
        officeCount: sql<number>`(
          SELECT COUNT(*) FROM offices WHERE offices.company_id = ${companies.id}
        )`.as("office_count"),
        adminCount: sql<number>`(
          SELECT COUNT(*) FROM company_admins WHERE company_admins.company_id = ${companies.id}
        )`.as("admin_count"),
      })
      .from(companies)
      .orderBy(asc(companies.name));

    return Response.json({ companies: companiesWithStats });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// POST - Create a new company (super admin only)
export async function POST(request: NextRequest) {
  try {
    await requirePortalRole(["super_admin"]);

    const body = await request.json();
    const { name, slug, logoUrl, website, phone, email, description } = body;

    // Validate required fields
    if (!name || !slug) {
      return Response.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Validate slug format (lowercase, alphanumeric, hyphens)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return Response.json(
        { error: "Slug must be lowercase with hyphens only (e.g., berkshire-hathaway)" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingCompany = await db.query.companies.findFirst({
      where: eq(companies.slug, slug),
    });

    if (existingCompany) {
      return Response.json(
        { error: "A company with this slug already exists" },
        { status: 400 }
      );
    }

    // Create company
    const [newCompany] = await db
      .insert(companies)
      .values({
        name,
        slug,
        logoUrl: logoUrl || null,
        website: website || null,
        phone: phone || null,
        email: email || null,
        description: description || null,
      })
      .returning();

    return Response.json({ company: newCompany }, { status: 201 });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
