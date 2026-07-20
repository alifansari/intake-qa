// The per-call readout — the screen a firm opens to see HOW a call went.
// Hierarchy (from the intake-QA research pass): verdict + grade + dollars first,
// then the single biggest miss with its moment/quote/model line, then what the
// rep did well, then the four money moves, then the score breakdown, the plain
// summary, and the transcript last. Verdict → evidence → detail, never a wall of
// metrics up top.
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtDate } from "@/pdf/doc-helpers.mjs";
import { valueTier } from "@/lib/desk/money.mjs";
import { feeBandFromPoint } from "../../../../../analysis/fee-value.mjs";
import { resolveDeskFirm } from "@/lib/desk/firm";
import {
  verdict,
  letterGrade,
  moneyMoves,
  categoryBars,
  parseCoaching,
} from "@/lib/desk/analysis.mjs";
import { initialsOf, displayIdOf } from "@/lib/desk/call-format.mjs";
import { sampleCallById } from "@/lib/desk/sample-analysis.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Call readout — Intake QA" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ demo?: string }>;

const VERDICT_TONE: Record<string, string> = {
  good: "border-accent bg-accent-tint text-accent",
  bad: "border-red bg-red-tint text-red",
  warn: "border-amber bg-amber-tint text-amber",
  muted: "border-hairline bg-surface text-ink-muted",
};
const GRADE_TONE: Record<string, string> = {
  good: "bg-accent text-white",
  warn: "bg-amber text-white",
  bad: "bg-red text-white",
  muted: "bg-canvas text-ink-muted",
};

