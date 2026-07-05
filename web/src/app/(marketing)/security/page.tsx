import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security & data handling | Intake QA",
  description:
    "Where your call data lives, what we need and don't, retention and deletion, and the named subprocessors and their certifications. Your calls are never used to train AI.",
  alternates: { canonical: "/security" },
};

const SUBPROCESSORS: [string, string, string][] = [
  ["Supabase", "Database & storage", "SOC 2 Type 2 and ISO 27001 certified; AES-256 at rest, TLS in transit; HIPAA-capable under a BAA (Supabase Trust Center)."],
  ["AssemblyAI", "Transcription", "SOC 2 Type 2 and PCI-DSS Level 1; encrypts data at rest and in transit; paid plans opt out of model-improvement data sharing (AssemblyAI Security)."],
  ["Anthropic (Claude)", "Scoring & drafting", "Commercial API — inputs and outputs are not used to train models; 7-day default log retention (as of Sept. 14, 2025); Zero-Data-Retention available (Anthropic Commercial Terms)."],
  ["Twilio", "SMS (dark until A2P clears)", "No application-to-person text can send to US numbers until A2P 10DLC registration clears (carrier review currently ~10–15 days) (Twilio A2P 10DLC docs)."],
  ["Vercel", "Application hosting", "Hosts the app; call audio and transcripts are stored in Supabase, not on the host."],
];

const NEED: [string, string][] = [
  ["What we need", "Recorded intake calls only. Redact names first if you want to."],
  ["What we don't need", "No signed-client files. No matter documents. No case management access."],
];

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-[900px] px-5 py-16">
      <p className="eyebrow">Security &amp; data handling</p>
      <h1 className="mt-3 max-w-[24ch] font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        Where your call data goes, and where it doesn&apos;t.
      </h1>
      <p className="mt-5 max-w-[70ch] text-lg text-ink-muted">
        These are your prospective clients&apos; confidential communications. Here is exactly how
        they&apos;re handled, and who is accountable for them.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {NEED.map(([t, d]) => (
          <div key={t} className="rounded-card border border-hairline bg-surface p-6">
            <p className="font-display text-lg font-semibold text-ink">{t}</p>
            <p className="mt-2 text-sm text-ink-muted">{d}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">Your calls are never used to train AI</h2>
        <p className="mt-3 max-w-[72ch] text-ink-muted">
          Intake QA uses Anthropic&apos;s commercial API, whose terms do not use your inputs or
          outputs to train models and delete API logs on a short retention window (7-day default;
          Zero-Data-Retention available). Our transcription vendor&apos;s paid plans opt out of
          model-improvement data sharing. Your callers&apos; words are not training data.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">Retention &amp; deletion</h2>
        <p className="mt-3 max-w-[72ch] text-ink-muted">
          We delete audio and transcripts on a set schedule.
          {" "}
          {/* TODO(Ali): state the exact audio + transcript retention/deletion timeline before publishing. */}
          <span className="text-faint"> [Exact timeline: to be confirmed.]</span>
        </p>
      </section>

      <h2 className="mt-10 font-display text-2xl font-semibold text-ink">Subprocessors</h2>
      <div className="mt-4 overflow-x-auto rounded-card border border-hairline">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-hairline bg-canvas text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5 text-left">Vendor</th>
              <th className="px-4 py-2.5 text-left">Role</th>
              <th className="px-4 py-2.5 text-left">Posture</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map(([v, role, posture]) => (
              <tr key={v} className="border-b border-hairline last:border-0 align-top">
                <td className="px-4 py-3 font-semibold text-ink">{v}</td>
                <td className="px-4 py-3 text-ink-muted">{role}</td>
                <td className="px-4 py-3 text-ink-muted">{posture}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-faint">
        The certifications above belong to the named subprocessors. Intake QA does not claim to be
        SOC 2 certified or HIPAA compliant as a company.
        {" "}
        {/* TODO(Ali): confirm Intake QA's own attestations, if any, before adding company-level claims. */}
      </p>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-hairline bg-surface p-6">
          <p className="font-display text-lg font-semibold text-ink">Legal agreements</p>
          <p className="mt-2 text-sm text-ink-muted">
            We&apos;ll sign your NDA and a data-processing agreement.
            {" "}
            {/* TODO(Ali): confirm whether a DPA/NDA template exists or the firm's paper is used. */}
            <span className="text-faint"> [Template vs. your paper: to be confirmed.]</span>
          </p>
        </div>
        <div className="rounded-card border border-hairline bg-surface p-6">
          <p className="font-display text-lg font-semibold text-ink">A named human</p>
          <p className="mt-2 text-sm text-ink-muted">
            One person is accountable for your data: Ali, the founder.
            {" "}
            {/* TODO(Ali): add your direct contact path (email) for data questions. */}
            <span className="text-faint"> [Contact: to be added.]</span>
          </p>
        </div>
      </section>

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
