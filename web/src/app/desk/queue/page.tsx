// Missed cases — screen (a), the desk's home. Server-reads leaked-signable
// flags for the firm, enriches each with its estimated fee range, and renders
// action cards. Every degraded state (no DB, no firm, no tables) renders the
// same friendly first-run panel instead of an internal error — a brand-new
// user must never see plumbing.
import { LeakCard, type Leak } from "@/components/desk/LeakCard";
import { HowCallsArrive } from "@/components/desk/HowCallsArrive";
import { resolveDeskFirm } from "@/lib/desk/firm";
import { partitionLeaks, callUrgency } from "@/lib/desk/queue-view.mjs";
import { recordEventOn } from "@/lib/events";
import { fmtMoneyRange } from "@/pdf/doc-helpers.mjs";
import { feeRangeFromRow } from "../../../../analysis/fee-value.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Missed cases — Intake QA" };

// Human-friendly age for the heartbeat line ("2h ago", "3d ago").
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// A feed silent for 72+ hours shouldn't wear a checkmark.
function isStale(iso: string | null): boolean {
  if (!iso) return false;
  const ms = Date.now() - new Date(iso).getTime();
  return Number.isFinite(ms) && ms > 72 * 3600_000;
}

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

    // First-party event log: the desk's home screen was viewed (best-effort,
    // ids only — the /studio/beta board reads this as "last activity").
    await recordEventOn(db, { event: "desk_view", firmId: firm.id, context: { page: "queue" } });

    const flags = await store.listLeakedFlags(db, firm.id);
    // Distinguish "no misses" from "no calls at all" for the empty state, and
    // surface the HEARTBEAT: "last call received X ago" proves the whole
    // pipeline end-to-end in the firm's own nouns — the answer to the quiet
    // fear "is this thing even on?". A timestamp that ages visibly beats a
    // green dot that can lie.
    let callsReceived = 0;
    let lastCallAt: string | null = null;
    // Calls the pipeline hasn't finished with yet: received, not analyzed, not
    // excluded, and NOT terminally failed. A permanently-failed call
    // (unreadable audio, Spanish/single-speaker transcript throw) is terminal
    // once the retry guard stops re-queuing it — calling it "processing …
    // usually within a few minutes" would be untruthful. It gets its OWN honest
    // panel below (and the founder is alerted). While EITHER genuinely-in-flight
    // OR failed calls exist, the all-clear panel must not render: "all clear"
    // and "we're still on these calls" cannot both be true.
    let callsProcessing = 0;
    let callsFailed = 0;
    try {
      const recon = await store.getCallReconciliation(db, firm.id);
      callsReceived = Number(recon?.received ?? 0);
      callsFailed = Number(recon?.failed ?? 0);
      callsProcessing = Math.max(
        0,
        callsReceived
          - Number(recon?.processed ?? 0)
          - Number(recon?.excluded ?? 0)
          - callsFailed,
      );
      if (typeof db.query === "function") {
        const r = await db.query(
          `select max(received_at) as last from calls where firm_id = $1`,
          [firm.id],
        );
        lastCallAt = r.rows[0]?.last ?? null;
      }
    } catch {
      callsReceived = 0;
      callsProcessing = 0;
      callsFailed = 0;
    }

    // The coordinator's "wins this week" — credit framing (the tool makes her
    // look good), never a score. Best-effort; a query failure just hides it.
    let wins = { worked: 0, reached: 0, signed: 0 };
    try {
      const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
      wins = await store.getCallbackWins(db, firm.id, since);
    } catch {
      /* hide the strip on any error */
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
        quote: f.evidence_quote ?? null,
        phone: f.caller_phone ?? null,
        saveStatus: f.save_status ?? null,
        attempts: Number(f.attempts ?? 0),
        // B-013 — urgency is computed HERE, on the server's clock, so the
        // client card never risks hydration drift. Elapsed time only.
        urgency: callUrgency(f.received_at),
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
          {callsReceived > 0 ? (
            <p className="mt-2 text-xs text-faint tnum">
              Listening for calls · {callsReceived} call{callsReceived === 1 ? "" : "s"} received
              {lastCallAt ? ` · last call ${relativeTime(lastCallAt)}` : ""}
              {/* The checkmark must never vouch for a silent feed: past 72h it
                  becomes an honest nudge instead (dead-man's-switch lite). */}
              {isStale(lastCallAt) ? (
                <span> — quieter than usual? If that surprises you, email ali@plaintiffops.com</span>
              ) : (
                " ✓"
              )}
            </p>
          ) : null}
          {wins.worked > 0 ? (
            // B-012 — the coordinator's wins, credit-framed: this strip is her
            // recognition ammunition (per-case bonuses are ethically barred;
            // recognition is the only upside the tool can offer). Her tally
            // only — no leaderboard, no comparison, nothing here is a score.
            <div className="mt-3 inline-flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border border-hairline bg-accent-tint/40 px-4 py-2 text-sm text-ink">
              <span className="font-semibold">Your wins this week</span>
              <span className="tnum">{wins.worked} callback{wins.worked === 1 ? "" : "s"} worked</span>
              <span className="tnum">{wins.reached} reached</span>
              {wins.signed > 0 ? (
                <span className="tnum font-semibold text-accent">{wins.signed} signed 🎉</span>
              ) : null}
              {wins.signed > 0 ? (
                <span className="w-full text-xs text-ink-muted">
                  {wins.signed === 1 ? "That signed case" : `Those ${wins.signed} signed cases`} started
                  with your callbacks — worth saying out loud in Friday&apos;s meeting.
                </span>
              ) : wins.reached > 0 ? (
                <span className="w-full text-xs text-ink-muted">
                  Every conversation this week started with your callback — signatures usually follow.
                </span>
              ) : null}
            </div>
          ) : null}
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
          ) : callsProcessing > 0 ? (
            // Calls are in but not read yet (or stuck): the honest state is
            // "still working", never a premature green light.
            <div className="rounded-card border border-hairline bg-surface p-8">
              <h2 className="font-display text-xl font-semibold text-ink">
                {callsProcessing} call{callsProcessing === 1 ? "" : "s"} processing.
              </h2>
              <p className="mt-2 max-w-[70ch] text-sm text-ink-muted">
                We&apos;re still reading {callsProcessing === 1 ? "this call" : "these calls"}.
                Anything that needs a callback will appear right here as soon as we&apos;re done
                &mdash; usually within a few minutes. Nothing needs you yet.
              </p>
            </div>
          ) : callsFailed > 0 ? (
            // Terminal failures: audio we couldn't read automatically (a
            // corrupted file, or a call our transcription can't process). We do
            // NOT pretend these are "processing" — that would age into a lie.
            // The founder is alerted automatically and will follow up; the firm
            // just needs the honest status, not an action.
            <div className="rounded-card border border-hairline bg-surface p-8">
              <h2 className="font-display text-xl font-semibold text-ink">
                {callsFailed} call{callsFailed === 1 ? "" : "s"} we couldn&apos;t read automatically.
              </h2>
              <p className="mt-2 max-w-[70ch] text-sm text-ink-muted">
                {callsFailed === 1 ? "This recording" : "These recordings"} couldn&apos;t be
                transcribed automatically (for example a corrupted or unusual audio file).
                We&apos;ve been notified and will look into{" "}
                {callsFailed === 1 ? "it" : "them"} &mdash; nothing is required from you.
                Everything we could read is up to date.
              </p>
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
          (() => {
            // B-010 — queue hygiene, shared pure logic (unit-tested): terminal
            // cards collapse into the compact done pile; the active queue runs
            // oldest-actionable first, so the caller who has waited longest is
            // the top card. "Today's list", never a graveyard.
            const { active, done } = partitionLeaks(leaks);
            return (
              <div className="flex flex-col gap-3">
                {active.length === 0 ? (
                  <div className="rounded-card border border-hairline bg-surface p-6">
                    <h2 className="font-display text-lg font-semibold text-ink">
                      Nothing left to call back today.
                    </h2>
                    <p className="mt-1 text-sm text-ink-muted">
                      Every flagged case is handled. New misses appear here the same day we read the call.
                    </p>
                  </div>
                ) : (
                  active.map((l) => <LeakCard key={String(l.id)} leak={l} firmName={firm.name} />)
                )}
                {done.length > 0 ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-semibold text-ink-muted hover:text-ink">
                      Handled ({done.length}) — signed, passed, or bad number
                    </summary>
                    <div className="mt-3 flex flex-col gap-2">
                      {done.map((l) => (
                        <LeakCard key={String(l.id)} leak={l} firmName={firm.name} compact />
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            );
          })()
        )}

        {/* B-013 — the old footnote promised "statute clocks" that didn't exist
            (vaporware). The honest version: the waiting time on each card is
            elapsed time since the call, full stop. We never compute or display
            a statute-of-limitations deadline — that judgment stays with the
            firm's attorneys. */}
        <p className="mt-6 text-xs text-faint">
          <sup>1</sup> Estimated fee value is a range under the methodology on the honesty page — an
          estimate of what walked, not a guarantee of recovery. The waiting time on each card counts
          from the caller&apos;s original call — it&apos;s a callback reminder, not a legal deadline.
          Statute-of-limitations tracking stays with your attorneys.
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
