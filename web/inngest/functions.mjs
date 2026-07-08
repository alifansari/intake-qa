// Durable orchestration (the reliability/scheduling layer) over the PROVEN
// pipeline functions. Nothing here re-implements analysis — it wraps
// scoreUnscored / purgeDemo / sendDailyDigest in retryable, scheduled Inngest
// functions. Additive: the scoring function is EVENT-triggered (inert until an
// ingest path emits `intakeqa/call.received`), so it can never thrash existing
// data; the retention + digest functions are idempotent/self-guarding crons.
//
// The engine modules (score-worker, transcribe, digest, store) are loaded with
// dynamic import() INSIDE the handlers — the same pattern the API routes use — so
// they stay OUT of the Next static bundle (they resolve their optional SDK deps at
// runtime only).

import { inngest } from "./client.mjs";

async function withDb(fn) {
  const store = await import("../ingest/store.mjs");
  const db = await store.openPipelineDb();
  try {
    return await fn(db, store);
  } finally {
    await store.closePipelineDb(db);
  }
}

// Score-and-flag a firm's newly ingested calls. Event-triggered; idempotent
// (scoreUnscored only touches calls that have no score yet). Per-step retries +
// exponential backoff are Inngest defaults; a terminal failure is captured by
// Inngest's dead-letter and surfaced in its dashboard.
export const scorePipeline = inngest.createFunction(
  { id: "score-pipeline", retries: 4, triggers: [{ event: "intakeqa/call.received" }] },
  async ({ event, step }) => {
    return step.run("score-unscored", async () =>
      withDb(async (db) => {
        const { scoreUnscored } = await import("../ingest/score-worker.mjs");
        const results = await scoreUnscored({ db, firmId: event.data?.firmId ?? null });
        return { processed: Array.isArray(results) ? results.length : 0 };
      }),
    );
  },
);

// P0-1 FALLBACK: a scheduled sweep that scores any un-scored calls across all
// firms. The webhook emits `intakeqa/call.received` on ingest (the fast path);
// this cron is the safety net so a dropped event, an Inngest outage during
// ingest, or a call ingested by some other path (manual upload, backfill) still
// gets scored. scoreUnscored is idempotent — it only touches calls that have no
// flag yet — so running this alongside the event trigger can never double-score.
// Runs every 15 minutes.
export const scheduledScoreSweep = inngest.createFunction(
  { id: "scheduled-score-sweep", retries: 2, triggers: [{ cron: "*/15 * * * *" }] },
  async ({ step }) => {
    return step.run("score-unscored-all-firms", async () =>
      withDb(async (db) => {
        const { scoreUnscored } = await import("../ingest/score-worker.mjs");
        // firmId null => all firms' un-scored calls.
        const results = await scoreUnscored({ db, firmId: null });
        return { processed: Array.isArray(results) ? results.length : 0 };
      }),
    );
  },
);

// Retention: purge demo calls past their window and expired audit sessions. Daily,
// idempotent. This is the durable side of the 7-day/72h deletion promise.
export const retentionPurge = inngest.createFunction(
  { id: "retention-purge", retries: 2, triggers: [{ cron: "0 8 * * *" }] },
  async ({ step }) => {
    const demo = await step.run("purge-demo", async () =>
      withDb(async (db) => {
        const { purgeDemo } = await import("../ingest/demo.mjs");
        return purgeDemo({ db });
      }),
    );
    const audits = await step.run("purge-audit-sessions", async () =>
      withDb((db, store) => store.purgeExpiredAuditSessions(db, new Date().toISOString())),
    );
    // P0-3: enforce DATA_RETENTION_DAYS on REAL firm data (calls transcripts +
    // recording_url, outbound message bodies). This honors the DPA / CLAUDE.md
    // §(h) retention promise on production data, not just the demo purge above.
    // Idempotent: already-purged rows are skipped (transcript already null).
    const retention = await step.run("purge-expired-calls", async () =>
      withDb(async (db, store) => {
        const days = Number(process.env.DATA_RETENTION_DAYS ?? 90);
        if (!Number.isFinite(days) || days <= 0) {
          return { skipped: true, reason: "retention_disabled" };
        }
        const beforeIso = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
        return store.purgeExpiredCalls(db, beforeIso);
      }),
    );
    return { demo, audits, retention };
  },
);

// Daily digest of follow-up drafts. Self-guards: sendDailyDigest simulates in
// TEST_MODE or when RESEND_API_KEY is unset, so this never sends unexpectedly.
export const dailyDigest = inngest.createFunction(
  { id: "daily-digest", retries: 2, triggers: [{ cron: "0 15 * * *" }] }, // ~8am Pacific
  async ({ step }) => {
    const firms = await step.run("list-firms", async () => withDb((db, store) => store.listFirms(db)));
    let sent = 0;
    for (const f of firms ?? []) {
      await step.run(`digest-${f.id}`, async () =>
        withDb(async (db) => {
          const { sendDailyDigest } = await import("../messaging/digest.mjs");
          return sendDailyDigest({ db, firmId: f.id });
        }),
      );
      sent += 1;
    }
    return { firms: sent };
  },
);

export const functions = [scorePipeline, scheduledScoreSweep, retentionPurge, dailyDigest];
