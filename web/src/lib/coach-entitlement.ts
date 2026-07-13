import "server-only";
// P0-2: entitlement gate for the Live Coach (Pro-tier feature). DENY BY DEFAULT.
//
// The coach records/analyzes call audio, so it must be a paid, deliberately
// enabled capability — never on for everyone. Entitlement is resolved as:
//   1. the firm-level feature flag `live_coach` (migration 0008 firm_features), or
//   2. a global env opt-in `LIVE_COACH_ENABLED=true` for the single-tenant pilot.
// When neither is set, the coach is denied (nav hidden, API 403).

import {
  openPipelineDb,
  closePipelineDb,
  listFirms,
  isFeatureEnabled,
} from "../../ingest/store.mjs";
import { FEATURES } from "../../features.mjs";
import { getCurrentUser } from "@/lib/supabase/server";

function truthyEnv(v: string | undefined): boolean {
  if (v == null) return false;
  return /^(true|1|yes|on)$/i.test(v.trim());
}

// Resolve the caller’s firm id (authenticated firm, else the pilot’s single firm
// only when the pilot fallback is explicitly enabled). Returns null when unknown.
async function resolveFirmId(db: unknown): Promise<number | string | null> {
  const user = await getCurrentUser().catch(() => null);
  const fromUser = (user?.user_metadata?.firm_id as string | undefined) ?? null;
  if (fromUser) return fromUser;
  if (!truthyEnv(process.env.PILOT_SINGLE_TENANT_FALLBACK)) return null;
  const firms = (await listFirms(db).catch(() => [])) as Array<{ id: number | string }>;
  return firms[0]?.id ?? null;
}

// Is the Live Coach entitled for this request? Deny by default.
export async function isLiveCoachEntitled(): Promise<{
  entitled: boolean;
  firmId: number | string | null;
}> {
  // Global pilot override: on when explicitly enabled.
  if (truthyEnv(process.env.LIVE_COACH_ENABLED)) {
    const db = await openPipelineDb();
    try {
      const firmId = await resolveFirmId(db);
      return { entitled: true, firmId };
    } finally {
      await closePipelineDb(db).catch(() => {});
    }
  }

  const db = await openPipelineDb();
  try {
    const firmId = await resolveFirmId(db);
    if (!firmId) return { entitled: false, firmId: null };
    const entitled = await isFeatureEnabled(db, firmId, FEATURES.LIVE_COACH);
    return { entitled: Boolean(entitled), firmId };
  } catch {
    return { entitled: false, firmId: null };
  } finally {
    await closePipelineDb(db).catch(() => {});
  }
}
