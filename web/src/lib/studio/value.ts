import "server-only";
import type { AuditReport } from "@/lib/audit-types";

// The one number the founder command center leads with: how much signable-fee
// value the product has SURFACED so far, summed across every Leak Audit that
// produced a report. This is deliberately the SAME figure the audit reports
// themselves show (summary.totalFeeAtRisk), so the home total and the shareable
// exhibit can never disagree.
//
// Compliance posture (compliance-invariants §IV): every dollar here is an
// ESTIMATE that traces to per-call transcript evidence in a real report — never
// a guarantee, never outcome-tied. The UI labels it as an estimate and links to
// the underlying reports; this module only does the arithmetic. Best-effort
// throughout: a missing table or unreachable DB returns a clean "nothing yet"
// rather than breaking the home screen.

export interface ValueSurfaced {
  connected: boolean;
  totalFeeAtRisk: number; // sum of estimated signable fees identified
  auditCount: number; // audits that produced a report with a summary
  callsReviewed: number; // total calls read across those audits
  latestToken: string | null; // most recent report, for a "see the evidence" link
}

const EMPTY: ValueSurfaced = {
  connected: false,
  totalFeeAtRisk: 0,
  auditCount: 0,
  callsReviewed: 0,
  latestToken: null,
};

// Cap how many sessions we hydrate into full reports on a home load. The founder
// is the only viewer and the page is force-dynamic, but building N reports is
// real work — 40 recent audits is plenty for a running total and keeps the home
// snappy. Older audits beyond that are still visible in the audit console.
const MAX_SESSIONS = 40;

export async function loadValueSurfaced(): Promise<ValueSurfaced> {
  try {
    const store = await import("../../../ingest/store.mjs");
    const { buildAuditReport } = await import("../../../ingest/audit.mjs");
    if (!store.pipelineDbConfigured()) return EMPTY;
    const db = await store.openPipelineDb();
    try {
      const rows = (await store.listRecentAuditSessions(db, MAX_SESSIONS)) as Array<{
        token: string;
        created_at?: string;
      }>;
      let totalFeeAtRisk = 0;
      let auditCount = 0;
      let callsReviewed = 0;
      let latestToken: string | null = null;
      for (const r of rows) {
        try {
          const rep = (await buildAuditReport({ db, token: r.token })) as AuditReport;
          if (rep?.ok && rep.summary) {
            totalFeeAtRisk += Number(rep.summary.totalFeeAtRisk ?? 0);
            callsReviewed += Number(rep.summary.callsReviewed ?? 0);
            auditCount += 1;
            // rows come back newest-first; first report we can build is latest.
            if (!latestToken) latestToken = r.token;
          }
        } catch {
          /* skip a single unbuildable report, keep the running total */
        }
      }
      return { connected: true, totalFeeAtRisk, auditCount, callsReviewed, latestToken };
    } finally {
      await store.closePipelineDb(db);
    }
  } catch {
    return EMPTY;
  }
}
