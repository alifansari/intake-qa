// Public SAMPLE Leak Audit — synthetic calls, clearly labeled, using
// the post-Change-1 layout: sample-anchored headline, per-call evidence as the
// primary content, monthly figure as a labeled range. No DB, safe to share.

import type { Metadata } from "next";
import Link from "next/link";
import { money } from "@/lib/format";
import { SampleStatement } from "@/components/marketing/SampleStatement";
import { ConfidenceTierTable } from "@/components/marketing/ConfidenceTierTable";
import {
  CTA_PRIMARY,
  GOLD_ALTERNATIVE_VIEW,
  GOLD_RIGHT_OF_REPLY,
  GOLD_VALUATION_DISCLAIMER,
} from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Sample Leak Audit | Intake QA",
  description:
    "A sample Leak Audit report on synthetic calls. See the signable fees that walked, with per-call evidence.",
  alternates: { canonical: "/audit/sample" },
};

const CALL_COUNT = 8;
const TOTAL_FEE_AT_RISK = 27000;
// Copy-audit 2026-07-11: the monthly projection ($253k–$506k extrapolated from 8
// synthetic calls) was removed — vendor-computed extrapolation is the #1 distrust
// trigger for this audience, and it contradicted this page's own "not a
// projection" subhead. The section below now sells the refusal instead.

const WALKED = [
  {
    filename: "call-0431.mp3",
    feeAtRisk: 18000,
    summary:
      "Rear-end collision, company truck, documented driver admission, worsening injuries. The caller was ready to move forward but no retainer was sent and no follow-up was scheduled.",
    quotes: [
      "Yeah, I definitely want to move forward with this.",
      "The other driver admitted it was his fault at the scene.",
    ],
    draftPreview:
      "Hi Erika, this is the intake team at Sample PI Firm following up on your call. Is now a good time to finish getting you set up? Reply STOP to opt out.",
  },
  {
    filename: "call-0447.mp3",
    feeAtRisk: 9000,
    summary:
      "Slip-and-fall at a grocery store, clear liability, caller audibly distressed; the call closed on a vague “we’ll call you back” with no time set.",
    quotes: ["I fell right where they’d just mopped. There was no sign or anything."],
    draftPreview: null,
  },
];

export default function SampleAuditPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Persistent sample banner */}
      <div className="mb-6 rounded-sm border border-amber bg-amber-tint px-4 py-2 text-sm font-medium text-ink">
        Sample report on synthetic calls for illustration. Your own report uses your calls.
      </div>

      {/* Masthead */}
      <header className="border-b border-ink pb-4">
        <p className="eyebrow">
          <a href="/" className="hover:text-ink">Intake QA</a> · Leak Audit
        </p>
        <h1 className="font-display text-3xl font-bold text-ink">Leak Audit</h1>
        <p className="mt-1 text-sm text-muted">{CALL_COUNT} calls reviewed</p>
      </header>

      {/* Sample-anchored headline */}
      <section className="mt-8">
        <p className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
          <span className="text-red">{money(TOTAL_FEE_AT_RISK)}</span> in signable fees walked in
          these <span className="tabular-nums">{CALL_COUNT}</span> calls.
        </p>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Every figure below is tied to a specific call and the words the prospective client
          actually said. This is what we found in the sample, not a projection.
        </p>
      </section>

      {/* Per-call evidence — primary content */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-ink">
          The signable cases that walked, with the evidence
        </h2>
        <div className="mt-3 space-y-2">
          {WALKED.map((c) => (
            <details key={c.filename} open className="rounded-sm border border-red bg-red-tint p-3">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-ink">
                <span>Signable case that walked · {c.filename}</span>
                <span className="tabular-nums text-red">{money(c.feeAtRisk)} at risk</span>
              </summary>
              <div className="mt-2 space-y-2 text-sm text-ink">
                <p className="text-muted">{c.summary}</p>
                <ul className="space-y-1">
                  {c.quotes.map((q, i) => (
                    <li key={i} className="border-l-2 border-red pl-2 text-muted">
                      “{q}”
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* No projection — the refusal is the pitch */}
      <section className="mt-8 rounded-sm border border-line bg-paper p-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">
          What a full month looks like — we won&apos;t tell you from a sample
        </p>
        <p className="mt-2 max-w-prose text-sm text-ink">
          Eight synthetic calls prove the method, not your number. Extrapolating a monthly dollar
          figure from a sample is the kind of math you&apos;ve been pitched before, so we don&apos;t
          do it. The honest way to know is a month on your own calls, and the first look is free.
        </p>
      </section>

      {/* Sample callback script */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">The same-day callback script we&apos;d hand your staff</h2>
        <div className="mt-2 rounded-sm border border-line bg-paper p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber">
            Draft preview: we never contact your callers
          </p>
          <p className="mt-2 text-sm text-ink">{WALKED[0].draftPreview}</p>
        </div>
        <p className="mt-2 text-xs text-faint">
          Your own staff make every callback. The desk supplies the number, the evidence, and the words.
        </p>
      </section>

      {/* What the monthly Statement looks like — annotated */}
      <section className="mt-14 border-t border-hairline pt-10">
        <h2 className="font-display text-2xl font-semibold text-ink text-balance">
          What the monthly Statement looks like
        </h2>
        <p className="mt-2 max-w-[70ch] text-sm text-muted">
          After a full month, this is the two-page read that lands on your desk. Page one is a
          90-second boardroom look, signed by the analyst. Here is page one, with the parts that
          make it checkable called out.
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <SampleStatement />
          <div className="flex flex-col gap-4">
            <div className="rounded-card border border-hairline bg-paper p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Alternative View</p>
              <p className="mt-1.5 text-sm text-ink">{GOLD_ALTERNATIVE_VIEW}</p>
            </div>
            <div className="rounded-card border border-hairline bg-paper p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Right of Reply</p>
              <p className="mt-1.5 text-sm text-ink">{GOLD_RIGHT_OF_REPLY}</p>
            </div>
            <div className="rounded-card border border-hairline bg-paper p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Every dollar is an estimate</p>
              <p className="mt-1.5 text-sm text-ink">{GOLD_VALUATION_DISCLAIMER}</p>
            </div>
            <div className="rounded-card border border-hairline bg-paper p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Citation to transcript</p>
              <p className="mt-1.5 text-sm text-ink">
                Every judgment names the exact moment in the recording behind it, so you can play the
                call and check it yourself.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">The five signability tiers</p>
          <div className="mt-3">
            <ConfidenceTierTable />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-12 rounded-lg border border-navy bg-navy-tint p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Run this on your own calls</h2>
        <p className="mt-1 text-sm text-muted">
          Upload up to 10 recent intake calls and get your own report in minutes.
        </p>
        <Link
          href="/audit"
          className="mt-4 inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {CTA_PRIMARY}
        </Link>
      </section>

      <footer className="mt-10 border-t border-hairline pt-6 text-xs text-faint">
        Intake QA is a service of Plaintiff Ops LLC. Estimates and calibration figures are not legal
        advice and are not a prediction of case value. © 2026 Plaintiff Ops LLC.
      </footer>
    </div>
  );
}
