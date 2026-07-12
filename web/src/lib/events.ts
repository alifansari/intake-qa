import "server-only";
import { z } from "zod";

// ---------------------------------------------------------------------------
// The one boundary for writing product events from TypeScript surfaces
// (routes, server components, server actions). First-party only — intake
// calls are confidential legal data, so no PostHog/Plausible/pixels; events
// land in OUR events table (SQLite 0027 / Postgres 0035) with ids and counts
// only, never transcripts or caller PII.
//
// Both helpers are BEST-EFFORT by contract: an event write must never break
// the user action that produced it. They swallow every failure (including
// "events table not migrated yet") — the action succeeds, the log loses a row.
// ---------------------------------------------------------------------------

export const EVENT_NAMES = [
  "sign_in",
  "desk_view",
  "digest_sent",
  "digest_opened",
  "digest_link_clicked",
  "callback_marked",
  "upload_started",
  "upload_completed",
  "audit_started",
  "audit_completed",
  "apply_submitted",
] as const;

export type ProductEventName = (typeof EVENT_NAMES)[number];

export const ProductEvent = z.object({
  event: z.enum(EVENT_NAMES),
  firmId: z.union([z.string().max(64), z.number().int()]).nullish(),
  actor: z.string().max(200).nullish(),
  // Small JSON blob — ids and counts only. Never PII, never transcript text.
  context: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).nullish(),
});
export type ProductEventInput = z.infer<typeof ProductEvent>;

type Store = typeof import("../../ingest/store.mjs");

// Record on an ALREADY-OPEN pipeline handle (routes/pages that hold one).
export async function recordEventOn(
  db: unknown,
  input: ProductEventInput,
): Promise<void> {
  try {
    const parsed = ProductEvent.parse(input);
    const store = (await import("../../ingest/store.mjs")) as Store;
    await store.recordEvent(db, {
      event: parsed.event,
      firm_id: parsed.firmId ?? null,
      actor: parsed.actor ?? null,
      context: parsed.context ?? null,
    });
  } catch {
    /* best-effort — never throw into the caller */
  }
}

// Record with a self-managed connection (call sites that hold no handle).
export async function recordProductEvent(input: ProductEventInput): Promise<void> {
  try {
    const store = (await import("../../ingest/store.mjs")) as Store;
    if (!store.pipelineDbConfigured() && process.env.NODE_ENV === "production") return;
    const db = await store.openPipelineDb();
    try {
      await recordEventOn(db, input);
    } finally {
      await store.closePipelineDb(db);
    }
  } catch {
    /* best-effort */
  }
}
