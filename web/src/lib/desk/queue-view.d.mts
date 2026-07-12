// Types for queue-view.mjs so the desk page + card import it cleanly.

export const TERMINAL_STATUSES: readonly string[];
export const ATTEMPT_STATUSES: readonly string[];

export function isTerminal(status: string | null | undefined): boolean;

export type QueueUrgency = {
  days: number;
  tone: "fresh" | "aging" | "urgent";
  label: string;
};

export function callUrgency(callDateIso: string | null | undefined, now?: number): QueueUrgency;

export function partitionLeaks<T extends { saveStatus: string | null; callDate: string }>(
  leaks: T[] | null | undefined,
): { active: T[]; done: T[] };

export function attemptNudge(attempts: number | null | undefined, status: string | null | undefined): string | null;
