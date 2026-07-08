// Canonical demo SNAPSHOT — the SINGLE source of truth for the demo firm's page-one
// numbers across every surface. `composeLeakReport(DEMO_DOC)` (strong-only,
// arithmetic-summed) is authoritative; the on-site SampleStatement and the Statement
// PDF headline both derive from THIS snapshot so all three reconcile to the same
// figure ($33,000 to $95,000). Pure; no I/O. See P0-A.

import { DEMO_DOC } from "../../pdf/demo-fixture.mjs";
import { composeLeakReport } from "./compose.mjs";
import { fmtMoney } from "../../pdf/doc-helpers.mjs";

const MODEL = composeLeakReport(DEMO_DOC);

// Strong, non-expired leaks in the same order compose counts them — these are the
// rows that make up the headline and the ledger shown on page one.
const strongLeaks = (DEMO_DOC.leaks ?? []).filter(
  (l) => l.confidence === "strong" && !l.statuteExpired,
);

export const DEMO_SNAPSHOT = {
  firmName: DEMO_DOC.firmName,
  reportId: MODEL.meta.reportId,
  periodLabel: DEMO_DOC.periodLabel,
  // Page-one headline (the number all three surfaces must agree on).
  headlineLowCents: MODEL.schedule.headlineLow,
  headlineHighCents: MODEL.schedule.headlineHigh,
  headlineRange: MODEL.pageOne.feeRange, // "$33,000 to $95,000"
  strongCount: MODEL.pageOne.count,
  recoverableCount: MODEL.pageOne.recoverable,
  reconciliation: DEMO_DOC.reconciliation,
  // The strong-row ledger, one entry per counted exhibit.
  ledger: strongLeaks.map((l) => ({
    initials: l.callerInitials,
    caseType: l.caseType,
    confidence: l.confidence,
    feeLowCents: l.feeLowCents,
    feeHighCents: l.feeHighCents,
    feeLow: fmtMoney(l.feeLowCents),
    feeRange: `${fmtMoney(l.feeLowCents)} to ${fmtMoney(l.feeHighCents)}`,
    saveStatus: l.saveStatus,
  })),
};

// The composed model too, for callers that want the whole document.
export const DEMO_MODEL = MODEL;
