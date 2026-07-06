// "Do nothing | Generic answering service | AI intake bot | Intake QA" across
// real capabilities. Scrolls horizontally on small screens.

const COLS = ["Answering service", "AI receptionist", "Marketing agency", "Intake QA"];

// Competitors legitimately get checkmarks for what they actually do in 2026
// (answer live, score/summarize at capture, report on their own leads). Intake
// QA's differentiated rows are independence, full-population/all-channel scoring,
// outcome reconciliation, and forensic recovery.
// rows: [capability, [answeringService, aiReceptionist, agency, intakeQA]]
const ROWS: [string, [boolean, boolean, boolean, boolean]][] = [
  ["Answers / handles the call live", [true, true, false, false]],
  ["Scores or summarizes the calls it handled", [false, true, false, false]],
  ["Reports on the leads it sold you", [false, false, true, false]],
  ["Scores 100% of calls across every channel", [false, false, false, true]],
  ["Reconciles calls against signed fee agreements", [false, false, false, true]],
  ["Independent, paid the same flat fee regardless of findings", [false, false, false, true]],
  ["Recovers already-paid-for PNCs with live statutes", [false, false, false, true]],
];

function Cell({ on, highlight }: { on: boolean; highlight: boolean }) {
  return (
    <td className={`px-4 py-3 text-center ${highlight ? "bg-accent-tint/50" : ""}`}>
      {on ? (
        <span className="text-accent" aria-label="yes">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
      ) : (
        <span className="text-faint" aria-label="no">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className="inline">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </span>
      )}
    </td>
  );
}

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-card border border-hairline">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-hairline bg-canvas">
            <th className="px-4 py-3 text-left font-medium text-ink-muted">Capability</th>
            {COLS.map((c, i) => (
              <th
                key={c}
                className={`px-4 py-3 text-center font-semibold ${
                  i === 3 ? "bg-accent-tint text-ink" : "text-ink-muted"
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([cap, cells]) => (
            <tr key={cap} className="border-b border-hairline last:border-0">
              <td className="px-4 py-3 text-ink">{cap}</td>
              {cells.map((on, i) => (
                <Cell key={i} on={on} highlight={i === 3} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
