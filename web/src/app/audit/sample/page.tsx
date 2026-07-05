// Public SAMPLE Intake Quality Audit — synthetic calls, clearly labeled, using
// the post-Change-1 layout: sample-anchored headline, per-call evidence as the
// primary content, monthly figure as a labeled range. No DB, safe to share.

import type { Metadata } from "next";
import Link from "next/link";
import { money } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sample Intake Quality Audit | Intake QA",
  description:
    "A sample Intake Quality Audit report on synthetic calls — see the signable fees that walked, with per-call evidence.",
  alternates: { canonical: "/audit/sample" },
};

const CALL_COUNT = 8;
const TOTAL_FEE_AT_RISK = 27000;
const MONTHLY_VOLUME = 150;
const PER_CALL = TOTAL_FEE_AT_RISK / CALL_COUNT;
const PROJ_HIGH = Math.round(PER_CALL * MONTHLY_VOLUME);
const PROJ_LOW = Math.round(PROJ_HIGH * 0.5);

const WALKED = [
  {
    filename: "call-0431.mp3",
    feeAtRisk: 18000,
    summary:
      "Rear-end collision, company truck, documented driver admission, worsening injuries — the caller was ready to move forward but no retainer was sent and no follow-up was scheduled.",
    quotes: [
      "Yeah, I definitely want to move forward with this.",
      "The other driver admitted it was his fault at the scene.",
    ],
    draftPreview:
      "Hi Erika, this is the intake team at Sample PI Firm following up on your call — is now a good time to finish getting you set up? Reply STOP to opt out.",
  },
  {
    filename: "call-0447.mp3",
    feeAtRisk: 9000,
    summary:
      "Slip-and-fall at a grocery store, clear liability, caller audibly distressed; the call closed on a vague “we’ll call you back” with no time set.",
    quotes: ["I fell right where they’d just mopped — there was no sign or anything."],
    draftPreview: null,
  },
];

export default function SampleAuditPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Persistent sample banner */}
      <div className="mb-6 rounded-sm border border-amber bg-amber-tint px-4 py-2 text-sm font-medium text-ink">
        Sample report — synthetic calls for illustration. Your own report uses your calls.
      </div>

      {/* Masthead */}
      <header className="border-b border-ink pb-4">
        <p className="eyebrow">Intake QA · Intake Quality Audit</p>
        <h1 className="font-display text-3xl font-bold text-ink">Intake Quality Audit</h1>
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
          actually said. This is what we found in the sample — not a projection.
        </p>
      </section>

      {/* Per-call evidence — primary content */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-ink">
          The signable cases that walked — with the evidence
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

      {/* Demoted monthly projection — labeled range */}
      <section className="mt-8 rounded-sm border border-line bg-paper p-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">
          What a full month might look like
        </p>
        <p className="mt-2 max-w-prose text-sm text-ink">
          If this rate held for a full month, that&apos;s roughly{" "}
          <b className="tabular-nums">{money(PROJ_LOW)}</b>–
          <b className="tabular-nums">{money(PROJ_HIGH)}</b> — and the low end conservatively assumes
          only half the rate we observed. The honest way to know is to run a full month.
        </p>
        <p className="mt-2 text-xs text-faint">
          A projection, not a claim or a guarantee — a reason to run a full month.
        </p>
      </section>

      {/* Sample SMS */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">A win-back text we&apos;d draft</h2>
        <div className="mt-2 rounded-sm border border-line bg-paper p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber">
            Draft preview — nothing is sent
          </p>
          <p className="mt-2 text-sm text-ink">{WALKED[0].draftPreview}</p>
        </div>
        <p className="mt-2 text-xs text-faint">
          In the product, a human approves every message before it can send.
        </p>
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
          Run your free Intake Quality Audit
        </Link>
      </section>
    </div>
  );
}
