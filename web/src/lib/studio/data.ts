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
