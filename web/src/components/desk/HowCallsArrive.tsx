// The integration story, answered before anyone asks. Shown on the desk’s
// first-run/empty states and in Settings. The message that matters: NOTHING
// about the firm’s existing workflow changes — intake staff keep answering
// calls exactly as they do today; the desk works from recordings that already
// exist. Three ways in, all of them "we handle it."
const PATHS: { title: string; body: string; cta?: { href: string; label: string } }[] = [
  {
    title: "Your phone system connects once",
    body:
      "If you use CallRail (or any system that records calls), we connect it on a 15-minute setup call and every new call flows in automatically from then on. Nobody at your firm touches anything again.",
  },
  {
    title: "Or upload recordings yourself",
    body:
      "No connectable phone system? Drag call recordings onto the upload page whenever it suits you — end of day, end of week. Each one is read and scored the same day, and you can watch its progress.",
    cta: { href: "/desk/upload", label: "Upload recordings now →" },
  },
  {
    title: "Or we do the whole thing",
    body:
      "White-glove setup is included: tell us what your firm uses and we make it work, including your answering service or AI receptionist. You approve; we wire it.",
  },
];

// The busy owner’s real move is DELEGATE, not do: one click forwards
// self-contained setup instructions (with the firm’s own call-feed address)
// to whoever actually runs the phones. The attorney never has to understand it.
export function ForwardToPhonePerson({ webhookUrl }: { webhookUrl: string }) {
  const subject = "Please connect our phones to Intake QA (5 minutes)";
  const body = [
    "Hi — can you set this up? It’s one paste and it’s done.",
    "",
    "If we use CallRail:",
    "1. Sign in to CallRail",
    "2. Settings → Integrations → Webhooks",
    "3. Add a Post-Call webhook with this exact address:",
    `   ${webhookUrl}`,
    "4. Save. That’s it — every call now flows automatically.",
    "",
    "If we use something else (answering service, different phone system):",
    "just reply to this email or contact ali@plaintiffops.com — they set it up",
    "with you directly, usually the same day, at no cost.",
    "",
    "Nothing about how we answer calls changes.",
  ].join("\n");
  return (
    <a
      href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
      className="inline-flex rounded-pill border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-tint"
    >
      Send these instructions to whoever runs your phones
    </a>
  );
}

export function HowCallsArrive() {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-ink">How your calls get here</h2>
      <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
        Your team changes nothing about how they answer the phone. The desk reads the recordings
        your firm already makes — that’s the whole integration.
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {PATHS.map((p, i) => (
          <li key={p.title} className="rounded-card border border-hairline bg-canvas p-4">
            <span className="tnum font-display text-lg font-semibold text-accent">{i + 1}</span>
            <p className="mt-1 font-display text-sm font-semibold text-ink">{p.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{p.body}</p>
            {p.cta ? (
              <a
                href={p.cta.href}
                className="mt-2 inline-block text-xs font-semibold text-accent hover:text-accent-hover"
              >
                {p.cta.label}
              </a>
            ) : null}
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
