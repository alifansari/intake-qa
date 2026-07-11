import type {
  CallMeta,
  CaseDisposition,
  CaseOutcome,
  CensoredNumber,
  DispositionCode,
  EndState,
  Outcome,
  OutcomeCode,
  ScoredCall,
} from "./schema";

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

// Increment 0 flywheel patches. Money fields are CensoredNumber: null means
// "not known" (censored) — NEVER a stand-in for zero. A field absent from the
// patch keeps its prior value; present-as-null is an explicit "still unknown".
export interface CaseDispositionPatch {
  flag_id?: string | null;
  disposition: DispositionCode;
  decided_by: string; // ROLE text, never a scored staffer
  decided_at?: string;
  /** Written once at decision time; implementations never overwrite it. */
  intake_feature_snapshot?: Record<string, unknown>;
  external_case_ref?: string | null;
}

export interface CaseOutcomePatch {
  end_state?: EndState;
  gross?: CensoredNumber;
  costs_advanced?: CensoredNumber;
  lien_load?: CensoredNumber;
  net_to_client?: CensoredNumber;
  net_fee_to_firm?: CensoredNumber;
  referral_fee?: CensoredNumber;
  time_to_resolution_days?: number | null;
  demand_sent_at?: string | null;
  demand_amount?: CensoredNumber;
  first_offer?: CensoredNumber;
  entered_by?: string;
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

  // -------------------------------------------------------------------------
  // Increment 0 — outcome-data flywheel (DARK: no UI reads these yet).
  // Sibling records keyed by call_id; ScoredCall/Outcome stay untouched.
  // -------------------------------------------------------------------------

  /** The disposition (what the firm DID) for a call, if recorded. */
  getCaseDisposition(callId: string): Promise<CaseDisposition | null>;

  /** All dispositions for a firm (retrodiction / backtest input). */
  listCaseDispositions(firmId: string): Promise<CaseDisposition[]>;

  /**
   * Create or update a call's disposition. The intake_feature_snapshot is
   * IMMUTABLE: written on first insert, never overwritten by later upserts.
   */
  upsertCaseDisposition(
    callId: string,
    firmId: string,
    patch: CaseDispositionPatch
  ): Promise<CaseDisposition>;

  /** The realized outcome (what HAPPENED) for a call, if recorded. */
  getCaseOutcome(callId: string): Promise<CaseOutcome | null>;

  /** All realized outcomes for a firm. Missing fields are censored, never 0. */
  listCaseOutcomes(firmId: string): Promise<CaseOutcome[]>;

  /**
   * Create or update a call's realized outcome. Increments outcome_version
   * and appends the prior snapshot to `edits` (same audit discipline as
   * upsertOutcome). Open cases stay right-censored.
   */
  upsertCaseOutcome(
    callId: string,
    firmId: string,
    patch: CaseOutcomePatch
  ): Promise<CaseOutcome>;
}
