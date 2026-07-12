import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Footer } from "@/components/marketing/Footer";
import { FOUNDER_EMAIL } from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "You're in | Intake QA",
  description: "Your Intake QA subscription is active. Check your email for your login link.",
  robots: { index: false },
};

// Post-checkout landing. Stripe redirects here with ?session_id=... on success;
// in simulation mode the checkout API sends ?simulated=1. Either way the message
// is the same: the subscription is being provisioned and a login link is on its
// way by email. Provisioning itself happens server-side via the Stripe webhook.
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; simulated?: string }>;
}) {
  const params = await searchParams;
  const simulated = params.simulated === "1";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <MarketingNav />
      <main className="mx-auto max-w-2xl px-6 py-20">
        <p className="eyebrow">Welcome to the desk</p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink text-balance">
          You&apos;re in.
        </h1>
        <p className="mt-5 max-w-[60ch] text-lg text-ink-muted">
          Your Intake QA subscription is active. Check your email for your login link. One click
          signs you in to your desk, no password needed.
        </p>

        <div className="mt-8 rounded-card border border-hairline bg-surface p-6">
          <p className="text-sm font-semibold text-ink">What happens next</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-muted">
            <li>Ali will email you personally within one business day to set up your kickoff.</li>
            <li>We set up your firm&apos;s workspace and send your magic login link by email.</li>
            <li>You sign in and connect your call source (or upload recordings).</li>
            <li>Your first monthly missed-revenue statement lands after your first scoring cycle.</li>
          </ol>
        </div>

        {simulated && (
          <div className="mt-4 rounded-card border border-amber bg-amber-tint p-4 text-sm text-ink">
            <strong>Simulation mode.</strong> No card was charged and no email was sent. This is the
            test-mode confirmation shown while Stripe keys are not configured. Wire the keys (see
            the setup checklist) to take real payments.
          </div>
        )}

        <p className="mt-6 text-sm text-faint">
          Didn&apos;t get the email within a few minutes? Check spam, or email{" "}
          <a href={`mailto:${FOUNDER_EMAIL}`} className="font-semibold text-accent hover:text-accent-hover">
            {FOUNDER_EMAIL}
          </a>{" "}
          and we&apos;ll sort it out.
        </p>

        <div className="mt-8">
          <Link
            href="/login"
            className="inline-flex rounded-pill border border-hairline px-5 py-2.5 text-sm font-semibold text-ink hover:border-accent"
          >
            Go to sign in
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
