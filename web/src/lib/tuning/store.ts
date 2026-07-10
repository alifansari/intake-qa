import "server-only";
import { Pool } from "pg";
import {
  computeTriggerStats,
  proposeTunings,
  applyProposalToOverrides,
} from "./engine.mjs";

// ---------------------------------------------------------------------------
// Tuning persistence (migration 0028). The monthly loop: read dispositions →
// compute stats → insert PROPOSALS. Applying a proposal is a separate, named
// approval that merges into firm_escalation_config.overrides. Server-only.
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;

export function isTuningStoreConfigured(): boolean {
  return Boolean(DATABASE_URL);
}

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
  }
  return _pool;
}

export async function recordDisposition(input: {
  escalation_id: string;
  disposition: "true_positive" | "false_positive" | "right_call_bad_outcome";
  fp_reason?: string;
  converted?: boolean | null;
  noted_by: string;
  note?: string;
}): Promise<void> {
  if (!input.noted_by?.trim()) throw new Error("disposition requires a named person");
  if (input.disposition === "false_positive" && !input.fp_reason?.trim()) {
    throw new Error("false_positive requires a reason");
  }
  await pool().query(
    `insert into escalation_dispositions
       (escalation_id, disposition, fp_reason, converted, noted_by, note)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (escalation_id) do update
       set disposition = excluded.disposition,
           fp_reason   = excluded.fp_reason,
           converted   = excluded.converted,
           noted_by    = excluded.noted_by,
           note        = excluded.note`,
    [
      input.escalation_id,
      input.disposition,
      input.fp_reason ?? null,
      input.converted ?? null,
      input.noted_by.trim(),
      input.note ?? null,
    ],
  );
  // Disposition lands on the event trail too — drillable forever.
  await pool().query(
    `insert into escalation_events (escalation_id, kind, actor, payload)
     values ($1,'disposition',$2,$3::jsonb)`,
    [
      input.escalation_id,
      input.noted_by.trim(),
      JSON.stringify({ disposition: input.disposition, fp_reason: input.fp_reason ?? null, converted: input.converted ?? null }),
    ],
  );
}

// The monthly run: compute per-trigger stats from dispositions and insert
// fresh proposals (skipping trigger keys that already have an open one).
export async function runTuningLoop(firmId: string | null = null): Promise<{ proposals: number }> {
  const p = pool();
  const rows = await p.query(
    `select e.trigger_key, d.disposition, d.converted
     from escalation_dispositions d
     join escalations e on e.id = d.escalation_id
     where e.firm_id is not distinct from $1`,
    [firmId],
  );
  const stats = computeTriggerStats(rows.rows);

  const overridesRow = firmId
    ? await p.query(`select overrides from firm_escalation_config where firm_id = $1`, [firmId])
    : { rows: [] as Array<{ overrides: unknown }> };
  const overrides = (overridesRow.rows[0]?.overrides as Record<string, unknown>) ?? {};

  const proposals = proposeTunings(stats, overrides);
  let inserted = 0;
  for (const prop of proposals) {
    const open = await p.query(
      `select id from tuning_proposals
       where firm_id is not distinct from $1 and trigger_key = $2 and status = 'proposed' limit 1`,
      [firmId, prop.trigger_key],
    );
    if (open.rows.length > 0) continue;
    await p.query(
      `insert into tuning_proposals
         (firm_id, trigger_key, current_tier, proposed_action, proposed_tier,
          rationale, sample_size, requires_friction)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`,
      [
        firmId,
        prop.trigger_key,
        prop.current_tier,
        prop.proposed_action,
        prop.proposed_tier,
        JSON.stringify(prop.rationale),
        prop.sample_size,
        prop.requires_friction,
      ],
    );
    inserted++;
  }
  return { proposals: inserted };
}

// Named attorney approval → merge into firm_escalation_config.overrides.
export async function approveProposal(proposalId: string, decidedBy: string): Promise<void> {
  if (!decidedBy?.trim()) throw new Error("approval requires a named person");
  const p = pool();
  const r = await p.query(`select * from tuning_proposals where id = $1`, [proposalId]);
  const prop = r.rows[0];
  if (!prop) throw new Error("proposal not found");
  if (prop.status !== "proposed") throw new Error(`proposal is ${prop.status}`);
  if (prop.requires_friction && !prop.friction_phrase) {
    throw new Error("protected loosening without a recorded friction phrase");
  }

  if (prop.firm_id) {
    const cfg = await p.query(
      `insert into firm_escalation_config (firm_id, overrides)
       values ($1, '{}'::jsonb)
       on conflict (firm_id) do update set updated_at = now()
       returning overrides`,
      [prop.firm_id],
    );
    const merged = applyProposalToOverrides(cfg.rows[0].overrides ?? {}, prop);
    await p.query(
      `update firm_escalation_config set overrides = $2::jsonb, updated_at = now() where firm_id = $1`,
      [prop.firm_id, JSON.stringify(merged)],
    );
  }

  await p.query(
    `update tuning_proposals set status='approved', decided_by=$2, decided_at=now() where id=$1`,
    [proposalId, decidedBy.trim()],
  );
}

export async function rejectProposal(proposalId: string, decidedBy: string): Promise<void> {
  if (!decidedBy?.trim()) throw new Error("rejection requires a named person");
  await pool().query(
    `update tuning_proposals set status='rejected', decided_by=$2, decided_at=now()
     where id=$1 and status='proposed'`,
    [proposalId, decidedBy.trim()],
  );
}

export async function listProposals(firmId: string | null = null) {
  const r = await pool().query(
    `select * from tuning_proposals where firm_id is not distinct from $1 order by created_at desc limit 100`,
    [firmId],
  );
  return r.rows;
}
