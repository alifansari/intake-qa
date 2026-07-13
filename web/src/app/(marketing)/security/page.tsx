import type { Metadata } from "next";
import Link from "next/link";
import {
  ACCOUNTABLE_PARTY_LINE,
  DELETION_HOURS,
  FIRM_RETENTION_DAYS,
  BREACH_NOTICE_HOURS,
  FOUNDER_NAME,
  FOUNDER_EMAIL,
  CTA_PRIMARY,
} from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Security & data handling | Intake QA",
  description:
    "Encryption, access controls, retention and deletion, DPA/NDA willingness, and breach notification. Your calls are never used to train AI models, and one party is accountable to you.",
  alternates: { canonical: "/security" },
};

const NEED: [string, string][] = [
  ["What we need", "Recorded intake calls only. Redact names first if you want to."],
  ["What we don’t need", "No signed-client files. No matter documents. No case-management access."],
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
        These are your prospective clients’ confidential communications. Here is what a
        2026 law-firm security review usually asks, answered in order.
      </p>

      {/* One accountable party, up top */}
      <div className="mt-8 rounded-card border border-hairline bg-canvas p-6">
        <p className="font-display text-lg font-semibold text-ink">Who is accountable</p>
        <p className="mt-2 text-sm text-ink-muted">
          {ACCOUNTABLE_PARTY_LINE} One person owns your data and your audit: {FOUNDER_NAME}, the
          founder,{" "}
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
            Data is encrypted in transit (TLS) and at rest (AES-256). Nothing about your calls
            travels or sits unencrypted.
          </p>
        </Row>
        <Row q="Access controls">
          <p>
            Firm data is isolated per firm. Access is limited to what’s needed to run the
            service; your confidential audio and transcripts stay inside our systems and are never
            handed to anyone else.
          </p>
        </Row>
        <Row q="Retention & deletion">
          <p>
            Your audio is deleted the moment it is transcribed. Free Leak Audit transcripts and
            reports are purged within {DELETION_HOURS} hours of your readout. If you join the desk,
            transcripts are kept only while we serve you (so your team can check the evidence behind
            each flag), purged on a rolling {FIRM_RETENTION_DAYS}-day window, and deleted immediately
            if you ask in writing. Your calls are never used to train AI models.
          </p>
        </Row>
        <Row q="The engines we use">
          <p>
            We analyze and transcribe your calls on specialist engines under our data-processing
            agreement, every subprocessor is named in the DPA, over encrypted connections. Your
            calls, transcripts, and results are never used to train AI models, and we do not sell
            or share your data. Intake QA does not claim to be SOC 2 certified or HIPAA compliant as a
            company. We make plain-English commitments and put them in writing.
          </p>
        </Row>
        <Row q="DPA & NDA">
          <p>
            A data-processing agreement (DPA) is available on request, and we’ll sign your NDA, or
            work from your firm’s own paper.
          </p>
        </Row>
        <Row q="Breach notification">
          <p>
            If we become aware of a breach affecting your data, we will notify you within{" "}
            {BREACH_NOTICE_HOURS} hours of becoming aware, with what we know and what we’re doing
            about it.
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
          {CTA_PRIMARY}
        </Link>
      </div>

      <p className="mt-8 text-sm text-faint">
        This is not legal advice. Your firm and its counsel make the final call on ethics and consent.
      </p>
    </div>
  );
}
