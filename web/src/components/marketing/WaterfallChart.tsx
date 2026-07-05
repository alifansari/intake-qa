// Recovery waterfall: flagged → called back → reached → signed, with the dollar
// value falling away at each drop-off. Emerald = what survives to signed; gray =
// context; muted red = the leaked dollars lost at each step. Illustrative default
// figures; pass your own via props.

type Step = { label: string; count: number; dollars: number };

const DEFAULT_STEPS: Step[] = [
  { label: "Flagged signable", count: 40, dollars: 360000 },
  { label: "Called back", count: 22, dollars: 198000 },
  { label: "Reached", count: 14, dollars: 126000 },
  { label: "Signed", count: 9, dollars: 81000 },
];

const usd = (n: number) => "$" + n.toLocaleString("en-US");

export function WaterfallChart({ steps = DEFAULT_STEPS }: { steps?: Step[] }) {
  const max = steps[0]?.dollars || 1;
  return (
    <figure className="rounded-card border border-hairline bg-surface p-6">
      <div className="flex flex-col gap-3">
        {steps.map((s, i) => {
          const prev = i === 0 ? s.dollars : steps[i - 1].dollars;
          const lost = prev - s.dollars;
          return (
            <div key={s.label} className="flex items-center gap-3">
              <span className="w-32 flex-none text-xs text-ink-muted">{s.label}</span>
              <div className="h-7 flex-1 rounded-base bg-canvas">
                <div
                  className="flex h-7 items-center justify-end rounded-base bg-accent pr-2"
                  style={{ width: `${Math.max(6, (s.dollars / max) * 100)}%` }}
                >
                  <span className="tnum text-xs font-semibold text-white">{usd(s.dollars)}</span>
                </div>
              </div>
              <span className="tnum w-24 flex-none text-right text-xs text-alert">
                {lost > 0 ? `−${usd(lost)}` : ""}
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-4 text-xs text-faint">
        Illustrative: fee value surviving each step from flagged to signed. The red figures are the
        recoverable fees that leak at each drop-off — where Intake QA intervenes.
      </figcaption>
    </figure>
  );
}
