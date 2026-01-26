import { NextRequest } from "next/server";
import { db } from "@/db";
import { companies, companyAdmins, offices, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  requirePortalRole,
  portalAuthErrorResponse,
  canManageCompany,
} from "@/lib/portal-auth";

// GET - Get company details with offices and admins
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePortalRole(["company_admin", "super_admin"]);
    const { id } = await params;
    const companyId = parseInt(id);

    if (isNaN(companyId)) {
      return Response.json({ error: "Invalid company ID" }, { status: 400 });
    }

    // Check permissions
    const canManage = await canManageCompany(session, companyId);
    if (!canManage) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get company with stats
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!company) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    // Get offices in this company
    const companyOffices = await db
      .select({
        id: offices.id,
        name: offices.name,
        brokerageName: offices.brokerageName,
        city: offices.city,
        state: offices.state,
        listingCount: sql<number>`(
          SELECT COUNT(*) FROM listings WHERE listings.office_id = offices.id
        )`.as("listing_count"),
      })
      .from(offices)
      .where(eq(offices.companyId, companyId));

    // Get admins for this company
    const admins = await db
      .select({
        id: companyAdmins.id,
        userId: companyAdmins.userId,
        userName: users.name,
        userEmail: users.email,
        createdAt: companyAdmins.createdAt,
      })
      .from(companyAdmins)
      .innerJoin(users, eq(companyAdmins.userId, users.id))
      .where(eq(companyAdmins.companyId, companyId));

    return Response.json({
      company: {
        ...company,
        offices: companyOffices,
        admins: admins.map((a) => ({
          id: a.id,
          user: {
            id: a.userId,
            name: a.userName,
            email: a.userEmail,
          },
          createdAt: a.createdAt,
        })),
      },
    });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// PATCH - Update company details (super admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePortalRole(["super_admin"]);
    const { id } = await params;
    const companyId = parseInt(id);

    if (isNaN(companyId)) {
      return Response.json({ error: "Invalid company ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, slug, logoUrl, website, phone, email, description } = body;

    // Check if company exists
    const existingCompany = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!existingCompany) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    // If changing slug, check uniqueness
    if (slug && slug !== existingCompany.slug) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(slug)) {
        return Response.json(
          { error: "Slug must be lowercase with hyphens only" },
          { status: 400 }
        );
      }

      const slugExists = await db.query.companies.findFirst({
        where: eq(companies.slug, slug),
      });
      if (slugExists) {
        return Response.json(
          { error: "A company with this slug already exists" },
          { status: 400 }
        );
      }
    }

    // Update company
    const [updatedCompany] = await db
      .update(companies)
      .set({
        name: name ?? existingCompany.name,
        slug: slug ?? existingCompany.slug,
        logoUrl: logoUrl !== undefined ? logoUrl : existingCompany.logoUrl,
        website: website !== undefined ? website : existingCompany.website,
        phone: phone !== undefined ? phone : existingCompany.phone,
        email: email !== undefined ? email : existingCompany.email,
        description: description !== undefined ? description : existingCompany.description,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId))
      .returning();

    return Response.json({ company: updatedCompany });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// DELETE - Delete a company (super admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePortalRole(["super_admin"]);
    const { id } = await params;
    const companyId = parseInt(id);

    if (isNaN(companyId)) {
      return Response.json({ error: "Invalid company ID" }, { status: 400 });
    }

    // Check if company exists
    const existingCompany = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!existingCompany) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    // Check if company has offices
    const officeCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(offices)
      .where(eq(offices.companyId, companyId));

    if (officeCount[0].count > 0) {
      return Response.json(
        { error: "Cannot delete company with assigned offices. Remove offices first." },
        { status: 400 }
      );
    }

    // Delete company (cascade will delete company_admins)
    await db.delete(companies).where(eq(companies.id, companyId));

    return Response.json({ success: true });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
