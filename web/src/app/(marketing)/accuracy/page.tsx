import type { Metadata } from "next";
import Link from "next/link";
import { GUARANTEE_METHODOLOGY, CTA_PRIMARY, STAKE_LINE, ACCURACY_REVIEW_LINE } from "@/lib/site-constants";
import { ConfidenceTierTable } from "@/components/marketing/ConfidenceTierTable";

// /accuracy — the track-record page (formerly /honesty). The single most
// important page on the site: it turns the trust argument from "here's our
// method, and here's what we won't claim yet" into "here's how we measure
// ourselves against your own decisions, and here's the number no vendor in
// this space will ever show you: our miss rate."
//
// COMPLIANCE (§IV): this page NEVER prints a fabricated precision/recall figure.
// The published number carries its sample size and a confidence range, and it
// stays in the honest "still building" state until the corpus crosses the
// minimum. The honesty is enforced in the calibration engine, not just promised
// here (src/lib/desk/triage-reconcile.mjs: Wilson intervals + min-n gate).

export const metadata: Metadata = {
  title: "How accurate are we? Our track record, measured against what firms sign | Intake QA",
  description:
    "We grade every call against what the firm actually did. When we say sign, how often do they sign? We publish the number, its sample size, and our worst error, the wrongful decline, because a rater that hides its miss rate isn't a rater.",
  alternates: { canonical: "/accuracy" },
};

export default function AccuracyPage() {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-16">
      <p className="eyebrow">Accuracy</p>
      <h1 className="mt-3 max-w-[24ch] font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        How accurate are we? Here is the one number no one else will show you.
      </h1>
      <p className="mt-5 max-w-[72ch] text-lg text-ink-muted">
        Anyone can grade a call. The question that matters is whether the grade is right, and the
        only honest way to answer it is to check every grade against what your firm actually did.
        That is what an independent audit is for. Here is how we measure ourselves, in public, sample
        size and all, including the error we are hardest on.
      </p>

      {/* THE TRACK RECORD — the moat, stated plainly, with the honest "still building" state. */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          We grade ourselves against your own decisions
        </h2>
        <p className="mt-3 max-w-[72ch] text-ink-muted">
          Every call we grade gets compared to what the firm did with it weeks later: signed,
          declined, or referred out. That gives us three numbers we can hold ourselves to.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              k: "When we say SIGN",
              v: "how often the firm signs",
              note: "Of the calls we grade as a signable case, the share the firm actually signed.",
            },
            {
              k: "When we say PASS",
              v: "how often the firm passes",
              note: "Of the calls we grade as a decline, the share the firm passed on or referred out.",
            },
            {
              k: "Our wrongful-decline rate",
              v: "the error we watch hardest",
              note: "The cases we told a firm to pass on that they signed anyway. We weight this ten times heavier than any other error, and we show it.",
            },
          ].map((c) => (
            <div key={c.k} className="rounded-card border border-hairline bg-surface p-5">
              <p className="eyebrow text-ink-muted">{c.k}</p>
              <p className="mt-2 font-display text-lg font-semibold text-ink">{c.v}</p>
              <p className="mt-2 text-sm text-ink-muted">{c.note}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-card border border-hairline bg-canvas p-5">
          <p className="text-sm text-ink">
            <span className="font-semibold text-accent">Still building.</span> We do not publish a
            headline accuracy rate until enough cases have reached a decision to make the number
            mean something, and when we do, it will always carry its sample size and a confidence
            range. A percentage without its test set is exactly the kind of thing you have been
            pitched before. As the founding cohort logs real outcomes, the numbers above turn on,
            here, in public. That is the whole point of an independent rater: you get to watch the
            number accrue, not take our word for it.
          </p>
        </div>
        <p className="mt-4 max-w-[72ch] text-sm text-faint">
          No AI receptionist, agency, or CRM publishes how often it is right, let alone how often it
          is wrong. We do, because we are paid the same flat fee no matter what the number says.
        </p>
      </section>

      {/* THE METHOD */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">How the grade is built</h2>
        <ol className="mt-4 max-w-[72ch] list-decimal space-y-3 pl-5 text-ink-muted">
          <li>Every recorded intake call is transcribed.</li>
          <li>The transcript is graded against a fixed rubric: the same rubric on every call, so grades don’t drift from one review to the next.</li>
          <li>A call is flagged as a signable case that walked when it grades above the threshold, wasn’t converted, and is still inside the callback window.</li>
          <li>{ACCURACY_REVIEW_LINE}</li>
        </ol>
      </section>

      {/* WHERE IT GETS IT WRONG — now with the promise that we publish the rate. */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">Where a model like this gets it wrong</h2>
        <p className="mt-3 max-w-[72ch] text-ink-muted">
          Two failure modes, and we track the rate of each rather than pretend they don’t happen:
        </p>
        <ul className="mt-3 max-w-[72ch] space-y-2 text-ink-muted">
          <li><b className="text-alert">Missed flag:</b> a signable caller the model graded too low, usually when the caller downplays the injury or the liability language is ambiguous.</li>
          <li><b className="text-alert">Wrongful decline:</b> a call we graded as a pass that turned out signable. This is the one that can cost a firm a real case, so we weight it heaviest and report it by name.</li>
        </ul>
        <p className="mt-3 text-sm text-faint">
          A human at your firm approves every callback, so a false flag costs a moment of a
          reviewer’s time, not a wrong message to a caller.
        </p>
      </section>

      {/* CONFIDENCE TIERS */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">How we express confidence</h2>
        <p className="mt-3 max-w-[72ch] text-ink-muted">
          Every call maps to one of five plain-English tiers. We use the same five definitions on
          every call, so a Tier 4 means the same thing in January as it does in June, and we never
          mix a confidence level with a likelihood in the same sentence.
        </p>
        <div className="mt-4">
          <ConfidenceTierTable />
        </div>
      </section>

      {/* VALUE ESTIMATION */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">
          How we estimate missed signable case value
        </h2>
        <p className="mt-3 max-w-[72ch] text-ink-muted">{GUARANTEE_METHODOLOGY}</p>
        <p className="mt-3 max-w-[72ch] text-sm text-faint">
          Every estimate describes value <b className="text-ink">identified</b> in your own calls,
          never revenue you recover. It’s a claim about what the audit finds, not a promise
          about outcomes.
        </p>
      </section>

      <p className="mt-12 max-w-[72ch] font-display text-xl leading-relaxed text-ink">
        {STAKE_LINE}
      </p>
      <div className="mt-6">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          {CTA_PRIMARY}
        </Link>
      </div>
    </div>
  );
}
