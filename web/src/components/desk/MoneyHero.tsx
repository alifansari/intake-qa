// The hero — the first thing a PI attorney sees on the rear-view page, and the
// answer to "where’s the value?". Research is unanimous: lead with ONE big figure,
// everything else de-emphasized (information overload is the #1 dashboard failure).
//
// B-022 (2026-07-20): the big figure is now the COUNT of signable callers on the
// table, NOT an estimated dollar. A $ figure on cases that haven’t signed reads as
// inflated vendor math (attorney’s-eyes teardown) and §IV prefers tiers/counts to
// point-ish estimates. A quiet value-tier line ("2 high-value · 3 standard") gives
// the prioritization the dollar used to. The real dollar lives only in the Ledger
// (the firm’s own average fee). Won-back is a COUNT of cases the firm itself marked
// signed — a real logged outcome, never a promised recovery, and no fee estimate.

type Tally = { lowCents: number; highCents: number; count: number; valued: number };
type Tiers = { high: number; standard: number; modest: number };

export function MoneyHero({
  onTheTable,
  wonBack,
  callsReceived,
  isSample = false,
  tiers,
}: {
  onTheTable: Tally;
  wonBack: Tally;
  callsReceived: number;
  isSample?: boolean;
  tiers?: Tiers;
}) {
  const hasLeak = onTheTable.count > 0;
  // A quiet, honest value-tier line in place of the old dollar hero. Only the
  // tiers actually present are shown; when nothing is valued it’s simply absent.
  const tierParts = tiers
    ? [
        tiers.high ? `${tiers.high} high-value` : null,
        tiers.standard ? `${tiers.standard} standard-value` : null,
        tiers.modest ? `${tiers.modest} modest-value` : null,
      ].filter(Boolean)
    : [];

  return (
    <section
      className="iq-fade-up rounded-card border border-hairline bg-surface p-6 shadow-card sm:p-8"
      aria-label="What your intake is worth right now"
    >
      {isSample ? (
        <span className="mb-4 inline-flex items-center gap-2 rounded-pill bg-navy-tint px-3 py-1 text-xs font-semibold text-navy">
          Sample — this is what your desk looks like once your calls are flowing
        </span>
      ) : null}

      {hasLeak ? (
        <>
          <p className="eyebrow text-alert">On the table right now</p>
          <p className="mt-1 font-display text-3xl font-semibold leading-[1.05] text-alert tnum sm:text-5xl">
            {onTheTable.count} signable {onTheTable.count === 1 ? "caller" : "callers"}
          </p>
          <p className="mt-3 max-w-[60ch] text-[15px] text-ink">
            Signable callers your team hasn’t signed yet.
            {tierParts.length ? (
              <>
                {" "}
                <span className="text-ink-muted">({tierParts.join(" · ")})</span>
              </>
            ) : null}{" "}
            The whole job today: call them back below.
          </p>
        </>
      ) : (
        <>
          <p className="eyebrow text-accent">Nothing on the table</p>
          <p className="mt-1 font-display text-4xl font-semibold leading-none text-accent tnum sm:text-5xl">
            All clear
          </p>
          <p className="mt-3 max-w-[60ch] text-[15px] text-ink">
            {callsReceived > 0
              ? "Every signable caller we’ve found is signed, in progress, or accounted for. New misses show up here the same day we read the call."
              : "Once your calls are flowing, anything your team lets slip shows up here the same day — with the fees it was worth."}
          </p>
        </>
      )}

      {wonBack.count > 0 ? (
        <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-hairline pt-4">
          <span className="text-lg font-semibold text-accent tnum">
            ✓ {wonBack.count} won back
          </span>
          <span className="text-sm text-ink-muted">
            signable {wonBack.count === 1 ? "case" : "cases"} your team called back and signed
          </span>
        </div>
      ) : null}
    </section>
  );
}
