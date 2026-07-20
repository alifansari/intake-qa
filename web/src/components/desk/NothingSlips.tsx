// The safety-net header for the live desk (B-026) — the "nothing slips" certainty
// panel that targets the one thing a PI attorney actually loses sleep over: a
// filing deadline going by unnoticed. It makes TWO honest proofs over data that
// already exists, and it deliberately surfaces the GAPS — because a safety net
// that hides its holes isn't one:
//   1. COVERAGE — every recorded call is accounted for (getCallReconciliation),
//      and the ones we couldn't read automatically are shown, not buried.
//   2. DEADLINE WATCH — every open case you've triaged carries a filing-deadline
//      clock (analysis/sol.mjs), and the ones with NO clock yet (no incident date
//      captured) are called out as the thing to fix.
//
// Compliance: NO guarantee is made (§IV). The SOL figures are ESTIMATES the
// attorney must independently verify — the disclaimer is always shown — and the
// watch only covers cases the firm has actually triaged. Copy is descriptive of
// what the system does, never a promise that nothing will ever be missed (§V).

type Coverage = { read: number; processing: number; failed: number };
type Deadlines = {
  openTotal: number;
  withClock: number;
  expired: number;
  critical: number;
  soon: number;
  noClock: number;
};

function Stat({
  tone,
  children,
}: {
  tone: "good" | "warn" | "bad" | "muted";
  children: React.ReactNode;
}) {
  const cls =
    tone === "bad"
      ? "text-red"
      : tone === "warn"
        ? "text-amber"
        : tone === "good"
          ? "text-accent"
          : "text-ink-muted";
  return <span className={`font-semibold ${cls}`}>{children}</span>;
}

export function NothingSlips({
  coverage,
  deadlines,
  disclaimer,
}: {
  coverage: Coverage | null;
  deadlines: Deadlines;
  disclaimer: string;
}) {
  const d = deadlines;
  const anyDeadlinePressure = d.expired > 0 || d.critical > 0 || d.soon > 0;

  return (
    <section
      className="rounded-card border border-hairline bg-surface p-5 shadow-card"
      aria-label="Coverage and filing-deadline watch"
    >
      <p className="eyebrow">The safety net</p>
      <p className="mt-1 max-w-[75ch] text-sm text-ink-muted">
        Every recorded call gets read; every case you triage gets a filing-deadline clock. Anything
        we couldn’t read, and any case with no clock yet, shows up right here — so it doesn’t wait in
        the dark.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* COVERAGE — every recorded call accounted for. */}
        <div className="rounded-base border border-hairline bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">Every call read</p>
          {coverage && coverage.read > 0 ? (
            <>
              <p className="mt-1 text-sm text-ink">
                <Stat tone="good">{coverage.read}</Stat> call{coverage.read === 1 ? "" : "s"} read
                {coverage.processing === 0 && coverage.failed === 0 ? (
                  <> — all accounted for.</>
                ) : (
                  <>.</>
                )}
              </p>
              {coverage.processing > 0 ? (
                <p className="mt-1 text-xs text-ink-muted">
                  <Stat tone="muted">{coverage.processing}</Stat> still being read — anything that
                  needs a callback appears in the queue as soon as it’s done.
                </p>
              ) : null}
              {coverage.failed > 0 ? (
                <p className="mt-1 text-xs">
                  <span className="inline-block rounded-pill bg-amber-tint px-2 py-0.5 font-semibold text-amber">
                    {coverage.failed} we couldn’t read automatically
                  </span>{" "}
                  <span className="text-ink-muted">— we’ve been notified and are on it.</span>
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">
              Recorded-call coverage begins the moment your calls connect. Until then, everything you
              triage below is watched here.
            </p>
          )}
        </div>

        {/* DEADLINE WATCH — every open case carries a filing clock. */}
        <div className="rounded-base border border-hairline bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">
            Every filing clock watched
          </p>
          {d.openTotal > 0 ? (
            <>
              <p className="mt-1 text-sm text-ink">
                <Stat tone="good">{d.withClock}</Stat> of {d.openTotal} open case
                {d.openTotal === 1 ? "" : "s"} carry a filing-deadline clock.
              </p>
              {anyDeadlinePressure ? (
                <p className="mt-1 text-xs">
                  {d.expired > 0 ? (
                    <span className="mr-2 inline-block rounded-pill bg-red-tint px-2 py-0.5 font-semibold text-red">
                      {d.expired} past deadline
                    </span>
                  ) : null}
                  {d.critical > 0 ? (
                    <span className="mr-2 inline-block rounded-pill bg-red-tint px-2 py-0.5 font-semibold text-red">
                      {d.critical} within 30 days
                    </span>
                  ) : null}
                  {d.soon > 0 ? (
                    <span className="mr-2 inline-block rounded-pill bg-amber-tint px-2 py-0.5 font-semibold text-amber">
                      {d.soon} within 90 days
                    </span>
                  ) : null}
                  <span className="text-ink-muted">— sorted to the top of the queue below.</span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-ink-muted">No deadline is near on your open cases.</p>
              )}
              {d.noClock > 0 ? (
                <p className="mt-2 text-xs">
                  <span className="inline-block rounded-pill bg-amber-tint px-2 py-0.5 font-semibold text-amber">
                    {d.noClock} open case{d.noClock === 1 ? "" : "s"} with no clock yet
                  </span>{" "}
                  <span className="text-ink-muted">
                    — capture the incident date so the deadline can run.
                  </span>
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">
              No open cases yet. Every case you triage below gets a filing-deadline clock the moment
              you enter the incident date.
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-faint">{disclaimer}</p>
    </section>
  );
}
