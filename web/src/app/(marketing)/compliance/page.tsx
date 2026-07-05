import type { Metadata } from "next";
import Link from "next/link";
import { ComplianceGateDiagram } from "@/components/marketing/ComplianceGateDiagram";

export const metadata: Metadata = {
  title: "Compliance — flat fees, human-approved sends | Intake QA",
  description:
    "Flat per-case pricing keeps you clear of ABA Model Rule 5.4. Every SMS passes a 7-gate human-approval chokepoint; nothing sends automatically.",
  alternates: { canonical: "/compliance" },
};

function Sec({ rule, title, children }: { rule: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-hairline py-10">
      <p className="eyebrow">{rule}</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink text-balance">{title}</h2>
      <div className="mt-4 max-w-[70ch] space-y-4 text-ink-muted">{children}</div>
      <p className="mt-5 text-sm text-faint">Verify with your own counsel — we&apos;ll provide documentation.</p>
    </section>
  );
}

export default function CompliancePage() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 py-16">
      <p className="eyebrow">Compliance</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        The compliance case for Intake QA.
      </h1>
      <p className="mt-5 max-w-[70ch] text-lg text-ink-muted">
        Share this page with your ethics counsel. Every claim below maps to a rule and a product
        feature you can inspect.
      </p>

      <Sec rule="Rule 5.4 — fee-splitting" title="You pay a flat fee per case. There is nothing to split.">
        <p>
          You pay a flat fee per case, set in advance, that never changes with the size of any
          recovery. Because our compensation is invariant to your fees, there is no fee to split. We
          enforce this with an automated fee-invariance test that fails our build if pricing ever
          becomes contingent on recovery.
        </p>
        <div className="pt-2">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            The seven gates every message clears, in order
          </h3>
          <ComplianceGateDiagram />
        </div>
      </Sec>

      <Sec rule="Rule 7.3 — solicitation" title="We help you respond to people who already called you.">
        <p>
          ABA Model Rule 7.3 Comment [1]: a communication is not a solicitation if it is “in response
          to a request for information.” Intake QA only helps you respond to people who already called
          YOUR firm asking for help. A human on your team approves every message. We log the consent
          basis for each contact.
        </p>
      </Sec>

      <Sec rule="TCPA" title="Seven gates, quiet hours, and instant opt-out.">
        <p>
          Seven gates enforce compliance in order, including quiet hours (no messages 8pm–8am local)
          and instant opt-out. We honor revocation by any reasonable means — “stop, quit, revoke, opt
          out, cancel, unsubscribe, end” — per the FCC Opt-Out Rule effective April 11, 2025, and we
          recognize Spanish-language opt-out keywords. Texting stays disabled until your A2P 10DLC
          registration is live.
        </p>
      </Sec>

      <Sec rule="California §632 — recording consent" title="We never ask you to do anything with a recording you couldn't already do.">
        <p>
          California requires all-party consent to record. Audio is deleted at transcription,
          transcripts are purged on a 72-hour window, and a BAA/DPA is available. Our AI vendor
          operates under a zero-data-retention posture.
        </p>
      </Sec>

      <Sec rule="Data & AI training" title="Your clients' words are not training data.">
        <p>
          Under Anthropic&apos;s commercial terms, your inputs and outputs are not used to train
          models, and zero-data-retention agreements are available for the API.
        </p>
      </Sec>

      <div className="mt-12 flex flex-wrap gap-4">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          Run your free Intake Quality Audit
        </Link>
        <Link href="/security" className="inline-flex rounded-pill border border-hairline px-6 py-3 text-sm font-semibold text-ink hover:border-accent">
          See our security posture
        </Link>
      </div>
    </div>
  );
}
