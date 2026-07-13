// The desk — ONE screen. This is the whole firm-facing product now: the money
// on the table (the hero), the callers to phone back (the job), and quiet links
// to the records underneath. The old tabs (Missed cases / Upload / Documents /
// Calls) are gone as destinations — everything a firm does lives here, with the
// rarely-needed records demoted to a footer row (progressive disclosure) and
// Settings behind the gear in the header.
//
// A brand-new firm (no calls yet) sees a clearly-labeled SAMPLE so a demo shows
// value in seconds instead of a "connect your calls" wall. ?demo=1 forces the
// sample on any account; ?live=1 forces the real view.
//
// Every degraded state (no DB, no firm, no tables) renders the same friendly
// panel instead of plumbing — a new user must never see an internal error.
import { LeakCard, type Leak } from "@/components/desk/LeakCard";
import { MoneyHero } from "@/components/desk/MoneyHero";
import { HowCallsArrive } from "@/components/desk/HowCallsArrive";
import { resolveDeskFirm } from "@/lib/desk/firm";
import { partitionLeaks, callUrgency } from "@/lib/desk/queue-view.mjs";
import { summarizeMoney } from "@/lib/desk/money.mjs";
import { sampleDesk } from "@/lib/desk/sample.mjs";
import { recordEventOn } from "@/lib/events";
import { fmtMoneyRange } from "@/pdf/doc-helpers.mjs";
import { feeRangeFromRow } from "../../../analysis/fee-value.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your desk — Intake QA" };

type SearchParams = Promise<{ demo?: string; live?: string }>;

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

