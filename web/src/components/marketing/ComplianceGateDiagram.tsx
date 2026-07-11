// The 7 compliance gates as a numbered vertical flow. Mirrors the ORDER enforced
// in messaging/send.mjs (frozen). Do not reorder without matching that file.

const GATES = [
  ["Human approval", "A person on your team approves every message before it can send."],
  ["Opt-out", "STOP / QUIT / REVOKE / OPT OUT / CANCEL / UNSUBSCRIBE / END (plus Spanish keywords) opt a number out instantly and permanently."],
  ["Global kill switch", "One switch halts all sending across every firm."],
  ["Per-firm autonomy lock", "A firm must be explicitly set to manual; no autonomous sending mode is enabled for any firm."],
  ["Per-firm kill switch", "Each firm can halt its own sending independently."],
  ["Quiet hours", "No messages 8:00pm to 8:00am in the recipient's local time."],
  ["Test mode", "Until A2P 10DLC is approved, sends are simulated and logged, never transmitted."],
];

export function ComplianceGateDiagram() {
  return (
    <ol className="flex flex-col gap-3">
      {GATES.map(([title, desc], i) => (
        <li key={title} className="flex gap-4 rounded-card border border-hairline bg-surface p-4">
          <span
            className="tnum flex h-7 w-7 flex-none items-center justify-center rounded-full bg-navy text-sm font-semibold text-white"
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="mt-0.5 text-sm text-ink-muted">{desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
