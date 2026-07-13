import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapEngineToScorecard, draftNarrativeFromEngine } from "./mapper";
import { computeSpotCheck, computeLeakage } from "./rubric";

// ---------------------------------------------------------------------------
// Studio data access. Every function takes the FOUNDER’s RLS-bound Supabase
// client (from lib/studio/guard.ts) so created_by defaults to auth.uid() and
// Postgres RLS scopes every read/write to the owner. The service-role client is
// used ONLY for Storage (signed URLs / downloads), never for these row writes.
// ---------------------------------------------------------------------------

export interface StudioFirm {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  created_at: string;
}

export interface StudioRecording {
  id: string;
  firm_id: string;
  spot_check_id: string | null;
  storage_path: string;
  original_filename: string;
  source: string;
  consent_attested: boolean;
  consent_attested_at: string | null;
  consent_text_version: string | null;
  transcript: string | null;
  scoring: unknown;
  transcribed_at: string | null;
  created_at: string;
}

export async function listFirms(supabase: SupabaseClient): Promise<StudioFirm[]> {
  const { data, error } = await supabase
    .from("studio_firms")
    .select("id,name,address,phone,website,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as StudioFirm[];
}

export async function getFirm(
  supabase: SupabaseClient,
  id: string,
): Promise<StudioFirm | null> {
  const { data, error } = await supabase
    .from("studio_firms")
    .select("id,name,address,phone,website,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StudioFirm) ?? null;
}

export async function createFirm(
  supabase: SupabaseClient,
  input: { name: string; address?: string; phone?: string; website?: string },
): Promise<StudioFirm> {
  const { data, error } = await supabase
    .from("studio_firms")
    .insert({
      name: input.name,
      address: input.address || null,
      phone: input.phone || null,
      website: input.website || null,
    })
    .select("id,name,address,phone,website,created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as StudioFirm;
}

// Insert a recording row. The DB enforces consent_attested = true (CHECK + RLS);
// this also guards in code so a bad call never even reaches the DB.
export async function createRecording(
  supabase: SupabaseClient,
  input: {
    firm_id: string;
    storage_path: string;
    original_filename: string;
    consent_attested: boolean;
    consent_attested_by: string;
    consent_text_version: string;
  },
): Promise<StudioRecording> {
  if (input.consent_attested !== true) {
    throw new Error("consent attestation is required before a recording can be created");
  }
  const { data, error } = await supabase
    .from("studio_recordings")
    .insert({
      firm_id: input.firm_id,
      storage_path: input.storage_path,
      original_filename: input.original_filename,
      source: "firm_supplied",
      consent_attested: true,
      consent_attested_by: input.consent_attested_by,
      consent_attested_at: new Date().toISOString(),
      consent_text_version: input.consent_text_version,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as StudioRecording;
}

export async function getRecording(
  supabase: SupabaseClient,
  id: string,
): Promise<StudioRecording | null> {
  const { data, error } = await supabase
    .from("studio_recordings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StudioRecording) ?? null;
}

export async function listRecordingsForFirm(
  supabase: SupabaseClient,
  firmId: string,
): Promise<StudioRecording[]> {
  const { data, error } = await supabase
    .from("studio_recordings")
    .select("*")
    .eq("firm_id", firmId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as StudioRecording[];
}

// --- Spot checks (scorecards) ----------------------------------------------

export interface SpotCheck {
  id: string;
  firm_id: string;
  tested_at: string | null;
  scenario_key: string | null;
  touchpoints: unknown;
  // A dimension value is a level (0/50/100) or null ("Not assessed" — excluded
  // from the score, renormalized out; NOT counted as 0).
  dimension_inputs: Record<string, number | null>;
  critical_fails: string[];
  notes: string | null;
  computed_score: number | null;
  computed_grade: string | null;
  dimension_scores: unknown;
  leakage_inputs: unknown;
  leakage_single_case: number | null;
  leakage_illustrative_annual: number | null;
  narrative_failure: string | null;
  narrative_fix: string | null;
  narrative_reviewed: boolean;
  status: "draft" | "final";
  finalized_at: string | null;
  ref_code: string | null;
  created_at: string;
}

const SPOT_CHECK_COLS =
  "id,firm_id,tested_at,scenario_key,touchpoints,dimension_inputs,critical_fails,notes," +
  "computed_score,computed_grade,dimension_scores,leakage_inputs,leakage_single_case," +
  "leakage_illustrative_annual,narrative_failure,narrative_fix,narrative_reviewed," +
  "status,finalized_at,ref_code,created_at";

export async function createSpotCheck(
  supabase: SupabaseClient,
  input: { firm_id: string; recording_id?: string | null },
): Promise<SpotCheck> {
  const { data, error } = await supabase
    .from("studio_spot_checks")
    .insert({ firm_id: input.firm_id, tested_at: new Date().toISOString() })
    .select(SPOT_CHECK_COLS)
    .single();
  if (error) throw new Error(error.message);
  const sc = data as unknown as SpotCheck;
  // Link the source recording to this spot check (best-effort; RLS-scoped).
  if (input.recording_id) {
    await supabase
      .from("studio_recordings")
      .update({ spot_check_id: sc.id })
      .eq("id", input.recording_id);

    // If the recording is already processed (scoring present), BUILD THE
    // SCORECARD ITSELF now: derive dimensions/critical-fails/leakage/narrative
    // from the engine analysis so the founder lands on a pre-filled, editable
    // scorecard rather than empty inputs. (When processing hasn’t finished yet,
    // the /process route auto-populates once scoring lands.)
    const rec = await getRecording(supabase, input.recording_id);
    if (rec?.scoring) {
      const populated = await autoPopulateSpotCheckFromRecording(supabase, sc, rec);
      if (populated) return populated;
    }
  }
  return sc;
}

export async function getSpotCheck(
  supabase: SupabaseClient,
  id: string,
): Promise<SpotCheck | null> {
  const { data, error } = await supabase
    .from("studio_spot_checks")
    .select(SPOT_CHECK_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as SpotCheck) ?? null;
}

export async function updateSpotCheck(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<SpotCheck>,
): Promise<SpotCheck> {
  const { data, error } = await supabase
    .from("studio_spot_checks")
    .update(patch as never)
    .eq("id", id)
    .select(SPOT_CHECK_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as SpotCheck;
}

// The recording (transcript/scoring) attached to a spot check, if any.
export async function getRecordingForSpotCheck(
  supabase: SupabaseClient,
  spotCheckId: string,
): Promise<StudioRecording | null> {
  const { data, error } = await supabase
    .from("studio_recordings")
    .select("*")
    .eq("spot_check_id", spotCheckId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StudioRecording) ?? null;
}

export async function setRecordingTranscriptAndScoring(
  supabase: SupabaseClient,
  id: string,
  transcript: string,
  scoring: unknown,
): Promise<void> {
  const { error } = await supabase
    .from("studio_recordings")
    .update({
      transcript,
      scoring: scoring as never,
      transcribed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// AUTO-POPULATION — the scorecard builds itself from the engine analysis.
//
// Given a spot check and the processed recording linked to it, deterministically
// derive the six rubric dimensions, the critical fails, and the leakage inputs
// from the engine `scoring` (via mapper.mjs), recompute the headline score/grade/
// leakage via the pure rubric, auto-draft the two narrative fields from the
// engine’s flagged failure + evidence, and mark narrative_reviewed = true so the
// scorecard is finalizable/printable with NO manual entry required. The founder
// can still edit any field afterwards (which re-opens the review gate).
//
// Guard rails:
//   * Never overwrites a FINAL (locked) scorecard.
//   * By default only auto-populates a spot check that has not yet been touched
//     (no dimension_inputs, no computed score) so it never clobbers founder edits.
//     Pass force=true to re-derive (e.g. after re-processing).
// ---------------------------------------------------------------------------
export async function autoPopulateSpotCheckFromRecording(
  supabase: SupabaseClient,
  spotCheck: SpotCheck,
  recording: Pick<StudioRecording, "scoring" | "transcript">,
  opts: { force?: boolean } = {},
): Promise<SpotCheck | null> {
  if (spotCheck.status === "final") return spotCheck; // locked — never touch.
  if (!recording.scoring) return spotCheck; // nothing to derive from yet.

  const untouched =
    (spotCheck.computed_score == null || spotCheck.computed_score === undefined) &&
    Object.keys(spotCheck.dimension_inputs ?? {}).length === 0;
  if (!opts.force && !untouched) return spotCheck; // preserve founder edits.

  const transcript = typeof recording.transcript === "string" ? recording.transcript : "";
  const { dimensionInputs, criticalFails, leakageInputs } = mapEngineToScorecard(
    recording.scoring,
    transcript,
  );

  // Recompute the headline via the SAME pure rubric the manual path used.
  const spot = computeSpotCheck({ dimensionInputs, criticalFails });
  const leak = computeLeakage({
    averageSignedCaseFee: leakageInputs.average_signed_case_fee,
    illustrativeMonthlyRecurrence: leakageInputs.illustrative_monthly_recurrence,
  });

  // Auto-draft the narrative deterministically from the engine analysis. This is
  // an auto-generation, so narrative_reviewed = true (satisfies the DB CHECK and
  // removes the manual-gate friction). Editing it later re-opens the gate.
  const narrative = draftNarrativeFromEngine(recording.scoring);

  const patch: Partial<SpotCheck> = {
    dimension_inputs: dimensionInputs,
    critical_fails: criticalFails,
    computed_score: spot.score,
    computed_grade: spot.grade,
    dimension_scores: spot.dimensionScores,
    leakage_inputs: {
      average_signed_case_fee: leak.averageSignedCaseFee,
      illustrative_monthly_recurrence: leak.illustrativeMonthlyRecurrence,
    },
    leakage_single_case: leak.singleCase,
    leakage_illustrative_annual: leak.illustrativeAnnual,
    narrative_failure: narrative.narrative_failure,
    narrative_fix: narrative.narrative_fix,
    narrative_reviewed: true,
  };

  return updateSpotCheck(supabase, spotCheck.id, patch);
}

// Auto-populate any spot check LINKED to a recording (used after processing lands,
// when the scorecard may already exist). Best-effort; returns silently if none.
export async function autoPopulateSpotCheckForRecording(
  supabase: SupabaseClient,
  recording: StudioRecording,
): Promise<void> {
  if (!recording.spot_check_id) return;
  const sc = await getSpotCheck(supabase, recording.spot_check_id);
  if (!sc) return;
  await autoPopulateSpotCheckFromRecording(supabase, sc, recording);
}
