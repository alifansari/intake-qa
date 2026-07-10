// Missed cases — screen (a), the desk's home. Server-reads leaked-signable
// flags for the firm, enriches each with its estimated fee range, and renders
// action cards. Every degraded state (no DB, no firm, no tables) renders the
// same friendly first-run panel instead of an internal error — a brand-new
// user must never see plumbing.
import { LeakCard, type Leak } from "@/components/desk/LeakCard";
import { HowCallsArrive } from "@/components/desk/HowCallsArrive";
import { resolveDeskFirm } from "@/lib/desk/firm";
import { fmtMoneyRange } from "@/pdf/doc-helpers.mjs";
import { feeRangeFromRow } from "../../../../analysis/fee-value.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Missed cases — Intake QA" };

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
    return <FirstRun detail="workspace database not connected" />;
  }
  try {
    // The signed-in user's own firm (firm_members); pilot fallback otherwise.
    const firm = await resolveDeskFirm(db, store.listFirms);
    if (!firm) return <FirstRun detail="no firm on this workspace yet" />;

    const flags = await store.listLeakedFlags(db, firm.id);
    // Distinguish "no misses" from "no calls at all" for the empty state.
    let callsReceived = 0;
    try {
      const recon = await store.getCallReconciliation(db, firm.id);
      callsReceived = Number(recon?.received ?? 0);
    } catch {
      callsReceived = 0;
    }
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
        phone: f.caller_phone ?? null,
      });
    }

    return (
      <div>
        <div className="mb-6">
          <p className="eyebrow">The desk · {firm.name}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Missed cases</h1>
          <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
            We read every intake call so your team doesn&apos;t have to. These are the only callers
            that need action today &mdash; likely signable, and no sign of a signed agreement. The
            whole job on this screen: call them back, then mark what happened.
          </p>
        </div>

        {leaks.length === 0 ? (
          callsReceived === 0 ? (
            // Zero calls yet ≠ zero misses: this firm's calls aren't flowing.
            // Show the setup story, not a false all-clear.
            <div className="rounded-card border border-hairline bg-surface p-6">
              <h2 className="font-display text-xl font-semibold text-ink">
                One step left: connect your calls.
              </h2>
              <p className="mt-2 max-w-[70ch] text-sm text-ink-muted">
                Once calls are flowing, anything that slips through appears right here the same
                day. Your webhook address is ready on the{" "}
                <a href="/desk/settings" className="font-medium text-accent hover:text-accent-hover">
                  Settings screen
                </a>
                , or we do the whole thing on your 15-minute setup call.
              </p>
              <div className="mt-5 border-t border-hairline pt-5">
                <HowCallsArrive />
              </div>
            </div>
          ) : (
            <div className="rounded-card border border-hairline bg-surface p-8">
              <h2 className="font-display text-xl font-semibold text-ink">
                All clear &mdash; nothing needs your attention.
              </h2>
              <p className="mt-2 max-w-[70ch] text-sm text-ink-muted">
                We&apos;ve read {callsReceived} call{callsReceived === 1 ? "" : "s"} for your firm
                and every qualified caller is signed, in progress, or accounted for. That&apos;s
                the desk working. New misses appear here the same day we read the call &mdash;
                you don&apos;t need to check back; the daily digest emails you when something
                lands.
              </p>
            </div>
          )
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
    // Missing tables etc. — same friendly first-run panel, never plumbing.
    return <FirstRun detail="desk tables not initialized on this database" />;
  } finally {
    await store.closePipelineDb(db);
  }
}

// The first-run state: what this screen will do, and how calls get here.
// The technical detail is one small line at the bottom — for us, not them.
function FirstRun({ detail }: { detail: string }) {
  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">The desk</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Missed cases</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
          We read every intake call so your team doesn&apos;t have to. Once your calls are
          flowing, the only callers that need action appear right here &mdash; likely signable,
          not signed &mdash; and your team just calls them back.
        </p>
      </div>
      <div className="rounded-card border border-hairline bg-surface p-6">
        <HowCallsArrive />
      </div>
      <p className="mt-4 text-xs text-faint">Setup status: {detail}.</p>
    </div>
  );
}
