// The hero artifact: page one of a Missed-Revenue Statement, rendered as a design
// object (not an illustration). Warm paper, ruled reconciliation table, tabular
// lining figures, tier labels, redacted names, the narrow attestation, and a
// diagonal SAMPLE watermark. This is the "most credible document the partner has
// received," shown immediately. All figures are illustrative and clearly marked.
//
// P0-A: the ledger + headline are DERIVED from the composed demo model
// (DEMO_SNAPSHOT = composeLeakReport(DEMO_DOC)), so this literally shows page one
// of the same document the Statement PDF and Leak Report render — all three
// reconcile to one number ($33,000 to $95,000).
// P0-D §I/§V: status is "Saved (illustrative)" / "Signed (illustrative)" — never
// "Recovered" — to avoid any recovered-dollars / earnings optic.

import { DEMO_SNAPSHOT } from "@/lib/leak-report/demo-snapshot.mjs";
import { GOLD_ATTESTATION } from "@/lib/site-constants";

// Map the composed save-status vocabulary to a marketing-safe, non-earnings label.
function displayStatus(saveStatus: string): { label: string; won: boolean } {
  if (saveStatus === "Signed") return { label: "Signed (illustrative)", won: true };
  if (saveStatus === "Sent by staff" || saveStatus === "Contact resumed")
    return { label: "Saved (illustrative)", won: true };
  return { label: "Open", won: false };
}

const LEDGER = DEMO_SNAPSHOT.ledger.map((r, i) => ({
  initials: r.initials,
  type: r.caseType,
  tier: r.confidence === "strong" ? 5 : 4,
  fee: r.feeLow, // conservative low end, matching "low end quoted first"
  ...displayStatus(r.saveStatus),
  key: `${r.initials}-${i}`,
}));

// Headline range straight from the composed model — the single source of truth.
const HEADLINE_RANGE = DEMO_SNAPSHOT.headlineRange; // "$33,000 to $95,000"
const STRONG_COUNT = DEMO_SNAPSHOT.strongCount;
const RECOVERABLE_COUNT = DEMO_SNAPSHOT.recoverableCount;
const REPORT_ID = DEMO_SNAPSHOT.reportId;
const RECON = DEMO_SNAPSHOT.reconciliation;

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-hairline py-1.5 last:border-0">
      <span className={strong ? "text-ink" : "text-ink-muted"}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-semibold text-ink" : "text-ink"}`}>{value}</span>
    </div>
  );
}

export function SampleStatement() {
  return (
    <div className="relative overflow-hidden rounded-card border border-line-strong bg-paper shadow-card">
      {/* SAMPLE watermark */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="rotate-[-24deg] select-none font-display text-[6rem] font-semibold uppercase tracking-widest text-ink/[0.04] sm:text-[8rem]">
          Sample
        </span>
      </div>

      <div className="relative px-7 py-7 sm:px-9 sm:py-9">
        {/* Letterhead */}
        <div className="flex items-baseline justify-between border-b-2 border-ink pb-3">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Missed-Revenue Statement
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink">Sample PI Firm</p>
          </div>
          <p className="text-right text-xs text-faint">
            June 2026
            <br />
            {REPORT_ID}
          </p>
        </div>

        {/* Page-one opening — derived from the composed model (strong flags only) */}
        <p className="mt-5 max-w-[56ch] font-display text-[1.35rem] leading-snug text-ink">
          We flagged <span className="text-accent">{STRONG_COUNT}</span> strong signable cases that
          walked last month, worth an estimated <span className="text-accent">{HEADLINE_RANGE}</span>{" "}
          in fees.{" "}
          <span className="text-ink-muted">
            {RECOVERABLE_COUNT} still look recoverable today.
          </span>
        </p>

        {/* Headline figure at risk */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="rounded-base border border-hairline bg-canvas px-4 py-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted">
              Estimated fee value at risk
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-alert">
              {HEADLINE_RANGE}
            </p>
            <p className="mt-1 text-xs text-faint">Conservative range, low end quoted first.</p>
          </div>
          <div className="rounded-base border border-hairline bg-canvas px-4 py-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted">
              Every call accounted for
            </p>
            <div className="mt-1 text-sm">
              <Row label="Received" value={String(RECON.received)} />
              <Row label="Processed" value={String(RECON.processed)} />
              <Row label="Excluded" value={String(RECON.excluded)} />
              <Row label="Could not process" value={String(RECON.failed)} strong />
            </div>
          </div>
        </div>

        {/* Saved-Case Ledger */}
        <p className="mt-6 text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted">
          Saved-Case Ledger
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[440px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line-strong text-xs uppercase tracking-wide text-faint">
                <th className="py-1.5 pr-3 font-semibold">Caller</th>
                <th className="py-1.5 pr-3 font-semibold">Case type</th>
                <th className="py-1.5 pr-3 text-center font-semibold">Tier</th>
                <th className="py-1.5 pr-3 text-right font-semibold">Est. fee</th>
                <th className="py-1.5 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {LEDGER.map((r) => (
                <tr key={r.key} className="border-b border-hairline">
                  <td className="py-1.5 pr-3 tabular-nums text-ink">{r.initials}</td>
                  <td className="py-1.5 pr-3 text-ink-muted">{r.type}</td>
                  <td className="py-1.5 pr-3 text-center tabular-nums text-ink">{r.tier}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-ink">{r.fee}</td>
                  <td
                    className={`py-1.5 text-right font-medium ${
                      r.won ? "text-accent" : "text-ink-muted"
                    }`}
                  >
                    {r.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signature + narrow attestation */}
        <div className="mt-6 border-t border-hairline pt-4">
          <p className="max-w-[64ch] text-xs leading-relaxed text-faint">{GOLD_ATTESTATION}</p>
          <p className="mt-3 font-display text-sm font-semibold text-ink">Ali F. Ansari</p>
          <p className="text-xs text-ink-muted">Analyst of Record · Plaintiff Ops LLC</p>
        </div>
      </div>
    </div>
  );
}
