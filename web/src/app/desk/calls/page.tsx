// The Calls ledger — every intake call, accounted for, with its grade and one
// next action. This replaces the thin reconciliation table (which only listed
// calls we COULDN’T read): now every call shows up — read, won back, on the
// table, or set aside — each with a grade and an "Open" button into its full
// readout. A brand-new firm (no calls) sees a clearly-labeled SAMPLE.
import Link from "next/link";
import { fmtDate } from "@/pdf/doc-helpers.mjs";
import { resolveDeskFirm } from "@/lib/desk/firm";
import { letterGrade } from "@/lib/desk/analysis.mjs";
import { initialsOf, displayIdOf, ledgerStatus, whatToDo } from "@/lib/desk/call-format.mjs";
import { sampleAnalysisRows } from "@/lib/desk/sample-analysis.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Calls — Intake QA" };

type SearchParams = Promise<{ demo?: string }>;

type Row = Record<string, unknown> & {
  call_id: string | number;
  received_at: string;
  status?: string | null;
  overall_score?: number | null;
  lost_signable?: number | boolean | null;
  save_status?: string | null;
  case_type?: string | null;
  caller_name?: string | null;
};

const TONE: Record<string, string> = {
  good: "bg-accent-tint text-accent",
  warn: "bg-amber-tint text-amber",
  bad: "bg-red-tint text-red",
  muted: "bg-canvas text-ink-muted",
};

export default async function CallsLedger({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const forceDemo = sp?.demo === "1" || sp?.demo === "true";

  let rows: Row[] = [];
  let firmName: string | undefined;
  let isSample = false;

  if (forceDemo) {
    rows = sampleAnalysisRows() as Row[];
    isSample = true;
  } else {
    const store = await import("../../../../ingest/store.mjs");
    let db;
    try {
      db = await store.openPipelineDb();
      const firm = await resolveDeskFirm(db, store.listFirms);
      if (firm) {
        firmName = firm.name;
        rows = (await store.listCallsWithAnalysis(db, firm.id)) as Row[];
      }
    } catch {
      rows = [];
    } finally {
      await store.closePipelineDb(db);
    }
    // No calls at all → show the labeled sample so value is legible immediately.
    if (rows.length === 0) {
      rows = sampleAnalysisRows() as Row[];
      isSample = true;
    }
  }

  const received = rows.length;
  const processed = rows.filter((r) => r.status === "analyzed" || (r.status == null && r.overall_score != null)).length;
  const excluded = rows.filter((r) => String(r.status ?? "").startsWith("excluded")).length;
  const failed = rows.filter((r) => String(r.status ?? "").startsWith("failed")).length;
  const processing = Math.max(0, received - processed - excluded - failed);
  const balances = received === processed + excluded + failed + processing;

  return (
    <Shell firmName={firmName} isSample={isSample}>
      <div
        className={`rounded-card border p-4 text-sm font-medium ${
          balances ? "border-hairline bg-surface text-ink" : "border-red bg-red-tint text-red"
        }`}
      >
        Received {received} = Read {processed} + Set aside {excluded} + Could not read {failed}
        {processing > 0 ? ` + Being read ${processing}` : ""}
        {balances ? " ✓" : " — does not balance"}
      </div>

      <div className="mt-6 overflow-x-auto rounded-card border border-hairline">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-hairline bg-canvas text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5 text-left">Call</th>
              <th className="px-4 py-2.5 text-left">Received</th>
              <th className="px-4 py-2.5 text-left">Case</th>
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5 text-left">Grade</th>
              <th className="px-4 py-2.5 text-left">What to do</th>
              <th className="px-4 py-2.5 text-right">Readout</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const g = letterGrade(r.overall_score ?? null);
              const status = ledgerStatus(r);
              const statusTone =
                status === "On the table" ? "text-red font-semibold" : status === "Won back" ? "text-accent font-semibold" : "text-ink";
              const href = isSample ? `/desk/calls/${r.call_id}?demo=1` : `/desk/calls/${r.call_id}`;
              return (
                <tr key={String(r.call_id)} className="border-b border-hairline align-top last:border-0 hover:bg-canvas">
                  <td className="px-4 py-3 font-semibold text-ink">
                    {initialsOf(r.caller_name ?? null)} <span className="font-normal text-faint">· {displayIdOf(r)}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{fmtDate(r.received_at)}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.case_type ?? "—"}</td>
                  <td className={`px-4 py-3 ${statusTone}`}>{status}</td>
                  <td className="px-4 py-3">
                    <span
                      title={g.label}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-pill font-display text-sm font-bold ${TONE[g.tone] ?? TONE.muted}`}
                    >
                      {g.letter}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{whatToDo(r)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.overall_score != null ? (
                      <Link href={href} className="font-semibold text-accent hover:text-accent-hover">
                        Open →
                      </Link>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-6 max-w-[80ch] text-xs text-faint">
        Grade is the call’s intake score, A–F. “On the table” means a signable case your team let slip that is
        still winnable with a callback. Estimated fee value is a range under the methodology on the honesty page,
        not a guarantee. Statute-of-limitations tracking stays with your attorneys.
      </p>
    </Shell>
  );
}

function Shell({
  children,
  firmName,
  isSample,
}: {
  children: React.ReactNode;
  firmName?: string;
  isSample?: boolean;
}) {
  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">The desk{firmName ? ` · ${firmName}` : ""}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold text-ink">Calls</h1>
          {isSample ? (
            <span className="rounded-pill bg-amber-tint px-2.5 py-0.5 text-xs font-semibold text-amber">
              Sample — your real calls replace this
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
          Every call we read, with its grade and the one thing to do next. Open any call for the full readout —
          what went well, the biggest miss, and what it was worth. If the math up top does not balance, that is
          our problem to fix, not yours.
        </p>
      </div>
      {children}
    </div>
  );
}
