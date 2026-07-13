// The lead product, shown as an artifact: a one-screen Recoverable-Lead Alert,
// rendered as an email mock. Perishable-lead framing, the exact transcript moment,
// a tier badge, one suggested next step, and the human-approval + not-a-legal-
// opinion guardrails. All figures illustrative; caller redacted.

export function SampleAlert() {
  return (
    <div className="overflow-hidden rounded-card border border-line-strong bg-paper shadow-card">
      {/* Email header */}
      <div className="border-b border-hairline bg-canvas px-5 py-3">
        <p className="text-xs text-faint">
          From: Ali, Intake QA &nbsp;·&nbsp; To: Sample PI Firm intake
        </p>
        <p className="mt-1 font-display text-base font-semibold text-ink">
          Signable case from today’s calls, call back within the hour
        </p>
      </div>

      {/* Body */}
      <div className="px-5 py-5 text-sm leading-relaxed text-ink">
        <p className="text-ink-muted">
          One call today scored as a signable case that didn’t convert, and lead value fades
          fast. Details and the exact transcript moment are below. Ali reviewed this flag before it
          reached you.
        </p>

        <div className="mt-4 rounded-base border border-hairline bg-canvas px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Caller #A-0142 · Auto (rear-end)
            </span>
            <span className="rounded-pill bg-accent-tint px-2.5 py-0.5 text-xs font-semibold text-accent">
              Tier 5 · Very likely signable
            </span>
          </div>
          <p className="mt-3 border-l-2 border-line-strong pl-3 font-display text-[0.95rem] italic text-ink">
            &ldquo;The other driver admitted it was his fault at the scene. Yeah, I definitely want to
            move forward with this.&rdquo;
          </p>
          <p className="mt-2 text-xs text-faint">Transcript at 03:12 and 08:20.</p>
        </div>

        <dl className="mt-4 space-y-1.5">
          <div className="flex gap-2">
            <dt className="w-32 flex-none text-ink-muted">Why it’s flagged</dt>
            <dd className="text-ink">Clear liability and injury, ready to proceed, no retainer sent and no callback logged.</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-32 flex-none text-ink-muted">Suggested next step</dt>
            <dd className="text-ink">Call back within the hour. Speed is the single biggest lever on recovery.</dd>
          </div>
        </dl>

        <p className="mt-4 border-t border-hairline pt-3 text-xs text-faint">
          Your own staff make the callback; we never contact your callers. This is our read of the
          transcript, not a legal opinion on the case. Reply here to add context or correct this flag.
        </p>
      </div>
    </div>
  );
}
