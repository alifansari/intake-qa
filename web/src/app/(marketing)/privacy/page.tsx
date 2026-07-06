import type { Metadata } from "next";
import Link from "next/link";
import {
  DELETION_HOURS,
  FOUNDER_EMAIL,
  LEGAL_ENTITY,
  LEGAL_DBA,
  LEGAL_LAST_UPDATED,
} from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Privacy policy | Intake QA",
  description: `How ${LEGAL_ENTITY} collects, uses, retains, and deletes your data.`,
  alternates: { canonical: "/privacy" },
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

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">Privacy Policy</h1>
      <p className="mt-3 text-sm text-faint">Last updated {LEGAL_LAST_UPDATED}.</p>

      <p className="mt-6 max-w-[72ch] text-lg text-ink-muted">
        {LEGAL_ENTITY} (doing business as {LEGAL_DBA}, &ldquo;we,&rdquo; &ldquo;us&rdquo;) helps
        personal-injury law firms review their own intake calls and recover signable cases that did
        not sign. We hold as little as possible, and we treat everything a firm sends us as
        confidential. This policy explains what we collect, why, how long we keep it, and the choices
        you have.
      </p>

      <div className="mt-8">
        <Section n="1" title="Who this covers">
          <p>
            This policy covers the {LEGAL_DBA}{" "}website, the free Intake Quality Audit, and the desk
            product. When a law firm uses our service, that firm decides which calls to send us and
            why. For that call data, the firm is the party responsible for the information (the
            business or controller) and we act as its service provider, processing the data only to
            provide the service and only on the firm&apos;s instructions.
          </p>
        </Section>

        <Section n="2" title="What we collect">
          <p>
            <b className="text-ink">Call recordings and transcripts</b> that a firm uploads or
            forwards to us, and the analysis we produce from them (scores, flags, drafted follow-up
            messages, and reports).
          </p>
          <p>
            <b className="text-ink">Account and contact details</b> such as a name, work email, firm
            name, and the settings a firm configures.
          </p>
          <p>
            <b className="text-ink">Basic technical logs</b> needed to run and secure the service.
            Payments are handled by our payment processor; we do not store full card numbers.
          </p>
        </Section>

        <Section n="3" title="How we use it">
          <p>
            We use the data only to provide the service: to transcribe and score calls, flag signable
            cases that did not sign, draft compliant follow-up messages for a human at the firm to
            approve, produce reports, and support and improve the service for that firm.
          </p>
          <p>
            <b className="text-ink">We do not use your calls, transcripts, or results to train our
            models. We do not sell your data, and we do not share it for anyone else&apos;s
            advertising.</b>
          </p>
        </Section>

        <Section n="4" title="Confidentiality">
          <p>
            Intake calls are prospective-client information. We treat every recording and transcript
            as confidential and reachable only by the people and systems needed to run the service.
            The firm remains responsible for its own professional duties; we are built to help it keep
            them. Our full posture is on the{" "}
            <Link href="/security" className="font-semibold text-accent hover:text-accent-hover">
              security page
            </Link>
            .
          </p>
        </Section>

        <Section n="5" title="Service providers and infrastructure">
          <p>
            We run on encrypted cloud infrastructure and use our own analysis and transcription models
            to process calls. Any provider that touches firm data does so under contract, only to
            deliver the service, and never to train on or resell your data. A list of the categories
            of providers is available to a firm under NDA on request.
          </p>
        </Section>

        <Section n="6" title="How long we keep it, and deletion">
          <p>
            Call audio is deleted the moment it is transcribed. Transcripts and reports are deleted
            within {DELETION_HOURS}{" "}hours of your readout, or immediately if you ask in writing. If you
            move from a free audit to a pilot, the data carries over under the pilot agreement and the
            same deletion right applies.
          </p>
          <p>
            To request deletion or ask what we hold, email{" "}
            <a href={`mailto:${FOUNDER_EMAIL}`} className="font-semibold text-accent hover:text-accent-hover">
              {FOUNDER_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section n="7" title="Security">
          <p>
            Data is encrypted in transit (TLS) and at rest (AES-256), with each firm&apos;s data
            isolated from every other firm&apos;s. We do not claim to be SOC 2 certified or HIPAA
            compliant as a company; we make plain commitments and put them in writing.
          </p>
        </Section>

        <Section n="8" title="Your privacy rights (California)">
          <p>
            California residents have rights under the CCPA/CPRA, including the right to know what
            personal information is collected, to access or delete it, to correct it, and to opt out
            of its sale or sharing. We do not sell or share personal information. Because call data is
            usually processed on a firm&apos;s behalf, a request about a specific caller may be routed
            to that firm. To exercise a right, contact us at{" "}
            <a href={`mailto:${FOUNDER_EMAIL}`} className="font-semibold text-accent hover:text-accent-hover">
              {FOUNDER_EMAIL}
            </a>
            . We will not discriminate against you for exercising a right.
          </p>
        </Section>

        <Section n="9" title="Text messages">
          <p>
            Follow-up texts go only to a firm&apos;s own prior callers, include an opt-out, and send
            only after a person at the firm approves each one and the firm&apos;s carrier registration
            clears. Reply STOP to any message to opt out; once opted out, that number is not texted
            again.
          </p>
        </Section>

        <Section n="10" title="Changes and contact">
          <p>
            If we change this policy, we will update the date at the top and post the new version here.
            Questions? Email{" "}
            <a href={`mailto:${FOUNDER_EMAIL}`} className="font-semibold text-accent hover:text-accent-hover">
              {FOUNDER_EMAIL}
            </a>
            .
          </p>
        </Section>
      </div>

      <p className="mt-8 text-sm text-faint">
        This is a plain-language summary of how we handle data. For a firm engagement, the executed
        data-processing agreement (DPA) controls where it differs from this page.
      </p>
    </div>
  );
}
