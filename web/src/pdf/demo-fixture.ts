// Self-contained, obviously-synthetic data for rendering sample PDFs with NO DB.
// Mirrors the demo firm from seed:demo ("Sunset & Vine Injury Law (DEMO)").
// Every figure here is illustrative; callers are fake (initials + #ID only).

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
  statuteDays: number;
  statuteExpired?: boolean;
  saveStatus: string;
  confidence: "strong" | "moderate";
  channel: string;
  severity: "critical" | "significant" | "awareness";
  tag: LeakTag;
  excerpt?: string;
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

export const DEMO_DOC: DocData = {
  firmName: "Sunset & Vine Injury Law (DEMO)",
  firmCode: "SUNSET",
  periodLabel: "June 2026",
  periodStart: "2026-06-01",
  periodEnd: "2026-06-30",
  analystName: "Ali (DEMO)",
  issuedDate: "2026-07-05",
  seq: 3,
  year: 2026,
  missedLowCents: 4200000,
  missedHighCents: 9600000,
  leaksFlagged: 4,
  savesInProgress: 2,
  leaks: [
    {
      callerInitials: "J.R.",
      callerId: "#A-0142",
      callDate: "2026-06-08",
      caseType: "Auto — rear-end",
      qualifyingFacts: [
        { text: "Rear-ended by a company truck; driver admitted fault at the scene", cite: "[03:12]" },
        { text: "Treating with a chiropractor twice a week for neck and back pain", cite: "[05:41]" },
        { text: "Ready to move forward but no retainer was sent and no callback scheduled", cite: "[08:20]" },
      ],
      feeLowCents: 1800000,
      feeHighCents: 4500000,
      statuteDays: 690,
      saveStatus: "Sent by staff",
      confidence: "strong",
      channel: "Answering service",
      severity: "significant",
      tag: "no-callback-commitment",
      excerpt:
        "Caller: The other driver admitted it was his fault at the scene.\nStaff: Okay. Someone will call you back.\nCaller: Yeah, I definitely want to move forward with this.\n[No callback logged.]",
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
      statuteDays: 22,
      saveStatus: "Draft ready",
      confidence: "strong",
      channel: "Staff (business hours)",
      severity: "critical",
      tag: "language-mismatch",
      excerpt:
        "Caller: There was no sign, nothing — I slipped right where they'd mopped.\nStaff: Let me take your number and someone will reach out.\n[Spanish-language call; fully transcribed and analyzed.]",
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
      caseType: "Auto — rear-end",
      qualifyingFacts: [
        { text: "Low-speed collision; caller unsure of injury severity, some soreness", cite: "[06:02]" },
      ],
      feeLowCents: 900000,
      feeHighCents: 2200000,
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
    "Two of this period's four leaks were the same pattern: a strong auto PNC called after hours, reached the answering service, and never got a same-day callback. The facts were all there on the calls — this is a follow-up-timing gap, not an intake-skill gap. If callbacks on after-hours auto calls happen within the business day, I'd expect most of these to convert. I've queued a coaching clip that shows one call where the callback happened fast and the PNC signed.",
  couldNotDetermine: [
    "Whether J.R. (#A-0142) later called back on another line or signed with another firm.",
    "Whether M.E. (#A-0187) has a policy-limits problem we cannot see from the call.",
    "Whether the one failed recording contained a signable PNC — re-export at higher quality to include it.",
  ],
};
