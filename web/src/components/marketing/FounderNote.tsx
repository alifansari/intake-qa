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
        A
      </div>
      {/* TODO(Ali): drop a real headshot at /public/founder.jpg and swap the monogram for <Image>. */}
      <div className="text-sm leading-relaxed text-ink-muted">
        <p>
          {full
            ? "I'm Ali. I ran intake at a personal-injury firm before I built this. I watched signable cases walk out the door — real injured people who called ready to hire us — because a call went to voicemail, or the follow-up never happened, or the caller reached the next firm on Google before we called back. The marketing money was already spent. The case just went across the street."
            : "I'm Ali. I ran intake at a PI firm before I built this, and I watched signable cases walk because a call went to voicemail or the follow-up never happened. The marketing money was already spent — the case just went across the street."}
        </p>
        <p className="mt-3">
          Intake QA is the quality-control and recovery system I wanted when I had the job: score
          every call, catch the ones worth a callback, and draft a follow-up your team approves
          before it sends.
        </p>
        <p className="mt-4 font-display text-base font-semibold text-ink">
          — Ali, Founder, Intake QA · Orange County, CA
        </p>
      </div>
    </div>
  );
}
