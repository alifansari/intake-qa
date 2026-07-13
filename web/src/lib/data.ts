import "server-only";
import { repo } from "./json-repository";
import { reconcile, type ReconciledCall } from "./reconcile";
import { defaultOutcome, type CallMeta } from "./schema";

// Assembles the joined ReconciledCall[] the whole app reads. Any call missing a
// meta sidecar or an outcome gets safe defaults so nothing ever crashes.
export async function getReconciledCalls(): Promise<ReconciledCall[]> {
  const [calls, metas, outcomes] = await Promise.all([
    repo.getScoredCalls(),
    repo.getCallMeta(),
    repo.getOutcomes(),
  ]);

  const metaById = new Map(metas.map((m) => [m.call_id, m]));
  const outcomeById = new Map(outcomes.map((o) => [o.call_id, o]));

  const rows = calls.map((call) => {
    const meta: CallMeta =
      metaById.get(call.call_id) ??
      // Real CLI files won’t have a sidecar — synthesize a neutral one.
      {
        call_id: call.call_id,
        received_at: new Date().toISOString(),
        rep: "Unassigned",
        source: "unknown",
      };
    const outcome = outcomeById.get(call.call_id) ?? defaultOutcome(call.call_id);
    return reconcile(call, meta, outcome);
  });

  // Newest calls first — stable ordering for every screen.
  rows.sort((a, b) => b.meta.received_at.localeCompare(a.meta.received_at));
  return rows;
}
