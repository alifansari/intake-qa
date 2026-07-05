import type { Metadata } from "next";
import Link from "next/link";
import {
  SUBPROCESSORS,
  ACCOUNTABLE_PARTY_LINE,
  DELETION_DAYS,
  BREACH_NOTICE_HOURS,
  FOUNDER_NAME,
  FOUNDER_EMAIL,
} from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Security & data handling | Intake QA",
  description:
    "Encryption, access controls, retention and deletion, named subprocessors and their postures, DPA/BAA and NDA willingness, and breach notification. Your calls are never used to train AI, and one party is accountable to you.",
  alternates: { canonical: "/security" },
};

const NEED: [string, string][] = [
  ["What we need", "Recorded intake calls only. Redact names first if you want to."],
  ["What we don't need", "No signed-client files. No matter documents. No case-management access."],
];

function Row({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-hairline py-6">
      <h2 className="font-display text-xl font-semibold text-ink">{q}</h2>
      <div className="mt-2 max-w-[72ch] text-ink-muted">{children}</div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-[900px] px-5 py-16">
      <p className="eyebrow">Security &amp; data handling</p>
      <h1 className="mt-3 max-w-[24ch] font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        Answers to your vendor security review.
      </h1>
      <p className="mt-5 max-w-[72ch] text-lg text-ink-muted">
        These are your prospective clients&apos; confidential communications. Here is what a
        2026 law-firm security review usually asks, answered in order.
      </p>

      {/* One accountable party, up top */}
      <div className="mt-8 rounded-card border border-hairline bg-canvas p-6">
        <p className="font-display text-lg font-semibold text-ink">Who is accountable</p>
        <p className="mt-2 text-sm text-ink-muted">
          {ACCOUNTABLE_PARTY_LINE} One person owns your data and your audit: {FOUNDER_NAME}, the
          founder —{" "}
          <a href={`mailto:${FOUNDER_EMAIL}`} className="font-semibold text-accent hover:text-accent-hover">
            {FOUNDER_EMAIL}
          </a>
          .
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {NEED.map(([t, d]) => (
          <div key={t} className="rounded-card border border-hairline bg-surface p-6">
            <p className="font-display text-lg font-semibold text-ink">{t}</p>
            <p className="mt-2 text-sm text-ink-muted">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Row q="Encryption">
          <p>
            Data is encrypted in transit (TLS) and at rest (AES-256), across storage and every
            provider we use. Nothing about your calls travels or sits unencrypted.
          </p>
        </Row>
        <Row q="Access controls">
          <p>
            Firm data is isolated per firm. Access is limited to what&apos;s needed to run the
            service, and the confidential audio and transcripts are not shared beyond the providers
            listed below, each under contract.
          </p>
        </Row>
        <Row q="Retention & deletion">
          <p>
            Your recordings and transcripts are deleted within {DELETION_DAYS} days of your audit
            readout — and immediately if you ask in writing. If you move to a pilot, your data carries
            over under the pilot agreement, and the same deletion right applies. Your calls are never
            used to train any AI model.
          </p>
        </Row>
        <Row q="Subprocessors">
          <p className="mb-4">
            We use three infrastructure providers under contract — the same category of vendors your
            CRM and transcription tools already rely on. The certifications below belong to those
            providers; Intake QA does not claim to be SOC 2 certified or HIPAA compliant as a company.
            {/* TODO(Ali): confirm Intake QA's own attestations, if any, before adding company-level claims. */}
          </p>
          <div className="overflow-x-auto rounded-card border border-hairline">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-hairline bg-canvas text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-2.5 text-left">Provider</th>
                  <th className="px-4 py-2.5 text-left">Role</th>
                  <th className="px-4 py-2.5 text-left">Posture</th>
                </tr>
              </thead>
              <tbody>
                {SUBPROCESSORS.map((s) => (
                  <tr key={s.name} className="border-b border-hairline last:border-0 align-top">
                    <td className="px-4 py-3 font-semibold text-ink">{s.name}</td>
                    <td className="px-4 py-3 text-ink-muted">{s.role}</td>
                    <td className="px-4 py-3 text-ink-muted">{s.posture}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Row>
        <Row q="DPA, BAA & NDA">
          <p>
            We have a data-processing agreement (DPA) ready to sign, and we&apos;ll sign your NDA — or
            work from your firm&apos;s own paper. A HIPAA BAA is available through the providers above
            where you need one.
            {/* TODO(Ali): confirm DPA/BAA template status before representing signed availability. */}
          </p>
        </Row>
        <Row q="Breach notification">
          <p>
            If we become aware of a breach affecting your data, we will notify you within{" "}
            {BREACH_NOTICE_HOURS} hours of becoming aware, with what we know and what we&apos;re doing
            about it.
            {/* TODO(Ali): confirm the breach-notification timeline you can actually commit to. */}
          </p>
        </Row>
        <Row q="Call recording & consent">
          <p>
            Intake QA processes calls your firm already recorded. California is an all-party-consent
            state (Penal Code §632); your firm is responsible for its consent posture. The{" "}
            <Link href="/compliance" className="font-semibold text-accent hover:text-accent-hover">
              compliance page
            </Link>{" "}
            covers the recording and disclosure detail.
          </p>
        </Row>
      </div>

      <div className="mt-10">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          Run your free Intake Quality Audit
        </Link>
      </div>

      <p className="mt-8 text-sm text-faint">
        This is not legal advice. Your firm and its counsel make the final call on ethics and consent.
      </p>
    </div>
  );
}
