import type { Metadata } from "next";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = {
  title: "Apply for the beta — Intake QA",
  description:
    "Five founding California PI firms run the full desk free during the beta. Apply in under a minute.",
  alternates: { canonical: "/apply" },
};

// The signup page. One form, five fields, one button — the beta application
// API (NDA gate, ICP qualification, waitlist) existed before this page did;
// this is the front door it was missing. Free during the beta; flat monthly
// at launch, never a share of any recovery.
export default function ApplyPage() {
  return (
    <div className="mx-auto max-w-[640px] px-5 py-16">
      <p className="eyebrow">The founding beta</p>
      <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink text-balance">
        Apply for a founding seat.
      </h1>
      <p className="mt-5 text-lg text-ink-muted">
        Five California personal-injury firms run the full desk on their own calls, free during
        the beta. Takes under a minute. What happens next: you get a mutual NDA by email —
        nothing connects until it&apos;s signed — then we set you up personally.
      </p>
      <div className="mt-8">
        <ApplyForm />
      </div>
      <p className="mt-6 text-sm text-faint">
        Not in California, or not personal injury? Apply anyway — you&apos;ll join the waitlist
        for your practice area and hear from us when it opens. Prefer email?{" "}
        <a href="mailto:ali@plaintiffops.com" className="font-medium text-accent hover:text-accent-hover">
          ali@plaintiffops.com
        </a>
      </p>
    </div>
  );
}
