import type { Metadata } from "next";
import Link from "next/link";
import {
  FOUNDER_EMAIL,
  LEGAL_ENTITY,
  LEGAL_DBA,
  LEGAL_LAST_UPDATED,
  LEGAL_GOVERNING_STATE,
  DELETION_HOURS,
} from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Data Processing Addendum (Draft) | Intake QA",
  description:
    "Draft Data Processing Addendum for Intake QA — pending attorney review, not yet in force. Roles, encryption, subprocessors, and the actual deletion behavior.",
  alternates: { canonical: "/dpa" },
  robots: { index: false },
};

// The named subprocessors that touch Firm data (or would, once the relevant
// feature is enabled). Stated plainly per the compliance guardrails.
const SUBPROCESSORS: { name: string; purpose: string }[] = [
  { name: "AssemblyAI", purpose: "Transcription of intake-call audio" },
  { name: "Anthropic", purpose: "Scoring transcripts against the fixed rubric" },
  { name: "Supabase", purpose: "Database, authentication, and file storage" },
  { name: "Vercel", purpose: "Application hosting and delivery" },
  { name: "Twilio", purpose: "SMS re-engagement (dark until A2P 10DLC approval)" },
  { name: "Dropbox Sign", purpose: "E-signature handoff (test mode until go-live)" },
  { name: "Resend", purpose: "Transactional and report email" },
  { name: "Stripe", purpose: "Subscription billing and payments" },
];

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

export default function DpaPage() {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">
        Data Processing Addendum
      </h1>

      {/* DRAFT banner — unmissable, required by the compliance guardrails. */}
      <div className="mt-5 rounded-card border border-amber bg-amber-tint p-4 text-sm text-ink">
        <strong>Draft — pending attorney review, not yet in force.</strong> This is a working draft for
        discussion only. It is not binding, has not been reviewed by counsel, and creates no obligation
        until a final version is executed alongside the Master Services Agreement.
      </div>

      <p className="mt-3 text-sm text-faint">Draft last edited {LEGAL_LAST_UPDATED}.</p>

      <p className="mt-6 max-w-[72ch] text-lg text-ink-muted">
        This Data Processing Addendum (&quot;DPA&quot;) would form part of the{" "}
        <Link href="/msa" className="font-semibold text-accent hover:text-accent-hover">
          Master Services Agreement
        </Link>{" "}
        between {LEGAL_ENTITY} (&quot;{LEGAL_DBA}&quot;) and the subscribing Firm, and describes how we
        process data on the Firm&apos;s behalf.
      </p>

      <div className="mt-8">
        <Section n="1" title="Roles">
          <p>
            For the intake-call recordings, transcripts, scores, and reports processed through the
            service, the <strong>Firm is the controller</strong> and{" "}
            <strong>{LEGAL_DBA} is the processor</strong>. We process this data only to provide the
            service and only on the Firm&apos;s documented instructions, which include this DPA and the
            MSA.
          </p>
        </Section>

        <Section n="2" title="Encryption">
          <p>
            Data is encrypted <strong>in transit</strong> (TLS to the application and to every
            provider) and <strong>at rest</strong> (AES-256 across our storage and models). We do not
            use Firm recordings, transcripts, or results to train our models, and we do not sell or
            share them.
          </p>
        </Section>

        <Section n="3" title="Subprocessors">
          <p>
            We use the following subprocessors to deliver the service. Some (SMS, e-sign) are not
            active until the corresponding feature is enabled for the Firm.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-hairline text-left">
                  <th className="py-2 pr-4 font-semibold text-ink">Subprocessor</th>
                  <th className="py-2 font-semibold text-ink">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {SUBPROCESSORS.map((s) => (
                  <tr key={s.name} className="border-b border-hairline/60">
                    <td className="py-2 pr-4 font-medium text-ink">{s.name}</td>
                    <td className="py-2 text-ink-muted">{s.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section n="4" title="Retention and deletion (what we actually do)">
          <p>
            We state our real behavior, not an aspiration:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Call audio is deleted the moment it is transcribed.</strong> We do not retain the
              underlying recording after transcription.
            </li>
            <li>
              <strong>Transcripts and reports are purged within {DELETION_HOURS} hours of your
              readout</strong>, or immediately on written request. A Leak Audit&apos;s data is purged
              automatically {DELETION_HOURS} hours after the readout if the Firm does not continue.
              Demo data and expired audit sessions are purged automatically on a daily scheduled job.
            </li>
            <li>
              For ongoing subscriptions, derived data (transcripts, scores, reports) is retained only
              as long as needed to provide the service and is purged on the same retention window
              unless the Firm asks us to keep a specific statement.
            </li>
          </ul>
          <p>
            <strong>What we do not yet offer:</strong> we have <em>not</em> yet built one-click,
            immediate full-tenant deletion (a single action that removes every stored object, every
            database row, and issues a delete call to our transcription provider, with a deletion
            receipt). Until that ships, a full-tenant deletion request is handled manually by us on
            written request, and we will not claim otherwise. Invoices and billing records are retained
            as required for tax and accounting and are never used for the analysis service.
          </p>
        </Section>

        <Section n="5" title="Confidentiality and PII">
          <p>
            Recordings and transcripts are confidential (consistent with Cal. Rule 1.18). Transcription
            redacts sensitive identifiers server-side by default (Social Security, payment-card and
            banking, driver&apos;s-license and passport numbers). We do not place claimant PII in URLs,
            analytics events, or third-party tools without a processing basis. Spanish-language intake
            data receives the same protection.
          </p>
        </Section>

        <Section n="6" title="Security posture (no overclaiming)">
          <p>
            {LEGAL_DBA} is not itself SOC 2 certified or HIPAA compliant, and we do not claim to be. We
            state what our infrastructure providers attest to and mark anything unconfirmed as such.
            Our security posture is described on the{" "}
            <Link href="/security" className="font-semibold text-accent hover:text-accent-hover">
              security page
            </Link>
            .
          </p>
        </Section>

        <Section n="7" title="Governing law">
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
