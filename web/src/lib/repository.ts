import type { CallMeta, Outcome, OutcomeCode, ScoredCall } from "./schema";

// ---------------------------------------------------------------------------
// Repository — the ports-and-adapters seam.
//
// The UI and all reconciliation logic depend ONLY on this interface, never on
// where the data physically lives. Today the single adapter is
// JsonFileRepository (local JSON, zero external deps, no auth). When the SaaS
// track (see CLAUDE.md) is ready, a SupabaseRepository can implement this same
// interface and be swapped in with NO changes to any screen or metric.
//
// Keep this interface small and storage-agnostic: no file paths, no SQL, no
// Supabase types leak through here.
// ---------------------------------------------------------------------------

export interface OutcomePatch {
  outcome_code: OutcomeCode;
  callback_made?: boolean;
  callback_timestamp?: string | null;
  time_to_callback_hours?: number | null;
  who_called?: string | null;
  realized_fee_recovered?: number | null;
  outcome_entered_by?: string;
}

export interface Repository {
  /** All scored calls the engine has produced (seed + any real files). */
  getScoredCalls(): Promise<ScoredCall[]>;

  /** Sidecar metadata (call date, rep, source), keyed by call_id. */
  getCallMeta(): Promise<CallMeta[]>;

  /** All recorded outcomes. Calls without one are treated as "unknown" upstream. */
  getOutcomes(): Promise<Outcome[]>;

  /**
   * Create or update the outcome for a call. Increments outcome_version and
   * appends the previous snapshot to `edits` for auditability. Returns the
   * saved record. Implementations on a read-only filesystem should still
   * return the computed record so the demo never breaks.
   */
  upsertOutcome(callId: string, patch: OutcomePatch): Promise<Outcome>;
}
