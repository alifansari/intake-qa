import "server-only";
import { Pool } from "pg";
import { composeLedger } from "./compose.mjs";

// ---------------------------------------------------------------------------
// Ledger data loader: pulls one month of leads / escalations / dispositions /
// proposals (demo scope: firm_id null) and hands them to the pure compose.
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;

export function isLedgerConfigured(): boolean {
  return Boolean(DATABASE_URL);
}

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
  }
  return _pool;
}

export async function loadLedger(
  period: string, // "YYYY-MM"
  firmId: string | null = null,
  settings: { average_case_fee?: number | null; minutes_per_intake?: number } = {},
) {
  const p = pool();
  const start = `${period}-01T00:00:00Z`;
  const end = new Date(new Date(start).getTime());
  end.setUTCMonth(end.getUTCMonth() + 1);

  const [leads, escalations, dispositions, proposals] = await Promise.all([
    p.query(
      `select id, bucket, status, contact, created_at from intake_leads
       where firm_id is not distinct from $1 and created_at >= $2::timestamptz and created_at < $3::timestamptz`,
      [firmId, start, end.toISOString()],
    ),
    p.query(
      `select id, lead_id, trigger_key, tier, status, fired_at, acked_at from escalations
       where firm_id is not distinct from $1 and fired_at >= $2::timestamptz and fired_at < $3::timestamptz`,
      [firmId, start, end.toISOString()],
    ),
    p.query(
      `select d.escalation_id, d.disposition, d.converted from escalation_dispositions d
       join escalations e on e.id = d.escalation_id
       where e.firm_id is not distinct from $1`,
      [firmId],
    ),
    p.query(
      `select status from tuning_proposals
       where firm_id is not distinct from $1 and created_at >= $2::timestamptz and created_at < $3::timestamptz`,
      [firmId, start, end.toISOString()],
    ),
  ]);

  return composeLedger({
    period,
    leads: leads.rows,
    escalations: escalations.rows,
    dispositions: dispositions.rows,
    proposals: proposals.rows,
    settings,
  });
}