export default async function CallReadout({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const forceDemo = sp?.demo === "1" || sp?.demo === "true";

  let row: Record<string, unknown> | null = null;
  let firmName: string | undefined;
  let isSample = false;

  if (forceDemo) {
    row = sampleCallById(id);
    isSample = true;
  } else {
    const store = await import("../../../../../ingest/store.mjs");
    let db;
    try {
      db = await store.openPipelineDb();
      const firm = await resolveDeskFirm(db, store.listFirms);
      if (firm) {
        firmName = firm.name;
        row = (await store.getCallWithAnalysis(db, firm.id, id)) as Record<string, unknown> | null;
      }
    } catch {
      row = null;
    } finally {
      await store.closePipelineDb(db);
    }
    // Unknown id and it looks like a sample id → let the demo render it.
    if (!row && String(id).startsWith("sample-")) {
      row = sampleCallById(id);
      isSample = true;
    }
  }

  if (!row) notFound();

  const r = row as Record<string, any>;
  const v = verdict(r);
  const g = letterGrade(r.overall_score ?? null);
  const coaching = parseCoaching(r.coaching_json);
  const moves = moneyMoves(r);
  const cats = categoryBars(r);
  const notAnalyzed = r.status && r.status !== "analyzed";

  // B-022 — a value TIER, not an estimated dollar (the $ reads as inflated vendor
  // math on a case that hasn't signed; §IV prefers a coarse band). The firm's own
  // average fee lives in the Ledger; the free audit report keeps its dollar wedge.
  const feeBand = r.revenue_at_risk_cents ? feeBandFromPoint(r.revenue_at_risk_cents) : null;
  const valueBand = feeBand ? valueTier(feeBand.feeHighCents) : null;

  const phone = r.caller_phone as string | null;
  const callBackable = r.lost_signable && r.save_status !== "signed" && phone;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href={isSample ? "/desk/calls?demo=1" : "/desk/calls"} className="text-sm font-medium text-accent hover:text-accent-hover">
          ← All calls
        </Link>
        {isSample ? (
          <span className="rounded-pill bg-amber-tint px-2.5 py-0.5 text-xs font-semibold text-amber">Sample call</span>
        ) : null}
      </div>

      {/* Verdict banner: outcome word + grade + value band — the only things that matter above the fold. */}
      <div className={`rounded-card border p-5 ${VERDICT_TONE[v.tone] ?? VERDICT_TONE.muted}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
              {initialsOf(r.caller_name ?? null)} · {displayIdOf(r)}
              {r.case_type ? ` · ${r.case_type}` : ""}
            </p>
            <p className="mt-1 font-display text-3xl font-bold">{v.word}</p>
            <p className="mt-1 max-w-[60ch] text-sm text-ink">{v.line}</p>
          </div>
          {!notAnalyzed ? (
            <div className="flex items-center gap-4">
              {valueBand ? (
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Value band<sup>1</sup></p>
                  <p className="font-display text-xl font-bold text-ink">{valueBand.label}</p>
                </div>
              ) : null}
              <div className="text-center">
                <span className={`flex h-14 w-14 items-center justify-center rounded-full font-display text-2xl font-bold ${GRADE_TONE[g.tone] ?? GRADE_TONE.muted}`}>
                  {g.letter}
                </span>
                <p className="mt-1 text-xs font-medium text-ink">{r.overall_score ?? "—"}/100</p>
              </div>
            </div>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          {r.rep ? `Handled by ${r.rep} · ` : ""}Called {fmtDate(r.received_at)}
          {r.call_source ? ` · via ${r.call_source === "manual" ? "upload" : r.call_source}` : ""}
        </p>
        {callBackable ? (
          <a
            href={`tel:${String(phone).replace(/[^+\d]/g, "")}`}
            className="mt-4 inline-block rounded-pill bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover"
          >
            Call {initialsOf(r.caller_name ?? null)} back now · {phone}
          </a>
        ) : null}
      </div>

      {notAnalyzed ? (
        <p className="mt-6 text-sm text-ink-muted">{r.status_reason ?? "This call has no readout yet."}</p>
      ) : (
        <>
          {/* The single biggest miss — the screen’s payload. */}
          {coaching?.one_thing ? (
            <section className="mt-6 rounded-card border border-amber bg-amber-tint/40 p-5">
              <p className="eyebrow text-amber">The one thing to fix</p>
              <p className="mt-1 font-display text-lg font-semibold text-ink">{coaching.one_thing.behavior}</p>
              {coaching.one_thing.missed_moment_timestamp ? (
                <p className="mt-2 text-xs font-semibold text-ink-muted">
                  Missed moment · {coaching.one_thing.missed_moment_timestamp}
                </p>
              ) : null}
              {coaching.one_thing.model_utterance ? (
                <div className="mt-2 rounded-base border border-hairline bg-surface p-3">
                  <p className="text-xs font-semibold text-ink-muted">What a great rep would have said</p>
                  <p className="mt-1 text-sm italic text-ink">“{coaching.one_thing.model_utterance}”</p>
                </div>
              ) : null}
              {coaching.one_thing.why_it_matters ? (
                <p className="mt-2 text-sm text-ink-muted">Why it matters: {coaching.one_thing.why_it_matters}</p>
              ) : null}
            </section>
          ) : null}

          {/* What the rep did well. */}
          {coaching?.top_strength ? (
            <section className="mt-4 rounded-card border border-hairline bg-surface p-5">
              <p className="eyebrow text-accent">What went well</p>
              <p className="mt-1 text-sm font-semibold text-ink">{coaching.top_strength.behavior}</p>
              {coaching.top_strength.quote ? (
                <p className="mt-2 border-l-2 border-hairline pl-3 text-sm italic text-ink">
                  <span className="mr-1 text-xs font-semibold not-italic text-ink-muted">
                    From the call{coaching.top_strength.timestamp ? ` · ${coaching.top_strength.timestamp}` : ""}:
                  </span>
                  “{coaching.top_strength.quote}”
                </p>
              ) : null}
            </section>
          ) : null}

          {/* The four money moves. */}
          <section className="mt-4 rounded-card border border-hairline bg-surface p-5">
            <p className="eyebrow">Did they do the money moves?</p>
            <ul className="mt-3 flex flex-col gap-2">
              {moves.map((m) => (
                <li key={m.key} className="flex items-start gap-2 text-sm">
                  <span
                    className={
                      m.done === true
                        ? "text-accent"
                        : m.done === false
                          ? "text-red"
                          : "text-faint"
                    }
                    aria-hidden
                  >
                    {m.done === true ? "✓" : m.done === false ? "✗" : "—"}
                  </span>
                  <span>
                    <span className={`font-medium ${m.done === false ? "text-ink" : "text-ink"}`}>{m.label}</span>
                    <span className="text-ink-muted"> — {m.why}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Score breakdown — the reason codes, available but not shouted. */}
          {cats.length ? (
            <details className="mt-4 rounded-card border border-hairline bg-surface p-5">
              <summary className="cursor-pointer text-sm font-semibold text-ink">
                Score breakdown ({r.overall_score}/100 overall)
              </summary>
              <div className="mt-4 flex flex-col gap-3">
                {cats.map((c) => (
                  <div key={c.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink" title={c.blurb}>{c.label}</span>
                      <span className="tnum text-ink-muted">{c.score}/100</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-pill bg-canvas">
                      <div
                        className={`h-full rounded-pill ${c.score >= 70 ? "bg-accent" : c.score >= 50 ? "bg-amber" : "bg-red"}`}
                        style={{ width: `${Math.max(3, Math.min(100, c.score))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          {/* Plain-English summary. */}
          {r.summary ? (
            <section className="mt-4 rounded-card border border-hairline bg-canvas p-5">
              <p className="eyebrow">In plain English</p>
              <p className="mt-1 max-w-[75ch] text-sm text-ink">{r.summary}</p>
            </section>
          ) : null}

          {/* Transcript — last, collapsed. Purged calls show nothing. */}
          {r.transcript ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-ink-muted hover:text-ink">
                Read the transcript
              </summary>
              <pre className="mt-2 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-card border border-hairline bg-surface p-4 text-sm text-ink">
                {r.transcript}
              </pre>
            </details>
          ) : null}
        </>
      )}

      <p className="mt-6 max-w-[80ch] text-xs text-faint">
        <sup>1</sup> The value band (high / standard / modest) is an estimate from typical fee values for the case
        type — a way to gauge what walked, not a guarantee of recovery. Your firm’s own average fee lives in the
        Ledger. Coaching is guidance for your team, not a legal judgment. Statute-of-limitations tracking stays with
        your attorneys.
      </p>
    </div>
  );
}
