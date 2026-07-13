import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// "The Mirror" shop data access. Same contract as lib/studio/data.ts: every
// function takes the FOUNDER’s RLS-bound Supabase client (from guard.ts) so
// created_by defaults to auth.uid() and Postgres RLS scopes every read/write to
// the owner. The peer-benchmark table is read-only reference data (select-only
// policy; writes happen out-of-band via service role / SQL).
// ---------------------------------------------------------------------------

export interface StudioShop {
  id: string;
  firm_id: string;
  shopped_from: string | null;
  shopped_to: string | null;
  market: string | null;
  scenario_key: string | null;
  protocol_attested: boolean;
  protocol_attested_at: string | null;
  protocol_text_version: string | null;
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

export interface StudioShopChannel {
  id: string;
  shop_id: string;
  channel: string;
  grade: string | null;
  ring_count: number | null;
  response_latency_seconds: number | null;
  answered_by: string | null;
  attempted_at: string | null;
  notes: string | null;
  spot_check_id: string | null;
  created_at: string;
}

export interface PeerBenchmarkRow {
  id: string;
  market: string;
  channel: string;
  firm_label: string;
  grade: string | null;
  ring_count: number | null;
  response_latency_seconds: number | null;
  answered_by: string | null;
  source: string;
  is_seed: boolean;
}

const SHOP_COLS =
  "id,firm_id,shopped_from,shopped_to,market,scenario_key,protocol_attested," +
  "protocol_attested_at,protocol_text_version,leakage_inputs,leakage_single_case," +
  "leakage_illustrative_annual,narrative_failure,narrative_fix,narrative_reviewed," +
  "status,finalized_at,ref_code,created_at";

const CHANNEL_COLS =
  "id,shop_id,channel,grade,ring_count,response_latency_seconds,answered_by," +
  "attempted_at,notes,spot_check_id,created_at";

export async function listShops(
  supabase: SupabaseClient,
  firmId?: string,
): Promise<StudioShop[]> {
  let q = supabase.from("studio_shops").select(SHOP_COLS).order("created_at", {
    ascending: false,
  });
  if (firmId) q = q.eq("firm_id", firmId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as StudioShop[];
}

export async function getShop(
  supabase: SupabaseClient,
  id: string,
): Promise<StudioShop | null> {
  const { data, error } = await supabase
    .from("studio_shops")
    .select(SHOP_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as StudioShop) ?? null;
}

export async function createShop(
  supabase: SupabaseClient,
  input: { firm_id: string; market?: string | null },
): Promise<StudioShop> {
  const { data, error } = await supabase
    .from("studio_shops")
    .insert({ firm_id: input.firm_id, market: input.market ?? null })
    .select(SHOP_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as StudioShop;
}

export async function updateShop(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<StudioShop>,
): Promise<StudioShop> {
  const { data, error } = await supabase
    .from("studio_shops")
    .update(patch as never)
    .eq("id", id)
    .select(SHOP_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as StudioShop;
}

export async function listShopChannels(
  supabase: SupabaseClient,
  shopId: string,
): Promise<StudioShopChannel[]> {
  const { data, error } = await supabase
    .from("studio_shop_channels")
    .select(CHANNEL_COLS)
    .eq("shop_id", shopId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as StudioShopChannel[];
}

// Idempotent per-channel upsert (unique (shop_id, channel) backs it). The
// editor sends the full set of shopped channels; a channel the founder clears
// is deleted so "not shopped" stays distinct from "shopped and lost".
export async function upsertShopChannels(
  supabase: SupabaseClient,
  shopId: string,
  rows: Array<{
    channel: string;
    grade?: string | null;
    ring_count?: number | null;
    response_latency_seconds?: number | null;
    answered_by?: string | null;
    attempted_at?: string | null;
    notes?: string | null;
    spot_check_id?: string | null;
  }>,
): Promise<void> {
  if (rows.length > 0) {
    const { error } = await supabase.from("studio_shop_channels").upsert(
      rows.map((r) => ({
        shop_id: shopId,
        channel: r.channel,
        grade: r.grade ?? null,
        ring_count: r.ring_count ?? null,
        response_latency_seconds: r.response_latency_seconds ?? null,
        answered_by: r.answered_by ?? null,
        attempted_at: r.attempted_at ?? null,
        notes: r.notes ?? null,
        spot_check_id: r.spot_check_id ?? null,
      })),
      { onConflict: "shop_id,channel" },
    );
    if (error) throw new Error(error.message);
  }
  // Remove rows for channels no longer in the set (RLS-scoped to the owner).
  const keep = rows.map((r) => r.channel);
  let del = supabase.from("studio_shop_channels").delete().eq("shop_id", shopId);
  if (keep.length > 0)
    del = del.not("channel", "in", `(${keep.map((k) => `"${k}"`).join(",")})`);
  const { error: delError } = await del;
  if (delError) throw new Error(delError.message);
}

export async function listPeerBenchmarks(
  supabase: SupabaseClient,
  market: string,
): Promise<PeerBenchmarkRow[]> {
  const { data, error } = await supabase
    .from("studio_peer_benchmarks")
    .select(
      "id,market,channel,firm_label,grade,ring_count,response_latency_seconds,answered_by,source,is_seed",
    )
    .eq("market", market);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PeerBenchmarkRow[];
}

export async function listBenchmarkMarkets(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.from("studio_peer_benchmarks").select("market");
  if (error) throw new Error(error.message);
  const seen = new Set<string>();
  for (const row of (data ?? []) as Array<{ market: string }>) {
    if (row.market) seen.add(row.market);
  }
  return [...seen].sort();
}
