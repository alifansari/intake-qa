// Callback-speed decay: recovery sign rate collapses as callback time grows.
// Single emerald line over a faint gray reference. Points annotated 50/38/33/0.

const POINTS = [
  { t: "< 1 hr", rate: 50 },
  { t: "1–4 hr", rate: 38 },
  { t: "4–24 hr", rate: 33 },
  { t: "> 24 hr", rate: 0 },
];

const W = 520;
const H = 220;
const PAD = 36;

export function DecayCurve() {
  const n = POINTS.length;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (n - 1);
  const y = (r: number) => H - PAD - (r / 50) * (H - PAD * 2);
  const line = POINTS.map((p, i) => `${x(i)},${y(p.rate)}`).join(" ");

  return (
    <figure className="rounded-card border border-hairline bg-surface p-6">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Callback-speed decay curve" className="min-w-[420px]">
          {/* baseline only — no gridlines */}
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--color-hairline)" strokeWidth="1" />
          <polyline points={line} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" />
          {POINTS.map((p, i) => (
            <g key={p.t}>
              <circle cx={x(i)} cy={y(p.rate)} r={i === 0 ? 5 : 3.5} fill="var(--color-accent)" />
              <text x={x(i)} y={y(p.rate) - 12} textAnchor="middle" className="tnum" fontSize="13" fontWeight="600" fill="var(--color-ink)">
                {p.rate}%
              </text>
              <text x={x(i)} y={H - PAD + 18} textAnchor="middle" fontSize="11" fill="var(--color-ink-muted)">
                {p.t}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <figcaption className="mt-2 text-xs text-faint">
        Recovery sign rate vs. how fast you call a flagged lead back. Speed is the lever.
      </figcaption>
    </figure>
  );
}
