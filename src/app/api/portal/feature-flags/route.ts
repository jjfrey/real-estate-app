import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePortalRole, portalAuthErrorResponse } from "@/lib/portal-auth";
import { clearFlagsCache } from "@/lib/feature-flags";

// GET - List all feature flags (super_admin only)
export async function GET() {
  try {
    await requirePortalRole(["super_admin"]);

    const flags = await db.select().from(featureFlags).orderBy(featureFlags.key);
    return NextResponse.json(flags);
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// POST - Create a new feature flag (super_admin only)
export async function POST(request: NextRequest) {
  try {
    await requirePortalRole(["super_admin"]);

    const body = await request.json();
    const { key, description, enabledGlobal, enabledSites, rolloutPercentage, metadata } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const [flag] = await db
      .insert(featureFlags)
      .values({
        key: key.trim(),
        description: description || null,
        enabledGlobal: enabledGlobal ?? false,
        enabledSites: enabledSites ? JSON.stringify(enabledSites) : null,
        rolloutPercentage: rolloutPercentage ?? 100,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .returning();

    clearFlagsCache();
    return NextResponse.json(flag, { status: 201 });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// PATCH - Update a feature flag (super_admin only)
export async function PATCH(request: NextRequest) {
  try {
    await requirePortalRole(["super_admin"]);

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const updateValues: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.key !== undefined) updateValues.key = updates.key;
    if (updates.description !== undefined) updateValues.description = updates.description;
    if (updates.enabledGlobal !== undefined) updateValues.enabledGlobal = updates.enabledGlobal;
    if (updates.enabledSites !== undefined) {
      updateValues.enabledSites = updates.enabledSites ? JSON.stringify(updates.enabledSites) : null;
    }
    if (updates.rolloutPercentage !== undefined) updateValues.rolloutPercentage = updates.rolloutPercentage;
    if (updates.metadata !== undefined) {
      updateValues.metadata = updates.metadata ? JSON.stringify(updates.metadata) : null;
    }

    const [flag] = await db
      .update(featureFlags)
      .set(updateValues)
      .where(eq(featureFlags.id, id))
      .returning();

    if (!flag) {
      return NextResponse.json({ error: "Flag not found" }, { status: 404 });
    }

    clearFlagsCache();
    return NextResponse.json(flag);
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}

// DELETE - Delete a feature flag (super_admin only)
export async function DELETE(request: NextRequest) {
  try {
    await requirePortalRole(["super_admin"]);

    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(featureFlags)
      .where(eq(featureFlags.id, parseInt(id, 10)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Flag not found" }, { status: 404 });
    }

    clearFlagsCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
