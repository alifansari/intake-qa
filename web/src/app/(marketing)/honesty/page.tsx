import type { Metadata } from "next";
import Link from "next/link";
import { GUARANTEE_METHODOLOGY, CTA_PRIMARY } from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Calibration & honesty — how we measure, and what we won't claim yet | Intake QA",
  description:
    "The method behind the score, how we define a correct flag and a miss, how we estimate missed signable-case value for the $50,000 guarantee, and why we won't publish precision/recall until the test corpus is documented.",
  alternates: { canonical: "/honesty" },
};

export default function HonestyPage() {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-16">
      <p className="eyebrow">Calibration &amp; honesty</p>
      <h1 className="mt-3 max-w-[24ch] font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        How the score works — and what we won&apos;t claim until we can prove it.
      </h1>
      <p className="mt-5 max-w-[72ch] text-lg text-ink-muted">
        If a vendor is going to touch your revenue, you should see the method and the failure modes,
        not a demo. Here is how the score is built, how we&apos;d measure whether it&apos;s right,
        and what we will and won&apos;t put a number on today.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">The method</h2>
        <ol className="mt-4 max-w-[72ch] list-decimal space-y-3 pl-5 text-ink-muted">
          <li>Every recorded intake call is transcribed.</li>
          <li>The transcript is scored 0–100 against a fixed rubric — the same rubric on every call, so scores don&apos;t drift from one review to the next.</li>
          <li>A call is flagged as a signable case that walked when it scores above the threshold, wasn&apos;t converted, and is still inside the callback window.</li>
          <li>Every flag carries the transcript evidence behind it, so you can check the call yourself.</li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">How we&apos;d measure whether it&apos;s right</h2>
        <p className="mt-3 max-w-[72ch] text-ink-muted">
          Two numbers matter. <b className="text-ink">Precision</b>: of the calls we flag, the share
          that really were signable. <b className="text-ink">Recall</b>: of the signable calls that
          truly walked, the share we caught. Both only mean something against a named test set — how
          many calls, whether they&apos;re synthetic, historical, or from a real firm, and dated.
        </p>
        <div className="mt-4 rounded-card border border-hairline bg-canvas p-5 text-ink-muted">
          <p className="text-sm">
            We&apos;re not going to print a precision or recall percentage until we can name the
            corpus it came from. A number without its test set is the kind of thing you&apos;ve been
            pitched before. When the corpus is documented, the figures and the corpus go here
            together.
            {" "}
            {/* TODO(Ali): confirm test-corpus size (N), composition (synthetic/historical/client), and date, then publish precision + recall here WITH that corpus label. Do not publish a bare percentage. */}
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">Where a model like this gets it wrong</h2>
        <p className="mt-3 max-w-[72ch] text-ink-muted">
          Two failure modes, and we&apos;ll show real examples of each once the corpus is documented:
        </p>
        <ul className="mt-3 max-w-[72ch] space-y-2 text-ink-muted">
          <li><b className="text-alert">Missed flag:</b> a signable caller the model scored too low — usually when the caller downplays the injury or the liability language is ambiguous.</li>
          <li><b className="text-alert">False flag:</b> a call we flagged that wasn&apos;t signable — for example, property-damage-only, or a caller who already had a lawyer.</li>
        </ul>
        <p className="mt-3 text-sm text-faint">
          A human at your firm approves every callback, so a false flag costs a moment of a
          reviewer&apos;s time, not a wrong message to a caller.
          {" "}
          {/* TODO(Ali): add anonymized real miss/false-flag examples with dollar amounts once the corpus is documented. */}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          How we estimate missed signable-case value (for the $50,000 guarantee)
        </h2>
        <p className="mt-3 max-w-[72ch] text-ink-muted">{GUARANTEE_METHODOLOGY}</p>
        <p className="mt-3 max-w-[72ch] text-sm text-faint">
          The guarantee triggers on estimated value <b className="text-ink">identified</b> in your
          own calls — never on any revenue you recover. It&apos;s a promise about what the audit
          finds, not a promise about outcomes.
        </p>
      </section>

      <div className="mt-12">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          {CTA_PRIMARY}
        </Link>
      </div>
    </div>
  );
}
