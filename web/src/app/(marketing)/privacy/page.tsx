import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy — Intake QA",
  description: "How Intake QA handles call data: audio deleted at transcription, 72-hour transcript purge, no AI training on your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[720px] px-5 py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">Privacy</h1>
      <p className="mt-6 text-ink-muted">
        We minimize what we hold: call audio is deleted at transcription, transcripts are purged on
        a rolling 72-hour window, and data is encrypted in transit and at rest with per-firm
        isolation. Our AI subprocessor does not train on your data, and zero-data-retention terms are
        available. A BAA/DPA is available on request.
      </p>
      <p className="mt-4 text-ink-muted">
        For the full subprocessor list and data-handling posture, see{" "}
        <Link href="/security" className="font-semibold text-accent hover:text-accent-hover">Security</Link>.
      </p>
      <p className="mt-4 text-sm text-faint">This page is a placeholder summary; the executed DPA controls.</p>
    </div>
  );
}
