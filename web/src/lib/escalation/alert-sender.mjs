// ============================================================================
// AlertSender — the ONE chokepoint for escalation alert delivery, modeled on
// the SMS chokepoint (web/messaging/send.mjs). No code path may deliver an
// alert around this function.
//
// THERE IS NO REAL SENDER IN THIS CODEBASE. The injectable `sender` defaults
// to the mock, which records the alert and transmits NOTHING. Connecting a
// real SMS/call/push provider is deferred (ROADMAP.md) and gated on explicit
// per-integration sign-off (compliance-invariants §III/§VII).
//
// Gates, strictly in order (each returns a structured refusal, never throws):
//   1. KILL_SWITCH        — global halt stops alerts too
//   2. TEST_MODE          — simulate/log only (DEFAULT TRUE, like SMS)
//   3. sender presence    — no real sender configured → simulate
// The result is written to escalation_events by the caller either way, so
// the event log always shows what WOULD have been sent — that honesty is
// what the Ledger and the tuning loop are built on.
// ============================================================================

function envFlag(env, key, fallback) {
  const v = env?.[key];
  if (v === undefined || v === null || v === "") return fallback;
  return String(v).toLowerCase() !== "false" && String(v) !== "0";
}

// The mock: records the alert, transmits nothing.
export function createMockSender() {
  const sent = [];
  return {
    kind: "mock",
    sent,
    async deliver(alert) {
      sent.push(alert);
      return { delivered: false, simulated: true };
    },
  };
}

/**
 * @param {{ escalationId:string, tier:string, trigger_key:string, target:{name?:string, channel?:string} }} alert
 * @param {{ sender?: {kind:string, deliver:Function}, env?: object }} deps
 * @returns {Promise<{sent:boolean, simulated:boolean, skipped:boolean, reason:string}>}
 */
export async function sendAlert(alert, deps = {}) {
  const env = deps.env ?? process.env;
  const sender = deps.sender ?? createMockSender();

  // Gate 1 — global kill switch (defaults ON, same stance as SMS).
  if (envFlag(env, "KILL_SWITCH", true)) {
    return { sent: false, simulated: false, skipped: true, reason: "kill_switch" };
  }

  // Gate 2 — test mode simulates only (defaults ON). A REAL sender is never
  // even invoked here: only the mock records the simulation, so no provider
  // bug can turn "simulated" into "transmitted".
  if (envFlag(env, "TEST_MODE", true)) {
    if (sender.kind === "mock") await sender.deliver({ ...alert, simulated: true });
    return { sent: false, simulated: true, skipped: false, reason: "test_mode" };
  }

  // Gate 3 — only a real sender may transmit; the mock never does.
  if (sender.kind === "mock") {
    await sender.deliver({ ...alert, simulated: true });
    return { sent: false, simulated: true, skipped: false, reason: "no_real_sender" };
  }

  const result = await sender.deliver(alert);
  return {
    sent: Boolean(result?.delivered),
    simulated: Boolean(result?.simulated),
    skipped: false,
    reason: "delivered",
  };
}