export default async function DeskHome({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const forceDemo = sp?.demo === "1" || sp?.demo === "true";
  const forceLive = sp?.live === "1" || sp?.live === "true";

  const store = await import("../../../ingest/store.mjs");
  let db;
  try {
    db = await store.openPipelineDb();
  } catch {
    // No DB at all: the sample is the friendliest possible first impression.
    return <Shell><SampleDesk note="connect" /></Shell>;
  }
  try {
    const firm = await resolveDeskFirm(db, store.listFirms);
    if (!firm) return <Shell><SampleDesk note="connect" /></Shell>;

    await recordEventOn(db, { event: "desk_view", firmId: firm.id, context: { page: "home" } });

    const flags = await store.listLeakedFlags(db, firm.id);

    // Pipeline heartbeat: prove the whole thing is on, in the firm’s own nouns.
    let callsReceived = 0;
    let lastCallAt: string | null = null;
    let callsProcessing = 0;
    let callsFailed = 0;
    try {
      const recon = await store.getCallReconciliation(db, firm.id);
      callsReceived = Number(recon?.received ?? 0);
      callsFailed = Number(recon?.failed ?? 0);
      callsProcessing = Math.max(
        0,
        callsReceived - Number(recon?.processed ?? 0) - Number(recon?.excluded ?? 0) - callsFailed,
      );
      if (typeof db.query === "function") {
        const r = await db.query(`select max(received_at) as last from calls where firm_id = $1`, [firm.id]);
        lastCallAt = r.rows[0]?.last ?? null;
      }
    } catch {
      callsReceived = 0;
      callsProcessing = 0;
      callsFailed = 0;
    }

    // No calls yet (and not explicitly asking for the live view) → show the
    // sample so the value is legible immediately. ?demo=1 forces it too.
    if (forceDemo || (callsReceived === 0 && !forceLive)) {
      return <Shell firmName={firm.name}><SampleDesk note="connect" /></Shell>;
    }

    // Build the display leaks AND the money tally from the same source.
    const leaks: Leak[] = [];
    const moneyLeaks: { status: string | null; feeLowCents: number | null; feeHighCents: number | null }[] = [];
    for (const f of flags) {
      const range = f.case_type ? await store.getFeeValueRange(db, f.case_type, firm.id) : null;
      const fee = feeRangeFromRow(range);
      const shortId = String(f.id).replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
      const status = f.save_status ?? "needs_callback";
      moneyLeaks.push({
        status,
        feeLowCents: fee ? fee.lowCents : null,
        feeHighCents: fee ? fee.highCents : null,
      });
      leaks.push({
        id: f.id,
        caseType: f.case_type ?? null,
        callDate: f.received_at,
        initials: initialsOf(f.caller_name),
        displayId: `#A-${shortId}`,
        score: f.qualification_score ?? null,
        tier: (f.confidence_tier as "strong" | "moderate" | null) ?? null,
        feeRange: fee ? fmtMoneyRange(fee.lowCents, fee.highCents) : null,
        feeLowCents: fee ? fee.lowCents : null,
        feeHighCents: fee ? fee.highCents : null,
        citationCount: Number(f.citation_count ?? 0),
        reason: f.reason ?? null,
        quote: f.evidence_quote ?? null,
        phone: f.caller_phone ?? null,
        saveStatus: f.save_status ?? null,
        attempts: Number(f.attempts ?? 0),
        urgency: callUrgency(f.received_at),
      });
    }

    const { onTheTable, wonBack } = summarizeMoney(moneyLeaks);
    const { active, done } = partitionLeaks(leaks);

    return (
      <Shell firmName={firm.name}>
        <MoneyHero onTheTable={onTheTable} wonBack={wonBack} callsReceived={callsReceived} />

        {callsReceived > 0 ? (
          <p className="mt-3 text-xs text-faint tnum">
            Listening for calls · {callsReceived} call{callsReceived === 1 ? "" : "s"} read
            {lastCallAt ? ` · last call ${relativeTime(lastCallAt)}` : ""}
            {isStale(lastCallAt) ? (
              <span> — quieter than usual? If that surprises you, email ali@plaintiffops.com</span>
            ) : (
              " ✓"
            )}
          </p>
        ) : null}

        <div className="mt-6">
          {active.length === 0 ? (
            <QueueEmpty
              callsReceived={callsReceived}
              callsProcessing={callsProcessing}
              callsFailed={callsFailed}
            />
          ) : (
            <>
              <h2 className="mb-3 font-display text-lg font-semibold text-ink">
                Call these back{" "}
                <span className="text-ink-muted">
                  · {active.length} to go
                </span>
              </h2>
              <div className="flex flex-col gap-3">
                {active.map((l) => (
                  <LeakCard key={String(l.id)} leak={l} firmName={firm.name} />
                ))}
              </div>
            </>
          )}
          {done.length > 0 ? (
            <details className="mt-3">
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

        <ReadoutLinks />
        <RecordsRow />
        <Footnote />
      </Shell>
    );
  } catch {
    return <Shell><SampleDesk note="connect" /></Shell>;
  } finally {
    await store.closePipelineDb(db);
  }
}

// The empty states for the queue area under a real hero (calls are flowing but
// nothing needs a callback right now). Honest about processing/failed vs clear.
function QueueEmpty({
  callsReceived,
  callsProcessing,
  callsFailed,
}: {
  callsReceived: number;
  callsProcessing: number;
  callsFailed: number;
}) {
  if (callsProcessing > 0) {
    return (
      <div className="rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          {callsProcessing} call{callsProcessing === 1 ? "" : "s"} still being read.
        </h2>
        <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
          Anything that needs a callback appears here as soon as we’re done — usually within a
          few minutes. Nothing needs you yet.
        </p>
      </div>
    );
  }
  if (callsFailed > 0) {
    return (
      <div className="rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          {callsFailed} call{callsFailed === 1 ? "" : "s"} we couldn’t read automatically.
        </h2>
        <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
          We’ve been notified and will look into {callsFailed === 1 ? "it" : "them"} — nothing
          is required from you. Everything we could read is up to date.
        </p>
      </div>
    );
  }
  const callWord = callsReceived === 1 ? "call" : "calls";
  return (
    <div className="rounded-card border border-hairline bg-surface p-6">
      <h2 className="font-display text-lg font-semibold text-ink">Nothing to call back right now.</h2>
      <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
        We’ve read {callsReceived} {callWord} and every signable caller is signed, in progress,
        or accounted for. New misses appear here the same day we read the call, and the daily digest
        emails you when one lands, so you don’t have to check back.
      </p>
      <p className="mt-3 text-sm">
        <a href="/desk/scorecard" className="font-semibold text-accent hover:text-accent-hover">
          See how your team is doing →
        </a>
      </p>
    </div>
  );
}

// The sample: a labeled, realistic view so value is legible in seconds. Renders
// the same hero + cards a real firm sees, over invented (non-PII) data, with a
// standing banner that it is a sample and how to connect real calls.
function SampleDesk({ note }: { note: "connect" }) {
  const { leaks, wonBack } = sampleDesk();
  const moneyLeaks = [
    ...leaks.map((l) => ({ status: l.saveStatus, feeLowCents: l.feeLowCents, feeHighCents: l.feeHighCents })),
    { status: wonBack.saveStatus, feeLowCents: wonBack.feeLowCents, feeHighCents: wonBack.feeHighCents },
  ];
  const { onTheTable, wonBack: won } = summarizeMoney(moneyLeaks);
  const active = leaks; // all sample cards are active

  return (
    <>
      <MoneyHero onTheTable={onTheTable} wonBack={won} callsReceived={0} isSample />

      <div className="mt-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">
          Call these back <span className="text-ink-muted">· {active.length} to go</span>
        </h2>
        <div className="flex flex-col gap-3">
          {active.map((l) => (
            <LeakCard key={String(l.id)} leak={l as unknown as Leak} firmName="your firm" demo />
          ))}
        </div>
      </div>

      {note === "connect" ? (
        <div className="mt-6 rounded-card border border-hairline bg-canvas p-6">
          <h3 className="font-display text-base font-semibold text-ink">See your firm’s real cases</h3>
          <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
            The cases above are a sample. Connect your calls and anything your team lets slip shows
            up here the same day — with the fees it was worth. It takes about 15 minutes, or we do
            it with you on a setup call.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="/desk/settings"
              className="rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Connect your calls
            </a>
            <a
              href="/desk?live=1"
              className="rounded-pill border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:border-accent"
            >
              Show my real desk
            </a>
          </div>
          <div className="mt-5 border-t border-hairline pt-5">
            <HowCallsArrive />
          </div>
        </div>
      ) : null}

      <ReadoutLinks demo />
      <RecordsRow demo />
      <Footnote />
    </>
  );
}

// Quiet records row — the old Calls / Documents / Upload tabs, demoted to
// where they belong: available, but never in the way of the daily job. The
// sample desk points these at the demo variants so a prospect can explore the
// sample calls + scorecard without connecting anything.
function RecordsRow({ demo = false }: { demo?: boolean }) {
  const q = demo ? "?demo=1" : "";
  const links = [
    { href: `/desk/calls${q}`, label: "Every call we read" },
    { href: `/desk/scorecard${q}`, label: "How your team is doing" },
    { href: "/desk/documents", label: "Monthly statements" },
    { href: "/desk/upload", label: "Upload a recording" },
  ];
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline pt-5 text-sm">
      <span className="eyebrow">Records</span>
      {links.map((l) => (
        <a key={l.href} href={l.href} className="text-ink-muted underline-offset-2 hover:text-ink hover:underline">
          {l.label}
        </a>
      ))}
    </div>
  );
}

// A calm, always-present way into the two new readouts — the past-calls detail
// and the team-wide grade — so "how did we do?" is never a dead end even when
// the callback queue is empty.
function ReadoutLinks({ demo = false }: { demo?: boolean }) {
  const q = demo ? "?demo=1" : "";
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <a
        href={`/desk/scorecard${q}`}
        className="rounded-pill border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:border-accent"
      >
        How your team is doing →
      </a>
      <a
        href={`/desk/calls${q}`}
        className="rounded-pill border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:border-accent"
      >
        Every call we read →
      </a>
    </div>
  );
}

function Footnote() {
  return (
    <p className="mt-6 max-w-[80ch] text-xs text-faint">
      <sup>1</sup> Estimated fee value is a range under the methodology on the honesty page — an
      estimate of what walked, not a guarantee of recovery. The waiting time on each card counts from
      the caller’s original call — it’s a callback reminder, not a legal deadline.
      Statute-of-limitations tracking stays with your attorneys.
    </p>
  );
}

function Shell({ children, firmName }: { children: React.ReactNode; firmName?: string }) {
  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">Your desk{firmName ? ` · ${firmName}` : ""}</p>
        <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
          We read every intake call so your team doesn’t have to. Here’s the money your
          team missed, and the callers to phone back to win it.
        </p>
      </div>
      {children}
    </div>
  );
}
