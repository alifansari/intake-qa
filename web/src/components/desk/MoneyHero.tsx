// The hero number — the one thing a PI attorney logs in to see, and the answer
// to "where's the value?". Research is unanimous: lead with ONE money figure,
// rendered as the largest element on the page, everything else de-emphasized
// (information overload is the #1 dashboard failure). The design system reserves
// muted red for exactly one thing — the leaking-$ figure — so the fees on the
// table wear it; won-back wears emerald.
//
// HONESTY (compliance-invariants §IV): the on-the-table figure is an ESTIMATE
// with a stated method (the ¹ footnote the page already carries), never a
// guarantee. When we have no sourced fee rows we show the COUNT only and never
// fabricate a dollar amount. Won-back is a count of cases the firm itself marked
// signed — a real logged outcome, not a promised recovery.

import { fmtBigRange } from "@/lib/desk/money.mjs";

type Tally = { lowCents: number; highCents: number; count: number; valued: number };

export function MoneyHero({
  onTheTable,
  wonBack,
  callsReceived,
  isSample = false,
}: {
  onTheTable: Tally;
  wonBack: Tally;
  callsReceived: number;
  isSample?: boolean;
}) {
  const hasLeak = onTheTable.count > 0;
  const leakHasDollars = hasLeak && onTheTable.highCents > 0;
  const wonHasDollars = wonBack.count > 0 && wonBack.highCents > 0;

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
          {leakHasDollars ? (
            <p className="mt-1 font-display text-[2rem] font-semibold leading-[1.05] text-alert tnum sm:text-5xl md:text-6xl">
              {fmtBigRange(onTheTable.lowCents, onTheTable.highCents)}
              <sup className="align-super text-lg sm:text-2xl">1</sup>
            </p>
          ) : (
            <p className="mt-1 font-display text-3xl font-semibold leading-[1.05] text-alert tnum sm:text-5xl">
              {onTheTable.count} signable {onTheTable.count === 1 ? "caller" : "callers"}
            </p>
          )}
          <p className="mt-3 max-w-[60ch] text-[15px] text-ink">
            {leakHasDollars ? (
              <>
                Estimated fees from{" "}
                <strong className="font-semibold">
                  {onTheTable.count} signable {onTheTable.count === 1 ? "caller" : "callers"}
                </strong>{" "}
                your team hasn&apos;t signed yet.
              </>
            ) : (
              <>Signable callers your team hasn&apos;t signed yet.</>
            )}{" "}
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
              ? "Every signable caller we've found is signed, in progress, or accounted for. New misses show up here the same day we read the call."
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
            {wonHasDollars ? (
              <>
                {" "}
                — an estimated{" "}
                <span className="font-semibold text-ink tnum">
                  {fmtBigRange(wonBack.lowCents, wonBack.highCents)}
                </span>
                <sup>1</sup> in fees
              </>
            ) : null}
          </span>
        </div>
      ) : null}
    </section>
  );
}
