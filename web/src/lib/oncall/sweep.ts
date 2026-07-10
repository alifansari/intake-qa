import "server-only";
import { Pool } from "pg";
import {
  normalizeConfig,
  nextWaterfallAction,
  ackDeadline,
  resolveOnCall,
} from "./engine.mjs";
import { sendAlert } from "@/lib/escalation/alert-sender.mjs";
import { appendEscalationEvent } from "@/lib/escalation/store";

// ---------------------------------------------------------------------------
// The ack-timeout sweep (Phase 4). Run periodically (founder-triggered route
// or a cron later): finds unacked escalations past their deadline and either
//   * waterfalls to the next target on the tier's chain (re-alert through the
//     mock chokepoint, new deadline), or
//   * hits the BACKSTOP: marks the escalation 'unclaimed', which books a
//     callback commitment and raises the dashboard alarm (both as events —
//     nothing external is sent; the alert chokepoint is mock-only).
// Also stamps the initial routing (routed + ack_deadline_at) on freshly
// fired escalations, so the ladder starts ticking.
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
  }
  return _pool;
}

export function isSweepConfigured(): boolean {
  return Boolean(DATABASE_URL);
}

async function loadConfig(firmId: string | null): Promise<ReturnType<typeof normalizeConfig>> {
  if (firmId) {
    const r = await pool().query(`select config from firm_oncall where firm_id = $1`, [firmId]);
    if (r.rows[0]?.config) return normalizeConfig(r.rows[0].config);
  }
  return normalizeConfig(null); // solo default: everything → founder
}

export interface SweepResult {
  routed: number;
  waterfalled: number;
  unclaimed: number;
  realerted: number;
}

export async function sweepEscalations(now = new Date()): Promise<SweepResult> {
  const p = pool();
  const result: SweepResult = { routed: 0, waterfalled: 0, unclaimed: 0, realerted: 0 };

  // 1) Route fresh escalations: assign the primary target + first deadline.
  const fresh = await p.query(
    `select id, firm_id, tier, trigger_key from escalations where status = 'fired' limit 200`,
  );
  for (const e of fresh.rows) {
    const cfg = await loadConfig(e.firm_id);
    const target = resolveOnCall(cfg, "primary", now);
    const deadline = ackDeadline(cfg, e.tier, now);
    await p.query(
      `update escalations set status='routed', ack_deadline_at=$2::timestamptz where id=$1`,
      [e.id, deadline],
    );
    await appendEscalationEvent(e.id, "routed", { target, deadline });
    result.routed++;
  }

  // 2) Overdue, unacked → waterfall / backstop.
  const overdue = await p.query(
    `select id, firm_id, tier, trigger_key, waterfall_step from escalations
     where status = 'routed' and ack_deadline_at is not null and ack_deadline_at < $1
     limit 200`,
    [now.toISOString()],
  );
  for (const e of overdue.rows) {
    const cfg = await loadConfig(e.firm_id);
    const action = nextWaterfallAction(cfg, e.tier, e.waterfall_step, now);
    if (action.kind === "unclaimed") {
      await p.query(`update escalations set status='unclaimed' where id=$1`, [e.id]);
      await appendEscalationEvent(e.id, "unclaimed", {
        target: action.target,
        actions: action.actions, // book_callback + dashboard_alarm
      });
      result.unclaimed++;
    } else {
      const alert = await sendAlert({
        escalationId: e.id,
        tier: e.tier,
        trigger_key: e.trigger_key,
        target: action.target,
      });
      const deadline = new Date(now.getTime() + action.deadline_minutes * 60000).toISOString();
      await p.query(
        `update escalations set waterfall_step=$2, ack_deadline_at=$3::timestamptz where id=$1`,
        [e.id, action.step, deadline],
      );
      await appendEscalationEvent(e.id, "waterfall", {
        step: action.step,
        target: action.target,
        deadline,
        alert,
      });
      result.waterfalled++;
      result.realerted++;
    }
  }

  return result;
}
