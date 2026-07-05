// Sign rate by intake-score band: 24% / 53% / 74% / 82%. Horizontal bars, direct
// end labels, tabular numerals, no gridlines (max data-ink).

const BANDS = [
  { band: "0–39", rate: 24 },
  { band: "40–59", rate: 53 },
  { band: "60–79", rate: 74 },
  { band: "80–100", rate: 82 },
];

export function ScoreBandChart() {
  return (
    <figure className="rounded-card border border-hairline bg-surface p-6">
      <div className="flex flex-col gap-3">
        {BANDS.map((b) => (
          <div key={b.band} className="flex items-center gap-3">
            <span className="tnum w-16 flex-none text-right text-xs text-ink-muted">{b.band}</span>
            <div className="h-6 flex-1 rounded-base bg-canvas">
              <div
                className="flex h-6 items-center justify-end rounded-base bg-accent pr-2"
                style={{ width: `${b.rate}%` }}
              >
                <span className="tnum text-xs font-semibold text-white">{b.rate}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <figcaption className="mt-4 text-xs text-faint">
        Sign rate by intake-score band — higher scores sign far more often (Intake QA calibrated
        data). If the score predicts reality, the bars climb. They do.
      </figcaption>
    </figure>
  );
}
