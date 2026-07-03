import { COLORS } from "@/lib/colors";

// Plain horizontal comparison bars (rep / case-type cuts). No charting library
// needed and no interactivity, so this stays a server component — which lets
// callers pass a formatter function without the client-boundary error.
export function CategoryBars({
  data,
  valueFormat = (v) => String(v),
  color = COLORS.navy,
}: {
  data: { label: string; value: number; sub?: string }[];
  valueFormat?: (v: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[130px_1fr_auto] items-center gap-3">
          <div className="truncate text-sm text-ink">{d.label}</div>
          <div className="h-4 overflow-hidden rounded-sm bg-canvas">
            <div
              className="h-full rounded-sm"
              style={{ width: `${(d.value / max) * 100}%`, background: color }}
            />
          </div>
          <div className="tnum w-24 text-right text-sm font-medium text-ink">
            {valueFormat(d.value)}
            {d.sub ? <span className="ml-1 text-xs text-muted">{d.sub}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
