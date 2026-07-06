// Leaked-case queue — screen (a). Server-reads leaked-signable flags for the firm
// (prefers the demo firm), enriches each with its estimated fee range, and renders
// interactive cards. Degrades gracefully with no DB.
import { LeakCard, type Leak } from "@/components/desk/LeakCard";
import { fmtMoneyRange } from "@/pdf/doc-helpers.mjs";
import { feeRangeFromRow } from "../../../../analysis/fee-value.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Leaked-case queue — Intake QA" };

function initialsOf(name: string | null): string {
  if (!name) return "PNC";
  const parts = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).filter(Boolean);
  return letters.length ? letters.join(".") + "." : "PNC";
}

export default async function QueuePage() {
  const store = await import("../../../../ingest/store.mjs");
  let db;
  try {
    db = await store.openPipelineDb();
  } catch {
    return <Empty msg="Connect the workspace database to see the queue. Run npm run seed:demo locally to load the demo firm." />;
  }
  try {
    const firms = await store.listFirms(db);
    const firm =
      firms.find((f: { name?: string }) => (f.name ?? "").includes("DEMO")) ?? firms[0];
    if (!firm) return <Empty msg="No firm found yet." />;

    const flags = await store.listLeakedFlags(db, firm.id);
    const leaks: Leak[] = [];
    for (const f of flags) {
      const range = f.case_type ? await store.getFeeValueRange(db, f.case_type, firm.id) : null;
      // Displayed value is the estimated FEE = case value × contingency %, not the
      // raw case value. Ranges only.
      const fee = feeRangeFromRow(range);
      // Short, stable display id (works for both integer and UUID primary keys).
      const shortId = String(f.id).replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
      leaks.push({
        id: f.id,
        caseType: f.case_type ?? null,
        callDate: f.received_at,
        initials: initialsOf(f.caller_name),
        displayId: `#A-${shortId}`,
        score: f.qualification_score ?? null,
        tier: (f.confidence_tier as "strong" | "moderate" | null) ?? null,
        feeRange: fee ? fmtMoneyRange(fee.lowCents, fee.highCents) : null,
        citationCount: Number(f.citation_count ?? 0),
        reason: f.reason ?? null,
      });
    }

    return (
      <div>
        <div className="mb-6">
          <p className="eyebrow">The desk · {firm.name}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Leaked-case queue</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Qualified PNCs our analysis flagged as signable that don&apos;t appear to have signed. Strong
            flags first.
          </p>
        </div>

        {leaks.length === 0 ? (
          <Empty msg="No open leaks right now. That's a good sign — it means every qualified PNC this period is either signed, in progress, or accounted for." />
        ) : (
          <div className="flex flex-col gap-3">
            {leaks.map((l) => (
              <LeakCard key={String(l.id)} leak={l} />
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-faint">
          <sup>1</sup> Estimated fee value is a range under the methodology on the honesty page — an
          estimate of what walked, not a guarantee of recovery. Statute clocks appear once intake dates
          are captured on the call.
          {/* TODO(Ali): wire statute clock from the call's incident date + SOL rules (sol.mjs). */}
        </p>
      </div>
    );
  } catch {
    // Missing tables (migrations 0014–0015 not applied on this database yet), etc.
    return <Empty msg="The desk tables aren't set up on this database yet — apply migrations 0014–0015, then the queue populates automatically." />;
  } finally {
    await store.closePipelineDb(db);
  }
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="rounded-card border border-hairline bg-surface p-8">
      <h1 className="font-display text-2xl font-semibold text-ink">Leaked-case queue</h1>
      <p className="mt-2 text-sm text-ink-muted">{msg}</p>
    </div>
  );
}
