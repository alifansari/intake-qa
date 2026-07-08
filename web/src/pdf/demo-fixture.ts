// Types + typed re-export for the demo fixture. The DATA now lives in the sibling
// plain-JS `demo-fixture.mjs` (the SINGLE source of truth, importable from both the
// .mjs composition layer and here). This file only supplies the TypeScript shapes
// and re-exports the canonical DEMO_DOC typed. Mirrors the demo firm from seed:demo
// ("Sunset & Vine Injury Law (DEMO)"). Every figure is illustrative; callers are
// fake (initials + #ID only). The analyst-of-record is the REAL signer.

import { DEMO_DOC as DEMO_DOC_JS } from "./demo-fixture.mjs";

export type LeakTag =
  | "no-callback-commitment"
  | "unhandled-objection"
  | "transfer-dropped"
  | "quote-only-no-close"
  | "language-mismatch"
  | "statute-urgency-missed"
  | "qualification-incomplete";

export type LeakRow = {
  callerInitials: string;
  callerId: string;
  callDate: string;
  caseType: string;
  qualifyingFacts: { text: string; cite: string }[];
  feeLowCents: number; // illustrative FEE range (post-contingency)
  feeHighCents: number;
  caseLowCents?: number; // pre-contingency case-value band (for the derivation line)
  caseHighCents?: number;
  feeBasis?: string; // e.g. "your 2025 auto average"
  statuteDays: number;
  statuteExpired?: boolean;
  saveStatus: string;
  confidence: "strong" | "moderate";
  channel: string;
  severity: "critical" | "significant" | "awareness";
  tag: LeakTag;
  feeDerivation?: string | null;
  excerpt?: string | { speaker: string; ts: string; text: string; isLeakMoment?: boolean }[];
};

export type IntakeMetric = { key: string; pct: number | null; priorPct: number | null; bandLow: number; bandHigh: number; unit?: string };

export type DocData = {
  firmName: string;
  firmCode: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  analystName: string;
  issuedDate: string;
  seq: number;
  year: number;
  missedLowCents: number;
  missedHighCents: number;
  leaksFlagged: number;
  savesInProgress: number;
  leaks: LeakRow[];
  metrics: IntakeMetric[];
  channels: { name: string; volume: number; qualificationPct: number; leaks: number }[];
  reconciliation: { received: number; processed: number; excluded: number; failed: number };
  analystNote: string;
  couldNotDetermine: string[];
};

// The canonical data lives in demo-fixture.mjs; re-export it typed.
export const DEMO_DOC: DocData = DEMO_DOC_JS as DocData;
