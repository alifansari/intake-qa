import type { Metadata } from "next";
import Link from "next/link";
import {
  FOUNDER_EMAIL,
  LEGAL_ENTITY,
  LEGAL_DBA,
  LEGAL_LAST_UPDATED,
  LEGAL_GOVERNING_STATE,
} from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Master Services Agreement (Draft) | Intake QA",
  description:
    "Draft Master Services Agreement for Intake QA — pending attorney review, not yet in force.",
  alternates: { canonical: "/msa" },
  robots: { index: false },
};

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-hairline py-6">
      <h2 className="font-display text-xl font-semibold text-ink">
        {n}. {title}
      </h2>
      <div className="mt-2 max-w-[72ch] space-y-3 text-ink-muted">{children}</div>
    </section>
  );
}

export default function MsaPage() {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">
        Master Services Agreement
      </h1>

      {/* DRAFT banner — unmissable, required by the compliance guardrails. */}
      <div className="mt-5 rounded-card border border-amber bg-amber-tint p-4 text-sm text-ink">
        <strong>Draft — pending attorney review, not yet in force.</strong> This document is a working
        draft for discussion only. It is not a binding contract, has not been reviewed by counsel, and
        does not create any obligation until a final version is executed by both parties.
      </div>

      <p className="mt-3 text-sm text-faint">Draft last edited {LEGAL_LAST_UPDATED}.</p>

      <p className="mt-6 max-w-[72ch] text-lg text-ink-muted">
        This Master Services Agreement (&quot;MSA&quot;) would govern the paid subscription service
        provided by {LEGAL_ENTITY} (&quot;{LEGAL_DBA}&quot;, &quot;we&quot;) to a subscribing law firm
        (&quot;Firm&quot;, &quot;you&quot;). The free Leak Audit is governed by the{" "}
        <Link href="/terms" className="font-semibold text-accent hover:text-accent-hover">
          Terms of Service
        </Link>
        ; this MSA takes over once you subscribe.
      </p>

      <div className="mt-8">
        <Section n="1" title="The service">
          <p>
            {LEGAL_DBA} is an independent quality-control service. We score the Firm&apos;s own intake
            calls against a fixed, calibrated rubric, flag signable cases that appear to have slipped,
            and deliver a monthly statement and readout. We are an independent scorer, not co-counsel,
            not a referral source, and not a participant in any fee.
          </p>
        </Section>

        <Section n="2" title="Fees (flat monthly)">
          <p>
            The subscription fee is a <strong>flat monthly fee</strong> for the service, billed in
            advance. It does not vary with, and is never calculated as a percentage of, any recovery,
            settlement, signed case, or fee the Firm earns. It does not change whether the Firm signs
            zero cases or fifty. We take no referral fee and no contingent compensation. You may cancel
            at any time through the billing portal; the flat fee stops at the end of the then-current
            billing period.
          </p>
        </Section>

        <Section n="3" title="Independence">
          <p>
            Our compensation is fixed and unrelated to the outcome of any case, so our findings are not
            shaped by whether a case is signed or recovered. Any dollar figure we provide is a
            conservative estimate with stated assumptions and confidence, never a promise of a specific
            recovery, settlement, or outcome.
          </p>
        </Section>

        <Section n="4" title="Firm responsibilities">
          <p>
            The Firm is responsible for its own recording-consent posture. California is an all-party
            consent state (Penal Code §632/§632.7); by sending us recordings the Firm confirms it has
            the right and any required consent to share them. Prospective-client information and
            conflicts (Cal. Rule 1.18) remain the Firm&apos;s responsibility. {LEGAL_DBA} does not give
            legal advice and does not form a relationship with any claimant.
          </p>
        </Section>

        <Section n="5" title="Data protection">
          <p>
            Our handling of Firm and claimant data is governed by the{" "}
            <Link href="/dpa" className="font-semibold text-accent hover:text-accent-hover">
              Data Processing Addendum
            </Link>
            , which is incorporated into this MSA by reference.
          </p>
        </Section>

        <Section n="6" title="Confidentiality">
          <p>
            Recordings, transcripts, scores, and reports are the Firm&apos;s confidential information.
            We use them only to provide the service, we do not use them to train our models, and we do
            not sell or share them. Retention and deletion are as described in the DPA.
          </p>
        </Section>

        <Section n="7" title="Warranties and disclaimers">
          <p>
            The service is a business analysis, not a legal opinion or an audit in the accountancy
            sense. We do not warrant that every signable case will be identified or that any estimated
            figure will be realized. Except as expressly stated, the service is provided &quot;as
            is.&quot;
          </p>
        </Section>

        <Section n="8" title="Term, suspension, and termination">
          <p>
            The MSA runs month to month. Either party may terminate for convenience at the end of a
            billing period. We may pause the service on a failed or past-due payment until it is cured.
            On termination, data is handled per the deletion provisions of the DPA.
          </p>
        </Section>

        <Section n="9" title="Governing law">
          <p>This draft is governed by the laws of the State of {LEGAL_GOVERNING_STATE}.</p>
        </Section>
      </div>

      <p className="mt-8 text-sm text-faint">
        Questions on this draft? Email{" "}
        <a href={`mailto:${FOUNDER_EMAIL}`} className="font-semibold text-accent hover:text-accent-hover">
          {FOUNDER_EMAIL}
        </a>
        . Nothing here is in force until a final, attorney-reviewed version is signed.
      </p>
    </div>
  );
}
