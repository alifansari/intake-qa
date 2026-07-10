import "server-only";
import { Pool } from "pg";

// ---------------------------------------------------------------------------
// Escalation persistence (migration 0026). Server-only, DATABASE_URL-backed
// like the intake store. Every state transition writes BOTH the hoisted
// column and an append-only escalation_events row — the event log is the
// source of truth the Ledger drills into.
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;

export function isEscalationStoreConfigured(): boolean {
  return Boolean(DATABASE_URL);
}

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return _pool;
}

export interface DerivedEscalation {
  trigger_key: string;
  family: string;
  tier: string;
  description: string;
}

export interface EscalationRow {
  id: string;
  firm_id: string | null;
  lead_id: string | null;
  trigger_key: string;
  trigger_family: string;
  tier: string;
  status: string;
  reasons: unknown;
  fired_at: string;
  ack_deadline_at: string | null;
  acked_at: string | null;
  acked_by: string | null;
  resolved_at: string | null;
}

export async function appendEscalationEvent(
  escalationId: string,
  kind: string,
  payload: Record<string, unknown> = {},
  actor = "system",
): Promise<void> {
  await pool().query(
    `insert into escalation_events (escalation_id, kind, actor, payload)
     values ($1,$2,$3,$4::jsonb)`,
    [escalationId, kind, actor, JSON.stringify(payload)],
  );
}

// Fire a batch of derived escalations for a lead. Idempotent per
// (lead, trigger): re-processing the same lead never double-fires a trigger.
export async function fireEscalations(
  leadId: string,
  firmId: string | null,
  derived: DerivedEscalation[],
): Promise<EscalationRow[]> {
  const p = pool();
  const rows: EscalationRow[] = [];
  for (const d of derived) {
    const existing = await p.query(
      `select id from escalations where lead_id = $1 and trigger_key = $2 limit 1`,
      [leadId, d.trigger_key],
    );
    if (existing.rows.length > 0) continue;
    const r = await p.query(
      `insert into escalations (firm_id, lead_id, trigger_key, trigger_family, tier, reasons)
       values ($1,$2,$3,$4,$5,$6::jsonb)
       returning *`,
      [firmId, leadId, d.trigger_key, d.family, d.tier, JSON.stringify([d.description])],
    );
    const row = r.rows[0] as EscalationRow;
    await appendEscalationEvent(row.id, "fired", {
      trigger: d.trigger_key,
      family: d.family,
      tier: d.tier,
    });
    rows.push(row);
  }
  return rows;
}

export async function listEscalations(
  opts: { firmId?: string | null; status?: string; limit?: number } = {},
): Promise<EscalationRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (opts.firmId !== undefined) {
    params.push(opts.firmId);
    clauses.push(opts.firmId === null ? "firm_id is null" : `firm_id = $${params.length}`);
    if (opts.firmId === null) params.pop();
  }
  if (opts.status) {
    params.push(opts.status);
    clauses.push(`status = $${params.length}`);
  }
  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
  params.push(opts.limit ?? 100);
  const r = await pool().query(
    `select * from escalations ${where} order by fired_at desc limit $${params.length}`,
    params,
  );
  return r.rows as EscalationRow[];
}

export async function listEscalationEvents(escalationId: string) {
  const r = await pool().query(
    `select kind, actor, payload, created_at from escalation_events
     where escalation_id = $1 order by created_at asc`,
    [escalationId],
  );
  return r.rows;
}

// Transitions. Ack is a DELIBERATE, NAMED action — `by` is a person, and it
// is required (spec: "Ack = deliberate action only", "Claim = named ownership").
export async function ackEscalation(id: string, by: string): Promise<void> {
  if (!by?.trim()) throw new Error("ack requires a named person");
  await pool().query(
    `update escalations set status='acked', acked_at=now(), acked_by=$2 where id=$1`,
    [id, by.trim()],
  );
  await appendEscalationEvent(id, "acked", {}, by.trim());
}

export async function resolveEscalation(id: string, by: string, note?: string): Promise<void> {
  await pool().query(
    `update escalations set status='resolved', resolved_at=now() where id=$1`,
    [id],
  );
  await appendEscalationEvent(id, "resolved", note ? { note } : {}, by || "system");
}

export async function setEscalationStatus(id: string, status: string): Promise<void> {
  await pool().query(`update escalations set status=$2 where id=$1`, [id, status]);
}

export async function setAckDeadline(id: string, deadlineISO: string): Promise<void> {
  await pool().query(`update escalations set ack_deadline_at=$2::timestamptz where id=$1`, [
    id,
    deadlineISO,
  ]);
}
