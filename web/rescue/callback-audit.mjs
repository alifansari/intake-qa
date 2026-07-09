// Callback-actor audit log (module 8 / invariant a).
//
// The service NEVER contacts prospects. Every callback is made by a named FIRM
// EMPLOYEE, and this log is the auditable proof: who called, when, what
// happened. The schema makes a non-employee actor unrepresentable
// (callback_audit_entries.actor_type CHECK has exactly one value), and this
// module has no send/dial capability of any kind.

import { insertCallbackAudit, listCallbackAudits, getLedgerEntryByFlag } from "../beta/store.mjs";
import { advanceStage } from "./ledger.mjs";

// Record that a firm employee made a callback. employee_name is REQUIRED —
// an anonymous callback is not auditable. When the callback reached the
// prospect and the flag has a ledger entry still at 'flagged', the ledger
// advances to 'contacted' in the same motion.
export async function recordCallback({
  db,
  firmId,
  flagId = null,
  employeeName,
  occurredAt = new Date(),
  outcome = null, // reached | voicemail | booked_consult | declined | bad_number
  note = null,
}) {
  if (!employeeName || String(employeeName).trim().length === 0) {
    throw new Error("recordCallback requires the firm employee's name (invariant: firm staff make every callback)");
  }
  const entryId = await insertCallbackAudit(db, {
    firm_id: firmId,
    flag_id: flagId,
    employee_name: String(employeeName).trim(),
    occurred_at: new Date(occurredAt).toISOString(),
    outcome,
    note,
  });

  let ledgerAdvanced = false;
  if (flagId != null && outcome && outcome !== "bad_number") {
    const ledger = await getLedgerEntryByFlag(db, flagId);
    if (ledger && ledger.stage === "flagged") {
      await advanceStage({ db, entryId: ledger.id, to: "contacted", by: employeeName, now: occurredAt });
      ledgerAdvanced = true;
    }
  }
  return { entryId, ledgerAdvanced };
}

export async function callbackHistory({ db, firmId }) {
  return listCallbackAudits(db, firmId);
}
