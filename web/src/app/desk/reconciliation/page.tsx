// Calls & reconciliation — screen (c). Every call accounted for: received =
// processed + excluded + failed. The banner turns red if it doesn't balance.
import { fmtDate } from "@/pdf/doc-helpers.mjs";
import { resolveDeskFirm } from "@/lib/desk/firm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Calls — Intake QA" };

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
    return <Shell><SettingUp detail="workspace database not connected" /></Shell>;
  }
  try {
    const firm = await resolveDeskFirm(db, store.listFirms);
    if (!firm) return <Shell><p className="text-sm text-ink-muted">No firm found yet.</p></Shell>;

    const r = await store.getCallReconciliation(db, firm.id);
    const nonAnalyzed = await store.listNonAnalyzedCalls(db, firm.id);
    const balances = Number(r.received) === Number(r.processed) + Number(r.excluded) + Number(r.failed);

    // Zero calls ≠ "everything processed": before the feed is connected, an
    // equation about zeros is a false all-clear. Show the setup story instead.
    if (Number(r.received) === 0) {
      return (
        <Shell firmName={firm.name}>
          <SettingUp detail="no calls received yet — connect your calls on the Settings screen" />
        </Shell>
      );
    }

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
                        ? `${c.status_reason ?? "Audio issue"} — we'll re-request this recording; nothing for you to do.`
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
    return <Shell><SettingUp detail="desk tables not initialized on this database" /></Shell>;
  } finally {
    await store.closePipelineDb(db);
  }
}

// Degraded states (no DB, no tables) show the same friendly first-run panel
// the queue uses — a brand-new user must never see plumbing. The technical
// detail is one small line at the bottom — for us, not them.
function SettingUp({ detail }: { detail: string }) {
  return (
    <div>
      <div className="rounded-card border border-hairline bg-surface p-6">
        <p className="max-w-[70ch] text-sm text-ink-muted">
          Your call ledger will appear here once your calls start arriving. Connect your calls on
          the <a href="/desk/settings" className="font-medium text-accent hover:text-accent-hover">Settings screen</a>{" "}
          &mdash; or we do it with you on the 15-minute setup call.
        </p>
      </div>
      <p className="mt-4 text-xs text-faint">Setup status: {detail}.</p>
    </div>
  );
}

function Shell({ children, firmName }: { children: React.ReactNode; firmName?: string }) {
  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">The desk{firmName ? ` · ${firmName}` : ""}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Calls</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
          Proof we read every call so your team never has to: each one is processed, excluded, or
          failed, with the reason. If the math doesn&apos;t balance, this banner turns red and
          it&apos;s our problem to fix, not yours.
        </p>
      </div>
      {children}
    </div>
  );
}
