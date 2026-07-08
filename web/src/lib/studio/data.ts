import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Studio data access. Every function takes the FOUNDER's RLS-bound Supabase
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
  dimension_inputs: Record<string, number>;
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
