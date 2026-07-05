import type { Metadata } from "next";
import Link from "next/link";
import { CTA_PRIMARY, CATEGORY_NAME, CATEGORY_ABBR, COMPETITOR_NOTE } from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "What is Case Acquisition Intelligence? | Intake QA",
  description:
    "Case Acquisition Intelligence (CAI) is the discipline of measuring and improving what happens to a signable case after the phone rings: analyze every intake call, detect qualified callers who didn't sign, quantify the missed fee value, and give the firm a staff-run play to recover it.",
  alternates: { canonical: "/what-is-case-acquisition-intelligence" },
};

export default function WhatIsCaiPage() {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-16">
      <p className="eyebrow">The category</p>
      <h1 className="mt-3 max-w-[24ch] font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        What is {CATEGORY_NAME}?
      </h1>

      <p className="mt-6 text-lg leading-relaxed text-ink-muted">
        {CATEGORY_NAME} ({CATEGORY_ABBR}) is the discipline of measuring and improving what happens
        to a signable case <em>after</em> the phone rings: it analyzes every recorded intake call,
        detects qualified prospective clients who didn&apos;t sign (signable-case detection),
        quantifies the missed fee revenue, and gives the firm a staff-run play to recover it. Where
        speed-to-lead tools optimize answering the next call, and litigation-AI tools work the case
        after it&apos;s signed, {CATEGORY_ABBR} owns the gap in between — the moment a paid-for case
        is won or lost at intake.
      </p>

      <section className="mt-10 border-t border-hairline pt-8">
        <h2 className="font-display text-2xl font-semibold text-ink">What it does, concretely</h2>
        <ul className="mt-4 space-y-3 text-ink-muted">
          <li><b className="text-ink">Reads 100% of your intake calls</b> against a fixed, calibrated PI rubric — not a 2% spot-check.</li>
          <li><b className="text-ink">Signable-case detection:</b> flags qualified callers who didn&apos;t sign, with the transcript evidence behind each flag.</li>
          <li><b className="text-ink">Quantifies the miss</b> in dollars — an estimated missed fee value for each leaked case.</li>
          <li><b className="text-ink">Same-day save protocol:</b> drafts a follow-up your staff reviews and sends (never automated; A2P-gated).</li>
          <li><b className="text-ink">Reports it like a financial statement</b> — a monthly missed-revenue statement, not another dashboard.</li>
        </ul>
      </section>

      <section className="mt-10 border-t border-hairline pt-8">
        <h2 className="font-display text-2xl font-semibold text-ink">How it differs from the tools you already have</h2>
        <p className="mt-4 text-ink-muted">{COMPETITOR_NOTE}</p>
      </section>

      <div className="mt-10 flex flex-wrap gap-4 border-t border-hairline pt-8">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          {CTA_PRIMARY}
        </Link>
        <Link href="/manifesto" className="inline-flex rounded-pill border border-hairline px-6 py-3 text-sm font-semibold text-ink hover:border-accent">
          Read the manifesto
        </Link>
      </div>
    </div>
  );
}
