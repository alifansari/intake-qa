// Four stats in a row, each with a named source caption. Figures use tabular
// numerals. Reusable — pass the stats in.

export type Stat = { value: string; label: string; source: string };

export function StatBar({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-card border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-2 bg-surface p-6">
          <span className="tnum font-display text-3xl font-semibold leading-none text-ink">
            {s.value}
          </span>
          <span className="text-sm font-medium text-ink">{s.label}</span>
          <span className="mt-auto text-xs text-faint">{s.source}</span>
        </div>
      ))}
    </div>
  );
}
