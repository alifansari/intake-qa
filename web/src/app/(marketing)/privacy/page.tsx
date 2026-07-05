import type { Metadata } from "next";
import Link from "next/link";
import { DELETION_DAYS } from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Privacy policy | Intake QA",
  description: "How Plaintiff Ops LLC collects, uses, retains, and deletes your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[720px] px-5 py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">Privacy</h1>
      <p className="mt-6 text-ink-muted">
        We minimize what we hold. Your recordings and transcripts are deleted within {DELETION_DAYS}{" "}
        days of your audit readout — or immediately, on written request; if you move to a pilot, the data carries
        over under the pilot agreement and the same deletion right applies. Data is encrypted in
        transit and at rest with per-firm isolation, and our scoring runs on Anthropic&apos;s
        commercial API, whose terms don&apos;t use your data to train models. A DPA is available.
      </p>
      <p className="mt-4 text-ink-muted">
        For the full subprocessor list and data-handling posture, see{" "}
        <Link href="/security" className="font-semibold text-accent hover:text-accent-hover">Security</Link>.
      </p>
      <p className="mt-4 text-sm text-faint">This page is a placeholder summary; the executed DPA controls.</p>
    </div>
  );
}
