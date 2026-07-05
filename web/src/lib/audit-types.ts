// Loose TypeScript shapes for the untyped `ingest/audit.mjs` boundary.
// checkJs infers `{ ok: boolean }` result unions that don't narrow on `!res.ok`,
// so the routes and the report page cast the awaited results to these.

export type AuditSessionRow = {
  id: unknown;
  token: string;
  email?: string | null;
  monthly_call_volume?: number | null;
  status?: string;
  expires_at: string;
};

export type StartSessionResult = {
  ok: boolean;
  token?: string;
  sessionId?: unknown;
  reason?: string;
  retryHint?: string;
};

export type ResolveResult = {
  ok: boolean;
  reason?: string;
  session?: AuditSessionRow;
};

export type AuditCall = {
  id: unknown;
  filename: string;
  status: string;
  overallScore?: number | null;
  scoreBand?: string;
  signability?: string;
  signabilityScore?: number | null;
  leaked?: boolean;
  feeAtRisk?: number;
  reason?: string;
  evidenceQuotes?: string[];
  summary?: string | null;
  sol?: unknown;
  draftPreview?: string | null;
  [k: string]: unknown;
};

export type AuditSummary = {
  callsReviewed: number;
  signableCalls: number;
  leakedSignable: number;
  totalFeeAtRisk: number;
  avgHandlingScore: number | null;
  best: AuditCall | null;
  worst: AuditCall | null;
  perCallLeak: number;
  monthlyCallVolume: number;
  assumedVolume: boolean;
  projectedMonthlyLeakage: number;
};

export type AuditReport = {
  ok: boolean;
  reason?: string;
  session?: AuditSessionRow;
  calls?: AuditCall[];
  summary?: AuditSummary;
  pending?: number;
};
