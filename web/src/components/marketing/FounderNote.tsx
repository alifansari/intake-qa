// Signed founder note. Drop a real headshot at /public/founder.jpg and swap the
// monogram for <Image src="/founder.jpg" .../> — the layout already reserves the
// square so there is no shift.

export function FounderNote({ full = false }: { full?: boolean }) {
  return (
    <div className="flex flex-col gap-5 rounded-card border border-hairline bg-surface p-6 sm:flex-row">
      <div
        className="flex h-20 w-20 flex-none items-center justify-center rounded-full bg-navy font-display text-2xl font-semibold text-white"
        aria-hidden="true"
      >
        IQ
      </div>
      <div className="text-sm leading-relaxed text-ink-muted">
        <p>
          {full
            ? "I handled intake myself. I watched signable cases — real injured people who called ready to hire us — slip away because a call went to voicemail, or a rep fumbled it, or nobody followed up. The marketing money was already spent; the case just walked to the next firm on Google."
            : "I handled intake myself, and watched signable cases slip away because a call went to voicemail or the follow-up never happened. The marketing was already paid for — the case just walked to the firm across the street."}
        </p>
        <p className="mt-3">
          I built Intake QA to be the quality-control and recovery system I wished I&apos;d had:
          score every call, catch the leaks, and hand the team a compliant way to win them back —
          with a human approving every step.
        </p>
        <p className="mt-4 font-display text-base font-semibold text-ink">
          — Founder, Intake QA
        </p>
      </div>
    </div>
  );
}
