// Documents — screen (b). Firm-aware:
//   * the demo/pilot firm sees the rendered sample documents;
//   * a real (membership-scoped) firm sees ITS OWN monthly statements, pulled
//     from firm_statement_reviews — released rows are downloadable, in-review rows
//     are shown honestly as "not yet available" (no download). Never someone
//     else's demo table dressed up as their history, and never a PDF for a
//     statement that hasn't been released.
import Link from "next/link";
import { resolveDeskFirm } from "@/lib/desk/firm";
import { statementProvenanceLabel } from "../../../../analysis/statement-access.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Documents — Intake QA" };

const DOCS = [
  {
    label: "Intake Leak Report — June 2026",
    period: "June 2026",
    issued: "Jul 5, 2026",
    status: "Issued (demo)",
    href: "/api/documents/leak-report",
  },
  {
    label: "Missed-Revenue Statement — June 2026",
    period: "June 2026",
    issued: "Jul 5, 2026",
    status: "Issued (demo)",
    href: "/api/documents/statement",
  },
  {
    label: "Leak Audit — Jun 1–30, 2026",
    period: "Jun 1–30, 2026",
    issued: "Jul 5, 2026",
    status: "Issued (demo)",
    href: "/api/documents/readout",
  },
];

type FirmStatementRow = {
  firm_id: string | number;
  period: string; // YYYY-MM
  report_status: string; // draft | analyst_review | released
  provenance: string | null;
  released_at?: string | null;
};

// "2026-07" → "July 2026" (display only; the download route re-parses the period).
function periodLabel(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function DocumentsPage() {
  // Real firms (membership-scoped) shouldn't see the synthetic demo table.
  let showDemoDocs = true;
  let firmName: string | undefined;
  let statements: FirmStatementRow[] = [];
  try {
    const store = await import("../../../../ingest/store.mjs");
    const db = await store.openPipelineDb();
    try {
      const firm = await resolveDeskFirm(db, store.listFirms);
      if (firm) {
        firmName = firm.name;
        showDemoDocs = firm.source === "fallback";
        if (firm.source === "membership") {
          try {
            // Firm-scoped: this firm's OWN statement rows only (any status).
            statements = (await store.listFirmStatementReviews(db, firm.id)) as FirmStatementRow[];
          } catch {
            // Table absent (migration not applied) → no statements section.
            statements = [];
          }
        }
      }
    } finally {
      await store.closePipelineDb(db);
    }
  } catch {
    // no DB — keep the demo table (pilot behavior)
  }

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">The desk{firmName ? ` · ${firmName}` : ""}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Documents</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
          Your monthly statement and audit readouts live here &mdash; nothing to build, export, or
          remember. The statement’s first page is a 90-second read; each document is a PDF you own.
        </p>
      </div>

      {!showDemoDocs ? (
        statements.length > 0 ? (
          <div className="overflow-x-auto rounded-card border border-hairline">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-hairline bg-canvas text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-2.5 text-left">Statement</th>
                  <th className="px-4 py-2.5 text-left">Period</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-right">Download</th>
                </tr>
              </thead>
              <tbody>
                {statements.map((s) => {
                  const released = s.report_status === "released";
                  return (
                    <tr key={s.period} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-3 font-medium text-ink">
                        Missed-Revenue Statement — {periodLabel(s.period)}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{periodLabel(s.period)}</td>
                      <td className="px-4 py-3">
                        {released ? (
                          <span className="text-ink-muted">{statementProvenanceLabel(s.provenance)}</span>
                        ) : (
                          <span className="rounded-pill bg-canvas px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
                            In review — not yet available
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {released ? (
                          <Link
                            href={`/api/documents/statement/mine?period=${s.period}`}
                            className="rounded-pill bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
                          >
                            Download PDF
                          </Link>
                        ) : (
                          <span className="text-xs text-faint">Being reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-card border border-hairline bg-surface p-8">
            <h2 className="font-display text-xl font-semibold text-ink">
              Your first statement arrives after your first full month.
            </h2>
            <p className="mt-2 max-w-[70ch] text-sm text-ink-muted">
              Once your calls have been flowing for a month, Ali reviews and releases your first
              Missed-Revenue Statement (page one is a 90-second read) and it lands here as a PDF you
              own. Nothing for you to generate.
            </p>
          </div>
        )
      ) : (
      <>
      {/* Demo provenance, stated before the table — these must never read as
          the firm’s real history. */}
      <div className="mb-3 rounded-card border border-hairline bg-canvas px-4 py-2.5 text-sm text-ink-muted">
        Example documents from the demo firm &mdash; your firm’s statements will replace
        these.
      </div>
      <div className="overflow-x-auto rounded-card border border-hairline">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-hairline bg-canvas text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5 text-left">Document</th>
              <th className="px-4 py-2.5 text-left">Period</th>
              <th className="px-4 py-2.5 text-left">Issued</th>
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5 text-right">Download</th>
            </tr>
          </thead>
          <tbody>
            {DOCS.map((d) => (
              <tr key={d.href} className="border-b border-hairline last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{d.label}</td>
                <td className="px-4 py-3 text-ink-muted">{d.period}</td>
                <td className="px-4 py-3 text-ink-muted">{d.issued}</td>
                <td className="px-4 py-3 text-ink-muted">{d.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={d.href}
                    className="rounded-pill bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
                  >
                    Download PDF
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}
      {showDemoDocs ? (
        <p className="mt-4 text-xs text-faint">
          Documents labeled &ldquo;demo&rdquo; render from synthetic data. Per-firm, per-period documents
          are generated by the pipeline once your calls are processed.
        </p>
      ) : statements.length > 0 ? (
        <p className="mt-4 max-w-[70ch] text-xs text-faint">
          Each statement is reviewed and signed off before it’s released here. A statement marked
          &ldquo;in review&rdquo; isn’t available to download yet &mdash; it’ll open once your analyst releases it.
        </p>
      ) : null}
    </div>
  );
}
