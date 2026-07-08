// Canonical, obviously-synthetic demo data — the SINGLE SOURCE OF TRUTH for the
// demo firm ("Sunset & Vine Injury Law (DEMO)"). Kept as plain .mjs so it can be
// imported by BOTH the .mjs composition/snapshot layer AND the .tsx templates /
// TS types (via the sibling demo-fixture.ts, which re-exports these typed). Every
// figure is illustrative; callers are fake (initials + #ID only). The
// analyst-of-record is the REAL signer (src/lib/analyst.mjs).
//
// Per-leak feeLow/High are FEE ranges (post-contingency). caseLow/High are the
// pre-contingency case-value bands that produced them, carried so the exhibits can
// print the full "case value × contingency" derivation (compliance §IV).

import { ANALYST } from "../lib/analyst.mjs";

export const DEMO_DOC = {
  firmName: "Sunset & Vine Injury Law (DEMO)",
  firmCode: "SUNSET",
  periodLabel: "June 2026",
  periodStart: "2026-06-01",
  periodEnd: "2026-06-30",
  analystName: ANALYST.name,
  issuedDate: "2026-07-05",
  seq: 3,
  year: 2026,
  // Headline is DERIVED (sum of strong, non-expired rows) — see demo-snapshot.mjs.
  // These fixture values are a fallback only; the snapshot is authoritative.
  missedLowCents: 3300000,
  missedHighCents: 9500000,
  leaksFlagged: 4,
  savesInProgress: 2,
  leaks: [
    {
      callerInitials: "J.R.",
      callerId: "#A-0142",
      callDate: "2026-06-08",
      caseType: "Auto (rear-end)",
      qualifyingFacts: [
        { text: "Rear-ended by a company truck; driver admitted fault at the scene", cite: "[03:12]" },
        { text: "Treating with a chiropractor twice a week for neck and back pain", cite: "[05:41]" },
        { text: "Ready to move forward but no retainer was sent and no callback scheduled", cite: "[08:20]" },
      ],
      feeLowCents: 1800000,
      feeHighCents: 4500000,
      caseLowCents: 5400000,
      caseHighCents: 13500000,
      feeBasis: "your 2025 auto average",
      statuteDays: 690,
      saveStatus: "Sent by staff",
      confidence: "strong",
      channel: "Answering service",
      severity: "significant",
      tag: "no-callback-commitment",
      excerpt: [
        { speaker: "Caller", ts: "[08:04]", text: "The other driver admitted it was his fault at the scene." },
        { speaker: "Staff", ts: "[08:11]", text: "Okay. Someone will call you back." },
        { speaker: "Caller", ts: "[08:20]", text: "Yeah, I definitely want to move forward with this.", isLeakMoment: true },
        { speaker: "System", ts: "[08:31]", text: "[No callback logged.]" },
      ],
    },
    {
      callerInitials: "M.E.",
      callerId: "#A-0187",
      callDate: "2026-06-15",
      caseType: "Slip & fall",
      qualifyingFacts: [
        { text: "Fell on an unmarked wet floor at a grocery store; incident report filed", cite: "[02:05]" },
        { text: "Fractured wrist confirmed at urgent care the same day", cite: "[04:33]" },
      ],
      feeLowCents: 1500000,
      feeHighCents: 5000000,
      caseLowCents: 4500000,
      caseHighCents: 15000000,
      feeBasis: "published slip-and-fall range",
      statuteDays: 22,
      saveStatus: "Draft ready",
      confidence: "strong",
      channel: "Staff (business hours)",
      severity: "critical",
      tag: "language-mismatch",
      excerpt: [
        { speaker: "Caller", ts: "[02:05]", text: "There was no sign, nothing. I slipped right where they'd mopped." },
        { speaker: "Staff", ts: "[02:18]", text: "Let me take your number and someone will reach out.", isLeakMoment: true },
        { speaker: "System", ts: "[02:30]", text: "[Spanish-language call; fully transcribed and analyzed.]" },
      ],
    },
    {
      callerInitials: "T.W.",
      callerId: "#A-0203",
      callDate: "2026-06-22",
      caseType: "Dog bite",
      qualifyingFacts: [
        { text: "Bitten by a neighbor's dog; puncture wounds treated at ER", cite: "[01:48]" },
      ],
      feeLowCents: 800000,
      feeHighCents: 3000000,
      caseLowCents: 2400000,
      caseHighCents: 9000000,
      feeBasis: "published dog-bite range",
      statuteDays: 705,
      saveStatus: "Contact resumed",
      confidence: "moderate",
      channel: "AI receptionist",
      severity: "significant",
      tag: "quote-only-no-close",
    },
    {
      callerInitials: "R.K.",
      callerId: "#A-0210",
      callDate: "2026-06-27",
      caseType: "Auto (rear-end)",
      qualifyingFacts: [
        { text: "Low-speed collision; caller unsure of injury severity, some soreness", cite: "[06:02]" },
      ],
      feeLowCents: 900000,
      feeHighCents: 2200000,
      caseLowCents: 2700000,
      caseHighCents: 6600000,
      feeBasis: "your 2025 auto average",
      statuteDays: 720,
      saveStatus: "Draft ready",
      confidence: "moderate",
      channel: "Answering service",
      severity: "awareness",
      tag: "qualification-incomplete",
    },
  ],
  metrics: [
    { key: "answer_rate", pct: 78, priorPct: 84, bandLow: 85, bandHigh: 95 },
    { key: "qualification", pct: 88, priorPct: 86, bandLow: 80, bandHigh: 95 },
    { key: "followup", pct: 61, priorPct: 61, bandLow: 75, bandHigh: 90 },
    { key: "speed", pct: null, priorPct: null, bandLow: 0, bandHigh: 0, unit: "min" },
  ],
  channels: [
    { name: "Staff (business hours)", volume: 61, qualificationPct: 91, leaks: 1 },
    { name: "Answering service", volume: 44, qualificationPct: 83, leaks: 2 },
    { name: "AI receptionist", volume: 23, qualificationPct: 86, leaks: 1 },
  ],
  reconciliation: { received: 132, processed: 128, excluded: 3, failed: 1 },
  analystNote:
    "Two of this period's four leaks were the same pattern: a strong auto PNC called after hours, reached the answering service, and never got a same-day callback. The facts were all there on the calls. This is a follow-up-timing gap, not an intake-skill gap. If callbacks on after-hours auto calls happen within the business day, I'd expect most of these to convert. I've queued a coaching clip that shows one call where the callback happened fast and the PNC signed.",
  couldNotDetermine: [
    "Whether J.R. (#A-0142) later called back on another line or signed with another firm.",
    "Whether M.E. (#A-0187) has a policy-limits problem we cannot see from the call.",
    "Whether the one failed recording contained a signable PNC. Re-export at higher quality to include it.",
  ],
};
