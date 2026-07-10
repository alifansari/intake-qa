import "server-only";
import { Pool } from "pg";
import { mapRecord } from "./mappers.mjs";

// ---------------------------------------------------------------------------
// CRM handoff worker (Phase 7). Consumes crm_handoff_queue with an injected
// connector (the mock is the only implementation in this codebase).
//
// Flow per item:
//   queued → duplicate check → duplicate_flagged (human compares; NEVER merged)
//          → review_then_write? → 'review' (waits for named approval)
//          → write_then_flag / approved → createLead (create-only port)
//              ok        → 'written' (+external_id; payload carries the
//                          AI-captured review flag so the CRM side renders it
//                          distinctly until verified)
//              retryable → attempts++, exponential next_attempt_at, → 'failed'
//                          after MAX_ATTEMPTS → 'abandoned' (durable, visible)
// Idempotency: unique (lead, provider) key at enqueue; a written item is
// terminal — re-running the worker never double-creates.
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;
export const MAX_ATTEMPTS = 5;

export function isCrmQueueConfigured(): boolean {
  return Boolean(DATABASE_URL);
}

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
  }
  return _pool;
}

export interface CrmConnector {
  kind: string;
  createLead(payload: unknown): Promise<{ ok: boolean; external_id?: string; error?: string; retryable?: boolean }>;
  findPossibleDuplicates(payload: unknown): Promise<Array<{ external_id: string; reason: string }>>;
  readConversions(sinceISO?: string): Promise<Array<{ external_id: string; converted_at: string }>>;
}

// Enqueue a lead for handoff: map the canonical record now (the queue holds
// the least-data-necessary payload, not the raw record) and insert
// idempotently.
export async function enqueueHandoff(input: {
  leadId: string;
  firmId?: string | null;
  provider: string;
  record: Record<string, unknown>;
  fieldMap?: Record<string, string>;
  reviewPosture?: "review_then_write" | "write_then_flag";
}): Promise<{ enqueued: boolean; id?: string }> {
  const payload = mapRecord(input.record, input.provider, input.fieldMap ?? {});
  const key = `${input.leadId}:${input.provider}`;
  const r = await pool().query(
    `insert into crm_handoff_queue
       (firm_id, lead_id, provider, idempotency_key, payload, review_posture)
     values ($1,$2,$3,$4,$5::jsonb,$6)
     on conflict (idempotency_key) do nothing
     returning id`,
    [
      input.firmId ?? null,
      input.leadId,
      input.provider,
      key,
      JSON.stringify(payload),
      input.reviewPosture ?? "review_then_write",
    ],
  );
  return r.rows.length ? { enqueued: true, id: r.rows[0].id } : { enqueued: false };
}

// Named approval for an item sitting in 'review' (review-then-write default).
export async function approveHandoff(id: string, approvedBy: string): Promise<void> {
  if (!approvedBy?.trim()) throw new Error("handoff approval requires a named person");
  await pool().query(
    `update crm_handoff_queue set status='approved', approved_by=$2, updated_at=now()
     where id=$1 and status='review'`,
    [id, approvedBy.trim()],
  );
}

export interface WorkResult {
  flagged_duplicates: number;
  held_for_review: number;
  written: number;
  retried: number;
  abandoned: number;
}

export async function processQueue(connector: CrmConnector, now = new Date()): Promise<WorkResult> {
  const p = pool();
  const result: WorkResult = { flagged_duplicates: 0, held_for_review: 0, written: 0, retried: 0, abandoned: 0 };

  const due = await p.query(
    `select * from crm_handoff_queue
     where status in ('queued','approved','failed')
       and (next_attempt_at is null or next_attempt_at <= $1)
     order by created_at asc
     limit 50`,
    [now.toISOString()],
  );

  for (const item of due.rows) {
    // 1) Duplicate check (create-only contract: flag, never merge).
    if (item.status === "queued") {
      const dups = await connector.findPossibleDuplicates(item.payload);
      if (dups.length > 0) {
        await p.query(
          `update crm_handoff_queue set status='duplicate_flagged', duplicate_of=$2, updated_at=now() where id=$1`,
          [item.id, dups[0].external_id],
        );
        result.flagged_duplicates++;
        continue;
      }
      // 2) Review posture: default holds for a named human approval.
      if (item.review_posture === "review_then_write") {
        await p.query(
          `update crm_handoff_queue set status='review', updated_at=now() where id=$1`,
          [item.id],
        );
        result.held_for_review++;
        continue;
      }
    }

    // 3) Write (create-only). Reached by: write_then_flag from queued,
    //    approved items, and failed items due for retry.
    const res = await connector.createLead(item.payload);
    if (res.ok) {
      await p.query(
        `update crm_handoff_queue set status='written', external_id=$2, last_error=null, updated_at=now() where id=$1`,
        [item.id, res.external_id],
      );
      result.written++;
    } else {
      const attempts = item.attempts + 1;
      if (!res.retryable || attempts >= MAX_ATTEMPTS) {
        await p.query(
          `update crm_handoff_queue set status='abandoned', attempts=$2, last_error=$3, updated_at=now() where id=$1`,
          [item.id, attempts, res.error ?? "unknown"],
        );
        result.abandoned++;
      } else {
        // Exponential backoff: 2^attempts minutes.
        const next = new Date(now.getTime() + 2 ** attempts * 60000).toISOString();
        await p.query(
          `update crm_handoff_queue
           set status='failed', attempts=$2, last_error=$3, next_attempt_at=$4::timestamptz, updated_at=now()
           where id=$1`,
          [item.id, attempts, res.error ?? "unknown", next],
        );
        result.retried++;
      }
    }
  }

  return result;
}

// Reconciliation: queue says written → confirm the record still exists on the
// CRM side via read-back; surfaces drift instead of assuming it away.
export async function listWritten(limit = 100) {
  const r = await pool().query(
    `select id, lead_id, provider, external_id from crm_handoff_queue where status='written' limit $1`,
    [limit],
  );
  return r.rows;
}
