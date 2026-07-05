// Types for doc-helpers.mjs so the .tsx templates import it cleanly.
export function fmtMoney(cents: number): string;
export function fmtMoneyRange(lowCents: number, highCents: number): string;
export function fmtDate(iso: string): string;
export function statuteClock(daysRemaining: number): string;
export function statuteBand(daysRemaining: number): "red" | "amber" | "neutral";
export function reconciles(r: { received: number; processed: number; excluded: number; failed: number }): boolean;
export function trendVerdict(current: number, prior: number | null): "improved" | "held" | "declined";
export function statementId(firmCode: string, year: number | string, nn: number | string): string;
export function readoutId(firmCode: string, year: number | string, nn: number | string): string;
export const SAVE_STATUSES: string[];
export const SEVERITY_TIERS: { critical: string; significant: string; awareness: string };
export const ATTESTATION: string;
export const FOOTNOTES: { fee: string; confidence: string; reconciliation: string };
export const AGENCY_INTRO: string;
export const COACHING_XREF: string;
export const READOUT_LIMITS_INTRO: string;
export const READOUT_NEXT_STEPS: string;
export const INTAKE_METRICS: { key: string; name: string; def: string }[];
