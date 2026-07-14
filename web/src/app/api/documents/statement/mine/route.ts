// Firm-facing Monthly Missed-Revenue Statement download.
//
// GET /api/documents/statement/mine?period=YYYY-MM
//
// Unlike the founder route (../route.ts, requireFounderRoute, ?firm=<id>), this
// serves the SIGNED-IN FIRM its OWN statement — no founder gate, no client-supplied
// firm id. The caller's firm is resolved server-side (requireDeskFirm), and the
// firm_statement_reviews row is looked up by that resolved firm id, so a firm can
// never fetch another firm's statement.
//
// HARD INVARIANT (compliance §IV/§VI): the PDF is served ONLY when the period's
// review row exists, belongs to this firm, and report_status === 'released'. A
// draft/analyst_review period returns 409 with a friendly "still in review" message
// and NO pdf; a missing/other-firm period returns 404. Enforced by the pure
// decideStatementAccess gate before any composing/streaming happens.
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { StatementDoc } from "@/pdf/statement";
import type { DocData } from "@/pdf/demo-fixture";
import { publishedFalseAlarmRate } from "@/lib/calibration-snapshot";
import { requireDeskFirm } from "@/lib/desk/firm";
import { composeMonthlyStatement } from "@/lib/documents/from-firm-month.mjs";
import { feeRangeFromRow } from "../../../../../../analysis/fee-value.mjs";
import { decideStatementAccess as decideStatementAccessRaw } from "../../../../../../analysis/statement-access.mjs";

const decideStatementAccess = decideStatementAccessRaw as (input: {
  review: { firm_id?: unknown; report_status?: string } | null | undefined;
  callerFirmId: string | number;
}) => { ok: true } | { ok: false; status: number; code: string; message: string };

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
// (Mirrors the founder route's parser; kept local so neither route depends on the
// other.)
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = parsePeriod(url.searchParams.get("period"));
  if (!period) return new Response("Pass ?period=YYYY-MM.", { status: 400 });
  const periodStr = `${period.year}-${String(period.seq).padStart(2, "0")}`;

  const store = await import("../../../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured()) {
    return new Response("Statements are not available in this environment.", { status: 503 });
  }
  const db = await store.openPipelineDb();
  try {
    // Resolve the CALLER's firm from the session (membership → firm). This is the
    // ONLY firm id that ever reaches the query; there is no ?firm param here.
    const gate = await requireDeskFirm(db, store.listFirms);
    if (gate.response) return gate.response;
    const firm = gate.firm;

    // Look up THIS firm's review row for the period, then apply the released-only
    // gate BEFORE composing or streaming anything.
    const review = await store.getFirmStatementReview(db, firm.id, periodStr);
    const decision = decideStatementAccess({ review, callerFirmId: firm.id });
    if (!decision.ok) {
      return Response.json({ error: decision.code, message: decision.message }, { status: decision.status });
    }

    // Released → compose the statement for THIS firm+period (same fee source and
    // composer as the founder route, scoped to the caller's firm).
    const allFlags = (await store.listLeakedFlags(db, firm.id)) as FirmFlag[];
    const inPeriod = allFlags.filter((f) => {
      const t = f.received_at ? new Date(f.received_at).getTime() : NaN;
      return Number.isFinite(t) && t >= Date.parse(period.start) && t < Date.parse(period.endExclusive);
    });

    for (const f of inPeriod) {
      if (f.id != null && typeof store.getTranscriptCitations === "function") {
        try {
          f.citations = await store.getTranscriptCitations(db, f.id, { status: "verified" });
        } catch {
          f.citations = [];
        }
      }
    }

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

    const falseAlarm = await publishedFalseAlarmRate();
    const el = React.createElement(StatementDoc, { d: doc, falseAlarm }) as unknown as Parameters<typeof renderToBuffer>[0];
    const buffer = await renderToBuffer(el);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="missed-revenue-statement-${periodStr}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } finally {
    await store.closePipelineDb(db);
  }
}
