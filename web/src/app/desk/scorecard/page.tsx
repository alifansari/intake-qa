// The team scorecard — "how is my intake team doing?" One fair letter grade
// (Signable-Save Rate: of the winnable calls, how many did we NOT blow), the
// money still on the table, the recurring misses ranked by cost (the Leak
// Board), and the four money-move rates. Grade the controllables, not raw sign
// rate (which swings with lead quality). Brand-new firm → labeled SAMPLE.
import Link from "next/link";
import { fmtBigRange, fmtK } from "@/lib/desk/money.mjs";
import { feeBandFromPoint } from "../../../../analysis/fee-value.mjs";
import { resolveDeskFirm } from "@/lib/desk/firm";
import { getUserRole, isManagerRole } from "@/lib/desk/roles";
import { buildScorecard, isBlown, analyzedRows } from "@/lib/desk/analysis.mjs";
import { sampleAnalysisRows } from "@/lib/desk/sample-analysis.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "How your team is doing — Intake QA" };

type SearchParams = Promise<{ demo?: string }>;

const GRADE_TONE: Record<string, string> = {
  good: "bg-accent text-white",
  warn: "bg-amber text-white",
  bad: "bg-red text-white",
  muted: "bg-canvas text-ink-muted",
};

export default async function Scorecard({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const forceDemo = sp?.demo === "1" || sp?.demo === "true";

  let rows: Record<string, any>[] = [];
  let firmName: string | undefined;
  let isSample = false;
  let gated = false;
  // call_id -> the acting user (who last worked the callback). Used to attribute
  // per-agent numbers when the scored call carries no `rep` (uploads never do).
  const actingByCall = new Map<string, string>();

  if (forceDemo) {
    rows = sampleAnalysisRows();
    isSample = true;
  } else {
    const store = await import("../../../../ingest/store.mjs");
    let db;
    try {
      db = await store.openPipelineDb();
      const firm = await resolveDeskFirm(db, store.listFirms);
      if (firm) {
        // Team dashboard = manager/admin only. A plain agent sees a gentle
        // pointer back to their queue, never the firm-wide grade.
        const role = await getUserRole(db, firm.id);
        if (!isManagerRole(role)) {
          gated = true;
        } else {
          firmName = firm.name;
          rows = (await store.listCallsWithAnalysis(db, firm.id)) as Record<string, any>[];
          for (const [callId, actor] of await actingUsersByCall(db, firm.id)) {
            actingByCall.set(callId, actor);
          }
        }
      }
    } catch {
      rows = [];
    } finally {
      await store.closePipelineDb(db);
    }
    if (gated) return <GatedForManagers />;
    if (analyzedRows(rows).length === 0) {
      rows = sampleAnalysisRows();
      isSample = true;
    }
  }

  const s = buildScorecard(rows);

  // Money still on the table, as a RANGE (methodology: never a point estimate).
  let lowCents = 0;
  let highCents = 0;
  for (const r of analyzedRows(rows).filter(isBlown)) {
    if (!r.revenue_at_risk_cents) continue;
    const b = feeBandFromPoint(r.revenue_at_risk_cents);
    lowCents += b.feeLowCents ?? 0;
    highCents += b.feeHighCents ?? 0;
  }
  const onTable = highCents > 0 ? fmtBigRange(lowCents, highCents) : null;

  // Per-rep rollup. Prefer the scored call's own `rep`; fall back to the acting
  // user who worked the callback (flag_status), so uploads — which never carry a
  // rep from the score worker — still attribute to a real person instead of
  // silently dropping out of the team view. Sample rows keep their built-in rep.
  const reps = new Map<string, { calls: number; blown: number; winnable: number; scoreSum: number }>();
  for (const r of analyzedRows(rows)) {
    const person = r.rep || actingByCall.get(String(r.call_id)) || null;
    if (!person) continue;
    const g = reps.get(person) ?? { calls: 0, blown: 0, winnable: 0, scoreSum: 0 };
    g.calls += 1;
    g.scoreSum += Number(r.overall_score) || 0;
    if (r.lost_signable || r.case_signability === "signable" || r.case_signability === "possibly_signable") {
      g.winnable += 1;
      if (isBlown(r)) g.blown += 1;
    }
    reps.set(person, g);
  }

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">The desk{firmName ? ` · ${firmName}` : ""}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold text-ink">How your team is doing</h1>
          {isSample ? (
            <span className="rounded-pill bg-amber-tint px-2.5 py-0.5 text-xs font-semibold text-amber">
              Sample — your real calls replace this
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
          One grade for how your intake team turns winnable calls into signed cases, the money still on the table,
          and the habits costing you the most — so you know exactly what to fix on Monday.
        </p>
      </div>

      {/* Grade + money headline. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-hairline bg-surface p-5 sm:col-span-1">
          <p className="eyebrow">Team grade</p>
          <div className="mt-2 flex items-center gap-3">
            <span className={`flex h-16 w-16 items-center justify-center rounded-full font-display text-3xl font-bold ${GRADE_TONE[s.grade.tone] ?? GRADE_TONE.muted}`}>
              {s.grade.letter}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{s.grade.label}</p>
              <p className="text-xs text-ink-muted">
                {s.ssr.rate != null ? `${Math.round(s.ssr.rate * 100)}% signable-save rate` : "Not enough calls yet"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            {s.ssr.winnable > 0
              ? `You kept ${s.ssr.saved} of ${s.ssr.winnable} winnable cases from walking.`
              : "A winnable case is one worth taking; the grade counts only those."}
          </p>
        </div>

        <div className="rounded-card border border-hairline bg-surface p-5">
          <p className="eyebrow text-red">On the table now</p>
          <p className="mt-2 font-display text-2xl font-bold text-red tnum">{onTable ?? "$0"}</p>
          <p className="mt-1 text-xs text-ink-muted">
            Estimated fees from signable calls your team let slip that are still winnable with a callback.<sup>1</sup>
          </p>
          <Link href={isSample ? "/desk?demo=1" : "/desk"} className="mt-3 inline-block text-xs font-semibold text-accent hover:text-accent-hover">
            See who to call back →
          </Link>
        </div>

        <div className="rounded-card border border-hairline bg-surface p-5">
          <p className="eyebrow">Calls read</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink tnum">{s.analyzedCount}</p>
          <p className="mt-1 text-xs text-ink-muted">
            Average call score {s.avgScore ?? "—"}/100. Healthy PI intake signs {s.benchmarkPct}%+ of the cases worth
            taking.
          </p>
        </div>
      </div>

      {/* The Leak Board — recurring misses ranked by cost. The most valuable section. */}
      <section className="mt-6 rounded-card border border-hairline bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-ink">The three things costing you the most</h2>
        <p className="mt-1 text-sm text-ink-muted">
          The same miss, across calls. Fix the habit and the leak closes — it is usually a script or training gap,
          not one person.
        </p>
        {s.leaks.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">No recurring misses yet. Your team is handling calls cleanly.</p>
        ) : (
          <ol className="mt-4 flex flex-col gap-3">
            {s.leaks.map((leak, i) => (
              <li key={i} className="rounded-base border border-hairline bg-canvas p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-ink">{leak.behavior}</p>
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    <span className="rounded-pill bg-surface px-2 py-0.5 font-semibold text-ink-muted">
                      {leak.count} call{leak.count === 1 ? "" : "s"}
                    </span>
                    {leak.dollarsCents > 0 ? (
                      <span className="rounded-pill bg-red-tint px-2 py-0.5 font-semibold text-red">
                        {fmtK(leak.dollarsCents)} at risk
                      </span>
                    ) : null}
                  </div>
                </div>
                {leak.model ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-accent hover:text-accent-hover">
                      The fix — what to say instead
                    </summary>
                    <p className="mt-1 rounded-base border border-hairline bg-surface p-3 text-sm italic text-ink">
                      “{leak.model}”
                    </p>
                  </details>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Conversion funnel — the four money moves, team rate. */}
      <section className="mt-6 rounded-card border border-hairline bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-ink">The four money moves</h2>
        <p className="mt-1 text-sm text-ink-muted">
          How often your team does each of the behaviors that turn a call into a signed case.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {s.funnel.map((f) => (
            <div key={f.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{f.label}</span>
                <span className="tnum text-ink-muted">{f.pct == null ? "—" : `${f.pct}%`}</span>
              </div>
              <div className="mt-1 h-2.5 w-full overflow-hidden rounded-pill bg-canvas">
                <div
                  className={`h-full rounded-pill ${(f.pct ?? 0) >= 70 ? "bg-accent" : (f.pct ?? 0) >= 40 ? "bg-amber" : "bg-red"}`}
                  style={{ width: `${Math.max(2, f.pct ?? 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Per-rep — collapsed; only when rep is known. */}
      {reps.size > 0 ? (
        <details className="mt-6 rounded-card border border-hairline bg-surface p-5">
          <summary className="cursor-pointer font-display text-base font-semibold text-ink">By intake person</summary>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-xs uppercase tracking-wide text-ink-muted">
                  <th className="py-2 text-left">Person</th>
                  <th className="py-2 text-left">Calls</th>
                  <th className="py-2 text-left">Avg score</th>
                  <th className="py-2 text-left">Kept winnable</th>
                </tr>
              </thead>
              <tbody>
                {[...reps.entries()].map(([rep, g]) => (
                  <tr key={rep} className="border-b border-hairline last:border-0">
                    <td className="py-2 font-medium text-ink">{rep}</td>
                    <td className="py-2 text-ink-muted">{g.calls}</td>
                    <td className="py-2 text-ink-muted">{Math.round(g.scoreSum / g.calls)}/100</td>
                    <td className="py-2 text-ink-muted">
                      {g.winnable ? `${g.winnable - g.blown} of ${g.winnable}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

      <p className="mt-6 max-w-[80ch] text-xs text-faint">
        <sup>1</sup> The grade is a Signable-Save Rate: of the calls worth taking, the share your team did not let
        slip. It grades what your team controls, not lead quality. Estimated fees are ranges under the methodology
        on the honesty page, not guarantees. Statute-of-limitations tracking stays with your attorneys.
      </p>
    </div>
  );
}

// Read the acting user (who last worked each callback) from flag_status, keyed
// by call_id. Firm-scoped through the flags join. Prefers a real acting user id
// label; falls back to the human-readable `updated_by` (email). Runs on either
// backend and never throws — attribution is best-effort, it must not break the
// grade if flag_status is empty or absent.
type QueryDb = {
  query?: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  prepare?: (sql: string) => { all: (...args: unknown[]) => Record<string, unknown>[] };
};

async function actingUsersByCall(db: QueryDb, firmId: string | number): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const sql = (ph: string) =>
    `SELECT f.call_id AS call_id,
            fs.updated_by AS updated_by, fs.updated_by_user_id AS updated_by_user_id
       FROM flags f
       JOIN flag_status fs ON fs.flag_id = f.id
      WHERE f.firm_id = ${ph}
        AND (fs.updated_by IS NOT NULL OR fs.updated_by_user_id IS NOT NULL)`;
  try {
    let rows: Record<string, unknown>[] = [];
    if (typeof db.query === "function") {
      rows = (await db.query(sql("$1"), [firmId])).rows;
    } else if (typeof db.prepare === "function") {
      rows = db.prepare(sql("?")).all(firmId);
    }
    for (const r of rows) {
      const label = (r.updated_by as string) || (r.updated_by_user_id as string) || null;
      // 'pilot' is the local single-user fallback label — not a real intake
      // person, so it never becomes an attributed rep.
      if (!label || label === "pilot") continue;
      if (r.call_id != null) out.set(String(r.call_id), label);
    }
  } catch {
    // flag_status / columns absent (pre-migration) — no fallback attribution.
  }
  return out;
}

// A plain agent who lands on the team dashboard directly (the link is hidden for
// them, but the URL is guessable): keep it graceful, never a 403 wall. Point
// them back to the work they own.
function GatedForManagers() {
  return (
    <div className="mx-auto max-w-[560px] rounded-card border border-hairline bg-surface p-8 text-center">
      <h1 className="font-display text-xl font-semibold text-ink">The team scorecard is for managers</h1>
      <p className="mt-2 text-sm text-ink-muted">
        This view rolls up how the whole intake team is doing. Your manager or admin can see it. Your
        job is the callback queue — the callers worth phoning back are waiting there.
      </p>
      <Link
        href="/desk"
        className="mt-5 inline-block rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        Back to your callbacks →
      </Link>
    </div>
  );
}
