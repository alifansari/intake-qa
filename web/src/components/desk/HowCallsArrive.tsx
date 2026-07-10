// The integration story, answered before anyone asks. Shown on the desk's
// first-run/empty states and in Settings. The message that matters: NOTHING
// about the firm's existing workflow changes — intake staff keep answering
// calls exactly as they do today; the desk works from recordings that already
// exist. Three ways in, all of them "we handle it."
const PATHS = [
  {
    title: "Your phone system connects once",
    body:
      "If you use CallRail (or any system that records calls), we connect it on a 15-minute setup call and every new call flows in automatically from then on. Nobody at your firm touches anything again.",
  },
  {
    title: "Or just send us recordings",
    body:
      "No connectable phone system? Upload or email call recordings whenever it suits you — end of day, end of week. Any audio format works.",
  },
  {
    title: "Or we do the whole thing",
    body:
      "White-glove setup is included: tell us what your firm uses and we make it work, including your answering service or AI receptionist. You approve; we wire it.",
  },
];

export function HowCallsArrive() {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-ink">How your calls get here</h2>
      <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
        Your team changes nothing about how they answer the phone. The desk reads the recordings
        your firm already makes — that&apos;s the whole integration.
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {PATHS.map((p, i) => (
          <li key={p.title} className="rounded-card border border-hairline bg-canvas p-4">
            <span className="tnum font-display text-lg font-semibold text-accent">{i + 1}</span>
            <p className="mt-1 font-display text-sm font-semibold text-ink">{p.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{p.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-faint">
        To set any of these up, email{" "}
        <a href="mailto:ali@plaintiffops.com" className="font-medium text-accent hover:text-accent-hover">
          ali@plaintiffops.com
        </a>{" "}
        — setup is included and usually done the same day.
      </p>
    </div>
  );
}
