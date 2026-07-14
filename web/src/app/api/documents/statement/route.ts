// Renders the Monthly Missed-Revenue Statement PDF.
//
// - No ?firm → the self-contained demo fixture (a sample always renders).
// - ?firm=<id>&period=YYYY-MM → the REAL statement for that firm’s leaked-signable
//   flags in that month, FOUNDER-GATED (only Ali generates statements today; the
//   analyst reviews before sending). It uses the firm’s own stored case types and
//   the SAME vetted fee source the desk shows (fee_value_ranges × contingency), so
//   the statement and the live desk never contradict each other on a dollar figure.
//
// TODO(Ali): open this to a firm’s own membership once a firm-facing "download my
// statement" flow + analyst-release gate for real firm statements is decided.
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { StatementDoc } from "@/pdf/statement";
import { DEMO_DOC, type DocData } from "@/pdf/demo-fixture";
import { publishedFalseAlarmRate } from "@/lib/calibration-snapshot";
import { requireFounderRoute } from "@/lib/studio/guard";
import { composeMonthlyStatement } from "@/lib/documents/from-firm-month.mjs";
import { feeRangeFromRow } from "../../../../../analysis/fee-value.mjs";
import { isSampledReviewEnabled } from "@/lib/flags";
import { decideStatementReview as decideStatementReviewRaw } from "../../../../../analysis/statement-review.mjs";
import { FOUNDER_NAME } from "@/lib/site-constants";

// Pure release-logic signature (the module is plain JS).
const decideStatementReview = decideStatementReviewRaw as (input: {
  perFlag: Array<{ confidenceTier?: "strong" | "moderate" | null; citationFailureCount?: number; revenueAtRiskCents?: number }>;
}) => { reportStatus: "draft" | "analyst_review" | "released"; provenance: "analyst_reviewed" | "engine_scored" | null; autoCount: number; forceReviewCount: number };

type FirmFlag = {
  id?: unknown;
  case_type?: string;
  caller_name?: string;
  received_at?: string;
  confidence_tier?: string;
  save_status?: string;
  reason?: string;
  citations?: unknown;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Parse ?period=YYYY-MM into an inclusive [start, endExclusive) ISO window + labels.
function parsePeriod(raw: string | null): {
  label: string;
  start: string;
  endExclusive: string;
  endLabel: string;
  year: number;
  seq: number;
} | null {
  const m = /^(\d{4})-(\d{2})$/.exec(raw ?? "");
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  if (month < 1 || month > 12) return null;
  const start = `${m[1]}-${m[2]}-01T00:00:00.000Z`;
  const endExclusive = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1)).toISOString();
  const endLabel = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 0)).toISOString();
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return { label, start, endExclusive, endLabel, year, seq: month };
}

