import { getReconciledCalls } from "@/lib/data";
import { recoveredFees } from "@/lib/metrics";
import { PageShell } from "@/components/page";
import { PrintButton } from "@/components/print-button";
import { Annotation } from "@/components/demo-mode";
import { money } from "@/lib/format";
import { GOLD_ATTESTATION, GOLD_RIGHT_OF_REPLY } from "@/lib/site-constants";

// A printable one-page "Monthly Reconciliation Statement" styled like a bank
// statement of intake: fees at risk, fees recovered, net leakage. The
// bank-statement metaphor lands with firm owners.
export default async function StatementPage() {
  const rows = await getReconciledCalls();

  // Most recent 30 days as the "statement period".
  const now = Date.now();
  const period = rows.filter(
    (r) => now - new Date(r.meta.received_at).getTime() <= 30 * 86400_000,
  );

  const flagged = period.filter((r) => r.flagged);
  const openedAtRisk = flagged.reduce((s, r) => s + r.feeAtRisk, 0);
  const fees = recoveredFees(period);
  const walked = flagged
    .filter((r) => r.verdict === "correct_flag")
    .reduce((s, r) => s + r.feeAtRisk, 0);
  const stillOpen = flagged
    .filter((r) => r.outcome.outcome_code === "still_open")
    .reduce((s, r) => s + r.feeAtRisk, 0);
  const openCount = flagged.filter((r) => r.outcome.outcome_code === "still_open").length;
  const netLeakage = walked;

  const lines: { label: string; detail: string; amount: number; tone: "red" | "green" | "ink" }[] = [
    {
      label: "Opening balance: fees at risk",
      detail: `${flagged.length} flagged lost-signable calls this period`,
      amount: openedAtRisk,
      tone: "ink",
    },
    {
      label: "Recovered: signed with us after callback",
      detail: `${fees.conservativeCount} calls, within 14 days`,
      amount: -fees.conservative,
      tone: "green",
    },
    {
      label: "Walked: signed elsewhere",
      detail: "flagged, not called back in time",
      amount: walked,
      tone: "red",
    },
    {
      label: "Unresolved: still open",
      detail: "recoverable if worked now",
      amount: stillOpen,
      tone: "ink",
    },
  ];

  const periodLabel = new Date(now).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <PageShell className="max-w-3xl">
      <Annotation>
        Hand this to a firm owner. It reframes intake QA as money in and money out, the
        language they already think in.
      </Annotation>

      <div className="bg-paper print-plain border border-line shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        {/* Statement header */}
        <div className="flex items-start justify-between border-b-2 border-ink px-8 py-6">
          <div>
            <div className="font-display text-xl font-bold">Intake QA</div>
            <div className="mt-0.5 text-xs uppercase tracking-widest text-muted">
              Missed-Revenue Statement
            </div>
          </div>
          <div className="text-right text-xs text-muted">
            <div className="font-medium text-ink">Statement period</div>
            <div>{periodLabel}</div>
            <div className="mt-1">{period.length} intake calls scored</div>
          </div>
        </div>

        {/* Page-one opening (Gold iv) */}
        <div className="border-b border-line px-8 py-5">
          <p className="max-w-[60ch] font-display text-lg leading-snug text-ink">
            Your firm recovered <span className="text-green">{fees.conservativeCount}</span> signable
            cases this period, worth an estimated{" "}
            <span className="text-green">{money(fees.conservative)}</span> in fees.{" "}
            <span className="text-muted">
              {openCount} more were flagged and are still open.
            </span>
          </p>
        </div>

        {/* Ledger */}
        <div className="px-8 py-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left">
                <th className="eyebrow py-2">Activity</th>
                <th className="eyebrow py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.label} className="border-b border-line">
                  <td className="py-3">
                    <div className="text-ink">{l.label}</div>
                    <div className="text-xs text-muted">{l.detail}</div>
                  </td>
                  <td
                    className={`py-3 text-right tnum font-semibold ${
                      l.tone === "red" ? "text-red" : l.tone === "green" ? "text-green" : "text-ink"
                    }`}
                  >
                    {l.amount < 0 ? `(${money(-l.amount)})` : money(l.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink">
                <td className="py-3">
                  <div className="font-display text-base font-bold">Net leakage this period</div>
                  <div className="text-xs text-muted">
                    fees that walked out the door for good
                  </div>
                </td>
                <td className="py-3 text-right font-display text-2xl font-bold tnum text-red">
                  {money(netLeakage)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-4 text-center">
            <div>
              <div className="eyebrow">Recovered</div>
              <div className="font-display text-lg font-semibold tnum text-green">
                {money(fees.conservative)}
              </div>
            </div>
            <div>
              <div className="eyebrow">Still recoverable</div>
              <div className="font-display text-lg font-semibold tnum text-navy">
                {money(stillOpen)}
              </div>
            </div>
            <div>
              <div className="eyebrow">Walked</div>
              <div className="font-display text-lg font-semibold tnum text-red">
                {money(walked)}
              </div>
            </div>
          </div>
        </div>

        {/* Right of Reply + narrow attestation + signature */}
        <div className="space-y-4 border-t border-line px-8 py-6">
          <div>
            <div className="eyebrow">Right of reply</div>
            <p className="mt-1 max-w-[70ch] text-xs leading-relaxed text-muted">{GOLD_RIGHT_OF_REPLY}</p>
          </div>
          <div>
            <div className="eyebrow">Attestation</div>
            <p className="mt-1 max-w-[70ch] text-xs leading-relaxed text-muted">{GOLD_ATTESTATION}</p>
          </div>
          <div className="pt-1">
            <div className="font-display text-sm font-semibold text-ink">Ali F. Ansari</div>
            <div className="text-xs text-muted">Analyst of Record · Plaintiff Ops LLC</div>
          </div>
        </div>

        <div className="border-t border-line px-8 py-3 text-center text-[11px] text-faint">
          Reconciled against confirmed outcomes · conservative recovery basis · a service of Plaintiff Ops LLC
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <PrintButton label="Print statement" />
      </div>
    </PageShell>
  );
}
