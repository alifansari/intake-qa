// /api/desk/triage — the live triage surface.
//   POST  run the deterministic engine on a short intake form + persist the case
//   PATCH update a case's disposition status (the callback/queue workflow)
//   PUT   save the firm's triage appetite profile
//   GET   list the firm's open triage queue
//
// Signed-in + firm-scoped (requireDeskFirm), exactly like /api/desk/flag-status.
// No LLM: a triage is instant and free. Recommendation only; the engine carries
// the SOL disclaimer and the recommendation-only compliance block.
import { z } from "zod";
import { requireDeskFirm } from "@/lib/desk/firm";
import { TRIAGE_STATUSES } from "@/lib/desk/triage-view.mjs";

export const runtime = "nodejs";

const RedFlags = z
  .object({
    already_represented: z.boolean().optional(),
    multiple_prior_attorneys: z.boolean().optional(),
    fee_haggling: z.boolean().optional(),
    unrealistic_expectations: z.boolean().optional(),
    inconsistent_story: z.boolean().optional(),
    noncooperative: z.boolean().optional(),
  })
  .partial()
  .optional();

const TriageInput = z.object({
  caller_name: z.string().max(200).optional().nullable(),
  caller_phone: z.string().max(50).optional().nullable(),
  case_type: z.string().max(40),
  incident_date: z.string().max(20).optional().nullable(),
  government_defendant: z.boolean().optional(),
  minor: z.boolean().optional(),
  liability: z.enum(["clear", "disputed", "unclear", "client_mostly_at_fault"]).optional(),
  injury: z.enum(["none", "soft_tissue", "moderate", "hard", "catastrophic", "death"]).optional(),
  objective_findings: z.boolean().optional(),
  treatment_gap: z.boolean().optional(),
  minimal_impact: z.boolean().optional(),
  coverage: z.enum(["none_uninsured", "minimal", "moderate", "high", "commercial_deep", "unknown"]).optional(),
  client_has_um: z.boolean().optional(),
  client_insured_status: z.string().max(60).optional(),
  liens: z.string().max(40).optional(),
  red_flags: RedFlags,
  work_injury_third_party: z.boolean().optional().nullable(),
  dram_shop_licensed_vendor: z.boolean().optional(),
  dram_shop_obviously_intoxicated_minor: z.boolean().optional(),
  dram_shop_served_a_minor: z.boolean().optional(),
  elder_abuse_reckless_neglect: z.boolean().optional().nullable(),
  property_damage_only: z.boolean().optional(),
});

const StatusPatch = z.object({
  id: z.union([z.string().min(1).max(64), z.number().int()]),
  status: z.enum(TRIAGE_STATUSES as [string, ...string[]]),
  // Outcome capture for the calibration loop: when a case signs, did it sign
  // with THIS firm or elsewhere? A decline/refer may carry a short reason.
  signed_where: z.enum(["us", "elsewhere"]).optional().nullable(),
  decline_reason: z.string().max(300).optional().nullable(),
});

const Profile = z.object({
  posture: z.enum(["selective", "volume"]).optional(),
  accepted_case_types: z.array(z.string().max(40)).optional().nullable(),
  min_policy_limits: z.string().max(20).optional().nullable(),
  take_mist: z.boolean().optional().nullable(),
  cost_fronting: z.enum(["minimal", "moderate", "deep"]).optional(),
  trial_capital: z.boolean().optional(),
  red_flag_strictness: z.enum(["forgiving", "balanced", "strict"]).optional(),
});

async function openScoped() {
  const store = await import("../../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured || !store.pipelineDbConfigured()) {
    return { store, db: null as unknown };
  }
  const db = await store.openPipelineDb();
  return { store, db };
}

