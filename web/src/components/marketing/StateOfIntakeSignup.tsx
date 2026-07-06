// "The State of PI Intake", a forthcoming flagship research artifact (the Clio
// Legal Trends / Gong Labs play). Honest, pre-revenue framing: it does NOT exist
// yet; it grows as the cohort grows. Email capture is a mailto (no fake input,
// no backend assumption) so the CTA always works.

import { FOUNDER_EMAIL } from "@/lib/site-constants";

export function StateOfIntakeSignup() {
  return (
    <div className="rounded-card border border-hairline bg-canvas p-8">
      <p className="eyebrow">Forthcoming report</p>
      <h2 className="mt-2 max-w-[28ch] font-display text-3xl font-semibold text-ink text-balance">
        The State of PI Intake.
      </h2>
      <p className="mt-5 max-w-[72ch] text-lg leading-relaxed text-ink-muted">
        We&apos;re building the first report on what actually happens to signable cases after the
        phone rings, built from anonymized, consented, aggregated cohort data (the Clio Legal Trends
        model: aggregated and anonymized, no PII, no client data). It doesn&apos;t exist yet; it
        grows as the founding cohort grows. Get the first edition, and help shape it.
      </p>
      <a
        href={`mailto:${FOUNDER_EMAIL}?subject=${encodeURIComponent("The State of PI Intake: first edition")}`}
        className="mt-6 inline-flex rounded-pill border border-hairline bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:border-accent"
      >
        Email us to get the first edition
      </a>
    </div>
  );
}
