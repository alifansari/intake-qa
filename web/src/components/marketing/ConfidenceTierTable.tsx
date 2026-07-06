import { CONFIDENCE_TIERS, CONFIDENCE_TIERS_NOTE } from "@/lib/site-constants";

// The five signability tiers, rendered once as a design object: ruled lines,
// tabular lining figures, right-aligned likelihood band, Tufte-minimal ink. Used
// on the calibration page and the annotated sample report.
export function ConfidenceTierTable({ note = true }: { note?: boolean }) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-ink text-xs uppercase tracking-wide text-ink-muted">
              <th className="py-2 pr-3 font-semibold">Tier</th>
              <th className="py-2 pr-3 font-semibold">What we call it</th>
              <th className="py-2 pr-3 font-semibold">What it means</th>
              <th className="py-2 text-right font-semibold">Likelihood</th>
            </tr>
          </thead>
          <tbody>
            {CONFIDENCE_TIERS.map((t) => (
              <tr key={t.tier} className="border-b border-hairline align-baseline">
                <td className="py-2.5 pr-3 tabular-nums font-semibold text-ink">{t.tier}</td>
                <td className="py-2.5 pr-3 font-semibold text-ink">{t.label}</td>
                <td className="py-2.5 pr-3 text-ink-muted">{t.definition}</td>
                <td className="py-2.5 text-right tabular-nums text-ink">{t.band}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note ? <p className="mt-3 max-w-[70ch] text-xs text-faint">{CONFIDENCE_TIERS_NOTE}</p> : null}
    </div>
  );
}
