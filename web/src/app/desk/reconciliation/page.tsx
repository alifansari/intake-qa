// Calls & reconciliation — screen (c). Every call accounted for: received =
// processed + excluded + failed. The banner turns red if it doesn't balance.
import { fmtDate } from "@/pdf/doc-helpers.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Calls & reconciliation — Intake QA" };

const STATUS_LABEL: Record<string, string> = {
  excluded_duplicate: "Excluded — duplicate",
  excluded_not_intake: "Excluded — not intake",
  failed_audio_quality: "Failed — audio quality",
};

export default async function ReconciliationPage() {
  const store = await import("../../../../ingest/store.mjs");
  let db;
  try {
    db = await store.openPipelineDb();
  } catch {
    return <Shell><p className="text-sm text-ink-muted">Connect the workspace database to see reconciliation. Run npm run seed:demo locally.</p></Shell>;
  }
  try {
    const firms = await store.listFirms(db);
    const firm = firms.find((f: { name?: string }) => (f.name ?? "").includes("DEMO")) ?? firms[0];
    if (!firm) return <Shell><p className="text-sm text-ink-muted">No firm found yet.</p></Shell>;

    const r = await store.getCallReconciliation(db, firm.id);
    const nonAnalyzed = await store.listNonAnalyzedCalls(db, firm.id);
    const balances = Number(r.received) === Number(r.processed) + Number(r.excluded) + Number(r.failed);

    return (
      <Shell firmName={firm.name}>
        <div
          className={`rounded-card border p-4 text-sm font-medium ${
            balances ? "border-hairline bg-surface text-ink" : "border-red bg-red-tint text-red"
          }`}
        >
          Received {r.received} = Processed {r.processed} + Excluded {r.excluded} + Failed {r.failed}
          {balances ? " ✓" : " — does not balance"}
        </div>

        <div className="mt-6 overflow-x-auto rounded-card border border-hairline">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-hairline bg-canvas text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5 text-left">Call ID</th>
                <th className="px-4 py-2.5 text-left">Received</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-left">What to do</th>
              </tr>
            </thead>
            <tbody>
              {nonAnalyzed.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-4 text-ink-muted">Every call was processed — nothing excluded or failed.</td></tr>
              ) : (
                nonAnalyzed.map((c: { id: number | string; received_at: string; status: string | null; status_reason: string | null }) => (
                  <tr key={String(c.id)} className="border-b border-hairline last:border-0 align-top">
                    <td className="px-4 py-3 tabular-nums text-ink">#{String(c.id)}</td>
                    <td className="px-4 py-3 text-ink-muted">{fmtDate(c.received_at)}</td>
                    <td className="px-4 py-3 text-ink">{c.status ? (STATUS_LABEL[c.status] ?? c.status) : "Processing"}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {c.status?.startsWith("failed")
                        ? `${c.status_reason ?? "Audio issue"} — re-export this recording at a higher quality and re-upload, or mark it excluded.`
                        : c.status_reason ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Shell>
    );
  } catch {
    return <Shell><p className="text-sm text-ink-muted">The desk tables aren&apos;t set up on this database yet — apply migrations 0014–0015, then reconciliation populates automatically.</p></Shell>;
  } finally {
    await store.closePipelineDb(db);
  }
}

function Shell({ children, firmName }: { children: React.ReactNode; firmName?: string }) {
  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">The desk{firmName ? ` · ${firmName}` : ""}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Calls &amp; reconciliation</h1>
        <p className="mt-1 text-sm text-ink-muted">Every call you sent is accounted for — processed, excluded, or failed, with a reason.</p>
      </div>
      {children}
    </div>
  );
}