async function renderPdf(doc: DocData, filename: string, extraHeaders?: Record<string, string>) {
  const falseAlarm = await publishedFalseAlarmRate();
  const el = React.createElement(StatementDoc, { d: doc, falseAlarm }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(el);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "no-store",
      // extraHeaders is only ever passed when SAMPLED_REVIEW_ENABLED is ON, so the
      // flag-OFF response is byte-identical (headers included) to today.
      ...(extraHeaders ?? {}),
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const firmId = url.searchParams.get("firm");

  // No firm → the shareable demo sample (unchanged behavior).
  if (!firmId) return renderPdf(DEMO_DOC, "missed-revenue-statement-demo.pdf");

  // Real firm data is founder-gated.
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;

  const period = parsePeriod(url.searchParams.get("period"));
  if (!period) return new Response("Pass ?period=YYYY-MM.", { status: 400 });

  const store = await import("../../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured()) {
    return new Response("Statements are not available in this environment.", { status: 503 });
  }
  const db = await store.openPipelineDb();
  try {
    const firms = await store.listFirms(db);
    const firm = firms.find((f: { id: unknown }) => String(f.id) === String(firmId));
    if (!firm) return new Response("Firm not found.", { status: 404 });

    // Leaked-signable flags, filtered to the period by the call’s received_at.
    const allFlags = (await store.listLeakedFlags(db, firm.id)) as FirmFlag[];
    const inPeriod = allFlags.filter((f) => {
      const t = f.received_at ? new Date(f.received_at).getTime() : NaN;
      return Number.isFinite(t) && t >= Date.parse(period.start) && t < Date.parse(period.endExclusive);
    });

    // Attach verified transcript citations so qualifying facts carry [mm:ss] cites.
    for (const f of inPeriod) {
      if (f.id != null && typeof store.getTranscriptCitations === "function") {
        try {
          f.citations = await store.getTranscriptCitations(db, f.id, { status: "verified" });
        } catch {
          f.citations = [];
        }
      }
    }

    // Fee source == the desk’s: the vetted fee_value_ranges table, per firm.
    // getFeeValueRange is async, so pre-warm a cache the pure composer reads sync.
    const feeCache = new Map<string, { lowCents: number; highCents: number } | null>();
    const caseTypes = [...new Set(inPeriod.map((f) => f.case_type ?? "").filter(Boolean))];
    for (const ct of caseTypes) {
      try {
        const row = await store.getFeeValueRange(db, ct, firm.id);
        feeCache.set(ct, feeRangeFromRow(row));
      } catch {
        feeCache.set(ct, null);
      }
    }
    const feeRangeFor = (caseType: string | null) => feeCache.get(caseType ?? "") ?? null;

    const doc = composeMonthlyStatement({
      firm: { id: firm.id, name: firm.name, code: String(firm.name ?? "FIRM").replace(/[^A-Z0-9]/gi, "").slice(0, 8).toUpperCase() || "FIRM" },
      flags: inPeriod,
      feeRangeFor,
      period: { label: period.label, start: period.start, end: period.endLabel, year: period.year, seq: period.seq },
      issuedDate: new Date().toISOString().slice(0, 10),
    }) as unknown as DocData;

    const periodStr = `${period.year}-${String(period.seq).padStart(2, "0")}`;

    // Tiered "sampled review" release gate (flag-gated; DEFAULT OFF => this whole
    // block is skipped and the PDF + response are byte-identical to today). When ON:
    // classify this firm+period's REAL leaked-flag signals; if any flag is
    // force_review the statement holds in analyst_review for human sign-off, else it
    // auto-releases (engine_scored). The result is persisted to firm_statement_reviews
    // and surfaced on the response headers (never inside the PDF). A statement already
    // released (e.g. an analyst signed it off) is left exactly as-is — never downgraded.
    let reviewHeaders: Record<string, string> | undefined;
    if (isSampledReviewEnabled()) {
      try {
        const existing = await store.getFirmStatementReview(db, firm.id, periodStr);
        if (existing?.report_status === "released") {
          reviewHeaders = {
            "x-review-status": String(existing.report_status),
            "x-review-provenance": String(existing.provenance ?? ""),
            "x-review-auto-count": String(existing.auto_count ?? 0),
            "x-review-force-review-count": String(existing.force_review_count ?? 0),
          };
        } else {
          const signals = await store.getFirmStatementReviewSignals(db, firm.id, periodStr);
          const decision = decideStatementReview({ perFlag: signals.perFlag });
          await store.upsertFirmStatementReview(db, {
            firmId: firm.id,
            period: periodStr,
            reportStatus: decision.reportStatus,
            provenance: decision.provenance,
            autoCount: decision.autoCount,
            forceReviewCount: decision.forceReviewCount,
            releasedBy: decision.reportStatus === "released" ? `${FOUNDER_NAME} (auto: engine-scored)` : null,
          });
          reviewHeaders = {
            "x-review-status": decision.reportStatus,
            "x-review-provenance": decision.provenance ?? "",
            "x-review-auto-count": String(decision.autoCount),
            "x-review-force-review-count": String(decision.forceReviewCount),
          };
        }
      } catch {
        // A review-gate failure must never block the (founder-gated) statement or
        // change the PDF; fall through with no review headers.
        reviewHeaders = undefined;
      }
    }

    return renderPdf(doc, `missed-revenue-statement-${periodStr}.pdf`, reviewHeaders);
  } finally {
    await store.closePipelineDb(db);
  }
}
