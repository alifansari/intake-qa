import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of service | Intake QA",
  description: "The terms that govern use of Intake QA and the free audit.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[720px] px-5 py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">Terms of Service</h1>
      <p className="mt-6 text-ink-muted">
        These terms govern use of Intake QA during the founding-cohort pilot. Pilot engagements are
        month-to-month, cancellable anytime, and subject to the find-it-free guarantee described on
        the pricing page. A full mutual services agreement, BAA, and DPA are available on request.
        Contact us to receive the current executed documents before go-live.
      </p>
      <p className="mt-4 text-sm text-faint">
        This page is a placeholder summary, not the binding agreement. The executed contract controls.
      </p>
    </div>
  );
}
