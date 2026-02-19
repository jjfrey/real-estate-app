import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { FeatureFlag } from "@/db/schema";

// In-memory cache with 60s TTL
let flagsCache: { data: FeatureFlag[]; expiresAt: number } | null = null;

async function getAllFlags(): Promise<FeatureFlag[]> {
  const now = Date.now();
  if (flagsCache && flagsCache.expiresAt > now) {
    return flagsCache.data;
  }

  const flags = await db.select().from(featureFlags);
  flagsCache = { data: flags, expiresAt: now + 60_000 };
  return flags;
}

export function clearFlagsCache(): void {
  flagsCache = null;
}

export async function isFeatureEnabled(
  key: string,
  siteId?: string
): Promise<boolean> {
  const flags = await getAllFlags();
  const flag = flags.find((f) => f.key === key);

  if (!flag) return false;

  // Check global toggle
  if (flag.enabledGlobal) return true;

  // Check per-site enablement
  if (siteId && flag.enabledSites) {
    try {
      const enabledSites = JSON.parse(flag.enabledSites) as string[];
      if (enabledSites.includes(siteId)) return true;
    } catch {
      /* ignore invalid JSON */
    }
  }

  return false;
}

export async function getFeatureFlag(
  key: string
): Promise<FeatureFlag | undefined> {
  const flags = await getAllFlags();
  return flags.find((f) => f.key === key);
}

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  return getAllFlags();
}
