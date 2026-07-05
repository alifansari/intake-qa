import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security — where your data goes, and where it doesn't",
  description:
    "Audio deleted at transcription, 72-hour transcript purge, encryption in transit and at rest, per-firm row-level security, and a full subprocessor list. BAA/DPA available.",
  alternates: { canonical: "/security" },
};

const SUBPROCESSORS: [string, string][] = [
  ["Anthropic", "Scoring & drafting — commercial terms; no training on your data; ZDR available"],
  ["AssemblyAI", "Transcription — audio not retained"],
  ["Supabase", "Postgres database & authentication"],
  ["Vercel", "Application hosting"],
  ["Twilio", "SMS — disabled until A2P 10DLC is approved"],
  ["Stripe", "Billing (simulated until go-live)"],
  ["Dropbox Sign", "E-signature (sandbox until go-live)"],
  ["Resend", "Transactional email"],
];

const POSTURE: [string, string][] = [
  ["Audio deleted at transcription", "The recording is destroyed the moment a transcript exists — we never store call audio."],
  ["72-hour transcript purge", "Transcripts are purged on a rolling 72-hour window."],
  ["Encryption", "Encrypted in transit (TLS) and at rest."],
  ["Per-firm isolation", "Row-level security scopes every firm's data to that firm."],
];

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-[900px] px-5 py-16">
      <p className="eyebrow">Security</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        Where your data goes, and where it doesn&apos;t.
      </h1>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {POSTURE.map(([t, d]) => (
          <div key={t} className="rounded-card border border-hairline bg-surface p-6">
            <p className="font-display text-lg font-semibold text-ink">{t}</p>
            <p className="mt-2 text-sm text-ink-muted">{d}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-2xl font-semibold text-ink">Subprocessors</h2>
      <div className="mt-4 overflow-x-auto rounded-card border border-hairline">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-hairline bg-canvas text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5 text-left">Vendor</th>
              <th className="px-4 py-2.5 text-left">Role</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map(([v, r]) => (
              <tr key={v} className="border-b border-hairline last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{v}</td>
                <td className="px-4 py-3 text-ink-muted">{r}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-ink-muted">BAA/DPA available on request.</p>

      <div className="mt-10">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          Run my free Leak Audit
        </Link>
      </div>
    </div>
  );
}
