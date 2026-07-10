import { notFound } from "next/navigation";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { loadLedger, isLedgerConfigured } from "@/lib/ledger/store";
import { plainTrigger } from "@/lib/intake/plain-labels";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

function money(n: number | null | undefined): string {
  return n == null ? "—" : `$${Number(n).toLocaleString("en-US")}`;
}

const inputClass =
  "rounded-sm border border-line-strong bg-paper px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none";

// The Ledger (Phase 6) — the monthly one-page receipt, bank-statement styled,
// printable. Founder-only for now (demo-scope data). Conservative by
// construction: dollar lines exist only when the FIRM's average case fee is
// entered in the control bar (round-trips as ?fee= so URLs stay shareable),
// misses are printed, and every number lists its underlying record count
// (internal refs tucked behind a details toggle). Conversion column reads
// manual dispositions until the CRM read-back exists (Phase 7 gate).
export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; fee?: string }>;
}) {
  if (!isStudioConfigured()) return notFound();
  await requireFounderPage();
  const params = await searchParams;
  const period = params.period ?? new Date().toISOString().slice(0, 7);
  const fee = params.fee ? Number(params.fee) : null;

  if (!isLedgerConfigured()) {
    return (
      <div className="mx-auto max-w-[8.5in] px-8 py-10 text-sm text-muted">
        The Ledger needs DATABASE_URL configured.
      </div>
    );
  }
  const ledger = await loadLedger(period, null, { average_case_fee: fee });

  const Row = ({
    label,
    value,
    ids,
    accent,
  }: {
    label: string;
    value: string | number;
    ids?: string[];
    accent?: boolean;
  }) => (
    <div className="flex items-start justify-between border-t border-hairline py-1.5 text-[12px]">
      <span className="text-muted">{label}</span>
      <span className="text-right">
        <span className={`tnum font-medium ${accent ? "text-red" : "text-ink"}`}>{value}</span>
        {ids && ids.length > 0 ? (
          <details className="no-print inline-block align-top">
            <summary className="ml-2 cursor-pointer text-[10px] text-accent underline">
              details
            </summary>
            <div className="mt-1 max-w-[40ch] text-left text-[10px] text-faint">
              {ids.length} underlying record{ids.length === 1 ? "" : "s"}{" "}
              <span className="break-all font-mono text-[9px] text-faint">
                (internal refs: {ids.map((id) => id.slice(0, 8)).join(", ")})
              </span>
            </div>
          </details>
        ) : null}
      </span>
    </div>
  );

  return (
    <div className="ledger-wrap mx-auto max-w-[8.5in] bg-paper px-[0.75in] py-[0.6in] text-ink">
      <style>{`
        @page { size: letter; margin: 0.5in; }
        @media print {
          .no-print { display: none !important; }
          .ledger-wrap { padding: 0 !important; max-width: none !important; }
          html, body { background: #fff !important; }
        }
        .rule { border-bottom: 1px solid var(--color-line-strong); }
      `}</style>

      {/* Control bar — a plain GET form so the page stays a server component
          and the resulting URL stays shareable. Hidden when printing. */}
      <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-hairline pb-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[11px] text-muted">
            Month
            <input type="month" name="period" defaultValue={period} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted">
            Firm&apos;s own average case fee — used only to print dollar lines
            <input
              type="number"
              name="fee"
              min={0}
              placeholder="Average case fee (optional)"
              defaultValue={params.fee ?? ""}
              className={`${inputClass} w-56 tnum`}
            />
          </label>
          <button
            type="submit"
            className="rounded-sm border border-line-strong bg-paper px-3 py-1 text-xs font-medium text-ink hover:border-accent hover:text-accent"
          >
            Update
          </button>
        </form>
        <PrintButton label="Save as PDF" />
      </div>

      {/* Header */}
      <header className="rule pb-3">
        <div className="eyebrow no-print mb-1 text-faint">Intake QA · Studio</div>
        <div className="eyebrow">Intake Ledger — Monthly Receipt</div>
        <h1 className="font-display text-[24px] font-bold leading-tight">{ledger.period}</h1>
        <p className="mt-1 text-[11px] text-muted">
          Every line below is drillable to its underlying records. Misses are printed, not
          hidden. Dollar lines appear only when the firm supplies its own average case fee.
        </p>
      </header>

      {/* Headline */}
      <section className="rule py-3">
        <div className="eyebrow">Caught leads</div>
        <div className="tnum text-4xl font-bold leading-none">
          {ledger.dollars ? money(ledger.dollars.caught_leads_value) : ledger.product.caught}
          <span className="ml-3 text-lg font-normal text-muted">
            {ledger.dollars
              ? `across ${ledger.product.caught} leads`
              : "leads booked or escalated (set your average case fee to see the dollar figure)"}
          </span>
        </div>
        {ledger.dollars ? (
          <p className="mt-1 text-[10px] text-faint">Inputs: {ledger.dollars.inputs_note}.</p>
        ) : null}
      </section>

      {/* Product column vs firm column */}
      <section className="rule grid grid-cols-1 gap-6 py-3 sm:grid-cols-2">
        <div>
          <div className="eyebrow mb-1">What the desk did (product)</div>
          <Row label="Leads captured" value={ledger.product.captured} ids={ledger.product.captured_ids} />
          <Row
            label="…including chats the visitor abandoned (still captured)"
            value={ledger.product.abandoned_but_captured}
            ids={ledger.product.abandoned_ids}
          />
          <Row label="Booked" value={ledger.product.by_bucket.book} ids={ledger.product.bucket_ids.book} />
          <Row label="Escalated" value={ledger.product.by_bucket.escalate} ids={ledger.product.bucket_ids.escalate} />
          <Row label="Human handoff" value={ledger.product.by_bucket.human_handoff} ids={ledger.product.bucket_ids.human_handoff} />
          <Row label="Declined (by design)" value={ledger.product.by_bucket.decline} ids={ledger.product.bucket_ids.decline} />
          <Row label="Time saved (est.)" value={`${Math.round(ledger.time_saved_minutes / 60 * 10) / 10}h`} />
        </div>
        <div>
          <div className="eyebrow mb-1">What the firm did (conversion)</div>
          <Row label="Converted / signed" value={ledger.firm.converted} ids={ledger.firm.converted_escalation_ids} />
          <p className="mt-2 text-[10px] text-faint">
            {ledger.firm.source === "manual_dispositions"
              ? "Signed-case counts come from your own marks for now — automatic CRM read-back isn't connected yet, so this line undercounts."
              : "Source: CRM read-back."}
          </p>
        </div>
      </section>

      {/* Catastrophic catch log */}
      <section className="rule py-3">
        <div className="eyebrow mb-1">Catastrophic-catch log (hot escalations)</div>
        {ledger.catastrophic.length === 0 ? (
          <p className="text-[12px] text-muted">None this period.</p>
        ) : (
          <ul className="text-[11px] tnum">
            {ledger.catastrophic.map((c: { id: string; trigger: string; fired_at: string }) => (
              <li key={c.id} className="border-t border-hairline py-1">
                {new Date(c.fired_at).toLocaleDateString("en-US")} — {plainTrigger(c.trigger)}{" "}
                <span className="font-mono text-[9px] text-faint">({c.id.slice(0, 8)})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* SLA including misses */}
      <section className="rule py-3">
        <div className="eyebrow mb-1">Escalation SLA — including misses</div>
        <Row label="Escalations fired" value={ledger.sla.fired} />
        <Row label="Acknowledged by a named person" value={ledger.sla.acked} />
        <Row label="Median time to ack" value={ledger.sla.median_ack_minutes != null ? `${ledger.sla.median_ack_minutes}m` : "—"} />
        <Row label="Worst time to ack" value={ledger.sla.worst_ack_minutes != null ? `${ledger.sla.worst_ack_minutes}m` : "—"} />
        <Row
          label="Missed by us — nobody claimed in time (counted against us)"
          value={ledger.sla.unclaimed}
          ids={ledger.sla.unclaimed_ids}
          accent={ledger.sla.unclaimed > 0}
        />
      </section>

      {/* Tuning summary */}
      <section className="rule py-3">
        <div className="eyebrow mb-1">Tuning</div>
        <Row label="Proposals open" value={ledger.tuning.proposed} />
        <Row label="Approved (named)" value={ledger.tuning.approved} />
        <Row label="Rejected" value={ledger.tuning.rejected} />
      </section>

      <footer className="pt-3 text-[10px] leading-relaxed text-muted">
        <p>
          Conservative by construction: the caught-leads value uses only the firm&apos;s own
          stated average case fee; no value is invented. Counts reflect what the intake desk
          captured, routed, and escalated; whether a lead converts is the firm&apos;s work and
          is reported separately. Figures are estimates with stated inputs, not guarantees.
        </p>
      </footer>
    </div>
  );
}