function profileFromRow(row: Record<string, unknown> | null) {
  if (!row) return {};
  const accepted =
    typeof row.accepted_case_types === "string"
      ? safeParseArray(row.accepted_case_types)
      : (row.accepted_case_types as string[] | null) ?? null;
  return {
    posture: row.posture ?? "selective",
    accepted_case_types: accepted,
    take_mist: row.take_mist == null ? null : Boolean(row.take_mist),
    cost_fronting: row.cost_fronting ?? "moderate",
    trial_capital: Boolean(row.trial_capital),
    min_policy_limits: row.min_policy_limits ?? null,
    red_flag_strictness: row.red_flag_strictness ?? "balanced",
  };
}
function safeParseArray(s: string): string[] | null {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let input: z.infer<typeof TriageInput>;
  try {
    input = TriageInput.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { store, db } = await openScoped();
  if (!db) return Response.json({ error: "no database" }, { status: 503 });
  try {
    const gate = await requireDeskFirm(db, store.listFirms);
    if (gate.response) return gate.response;
    const { firm, user } = gate;

    const profileRow = await store.getFirmTriageProfile(db, firm.id);
    const profile = profileFromRow(profileRow);

    const { runTriage } = await import("@/lib/desk/triage-engine.mjs");
    const verdict = await runTriage(input, profile);

    const id = await store.insertTriageCase(db, {
      firm_id: firm.id,
      created_by: user?.email ?? "pilot",
      caller_name: input.caller_name ?? null,
      caller_phone: input.caller_phone ?? null,
      case_type: verdict.case_type,
      incident_date: input.incident_date ?? null,
      grade_letter: verdict.grade.letter,
      grade_color: verdict.grade.color,
      headline: verdict.grade.headline,
      disposition: verdict.disposition,
      value_tier: verdict.value_tier,
      driving_reason: verdict.driving_reason,
      flip_fact: verdict.flip_fact,
      sol_deadline: verdict.sol.deadline_date,
      sol_days_remaining: verdict.sol.days_remaining,
      sol_urgency: verdict.sol.urgency,
      attorney_review: verdict.attorney_review_required,
      input_json: JSON.stringify(input),
      verdict_json: JSON.stringify(verdict),
      status: "new",
    });

    return Response.json({ ok: true, id, verdict });
  } finally {
    await store.closePipelineDb(db);
  }
}

export async function PATCH(req: Request) {
  let body: z.infer<typeof StatusPatch>;
  try {
    body = StatusPatch.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const { store, db } = await openScoped();
  if (!db) return Response.json({ error: "no database" }, { status: 503 });
  try {
    const gate = await requireDeskFirm(db, store.listFirms);
    if (gate.response) return gate.response;
    const { firm, user } = gate;
    const ok = await store.setTriageStatus(db, firm.id, body.id, body.status, user?.email ?? "pilot", {
      signedWhere: body.signed_where ?? null,
      declineReason: body.decline_reason ?? null,
    });
    if (!ok) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ ok: true, status: body.status });
  } finally {
    await store.closePipelineDb(db);
  }
}

export async function PUT(req: Request) {
  let body: z.infer<typeof Profile>;
  try {
    body = Profile.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const { store, db } = await openScoped();
  if (!db) return Response.json({ error: "no database" }, { status: 503 });
  try {
    const gate = await requireDeskFirm(db, store.listFirms);
    if (gate.response) return gate.response;
    const { firm } = gate;
    await store.upsertFirmTriageProfile(db, firm.id, { ...body, profile_json: JSON.stringify(body) });
    return Response.json({ ok: true });
  } finally {
    await store.closePipelineDb(db);
  }
}

export async function GET() {
  const { store, db } = await openScoped();
  if (!db) return Response.json({ cases: [], profile: {} });
  try {
    const gate = await requireDeskFirm(db, store.listFirms);
    if (gate.response) return gate.response;
    const { firm } = gate;
    const cases = await store.listTriageCases(db, firm.id, { limit: 100 });
    const profile = profileFromRow(await store.getFirmTriageProfile(db, firm.id));
    return Response.json({ cases, profile });
  } finally {
    await store.closePipelineDb(db);
  }
}
