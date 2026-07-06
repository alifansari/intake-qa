// The hero artifact: page one of a Missed-Revenue Statement, rendered as a design
// object (not an illustration). Warm paper, ruled reconciliation table, tabular
// lining figures, tier labels, redacted names, the narrow attestation, and a
// diagonal SAMPLE watermark. This is the "most credible document the partner has
// received," shown immediately. All figures are illustrative and clearly marked.

const LEDGER = [
  { initials: "J.R.", type: "Auto (rear-end)", tier: 5, fee: "$18,000", status: "Recovered" },
  { initials: "M.E.", type: "Slip and fall", tier: 4, fee: "$15,000", status: "Open" },
  { initials: "T.W.", type: "Dog bite", tier: 4, fee: "$9,000", status: "Recovered" },
  { initials: "R.K.", type: "Auto (rear-end)", tier: 3, fee: "$5,300", status: "Open" },
];

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
            SUNSET-2026-06
          </p>
        </div>

        {/* Page-one opening (Gold iv) */}
        <p className="mt-5 max-w-[54ch] font-display text-[1.35rem] leading-snug text-ink">
          Your firm recovered <span className="text-accent">2</span> signable cases last month,
          worth an estimated <span className="text-accent">$27,000</span> in fees.{" "}
          <span className="text-ink-muted">2 more were flagged and are still open.</span>
        </p>

        {/* Headline figure at risk */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="rounded-base border border-hairline bg-canvas px-4 py-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted">
              Estimated fee value at risk
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-alert">
              $47,300 to $92,000
            </p>
            <p className="mt-1 text-xs text-faint">Conservative range, low end quoted first.</p>
          </div>
          <div className="rounded-base border border-hairline bg-canvas px-4 py-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted">
              Every call accounted for
            </p>
            <div className="mt-1 text-sm">
              <Row label="Received" value="132" />
              <Row label="Processed" value="128" />
              <Row label="Excluded" value="3" />
              <Row label="Could not process" value="1" strong />
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
                <tr key={r.initials} className="border-b border-hairline">
                  <td className="py-1.5 pr-3 tabular-nums text-ink">{r.initials}</td>
                  <td className="py-1.5 pr-3 text-ink-muted">{r.type}</td>
                  <td className="py-1.5 pr-3 text-center tabular-nums text-ink">{r.tier}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-ink">{r.fee}</td>
                  <td
                    className={`py-1.5 text-right font-medium ${
                      r.status === "Recovered" ? "text-accent" : "text-ink-muted"
                    }`}
                  >
                    {r.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signature + narrow attestation */}
        <div className="mt-6 border-t border-hairline pt-4">
          <p className="max-w-[64ch] text-xs leading-relaxed text-faint">
            This is a record of the procedures we performed and the fidelity of the transcripts we
            reviewed. It is not an opinion on the value or legal merit of any case. Where we judge, we
            show the transcript moment behind the judgment so you can check it yourself.
          </p>
          <p className="mt-3 font-display text-sm font-semibold text-ink">Ali F. Ansari</p>
          <p className="text-xs text-ink-muted">Analyst of Record · Plaintiff Ops LLC</p>
        </div>
      </div>
    </div>
  );
}
